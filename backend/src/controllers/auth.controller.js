import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';

import { env } from '../config/env.js';
import { findSpcAccountForUser, findSpcAccountByUsername } from '../repositories/spc.repository.js';
import {
  attachGoogleIdentity,
  createGoogleUser,
  findUserByAnyEmail,
  findUserByGoogleId,
  findUserById,
} from '../repositories/user.repository.js';
import { buildUserTopic } from '../services/notification.service.js';
import { ApiError } from '../utils/apiError.js';
import { signAccessToken } from '../utils/jwt.js';

const googleClient = new OAuth2Client(env.googleClientId || undefined);

const googleSchema = z.object({
  idToken: z.string().min(1),
});

const spcLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const buildSessionPayload = async (user) => {
  const spcAccount = await findSpcAccountForUser(user.id);
  const isSpc = Boolean(spcAccount);

  return {
    token: signAccessToken({ userId: user.id, isSpc }),
    isSpc,
    notificationTopic: buildUserTopic(user.id),
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

    if (!user) {
      const existingByEmail = await findUserByAnyEmail(payload.email);
      if (existingByEmail) {
        user = await attachGoogleIdentity({
          userId: existingByEmail.id,
          name: payload.name,
          email: payload.email,
          googleId: payload.sub,
        });
      } else {
        user = await createGoogleUser({
          name: payload.name,
          email: payload.email,
          googleId: payload.sub,
        });
      }
    }

    res.json(await buildSessionPayload(user));
  } catch (error) {
    next(error);
  }
};

export const spcLogin = async (req, res, next) => {
  try {
    const { username, password } = spcLoginSchema.parse(req.body);
    const account = await findSpcAccountByUsername(username);

    if (!account) {
      throw new ApiError(401, 'Invalid SPC username or password.');
    }

    const passwordMatches = await bcrypt.compare(password, account.password);

    if (!passwordMatches) {
      throw new ApiError(401, 'Invalid SPC username or password.');
    }

    const user = await findUserById(account.user_id);

    if (!user) {
      throw new ApiError(404, 'SPC user is not linked to a valid user record.');
    }

    res.json({
      token: signAccessToken({ userId: user.id, isSpc: true }),
      isSpc: true,
      notificationTopic: buildUserTopic(user.id),
      user,
    });
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

