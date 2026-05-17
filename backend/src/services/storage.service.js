import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

import { env } from '../config/env.js';
import { getBucket } from '../config/mongodb.js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const inferFileExtension = (fileName, mimeType) => {
  const extension = path.extname(fileName ?? '').toLowerCase();

  if (!extension || extension.length > 12) {
    if (mimeType) {
      if (mimeType.includes('image/jpeg')) return '.jpg';
      if (mimeType.includes('image/png')) return '.png';
      if (mimeType.includes('image/gif')) return '.gif';
      if (mimeType.includes('image/webp')) return '.webp';
    }
    return '.pdf';
  }

  return extension;
};

const buildResumeFileName = ({ userName, userId, fileName, mimeType }) => {
  const extension = inferFileExtension(fileName, mimeType);
  
  if (!userName) return `User_${userId}_Resume${extension}`;

  const cleanName = userName
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('_');

  return `${cleanName}_Resume${extension}`;
};

const buildProfilePictureFileName = ({ userId, fileName, mimeType }) => {
  const extension = inferFileExtension(fileName, mimeType);
  return `User_${userId}_Profile_Picture${extension}`;
};

const uploadToGridFs = async ({ buffer, fileName, mimeType, userId }) => {
  const bucket = await getBucket();
  if (!bucket) return null;

  const existingFiles = await bucket.find({ filename: fileName }).toArray();
  for (const file of existingFiles) {
    await bucket.delete(file._id);
  }

  const uploadStream = bucket.openUploadStream(fileName, {
    metadata: { userId, contentType: mimeType },
  });

  const readableStream = new Readable();
  readableStream.push(buffer);
  readableStream.push(null);

  await new Promise((resolve, reject) => {
    readableStream.pipe(uploadStream)
      .on('error', reject)
      .on('finish', resolve);
  });

  return true;
};

export const uploadResume = async ({
  buffer,
  fileName,
  mimeType,
  existingUrl,
  userId,
  userName,
}) => {
  const resumeName = buildResumeFileName({ userName, userId, fileName, mimeType });

  // 1. Try MongoDB GridFS
  try {
    const bucket = await getBucket();
    if (bucket) {
      // Delete existing file if any
      const existingFiles = await bucket.find({ filename: resumeName }).toArray();
      for (const file of existingFiles) {
        await bucket.delete(file._id);
      }

      // Upload new file
      // Upload new file
      const uploadStream = bucket.openUploadStream(resumeName, {
        metadata: { userId, contentType: mimeType },
      });

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);

      await new Promise((resolve, reject) => {
        readableStream.pipe(uploadStream)
          .on('error', reject)
          .on('finish', resolve);
      });

      return `${env.baseUrl}/api/resumes/${resumeName}`;
    }
  } catch (error) {
    console.error('MongoDB GridFS upload failed, falling back to local:', error);
  }

  // 2. Fallback to Local Storage
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create uploads directory:', error);
  }

  const filePath = path.join(UPLOADS_DIR, resumeName);
  
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

  await fs.writeFile(filePath, buffer);

  return `${env.baseUrl}/uploads/${resumeName}`;
};

export const uploadProfilePicture = async ({
  buffer,
  fileName,
  mimeType,
  userId,
}) => {
  const profilePictureName = buildProfilePictureFileName({ userId, fileName, mimeType });

  try {
    const uploaded = await uploadToGridFs({
      buffer,
      fileName: profilePictureName,
      mimeType,
      userId,
    });

    if (uploaded) {
      return `${env.baseUrl}/api/profile-pictures/${profilePictureName}`;
    }
  } catch (error) {
    console.error('MongoDB GridFS profile picture upload failed:', error);
  }

  throw new Error('Profile picture storage is unavailable.');
};

export const uploadAttachment = async ({
  buffer,
  fileName,
  mimeType,
  userId,
}) => {
  const extension = inferFileExtension(fileName, mimeType);
  const attachmentName = `Attachment_${Date.now()}_User_${userId}${extension}`;

  // 1. Try MongoDB GridFS
  try {
    const bucket = await getBucket();
    if (bucket) {
      const uploadStream = bucket.openUploadStream(attachmentName, {
        metadata: { userId, contentType: mimeType },
      });

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);

      await new Promise((resolve, reject) => {
        readableStream.pipe(uploadStream)
          .on('error', reject)
          .on('finish', resolve);
      });

      return `${env.baseUrl}/api/attachments/${attachmentName}`;
    }
  } catch (error) {
    console.error('MongoDB GridFS upload failed, falling back to local:', error);
  }


  // 2. Fallback to Local Storage
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create uploads directory:', error);
  }

  const filePath = path.join(UPLOADS_DIR, attachmentName);
  await fs.writeFile(filePath, buffer);

  return `${env.baseUrl}/uploads/${attachmentName}`;
};

export const deleteAttachment = async (url) => {
  if (!url) return;
  const fileName = url.split('/').pop();
  if (!fileName) return;

  // Try GridFS
  try {
    const bucket = await getBucket();
    if (bucket) {
      const files = await bucket.find({ filename: fileName }).toArray();
      for (const file of files) {
        await bucket.delete(file._id);
      }
    }
  } catch (err) {
    console.error('Failed to delete from GridFS:', err);
  }

  // Try local
  try {
    const filePath = path.join(UPLOADS_DIR, fileName);
    await fs.unlink(filePath);
  } catch (err) {
    // Ignore if not found locally
  }
};

import { driveClient, isDriveConfigured } from '../config/drive.js';

export const uploadToGoogleDrive = async ({ buffer, fileName, mimeType, folderLink }) => {
  let folderId = null;
  if (folderLink) {
    const match = folderLink.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    if (match) folderId = match[1];
    else folderId = folderLink; // Fallback if they provide just the ID
  }

  if (!folderId) {
    let globalLink = env.googleDriveFolderId;
    if (globalLink) {
      const match = globalLink.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      folderId = match ? match[1] : globalLink;
    }
  }

  if (!isDriveConfigured) {
    console.warn('Google Drive credentials not fully configured. Falling back to local storage.');
    return null;
  }

  try {
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);

    const fileMetadata = {
      name: fileName,
      parents: folderId ? [folderId] : [],
    };

    const media = {
      mimeType: mimeType,
      body: readableStream,
    };

    const response = await driveClient.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    console.log('Successfully uploaded file to Google Drive:', response.data.id);
    
    try {
      await driveClient.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (shareError) {
      console.warn('Could not set public read permission on Google Drive file:', shareError);
    }

    return response.data.webViewLink || response.data.webContentLink;
  } catch (error) {
    console.error('Failed to upload file to Google Drive:', error);
    return null;
  }
};
