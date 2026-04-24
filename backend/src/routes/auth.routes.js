import { Router } from 'express';

import { getSession, googleLogin, spcLogin } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/google', googleLogin);
router.post('/spc/login', spcLogin);
router.get('/me', authenticate, getSession);

export default router;

