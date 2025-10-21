const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware to optionally authenticate a user.
 * If a valid token is provided, it populates req.user.
 * If no token or an invalid token is provided, it proceeds without a user.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      // No token, proceed as guest
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      // No token, proceed as guest
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_default_jwt_secret'); // Use a default secret for safety
    const user = await User.findByPk(decoded.id);

    if (user) {
      req.user = user;
    }
  } catch (error) {
    // Invalid token, proceed as guest. Do not block the request.
    logger.warn('Optional auth failed: Invalid token provided.', { error: error.message });
  }

  next();
};

module.exports = optionalAuth;