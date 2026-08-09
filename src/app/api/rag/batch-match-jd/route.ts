import { NextResponse } from 'next/server';
import { matchResumeWithJD } from '../../../../lib/rag/matchEngine.js';
import { pool } from '../../../../db/index.js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jobDescription, topN = 10 } = body;

    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing or empty jobDescription' },
        { status: 400 }
      );
    }

    // Fetch embedded students from DB
    const { rows: users } = await pool.query(
      `SELECT DISTINCT u.id, u.name, u.usn, u.college_email_id AS "collegeEmail", u.ug_cgpa AS "ugCgpa", u.first_sem_sgpa AS "firstSemSgpa", u.placed 
       FROM users u 
       JOIN resume_embeddings re ON u.id = re.student_id;`
    );

    const targetUsers = users.length > 0 ? users : (await pool.query(`SELECT id, name, usn, college_email_id AS "collegeEmail", ug_cgpa AS "ugCgpa", first_sem_sgpa AS "firstSemSgpa", placed FROM users LIMIT 30;`)).rows;

    const results = [];
    for (const student of targetUsers) {
      try {
        const { analysis } = await matchResumeWithJD(student.id, jobDescription, 5);
        results.append({
          student_id: student.id,
          name: student.name || `Student #${student.id}`,
          usn: student.usn || 'N/A',
          college_email: student.collegeEmail || 'N/A',
          cgpa: student.firstSemSgpa || student.ugCgpa || 0,
          placed: Boolean(student.placed),
          confidence_score: analysis.match_score || 50,
          verdict: analysis.verdict || 'Moderate Match',
          executive_summary: analysis.executive_summary || '',
          matching_skills: analysis.matching_skills || [],
          missing_skills_and_gaps: analysis.missing_skills_and_gaps || [],
        });
      } catch (err) {
        console.warn(`Skipping student ${student.id} in batch RAG analysis:`, err);
      }
    }

    results.sort((a, b) => b.confidence_score - a.confidence_score);
    const ranked = results.slice(0, topN).map((item, idx) => ({ ...item, rank: idx + 1 }));

    return NextResponse.json({
      success: true,
      jobDescription,
      totalEvaluated: results.length,
      candidates: ranked,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: errorMessage || 'Failed to process batch candidate matching.' },
      { status: 500 }
    );
  }
}
