// Local development server, serving the same API as the Vercel deployment.
// Usage: npm start   (then open http://localhost:3000/api/github-status?username=<name>)
// Environment variables are read from a .env file in the project root if it exists (see .env.example).
import http from 'node:http';
import handler from '../api/index.js';

try {
  process.loadEnvFile();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const PORT = Number(process.env.PORT) || 3000;

http
  .createServer((req, res) => {
    handler(req, res).catch((error) => {
      console.error(error);
      res.statusCode = 500;
      res.end('Internal server error');
    });
  })
  .listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
