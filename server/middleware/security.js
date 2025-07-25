const rateLimit = require("express-rate-limit");
const logger = require("../utils/logger");

let slowDown;
try {
  slowDown = require("express-slow-down");
} catch (error) {
  logger.warn("express-slow-down not available, using rate limit only");
  // Create a fallback that just returns a pass-through middleware
  slowDown = () => (req, res, next) => next();
}
const helmet = require("helmet");
const cacheService = require("../services/cache-service");

// Development user whitelist - emails that should bypass rate limiting
const DEV_USER_WHITELIST = [
  "dev@pazarplus.com",
  "admin@pazarplus.com",
  "test@pazarplus.com",
  "ahmed@pazarplus.com", // Add your dev email here
];

// Helper function to check if user should skip rate limiting
const shouldSkipRateLimit = (req) => {
  // Always skip in development environment
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  // Skip for whitelisted dev users
  if (
    req.user?.email &&
    DEV_USER_WHITELIST.includes(req.user.email.toLowerCase())
  ) {
    return true;
  }

  // Skip for health checks and metrics
  if (req.path === "/health" || req.path === "/metrics") {
    return true;
  }

  return false;
};

/**
 * Enhanced Rate Limiting Middleware
 * Provides multi-tier rate limiting with Redis-backed persistence
 */
class RateLimitService {
  // API Rate Limiting - General endpoints
  static createAPILimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === "development" ? 10000 : 1000, // Very high limit for dev
      message: {
        error: "Too many requests from this IP, please try again later.",
        retryAfter: "15 minutes",
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        return shouldSkipRateLimit(req);
      },
      keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP
        return req.user?.id || req.ip;
      },
      store: this.createRedisStore(),
    });
  }

  // Platform API Rate Limiting - More restrictive for external API calls
  static createPlatformLimiter() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: process.env.NODE_ENV === "development" ? 1000 : 60, // Much higher for dev
      message: {
        error:
          "Platform API rate limit exceeded. Please wait before making more requests.",
        retryAfter: "1 minute",
      },
      skip: (req) => {
        return shouldSkipRateLimit(req);
      },
      keyGenerator: (req) => {
        const connectionId = req.params.id || req.body.connectionId;
        return `platform:${connectionId}:${req.user?.id}`;
      },
      store: this.createRedisStore(),
    });
  }

  // Authentication Rate Limiting - Less restrictive for development
  static createAuthLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === "development" ? 1000 : 50, // Much higher for dev
      message: {
        error: "Too many authentication attempts, please try again later.",
        retryAfter: "15 minutes",
      },
      skipSuccessfulRequests: true,
      skip: (req) => {
        return (
          shouldSkipRateLimit(req) ||
          (req.path === "/api/auth/me" &&
            process.env.NODE_ENV === "development")
        );
      },
      keyGenerator: (req) => {
        return req.ip + ":" + (req.body.email || req.body.username || "");
      },
      store: this.createRedisStore(),
    });
  }

  // Order Sync Rate Limiting
  static createSyncLimiter() {
    return rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: process.env.NODE_ENV === "development" ? 1000 : 10, // Much higher for dev
      message: {
        error: "Sync rate limit exceeded. Please wait before syncing again.",
        retryAfter: "5 minutes",
      },
      skip: (req) => {
        return shouldSkipRateLimit(req);
      },
      keyGenerator: (req) => {
        return `sync:${req.user?.id}`;
      },
      store: this.createRedisStore(),
    });
  }

  // Progressive Delay Middleware
  static createSpeedLimiter() {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: process.env.NODE_ENV === "development" ? 10000 : 100, // Much higher threshold for dev
      delayMs: (used, req) => {
        // Skip delay entirely in development
        if (process.env.NODE_ENV === "development") {
          return 0;
        }
        const delayAfter = req.slowDown.limit;
        return (used - delayAfter) * 500;
      },
      maxDelayMs: process.env.NODE_ENV === "development" ? 0 : 20000, // No delay in dev
      skip: (req) => {
        return shouldSkipRateLimit(req);
      },
      keyGenerator: (req) => {
        return req.user?.id || req.ip;
      },
      validate: {
        delayMs: false, // Disable the warning message
      },
    });
  }

  // Redis Store for Rate Limiting
  static createRedisStore() {
    if (!cacheService.isConnected) {
      logger.warn("Redis not connected, using memory store for rate limiting");
      return undefined; // Falls back to memory store
    }

    return {
      incr: async (key) => {
        try {
          const result = await cacheService.incrementRateLimit(key, 900); // 15 minutes
          return {
            totalHits: result.count,
            resetTime: new Date(result.resetTime),
          };
        } catch (error) {
          logger.error("Rate limit store error:", error);
          throw error;
        }
      },
      decrement: async (key) => {
        // Optional: implement if needed
      },
      resetKey: async (key) => {
        await cacheService.del(`rate_limit:${key}`);
      },
    };
  }

  // Custom rate limiting for specific business logic
  static async checkCustomRateLimit(identifier, maxRequests, windowSeconds) {
    try {
      const result = await cacheService.incrementRateLimit(
        identifier,
        windowSeconds
      );

      if (result.count > maxRequests) {
        return {
          allowed: false,
          count: result.count,
          resetTime: result.resetTime,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        };
      }

      return {
        allowed: true,
        count: result.count,
        resetTime: result.resetTime,
        remaining: maxRequests - result.count,
      };
    } catch (error) {
      logger.error("Custom rate limit check failed:", error);
      // Allow request if rate limiting fails
      return { allowed: true, count: 0, resetTime: Date.now() };
    }
  }
}

