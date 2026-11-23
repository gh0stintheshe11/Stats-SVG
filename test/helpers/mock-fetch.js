/**
 * Replaces globalThis.fetch for the duration of a test.
 *
 * `respond(call)` receives { url, method, headers, body } (body parsed from JSON) and returns
 * either a Response or any value, which is sent back as a JSON response.
 * Returns the list of calls made, for assertions.
 *
 * @param {import('node:test').TestContext} t
 * @param {(call: { url: URL, method: string, headers: object, body: any }) => any} respond
 */
export function mockFetch(t, respond) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (input, init = {}) => {
    const call = {
      url: new URL(String(input)),
      method: init.method ?? 'GET',
      headers: init.headers ?? {},
      body: init.body ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    const result = await respond(call);
    return result instanceof Response ? result : Response.json(result);
  });
  return calls;
}

/** A response with the given HTTP status and an empty body. */
export const httpStatus = (status) => new Response(null, { status });
