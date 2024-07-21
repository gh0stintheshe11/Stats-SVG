// Import all the icons from the utils/icons.js file
import { Icons } from '../utils/icons.js';

function renderStats(stats) {
  const svg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <style>
        
        @keyframes change-opacity {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate {
          opacity: 0;
          animation: change-opacity 2s ease-out forwards
        }

        .animate-delay-1 {animation-delay: 0s, 0.1s;}
        .animate-delay-2 {animation-delay: 0.1s, 0.2s;}
        .animate-delay-3 {animation-delay: 0.2s, 0.3s;}
        .animate-delay-4 {animation-delay: 0.3s, 0.4s;}
        .animate-delay-5 {animation-delay: 0.4s, 0.5s;}
        .animate-delay-6 {animation-delay: 0.5s, 0.6s;}
        .animate-delay-7 {animation-delay: 0.6s, 0.7s;}
        .animate-delay-8 {animation-delay: 0.7s, 0.8s;}
        .animate-delay-9 {animation-delay: 0.8s, 0.9s;}
        .animate-delay-10 {animation-delay: 0.9s, 1s;}
        .animate-delay-11 {animation-delay: 1s, 1.1s;}
        .animate-delay-12 {animation-delay: 1.1s, 1.2s;}

        .background { fill: #00000000; } 
        .text { fill: #ffffff; font-family: 'Ubuntu', sans-serif; }
        .title { fill: #00f0ff; font-size: 30px; font-weight: bold; }
        .label { fill: #00f0ff; font-size: 20px; }
        .value { fill: #f8e602; font-size: 20px; font-weight: bold; }
        .circle-bg { fill: #00000000; }
        .circle-progress { fill: #00000000; }
        .icon { fill: #00f0ff; }
      </style>
      <rect class="background" width="100%" height="100%" />
      <text x="50" y="50" class="text title animate">${stats.name}'s GitHub Stats</text>

      <g transform="translate(50, 100)" class="animate animate-delay-1">
        <path class="icon" d="${Icons.star_icon}" transform="translate(5, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Total Stars Earned:</text>
        <text x="320" y="0" class="text value">${stats.total_stars}</text>
      </g>

      <g transform="translate(50, 140)" class="animate animate-delay-2">
        <path class="icon" d="${Icons.contributes_to_icon}" transform="translate(8, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Contributed to:</text>
        <text x="320" y="0" class="text value">${stats.total_contributes_to}</text>
      </g>

      <g transform="translate(50, 180)" class="animate animate-delay-3">
        <path class="icon" d="${Icons.followers_icon}" transform="translate(7, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Total Followers:</text>
        <text x="320" y="0" class="text value">${stats.followers}</text>
      </g>

      <g transform="translate(50, 220)" class="animate animate-delay-4">
        <path class="icon" d="${Icons.repo_icon}" transform="translate(5, -17) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total Repos:</text>
        <text x="320" y="0" class="text value">${stats.total_repos}</text>
      </g>

      <g transform="translate(50, 260)" class="animate animate-delay-5">
        <path class="icon" d="${Icons.commit_icon}" transform="translate(5, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Total Commits:</text>
        <text x="320" y="0" class="text value">${stats.total_commits}</text>
      </g>

      <g transform="translate(50, 300)" class="animate animate-delay-6">
        <path class="icon" d="${Icons.pr_icon}" transform="translate(5, -17) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total PRs:</text>
        <text x="320" y="0" class="text value">${stats.total_prs}</text>
      </g>

      <g transform="translate(50, 340)" class="animate animate-delay-7">
        <path class="icon" d="${Icons.merged_prs_icon}" transform="translate(5, -17) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total PRs Merged:</text>
        <text x="320" y="0" class="text value">${stats.total_merged_prs}</text>
      </g>

      <g transform="translate(50, 380)" class="animate animate-delay-8">
        <path class="icon" d="${Icons.pr_reviewed_icon}" transform="translate(7, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Total PRs Reviewed:</text>
        <text x="320" y="0" class="text value">${stats.total_prs_reviewed}</text>
      </g>

      <g transform="translate(50, 420)" class="animate animate-delay-9">
        <path class="icon" d="${Icons.merged_prs_percentage_icon}" transform="translate(5, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Merged PRs Percentage:</text>
        <text x="320" y="0" class="text value">${stats.merged_prs_percentage.toFixed(0)}%</text>
      </g>

      <g transform="translate(50, 460)" class="animate animate-delay-10">
        <path class="icon" d="${Icons.issue_icon}" transform="translate(5, -18) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total Issues:</text>
        <text x="320" y="0" class="text value">${stats.total_issues}</text>
      </g>

      <g transform="translate(50, 500)" class="animate animate-delay-11">
        <path class="icon" d="${Icons.discussions_started_icon}" transform="translate(5, -18) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total Discussions Started:</text>
        <text x="320" y="0" class="text value">${stats.total_discussions_started}</text>
      </g>

      <g transform="translate(50, 540)" class="animate animate-delay-12">
        <path class="icon" d="${Icons.discussions_answered_icon}" transform="translate(5, -18) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total Discussions Answered:</text>
        <text x="320" y="0" class="text value">${stats.total_discussions_answered}</text>
      </g>

      <circle class="circle-bg" cx="650" cy="140" r="80" stroke="#e6e6e6" stroke-width="20" fill="#00000000"></circle>

      <path class="circle-progress" d="
        M 650,140
        m -80,0
        a 80,80 0 1,0 160,0
      " transform="rotate(-90 650 140)"
        stroke-dasharray="${(100-stats.rank.percentile) * 5.042}, 314"
        stroke="#58A6FF" stroke-width="20" fill="none"></path>

      <text x="620" y="300" class="text value">${stats.rank.level}</text>
      <text x="620" y="340" class="text value">${stats.rank.percentile.toFixed(0)}%</text>
    </svg>
  `;
  return svg;
}

export { renderStats as default };
