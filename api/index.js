import fetchGitHubData from '../src/fetch/fetch.js';
import renderStats from '../src/card/renderStats.js';
import renderLang from '../src/card/renderLang.js';
import { withSpeedInsights } from "@vercel/speed-insights";

async function fetchGitHubDataWithRetry(username, maxRetries = 5, retryDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.time(`fetch data attempt ${attempt + 1}`);
      const data = await fetchGitHubData(username);
      console.timeEnd(`fetch data attempt ${attempt + 1}`);
      return data; // If fetch is successful, return the data
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.error('GitHub API rate limit exceeded:', error.message);
        // Consider sending a custom message or handling this case specifically
        throw new Error('Service temporarily unavailable due to GitHub API rate limits. Please try again later.');
      } else {
        console.error('Error fetching data from GitHub:', error.message);
      }
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, retryDelay)); // Delay before retrying
  }

  // After all retries have failed, throw the last error
  throw lastError;
}

async function handler(req, res) {
  const { username } = req.query;

  try {
    console.time('fetch data');
    // Use the retry function instead of directly calling fetchGitHubData
    const stats = await fetchGitHubDataWithRetry(username);
    console.log(stats);
    console.timeEnd('fetch data');
      
    if (req.url.includes('github-status')) {
      console.time('render stats');
      const svg = renderStats(stats);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
      console.timeEnd('render stats');
    } else if (req.url.includes('github-languages')) {
      const svg = renderLang(stats);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    } else {
      res.status(404).send('Not Found');
    }
  } catch (error) {
    console.error('Error fetching data or rendering image:', error);
    res.status(500).send('Error fetching data or rendering image');
  }
}

export default withSpeedInsights(handler);