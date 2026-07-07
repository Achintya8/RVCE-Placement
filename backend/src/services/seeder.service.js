import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { query } from '../config/db.js';

const getUrlString = (cellValue) => {
  if (!cellValue) return null;
  if (typeof cellValue === 'object') {
    return cellValue.hyperlink || cellValue.text || null;
  }
  return String(cellValue).trim() || null;
};

const getEmailString = (cellValue) => {
  if (!cellValue) return null;
  if (typeof cellValue === 'object') {
    cellValue = cellValue.text || cellValue.hyperlink || '';
  }
  return String(cellValue).trim().toLowerCase() || null;
};

const getFloat = (cellValue) => {
  if (cellValue === null || cellValue === undefined) return null;
  if (typeof cellValue === 'object') {
    cellValue = cellValue.text || '';
  }
  const num = parseFloat(cellValue);
  return isNaN(num) ? null : num;
};

const getText = (cellValue) => {
  if (cellValue === null || cellValue === undefined) return null;
  if (typeof cellValue === 'object') {
    cellValue = cellValue.text || '';
  }
  return String(cellValue).trim() || null;
};

export const seedStudentsFromExcel = async () => {
  // 1. Resolve path dynamically: env override -> common relative paths -> absolute fallback
  let filePath = process.env.STUDENTS_EXCEL_PATH;

  if (!filePath) {
    const cwd = process.cwd();
    const pathsToTry = [
      path.join(cwd, 'student.xlsx'),                 // Run from root
      path.join(cwd, '..', 'student.xlsx'),            // Run from backend/
      path.join(cwd, 'backend', 'student.xlsx'),       // Run from parent
    ];

    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }

    if (!filePath) {
      try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        filePath = path.join(__dirname, '..', '..', '..', 'student.xlsx'); // Relative to this file
      } catch (err) {
        filePath = 'student.xlsx';
      }
    }
  }

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Seeding skipped: Student Excel file not found at resolve path: "${filePath}"`);
    return;
  }

  console.log(`🔌 Starting database seeding from Excel: "${filePath}"...`);

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    if (!worksheet || worksheet.rowCount < 2) {
      console.warn('⚠️ Seeding skipped: Excel sheet is empty or contains no data rows.');
      return;
    }

    // Identify header positions
    const headerRow = worksheet.getRow(1);
    const headerMap = {};
    headerRow.eachCell((cell, colNumber) => {
      const headerName = String(cell.value || '').trim();
      headerMap[headerName] = colNumber;
    });

    // Check if critical columns exist
    const requiredColumns = ['USN', 'Full Name', 'College Email'];
    for (const reqCol of requiredColumns) {
      if (!headerMap[reqCol]) {
        console.error(`❌ Seeding failed: Required column "${reqCol}" not found in Excel sheet headers:`, Object.keys(headerMap));
        return;
      }
    }

    let insertedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      
      // Get cell values based on mapped headers
      const getVal = (headerName) => {
        const colIdx = headerMap[headerName];
        return colIdx ? row.getCell(colIdx).value : null;
      };

      const collegeEmail = getEmailString(getVal('College Email'));
      if (!collegeEmail) {
        // Skip empty rows
        continue;
      }

      const name = getText(getVal('Full Name'));
      const usn = getText(getVal('USN'));
      const personalEmail = getEmailString(getVal('Personal Email ')); // Note potential space
      const phoneNumberRaw = getText(getVal('Phone Number'));
      const aadharRaw = getText(getVal('AADHAR Number'));
      const tenth = getFloat(getVal('10th %'));
      const twelfth = getFloat(getVal('12th %'));
      const cgpa = getFloat(getVal('UG  CGPA')); // Note double spaces
      const sgpa = getFloat(getVal('1st Sem SGPA'));
      const github = getUrlString(getVal('Github Profile Url'));
      const linkedin = getUrlString(getVal('LinkedIn Profile Url'));

      // Format clean phone number and Aadhar as strings if they are numbers in excel
      const phoneNumber = phoneNumberRaw ? String(phoneNumberRaw) : null;
      const aadhar = aadharRaw ? String(aadharRaw) : null;

      try {
        // Check if student already exists by college email (or USN as fallback if needed)
        const checkRes = await query(
          'SELECT "id" FROM "users" WHERE "college_email_id" = $1 LIMIT 1',
          [collegeEmail]
        );

        if (checkRes.rows.length > 0) {
          // If the student already exists, make sure they are marked as verified
          await query(
            'UPDATE "users" SET "verified" = true WHERE "college_email_id" = $1 AND "verified" = false',
            [collegeEmail]
          );
          skippedCount++;
          continue;
        }

        // Insert new student user, setting verified to true
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
            "verified",
            "created_at"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
          [
            name,
            collegeEmail,
            personalEmail,
            phoneNumber,
            aadhar,
            linkedin,
            github,
            usn,
            cgpa,
            sgpa,
            tenth,
            twelfth,
            true, // initially verified = true
          ]
        );

        insertedCount++;
      } catch (err) {
        console.error(`⚠️ Failed to seed student row ${r} (${name || collegeEmail}):`, err.message);
        errorCount++;
      }
    }

    console.log(`✅ Seeding completed: ${insertedCount} inserted, ${skippedCount} skipped (already existed), ${errorCount} errors.`);
  } catch (error) {
    console.error('❌ Failed to read Excel file or run seed query:', error);
  }
};
