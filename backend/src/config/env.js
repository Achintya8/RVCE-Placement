import dotenv from 'dotenv';

dotenv.config();

const readBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return value === 'true';
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  databaseSsl: readBoolean(process.env.DATABASE_SSL),
  jwtSecret: process.env.JWT_SECRET ?? 'change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleDriveFolderId: (() => {
    const raw = process.env.GOOGLE_DRIVE_FOLDER_ID ?? '';
    // Accept either a bare folder ID or a full Drive URL
    const match = raw.match(/\/folders\/([^?/]+)/);
    return match ? match[1] : raw;
  })(),
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID ?? '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
  },
};
