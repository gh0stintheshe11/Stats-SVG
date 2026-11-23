# <i class="fa-brands fa-github fa-spin"></i>Stats SVG<i class="fa-solid fa-chart-line fa-fade"></i>

*A highly customizable stats SVG generator*

This project generates a visually appealing, highly customizable SVG image displaying GitHub user statistics. It's designed to be embedded in GitHub profiles or other web pages to showcase a user's GitHub activity and contributions.

> [!WARNING]
> This project is still under development so it may contain bugs and other issues. I'm actively testing it and fixing bugs as I find them. Feel free to sync with the latest code if you want to stay updated. Also, Any bugs/issues report is appreciated :)

## Features

- Fetches real-time GitHub user data using the GitHub GraphQL API
- Generates a customizable SVG image with user stats, displaying various metrics including commits, language usage, and many more
- Supports custom color schemes, configurations, and animated elements
- For ranking and language usage calculation, this repo uses the same algorithm as arguably the most famous README card repo on GitHub, [anuraghazra/github-readme-stats](https://github.com/anuraghazra/github-readme-stats), to maintain consistency with the same standard.

## Deployment

Since the GitHub API only allows 5k requests per hour, the api provided by this repo could possibly hit the rate limiter. You can host your own instance of this repo on Vercel to avoid the rate limiter.

> [!IMPORTANT]
> This project requires a GitHub Personal Access Token (PAT) to call the GitHub GraphQL API. Refer to the Manual Deployment section below for how you can get the PAT and which scopes it needs.

<details>
 <summary><b>Manual Deployment</b></summary>

#### 1. Fork and Prepare the Repository
1. Fork this repository to your GitHub account
2. [Create a Personal Access Token (PAT)](https://github.com/settings/tokens/new)
   - Set the token name (e.g., "stats-svg")
   - Scopes: **leave every scope unchecked**. The app only reads data, and a token without scopes can read everything shown on the card for public repositories.
   - Only if you want your own private repositories counted, check `repo`. Be aware that `repo` grants full read **and write** access to all your private repositories, and that your card will publicly show stats derived from them (repo count, stars, languages). The `user` scope is never needed.
   - Copy the generated token (you won't see it again so save it!)

#### 2. Deploy to Vercel
1. Visit [Vercel](https://vercel.com/)
2. Sign up/Log in with your GitHub account
3. From your Vercel dashboard:
   - Click `Add New...` → `Project`
   - Select the forked repository
   - Click `Import`

#### 3. Configure Environment Variables
1. In the project configuration screen:
   - Expand the `Environment Variables` section
   - Add a new variable:
     - Name: `GITHUB_TOKEN`
     - Value: Your GitHub PAT from step 1
     - Environments: Production **and** Preview, so preview deployments (and the smoke test) work too
   - Optional, recommended for personal instances: add `ALLOWED_USERNAMES` with a comma-separated list of usernames (e.g., `your-username`). Requests for any other username get a `403`, so strangers can't use up your token's API quota.
2. Click `Deploy`

`vercel.json` turns on [Fluid compute](https://vercel.com/docs/fluid-compute), which pre-warms the function and caches its compiled code, so cold starts are rare and short. The Node.js version comes from `engines` in `package.json`.

#### 4. Using Your Instance
- Once deployed, Vercel will provide you with a domain (e.g., `your-project.vercel.app`)
- You can use your instance by replacing the domain in the API URL:
  ```
  https://your-project.vercel.app/api/github-status?username=YOUR_GITHUB_USERNAME
  ```

#### Optional: only release deployments that pass the tests
By default Vercel releases every build of `main`, even if the tests fail. Two GitHub Actions workflows can gate it: **CI** runs the unit tests, and **Smoke test** requests a real card from each new deployment. To make production wait for them:
1. **Give the smoke test access** (skip if Deployment Protection is off): in Vercel, open Project Settings → Deployment Protection → *Protection Bypass for Automation*, create a secret, and add it to your GitHub repository as the Actions secret `VERCEL_AUTOMATION_BYPASS_SECRET`. Until then the smoke test only prints a warning and reports nothing.
2. If `ALLOWED_USERNAMES` doesn't include your GitHub username, set the GitHub Actions variable `SMOKE_TEST_USERNAME` to a username it does include.
3. Push to `main` once, so both workflows have run, then open Project Settings → Build and Deployment → *Deployment Checks* → *Add Checks* → GitHub, and select **test** and **Smoke test (production)**.

From then on, a production deployment only goes live after both checks pass; otherwise the previous deployment stays live.

#### Troubleshooting
- For issues, check Vercel's deployment logs or open an issue in this repository

</details>

## Customization

You can customize the appearance of the SVG by modifying the `config.js` file. This includes changing colors, dimensions, and other visual aspects of the generated image. If you want to modify the SVG code, you can do so in the `src/cards/github/render.js` file.

If you change the fonts in `/fonts`, regenerate the embedded copies with `npm run build:fonts`. Cards embed a WOFF2 subset with Latin characters (including Vietnamese); text in other scripts is drawn with a fallback font.

### Caching

Cards are cached in layers, so a visitor almost never waits for the GitHub API:

1. **Card data** is kept in the [Vercel Runtime Cache](https://vercel.com/docs/runtime-cache), which survives deployments. It counts as fresh for `cache.max_age_seconds` (1 hour) after it was fetched from GitHub. Older data, up to `cache.keep_stale_seconds` (7 days), is still shown right away while fresh data is fetched in the background. If GitHub is down or rate-limited, the last data simply keeps being shown.
2. **Cards** are cached by Vercel's CDN until their data turns 1 hour old. A card built from older data is kept for only `cache.stale_max_age_seconds` (1 minute), so the next view shows the refreshed numbers. If the function fails, the CDN keeps serving the last card.
3. **Past years' contribution totals** are cached for 30 days, so a refresh only asks GitHub about the current year.

Only the very first request for a username waits for GitHub. A card that hasn't been viewed for a while shows its last known numbers immediately, and the current ones when it is viewed again a minute later.

**Browsers and GitHub's image proxy are told not to keep a copy** (`Cache-Control: no-store`), so every page view fetches the card from the CDN. This is on purpose: a card's animation starts when the image is loaded, and a browser that reuses a copy it already has does not play the animation from the start again.

Responses include a `Server-Timing` header (visible in the browser's dev tools) showing whether the data was a cache `hit`, `stale` or `miss`, and how long each step took. Runtime Cache is free on the Hobby plan within its monthly limits.

## Development

Requires Node.js 24, the version used on Vercel and in CI (`engines` in `package.json`).

```sh
npm install
cp .env.example .env     # then fill in GITHUB_TOKEN (and STEAM_API_KEY for the Steam endpoint)
npm start                # http://localhost:3000/api/github-status?username=YOUR_GITHUB_USERNAME
npm test
```

| Command | What it does |
| --- | --- |
| `npm start` | Runs the API locally, the same way it runs on Vercel. |
| `npm test` | Runs all tests. No network or tokens needed: the GitHub, LeetCode and Steam APIs are mocked. |
| `npm run test:update-snapshots` | Accepts an intentional change to a card's look (see below). |
| `npm run build:fonts` | Re-embeds the files in `/fonts` after you change them. |
| `npm run check:deps` | Lists dependencies in `package.json` that the code no longer uses. Also runs before every commit. |

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
  assets/                 Embedded fonts (generated) and the center image
fonts/                    Source font files (also served publicly at /fonts/)
scripts/                  Local dev server and the font embedding script
test/                     Tests, fixtures, mocks and snapshots
.github/                  CI (tests), smoke test of each Vercel deployment, Dependabot
```

### Adding a card

1. Create `src/cards/<name>/fetch.js`. It exports `async function (username, { deadline })` that returns the data for the card. Use `fetchJson` and `withRetry` from `src/lib/` for API calls, and throw an `HttpError` for expected failures (e.g. `new HttpError(404, 'User not found')`).
2. Create `src/cards/<name>/render.js`. It exports a function that takes that data and returns the SVG string. Build markup with the `svg` template tag from `src/lib/svg.js`: it escapes every interpolated value, so names and other API text can't break the SVG. Use `fontFaces()` from `src/lib/fonts.js` to embed the shared fonts.
3. Register the card in `src/cards/index.js` with a `usernamePattern`. Until it has a `render`, the endpoint answers with the fetched data as JSON.
4. Expose it on Vercel by adding a rewrite in `vercel.json` (`/api/<name>` → `/api/index.js`).
5. Add tests: mock the upstream API with `test/helpers/mock-fetch.js`, and add a snapshot test for the rendered card.

## Contributing

Contributions are welcome! Please open an issue to discuss bigger changes, and make sure `npm test` passes before opening a Pull Request. CI runs the tests on every pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Enjoy showcasing your GitHub stats in cyberpunk style! 🚀

#Cyberpunk2077 #Cyberpunk:Edgerunners

![GitHub Stats SVG](https://stats-svg.vercel.app/api/github-status?username=gh0stintheshe11)
