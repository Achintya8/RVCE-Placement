import multer from 'multer';
import { z } from 'zod';

import { findUserById, listStudents, updateUserProfile, updateUserProfilePicture, updateUserResume, updateUserVerification, requestProfileUnlock, approveProfileUnlock, updateUserPlacedStatus } from '../repositories/user.repository.js';
import { sendToUsers } from '../services/notification.service.js';
import { uploadProfilePicture, uploadResume } from '../services/storage.service.js';
import { ApiError } from '../utils/apiError.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export const resumeUploadMiddleware = upload.single('resume');
export const profilePictureUploadMiddleware = upload.single('profilePicture');

const emptyStringToNull = (value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }

  return value;
};

const profileSchema = z.object({
  name: z.string().min(1),
  usn: z.string().min(1),
  collegeEmailId: z.email(),
  personalEmailId: z.email(),
  phoneNumber: z.string().regex(/^\d+$/).min(10).max(10),
  aadhar: z.string().regex(/^\d+$/).min(12).max(12),
  linkedIn: z.url().optional().nullable(),
  gitHub: z.url().optional().nullable(),
  ugCgpa: z.coerce.number().min(0).max(10),
  tenthMarks: z.coerce.number().min(0).max(100),
  twelfthMarks: z.coerce.number().min(0).max(100),
  firstSemSgpa: z.coerce.number().min(0).max(10),
  gender: z.string().optional().nullable(),
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

    if (!req.file) {
      throw new ApiError(400, 'Resume file is required.');
    }

    const resumeUrl = await uploadResume({
      buffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      existingUrl: existing.resumeUrl,
      userId: existing.id,
      userName: existing.name,
    });

    const updated = await updateUserResume(existing.id, resumeUrl);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const uploadMyProfilePicture = async (req, res, next) => {
  try {
    const existing = await findUserById(req.auth.userId);

    if (!existing) {
      throw new ApiError(404, 'User not found.');
    }

    if (!req.file) {
      throw new ApiError(400, 'Profile picture is required.');
    }

    if (!req.file.mimetype.startsWith('image/')) {
      throw new ApiError(400, 'Profile picture must be an image.');
    }

    const profilePictureUrl = await uploadProfilePicture({
      buffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      userId: existing.id,
    });

    const updated = await updateUserProfilePicture(existing.id, profilePictureUrl);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const rejectStudent = async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    const { reason } = req.body;
    const student = await findUserById(studentId);

    if (!student) {
      throw new ApiError(404, 'Student not found.');
    }

    if (!reason || reason.trim() === '') {
      throw new ApiError(400, 'Rejection reason is required.');
    }

    await sendToUsers({
      userIds: [studentId],
      title: 'Verification Rejected',
      body: `Reason: ${reason}. Please update your profile ⚠️`,
      data: {
        type: 'profile_verification_rejected',
      },
    });

    res.json({ success: true });
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
      body: 'Your profile is verified and locked ',
      data: {
        type: 'profile_verification',
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const requestUnlock = async (req, res, next) => {
  try {
    const existing = await findUserById(req.auth.userId);

    if (!existing) {
      throw new ApiError(404, 'User not found.');
    }

    const updated = await requestProfileUnlock(req.auth.userId);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const approveUnlock = async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    const student = await findUserById(studentId);

    if (!student) {
      throw new ApiError(404, 'Student not found.');
    }

    const updated = await approveProfileUnlock(studentId);

    await sendToUsers({
      userIds: [studentId],
      title: 'Profile Unlocked',
      body: 'You can now edit your profile details ',
      data: {
        type: 'profile_unlock_approved',
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const markPlaced = async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    const { placed } = req.body;
    const student = await findUserById(studentId);

    if (!student) {
      throw new ApiError(404, 'Student not found.');
    }

    if (typeof placed !== 'boolean') {
      throw new ApiError(400, 'placed (boolean) is required.');
    }

    const updated = await updateUserPlacedStatus(studentId, placed);

    await sendToUsers({
      userIds: [studentId],
      title: placed ? 'Placed Status Update 🎉' : 'Placed Status Update',
      body: placed
        ? 'Congratulations! You have been marked as PLACED. Your future placement activities are now frozen.'
        : 'Your placement status has been set to Not Placed.',
      data: {
        type: 'placed_status_changed',
        placed: String(placed),
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};
