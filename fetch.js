const axios = require('axios');
require('dotenv').config();

const GRAPHQL_QUERY_USER_INFO = `
  query userInfo($login: String!) {
    user(login: $login) {
      name
      login
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
      }
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: {field: CREATED_AT, direction: DESC}) {
        totalCount
        nodes {
          name
          stargazers {
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

        const user = response.data.data.user;

        if (!user) {
            throw new Error('User not found');
        }

        const contributionsCollection = user.contributionsCollection || {};
        const repositories = user.repositories || {};
        const reposNodes = repositories.nodes || [];

        const stats = {
            name: user.name || user.login,
            total_commits: contributionsCollection.totalCommitContributions || 0,
            total_prs: contributionsCollection.totalPullRequestContributions || 0,
            total_issues: contributionsCollection.totalIssueContributions || 0,
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

        //console.log('Processed GitHub API response:', stats);
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
