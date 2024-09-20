## Project Structure

The project is organized into several key directories and files:

### `/api`

- `index.js`: The main API handler for processing requests and generating SVGs.

### `/src`

##### `/card`
- `renderStats.js`: Responsible for rendering the SVG based on user stats.

##### `/fetch`
- `fetch.js`: Handles fetching user data from the GitHub API.

##### `/utils`
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