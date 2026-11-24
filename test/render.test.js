import { test } from 'node:test';
import assert from 'node:assert/strict';
import renderStats from '../src/cards/github/render.js';
import stats from './fixtures/github-stats.js';
import { assertMatchesSnapshot } from './helpers/snapshot.js';

// The title flicker uses Math.random; pin it so the output is deterministic.
const render = (t, input) => {
  t.mock.method(Math, 'random', () => 0.5);
  return renderStats(input);
};

test('GitHub card output matches the snapshot', (t) => {
  assertMatchesSnapshot('github-card', render(t, stats));
});

test('GitHub card embeds the fonts and the center image', (t) => {
  const svg = render(t, stats);
  assert.equal(svg.match(/src: url\('data:font\/woff2;base64,[A-Za-z0-9+/=]{1000,}'\) format\('woff2'\)/g)?.length, 3);
  assert.match(svg, /<image href="data:image\/gif;base64,[A-Za-z0-9+/=]{1000,}"/);
});

test('text from the API is escaped', (t) => {
  const svg = render(t, {
    ...stats,
    name: 'Tom & Jerry</text><script>alert(1)</script>',
    languages: { '<b>Lang</b>': { size: 1, count: 1, color: 'red" onload="alert(1)' } },
  });
  assert.ok(!svg.includes('<script>'));
  assert.ok(!svg.includes('<b>'));
  assert.ok(!svg.includes('onload'));
  assert.ok(svg.includes('Tom &amp; Jerry&lt;/text&gt;&lt;script&gt;'));
  assert.ok(svg.includes('fill="#cccccc"'), 'an unsafe language color falls back to grey');
});

test('contributions: one bar per day rising from zero, red when a day has fewer than the day before', (t) => {
  const counts = [3, 5, 5, 2, 0, 4];
  const contribution_distribution = Object.fromEntries(counts.map((total, i) => [`2026-01-0${i + 1}`, { total }]));
  const svg = render(t, { ...stats, contribution_distribution });

  const chart = svg.slice(svg.indexOf('<!-- Bars -->'), svg.indexOf('<!-- Date labels'));
  const bars = [...chart.matchAll(/<rect [^>]*height="0" fill="(#\w+)">\s*<animate attributeName="y" from="([\d.]+)" to="([\d.]+)"[^>]* begin="([\d.]+)s"[^>]*\/>\s*<animate attributeName="height" from="0" to="([\d.]+)"/g)]
    .map(([, fill, yFrom, y, begin, height]) => ({ fill, start: Number(yFrom), begin: Number(begin), bottom: Math.round(Number(y) + Number(height)), height: Number(height) }));

  const GREEN = '#32cd32', RED = '#c5003c';
  // The first day counts as unchanged; the day with 0 gets no bar; 4 after 0 is more again.
  assert.deepEqual(bars.map((bar) => bar.fill), [GREEN, GREEN, GREEN, RED, GREEN]);
  assert.ok(bars.every((bar) => bar.bottom === bars[0].bottom), 'every bar stands on the same baseline');
  assert.ok(bars.every((bar) => Math.round(bar.start) === bar.bottom), 'and rises from it');
  const begins = bars.map((bar) => bar.begin);
  assert.deepEqual(begins, [...begins].sort((a, b) => a - b), 'from left to right');
  const unit = bars[0].height / 3;
  assert.deepEqual(bars.map((bar) => Math.round(bar.height / unit)), [3, 5, 5, 2, 4]);
});

