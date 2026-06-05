import { query, withTransaction } from '../config/db.js';
import { decodeQuestionText } from '../utils/questionParser.js';

const normalizeForm = (row) => ({
  id: row.id,
  title: row.title,
  type: row.type,
  companyId: row.company_id,
  createdBy: row.created_by,
  createdAt: row.created_at,
  companyName: row.company_name,
  questionCount: row.question_count ? Number(row.question_count) : undefined,
  responseCount: row.response_count ? Number(row.response_count) : undefined,
  acceptingResponses: row.accepting_responses !== undefined ? Boolean(row.accepting_responses) : true,
});

const normalizeQuestion = (row) => {
  const parsed = decodeQuestionText(row.question_text, row.field_type);

  return {
    id: row.question_id ?? row.id,
    formId: row.form_id,
    questionText: parsed.label,
    fieldType: row.field_type,
    options: parsed.options,
    isRequired: row.is_required,
    answer: row.answer ?? null,
  };
};

export const createForm = async (payload) => {
  const { rows } = await query(
    `INSERT INTO "forms" (
      "title",
      "type",
      "company_id",
      "created_by",
      "created_at"
    ) VALUES ($1, $2, $3, $4, NOW())
    RETURNING *`,
    [payload.title, payload.type, payload.companyId, payload.createdBy],
  );

  return normalizeForm(rows[0]);
};

export const listForms = async () => {
  const { rows } = await query(
    `SELECT f.*, c."name" AS company_name,
        COUNT(DISTINCT fqm."id") AS question_count,
        COUNT(DISTINCT fr."student_id") AS response_count
      FROM "forms" f
      LEFT JOIN "companies" c ON c."id" = f."company_id"
      LEFT JOIN "form_question_map" fqm ON fqm."form_id" = f."id"
      LEFT JOIN "form_responses" fr ON fr."form_id" = f."id"
      GROUP BY f."id", c."name"
      ORDER BY f."created_at" DESC NULLS LAST, f."id" DESC`,
  );

  return rows.map(normalizeForm);
};

export const listAssignedFormsForStudent = async (studentId) => {
  const { rows } = await query(
    `SELECT f.*, c."name" AS company_name,
        COUNT(DISTINCT fqm."id") AS question_count,
        COUNT(DISTINCT fr."id") AS response_count
      FROM "forms" f
      LEFT JOIN "companies" c ON c."id" = f."company_id"
      LEFT JOIN "form_question_map" fqm ON fqm."form_id" = f."id"
      LEFT JOIN "form_responses" fr
        ON fr."form_id" = f."id" AND fr."student_id" = $1
      LEFT JOIN "applications" a
        ON a."company_id" = f."company_id" AND a."student_id" = $1
      INNER JOIN "users" u ON u."id" = $1
      WHERE u."verified" = TRUE
        AND f."type" != 'profile_data'
        AND (c."status" IS NULL OR c."status" = 'ongoing')
        AND (
          f."company_id" IS NULL
          OR (
            (c."min_cgpa" IS NULL OR COALESCE(NULLIF(u."first_sem_sgpa", 0), u."ug_cgpa") >= c."min_cgpa")
            AND (
              c."min_overall_cgpa" IS NULL OR (
                u."ug_cgpa" >= c."min_overall_cgpa"
                AND (u."first_sem_sgpa" IS NULL OR u."first_sem_sgpa" >= c."min_overall_cgpa")
                AND (u."tenth_marks" IS NULL OR u."tenth_marks" >= c."min_overall_cgpa" * 10)
                AND (u."twelfth_marks" IS NULL OR u."twelfth_marks" >= c."min_overall_cgpa" * 10)
              )
            )
            AND (
               (f."type" NOT IN ('consent', 'tracker'))
               OR (c."deadline" IS NULL OR c."deadline" > NOW() OR fr."id" IS NOT NULL)
            )
            AND (
              f."type" = 'consent' 
              OR a."consent" = TRUE 
              OR (a."consent" IS NULL AND c."deadline" <= NOW() AND FALSE) -- Defaults to false after deadline
            )
          )
        )
      GROUP BY f."id", c."name"
      ORDER BY f."created_at" DESC NULLS LAST, f."id" DESC`,
    [studentId],
  );

  return rows.map(normalizeForm);
};

export const listProfileDataFormsForStudent = async (studentId) => {
  const { rows } = await query(
    `SELECT f.*,
        COUNT(DISTINCT fqm."id") AS question_count,
        COUNT(DISTINCT fr."id") AS response_count
      FROM "forms" f
      LEFT JOIN "form_question_map" fqm ON fqm."form_id" = f."id"
      LEFT JOIN "form_responses" fr
        ON fr."form_id" = f."id" AND fr."student_id" = $1
      WHERE f."type" = 'profile_data'
        AND (f."accepting_responses" = true OR fr."id" IS NOT NULL)
      GROUP BY f."id"
      ORDER BY f."created_at" DESC NULLS LAST, f."id" DESC`,
    [studentId],
  );

  return rows.map(normalizeForm);
};

export const findFormById = async (formId) => {
  const { rows } = await query(
    `SELECT f.*, c."name" AS company_name
      FROM "forms" f
      LEFT JOIN "companies" c ON c."id" = f."company_id"
      WHERE f."id" = $1
      LIMIT 1`,
    [formId],
  );

  return rows[0] ? normalizeForm(rows[0]) : null;
};

