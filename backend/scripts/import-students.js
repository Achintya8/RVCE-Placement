#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { query, pool, withTransaction } from '../src/config/db.js';

const usage = () => {
  console.log('\nUsage: node scripts/import-students.js <path-to-file.xlsx-or-csv>\n');
  process.exit(1);
};

const main = async () => {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Error: Please provide the path to the Excel or CSV file.');
    usage();
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File does not exist at path: ${absolutePath}`);
    process.exit(1);
  }

  console.log(`Starting student data import from: ${absolutePath}...`);

  const workbook = new ExcelJS.Workbook();
  const ext = path.extname(absolutePath).toLowerCase();

  try {
    if (ext === '.csv') {
      await workbook.csv.readFile(absolutePath);
    } else if (ext === '.xlsx') {
      await workbook.xlsx.readFile(absolutePath);
    } else {
      console.error('Error: Only .xlsx and .csv files are supported.');
      process.exit(1);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      console.error('Error: No worksheet found in the file.');
      process.exit(1);
    }

    const headers = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value ? cell.value.toString().trim().toLowerCase() : '';
    });

    const hasEmail = headers.some(h => h && h.includes('email') && (h.includes('college') || !h.includes('personal')));
    if (!hasEmail) {
      console.error('Error: The sheet must contain a "College Email" column to identify students.');
      process.exit(1);
    }

    const studentsToUpsert = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const student = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber];
        if (!header) return;

        const val = cell.value;
        let stringVal = '';
        if (val && typeof val === 'object') {
          if (val.text) stringVal = val.text;
          else if (val.result !== undefined) stringVal = val.result;
          else if (val.richText) stringVal = val.richText.map(rt => rt.text).join('');
        } else if (val !== null && val !== undefined) {
          stringVal = val;
        }

        const cleanVal = stringVal.toString().trim();

        if (header.includes('email') && (header.includes('college') || !header.includes('personal'))) {
          student.collegeEmailId = cleanVal;
        } else if (header.includes('email') && header.includes('personal')) {
          student.personalEmailId = cleanVal || null;
        } else if (header.includes('name')) {
          student.name = cleanVal || null;
        } else if (header.includes('usn')) {
          student.usn = cleanVal || null;
        } else if (header.includes('phone') || header.includes('contact')) {
          student.phoneNumber = cleanVal || null;
        } else if (header.includes('aadhar')) {
          student.aadhar = cleanVal || null;
        } else if (header.includes('linkedin')) {
          student.linkedIn = cleanVal || null;
        } else if (header.includes('github')) {
          student.gitHub = cleanVal || null;
        } else if (header.includes('cgpa') || header.includes('ug')) {
          student.ugCgpa = cleanVal ? parseFloat(cleanVal) : null;
        } else if (header.includes('1st sem') || header.includes('first sem') || header.includes('sgpa')) {
          student.firstSemSgpa = cleanVal ? parseFloat(cleanVal) : null;
        } else if (header.includes('10th') || header.includes('tenth')) {
          student.tenthMarks = cleanVal ? parseFloat(cleanVal) : null;
        } else if (header.includes('12th') || header.includes('twelfth') || header.includes('diploma')) {
          student.twelfthMarks = cleanVal ? parseFloat(cleanVal) : null;
        } else if (header.includes('placed')) {
          student.placed = cleanVal.toLowerCase() === 'yes' || cleanVal.toLowerCase() === 'true';
        } else if (header.includes('verified')) {
          student.verified = cleanVal.toLowerCase() === 'yes' || cleanVal.toLowerCase() === 'true';
        } else if (header.includes('gender')) {
          student.gender = cleanVal || null;
        }
      });

      if (!student.collegeEmailId) {
        const hasData = Object.values(student).some(v => v !== null && v !== undefined && v !== '');
        if (hasData) {
          throw new Error(`Row ${rowNumber} has student details but is missing College Email.`);
        }
        return; // Empty row, skip
      }

      if (student.verified === undefined) {
        student.verified = true;
      }

      studentsToUpsert.push(student);
    });

    if (studentsToUpsert.length === 0) {
      console.warn('Warning: No student rows found to import.');
      process.exit(0);
    }

    console.log(`Parsed ${studentsToUpsert.length} student records. Executing database import transaction...`);

    let insertedCount = 0;
    let updatedCount = 0;

    await withTransaction(async (client) => {
      for (const student of studentsToUpsert) {
        const { rows: existing } = await query(
          'SELECT id FROM "users" WHERE "college_email_id" = $1 LIMIT 1',
          [student.collegeEmailId],
          client
        );

        if (existing.length > 0) {
          const userId = existing[0].id;
          const updates = [];
          const params = [userId];
          let paramIndex = 2;

          const fields = [
            { key: 'name', val: student.name },
            { key: 'personal_email_id', val: student.personalEmailId },
            { key: 'phone_number', val: student.phoneNumber },
            { key: 'aadhar', val: student.aadhar },
            { key: 'linkedIn', val: student.linkedIn },
            { key: 'gitHub', val: student.gitHub },
            { key: 'usn', val: student.usn },
            { key: 'ug_cgpa', val: student.ugCgpa },
            { key: 'first_sem_sgpa', val: student.firstSemSgpa },
            { key: 'tenth_marks', val: student.tenthMarks },
            { key: 'twelfth_marks', val: student.twelfthMarks },
            { key: 'placed', val: student.placed },
            { key: 'verified', val: student.verified },
            { key: 'gender', val: student.gender },
          ];

          for (const field of fields) {
            if (field.val !== undefined && field.val !== null) {
              updates.push(`"${field.key}" = $${paramIndex}`);
              params.push(field.val);
              paramIndex++;
            }
          }

          if (updates.length > 0) {
            const updateQuery = `UPDATE "users" SET ${updates.join(', ')} WHERE "id" = $1`;
            await query(updateQuery, params, client);
          }
          updatedCount++;
        } else {
          // Insert new user
          await query(
            `INSERT INTO "users" (
              "name",
              "college_email_id",
              "personal_email_id",
              "phone_number",
              "aadhar",
              "linkedIn",
              "gitHub",
              "usn",
              "ug_cgpa",
              "first_sem_sgpa",
              "tenth_marks",
              "twelfth_marks",
              "placed",
              "verified",
              "gender",
              "created_at"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())`,
            [
              student.name || null,
              student.collegeEmailId,
              student.personalEmailId || null,
              student.phoneNumber || null,
              student.aadhar || null,
              student.linkedIn || null,
              student.gitHub || null,
              student.usn || null,
              student.ugCgpa || null,
              student.firstSemSgpa || null,
              student.tenthMarks || null,
              student.twelfthMarks || null,
              student.placed ?? false,
              student.verified ?? true,
              student.gender || null,
            ],
            client
          );
          insertedCount++;
        }
      }
    });

    console.log('\nSuccess! Student data import completed successfully.');
    console.log(`- Total processed: ${studentsToUpsert.length}`);
    console.log(`- New records inserted: ${insertedCount}`);
    console.log(`- Existing records updated: ${updatedCount}\n`);

  } catch (error) {
    console.error('\nError: Import transaction failed and was rolled back.');
    console.error(error.message || error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

main();
