const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../../../models');
const logger = require('../../../utils/logger');

/**
 * Generate JWT token
 */
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

/**
 * Register new user
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password, fullName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return next(new AppError('Email already in use', 400));
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password: await bcrypt.hash(password, 12),
      fullName
    });

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
    user.password = undefined;

    res.status(201).json({
      success: true,
      token,
      data: { user }
    });
  } catch (err) {
    logger.error(`Registration error: ${err.message}`, { error: err });
    next(err);
  }
};

/**
 * User login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    // Find user
    const user = await User.findOne({ 
      where: { email },
      attributes: { include: ['password'] } // Include password for comparison
    });
    
    // Check if user exists and password matches
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      success: true,
      token,
      data: { user }
    });
  } catch (err) {
    logger.error(`Login error: ${err.message}`, { error: err });
    next(err);
  }
};

/**
 * Get current user
 */
const getCurrentUser = async (req, res, next) => {
  try {
    // User should be attached to req by auth middleware
    const user = req.user;
    
    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Forgot password
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return next(new AppError('No user found with that email address', 404));
    }

    // Generate reset token (for demo purposes, would normally send via email)
    const resetToken = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Password reset token generated',
      resetToken // In production, don't send this directly
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reset password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );

    // Find user
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return next(new AppError('Token is invalid or has expired', 400));
    }

    // Update password
    user.password = await bcrypt.hash(password, 12);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    }
    next(err);
  }
};

/**
 * Update password
 */
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user with password
    const user = await User.findByPk(req.user.id, { 
      attributes: { include: ['password'] }
    });

    // Check if current password is correct
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return next(new AppError('Current password is incorrect', 401));
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    // Generate new token
    const token = generateToken(user.id);

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      success: true,
      token,
      message: 'Password updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  updatePassword
};
