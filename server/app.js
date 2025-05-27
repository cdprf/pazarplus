const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const logger = require("./utils/logger");
const { loadConfig } = require("./config/env");
const {
  errorHandler,
  notFoundHandler,
  AppError,
} = require("./middleware/errorHandler");
const {
  apiVersioning,
  deprecationWarning,
} = require("./middleware/versioning");

// Import enhanced security and performance monitoring
const {
  createEnhancedSecurityStack,
  createPerformanceMiddleware,
  createErrorTrackingMiddleware,
  performanceMonitor,
  cacheService,
} = require("./middleware");

// Load and validate environment configuration
const config = loadConfig();

const app = express();

// Import routes
const routes = require("./routes");

// Trust proxy (important for rate limiting and IP detection)
app.set("trust proxy", 1);

// Enhanced performance monitoring middleware (must be early)
app.use(createPerformanceMiddleware());

// Request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Parse JSON and URL-encoded data with enhanced limits
app.use(
  express.json({
    limit: "10mb",
    parameterLimit: 50000,
    type: ["application/json", "text/plain"],
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
    parameterLimit: 50000,
  })
);

// Enhanced security middleware stack
app.use(createEnhancedSecurityStack());

// Security middleware with enhanced configuration
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy:
      config.NODE_ENV === "production"
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", "data:", "https:"],
            },
          }
        : false,
    hsts:
      config.NODE_ENV === "production"
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
  })
);

// CORS configuration with environment-based origins
app.use(
  cors({
    origin: config.CORS_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "Origin",
      "X-Requested-With",
      "X-API-Version",
      "API-Version",
      "X-Cache-Control",
    ],
    exposedHeaders: [
      "X-API-Version",
      "X-Supported-Versions",
      "X-API-Deprecated",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "X-Cache",
    ],
    maxAge: 86400, // Cache preflight for 24 hours
  })
);

// Enhanced rate limiting with environment configuration
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn("Rate limit exceeded", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      path: req.path,
    });

    // Track rate limit violations
    performanceMonitor.trackRateLimitHit("global", req.user?.id);

    res.status(429).json({
      success: false,
      message: "Too many requests from this IP, please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: Math.round(config.RATE_LIMIT_WINDOW_MS / 1000),
    });
  },
});
app.use(limiter);

// API versioning middleware
app.use(apiVersioning);

// Deprecation warnings (currently no deprecated versions)
app.use(deprecationWarning([]));

// Request logging middleware with response time
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const authHeader = req.headers.authorization;

  // Enhanced request logging
  logger.debug("Incoming Request", {
    method: req.method,
    url: req.originalUrl,
    apiVersion: req.apiVersion?.resolved,
    userAgent: req.headers["user-agent"]?.substring(0, 100),
    contentLength: req.headers["content-length"] || 0,
    ip: req.ip,
    authPresent: !!authHeader,
  });

  // Response logging
  const originalSend = res.send;
  res.send = function (data) {
    const responseTime = Date.now() - req.startTime;

    logger.logRequest(req, res, responseTime);

    originalSend.call(this, data);
  };

  // Check for potentially problematic headers
  const totalHeaderSize = JSON.stringify(req.headers).length;
  if (totalHeaderSize > 8192) {
    // 8KB threshold
    logger.warn("Large headers detected", {
      headerSize: totalHeaderSize,
      path: req.path,
      ip: req.ip,
    });
  }

  next();
});

// Health check and metrics endpoints (before API versioning affects routes)
app.use("/", require("./routes/health"));

// API info endpoint
app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    name: "Pazar Plus API",
    version: req.apiVersion?.resolved || "v1",
    description: "Turkish e-commerce platform management API",
    documentation: "/api/docs",
    supportedVersions: ["v1"],
    features: {
      compliance: config.ENABLE_COMPLIANCE_MODULE,
      analytics: config.ENABLE_ANALYTICS_MODULE,
      marketplace: config.ENABLE_B2B_MARKETPLACE,
      caching: true,
      monitoring: true,
      enhancedSecurity: true,
    },
  });
});

// Mount all routes with API prefix
app.use("/api", routes);

// Handle 404 errors for all unmatched routes
app.use("*", notFoundHandler);

// Enhanced error tracking middleware
app.use(createErrorTrackingMiddleware());

// Global error handling middleware (must be last)
app.use(errorHandler);

// Initialize performance monitoring
async function initializeServices() {
  try {
    // Start performance monitoring periodic updates
    performanceMonitor.startPeriodicUpdates();

    // Initialize cache service
    await cacheService.connect();

    logger.info(
      "Enhanced security and monitoring services initialized successfully"
    );
  } catch (error) {
    logger.error("Failed to initialize enhanced services:", error);
  }
}

// Initialize services when app starts
initializeServices();

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close cache connections
    await cacheService.disconnect();
    logger.info("Cache service disconnected");
  } catch (error) {
    logger.error("Error during cache service shutdown:", error);
  }

  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Promise Rejection:", err);
  performanceMonitor.trackError("UnhandledRejection", "global", "system");
  if (config.NODE_ENV === "production") {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  performanceMonitor.trackError("UncaughtException", "global", "system");
  process.exit(1);
});

module.exports = app;
