const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const logger = require('../utils/logger');

// Create Redis store if Redis URL is provided, otherwise use memory store
const store = process.env.REDIS_URL
  ? new RedisStore({
      redisURL: process.env.REDIS_URL,
      prefix: 'rl:', // Redis key prefix for rate limiter
    })
  : undefined; // Will use Memory Store

// Create different limiters for different endpoints
const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    store,
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    handler: (req, res, next, options) => {
      logger.warn(`Rate limit exceeded for IP ${req.ip}`);
      res.status(429).json(options.message);
    },
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user ? `user_${req.user.id}` : req.ip;
    },
  });
};

// General API rate limiter
const apiLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many requests, please try again later.'
);

// More strict limiter for authentication endpoints
const authLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  5, // 5 failed attempts per hour
  'Too many login attempts, please try again later.'
);

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