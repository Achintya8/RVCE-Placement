import { Router } from 'express';
import { embedResumeHandler, matchJDHandler, batchMatchJDHandler } from '../controllers/rag.controller.js';

const router = Router();

router.post('/embed-resume', embedResumeHandler);
router.post('/match-jd', matchJDHandler);
router.post('/batch-match-jd', batchMatchJDHandler);

export default router;
