const XML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Characters that are not allowed anywhere in an XML 1.0 document.
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

/**
 * Makes a value safe to place in SVG text content or a quoted attribute.
 * Use it for anything that comes from an external API (names, language names, dates).
 */
export function escapeXml(value) {
  return String(value)
    .replace(INVALID_XML_CHARS, '')
    .replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);
}

/**
 * Returns `color` if it is a plain hex color (#rgb, #rgba, #rrggbb or #rrggbbaa),
 * otherwise `fallback`.
 */
export function safeHexColor(color, fallback) {
  return typeof color === 'string' && /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)
    ? color
    : fallback;
}
