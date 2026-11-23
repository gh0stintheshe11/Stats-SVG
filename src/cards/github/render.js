import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageSize } from 'image-size';
import config from '../../../config.js';
import { safeHexColor } from '../../lib/escape.js';
import { fontFaces } from '../../lib/fonts.js';
import { svg } from '../../lib/svg.js';
import Icons from './icons.js';
import { calculateLanguagePercentage } from './languages.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read the center image once; its detected type (gif, png, webp, ...) sets the data URI MIME type
const imageBuffer = fs.readFileSync(path.join(__dirname, '../../assets/image.gif'));
const dimensions = imageSize(imageBuffer);
const image_data_uri = `data:image/${dimensions.type === 'jpg' ? 'jpeg' : dimensions.type};base64,${imageBuffer.toString('base64')}`;

/**
 * The stats list on the left, top to bottom (one row every 40px, starting at y=100).
 *
 * - `stat`: key in the stats object; `format` turns it into the displayed text.
 * - `delay`: the `.animate-delay-N` class that fades the row in. The order is deliberately
 *   not top-to-bottom.
 * - `highlight`: rows that feed the rank get a border and a connector line to the rank ring.
 *   - `above`: the border is green when the value is above this (the median used in rank.js).
 *   - `begin`: when the border appears, in seconds; the connector follows 0.1s and 0.2s later.
 *   - `ringOffsetY`: where the connector meets the rank ring, relative to the ring's center.
 */
const STAT_ROWS = [
  { stat: 'total_stars', label: 'Total Stars Earned', icon: 'star_icon', iconTransform: 'translate(5, -18) scale(0.04)', delay: 1,
    highlight: { above: 50, begin: 1.1, ringOffsetY: 12 } },
  { stat: 'total_forks', label: 'Total Forks Earned', icon: 'fork_icon', iconTransform: 'translate(7, -18) scale(0.04)', delay: 2 },
  { stat: 'followers', label: 'Total Followers', icon: 'followers_icon', iconTransform: 'translate(7, -18) scale(0.04)', delay: 3,
    highlight: { above: 10, begin: 1.27, ringOffsetY: -6 } },
  { stat: 'total_commits', label: 'Total Commits', icon: 'commit_icon', iconTransform: 'translate(4, -18) scale(0.04)', delay: 7,
    highlight: { above: 1000, begin: 1.63, ringOffsetY: -3 } },
  { stat: 'total_issues', label: 'Total Issues', icon: 'issue_icon', iconTransform: 'translate(5, -19) scale(1.4)', delay: 6,
    highlight: { above: 25, begin: 1.54, ringOffsetY: 0 } },
  { stat: 'total_prs', label: 'Total PRs', icon: 'pr_icon', iconTransform: 'translate(5, -19) scale(1.4)', delay: 8,
    highlight: { above: 50, begin: 1.72, ringOffsetY: 3 } },
  { stat: 'total_merged_prs', label: 'Total PRs Merged', icon: 'merged_prs_icon', iconTransform: 'translate(5, -17) scale(1.4)', delay: 9 },
  { stat: 'total_prs_reviewed', label: 'Total PRs Reviewed', icon: 'pr_reviewed_icon', iconTransform: 'translate(7, -18) scale(0.04)', delay: 10,
    highlight: { above: 2, begin: 1.9, ringOffsetY: 6 } },
  { stat: 'merged_prs_percentage', label: 'Merged PRs %', icon: 'merged_prs_percentage_icon', iconTransform: 'translate(5, -17) scale(0.04)', delay: 11,
    format: (value) => value.toFixed(1) },
  { stat: 'total_repos', label: 'Total Repos', icon: 'repo_icon', iconTransform: 'translate(5, -19) scale(1.4)', delay: 5,
    highlight: { above: 3, begin: 1.45, ringOffsetY: 9 } },
  { stat: 'total_contributes_to', label: 'Contributed to', icon: 'contributes_to_icon', iconTransform: 'translate(6, -17) scale(0.045)', delay: 4 },
  { stat: 'total_discussions_started', label: 'Discussions Started', icon: 'discussions_started_icon', iconTransform: 'translate(5, -18) scale(1.4)', delay: 12 },
  { stat: 'total_discussions_answered', label: 'Discussions Answered', icon: 'discussions_answered_icon', iconTransform: 'translate(4, -20) scale(1.6)', delay: 13 },
];

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

