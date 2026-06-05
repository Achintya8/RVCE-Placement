import { query, pool } from '../src/config/db.js';

async function run() {
  console.log('Running academic criteria database migration...');
  try {
    await query(`
      ALTER TABLE "companies" 
      DROP COLUMN IF EXISTS "min_pg_cgpa",
      DROP COLUMN IF EXISTS "min_tenth_marks",
      DROP COLUMN IF EXISTS "min_twelfth_marks",
      ADD COLUMN IF NOT EXISTS "min_overall_cgpa" DOUBLE PRECISION;
    `);
    console.log('Migration successful: Columns dropped and "min_overall_cgpa" added to "companies" table.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

run();
