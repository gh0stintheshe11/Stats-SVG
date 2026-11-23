import fetchGitHubData from './github/fetch.js';
import renderGitHubCard from './github/render.js';
import fetchLeetCodeStats from './leetcode/fetch.js';
import fetchSteamStatus from './steam/fetch.js';

/**
 * Every card the API serves, keyed by its endpoint: /api/<name>?username=...
 *
 * - `usernamePattern`: what a valid `username` looks like. Anything else gets a 400
 *   before any upstream API is called.
 * - `fetch(username, { deadline })`: loads the card's data. Throw an HttpError
 *   (src/lib/errors.js) for expected failures such as "user not found".
 * - `render(data)`: returns the SVG markup. Cards without `render` answer with the
 *   fetched data as JSON, which is handy while a card's design is still in progress.
 * - `dataVersion`: part of the cache key for the fetched data. Bump it whenever the shape of
 *   what `fetch` returns changes, so deployed code never reads data cached by older code.
 * - `caseInsensitive`: usernames differing only in case share one cache entry.
 *
 * Fetched data is cached and refreshed in the background by src/app.js, so `fetch`
 * itself doesn't need to cache anything.
 *
 * To add a card, create src/cards/<name>/ with a fetch.js (and render.js) and register it here.
 */
export const CARDS = {
  'github-status': {
    usernamePattern: /^[A-Za-z0-9-]{1,39}$/,
    caseInsensitive: true,
    dataVersion: 1,
    fetch: fetchGitHubData,
    render: renderGitHubCard,
  },
  'leetcode-status': {
    usernamePattern: /^[A-Za-z0-9_.-]{1,50}$/,
    caseInsensitive: true,
    dataVersion: 1,
    fetch: fetchLeetCodeStats,
  },
  'steam-status': {
    usernamePattern: /^\d{17}$/, // 64-bit Steam ID
    dataVersion: 1,
    fetch: fetchSteamStatus,
  },
};
