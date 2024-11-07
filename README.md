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
> This project requires a GitHub Personal Access Token (PAT) to access private repositories. Refer to the Manual Deployment section below for how you can get the PAT.

<details>
 <summary><b>Manual Deployment</b></summary>

#### 1. Fork and Prepare the Repository
1. Fork this repository to your GitHub account
2. [Create a Personal Access Token (PAT)](https://github.com/settings/tokens/new)
   - Set the token name (e.g., "stats-svg")
   - Select scopes: `repo` and `user`
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

You can customize the appearance of the SVG by modifying the `config.js` file. This includes changing colors, dimensions, and other visual aspects of the generated image. If you want to modify the SVG code, you can do so in the `/src/card/renderStats.js` file.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request and open an issue.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Enjoy showcasing your GitHub stats in cyberpunk style! 🚀

#Cyberpunk2077 #Cyberpunk:Edgerunners

![GitHub Stats SVG](https://stats-svg.vercel.app/api/github-status?username=gh0stintheshe11)
