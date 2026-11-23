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
 *
 * To add a card, create src/cards/<name>/ with a fetch.js (and render.js) and register it here.
 */
export const CARDS = {
  'github-status': {
    usernamePattern: /^[A-Za-z0-9-]{1,39}$/,
    fetch: fetchGitHubData,
    render: renderGitHubCard,
  },
  'leetcode-status': {
    usernamePattern: /^[A-Za-z0-9_.-]{1,50}$/,
    fetch: fetchLeetCodeStats,
  },
  'steam-status': {
    usernamePattern: /^\d{17}$/, // 64-bit Steam ID
    fetch: fetchSteamStatus,
  },
};
