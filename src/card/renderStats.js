import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sizeOf from 'image-size';
import config from '../../config.js';
import Icons from '../utils/icons.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the PNG file and encode it to Base64
const image_base64 = fs.readFileSync(path.join(__dirname, '../utils/image.gif'), 'base64');
// get the dimensions of the image
const dimensions = sizeOf(path.join(__dirname, '../utils/image.gif'));

// Load the Base64 encoded fonts
const fontsBase64 = JSON.parse(fs.readFileSync(path.join(__dirname, '../utils/fontsBase64.json'), 'utf8'));

function darkenHexColor(hex, darkenFactor) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  r = Math.round(r * (darkenFactor / 100));
  g = Math.round(g * (darkenFactor / 100));
  b = Math.round(b * (darkenFactor / 100));

  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function calculateGithubUrl(stats) {
  return `https://github.com/${stats.login}`;
}

async function calculateSvgConfig(config) {
  const svg_width = config.svg.width;
  const svg_height = config.svg.height;
  return { svg_width, svg_height };
}

async function calculateElementsConfig(config) {
  const icon_color = config.colors.icon;
  const text_title_color = config.colors.textTitle;
  const text_label_color = config.colors.textLabel;
  const text_value_color = config.colors.textValue;
  return {
    icon_color,
    text_title_color,
    text_label_color,
    text_value_color,
  };
}

async function calculateRankRing(config, stats, svg_width, svg_height) {
  const rank_ring_radius = config.rank.ringRadius;
  const rank_ring_thickness = config.rank.ringThickness;
  const rank_progress_bar_thickness = config.rank.progressBarThickness;
  const rank_progress_bar_color = config.colors.rankProgressBar;
  const rank_letter_color = config.colors.rankLetter;
  const rank_percentage_color = config.colors.rankPercentage;
  const rank_ring_bg_dark_level = config.rank.ringBgDarkLevel;
  const rank_ring_center_x = Math.round(svg_width / 2);
  const rank_ring_center_y = Math.round(svg_height / 2 - rank_ring_radius * 1.2);
  const rank_percentile = stats.rank.percentile;
  const rank_ring_circle_radius = rank_ring_radius + rank_ring_thickness;
  const rank_ring_left_end = rank_ring_center_x - rank_ring_circle_radius;
  const rank_ring_right_end = rank_ring_center_x + rank_ring_circle_radius;
  const angle = Math.PI / 4; // 45 degrees in radians
  const displacement = Math.round(rank_ring_circle_radius * Math.cos(angle));
  const rank_ring_top_left_x = rank_ring_center_x - displacement;
  const rank_ring_top_left_y = rank_ring_center_y - displacement;
  const rank_ring_bottom_right_x = rank_ring_center_x + displacement;
  const rank_ring_bottom_right_y = rank_ring_center_y + displacement;
  const rank_ring_top_right_x = rank_ring_center_x + displacement;
  const rank_ring_top_right_y = rank_ring_center_y - displacement;
  const rank_ring_bottom_left_x = rank_ring_center_x - displacement;
  const rank_ring_bottom_left_y = rank_ring_center_y + displacement;
  const arc_length = Math.round(Math.PI * rank_ring_circle_radius / 2);
  const rank_circumference = 2 * Math.PI * rank_ring_radius;
  // Calculate the length of the visible progress bar
  const visibleLength = rank_circumference * (1 - rank_percentile / 100);
  return {
    rank_ring_radius,
    rank_ring_thickness,
    rank_ring_center_x,
    rank_ring_center_y,
    rank_ring_circle_radius,
    rank_ring_left_end,
    rank_ring_right_end,
    rank_ring_top_left_x,
    rank_ring_top_left_y,
    rank_ring_bottom_right_x,
    rank_ring_bottom_right_y,
    rank_ring_top_right_x,
    rank_ring_top_right_y,
    rank_ring_bottom_left_x,
    rank_ring_bottom_left_y,
    rank_letter_color,
    rank_percentage_color,
    rank_ring_bg_dark_level,
    arc_length,
    rank_circumference,
    visibleLength,
    rank_progress_bar_thickness,
    rank_progress_bar_color,
  };
}

