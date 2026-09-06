import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Authentication Middleware:
 * Extracts and verifies the Bearer JWT from the incoming Authorization header.
 * Populates `req.auth` with `{ userId, isSpc }` for downstream handlers.
 * Throws 401 Unauthorized if the token is missing, expired, or tampered with.
 */
export const authenticate = (req, _res, next) => {
  try {
    const authorization = req.headers.authorization ?? '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Missing or invalid authorization header.');
    }

    // Cryptographically verify token signature and extract claims
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

/**
 * Role-Based Access Control (RBAC) Guard:
 * Restricts sensitive coordinator/admin operations (company creation, form creation, student verification)
 * strictly to verified Student Placement Coordinators (isSpc === true).
 * Throws 403 Forbidden if the authenticated user is not an SPC.
 */
export const requireSpc = (req, _res, next) => {
  if (!req.auth?.isSpc) {
    return next(new ApiError(403, 'SPC privileges are required for this action.'));
  }

  return next();
};

