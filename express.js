const express = require('express');
const { fetchGitHubData } = require('./fetch');
const { calculateRank } = require('./calculateRank');
const { calculateLanguagePercentage } = require('./calculateLang');

const app = express();
const port = 3001;

app.get('/github-status/:username', async (req, res) => {
  const username = req.params.username;
  console.log(`Received request for user: ${username}`);

  try {
    const stats = await fetchGitHubData(username);

    const { level, percentile } = calculateRank({
      commits: stats.total_commits,
      prs: stats.total_prs,
      issues: stats.total_issues,
      reviews: 0, // Assuming no review data
      stars: stats.total_stars,
      followers: 0, // Assuming no follower data
      repos: stats.total_repos,
      all_commits: false,
    });

    const languagePercentages = calculateLanguagePercentage(stats.top_languages);

    stats.ranking_percentage = percentile;
    stats.level = level;
    stats.language_percentages = languagePercentages;

    console.log('Final Data:', stats);

    res.json(stats);

  } catch (error) {
    console.error('Error fetching data or rendering image:', error);
    res.status(500).send('Error fetching data or rendering image');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
