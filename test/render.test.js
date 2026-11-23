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
  assert.equal(svg.match(/src: url\('data:font\/truetype;charset=utf-8;base64,[A-Za-z0-9+/=]{1000,}'\)/g)?.length, 3);
  assert.match(svg, /<image href="data:image\/gif;base64,[A-Za-z0-9+/=]{1000,}"/);
});

test('text from the API is escaped', (t) => {
  const svg = render(t, {
    ...stats,
    name: 'Tom & Jerry</text><script>alert(1)</script>',
    language_percentages: [{ name: '<b>Lang</b>', percentage: 100, color: 'red" onload="alert(1)' }],
  });
  assert.ok(!svg.includes('<script>'));
  assert.ok(!svg.includes('<b>'));
  assert.ok(!svg.includes('onload'));
  assert.ok(svg.includes('Tom &amp; Jerry&lt;/text&gt;&lt;script&gt;'));
  assert.ok(svg.includes('fill="#cccccc"'), 'an unsafe language color falls back to grey');
});

test('a card without contribution data shows a placeholder', (t) => {
  const svg = render(t, { ...stats, contribution_distribution: {} });
  assert.ok(svg.includes('No contribution data'));
});
