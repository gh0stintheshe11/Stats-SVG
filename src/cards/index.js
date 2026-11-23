import fetchGitHubData from './github/fetch.js';
import { parseIgnoredLanguages } from './github/languages.js';
import renderGitHubCard from './github/render.js';
import fetchLeetCodeStats from './leetcode/fetch.js';
import fetchSteamStatus from './steam/fetch.js';

/**
 * Every card the API serves, keyed by its endpoint: /api/<name>?username=...
 *
 * - `usernamePattern`: what a valid `username` looks like. Anything else gets a 400
 *   before any upstream API is called.
 * - `fetch(username, { deadline, background })`: loads the card's data and must finish by
 *   `deadline`. `background` is true for a refresh nobody is waiting for. Throw an HttpError
 *   (src/lib/errors.js) for expected failures such as "user not found".
 * - `render(data, options)`: returns the SVG markup. Cards without `render` answer with the
 *   fetched data as JSON, which is handy while a card's design is still in progress.
 * - `parseOptions(url)`: reads the card's display options from the request URL, for `render`.
 *   Runs before any data is loaded, so it can reject a bad parameter with an HttpError (400).
 *   Options only change how the data is shown: the data is fetched and cached once per username,
 *   whatever the options (the CDN keeps each URL's card separately).
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
    dataVersion: 2,
    fetch: fetchGitHubData,
    parseOptions: (url) => ({ ignoreLanguages: parseIgnoredLanguages(url) }),
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
