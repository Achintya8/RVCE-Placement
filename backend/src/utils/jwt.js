import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';

export const signAccessToken = ({ userId, isSpc }) =>
  jwt.sign({ sub: userId, isSpc }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const verifyAccessToken = (token) => jwt.verify(token, env.jwtSecret);

