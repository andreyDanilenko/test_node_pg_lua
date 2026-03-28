import pg from 'pg';
import { databaseUrl } from './index.js';

const { Pool } = pg;

export function createPool(): pg.Pool {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 20,
    connectionTimeoutMillis: 10_000,
  });

  pool.on('connect', () => {
    console.log('Connected to PostgreSQL');
  });

  pool.on('error', (err) => {
    console.error('Database error:', err);
  });

  return pool;
}
