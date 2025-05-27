const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const logger = require("./utils/logger");
require("dotenv").config();

const app = express();

// Import routes
const routes = require("./routes");

// Increase header size limits to handle JWT tokens
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

// Security middleware with relaxed header policies
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Disable CSP in development
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "Origin",
      "X-Requested-With",
    ],
    maxAge: 86400, // Cache preflight for 24 hours
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for development
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});
app.use(limiter);

// Request debugging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const authHeader = req.headers.authorization;

  logger.debug(`${timestamp} - ${req.method} ${req.url}`, {
    headers: Object.keys(req.headers),
    authPresent: !!authHeader,
    authLength: authHeader?.length || 0,
    userAgent: req.headers["user-agent"]?.substring(0, 50) + "...",
    contentLength: req.headers["content-length"] || 0,
  });

  // Check for potentially problematic headers
  const totalHeaderSize = JSON.stringify(req.headers).length;
  if (totalHeaderSize > 8192) {
    // 8KB threshold
    logger.warn(`Large headers detected: ${totalHeaderSize} bytes`);
  }

  next();
});

// Mount all routes
app.use("/", routes);

// 404 handler
app.use("*", (req, res) => {
  logger.info(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Application error:", err);

  // Handle specific error types
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request entity too large",
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;
