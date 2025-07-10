const winston = require('winston');
const path = require('path');

// Simple console-only logger for production environments like Render
const createProductionLogger = () => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: {
      service: 'pazar-plus',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        level: 'info',
        handleExceptions: true,
        handleRejections: true
      })
    ]
  });
};

// Export the simple logger
const logger = createProductionLogger();

// Add custom methods for compatibility
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id || null
  };

  if (res.statusCode >= 400) {
    logger.warn('HTTP Request Error', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    context
  });
};

logger.logBusinessEvent = (event, data = {}) => {
  logger.info(`Business Event: ${event}`, {
    eventType: 'business',
    event,
    ...data
  });
};

module.exports = logger;

// Add initialization log
module.exports.info('Simple production logger initialized', {
  service: 'pazar-plus',
  logLevel: process.env.LOG_LEVEL || 'info',
  environment: process.env.NODE_ENV || 'development'
});
