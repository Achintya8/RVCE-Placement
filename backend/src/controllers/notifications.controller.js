import { z } from 'zod';

import {
  getNotificationSubscriptionStats,
  upsertNotificationSubscription,
} from '../repositories/notification.repository.js';
import { getPublicVapidKey, sendToUsers } from '../services/notification.service.js';

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const getNotificationPublicKey = async (_req, res, next) => {
  try {
    res.json(getPublicVapidKey());
  } catch (error) {
    next(error);
  }
};

export const registerNotificationSubscription = async (req, res, next) => {
  try {
    const subscription = subscriptionSchema.parse(req.body.subscription);
    await upsertNotificationSubscription({
      userId: req.auth.userId,
      subscription,
    });

    res.json({ subscribed: true });
  } catch (error) {
    next(error);
  }
};

export const getNotificationStatus = async (_req, res, next) => {
  try {
    const stats = await getNotificationSubscriptionStats();
    res.json({
      ...getPublicVapidKey(),
      ...stats,
    });
  } catch (error) {
    next(error);
  }
};

export const sendTestNotification = async (req, res, next) => {
  try {
    const result = await sendToUsers({
      userIds: [req.auth.userId],
      title: 'RVCE Placement notifications are working',
      body: 'This is a test notification from the placement portal.',
      data: {
        type: 'test',
      },
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};
