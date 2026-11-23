import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { HttpError } from '../src/lib/errors.js';
import { getOrLoad, getWithRevalidation } from '../src/lib/store.js';

const MINUTE = 60_000;
const OPTIONS = { freshMs: 30 * MINUTE, maxAgeMs: 7 * 24 * 60 * MINUTE, foregroundBudgetMs: 1_000, backgroundBudgetMs: 1_000 };

// The store keeps module-level state, so each test uses its own key.
let keyCounter = 0;
const uniqueKey = () => `test:${++keyCounter}`;

/** Lets a test move the clock forward. */
function mockClock(t) {
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  return { advance: (ms) => { now += ms; } };
}

/** A loader that returns 1, 2, 3, ... and counts its calls. */
function counter() {
  const load = async () => ++load.calls;
  load.calls = 0;
  return load;
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

// A second copy of the module has its own memory but shares the Runtime Cache (an in-memory
// stand-in outside Vercel), just like another function instance would.
const otherInstance = await import('../src/lib/store.js?instance=2');

/** The default keyHashFunction of @vercel/functions (cache/index.js), to show which keys it mixes up. */
function defaultKeyHash(key) {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) hash = (hash * 33) ^ key.charCodeAt(i);
  return (hash >>> 0).toString(16);
}

describe('getWithRevalidation', () => {
  test('loads on the first request (miss), then serves from cache (hit)', async () => {
    const key = uniqueKey();
    const load = counter();
    assert.deepEqual(await getWithRevalidation(key, load, OPTIONS), { value: 1, status: 'miss', ageMs: 0 });
    const second = await getWithRevalidation(key, load, OPTIONS);
    assert.equal(second.status, 'hit');
    assert.equal(second.value, 1);
    assert.equal(load.calls, 1);
  });

  test('serves stale data immediately and refreshes it in the background', async (t) => {
    const clock = mockClock(t);
    const key = uniqueKey();
    const load = counter();
    await getWithRevalidation(key, load, OPTIONS);

    clock.advance(31 * MINUTE);
    const stale = await getWithRevalidation(key, load, OPTIONS);
    assert.equal(stale.status, 'stale');
    assert.equal(stale.value, 1);

    await settle();
    const refreshed = await getWithRevalidation(key, load, OPTIONS);
    assert.deepEqual([refreshed.status, refreshed.value], ['hit', 2]);
  });

  test('keeps serving stale data when the background refresh fails, and waits before retrying', async (t) => {
    const clock = mockClock(t);
    t.mock.method(console, 'warn', () => {});
    const key = uniqueKey();
    await getWithRevalidation(key, async () => 'old', OPTIONS);

    clock.advance(31 * MINUTE);
    let attempts = 0;
    const failing = async () => {
      attempts++;
      throw new HttpError(503, 'rate limited');
    };
    assert.equal((await getWithRevalidation(key, failing, OPTIONS)).value, 'old');
    await settle();
    assert.equal((await getWithRevalidation(key, failing, OPTIONS)).value, 'old');
    await settle();
    assert.equal(attempts, 1, 'no new attempt right after a failure');

    clock.advance(6 * MINUTE);
    assert.equal((await getWithRevalidation(key, failing, OPTIONS)).value, 'old');
    await settle();
    assert.equal(attempts, 2, 'tries again once the retry delay has passed');
  });

  test('reloads data older than maxAge, but falls back to it if loading fails', async (t) => {
    const clock = mockClock(t);
    t.mock.method(console, 'warn', () => {});
    const key = uniqueKey();
    await getWithRevalidation(key, async () => 'ancient', { ...OPTIONS, maxAgeMs: 2 * 60 * MINUTE });

    clock.advance(3 * 60 * MINUTE);
    const result = await getWithRevalidation(key, async () => { throw new HttpError(502, 'down'); }, { ...OPTIONS, maxAgeMs: 2 * 60 * MINUTE });
    assert.deepEqual([result.status, result.value], ['stale', 'ancient']);
  });

  test('a failed first load is an error and is not cached', async () => {
    const key = uniqueKey();
    await assert.rejects(getWithRevalidation(key, async () => { throw new HttpError(404, 'not found'); }, OPTIONS), { status: 404 });
    const load = counter();
    assert.equal((await getWithRevalidation(key, load, OPTIONS)).status, 'miss');
  });

  test('concurrent requests share a single load', async () => {
    const key = uniqueKey();
    let calls = 0;
    const slowLoad = async () => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return 'value';
    };
    const results = await Promise.all(Array.from({ length: 5 }, () => getWithRevalidation(key, slowLoad, OPTIONS)));
    assert.equal(calls, 1);
    assert.ok(results.every((r) => r.value === 'value'));
  });

  test('tells the loader its deadline and whether a request is waiting for it', async (t) => {
    const clock = mockClock(t);
    const key = uniqueKey();
    const received = [];
    const load = async (options) => { received.push(options); return 'value'; };

    const before = Date.now();
    await getWithRevalidation(key, load, OPTIONS);
    assert.deepEqual(received[0], { deadline: before + OPTIONS.backgroundBudgetMs, background: false });

    clock.advance(31 * MINUTE);
    await getWithRevalidation(key, load, OPTIONS); // stale: refreshed in the background
    await settle();
    assert.equal(received[1].background, true);
  });

  test('a load that takes longer than the request waits finishes in the background', async () => {
    const key = uniqueKey();
    let loads = 0;
    const slowLoad = async () => {
      loads++;
      await new Promise((resolve) => setTimeout(resolve, 80));
      return 'loaded in the background';
    };
    const impatient = { ...OPTIONS, foregroundBudgetMs: 20 };

    await assert.rejects(getWithRevalidation(key, slowLoad, impatient), { status: 504 });
    // A second request while the load is still running joins it instead of starting another one.
    await assert.rejects(getWithRevalidation(key, slowLoad, impatient), { status: 504 });

    await new Promise((resolve) => setTimeout(resolve, 100));
    const result = await getWithRevalidation(key, slowLoad, impatient);
    assert.deepEqual([result.status, result.value], ['hit', 'loaded in the background']);
    assert.equal(loads, 1);
  });
});

