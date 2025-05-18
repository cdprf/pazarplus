// this file is responsible for handling JWT authentication and authorization
// in the Order Management Service. It includes functions to generate tokens,
// authenticate users, and check user roles. The middleware is used to protect
// routes and ensure that only authorized users can access certain endpoints.
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

// JWT secret should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'pazar-plus-development-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'pazar-plus-refresh-development-secret';

// Log a warning in development if using default secrets
if (process.env.NODE_ENV === 'development' && !process.env.JWT_SECRET) {
  console.warn('WARNING: Using default JWT_SECRET for development. Set JWT_SECRET in .env for production.');
}

/**
 * Generates JWT tokens for authenticated users
 * @param {Object} user - User object from database
 * @returns {Object} - Access and refresh tokens
 */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      role: user.role
    }, 
    JWT_SECRET, 
    { expiresIn: '1h' }
  );
  
  const refreshToken = jwt.sign(
    { id: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = async (req, res, next) => {
  // Special case for development mode
  if (process.env.NODE_ENV === 'development') {
    // Allow OPTIONS requests to pass through (CORS preflight)
    if (req.method === 'OPTIONS') {
      return next();
    }
    
    // Check for dev-mode header
    if (req.headers['x-dev-mode'] === 'true') {
      logger.debug(`DEV MODE: Request with dev-mode header: ${req.method} ${req.path}`);
      
      // If test token was applied by dev-test-auth.js, skip verification
      if (req.isUsingTestToken) {
        logger.debug(`DEV MODE: Using automatically applied test token: ${req.method} ${req.path}`);
        return next();
      }
    }
  }

  const authHeader = req.headers['authorization'];
  logger.debug(`Auth header received: ${authHeader ? authHeader.substring(0, 15) + '...' : 'none'}`);
  
  // Handle dev tokens for easier frontend development
  if (process.env.NODE_ENV === 'development') {
    if (authHeader === 'Bearer dev-mode-token' || authHeader === 'Bearer dev-admin-token') {
      // For development mode, look up the actual dev user instead of using a hardcoded ID
      try {
        const devUser = await User.findOne({ where: { email: 'dev@example.com' } });
        
        if (devUser) {
          logger.debug(`DEV MODE: Using frontend dev token with actual user ID ${devUser.id}: ${req.method} ${req.path}`);
          req.user = { 
            id: devUser.id, // Use the actual database ID instead of 'dev-user-id'
            email: devUser.email,
            role: devUser.role,
            permissions: ['admin', 'view_orders', 'edit_orders', 'view_platforms'],
            isDevUser: true
          };
          return next();
        } else {
          logger.error('DEV MODE: Development user not found in database');
          return res.status(401).json({
            success: false,
            message: 'Development user not found in database'
          });
        }
      } catch (error) {
        logger.error(`DEV MODE error: ${error.message}`);
        return res.status(500).json({
          success: false,
          message: 'Server error in development authentication'
        });
      }
    }
  }
  
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required' 
    });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if this is a development user token
    if (process.env.NODE_ENV === 'development' && decoded.isDevUser) {
      // For dev user, get the actual user from database instead of using hardcoded ID
      const devUser = await User.findOne({ where: { email: 'dev@example.com' } });
      if (devUser) {
        logger.debug(`DEV MODE: Using valid development token with actual user ID ${devUser.id}: ${req.method} ${req.path}`);
        // Override the ID with the actual database ID
        decoded.id = devUser.id;
        req.user = decoded;
        return next();
      }
    }
    
    // For all other tokens, verify against the database
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(403).json({ 
        success: false,
        message: 'User no longer exists' 
      });
    }
    
    if (!user.isActive) {
      return res.status(403).json({ 
        success: false,
        message: 'User account is inactive' 
      });
    }
    
    // Attach user to request object
    req.user = decoded;
    next();
  } catch (error) {
    logger.error(`Token verification error: ${error.message}`, { path: req.path });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired' 
      });
    }
    return res.status(403).json({ 
      success: false,
      message: 'Invalid token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Middleware to refresh access token using refresh token
 */
const refreshAccessToken = async (req, res) => {
  const refreshToken = req.body.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }
    
    const tokens = generateTokens(user);
    
    return res.json(tokens);
  } catch (error) {
    return res.status(403).json({ message: 'Invalid refresh token' });
  }
};

/**
 * Middleware to check if user has admin role
 */
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

module.exports = {
  generateTokens,
  authenticateToken,
  refreshAccessToken,
  requireAdmin
};