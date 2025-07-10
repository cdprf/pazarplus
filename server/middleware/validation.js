const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Enhanced rate limiting configuration with better error messages and monitoring
const createEnhancedLimiter = (options = {}) => {
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for ${options.name || 'unknown'}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        user: req.user?.id || 'anonymous'
      });

      res.status(429).json({
        success: false,
        message:
          options.message || 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.round(options.windowMs / 1000),
        type: options.name || 'general'
      });
    },
    skip: (req) => {
      // Skip in development environment
      if (process.env.NODE_ENV === 'development') {
        return true;
      }

      // Skip for health checks
      if (req.path === '/health' || req.path === '/metrics') {
        return true;
      }

      return false;
    }
  };

  return rateLimit({ ...defaults, ...options });
};

// Authentication rate limiter with progressive penalties
const authLimiter = createEnhancedLimiter({
  name: 'authentication',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 10, // More reasonable production limit
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  skipSuccessfulRequests: true, // Don't count successful auth requests
  keyGenerator: (req) => {
    // Combine IP and email/username for more specific limiting
    const identifier = req.body?.email || req.body?.username || 'unknown';
    return `auth:${req.ip}:${identifier}`;
  }
});

// General API rate limiter
const generalLimiter = createEnhancedLimiter({
  name: 'general_api',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 1000,
  message: 'API rate limit exceeded. Please slow down your requests.',
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip;
  }
});

// Sensitive operations limiter (password changes, account deletions)
const sensitiveOperationsLimiter = createEnhancedLimiter({
  name: 'sensitive_operations',
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'development' ? 100 : 5,
  message: 'Too many sensitive operations. Please wait before trying again.',
  keyGenerator: (req) => {
    return `sensitive:${req.user?.id || req.ip}`;
  }
});

// Platform API operations limiter
const platformLimiter = createEnhancedLimiter({
  name: 'platform_api',
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 50,
  message:
    'Platform API rate limit exceeded. Please wait before making more requests.',
  keyGenerator: (req) => {
    const connectionId = req.params.id || req.body.connectionId || 'unknown';
    return `platform:${connectionId}:${req.user?.id || req.ip}`;
  }
});

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Validation rules for different endpoints
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .trim()
    .withMessage('Username must be 3-30 characters'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('fullName').optional().isLength({ max: 100 }).trim()
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const passwordChangeValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
];

module.exports = {
  authLimiter,
  generalLimiter,
  validateRequest,
  registerValidation,
  loginValidation,
  passwordChangeValidation,
  sensitiveOperationsLimiter,
  platformLimiter
};
