import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';

export const authenticate = (req, _res, next) => {
  try {
    const authorization = req.headers.authorization ?? '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Missing or invalid authorization header.');
    }

    const payload = verifyAccessToken(token);
    req.auth = {
      userId: Number(payload.sub),
      isSpc: Boolean(payload.isSpc),
    };

    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, 'Invalid session token.'));
  }
};

export const requireSpc = (req, _res, next) => {
  if (!req.auth?.isSpc) {
    return next(new ApiError(403, 'SPC privileges are required for this action.'));
  }

  return next();
};

