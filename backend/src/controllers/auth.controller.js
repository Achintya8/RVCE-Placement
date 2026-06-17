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

export const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = googleSchema.parse(req.body);
    const verifyPayload = { idToken };

    if (env.googleClientId) {
      verifyPayload.audience = env.googleClientId;
    }

    const ticket = await googleClient.verifyIdToken(verifyPayload);
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || payload.email_verified === false) {
      throw new ApiError(401, 'Google account verification failed.');
    }

    let user = await findUserByGoogleId(payload.sub);

    if (user && payload.picture && !user.profilePictureUrl) {
      user = await updateUserGoogleProfilePicture(user.id, payload.picture);
    }

    if (!user) {
      const existingByEmail = await findUserByAnyEmail(payload.email);
      if (existingByEmail) {
        user = await attachGoogleIdentity({
          userId: existingByEmail.id,
          name: payload.name,
          email: payload.email,
          googleId: payload.sub,
          profilePictureUrl: payload.picture,
        });
      } else {
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

