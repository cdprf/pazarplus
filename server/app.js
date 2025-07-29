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
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

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

// Parse JSON and URL-encoded data with enhanced limits (excluding multipart for multer)
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
    type: function (req) {
      // Only parse if NOT multipart form data (let multer handle those)
      return !req.is("multipart/form-data");
    },
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
      if (!origin) {
        return callback(null, true);
      }

      // For development, allow all origins first
      if (process.env.NODE_ENV === "development") {
        logger.info(`CORS: Allowing origin in development: ${origin}`, {
          operation: "cors_check",
          origin,
          environment: "development",
        });
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
        logger.info(`CORS: Allowing local network origin: ${origin}`, {
          operation: "cors_check",
          origin,
          type: "local_network",
        });
        return callback(null, true);
      }

      // Check configured origins
      if (config.CORS_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(`CORS: Blocking origin: ${origin}`, {
        operation: "cors_check",
        origin,
        action: "blocked",
      });
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
    logger.info(
      `CORS Preflight: ${req.method} ${req.url} from ${req.headers.origin}`,
      {
        operation: "cors_preflight",
        method: req.method,
        url: req.url,
        origin: req.headers.origin,
        ip: req.ip,
      }
    );
  }

  // Ensure CORS headers are set for all responses
  const origin = req.headers.origin;
  if (origin) {
    // Allow development origins
    if (process.env.NODE_ENV === "development") {
      res.header("Access-Control-Allow-Origin", origin);
    }
    // Allow production domains
    else if (config.CORS_ORIGINS.includes(origin)) {
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

  // Enhanced request logging - Replace debug with info for important operations
  logger.info("Incoming Request", {
    timestamp,
    method: req.method,
    url: req.originalUrl,
    apiVersion: req.apiVersion?.resolved,
    userAgent: req.headers["user-agent"]?.substring(0, 100),
    contentLength: req.headers["content-length"] || 0,
    ip: req.ip,
    authPresent: !!authHeader,
    referer: req.get("Referer") || null,
    queryParams: Object.keys(req.query).length > 0 ? req.query : null,
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
app.use("*.hot-update.json", (req, res) => {
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

// === HIGH PRIORITY SHIPPING ROUTE ===
// This MUST come before any static file serving to work correctly
console.log("🔧 SETTING UP HIGH PRIORITY SHIPPING ROUTE");
logger.info("Setting up HIGH PRIORITY shipping route");

const shippingPath = path.join(__dirname, "public", "shipping");
console.log(`📂 Shipping path configured: ${shippingPath}`);

// Ensure shipping directory exists
if (!fs.existsSync(shippingPath)) {
  fs.mkdirSync(shippingPath, { recursive: true });
  console.log("📁 Created shipping directory:", shippingPath);
  logger.info("Created shipping directory:", shippingPath);
} else {
  console.log("✅ Shipping directory already exists");
  try {
    const files = fs.readdirSync(shippingPath);
    console.log(`📊 Shipping directory contains ${files.length} files`);
    if (files.length > 0) {
      console.log("📄 Files in shipping directory:");
      files.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
      });
    }
  } catch (err) {
    console.log(`⚠️  Could not read shipping directory: ${err.message}`);
  }
}

// HIGH PRIORITY shipping route - this will override React app routing
app.use("/shipping", (req, res, next) => {
  // === COMPREHENSIVE CONSOLE LOGGING ===
  console.log("=".repeat(80));
  console.log("🚀 SHIPPING REQUEST STARTED");
  console.log("=".repeat(80));
  console.log(`📥 Request URL: ${req.originalUrl}`);
  console.log(`📁 Request path: ${req.path}`);
  console.log(`🌐 Method: ${req.method}`);
  console.log(
    `🔗 Full URL: ${req.protocol}://${req.get("host")}${req.originalUrl}`
  );
  console.log(`📍 IP Address: ${req.ip}`);
  console.log(`🕒 Timestamp: ${new Date().toISOString()}`);
  console.log(`👤 User Agent: ${req.get("User-Agent")}`);
  console.log("=".repeat(80));

  logger.info(`HIGH PRIORITY: Shipping request for ${req.path}`);

  if (req.path.endsWith(".pdf")) {
    console.log("📄 PDF REQUEST DETECTED");
    console.log(`📄 PDF filename: ${req.path}`);

    // Set proper PDF headers
    console.log("🔧 Setting PDF headers...");
    res.setHeader("Content-Type", "application/pdf; charset=utf-8");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    console.log("✅ PDF headers set successfully");

    // Try to serve the file directly
    const filePath = path.join(shippingPath, req.path.substring(1)); // Remove leading slash
    console.log(`🔍 Looking for file at: ${filePath}`);
    console.log(`📂 Shipping directory: ${shippingPath}`);

    logger.info(`HIGH PRIORITY: Attempting to serve file: ${filePath}`);

    if (fs.existsSync(filePath)) {
      console.log("✅ FILE FOUND!");
      const stats = fs.statSync(filePath);
      console.log(`📊 File size: ${stats.size} bytes`);
      console.log(`📅 File modified: ${stats.mtime}`);
      console.log("🚀 SERVING PDF FILE...");

      logger.info(`HIGH PRIORITY: File exists, serving: ${filePath}`);

      // Add success callback to sendFile
      return res.sendFile(filePath, (err) => {
        if (err) {
          console.log("❌ ERROR SERVING PDF:");
          console.error(err);
        } else {
          console.log("✅ PDF SERVED SUCCESSFULLY!");
          console.log("🎉 REQUEST COMPLETED");
          console.log("=".repeat(80));
        }
      });
    } else {
      console.log("❌ FILE NOT FOUND!");
      console.log("🔍 Checking directory contents...");

      try {
        const dirContents = fs.readdirSync(shippingPath);
        console.log(`📁 Directory contains ${dirContents.length} files:`);
        dirContents.forEach((file, index) => {
          console.log(`  ${index + 1}. ${file}`);
        });
      } catch (dirErr) {
        console.log(`❌ Cannot read directory: ${dirErr.message}`);
      }

      logger.error(`HIGH PRIORITY: File not found: ${filePath}`);
      console.log("❌ RETURNING 404 ERROR");
      console.log("=".repeat(80));

      return res.status(404).json({
        error: "PDF not found",
        path: filePath,
        exists: false,
        directoryContents: fs.existsSync(shippingPath)
          ? fs.readdirSync(shippingPath)
          : [],
      });
    }
  } else {
    console.log("ℹ️  Non-PDF request, passing to next middleware");
    console.log("=".repeat(80));
  }

  next();
});

// Also add static serving as fallback
app.use("/shipping", express.static(shippingPath));
console.log("🎯 HIGH PRIORITY shipping route configured successfully!");
console.log(`✅ Route active for: ${shippingPath}`);
console.log("🔥 Ready to serve PDF requests!");
console.log("=".repeat(60));
logger.info(`HIGH PRIORITY shipping route configured for: ${shippingPath}`);
// === END HIGH PRIORITY SHIPPING ROUTE ===

logger.info("Setting up static file serving", {
  operation: "app_initialization",
  step: "static_files",
});
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

logger.info("Checking for order management shipping path");
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
  logger.info("Order management shipping path does not exist");
}

logger.info("Initializing Swagger documentation", {
  operation: "app_initialization",
  step: "swagger",
});
// Initialize Swagger documentation at /api-docs
try {
  initializeSwagger(app);
  logger.info("Swagger documentation initialized successfully");
} catch (error) {
  logger.error("Failed to initialize Swagger", { error: error.message });
}

logger.info("Setting up development/production routing", {
  operation: "app_initialization",
  step: "routing_setup",
  nodeEnv: process.env.NODE_ENV,
});

// Only serve static files in production mode
// In development, the React dev server handles the frontend on port 3000
if (process.env.NODE_ENV === "production") {
  logger.info("Setting up production static file serving");
  // Serve static files from the React app build directory
  // Check multiple possible build locations for different deployment scenarios
  const possibleBuildPaths = [
    path.resolve(__dirname, "..", "client", "build"), // Standard build location
    path.resolve(__dirname, "..", "build"), // Alternative build location
    path.resolve(process.cwd(), "build"), // Current working directory build
  ];

  let clientBuildPath = null;

  for (const buildPath of possibleBuildPaths) {
    logger.info(`Checking for client build at: ${buildPath}`);
    if (
      fs.existsSync(buildPath) &&
      fs.existsSync(path.join(buildPath, "index.html"))
    ) {
      clientBuildPath = buildPath;
      logger.info(`Found valid client build at: ${clientBuildPath}`);
      break;
    }
  }

  if (clientBuildPath) {
    logger.info(`Serving static files from: ${clientBuildPath}`);
    app.use(express.static(clientBuildPath));

    // For any other request, send back React's index.html file
    app.get("*", (req, res, next) => {
      // Skip API and known server routes
      if (
        req.path.startsWith("/api") ||
        req.path === "/health" ||
        req.path.startsWith("/ws/") ||
        req.path.startsWith("/shipping") ||
        req.path.startsWith("/order-shipping") ||
        req.path.includes(".") // Skip requests for files with extensions (js, css, images, etc.)
      ) {
        return next();
      }

      // Log the request for debugging SPA routing
      logger.info(`Serving React app for SPA route: ${req.path}`, {
        userAgent: req.get("User-Agent"),
        referer: req.get("Referer"),
      });

      // Send the React app's index.html for all SPA routes
      res.sendFile(path.resolve(clientBuildPath, "index.html"), (err) => {
        if (err) {
          logger.error(
            `Error serving index.html for ${req.path}: ${err.message}`,
            {
              path: req.path,
              error: err,
            }
          );
          // Send a more informative error response
          res.status(500).json({
            error: "Application failed to load",
            message: "Please try refreshing the page",
            path: req.path,
          });
        }
      });
    });
  } else {
    logger.warn("Client build not found, serving API-only mode");

    // Serve a simple API status page for root requests
    app.get("/", (req, res) => {
      res.json({
        message: "Pazar+ API Server",
        status: "running",
        mode: "API-only",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        endpoints: {
          health: "/health",
          api: "/api",
        },
      });
    });

    // Handle all other non-API routes
    app.get("*", (req, res, next) => {
      // Skip API and known routes
      if (
        req.path.startsWith("/api") ||
        req.path === "/health" ||
        req.path.startsWith("/ws/")
      ) {
        return next();
      }

      res.status(404).json({
        error: "Frontend not available",
        message:
          "This is an API-only deployment. Frontend is deployed separately.",
        requested_path: req.path,
        available_endpoints: {
          health: "/health",
          api: "/api",
        },
      });
    });
  }
} else {
  logger.info("Development mode - React dev server handles frontend");
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
  logger.info("Development mode routing configured");
}

// Handle 404 errors for all unmatched routes
app.use("*", notFoundHandler);

// Enhanced error tracking middleware
app.use(createErrorTrackingMiddleware());

// Global error handling middleware (must be last)
app.use(errorHandler);
logger.info("Error handlers configured");

logger.info("Initializing enhanced platform services", {
  operation: "app_initialization",
  step: "platform_services",
});
// Initialize enhanced platform services
async function initializeEnhancedServices() {
  logger.info("Starting enhanced services initialization");
  try {
    // Start performance monitoring periodic updates
    performanceMonitor.startPeriodicUpdates();

    // Initialize cache service
    await cacheService.connect();

    // Initialize background services manager (using singleton instance)
    await BackgroundServicesManager.initialize();
    logger.info("Background services manager initialized");

    // Note: Database status WebSocket service will be initialized later when server is available
    logger.info("Database status WebSocket service initialization deferred");

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
  try {
    // Verify platformServiceManager is an EventEmitter
    if (
      !platformServiceManager ||
      typeof platformServiceManager.on !== "function"
    ) {
      logger.warn(
        "Platform service manager is not available or not an EventEmitter, skipping event listeners"
      );
      return;
    }

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
  } catch (error) {
    logger.error("Failed to setup enhanced platform event listeners", {
      error: error.message,
      stack: error.stack,
    });
  }
}

// Setup event listeners for inventory management service
function setupInventoryManagementEventListeners() {
  try {
    // Verify inventoryManagementService is an EventEmitter
    if (
      !inventoryManagementService ||
      typeof inventoryManagementService.on !== "function"
    ) {
      logger.warn(
        "Inventory management service is not available or not an EventEmitter, skipping event listeners"
      );
      return;
    }

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
  } catch (error) {
    logger.error("Failed to setup inventory management event listeners", {
      error: error.message,
      stack: error.stack,
    });
  }
}

// Initialize WebSocket server for real-time notifications
function initializeWebSocketServer(server) {
  logger.info("Starting WebSocket server initialization", {
    operation: "websocket_initialization",
    step: "start",
  });

  try {
    // First initialize notification service (without WebSocket server)
    logger.info("Initializing notification service");
    notificationService.initialize();
    logger.info("Notification service initialized successfully");

    // Initialize database status WebSocket service with server
    logger.info("Initializing database status WebSocket service");
    try {
      databaseStatusWebSocket.initialize(server);
      logger.info("Database status WebSocket service initialized successfully");
    } catch (dbWsError) {
      logger.error("Failed to initialize database status WebSocket service", {
        error: dbWsError.message,
        stack: dbWsError.stack,
      });
      // Continue execution even if database WebSocket fails
    }

    // Then initialize unified WebSocket server with better error handling
    logger.info("Initializing unified WebSocket server");
    try {
      unifiedWebSocketServer.initialize(server);
      logger.info("Unified WebSocket server initialized successfully");
    } catch (wsError) {
      logger.error("Failed to initialize unified WebSocket server", {
        error: wsError.message,
        stack: wsError.stack,
      });
      // Continue execution even if WebSocket server fails
    }

    // Setup real-time notification handlers
    logger.info("Setting up real-time notification handlers");
    notificationService.setupRealTimeNotifications();

    // Start periodic cleanup for notification service
    logger.info("Starting periodic cleanup for notification service");
    notificationService.startPeriodicCleanup();

    logger.info("WebSocket initialization process completed");
  } catch (error) {
    logger.error("Failed to initialize WebSocket server", {
      error: error.message,
      stack: error.stack,
    });
  }
}

// Initialize services when app starts
process.nextTick(() => {
  initializeEnhancedServices().catch((error) => {
    logger.error("Failed to initialize enhanced services:", error);
  });
});

logger.info("App module loaded successfully", {
  operation: "app_initialization",
  step: "complete",
});

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
logger.info("Setting up global error handlers", {
  operation: "app_initialization",
  step: "error_handlers",
});
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
