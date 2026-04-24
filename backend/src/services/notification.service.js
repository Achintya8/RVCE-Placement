import { admin, firebaseApp, isFirebaseConfigured } from '../config/firebase.js';

export const buildUserTopic = (userId) => `user_${userId}`;

export const sendToUsers = async ({ userIds, title, body, data = {} }) => {
  if (!firebaseApp || !isFirebaseConfigured) {
    return {
      configured: false,
      requested: userIds.length,
      sent: 0,
    };
  }

  const messages = userIds.map((userId) => ({
    topic: buildUserTopic(userId),
    notification: {
      title,
      body,
    },
    data: {
      ...Object.entries(data).reduce((accumulator, [key, value]) => {
        accumulator[key] = String(value);
        return accumulator;
      }, {}),
    },
  }));

  const response = await admin.messaging().sendEach(messages);

  return {
    configured: true,
    requested: userIds.length,
    sent: response.successCount,
    failed: response.failureCount,
  };
};

