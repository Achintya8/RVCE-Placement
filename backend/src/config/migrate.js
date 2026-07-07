import { query } from './db.js';

export const runMigrations = async () => {
  console.log('🔄 Checking database migrations...');
  try {
    // 1. Forms table: accepting_responses column
    await query('ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "accepting_responses" BOOLEAN DEFAULT TRUE;');
    
    // 2. Companies table: clean old CGPA columns and add overall CGPA
    await query(`
      ALTER TABLE "companies" 
      DROP COLUMN IF EXISTS "min_pg_cgpa",
      DROP COLUMN IF EXISTS "min_tenth_marks",
      DROP COLUMN IF EXISTS "min_twelfth_marks",
      ADD COLUMN IF NOT EXISTS "min_overall_cgpa" DOUBLE PRECISION;
    `);

    // 3. Companies table: default_consent column
    await query('ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "default_consent" BOOLEAN DEFAULT false;');

    // 3.5 Companies table: min_ug_cgpa column
    await query('ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "min_ug_cgpa" DOUBLE PRECISION;');

    // 3.8 Users table: gender column
    await query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gender" VARCHAR(50);');

    // 4. Users table: rejection and profile snapshot columns
    await query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "rejected" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
      ADD COLUMN IF NOT EXISTS "rejected_fields" JSONB,
      ADD COLUMN IF NOT EXISTS "last_verified_profile" JSONB;
    `);

    // 5. Initialize profile snapshot history for pre-existing verified users
    const { rowCount } = await query(`
      UPDATE "users"
      SET "last_verified_profile" = json_build_object(
        'name', "name",
        'personalEmailId', "personal_email_id",
        'phoneNumber', "phone_number",
        'aadhar', "aadhar",
        'linkedIn', "linkedIn",
        'gitHub', "gitHub",
        'usn', "usn",
        'ugCgpa', "ug_cgpa",
        'firstSemSgpa', "first_sem_sgpa",
        'tenthMarks', "tenth_marks",
        'twelfthMarks', "twelfth_marks",
        'gender', "gender",
        'resumeUrl', "resume_url",
        'profilePictureUrl', "profile_picture_url"
      )
      WHERE "last_verified_profile" IS NULL;
    `);

    if (rowCount > 0) {
      console.log(`📸 Initialized verified snapshots for ${rowCount} users.`);
    }

    console.log('✅ All database migrations verified successfully!');
  } catch (error) {
    console.error('❌ Database migration failed on startup:', error);
  }
};
