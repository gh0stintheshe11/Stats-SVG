/**
 * Returns a function that runs async tasks with at most `concurrency` of them at a time.
 * Tasks beyond that wait their turn, in the order they were added.
 *
 * @example
 * const limit = createLimiter(4);
 * const pages = await Promise.all(cursors.map((cursor) => limit(() => fetchPage(cursor))));
 *
 * @param {number} concurrency
 * @returns {<T>(task: () => Promise<T>) => Promise<T>}
 */
export function createLimiter(concurrency) {
  let active = 0;
  const waiting = [];

  return async (task) => {
    // A finishing task hands its slot straight to the next waiting one, so `active` stays the same.
    if (active >= concurrency) await new Promise((resolve) => waiting.push(resolve));
    else active++;

    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}
