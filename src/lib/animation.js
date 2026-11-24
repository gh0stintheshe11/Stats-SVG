import { transformMarkup } from './svg.js';

const SMIL_ELEMENT = /<(animate|set|animateTransform|animateMotion)\b([^>]*?)(\/?)>/g;
const SECONDS = /^\d+(\.\d+)?s$/;

/**
 * Makes every animation in an `svg` fragment start `seconds` later: the `begin` of SMIL elements
 * (<animate>, <set>, ...; those without one would start at 0) and the delay of CSS animations,
 * in style sheets and style attributes. Times must be plain seconds, like "1.2s".
 *
 * @param {import('./svg.js').SvgFragment} fragment
 * @param {number} seconds
 */
export function delayAnimations(fragment, seconds) {
  const later = (time) => {
    if (!SECONDS.test(time)) throw new Error(`delayAnimations: can't delay the time "${time}"`);
    return `${Number((parseFloat(time) + seconds).toFixed(3))}s`;
  };

  // One animation of the `animation` shorthand: its first time is the duration, the second the delay.
  const delayShorthand = (animation) => {
    const parts = animation.trim().split(/\s+/);
    const times = parts.flatMap((part, i) => (/^[\d.]+m?s$/.test(part) ? [i] : []));
    if (times.length === 0) throw new Error(`delayAnimations: no duration in "animation: ${animation.trim()}"`);
    if (times.length >= 2) parts[times[1]] = later(parts[times[1]]);
    else parts.splice(times[0] + 1, 0, later('0s'));
    return parts.join(' ');
  };

  // CSS declarations, only inside style sheets and style attributes (never in text).
  const delayCss = (css) => css
    .replace(/animation-delay\s*:\s*([^;"}]+)/g, (_, list) => `animation-delay: ${list.split(',').map((time) => later(time.trim())).join(', ')}`)
    .replace(/animation\s*:\s*([^;"}]+)/g, (_, list) => `animation: ${list.split(',').map(delayShorthand).join(', ')}`);

  return transformMarkup(fragment, (markup) => markup
    .replace(SMIL_ELEMENT, (tag, name, attributes, selfClosing) => {
      const begin = attributes.match(/\sbegin="([^"]*)"/);
      if (!begin) return `<${name}${attributes.replace(/\s*$/, '')} begin="${later('0s')}" ${selfClosing}>`;
      return tag.replace(begin[0], ` begin="${later(begin[1])}"`);
    })
    .replace(/(<style>)([^]*?)(<\/style>)/g, (_, open, css, close) => open + delayCss(css) + close)
    .replace(/(\sstyle=")([^"]*)(")/g, (_, open, css, close) => open + delayCss(css) + close));
}
