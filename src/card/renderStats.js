// Import all the icons from the utils/icons.js file
import {Icons} from '../utils/icons.js';

function renderStats(stats) {
  const svg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <style>

        @keyframes reveal-left-to-right {
          from {
            clip-path: polygon(0 0, 0% 0, 0% 100%, 0 100%);
          }
          to {
            clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
          }
        }

        @keyframes reveal-top-to-bottom {
          from {
            clip-path: polygon(0 0, 100% 0, 100% 0, 0 0);
          }
          to {
            clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
          }
        }
        
        @keyframes change-opacity {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate {
          animation: reveal-top-to-bottom 1s ease-out forwards, change-opacity 2s ease-out forwards
        }

        .background { fill: #00000000; } 
        .text { fill: #ffffff; font-family: 'Ubuntu', sans-serif; }
        .title { fill: #00f0ff; font-size: 30px; font-weight: bold; }
        .label { fill: #00f0ff; font-size: 20px; }
        .value { fill: #f8e602; font-size: 20px; font-weight: bold; }
        .circle-bg { fill: #30363D; }
        .circle-progress { fill: #58A6FF; }
        .icon { fill: #00f0ff; }
      </style>
      <rect class="background" width="100%" height="100%" />
      <text x="50" y="50" class="text title animate">${stats.name}'s GitHub Stats</text>

      <g transform="translate(50, 100)" class="animate">
        <path class="icon" d="${Icons.star_icon}" transform="translate(5, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Total Stars Earned:</text>
        <text x="320" y="0" class="text value">${stats.total_stars}</text>
      </g>

      <g transform="translate(50, 140)" class="animate">
        <path class="icon" d="${Icons.contributes_to_icon}" transform="translate(8, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Contributed to:</text>
        <text x="320" y="0" class="text value">${stats.total_contributes_to}</text>
      </g>

      <g transform="translate(50, 180)" class="animate">
        <path class="icon" d="${Icons.followers_icon}" transform="translate(7, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Total Followers:</text>
        <text x="320" y="0" class="text value">${stats.followers}</text>
      </g>

      <g transform="translate(50, 220)" class="animate">
        <path class="icon" d="${Icons.repo_icon}" transform="translate(5, -17) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total Repos:</text>
        <text x="320" y="0" class="text value">${stats.total_repos}</text>
      </g>

      <g transform="translate(50, 260)" class="animate">
        <path class="icon" d="${Icons.commit_icon}" transform="translate(5, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Total Commits:</text>
        <text x="320" y="0" class="text value">${stats.total_commits}</text>
      </g>

      <g transform="translate(50, 300)" class="animate">
        <path class="icon" d="${Icons.pr_icon}" transform="translate(5, -17) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total PRs:</text>
        <text x="320" y="0" class="text value">${stats.total_prs}</text>
      </g>

      <g transform="translate(50, 340)" class="animate">
        <path class="icon" d="${Icons.merged_prs_icon}" transform="translate(5, -17) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total PRs Merged:</text>
        <text x="320" y="0" class="text value">${stats.total_merged_prs}</text>
      </g>

      <g transform="translate(50, 380)" class="animate">
        <path class="icon" d="${Icons.pr_reviewed_icon}" transform="translate(7, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Total PRs Reviewed:</text>
        <text x="320" y="0" class="text value">${stats.total_prs_reviewed}</text>
      </g>

      <g transform="translate(50, 420)" class="animate">
        <path class="icon" d="${Icons.merged_prs_percentage_icon}" transform="translate(5, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Merged PRs Percentage:</text>
        <text x="320" y="0" class="text value">${stats.merged_prs_percentage.toFixed(0)}%</text>
      </g>

      <g transform="translate(50, 460)" class="animate">
        <path class="icon" d="${Icons.issue_icon}" transform="translate(5, -18) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total Issues:</text>
        <text x="320" y="0" class="text value">${stats.total_issues}</text>
      </g>

      <g transform="translate(50, 500)" class="animate">
        <path class="icon" d="${Icons.discussions_started_icon}" transform="translate(5, -18) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total Discussions Started:</text>
        <text x="320" y="0" class="text value">${stats.total_discussions_started}</text>
      </g>

      <g transform="translate(50, 540)" class="animate">
        <path class="icon" d="${Icons.discussions_answered_icon}" transform="translate(5, -18) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total Discussions Answered:</text>
        <text x="320" y="0" class="text value">${stats.total_discussions_answered}</text>
      </g>

      <circle class="circle-bg" cx="650" cy="200" r="50"></circle>
      <path class="circle-progress" d="
        M 650,200
        m -50,0
        a 50,50 0 1,0 100,0
        a 50,50 0 1,0 -100,0
      " transform="rotate(-90 650 200)"
        stroke-dasharray="${stats.rank.percentile * 3.14}, 314"
        stroke="#58A6FF" stroke-width="10" fill="none"></path>

      <text x="620" y="200" class="text value">${stats.rank.level}</text>
      <text x="620" y="240" class="text value">${stats.rank.percentile.toFixed(0)}%</text>
    </svg>
  `;
  return svg;
}

export { renderStats as default };
