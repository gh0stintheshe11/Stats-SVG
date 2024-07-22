// Import all the icons from the utils/icons.js file
import Icons from '../utils/icons.js';
// Import the config
import config from '../../config.js';

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

  // SVG Config
  const svg_width = config.svg.width;
  const svg_height = config.svg.height;

  // Elements Config
  // Colors
  const icon_color = config.colors.icon;
  const text_title_color = config.colors.textTitle;
  const text_label_color = config.colors.textLabel;
  const text_value_color = config.colors.textValue;
  const rank_letter_color = config.colors.rankLetter;
  const rank_percentage_color = config.colors.rankPercentage;
  const rank_ring_bg_dark_level = config.rank.ringBgDarkLevel;

  // Rank Ring
  const rank_ring_radius = config.rank.ringRadius;
  const rank_ring_thickness = config.rank.ringThickness;
  const rank_ring_center_x = svg_width/2;
  const rank_ring_center_y = svg_height/2 - rank_ring_radius*1.5;
  const rank_percentile = stats.rank.percentile;

  // Rank Progress Bar
  const rank_progress_bar_thickness = config.rank.progressBarThickness;
  const rank_progress_bar_color = config.colors.rankProgressBar;

  // Language Ring
  const language_ring_radius = config.language.ringRadius;
  const language_ring_thickness = config.language.ringThickness;
  const language_ring_center_x = svg_width/2;
  const language_ring_center_y = svg_height/2 + language_ring_radius*1.5;
  const language_circumference = 2 * Math.PI * language_ring_radius;

  // render the language percentage ring
  const totalSegments = Object.keys(stats.language_percentages).length;
  let accumulatedOffset = 0;
  const language_percentage_ring = Object.keys(stats.language_percentages).map((language, index) => {
    const value = stats.language_percentages[language];
    const segmentLength = (value / 100) * language_circumference;
    const color = stats.top_languages[language].color ? stats.top_languages[language].color : '#cccccc'; // Default color if not found

    const segment = `
      <circle cx="${language_ring_center_x}" cy="${language_ring_center_y}" r="${language_ring_radius}" 
        stroke="${color}" stroke-width="${language_ring_thickness}" fill="none"
        stroke-dasharray="${segmentLength} ${language_circumference - segmentLength}"
        stroke-dashoffset="${-accumulatedOffset}"
        transform="rotate(90 ${language_ring_center_x} ${language_ring_center_y})"
        style="opacity: 0; animation: change-opacity 0.5s ease-out forwards; animation-delay: ${(totalSegments-index)*0.15}s;" />
    `;
    accumulatedOffset += segmentLength;

    return segment;
  }).join('');
  
  // Calculate the length of the "filled" part of the circle
  const circumference = 2 * Math.PI * rank_ring_radius;
  const progressPercentage = (100 - rank_percentile)/100;
  const visibleLength = circumference - circumference * progressPercentage;

  const svg = `
    <svg width="${svg_width}" height="${svg_height}" xmlns="http://www.w3.org/2000/svg">
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
          animation: change-opacity 0.5s ease-out forwards;
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

        @keyframes fillProgress {
          from {
            stroke-dashoffset: ${circumference};
          }
          to {
            stroke-dashoffset: ${visibleLength};
          }
        }

        .background { fill: none; } 
        .text { font-family: 'Ubuntu', sans-serif; }
        .title { fill: ${text_title_color}; font-size: 30px font-weight: bold; }
        .label { fill: ${text_label_color}; font-size: 20px; }
        .value { fill: ${text_value_color}; font-size: 20px; font-weight: bold; }
        .rank-letter { fill: ${rank_letter_color}; font-size: 50px; font-weight: bold; }
        .rank-percentage { fill: ${rank_percentage_color}; font-size: 20px; font-weight: bold; }
        .rank-circle-bg { fill: none; }
        .rank-circle-progress { fill: none; }
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

      <circle class="rank-circle-bg" cx="${rank_ring_center_x}" cy="${rank_ring_center_y}" r="${rank_ring_radius}" stroke="${darkenHexColor("#00f0ff",rank_ring_bg_dark_level)}" stroke-width="${rank_ring_thickness}" fill="none"></circle>

      <path class="rank-circle-progress" d="
        M ${rank_ring_center_x},${rank_ring_center_y}
        m ${-rank_ring_radius},0
        a ${rank_ring_radius},${rank_ring_radius} 0 1,0 ${2*rank_ring_radius},0
        a ${rank_ring_radius},${rank_ring_radius} 0 1,0 ${-2*rank_ring_radius},0
      " transform="rotate(-90 ${rank_ring_center_x} ${rank_ring_center_y})"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${circumference}"
        stroke="${rank_progress_bar_color}" 
        stroke-width="${rank_progress_bar_thickness}" 
        fill="none"
        style="animation: fillProgress 1.5s ease-out forwards; stroke-linecap: round;"></path>

      <text x="${rank_ring_center_x}" y="${rank_ring_center_y}" class="text rank-letter"  text-anchor="middle">${stats.rank.level}</text>
      <text x="${rank_ring_center_x}" y="${rank_ring_center_y+40}" class="text rank-percentage" text-anchor="middle" dx="0.1em">${stats.rank.percentile.toFixed(1)}%</text>

      ${language_percentage_ring}
    </svg>
  `;
  return svg;
}

export { renderStats as default };
