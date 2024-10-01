import axios from 'axios';

// Add a simple in-memory cache
const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes in milliseconds

async function fetchLeetCodeStats(username) {
  const LEETCODE_API_ENDPOINT = 'https://leetcode.com/graphql';

  const skill_query = `
    query skillStats($username: String!) {
        matchedUser(username: $username) {
            tagProblemCounts {
                advanced {
                    tagName
                    tagSlug
                    problemsSolved
                }
                intermediate {
                    tagName
                    tagSlug
                    problemsSolved
                }
                fundamental {
                    tagName
                    tagSlug
                    problemsSolved
                }
            }
        }
    }
  `;

  const language_query = `
    query languageStats($username: String!) {
        matchedUser(username: $username) {
            languageProblemCount {
                languageName
                problemsSolved
            }
        }
    }
  `;

  const contest_query = `
    query userContestRankingInfo($username: String!) {
        userContestRanking(username: $username) {
            attendedContestsCount
            rating
            globalRanking
            topPercentage
            badge {
                name
            }
        }
    }
  `;

  const user_query = `
  query userPublicProfile($username: String!) {
    matchedUser(username: $username) {
      username
      submitStats: submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
          submissions
        }
        acRate: acSubmissionNum {
          difficulty
          count
        }
      }
      profile {
        ranking
        reputation
        starRating
      }
      badges {
        id
        displayName
        icon
      }
      upcomingBadges {
        name
        icon
      }
      activeBadge {
        displayName
      }
    }
  }`;

  try {

    // Check if we have cached data
    const cachedData = cache.get(username);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
        console.log('Returning cached data for', username);
        return cachedData.data;
    }

    console.time('leetcode API calls');
    const [user_data, skill_data, language_data, contest_data] = await Promise.all([
      axios.post(LEETCODE_API_ENDPOINT, {
        query: user_query,
        variables: { username: username }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com'
        }
      }),
      axios.post(LEETCODE_API_ENDPOINT, {
        query: skill_query,
        variables: { username: username }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com'
        }
      }),
      axios.post(LEETCODE_API_ENDPOINT, {
        query: language_query,
        variables: { username: username }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com'
        }
      }),
      axios.post(LEETCODE_API_ENDPOINT, {
        query: contest_query,
        variables: { username: username }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com'
        }
      })
    ]);

    console.timeEnd('leetcode API calls');

    console.time('process leetcode data');
    // Check for errors in the responses
    [user_data, skill_data, language_data, contest_data].forEach(response => {
      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }
    });

    const user_data_extracted = user_data.data.data.matchedUser;
    const skill_data_extracted = skill_data.data.data.matchedUser.tagProblemCounts;
    const language_data_extracted = language_data.data.data.matchedUser.languageProblemCount;
    const contest_data_extracted = contest_data.data.data.userContestRanking;

    const leetcode_stats = {
        "username": user_data_extracted.username,
        "skills": {
            "advanced": skill_data_extracted.advanced.map(skill => ({
                "tag_name": skill.tagName,
                "tag_slug": skill.tagSlug,
                "problems_solved": skill.problemsSolved
            })),
            "intermediate": skill_data_extracted.intermediate.map(skill => ({
                "tag_name": skill.tagName,
                "tag_slug": skill.tagSlug,
                "problems_solved": skill.problemsSolved
            })),
            "fundamental": skill_data_extracted.fundamental.map(skill => ({
                "tag_name": skill.tagName,
                "tag_slug": skill.tagSlug,
                "problems_solved": skill.problemsSolved
            }))
        },
        //sort languages by problems solved
        "languages": language_data_extracted.sort((a, b) => b.problemsSolved - a.problemsSolved),
        "contests": contest_data_extracted ? {
            attendedContestsCount: contest_data_extracted.attendedContestsCount || 0,
            rating: contest_data_extracted.rating || 0,
            globalRanking: contest_data_extracted.globalRanking || 0,
            topPercentage: contest_data_extracted.topPercentage || 0,
            badge: contest_data_extracted.badge ? contest_data_extracted.badge : { name: 'None' }
        } : {
            attendedContestsCount: 0,
            rating: 0,
            globalRanking: 0,
            topPercentage: 0,
            badge: { name: 'None' }
        }
    }
    
    console.timeEnd('process leetcode data');

    // Cache the result
    cache.set(username, { data: leetcode_stats, timestamp: Date.now() });

    return leetcode_stats;

  } catch (error) {
    console.error('Error fetching LeetCode stats:', error);
    throw error;
  }
}

export default fetchLeetCodeStats;