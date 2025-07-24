const winston = require("winston");
const path = require("path");
const fs = require("fs");

// Try to load winston-daily-rotate-file, use basic file transport if not available
let DailyRotateFile;
let useDailyRotate = true;

try {
  DailyRotateFile = require("winston-daily-rotate-file");
} catch (error) {
  logger.warn(
    "winston-daily-rotate-file not available, using basic file transport"
  );
  useDailyRotate = false;
}

// Load environment configuration
require("dotenv").config();

// Create logs directory if it doesn't exist (skip in production to avoid permission issues)
const logsDir = path.resolve(
  __dirname,
  process.env.LOG_FILE_PATH || "../../logs"
);

// Only create logs directory in development or if we have write permissions
let canWriteLogs = true;
if (process.env.NODE_ENV !== "production") {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch (error) {
    logger.warn(
      "Cannot create logs directory, file logging disabled:",
      error.message
    );
    canWriteLogs = false;
  }
} else {
  // In production, disable file logging to avoid permission issues
  canWriteLogs = false;
}

// Define the custom format for structured logging
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, ...meta } = info;

    // For console output, use a more readable format
    if (process.env.NODE_ENV === "development") {
      const metaString = Object.keys(meta).length
        ? `\n${JSON.stringify(meta, null, 2)}`
        : "";
      return `${timestamp} [${level.toUpperCase()}] [${service}]: ${message}${metaString}`;
    }

    // For file output, use structured JSON
    return JSON.stringify({
      timestamp,
      level,
      message,
      service,
      ...meta,
    });
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, ...meta } = info;
    const metaString =
      Object.keys(meta).length &&
      Object.keys(meta).some((key) => key !== "service")
        ? ` ${JSON.stringify(meta, null, 0)}`
        : "";
    return `${timestamp} [${level}] [${
      service || "app"
    }]: ${message}${metaString}`;
  })
);

// Create transport configurations
const createFileTransport = (
  filename,
  level = null,
  maxSize = null,
  maxFiles = null
) => {
  if (!canWriteLogs) {
    return null; // Return null if we can't write logs
  }

  if (useDailyRotate && DailyRotateFile) {
    return new DailyRotateFile({
      filename: path.join(logsDir, `${filename}-%DATE%.log`),
      datePattern: "YYYY-MM-DD",
      level: level,
      maxSize: maxSize || process.env.LOG_MAX_SIZE || "20m",
      maxFiles: maxFiles || process.env.LOG_MAX_FILES || "14d",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      auditFile: path.join(logsDir, `.${filename}-audit.json`),
    });
  } else {
    // Fallback to basic file transport
    return new winston.transports.File({
      filename: path.join(logsDir, `${filename}.log`),
      level: level,
      maxsize: 20971520, // 20MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    });
  }
};

// Create the logger instance with enhanced configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: {
    service: "pazar-plus",
    environment: process.env.NODE_ENV || "development",
    version: require("../../package.json").version,
  },
  transports: [
    // Error logs
    createFileTransport("error", "error"),

    // Application logs
    createFileTransport("app"),

    // Debug logs (only in development)
    ...(process.env.NODE_ENV === "development"
      ? [createFileTransport("debug", "debug")]
      : []),

    // Console output with error handling
    ...(process.env.NODE_ENV !== "production"
      ? [
          new winston.transports.Console({
            format: consoleFormat,
            level: process.env.NODE_ENV === "development" ? "debug" : "info",
            handleExceptions: false, // Prevent exception loops
            handleRejections: false, // Prevent rejection loops
          }),
        ]
      : [
          // In production, always include console transport for Render logs
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json()
            ),
            level: "info",
            handleExceptions: false,
            handleRejections: false,
          }),
        ]),
  ].filter(Boolean), // Filter out null transports

  // Handle uncaught exceptions and unhandled rejections
  // NOTE: Removed console transport from exception handlers to prevent EPIPE loops
  exceptionHandlers: [createFileTransport("exceptions")].filter(Boolean),

  rejectionHandlers: [createFileTransport("rejections")].filter(Boolean),

  exitOnError: false,
});

// Add custom methods for structured logging
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get("User-Agent"),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id || null,
    apiVersion: req.apiVersion?.resolved || "v1",
    contentLength: req.headers["content-length"] || 0,
    referer: req.get("Referer") || null,
    timestamp: new Date().toISOString(),
  };

  if (res.statusCode >= 400) {
    logger.warn("HTTP Request Error", logData);
  } else {
    logger.info("HTTP Request", logData);
  }
};

// Enhanced operation logging
logger.logOperation = (operation, context = {}) => {
  const logData = {
    operation,
    timestamp: new Date().toISOString(),
    ...context,
  };

  logger.info(`Operation: ${operation}`, logData);
};

// Endpoint access logging
logger.logEndpoint = (endpoint, req, context = {}) => {
  const logData = {
    endpoint,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id || null,
    userEmail: req.user?.email || null,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
    apiVersion: req.apiVersion?.resolved || "v1",
    ...context,
  };

  logger.info(`Endpoint Access: ${endpoint}`, logData);
};

// Service interaction logging
logger.logServiceCall = (service, action, context = {}) => {
  const logData = {
    service,
    action,
    timestamp: new Date().toISOString(),
    ...context,
  };

  logger.info(`Service Call: ${service}.${action}`, logData);
};

logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
    context,
  });
};

// Add error handling for transports to prevent EPIPE loops
logger.on("error", (error) => {
  if (error.code === "EPIPE") {
    // Silently ignore EPIPE errors to prevent infinite loops
    return;
  }
  // For other errors, try to log to a file only
  try {
    logger.error("[LOGGER ERROR]:", error.message);
  } catch (e) {
    // If console fails, just ignore
  }
});

// Handle console transport errors specifically
const consoleTransport = logger.transports.find((t) => t.name === "console");
if (consoleTransport) {
  consoleTransport.on("error", (error) => {
    if (error.code === "EPIPE") {
      // Silently ignore EPIPE errors
      return;
    }
  });
}

logger.logBusinessEvent = (event, data = {}) => {
  logger.info(`Business Event: ${event}`, {
    eventType: "business",
    event,
    ...data,
  });
};

// Log system startup
logger.info("Logger initialized", {
  logLevel: logger.level,
  environment: process.env.NODE_ENV,
  logsDirectory: logsDir,
});

module.exports = logger;
