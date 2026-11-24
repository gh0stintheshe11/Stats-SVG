// Design preview for the GitHub card: shows it the way a profile README does, on GitHub's own
// background colors and at the width GitHub scales it to, and redraws it (replaying the
// animation) whenever a file the card is built from is saved.
//
// Usage: npm run preview   (then open http://127.0.0.1:3001)
//
// `npm run preview` restarts this server whenever something in src/, config.js or scripts/
// changes; the page notices the restart and loads the card again.
//
// Data: the sample from the tests (no token needed), or a real account's stats. Those are fetched
// from GitHub once, with GITHUB_TOKEN from .env, and then kept on disk in
// node_modules/.cache/stats-svg-preview/, so the card redraws instantly however often you save.
// "Reload data" in the page fetches them again.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARDS } from '../src/cards/index.js';
import sampleStats from '../test/fixtures/github-stats.js';

try {
  process.loadEnvFile();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGE_FILE = path.join(__dirname, 'preview.html');
const DATA_DIRECTORY = path.join(__dirname, '../node_modules/.cache/stats-svg-preview');
const PORT = Number(process.env.PREVIEW_PORT) || 3001;
const HOST = '127.0.0.1'; // this machine only: the page can make the server call GitHub with your token
const card = CARDS['github-status'];

// Changes on every restart, so the page can tell that the code changed.
const BOOT_ID = `${Date.now()}`;

const dataFile = (username) => path.join(DATA_DIRECTORY, `${username.toLowerCase()}.json`);

/** The stats to show: the sample, or a real account's, from disk or else from GitHub. */
async function loadStats(username, { refresh = false } = {}) {
  if (!username) return { stats: sampleStats, source: 'sample data from the tests' };
  if (!card.usernamePattern.test(username)) throw Object.assign(new Error(`Not a GitHub username: ${username}`), { status: 400 });

  const file = dataFile(username);
  if (!refresh && fs.existsSync(file)) {
    const { fetchedAt, stats } = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { stats, source: `${username}, fetched from GitHub ${new Date(fetchedAt).toLocaleString()}` };
  }

  if (!process.env.GITHUB_TOKEN) {
    throw Object.assign(new Error('Loading a real account needs GITHUB_TOKEN: copy .env.example to .env and fill it in (a token with no scopes is enough), then restart npm run preview.'), { status: 503 });
  }
  console.log(`Fetching ${username} from GitHub…`);
  const stats = await card.fetch(username, { deadline: Date.now() + 60_000, background: true });
  fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ fetchedAt: Date.now(), stats }));
  return { stats, source: `${username}, fetched from GitHub just now` };
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}

/** Server-sent events: tells the page which run of the server it is talking to. */
function events(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  res.write(`retry: 500\ndata: ${BOOT_ID}\n\n`); // reconnect quickly after a restart
  const keepAlive = setInterval(() => res.write(': keep-alive\n\n'), 15_000);
  req.on('close', () => clearInterval(keepAlive));
}

async function cardSvg(url, res) {
  const username = url.searchParams.get('username') || '';
  const { stats, source } = await loadStats(username, { refresh: url.searchParams.has('refresh') });
  const options = card.parseOptions(url);

  const started = performance.now();
  const svg = card.render(stats, options);
  const renderMs = performance.now() - started;

  send(res, 200, svg, {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    // Read by the page for its status line.
    'X-Preview-Source': encodeURIComponent(source),
    'X-Preview-Render-Ms': renderMs.toFixed(1),
  });
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://${HOST}`);
    try {
      if (url.pathname === '/') return send(res, 200, fs.readFileSync(PAGE_FILE), { 'Content-Type': 'text/html; charset=utf-8' });
      if (url.pathname === '/events') return events(req, res);
      if (url.pathname === '/card.svg') return await cardSvg(url, res);
      return send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
    } catch (error) {
      if (!error.status) console.error(error);
      return send(res, error.status || 500, error.stack && !error.status ? error.stack : error.message, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
  })
  .listen(PORT, HOST, () => console.log(`Design preview on http://${HOST}:${PORT}  (redraws when you save; Ctrl+C to stop)`));
