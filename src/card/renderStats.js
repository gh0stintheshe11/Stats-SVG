// Import necessary modules
const code_commit_icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M320 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160zm156.8-48C462 361 397.4 416 320 416s-142-55-156.8-128H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H163.2C178 151 242.6 96 320 96s142 55 156.8 128H608c17.7 0 32 14.3 32 32s-14.3 32-32 32H476.8z"/></svg>`;
const code_pull_request_icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M305.8 2.1C314.4 5.9 320 14.5 320 24V64h16c70.7 0 128 57.3 128 128V358.7c28.3 12.3 48 40.5 48 73.3c0 44.2-35.8 80-80 80s-80-35.8-80-80c0-32.8 19.7-61 48-73.3V192c0-35.3-28.7-64-64-64H320v40c0 9.5-5.6 18.1-14.2 21.9s-18.8 2.3-25.8-4.1l-80-72c-5.1-4.6-7.9-11-7.9-17.8s2.9-13.3 7.9-17.8l80-72c7-6.3 17.2-7.9 25.8-4.1zM104 80A24 24 0 1 0 56 80a24 24 0 1 0 48 0zm8 73.3V358.7c28.3 12.3 48 40.5 48 73.3c0 44.2-35.8 80-80 80s-80-35.8-80-80c0-32.8 19.7-61 48-73.3V153.3C19.7 141 0 112.8 0 80C0 35.8 35.8 0 80 0s80 35.8 80 80c0 32.8-19.7 61-48 73.3zM104 432a24 24 0 1 0 -48 0 24 24 0 1 0 48 0zm328 24a24 24 0 1 0 0-48 24 24 0 1 0 0 48z"/></svg>`;

function renderStats(stats) {
  const svg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <style>
        .background { fill: #000000; } 
        .text { fill: #FFFFFF; font-family: ubuntu; }
        .title { fill: #00f0ff; font-size: 30px; font-weight: bold; }
        .label { fill: #00f0ff; font-size: 20px; }
        .value { fill: #f8e602; font-size: 20px; font-weight: bold; }
        .circle-bg { fill: #30363D; }
        .circle-progress { fill: #58A6FF; }
        .icon { fill: #f8e602; }
      </style>
      <rect class="background" width="100%" height="100%" />
      <text x="50" y="50" class="text title">${stats.name}'s GitHub Stats</text>

      <g transform="translate(50, 100)">
        <g transform="translate(0, -15) scale(0.03)" class="icon">${code_commit_icon}</g>
        <text x="40" y="0" class="text label">Total Commits:</text>
        <text x="350" y="0" class="text value">${stats.total_commits || 0}</text>
      </g>

      <g transform="translate(50, 140)">
        <g transform="translate(0, -15) scale(0.03)" class="icon">${code_pull_request_icon}</g>
        <text x="40" y="0" class="text label">Total PRs:</text>
        <text x="350" y="0" class="text value">${stats.total_prs || 0}</text>
      </g>

      <text x="50" y="180" class="text label">⭐ Total Stars Earned:</text>
      <text x="350" y="180" class="text value">${stats.total_stars || 0}</text>

      <text x="50" y="220" class="text label">Total PRs Merged:</text>
      <text x="350" y="220" class="text value">${stats.total_merged_prs || 0}</text>

      <text x="50" y="260" class="text label">Merged PRs Percentage:</text>
      <text x="350" y="260" class="text value">${stats.merged_prs_percentage ? stats.merged_prs_percentage.toFixed(2) : 0}%</text>

      <text x="50" y="300" class="text label">Total PRs Reviewed:</text>
      <text x="350" y="300" class="text value">${stats.total_prs_reviewed || 0}</text>

      <text x="50" y="340" class="text label">Total Issues:</text>
      <text x="350" y="340" class="text value">${stats.total_issues || 0}</text>

      <text x="50" y="380" class="text label">Total Discussions Started:</text>
      <text x="350" y="380" class="text value">${stats.total_discussions_started || 0}</text>

      <text x="50" y="420" class="text label">Total Discussions Answered:</text>
      <text x="350" y="420" class="text value">${stats.total_discussions_answered || 0}</text>

      <text x="50" y="460" class="text label">Contributed to:</text>
      <text x="350" y="460" class="text value">${stats.total_repos || 0}</text>

      <text x="50" y="500" class="text label">Total Followers:</text>
      <text x="350" y="500" class="text value">${stats.followers || 0}</text>

      <circle class="circle-bg" cx="650" cy="200" r="50"></circle>
      <path class="circle-progress" d="
        M 650,200
        m -50,0
        a 50,50 0 1,0 100,0
        a 50,50 0 1,0 -100,0
      " transform="rotate(-90 650 200)"
        stroke-dasharray="${(stats.rank.percentile ? stats.rank.percentile : 0) * 3.14}, 314"
        stroke="#58A6FF" stroke-width="10" fill="none"></path>

      <text x="620" y="200" class="text value">${stats.rank.level || 'N/A'}</text>
      <text x="620" y="240" class="text value">${stats.rank.percentile ? stats.rank.percentile.toFixed(2) : 0}%</text>
    </svg>
  `;
  return svg;
}

export { renderStats as default };