test('rank ring: 40 short unlit ticks, and trapezoid ticks for the share the rank fills, lit one after another', (t) => {
  const ring = (percentile) => {
    const svg = render(t, { ...stats, rank: { level: 'B', percentile } });
    const markup = svg.slice(svg.indexOf('<!-- Rank Ring: '), svg.indexOf('<!-- Rank Ring Text -->'));
    const [unlit, lit] = markup.split('</g>');
    // A tick is a path with rounded corners; the control point of each corner's curve is the corner
    // itself. The path starts after the first corner, so its curve comes last.
    const corners = (d) => {
      const points = [...d.matchAll(/Q ([\d.]+),([\d.]+)/g)].map(([, x, y]) => [Number(x), Number(y)]);
      return [points.at(-1), ...points.slice(0, -1)]; // inner left, inner right, outer right, outer left
    };
    return {
      unlit: [...unlit.matchAll(/<path d="([^"]+)" \/>/g)].map((match) => match[1]),
      blink: unlit.match(/<animate attributeName="opacity" values="([^"]+)"[^>]* begin="([\d.]+)s"/).slice(1),
      lit: [...lit.matchAll(/<set attributeName="opacity" to="1" begin="([\d.]+)s"[^]*?attributeName="d" from="([^"]+)" to="([^"]+)"/g)]
        .map(([, begin, from, to]) => ({ begin: Number(begin), from, to: corners(to) })),
      corners,
    };
  };
  const distance = ([x1, y1], [x2, y2]) => Math.hypot(x2 - x1, y2 - y1);

  const { unlit, blink, lit, corners } = ring(30.5); // fills 69.5% of the ring: 27.8 ticks, so 28
  assert.equal(unlit.length, 40);
  assert.deepEqual(blink, ['1;0;1;0;1', '1'], 'the unlit ticks blink twice from 1s, with the brackets');

  assert.equal(lit.length, 28);
  const begins = lit.map((tick) => tick.begin);
  assert.deepEqual(begins, [...begins].sort((x, y) => x - y), 'ticks light up in order');
  assert.ok(begins[0] >= 2.4 && begins.at(-1) === 3.9, 'from 2.4s, the last one at 2.4s + 1.5s');
  assert.ok(begins[1] - begins[0] < begins.at(-1) - begins.at(-2), 'quickly at first, then slower (ease-out)');
  lit.forEach((tick, i) => assert.equal(tick.from, unlit[i], `tick ${i} grows from its unlit tick`));

  const [inner1, inner2, outer2, outer1] = lit[0].to;
  assert.ok(distance(outer1, outer2) > distance(inner1, inner2) * 1.3, 'a lit tick is a trapezoid, wider outside');
  const [u1, , , u4] = corners(unlit[0]);
  assert.ok(Math.abs(distance(u1, u4) / distance(inner1, outer1) - 0.33) < 0.01, 'an unlit tick is a third as long as a lit one');
  assert.equal(unlit[0].match(/Q /g).length, 4, 'with four rounded corners');

  assert.equal(ring(100).lit.length, 0, 'the lowest rank lights nothing');
  assert.equal(ring(1).lit.length, 40, 'the top percentile fills the ring');
});

test('the barcode is uncovered from right to left, from when a sweep from the left edge would reach it', (t) => {
  const reveal = (login) => {
    const svg = render(t, { ...stats, login });
    const clip = svg.slice(svg.indexOf('<clipPath id="clipPathReveal"'), svg.indexOf('</clipPath>'));
    const [, x, xBegin] = clip.match(/attributeName="x" (from="1" to="0") dur="[\d.]+s" begin="([\d.]+)s"/);
    const [, dur] = clip.match(/attributeName="width" from="0" to="1" dur="([\d.]+)s"/);
    return { rightToLeft: x === 'from="1" to="0"', begin: Number(xBegin), end: Number(xBegin) + Number(dur) };
  };
  const short = reveal('octocat'); // https://github.com/octocat: 26 characters, 257px of barcode
  const long = reveal('a-much-longer-username'); // 41 characters, 406px
  assert.ok(short.rightToLeft && long.rightToLeft);
  assert.ok(Math.abs(short.begin - (1080 - 257.4) / 1100) < 0.01, `begins when the sweep reaches its left end: ${short.begin}`);
  assert.ok(long.begin < short.begin, 'a longer barcode reaches further left, so it starts earlier');
  for (const { end } of [short, long]) assert.ok(Math.abs(end - 1080 / 1100) < 0.015, `and finishes when the sweep reaches its right end: ${end}`);
});

test('a card without contribution data shows a placeholder', (t) => {
  const svg = render(t, { ...stats, contribution_distribution: {} });
  assert.ok(svg.includes('No contribution data'));
});
