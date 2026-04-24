import multer from 'multer';
import { z } from 'zod';

import { findUserById, listStudents, updateUserProfile, updateUserResume, updateUserVerification } from '../repositories/user.repository.js';
import { sendToUsers } from '../services/notification.service.js';
import { uploadResume } from '../services/storage.service.js';
import { ApiError } from '../utils/apiError.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export const resumeUploadMiddleware = upload.single('resume');

const emptyStringToNull = (value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }

  return value;
};

const profileSchema = z.object({
  name: z.string().min(1),
  usn: z.string().min(1),
  collegeEmailId: z.string().email(),
  personalEmailId: z.string().email(),
  phoneNumber: z.preprocess(emptyStringToNull, z.string().min(10).max(15).optional().nullable()),
  aadhar: z.preprocess(emptyStringToNull, z.string().regex(/^\d+$/).optional().nullable()),
  linkedIn: z.preprocess(emptyStringToNull, z.string().url().optional().nullable()),
  gitHub: z.preprocess(emptyStringToNull, z.string().url().optional().nullable()),
  ugCgpa: z.coerce.number().min(0).max(10),
  tenthMarks: z.coerce.number().min(0).max(100),
  twelfthMarks: z.coerce.number().min(0).max(100),
  firstSemSgpa: z.coerce.number().min(0).max(10),
});

export const getMyProfile = async (req, res, next) => {
  try {
    const user = await findUserById(req.auth.userId);

    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (req, res, next) => {
  try {
    const existing = await findUserById(req.auth.userId);

    if (!existing) {
      throw new ApiError(404, 'User not found.');
    }

    if (existing.verified) {
      throw new ApiError(403, 'Verified profiles cannot be edited.');
    }

    const payload = profileSchema.parse(req.body);
    const updated = await updateUserProfile(req.auth.userId, payload);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const uploadMyResume = async (req, res, next) => {
  try {
    const existing = await findUserById(req.auth.userId);

    if (!existing) {
      throw new ApiError(404, 'User not found.');
    }

    if (existing.verified) {
      throw new ApiError(403, 'Verified profiles cannot be edited.');
    }

    if (!req.file) {
      throw new ApiError(400, 'Resume file is required.');
    }

    const resumeUrl = await uploadResume({
      buffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      existingUrl: existing.resumeUrl,
      userId: existing.id,
    });

    const updated = await updateUserResume(existing.id, resumeUrl);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const getStudents = async (req, res, next) => {
  try {
    const verified = req.query.verified === undefined ? undefined : req.query.verified === 'true';
    res.json(await listStudents({ verified }));
  } catch (error) {
    next(error);
  }
};

export const verifyStudent = async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    const student = await findUserById(studentId);

    if (!student) {
      throw new ApiError(404, 'Student not found.');
    }

    const updated = await updateUserVerification(studentId, true);

    await sendToUsers({
      userIds: [studentId],
      title: 'Profile Verified',
      body: 'Your placement profile has been verified and locked for edits.',
      data: {
        type: 'profile_verification',
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};
