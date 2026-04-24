import { z } from 'zod';

import { findCompanyById } from '../repositories/company.repository.js';
import {
  createForm,
  createQuestion,
  findFormById,
  getFormQuestions,
  listAssignedFormsForStudent,
  listForms,
  listQuestions,
  replaceFormQuestionMappings,
} from '../repositories/form.repository.js';
import { findUserById, listEligibleStudentIds, listStudentIds } from '../repositories/user.repository.js';
import { sendToUsers } from '../services/notification.service.js';
import { ApiError } from '../utils/apiError.js';
import { encodeQuestionText } from '../utils/questionParser.js';

const formSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['consent', 'tracker', 'custom']),
  companyId: z.coerce.number().optional().nullable(),
});

const questionSchema = z.object({
  questionText: z.string().min(1),
  fieldType: z.enum(['text', 'number', 'boolean', 'dropdown']),
  options: z.array(z.string().min(1)).optional(),
});

const mappingsSchema = z.object({
  questions: z.array(
    z.object({
      questionId: z.coerce.number(),
      isRequired: z.boolean(),
    }),
  ),
});

export const createFormRecord = async (req, res, next) => {
  try {
    const payload = formSchema.parse(req.body);

    if (payload.companyId) {
      const company = await findCompanyById(payload.companyId);
      if (!company) {
        throw new ApiError(404, 'Linked company not found.');
      }
    }

    const form = await createForm({
      ...payload,
      createdBy: req.auth.userId,
    });

    res.status(201).json(form);
  } catch (error) {
    next(error);
  }
};

export const getForms = async (_req, res, next) => {
  try {
    res.json(await listForms());
  } catch (error) {
    next(error);
  }
};

export const getAssignedForms = async (req, res, next) => {
  try {
    res.json(await listAssignedFormsForStudent(req.auth.userId));
  } catch (error) {
    next(error);
  }
};

export const getFormDetail = async (req, res, next) => {
  try {
    const formId = Number(req.params.id);
    const form = await findFormById(formId);

    if (!form) {
      throw new ApiError(404, 'Form not found.');
    }

    const questions = await getFormQuestions(formId, req.auth.userId);
    res.json({
      ...form,
      questions,
    });
  } catch (error) {
    next(error);
  }
};

export const createQuestionRecord = async (req, res, next) => {
  try {
    const payload = questionSchema.parse(req.body);

    if (payload.fieldType === 'dropdown' && (!payload.options || payload.options.length === 0)) {
      throw new ApiError(400, 'Dropdown questions need at least one option.');
    }

    const question = await createQuestion({
      questionText: encodeQuestionText(payload),
      fieldType: payload.fieldType,
    });

    res.status(201).json(question);
  } catch (error) {
    next(error);
  }
};

export const getQuestions = async (_req, res, next) => {
  try {
    res.json(await listQuestions());
  } catch (error) {
    next(error);
  }
};

export const mapQuestionsToForm = async (req, res, next) => {
  try {
    const formId = Number(req.params.id);
    const form = await findFormById(formId);

    if (!form) {
      throw new ApiError(404, 'Form not found.');
    }

    const payload = mappingsSchema.parse(req.body);
    const mappings = await replaceFormQuestionMappings(formId, payload.questions);

    res.json({
      formId,
      questions: mappings,
    });
  } catch (error) {
    next(error);
  }
};

export const sendFormToStudents = async (req, res, next) => {
  try {
    const formId = Number(req.params.id);
    const form = await findFormById(formId);

    if (!form) {
      throw new ApiError(404, 'Form not found.');
    }

    const sender = await findUserById(req.auth.userId);
    const recipientIds = form.companyId
      ? await listEligibleStudentIds(form.companyId)
      : await listStudentIds();

    const result = await sendToUsers({
      userIds: recipientIds,
      title: `${form.title} is now live`,
      body: sender?.name
        ? `${sender.name} shared a new ${form.type} form for you to complete.`
        : `A new ${form.type} form is ready for you to complete.`,
      data: {
        type: 'form_assignment',
        formId,
        companyId: form.companyId ?? '',
      },
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

