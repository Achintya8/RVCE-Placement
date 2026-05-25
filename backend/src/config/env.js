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
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID ?? '',
  googleServiceAccount: {
    clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL ?? '',
    privateKey:
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? '',
  },
  webPush: {
    publicKey: process.env.WEB_PUSH_PUBLIC_KEY ?? '',
    privateKey: process.env.WEB_PUSH_PRIVATE_KEY ?? '',
    subject: process.env.WEB_PUSH_SUBJECT ?? 'mailto:placements@rvce.edu.in',
  },
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/mca_placement',
  baseUrl: process.env.BACKEND_URL ?? `http://localhost:${Number(process.env.PORT ?? 4000)}`,
  spcEmails: (process.env.SPC_EMAILS || process.env.SPC_EMAIL || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean),
};
