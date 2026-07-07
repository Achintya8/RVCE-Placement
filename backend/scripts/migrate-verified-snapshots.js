import { query, pool } from '../src/config/db.js';

async function run() {
  console.log('Running verified profile snapshot initialization...');
  try {
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
    console.log(`Successfully initialized snapshots for ${rowCount} verified users.`);
  } catch (error) {
    console.error('Snapshot initialization failed:', error);
  } finally {
    await pool.end();
  }
}

run();
