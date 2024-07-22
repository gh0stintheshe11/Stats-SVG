import axios from 'axios';
import pLimit from 'p-limit';
import 'dotenv/config';
import { calculateLanguagePercentage } from '../utils/calculateLang.js';
import { calculateRank } from '../utils/calculateRank.js';
import pkg from 'http2-wrapper';
const { http2Adapter } = pkg;

const MAX_CONCURRENCE = 5;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const http2Axios = axios.create({
  adapter: http2Adapter,
});

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
      repositoryDiscussions {
        totalCount
      }
      repositoryDiscussionComments(onlyAnswers: true) {
        totalCount
      }
    }
  }
`;

async function fetchGitHubData(username) {
  const url = 'https://api.github.com/graphql';
  const headers = {
    'Authorization': `bearer ${GITHUB_TOKEN}`,
    'Content-Type': 'application/json'
  };
  const variables = { login: username };

  try {
    const response = await http2Axios.post(url, {
      query: GRAPHQL_QUERY_USER_INFO,
      variables
    }, { headers });

    const data = response.data;
    //console.log('Raw Response from GitHub:', JSON.stringify(data, null, 2)); // Debugging line

    const user = data.data?.user;
    if (!user) {
      throw new Error(`User ${username} not found`);
    }

    const contributionsCollection = user.contributionsCollection || {};
    const repositories = user.repositories || {};
    const reposNodes = repositories.nodes || [];

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
      total_contributes_to: user.repositoriesContributedTo.totalCount || 0,
      top_languages: {},
      total_discussions_started: user.repositoryDiscussions?.totalCount || 0,
      total_discussions_answered: user.repositoryDiscussionComments?.totalCount || 0
    };

    const languageCounts = {};
    const limit = pLimit(MAX_CONCURRENCE);
    const languagePromises = reposNodes.map(repo => limit(() => fetchRepoLanguages(repo)));

    async function fetchRepoLanguages(repo) {
      let repoStars = repo.stargazers ? repo.stargazers.totalCount : 0;
      let repoLanguages = repo.languages ? repo.languages.edges.reduce((acc, { size, node }) => {
        acc[node.name] = acc[node.name] || { size: 0, color: node.color, count: 0 };
        acc[node.name].size += size;
        acc[node.name].count += 1;
        return acc;
      }, {}) : {};
    
      return { repoStars, repoLanguages };
    }
    
    // Process results more efficiently
    const results = await Promise.all(languagePromises);
    results.forEach(({ repoStars, repoLanguages }) => {
      stats.total_stars += repoStars;
      Object.entries(repoLanguages).forEach(([language, { size, color, count }]) => {
        if (!languageCounts[language]) {
          languageCounts[language] = { size, color, count };
        } else {
          languageCounts[language].size += size;
          languageCounts[language].count += count;
        }
      });
    });
    
    // Optimized data processing
    stats.top_languages = Object.entries(languageCounts)
      .sort(([, a], [, b]) => b.size - a.size)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    stats.merged_prs_percentage = stats.total_prs ? (stats.total_merged_prs / stats.total_prs) * 100 : 0;

    stats.top_languages = Object.keys(languageCounts)
      .sort((a, b) => languageCounts[b].size - languageCounts[a].size)
      .reduce((result, key) => {
        result[key] = languageCounts[key];
        return result;
      }, {});

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

    return stats;

  } catch (error) {
    console.error('Error fetching data from GitHub:', error);
    throw error;
  }
}

export default fetchGitHubData;