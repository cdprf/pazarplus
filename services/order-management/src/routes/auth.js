const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail
} = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Add refresh token endpoint
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided'
      });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      logger.warn(`Refresh token contains invalid user ID: ${decoded.id}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        clearToken: true
      });
    }
    
    // Generate new tokens
    const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { 
      expiresIn: process.env.JWT_EXPIRE || '30m' 
    });
    
    // Set cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 60 * 1000 // 30 minutes
    });
    
    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    logger.error(`Token refresh failed: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
      clearToken: true
    });
  }
});

// Protected routes
router.get('/me', protect, getMe);

module.exports = router;
