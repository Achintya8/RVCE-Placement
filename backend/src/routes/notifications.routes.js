import { Router } from 'express';

import { authenticate, requireSpc } from '../middleware/auth.js';
import {
  getNotificationPublicKey,
  getNotificationStatus,
  registerNotificationSubscription,
  sendTestNotification,
} from '../controllers/notifications.controller.js';

const router = Router();

router.get('/public-key', authenticate, getNotificationPublicKey);
router.post('/subscriptions', authenticate, registerNotificationSubscription);
router.get('/status', authenticate, requireSpc, getNotificationStatus);
router.post('/test', authenticate, sendTestNotification);

export default router;

