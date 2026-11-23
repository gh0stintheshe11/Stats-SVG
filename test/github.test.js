import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fetchGitHubData from '../src/cards/github/fetch.js';
import { calculateLanguagePercentage, parseIgnoredLanguages } from '../src/cards/github/languages.js';
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

  test('leaves out ignored languages: the next one moves up and the rest share 100%', () => {
    const languages = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`L${i}`, { size: 100 * (25 - i), count: 1, color: '#000' }]));
    const result = calculateLanguagePercentage(languages, { ignore: new Set(['l0', 'l5']) });
    assert.deepEqual(result.map((l) => l.name), ['L1', 'L2', 'L3', 'L4', ...Array.from({ length: 16 }, (_, i) => `L${i + 6}`)]);
    assert.ok(Math.abs(result.reduce((sum, l) => sum + l.percentage, 0) - 100) < 1e-9);
  });

  test('ignoring every language leaves an empty ring', () => {
    assert.deepEqual(calculateLanguagePercentage({ Go: { size: 1, count: 1 } }, { ignore: new Set(['go']) }), []);
  });
});

describe('parseIgnoredLanguages', () => {
  const LANGUAGES = Object.fromEntries(['C', 'C++', 'C#', 'HTML', 'CSS', 'Go', 'Jupyter Notebook', 'Vim Script'].map((name) => [name, { size: 1, count: 1, color: '#000' }]));
  const ALL = ['C', 'C++', 'C#', 'HTML', 'CSS', 'Go', 'Jupyter', 'Vim Script'];
  /** The languages left on the card for a request with this query string. */
  const shown = (query) => calculateLanguagePercentage(LANGUAGES, { ignore: parseIgnoredLanguages(new URL(`https://card.test/api/github-status?username=x&${query}`)) })
    .map((l) => l.name);
  const without = (...names) => ALL.filter((name) => !names.includes(name));

  test("a language's default alias: its name in lower case, with hyphens for spaces", () => {
    assert.deepEqual(shown('ignore_languages=html,css'), without('HTML', 'CSS'));
    assert.deepEqual(shown('ignore_languages=jupyter-notebook,vim-script'), without('Jupyter', 'Vim Script'));
    assert.deepEqual(shown('ignore_languages=c'), without('C'));
  });

  test('the aliases GitHub Linguist lists', () => {
    assert.deepEqual(shown('ignore_languages=csharp,cpp'), without('C#', 'C++'));
    assert.deepEqual(shown('ignore_languages=golang,ipython%20notebook'), without('Go', 'Jupyter'));
  });

  test('case does not matter, as in GitHub search', () => {
    assert.deepEqual(shown('ignore_languages=HTML,CSharp,Jupyter-Notebook'), without('HTML', 'C#', 'Jupyter'));
  });

  test('the parameter may be repeated', () => {
    assert.deepEqual(shown('ignore_languages=go&ignore_languages=css'), without('Go', 'CSS'));
  });

  test('anything else matches nothing, and never another language', () => {
    for (const query of [
      'ignore_languages=Jupyter', // the card's short name
      'ignore_languages=Jupyter%20Notebook', // the display name, with a space
      'ignore_languages=C++', // a + in a URL is a space: this is "c  "
      'ignore_languages=html,%20css', // spaces are not trimmed
      'ignore_languages=rust,constructor,__proto__,toString', // unknown, or properties every object has
      'ignore_languages=%E0%A4%A', // a malformed escape
      'ignore_languages=,,&hide=go',
    ]) {
      const expected = query.includes('html') ? without('HTML') : ALL;
      assert.deepEqual(shown(query), expected, query);
    }
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
    assert.equal(stats.total_repos, 4);
    assert.equal(stats.total_stars, 240);
    assert.equal(stats.total_forks, 60);
    assert.equal(stats.total_contributes_to, 12);
    assert.equal(stats.merged_prs_percentage, 90); // 45 merged of 50 PRs, both from user.pullRequests
    // All 25 languages are kept (the card picks its top 20 when it is rendered), summed over the
    // repositories: each one is in two of the four.
    assert.equal(Object.keys(stats.languages).length, 25);
    assert.deepEqual(stats.languages['Jupyter Notebook'], { size: 50000, count: 2, color: '#123456' });
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

  test('a visitor is waiting: past years are requested as soon as the creation date is known, without waiting for the user info', async (t) => {
    withToken(t);
    const api = githubApi();
    const order = [];
    mockFetch(t, async (call) => {
      const operation = call.body.query.match(/query (\w+)/)[1];
      if (operation === 'userInfo') await new Promise((resolve) => setTimeout(resolve, 60)); // the slow one
      order.push(operation);
      return api(call);
    });
    await fetchGitHubData(uniqueUser());
    const pastYears = order.filter((operation) => operation === 'userContributionTotals').length - 1;
    assert.ok(pastYears >= 1);
    assert.ok(order.lastIndexOf('userContributionTotals') < order.indexOf('userInfo'), `user info should come back last: ${order.join(', ')}`);
  });

  test('background refresh: no separate request for the creation date', async (t) => {
    withToken(t);
    const calls = mockFetch(t, githubApi());
    await fetchGitHubData(uniqueUser(), { background: true });
    assert.equal(calls.filter((call) => call.body.query.includes('query userCreatedAt(')).length, 0);
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
      assert.ok(calls.length <= 6, `expected one call per parallel query, got ${calls.length}`);
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
    assert.equal(calls.length, 18); // user info, creation date, first repository page and its cursor, calendar, current year: 3 attempts each
  });
});

describe('repositories of accounts of any size', () => {
  // Stars and forks differ per repository, so a repository counted twice or left out changes the sums.
  const stars = (i) => i + 1;
  const forks = (i) => (i + 1) ** 2;
  const sum = (count, of) => Array.from({ length: count }, (_, i) => of(i)).reduce((a, b) => a + b, 0);
  const requests = (calls, operation) => calls.filter((call) => call.body.query.includes(`query ${operation}(`));
  const pageSizes = (calls) => requests(calls, 'userRepositories').map((call) => call.body.variables.first);

  async function load(t, { repositoryCount, background = false, pageDelayMs = 0 }) {
    withToken(t);
    const api = githubApi({ repositoryCount, stars, forks, pageDelayMs });
    const calls = mockFetch(t, api);
    const result = await fetchGitHubData(uniqueUser(), { background });
    return { result, calls, api };
  }
  const assertComplete = (result, count) => {
    assert.equal(result.total_repos, count);
    assert.equal(result.total_stars, sum(count, stars));
    assert.equal(result.total_forks, sum(count, forks));
  };

  test('a visitor is waiting, small account: one page, plus one cursor request to learn that it is the only one', async (t) => {
    const { result, calls } = await load(t, { repositoryCount: 20 });
    assertComplete(result, 20);
    assert.deepEqual(pageSizes(calls), [34]);
    assert.equal(requests(calls, 'userRepositoryCursors').length, 1);
  });

  test('a visitor is waiting, 120 repositories: small pages, requested side by side', async (t) => {
    const { result, calls, api } = await load(t, { repositoryCount: 120, pageDelayMs: 20 });
    assertComplete(result, 120);
    assert.deepEqual(pageSizes(calls), [34, 34, 34, 34]);
    assert.ok(api.maxPagesInFlight >= 3, `pages should overlap, at most ${api.maxPagesInFlight} were in flight`);
  });

  test('a visitor is waiting, larger accounts: bigger pages after the first one', async (t) => {
    const medium = await load(t, { repositoryCount: 300 });
    assertComplete(medium.result, 300);
    assert.deepEqual(pageSizes(medium.calls), [34, 50, 50, 50, 50, 50, 50]);

    const large = await load(t, { repositoryCount: 700 });
    assertComplete(large.result, 700);
    assert.deepEqual(pageSizes(large.calls), [34, 100, 100, 100, 100, 100, 100, 100]);
  });

  test('background refresh, up to 100 repositories: a single request', async (t) => {
    const { result, calls } = await load(t, { repositoryCount: 80, background: true });
    assertComplete(result, 80);
    assert.deepEqual(pageSizes(calls), [100]);
    assert.equal(requests(calls, 'userRepositoryCursors').length, 0);
  });

  test('background refresh, large account: full pages side by side', async (t) => {
    const { result, calls, api } = await load(t, { repositoryCount: 450, background: true, pageDelayMs: 20 });
    assertComplete(result, 450);
    assert.deepEqual(pageSizes(calls), [100, 100, 100, 100, 100]);
    assert.ok(api.maxPagesInFlight >= 3, `pages should overlap, at most ${api.maxPagesInFlight} were in flight`);
  });

  test('never asks GitHub for more than 12 pages at the same time', async (t) => {
    const { result, api } = await load(t, { repositoryCount: 2500, background: true, pageDelayMs: 10 });
    assertComplete(result, 2500);
    assert.equal(api.maxPagesInFlight, 12);
  });

  test('a repository created while the pages are loading is neither missed nor counted twice', async (t) => {
    withToken(t);
    t.mock.method(console, 'warn', () => {});
    const api = githubApi({ repositoryCount: 120, stars, forks, pageDelayMs: 20 });
    let cursorRequests = 0;
    const calls = mockFetch(t, (call) => {
      // The first page has been requested. Before the cursor-only query asks where that page ends,
      // a new repository appears at the top of the list: the answer is off by one, so the second
      // page would repeat the last repository of the first.
      if (call.body.query.includes('query userRepositoryCursors(') && ++cursorRequests === 1) {
        api.repositories.unshift({ id: 'repo-new', stargazers: { totalCount: 1000 }, forkCount: 0, languages: { edges: [] } });
      }
      return api(call);
    });

    const result = await fetchGitHubData(uniqueUser());
    assert.equal(result.total_repos, 121);
    assert.equal(result.total_stars, sum(120, stars) + 1000);
    assert.equal(result.total_forks, sum(120, forks));
    assert.equal(pageSizes(calls).filter((size) => size === 100).length, 2, 'loaded again in the plain way: two pages of 100');
  });

  test('a page that fails makes the whole load fail', async (t) => {
    withToken(t);
    const api = githubApi({ repositoryCount: 120 });
    mockFetch(t, (call) => (call.body.variables.after === 'repo-67' && call.body.query.includes('query userRepositories(') ? httpStatus(401) : api(call)));
    await assert.rejects(fetchGitHubData(uniqueUser()), { status: 500 });
  });
});
