// A fake GitHub GraphQL API, answering the queries made by src/cards/github/fetch.js.

const CREATED_AT = '2019-06-15T00:00:00Z';

function daysBetween(from, to) {
  const days = [];
  const day = new Date(from);
  day.setUTCHours(0, 0, 0, 0);
  for (; day <= new Date(to); day.setUTCDate(day.getUTCDate() + 1)) {
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

// 25 languages spread over the repositories, so the "top 20" cut is exercised.
const LANGUAGES = Array.from({ length: 25 }, (_, i) => ({
  size: 1000 * (25 - i),
  node: { name: i === 0 ? 'Jupyter Notebook' : `Lang${i}`, color: '#123456' },
}));

/**
 * Builds a responder for mockFetch.
 *
 * Repositories are paged like on GitHub: `first` items after the `after` cursor. The returned
 * function has a `repositories` array (tests may change it while a fetch is running) and
 * `maxPagesInFlight`, the highest number of repository pages requested at the same time.
 *
 * @param {object} [options]
 * @param {string} [options.name] Display name of the user.
 * @param {boolean} [options.emptyCalendar] Return no contribution days.
 * @param {string} [options.languageColor] Color for the second language (to test unsafe colors).
 * @param {number} [options.repositoryCount] How many repositories the user owns.
 * @param {(index: number) => number} [options.stars] Stars of repository number `index`.
 * @param {(index: number) => number} [options.forks] Forks of repository number `index`.
 * @param {number} [options.pageDelayMs] How long a repository page takes to answer.
 */
export function githubApi({ name = 'Octo Cat', emptyCalendar = false, languageColor, repositoryCount = 4, stars = () => 60, forks = () => 15, pageDelayMs = 0 } = {}) {
  const languages = LANGUAGES.map((edge, i) => (i === 1 && languageColor ? { ...edge, node: { ...edge.node, color: languageColor } } : edge));
  const repositories = Array.from({ length: repositoryCount }, (_, i) => ({
    id: `repo-${i}`,
    stargazers: { totalCount: stars(i) },
    forkCount: forks(i),
    languages: { edges: i % 2 === 0 ? languages.slice(0, 13) : languages.slice(13) },
  }));

  // A cursor names the repository a page ended with, like GitHub's do.
  const pageOf = ({ first, after }) => {
    const start = after ? repositories.findIndex((repo) => repo.id === after) + 1 : 0;
    const nodes = repositories.slice(start, start + first);
    return {
      totalCount: repositories.length,
      pageInfo: { hasNextPage: start + first < repositories.length, endCursor: nodes.at(-1)?.id ?? null },
      nodes: nodes.map(({ id, ...repo }) => repo),
    };
  };

  let pagesInFlight = 0;
  const respond = async ({ body }) => {
    const operation = body.query.match(/query (\w+)/)[1];
    const { login, from, to } = body.variables;

    switch (operation) {
      case 'userInfo':
        return { data: { user: {
          name, login, createdAt: CREATED_AT,
          followers: { totalCount: 15 },
          allPullRequests: { totalCount: 50 },
          mergedPullRequests: { totalCount: 45 },
          repositoriesContributedTo: { totalCount: 12 },
          repositoryDiscussions: { totalCount: 2 },
          repositoryDiscussionComments: { totalCount: 1 },
        } } };

      case 'userCreatedAt':
        return { data: { user: { createdAt: CREATED_AT } } };

      case 'userRepositories': {
        respond.maxPagesInFlight = Math.max(respond.maxPagesInFlight, ++pagesInFlight);
        const { totalCount, ...page } = pageOf(body.variables); // answered from the list as it is when the request arrives
        if (pageDelayMs) await new Promise((resolve) => setTimeout(resolve, pageDelayMs));
        pagesInFlight--;
        return { data: { user: { repositories: page } } };
      }

      case 'userRepositoryCursors': {
        const { nodes, ...page } = pageOf(body.variables);
        return { data: { user: { repositories: page } } };
      }

      case 'userContributions': {
        const days = emptyCalendar ? [] : daysBetween(from, to).map((date, i) => ({ date, contributionCount: i % 5 }));
        return { data: { user: { contributionsCollection: { contributionCalendar: { weeks: [{ contributionDays: days }] } } } } };
      }

      case 'userContributionTotals':
        return { data: { user: { contributionsCollection: {
          totalCommitContributions: 100,
          totalPullRequestContributions: 10,
          totalPullRequestReviewContributions: 3,
          totalIssueContributions: 5,
        } } } };

      default:
        throw new Error(`Unexpected GitHub query: ${operation}`);
    }
  };
  respond.repositories = repositories;
  respond.maxPagesInFlight = 0;
  return respond;
}

export const ACCOUNT_CREATED_YEAR = new Date(CREATED_AT).getUTCFullYear();

/** A GraphQL error response like the ones GitHub sends with HTTP 200. */
export const graphQLError = (type) => ({ data: { user: null }, errors: [{ type, message: `mock ${type}` }] });
