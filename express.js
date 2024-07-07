import express from 'express';
import fetchGitHubData from './src/fetch/fetch.js';
import renderStats from './src/card/renderStats.js';
import renderLang from './src/card/renderLang.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/github-status/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const stats = await fetchGitHubData(username);
    console.log(stats);
    const svg = renderStats(stats);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (error) {
    console.error('Error fetching data or rendering image:', error);
    res.status(500).send('Error fetching data or rendering image');
  }
});

app.get('/github-languages/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const stats = await fetchGitHubData(username);
    console.log(stats);
    const svg = renderLang(stats);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (error) {
    console.error('Error fetching data or rendering image:', error);
    res.status(500).send('Error fetching data or rendering image');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
