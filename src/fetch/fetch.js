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
          forkCount
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

    const { data: { data: { user } = {} } = {} } = response;
    if (!user) throw new Error(`User ${username} not found`);

    const { contributionsCollection = {}, repositories = {}} = user;
    const reposNodes = repositories.nodes || [];

    const stats = {
      login: user.login,
      name: user.name || user.login,
      followers: user.followers.totalCount || 0,
      total_commits: contributionsCollection.totalCommitContributions || 0,
      total_prs: contributionsCollection.totalPullRequestContributions || 0,
      total_prs_reviewed: contributionsCollection.totalPullRequestReviewContributions || 0,
      total_issues: contributionsCollection.totalIssueContributions || 0,
      total_merged_prs: user.pullRequests.totalCount || 0,
      total_repos: repositories.totalCount || 0,
      total_stars: reposNodes.reduce((acc, repo) => acc + repo.stargazers.totalCount, 0),
      total_forks: reposNodes.reduce((acc, repo) => acc + repo.forkCount, 0),
      total_contributes_to: user.repositoriesContributedTo.totalCount || 0,
      top_languages: calculateTopLanguages(reposNodes),
      total_discussions_started: user.repositoryDiscussions?.totalCount || 0,
      total_discussions_answered: user.repositoryDiscussionComments?.totalCount || 0
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