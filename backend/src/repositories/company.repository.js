import { query } from '../config/db.js';

const normalizeCompany = (row) => ({
  id: row.id,
  name: row.name,
  minCgpa: row.min_cgpa,
  minOverallCgpa: row.min_overall_cgpa,
  stipend: row.stipend,
  package: row.package,
  testDate: row.test_date,
  interviewDate: row.interview_date,
  createdBy: row.created_by,
  createdAt: row.created_at,
  status: row.status,
  deadline: row.deadline,
  consent: row.application_consent,
  tracker: row.application_tracker,
  consentBlocked: row.consent_blocked ?? false,
  trackerBlocked: row.tracker_blocked ?? false,
  defaultConsent: row.default_consent ?? false,
});

export const createCompany = async (payload) => {
  const { rows } = await query(
    `INSERT INTO "companies" (
      "name",
      "min_cgpa",
      "min_overall_cgpa",
      "stipend",
      "package",
      "test_date",
      "interview_date",
      "deadline",
      "default_consent",
      "created_by",
      "created_at"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    RETURNING *`,
    [
      payload.name,
      payload.minCgpa,
      payload.minOverallCgpa || null,
      payload.stipend,
      payload.package,
      payload.testDate,
      payload.interviewDate,
      payload.deadline,
      payload.defaultConsent ?? false,
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
        ${studentId ? 'COALESCE(a."consent", c."default_consent") AS application_consent, a."tracker" AS application_tracker' : 'NULL AS application_consent, NULL AS application_tracker'}
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
      ${studentId ? 'COALESCE(a."consent", c."default_consent") AS application_consent, a."tracker" AS application_tracker' : 'NULL AS application_consent, NULL AS application_tracker'}
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
        COALESCE(a."consent", c."default_consent") AS "consent",
        a."tracker"
      FROM "users" u
      CROSS JOIN "companies" c
      LEFT JOIN "applications" a ON a."student_id" = u."id" AND a."company_id" = c."id"
      WHERE c."id" = $1
        AND COALESCE(a."consent", c."default_consent") = TRUE
        AND (c."min_cgpa" IS NULL OR COALESCE(NULLIF(u."first_sem_sgpa", 0), u."ug_cgpa") >= c."min_cgpa")
        AND (
          c."min_overall_cgpa" IS NULL OR (
            u."ug_cgpa" >= c."min_overall_cgpa"
            AND (u."first_sem_sgpa" IS NULL OR u."first_sem_sgpa" >= c."min_overall_cgpa")
            AND (u."tenth_marks" IS NULL OR u."tenth_marks" >= c."min_overall_cgpa" * 10)
            AND (u."twelfth_marks" IS NULL OR u."twelfth_marks" >= c."min_overall_cgpa" * 10)
          )
        )
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

export const updateCompanyStatus = async (companyId, status) => {
  const { rows } = await query(
    `UPDATE "companies"
      SET "status" = $2
      WHERE "id" = $1
      RETURNING *`,
    [companyId, status]
  );
  return rows[0] ? normalizeCompany(rows[0]) : null;
};

export const updateCompanyBlocks = async (companyId, consentBlocked, trackerBlocked) => {
  const { rows } = await query(
    `UPDATE "companies"
      SET "consent_blocked" = $2,
          "tracker_blocked" = $3
      WHERE "id" = $1
      RETURNING *`,
    [companyId, consentBlocked, trackerBlocked]
  );
  return rows[0] ? normalizeCompany(rows[0]) : null;
};

export const updateCompany = async (companyId, payload) => {
  const { rows } = await query(
    `UPDATE "companies"
      SET "name" = $2,
          "min_cgpa" = $3,
          "min_overall_cgpa" = $4,
          "package" = $5,
          "stipend" = $6,
          "test_date" = $7,
          "interview_date" = $8,
          "deadline" = $9,
          "default_consent" = $10
      WHERE "id" = $1
      RETURNING *`,
    [
      companyId,
      payload.name,
      payload.minCgpa,
      payload.minOverallCgpa,
      payload.package,
      payload.stipend,
      payload.testDate,
      payload.interviewDate,
      payload.deadline,
      payload.defaultConsent ?? false,
    ]
  );
  return rows[0] ? normalizeCompany(rows[0]) : null;
};

export const deleteCompany = async (companyId) => {
  await query('DELETE FROM "companies" WHERE "id" = $1', [companyId]);
};

