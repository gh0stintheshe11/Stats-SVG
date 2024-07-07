import fetchGitHubData from '../src/fetch/fetch.js';
import renderStats from '../src/card/renderStats.js';
import renderLang from '../src/card/renderLang.js';

export default async function handler(req, res) {
  const { username } = req.query;
  
  try {
    const stats = await fetchGitHubData(username);
    
    if (req.url.includes('github-status')) {
      const svg = renderStats(stats);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
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