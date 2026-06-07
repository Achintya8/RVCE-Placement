import { query, pool } from '../src/config/db.js';

async function run() {
  console.log('Running rejection and history database migration...');
  try {
    await query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "rejected" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
      ADD COLUMN IF NOT EXISTS "rejected_fields" JSONB,
      ADD COLUMN IF NOT EXISTS "last_verified_profile" JSONB;
    `);
    console.log('Migration successful: Rejection and profile history fields added to "users" table.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

run();
