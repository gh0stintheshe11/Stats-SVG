const { fetchGitHubData } = require('./fetch');
const { calculateRank } = require('./calculateRank');
const { calculateLanguagePercentage } = require('./calculateLang');

async function renderData(username) {
    try {
        const stats = await fetchGitHubData(username);

        // Calculate rank
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

        // Calculate language percentages
        const languagePercentages = calculateLanguagePercentage(stats.top_languages);

        // Print out all the data and calculated results
        console.log('GitHub Data:', stats);
        console.log('Calculated Rank:', { level, percentile });
        console.log('Language Percentages:', languagePercentages);

        return {
            stats,
            rank: { level, percentile },
            languagePercentages
        };

    } catch (error) {
        console.error('Error rendering data:', error);
        throw error;
    }
}

module.exports = renderData;