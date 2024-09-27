import axios from 'axios';
import 'dotenv/config';
import { calculateLanguagePercentage } from '../utils/calculateLang.js';
import { calculateRank } from '../utils/calculateRank.js';
import config from '../../config.js';
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
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalIssueContributions
      }
      pullRequests(states: MERGED) {
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
      repositoriesContributedTo(contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY], first: 100) {
        totalCount
      }
      repositories(first: 100, after: $after, ownerAffiliations: OWNER, isFork: false, orderBy: {field: CREATED_AT, direction: DESC}) {
        totalCount
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

const GRAPHQL_QUERY_CONTRIBUTIONS_DISTRIBUTION = `
  query userContributions($login: String!, $from: DateTime!, $to: DateTime!, $after: String) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        commitContributionsByRepository {
          contributions(first: 100, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              commitCount
              occurredAt
            }
          }
        }
        issueContributions(first: 100, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            occurredAt
            issue {
              state
            }
          }
        }
        pullRequestContributions(first: 100, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            occurredAt
            pullRequest {
              state
            }
          }
        }
      }
    }
  }
`;

// Add a simple in-memory cache
const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 5 minutes in milliseconds

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

  const now = new Date();
  const fromDate = new Date(now);
  fromDate.setDate(now.getDate() - config.contribution_distribution.days_to_show);

  try {
    console.time('GitHub API Requests');

    const fetchUserInfo = async () => {
      const response = await http2Axios.post(url, { query: GRAPHQL_QUERY_USER_INFO, variables: { login: username } }, { headers });
      return response.data?.data?.user;
    };

    const fetchRepositories = async () => {
      let allRepositories = [];
      let hasNextPage = true;
      let after = null;
      let contributedToCount = 0;

      while (hasNextPage) {
        const response = await http2Axios.post(url, { 
          query: GRAPHQL_QUERY_REPOSITORIES, 
          variables: { login: username, after } 
        }, { headers });

        const data = response.data?.data?.user;
        if (!data) {
          throw new Error('No user data returned from GitHub API');
        }

        allRepositories = allRepositories.concat(data.repositories.nodes);
        hasNextPage = data.repositories.pageInfo.hasNextPage;
        after = data.repositories.pageInfo.endCursor;

        // Only set this on the first iteration
        if (contributedToCount === 0) {
          contributedToCount = data.repositoriesContributedTo.totalCount;
        }
      }

      return { 
        repositories: { nodes: allRepositories }, 
        repositoriesContributedTo: { totalCount: contributedToCount }
      };
    };

    const fetchContributionsDistribution = async () => {
      const response = await http2Axios.post(url, { 
        query: GRAPHQL_QUERY_CONTRIBUTIONS_DISTRIBUTION, 
        variables: { login: username, from: fromDate.toISOString(), to: now.toISOString() } 
      }, { headers });
      return response.data?.data?.user?.contributionsCollection;
    };

    const [userInfo, repositories, contributionsDistribution] = await Promise.all([
      fetchUserInfo(),
      fetchRepositories(),
      fetchContributionsDistribution()
    ]);

    console.timeEnd('GitHub API Requests');

    if (!userInfo) throw new Error(`User ${username} not found`);

    console.time('Data Processing');

    const stats = {
      login: userInfo.login,
      name: userInfo.name || userInfo.login,
      followers: userInfo.followers?.totalCount || 0,
      total_commits: userInfo.contributionsCollection?.totalCommitContributions || 0,
      total_prs: userInfo.contributionsCollection?.totalPullRequestContributions || 0,
      total_prs_reviewed: userInfo.contributionsCollection?.totalPullRequestReviewContributions || 0,
      total_issues: userInfo.contributionsCollection?.totalIssueContributions || 0,
      total_merged_prs: userInfo.pullRequests?.totalCount || 0,
      total_repos: repositories.repositories?.nodes?.length || 0,
      total_stars: repositories.repositories?.nodes?.reduce((acc, repo) => acc + (repo.stargazers?.totalCount || 0), 0) || 0,
      total_forks: repositories.repositories?.nodes?.reduce((acc, repo) => acc + (repo.forkCount || 0), 0) || 0,
      total_contributes_to: repositories.repositoriesContributedTo?.totalCount || 0,
      top_languages: calculateTopLanguages(repositories.repositories?.nodes || []),
      total_discussions_started: userInfo.repositoryDiscussions?.totalCount || 0,
      total_discussions_answered: userInfo.repositoryDiscussionComments?.totalCount || 0
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

    async function fetchMoreData(type, after) {
      const response = await http2Axios.post(url, {
        query: GRAPHQL_QUERY_CONTRIBUTIONS_DISTRIBUTION,
        variables: { login: username, from: fromDate.toISOString(), to: now.toISOString(), after }
      }, { headers });
      return response.data.data.user.contributionsCollection;
    }

    stats.contribution_distribution = await processContributionsDistribution(
      contributionsDistribution,
      fetchMoreData
    );

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

async function processContributionsDistribution(contributionsCollection, fetchMoreData) {
  if (!contributionsCollection) {
    console.error('contributionsCollection is undefined or missing.');
    return {};
  }

  const result = {};
  
  // Create a date range for the last 30 days
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - config.contribution_distribution.days_to_show + 1); 

  // Initialize all days in the range with zero contributions
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateString = d.toISOString().split('T')[0];
    result[dateString] = { commits: 0, issues: 0, pullRequests: 0, total: 0 };
  }
  
  // Helper function to add contributions to a specific date
  function addContribution(date, type, count) {
    if (result[date]) {
      result[date][type] += count;
      result[date].total += count;
    }
  }

  // Process all types of contributions
  async function processContributions(contributions, type, getCount = () => 1) {
    let hasNextPage = true;
    let endCursor = null;

    while (hasNextPage) {
      const { nodes, pageInfo } = contributions;
      nodes.forEach(node => {
        const date = node.occurredAt.split('T')[0];
        if (result[date]) { // Only add if the date is within our range
          addContribution(date, type, getCount(node));
        }
      });

      hasNextPage = pageInfo.hasNextPage;
      endCursor = pageInfo.endCursor;

      if (hasNextPage) {
        const moreData = await fetchMoreData(type, endCursor);
        contributions = moreData[`${type}Contributions`];
      }
    }
  }

  // Process commit contributions
  for (const repo of contributionsCollection.commitContributionsByRepository) {
    await processContributions(
      repo.contributions,
      'commits',
      node => node.commitCount
    );
  }

  // Process issue contributions
  await processContributions(contributionsCollection.issueContributions, 'issues');

  // Process pull request contributions
  await processContributions(contributionsCollection.pullRequestContributions, 'pullRequests');

  return result;
}

export default fetchGitHubData;