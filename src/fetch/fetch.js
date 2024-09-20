import axios from 'axios';
import 'dotenv/config';
import { calculateLanguagePercentage } from '../utils/calculateLang.js';
import { calculateRank } from '../utils/calculateRank.js';
import pkg from 'http2-wrapper';
const { http2Adapter } = pkg;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const http2Axios = axios.create({
  adapter: http2Adapter,
});

const GRAPHQL_QUERY_USER_INFO = `
  query userInfo($login: String!) {
    user(login: $login) {
      name
      login
      followers {
        totalCount
      }
    }
  }
`;

const GRAPHQL_QUERY_PULL_REQUESTS = `
  query userPullRequests($login: String!) {
    user(login: $login) {
      pullRequests(states: MERGED) {
        totalCount
      }
    }
  }
`;

const GRAPHQL_QUERY_DISCUSSIONS = `
  query userDiscussions($login: String!) {
    user(login: $login) {
      repositoryDiscussions {
        totalCount
      }
      repositoryDiscussionComments(onlyAnswers: true) {
        totalCount
      }
    }
  }
`;

const GRAPHQL_QUERY_CONTRIBUTIONS = `
  query userContributions($login: String!) {
    user(login: $login) {
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalIssueContributions
      }
    }
  }
`;

const GRAPHQL_QUERY_REPOSITORIES = `
  query userRepositories($login: String!) {
    user(login: $login) {
      repositoriesContributedTo(contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY], first: 100) {
        totalCount
      }
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: {field: CREATED_AT, direction: DESC}) {
        totalCount
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

// Add a simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

async function fetchGitHubData(username) {
  console.log('Fetching data for', username);

  // Check if we have cached data
  const cachedData = cache.get(username);
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
    console.log('Returning cached data for', username);
    return cachedData.data;
  }

  const url = 'https://api.github.com/graphql';
  const headers = {
    'Authorization': `bearer ${GITHUB_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    console.time('GitHub API Requests');
    const [
      userInfoResponse,
      pullRequestsResponse,
      discussionsResponse,
      contributionsResponse,
      repositoriesResponse
    ] = await Promise.all([
      http2Axios.post(url, { query: GRAPHQL_QUERY_USER_INFO, variables: { login: username } }, { headers }),
      http2Axios.post(url, { query: GRAPHQL_QUERY_PULL_REQUESTS, variables: { login: username } }, { headers }),
      http2Axios.post(url, { query: GRAPHQL_QUERY_DISCUSSIONS, variables: { login: username } }, { headers }),
      http2Axios.post(url, { query: GRAPHQL_QUERY_CONTRIBUTIONS, variables: { login: username } }, { headers }),
      http2Axios.post(url, { query: GRAPHQL_QUERY_REPOSITORIES, variables: { login: username } }, { headers })
    ]);
    console.timeEnd('GitHub API Requests');

    console.log('User Info Response:', JSON.stringify(userInfoResponse.data, null, 2));
    console.log('Pull Requests Response:', JSON.stringify(pullRequestsResponse.data, null, 2));
    console.log('Discussions Response:', JSON.stringify(discussionsResponse.data, null, 2));
    console.log('Contributions Response:', JSON.stringify(contributionsResponse.data, null, 2));
    console.log('Repositories Response:', JSON.stringify(repositoriesResponse.data, null, 2));

    const userInfo = userInfoResponse.data?.data?.user;
    const pullRequests = pullRequestsResponse.data?.data?.user;
    const discussions = discussionsResponse.data?.data?.user;
    const contributions = contributionsResponse.data?.data?.user?.contributionsCollection;
    const repositories = repositoriesResponse.data?.data?.user;

    if (!userInfo) throw new Error(`User ${username} not found`);

    console.time('Data Processing');
    const stats = {
      login: userInfo.login,
      name: userInfo.name || userInfo.login,
      followers: userInfo.followers?.totalCount || 0,
      total_commits: contributions?.totalCommitContributions || 0,
      total_prs: contributions?.totalPullRequestContributions || 0,
      total_prs_reviewed: contributions?.totalPullRequestReviewContributions || 0,
      total_issues: contributions?.totalIssueContributions || 0,
      total_merged_prs: pullRequests?.pullRequests?.totalCount || 0,
      total_repos: repositories?.repositories?.totalCount || 0,
      total_stars: repositories?.repositories?.nodes?.reduce((acc, repo) => acc + (repo.stargazers?.totalCount || 0), 0) || 0,
      total_forks: repositories?.repositories?.nodes?.reduce((acc, repo) => acc + (repo.forkCount || 0), 0) || 0,
      total_contributes_to: repositories?.repositoriesContributedTo?.totalCount || 0,
      top_languages: calculateTopLanguages(repositories?.repositories?.nodes || []),
      total_discussions_started: discussions?.repositoryDiscussions?.totalCount || 0,
      total_discussions_answered: discussions?.repositoryDiscussionComments?.totalCount || 0
    };

    stats.merged_prs_percentage = stats.total_prs ? (stats.total_merged_prs / stats.total_prs) * 100 : 0;

    stats.rank = calculateRank({
      commits: stats.total_commits,
      prs: stats.total_prs,
      issues: stats.total_issues,
      reviews: stats.total_prs_reviewed,
      repos: stats.total_repos,
      stars: stats.total_stars,
      followers: stats.followers
    });

    stats.language_percentages = calculateLanguagePercentage(stats.top_languages);
    console.timeEnd('Data Processing');

    // Cache the results
    cache.set(username, { data: stats, timestamp: Date.now() });

    return stats;

  } catch (error) {
    console.error('Error fetching data from GitHub:', error);
    throw error;
  }
}

function calculateTopLanguages(reposNodes) {
  const languageCounts = {};
  reposNodes.forEach(repo => {
    repo.languages.edges.forEach(({ size, node }) => {
      if (!languageCounts[node.name]) {
        languageCounts[node.name] = { size: 0, color: node.color, count: 0 };
      }
      languageCounts[node.name].size += size;
      languageCounts[node.name].count += 1;
    });
  });

  return Object.entries(languageCounts)
    .sort(([, a], [, b]) => b.size - a.size)
    .reduce((result, [key, value]) => ({ ...result, [key]: value }), {});
}

export default fetchGitHubData;