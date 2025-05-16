// this file is responsible for handling JWT authentication and authorization
// in the Order Management Service. It includes functions to generate tokens,
// authenticate users, and check user roles. The middleware is used to protect
// routes and ensure that only authorized users can access certain endpoints.
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// JWT secret should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-for-development';

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
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user to ensure they still exist and are active
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(403).json({ message: 'User no longer exists' });
    }
    
    if (!user.isActive) {
      return res.status(403).json({ message: 'User account is inactive' });
    }
    
    // Attach user to request object
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(403).json({ message: 'Invalid token' });
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