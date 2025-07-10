const logger = require('../utils/logger');
const { ValidationError } = require('express-validator');

/**
 * Custom Application Error class
 */
class AppError extends Error {
  constructor(message, statusCode, code = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    this.code = code;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Development error response
 */
const sendErrorDev = (err, req, res) => {
  const errorResponse = {
    success: false,
    status: err.status,
    error: {
      message: err.message,
      name: err.name,
      code: err.code,
      stack: err.stack,
      statusCode: err.statusCode
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      timestamp: err.timestamp
    }
  };

  logger.logError(err, {
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      userId: req.user?.id
    }
  });

  res.status(err.statusCode || 500).json(errorResponse);
};

/**
 * Production error response
 */
const sendErrorProd = (err, req, res) => {
  const errorResponse = {
    success: false,
    message: err.isOperational ? err.message : 'Something went wrong',
    code: err.code || 'INTERNAL_ERROR',
    timestamp: err.timestamp
  };

  // Log all errors in production
  logger.logError(err, {
    request: {
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.id,
      ip: req.ip
    }
  });

  res.status(err.statusCode || 500).json(errorResponse);
};

/**
 * Handle Sequelize CastError
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'CAST_ERROR');
};

/**
 * Handle Sequelize Duplicate Fields
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.fields)[0];
  const value = err.fields[field];
  const message = `Duplicate field value: ${field} = '${value}'. Please use another value.`;
  return new AppError(message, 400, 'DUPLICATE_FIELD');
};

/**
 * Handle Sequelize Validation Error
 */
const handleValidationErrorDB = (err) => {
  const errors = err.errors.map((el) => ({
    field: el.path,
    message: el.message,
    value: el.value
  }));

  const message = `Invalid input data: ${errors
    .map((e) => e.message)
    .join('. ')}`;
  return new AppError(message, 400, 'VALIDATION_ERROR');
};

/**
 * Handle JWT Error
 */
const handleJWTError = () => {
  return new AppError(
    'Invalid token. Please log in again.',
    401,
    'INVALID_TOKEN'
  );
};

/**
 * Handle JWT Expired Error
 */
const handleJWTExpiredError = () => {
  return new AppError(
    'Your token has expired. Please log in again.',
    401,
    'TOKEN_EXPIRED'
  );
};

/**
 * Handle Express Validator Errors
 */
const handleValidationErrors = (errors) => {
  const formattedErrors = errors.map((error) => ({
    field: error.param,
    message: error.msg,
    value: error.value
  }));

  const message = `Validation failed: ${formattedErrors
    .map((e) => `${e.field}: ${e.message}`)
    .join(', ')}`;
  return new AppError(message, 400, 'INPUT_VALIDATION_ERROR');
};

/**
 * Handle Rate Limit Error
 */
const handleRateLimitError = () => {
  return new AppError(
    'Too many requests from this IP, please try again later.',
    429,
    'RATE_LIMIT_EXCEEDED'
  );
};

/**
 * Main error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Default error properties
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  err.timestamp = err.timestamp || new Date().toISOString();

  // Handle specific error types
  let error = { ...err };
  error.message = err.message;

  // Sequelize specific errors
  if (err.name === 'CastError') {
    error = handleCastErrorDB(error);
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    error = handleDuplicateFieldsDB(error);
  }

  if (err.name === 'SequelizeValidationError') {
    error = handleValidationErrorDB(error);
  }

  // JWT specific errors
  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }

  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Express validator errors
  if (err.array && typeof err.array === 'function') {
    error = handleValidationErrors(err.array());
  }

  // Rate limiting errors
  if (err.type === 'rate-limit') {
    error = handleRateLimitError();
  }

  // Handle entity too large
  if (err.type === 'entity.too.large') {
    error = new AppError('Request entity too large', 413, 'PAYLOAD_TOO_LARGE');
  }

  // Handle CORS errors
  if (err.message && err.message.includes('CORS')) {
    error = new AppError('CORS policy violation', 403, 'CORS_ERROR');
  }

  // Handle database connection errors
  if (err.name === 'SequelizeConnectionError') {
    error = new AppError(
      'Database connection failed',
      500,
      'DB_CONNECTION_ERROR'
    );
  }

  // Send error response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

/**
 * Handle async errors
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Handle 404 errors
 */
const notFoundHandler = (req, res, next) => {
  const err = new AppError(
    `Can't find ${req.originalUrl} on this server!`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(err);
};

module.exports = {
  errorHandler,
  AppError,
  catchAsync,
  notFoundHandler
};
