import ExcelJS from 'exceljs';

import { query } from '../config/db.js';
import { decodeQuestionText } from '../utils/questionParser.js';

export const generateCompanyWorkbook = async (companyId) => {
  const { rows: companyRows } = await query(
    'SELECT * FROM "companies" WHERE "id" = $1 LIMIT 1',
    [companyId],
  );

  const company = companyRows[0];

  if (!company) {
    return null;
  }

  const { rows: questionRows } = await query(
    `SELECT DISTINCT fq."id", fq."question_text", fq."field_type"
      FROM "forms" f
      INNER JOIN "form_question_map" fqm ON fqm."form_id" = f."id"
      INNER JOIN "form_questions" fq ON fq."id" = fqm."question_id"
      WHERE f."company_id" = $1
      ORDER BY fq."id" ASC`,
    [companyId],
  );

  const { rows: studentRows } = await query(
    `SELECT u."id",
        u."name",
        u."college_email_id",
        u."ug_cgpa",
        u."resume_url"
      FROM "applications" a
      INNER JOIN "users" u ON u."id" = a."student_id"
      INNER JOIN "companies" c ON c."id" = a."company_id"
      WHERE a."company_id" = $1
        AND a."consent" = TRUE
        AND (c."min_cgpa" IS NULL OR u."ug_cgpa" >= c."min_cgpa")
      ORDER BY u."name" ASC NULLS LAST`,
    [companyId],
  );

  const { rows: responseRows } = await query(
    `SELECT fr."student_id", fr."question_id", fr."answer"
      FROM "form_responses" fr
      INNER JOIN "forms" f ON f."id" = fr."form_id"
      WHERE f."company_id" = $1`,
    [companyId],
  );

  const responseMap = responseRows.reduce((accumulator, row) => {
    const key = `${row.student_id}:${row.question_id}`;
    accumulator.set(key, row.answer);
    return accumulator;
  }, new Map());

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(company.name || `Company_${companyId}`);

  worksheet.columns = [
    { header: 'Name', key: 'name', width: 28 },
    { header: 'Email', key: 'email', width: 32 },
    { header: 'CGPA', key: 'cgpa', width: 12 },
    { header: 'Resume URL', key: 'resumeUrl', width: 50 },
    ...questionRows.map((question) => ({
      header: decodeQuestionText(question.question_text, question.field_type).label,
      key: `question_${question.id}`,
      width: 28,
    })),
  ];

  studentRows.forEach((student) => {
    const row = {
      name: student.name,
      email: student.college_email_id,
      cgpa: student.ug_cgpa,
      resumeUrl: student.resume_url,
    };

    questionRows.forEach((question) => {
      row[`question_${question.id}`] =
        responseMap.get(`${student.id}:${question.id}`) ?? '';
    });

    worksheet.addRow(row);
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  return workbook;
};
