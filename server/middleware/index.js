const { authorize } = require('./authorize');
const { errorHandler } = require('./error-handler');
const cors = require('./cors');
const rateLimit = require('./rate-limit');
const validation = require('./validation');
const securityHeaders = require('./security-headers');
const csrfProtection = require('./csrf-protection');
const cacheControl = require('./cache-control');
const requestTracker = require('./request-tracker');

module.exports = {
  authorize,
  errorHandler,
  cors,
  rateLimit,
  validation,
  securityHeaders,
  csrfProtection,
  cacheControl,
  requestTracker
};
