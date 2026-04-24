import { Router } from 'express';

import {
  createFormRecord,
  getAssignedForms,
  getFormDetail,
  getForms,
  mapQuestionsToForm,
  sendFormToStudents,
} from '../controllers/forms.controller.js';
import { authenticate, requireSpc } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getForms);
router.get('/assigned/me', getAssignedForms);
router.get('/:id', getFormDetail);
router.post('/', requireSpc, createFormRecord);
router.post('/:id/questions', requireSpc, mapQuestionsToForm);
router.post('/:id/send', requireSpc, sendFormToStudents);

export default router;

