const csrf = require('csurf');
const { ApiError } = require('../utils/api-error-handler');

// Configure CSRF protection
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Custom error handler for CSRF errors
const handleCSRFError = (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    throw new ApiError('Invalid CSRF token', 403);
  }
  next(err);
};

module.exports = {
  csrfProtection,
  handleCSRFError
};