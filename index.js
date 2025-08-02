// index.js
import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import verifyWebhook from './chalenge.js';
import handleMessages from './mensajes.js';
import pg from 'pg';

config();
const app = express();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Middlewares
app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/', (req, res) => res.send('Hello World!'));
app.get('/ping', async (req, res) => {
  const result = await pool.query('SELECT NOW()');
  res.json(result.rows[0]);
});

// Webhook endpoints
app.get('/webhook', verifyWebhook);
app.post('/webhook', handleMessages);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server is running on port ${PORT}`)
);