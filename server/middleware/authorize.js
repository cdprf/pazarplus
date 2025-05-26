const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * Authorization middleware
 * Verifies JWT token and attaches user to request
 */
const authorize = async (req, res, next) => {
  try {
    // Get token from headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required', 401));
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-secret-key'
    );
    
    // Find user
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return next(new AppError('User not found', 401));
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error(`Authorization error: ${error.message}`, { error });
    
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    }
    
    next(error);
  }
};

module.exports = { authorize };
