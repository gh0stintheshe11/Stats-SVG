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
   - Optional, recommended for personal instances: add `ALLOWED_USERNAMES` with a comma-separated list of usernames (e.g., `your-username`). Requests for any other username get a `403`, so strangers can't use up your token's API quota.
2. Click `Deploy`

#### 4. Using Your Instance
- Once deployed, Vercel will provide you with a domain (e.g., `your-project.vercel.app`)
- You can use your instance by replacing the domain in the API URL:
  ```
  https://your-project.vercel.app/api/github-status?username=YOUR_GITHUB_USERNAME
  ```

#### Troubleshooting
- For issues, check Vercel's deployment logs or open an issue in this repository

</details>

## Customization

You can customize the appearance of the SVG by modifying the `config.js` file. This includes changing colors, dimensions, and other visual aspects of the generated image. If you want to modify the SVG code, you can do so in the `src/cards/github/render.js` file.

Responses are cached for one hour by browsers, GitHub's image proxy and the Vercel CDN, so repeat views don't call the GitHub API. Change `cache.max_age_seconds` in `config.js` to adjust this. A new deployment clears the Vercel CDN cache.

If you change the fonts in `/fonts`, regenerate the embedded copies with `npm run build:fonts`.

## Development

Requires Node.js 20.12 or newer.

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
  lib/                    Shared building blocks: svg template tag, fonts, HTTP client, errors, retries, cache
  assets/                 Embedded fonts (generated) and the center image
fonts/                    Source font files (also served publicly at /fonts/)
scripts/                  Local dev server and the font embedding script
test/                     Tests, fixtures, mocks and snapshots
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
