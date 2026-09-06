import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';

import { env } from '../config/env.js';
import {
  attachGoogleIdentity,
  createGoogleUser,
  findUserByAnyEmail,
  findUserByGoogleId,
  findUserById,
  updateUserGoogleProfilePicture,
} from '../repositories/user.repository.js';
import { ApiError } from '../utils/apiError.js';
import { signAccessToken } from '../utils/jwt.js';

const googleClient = new OAuth2Client(env.googleClientId || undefined);

const googleSchema = z.object({
  idToken: z.string().min(1),
});

/**
 * Constructs the client session object:
 * 1. Checks if the student's email matches designated SPC admin emails.
 * 2. Issues a signed JWT with claims: { userId, isSpc }.
 * 3. Returns the authenticated user entity and permissions.
 */
const buildSessionPayload = async (user) => {
  const userEmails = [user.collegeEmailId, user.personalEmailId]
    .filter(Boolean)
    .map(email => email.toLowerCase());

  const isSpc = userEmails.some(email => env.spcEmails.includes(email));

  return {
    token: signAccessToken({ userId: user.id, isSpc }),
    isSpc,
    notificationTopic: '',
    user,
  };
};

/**
 * POST /api/auth/google
 * Handles Google OAuth Sign-In:
 * 1. Validates the Google ID token cryptographically using google-auth-library.
 * 2. Looks up the user by google_id (`sub`).
 * 3. If not found by google_id, checks for an existing record by college or personal email.
 *    - If found: links the Google identity to the existing user (prevents duplicate accounts).
 *    - If not found: creates a fresh student record in the database.
 * 4. Issues a signed JWT session.
 */
export const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = googleSchema.parse(req.body);
    const verifyPayload = { idToken };

    if (env.googleClientId) {
      verifyPayload.audience = env.googleClientId;
    }

    // Step 1: Verify ID Token signature with Google public keys
    const ticket = await googleClient.verifyIdToken(verifyPayload);
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || payload.email_verified === false) {
      throw new ApiError(401, 'Google account verification failed.');
    }

    // Step 2: Check for existing account by Google ID
    let user = await findUserByGoogleId(payload.sub);

    // Sync profile picture if not yet set
    if (user && payload.picture && !user.profilePictureUrl) {
      user = await updateUserGoogleProfilePicture(user.id, payload.picture);
    }

    // Step 3: Account linking or creation
    if (!user) {
      const existingByEmail = await findUserByAnyEmail(payload.email);
      if (existingByEmail) {
        // Link Google ID to pre-seeded / existing user record
        user = await attachGoogleIdentity({
          userId: existingByEmail.id,
          name: payload.name,
          email: payload.email,
          googleId: payload.sub,
          profilePictureUrl: payload.picture,
        });
      } else {
        // Create new student entry
        user = await createGoogleUser({
          name: payload.name,
          email: payload.email,
          googleId: payload.sub,
          profilePictureUrl: payload.picture,
        });
      }
    }

    res.json(await buildSessionPayload(user));
  } catch (error) {
    next(error);
  }
};



export const getSession = async (req, res, next) => {
  try {
    const user = await findUserById(req.auth.userId);

    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    res.json(await buildSessionPayload(user));
  } catch (error) {
    next(error);
  }
};

