import { admin, firebaseApp, isFirebaseConfigured } from '../config/firebase.js';
import { buildUserTopic } from './notification.service.js';

export const subscribeTokenToUserTopic = async ({ userId, token }) => {
  const topic = buildUserTopic(userId);

  if (!firebaseApp || !isFirebaseConfigured) {
    return { configured: false, subscribed: true, topic };
  }

  await admin.messaging().subscribeToTopic([token], topic);
  return { configured: true, subscribed: true, topic };
};

