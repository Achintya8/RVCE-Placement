import { Router } from 'express';

import {
  getMyProfile,
  getStudents,
  resumeUploadMiddleware,
  updateMyProfile,
  uploadMyResume,
  verifyStudent,
} from '../controllers/users.controller.js';
import { authenticate, requireSpc } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);
router.post('/me/resume', resumeUploadMiddleware, uploadMyResume);
router.get('/students', requireSpc, getStudents);
router.post('/students/:id/verify', requireSpc, verifyStudent);

export default router;

