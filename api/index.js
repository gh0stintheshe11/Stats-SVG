import { handleRequest } from '../src/app.js';

/**
 * Vercel entry point (also used by scripts/dev-server.js).
 *
 * Vercel calls this with Node's (req, res). It only translates between those and the
 * standard Request/Response used by src/app.js, where the actual logic lives.
 */
export default async function handler(req, res) {
  // Only the path and query matter, so a fixed origin is enough to build the URL.
  const request = new Request(new URL(req.url, 'http://localhost'), { method: req.method });
  const response = await handleRequest(request);

  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}
