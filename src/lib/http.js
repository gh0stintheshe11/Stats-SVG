import { HttpError, upstreamStatusError } from './errors.js';
import { timeLeft } from './retry.js';

const isTimeout = (error) => error?.name === 'TimeoutError' || error?.name === 'AbortError';

/**
 * Sends one HTTP request to an upstream API and returns the parsed JSON body.
 *
 * Failures are thrown as HttpError (marked `retryable` when worth retrying). They never
 * carry the request itself, so tokens in headers or keys in URLs can't end up in logs.
 * This makes a single attempt; wrap calls in `withRetry` (./retry.js) to retry.
 *
 * @param {string} service Name used in error messages, e.g. "GitHub".
 * @param {string | URL} url
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {Record<string, string>} [options.headers]
 * @param {unknown} [options.json] Request body, sent as JSON.
 * @param {number} [options.deadline] Epoch ms after which the request is aborted.
 * @param {number[]} [options.rateLimitStatuses] Upstream statuses that mean "rate limited".
 */
export async function fetchJson(service, url, { method = 'GET', headers = {}, json, deadline = Infinity, rateLimitStatuses } = {}) {
  const init = {
    method,
    headers: json === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
    body: json === undefined ? undefined : JSON.stringify(json),
    signal: Number.isFinite(deadline) ? AbortSignal.timeout(timeLeft(deadline)) : undefined,
  };

  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (isTimeout(error)) throw new HttpError(504, `${service} API timed out`, { retryable: true });
    throw new HttpError(502, `${service} API request failed`, { retryable: true });
  }

  if (!response.ok) {
    await response.body?.cancel();
    throw upstreamStatusError(service, response.status, { rateLimitStatuses });
  }

  try {
    return await response.json();
  } catch (error) {
    if (isTimeout(error)) throw new HttpError(504, `${service} API timed out`, { retryable: true });
    throw new HttpError(502, `${service} API returned invalid JSON`, { retryable: true });
  }
}
