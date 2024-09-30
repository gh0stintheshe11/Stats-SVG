async function fetchLeetCodeStats(username) {
  const LEETCODE_API_ENDPOINT = 'https://leetcode.com/graphql';

  const query = `
    query userPublicProfile($username: String!) {
      matchedUser(username: $username) {
        username
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
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
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
        totalParticipants
        topPercentage
      }
    }
  `;

  try {
    const response = await fetch(LEETCODE_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com'
      },
      body: JSON.stringify({
        query: query,
        variables: { username: username }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    const user = data.data.matchedUser;
    const contestRanking = data.data.userContestRanking;

    return {
      username: user.username,
      totalSolved: user.submitStats.acSubmissionNum.find(stat => stat.difficulty === 'All').count,
      totalSubmissions: user.submitStats.acSubmissionNum.find(stat => stat.difficulty === 'All').submissions,
      easySolved: user.submitStats.acSubmissionNum.find(stat => stat.difficulty === 'Easy').count,
      mediumSolved: user.submitStats.acSubmissionNum.find(stat => stat.difficulty === 'Medium').count,
      hardSolved: user.submitStats.acSubmissionNum.find(stat => stat.difficulty === 'Hard').count,
      ranking: user.profile.ranking,
      reputation: user.profile.reputation,
      starRating: user.profile.starRating,
      badges: user.badges,
      upcomingBadges: user.upcomingBadges,
      activeBadge: user.activeBadge ? user.activeBadge.displayName : null,
      contestsAttended: contestRanking ? contestRanking.attendedContestsCount : 0,
      contestRating: contestRanking ? contestRanking.rating : null,
      contestGlobalRanking: contestRanking ? contestRanking.globalRanking : null,
      contestTotalParticipants: contestRanking ? contestRanking.totalParticipants : null,
      contestTopPercentage: contestRanking ? contestRanking.topPercentage : null
    };
  } catch (error) {
    console.error('Error fetching LeetCode stats:', error);
    throw error;
  }
}

export default fetchLeetCodeStats;
