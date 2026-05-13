import { Router } from 'express';

import { authenticate } from '../middleware/auth.js';
import { registerNotificationToken } from '../controllers/notifications.controller.js';

const router = Router();

router.post('/register', authenticate, registerNotificationToken);

export default router;

