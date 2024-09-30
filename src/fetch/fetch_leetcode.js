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

    const [user_response, skill_response, language_response, contest_response] = await Promise.all([
      fetch(LEETCODE_API_ENDPOINT, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com'
      },
      body: JSON.stringify({
        query: user_query,
        variables: { username: username }
        })
      }),
      fetch(LEETCODE_API_ENDPOINT, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com'
      },
      body: JSON.stringify({
        query: skill_query,
        variables: { username: username }
        })
      }),
      fetch(LEETCODE_API_ENDPOINT, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com'
      },    
      body: JSON.stringify({
        query: language_query,
        variables: { username: username }
        })
      }),
      fetch(LEETCODE_API_ENDPOINT, {
        method: 'POST',
        headers: {  
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com'
      },    
      body: JSON.stringify({
        query: contest_query,
        variables: { username: username }
        })
      })
    ]);

    if (!user_response.ok) {
      throw new Error(`HTTP error! status: ${user_response.status}`);
    } else if (!skill_response.ok) {
      throw new Error(`HTTP error! status: ${skill_response.status}`);
    } else if (!language_response.ok) {
      throw new Error(`HTTP error! status: ${language_response.status}`);
    } else if (!contest_response.ok) {
      throw new Error(`HTTP error! status: ${contest_response.status}`);
    }

    const user_data = await user_response.json();
    const skill_data = await skill_response.json();
    const language_data = await language_response.json();
    const contest_data = await contest_response.json();

    if (user_data.errors) {
      throw new Error(user_data.errors[0].message);
    } else if (skill_data.errors) {
      throw new Error(skill_data.errors[0].message);
    } else if (language_data.errors) {
      throw new Error(language_data.errors[0].message);
    } else if (contest_data.errors) {
      throw new Error(contest_data.errors[0].message);
    }

    const user_data_extracted = user_data.data.matchedUser;
    const skill_data_extracted = skill_data.data.matchedUser.tagProblemCounts;
    const language_data_extracted = language_data.data.matchedUser.languageProblemCount;
    const contest_data_extracted = contest_data.data.userContestRanking;

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

    // Cache the result
    cache.set(username, { data: leetcode_stats, timestamp: Date.now() });
    console.log('Cached data for', username);

    return leetcode_stats;

  } catch (error) {
    console.error('Error fetching LeetCode stats:', error);
    throw error;
  }
}

export default fetchLeetCodeStats;