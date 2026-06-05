import { query } from '../config/db.js';
import { normalizeUrl } from '../utils/url.js';

const normalizeUser = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    collegeEmailId: row.college_email_id,
    personalEmailId: row.personal_email_id,
    phoneNumber: row.phone_number ? row.phone_number.toString() : '',
    aadhar: row.aadhar,
    linkedIn: row.linkedIn,
    gitHub: row.gitHub,
    usn: row.usn,
    googleId: row.google_id,
    ugCgpa: row.ug_cgpa,
    firstSemSgpa: row.first_sem_sgpa,
    tenthMarks: row.tenth_marks,
    twelfthMarks: row.twelfth_marks,
    resumeUrl: normalizeUrl(row.resume_url),
    profilePictureUrl: normalizeUrl(row.profile_picture_url),
    verified: row.verified ?? false,
    unlockRequested: row.unlock_requested ?? false,
    placed: row.placed ?? false,
    gender: row.gender ?? null,
    createdAt: row.created_at,
  };
};

export const findUserById = async (userId) => {
  const { rows } = await query('SELECT * FROM "users" WHERE "id" = $1 LIMIT 1', [userId]);
  return normalizeUser(rows[0]);
};

export const findUserByGoogleId = async (googleId) => {
  const { rows } = await query('SELECT * FROM "users" WHERE "google_id" = $1 LIMIT 1', [googleId]);
  return normalizeUser(rows[0]);
};

export const findUserByAnyEmail = async (email) => {
  const { rows } = await query(
    'SELECT * FROM "users" WHERE "college_email_id" = $1 OR "personal_email_id" = $1 LIMIT 1',
    [email],
  );
  return normalizeUser(rows[0]);
};

export const createGoogleUser = async ({ name, email, googleId, profilePictureUrl }) => {
  const { rows } = await query(
    `INSERT INTO "users" (
      "name",
      "college_email_id",
      "google_id",
      "profile_picture_url",
      "verified",
      "created_at"
    ) VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *`,
    [name, email, googleId, profilePictureUrl ?? null, false],
  );

  return normalizeUser(rows[0]);
};

export const attachGoogleIdentity = async ({ userId, name, email, googleId, profilePictureUrl }) => {
  const { rows } = await query(
    `UPDATE "users"
      SET "name" = COALESCE($2, "name"),
          "college_email_id" = COALESCE("college_email_id", $3),
          "google_id" = $4,
          "profile_picture_url" = COALESCE("profile_picture_url", $5)
    WHERE "id" = $1
    RETURNING *`,
    [userId, name, email, googleId, profilePictureUrl ?? null],
  );

  return normalizeUser(rows[0]);
};

export const updateUserProfile = async (userId, payload) => {
  const phoneNum = payload.phoneNumber ? payload.phoneNumber : null;

  const { rows } = await query(
    `UPDATE "users"
      SET "name" = $2,
          "college_email_id" = $3,
          "personal_email_id" = $4,
          "phone_number" = $5,
          "aadhar" = $6,
          "linkedIn" = $7,
          "gitHub" = $8,
          "usn" = $9,
          "ug_cgpa" = $10,
          "first_sem_sgpa" = $11,
          "tenth_marks" = $12,
          "twelfth_marks" = $13,
          "gender" = $14
    WHERE "id" = $1
    RETURNING *`,
    [
      userId,
      payload.name,
      payload.collegeEmailId,
      payload.personalEmailId,
      phoneNum,
      payload.aadhar,
      payload.linkedIn,
      payload.gitHub,
      payload.usn,
      payload.ugCgpa,
      payload.firstSemSgpa,
      payload.tenthMarks,
      payload.twelfthMarks,
      payload.gender ?? null,
    ],
  );

  return normalizeUser(rows[0]);
};

export const updateUserResume = async (userId, resumeUrl) => {
  const { rows } = await query(
    'UPDATE "users" SET "resume_url" = $2 WHERE "id" = $1 RETURNING *',
    [userId, resumeUrl],
  );

  return normalizeUser(rows[0]);
};

export const updateUserProfilePicture = async (userId, profilePictureUrl) => {
  const { rows } = await query(
    'UPDATE "users" SET "profile_picture_url" = $2 WHERE "id" = $1 RETURNING *',
    [userId, profilePictureUrl],
  );

  return normalizeUser(rows[0]);
};

export const updateUserGoogleProfilePicture = async (userId, profilePictureUrl) => {
  const { rows } = await query(
    `UPDATE "users"
      SET "profile_picture_url" = COALESCE("profile_picture_url", $2)
    WHERE "id" = $1
    RETURNING *`,
    [userId, profilePictureUrl],
  );

  return normalizeUser(rows[0]);
};

export const updateUserVerification = async (userId, verified) => {
  const { rows } = await query(
    'UPDATE "users" SET "verified" = $2 WHERE "id" = $1 RETURNING *',
    [userId, verified],
  );

  return normalizeUser(rows[0]);
};

export const requestProfileUnlock = async (userId) => {
  const { rows } = await query(
    'UPDATE "users" SET "unlock_requested" = true WHERE "id" = $1 RETURNING *',
    [userId]
  );
  return normalizeUser(rows[0]);
};

export const approveProfileUnlock = async (userId) => {
  const { rows } = await query(
    'UPDATE "users" SET "verified" = false, "unlock_requested" = false WHERE "id" = $1 RETURNING *',
    [userId]
  );
  return normalizeUser(rows[0]);
};

export const listStudents = async ({ verified } = {}) => {
  const conditions = [];
  const params = [];

  if (typeof verified === 'boolean') {
    params.push(verified);
    conditions.push(`"verified" = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT * FROM "users"
      ${whereClause}
      ORDER BY "verified" ASC, "created_at" DESC NULLS LAST, "id" DESC`,
    params,
  );

  return rows.map(normalizeUser);
};

export const listStudentIds = async () => {
  const { rows } = await query('SELECT "id" FROM "users" ORDER BY "id" ASC');
  return rows.map((row) => row.id);
};

export const listEligibleStudentIds = async (companyId) => {
  const { rows } = await query(
    `SELECT DISTINCT u."id"
      FROM "users" u
      INNER JOIN "companies" c ON c."id" = $1
      WHERE c."min_cgpa" IS NULL OR u."ug_cgpa" >= c."min_cgpa"
      ORDER BY u."id" ASC`,
    [companyId],
  );

  return rows.map((row) => row.id);
};

export const updateUserPlacedStatus = async (userId, placed) => {
  const { rows } = await query(
    'UPDATE "users" SET "placed" = $2 WHERE "id" = $1 RETURNING *',
    [userId, placed],
  );
  return normalizeUser(rows[0]);
};

