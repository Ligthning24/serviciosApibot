import pg from 'pg';
import { env } from './env.js';

export const pool = new pg.Pool({
  connectionString: env.dbUrl,
  // ssl: { rejectUnauthorized: false } // habilita si tu proveedor lo requiere
});
