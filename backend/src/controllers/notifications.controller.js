import { z } from 'zod';

import { subscribeTokenToUserTopic } from '../services/notificationTopics.service.js';

const registerSchema = z.object({
  token: z.string().min(1),
});

// POST /api/notifications/register
export const registerNotificationToken = async (req, res, next) => {
  try {
    const { token } = registerSchema.parse(req.body);
    const result = await subscribeTokenToUserTopic({
      userId: req.auth.userId,
      token,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

