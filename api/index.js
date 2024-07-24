// Import necessary functions
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetchGitHubData from '../src/fetch/fetch.js';
import renderStats from '../src/card/renderStats.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the base64 encoded fonts
const fontsBase64 = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/utils/fontsBase64.json'), 'utf8'));

const rajdhaniFontBase64 = fontsBase64['Rajdhani-Regular'];
const chakraPetchFontBase64 = fontsBase64['ChakraPetch-Regular'];
const libreBarcodeFontBase64 = fontsBase64['LibreBarcode128-Regular'];

// Function to fetch GitHub data with retry logic
async function fetchGitHubDataWithRetry(username, maxRetries = 5, retryDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.time(`fetch data attempt ${attempt + 1}`);
      const data = await fetchGitHubData(username);
      console.timeEnd(`fetch data attempt ${attempt + 1}`);
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
    console.time('fetch data');
    const stats = await fetchGitHubDataWithRetry(username);
    console.log(stats);
    console.timeEnd('fetch data');
      
    if (req.url.includes('github-status')) {
      console.time('render stats');
      const svg = renderStats(stats, {
        rajdhaniFontBase64,
        chakraPetchFontBase64,
        libreBarcodeFontBase64,
      });
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
      console.timeEnd('render stats');
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