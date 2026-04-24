import { query, withTransaction } from '../config/db.js';
import { decodeQuestionText } from '../utils/questionParser.js';

export const replaceFormResponses = async ({
  formId,
  studentId,
  companyId,
  answers,
}) =>
  withTransaction(async (client) => {
    await client.query(
      `DELETE FROM "form_responses"
        WHERE "form_id" = $1 AND "student_id" = $2`,
      [formId, studentId],
    );

    for (const answer of answers) {
      await client.query(
        `INSERT INTO "form_responses" (
          "form_id",
          "student_id",
          "company_id",
          "question_id",
          "answer"
        ) VALUES ($1, $2, $3, $4, $5)`,
        [formId, studentId, companyId, answer.questionId, answer.answer],
      );
    }

    const { rows } = await client.query(
      `SELECT * FROM "form_responses"
        WHERE "form_id" = $1 AND "student_id" = $2
        ORDER BY "id" ASC`,
      [formId, studentId],
    );

    return rows;
  });

export const listResponsesForForm = async (formId) => {
  const { rows } = await query(
    `SELECT fr."student_id",
        fr."company_id",
        fr."question_id",
        fr."answer",
        u."name" AS student_name,
        u."college_email_id",
        fq."question_text",
        fq."field_type"
      FROM "form_responses" fr
      INNER JOIN "users" u ON u."id" = fr."student_id"
      INNER JOIN "form_questions" fq ON fq."id" = fr."question_id"
      WHERE fr."form_id" = $1
      ORDER BY u."name" ASC NULLS LAST, fr."id" ASC`,
    [formId],
  );

  return rows.reduce((accumulator, row) => {
    const parsedQuestion = decodeQuestionText(row.question_text, row.field_type);
    const key = String(row.student_id);

    if (!accumulator[key]) {
      accumulator[key] = {
        studentId: row.student_id,
        studentName: row.student_name,
        collegeEmailId: row.college_email_id,
        companyId: row.company_id,
        answers: [],
      };
    }

    accumulator[key].answers.push({
      questionId: row.question_id,
      questionText: parsedQuestion.label,
      fieldType: row.field_type,
      answer: row.answer,
    });

    return accumulator;
  }, {});
};

