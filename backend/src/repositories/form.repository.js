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
        COUNT(DISTINCT fqm."id") AS question_count
      FROM "forms" f
      LEFT JOIN "companies" c ON c."id" = f."company_id"
      LEFT JOIN "form_question_map" fqm ON fqm."form_id" = f."id"
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
      INNER JOIN "users" u ON u."id" = $1
      WHERE f."company_id" IS NULL
         OR c."min_cgpa" IS NULL
         OR u."ug_cgpa" >= c."min_cgpa"
      GROUP BY f."id", c."name"
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