async function calculateLanguageRing(config, svg_width, svg_height) {
  const language_ring_radius = config.language.ringRadius;
  const language_ring_thickness = config.language.ringThickness;
  const language_ring_center_x = Math.round(svg_width / 2);
  const language_ring_center_y = Math.round(svg_height / 2 + language_ring_radius * 2);
  const language_circumference = Math.round(2 * Math.PI * language_ring_radius);
  const first_column_x_offset = Math.round(language_ring_center_x + language_ring_radius * 1.1 + language_ring_thickness);
  const second_column_x_offset = Math.round(first_column_x_offset + language_ring_radius * 2.4 + language_ring_thickness);
  return {
    language_ring_radius,
    language_ring_thickness,
    language_ring_center_x,
    language_ring_center_y,
    language_circumference,
    first_column_x_offset,
    second_column_x_offset,
  };
}

async function calculateImagePosition(dimensions, language_ring_radius, language_ring_thickness, language_ring_center_x, language_ring_center_y) {
  const image_width = dimensions.width;
  const image_height = dimensions.height;
  const target_height = Math.round(language_ring_radius * 2 - language_ring_thickness);
  const image_y = Math.round(language_ring_center_y - target_height / 2);
  const image_x = Math.round(language_ring_center_x - (target_height / image_height * image_width / 2));
  return { target_height, image_y, image_x };
}

async function renderLanguageRing(languagePercentages, languageRingConfig, elementsConfig) {
  const totalSegments = languagePercentages.length;
  let accumulatedOffset = 0;
  let accumulatedPercentage = 0;

  return languagePercentages.map((languageData, index) => {
    const { name: language, percentage: value, color } = languageData;
    accumulatedPercentage += value;

    // Calculate segment length based on accumulated percentage
    const segmentLength = Math.round((accumulatedPercentage / 100) * languageRingConfig.language_circumference) - accumulatedOffset;
    
    const strokeColor = color || '#cccccc'; // Default color if not found

    const segment = `
      <circle cx="${languageRingConfig.language_ring_center_x}" cy="${languageRingConfig.language_ring_center_y}" r="${languageRingConfig.language_ring_radius}" 
        stroke="${strokeColor}" stroke-width="${languageRingConfig.language_ring_thickness}" fill="none"
        stroke-dasharray="${segmentLength} ${languageRingConfig.language_circumference - segmentLength}"
        stroke-dashoffset="${-accumulatedOffset}"
        transform="rotate(90 ${languageRingConfig.language_ring_center_x} ${languageRingConfig.language_ring_center_y})"
        style="opacity: 0; animation: change-opacity 0.5s ease-out forwards; animation-delay: ${(totalSegments - index) * 0.15}s;" />
    `;
    accumulatedOffset += segmentLength;

    // Calculate position for text labels
    const isFirstColumn = index < 10;
    const column_x_offset = isFirstColumn ? languageRingConfig.first_column_x_offset : languageRingConfig.second_column_x_offset;
    const column_index = isFirstColumn ? index : index - 10;
    const text_y_position = Math.round(languageRingConfig.language_ring_center_y - languageRingConfig.language_ring_radius - 8 + column_index * 19);

    // SVG for the text label
    const text_element = `
      <g transform="translate(${column_x_offset}, ${text_y_position})" class="animate" style="animation-delay: ${index * 0.1}s;">
        <rect x="0" y="0" width="16" height="16" fill="${strokeColor}" />
        <text x="20" y="8" class="language-legend" dominant-baseline="central">
          <tspan fill="${elementsConfig.text_label_color}">${language}</tspan>
          <tspan fill="${elementsConfig.text_value_color}" dx="5">${value.toFixed(2)}%</tspan>
        </text>
      </g>
    `;

    return segment + text_element;
  }).join('');
}

