import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import vercelHandler from '../api/index.js';
import { handleRequest } from '../src/app.js';
import { githubApi } from './fixtures/github-api.js';
import { mockFetch } from './helpers/mock-fetch.js';

const TOKEN = 'ghp_secret_token_for_tests';
const STEAM_KEY = 'SECRET_STEAM_KEY_FOR_TESTS';

let userCounter = 0;
const uniqueUser = () => `api-user-${++userCounter}`;

const get = (path, init) => handleRequest(new Request(`http://localhost${path}`, init));

/** Sets environment variables for one test and restores them afterwards. */
function withEnv(t, vars) {
  const saved = Object.fromEntries(Object.keys(vars).map((key) => [key, process.env[key]]));
  Object.assign(process.env, vars);
  t.after(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

describe('GET /api/github-status', () => {
  test('returns the SVG card with cache and security headers', async (t) => {
    withEnv(t, { GITHUB_TOKEN: TOKEN });
    mockFetch(t, githubApi());
    const response = await get(`/api/github-status?username=${uniqueUser()}`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/svg+xml; charset=utf-8');
    assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
    assert.match(response.headers.get('cache-control'), /^public, max-age=\d+, s-maxage=\d+/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.match(await response.text(), /^\s*<svg /);
  });

  test('escapes a hostile display name end to end', async (t) => {
    withEnv(t, { GITHUB_TOKEN: TOKEN });
    mockFetch(t, githubApi({ name: '</text><script>alert(1)</script>', languageColor: 'red" onload="x' }));
    const body = await (await get(`/api/github-status?username=${uniqueUser()}`)).text();
    assert.ok(!body.includes('<script>'));
    assert.ok(!body.includes('onload'));
  });

  test('errors are plain text and never cached', async (t) => {
    withEnv(t, { GITHUB_TOKEN: TOKEN });
    mockFetch(t, () => ({ data: { user: null }, errors: [{ type: 'NOT_FOUND', message: 'x' }] }));
    const response = await get(`/api/github-status?username=${uniqueUser()}`);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(await response.text(), /not found/);
  });

  test('server-side problems get a generic message', async (t) => {
    withEnv(t, { GITHUB_TOKEN: '' });
    t.mock.method(console, 'error', () => {});
    const response = await get(`/api/github-status?username=${uniqueUser()}`);
    assert.equal(response.status, 500);
    assert.equal(await response.text(), 'Internal server error');
  });
});

describe('request validation', () => {
  const badRequests = [
    '/api/github-status',
    '/api/github-status?username=',
    '/api/github-status?username=a&username=b',
    '/api/github-status?username=has%20space',
    `/api/github-status?username=${'a'.repeat(40)}`,
    '/api/leetcode-status?username=%3Cx%3E',
    '/api/steam-status?username=github-status',
  ];
  for (const path of badRequests) {
    test(`400 for ${path}`, async (t) => {
      const calls = mockFetch(t, () => ({}));
      assert.equal((await get(path)).status, 400);
      assert.equal(calls.length, 0);
    });
  }

  for (const path of ['/api/nope?username=x', '/api/constructor?username=x', '/api?username=x&github-status', '/github-status?username=x']) {
    test(`404 for ${path}`, async () => {
      assert.equal((await get(path)).status, 404);
    });
  }

  test('405 for non-GET requests', async () => {
    assert.equal((await get('/api/github-status?username=x', { method: 'POST' })).status, 405);
  });

  test('ALLOWED_USERNAMES restricts which usernames are served', async (t) => {
    withEnv(t, { ALLOWED_USERNAMES: 'Alice, bob', GITHUB_TOKEN: TOKEN });
    mockFetch(t, githubApi());
    assert.equal((await get('/api/github-status?username=mallory')).status, 403);
    assert.equal((await get('/api/github-status?username=ALICE')).status, 200);
  });
});

describe('GET /api/leetcode-status', () => {
  test('returns JSON stats with languages sorted by problems solved', async (t) => {
    mockFetch(t, ({ body }) => {
      if (body.query.includes('userPublicProfile')) return { data: { matchedUser: { username: 'lc' } } };
      if (body.query.includes('skillStats')) return { data: { matchedUser: { tagProblemCounts: { advanced: [], intermediate: [], fundamental: [] } } } };
      if (body.query.includes('languageStats')) return { data: { matchedUser: { languageProblemCount: [{ languageName: 'C', problemsSolved: 1 }, { languageName: 'Go', problemsSolved: 9 }] } } };
      return { data: { userContestRanking: null } };
    });
    const response = await get('/api/leetcode-status?username=lc_user1');
    assert.equal(response.status, 200);
    const stats = await response.json();
    assert.deepEqual(stats.languages.map((l) => l.languageName), ['Go', 'C']);
    assert.equal(stats.contests.badge.name, 'None');
  });

  test('unknown user -> 404', async (t) => {
    mockFetch(t, () => ({ data: { matchedUser: null }, errors: [{ message: 'That user does not exist.' }] }));
    assert.equal((await get('/api/leetcode-status?username=lc_missing')).status, 404);
  });
});

describe('GET /api/steam-status', () => {
  const steamApi = ({ players }) => ({ url }) => {
    if (url.pathname.includes('GetPlayerSummaries')) return { response: { players } };
    if (url.pathname.includes('GetBadges')) return { response: { player_level: 3 } };
    if (url.pathname.includes('GetOwnedGames')) return { response: { game_count: 0 } };
    return { response: {} };
  };

  test('calls Steam over HTTPS and falls back to the static avatar', async (t) => {
    withEnv(t, { STEAM_API_KEY: STEAM_KEY });
    const calls = mockFetch(t, steamApi({ players: [{ personaname: 'gamer', avatarfull: 'https://avatars.test/full.jpg', personastate: 1 }] }));
    const response = await get('/api/steam-status?username=76561197960287930');
    assert.equal(response.status, 200);
    const stats = await response.json();
    assert.equal(stats.avatar, 'https://avatars.test/full.jpg');
    assert.equal(stats.user_status, 'Online');
    assert.deepEqual(stats.playtime_percentage_list, []);
    assert.ok(calls.every((call) => call.url.protocol === 'https:' && call.url.searchParams.get('key') === STEAM_KEY));
  });

  test('unknown Steam ID -> 404', async (t) => {
    withEnv(t, { STEAM_API_KEY: STEAM_KEY });
    mockFetch(t, steamApi({ players: [] }));
    assert.equal((await get('/api/steam-status?username=76561197960287931')).status, 404);
  });
});

test('secrets never reach the logs, even when every upstream call fails', async (t) => {
  withEnv(t, { GITHUB_TOKEN: TOKEN, STEAM_API_KEY: STEAM_KEY });
  const logged = [];
  for (const level of ['log', 'warn', 'error']) {
    t.mock.method(console, level, (...args) => logged.push(args.map((a) => (a instanceof Error ? a.stack : String(a))).join(' ')));
  }
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('fetch failed'); });

  await get(`/api/github-status?username=${uniqueUser()}`);
  await get('/api/steam-status?username=76561197960287939');

  const output = logged.join('\n');
  assert.ok(logged.length > 0);
  assert.ok(!output.includes(TOKEN));
  assert.ok(!output.includes(STEAM_KEY));
});

test('the Vercel handler translates Node req/res', async (t) => {
  withEnv(t, { GITHUB_TOKEN: TOKEN });
  mockFetch(t, githubApi());
  const res = {
    headers: {},
    setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
    end(body) { this.body = body; },
  };
  await vercelHandler({ url: `/api/github-status?username=${uniqueUser()}`, method: 'GET' }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'image/svg+xml; charset=utf-8');
  assert.match(res.body.toString(), /^\s*<svg /);
});
