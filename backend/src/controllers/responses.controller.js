import { z } from 'zod';

import { findFormById, getFormQuestions } from '../repositories/form.repository.js';
import { findCompanyById } from '../repositories/company.repository.js';
import { listResponsesForForm, replaceFormResponses } from '../repositories/response.repository.js';
import { updateUserVerification } from '../repositories/user.repository.js';
import { ApiError } from '../utils/apiError.js';

const responseSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.coerce.number(),
      answer: z.union([z.string(), z.number(), z.boolean()]).transform((value) => String(value)),
    }),
  ),
});

export const submitFormResponses = async (req, res, next) => {
  try {
    const formId = Number(req.params.formId);
    const form = await findFormById(formId);

    if (!form) {
      throw new ApiError(404, 'Form not found.');
    }

    if (form.acceptingResponses === false) {
      throw new ApiError(400, 'This form is no longer accepting responses.');
    }

    const { answers } = responseSchema.parse(req.body);
    const questions = await getFormQuestions(formId);
    const questionMap = new Map(questions.map((question) => [question.id, question]));

    for (const question of questions) {
      if (question.isRequired && !answers.find((answer) => answer.questionId === question.id && answer.answer !== '')) {
        throw new ApiError(400, `${question.questionText} is required.`);
      }
    }

    answers.forEach((answer) => {
      if (!questionMap.has(answer.questionId)) {
        throw new ApiError(400, `Question ${answer.questionId} is not part of this form.`);
      }
    });

    const saved = await replaceFormResponses({
      formId,
      studentId: req.auth.userId,
      companyId: form.companyId,
      answers,
    });

    if (form.type === 'profile_data') {
      await updateUserVerification(req.auth.userId, false);
    }

    res.json({
      formId,
      savedCount: saved.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getFormResponses = async (req, res, next) => {
  try {
    const formId = Number(req.params.formId);
    const form = await findFormById(formId);

    if (!form) {
      throw new ApiError(404, 'Form not found.');
    }

    const grouped = await listResponsesForForm(formId);
    res.json(Object.values(grouped));
  } catch (error) {
    next(error);
  }
};
export const exportFormResponses = async (req, res, next) => {
  try {
    const formId = Number(req.params.formId);
    const form = await findFormById(formId);
    if (!form) {
      throw new ApiError(404, 'Form not found.');
    }

    const { generateFormResponsesWorkbook } = await import('../services/export.service.js');
    const workbook = await generateFormResponsesWorkbook(formId);

    if (!workbook) {
      throw new ApiError(404, 'Export failed.');
    }

    let fileName = form.title.replace(/[^a-zA-Z0-9]/g, '_');
    if (form.companyId) {
      const company = await findCompanyById(form.companyId);
      if (company) {
        fileName = `${company.name.replace(/[^a-zA-Z0-9]/g, '_')}_${fileName}`;
      }
    }
    fileName = `${fileName}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
};

import { uploadAttachment, uploadToGoogleDrive } from '../services/storage.service.js';

export const uploadResponseFile = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file uploaded.');
    }

    const driveUrl = await uploadToGoogleDrive({
      buffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      folderLink: req.body.folderLink,
    });

    if (driveUrl) {
      return res.json({
        fileUrl: driveUrl,
        fileName: req.file.originalname,
      });
    }

    const fileUrl = await uploadAttachment({
      buffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      userId: req.auth.userId,
    });

    res.json({
      fileUrl,
      fileName: req.file.originalname,
    });
  } catch (error) {
    next(error);
  }
};

