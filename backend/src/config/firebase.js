import admin from 'firebase-admin';

import { env } from './env.js';

const isFirebaseConfigured = Boolean(
  env.firebase.projectId && env.firebase.clientEmail && env.firebase.privateKey,
);

let firebaseApp = null;

if (isFirebaseConfigured && admin.apps.length === 0) {
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.firebase.projectId,
      clientEmail: env.firebase.clientEmail,
      privateKey: env.firebase.privateKey,
    }),
  });
} else if (admin.apps.length > 0) {
  firebaseApp = admin.app();
}

export { admin, firebaseApp, isFirebaseConfigured };

