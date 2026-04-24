import { query } from '../config/db.js';

const normalizeApplication = (row) => ({
  id: row.id,
  studentId: row.student_id,
  companyId: row.company_id,
  consent: row.consent,
  tracker: row.tracker,
  companyName: row.company_name,
});

export const upsertApplication = async ({ studentId, companyId, consent, tracker }) => {
  const { rows: existingRows } = await query(
    `SELECT * FROM "applications"
      WHERE "student_id" = $1 AND "company_id" = $2
      ORDER BY "id" ASC
      LIMIT 1`,
    [studentId, companyId],
  );

  if (existingRows[0]) {
    const existing = existingRows[0];
    const { rows } = await query(
      `UPDATE "applications"
        SET "consent" = $2,
            "tracker" = $3
        WHERE "id" = $1
        RETURNING *`,
      [
        existing.id,
        consent ?? existing.consent,
        tracker ?? existing.tracker,
      ],
    );

    return normalizeApplication(rows[0]);
  }

  const { rows } = await query(
    `INSERT INTO "applications" (
      "student_id",
      "company_id",
      "consent",
      "tracker"
    ) VALUES ($1, $2, $3, $4)
    RETURNING *`,
    [studentId, companyId, consent ?? null, tracker ?? null],
  );

  return normalizeApplication(rows[0]);
};

export const listApplicationsForStudent = async (studentId) => {
  const { rows } = await query(
    `SELECT a.*, c."name" AS company_name
      FROM "applications" a
      INNER JOIN "companies" c ON c."id" = a."company_id"
      WHERE a."student_id" = $1
      ORDER BY a."id" DESC`,
    [studentId],
  );

  return rows.map(normalizeApplication);
};

