import { Router } from 'express';

import {
  createCompanyRecord,
  exportCompany,
  getCompanies,
  getCompany,
  getEligibleStudents,
  getMyApplications,
} from '../controllers/companies.controller.js';
import { authenticate, requireSpc } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getCompanies);
router.get('/applications/me', getMyApplications);
router.get('/:id', getCompany);
router.post('/', requireSpc, createCompanyRecord);
router.get('/:id/eligible-students', requireSpc, getEligibleStudents);
router.get('/:id/export', requireSpc, exportCompany);

export default router;

