import config from '../../../config.js';
import { HttpError } from '../../lib/errors.js';
import { fetchJson } from '../../lib/http.js';
import { createLimiter } from '../../lib/limit.js';
import { withRetry } from '../../lib/retry.js';
import { getOrLoad } from '../../lib/store.js';
import { calculateLanguagePercentage } from './languages.js';
import { calculateRank } from './rank.js';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

const GRAPHQL_QUERY_USER_INFO = `
  query userInfo($login: String!) {
    user(login: $login) {
      name
      login
      createdAt
      followers {
        totalCount
      }
      allPullRequests: pullRequests {
        totalCount
      }
      mergedPullRequests: pullRequests(states: MERGED) {
        totalCount
      }
      repositoriesContributedTo(contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY], includeUserRepositories: true) {
        totalCount
      }
      repositoryDiscussions {
        totalCount
      }
      repositoryDiscussionComments(onlyAnswers: true) {
        totalCount
      }
    }
  }
`;

// The account's creation date on its own: GitHub answers this at once, while the full user
// info above takes it a second or two.
const GRAPHQL_QUERY_USER_CREATED_AT = `
  query userCreatedAt($login: String!) {
    user(login: $login) {
      createdAt
    }
  }
`;

// Both repository queries page through the same list in the same order, so a cursor from one
// can be used with the other.
const REPOSITORIES_ARGUMENTS = 'first: $first, after: $after, ownerAffiliations: OWNER, isFork: false, orderBy: {field: CREATED_AT, direction: DESC}';

const GRAPHQL_QUERY_REPOSITORIES = `
  query userRepositories($login: String!, $first: Int!, $after: String) {
    user(login: $login) {
      repositories(${REPOSITORIES_ARGUMENTS}) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          stargazers {
            totalCount
          }
          forkCount
          languages(first: 20, orderBy: {field: SIZE, direction: DESC}) {
            edges {
              size
              node {
                color
                name
              }
            }
          }
        }
      }
    }
  }
`;

// Only says where a page ends. GitHub answers this in a fraction of a second,
// while a full page takes it several seconds.
const GRAPHQL_QUERY_REPOSITORY_CURSORS = `
  query userRepositoryCursors($login: String!, $first: Int!, $after: String) {
    user(login: $login) {
      repositories(${REPOSITORIES_ARGUMENTS}) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const GRAPHQL_QUERY_CONTRIBUTIONS_CALENDAR = `
  query userContributions($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

const GRAPHQL_QUERY_CONTRIBUTIONS_TOTALS = `
  query userContributionTotals($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalIssueContributions
      }
    }
  }
`;

// Contribution totals of past years practically never change, so they are cached for a month;
// only the current year is asked from GitHub on every refresh.
const PAST_YEARS_TTL_MS = 30 * 24 * 3600 * 1000;

// GitHub allows at most 100 repositories per page.
const MAX_PAGE_SIZE = 100;
// How many repository pages are requested from GitHub at the same time.
const MAX_PARALLEL_PAGES = 12;

/**
 * Page size for loading repositories while a visitor is waiting. Smaller pages come back sooner
 * (GitHub needs roughly 50 ms per repository) but need more cursor steps, which run one after
 * another. These sizes were the fastest in measurements against the GitHub API.
 */
const pageSizeWhileWaiting = (totalRepositories) => (totalRepositories > 600 ? 100 : totalRepositories > 250 ? 50 : 34);

/**
 * Turns a list of GraphQL errors into an HttpError.
 * GitHub reports most problems (including rate limits) with HTTP 200 and an `errors` array.
 */
function graphQLErrorToHttpError(errors, login) {
  if (errors.some((e) => e.type === 'RATE_LIMITED')) {
    return new HttpError(503, 'GitHub API rate limit reached, please try again later');
  }
  if (errors.some((e) => e.type === 'NOT_FOUND')) {
    return new HttpError(404, `GitHub user "${login}" not found`);
  }
  // Anything else (e.g. "Something went wrong while executing your query") is usually a transient timeout.
  return new HttpError(502, `GitHub API error: ${errors[0].message}`, { retryable: true });
}

/**
 * Runs a GitHub GraphQL query whose root field is `user(login: $login)` and returns that user object.
 * Each call retries on its own, so one flaky request doesn't restart the whole fetch.
 */
async function githubGraphQL(query, variables, { deadline }) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new HttpError(500, 'GITHUB_TOKEN environment variable is not set', { expose: false });
  }

  return withRetry(async () => {
    const { data, errors } = await fetchJson('GitHub', GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: { Authorization: `bearer ${token}` },
      json: { query, variables },
      deadline,
      rateLimitStatuses: [403, 429], // GitHub uses 403 for secondary rate limits
    });

    if (errors?.length) throw graphQLErrorToHttpError(errors, variables.login);
    if (!data?.user) throw new HttpError(404, `GitHub user "${variables.login}" not found`);
    return data.user;
  }, { deadline });
}

/**
 * Splits [from, to] into consecutive windows that each stay within one calendar year (UTC),
 * because GitHub's contributionsCollection rejects ranges longer than a year.
 */
