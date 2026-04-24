import { ApiError } from '../utils/apiError.js';

export const notFoundHandler = (_req, _res, next) => {
  next(new ApiError(404, 'Route not found.'));
};

export const errorHandler = (error, _req, res, _next) => {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;

  if (!(error instanceof ApiError)) {
    console.error(error);
  }

  res.status(statusCode).json({
    message: error.message ?? 'Internal server error.',
    details: error.details ?? null,
  });
};

