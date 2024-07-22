// Import all the icons from the utils/icons.js file
import { Icons } from '../utils/icons.js';

function darkenHexColor(hex, darkenFactor) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  r = Math.round(r * (darkenFactor / 100));
  g = Math.round(g * (darkenFactor / 100));
  b = Math.round(b * (darkenFactor / 100));

  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function renderStats(stats) {

  const dark_level = 30;
  const icon_color = "#00f0ff";
  const text_title_color = "#00f0ff";
  const text_label_color = "#00f0ff";
  const text_value_color = "#f8e602";
  const rank_color = "#c5003c";
  const rank_percentage_color = "#c5003c";
  
  const rank_circle_center_x = 650;
  const rank_circle_center_y = 140;
  const rank_circle_radius = 80;
  const rank_percentile = stats.rank.percentile;

  // Calculate the position of the start cap
  const startCap = `<circle cx="${rank_circle_center_x}" cy="${rank_circle_center_y+rank_circle_radius}" r="14" fill="#00f0ff"></circle>`;

  // Calculate the position of the end cap for counterclockwise rotation
  // Convert the percentile to an angle in radians directly, considering counterclockwise rotation from 6 o'clock
  const progressRadians = (rank_percentile / 100) * 2 * Math.PI; // Full circle in radians
  // Starting angle at 6 o'clock (90 degrees) in radians
  const startRadians = Math.PI / 2;
  // Calculate the end angle for counterclockwise rotation
  // Subtract progressRadians from startRadians to rotate counterclockwise
  const endRadians = startRadians - progressRadians + Math.PI;
  // Calculate the position of the end cap for counterclockwise rotation
  const endCapX = rank_circle_center_x + rank_circle_radius * Math.cos(endRadians);
  const endCapY = rank_circle_center_y - rank_circle_radius * Math.sin(endRadians); // Subtract because SVG y-axis goes down
  // Correctly add the end cap based on the calculated position
  const endCap = `<circle cx="${endCapX}" cy="${endCapY}" r="14" fill="#00f0ff"></circle>`;
  
  // Calculate the length of the "filled" part of the circle
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progressPercentage = (100 - stats.rank.percentile)/100;
  const visibleLength = circumference * progressPercentage;

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
          animation: change-opacity 0.5s ease-out forwards
        }

        .animate-delay-1 {animation-delay: 0s, 0.1s;}
        .animate-delay-2 {animation-delay: 0.08s, 0.18s;}
        .animate-delay-3 {animation-delay: 0.16s, 0.26s;}
        .animate-delay-4 {animation-delay: 0.24s, 0.34s;}
        .animate-delay-5 {animation-delay: 0.32s, 0.42s;}
        .animate-delay-6 {animation-delay: 0.4s, 0.5s;}
        .animate-delay-7 {animation-delay: 0.48s, 0.58s;}
        .animate-delay-8 {animation-delay: 0.56s, 0.66s;}
        .animate-delay-9 {animation-delay: 0.64s, 0.74s;}
        .animate-delay-10 {animation-delay: 0.72s, 0.82s;}
        .animate-delay-11 {animation-delay: 0.8s, 0.9s;}
        .animate-delay-12 {animation-delay: 0.88s, 0.98s;}

        .background { fill: #00000000; } 
        .text { font-family: 'Ubuntu', sans-serif; }
        .title { fill: ${text_title_color}; fonr-size: 30px font-weight: bold; }
        .label { fill: ${text_label_color}; font-size: 20px; }
        .value { fill: ${text_value_color}; font-size: 20px; font-weight: bold; }
        .rank { fill: ${rank_color}; font-size: 50px; font-weight: bold; }
        .rank-percentage { fill: ${rank_percentage_color}; font-size: 20px; font-weight: bold; }
        .circle-bg { fill: #00000000; }
        .circle-progress { fill: #00000000; }
        .icon { fill: ${icon_color} ; }
      </style>
      <rect class="background" width="100%" height="100%" />
      <text x="50" y="50" class="text title animate" font-size="30">${stats.name}'s GitHub Stats</text>

      <g transform="translate(40, 100)" class="animate animate-delay-1">
        <path class="icon" d="${Icons.star_icon}" transform="translate(5, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Total Stars Earned:</text>
        <text x="320" y="0" class="text value">${stats.total_stars}</text>
      </g>

      <g transform="translate(40, 140)" class="animate animate-delay-2">
        <path class="icon" d="${Icons.contributes_to_icon}" transform="translate(8, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Contributed to:</text>
        <text x="320" y="0" class="text value">${stats.total_contributes_to}</text>
      </g>

      <g transform="translate(40, 180)" class="animate animate-delay-3">
        <path class="icon" d="${Icons.followers_icon}" transform="translate(7, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Total Followers:</text>
        <text x="320" y="0" class="text value">${stats.followers}</text>
      </g>

      <g transform="translate(40, 220)" class="animate animate-delay-4">
        <path class="icon" d="${Icons.repo_icon}" transform="translate(5, -17) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total Repos:</text>
        <text x="320" y="0" class="text value">${stats.total_repos}</text>
      </g>

      <g transform="translate(40, 260)" class="animate animate-delay-5">
        <path class="icon" d="${Icons.commit_icon}" transform="translate(5, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Total Commits:</text>
        <text x="320" y="0" class="text value">${stats.total_commits}</text>
      </g>

      <g transform="translate(40, 300)" class="animate animate-delay-6">
        <path class="icon" d="${Icons.pr_icon}" transform="translate(5, -17) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total PRs:</text>
        <text x="320" y="0" class="text value">${stats.total_prs}</text>
      </g>

      <g transform="translate(40, 340)" class="animate animate-delay-7">
        <path class="icon" d="${Icons.merged_prs_icon}" transform="translate(5, -17) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total PRs Merged:</text>
        <text x="320" y="0" class="text value">${stats.total_merged_prs}</text>
      </g>

      <g transform="translate(40, 380)" class="animate animate-delay-8">
        <path class="icon" d="${Icons.pr_reviewed_icon}" transform="translate(7, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Total PRs Reviewed:</text>
        <text x="320" y="0" class="text value">${stats.total_prs_reviewed}</text>
      </g>

      <g transform="translate(40, 420)" class="animate animate-delay-9">
        <path class="icon" d="${Icons.merged_prs_percentage_icon}" transform="translate(5, -17) scale(0.04)"/>
        <text x="40" y="0" class="text label">Merged PRs Percentage:</text>
        <text x="320" y="0" class="text value">${stats.merged_prs_percentage.toFixed(0)}%</text>
      </g>

      <g transform="translate(40, 460)" class="animate animate-delay-10">
        <path class="icon" d="${Icons.issue_icon}" transform="translate(5, -18) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total Issues:</text>
        <text x="320" y="0" class="text value">${stats.total_issues}</text>
      </g>

      <g transform="translate(40, 500)" class="animate animate-delay-11">
        <path class="icon" d="${Icons.discussions_started_icon}" transform="translate(5, -18) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total Discussions Started:</text>
        <text x="320" y="0" class="text value">${stats.total_discussions_started}</text>
      </g>

      <g transform="translate(40, 540)" class="animate animate-delay-12">
        <path class="icon" d="${Icons.discussions_answered_icon}" transform="translate(5, -18) scale(1.4)"/>
        <text x="40" y="0" class="text label">Total Discussions Answered:</text>
        <text x="320" y="0" class="text value">${stats.total_discussions_answered}</text>
      </g>

      <circle class="circle-bg" cx="650" cy="140" r="80" stroke="${darkenHexColor("#00f0ff",dark_level)}" stroke-width="34" fill="#00000000"></circle>

      <path class="circle-progress" d="
        M 650,140
        m -80,0
        a 80,80 0 1,0 160,0
        a 80,80 0 1,0 -160,0
      " transform="rotate(-90 650 140)"
        stroke-dasharray="${visibleLength}, ${circumference}"
        stroke="#00f0ff" stroke-width="28" fill="none"></path>
        ${startCap}
        ${endCap}

      <text x="${rank_circle_center_x}" y="${rank_circle_center_y}" class="text rank"  text-anchor="middle">${stats.rank.level}</text>
      <text x="${rank_circle_center_x}" y="${rank_circle_center_y+40}" class="text rank-percentage" text-anchor="middle" dx="0.1em">${stats.rank.percentile.toFixed(1)}%</text>
    </svg>
  `;
  return svg;
}

export { renderStats as default };
