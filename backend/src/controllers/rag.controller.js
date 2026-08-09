import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliScriptPath = path.resolve(__dirname, '../../rag_service/cli.py');

function runPythonRAG(command, args) {
  return new Promise((resolve, reject) => {
    const fullArgs = [cliScriptPath, command, ...args];
    execFile('py', fullArgs, { cwd: path.resolve(__dirname, '../../') }, (error, stdout, stderr) => {
      if (error) {
        // Try fallback with 'python' command
        execFile('python', fullArgs, { cwd: path.resolve(__dirname, '../../') }, (err2, stdout2, stderr2) => {
          if (err2) {
            return reject(new Error(stderr2 || stdout2 || stderr || stdout || err2.message));
          }
          try {
            const lines = stdout2.trim().split('\n');
            const jsonLine = lines.find((l) => l.trim().startsWith('{')) || lines[lines.length - 1];
            resolve(JSON.parse(jsonLine.trim()));
          } catch {
            reject(new Error(stdout2));
          }
        });
        return;
      }
      try {
        const lines = stdout.trim().split('\n');
        const jsonLine = lines.find((l) => l.trim().startsWith('{')) || lines[lines.length - 1];
        resolve(JSON.parse(jsonLine.trim()));
      } catch {
        resolve({ raw: stdout });
      }
    });
  });
}

export const embedResumeHandler = async (req, res, next) => {
  try {
    const { studentId, resumeText, metadata } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Missing required field: studentId' });
    }

    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Missing or empty resumeText content' });
    }

    const numStudentId = Number(studentId);
    if (isNaN(numStudentId)) {
      return res.status(400).json({ success: false, message: 'studentId must be a valid integer' });
    }

    const pyResult = await runPythonRAG('embed', [
      '--student-id',
      String(numStudentId),
      '--text',
      resumeText,
      '--meta',
      JSON.stringify(metadata || {}),
    ]);

    if (pyResult && pyResult.success) {
      return res.status(200).json(pyResult);
    }

    return res.status(500).json({
      success: false,
      message: pyResult?.message || 'Failed to embed resume vector chunks.',
    });
  } catch (error) {
    next(error);
  }
};

export const matchJDHandler = async (req, res, next) => {
  try {
    const { studentId, jobDescription, topK } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Missing required field: studentId' });
    }

    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Missing or empty jobDescription' });
    }

    const numStudentId = Number(studentId);
    if (isNaN(numStudentId)) {
      return res.status(400).json({ success: false, message: 'studentId must be a valid integer' });
    }

    const kLimit = topK && typeof topK === 'number' ? topK : 5;

    const pyResult = await runPythonRAG('match', [
      '--student-id',
      String(numStudentId),
      '--jd',
      jobDescription,
      '--top-k',
      String(kLimit),
    ]);

    if (pyResult && pyResult.success) {
      return res.status(200).json(pyResult);
    }

    return res.status(500).json({
      success: false,
      message: pyResult?.message || 'Failed to execute resume-JD match analysis.',
    });
  } catch (error) {
    next(error);
  }
};

export const batchMatchJDHandler = async (req, res, next) => {
  try {
    const { jobDescription, topN } = req.body;

    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Missing or empty jobDescription' });
    }

    const nLimit = topN && typeof topN === 'number' ? topN : 20;

    const pyResult = await runPythonRAG('batch-match', [
      '--jd',
      jobDescription,
      '--top-n',
      String(nLimit),
    ]);

    if (pyResult && pyResult.success) {
      return res.status(200).json(pyResult);
    }

    return res.status(500).json({
      success: false,
      message: pyResult?.message || 'Failed to run batch candidate RAG ranking.',
    });
  } catch (error) {
    next(error);
  }
};
