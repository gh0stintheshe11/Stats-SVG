import { HttpError } from './errors.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Returns the milliseconds left before `deadline` (epoch ms), for use as a request timeout.
 * Throws a 504 if the deadline has already passed.
 */
export function timeLeft(deadline) {
  const ms = deadline - Date.now();
  if (ms <= 0) throw new HttpError(504, 'Timed out waiting for upstream APIs');
  return ms;
}

/**
 * Runs `fn` and retries it only when the error is marked `retryable`
 * (network errors, upstream 5xx), with exponential backoff.
 *
 * Permanent failures (user not found, bad token, rate limited) are thrown right away,
 * and no retry starts if it could not finish before `deadline`.
 *
 * @param {() => Promise<any>} fn
 * @param {object} [options]
 * @param {number} [options.attempts] Maximum number of attempts, including the first.
 * @param {number} [options.baseDelayMs] Delay before the first retry; doubles each time.
 * @param {number} [options.deadline] Epoch ms after which no new attempt is started.
 */
export async function withRetry(fn, { attempts = 3, baseDelayMs = 300, deadline = Infinity } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const delay = baseDelayMs * 2 ** (attempt - 1);
      if (!error.retryable || attempt >= attempts || Date.now() + delay >= deadline) throw error;
      console.warn(`Attempt ${attempt} failed (${error.message}), retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
}
