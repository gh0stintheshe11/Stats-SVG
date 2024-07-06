const axios = require('axios');
require('dotenv').config();

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
      repositoriesContributedTo(last: 100, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) {
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
    }
  }
`;

const GRAPHQL_QUERY_REPO_INFO = `
  fragment RepoInfo on Repository {
    name
    nameWithOwner
    isPrivate
    isArchived
    isTemplate
    stargazers {
      totalCount
    }
    description
    primaryLanguage {
      color
      id
      name
    }
    forkCount
  }
  query getRepo($login: String!, $repo: String!) {
    user(login: $login) {
      repository(name: $repo) {
        ...RepoInfo
      }
    }
    organization(login: $login) {
      repository(name: $repo) {
        ...RepoInfo
      }
    }
  }
`;

async function fetchDiscussionsFromRepo(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/discussions`;
  const headers = {
    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  try {
    const response = await axios.get(url, { headers });
    const discussions = response.data;

    const metrics = {
      total_discussions_started: discussions.length,
      total_discussions_answered: discussions.filter(discussion => discussion.answer).length
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

  for (const repo of repos) {
    const { owner, name } = repo;
    const metrics = await fetchDiscussionsFromRepo(owner.login, name);
    discussionMetrics.total_discussions_started += metrics.total_discussions_started;
    discussionMetrics.total_discussions_answered += metrics.total_discussions_answered;
  }

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

    console.log('GitHub API response:', response.data);

    const user = response.data.data.user;

    if (!user) {
      throw new Error('User not found');
    }

    const contributionsCollection = user.contributionsCollection || {};
    const repositories = user.repositories || {};
    const reposNodes = repositories.nodes || [];
    const contributedRepos = user.repositoriesContributedTo.nodes || [];

    // Calculate total merged PRs and other metrics
    let totalMergedPRs = 0;
    contributionsCollection.pullRequestContributionsByRepository.forEach(repo => {
      totalMergedPRs += repo.repository.pullRequests.totalCount;
    });

    const stats = {
      name: user.name || user.login,
      total_commits: contributionsCollection.totalCommitContributions || 0,
      total_prs: contributionsCollection.totalPullRequestContributions || 0,
      total_prs_reviewed: contributionsCollection.totalPullRequestReviewContributions || 0,
      total_issues: contributionsCollection.totalIssueContributions || 0,
      total_merged_prs: totalMergedPRs,
      merged_prs_percentage: (totalMergedPRs / contributionsCollection.totalPullRequestContributions) * 100,
      total_repos: repositories.totalCount || 0,
      total_stars: reposNodes.reduce((sum, repo) => sum + (repo.stargazers ? repo.stargazers.totalCount : 0), 0),
      top_languages: {}
    };

    // Calculate top languages
    const languageCounts = {};
    reposNodes.forEach(repo => {
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

    stats.top_languages = Object.keys(languageCounts)
      .sort((a, b) => languageCounts[b].size - languageCounts[a].size)
      .reduce((result, key) => {
        result[key] = languageCounts[key];
        return result;
      }, {});

    // Combine owned and contributed repositories
    const allRepos = [...reposNodes, ...contributedRepos];

    // Fetching discussions metrics
    const discussionMetrics = await fetchDiscussionMetrics(allRepos);
    stats.total_discussions_started = discussionMetrics.total_discussions_started;
    stats.total_discussions_answered = discussionMetrics.total_discussions_answered;

    return stats;

  } catch (error) {
    console.error('Error fetching data from GitHub:', error);
    throw error;
  }
}

async function fetchRepo(username, reponame) {
  const url = 'https://api.github.com/graphql';
  const headers = {
    'Authorization': `bearer ${process.env.GITHUB_TOKEN}`,
    'Content-Type': 'application/json'
  };
  const variables = { login: username, repo: reponame };

  try {
    const response = await axios.post(url, {
      query: GRAPHQL_QUERY_REPO_INFO,
      variables
    }, { headers });

    const data = response.data.data;

    if (!data.user && !data.organization) {
      throw new Error("Not found");
    }

    const isUser = data.organization === null && data.user;
    const isOrg = data.user === null && data.organization;

    let repoData;
    if (isUser) {
      repoData = data.user.repository;
    } else if (isOrg) {
      repoData = data.organization.repository;
    }

    if (!repoData || repoData.isPrivate) {
      throw new Error("Repository not found or is private");
    }

    const repoDetails = {
      ...repoData,
      starCount: repoData.stargazers.totalCount
    };

    return repoDetails;

  } catch (error) {
    console.error('Error fetching repository data from GitHub:', error);
    throw error;
  }
}

module.exports = { fetchGitHubData, fetchRepo };