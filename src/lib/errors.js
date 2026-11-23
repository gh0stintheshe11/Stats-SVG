/**
 * An error that knows which HTTP status the API should answer with.
 *
 * - `retryable`: the failure is transient (network error, upstream 5xx), so retrying may help.
 * - `expose`: the message is safe to show to the client. Messages are built by this
 *   codebase and never include tokens or API keys, but configuration problems are
 *   still hidden behind a generic message.
 */
export class HttpError extends Error {
  constructor(status, message, { retryable = false, expose = true } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.retryable = retryable;
    this.expose = expose;
  }
}

/**
 * Maps a non-2xx status from an upstream API to the HttpError this API should answer with.
 *
 * @param {string} service Name used in messages, e.g. "GitHub".
 * @param {number} status The upstream HTTP status.
 * @param {object} [options]
 * @param {number[]} [options.rateLimitStatuses] Upstream statuses that mean "rate limited".
 */
export function upstreamStatusError(service, status, { rateLimitStatuses = [429] } = {}) {
  if (rateLimitStatuses.includes(status)) {
    return new HttpError(503, `${service} API rate limit reached, please try again later`);
  }
  if (status === 401 || status === 403) {
    return new HttpError(500, `${service} API rejected the server's credentials (${status})`, { expose: false });
  }
  if (status === 404) {
    return new HttpError(404, `${service} resource not found`);
  }
  return new HttpError(502, `${service} API returned ${status}`, { retryable: status >= 500 });
}
