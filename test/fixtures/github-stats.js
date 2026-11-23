// A fixed set of processed GitHub stats, used to render the card deterministically in tests.

const contribution_distribution = {};
const firstDay = Date.UTC(2026, 8, 25); // 2026-09-25
for (let i = 0; i < 60; i++) {
  const date = new Date(firstDay + i * 86_400_000).toISOString().slice(0, 10);
  contribution_distribution[date] = { total: (i * 7) % 11 };
}

export default {
  login: 'octocat',
  name: 'Octo Cat',
  followers: 15,
  total_commits: 1234,
  total_prs: 60,
  total_prs_reviewed: 5,
  total_issues: 30,
  total_merged_prs: 45,
  total_repos: 8,
  total_stars: 120,
  total_forks: 30,
  total_contributes_to: 12,
  total_discussions_started: 2,
  total_discussions_answered: 1,
  merged_prs_percentage: 75,
  rank: { level: 'A-', percentile: 30.5 },
  // Shown as 40%, 30%, 20% and 10%: each language's weight is sqrt(size * count).
  languages: {
    JavaScript: { size: 1600, count: 1, color: '#f1e05a' },
    Python: { size: 900, count: 1, color: '#3572A5' },
    Go: { size: 400, count: 1, color: '#00ADD8' },
    Shell: { size: 100, count: 1, color: '#89e051' },
  },
  contribution_distribution,
};