/**
 * Security Headers and Protection Middleware
 */
class SecurityService {
  static createSecurityMiddleware() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: [
            "'self'",
            "https://api.trendyol.com",
            "https://api.hepsiburada.com",
          ],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      crossOriginEmbedderPolicy: false, // Disable for API compatibility
      crossOriginResourcePolicy: { policy: "cross-origin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    });
  }

  // CORS Configuration
  static createCORSConfig() {
    return {
      origin: (origin, callback) => {
        const allowedOrigins = [
          "http://localhost:3000",
          "http://192.168.1.105:3000", // Your machine's IP for external device access
          "https://app.pazarplus.com",
          "https://dashboard.pazarplus.com",
        ];

        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn(`CORS blocked origin: ${origin}`);
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: [
        "Origin",
        "X-Requested-With",
        "Content-Type",
        "Accept",
        "Authorization",
        "X-CSRF-Token",
      ],
      maxAge: 86400, // 24 hours
    };
  }

  // Request sanitization middleware
  static sanitizeRequest() {
    return (req, res, next) => {
      // Remove potentially dangerous characters from query parameters
      for (const key in req.query) {
        if (typeof req.query[key] === "string") {
          req.query[key] = req.query[key].replace(/[<>'"]/g, "");
        }
      }

      // Log suspicious requests
      const suspiciousPatterns = [
        /script/i,
        /javascript/i,
        /vbscript/i,
        /onclick/i,
        /onload/i,
        /eval\(/i,
        /expression\(/i,
        /iframe/i,
        /object/i,
        /embed/i,
      ];

      const requestString =
        JSON.stringify(req.body) + JSON.stringify(req.query);

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(requestString)) {
          logger.warn("Suspicious request detected", {
            ip: req.ip,
            userAgent: req.get("User-Agent"),
            url: req.originalUrl,
            body: req.body,
          });
          break;
        }
      }

      next();
    };
  }

  // Request size limiting
  static createSizeLimiter() {
    return (req, res, next) => {
      const maxSizes = {
        "/api/auth": 1024, // 1KB for auth requests
        "/api/products": 10 * 1024, // 10KB for product data
        "/api/orders": 50 * 1024, // 50KB for order data
        default: 5 * 1024, // 5KB default
      };

      let maxSize = maxSizes.default;

      for (const path in maxSizes) {
        if (req.path.startsWith(path)) {
          maxSize = maxSizes[path];
          break;
        }
      }

      let size = 0;
      req.on("data", (chunk) => {
        size += chunk.length;
        if (size > maxSize) {
          req.destroy();
          res.status(413).json({
            error: "Request entity too large",
            maxSize: `${maxSize} bytes`,
          });
        }
      });

      next();
    };
  }
}

/**
 * Business Logic Rate Limiting
 */
class BusinessRateLimits {
  // Platform sync rate limiting
  static async checkSyncRateLimit(userId, connectionId) {
    // Skip rate limiting in development
    if (process.env.NODE_ENV === "development") {
      return {
        allowed: true,
        count: 0,
        resetTime: Date.now(),
        remaining: 1000,
      };
    }

    const identifier = `sync:${userId}:${connectionId}`;
    return await RateLimitService.checkCustomRateLimit(identifier, 5, 300); // 5 syncs per 5 minutes
  }

  // Order creation rate limiting
  static async checkOrderCreationLimit(userId) {
    // Skip rate limiting in development
    if (process.env.NODE_ENV === "development") {
      return {
        allowed: true,
        count: 0,
        resetTime: Date.now(),
        remaining: 1000,
      };
    }

    const identifier = `order_creation:${userId}`;
    return await RateLimitService.checkCustomRateLimit(identifier, 100, 3600); // 100 orders per hour
  }

  // Product update rate limiting
  static async checkProductUpdateLimit(userId) {
    // Skip rate limiting in development
    if (process.env.NODE_ENV === "development") {
      return {
        allowed: true,
        count: 0,
        resetTime: Date.now(),
        remaining: 1000,
      };
    }

    const identifier = `product_update:${userId}`;
    return await RateLimitService.checkCustomRateLimit(identifier, 200, 3600); // 200 updates per hour
  }

  // Platform API call rate limiting
  static async checkPlatformAPILimit(connectionId) {
    // Skip rate limiting in development
    if (process.env.NODE_ENV === "development") {
      return {
        allowed: true,
        count: 0,
        resetTime: Date.now(),
        remaining: 1000,
      };
    }

    const identifier = `platform_api:${connectionId}`;
    return await RateLimitService.checkCustomRateLimit(identifier, 1000, 3600); // 1000 API calls per hour
  }
}

/**
 * Middleware Factory
 */
class SecurityMiddlewareFactory {
  static createSecurityStack() {
    // In development, skip rate limiting entirely
    if (process.env.NODE_ENV === "development") {
      return [
        SecurityService.createSecurityMiddleware(),
        SecurityService.sanitizeRequest(),
        SecurityService.createSizeLimiter(),
        // Skip rate limiters in development
      ];
    }

    return [
      SecurityService.createSecurityMiddleware(),
      SecurityService.sanitizeRequest(),
      SecurityService.createSizeLimiter(),
      RateLimitService.createSpeedLimiter(),
      RateLimitService.createAPILimiter(),
    ];
  }

  static createAuthStack() {
    // In development, skip rate limiting entirely
    if (process.env.NODE_ENV === "development") {
      return [
        SecurityService.sanitizeRequest(),
        // Skip auth rate limiter in development
      ];
    }

    return [
      RateLimitService.createAuthLimiter(),
      SecurityService.sanitizeRequest(),
    ];
  }

  static createPlatformStack() {
    // In development, skip rate limiting entirely
    if (process.env.NODE_ENV === "development") {
      return [
        // Skip platform rate limiters in development
      ];
    }

    return [
      RateLimitService.createPlatformLimiter(),
      RateLimitService.createSyncLimiter(),
    ];
  }
}

module.exports = {
  RateLimitService,
  SecurityService,
  BusinessRateLimits,
  SecurityMiddlewareFactory,
};
