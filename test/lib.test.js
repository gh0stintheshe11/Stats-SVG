import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createTtlCache } from '../src/lib/cache.js';
import { HttpError, upstreamStatusError } from '../src/lib/errors.js';
import { escapeXml, safeHexColor } from '../src/lib/escape.js';
import { fetchJson } from '../src/lib/http.js';
import { createLimiter } from '../src/lib/limit.js';
import { timeLeft, withRetry } from '../src/lib/retry.js';
import { svg } from '../src/lib/svg.js';
import { httpStatus, mockFetch } from './helpers/mock-fetch.js';

describe('escapeXml', () => {
  test('escapes markup characters', () => {
    assert.equal(escapeXml(`Tom & "Jerry" <script>'`), 'Tom &amp; &quot;Jerry&quot; &lt;script&gt;&#39;');
  });

  test('removes characters that are invalid in XML', () => {
    assert.equal(escapeXml('a\u0000b\u001Fc\tok'), 'abc\tok');
  });

  test('stringifies numbers unchanged', () => {
    assert.equal(escapeXml(-12.5), '-12.5');
  });
});

describe('safeHexColor', () => {
  test('accepts hex colors and rejects anything else', () => {
    for (const color of ['#abc', '#ABCD', '#a1b2c3', '#a1b2c3d4']) assert.equal(safeHexColor(color, 'x'), color);
    for (const color of ['red', '#12', '#1234567', 'red" onload="x', null]) assert.equal(safeHexColor(color, 'x'), 'x');
  });
});

describe('svg template tag', () => {
  test('escapes interpolated values', () => {
    assert.equal(String(svg`<text>${'<b>&'}</text>`), '<text>&lt;b&gt;&amp;</text>');
  });

  test('inserts nested fragments and arrays of fragments as markup', () => {
    const items = ['a', 'b'].map((name) => svg`<tspan>${name}</tspan>`);
    assert.equal(String(svg`<text>${items}${svg`<br/>`}</text>`), '<text><tspan>a</tspan><tspan>b</tspan><br/></text>');
  });

  test('renders nothing for null, undefined and false, but keeps 0', () => {
    assert.equal(String(svg`[${null}${undefined}${false}${0}]`), '[0]');
  });
});

describe('createTtlCache', () => {
  test('returns values until they expire', (t) => {
    let now = 1_000;
    t.mock.method(Date, 'now', () => now);
    const cache = createTtlCache({ ttlMs: 100 });
    cache.set('a', 1);
    now += 100;
    assert.equal(cache.get('a'), 1);
    now += 1;
    assert.equal(cache.get('a'), undefined);
  });

  test('evicts the oldest entries beyond maxEntries', () => {
    const cache = createTtlCache({ ttlMs: 60_000, maxEntries: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 1); // refreshing "a" makes "b" the oldest
    cache.set('c', 3);
    assert.deepEqual([cache.get('a'), cache.get('b'), cache.get('c')], [1, undefined, 3]);
  });
});

describe('withRetry', () => {
  test('retries retryable errors until success', async () => {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 3) throw new HttpError(502, 'flaky', { retryable: true });
      return 'ok';
    }, { baseDelayMs: 1 });
    assert.equal(result, 'ok');
    assert.equal(attempts, 3);
  });

  test('does not retry permanent errors', async () => {
    let attempts = 0;
    await assert.rejects(withRetry(async () => {
      attempts++;
      throw new HttpError(404, 'not found');
    }, { baseDelayMs: 1 }), { status: 404 });
    assert.equal(attempts, 1);
  });

  test('gives up after the last attempt', async () => {
    let attempts = 0;
    await assert.rejects(withRetry(async () => {
      attempts++;
      throw new HttpError(502, 'down', { retryable: true });
    }, { attempts: 3, baseDelayMs: 1 }), { status: 502 });
    assert.equal(attempts, 3);
  });

  test('does not start a retry that would end after the deadline', async () => {
    let attempts = 0;
    await assert.rejects(withRetry(async () => {
      attempts++;
      throw new HttpError(502, 'down', { retryable: true });
    }, { baseDelayMs: 1_000, deadline: Date.now() + 500 }));
    assert.equal(attempts, 1);
  });

  test('timeLeft throws a 504 once the deadline has passed', () => {
    assert.throws(() => timeLeft(Date.now() - 1), { status: 504 });
  });
});

describe('createLimiter', () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  test('runs at most the given number of tasks at a time, in order', async () => {
    const limit = createLimiter(3);
    let running = 0, most = 0;
    const started = [];
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => limit(async () => {
      started.push(i);
      most = Math.max(most, ++running);
      await sleep(5);
      running--;
      return i * 2;
    })));
    assert.equal(most, 3);
    assert.deepEqual(started, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepEqual(results, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
  });

  test('a failing task frees its slot for the next one', async () => {
    const limit = createLimiter(1);
    const failing = limit(async () => { throw new Error('boom'); });
    const next = limit(async () => 'still runs');
    await assert.rejects(failing, /boom/);
    assert.equal(await next, 'still runs');
  });
});

describe('upstreamStatusError', () => {
  const cases = [
    [429, 503, false],
    [401, 500, false],
    [403, 500, false],
    [404, 404, false],
    [400, 502, false],
    [500, 502, true],
    [503, 502, true],
  ];
  for (const [upstream, expected, retryable] of cases) {
    test(`upstream ${upstream} -> ${expected}${retryable ? ' (retryable)' : ''}`, () => {
      const error = upstreamStatusError('Test', upstream);
      assert.equal(error.status, expected);
      assert.equal(error.retryable, retryable);
    });
  }

  test('custom rate-limit statuses', () => {
    assert.equal(upstreamStatusError('Test', 403, { rateLimitStatuses: [403] }).status, 503);
  });

  test('credential problems are not shown to clients', () => {
    assert.equal(upstreamStatusError('Test', 401).expose, false);
  });
});

describe('fetchJson', () => {
  test('sends JSON and parses the response', async (t) => {
    const calls = mockFetch(t, () => ({ ok: true }));
    const result = await fetchJson('Test', 'https://example.test/api', { method: 'POST', json: { a: 1 }, headers: { 'X-Test': '1' } });
    assert.deepEqual(result, { ok: true });
    assert.deepEqual(calls[0].body, { a: 1 });
    assert.equal(calls[0].headers['Content-Type'], 'application/json');
    assert.equal(calls[0].headers['X-Test'], '1');
  });

  test('maps HTTP errors', async (t) => {
    mockFetch(t, () => httpStatus(500));
    await assert.rejects(fetchJson('Test', 'https://example.test/'), { status: 502, retryable: true });
  });

  test('maps network failures and invalid JSON to retryable 502s', async (t) => {
    let mode = 'network';
    t.mock.method(globalThis, 'fetch', async () => {
      if (mode === 'network') throw new TypeError('fetch failed');
      return new Response('not json');
    });
    await assert.rejects(fetchJson('Test', 'https://example.test/'), { status: 502, retryable: true });
    mode = 'invalid-json';
    await assert.rejects(fetchJson('Test', 'https://example.test/'), { status: 502, retryable: true });
  });

  test('aborts at the deadline with a 504', async (t) => {
    t.mock.method(globalThis, 'fetch', (url, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason));
    }));
    // AbortSignal.timeout doesn't keep the process alive on its own; a real server would.
    const keepAlive = setTimeout(() => {}, 1_000);
    t.after(() => clearTimeout(keepAlive));
    await assert.rejects(fetchJson('Test', 'https://example.test/', { deadline: Date.now() + 20 }), { status: 504 });
  });
});