async function renderStats(stats) {

  const [
    githubUrl,
    { svg_width, svg_height },
    elementsConfig,
    rankRingConfig,
    languageRingConfig,
    imagePosition,
  ] = await Promise.all([
    calculateGithubUrl(stats),
    calculateSvgConfig(config),
    calculateElementsConfig(config),
    calculateRankRing(config, stats, config.svg.width, config.svg.height),
    calculateLanguageRing(config, config.svg.width, config.svg.height),
    calculateImagePosition(dimensions, config.language.ringRadius, config.language.ringThickness, Math.round(config.svg.width / 2), Math.round(config.svg.height / 2 + config.language.ringRadius * 2)),
  ]);
  
  // Render the language percentage ring and text labels
  const language_percentage_ring = await renderLanguageRing(stats.language_percentages, languageRingConfig, elementsConfig);

  const svg = `
    <svg width="${svg_width}" height="${svg_height}" xmlns="http://www.w3.org/2000/svg">
      <style>

        <!-- Fonts -->
        @font-face {
          font-family: 'Rajdhani';
          src: url('data:font/truetype;charset=utf-8;base64,${fontsBase64['Rajdhani-Regular']}') format('truetype');
        }
        @font-face {
          font-family: 'ChakraPetch';
          src: url('data:font/truetype;charset=utf-8;base64,${fontsBase64['ChakraPetch-Regular']}') format('truetype');
        }
        @font-face {
          font-family: 'LibreBarcode128';
          src: url('data:font/truetype;charset=utf-8;base64,${fontsBase64['LibreBarcode128-Regular']}') format('truetype');
        }
        
        <!-- Animation Styles -->
        @keyframes change-opacity {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .animate {
          opacity: 0;
          animation: change-opacity 0.5s ease-out forwards;
        }

        .animate-delay-1 {animation-delay: 0.8s, 0.9s;}
        .animate-delay-2 {animation-delay: 0.88s, 0.98s;}
        .animate-delay-3 {animation-delay: 0.96s, 1.07s;}
        .animate-delay-4 {animation-delay: 1.04s, 1.16s;}
        .animate-delay-5 {animation-delay: 1.12s, 1.25s;}
        .animate-delay-6 {animation-delay: 1.20s, 1.34s;}
        .animate-delay-7 {animation-delay: 1.28s, 1.43s;}
        .animate-delay-8 {animation-delay: 1.36s, 1.52s;}
        .animate-delay-9 {animation-delay: 1.44s, 1.61s;}
        .animate-delay-10 {animation-delay: 1.52s, 1.70s;}
        .animate-delay-11 {animation-delay: 1.60s, 1.79s;}
        .animate-delay-12 {animation-delay: 1.68s, 1.88s;}
        .animate-delay-13 {animation-delay: 1.76s, 1.97s;}

        @keyframes fillProgress {
          0% { stroke-dashoffset: ${rankRingConfig.rank_circumference}; }
          100% { stroke-dashoffset: ${rankRingConfig.rank_circumference + rankRingConfig.visibleLength}; }
        }

        @keyframes blinking {
          0%, 100% { opacity: 1; }
          25%, 75% { opacity: 0; }
          50% { opacity: 1; }
        }

        .blink {
          animation: blinking 1.5s ease-out;
        }

        @keyframes flikering {
          0% { opacity: 0; }
          ${getRandomInt(1,30)}% { opacity: 0.4; }
          ${getRandomInt(31,45)}% { opacity: 0; }
          ${getRandomInt(46,90)}% { opacity: 0.2; }
          100% { opacity: 0; } 
        }

        <!-- Background Styles -->
        .background { fill: none; } 

        <!-- Title Styles -->
        .title { 
          font-family: 'ChakraPetch', Helvetica; 
          fill: ${elementsConfig.text_title_color}; 
          font-size: 30px; 
          font-weight: bold; 
          Opacity: 0; 
          animation: flikering 0.4s 2, change-opacity 1s ease-in-out 0.8s forwards; 
        }

        <!-- Label Styles -->
        .label { 
          font-family: 'Rajdhani', Helvetica; 
          fill: ${elementsConfig.text_label_color}; 
          font-size: 22px; 
        }

        <!-- Value Styles -->
        .value { 
          font-family: 'Rajdhani', Helvetica; 
          fill: ${elementsConfig.text_value_color}; 
          font-size: 24px; 
          font-weight: bold; 
        }

        <!-- Barcode Styles -->
        .barcode { 
          font-family: 'LibreBarcode128', Helvetica; 
          fill: ${elementsConfig.text_title_color};
        }
        
        <!-- Rank Ring Styles -->
        .rank-letter { 
          font-family: 'ChakraPetch', Helvetica; 
          fill: ${rankRingConfig.rank_letter_color}; 
          font-size: 68px; 
          font-weight: bold; 
          opacity: 0; 
          animation: change-opacity 0.5s ease-out 1.6s forwards; 
        }
        .rank-percentage { 
          font-family: 'Rajdhani', Helvetica; 
          fill: ${rankRingConfig.rank_percentage_color}; 
          font-size: 26px; 
          font-weight: bold; 
          opacity: 0; 
          animation: change-opacity 0.5s ease-out 1.6s forwards;
        }
        .rank-circle-bg { 
          fill: none; 
          opacity: 0; 
          animation: change-opacity 0.5s ease-out 1.5s forwards; 
        }
        .rank-circle-progress { 
          fill: none; 
          opacity: 0; 
          animation: 
            fillProgress 1s ease-out 1.6s forwards, 
            change-opacity 0.1s 1.5s forwards; 
          stroke-linecap: round; 
        }
        
        <!-- Language Ring Styles -->
        .language-legend { 
          font-family: 'Rajdhani', Helvetica; 
          font-size: 18px; 
        }

        <!-- Icon Styles -->
        .icon { fill: ${elementsConfig.icon_color}; }
      </style>

      <rect class="background" width="100%" height="100%" />

      <text x="50" y="40" class="title" font-size="36">${stats.name}'s GitHub Stats</text>

      <clipPath id="clipPathReveal">
        <rect x="0" y="0" height="100" width="0">
          <!-- Animate the width of the rectangle -->
          <animate attributeName="width" begin="0s" dur="1s" from="0" to="${svg_width}" fill="freeze" />
        </rect>
      </clipPath>

      <text x="${svg_width-20}" y="50" class="barcode" text-anchor="end" font-size="30" clip-path="url(#clipPathReveal)">${githubUrl}</text>

      <!-- Initial dot -->
      <circle cx="10" cy="60" r="4" fill="${elementsConfig.icon_color}">
        <animate attributeName="opacity" values="1;0;1" dur="0.5s" repeatCount="1" />
        <animate attributeName="opacity" from="1" to="0" dur="0.2s" fill="freeze" begin="0.5s" />
      </circle>

      <!-- dot change line moving to right -->  
      <line x1="10" y1="60" x2="10" y2="60" stroke="${config.colors.icon}" stroke-width="4">
        <animate attributeName="x2" from="10" to="${svg_width-10}" dur="0.5s" fill="freeze" begin="0.5s"/>
      </line>

      <g transform="translate(30, 100)" class="animate animate-delay-1">
        <path class="icon" d="${Icons.star_icon}" transform="translate(5, -17) scale(0.04)"/>
        <text x="40" y="0" class="label">Total Stars Earned</text>
        <text x="300" y="0" class="value">${stats.total_stars}</text>
      </g>

      <g transform="translate(30, 140)" class="animate animate-delay-2">
        <path class="icon" d="${Icons.fork_icon}" transform="translate(7, -18) scale(0.04)"/>
        <text x="40" y="0" class="label">Total Forks Earned</text>
        <text x="300" y="0" class="value">${stats.total_forks}</text>
      </g>

      <g transform="translate(30, 180)" class="animate animate-delay-3">
        <path class="icon" d="${Icons.followers_icon}" transform="translate(7, -17) scale(0.04)"/>
        <text x="40" y="0" class="label">Total Followers</text>
        <text x="300" y="0" class="value">${stats.followers}</text>
      </g>

      <g transform="translate(30, 220)" class="animate animate-delay-4">
        <path class="icon" d="${Icons.contributes_to_icon}" transform="translate(6, -17) scale(0.045)"/>
        <text x="40" y="0" class="label">Contributed to</text>
        <text x="300" y="0" class="value">${stats.total_contributes_to}</text>
      </g>

      <g transform="translate(30, 260)" class="animate animate-delay-5">
        <path class="icon" d="${Icons.repo_icon}" transform="translate(5, -17) scale(1.4)"/>
        <text x="40" y="0" class="label">Total Repos</text>
        <text x="300" y="0" class="value">${stats.total_repos}</text>
      </g>

      <g transform="translate(30, 300)" class="animate animate-delay-6">
        <path class="icon" d="${Icons.issue_icon}" transform="translate(5, -18) scale(1.4)"/>
        <text x="40" y="0" class="label">Total Issues</text>
        <text x="300" y="0" class="value">${stats.total_issues}</text>
      </g>

      <g transform="translate(30, 340)" class="animate animate-delay-7">
        <path class="icon" d="${Icons.commit_icon}" transform="translate(5, -17) scale(0.04)"/>
        <text x="40" y="0" class="label">Total Commits</text>
        <text x="300" y="0" class="value">${stats.total_commits}</text>
      </g>

      <g transform="translate(30, 380)" class="animate animate-delay-8">
        <path class="icon" d="${Icons.pr_icon}" transform="translate(5, -17) scale(1.4)"/>
        <text x="40" y="0" class="label">Total PRs</text>
        <text x="300" y="0" class="value">${stats.total_prs}</text>
      </g>

      <g transform="translate(30, 420)" class="animate animate-delay-9">
        <path class="icon" d="${Icons.merged_prs_icon}" transform="translate(5, -17) scale(1.4)"/>
        <text x="40" y="0" class="label">Total PRs Merged</text>
        <text x="300" y="0" class="value">${stats.total_merged_prs}</text>
      </g>

      <g transform="translate(30, 460)" class="animate animate-delay-10">
        <path class="icon" d="${Icons.pr_reviewed_icon}" transform="translate(7, -17) scale(0.04)"/>
        <text x="40" y="0" class="label">Total PRs Reviewed</text>
        <text x="300" y="0" class="value">${stats.total_prs_reviewed}</text>
      </g>

      <g transform="translate(30, 500)" class="animate animate-delay-11">
        <path class="icon" d="${Icons.merged_prs_percentage_icon}" transform="translate(5, -17) scale(0.04)"/>
        <text x="40" y="0" class="label">Merged PRs Percentage</text>
        <text x="300" y="0" class="value">${stats.merged_prs_percentage.toFixed(0)}%</text>
      </g>

      <g transform="translate(30, 540)" class="animate animate-delay-12">
        <path class="icon" d="${Icons.discussions_started_icon}" transform="translate(5, -18) scale(1.4)"/>
        <text x="40" y="0" class="label">Total Discussions Started</text>
        <text x="300" y="0" class="value">${stats.total_discussions_started}</text>
      </g>

      <g transform="translate(30, 580)" class="animate animate-delay-13">
        <path class="icon" d="${Icons.discussions_answered_icon}" transform="translate(4, -20) scale(1.6)"/>
        <text x="40" y="0" class="label">Total Discussions Answered</text>
        <text x="300" y="0" class="value">${stats.total_discussions_answered}</text>
      </g>

      <!-- Rank Ring -->
      <!-- Rank Ring Background -->
      <circle class="rank-circle-bg" cx="${rankRingConfig.rank_ring_center_x}" cy="${rankRingConfig.rank_ring_center_y}" r="${rankRingConfig.rank_ring_radius}" stroke="${darkenHexColor("#00f0ff",rankRingConfig.rank_ring_bg_dark_level)}" stroke-width="${rankRingConfig.rank_ring_thickness}" fill="none"></circle>

      <!-- Rank Ring Progress (using circle instead of path) -->
      <circle
        class="rank-circle-progress"
        cx="${rankRingConfig.rank_ring_center_x}" 
        cy="${rankRingConfig.rank_ring_center_y}" 
        r="${rankRingConfig.rank_ring_radius}" 
        stroke="${rankRingConfig.rank_progress_bar_color}" 
        stroke-width="${rankRingConfig.rank_progress_bar_thickness}" 
        fill="none" 
        stroke-dasharray="${rankRingConfig.rank_circumference} ${rankRingConfig.rank_circumference}" 
        stroke-dashoffset="${rankRingConfig.rank_circumference}" 
        transform="rotate(90 ${rankRingConfig.rank_ring_center_x} ${rankRingConfig.rank_ring_center_y})"
      />

      <!-- Rank Ring Text -->
      <text x="${rankRingConfig.rank_ring_center_x}" y="${rankRingConfig.rank_ring_center_y+Math.round(rankRingConfig.rank_ring_radius/6)}" class="rank-letter"  text-anchor="middle">${stats.rank.level}</text>
      <text x="${rankRingConfig.rank_ring_center_x}" y="${rankRingConfig.rank_ring_center_y+Math.round(rankRingConfig.rank_ring_radius*2/3)-6}" class="rank-percentage" text-anchor="middle" dx="0.1em">${stats.rank.percentile.toFixed(1)}%</text>

      <!-- langauge ring center: image/gif/webp/whatever -->
      <image href="data:image/png;base64,${image_base64}" x="${imagePosition.image_x}" y="${imagePosition.image_y}" height="${imagePosition.target_height}" class="blink"/>

      <!-- Language Ring -->
      ${language_percentage_ring}

      <!-- Language Ring card-like border -->
      <!-- Main border with notch -->
      <path d="M 430,340 L 650,340 L 660,350 L 1080,350 L 1080,540 L 1040,580 L 430,580 Z" fill="none" stroke="${elementsConfig.icon_color}" stroke-width="2" opacity="0">
        <animate attributeName="stroke-dasharray" from="0, 3500" to="3500, 0" dur="3s" fill="freeze" begin="0.6s" />
        <animate attributeName="opacity" values="0;0.2;0;1" dur="0.2s" fill="freeze" begin="0.4s" />
      </path>

      <!-- corner trangle -->
      <path d="M 1080,555 L 1080,580 L 1055,580 Z" fill="${elementsConfig.icon_color}" stroke="${elementsConfig.icon_color}" stroke-width="2" >
        <animate attributeName="opacity" values="1;0;1" dur="0.5s" repeatCount="5" />
      </path>

      <!-- left solid part -->
      <path d="M 420,340 L 430,340 L 430,580 L 420,580 L 420,540 L 425,535 L 425,480 L 420,475 Z" fill="${elementsConfig.icon_color}" stroke="${elementsConfig.icon_color}" stroke-width="2">
        <animate attributeName="opacity" values="0;1" dur="0.5s" fill="freeze" />
      </path>

      <!-- Rank ring line part -->
      <!-- Initial dot as a circle with zero radius -->
      <circle cx="${rankRingConfig.rank_ring_center_x}" cy="${rankRingConfig.rank_ring_center_y}" r="4" fill="${elementsConfig.icon_color}">
        <animate attributeName="opacity" values="1;0;1" dur="0.5s" repeatCount="1" />
        <animate attributeName="opacity" from="1" to="0" dur="0.2s" fill="freeze" begin="0.5s" />
      </circle>

      <!-- dot change to short dash line moving to left -->
      <line x1="${rankRingConfig.rank_ring_center_x}" y1="${rankRingConfig.rank_ring_center_y}" x2="${rankRingConfig.rank_ring_center_x}" y2="${rankRingConfig.rank_ring_center_y}" stroke="${elementsConfig.icon_color}" stroke-width="4">
        <animate attributeName="x2" from="${rankRingConfig.rank_ring_center_x}" to="${rankRingConfig.rank_ring_left_end-20}" dur="0.5s" fill="freeze" begin="0.5s" />
        <animate attributeName="x1" from="${rankRingConfig.rank_ring_center_x}" to="${rankRingConfig.rank_ring_left_end}" dur="0.5s" fill="freeze" begin="1s" />
      </line>

      <!-- dot change to short dash line moving to right -->
      <line x1="${rankRingConfig.rank_ring_center_x}" y1="${rankRingConfig.rank_ring_center_y}" x2="${rankRingConfig.rank_ring_center_x}" y2="${rankRingConfig.rank_ring_center_y}" stroke="${elementsConfig.icon_color}" stroke-width="4">
        <animate attributeName="x2" from="${rankRingConfig.rank_ring_center_x}" to="1080" dur="0.5s" fill="freeze" begin="0.5s" />
        <animate attributeName="x1" from="${rankRingConfig.rank_ring_center_x}" to="${rankRingConfig.rank_ring_right_end}" dur="0.5" fill="freeze" begin="1s" />
      </line>

      <!-- top left 1/8 circle path -->
      <path d="M ${rankRingConfig.rank_ring_left_end} ${rankRingConfig.rank_ring_center_y} A ${rankRingConfig.rank_ring_circle_radius} ${rankRingConfig.rank_ring_circle_radius} 0 0 1 ${rankRingConfig.rank_ring_top_left_x} ${rankRingConfig.rank_ring_top_left_y}" stroke="${elementsConfig.icon_color}" stroke-width="4" fill="transparent" stroke-dasharray="0, ${rankRingConfig.arc_length}">
        <animate attributeName="stroke-dasharray" from="0, ${rankRingConfig.arc_length}" to="${rankRingConfig.arc_length}, 0" dur="1s" fill="freeze" begin="1s"/>
      </path>

      <!-- top right 1/8 circle path -->
      <path d="M ${rankRingConfig.rank_ring_right_end} ${rankRingConfig.rank_ring_center_y} A ${rankRingConfig.rank_ring_circle_radius} ${rankRingConfig.rank_ring_circle_radius} 0 0 0 ${rankRingConfig.rank_ring_top_right_x} ${rankRingConfig.rank_ring_top_right_y}" stroke="${elementsConfig.icon_color}" stroke-width="4" fill="transparent" stroke-dasharray="0, ${rankRingConfig.arc_length}">
        <animate attributeName="stroke-dasharray" from="0, ${rankRingConfig.arc_length}" to="${rankRingConfig.arc_length}, 0" dur="1s" fill="freeze" begin="1s"/>
      </path>

      <!-- bottom left 1/8 circle path -->
      <path d="M ${rankRingConfig.rank_ring_left_end} ${rankRingConfig.rank_ring_center_y} A ${rankRingConfig.rank_ring_circle_radius} ${rankRingConfig.rank_ring_circle_radius} 0 0 0 ${rankRingConfig.rank_ring_bottom_left_x} ${rankRingConfig.rank_ring_bottom_left_y}" stroke="${elementsConfig.icon_color}" stroke-width="4" fill="transparent" stroke-dasharray="0, ${rankRingConfig.arc_length}">
        <animate attributeName="stroke-dasharray" from="0, ${rankRingConfig.arc_length}" to="${rankRingConfig.arc_length}, 0" dur="1s" fill="freeze" begin="1s"/>
      </path>

      <!-- bottom right 1/8 circle path -->
      <path d="M ${rankRingConfig.rank_ring_right_end} ${rankRingConfig.rank_ring_center_y} A ${rankRingConfig.rank_ring_circle_radius} ${rankRingConfig.rank_ring_circle_radius} 0 0 1 ${rankRingConfig.rank_ring_bottom_right_x} ${rankRingConfig.rank_ring_bottom_right_y}" stroke="${elementsConfig.icon_color}" stroke-width="4" fill="transparent" stroke-dasharray="0, ${rankRingConfig.arc_length}">
        <animate attributeName="stroke-dasharray" from="0, ${rankRingConfig.arc_length}" to="${rankRingConfig.arc_length}, 0" dur="1s" fill="freeze" begin="1s"/>
      </path>

    </svg>
  `;
  return svg;
}

export { renderStats as default };

