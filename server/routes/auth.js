const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');
const { auth } = require('../middleware/auth');
const { 
  authLimiter, 
  validateRequest, 
  registerValidation, 
  loginValidation, 
  passwordChangeValidation 
} = require('../middleware/validation');

// Debug middleware
router.use((req, res, next) => {
  console.log(`Auth route accessed: ${req.method} ${req.url}`);
  next();
});

// Apply auth rate limiter to all auth routes
router.use(authLimiter);

// Public routes with validation
router.post('/register', registerValidation, validateRequest, authController.register);
router.post('/login', loginValidation, validateRequest, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

// Protected routes
router.get('/me', auth, authController.getProfile); // Added missing /me endpoint
router.get('/profile', auth, authController.getProfile);
router.post('/change-password', auth, passwordChangeValidation, validateRequest, authController.changePassword);
router.get('/logout', auth, authController.logout);

module.exports = router;