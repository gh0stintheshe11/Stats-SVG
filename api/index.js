import fetchGitHubData from '../src/fetch/fetch.js';
import renderStats from '../src/card/renderStats.js';
import renderLang from '../src/card/renderLang.js';

// Add this function above or outside your handler function
async function fetchGitHubDataWithRetry(username, maxRetries = 3, retryDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.time(`fetch data attempt ${attempt + 1}`);
      const data = await fetchGitHubData(username);
      console.timeEnd(`fetch data attempt ${attempt + 1}`);
      return data; // If fetch is successful, return the data
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;
      // Wait for retryDelay milliseconds before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  // After all retries have failed, throw the last error
  throw lastError;
}

// Modify your handler function to use fetchGitHubDataWithRetry
export default async function handler(req, res) {
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