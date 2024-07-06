const express = require('express');
const { fetchGitHubData } = require('./fetch');
const { calculateRank } = require('./calculateRank');
const { calculateLanguagePercentage } = require('./calculateLang');
const { renderStatsSVG } = require('./renderStats');

const app = express();
const port = 3001;

app.use((req, res, next) => {
    const startHrTime = process.hrtime();

    res.on('finish', () => {
        const elapsedHrTime = process.hrtime(startHrTime);
        const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;
        console.log(`Request to ${req.path} took ${elapsedTimeInMs} ms`);
    });

    next();
});

app.get('/github-status/:username', async (req, res) => {
    const username = req.params.username;
    try {
        const data = await fetchGitHubData(username);

        const rankData = calculateRank({
            all_commits: true,
            commits: data.total_commits,
            prs: data.total_prs,
            issues: data.total_issues,
            reviews: data.total_prs_reviewed,
            repos: data.total_repos,
            stars: data.total_stars,
            followers: data.followers,
        });

        data.ranking_percentage = rankData.percentile;
        data.level = rankData.level;
        data.language_percentages = calculateLanguagePercentage(data.top_languages);

        console.log('Final Data:', data);

        const svg = renderStatsSVG(data);
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svg);
    } catch (error) {
        console.error('Error fetching data or rendering image:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
