// Core dependencies
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Use simple logger in production to avoid winston-daily-rotate-file issues
const logger =
  process.env.NODE_ENV === "production"
    ? require("./utils/logger-simple")
    : require("./utils/logger");

// Load configuration
const config = require("./config/config");

// Error handling and middleware
const {
  errorHandler,
  notFoundHandler,
  AppError,
} = require("./middleware/errorHandler");

const {
  apiVersioning,
  deprecationWarning,
} = require("./middleware/versioning");

const path = require("path");
const fs = require("fs");

// Enhanced security and performance monitoring
const {
  createEnhancedSecurityStack,
  createPerformanceMiddleware,
  createErrorTrackingMiddleware,
  performanceMonitor,
  cacheService,
} = require("./middleware");

// Enhanced platform services
const platformServiceManager = require("./services/platform-service-manager");
const inventoryManagementService = require("./services/inventory-management-service");
const notificationService = require("./services/notification-service");

// Background services manager
const BackgroundServicesManager = require("./services/background-services-manager");

// Database transaction management services
const dbTransactionManager = require("./services/database-transaction-manager");
const databaseStatusWebSocket = require("./services/database-status-websocket");
const unifiedWebSocketServer = require("./services/unified-websocket-server");

// Swagger configuration
const { initializeSwagger } = require("./config/swagger");

