const logger = require('../utils/logger');

// Track recent requests to identify duplicates
const recentRequests = new Map();
const WINDOW_MS = 1000; // Look for duplicates within 1 second

const trackDuplicateRequests = (req, res, next) => {
  const requestKey = `${req.method}:${req.originalUrl}:${req.headers.authorization || 'noauth'}`;
  const now = Date.now();
  
  // Clean up old entries
  for (const [key, timestamp] of recentRequests.entries()) {
    if (now - timestamp > WINDOW_MS) {
      recentRequests.delete(key);
    }
  }
  
  // Check if this is a duplicate request
  if (recentRequests.has(requestKey)) {
    // Log duplicate request with referrer to help identify source
    logger.warn(`Duplicate request detected: ${req.method} ${req.originalUrl}`, {
      timeSinceLast: now - recentRequests.get(requestKey),
      referrer: req.headers.referer || 'unknown',
      userAgent: req.headers['user-agent']
    });
  }
  
  // Record this request
  recentRequests.set(requestKey, now);
  next();
};

module.exports = { trackDuplicateRequests };
