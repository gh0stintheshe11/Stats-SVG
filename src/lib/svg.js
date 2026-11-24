import { escapeXml } from './escape.js';

/** Markup produced by the `svg` tag. It is trusted and is inserted into other templates as-is. */
class SvgFragment {
  constructor(markup) {
    this.markup = markup;
  }

  toString() {
    return this.markup;
  }
}

function renderValue(value) {
  if (value instanceof SvgFragment) return value.markup;
  if (Array.isArray(value)) return value.map(renderValue).join('');
  if (value === null || value === undefined || value === false) return '';
  return escapeXml(value);
}

/**
 * Tagged template for building SVG markup.
 *
 * Every interpolated value is XML-escaped, so data from APIs (names, languages, ...)
 * can never inject markup. Nested `svg` fragments, and arrays of them, are inserted
 * unescaped; `null`, `undefined` and `false` render nothing.
 *
 * @example
 * const row = svg`<text class="label">${user.name}</text>`;
 * const card = svg`<svg>${row}${items.map((item) => svg`<rect width="${item.width}"/>`)}</svg>`;
 * String(card); // final markup
 */
export function svg(strings, ...values) {
  let markup = strings[0];
  for (let i = 0; i < values.length; i++) {
    markup += renderValue(values[i]) + strings[i + 1];
  }
  return new SvgFragment(markup);
}

/**
 * Applies `transform` to the markup of an `svg` fragment and returns the result as a fragment.
 * Only for transforms that keep the markup safe, such as changing animation times: the input is
 * already trusted markup, never data.
 *
 * @param {SvgFragment} fragment
 * @param {(markup: string) => string} transform
 */
export function transformMarkup(fragment, transform) {
  if (!(fragment instanceof SvgFragment)) throw new TypeError('transformMarkup needs an svg fragment');
  return new SvgFragment(transform(fragment.markup));
}