export const getFormQuestions = async (formId, studentId = null) => {
  const params = [formId];
  const answerJoin = studentId
    ? `LEFT JOIN "form_responses" fr
        ON fr."form_id" = fqm."form_id"
        AND fr."question_id" = fq."id"
        AND fr."student_id" = $2`
    : 'LEFT JOIN "form_responses" fr ON 1 = 0';

  if (studentId) {
    params.push(studentId);
  }

  const { rows } = await query(
    `SELECT fqm."form_id",
        fq."id" AS question_id,
        fq."question_text",
        fq."field_type",
        fqm."is_required",
        fr."answer"
      FROM "form_question_map" fqm
      INNER JOIN "form_questions" fq ON fq."id" = fqm."question_id"
      ${answerJoin}
      WHERE fqm."form_id" = $1
      ORDER BY fqm."id" ASC`,
    params,
  );

  return rows.map(normalizeQuestion);
};

export const createQuestion = async ({ questionText, fieldType }) => {
  const { rows } = await query(
    `INSERT INTO "form_questions" (
      "question_text",
      "field_type"
    ) VALUES ($1, $2)
    RETURNING *`,
    [questionText, fieldType],
  );

  return normalizeQuestion(rows[0]);
};

export const listQuestions = async () => {
  const { rows } = await query(
    'SELECT * FROM "form_questions" ORDER BY "id" DESC',
  );

  return rows.map(normalizeQuestion);
};

export const replaceFormQuestionMappings = async (formId, questionMappings) =>
  withTransaction(async (client) => {
    await client.query('DELETE FROM "form_question_map" WHERE "form_id" = $1', [formId]);

    for (const mapping of questionMappings) {
      await client.query(
        `INSERT INTO "form_question_map" (
          "form_id",
          "question_id",
          "is_required"
        ) VALUES ($1, $2, $3)`,
        [formId, mapping.questionId, mapping.isRequired],
      );
    }

    const { rows } = await client.query(
      `SELECT fqm."form_id",
          fq."id" AS question_id,
          fq."question_text",
          fq."field_type",
          fqm."is_required"
        FROM "form_question_map" fqm
        INNER JOIN "form_questions" fq ON fq."id" = fqm."question_id"
        WHERE fqm."form_id" = $1
        ORDER BY fqm."id" ASC`,
      [formId],
    );

    return rows.map(normalizeQuestion);
  });

export const getPendingStudentsForForm = async (formId) => {
  const form = await findFormById(formId);
  if (!form) return [];

  const params = [formId];
  let companyConditions = '';
  let joinApplications = '';

  if (form.companyId) {
    params.push(form.companyId);
    joinApplications = `LEFT JOIN "applications" a ON a."student_id" = u."id" AND a."company_id" = $2`;
    
    // Fetch company to get criteria and deadline
    const { rows: companyRows } = await query(
      `SELECT min_cgpa, min_overall_cgpa, deadline FROM "companies" WHERE id = $1`,
      [form.companyId]
    );
    const company = companyRows[0];
    const deadline = company?.deadline;
    const deadlinePassed = deadline && new Date(deadline) <= new Date();
    
    companyConditions = `
      AND (${company?.min_cgpa === null || company?.min_cgpa === undefined} OR COALESCE(NULLIF(u."first_sem_sgpa", 0), u."ug_cgpa") >= ${company?.min_cgpa || 0})
      AND (${company?.min_overall_cgpa === null || company?.min_overall_cgpa === undefined} OR (
        u."ug_cgpa" >= ${company?.min_overall_cgpa || 0}
        AND (u."first_sem_sgpa" IS NULL OR u."first_sem_sgpa" >= ${company?.min_overall_cgpa || 0})
        AND (u."tenth_marks" IS NULL OR u."tenth_marks" >= ${(company?.min_overall_cgpa || 0) * 10})
        AND (u."twelfth_marks" IS NULL OR u."twelfth_marks" >= ${(company?.min_overall_cgpa || 0) * 10})
      ))
      AND (
        ${form.type === 'consent' ? 'TRUE' : `(a."consent" = TRUE OR (a."consent" IS NULL AND ${deadlinePassed ? 'FALSE' : 'FALSE'}))`}
      )
    `;
  }

  const { rows } = await query(
    `SELECT u."id", u."name", u."usn", u."college_email_id", u."verified"
      FROM "users" u
      ${joinApplications}
      WHERE u."verified" = TRUE
      ${companyConditions}
      AND u."id" NOT IN (
        SELECT "student_id" FROM "form_responses" WHERE "form_id" = $1
      )
      ORDER BY u."name" ASC NULLS LAST`,
    params
  );

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    usn: r.usn,
    collegeEmailId: r.college_email_id,
    verified: r.verified
  }));
};

export const deleteForm = async (formId) => {
  await withTransaction(async (client) => {
    // Delete mappings and responses first due to foreign key constraints
    await client.query('DELETE FROM "form_question_map" WHERE "form_id" = $1', [formId]);
    await client.query('DELETE FROM "form_responses" WHERE "form_id" = $1', [formId]);
    await client.query('DELETE FROM "forms" WHERE "id" = $1', [formId]);
  });
};

export const updateFormAcceptingResponses = async (formId, acceptingResponses) => {
  const { rows } = await query(
    `UPDATE "forms"
     SET "accepting_responses" = $2
     WHERE "id" = $1
     RETURNING *`,
    [formId, acceptingResponses],
  );
  return rows[0] ? normalizeForm(rows[0]) : null;
};

