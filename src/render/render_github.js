import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sizeOf from 'image-size';
import config from '../../config.js';
import Icons from '../asset/icons.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the PNG file and encode it to Base64
const image_base64 = fs.readFileSync(path.join(__dirname, '../asset/image.gif'), 'base64');
// get the dimensions of the image
const dimensions = sizeOf(path.join(__dirname, '../asset/image.gif'));

// Load the Base64 encoded fonts
const fontsBase64 = JSON.parse(fs.readFileSync(path.join(__dirname, '../asset/fontsBase64.json'), 'utf8'));

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

function convertNumberUnit(number) {
  if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + 'M';
  } else if (number >= 1000) {
    return (number / 1000).toFixed(1) + 'K';
  }
  return number;
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
  const rank_ring_left_arc = rank_ring_center_x - rank_ring_circle_radius;
  const rank_ring_right_arc = rank_ring_center_x + rank_ring_circle_radius;
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
  const rank_ring_left_line_end = rank_ring_center_x - rank_ring_radius*1.7;
  const rank_ring_right_line_end = rank_ring_center_x + rank_ring_radius*1.7;
  return {
    rank_ring_radius,
    rank_ring_thickness,
    rank_ring_center_x,
    rank_ring_center_y,
    rank_ring_circle_radius,
    rank_ring_left_arc,
    rank_ring_right_arc,
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
    rank_ring_left_line_end,
    rank_ring_right_line_end,
  };
}