function splitByYear(from, to) {
  const ranges = [];
  for (let year = from.getUTCFullYear(); year <= to.getUTCFullYear(); year++) {
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1) - 1); // Dec 31, 23:59:59.999
    ranges.push({
      from: yearStart < from ? from : yearStart,
      to: yearEnd > to ? to : yearEnd,
    });
  }
  return ranges;
}

async function fetchUserInfo(login, options) {
  return githubGraphQL(GRAPHQL_QUERY_USER_INFO, { login }, options);
}

/** Loads the pages one after another, each from the cursor of the page before it. */
async function fetchRepositoriesInSequence(login, options) {
  const repositories = [];
  let after = null;

  do {
    const user = await githubGraphQL(GRAPHQL_QUERY_REPOSITORIES, { login, first: MAX_PAGE_SIZE, after }, options);
    repositories.push(...user.repositories.nodes);
    after = user.repositories.pageInfo.hasNextPage ? user.repositories.pageInfo.endCursor : null;
  } while (after);

  return repositories;
}

/**
 * Loads all repositories the user owns (forks excluded).
 *
 * GitHub only hands out one page after another, because each page needs the cursor of the page
 * before it, and a full page of 100 takes it 4-6 seconds. Loaded that way, an account with 400
 * repositories took 20 seconds. So a second, cursor-only query walks through the account (each
 * step takes a fraction of a second), and the full pages are requested side by side as soon as
 * their cursors are known.
 *
 * @param {string} login
 * @param {object} options
 * @param {number} options.deadline
 * @param {boolean} options.visitorIsWaiting True when a visitor waits for the result (the first
 *   load of an account): uses smaller pages and starts the cursor walk right away. Otherwise (a
 *   background refresh) it uses as few requests as possible: one for accounts up to 100 repositories.
 */
async function fetchRepositories(login, { visitorIsWaiting, ...options }) {
  const limit = createLimiter(MAX_PARALLEL_PAGES);
  const pages = [];
  const requestPage = (after, first) => {
    const page = limit(() => githubGraphQL(GRAPHQL_QUERY_REPOSITORIES, { login, first, after }, options)).then((user) => user.repositories);
    page.catch(() => {}); // a failure is reported by Promise.all below; this keeps it from counting as unhandled until then
    pages.push({ after, page });
    return page;
  };
  const whereThePageEnds = async (after, first) =>
    (await githubGraphQL(GRAPHQL_QUERY_REPOSITORY_CURSORS, { login, first, after }, options)).repositories;

  let pageSize = visitorIsWaiting ? pageSizeWhileWaiting(0) : MAX_PAGE_SIZE;
  const firstPage = requestPage(null, pageSize);
  // Where does the first page end? The cursor-only query knows sooner. When nobody is waiting,
  // the page itself tells, and an account that fits on one page needs no further request.
  let position = visitorIsWaiting ? await whereThePageEnds(null, pageSize) : await firstPage;
  if (visitorIsWaiting) pageSize = pageSizeWhileWaiting(position.totalCount);

  while (position.pageInfo.hasNextPage) {
    const after = position.pageInfo.endCursor;
    requestPage(after, pageSize);
    position = await whereThePageEnds(after, pageSize);
  }

  const loaded = await Promise.all(pages.map(({ page }) => page));

  // Every page must end exactly where the next one starts. If a repository was created or deleted
  // while the pages were loading, they no longer line up; then load them the plain way.
  const linedUp = loaded.every((page, i) => (i + 1 < pages.length
    ? page.pageInfo.hasNextPage && page.pageInfo.endCursor === pages[i + 1].after
    : !page.pageInfo.hasNextPage));
  if (!linedUp) {
    console.warn(`Repositories of ${login} changed while loading; loading them again one page at a time`);
    return fetchRepositoriesInSequence(login, options);
  }

  return loaded.flatMap((page) => page.nodes);
}

/** Returns daily contribution counts as { 'YYYY-MM-DD': { total } }. */
async function fetchContributionsCalendar(login, from, to, options) {
  const results = await Promise.all(splitByYear(from, to).map(async (range) => {
    const user = await githubGraphQL(GRAPHQL_QUERY_CONTRIBUTIONS_CALENDAR, {
      login,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    }, options);
    return user.contributionsCollection.contributionCalendar.weeks;
  }));

  const calendar = {};
  for (const weeks of results) {
    for (const week of weeks) {
      for (const day of week.contributionDays) {
        calendar[day.date] = { total: (calendar[day.date]?.total ?? 0) + day.contributionCount };
      }
    }
  }
  return calendar;
}

async function fetchContributionTotals(login, range, options) {
  const user = await githubGraphQL(GRAPHQL_QUERY_CONTRIBUTIONS_TOTALS, {
    login,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  }, options);
  return user.contributionsCollection;
}

