import { S3Client } from '@aws-sdk/client-s3';

import { env } from './env.js';

const trimRightSlash = (value) => value.replace(/\/+$/, '');
const trimBothSlashes = (value) => value.replace(/^\/+|\/+$/g, '');

const clientConfig = {
  region: env.aws.region || undefined,
};

if (env.aws.endpoint) {
  clientConfig.endpoint = env.aws.endpoint;
}

if (env.aws.forcePathStyle) {
  clientConfig.forcePathStyle = true;
}

if (env.aws.accessKeyId && env.aws.secretAccessKey) {
  clientConfig.credentials = {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  };
}

export const s3Client = new S3Client(clientConfig);
export const isS3Configured = Boolean(env.aws.bucket && env.aws.region);

const encodeObjectKey = (key) => key.split('/').map(encodeURIComponent).join('/');

export const buildS3ObjectUrl = (key) => {
  const encodedKey = encodeObjectKey(key);

  if (env.aws.publicBaseUrl) {
    return `${trimRightSlash(env.aws.publicBaseUrl)}/${encodedKey}`;
  }

  if (env.aws.endpoint) {
    const endpoint = trimRightSlash(env.aws.endpoint);
    if (env.aws.forcePathStyle) {
      return `${endpoint}/${env.aws.bucket}/${encodedKey}`;
    }

    return `${endpoint}/${encodedKey}`;
  }

  return `https://${env.aws.bucket}.s3.${env.aws.region}.amazonaws.com/${encodedKey}`;
};

const tryDecode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
};

export const extractS3ObjectKeyFromUrl = (url) => {
  if (!url) {
    return null;
  }

  const normalizedBucket = env.aws.bucket.toLowerCase();
  const normalizedRegion = env.aws.region.toLowerCase();

  if (env.aws.publicBaseUrl) {
    const publicBase = trimRightSlash(env.aws.publicBaseUrl);
    if (url.startsWith(`${publicBase}/`)) {
      return tryDecode(url.slice(publicBase.length + 1));
    }
  }

  if (env.aws.endpoint) {
    const endpoint = trimRightSlash(env.aws.endpoint);
    const pathPrefix = `${endpoint}/${env.aws.bucket}/`;

    if (env.aws.forcePathStyle && url.startsWith(pathPrefix)) {
      return tryDecode(url.slice(pathPrefix.length));
    }

    if (url.startsWith(`${endpoint}/`)) {
      return tryDecode(url.slice(endpoint.length + 1));
    }
  }

  try {
    const parsed = new URL(url);
    const host = parsed.host.toLowerCase();
    const pathname = parsed.pathname.replace(/^\/+/, '');
    const decodedPath = tryDecode(pathname);

    if (
      host === `${normalizedBucket}.s3.${normalizedRegion}.amazonaws.com` ||
      host === `${normalizedBucket}.s3.amazonaws.com` ||
      host.startsWith(`${normalizedBucket}.s3-`)
    ) {
      return decodedPath;
    }

    if (
      host === `s3.${normalizedRegion}.amazonaws.com` ||
      host === 's3.amazonaws.com'
    ) {
      const prefix = `${env.aws.bucket}/`;
      if (decodedPath.startsWith(prefix)) {
        return decodedPath.slice(prefix.length);
      }
    }
  } catch (error) {
    return null;
  }

  return null;
};

export const normalizeS3Folder = (folder) => trimBothSlashes(folder ?? '');
