import multer from 'multer';
import { z } from 'zod';

import { findUserById, listStudents, updateUserProfile, updateUserProfilePicture, updateUserResume, updateUserVerification, requestProfileUnlock, approveProfileUnlock, updateUserPlacedStatus, rejectStudentProfile } from '../repositories/user.repository.js';
import { listProfileDataFormsForStudent, getFormQuestions } from '../repositories/form.repository.js';
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

/**
 * GET /api/users/me
 * Retrieves current authenticated student's profile, including academic records,
 * verification state, unlock request flags, and rejection status.
 */
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

/**
 * PUT /api/users/me
 * Updates student profile details with strict validation (Zod).
 * Integrity Guard: If `existing.verified === true`, profile edits are blocked (HTTP 403)
 * to prevent students from tampering with academic scores during active company drives.
 */
export const updateMyProfile = async (req, res, next) => {
  try {
    const existing = await findUserById(req.auth.userId);

    if (!existing) {
      throw new ApiError(404, 'User not found.');
    }

    // Strict profile lock: once verified by SPC, student cannot modify academic data
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

/**
 * POST /api/users/students/:id/reject
 * Rejects a student's verification submission with granular field feedback:
 * 1. Stores rejection reason and an array of offending field names (e.g. ['tenthMarks', 'resumeUrl']) in PostgreSQL JSONB.
 * 2. Maps field keys to human-readable labels.
 * 3. Triggers targeted Web Push notification alerting the student exactly what needs correction.
 */
export const rejectStudent = async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    const { reason, rejectedFields } = req.body;
    const student = await findUserById(studentId);

    if (!student) {
      throw new ApiError(404, 'Student not found.');
    }

    if (!reason || reason.trim() === '') {
      throw new ApiError(400, 'Rejection reason is required.');
    }

    const fields = Array.isArray(rejectedFields) ? rejectedFields : [];
    
    // Update rejection details in DB
    const updatedUser = await rejectStudentProfile(studentId, reason.trim(), fields);

    // Map keys to human readable labels for push notifications
    const FIELD_LABELS = {
      name: 'Full Name',
      usn: 'USN',
      collegeEmailId: 'College Email ID',
      personalEmailId: 'Personal Email ID',
      phoneNumber: 'Phone Number',
      aadhar: 'Aadhar Number',
      gender: 'Gender',
      ugCgpa: 'UG CGPA',
      firstSemSgpa: '1st Sem SGPA',
      tenthMarks: '10th Aggregate (%)',
      twelfthMarks: '12th Aggregate (%)',
      linkedIn: 'LinkedIn URL',
      gitHub: 'GitHub URL',
      resumeUrl: 'Resume',
      profilePictureUrl: 'Profile Picture'
    };
    
    const fieldNames = fields.map(f => FIELD_LABELS[f] || f).join(', ');
    const notificationBody = fields.length > 0
      ? `Rejection reason: ${reason}. Please correct fields: ${fieldNames} ⚠️`
      : `Rejection reason: ${reason}. Please update your profile ⚠️`;

    await sendToUsers({
      userIds: [studentId],
      title: 'Verification Rejected',
      body: notificationBody,
      data: {
        type: 'profile_verification_rejected',
      },
    });

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/students
 * SPC Directory: Lists all students with optional filtering by verification status (`?verified=true|false`).
 */
export const getStudents = async (req, res, next) => {
  try {
    const verified = req.query.verified === undefined ? undefined : req.query.verified === 'true';
    res.json(await listStudents({ verified }));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/students/:id/verify
 * Approves and locks a student's profile:
 * 1. Sets `verified = true`, creating a snapshot of verified academic data.
 * 2. Prevents any further student edits until an unlock request is granted.
 * 3. Sends confirmation push notification.
 */
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

export const getStudentProfileData = async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    const forms = await listProfileDataFormsForStudent(studentId);
    const result = [];
    for (const f of forms) {
      const questions = await getFormQuestions(f.id, studentId);
      result.push({
        ...f,
        questions,
      });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
};
