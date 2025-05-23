const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;
  let refreshToken;

  // Get token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // Prioritize secure cookies over header (more secure approach)
  else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
    refreshToken = req.cookies.refreshToken;
  }

  // Check if token exists
  if (!token) {
    logger.warn('Authentication attempt with no token');
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findByPk(decoded.id);

    // Check if user exists
    if (!user) {
      logger.warn(`Token contains invalid user ID: ${decoded.id}. Clearing token.`);
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found',
        clearToken: true
      });
    }

    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    // Handle token expiration specifically
    if (error.name === 'TokenExpiredError' && refreshToken) {
      // Instead of failing, mark that a refresh is needed
      // The refresh middleware will handle this
      req.tokenExpired = true;
      req.refreshToken = refreshToken;
      return next();
    }

    logger.error(`Authentication error: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      clearToken: true
    });
  }
};

// Refresh token middleware
exports.refreshAuth = async (req, res, next) => {
  // Only run this middleware if the token is expired and refresh token exists
  if (!req.tokenExpired || !req.refreshToken) {
    return next();
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(req.refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
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

    // Generate new access token
    const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { 
      expiresIn: process.env.JWT_EXPIRE || '30m' 
    });

    // Set new access token cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 60 * 1000 // 30 minutes
    });

    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error(`Token refresh failed: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
      clearToken: true
    });
  }
};

// Authorize roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn(`Authorization failure: User ${req.user.id} with role ${req.user.role} attempted to access a route requiring roles: ${roles.join(', ')}`);
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};
