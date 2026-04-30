import fs from 'node:fs/promises';
import path from 'node:path';

import { env } from '../config/env.js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const inferFileExtension = (fileName) => {
  const extension = path.extname(fileName ?? '').toLowerCase();

  if (!extension || extension.length > 12) {
    return '.pdf';
  }

  return extension;
};

const buildResumeFileName = ({ userId, fileName }) => {
  const extension = inferFileExtension(fileName);
  return `user_${userId}_resume${extension}`;
};

export const uploadResume = async ({
  buffer,
  fileName,
  mimeType,
  existingUrl,
  userId,
}) => {
  // Ensure the uploads directory exists
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create uploads directory:', error);
  }

  const resumeName = buildResumeFileName({ userId, fileName });
  const filePath = path.join(UPLOADS_DIR, resumeName);
  
  // If there's an existing URL, it will just get overwritten because we use a deterministic filename based on userId.
  // So we don't strictly need to delete the old file unless the extension changes, but for safety:
  if (existingUrl && existingUrl.includes('/uploads/')) {
    try {
      const oldFileName = existingUrl.split('/').pop();
      if (oldFileName && oldFileName !== resumeName) {
        const oldFilePath = path.join(UPLOADS_DIR, oldFileName);
        await fs.unlink(oldFilePath);
      }
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  // Write the file locally
  await fs.writeFile(filePath, buffer);

  // Return the public URL to access the file
  // Using localhost:4000 dynamically based on env port
  return `http://localhost:${env.port}/uploads/${resumeName}`;
};
