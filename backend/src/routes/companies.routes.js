import { Router } from 'express';

import {
  createCompanyRecord,
  exportCompany,
  getCompanies,
  getCompany,
  getEligibleStudents,
  getMyApplications,
  updateStatus,
  updateBlocks,
  updateCompanyRecord,
  deleteCompanyRecord
} from '../controllers/companies.controller.js';
import { authenticate, requireSpc } from '../middleware/auth.js';

import multer from 'multer';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit for JD PDFs
  },
});

router.use(authenticate);

router.get('/', getCompanies);
router.get('/applications/me', getMyApplications);
router.get('/:id', getCompany);
router.post('/', requireSpc, upload.single('jdFile'), createCompanyRecord);
router.put('/:id', requireSpc, upload.single('jdFile'), updateCompanyRecord);
router.delete('/:id', requireSpc, deleteCompanyRecord);
router.get('/:id/eligible-students', requireSpc, getEligibleStudents);
router.get('/:id/export', requireSpc, exportCompany);
router.put('/:id/status', requireSpc, updateStatus);
router.put('/:id/blocks', requireSpc, updateBlocks);

export default router;

