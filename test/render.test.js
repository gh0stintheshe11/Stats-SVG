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

test('rank ring: 40 small squares, and trapezoid ticks for the share the rank fills, lit one after another', (t) => {
  const ring = (percentile) => {
    const svg = render(t, { ...stats, rank: { level: 'B', percentile } });
    const markup = svg.slice(svg.indexOf('<!-- Rank Ring: '), svg.indexOf('<!-- Rank Ring Text -->'));
    const [squares, ticks] = markup.split('</g>');
    const points = (text) => text.trim().split(' ').map((pair) => pair.split(',').map(Number));
    return {
      squares: [...squares.matchAll(/<polygon points="([^"]+)" \/>/g)].map((match) => points(match[1])),
      blink: squares.match(/<animate attributeName="opacity" values="([^"]+)"[^>]* begin="([\d.]+)s"/).slice(1),
      ticks: [...ticks.matchAll(/<set attributeName="opacity" to="1" begin="([\d.]+)s"[^]*?from="([^"]+)" to="([^"]+)"/g)]
        .map(([, begin, from, to]) => ({ begin: Number(begin), from: points(from), to: points(to) })),
    };
  };
  const distance = ([x1, y1], [x2, y2]) => Math.hypot(x2 - x1, y2 - y1);

  const { squares, blink, ticks } = ring(30.5); // fills 69.5% of the ring: 27.8 ticks, so 28
  assert.equal(squares.length, 40);
  assert.deepEqual(blink, ['1;0;1;0;1', '1'], 'the squares blink twice from 1s, with the brackets');
  const [a, b, , d] = squares[0];
  assert.ok(Math.abs(distance(a, b) - distance(a, d)) < 0.1, 'an unlit tick is square');

  assert.equal(ticks.length, 28);
  const begins = ticks.map((tick) => tick.begin);
  assert.deepEqual(begins, [...begins].sort((x, y) => x - y), 'ticks light up in order');
  assert.ok(begins[0] >= 2.4 && begins.at(-1) === 3.9, 'from 2.4s, the last one at 2.4s + 1.5s');
  assert.ok(begins[1] - begins[0] < begins.at(-1) - begins.at(-2), 'quickly at first, then slower (ease-out)');
  ticks.forEach((tick, i) => assert.deepEqual(tick.from, squares[i], `tick ${i} grows from its square`));
  const [inner1, inner2, outer2, outer1] = ticks[0].to;
  assert.ok(distance(outer1, outer2) > distance(inner1, inner2) * 1.3, 'a lit tick is a trapezoid, wider outside');

  assert.equal(ring(100).ticks.length, 0, 'the lowest rank lights nothing');
  assert.equal(ring(1).ticks.length, 40, 'the top percentile fills the ring');
});

test('a card without contribution data shows a placeholder', (t) => {
  const svg = render(t, { ...stats, contribution_distribution: {} });
  assert.ok(svg.includes('No contribution data'));
});
