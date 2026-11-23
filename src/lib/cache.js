/**
 * A small in-memory cache with a time-to-live and a size cap.
 *
 * Expired entries are dropped when read, and once `maxEntries` is exceeded the
 * oldest entries are evicted, so arbitrary usernames can't grow memory without bound.
 * On serverless platforms this cache is per instance; the Cache-Control header set in
 * api/index.js is what lets the CDN absorb repeat requests.
 */
export function createTtlCache({ ttlMs, maxEntries = 500 }) {
  const entries = new Map();

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (Date.now() - entry.storedAt > ttlMs) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },

    set(key, value) {
      entries.delete(key); // re-insert so the key becomes the newest
      entries.set(key, { value, storedAt: Date.now() });
      while (entries.size > maxEntries) {
        entries.delete(entries.keys().next().value);
      }
    },
  };
}
