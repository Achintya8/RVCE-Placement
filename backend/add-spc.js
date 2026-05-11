import bcrypt from 'bcryptjs';
import { pool } from './src/config/db.js';

const run = async () => {
  const username = process.argv[2];
  const password = process.argv[3] || 'password123';

  if (!username) {
    console.error('Usage: node add-spc.js <username> [password]');
    process.exit(1);
  }

  try {
    // Check if user already exists
    const email = `${username}@rvce.edu.in`;
    let userRes = await pool.query('SELECT id FROM "users" WHERE "college_email_id" = $1', [email]);
    
    let userId;
    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
    } else {
      userRes = await pool.query(
        'INSERT INTO "users" ("name", "college_email_id", "verified") VALUES ($1, $2, true) RETURNING id',
        [username, email]
      );
      userId = userRes.rows[0].id;
    }

    const hash = await bcrypt.hash(password, 10);
    
    // Upsert SPC account
    await pool.query(
      `INSERT INTO "spc_accounts" ("user_id", "spc_username", "password") 
       VALUES ($1, $2, $3) 
       ON CONFLICT ("spc_username") DO UPDATE SET "password" = $3, "user_id" = $1`,
      [userId, username, hash]
    );
    console.log(`Successfully created SPC account!\nUsername: ${username}\nPassword: ${password}`);
  } catch (error) {
    console.error('Error creating SPC account:', error.message);
  } finally {
    process.exit(0);
  }
};

run();