async function calculateLanguageRing(config, svg_width, svg_height) {
  const language_ring_radius = config.language.ringRadius;
  const language_ring_thickness = config.language.ringThickness;
  const language_ring_center_x = Math.round(svg_width / 2);
  const language_ring_center_y = Math.round(svg_height / 2 + language_ring_radius * 2);
  const language_circumference = Math.round(2 * Math.PI * language_ring_radius);
  const first_column_x_offset = Math.round(language_ring_center_x + language_ring_radius * 1.8);
  const second_column_x_offset = Math.round(first_column_x_offset + (1080 - first_column_x_offset) / 2);
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
      <g transform="translate(${column_x_offset}, ${text_y_position})" class="animate" style="animation-delay: ${index * 0.15}s;">
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

async function renderContributionChart(contributionDistribution, rankRingConfig) {
  // Sort the dates
  const sortedDates = Object.keys(contributionDistribution).sort().slice(-config.contribution_distribution.days_to_show);
  const data = sortedDates.map((date, i, arr) => {
    const total = contributionDistribution[date].total;
    const prevTotal = i > 0 ? contributionDistribution[arr[i - 1]].total : total;
    
    return {
      date,
      open: prevTotal,   // Simulate open as the previous day's total
      close: total,      // Use the current day's total as the close
      high: Math.max(total, prevTotal), // High is the max of current and previous totals
      low: Math.min(total, prevTotal)   // Low is the min of current and previous totals
    };
  });

  // Chart dimensions and position
  const chartX = rankRingConfig.rank_ring_center_x + rankRingConfig.rank_ring_radius * 1.8;
  const chartWidth = 1080 - chartX;
  const chartY = rankRingConfig.rank_ring_center_y - 1.2 * rankRingConfig.rank_ring_radius;
  const chartHeight = 2.4 * rankRingConfig.rank_ring_radius;

  // Calculate scales
  const maxTotal = Math.max(...data.map(d => d.high)) + 1; // Add 1 to create space for the label
  const barWidth = chartWidth / data.length;
  const yScale = chartHeight / maxTotal;
  const totalBarDisplayTime = (data.length - 1) * config.contribution_distribution.bar_display_time_interval;
  const top_border_line_x = maxTotal > 100 ? 33 : maxTotal > 10 ? 22 : 11;

  const chartSVG = `
  <g transform="translate(${chartX}, ${chartY})" class="animate animate-delay-14">
    <text x="${chartWidth}" y="-10" text-anchor="end" class="label">Daily Contributions (${config.contribution_distribution.days_to_show} days)</text>
    
    <!-- border lines -->
    <!-- bottom line -->
    <line x1="0" y1="${chartHeight+2}" x2="0" y2="${chartHeight+2}" stroke="${config.contribution_distribution.border_color}" stroke-width="1">
      <animate attributeName="x1" from="0" to="${chartWidth+2}" dur="${totalBarDisplayTime}s" fill="freeze" begin="${config.contribution_distribution.global_display_time_delay}s"/>
    </line>
    <!-- top line -->
    <line x1="${chartWidth+2}" y1="-2" x2="${chartWidth+2}" y2="-2" stroke="${config.contribution_distribution.border_color}" stroke-width="1">
      <animate attributeName="x2" from="${chartWidth+2}" to="${top_border_line_x}" dur="0.3s" fill="freeze" begin="${config.contribution_distribution.global_display_time_delay + totalBarDisplayTime + 0.2}s"/>
    </line>
    <!-- side line -->
    <line x1="${chartWidth+2}" y1="${chartHeight+2}" x2="${chartWidth+2}" y2="${chartHeight+2}" stroke="${config.contribution_distribution.border_color}" stroke-width="1" opacity="1">
      <animate attributeName="y2" from="${chartHeight+2}" to="-2" dur="0.2s" fill="freeze" begin="${config.contribution_distribution.global_display_time_delay + totalBarDisplayTime}s"/>
    </line>

    <!-- Candlesticks -->
    ${data.map((d, i) => {
      const x = i * barWidth;
      const highY = chartHeight - (d.high * yScale);
      const lowY = chartHeight - (d.low * yScale);
      const openY = chartHeight - (d.open * yScale);
      const closeY = chartHeight - (d.close * yScale);
      
      // Check if open and close are at the same level
      const sameLevel = Math.abs(openY - closeY) < 0.1;
      const isZero = d.open === 0 && d.close === 0;

      // Determine color based on price movement and same level condition
      let color;
      if (sameLevel) {
        color = config.contribution_distribution.neutral_color;
      } else {
        color = d.close > d.open ? config.contribution_distribution.bullish_color : config.contribution_distribution.bearish_color;
      }

      const bodyHeight = sameLevel ? 1 : Math.abs(openY - closeY); // Use minimum height of 1 if same level

      // Only render if not both open and close are zero
      if (isZero) return '';

      return `
        <g opacity="0">
          <!-- Wick -->
          <line x1="${x + barWidth / 2}" y1="${highY}" x2="${x + barWidth / 2}" y2="${lowY}" stroke="#00f0ff" stroke-width="1"/>

          <!-- Body -->
          <rect 
            x="${x + barWidth * 0.1}" 
            y="${Math.min(openY, closeY)}" 
            width="${barWidth * 0.8}" 
            height="${bodyHeight}" 
            fill="${color}" 
          />
          <animate attributeName="opacity" from="0" to="1" dur="${config.contribution_distribution.bar_display_time_duration}s" begin="${config.contribution_distribution.global_display_time_delay + i * config.contribution_distribution.bar_display_time_interval}s" fill="freeze" />
        </g>
      `;
    }).join('')}

    <!-- Date labels (first and last) -->
    <text x="0" y="${(chartHeight+2)*1.11}" text-anchor="start" class="label" font-size="4" opacity="0">
      ${data[0].date}
      <animate attributeName="opacity" from="0" to="1" dur="0.2s" fill="freeze" begin="${config.contribution_distribution.global_display_time_delay}s"/>
    </text>
    <text x="${chartWidth+4}" y="${(chartHeight+2)*1.11}" class="label" text-anchor="end" font-size="4" opacity="0">
      ${data[data.length - 1].date}
      <animate attributeName="opacity" from="0" to="1" dur="0.2s" fill="freeze" begin="${config.contribution_distribution.global_display_time_delay + totalBarDisplayTime}s"/>
    </text>

    <!-- Y-axis labels -->
    <!-- max -->
    <text x="-2" y="5" text-anchor="start" class="label" opacity="0"> ${maxTotal}
      <animate attributeName="opacity" from="0" to="1" dur="0.2s" fill="freeze" begin="${config.contribution_distribution.global_display_time_delay + totalBarDisplayTime + 0.5}s"/>
    </text>

    </g>
  `;

  return chartSVG;
}

async function renderStats(stats) {

  const [
    githubUrl,
    { svg_width, svg_height },
    elementsConfig,
    rankRingConfig,
    languageRingConfig,
    imagePosition
  ] = await Promise.all([
    calculateGithubUrl(stats),
    calculateSvgConfig(config),
    calculateElementsConfig(config),
    calculateRankRing(config, stats, config.svg.width, config.svg.height),
    calculateLanguageRing(config, config.svg.width, config.svg.height),
    calculateImagePosition(dimensions, config.language.ringRadius, config.language.ringThickness, Math.round(config.svg.width / 2), Math.round(config.svg.height / 2 + config.language.ringRadius * 2))
  ]);
  
  const [language_percentage_ring, contribution_chart] = await Promise.all([
    renderLanguageRing(stats.language_percentages, languageRingConfig, elementsConfig),
    renderContributionChart(stats.contribution_distribution, rankRingConfig)
  ]);

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
          animation: change-opacity 0.8s ease-out 2.6s forwards; 
        }
        .rank-percentage { 
          font-family: 'Rajdhani', Helvetica; 
          fill: ${rankRingConfig.rank_percentage_color}; 
          font-size: 26px; 
          font-weight: bold; 
          opacity: 0; 
          animation: change-opacity 0.8s ease-out 2.4s forwards;
        }
        .rank-circle-bg { 
          fill: none; 
          opacity: 0; 
          animation: change-opacity 0.3s ease-out 1.2s forwards; 
        }
        .rank-circle-progress { 
          fill: none; 
          opacity: 0; 
          animation: 
            fillProgress 1.5s ease-out 2.4s forwards, 
            change-opacity 0s 2.4s forwards; 
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
        <!-- border -->
        <path d="M 337,-5 L 337,8 L -10,8 L -10,-24 L 337,-24 L 337,-11" fill="none" stroke="${stats.total_stars > 50 ? "#32cd32" : "#c5003c"}" stroke-width="2" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.1s" />
        </path>
        <!-- icon -->
        <path class="icon" d="${Icons.star_icon}" transform="translate(5, -18) scale(0.04)"/>
        <text x="40" y="0" class="label">Total Stars Earned</text>
        <!-- value -->
        <text x="320" y="0" class="value" text-anchor="end">${convertNumberUnit(stats.total_stars)}</text>
        <!-- node -->
        <circle cx="337" cy="-8" r="3" fill="none" stroke="${elementsConfig.icon_color}" stroke-width="1" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.1s" />
        </circle>
        <!-- connector -->
        <path d="M 340,-8 L ${rankRingConfig.rank_ring_left_line_end-54},-8 L ${rankRingConfig.rank_ring_left_line_end-54},${rankRingConfig.rank_ring_center_y-88} L ${rankRingConfig.rank_ring_left_arc-30},${rankRingConfig.rank_ring_center_y-88}" fill="none" stroke="${elementsConfig.icon_color}" stroke-width="2" opacity="0" stroke-dasharray="500" stroke-dashoffset="500">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.2s" />
          <animate attributeName="stroke-dashoffset" from="500" to="0" dur="0.5s" fill="freeze" begin="1.3s" />
        </path>
      </g>

      <g transform="translate(30, 140)" class="animate animate-delay-2">
        <path class="icon" d="${Icons.fork_icon}" transform="translate(7, -18) scale(0.04)"/>
        <text x="40" y="0" class="label">Total Forks Earned</text>
        <text x="320" y="0" class="value" text-anchor="end">${convertNumberUnit(stats.total_forks)}</text>
      </g>

      <g transform="translate(30, 180)" class="animate animate-delay-3">
        <!-- border -->
        <path d="M 337,-5 L 337,8 L -10,8 L -10,-24 L 337,-24 L 337,-11" fill="none" stroke="${stats.followers > 10 ? "#32cd32" : "#c5003c"}" stroke-width="2" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.27s" />
        </path>
        <!-- icon -->
        <path class="icon" d="${Icons.followers_icon}" transform="translate(7, -18) scale(0.04)"/>
        <text x="40" y="0" class="label">Total Followers</text>
        <!-- value -->
        <text x="320" y="0" class="value" text-anchor="end">${convertNumberUnit(stats.followers)}</text>
        <!-- node -->
        <circle cx="337" cy="-8" r="3" fill="none" stroke="${elementsConfig.icon_color}" stroke-width="1" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.27s" />
        </circle>
        <!-- connector -->
        <path d="M 340,-8 L ${rankRingConfig.rank_ring_left_line_end-54},-8 L ${rankRingConfig.rank_ring_left_line_end-54},${rankRingConfig.rank_ring_center_y-186} L ${rankRingConfig.rank_ring_left_arc-30},${rankRingConfig.rank_ring_center_y-186}" fill="none" stroke="${elementsConfig.icon_color}" stroke-width="2" opacity="0" stroke-dasharray="500" stroke-dashoffset="500">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.37s" />
          <animate attributeName="stroke-dashoffset" from="500" to="0" dur="0.5s" fill="freeze" begin="1.47s" />
        </path>
      </g>

      <g transform="translate(30, 220)" class="animate animate-delay-7">
        <!-- border -->
        <path d="M 337,-5 L 337,8 L -10,8 L -10,-24 L 337,-24 L 337,-11" fill="none" stroke="${stats.total_commits > 1000 ? "#32cd32" : "#c5003c"}" stroke-width="2" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.63s" />
        </path>
        <!-- icon -->
        <path class="icon" d="${Icons.commit_icon}" transform="translate(4, -18) scale(0.04)"/>
        <text x="40" y="0" class="label">Total Commits</text>
        <!-- value -->
        <text x="320" y="0" class="value" text-anchor="end">${convertNumberUnit(stats.total_commits)}</text>
        <!-- node -->
        <circle cx="337" cy="-8" r="3" fill="none" stroke="${elementsConfig.icon_color}" stroke-width="1" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.63s" />
        </circle>
        <!-- connector -->
        <path d="M 340,-8 L ${rankRingConfig.rank_ring_left_line_end-54},-8 L ${rankRingConfig.rank_ring_left_line_end-54},${rankRingConfig.rank_ring_center_y-223} L ${rankRingConfig.rank_ring_left_arc-30},${rankRingConfig.rank_ring_center_y-223}" fill="none" stroke="${elementsConfig.icon_color}" stroke-width="2" opacity="0" stroke-dasharray="500" stroke-dashoffset="500">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.73s" />
          <animate attributeName="stroke-dashoffset" from="500" to="0" dur="0.5s" fill="freeze" begin="1.83s" />
        </path>
      </g>

      <g transform="translate(30, 260)" class="animate animate-delay-6">
        <!-- border -->
        <path d="M 337,-5 L 337,8 L -10,8 L -10,-24 L 337,-24 L 337,-11" fill="none" stroke="${stats.total_issues > 25 ? "#32cd32" : "#c5003c"}" stroke-width="2" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.54s" />
        </path>
        <!-- icon -->
        <path class="icon" d="${Icons.issue_icon}" transform="translate(5, -19) scale(1.4)"/>
        <text x="40" y="0" class="label">Total Issues</text>
        <!-- value -->
        <text x="320" y="0" class="value" text-anchor="end">${convertNumberUnit(stats.total_issues)}</text>
        <!-- node -->
        <circle cx="337" cy="-8" r="3" fill="none" stroke="${elementsConfig.icon_color}" stroke-width="1" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.54s" />
        </circle>
        <!-- connector -->
        <path d="M 340,-8 L ${rankRingConfig.rank_ring_left_line_end-54},-8 L ${rankRingConfig.rank_ring_left_line_end-54},${rankRingConfig.rank_ring_center_y-260} L ${rankRingConfig.rank_ring_left_arc-30},${rankRingConfig.rank_ring_center_y-260}" fill="none" stroke="${elementsConfig.icon_color}" stroke-width="2" opacity="0" stroke-dasharray="500" stroke-dashoffset="500">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.64s" />
          <animate attributeName="stroke-dashoffset" from="500" to="0" dur="0.5s" fill="freeze" begin="1.74s" />
        </path>
      </g>

      <g transform="translate(30, 300)" class="animate animate-delay-8">
        <!-- border -->
        <path d="M 337,-5 L 337,8 L -10,8 L -10,-24 L 337,-24 L 337,-11" fill="none" stroke="${stats.total_prs > 50 ? "#32cd32" : "#c5003c"}" stroke-width="2" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.72s" />
        </path>
        <!-- icon -->
        <path class="icon" d="${Icons.pr_icon}" transform="translate(5, -19) scale(1.4)"/>
        <text x="40" y="0" class="label">Total PRs</text>
        <!-- value -->
        <text x="320" y="0" class="value" text-anchor="end">${convertNumberUnit(stats.total_prs)}</text>
        <!-- node -->
        <circle cx="337" cy="-8" r="3" fill="none" stroke="${elementsConfig.icon_color}" stroke-width="1" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.72s" />
        </circle>
        <!-- connector -->
        <path d="M 340,-8 L ${rankRingConfig.rank_ring_left_line_end-54},-8 L ${rankRingConfig.rank_ring_left_line_end-54},${rankRingConfig.rank_ring_center_y-297} L ${rankRingConfig.rank_ring_left_arc-30},${rankRingConfig.rank_ring_center_y-297}" fill="none" stroke="${elementsConfig.icon_color}" stroke-width="2" opacity="0" stroke-dasharray="500" stroke-dashoffset="500">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.82s" />
          <animate attributeName="stroke-dashoffset" from="500" to="0" dur="0.5s" fill="freeze" begin="1.92s" />
        </path> 
      </g>

      <g transform="translate(30, 340)" class="animate animate-delay-9">
        <path class="icon" d="${Icons.merged_prs_icon}" transform="translate(5, -17) scale(1.4)"/>
        <text x="40" y="0" class="label">Total PRs Merged</text>
        <text x="320" y="0" class="value" text-anchor="end">${convertNumberUnit(stats.total_merged_prs)}</text>
      </g>

      <g transform="translate(30, 380)" class="animate animate-delay-10">
        <!-- border -->
        <path d="M 337,-5 L 337,8 L -10,8 L -10,-24 L 337,-24 L 337,-11" fill="none" stroke="${stats.total_prs_reviewed > 2 ? "#32cd32" : "#c5003c"}" stroke-width="2" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.9s" />
        </path>
        <!-- icon -->
        <path class="icon" d="${Icons.pr_reviewed_icon}" transform="translate(7, -18) scale(0.04)"/>
        <text x="40" y="0" class="label">Total PRs Reviewed</text>
        <!-- value -->
        <text x="320" y="0" class="value" text-anchor="end">${convertNumberUnit(stats.total_prs_reviewed)}</text>
        <!-- node -->
        <circle cx="337" cy="-8" r="3" fill="none" stroke="${elementsConfig.icon_color}" stroke-width="1" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.9s" />
        </circle>
        <!-- connector -->
        <path d="M 340,-8 L ${rankRingConfig.rank_ring_left_line_end-54},-8 L ${rankRingConfig.rank_ring_left_line_end-54},${rankRingConfig.rank_ring_center_y-374} L ${rankRingConfig.rank_ring_left_arc-30},${rankRingConfig.rank_ring_center_y-374}" fill="none" stroke="${elementsConfig.icon_color}" stroke-width="2" opacity="0" stroke-dasharray="500" stroke-dashoffset="500">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="2s" />
          <animate attributeName="stroke-dashoffset" from="500" to="0" dur="0.5s" fill="freeze" begin="2.1s" />
        </path>
      </g>

      <g transform="translate(30, 420)" class="animate animate-delay-11">
        <path class="icon" d="${Icons.merged_prs_percentage_icon}" transform="translate(5, -17) scale(0.04)"/>
        <text x="40" y="0" class="label">Merged PRs %</text>
        <text x="320" y="0" class="value" text-anchor="end">${stats.merged_prs_percentage.toFixed(1)}</text>
      </g>

      <g transform="translate(30, 460)" class="animate animate-delay-5">
        <!-- border -->
        <path d="M 337,-5 L 337,8 L -10,8 L -10,-24 L 337,-24 L 337,-11" fill="none" stroke="${stats.total_repos > 3 ? "#32cd32" : "#c5003c"}" stroke-width="2" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.45s" />
        </path>
        <!-- icon -->
        <path class="icon" d="${Icons.repo_icon}" transform="translate(5, -19) scale(1.4)"/>
        <text x="40" y="0" class="label">Total Repos</text>
        <!-- value -->
        <text x="320" y="0" class="value" text-anchor="end">${convertNumberUnit(stats.total_repos)}</text>
        <!-- node -->
        <circle cx="337" cy="-8" r="3" fill="none" stroke="${elementsConfig.icon_color}" stroke-width="1" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.45s" />
        </circle>
        <!-- connector -->
        <path d="M 340,-8 L ${rankRingConfig.rank_ring_left_line_end-54},-8 L ${rankRingConfig.rank_ring_left_line_end-54},${rankRingConfig.rank_ring_center_y-451} L ${rankRingConfig.rank_ring_left_arc-30},${rankRingConfig.rank_ring_center_y-451}" fill="none" stroke="${elementsConfig.icon_color}" stroke-width="2" opacity="0" stroke-dasharray="500" stroke-dashoffset="500">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="1.55s" />
          <animate attributeName="stroke-dashoffset" from="500" to="0" dur="0.5s" fill="freeze" begin="1.65s" />
        </path>
      </g>

      <g transform="translate(30, 500)" class="animate animate-delay-4">
        <path class="icon" d="${Icons.contributes_to_icon}" transform="translate(6, -17) scale(0.045)"/>
        <text x="40" y="0" class="label">Contributed to</text>
        <text x="320" y="0" class="value" text-anchor="end">${convertNumberUnit(stats.total_contributes_to)}</text>
      </g>

      <g transform="translate(30, 540)" class="animate animate-delay-12">
        <path class="icon" d="${Icons.discussions_started_icon}" transform="translate(5, -18) scale(1.4)"/>
        <text x="40" y="0" class="label">Discussions Started</text>
        <text x="320" y="0" class="value" text-anchor="end">${convertNumberUnit(stats.total_discussions_started)}</text>
      </g>

      <g transform="translate(30, 580)" class="animate animate-delay-13">
        <path class="icon" d="${Icons.discussions_answered_icon}" transform="translate(4, -20) scale(1.6)"/>
        <text x="40" y="0" class="label">Discussions Answered</text>
        <text x="320" y="0" class="value" text-anchor="end">${convertNumberUnit(stats.total_discussions_answered)}</text>
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
      <path d="M ${rankRingConfig.rank_ring_left_line_end+10},340 L 650,340 L 660,350 L 1080,350 L 1080,540 L 1040,580 L ${rankRingConfig.rank_ring_left_line_end+10},580 Z" fill="none" stroke="${elementsConfig.icon_color}" stroke-width="2" opacity="0">
        <animate attributeName="stroke-dasharray" from="0, 3500" to="3500, 0" dur="3s" fill="freeze" begin="0.7s" />
        <animate attributeName="opacity" values="0;0.3;0;1" dur="0.2s" fill="freeze" begin="0.4s" />
      </path>

      <!-- corner trangle -->
      <path d="M 1080,555 L 1080,580 L 1055,580 Z" fill="${elementsConfig.icon_color}" stroke="${elementsConfig.icon_color}" stroke-width="2" >
        <animate attributeName="opacity" values="1;0;1" dur="0.5s" repeatCount="5" />
      </path>

      <!-- left solid part -->
      <path d="M ${rankRingConfig.rank_ring_left_line_end},340 L ${rankRingConfig.rank_ring_left_line_end+10},340 L ${rankRingConfig.rank_ring_left_line_end+10},580 L ${rankRingConfig.rank_ring_left_line_end},580 L ${rankRingConfig.rank_ring_left_line_end},540 L ${rankRingConfig.rank_ring_left_line_end+5},535 L ${rankRingConfig.rank_ring_left_line_end+5},480 L ${rankRingConfig.rank_ring_left_line_end},475 Z" fill="${elementsConfig.icon_color}" stroke="${elementsConfig.icon_color}" stroke-width="2">
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
        <animate attributeName="x2" from="${rankRingConfig.rank_ring_center_x}" to="${rankRingConfig.rank_ring_left_arc}" dur="0.5s" fill="freeze" begin="0.5s" />
        <animate attributeName="x1" from="${rankRingConfig.rank_ring_center_x}" to="${rankRingConfig.rank_ring_left_arc}" dur="0.2s" fill="freeze" begin="1s" />
      </line>

      <!-- dot change to short dash line moving to right -->
      <line x1="${rankRingConfig.rank_ring_center_x}" y1="${rankRingConfig.rank_ring_center_y}" x2="${rankRingConfig.rank_ring_center_x}" y2="${rankRingConfig.rank_ring_center_y}" stroke="${elementsConfig.icon_color}" stroke-width="4">
        <animate attributeName="x2" from="${rankRingConfig.rank_ring_center_x}" to="${rankRingConfig.rank_ring_right_arc}" dur="0.5s" fill="freeze" begin="0.5s" />
        <animate attributeName="x1" from="${rankRingConfig.rank_ring_center_x}" to="${rankRingConfig.rank_ring_right_arc}" dur="0.2s" fill="freeze" begin="1s" />
      </line>

      <!-- top left 1/8 circle path -->
      <path d="M ${rankRingConfig.rank_ring_left_arc} ${rankRingConfig.rank_ring_center_y} A ${rankRingConfig.rank_ring_circle_radius} ${rankRingConfig.rank_ring_circle_radius} 0 0 1 ${rankRingConfig.rank_ring_top_left_x} ${rankRingConfig.rank_ring_top_left_y}" stroke="${elementsConfig.icon_color}" stroke-width="4" fill="transparent" stroke-dasharray="0, ${rankRingConfig.arc_length}">
        <animate attributeName="stroke-dasharray" from="0, ${rankRingConfig.arc_length}" to="${rankRingConfig.arc_length}, 0" dur="1s" fill="freeze" begin="1s"/>
      </path>

      <!-- top right 1/8 circle path -->
      <path d="M ${rankRingConfig.rank_ring_right_arc} ${rankRingConfig.rank_ring_center_y} A ${rankRingConfig.rank_ring_circle_radius} ${rankRingConfig.rank_ring_circle_radius} 0 0 0 ${rankRingConfig.rank_ring_top_right_x} ${rankRingConfig.rank_ring_top_right_y}" stroke="${elementsConfig.icon_color}" stroke-width="4" fill="transparent" stroke-dasharray="0, ${rankRingConfig.arc_length}">
        <animate attributeName="stroke-dasharray" from="0, ${rankRingConfig.arc_length}" to="${rankRingConfig.arc_length}, 0" dur="1s" fill="freeze" begin="1s"/>
      </path>

      <!-- bottom left 1/8 circle path -->
      <path d="M ${rankRingConfig.rank_ring_left_arc} ${rankRingConfig.rank_ring_center_y} A ${rankRingConfig.rank_ring_circle_radius} ${rankRingConfig.rank_ring_circle_radius} 0 0 0 ${rankRingConfig.rank_ring_bottom_left_x} ${rankRingConfig.rank_ring_bottom_left_y}" stroke="${elementsConfig.icon_color}" stroke-width="4" fill="transparent" stroke-dasharray="0, ${rankRingConfig.arc_length}">
        <animate attributeName="stroke-dasharray" from="0, ${rankRingConfig.arc_length}" to="${rankRingConfig.arc_length}, 0" dur="1s" fill="freeze" begin="1s"/>
      </path>

      <!-- bottom right 1/8 circle path -->
      <path d="M ${rankRingConfig.rank_ring_right_arc} ${rankRingConfig.rank_ring_center_y} A ${rankRingConfig.rank_ring_circle_radius} ${rankRingConfig.rank_ring_circle_radius} 0 0 1 ${rankRingConfig.rank_ring_bottom_right_x} ${rankRingConfig.rank_ring_bottom_right_y}" stroke="${elementsConfig.icon_color}" stroke-width="4" fill="transparent" stroke-dasharray="0, ${rankRingConfig.arc_length}">
        <animate attributeName="stroke-dasharray" from="0, ${rankRingConfig.arc_length}" to="${rankRingConfig.arc_length}, 0" dur="1s" fill="freeze" begin="1s"/>
      </path>

      ${contribution_chart}
      
    </svg>
  `;
  return svg;
}

export { renderStats as default };

