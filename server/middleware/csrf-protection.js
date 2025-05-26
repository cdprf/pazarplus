const { Tokens } = require('csrf');
const crypto = require('crypto');

// Initialize CSRF tokens
const tokens = new Tokens();

// Generate CSRF secret and token
const generateCSRFToken = (req) => {
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = tokens.secretSync();
  }
  return tokens.create(req.session.csrfSecret);
};

// Verify CSRF token
const verifyCSRFToken = (req, token) => {
  if (!req.session.csrfSecret) {
    return false;
  }
  return tokens.verify(req.session.csrfSecret, token);
};

// CSRF protection middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for API requests with valid JWT tokens (API-first approach)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }

  const token = req.body._csrf || req.headers['csrf-token'] || req.headers['x-csrf-token'];
  
  if (!token || !verifyCSRFToken(req, token)) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token'
    });
  }

  next();
};

// Middleware to add CSRF token to response
const addCSRFToken = (req, res, next) => {
  // Ensure session exists
  if (!req.session) {
    return next();
  }
  
  const token = generateCSRFToken(req);
  res.locals.csrfToken = token;
  
  // Add to response headers for AJAX requests
  res.setHeader('X-CSRF-Token', token);
  
  next();
};

module.exports = {
  csrfProtection,
  addCSRFToken
};