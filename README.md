<div align="center">

# Stats SVG

An animated, cyberpunk-styled GitHub stats card for your profile README.

![GitHub stats of gh0stintheshe11](https://stats-svg.vercel.app/api/github-status?username=gh0stintheshe11)

#Cyberpunk2077 #Cyberpunk:Edgerunners

</div>

> [!NOTE]
> Still in active development: Steam and LeetCode cards are on the way. Bug reports are very welcome.

## Use it

Add this line to your profile README, with your GitHub username:

```md
![GitHub stats](https://stats-svg.vercel.app/api/github-status?username=YOUR_USERNAME)
```

| Parameter | |
| --- | --- |
| `username` | Required. Your GitHub username. |
| `ignore_languages` | Optional. Languages to leave out of the language ring, separated by commas, e.g. `&ignore_languages=html,css,jupyter-notebook`. The other languages share the 100%, and the next one moves up into the top 20. |

`ignore_languages` names languages the way GitHub search does (`language:csharp`), by their [Linguist](https://github.com/github-linguist/linguist/blob/main/lib/linguist/languages.yml) aliases: the name in lower case with hyphens for spaces (`html`, `jupyter-notebook`), or an alias listed there (`csharp` for C#, `cpp` for C++). Case doesn't matter; don't put spaces after the commas.

The numbers on a card are at most an hour old. The animation plays every time the page is opened.

The very first view of an account with several hundred repositories can show a broken image: collecting its data takes longer than the 4 seconds GitHub waits for an image. The data keeps loading anyway, so reload the page a few seconds later.

stats-svg.vercel.app is a shared instance: everyone who uses it shares one GitHub token and its hourly API limit. To have your own, or to change the design, [deploy your own](#deploy-your-own).

## What the card shows

- **Stats.** Stars and forks of your repositories, followers, commits, issues, pull requests (opened, merged, reviewed and the merge rate), repositories, repositories contributed to, and discussions started and answered.
  - Repositories, stars, forks and languages count the repositories you own, without forks.
  - Commits, pull requests, issues and reviews are GitHub's contribution counts, added up over every year since the account was created.
- **Rank.** A level from S, A+, A, A- … down to C, and a percentile: the lower, the better. It is based on the rank of [github-readme-stats](https://github.com/anuraghazra/github-readme-stats), with the number of repositories as an additional factor. The stats that count toward it are wired to the rank ring; a stat's frame turns green when it is above a typical user's value.
- **Languages.** Your top 20 languages, ranked by √(bytes of code × number of repositories). That's github-readme-stats' language ranking with `size_weight=0.5&count_weight=0.5`.
- **Daily contributions.** The last 60 days as candlesticks: each day opens at the previous day's count and closes at its own.

Private repositories are left out, unless the instance's token is allowed to read them (see the token step below).

## Deploy your own

You need a GitHub account and a free [Vercel](https://vercel.com/) account.

1. **Fork this repository.**
2. **[Create a GitHub token](https://github.com/settings/tokens/new)** (a classic personal access token).
   - Leave every scope unchecked. The card only reads data, and a token without scopes can read everything it shows about public repositories.
   - Check `repo` only if you want your private repositories counted. Be aware that `repo` grants full read **and write** access to all of them, and that your card will publicly show numbers derived from them (repositories, stars, languages). The `user` scope is never needed.
   - Copy the token; GitHub shows it only once.
3. **Import the fork in Vercel:** Add New… → Project → select the fork → Import.
4. **Add environment variables** (in the import screen, or later under Project Settings → Environment Variables). Enable each for Production **and** Preview:
   - `GITHUB_TOKEN`: the token from step 2.
   - `ALLOWED_USERNAMES` (optional, recommended): a comma-separated list of usernames, e.g. `your-username`. Requests for any other username get a `403`, so strangers can't use up your token's API limit.
5. **Deploy.** Your card is now at `https://<your-project>.vercel.app/api/github-status?username=YOUR_USERNAME`.

Vercel's free Hobby plan is enough; the public instance runs on it. `vercel.json` turns on [Fluid compute](https://vercel.com/docs/fluid-compute), which keeps cold starts rare and short; the Node.js version comes from `engines` in `package.json`. If something goes wrong, check the deployment's logs in Vercel, or open an issue here.

<details>
<summary><b>Optional: only release deployments that pass the tests</b></summary>

By default Vercel releases every build of `main`, even if the tests fail. Two GitHub Actions workflows can gate it: **CI** runs the unit tests, and **Smoke test** requests a real card from each new deployment. To make production wait for them:

1. **Give the smoke test access** (skip if Deployment Protection is off): in Vercel, open Project Settings → Deployment Protection → *Protection Bypass for Automation*, create a secret, and add it to your GitHub repository as the Actions secret `VERCEL_AUTOMATION_BYPASS_SECRET`. Until then the smoke test only prints a warning and reports nothing.
2. If `ALLOWED_USERNAMES` doesn't include your GitHub username, set the GitHub Actions variable `SMOKE_TEST_USERNAME` to a username it does include.
3. Push to `main` once, so both workflows have run. Then open Project Settings → Build and Deployment → *Deployment Checks* → *Add Checks* → GitHub, and select **test** and **Smoke test (production)**.

From then on, a production deployment only goes live after both checks pass; otherwise the previous deployment stays live.

</details>

## Customize

- **Colors, sizes, animation timings and caching** are in `config.js`.
- **The card's SVG** is built in `src/cards/github/render.js`.
- **The image in the middle of the language ring** is `src/assets/image.gif`. You can replace it with another GIF, or a PNG, JPEG or WebP: keep the file name, because the format is detected from the content. It is scaled to fit the ring. Keep it small, because every card embeds it.
- **Fonts** are in `/fonts`. After changing them, run `npm run build:fonts` to regenerate the copies the cards embed: WOFF2 subsets with Latin characters (including Vietnamese). Text in other scripts falls back to a system font.

### Design preview

```sh
npm install
npm run preview          # http://127.0.0.1:3001/?username=YOUR_USERNAME
```

This shows the card the way your profile README does: on GitHub's background (dark, dark dimmed, high contrast or light), inside the same bordered box, and scaled to the width GitHub shows it at (846 px on a desktop screen, down to 308 px on a phone; the card itself is 1100 px wide). Whenever you save a file in `src/`, or `config.js`, the card is drawn again and its animation replays; press <kbd>R</kbd> to replay it yourself.

Without an account, the preview uses the sample data from the tests. A real account's stats are fetched from GitHub once, with `GITHUB_TOKEN` from `.env` (see [Development](#development)), and kept in `node_modules/.cache/stats-svg-preview/`, so redrawing costs no API requests. *Reload data* fetches them again.

## How it works

Cards are cached in layers, so a visitor almost never waits for the GitHub API:

1. **Card data** is kept in the [Vercel Runtime Cache](https://vercel.com/docs/runtime-cache), which survives deployments. It counts as fresh for `cache.max_age_seconds` (1 hour) after it was fetched from GitHub. Older data, up to `cache.keep_stale_seconds` (7 days), is still shown right away while fresh data is fetched in the background. If GitHub is down or rate-limited, the last data keeps being shown.
2. **Cards** are cached by Vercel's CDN until their data turns 1 hour old. A card built from older data is kept for only `cache.stale_max_age_seconds` (1 minute), so the next view shows the refreshed numbers. If the function fails, the CDN keeps serving the last card. Every URL is cached on its own, but all cards for one username share the same data, whatever their parameters.
3. **Past years' contribution totals** are cached for 30 days, so a refresh only asks GitHub about the current year.

Only the very first request for a username waits for GitHub. That takes 2-4 seconds for most accounts, because repository pages and contribution years are requested from GitHub side by side. If it takes longer than the request waits, the loading finishes in the background and the card is there on the next view.

**Browsers and GitHub's image proxy are told not to keep a copy** (`Cache-Control: no-store`), so every page view fetches the card from the CDN. This is on purpose: a card's animation starts when the image loads, and a browser that reuses a copy it already has doesn't play the animation from the start again.

Responses include a `Server-Timing` header (visible in the browser's dev tools) showing whether the data was a cache `hit`, `stale` or `miss`, and how long each step took. Runtime Cache is free on the Hobby plan within its monthly limits.

## Development

Requires Node.js 24, the version used on Vercel and in CI (`engines` in `package.json`).

```sh
npm install
cp .env.example .env     # then fill in GITHUB_TOKEN (and STEAM_API_KEY for the Steam endpoint)
npm start                # http://localhost:3000/api/github-status?username=YOUR_USERNAME
npm test
```

| Command | What it does |
| --- | --- |
| `npm start` | Runs the API locally, the same way it runs on Vercel. |
| `npm run preview` | Opens the [design preview](#design-preview): the card on GitHub's backgrounds, redrawn whenever you save. |
| `npm test` | Runs all tests. No network or tokens needed: the GitHub, LeetCode and Steam APIs are mocked. |
| `npm run test:update-snapshots` | Accepts an intentional change to a card's look (see below). |
| `npm run build:fonts` | Re-embeds the files in `/fonts` after you change them. |
| `npm run build:language-aliases` | Regenerates the table of GitHub's language aliases (for `ignore_languages`) from a [Linguist](https://github.com/github-linguist/linguist/releases) release. To update it, pass a newer release tag: `npm run build:language-aliases -- v9.8.0`. |
| `npm run check:deps` | Checks with [knip](https://knip.dev) that `package.json` lists exactly the packages the code uses: none unused, none missing. Also runs before every commit. |

The LeetCode (`/api/leetcode-status`) and Steam (`/api/steam-status`, with a 64-bit Steam ID as `username`) endpoints answer with JSON while their cards are being designed. They work locally, but aren't routed on Vercel yet.

### Snapshot tests

`test/snapshots/github-card.svg` is the GitHub card rendered from fixed sample data (`test/fixtures/github-stats.js`), with the embedded fonts and image replaced by `data:…`. `npm test` fails if the rendered card changes in any way other than whitespace and comments, so refactoring can't alter the design by accident.

When you change the design on purpose, run `npm run test:update-snapshots` and review the snapshot diff in your commit.

### Project structure

```
api/index.js              Vercel entry point: adapts Vercel's (req, res) to src/app.js
config.js                 Colors, sizes, animation timings and caching for the cards
src/
  app.js                  Request handling: routing, username validation, headers, errors
  cards/
    index.js              Registry of all cards and their endpoints
    github/               GitHub card: fetch.js (GitHub API), render.js (SVG), rank.js, languages.js, icons.js
    steam/                Steam endpoint (JSON for now; card design in progress)
    leetcode/             LeetCode endpoint (JSON for now)
  lib/                    Shared building blocks: svg template tag, fonts, HTTP client, errors, retries,
                          store.js (cache with background refresh)
  assets/                 The center image, and the embedded fonts and language aliases (both generated)
fonts/                    Source font files (also served publicly at /fonts/)
scripts/                  Local dev server, design preview, and the scripts that generate the embedded fonts and the alias table
test/                     Tests, fixtures, mocks and snapshots
.github/                  CI (tests), smoke test of each Vercel deployment, Dependabot
```

### Adding a card

1. Create `src/cards/<name>/fetch.js`. It exports `async function (username, { deadline, background })`, which returns the card's data and must finish by `deadline` (epoch milliseconds). Use `fetchJson` and `withRetry` from `src/lib/` for API calls, and throw an `HttpError` for expected failures (e.g. `new HttpError(404, 'User not found')`).
2. Create `src/cards/<name>/render.js`. It exports a function that takes that data, plus the card's options, and returns the SVG string. Build the markup with the `svg` template tag from `src/lib/svg.js`: it escapes every interpolated value, so names and other API text can't break the SVG. Use `fontFaces()` from `src/lib/fonts.js` to embed the shared fonts.
3. Register the card in `src/cards/index.js`, with a `usernamePattern` and a `dataVersion`, and optionally a `parseOptions(url)` that reads display options such as `ignore_languages` from the query. The comment at the top of that file describes each field. Until the card has a `render`, its endpoint answers with the fetched data as JSON.
4. Route it on Vercel by adding a rewrite to `vercel.json` (`/api/<name>` → `/api/index.js`).
5. Add tests: mock the upstream API with `test/helpers/mock-fetch.js`, and add a snapshot test for the rendered card.

## Contributing

Contributions are welcome! Please open an issue to discuss bigger changes, and make sure `npm test` passes before opening a pull request. CI runs the tests on every pull request.

## License

This project is licensed under the MIT License; see the [LICENSE](LICENSE) file for details.

---

Enjoy showcasing your GitHub stats in cyberpunk style! 🚀
