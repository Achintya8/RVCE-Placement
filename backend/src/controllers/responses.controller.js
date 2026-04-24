import { z } from 'zod';

import { findFormById, getFormQuestions } from '../repositories/form.repository.js';
import { listResponsesForForm, replaceFormResponses } from '../repositories/response.repository.js';
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

