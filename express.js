import express from 'express';
import handler from './api/index.js';

const app = express();

app.get('/api/:action', handler); // Setup a route that matches your API's expected URL structure

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
