import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const MIGRATIONS_TABLE = '_migrations';
const MIGRATIONS_LOCK_KEY = 874_321_905; // arbitrary constant for pg_advisory_lock

function listMigrationFiles(migrationsDir: string): string[] {
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = listMigrationFiles(migrationsDir);

    await client.query('SELECT pg_advisory_lock($1)', [MIGRATIONS_LOCK_KEY]);
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
          name TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      const appliedRes = await client.query<{ name: string }>(
        `SELECT name FROM ${MIGRATIONS_TABLE}`
      );
      const applied = new Set(appliedRes.rows.map((r) => r.name));

      // If this project existed before we introduced migrations history,
      // the DB may already contain objects from old "dumb" runs.
      // In that case, we baseline by marking all migration files as applied.
      if (applied.size === 0) {
        const usersTableRes = await client.query<{ reg: string | null }>(
          `SELECT to_regclass('public.users') AS reg`
        );
        const dbLooksInitialized = usersTableRes.rows[0]?.reg !== null;

        if (dbLooksInitialized && files.length > 0) {
          await client.query('BEGIN');
          try {
            for (const file of files) {
              await client.query(
                `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
                [file]
              );
            }
            await client.query('COMMIT');
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          }

          console.log(
            `Baseline complete: DB already had schema; marked ${files.length} migration(s) as applied.`
          );
          return;
        }
      }

      let appliedCount = 0;
      for (const file of files) {
        if (applied.has(file)) continue;

        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query(
            `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`,
            [file]
          );
          await client.query('COMMIT');
          appliedCount += 1;
          console.log(`✅ Completed: ${file}`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }

      if (appliedCount === 0) {
        console.log('No new migrations to apply.');
      } else {
        console.log(`🎉 Applied ${appliedCount} new migration(s)!`);
      }
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATIONS_LOCK_KEY]);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
