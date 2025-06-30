
const logger = require('../utils/logger');

// Analytics performance tracking middleware
const analyticsPerformanceMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Override res.send to capture response time
  res.send = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log performance metrics
    logger.info('Analytics API Performance', {
      endpoint: req.path,
      method: req.method,
      duration: duration,
      status: res.statusCode,
      userId: req.user?.id,
      timeframe: req.query?.timeframe,
      timestamp: new Date().toISOString()
    });
    
    // Add performance headers
    res.set('X-Response-Time', `${duration}ms`);
    res.set('X-Analytics-Endpoint', req.path);
    
    // Check for slow requests
    if (duration > 2000) {
      logger.warn('Slow Analytics Request', {
        endpoint: req.path,
        duration: duration,
        userId: req.user?.id
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

module.exports = analyticsPerformanceMiddleware;
