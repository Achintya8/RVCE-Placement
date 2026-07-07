import { query, pool } from '../src/config/db.js';

async function run() {
  console.log('Running default consent database migration...');
  try {
    await query(`
      ALTER TABLE "companies" 
      ADD COLUMN IF NOT EXISTS "default_consent" BOOLEAN DEFAULT false;
    `);
    console.log('Migration successful: "default_consent" added to "companies" table.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

run();
