import { z } from 'zod';

import { findCompanyById } from '../repositories/company.repository.js';
import { upsertApplication } from '../repositories/application.repository.js';
import { ApiError } from '../utils/apiError.js';

const applicationSchema = z.object({
  consent: z.boolean().optional(),
  tracker: z.boolean().optional(),
});

export const saveApplication = async (req, res, next) => {
  try {
    const companyId = Number(req.params.companyId);
    const company = await findCompanyById(companyId, req.auth.userId);

    if (!company) {
      throw new ApiError(404, 'Company not found.');
    }

    const payload = applicationSchema.parse(req.body);

    if (Object.keys(payload).length === 0) {
      throw new ApiError(400, 'Consent or tracker is required.');
    }

    const application = await upsertApplication({
      studentId: req.auth.userId,
      companyId,
      consent: payload.consent,
      tracker: payload.tracker,
    });

    res.json(application);
  } catch (error) {
    next(error);
  }
};

