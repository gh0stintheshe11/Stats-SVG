import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fetchGitHubData from '../src/cards/github/fetch.js';
import { calculateLanguagePercentage } from '../src/cards/github/languages.js';
import { calculateRank } from '../src/cards/github/rank.js';
import { ACCOUNT_CREATED_YEAR, githubApi, graphQLError } from './fixtures/github-api.js';
import { httpStatus, mockFetch } from './helpers/mock-fetch.js';

// fetchGitHubData caches by username, so each test uses its own.
let userCounter = 0;
const uniqueUser = () => `test-user-${++userCounter}`;

const withToken = (t) => {
  const saved = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = 'ghp_test_token';
  t.after(() => { process.env.GITHUB_TOKEN = saved; });
};

describe('calculateLanguagePercentage', () => {
  test('keeps the top 20 languages and makes them add up to 100%', () => {
    const languages = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`L${i}`, { size: 100 * (i + 1), count: 1, color: '#000' }]));
    const result = calculateLanguagePercentage(languages);
    assert.equal(result.length, 20);
    assert.equal(result[0].name, 'L24');
    assert.ok(Math.abs(result.reduce((sum, l) => sum + l.percentage, 0) - 100) < 1e-9);
  });

  test('ranks by sqrt(size * count) and shortens "Jupyter Notebook"', () => {
    const result = calculateLanguagePercentage({
      'Jupyter Notebook': { size: 100, count: 9, color: '#f00' }, // k = 30
      Go: { size: 400, count: 1, color: '#0f0' }, // k = 20
    });
    assert.deepEqual(result.map((l) => [l.name, Math.round(l.percentage)]), [['Jupyter', 60], ['Go', 40]]);
  });

  test('returns an empty list when there is no code', () => {
    assert.deepEqual(calculateLanguagePercentage({}), []);
    assert.deepEqual(calculateLanguagePercentage({ Empty: { size: 0, count: 1 } }), []);
  });
});

describe('calculateRank', () => {
  test('a new account ranks C at 100%', () => {
    assert.deepEqual(calculateRank({ all_commits: true }), { level: 'C', percentile: 100 });
  });

  test('more activity gives a better (lower) percentile', () => {
    const low = calculateRank({ all_commits: true, commits: 100, stars: 5 });
    const high = calculateRank({ all_commits: true, commits: 5000, prs: 300, stars: 2000, followers: 500 });
    assert.ok(high.percentile < low.percentile);
    assert.notEqual(high.level, 'C');
  });
});

describe('fetchGitHubData', () => {
  test('aggregates the API data into card stats', async (t) => {
    withToken(t);
    mockFetch(t, githubApi());
    const stats = await fetchGitHubData(uniqueUser());

    const years = new Date().getUTCFullYear() - ACCOUNT_CREATED_YEAR + 1;
    assert.equal(stats.total_commits, 100 * years);
    assert.equal(stats.total_prs, 10 * years);
    assert.equal(stats.total_repos, 4); // two pages of two repos
    assert.equal(stats.total_stars, 240);
    assert.equal(stats.total_forks, 60);
    assert.equal(stats.total_contributes_to, 12);
    assert.equal(stats.merged_prs_percentage, 90); // 45 merged of 50 PRs, both from user.pullRequests
    assert.equal(stats.language_percentages.length, 20);
    assert.ok(stats.language_percentages.some((l) => l.name === 'Jupyter'));
    assert.ok(Object.keys(stats.contribution_distribution).length >= 60);
    assert.match(stats.rank.level, /^(S|A\+|A|A-|B\+|B|B-|C\+|C)$/);
  });

  test('sends the token only to GitHub, as a bearer token', async (t) => {
    withToken(t);
    const calls = mockFetch(t, githubApi());
    await fetchGitHubData(uniqueUser());
    assert.ok(calls.every((call) => call.url.origin === 'https://api.github.com'));
    assert.ok(calls.every((call) => call.headers.Authorization === 'bearer ghp_test_token'));
  });

  test('caches past years\' contribution totals, but always fetches the current year', async (t) => {
    withToken(t);
    const calls = mockFetch(t, githubApi());
    const user = uniqueUser();
    const totalsQueries = () => calls.filter((call) => call.body.query.includes('userContributionTotals'));

    const first = await fetchGitHubData(user);
    const pastYears = new Date().getUTCFullYear() - ACCOUNT_CREATED_YEAR;
    assert.equal(totalsQueries().length, pastYears + 1);

    const second = await fetchGitHubData(user);
    assert.equal(totalsQueries().length, pastYears + 2); // only the current year again
    assert.equal(second.total_commits, first.total_commits);
  });

  test('fails fast without a token', async (t) => {
    const saved = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    t.after(() => { process.env.GITHUB_TOKEN = saved; });
    const calls = mockFetch(t, githubApi());
    await assert.rejects(fetchGitHubData(uniqueUser()), { status: 500, expose: false });
    assert.equal(calls.length, 0);
  });

  for (const [description, response, status] of [
    ['GraphQL NOT_FOUND', graphQLError('NOT_FOUND'), 404],
    ['GraphQL RATE_LIMITED (HTTP 200)', graphQLError('RATE_LIMITED'), 503],
    ['HTTP 403 secondary rate limit', httpStatus(403), 503],
    ['HTTP 401 bad token', httpStatus(401), 500],
  ]) {
    test(`${description} -> ${status} without retries`, async (t) => {
      withToken(t);
      const calls = mockFetch(t, () => response.clone?.() ?? response);
      await assert.rejects(fetchGitHubData(uniqueUser()), { status });
      assert.ok(calls.length <= 4, `expected one call per parallel query, got ${calls.length}`);
    });
  }

  test('retries a transient failure on the failing call only', async (t) => {
    withToken(t);
    let failuresLeft = 2;
    const api = githubApi();
    mockFetch(t, (call) => (failuresLeft-- > 0 ? httpStatus(502) : api(call)));
    const stats = await fetchGitHubData(uniqueUser());
    assert.equal(stats.total_repos, 4);
  });

  test('gives up after 3 attempts per call when GitHub keeps failing', async (t) => {
    withToken(t);
    const user = uniqueUser();
    const calls = mockFetch(t, () => httpStatus(502));
    await assert.rejects(fetchGitHubData(user), { status: 502 });
    // Wait for the parallel queries to finish their own retries before counting.
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    assert.equal(calls.length, 12); // user info, repositories, calendar, current year: 3 attempts each
  });
});
