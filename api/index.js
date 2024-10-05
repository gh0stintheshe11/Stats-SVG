// Import necessary functions
import fetchGitHubData from '../src/fetch/fetch_github.js';
import fetchLeetCodeStats from '../src/fetch/fetch_leetcode.js';
import fetchSteamStatus from '../src/fetch/fetch_steam.js';
import renderStats from '../src/render/render_github.js';

async function fetchGitHubDataWithRetry(username, maxRetries = 5, retryDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const data = await fetchGitHubData(username);
      return data; // If fetch is successful, return the data
    } catch (error) {
      lastError = error; // Update lastError with the most recent error
      console.error(`Attempt ${attempt + 1} failed:`, error.message);
      if (attempt < maxRetries - 1) { // Check if more retries are allowed
        console.log(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay)); // Wait before retrying
      }
    }
  }
  // After all retries have failed, throw the last error
  throw lastError;
}

async function fetchLeetCodeStatsWithRetry(username, maxRetries = 5, retryDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const data = await fetchLeetCodeStats(username);
      return data; // If fetch is successful, return the data
    } catch (error) {
      lastError = error; // Update lastError with the most recent error
      console.error(`Attempt ${attempt + 1} failed:`, error.message);
      if (attempt < maxRetries - 1) { // Check if more retries are allowed
        console.log(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay)); // Wait before retrying
      }
    }
  }
  // After all retries have failed, throw the last error
  throw lastError;
}

async function fetchSteamStatusWithRetry(username, maxRetries = 5, retryDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const data = await fetchSteamStatus(username);
      return data; // If fetch is successful, return the data
    } catch (error) {
      lastError = error; // Update lastError with the most recent error
      console.error(`Attempt ${attempt + 1} failed:`, error.message);
      if (attempt < maxRetries - 1) { // Check if more retries are allowed
        console.log(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay)); // Wait before retrying
      }
    }
  }
  // After all retries have failed, throw the last error
  throw lastError;
}

export default async function handler(req, res) {
  const { username } = req.query;

  try {
    if (req.url.includes('github-status')) {
      const stats = await fetchGitHubDataWithRetry(username);
      //console.log(stats);
      console.time('render stats');
      const svg = await renderStats(stats);
      console.timeEnd('render stats');
      res.setHeader('Content-Type', 'image/svg+xml');
      console.time('send svg');
      res.send(svg);
      console.timeEnd('send svg');

    } else if (req.url.includes('leetcode-status')) {
      console.time('fetch leetcode stats');
      const stats = await fetchLeetCodeStatsWithRetry(username);
      console.timeEnd('fetch leetcode stats');
      console.log(stats);
      res.status(200).json(stats);

    } else if (req.url.includes('steam-status')) {
      console.time('fetch steam status');
      const stats = await fetchSteamStatusWithRetry(username);
      console.timeEnd('fetch steam status');
      console.log(stats);
      res.status(200).json(stats);
    } else {
      res.status(404).send('Not Found');
    }

  } catch (error) {
    console.error('Error in handler:', error);
    // Use error handling specific to your server framework
    // For example, in Express.js:
    if (error.response && error.response.status === 403) {
      res.status(503).send('Service temporarily unavailable due to GitHub API rate limits. Please try again later.');
    } else {
      res.status(500).send('Error fetching data or rendering image');
    }
  }
}