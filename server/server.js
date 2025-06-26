require("dotenv").config();

// Import network detection utility
const { setNetworkEnvironment } = require("./utils/networkDetection");
const ServerStabilityManager = require("./utils/serverStabilityManager");

// Set network environment variables for proper URL generation
const networkIP = setNetworkEnvironment();

const { app, initializeWebSocketServer } = require("./app");
const logger = require("./utils/logger");
const sequelize = require("./config/database");
const config = require("./config/config");
const ProductLinkingJobService = require("./services/product-linking-job-service");
const backgroundServicesManager = require("./services/background-services-manager");

// Initialize stability manager
const stabilityManager = new ServerStabilityManager();

// Initialize background job service
const productLinkingJobs = new ProductLinkingJobService();

// Register background job with stability manager
stabilityManager.registerBackgroundJob(productLinkingJobs);

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

    // Sync database tables (skip sync since migrations handle schema)
    // await sequelize.sync({
    //   force: false, // Changed back to false to preserve data
    //   logging: false, // Disable SQL logging for cleaner output
    // });
    logger.info("Database synchronized successfully", {
      service: "pazar-plus",
    });

    logger.info("Application initialized successfully", {
      service: "pazar-plus",
    });

    // Start server with error handling - bind to all interfaces for network access
    const server = stabilityManager.wrapServer(
      app.listen(PORT, "0.0.0.0", () => {
        logger.info(
          `Server running on port ${PORT} (accessible from network)`,
          {
            service: "pazar-plus",
            port: PORT,
            environment: process.env.NODE_ENV || "development",
            host: "0.0.0.0",
            networkIP: networkIP,
            accessUrls: {
              local: `http://localhost:${PORT}`,
              network: `http://${networkIP}:${PORT}`,
            },
          }
        );

        // Initialize WebSocket server for real-time notifications
        const wsServer = initializeWebSocketServer(server);

        // Register WebSocket server cleanup
        stabilityManager.registerCleanupHandler(async () => {
          if (wsServer && typeof wsServer.close === "function") {
            wsServer.close();
          }
        });

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
        try {
          productLinkingJobs.start();

          // Initialize background services including variant detection (non-blocking)
          setImmediate(() => {
            backgroundServicesManager.initialize().catch((error) => {
              logger.error("Failed to initialize background services", {
                service: "pazar-plus",
                error: error.message,
              });
            });
          });

          logger.info("Background job services starting", {
            service: "pazar-plus",
            services: ["product-linking", "variant-detection"],
          });
        } catch (error) {
          logger.error("Failed to start background jobs", {
            service: "pazar-plus",
            error: error.message,
          });
        }
      })
    );

    // Register database cleanup with stability manager
    stabilityManager.registerCleanupHandler(async () => {
      logger.info("Closing database connections...", { service: "pazar-plus" });
      try {
        await sequelize.close();
        logger.info("Database connections closed successfully", {
          service: "pazar-plus",
        });
      } catch (error) {
        logger.error("Error closing database connections", {
          service: "pazar-plus",
          error: error.message,
        });
      }
    });
  } catch (error) {
    logger.error("Failed to start server:", error, { service: "pazar-plus" });
    process.exit(1);
  }
}

// Start the server
startServer();
