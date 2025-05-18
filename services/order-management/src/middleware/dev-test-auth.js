/**
 * Development middleware to automatically add test tokens to requests
 * IMPORTANT: Only for development and testing use!
 */

const jwt = require('jsonwebtoken');
const config = require('../config/app');
const logger = require('../utils/logger');
const { User } = require('../models'); // Import User model

// Store the token and user details globally in this module
let testToken = null;
let devUserDetails = null;

// Function to create/retrieve dev user and generate token
const initializeDevAuth = async () => {
  try {
    const devUserEmail = 'dev@example.com';
    let user = await User.findOne({ where: { email: devUserEmail } });

    if (!user) {
      // This case should ideally be handled by app.js initialization,
      // but as a fallback or for standalone middleware testing:
      logger.warn(`Dev user ${devUserEmail} not found. Attempting to create.`);
      user = await User.create({
        email: devUserEmail,
        password: 'devpassword123', // Ensure this matches app.js or is securely handled
        fullName: 'Development User',
        companyName: 'Dev Co',
        role: 'admin'
      });
      logger.info(`Fallback: Dev user ${devUserEmail} created with ID ${user.id}`);
    }

    if (user) {
      devUserDetails = {
        id: user.id, // Use the actual database ID
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        // Add any other necessary fields for the JWT payload from the user object
        isDevUser: true
      };
      testToken = jwt.sign(devUserDetails, config.jwtSecret, { expiresIn: '24h' });
      logger.info(`Dev auth initialized. Test token generated for user ID: ${user.id}`);
    } else {
      logger.error('Failed to create or find dev user for test token generation.');
    }
  } catch (error) {
    logger.error('Error initializing dev auth:', error);
  }
};

// Call initializeDevAuth when the module is loaded.
// This is an async operation, so the token might not be available immediately.
// For a robust solution, this might need to be integrated into app startup.
initializeDevAuth();

const applyTestToken = (req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return next();
  }

  if (!testToken) {
    logger.warn('Test token not yet available. Dev auth initialization might be pending or failed.');
    // Optionally, you could try to re-initialize or wait, but for simplicity, we proceed.
    // This might mean some initial requests don't get the token if initialization is slow.
    return next(); 
  }

  // Skip if there's already an Authorization header
  if (req.headers.authorization) {
    logger.debug(`Request already has Authorization header: ${req.method} ${req.path}`);
    return next();
  }

  // Skip if request is coming from Swagger UI (it handles its own auth)
  const referer = req.headers.referer || '';
  if (referer.includes('/api-docs')) {
    return next();
  }

  // Check for special header that allows bypassing the test token
  if (req.headers['x-skip-test-auth']) {
    return next();
  }

  // Always apply the dev header for frontend requests with x-dev-mode
  if (req.headers['x-dev-mode'] === 'true') {
    req.headers.authorization = `Bearer ${testToken}`;
    req.isUsingTestToken = true;
    // Attach the dev user details to req.user, simulating what auth-middleware would do
    req.user = devUserDetails; 
    logger.debug(`DEV MODE: Applied test token to request with x-dev-mode header: ${req.method} ${req.path}`);
    return next();
  }

  // Apply the test token to the request
  req.headers.authorization = `Bearer ${testToken}`;
  
  // Add a development flag to make it clear this is using a test token
  req.isUsingTestToken = true;
  // Attach the dev user details to req.user
  req.user = devUserDetails;
  
  if (req.path.startsWith('/api') && !req.path.startsWith('/api/auth')) {
    logger.debug(`DEV MODE: Auto-applied test token to request: ${req.method} ${req.path}`);
  }
  
  next();
};

module.exports = applyTestToken;
// Export the token for testing or other purposes if needed, but be mindful of its availability
module.exports.getTestToken = () => testToken; 
module.exports.getDevUserDetails = () => devUserDetails;