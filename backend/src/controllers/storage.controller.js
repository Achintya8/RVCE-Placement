import path from 'node:path';
import { getBucket } from '../config/mongodb.js';
import { ApiError } from '../utils/apiError.js';

export const getResume = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const bucket = await getBucket();

    if (!bucket) {
      throw new ApiError(500, 'Storage service unavailable.');
    }

    const files = await bucket.find({ filename }).toArray();
    if (files.length === 0) {
      throw new ApiError(404, 'File not found.');
    }

    const file = files[0];
    
    // Determine the best content type
    let contentType = file.contentType || file.metadata?.contentType;
    if (!contentType) {
      const ext = path.extname(file.filename).toLowerCase();
      const mimeMap = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf'
      };
      contentType = mimeMap[ext] || 'application/octet-stream';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);

    const downloadStream = bucket.openDownloadStreamByName(filename);
    downloadStream.pipe(res);
  } catch (error) {
    next(error);
  }
};
