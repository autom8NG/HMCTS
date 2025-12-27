const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const auditLogger = require('../utils/auditLogger');

/**
 * Rate limiter for login endpoint to prevent brute force attacks
 */
const loginLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'too_many_requests',
    error_description: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in test environment
  skip: (req) => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    auditLogger.logRateLimitHit(req.ip, '/auth/login', config.rateLimit.maxRequests);
    res.status(429).json({
      error: 'too_many_requests',
      error_description: 'Too many login attempts, please try again later'
    });
  }
});

/**
 * Rate limiter for token refresh endpoint
 */
const refreshLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 20, // More lenient than login (legitimate users refresh frequently)
  message: {
    error: 'too_many_requests',
    error_description: 'Too many token refresh attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    auditLogger.logRateLimitHit(req.ip, '/auth/refresh', 20);
    res.status(429).json({
      error: 'too_many_requests',
      error_description: 'Too many token refresh attempts, please try again later'
    });
  }
});

/**
 * Rate limiter for logout endpoint
 */
const logoutLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 10,
  message: {
    error: 'too_many_requests',
    error_description: 'Too many logout attempts'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test'
});

/**
 * Global API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'too_many_requests',
    error_description: 'Too many API requests'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test'
});

module.exports = {
  loginLimiter,
  refreshLimiter,
  logoutLimiter,
  apiLimiter
};
