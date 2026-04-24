import { Router } from 'express';

import { getFormResponses, submitFormResponses } from '../controllers/responses.controller.js';
import { authenticate, requireSpc } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/forms/:formId', submitFormResponses);
router.get('/forms/:formId', requireSpc, getFormResponses);

export default router;

