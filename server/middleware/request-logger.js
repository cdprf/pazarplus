/**
 * Request Logging Middleware
 * Provides detailed structured logging for all API requests
 */

const logger = require("../utils/logger");

const createRequestLogger = () => {
  return (req, res, next) => {
    const startTime = Date.now();

    // Request context
    const requestContext = {
      operation: "http_request",
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
      referer: req.get("Referer") || null,
      contentType: req.get("Content-Type") || null,
      contentLength: req.get("Content-Length") || 0,
      apiVersion: req.apiVersion?.resolved || "v1",
      userId: req.user?.id || null,
      userEmail: req.user?.email || null,
      sessionId: req.sessionID || null,
      queryParams: Object.keys(req.query).length > 0 ? req.query : null,
      hasAuthHeader: !!req.headers.authorization,
      timestamp: new Date().toISOString(),
    };

    // Log the incoming request
    logger.logEndpoint(req.originalUrl, req, requestContext);

    // Override res.end to capture response details
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const responseContext = {
        operation: "http_response",
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?.id || null,
        userEmail: req.user?.email || null,
        contentLength: res.get("Content-Length") || 0,
        timestamp: new Date().toISOString(),
      };

      // Log response with appropriate level
      if (res.statusCode >= 500) {
        logger.error("HTTP Server Error", responseContext);
      } else if (res.statusCode >= 400) {
        logger.warn("HTTP Client Error", responseContext);
      } else if (responseTime > 1000) {
        logger.warn("Slow HTTP Response", responseContext);
      } else {
        logger.info("HTTP Response", responseContext);
      }

      // Call original end
      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

module.exports = { createRequestLogger };
