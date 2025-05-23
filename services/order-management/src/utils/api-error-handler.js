const logger = require('./logger');

class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const handleError = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new ApiError(message, 400);
};

const handleDatabaseError = (err) => {
  const message = 'Database operation failed';
  return new ApiError(message, 500, false);
};

const handleJWTError = () => {
  return new ApiError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = () => {
  return new ApiError('Your token has expired. Please log in again.', 401);
};

module.exports = {
  ApiError,
  handleError,
  handleValidationError,
  handleDatabaseError,
  handleJWTError,
  handleJWTExpiredError
};