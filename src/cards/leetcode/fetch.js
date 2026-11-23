import { createTtlCache } from '../../lib/cache.js';
import { HttpError } from '../../lib/errors.js';
import { fetchJson } from '../../lib/http.js';
import { withRetry } from '../../lib/retry.js';

const LEETCODE_API_ENDPOINT = 'https://leetcode.com/graphql';

const cache = createTtlCache({ ttlMs: 2 * 60 * 1000, maxEntries: 500 });

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

/** Runs one LeetCode GraphQL query and returns its `data` object. */
async function leetcodeGraphQL(query, username, { deadline }) {
  return withRetry(async () => {
    const { data, errors } = await fetchJson('LeetCode', LEETCODE_API_ENDPOINT, {
      method: 'POST',
      headers: { Referer: 'https://leetcode.com' },
      json: { query, variables: { username } },
      deadline,
      rateLimitStatuses: [403, 429], // LeetCode's bot protection answers 403 when it throttles us
    });

    if (errors?.length) {
      // LeetCode reports unknown users as a GraphQL error.
      if (errors.some((e) => /does not exist/i.test(e.message))) {
        throw new HttpError(404, `LeetCode user "${username}" not found`);
      }
      throw new HttpError(502, `LeetCode API error: ${errors[0].message}`, { retryable: true });
    }
    return data;
  }, { deadline });
}

const mapSkills = (skills) => skills.map((skill) => ({
  tag_name: skill.tagName,
  tag_slug: skill.tagSlug,
  problems_solved: skill.problemsSolved,
}));

/**
 * @param {string} username LeetCode username (already validated by the API handler).
 * @param {object} [options]
 * @param {number} [options.deadline] Epoch ms by which all LeetCode calls must finish.
 */
async function fetchLeetCodeStats(username, { deadline = Date.now() + 8000 } = {}) {
  const cached = cache.get(username);
  if (cached) return cached;

  const options = { deadline };
  const startedAt = Date.now();
  const [user_data, skill_data, language_data, contest_data] = await Promise.all([
    leetcodeGraphQL(user_query, username, options),
    leetcodeGraphQL(skill_query, username, options),
    leetcodeGraphQL(language_query, username, options),
    leetcodeGraphQL(contest_query, username, options),
  ]);
  console.log(`LeetCode API calls (${username}): ${Date.now() - startedAt}ms`);

  if (!user_data?.matchedUser) {
    throw new HttpError(404, `LeetCode user "${username}" not found`);
  }

  const skills = skill_data.matchedUser.tagProblemCounts;
  const contest = contest_data.userContestRanking;

  const leetcode_stats = {
    username: user_data.matchedUser.username,
    skills: {
      advanced: mapSkills(skills.advanced),
      intermediate: mapSkills(skills.intermediate),
      fundamental: mapSkills(skills.fundamental),
    },
    // sort languages by problems solved
    languages: [...language_data.matchedUser.languageProblemCount].sort((a, b) => b.problemsSolved - a.problemsSolved),
    contests: {
      attendedContestsCount: contest?.attendedContestsCount || 0,
      rating: contest?.rating || 0,
      globalRanking: contest?.globalRanking || 0,
      topPercentage: contest?.topPercentage || 0,
      badge: contest?.badge || { name: 'None' },
    },
  };

  cache.set(username, leetcode_stats);
  return leetcode_stats;
}

export default fetchLeetCodeStats;
