function renderStatsSVG(stats) {
    const svg = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <style>
          .background { fill: #0D1117; }
          .text { fill: #FFFFFF; font-family: Arial, sans-serif; }
          .title { font-size: 30px; font-weight: bold; }
          .label { font-size: 20px; }
          .value { font-size: 20px; font-weight: bold; }
          .circle-bg { fill: #30363D; }
          .circle-progress { fill: #58A6FF; }
        </style>
        <rect class="background" width="100%" height="100%" />
        <text x="50" y="50" class="text title">${stats.name}'s GitHub Stats</text>
  
        <text x="50" y="100" class="text label">⭐ Total Stars Earned:</text>
        <text x="350" y="100" class="text value">${stats.total_stars || 0}</text>
  
        <text x="50" y="140" class="text label">🕒 Total Commits:</text>
        <text x="350" y="140" class="text value">${stats.total_commits || 0}</text>
  
        <text x="50" y="180" class="text label">📩 Total PRs:</text>
        <text x="350" y="180" class="text value">${stats.total_prs || 0}</text>
  
        <text x="50" y="220" class="text label">✔ Total PRs Merged:</text>
        <text x="350" y="220" class="text value">${stats.total_merged_prs || 0}</text>
  
        <text x="50" y="260" class="text label">⏳ Merged PRs Percentage:</text>
        <text x="350" y="260" class="text value">${stats.merged_prs_percentage ? stats.merged_prs_percentage.toFixed(2) : 0}%</text>
  
        <text x="50" y="300" class="text label">🔍 Total PRs Reviewed:</text>
        <text x="350" y="300" class="text value">${stats.total_prs_reviewed || 0}</text>
  
        <text x="50" y="340" class="text label">📝 Total Issues:</text>
        <text x="350" y="340" class="text value">${stats.total_issues || 0}</text>
  
        <text x="50" y="380" class="text label">💬 Total Discussions Started:</text>
        <text x="350" y="380" class="text value">${stats.total_discussions_started || 0}</text>
  
        <text x="50" y="420" class="text label">💬 Total Discussions Answered:</text>
        <text x="350" y="420" class="text value">${stats.total_discussions_answered || 0}</text>
  
        <text x="50" y="460" class="text label">🏠 Contributed to:</text>
        <text x="350" y="460" class="text value">${stats.total_repos || 0}</text>
  
        <text x="50" y="500" class="text label">🔗 Total Followers:</text>
        <text x="350" y="500" class="text value">${stats.followers || 0}</text>
  
        <circle class="circle-bg" cx="650" cy="200" r="50"></circle>
        <path class="circle-progress" d="
          M 650,200
          m -50,0
          a 50,50 0 1,0 100,0
          a 50,50 0 1,0 -100,0
        " transform="rotate(-90 650 200)"
          stroke-dasharray="${(stats.ranking_percentage ? stats.ranking_percentage : 0) * 3.14}, 314"
          stroke="#58A6FF" stroke-width="10" fill="none"></path>
  
        <text x="620" y="200" class="text value">${stats.level || 'N/A'}</text>
        <text x="620" y="240" class="text value">${stats.ranking_percentage ? stats.ranking_percentage.toFixed(2) : 0}%</text>
      </svg>
    `;
    return svg;
  }
  
  module.exports = { renderStatsSVG };
  
