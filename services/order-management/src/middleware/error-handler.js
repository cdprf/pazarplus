const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Handles unexpected errors (not operational)
const handleUncaughtError = (err) => {
  const message = 'Something went wrong';
  return new AppError(message, 500, false);
};

// Handle database errors
const handleDatabaseError = (err) => {
  const message = process.env.NODE_ENV === 'development' 
    ? `Database error: ${err.message}`
    : 'Database operation failed';
  return new AppError(message, 500, true);
};

// Handle validation errors
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(error => error.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400, true);
};

// Handle JWT errors
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401, true);
};

const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again.', 401, true);
};

// Central error handling middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  if (err.statusCode === 500) {
    logger.error('Error:', {
      error: err,
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params,
      user: req.user ? req.user.id : 'anonymous'
    });
  }

  // Identify and handle specific types of errors
  let error = err;
  if (err.name === 'SequelizeValidationError') error = handleValidationError(err);
  if (err.name === 'SequelizeDatabaseError') error = handleDatabaseError(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
  if (!error.isOperational) error = handleUncaughtError(err);

  // Send error response
  if (process.env.NODE_ENV === 'development') {
    res.status(error.statusCode).json({
      success: false,
      status: error.status,
      error: error,
      message: error.message,
      stack: error.stack
    });
  } else {
    // Production: don't leak error details
    res.status(error.statusCode).json({
      success: false,
      status: error.status,
      message: error.isOperational ? error.message : 'Something went wrong'
    });
  }
};

module.exports = {
  AppError,
  errorHandler
};