/** Contribution totals for each year before `currentYearStart`, from the long-lived cache when possible. */
async function fetchPastYearsContributions(login, createdAt, currentYearStart, options) {
  const accountCreated = new Date(createdAt);
  if (accountCreated >= currentYearStart) return [];

  const ranges = splitByYear(accountCreated, new Date(currentYearStart.getTime() - 1));
  return Promise.all(ranges.map((range) => getOrLoad(
    `github:v1:contributions:${login.toLowerCase()}:${range.from.getUTCFullYear()}`,
    () => fetchContributionTotals(login, range, options),
    { ttlMs: PAST_YEARS_TTL_MS },
  )));
}

const sumContributions = (years) => years.reduce((totals, year) => ({
  commits: totals.commits + year.totalCommitContributions,
  prs: totals.prs + year.totalPullRequestContributions,
  reviews: totals.reviews + year.totalPullRequestReviewContributions,
  issues: totals.issues + year.totalIssueContributions,
}), { commits: 0, prs: 0, reviews: 0, issues: 0 });

/** Aggregates language size and repo count across repositories, keyed by language name. */
function calculateTopLanguages(repositories) {
  const languages = {};
  for (const repo of repositories) {
    for (const { size, node } of repo.languages.edges) {
      languages[node.name] ??= { size: 0, count: 0, color: node.color };
      languages[node.name].size += size;
      languages[node.name].count += 1;
    }
  }
  return languages;
}

/**
 * Fetches everything needed to render a user's GitHub stats card.
 *
 * @param {string} username GitHub login (already validated by the API handler).
 * @param {object} [options]
 * @param {number} [options.deadline] Epoch ms by which all GitHub calls must finish.
 * @param {boolean} [options.background] True for a refresh nobody waits for: it then uses as few
 *   GitHub requests as possible. Otherwise a visitor is waiting and speed comes first.
 */
async function fetchGitHubData(username, { deadline = Date.now() + 25000, background = false } = {}) {
  const options = { deadline };
  const now = new Date();
  const currentYearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const calendarFrom = new Date(now);
  calendarFrom.setUTCDate(now.getUTCDate() - config.contribution_distribution.days_to_show + 1);

  const startedAt = Date.now();
  // Everything starts at once. Only the past years' totals need something first: the account's
  // creation date. On a refresh they come from the cache and the date is taken from the user
  // info. When a visitor is waiting they have to be fetched, one request per year, and that is
  // the slowest part for an old account; so the date is asked for separately, which takes a
  // fraction of the time the user info does.
  const userInfoPromise = fetchUserInfo(username, options);
  const createdAtPromise = background
    ? userInfoPromise.then((user) => user.createdAt)
    : githubGraphQL(GRAPHQL_QUERY_USER_CREATED_AT, { login: username }, options).then((user) => user.createdAt);
  const [userInfo, repositories, contributionsCalendar, currentYear, pastYears] = await Promise.all([
    userInfoPromise,
    fetchRepositories(username, { ...options, visitorIsWaiting: !background }),
    fetchContributionsCalendar(username, calendarFrom, now, options),
    fetchContributionTotals(username, { from: currentYearStart, to: now }, options),
    createdAtPromise.then((createdAt) => fetchPastYearsContributions(username, createdAt, currentYearStart, options)),
  ]);
  console.log(`GitHub API calls (${username}): ${Date.now() - startedAt}ms`);

  const allTimeContributions = sumContributions([...pastYears, currentYear]);
  const languages = calculateTopLanguages(repositories);

  const stats = {
    login: userInfo.login,
    name: userInfo.name || userInfo.login,
    followers: userInfo.followers.totalCount,
    total_commits: allTimeContributions.commits,
    total_prs: allTimeContributions.prs,
    total_prs_reviewed: allTimeContributions.reviews,
    total_issues: allTimeContributions.issues,
    total_merged_prs: userInfo.mergedPullRequests.totalCount,
    total_repos: repositories.length,
    total_stars: repositories.reduce((sum, repo) => sum + repo.stargazers.totalCount, 0),
    total_forks: repositories.reduce((sum, repo) => sum + repo.forkCount, 0),
    total_contributes_to: userInfo.repositoriesContributedTo.totalCount,
    total_discussions_started: userInfo.repositoryDiscussions.totalCount,
    total_discussions_answered: userInfo.repositoryDiscussionComments.totalCount,
    contribution_distribution: contributionsCalendar,
  };

  // Merged and total PRs both come from `user.pullRequests`, so the ratio is consistent
  // and can't exceed 100%. (total_prs above counts PR contributions, a different source.)
  const allPullRequests = userInfo.allPullRequests.totalCount;
  stats.merged_prs_percentage = allPullRequests ? (stats.total_merged_prs / allPullRequests) * 100 : 0;

  stats.rank = calculateRank({
    all_commits: true,
    commits: stats.total_commits,
    prs: stats.total_prs,
    issues: stats.total_issues,
    reviews: stats.total_prs_reviewed,
    repos: stats.total_repos,
    stars: stats.total_stars,
    followers: stats.followers,
  });

  stats.language_percentages = calculateLanguagePercentage(languages);

  return stats;
}

export default fetchGitHubData;
