const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const { ApiError } = require('../utils/api-error-handler');

// Create different limiters for different endpoints
const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP ${req.ip}`);
      res.status(429).json({
        success: false,
        message: message
      });
    },
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user ? `user_${req.user.id}` : req.ip;
    },
    skip: (req) => process.env.NODE_ENV === 'development'
  });
};

// General API rate limiter
const apiLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many requests, please try again later.'
);

// More lenient rate limiting in development
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 100 : 5, // Higher limit in development
  message: {
    success: false,
    message: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again later'
    });
  },
  skip: (req) => process.env.NODE_ENV === 'development'
});

// Platform sync rate limiter
const syncLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  10, // 10 sync attempts per hour
  'Platform sync rate limit exceeded. Please wait before syncing again.'
);

module.exports = {
  apiLimiter,
  authLimiter,
  syncLimiter
};