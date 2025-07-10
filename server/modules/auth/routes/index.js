const express = require('express');
const authController = require('../../../controllers/auth-controller');
const { authorize } = require('../../../middleware/authorize');

const router = express.Router();

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authorize, authController.getProfile); // Fixed: getCurrentUser -> getProfile
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/update-password', authorize, authController.changePassword); // Fixed: updatePassword -> changePassword

module.exports = router;
