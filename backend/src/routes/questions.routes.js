import { Router } from 'express';

import { createQuestionRecord, getQuestions } from '../controllers/forms.controller.js';
import { authenticate, requireSpc } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getQuestions);
router.post('/', requireSpc, createQuestionRecord);

export default router;

