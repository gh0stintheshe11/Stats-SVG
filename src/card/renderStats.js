import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Get the directory name of the current module file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Import all the icons from the utils/icons.js file
import Icons from '../utils/icons.js';
// Import the config
import config from '../../config.js';
// const sizeOf = require('image-size');
import sizeOf from 'image-size';

// Costumized font
// Read the Base64 encoded font file
const RajdhaniRegular_base64 = fs.readFileSync(path.join(__dirname, '../utils/fonts/Rajdhani-Regular.ttf'), 'base64');
const ChakraPetchRegular_base64 = fs.readFileSync(path.join(__dirname, '../utils/fonts/ChakraPetch-Regular.ttf'), 'base64');
const LibreBarcode128Regular_base64 = fs.readFileSync(path.join(__dirname, '../utils/fonts/LibreBarcode128-Regular.ttf'), 'base64');

// Read the PNG file and encode it to Base64
const EdgeRunnerLogo_base64 = fs.readFileSync(path.join(__dirname, '../utils/logo.png'), 'base64');
const dimensions = sizeOf(path.join(__dirname, '../utils/logo.png'));

// Github personal page URL
const githubUrl = 'https://github.com/gh0stintheshe11';

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
  const rank_ring_center_y = svg_height/2 - rank_ring_radius*1.2;
  const rank_percentile = stats.rank.percentile;

  // Rank Progress Bar
  const rank_progress_bar_thickness = config.rank.progressBarThickness;
  const rank_progress_bar_color = config.colors.rankProgressBar;

  // Language Ring
  const language_ring_radius = config.language.ringRadius;
  const language_ring_thickness = config.language.ringThickness;
  const language_ring_center_x = svg_width/2;
  const language_ring_center_y = svg_height/2 + language_ring_radius*2;
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

  // png image position and size calculation
  const image_width = dimensions.width;
  const image_height = dimensions.height;
  const target_height = Math.round(language_ring_radius*2-language_ring_thickness)
  const image_y = Math.round(language_ring_center_y - target_height/2)
  const image_x = Math.round(language_ring_center_x -(target_height/image_height*image_width/2))

  const svg = `
    <svg width="${svg_width}" height="${svg_height}" xmlns="http://www.w3.org/2000/svg">
      <style>

        @font-face {
          font-family: 'RajdhaniRegular';
          src: url('data:font/ttf;base64,${RajdhaniRegular_base64}') format('truetype');
        }

        @font-face {
          font-family: 'ChakraPetchRegular';
          src: url('data:font/ttf;base64,${ChakraPetchRegular_base64}') format('truetype');
        }

        @font-face {
          font-family: 'LibreBarcode128Regular';
          src: url('data:font/ttf;base64,${LibreBarcode128Regular_base64}') format('truetype');
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
        .animate-delay-13 {animation-delay: 0.96s, 1.06s;}

        @keyframes fillProgress {
          from {
            stroke-dashoffset: ${circumference};
          }
          to {
            stroke-dashoffset: ${visibleLength};
          }
        }

        @keyframes slideInFromLeft {
          0% {
            opacity: 0;
            transform: translateX(-100%);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .text-slide-in {
          animation: slideInFromLeft 0.3s ease-out forwards;
        }

        .background { fill: none; } 
        .title { font-family: 'ChakraPetchRegular'; fill: ${text_title_color}; font-size: 30px font-weight: bold; }
        .label { font-family: 'RajdhaniRegular'; fill: ${text_label_color}; font-size: 20px; }
        .value { font-family: 'RajdhaniRegular'; fill: ${text_value_color}; font-size: 20px; font-weight: bold; }
        .barcode { font-family: 'LibreBarcode128Regular'; fill: ${text_title_color};}
        .rank-letter { font-family: 'ChakraPetchRegular'; fill: ${rank_letter_color}; font-size: 50px; font-weight: bold; }
        .rank-percentage { font-family: 'RajdhaniRegular'; fill: ${rank_percentage_color}; font-size: 20px; font-weight: bold; }
        .rank-circle-bg { fill: none; }
        .rank-circle-progress { fill: none; }
        .icon { fill: ${icon_color} ; }
      </style>

      <rect class="background" width="100%" height="100%" />

      <text x="50" y="40" class="title animate" font-size="30">${stats.name}'s GitHub Stats</text>

      <clipPath id="clipPathReveal">
        <rect x="0" y="0" height="100" width="0">
          <!-- Animate the width of the rectangle -->
          <animate attributeName="width" begin="0s" dur="1s" from="0" to="${svg_width}" fill="freeze" />
        </rect>
      </clipPath>

      <text x="${svg_width-20}" y="85" class="barcode" text-anchor="end" font-size="30" clip-path="url(#clipPathReveal)">${githubUrl}</text>

      <line x1="10" y1="60" x2="10" y2="60" stroke="${config.colors.icon}" stroke-width="2">
        <animate attributeName="x2" from="10" to="${svg_width-10}" dur="0.5s" fill="freeze" />
      </line>

      <g transform="translate(30, 100)" class="animate animate-delay-1">
        <path class="icon" d="${Icons.star_icon}" transform="translate(5, -17) scale(0.04)"/>
        <text x="40" y="0" class="label">Total Stars Earned:</text>
        <text x="320" y="0" class="value">${stats.total_stars}</text>
      </g>

      <g transform="translate(30, 140)" class="animate animate-delay-2">
        <path class="icon" d="${Icons.contributes_to_icon}" transform="translate(6, -17) scale(0.045)"/>
        <text x="40" y="0" class="label">Contributed to:</text>
        <text x="320" y="0" class="value">${stats.total_contributes_to}</text>
      </g>

      <g transform="translate(30, 180)" class="animate animate-delay-3">
        <path class="icon" d="${Icons.followers_icon}" transform="translate(7, -17) scale(0.04)"/>
        <text x="40" y="0" class="label">Total Followers:</text>
        <text x="320" y="0" class="value">${stats.followers}</text>
      </g>

      <g transform="translate(30, 220)" class="animate animate-delay-4">
        <path class="icon" d="${Icons.repo_icon}" transform="translate(5, -17) scale(1.4)"/>
        <text x="40" y="0" class="label">Total Repos:</text>
        <text x="320" y="0" class="value">${stats.total_repos}</text>
      </g>

      <g transform="translate(30, 260)" class="animate animate-delay-5">
        <path class="icon" d="${Icons.commit_icon}" transform="translate(5, -17) scale(0.04)"/>
        <text x="40" y="0" class="label">Total Commits:</text>
        <text x="320" y="0" class="value">${stats.total_commits}</text>
      </g>

      <g transform="translate(30, 300)" class="animate animate-delay-6">
        <path class="icon" d="${Icons.pr_icon}" transform="translate(5, -17) scale(1.4)"/>
        <text x="40" y="0" class="label">Total PRs:</text>
        <text x="320" y="0" class="value">${stats.total_prs}</text>
      </g>

      <g transform="translate(30, 340)" class="animate animate-delay-7">
        <path class="icon" d="${Icons.merged_prs_icon}" transform="translate(5, -17) scale(1.4)"/>
        <text x="40" y="0" class="label">Total PRs Merged:</text>
        <text x="320" y="0" class="value">${stats.total_merged_prs}</text>
      </g>

      <g transform="translate(30, 380)" class="animate animate-delay-8">
        <path class="icon" d="${Icons.pr_reviewed_icon}" transform="translate(7, -17) scale(0.04)"/>
        <text x="40" y="0" class="label">Total PRs Reviewed:</text>
        <text x="320" y="0" class="value">${stats.total_prs_reviewed}</text>
      </g>

      <g transform="translate(30, 420)" class="animate animate-delay-9">
        <path class="icon" d="${Icons.merged_prs_percentage_icon}" transform="translate(5, -17) scale(0.04)"/>
        <text x="40" y="0" class="label">Merged PRs Percentage:</text>
        <text x="320" y="0" class="value">${stats.merged_prs_percentage.toFixed(0)}%</text>
      </g>

      <g transform="translate(30, 460)" class="animate animate-delay-10">
        <path class="icon" d="${Icons.issue_icon}" transform="translate(5, -18) scale(1.4)"/>
        <text x="40" y="0" class="label">Total Issues:</text>
        <text x="320" y="0" class="value">${stats.total_issues}</text>
      </g>

      <g transform="translate(30, 500)" class="animate animate-delay-11">
        <path class="icon" d="${Icons.discussions_started_icon}" transform="translate(5, -18) scale(1.4)"/>
        <text x="40" y="0" class="label">Total Discussions Started:</text>
        <text x="320" y="0" class="value">${stats.total_discussions_started}</text>
      </g>

      <g transform="translate(30, 540)" class="animate animate-delay-12">
        <path class="icon" d="${Icons.discussions_answered_icon}" transform="translate(4, -20) scale(1.6)"/>
        <text x="40" y="0" class="label">Total Discussions Answered:</text>
        <text x="320" y="0" class="value">${stats.total_discussions_answered}</text>
      </g>

      <g transform="translate(30, 580)" class="animate animate-delay-13">
        <path class="icon" d="${Icons.fork_icon}" transform="translate(7, -18) scale(0.04)"/>
        <text x="40" y="0" class="label">Total Forks Earned:</text>
        <text x="320" y="0" class="value">${stats.total_forks}</text>
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

      <text x="${rank_ring_center_x}" y="${rank_ring_center_y}" class="rank-letter"  text-anchor="middle">${stats.rank.level}</text>
      <text x="${rank_ring_center_x}" y="${rank_ring_center_y+40}" class="rank-percentage" text-anchor="middle" dx="0.1em">${stats.rank.percentile.toFixed(1)}%</text>

      ${language_percentage_ring}

      <image href="data:image/png;base64,${EdgeRunnerLogo_base64}" x="${image_x}" y="${image_y}" height="${target_height}"/>
    </svg>
  `;
  return svg;
}

export { renderStats as default };
