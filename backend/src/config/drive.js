import { google } from 'googleapis';

import { env } from './env.js';

// Reuse the Firebase service account credentials — same project, same account
const auth = new google.auth.JWT({
  email: env.firebase.clientEmail,
  key: env.firebase.privateKey,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

export const driveClient = google.drive({ version: 'v3', auth });

export const isDriveConfigured = Boolean(
  env.googleDriveFolderId && env.firebase.clientEmail && env.firebase.privateKey,
);
