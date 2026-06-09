import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

export const globalRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1000, // Limit each IP or User to 1000 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    message: 'Too many requests, please try again later.',
  },
  keyGenerator: (req) => {
    try {
      // If the request is authenticated, use the User ID as the rate limit key.
      // This prevents multiple users on a shared college Wi-Fi from exhausting
      // a single IP-based limit, and correctly pools requests across a single
      // user's multiple devices.
      const authorization = req.headers.authorization;
      if (authorization && authorization.startsWith('Bearer ')) {
        const token = authorization.split(' ')[1];
        if (token) {
          // Decode without verifying signature since it's just for rate-limiting bucketing.
          // The actual verification happens in the auth middleware.
          const payload = jwt.decode(token);
          if (payload && payload.sub) {
            return `user_${payload.sub}`;
          }
        }
      }
    } catch (e) {
      // Ignore token decode errors and fall back to IP
    }
    
    // Fall back to the client's IP address if not authenticated
    return req.ip;
  },
});