/** Adds two durations in seconds without floating point noise (1.1 + 0.1 -> 1.2, not 1.2000000000000002). */
const addSeconds = (a, b) => Number((a + b).toFixed(2));

function calculateRankRing(stats, svg_width, svg_height) {
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

function calculateLanguageRing(svg_width, svg_height) {
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

function calculateImagePosition(languageRing) {
  const target_height = Math.round(languageRing.language_ring_radius * 2 - languageRing.language_ring_thickness);
  const image_y = Math.round(languageRing.language_ring_center_y - target_height / 2);
  const image_x = Math.round(languageRing.language_ring_center_x - (target_height / dimensions.height * dimensions.width / 2));
  return { target_height, image_y, image_x };
}

function renderStatRow(row, index, stats, rankRing) {
  const y = 100 + index * 40;
  const value = stats[row.stat];
  const displayValue = (row.format ?? convertNumberUnit)(value);
  const highlight = row.highlight;

  if (!highlight) {
    return svg`
      <g transform="translate(30, ${y})" class="animate animate-delay-${row.delay}">
        <path class="icon" d="${Icons[row.icon]}" transform="${row.iconTransform}"/>
        <text x="40" y="0" class="label">${row.label}</text>
        <text x="320" y="0" class="value" text-anchor="end">${displayValue}</text>
      </g>
`;
  }

  const borderColor = value > highlight.above ? config.colors.thresholdPass : config.colors.thresholdFail;
  // Connector: right from the row, down/up to the ring's height, then right to the ring
  const elbowX = rankRing.rank_ring_left_line_end - 54;
  const ringY = rankRing.rank_ring_center_y + highlight.ringOffsetY - y; // relative to this row
  const ringX = rankRing.rank_ring_left_arc - 30;

  return svg`
      <g transform="translate(30, ${y})" class="animate animate-delay-${row.delay}">
        <!-- border -->
        <path d="M 337,-5 L 337,8 L -10,8 L -10,-24 L 337,-24 L 337,-11" fill="none" stroke="${borderColor}" stroke-width="2" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="${highlight.begin}s" />
        </path>
        <!-- icon -->
        <path class="icon" d="${Icons[row.icon]}" transform="${row.iconTransform}"/>
        <text x="40" y="0" class="label">${row.label}</text>
        <!-- value -->
        <text x="320" y="0" class="value" text-anchor="end">${displayValue}</text>
        <!-- node -->
        <circle cx="337" cy="-8" r="3" fill="none" stroke="${config.colors.icon}" stroke-width="1" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="${highlight.begin}s" />
        </circle>
        <!-- connector -->
        <path d="M 340,-8 L ${elbowX},-8 L ${elbowX},${ringY} L ${ringX},${ringY}" fill="none" stroke="${config.colors.icon}" stroke-width="2" opacity="0" stroke-dasharray="500" stroke-dashoffset="500">
          <animate attributeName="opacity" from="0" to="1" dur="0.1s" fill="freeze" begin="${addSeconds(highlight.begin, 0.1)}s" />
          <animate attributeName="stroke-dashoffset" from="500" to="0" dur="0.5s" fill="freeze" begin="${addSeconds(highlight.begin, 0.2)}s" />
        </path>
      </g>
`;
}

function renderLanguageRing(languagePercentages, languageRingConfig) {
  const totalSegments = languagePercentages.length;
  let accumulatedOffset = 0;
  let accumulatedPercentage = 0;

  return languagePercentages.map((languageData, index) => {
    const { name: language, percentage: value } = languageData;
    accumulatedPercentage += value;

    // Calculate segment length based on accumulated percentage
    const segmentLength = Math.round((accumulatedPercentage / 100) * languageRingConfig.language_circumference) - accumulatedOffset;
    
    const strokeColor = safeHexColor(languageData.color, '#cccccc'); // Default color if missing or not a hex color

    const segment = svg`
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
    const text_element = svg`
      <g transform="translate(${column_x_offset}, ${text_y_position})" class="animate" style="animation-delay: ${index * 0.15}s;">
        <rect x="0" y="0" width="16" height="16" fill="${strokeColor}" />
        <text x="20" y="8" class="language-legend" dominant-baseline="central">
          <tspan fill="${config.colors.textLabel}">${language}</tspan>
          <tspan fill="${config.colors.textValue}" dx="5">${value.toFixed(2)}%</tspan>
        </text>
      </g>
    `;

    return [segment, text_element];
  });
}

function renderContributionChart(contributionDistribution, rankRingConfig) {
  const chartConfig = config.contribution_distribution;

  // Sort the dates
  const sortedDates = Object.keys(contributionDistribution).sort().slice(-chartConfig.days_to_show);
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

  // Without any days there is nothing to scale against; show a placeholder instead of failing.
  if (data.length === 0) {
    return svg`
  <g transform="translate(${chartX}, ${chartY})" class="animate animate-delay-14">
    <text x="${chartWidth}" y="-10" text-anchor="end" class="label">Daily Contributions (${chartConfig.days_to_show} days)</text>
    <text x="${chartWidth / 2}" y="${chartHeight / 2}" text-anchor="middle" class="label">No contribution data</text>
  </g>
  `;
  }

  // Calculate scales
  const maxTotal = Math.max(...data.map(d => d.high)) + 1; // Add 1 to create space for the label
  const barWidth = chartWidth / data.length;
  const yScale = chartHeight / maxTotal;
  const totalBarDisplayTime = (data.length - 1) * chartConfig.bar_display_time_interval;
  const top_border_line_x = maxTotal > 100 ? 33 : maxTotal > 10 ? 22 : 11;

  const candlesticks = data.map((d, i) => {
    // Only render if not both open and close are zero
    if (d.open === 0 && d.close === 0) return null;

    const x = i * barWidth;
    const highY = chartHeight - (d.high * yScale);
    const lowY = chartHeight - (d.low * yScale);
    const openY = chartHeight - (d.open * yScale);
    const closeY = chartHeight - (d.close * yScale);

    // Same-level days get the neutral color and a 1px body; otherwise green when rising, red when falling
    const sameLevel = Math.abs(openY - closeY) < 0.1;
    const color = sameLevel
      ? chartConfig.neutral_color
      : d.close > d.open ? chartConfig.bullish_color : chartConfig.bearish_color;
    const bodyHeight = sameLevel ? 1 : Math.abs(openY - closeY);

    return svg`
        <g opacity="0">
          <!-- Wick -->
          <line x1="${x + barWidth / 2}" y1="${highY}" x2="${x + barWidth / 2}" y2="${lowY}" stroke="${chartConfig.border_color}" stroke-width="1"/>

          <!-- Body -->
          <rect 
            x="${x + barWidth * 0.1}" 
            y="${Math.min(openY, closeY)}" 
            width="${barWidth * 0.8}" 
            height="${bodyHeight}" 
            fill="${color}" 
          />
          <animate attributeName="opacity" from="0" to="1" dur="${chartConfig.bar_display_time_duration}s" begin="${chartConfig.global_display_time_delay + i * chartConfig.bar_display_time_interval}s" fill="freeze" />
        </g>
      `;
  });

  return svg`
  <g transform="translate(${chartX}, ${chartY})" class="animate animate-delay-14">
    <text x="${chartWidth}" y="-10" text-anchor="end" class="label">Daily Contributions (${chartConfig.days_to_show} days)</text>
    
    <!-- border lines -->
    <!-- bottom line -->
    <line x1="0" y1="${chartHeight+2}" x2="0" y2="${chartHeight+2}" stroke="${chartConfig.border_color}" stroke-width="1">
      <animate attributeName="x1" from="0" to="${chartWidth+2}" dur="${totalBarDisplayTime}s" fill="freeze" begin="${chartConfig.global_display_time_delay}s"/>
    </line>
    <!-- top line -->
    <line x1="${chartWidth+2}" y1="-2" x2="${chartWidth+2}" y2="-2" stroke="${chartConfig.border_color}" stroke-width="1">
      <animate attributeName="x2" from="${chartWidth+2}" to="${top_border_line_x}" dur="0.3s" fill="freeze" begin="${chartConfig.global_display_time_delay + totalBarDisplayTime + 0.2}s"/>
    </line>
    <!-- side line -->
    <line x1="${chartWidth+2}" y1="${chartHeight+2}" x2="${chartWidth+2}" y2="${chartHeight+2}" stroke="${chartConfig.border_color}" stroke-width="1" opacity="1">
      <animate attributeName="y2" from="${chartHeight+2}" to="-2" dur="0.2s" fill="freeze" begin="${chartConfig.global_display_time_delay + totalBarDisplayTime}s"/>
    </line>

    <!-- Candlesticks -->
    ${candlesticks}

    <!-- Date labels (first and last) -->
    <text x="0" y="${(chartHeight+2)*1.11}" text-anchor="start" class="label" font-size="4" opacity="0">
      ${data[0].date}
      <animate attributeName="opacity" from="0" to="1" dur="0.2s" fill="freeze" begin="${chartConfig.global_display_time_delay}s"/>
    </text>
    <text x="${chartWidth+4}" y="${(chartHeight+2)*1.11}" class="label" text-anchor="end" font-size="4" opacity="0">
      ${data[data.length - 1].date}
      <animate attributeName="opacity" from="0" to="1" dur="0.2s" fill="freeze" begin="${chartConfig.global_display_time_delay + totalBarDisplayTime}s"/>
    </text>

    <!-- Y-axis labels -->
    <!-- max -->
    <text x="-2" y="5" text-anchor="start" class="label" opacity="0"> ${maxTotal}
      <animate attributeName="opacity" from="0" to="1" dur="0.2s" fill="freeze" begin="${chartConfig.global_display_time_delay + totalBarDisplayTime + 0.5}s"/>
    </text>

    </g>
  `;
}

/**
 * Renders the GitHub stats card.
 *
 * @param {object} stats Output of fetchGitHubData (see ./fetch.js).
 * @param {object} [options] From the request URL (see parseOptions in ../index.js).
 * @param {Set<string>} [options.ignoreLanguages] Languages to leave out of the language ring.
 * @returns {string} The complete SVG document.
 */
function renderStats(stats, { ignoreLanguages } = {}) {
  const svg_width = config.svg.width;
  const svg_height = config.svg.height;
  const colors = config.colors;
  const githubUrl = `https://github.com/${stats.login}`;
  const rankRingConfig = calculateRankRing(stats, svg_width, svg_height);
  const languageRingConfig = calculateLanguageRing(svg_width, svg_height);
  const imagePosition = calculateImagePosition(languageRingConfig);

  const stat_rows = STAT_ROWS.map((row, index) => renderStatRow(row, index, stats, rankRingConfig));
  const languagePercentages = calculateLanguagePercentage(stats.languages, { ignore: ignoreLanguages });
  const language_percentage_ring = renderLanguageRing(languagePercentages, languageRingConfig);
  const contribution_chart = renderContributionChart(stats.contribution_distribution, rankRingConfig);

  return String(svg`
    <svg width="${svg_width}" height="${svg_height}" xmlns="http://www.w3.org/2000/svg">
      <style>

        <!-- Fonts -->${fontFaces()}
        
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
          fill: ${colors.textTitle}; 
          font-size: 30px; 
          font-weight: bold; 
          Opacity: 0; 
          animation: flikering 0.4s 2, change-opacity 1s ease-in-out 0.8s forwards; 
        }

        <!-- Label Styles -->
        .label { 
          font-family: 'Rajdhani', Helvetica; 
          fill: ${colors.textLabel}; 
          font-size: 22px; 
        }

        <!-- Value Styles -->
        .value { 
          font-family: 'Rajdhani', Helvetica; 
          fill: ${colors.textValue}; 
          font-size: 24px; 
          font-weight: bold; 
        }

        <!-- Barcode Styles -->
        .barcode { 
          font-family: 'LibreBarcode128', Helvetica; 
          fill: ${colors.textTitle};
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
        .icon { fill: ${colors.icon}; }
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
      <circle cx="10" cy="60" r="4" fill="${colors.icon}">
        <animate attributeName="opacity" values="1;0;1" dur="0.5s" repeatCount="1" />
        <animate attributeName="opacity" from="1" to="0" dur="0.2s" fill="freeze" begin="0.5s" />
      </circle>

      <!-- dot change line moving to right -->  
      <line x1="10" y1="60" x2="10" y2="60" stroke="${colors.icon}" stroke-width="4">
        <animate attributeName="x2" from="10" to="${svg_width-10}" dur="0.5s" fill="freeze" begin="0.5s"/>
      </line>

      <!-- Stats list -->
      ${stat_rows}

      <!-- Rank Ring -->
      <!-- Rank Ring Background -->
      <circle class="rank-circle-bg" cx="${rankRingConfig.rank_ring_center_x}" cy="${rankRingConfig.rank_ring_center_y}" r="${rankRingConfig.rank_ring_radius}" stroke="${darkenHexColor(rankRingConfig.rank_progress_bar_color, rankRingConfig.rank_ring_bg_dark_level)}" stroke-width="${rankRingConfig.rank_ring_thickness}" fill="none"></circle>

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
      <image href="${image_data_uri}" x="${imagePosition.image_x}" y="${imagePosition.image_y}" height="${imagePosition.target_height}" class="blink"/>

      <!-- Language Ring -->
      ${language_percentage_ring}

      <!-- Language Ring card-like border -->
      <!-- Main border with notch -->
      <path d="M ${rankRingConfig.rank_ring_left_line_end+10},340 L 650,340 L 660,350 L 1080,350 L 1080,540 L 1040,580 L ${rankRingConfig.rank_ring_left_line_end+10},580 Z" fill="none" stroke="${colors.icon}" stroke-width="2" opacity="0">
        <animate attributeName="stroke-dasharray" from="0, 3500" to="3500, 0" dur="3s" fill="freeze" begin="0.7s" />
        <animate attributeName="opacity" values="0;0.3;0;1" dur="0.2s" fill="freeze" begin="0.4s" />
      </path>

      <!-- corner trangle -->
      <path d="M 1080,555 L 1080,580 L 1055,580 Z" fill="${colors.icon}" stroke="${colors.icon}" stroke-width="2" >
        <animate attributeName="opacity" values="1;0;1" dur="0.5s" repeatCount="5" />
      </path>

      <!-- left solid part -->
      <path d="M ${rankRingConfig.rank_ring_left_line_end},340 L ${rankRingConfig.rank_ring_left_line_end+10},340 L ${rankRingConfig.rank_ring_left_line_end+10},580 L ${rankRingConfig.rank_ring_left_line_end},580 L ${rankRingConfig.rank_ring_left_line_end},540 L ${rankRingConfig.rank_ring_left_line_end+5},535 L ${rankRingConfig.rank_ring_left_line_end+5},480 L ${rankRingConfig.rank_ring_left_line_end},475 Z" fill="${colors.icon}" stroke="${colors.icon}" stroke-width="2">
        <animate attributeName="opacity" values="0;1" dur="0.5s" fill="freeze" />
      </path>

      <!-- Rank ring line part -->
      <!-- Initial dot as a circle with zero radius -->
      <circle cx="${rankRingConfig.rank_ring_center_x}" cy="${rankRingConfig.rank_ring_center_y}" r="4" fill="${colors.icon}">
        <animate attributeName="opacity" values="1;0;1" dur="0.5s" repeatCount="1" />
        <animate attributeName="opacity" from="1" to="0" dur="0.2s" fill="freeze" begin="0.5s" />
      </circle>

      <!-- dot change to short dash line moving to left -->
      <line x1="${rankRingConfig.rank_ring_center_x}" y1="${rankRingConfig.rank_ring_center_y}" x2="${rankRingConfig.rank_ring_center_x}" y2="${rankRingConfig.rank_ring_center_y}" stroke="${colors.icon}" stroke-width="4">
        <animate attributeName="x2" from="${rankRingConfig.rank_ring_center_x}" to="${rankRingConfig.rank_ring_left_arc}" dur="0.5s" fill="freeze" begin="0.5s" />
        <animate attributeName="x1" from="${rankRingConfig.rank_ring_center_x}" to="${rankRingConfig.rank_ring_left_arc}" dur="0.2s" fill="freeze" begin="1s" />
      </line>

      <!-- dot change to short dash line moving to right -->
      <line x1="${rankRingConfig.rank_ring_center_x}" y1="${rankRingConfig.rank_ring_center_y}" x2="${rankRingConfig.rank_ring_center_x}" y2="${rankRingConfig.rank_ring_center_y}" stroke="${colors.icon}" stroke-width="4">
        <animate attributeName="x2" from="${rankRingConfig.rank_ring_center_x}" to="${rankRingConfig.rank_ring_right_arc}" dur="0.5s" fill="freeze" begin="0.5s" />
        <animate attributeName="x1" from="${rankRingConfig.rank_ring_center_x}" to="${rankRingConfig.rank_ring_right_arc}" dur="0.2s" fill="freeze" begin="1s" />
      </line>

      <!-- top left 1/8 circle path -->
      <path d="M ${rankRingConfig.rank_ring_left_arc} ${rankRingConfig.rank_ring_center_y} A ${rankRingConfig.rank_ring_circle_radius} ${rankRingConfig.rank_ring_circle_radius} 0 0 1 ${rankRingConfig.rank_ring_top_left_x} ${rankRingConfig.rank_ring_top_left_y}" stroke="${colors.icon}" stroke-width="4" fill="transparent" stroke-dasharray="0, ${rankRingConfig.arc_length}">
        <animate attributeName="stroke-dasharray" from="0, ${rankRingConfig.arc_length}" to="${rankRingConfig.arc_length}, 0" dur="1s" fill="freeze" begin="1s"/>
      </path>

      <!-- top right 1/8 circle path -->
      <path d="M ${rankRingConfig.rank_ring_right_arc} ${rankRingConfig.rank_ring_center_y} A ${rankRingConfig.rank_ring_circle_radius} ${rankRingConfig.rank_ring_circle_radius} 0 0 0 ${rankRingConfig.rank_ring_top_right_x} ${rankRingConfig.rank_ring_top_right_y}" stroke="${colors.icon}" stroke-width="4" fill="transparent" stroke-dasharray="0, ${rankRingConfig.arc_length}">
        <animate attributeName="stroke-dasharray" from="0, ${rankRingConfig.arc_length}" to="${rankRingConfig.arc_length}, 0" dur="1s" fill="freeze" begin="1s"/>
      </path>

      <!-- bottom left 1/8 circle path -->
      <path d="M ${rankRingConfig.rank_ring_left_arc} ${rankRingConfig.rank_ring_center_y} A ${rankRingConfig.rank_ring_circle_radius} ${rankRingConfig.rank_ring_circle_radius} 0 0 0 ${rankRingConfig.rank_ring_bottom_left_x} ${rankRingConfig.rank_ring_bottom_left_y}" stroke="${colors.icon}" stroke-width="4" fill="transparent" stroke-dasharray="0, ${rankRingConfig.arc_length}">
        <animate attributeName="stroke-dasharray" from="0, ${rankRingConfig.arc_length}" to="${rankRingConfig.arc_length}, 0" dur="1s" fill="freeze" begin="1s"/>
      </path>

      <!-- bottom right 1/8 circle path -->
      <path d="M ${rankRingConfig.rank_ring_right_arc} ${rankRingConfig.rank_ring_center_y} A ${rankRingConfig.rank_ring_circle_radius} ${rankRingConfig.rank_ring_circle_radius} 0 0 1 ${rankRingConfig.rank_ring_bottom_right_x} ${rankRingConfig.rank_ring_bottom_right_y}" stroke="${colors.icon}" stroke-width="4" fill="transparent" stroke-dasharray="0, ${rankRingConfig.arc_length}">
        <animate attributeName="stroke-dasharray" from="0, ${rankRingConfig.arc_length}" to="${rankRingConfig.arc_length}, 0" dur="1s" fill="freeze" begin="1s"/>
      </path>

      ${contribution_chart}
      
    </svg>
  `);
}

export default renderStats;
