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

// 25 languages spread over two repos, so the "top 20" cut is exercised.
const LANGUAGES = Array.from({ length: 25 }, (_, i) => ({
  size: 1000 * (25 - i),
  node: { name: i === 0 ? 'Jupyter Notebook' : `Lang${i}`, color: '#123456' },
}));

/**
 * Builds a responder for mockFetch.
 *
 * @param {object} [options]
 * @param {string} [options.name] Display name of the user.
 * @param {boolean} [options.emptyCalendar] Return no contribution days.
 * @param {string} [options.languageColor] Color for the second language (to test unsafe colors).
 */
export function githubApi({ name = 'Octo Cat', emptyCalendar = false, languageColor } = {}) {
  return ({ body }) => {
    const operation = body.query.match(/query (\w+)/)[1];
    const { login, from, to, after } = body.variables;

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

      case 'userRepositories': {
        const languages = LANGUAGES.map((edge, i) => (i === 1 && languageColor ? { ...edge, node: { ...edge.node, color: languageColor } } : edge));
        const firstPage = !after;
        return { data: { user: { repositories: {
          pageInfo: { hasNextPage: firstPage, endCursor: firstPage ? 'cursor-1' : null },
          nodes: [
            { stargazers: { totalCount: 60 }, forkCount: 15, languages: { edges: languages.slice(0, 13) } },
            { stargazers: { totalCount: 60 }, forkCount: 15, languages: { edges: languages.slice(13) } },
          ],
        } } } };
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
}

export const ACCOUNT_CREATED_YEAR = new Date(CREATED_AT).getUTCFullYear();

/** A GraphQL error response like the ones GitHub sends with HTTP 200. */
export const graphQLError = (type) => ({ data: { user: null }, errors: [{ type, message: `mock ${type}` }] });
