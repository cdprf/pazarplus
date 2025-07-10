const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');
const { auth } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  passwordChangeValidation
} = require('../middleware/validation');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');

// Define validateRequest locally to avoid import issues
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

// Production-safe rate limiter for auth routes
const productionSafeAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 50 : 1000, // Higher limit for production to avoid issues
  message: {
    success: false,
    message:
      'Too many authentication attempts. Please try again in 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use IP-based limiting only (simpler and more reliable)
  keyGenerator: (req) => req.ip,
  // Skip rate limiting in development or if disabled
  skip: (req) => {
    return (
      process.env.NODE_ENV === 'development' ||
      process.env.DISABLE_RATE_LIMITING === 'true'
    );
  },
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    res.status(429).json({
      success: false,
      message:
        'Too many authentication attempts. Please try again in 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

// Debug middleware
router.use((req, res, next) => {
  logger.debug(`Auth route accessed: ${req.method} ${req.url}`);
  next();
});

// Apply production-safe rate limiter to all auth routes
router.use(productionSafeAuthLimiter);

// Public routes with validation
router.post(
  '/register',
  registerValidation,
  validateRequest,
  authController.register
);
router.post('/login', loginValidation, validateRequest, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

// Development route - only works in development mode
router.post('/dev-token', authController.generateDevToken);

// Protected routes
router.get('/me', auth, authController.getProfile); // Added missing /me endpoint
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, authController.updateProfile);
router.post(
  '/change-password',
  auth,
  passwordChangeValidation,
  validateRequest,
  authController.changePassword
);
router.get('/logout', auth, authController.logout);

module.exports = router;
