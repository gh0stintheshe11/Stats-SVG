const axios = require('axios');
require('dotenv').config();

const MAX_CONCURRENT_REQUESTS = 20;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const GRAPHQL_QUERY_USER_INFO = `
  query userInfo($login: String!, $after: String) {
    user(login: $login) {
      name
      login
      followers {
        totalCount
      }
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalIssueContributions
        pullRequestContributionsByRepository(maxRepositories: 100) {
          repository {
            name
            owner {
              login
            }
            pullRequests(states: MERGED) {
              totalCount
            }
          }
          contributions {
            totalCount
          }
        }
      }
      repositoriesContributedTo(contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY], first: 100) {
        totalCount
        nodes {
          name
          owner {
            login
          }
        }
      }
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: {field: CREATED_AT, direction: DESC}, after: $after) {
        totalCount
        nodes {
          name
          owner {
            login
          }
          stargazers {
            totalCount
          }
          pullRequests(states: [MERGED]) {
            totalCount
          }
          issues(states: [OPEN, CLOSED]) {
            totalCount
          }
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
        pageInfo {
          hasNextPage
          endCursor
        }
      }
      pullRequests(states: MERGED) {
        totalCount
      }
    }
  }
`;

async function fetchDiscussionsFromRepo(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/discussions`;
  const headers = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  try {
    const response = await axios.get(url, { headers });
    const discussions = response.data;

    let total_discussions_answered = 0;
    for (const discussion of discussions) {
      if (discussion.answer) total_discussions_answered++;
    }

    const metrics = {
      total_discussions_started: discussions.length,
      total_discussions_answered
    };

    return metrics;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`No discussions found for ${owner}/${repo}`);
    } else {
      console.error(`Error fetching discussions from ${owner}/${repo}:`, error);
    }
    return { total_discussions_started: 0, total_discussions_answered: 0 };
  }
}

async function fetchDiscussionMetrics(repos) {
  const discussionMetrics = { total_discussions_started: 0, total_discussions_answered: 0 };
  
  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(MAX_CONCURRENT_REQUESTS);

  const limitedFetchPromises = repos.map(repo =>
    limit(() => fetchDiscussionsFromRepo(repo.owner.login, repo.name))
  );

  const results = await Promise.all(limitedFetchPromises);

  results.forEach(metrics => {
    discussionMetrics.total_discussions_started += metrics.total_discussions_started;
    discussionMetrics.total_discussions_answered += metrics.total_discussions_answered;
  });

  return discussionMetrics;
}

async function fetchGitHubData(username) {
  const url = 'https://api.github.com/graphql';
  const headers = {
    'Authorization': `bearer ${process.env.GITHUB_TOKEN}`,
    'Content-Type': 'application/json'
  };
  const variables = { login: username };

  try {
    const response = await axios.post(url, {
      query: GRAPHQL_QUERY_USER_INFO,
      variables
    }, { headers });

    const user = response.data.data.user || {};
    if (!user) {
      throw new Error(`User ${username} not found`);
    }
    
    const contributionsCollection = user.contributionsCollection || {};
    const repositories = user.repositories || {};
    const reposNodes = repositories.nodes || [];
    const contributedRepos = user.repositoriesContributedTo.nodes || [];

    let totalMergedPRs = 0;
    contributionsCollection.pullRequestContributionsByRepository.forEach(repo => {
      totalMergedPRs += repo.repository.pullRequests.totalCount;
    });

    const stats = {
      name: user.name || user.login,
      followers: user.followers.totalCount || 0,
      total_commits: contributionsCollection.totalCommitContributions || 0,
      total_prs: contributionsCollection.totalPullRequestContributions || 0,
      total_prs_reviewed: contributionsCollection.totalPullRequestReviewContributions || 0,
      total_issues: contributionsCollection.totalIssueContributions || 0,
      total_merged_prs: user.pullRequests.totalCount || 0,
      total_repos: repositories.totalCount || 0,
      total_stars: 0,
      top_languages: {}
    };

    const languageCounts = {};
    reposNodes.forEach(repo => {
      stats.total_stars += repo.stargazers ? repo.stargazers.totalCount : 0;

      if (repo.languages) {
        repo.languages.edges.forEach(({ size, node }) => {
          if (!languageCounts[node.name]) {
            languageCounts[node.name] = { size: 0, color: node.color, count: 0 };
          }
          languageCounts[node.name].size += size;
          languageCounts[node.name].count += 1;
        });
      }
    });

    stats.merged_prs_percentage = stats.total_prs ? (stats.total_merged_prs / stats.total_prs) * 100 : 0;

    stats.top_languages = Object.keys(languageCounts)
      .sort((a, b) => languageCounts[b].size - languageCounts[a].size)
      .reduce((result, key) => {
        result[key] = languageCounts[key];
        return result;
      }, {});

    const discussionMetrics = await fetchDiscussionMetrics([...reposNodes, ...contributedRepos]);
    stats.total_discussions_started = discussionMetrics.total_discussions_started;
    stats.total_discussions_answered = discussionMetrics.total_discussions_answered;

    return stats;

  } catch (error) {
    console.error('Error fetching data from GitHub:', error);
    throw error;
  }

}

module.exports = { fetchGitHubData };
