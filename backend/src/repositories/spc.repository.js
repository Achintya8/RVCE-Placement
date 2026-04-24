import { query } from '../config/db.js';

export const findSpcAccountByUsername = async (username) => {
  const { rows } = await query(
    `SELECT s.*, u."name"
      FROM "spc_accounts" s
      INNER JOIN "users" u ON u."id" = s."user_id"
      WHERE s."spc_username" = $1
      LIMIT 1`,
    [username],
  );

  return rows[0] ?? null;
};

export const findSpcAccountForUser = async (userId) => {
  const { rows } = await query(
    'SELECT * FROM "spc_accounts" WHERE "user_id" = $1 LIMIT 1',
    [userId],
  );

  return rows[0] ?? null;
};

