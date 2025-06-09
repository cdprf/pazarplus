require("dotenv").config();

const { app, initializeWebSocketServer } = require("./app");
const logger = require("./utils/logger");
const sequelize = require("./config/database");
const config = require("./config/config");
const ProductLinkingJobService = require("./services/product-linking-job-service");

// Initialize background job service
const productLinkingJobs = new ProductLinkingJobService();

// Validate critical environment variables
const validateEnvironment = () => {
  const requiredEnvVars = [];

  if (process.env.NODE_ENV === "production") {
    requiredEnvVars.push("JWT_SECRET", "DB_HOST", "CLIENT_URL");
  }

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    logger.error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  logger.info("Environment validation passed", { service: "pazar-plus" });
};

const PORT = config.server.port; // Use centralized config

logger.info(`Using port: ${PORT}`, { service: "pazar-plus", port: PORT });

async function startServer() {
  try {
    // Validate environment first
    validateEnvironment();

    logger.info("Initializing application...", { service: "pazar-plus" });

    // Test database connection
    await sequelize.authenticate();
    logger.info("Database connection established successfully", {
      service: "pazar-plus",
    });

    // Sync database tables
    await sequelize.sync({
      force: false, // Changed back to false to preserve data
      logging: false, // Disable SQL logging for cleaner output
    });
    logger.info("Database synchronized successfully", {
      service: "pazar-plus",
    });

    logger.info("Application initialized successfully", {
      service: "pazar-plus",
    });

    // Start server with error handling
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        service: "pazar-plus",
        port: PORT,
        environment: process.env.NODE_ENV || "development",
      });

      // Initialize WebSocket server for real-time notifications
      initializeWebSocketServer(server);

      logger.info("Enhanced platform integration services ready", {
        service: "pazar-plus",
        features: [
          "Enhanced Platform Synchronization",
          "Conflict Resolution System",
          "Real-time Inventory Management",
          "WebSocket Notifications",
          "Stock Reservation System",
          "Turkish Marketplace Compliance",
          "Automated Product-Order Linking",
        ],
      });

      // Start background jobs
      productLinkingJobs.start();
      logger.info("Background job services started", { service: "pazar-plus" });
    });

    // Handle server errors
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.error(
          `Port ${PORT} is already in use. Please stop the other process or use a different port.`,
          {
            service: "pazar-plus",
            port: PORT,
            error: error.code,
          }
        );
        process.exit(1);
      } else {
        logger.error("Server error:", error, { service: "pazar-plus" });
        throw error;
      }
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`, {
        service: "pazar-plus",
      });

      server.close(() => {
        logger.info("HTTP server closed.", { service: "pazar-plus" });

        // Stop background jobs
        productLinkingJobs.stop();
        logger.info("Background jobs stopped", { service: "pazar-plus" });

        // Close database connections
        sequelize
          .close()
          .then(() => {
            logger.info("Database connections closed.", {
              service: "pazar-plus",
            });
            process.exit(0);
          })
          .catch((err) => {
            logger.error("Error closing database connections:", err, {
              service: "pazar-plus",
            });
            process.exit(1);
          });
      });
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error("Failed to start server:", error, { service: "pazar-plus" });
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Promise Rejection:", err);
  // Don't crash the server in production
  if (process.env.NODE_ENV === "development") {
    process.exit(1);
  }
});

// Start the server
startServer();
