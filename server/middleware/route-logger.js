/**
 * Route Logging Middleware
 * Logs access to specific API endpoints with detailed context
 */

const logger = require("../utils/logger");

const logRouteAccess = (routeName, context = {}) => {
  return (req, res, next) => {
    const logContext = {
      operation: "route_access",
      route: routeName,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id || null,
      userEmail: req.user?.email || null,
      userAgent: req.get("User-Agent"),
      apiVersion: req.apiVersion?.resolved || "v1",
      params: req.params || {},
      query: req.query || {},
      timestamp: new Date().toISOString(),
      ...context,
    };

    logger.logEndpoint(routeName, req, logContext);
    next();
  };
};

const logServiceOperation = (service, operation, context = {}) => {
  return (req, res, next) => {
    const logContext = {
      operation: "service_operation",
      service,
      serviceOperation: operation,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id || null,
      userEmail: req.user?.email || null,
      timestamp: new Date().toISOString(),
      ...context,
    };

    logger.logServiceCall(service, operation, logContext);
    next();
  };
};

const logBusinessEvent = (event, context = {}) => {
  return (req, res, next) => {
    const logContext = {
      operation: "business_event",
      event,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id || null,
      userEmail: req.user?.email || null,
      timestamp: new Date().toISOString(),
      ...context,
    };

    logger.logBusinessEvent(event, logContext);
    next();
  };
};

module.exports = {
  logRouteAccess,
  logServiceOperation,
  logBusinessEvent,
};
