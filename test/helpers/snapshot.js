import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SNAPSHOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../snapshots');

/** Replaces embedded base64 payloads (fonts, images) with a short placeholder. */
export function stripDataUris(svg) {
  return svg.replace(/data:[\w/+.-]+(?:;charset=[\w-]+)?;base64,[A-Za-z0-9+/=]+/g, 'data:…');
}

/**
 * Drops XML comments and collapses whitespace, so that reformatting or re-commenting
 * the template doesn't count as a change, while any change to elements, attributes
 * or text does.
 */
export function normalizeSvg(svg) {
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

/**
 * Compares `svg` with test/snapshots/<name>.svg.
 * Run with UPDATE_SNAPSHOTS=1 to write the current output as the new snapshot.
 */
export function assertMatchesSnapshot(name, svg) {
  const file = path.join(SNAPSHOT_DIR, `${name}.svg`);
  const actual = stripDataUris(svg);

  if (process.env.UPDATE_SNAPSHOTS || !fs.existsSync(file)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    fs.writeFileSync(file, actual);
    return;
  }

  const expected = fs.readFileSync(file, 'utf8');
  assert.equal(
    normalizeSvg(actual),
    normalizeSvg(expected),
    `SVG output differs from ${path.relative(process.cwd(), file)}. ` +
      'If the change is intentional, run `UPDATE_SNAPSHOTS=1 npm test` and review the diff.',
  );
}
