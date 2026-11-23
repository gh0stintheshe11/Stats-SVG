import config from '../../../config.js';
import { HttpError } from '../../lib/errors.js';
import { fetchJson } from '../../lib/http.js';
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

const GRAPHQL_QUERY_REPOSITORIES = `
  query userRepositories($login: String!, $after: String) {
    user(login: $login) {
      repositories(first: 100, after: $after, ownerAffiliations: OWNER, isFork: false, orderBy: {field: CREATED_AT, direction: DESC}) {
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

async function fetchRepositories(login, options) {
  const repositories = [];
  let after = null;

  do {
    const user = await githubGraphQL(GRAPHQL_QUERY_REPOSITORIES, { login, after }, options);
    repositories.push(...user.repositories.nodes);
    after = user.repositories.pageInfo.hasNextPage ? user.repositories.pageInfo.endCursor : null;
  } while (after);

  return repositories;
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
 */
async function fetchGitHubData(username, { deadline = Date.now() + 25000 } = {}) {
  const options = { deadline };
  const now = new Date();
  const currentYearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const calendarFrom = new Date(now);
  calendarFrom.setUTCDate(now.getUTCDate() - config.contribution_distribution.days_to_show + 1);

  const startedAt = Date.now();
  // Everything starts at once. Only the past years' totals wait for the account creation date
  // from the user info, and those usually come from the cache.
  const userInfoPromise = fetchUserInfo(username, options);
  const [userInfo, repositories, contributionsCalendar, currentYear, pastYears] = await Promise.all([
    userInfoPromise,
    fetchRepositories(username, options),
    fetchContributionsCalendar(username, calendarFrom, now, options),
    fetchContributionTotals(username, { from: currentYearStart, to: now }, options),
    userInfoPromise.then((user) => fetchPastYearsContributions(username, user.createdAt, currentYearStart, options)),
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