describe('shared cache (Vercel Runtime Cache)', () => {
  test('another function instance reuses the data instead of loading it again', async () => {
    const key = uniqueKey();
    await getWithRevalidation(key, async () => 'loaded once', OPTIONS);

    const load = counter();
    const result = await otherInstance.getWithRevalidation(key, load, OPTIONS);
    assert.deepEqual([result.status, result.value], ['hit', 'loaded once']);
    assert.equal(load.calls, 0);
  });

  test('keys that collide under the package\'s default 32-bit hash stay separate', async () => {
    const [first, second] = ['github-status:v1:621eb0b8', 'github-status:v1:ac30f395'];
    assert.equal(defaultKeyHash(first), defaultKeyHash(second), 'the two keys should collide under the default hash');

    await getWithRevalidation(first, async () => 'card of the first user', OPTIONS);
    const result = await otherInstance.getWithRevalidation(second, async () => 'card of the second user', OPTIONS);
    assert.deepEqual([result.status, result.value], ['miss', 'card of the second user']);
  });
});

test('loads only the parts of @vercel/functions it needs (keeps cold starts fast)', () => {
  const loaded = Object.keys(createRequire(import.meta.url).cache);
  assert.ok(loaded.some((file) => file.includes('@vercel/functions')), '@vercel/functions should be loaded');
  assert.ok(!loaded.some((file) => file.includes('@vercel/oidc')),
    'the @vercel/functions entry point was loaded; check loadVercelFunctions() in src/lib/store.js');
});

describe('getOrLoad', () => {
  test('loads once and reuses the value until it expires', async (t) => {
    const clock = mockClock(t);
    const key = uniqueKey();
    const load = counter();
    assert.equal(await getOrLoad(key, load, { ttlMs: 10 * MINUTE }), 1);
    assert.equal(await getOrLoad(key, load, { ttlMs: 10 * MINUTE }), 1);
    clock.advance(11 * MINUTE);
    assert.equal(await getOrLoad(key, load, { ttlMs: 10 * MINUTE }), 2);
  });
});
