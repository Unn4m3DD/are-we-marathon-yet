import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

// Auto-create tables on first run - idempotent, safe to run on every startup
async function ensureTables() {
  try {
    // Create tables if they don't exist (idempotent)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS athlete_profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id),
        distance_unit TEXT NOT NULL DEFAULT 'km',
        min_run_days_per_week INTEGER NOT NULL DEFAULT 2,
        max_run_days_per_week INTEGER NOT NULL DEFAULT 6,
        current_fls REAL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        date INTEGER NOT NULL,
        distance REAL NOT NULL,
        duration_seconds INTEGER NOT NULL,
        perceived_effort INTEGER NOT NULL,
        fls_after_run REAL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    console.log('Database tables ensured');
  } catch (err) {
    console.error('Failed to ensure tables:', err);
    // Don't throw - let the app start anyway, failures will show up in usage
  }
}

// Fire and forget - don't block startup
ensureTables();

export * from './schema';
