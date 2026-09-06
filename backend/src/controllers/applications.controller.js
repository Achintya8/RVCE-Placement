import { z } from 'zod';

import { findCompanyById } from '../repositories/company.repository.js';
import { upsertApplication } from '../repositories/application.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import { ApiError } from '../utils/apiError.js';

const applicationSchema = z.object({
  consent: z.boolean().optional(),
  tracker: z.boolean().optional(),
});

/**
 * PUT /api/applications/company/:companyId
 * Submits or updates a student's Consent (Yes/No) and Tracker (Mail received or not):
 * Guards:
 *  1. Placed Freeze Guard: If student is marked `placed === true`, placement activities are frozen.
 *  2. Block Check: If SPC has enabled `consent_blocked` or `tracker_blocked`, changes are rejected.
 *  3. Idempotent Upsert: Inserts or updates the unique (student_id, company_id) application row.
 */
export const saveApplication = async (req, res, next) => {
  try {
    const studentId = req.auth.userId;
    const user = await findUserById(studentId);
    if (user?.placed) {
      throw new ApiError(403, 'You have been marked as placed. Further placement activities are frozen.');
    }

    const companyId = Number(req.params.companyId);
    const company = await findCompanyById(companyId, studentId);

    if (!company) {
      throw new ApiError(404, 'Company not found.');
    }

    const payload = applicationSchema.parse(req.body);

    if (Object.keys(payload).length === 0) {
      throw new ApiError(400, 'Consent or tracker is required.');
    }

    if (payload.consent !== undefined && company.consentBlocked && payload.consent !== company.consent) {
      throw new ApiError(403, 'Consent submission is blocked for this company.');
    }

    if (payload.tracker !== undefined && company.trackerBlocked && payload.tracker !== company.tracker) {
      throw new ApiError(403, 'Tracker submission is blocked for this company.');
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

