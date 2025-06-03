const { authorize } = require("./authorize");
const {
  auth,
  adminAuth,
  optionalAuth,
  requireFeature,
  checkUsageLimit,
  requireTenant,
} = require("./auth");
const { errorHandler } = require("./errorHandler");
const cors = require("./cors");
const validation = require("./validation");
const securityHeaders = require("./security-headers");
const requestTracker = require("./request-tracker");

// Import new enhanced security and monitoring middleware
const {
  RateLimitService,
  SecurityService,
  BusinessRateLimits,
  SecurityMiddlewareFactory,
} = require("./security");
const performanceMonitor = require("../services/performance-monitor");
const cacheService = require("../services/cache-service");

// Enhanced middleware stacks for different use cases
const createEnhancedSecurityStack = () => {
  return SecurityMiddlewareFactory.createSecurityStack();
};

const createAuthSecurityStack = () => {
  return SecurityMiddlewareFactory.createAuthStack();
};

const createPlatformSecurityStack = () => {
  return SecurityMiddlewareFactory.createPlatformStack();
};

// Performance monitoring middleware
const createPerformanceMiddleware = () => {
  return performanceMonitor.createHttpMonitoringMiddleware();
};

// Cache-aware middleware
const createCacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const cacheKey = `http_cache:${req.originalUrl}:${
      req.user?.id || "anonymous"
    }`;

    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        performanceMonitor.trackCacheHit("http");
        res.set("X-Cache", "HIT");
        return res.json(cached);
      }

      performanceMonitor.trackCacheMiss("http");
      res.set("X-Cache", "MISS");

      // Store original json method
      const originalJson = res.json;
      res.json = function (data) {
        // Cache successful responses
        if (res.statusCode === 200) {
          cacheService.set(cacheKey, data, ttl).catch((err) => {
            console.warn("Cache set failed:", err);
          });
        }
        return originalJson.call(this, data);
      };
    } catch (error) {
      console.warn("Cache middleware error:", error);
    }

    next();
  };
};

// Business rate limiting middleware
const createBusinessRateLimitMiddleware = (type) => {
  return async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return next();

    let rateLimitCheck;

    switch (type) {
      case "sync":
        const connectionId = req.params.id || req.body.connectionId;
        rateLimitCheck = await BusinessRateLimits.checkSyncRateLimit(
          userId,
          connectionId
        );
        break;
      case "order_creation":
        rateLimitCheck = await BusinessRateLimits.checkOrderCreationLimit(
          userId
        );
        break;
      case "product_update":
        rateLimitCheck = await BusinessRateLimits.checkProductUpdateLimit(
          userId
        );
        break;
      case "platform_api":
        const connId = req.params.id || req.body.connectionId;
        rateLimitCheck = await BusinessRateLimits.checkPlatformAPILimit(connId);
        break;
      default:
        return next();
    }

    if (!rateLimitCheck.allowed) {
      performanceMonitor.trackRateLimitHit(type, userId);
      return res.status(429).json({
        error: "Rate limit exceeded",
        type: type,
        retryAfter: rateLimitCheck.retryAfter,
        resetTime: rateLimitCheck.resetTime,
      });
    }

    // Add rate limit info to response headers
    res.set({
      "X-RateLimit-Limit": rateLimitCheck.remaining + rateLimitCheck.count,
      "X-RateLimit-Remaining": rateLimitCheck.remaining || 0,
      "X-RateLimit-Reset": new Date(rateLimitCheck.resetTime).toISOString(),
    });

    next();
  };
};

// Error tracking middleware
const createErrorTrackingMiddleware = () => {
  return (error, req, res, next) => {
    const errorType = error.name || "UnknownError";
    const endpoint = req.route?.path || req.path;
    const userId = req.user?.id;

    performanceMonitor.trackError(errorType, endpoint, userId);

    // Continue with original error handling
    next(error);
  };
};

module.exports = {
  // Authentication middleware
  auth,
  adminAuth,
  optionalAuth,
  requireFeature,
  checkUsageLimit,
  requireTenant,

  // Original middleware
  authorize,
  errorHandler,
  cors,
  validation,
  securityHeaders,
  requestTracker,

  // Enhanced security middleware
  RateLimitService,
  SecurityService,
  BusinessRateLimits,
  SecurityMiddlewareFactory,

  // New enhanced middleware stacks
  createEnhancedSecurityStack,
  createAuthSecurityStack,
  createPlatformSecurityStack,
  createPerformanceMiddleware,
  createCacheMiddleware,
  createBusinessRateLimitMiddleware,
  createErrorTrackingMiddleware,

  // Services
  performanceMonitor,
  cacheService,
};
