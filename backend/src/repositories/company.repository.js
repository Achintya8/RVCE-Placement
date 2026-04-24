import { query } from '../config/db.js';

const normalizeCompany = (row) => ({
  id: row.id,
  name: row.name,
  minCgpa: row.min_cgpa,
  stipend: row.stipend,
  package: row.package,
  testDate: row.test_date,
  interviewDate: row.interview_date,
  createdBy: row.created_by,
  createdAt: row.created_at,
  consent: row.application_consent,
  tracker: row.application_tracker,
});

export const createCompany = async (payload) => {
  const { rows } = await query(
    `INSERT INTO "companies" (
      "name",
      "min_cgpa",
      "stipend",
      "package",
      "test_date",
      "interview_date",
      "created_by",
      "created_at"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *`,
    [
      payload.name,
      payload.minCgpa,
      payload.stipend,
      payload.package,
      payload.testDate,
      payload.interviewDate,
      payload.createdBy,
    ],
  );

  return normalizeCompany(rows[0]);
};

export const listCompanies = async (studentId) => {
  const params = [];
  let joins = '';

  if (studentId) {
    params.push(studentId);
    joins = `LEFT JOIN "applications" a
      ON a."company_id" = c."id" AND a."student_id" = $1`;
  }

  const { rows } = await query(
    `SELECT c.*,
        ${studentId ? 'a."consent" AS application_consent, a."tracker" AS application_tracker' : 'NULL AS application_consent, NULL AS application_tracker'}
      FROM "companies" c
      ${joins}
      ORDER BY c."created_at" DESC NULLS LAST, c."id" DESC`,
    params,
  );

  return rows.map(normalizeCompany);
};

export const findCompanyById = async (companyId, studentId = null) => {
  const params = [companyId];
  let joins = '';

  if (studentId) {
    params.push(studentId);
    joins = `LEFT JOIN "applications" a
      ON a."company_id" = c."id" AND a."student_id" = $2`;
  }

  const { rows } = await query(
    `SELECT c.*,
      ${studentId ? 'a."consent" AS application_consent, a."tracker" AS application_tracker' : 'NULL AS application_consent, NULL AS application_tracker'}
      FROM "companies" c
      ${joins}
      WHERE c."id" = $1
      LIMIT 1`,
    params,
  );

  return rows[0] ? normalizeCompany(rows[0]) : null;
};

export const listEligibleStudentsForCompany = async (companyId) => {
  const { rows } = await query(
    `SELECT u."id",
        u."name",
        u."college_email_id",
        u."personal_email_id",
        u."ug_cgpa",
        u."resume_url",
        a."consent",
        a."tracker"
      FROM "applications" a
      INNER JOIN "users" u ON u."id" = a."student_id"
      INNER JOIN "companies" c ON c."id" = a."company_id"
      WHERE a."company_id" = $1
        AND a."consent" = TRUE
        AND (c."min_cgpa" IS NULL OR u."ug_cgpa" >= c."min_cgpa")
      ORDER BY u."name" ASC NULLS LAST`,
    [companyId],
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    collegeEmailId: row.college_email_id,
    personalEmailId: row.personal_email_id,
    ugCgpa: row.ug_cgpa,
    resumeUrl: row.resume_url,
    consent: row.consent,
    tracker: row.tracker,
  }));
};

