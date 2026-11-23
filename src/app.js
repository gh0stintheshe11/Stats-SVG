import config from '../config.js';
import { CARDS } from './cards/index.js';
import { HttpError } from './lib/errors.js';
import { getWithRevalidation } from './lib/store.js';

// When nothing is cached, the request waits this long for the data to be collected...
const FOREGROUND_BUDGET_MS = 25_000;
// ...and collecting it may take this long. A load that outlasts its request (or a visitor who has
// given up) carries on in the background and fills the cache for the next view. Background
// refreshes get the same time. Must stay below maxDuration in vercel.json.
const BACKGROUND_BUDGET_MS = 50_000;

// Cards only need inline styles and data: fonts/images. Blocking everything else means
// injected markup could not run scripts even if escaping ever missed something.
const SVG_CONTENT_SECURITY_POLICY = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:";

const DEFAULT_ERROR_MESSAGES = {
  500: 'Internal server error',
  502: 'Upstream API error',
  503: 'Service temporarily unavailable, please try again later',
  504: 'Upstream API timed out',
};

/** Returns [name, card] for /api/<name>, or []. */
function findCard(pathname) {
  const name = pathname.match(/^\/api\/([\w-]+)\/?$/)?.[1];
  return name && Object.hasOwn(CARDS, name) ? [name, CARDS[name]] : [];
}

/**
 * Optional comma-separated ALLOWED_USERNAMES env var: a personal deployment can serve
 * only its owner's cards, so strangers can't spend its API quota.
 */
function isAllowed(username) {
  const allowList = process.env.ALLOWED_USERNAMES;
  if (!allowList) return true;
  return allowList.split(',').some((name) => name.trim().toLowerCase() === username.toLowerCase());
}

// Browsers and GitHub's image proxy must fetch a card again for every page view. A card's
// animations start the moment the image is loaded, not when it becomes visible: a copy taken
// from a cache is "loaded" before the page has drawn anything, so the viewer would miss the
// beginning of the animation. Only Vercel's CDN caches cards (see cdnCacheControl below).
const CLIENT_CACHE_CONTROL = 'no-cache, no-store, max-age=0, must-revalidate';

/**
 * Cache rules for Vercel's CDN, based on how old the card's data is. They are sent in the
 * Vercel-CDN-Cache-Control header, which only Vercel reads and doesn't pass on.
 *
 * - Fresh data: cacheable until the data turns `max_age_seconds` old. After that the CDN may hand
 *   out the old card once more while it asks the function again in the background.
 * - Stale data (a background refresh has just been started): cacheable only briefly and without
 *   that grace period, so the next request reaches the function and gets the refreshed data.
 *
 * Either way the CDN falls back to the last card if the function fails.
 */
function cdnCacheControl({ status, ageMs }) {
  const { max_age_seconds, stale_max_age_seconds, keep_stale_seconds } = config.cache;
  if (status === 'stale') {
    return `max-age=${stale_max_age_seconds}, stale-if-error=${keep_stale_seconds}`;
  }
  const remaining = Math.max(stale_max_age_seconds, Math.round(max_age_seconds - ageMs / 1000));
  return `max-age=${remaining}, stale-while-revalidate=${keep_stale_seconds}, stale-if-error=${keep_stale_seconds}`;
}

/** Server-Timing header: shows in the browser's dev tools how the response was produced. */
function serverTiming({ status, ageMs }, dataMs, renderMs) {
  const age = status === 'miss' ? '' : ` age ${Math.round(ageMs / 1000)}s`;
  const metrics = [`cache;desc="${status}${age}"`, `data;dur=${dataMs.toFixed(1)}`];
  if (renderMs !== undefined) metrics.push(`render;dur=${renderMs.toFixed(1)}`);
  return metrics.join(', ');
}

function errorResponse(error) {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof HttpError && error.expose
    ? error.message
    : DEFAULT_ERROR_MESSAGES[status] ?? 'Request failed';

  // Log the message only, never request details: they can contain the GitHub token or Steam API key.
  if (status >= 500) {
    console.error(`[${status}] ${error.message}`);
    if (!(error instanceof HttpError)) console.error(error.stack);
  }

  return new Response(message, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * Serves /api/<card>?username=<name>.
 *
 * Card data comes from a two-level cache with background refresh (src/lib/store.js), and the
 * response itself is cached by Vercel's CDN, so most views never wait for an upstream API.
 *
 * Takes a standard Request and returns a standard Response, so the same code runs on
 * Vercel (api/index.js), in the local dev server (scripts/dev-server.js) and in tests.
 *
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function handleRequest(request) {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      throw new HttpError(405, 'Method not allowed');
    }

    const url = new URL(request.url);
    const [cardName, card] = findCard(url.pathname);
    if (!card) throw new HttpError(404, 'Not found');

    const usernames = url.searchParams.getAll('username');
    const username = usernames.length === 1 ? usernames[0] : undefined;
    if (!username || !card.usernamePattern.test(username)) {
      throw new HttpError(400, 'Missing or invalid "username" query parameter');
    }
    if (!isAllowed(username)) {
      throw new HttpError(403, 'This instance does not serve that username');
    }
    const options = card.parseOptions?.(url) ?? {};

    const dataStartedAt = performance.now();
    const cacheKey = `${cardName}:v${card.dataVersion}:${card.caseInsensitive ? username.toLowerCase() : username}`;
    const result = await getWithRevalidation(cacheKey, ({ deadline, background }) => card.fetch(username, { deadline, background }), {
      freshMs: config.cache.max_age_seconds * 1000,
      maxAgeMs: config.cache.keep_stale_seconds * 1000,
      foregroundBudgetMs: FOREGROUND_BUDGET_MS,
      backgroundBudgetMs: BACKGROUND_BUDGET_MS,
    });
    const dataMs = performance.now() - dataStartedAt;

    const headers = {
      'Cache-Control': CLIENT_CACHE_CONTROL,
      'Vercel-CDN-Cache-Control': cdnCacheControl(result),
      'X-Content-Type-Options': 'nosniff',
    };

    if (!card.render) {
      return Response.json(result.value, { headers: { ...headers, 'Server-Timing': serverTiming(result, dataMs) } });
    }

    const renderStartedAt = performance.now();
    const svg = card.render(result.value, options);
    const renderMs = performance.now() - renderStartedAt;

    return new Response(svg, {
      headers: {
        ...headers,
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Content-Security-Policy': SVG_CONTENT_SECURITY_POLICY,
        'Server-Timing': serverTiming(result, dataMs, renderMs),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
