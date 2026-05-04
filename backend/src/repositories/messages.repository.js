import { query, withTransaction } from '../config/db.js';

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Insert a message and its mentions atomically inside one transaction.
 * Returns the raw DB row for the new message.
 */
export const createMessageWithMentions = async (senderId, messageText, mentionedUserIds = []) => {
  return withTransaction(async (client) => {
    // 1. Insert the message
    const { rows: msgRows } = await client.query(
      `INSERT INTO "messages" ("sender_id", "message_text", "created_at", "updated_at")
       VALUES ($1, $2, NOW(), NOW())
       RETURNING *`,
      [senderId, messageText],
    );
    const message = msgRows[0];

    // 2. Insert mention rows (if any)
    if (mentionedUserIds.length > 0) {
      const placeholders = mentionedUserIds
        .map((_, i) => `($1, $${i + 2})`)
        .join(', ');

      await client.query(
        `INSERT INTO "mentions" ("message_id", "mentioned_user_id")
         VALUES ${placeholders}
         ON CONFLICT ("message_id", "mentioned_user_id") DO NOTHING`,
        [message.id, ...mentionedUserIds],
      );
    }

    return message;
  });
};

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Fetch paginated messages, newest first.
 * Each row includes a `mentioned_users` JSON array built from the mentions table.
 */
export const getMessages = async (limit = 50, offset = 0) => {
  const { rows } = await query(
    `SELECT
       m."id",
       m."sender_id",
       m."message_text",
       m."created_at",
       u."name"             AS sender_name,
       u."college_email_id" AS sender_email,
       COALESCE(
         JSON_AGG(
           JSON_BUILD_OBJECT(
             'id',    mu."id",
             'name',  mu."name",
             'email', mu."college_email_id"
           )
         ) FILTER (WHERE mu."id" IS NOT NULL),
         '[]'::json
       ) AS mentioned_users
     FROM "messages" m
     INNER JOIN "users"    u  ON u."id"  = m."sender_id"
     LEFT  JOIN "mentions" mn ON mn."message_id"         = m."id"
     LEFT  JOIN "users"    mu ON mu."id" = mn."mentioned_user_id"
     GROUP BY m."id", m."sender_id", m."message_text", m."created_at",
              u."name", u."college_email_id"
     ORDER BY m."created_at" DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return rows;
};

export const getMessageCount = async () => {
  const { rows } = await query('SELECT COUNT(*) FROM "messages"');
  return parseInt(rows[0].count, 10);
};

// ── User helpers ──────────────────────────────────────────────────────────────

/** Search users by name or either email — used for resolving @mentions. */
export const findUsersByNameOrEmail = async (searchTerm) => {
  const pattern = `%${searchTerm}%`;
  const { rows } = await query(
    `SELECT u."id", u."name", u."college_email_id"
       FROM "users" u
      WHERE u."name"              ILIKE $1
         OR u."college_email_id"  ILIKE $1
         OR u."personal_email_id" ILIKE $1
      ORDER BY u."name" ASC
      LIMIT 10`,
    [pattern],
  );
  return rows.map((r) => ({ id: r.id, name: r.name, email: r.college_email_id }));
};

/** Return all users (for the @mention autocomplete dropdown). */
export const getAllUsers = async () => {
  const { rows } = await query(
    `SELECT u."id", u."name", u."college_email_id"
       FROM "users" u
      ORDER BY u."name" ASC`,
  );
  return rows.map((r) => ({ id: r.id, name: r.name, email: r.college_email_id }));
};