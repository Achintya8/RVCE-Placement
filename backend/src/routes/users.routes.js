import { Router } from 'express';

import {
  getMyProfile,
  getStudents,
  profilePictureUploadMiddleware,
  resumeUploadMiddleware,
  updateMyProfile,
  uploadMyResume,
  uploadMyProfilePicture,
  verifyStudent,
  rejectStudent,
  requestUnlock,
  approveUnlock,
  markPlaced,
  getStudentProfileData
} from '../controllers/users.controller.js';
import { authenticate, requireSpc } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);
router.post('/me/resume', resumeUploadMiddleware, uploadMyResume);
router.post('/me/profile-picture', profilePictureUploadMiddleware, uploadMyProfilePicture);
router.post('/me/unlock-request', requestUnlock);
router.get('/students', requireSpc, getStudents);
router.get('/students/:id/profile-data', requireSpc, getStudentProfileData);
router.post('/students/:id/verify', requireSpc, verifyStudent);
router.post('/students/:id/reject', requireSpc, rejectStudent);
router.post('/students/:id/unlock', requireSpc, approveUnlock);
router.post('/students/:id/placed', requireSpc, markPlaced);

export default router;
