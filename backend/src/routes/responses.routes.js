import { Router } from 'express';

import { exportFormResponses, getFormResponses, submitFormResponses } from '../controllers/responses.controller.js';
import { authenticate, requireSpc } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/forms/:formId', submitFormResponses);
router.get('/forms/:formId', requireSpc, getFormResponses);
router.get('/forms/:formId/export', requireSpc, exportFormResponses);

export default router;

