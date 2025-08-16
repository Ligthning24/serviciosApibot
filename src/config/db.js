// src/config/db.js
import pg from 'pg';
import { env } from './env.js';

export const pool = new pg.Pool({
  connectionString: env.dbUrl,
  // ssl: { rejectUnauthorized: false }, // si tu proveedor lo requiere
  max: 10,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 5_000
});
