/**
 * npm run db
 *
 * Reads database/schema.sql and executes it against the configured DATABASE_URL.
 * Safe to re-run: every statement uses IF NOT EXISTS / DO blocks.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, '..', 'database', 'schema.sql');
const sql = readFileSync(schemaPath, 'utf8');

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  console.log('🔌 Connected to database');

  await client.query(sql);
  console.log('✅ Schema applied successfully — all tables are up to date');
} catch (err) {
  console.error('❌ Failed to apply schema:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
