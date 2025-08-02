// index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';

import verifyWebhook from './chalenge.js';
import handleMessages from './mensajes.js';

const app = express();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors());
app.use(express.json());

// Healthchecks
app.get('/', (req, res) => res.send('Server up'));
app.get('/ping', async (_, res) => {
  const result = await pool.query('SELECT NOW()');
  res.json(result.rows[0]);
});

// Webhook
app.get('/webhook', verifyWebhook);
app.post('/webhook', handleMessages);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
