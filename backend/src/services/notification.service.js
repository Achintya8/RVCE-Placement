import { admin, firebaseApp, isFirebaseConfigured } from '../config/firebase.js';

export const buildUserTopic = (userId) => `user_${userId}`;

export const sendToUsers = async ({ userIds, title, body, data = {} }) => {
  console.log(`\n🔔 [TESTING] Sending Notification to ${userIds.length} users:`);
  console.log(`Title: "${title}"\nBody: "${body}"\nData:`, data);
  console.log('---');

  if (!firebaseApp || !isFirebaseConfigured) {
    console.log('Firebase not configured. Mocking notification success.');
    return {
      configured: false,
      requested: userIds.length,
      sent: userIds.length,
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

