// This file configures the authentication routes for the Order Management Service.
// It uses Express.js to define routes for user registration, login, profile retrieval, password update, and logout.
// It also uses express-validator for input validation and JWT for token management.
const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken, refreshAccessToken } = require('../middleware/auth-middleware');

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('companyName').notEmpty().withMessage('Company name is required')
  ],
  authController.register
);

/**
 * @route POST /api/auth/login
 * @desc Log in a user
 * @access Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  authController.login
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public (with refresh token)
 */
router.post('/refresh', refreshAccessToken);

/**
 * @route GET /api/auth/profile
 * @desc Get user profile
 * @access Private
 */
router.get('/profile', authenticateToken, authController.getProfile);

/**
 * @route PUT /api/auth/update-password
 * @desc Update user password
 * @access Private
 */
router.put(
  '/update-password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  authController.updatePassword
);

/**
 * @route POST /api/auth/logout
 * @desc Log out user (invalidate tokens)
 * @access Private
 */
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;