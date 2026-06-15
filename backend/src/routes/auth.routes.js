import { Router } from 'express';

import { getSession, googleLogin } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/google', googleLogin);
router.get('/me', authenticate, getSession);

export default router;

