import rateLimit from 'express-rate-limit';

// Rate limiter for admin login and 2FA verification attempts (10 requests per 15 minutes per IP)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many login attempts. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

// General admin API rate limiter (120 requests per minute)
export const adminApiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down.',
    code: 'API_RATE_LIMIT_EXCEEDED',
  },
});
