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
      repositoriesContributedTo(contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY], first: 100, includeUserRepositories: true) {
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

const GRAPHQL_QUERY_CONTRIBUTIONS_CALENDAR = `
  query userContributions($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
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

// Add a simple in-memory cache
const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes in milliseconds

async function fetchGitHubData(username) {
  console.log('Fetching data for', username);

  // Check if we have cached data
  const cachedData = cache.get(username);
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
    return cachedData.data;
  }

  const url = 'https://api.github.com/graphql';
  const headers = {
    'Authorization': `bearer ${GITHUB_TOKEN}`,
    'Content-Type': 'application/json'
  };

  const now = new Date();
  const fromDate = new Date(now);
  fromDate.setDate(now.getDate() - config.contribution_distribution.days_to_show + 1);

  try {
    console.time('GitHub API calls');

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

    async function fetchContributionsCalendar(username, fromDate, toDate) {
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);

      // Check if the date period is greater than 1 year
      const isMoreThanOneYear = (endDate - startDate) > (365 * 24 * 60 * 60 * 1000);

      if (isMoreThanOneYear) {
        const promises = [];

        // Separate the date range by year
        for (let year = startDate.getFullYear(); year <= endDate.getFullYear(); year++) {
          const yearStartDate = new Date(year, 0, 1); // January 1st of the current year
          const yearEndDate = new Date(year, 11, 31); // December 31st of the current year

          // Adjust the start and end dates if they fall outside the specified range
          const from = yearStartDate < startDate ? startDate : yearStartDate;
          const to = yearEndDate > endDate ? endDate : yearEndDate;

          // Create a promise for the current year range
          promises.push(fetchContributionsForYear(url, headers, username, from, to));
        }

        // Wait for all promises to resolve
        const results = await Promise.all(promises);

        // Combine results
        const combinedResult = results.reduce((acc, curr) => {
          for (const date in curr) {
            if (!acc[date]) {
              acc[date] = { total: 0 };
            }
            acc[date].total += curr[date].total;
          }
          return acc;
        }, {});

        // Log the length of the combined result
        console.log(Object.keys(combinedResult).length);
        return combinedResult;

      } else {
        // If the period is 1 year or less, run a normal query
        return fetchContributionsForYear(url, headers, username, startDate, endDate);
      }
    }

    const [userInfo, repositories, contributionsCalendar] = await Promise.all([
      fetchUserInfo(),
      fetchRepositories(),
      fetchContributionsCalendar(username, fromDate, now)
    ]);

    console.timeEnd('GitHub API calls');

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

    stats.merged_prs_percentage = stats.total_prs ? Math.min((stats.total_merged_prs / stats.total_prs) * 100, 100) : 0;

    stats.rank = calculateRank({
      all_commits: true,
      commits: stats.total_commits,
      prs: stats.total_prs,
      issues: stats.total_issues,
      reviews: stats.total_prs_reviewed,
      repos: stats.total_repos,
      stars: stats.total_stars,
      followers: stats.followers
    });

    stats.language_percentages = calculateLanguagePercentage(stats.top_languages);

    stats.contribution_distribution = await processContributionsCalendar(contributionsCalendar);

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
  
// Process contributions calendar in date:{total:value}
async function processContributionsCalendar(contributionsCollection) {
  const result = {};

  // Check if contributionsCollection is a valid object
  if (contributionsCollection && typeof contributionsCollection === 'object') {
    // Iterate over the keys (dates) in the contributionsCollection
    for (const date in contributionsCollection) {
      if (contributionsCollection.hasOwnProperty(date)) {
        const total = contributionsCollection[date].total || 0; // Use 0 if total is undefined
        result[date] = { total }; // Store the total contributions for the date
      }
    }
  } else {
    console.warn('Invalid contributionsCollection:', contributionsCollection);
  }

  return result;
}

async function fetchContributionsForYear(url, headers, username, fromDate, toDate) {
  const response = await http2Axios.post(url, { 
    query: GRAPHQL_QUERY_CONTRIBUTIONS_CALENDAR, 
    variables: { login: username, from: fromDate.toISOString(), to: toDate.toISOString() } 
  }, { headers });

  const contributionsCollection = response.data?.data?.user?.contributionsCollection;
  const result = {};

  // Check if contributionsCollection and contributionCalendar exist
  if (contributionsCollection && contributionsCollection.contributionCalendar) {
    for (const week of contributionsCollection.contributionCalendar.weeks) {
      for (const day of week.contributionDays) {
        // Initialize the date entry if it doesn't exist
        if (!result[day.date]) {
          result[day.date] = { total: 0 }; // Initialize total contributions for the date
        }
        // Accumulate contributions for the date
        result[day.date].total += day.contributionCount;
      }
    }
  }

  return result;
}

export default fetchGitHubData;