// Log application startup
logger.info("Initializing Pazar+ application", {
  service: "pazar-plus",
  nodeEnv: process.env.NODE_ENV,
});

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
              connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections
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
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // For development, allow all origins first
      if (process.env.NODE_ENV === "development") {
        logger.debug(`CORS: Allowing origin in development: ${origin}`);
        return callback(null, true);
      }

      // Allow any localhost/127.0.0.1 variations
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        return callback(null, true);
      }

      // Allow any local network IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      const localNetworkRegex =
        /^https?:\/\/(192\.168\.|10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.)[\d.]+(?::\d+)?$/;
      if (localNetworkRegex.test(origin)) {
        logger.debug(`CORS: Allowing local network origin: ${origin}`);
        return callback(null, true);
      }

      // Check configured origins
      if (config.CORS_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(`CORS: Blocking origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    },
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

// Additional CORS debugging and preflight handling
app.use((req, res, next) => {
  // Log CORS-related information
  if (req.method === "OPTIONS") {
    logger.debug(
      `CORS Preflight: ${req.method} ${req.url} from ${req.headers.origin}`
    );
  }

  // Ensure CORS headers are set for all responses
  const origin = req.headers.origin;
  if (origin) {
    // Allow development origins
    if (process.env.NODE_ENV === "development") {
      res.header("Access-Control-Allow-Origin", origin);
    }
    // Allow local network IPs
    else if (
      origin.match(
        /^https?:\/\/(192\.168\.|10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.)[\d.]+(?::\d+)?$/
      )
    ) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    // Allow localhost variations
    else if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      res.header("Access-Control-Allow-Origin", origin);
    }
  }

  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,PATCH,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,Accept,Origin,X-Requested-With,X-API-Version,API-Version,X-Cache-Control"
  );

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  next();
});

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
  skip: (req) => {
    // Always skip in development environment
    if (config.NODE_ENV === "development") {
      return true;
    }

    // Skip for health checks and metrics
    if (
      req.path === "/health" ||
      req.path === "/metrics" ||
      req.path.startsWith("/health")
    ) {
      return true;
    }

    return false;
  },
  handler: (req, res) => {
    logger.warn("Rate limit exceeded", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      path: req.path,
      environment: config.NODE_ENV,
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

// Only apply rate limiting in production
if (config.NODE_ENV !== "development") {
  app.use(limiter);
} else {
  logger.info("Rate limiting disabled in development environment");
}

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

// Handle webpack hot-update files - should not be served by backend
app.use("*.hot-update.json", (req, res, next) => {
  // These files should only be served by webpack dev server
  res.status(404).json({
    success: false,
    message:
      "Webpack hot-update files should be served by the development server",
    code: "WEBPACK_FILE_NOT_FOUND",
  });
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
      enhancedPlatformIntegration: true,
      realTimeNotifications: true,
      inventoryManagement: true,
      conflictResolution: true,
    },
  });
});

// Mount all routes with API prefix
try {
  logger.info("Mounting API routes", { path: "/api" });
  app.use("/api", routes);
  logger.info("API routes mounted successfully", { path: "/api" });
} catch (error) {
  logger.error("Failed to mount API routes", {
    error: error.message,
    stack: error.stack,
  });
  throw error;
}

logger.debug("Setting up static file serving");
// Serve shipping PDFs statically with proper headers for Turkish character support
const shippingPublicPath = path.join(__dirname, "public", "shipping");

// Custom middleware for PDF files to ensure proper headers
app.use("/shipping", (req, res, next) => {
  if (req.path.endsWith(".pdf")) {
    // Set proper content type and encoding for Turkish characters
    res.setHeader("Content-Type", "application/pdf; charset=utf-8");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour

    // Ensure browser can display and print the PDF
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
  }
  next();
});

app.use("/shipping", express.static(shippingPublicPath));
logger.info(`Serving shipping PDFs from: ${shippingPublicPath}`);

logger.debug("Checking for order management shipping path");
// Also serve PDFs from order-management module
const orderManagementShippingPath = path.join(
  __dirname,
  "modules",
  "order-management",
  "public",
  "shipping"
);
if (fs.existsSync(orderManagementShippingPath)) {
  app.use("/order-shipping", express.static(orderManagementShippingPath));
  logger.info(
    `Serving order management shipping PDFs from: ${orderManagementShippingPath}`
  );
} else {
  logger.debug("Order management shipping path does not exist");
}

logger.debug("Initializing Swagger documentation");
// Initialize Swagger documentation at /api-docs
try {
  initializeSwagger(app);
  logger.info("Swagger documentation initialized successfully");
} catch (error) {
  logger.error("Failed to initialize Swagger", { error: error.message });
}

logger.debug("Setting up development/production routing", {
  nodeEnv: process.env.NODE_ENV,
});

// Only serve static files in production mode
// In development, the React dev server handles the frontend on port 3000
if (process.env.NODE_ENV === "production") {
  logger.info("Setting up production static file serving");
  // Serve static files from the React app build directory
  const clientBuildPath = path.resolve(__dirname, "..", "client", "build");
  logger.info(`Serving static files from: ${clientBuildPath}`);
  app.use(express.static(clientBuildPath));

  // For any other request, send back React's index.html file
  app.get("*", (req, res, next) => {
    // Skip API and known non-file routes, and WebSocket upgrade paths
    if (
      req.path.startsWith("/api") ||
      req.path === "/health" ||
      req.path.startsWith("/ws/")
    ) {
      return next();
    }

    logger.debug(`Serving React app for path: ${req.path}`);
    res.sendFile(path.resolve(clientBuildPath, "index.html"), (err) => {
      if (err) {
        logger.error(`Error serving index.html: ${err.message}`, {
          path: req.path,
          error: err,
        });
        next(err);
      }
    });
  });
} else {
  logger.debug("Development mode - React dev server handles frontend");
  // In development mode, just serve a simple message for non-API routes
  app.get("*", (req, res, next) => {
    // Skip API and known non-file routes, and WebSocket upgrade paths
    if (
      req.path.startsWith("/api") ||
      req.path === "/health" ||
      req.path.startsWith("/api-docs") ||
      req.path.startsWith("/ws/")
    ) {
      return next();
    }

    res.json({
      message: "Pazar+ Backend API Server",
      mode: "development",
      note: "Frontend is served separately on port 3000",
      path: req.path,
      availableEndpoints: {
        health: "/health",
        api: "/api/*",
      },
    });
  });
  logger.debug("Development mode routing configured");
}

// Handle 404 errors for all unmatched routes
app.use("*", notFoundHandler);

// Enhanced error tracking middleware
app.use(createErrorTrackingMiddleware());

// Global error handling middleware (must be last)
app.use(errorHandler);
logger.info("Error handlers configured");

logger.debug("Initializing enhanced platform services");
// Initialize enhanced platform services
async function initializeEnhancedServices() {
  logger.debug("Starting enhanced services initialization");
  try {
    // Start performance monitoring periodic updates
    performanceMonitor.startPeriodicUpdates();

    // Initialize cache service
    await cacheService.connect();

    // Setup enhanced platform service event listeners
    setupEnhancedPlatformEventListeners();

    // Setup inventory management event listeners
    setupInventoryManagementEventListeners();

    // Database transaction manager will initialize SQLite optimizations lazily when needed

    logger.info(
      "Enhanced platform integration services initialized successfully"
    );
  } catch (error) {
    logger.error("Failed to initialize enhanced platform services", {
      error: error.message,
      stack: error.stack,
    });
  }
}

// Setup event listeners for enhanced platform service
function setupEnhancedPlatformEventListeners() {
  // Listen for sync completion events
  platformServiceManager.on("syncCompleted", (data) => {
    logger.info("Platform sync completed:", {
      totalProcessed: data.results.totalProcessed,
      duration: data.performance.duration,
      conflicts: data.results.conflicts.length,
    });

    // Send notification
    notificationService.notifySyncCompleted({
      totalProcessed: data.results.totalProcessed,
      duration: data.performance.duration,
      conflicts: data.results.conflicts.length,
      platforms: data.results.successful.map((r) => r.platform),
    });
  });

  // Listen for order conflicts
  platformServiceManager.on("orderConflict", (data) => {
    logger.warn("Order conflict detected:", data);
    notificationService.notifyOrderConflict(data);
  });

  // Listen for manual review requirements
  platformServiceManager.on("manualReviewRequired", (data) => {
    logger.warn("Manual review required:", data);
    notificationService.notifyManualReviewRequired(data);
  });

  // Listen for manual review resolutions
  platformServiceManager.on("manualReviewResolved", (data) => {
    logger.info("Manual review resolved:", data);
  });

  logger.info("Enhanced platform service event listeners setup complete");
}

// Setup event listeners for inventory management service
function setupInventoryManagementEventListeners() {
  // Listen for inventory updates
  inventoryManagementService.on("inventoryUpdated", (data) => {
    logger.info("Inventory updated across platforms:", {
      sku: data.sku,
      newQuantity: data.newQuantity,
      successCount: data.updateResults.filter((r) => r.success).length,
    });
  });

  // Listen for low inventory alerts
  inventoryManagementService.on("lowInventory", (data) => {
    logger.warn("Low inventory alert:", data);
    notificationService.notifyLowInventory(data);
  });

  // Listen for inventory health issues
  inventoryManagementService.on("inventoryHealthIssues", (data) => {
    logger.warn("Inventory health issues detected:", {
      issueCount: data.issues.length,
      timestamp: data.timestamp,
    });
  });

  logger.info("Inventory management service event listeners setup complete");
}

// Initialize WebSocket server for real-time notifications
function initializeWebSocketServer(server) {
  logger.debug("Starting WebSocket server initialization");

  try {
    // First initialize notification service (without WebSocket server)
    logger.debug("Initializing notification service");
    notificationService.initialize();
    logger.debug("Notification service initialized successfully");

    // Then initialize unified WebSocket server with better error handling
    logger.debug("Initializing unified WebSocket server");
    try {
      unifiedWebSocketServer.initialize(server);
      logger.debug("Unified WebSocket server initialized successfully");
    } catch (wsError) {
      logger.error("Failed to initialize unified WebSocket server", {
        error: wsError.message,
        stack: wsError.stack,
      });
      // Continue execution even if WebSocket server fails
    }

    // Setup real-time notification handlers
    logger.debug("Setting up real-time notification handlers");
    notificationService.setupRealTimeNotifications();

    // Start periodic cleanup for notification service
    logger.debug("Starting periodic cleanup for notification service");
    notificationService.startPeriodicCleanup();

    logger.info("WebSocket initialization process completed");
  } catch (error) {
    logger.error("Failed to initialize WebSocket server", {
      error: error.message,
      stack: error.stack,
    });
  }
}

// Initialize services when app starts (temporarily disabled for debugging)
// setImmediate(() => {
//   initializeEnhancedServices().catch(error => {
//     logger.error("Failed to initialize enhanced services:", error);
//   });
// });

logger.debug("App module loaded successfully");

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Shutdown unified WebSocket server
    unifiedWebSocketServer.shutdown();
    logger.info("Unified WebSocket server shut down");

    // Clean up database transaction manager
    dbTransactionManager.cleanup();
    logger.info("Database transaction manager cleaned up");

    // Close cache connections
    await cacheService.disconnect();
    logger.info("Cache service disconnected");

    logger.info("Graceful shutdown completed");
  } catch (error) {
    logger.error("Error during shutdown:", error);
  }

  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unhandled promise rejections
logger.debug("Setting up global error handlers");
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Promise Rejection", {
    error: err.message,
    stack: err.stack,
  });
  performanceMonitor.trackError("UnhandledRejection", "global", "system");
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", { error: err.message, stack: err.stack });
  performanceMonitor.trackError("UncaughtException", "global", "system");
  process.exit(1);
});

logger.info("Pazar+ application setup complete");

// Export both app and WebSocket initialization function
module.exports = { app, initializeWebSocketServer };
