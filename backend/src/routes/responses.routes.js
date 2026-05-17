import { Router } from 'express';
import multer from 'multer';

import { exportFormResponses, getFormResponses, submitFormResponses, uploadResponseFile } from '../controllers/responses.controller.js';
import { authenticate, requireSpc } from '../middleware/auth.js';

const router = Router();
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

router.use(authenticate);

router.post('/upload', upload.single('file'), uploadResponseFile);
router.post('/forms/:formId', submitFormResponses);
router.get('/forms/:formId', requireSpc, getFormResponses);
router.get('/forms/:formId/export', requireSpc, exportFormResponses);

export default router;

