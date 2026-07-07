import { Router } from 'express';

import {
  createFormRecord,
  getAssignedForms,
  getFormDetail,
  getForms,
  mapQuestionsToForm,
  sendFormToStudents,
  getPendingStudents,
  deleteFormRecord,
  toggleFormResponses,
  getProfileDataForms
} from '../controllers/forms.controller.js';
import { authenticate, requireSpc } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getForms);
router.get('/assigned/me', getAssignedForms);
router.get('/profile-data', getProfileDataForms);
router.get('/:id', getFormDetail);
router.post('/', requireSpc, createFormRecord);
router.post('/:id/questions', requireSpc, mapQuestionsToForm);
router.post('/:id/send', requireSpc, sendFormToStudents);
router.get('/:id/pending', requireSpc, getPendingStudents);
router.delete('/:id', requireSpc, deleteFormRecord);
router.put('/:id/toggle-responses', requireSpc, toggleFormResponses);

export default router;

