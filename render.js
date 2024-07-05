const { createCanvas, loadImage } = require('canvas');

async function renderCard(data) {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = 'white';
    ctx.font = 'bold 30px Arial';
    ctx.fillText(`${data.name}'s GitHub Stats`, 20, 40);

    // Stats with icons
    const stats = [
        { label: 'Total Stars Earned:', value: data.total_stars, icon: '⭐' },
        { label: 'Total Commits:', value: data.total_commits, icon: '🕒' },
        { label: 'Total PRs:', value: data.total_prs, icon: '🔀' },
        { label: 'Total Issues:', value: data.total_issues, icon: '❗' },
        { label: 'Contributed to (last year):', value: data.total_repos, icon: '📦' }
    ];

    ctx.font = '20px Arial';
    stats.forEach((stat, index) => {
        const y = 80 + index * 50;
        ctx.fillText(stat.icon, 20, y);
        ctx.fillText(stat.label, 50, y);
        ctx.fillText(stat.value, 300, y);
    });

    // Ranking Circle
    const circleX = 650;
    const circleY = 200;
    const circleRadius = 80;

    ctx.beginPath();
    ctx.arc(circleX, circleY, circleRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();

    const startAngle = -Math.PI / 2;
    const endAngle = (Math.PI * 2 * (data.ranking_percentage || 0)) / 100 - Math.PI / 2;

    ctx.beginPath();
    ctx.arc(circleX, circleY, circleRadius, startAngle, endAngle);
    ctx.lineTo(circleX, circleY);
    ctx.fillStyle = '#00ccff';
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 40px Arial';
    const levelText = data.level || 'N/A';
    const textWidth = ctx.measureText(levelText).width;
    ctx.fillText(levelText, circleX - textWidth / 2, circleY + 10);

    // Add percentage text inside the circle
    ctx.font = '20px Arial';
    const percentageText = `${Math.round(data.ranking_percentage)}%`;
    const percentageTextWidth = ctx.measureText(percentageText).width;
    ctx.fillText(percentageText, circleX - percentageTextWidth / 2, circleY + 40);

    return canvas.toBuffer();
}

module.exports = { renderCard };
