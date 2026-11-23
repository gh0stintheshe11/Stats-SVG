import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { createTtlCache } from './cache.js';
import { HttpError } from './errors.js';

/**
 * Loads getCache and waitUntil from @vercel/functions.
 *
 * The package's entry point also loads its OIDC helpers (~100 modules, ~45 ms of every cold
 * start), so the two files needed here are loaded directly. If a package update moves them,
 * this falls back to the entry point: slower, but still correct (test/store.test.js notices).
 */
function loadVercelFunctions() {
  const require = createRequire(import.meta.url);
  try {
    const packageDir = path.dirname(require.resolve('@vercel/functions'));
    const { getCache } = require(path.join(packageDir, 'cache', 'index.js'));
    const { waitUntil } = require(path.join(packageDir, 'wait-until.js'));
    if (typeof getCache === 'function' && typeof waitUntil === 'function') return { getCache, waitUntil };
  } catch {
    // fall through
  }
  return require('@vercel/functions');
}

const { getCache, waitUntil } = loadVercelFunctions();

/**
 * Two-level cache for card data, so visitors almost never wait for upstream APIs:
 *
 * 1. Memory: per function instance, instant.
 * 2. Vercel Runtime Cache: shared by every instance in a region and kept across deployments.
 *    Outside Vercel (local dev, tests) @vercel/functions falls back to an in-memory cache.
 *
 * Entries are stored as { value, storedAt } so their age is known everywhere.
 */

// After a failed background refresh, wait this long before trying that key again, so an upstream
// outage or rate limit isn't answered with a new attempt on every request.
const REFRESH_RETRY_MS = 5 * 60 * 1000;

const shared = getCache({
  // On the Hobby plan all projects of a team share one Runtime Cache; keep our keys apart.
  namespace: 'stats-svg',
  // The package's default key hash has only 32 bits, so two usernames could end up sharing an
  // entry and show each other's card. SHA-256 keeps every key distinct.
  keyHashFunction: (key) => createHash('sha256').update(key).digest('hex'),
});
const memory = createTtlCache({ ttlMs: 7 * 24 * 3600 * 1000, maxEntries: 1000 });
const failedRefreshes = createTtlCache({ ttlMs: REFRESH_RETRY_MS, maxEntries: 1000 });
const inFlight = new Map();

async function readShared(key) {
  try {
    return await shared.get(key);
  } catch (error) {
    console.warn(`Runtime Cache read failed for ${key}: ${error.message}`);
    return null;
  }
}

async function writeShared(key, entry, ttlMs) {
  try {
    await shared.set(key, entry, { ttl: Math.ceil(ttlMs / 1000) });
  } catch (error) {
    console.warn(`Runtime Cache write failed for ${key}: ${error.message}`);
  }
}

/** Returns the newest entry for `key` from memory or the shared cache, or null. */
async function readEntry(key, freshMs) {
  const local = memory.get(key);
  if (local && Date.now() - local.storedAt < freshMs) return local;

  // Another instance may have refreshed it in the meantime.
  const remote = await readShared(key);
  if (remote && (!local || remote.storedAt > local.storedAt)) {
    memory.set(key, remote);
    return remote;
  }
  return local ?? null;
}

/**
 * Runs `load` and stores the result. Concurrent calls for the same key on this instance
 * share one load, so a burst of requests causes a single upstream fetch.
 */
function refresh(key, load, { budgetMs, maxAgeMs, background }) {
  if (inFlight.has(key)) return inFlight.get(key);

  const promise = (async () => {
    const value = await load({ deadline: Date.now() + budgetMs, background });
    const entry = { value, storedAt: Date.now() };
    memory.set(key, entry);
    await writeShared(key, entry, maxAgeMs);
    return entry;
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
}

/** Resolves like `promise`, unless that takes longer than `ms`: then it rejects with a 504. */
function waitAtMost(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new HttpError(504, 'Still collecting the data for this card, please try again in a moment')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Stale-while-revalidate: returns cached data right away whenever possible and keeps it
 * fresh in the background.
 *
 * - younger than `freshMs`: returned as is (status "hit")
 * - younger than `maxAgeMs`: returned at once while a background refresh runs (status "stale").
 *   If that refresh fails (rate limit, GitHub down), the old data keeps being served and the
 *   next attempt waits a few minutes.
 * - missing or older: loaded now and the caller waits (status "miss"). The caller waits at most
 *   `foregroundBudgetMs`; a load that needs longer carries on in the background and its result
 *   is there for the next request.
 *
 * @param {string} key Cache key. Include a version so a change in the data's shape starts fresh.
 * @param {(options: { deadline: number, background: boolean }) => Promise<any>} load Fetches fresh
 *   data; must finish by `deadline` (epoch ms). `background` is false when a request is waiting
 *   for the result, so the load can favour speed over the number of upstream requests.
 * @param {object} options
 * @param {number} options.freshMs
 * @param {number} options.maxAgeMs
 * @param {number} options.foregroundBudgetMs How long a request waits for a load.
 * @param {number} options.backgroundBudgetMs How long a load may take, whether or not a request waits for it.
 * @returns {Promise<{ value: any, status: 'hit' | 'stale' | 'miss', ageMs: number }>}
 */
export async function getWithRevalidation(key, load, { freshMs, maxAgeMs, foregroundBudgetMs, backgroundBudgetMs }) {
  const entry = await readEntry(key, freshMs);
  const ageMs = entry ? Date.now() - entry.storedAt : Infinity;

  if (ageMs < freshMs) {
    return { value: entry.value, status: 'hit', ageMs };
  }

  if (ageMs < maxAgeMs) {
    if (!failedRefreshes.get(key)) {
      const background = refresh(key, load, { budgetMs: backgroundBudgetMs, maxAgeMs, background: true }).catch((error) => {
        failedRefreshes.set(key, true);
        console.warn(`Background refresh of ${key} failed, serving cached data: ${error.message}`);
      });
      waitUntil(background); // keeps the function alive after the response on Vercel; no-op elsewhere
    }
    return { value: entry.value, status: 'stale', ageMs };
  }

  // Nothing usable is cached, so this request waits for the load. The load is kept alive
  // independently of the request (waitUntil): if it needs longer than the request waits, or the
  // visitor gives up first (GitHub's image proxy does after 4 seconds), it still finishes.
  const loading = refresh(key, load, { budgetMs: backgroundBudgetMs, maxAgeMs, background: false });
  waitUntil(loading.catch(() => {}));
  try {
    const fresh = await waitAtMost(loading, foregroundBudgetMs);
    return { value: fresh.value, status: 'miss', ageMs: 0 };
  } catch (error) {
    // Very old data still beats an error image.
    if (!entry) throw error;
    console.warn(`Refresh of ${key} failed, serving data from ${Math.round(ageMs / 3600000)}h ago: ${error.message}`);
    return { value: entry.value, status: 'stale', ageMs };
  }
}

/**
 * Returns the cached value for `key`, or loads and caches it for `ttlMs`.
 * For data that practically never changes, such as contribution totals of past years.
 *
 * @param {string} key
 * @param {() => Promise<any>} load
 * @param {object} options
 * @param {number} options.ttlMs
 */
export async function getOrLoad(key, load, { ttlMs }) {
  const entry = await readEntry(key, ttlMs);
  if (entry && Date.now() - entry.storedAt < ttlMs) return entry.value;

  const value = await load();
  const fresh = { value, storedAt: Date.now() };
  memory.set(key, fresh);
  await writeShared(key, fresh, ttlMs);
  return value;
}
