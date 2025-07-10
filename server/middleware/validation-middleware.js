const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Validation middleware to handle express-validator results
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    logger.warn('Validation failed', {
      url: req.url,
      method: req.method,
      errors: errorMessages,
      userId: req.user?.id
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }

  next();
};

module.exports = validationMiddleware;
