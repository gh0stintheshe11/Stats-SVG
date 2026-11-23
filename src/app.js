import config from '../config.js';
import { CARDS } from './cards/index.js';
import { HttpError } from './lib/errors.js';

// vercel.json stops the function after 10s; keep upstream calls well inside that.
const UPSTREAM_BUDGET_MS = 8000;

// Cards only need inline styles and data: fonts/images. Blocking everything else means
// injected markup could not run scripts even if escaping ever missed something.
const SVG_CONTENT_SECURITY_POLICY = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:";

const DEFAULT_ERROR_MESSAGES = {
  500: 'Internal server error',
  502: 'Upstream API error',
  503: 'Service temporarily unavailable, please try again later',
  504: 'Upstream API timed out',
};

/** Returns the card registered for /api/<name>, or undefined. */
function findCard(pathname) {
  const name = pathname.match(/^\/api\/([\w-]+)\/?$/)?.[1];
  return name && Object.hasOwn(CARDS, name) ? CARDS[name] : undefined;
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

function cacheControl() {
  const { max_age_seconds, stale_while_revalidate_seconds } = config.cache;
  return `public, max-age=${max_age_seconds}, s-maxage=${max_age_seconds}, stale-while-revalidate=${stale_while_revalidate_seconds}`;
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
    const card = findCard(url.pathname);
    if (!card) throw new HttpError(404, 'Not found');

    const usernames = url.searchParams.getAll('username');
    const username = usernames.length === 1 ? usernames[0] : undefined;
    if (!username || !card.usernamePattern.test(username)) {
      throw new HttpError(400, 'Missing or invalid "username" query parameter');
    }
    if (!isAllowed(username)) {
      throw new HttpError(403, 'This instance does not serve that username');
    }

    const data = await card.fetch(username, { deadline: Date.now() + UPSTREAM_BUDGET_MS });
    const headers = {
      'Cache-Control': cacheControl(),
      'X-Content-Type-Options': 'nosniff',
    };

    if (!card.render) {
      return Response.json(data, { headers });
    }
    return new Response(card.render(data), {
      headers: {
        ...headers,
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Content-Security-Policy': SVG_CONTENT_SECURITY_POLICY,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
