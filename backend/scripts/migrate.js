import { query } from '../src/config/db.js';

async function migrate() {
  try {
    console.log('Running database migration...');
    await query('ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "accepting_responses" BOOLEAN DEFAULT TRUE;');
    console.log('✅ Successfully added accepting_responses column to forms table!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
