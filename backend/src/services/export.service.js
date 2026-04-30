import ExcelJS from 'exceljs';

import { query } from '../config/db.js';
import { decodeQuestionText } from '../utils/questionParser.js';

export const generateCompanyWorkbook = async (companyId, fields = []) => {
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
        u."usn",
        u."college_email_id",
        u."personal_email_id",
        u."phone_number",
        u."aadhar",
        u."linkedIn",
        u."gitHub",
        u."tenth_marks",
        u."twelfth_marks",
        u."first_sem_sgpa",
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

  const optionalColumns = [
    { key: 'usn', header: 'USN', width: 16 },
    { key: 'personal_email_id', header: 'Personal Email', width: 32 },
    { key: 'phone_number', header: 'Phone Number', width: 16 },
    { key: 'aadhar', header: 'Aadhar', width: 16 },
    { key: 'linkedIn', header: 'LinkedIn', width: 40 },
    { key: 'gitHub', header: 'GitHub', width: 40 },
    { key: 'tenth_marks', header: '10th Marks', width: 12 },
    { key: 'twelfth_marks', header: '12th Marks', width: 12 },
    { key: 'first_sem_sgpa', header: '1st Sem SGPA', width: 15 },
  ];

  worksheet.columns = [
    { header: 'Name', key: 'name', width: 28 },
    { header: 'College Email', key: 'college_email_id', width: 32 },
    { header: 'UG CGPA', key: 'ug_cgpa', width: 12 },
    { header: 'Resume URL', key: 'resume_url', width: 50 },
    ...optionalColumns.filter(col => fields.includes(col.key)),
    ...questionRows.map((question) => ({
      header: decodeQuestionText(question.question_text, question.field_type).label,
      key: `question_${question.id}`,
      width: 28,
    })),
  ];

  studentRows.forEach((student) => {
    const row = {
      name: student.name,
      usn: student.usn,
      college_email_id: student.college_email_id,
      personal_email_id: student.personal_email_id,
      phone_number: student.phone_number,
      aadhar: student.aadhar,
      linkedIn: student.linkedIn,
      gitHub: student.gitHub,
      tenth_marks: student.tenth_marks,
      twelfth_marks: student.twelfth_marks,
      first_sem_sgpa: student.first_sem_sgpa,
      ug_cgpa: student.ug_cgpa,
      resume_url: student.resume_url,
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

export const generateFormResponsesWorkbook = async (formId) => {
  const { rows: formRows } = await query(
    'SELECT "title" FROM "forms" WHERE "id" = $1 LIMIT 1',
    [formId],
  );

  const form = formRows[0];

  if (!form) {
    return null;
  }

  const { rows: questionRows } = await query(
    `SELECT fq."id", fq."question_text", fq."field_type"
      FROM "form_question_map" fqm
      INNER JOIN "form_questions" fq ON fq."id" = fqm."question_id"
      WHERE fqm."form_id" = $1
      ORDER BY fq."id" ASC`,
    [formId],
  );

  const { rows: responseRows } = await query(
    `SELECT fr."student_id", u."name", u."usn", u."college_email_id", fr."question_id", fr."answer"
      FROM "form_responses" fr
      INNER JOIN "users" u ON u."id" = fr."student_id"
      WHERE fr."form_id" = $1
      ORDER BY u."name" ASC NULLS LAST`,
    [formId],
  );

  const studentsMap = new Map();
  responseRows.forEach((row) => {
    if (!studentsMap.has(row.student_id)) {
      studentsMap.set(row.student_id, {
        name: row.name,
        usn: row.usn,
        email: row.college_email_id,
        answers: new Map(),
      });
    }
    studentsMap.get(row.student_id).answers.set(row.question_id, row.answer);
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(form.title.substring(0, 31) || `Form_${formId}`);

  worksheet.columns = [
    { header: 'Name', key: 'name', width: 28 },
    { header: 'USN', key: 'usn', width: 16 },
    { header: 'College Email', key: 'college_email_id', width: 32 },
    ...questionRows.map((question) => ({
      header: decodeQuestionText(question.question_text, question.field_type).label,
      key: `question_${question.id}`,
      width: 28,
    })),
  ];

  studentsMap.forEach((student) => {
    const row = {
      name: student.name,
      usn: student.usn,
      college_email_id: student.email,
    };

    questionRows.forEach((question) => {
      row[`question_${question.id}`] = student.answers.get(question.id) ?? '';
    });

    worksheet.addRow(row);
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  return workbook;
};
