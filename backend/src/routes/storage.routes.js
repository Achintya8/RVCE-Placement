import { Router } from 'express';
import { getResume } from '../controllers/storage.controller.js';

const router = Router();

router.get('/resumes/:filename', getResume);
router.get('/attachments/:filename', getResume);

export default router;
