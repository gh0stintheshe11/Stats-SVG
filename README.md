# <i class="fa-brands fa-github fa-spin"></i> Github Stats SVG <i class="fa-solid fa-chart-line fa-fade"></i>

*A highly customizable GitHub stats SVG generator*

This project generates a visually appealing, cyberpunk-styled SVG image displaying GitHub user statistics. It's designed to be embedded in GitHub profiles or other web pages to showcase a user's GitHub activity and contributions.

## Features

- Fetches real-time GitHub user data using the GitHub GraphQL API
- Generates a customizable SVG image with user stats
- Cyberpunk-inspired design with animated elements
- Displays various metrics including commits, PRs, issues, and language usage
- Calculates and displays user rank based on GitHub activity
- Supports custom color schemes and configurations

## Project Structure

The project is organized into several key directories and files:

### `/api`

- `index.js`: The main API handler for processing requests and generating SVGs.

### `/src`

#### `/card`
- `renderStats.js`: Responsible for rendering the SVG based on user stats.

#### `/fetch`
- `fetch.js`: Handles fetching user data from the GitHub API.

#### `/utils`
- `calculateLang.js`: Calculates language usage percentages.
- `calculateRank.js`: Computes the user's rank based on GitHub activity.
- `convertAllFontsToBase64.js`: Utility to convert fonts to Base64 for embedding in SVG.
- `fontsBase64.json`: Stores Base64-encoded font data.
- `icons.js`: Defines icons used in the SVG.

### Root Directory

- `express.js`: Express.js server setup for local development.
- `config.js`: Configuration file for SVG dimensions, colors, and other settings.
- `vercel.json`: Vercel deployment configuration.
- `package.json`: Project dependencies and scripts.
- `LICENSE`: MIT License file.

## Setup and Usage

1. Clone the repository:
   ```
   git clone https://github.com/your-username/github-stats-svg.git
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your GitHub token:
   ```
   GITHUB_TOKEN=your_github_personal_access_token
   ```

4. Run the development server:
   ```
   npm start
   ```

5. Access the API:
   ```
   http://localhost:3000/api/github-status?username=your-github-username
   ```

## Deployment

This project is configured for deployment on Vercel. Click the "Deploy" button below to clone and deploy your own instance of the GitHub Stats SVG generator:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fgithub-stats-svg)

The `vercel.json` file includes the necessary settings for serverless function deployment and routing.

## Customization

You can customize the appearance of the SVG by modifying the `config.js` file. This includes changing colors, dimensions, and other visual aspects of the generated image. If you want to modify the SVG code, you can do so in the `/src/card/renderStats.js` file.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Enjoy showcasing your GitHub stats in cyberpunk style! 🚀

#Cyberpunk2077 #Cyberpunk:Edgerunners

![GitHub Stats SVG](http://localhost:3000/api/github-status?username=gh0stintheshe11)