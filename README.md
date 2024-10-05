# <i class="fa-brands fa-github fa-spin"></i>Stats<i class="fa-solid fa-chart-line fa-fade"></i>

*A highly customizable GitHub stats SVG generator*

This project generates a visually appealing, highly customizable SVG image displaying GitHub user statistics. It's designed to be embedded in GitHub profiles or other web pages to showcase a user's GitHub activity and contributions.

## Features

- Fetches real-time GitHub user data using the GitHub GraphQL API
- Generates a customizable SVG image with user stats, displaying various metrics including commits, language usage, and many more
- Supports custom color schemes, configurations, and animated elements
- For ranking and language usage calculation, this repo uses the same algorithm as arguably the most famous README card repo on GitHub, [anuraghazra/github-readme-stats](https://github.com/anuraghazra/github-readme-stats), to maintain consistency with the same standard.

## Deployment

This project is configured for deployment on Vercel. Follow these steps to deploy your own instance of the GitHub Stats SVG generator:

1. Generate a GitHub Personal Access Token (PAT):
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Click "Generate new token" and select the necessary scopes (at minimum, `public_repo` and `read:user`)
   - Copy the generated token

2. Click the "Deploy" button below to clone and deploy the project on Vercel:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fgithub-stats-svg)

3. During the Vercel deployment process:
   - Set the `GITHUB_TOKEN` environment variable with your generated PAT
   - Update any other necessary configuration settings

4. After deployment, update the SVG URL in your projects or profile README:
   ```
   ![GitHub Stats SVG](https://your-vercel-deployment-url.vercel.app/api/github-status?username=your-github-username)
   ```
   Replace `your-vercel-deployment-url` with your actual Vercel deployment URL and `your-github-username` with your GitHub username.

The `vercel.json` file includes the necessary settings for serverless function deployment and routing.

## Customization

You can customize the appearance of the SVG by modifying the `config.js` file. This includes changing colors, dimensions, and other visual aspects of the generated image. If you want to modify the SVG code, you can do so in the `/src/card/renderStats.js` file.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request and open an issue.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Enjoy showcasing your GitHub stats in cyberpunk style! 🚀

#Cyberpunk2077 #Cyberpunk:Edgerunners

![GitHub Stats SVG](https://github-stats-svg.vercel.app/api/github-status?username=gh0stintheshe11)