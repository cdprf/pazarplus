const winston = require("winston");
const path = require("path");

// Simple console-only logger for production environments like Render
const createProductionLogger = () => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    defaultMeta: {
      service: "pazar-plus",
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
    },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        level: "info",
        handleExceptions: true,
        handleRejections: true,
      }),
    ],
  });
};

// Export the simple logger
module.exports = createProductionLogger();

// Add initialization log
module.exports.info("Simple production logger initialized", {
  service: "pazar-plus",
  logLevel: process.env.LOG_LEVEL || "info",
  environment: process.env.NODE_ENV || "development",
});
