import bcrypt from 'bcryptjs';
import { pool } from './src/config/db.js';

const run = async () => {
  const hash = await bcrypt.hash('password123', 10);
  await pool.query('UPDATE "spc_accounts" SET "password" = $1 WHERE "spc_username" = $2', [hash, 'Achintya']);
  console.log('Password reset to: password123');
  process.exit(0);
};

run();
