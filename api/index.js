import { handleRequest } from '../src/app.js';

/**
 * Turns Node's request into a standard Request, or returns null if that isn't possible:
 * a request line that isn't a valid URL, or a method Request doesn't allow (e.g. TRACE).
 */
function toRequest(req) {
  try {
    // Only the path and query matter, so a fixed origin is enough to build the URL.
    return new Request(`http://localhost${req.url}`, { method: req.method });
  } catch {
    return null;
  }
}

/**
 * Vercel entry point (also used by scripts/dev-server.js).
 *
 * Vercel calls this with Node's (req, res). It only translates between those and the
 * standard Request/Response used by src/app.js, where the actual logic lives.
 */
export default async function handler(req, res) {
  const request = toRequest(req);
  if (!request) {
    res.statusCode = 400;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Bad request');
    return;
  }

  const response = await handleRequest(request);

  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}
