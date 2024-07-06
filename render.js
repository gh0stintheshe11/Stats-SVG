const { createCanvas, loadImage } = require('canvas');

async function renderData(username) {
    const { fetchGitHubData } = require('./fetch');
    const { calculateRank } = require('./calculateRank');
    const { calculateLanguagePercentage } = require('./calculateLang');

    try {
        const stats = await fetchGitHubData(username);

        // Calculate rank and language percentages
        const { level, percentile } = calculateRank({
            all_commits: false,
            commits: stats.total_commits,
            prs: stats.total_prs,
            issues: stats.total_issues,
            reviews: stats.total_prs_reviewed,
            repos: stats.total_repos,
            stars: stats.total_stars,
            followers: 0 // Placeholder, update if you have the data
        });

        const languagePercentages = calculateLanguagePercentage(stats.top_languages);

        // Create the canvas and context
        const canvas = createCanvas(800, 400);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#0D1117';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Text and data
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 30px Arial';
        ctx.fillText(`${stats.name}'s GitHub Stats`, 50, 50);

        ctx.font = '20px Arial';
        ctx.fillText('⭐ Total Stars Earned:', 50, 100);
        ctx.fillText(stats.total_stars.toString(), 350, 100);

        ctx.fillText('🕒 Total Commits:', 50, 140);
        ctx.fillText(stats.total_commits.toString(), 350, 140);

        ctx.fillText('📩 Total PRs:', 50, 180);
        ctx.fillText(stats.total_prs.toString(), 350, 180);

        ctx.fillText('✔ Total PRs Merged:', 50, 220);
        ctx.fillText(stats.total_prs_merged.toString(), 350, 220);

        ctx.fillText('⏳ Merged PRs Percentage:', 50, 260);
        ctx.fillText(`${((stats.total_prs_merged / stats.total_prs) * 100).toFixed(2)}%`, 350, 260);

        ctx.fillText('🔍 Total PRs Reviewed:', 50, 300);
        ctx.fillText(stats.total_prs_reviewed.toString(), 350, 300);

        ctx.fillText('📝 Total Issues:', 50, 340);
        ctx.fillText(stats.total_issues.toString(), 350, 340);

        ctx.fillText('💬 Total Discussions Started:', 50, 380);
        ctx.fillText(stats.total_discussions_started.toString(), 350, 380);

        ctx.fillText('💬 Total Discussions Answered:', 50, 420);
        ctx.fillText(stats.total_discussions_answered.toString(), 350, 420);

        ctx.fillText('🏠 Contributed to (last year):', 50, 460);
        ctx.fillText(stats.total_repos.toString(), 350, 460);

        // Draw circle progress bar for ranking
        const radius = 50;
        const centerX = 650;
        const centerY = 200;
        const endAngle = (percentile / 100) * 2 * Math.PI;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#30363D';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -0.5 * Math.PI, endAngle - 0.5 * Math.PI);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = '#58A6FF';
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 30px Arial';
        ctx.fillText(level, centerX - ctx.measureText(level).width / 2, centerY - 10);
        ctx.font = '20px Arial';
        ctx.fillText(`${percentile.toFixed(2)}%`, centerX - ctx.measureText(`${percentile.toFixed(2)}%`).width / 2, centerY + 20);

        return canvas.toBuffer();
    } catch (error) {
        console.error('Error rendering data:', error);
        throw error;
    }
}

module.exports = { renderData };