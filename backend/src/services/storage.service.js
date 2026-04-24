import path from 'node:path';

import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

import { env } from '../config/env.js';
import {
  buildS3ObjectUrl,
  extractS3ObjectKeyFromUrl,
  isS3Configured,
  normalizeS3Folder,
  s3Client,
} from '../config/s3.js';
import { ApiError } from '../utils/apiError.js';

const inferFileExtension = (fileName) => {
  const extension = path.extname(fileName ?? '').toLowerCase();

  if (!extension || extension.length > 12) {
    return '.pdf';
  }

  return extension;
};

const buildResumeObjectKey = ({ userId, fileName }) => {
  const folder = normalizeS3Folder(env.aws.folder);
  const extension = inferFileExtension(fileName);
  const key = `user_${userId}_resume${extension}`;

  return folder ? `${folder}/${key}` : key;
};

export const uploadResume = async ({
  buffer,
  fileName,
  mimeType,
  existingUrl,
  userId,
}) => {
  if (!isS3Configured) {
    throw new ApiError(500, 'AWS S3 is not configured.');
  }

  const objectKey = buildResumeObjectKey({ userId, fileName });
  const previousObjectKey = extractS3ObjectKeyFromUrl(existingUrl);

  if (previousObjectKey && previousObjectKey !== objectKey) {
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: env.aws.bucket,
          Key: previousObjectKey,
        }),
      );
    } catch (error) {
      console.warn('Failed to remove old resume from S3:', error.message);
    }
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.aws.bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: mimeType || 'application/octet-stream',
      CacheControl: 'private, max-age=0, no-cache',
    }),
  );

  return buildS3ObjectUrl(objectKey);
};
