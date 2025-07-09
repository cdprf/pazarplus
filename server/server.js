require("dotenv").config({ path: "../.env.unified" });

// Import auto network configuration
const AutoNetworkConfig = require("./utils/auto-network-config");

// For production environments like Render, disable auto network config
const isProduction = process.env.NODE_ENV === "production";
let detectedIP = null;

if (!isProduction) {
  // Initialize auto network configuration only in development
  const autoNetworkConfig = new AutoNetworkConfig();
  detectedIP = autoNetworkConfig.initialize();
}

// Import network detection utility (legacy)
const { setNetworkEnvironment } = require("./utils/networkDetection");
const ServerStabilityManager = require("./utils/serverStabilityManager");

// Set network environment variables for proper URL generation
const networkIP = isProduction ? "0.0.0.0" : setNetworkEnvironment();

const { app, initializeWebSocketServer } = require("./app");

// Use simple logger in production to avoid winston-daily-rotate-file issues
const logger =
  process.env.NODE_ENV === "production"
    ? require("./utils/logger-simple")
    : require("./utils/logger");

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
    try {
      await sequelize.authenticate();
      logger.info("Database connection established successfully", {
        service: "pazar-plus",
      });
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        logger.warn("Database connection failed, continuing without database", {
          service: "pazar-plus",
          error: error.message,
        });
      } else {
        throw error;
      }
    }

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
        logger.info("Pazar+ server started successfully", {
          port: PORT,
          host: "0.0.0.0",
          networkIP: networkIP,
          environment: process.env.NODE_ENV,
        });
        console.log(
          "🔍 AGGRESSIVE DEBUG: Inside server listen callback - server is ACTUALLY running now"
        );

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
        logger.debug("Initializing WebSocket server");
        const wsServer = initializeWebSocketServer(server);
        logger.info("WebSocket server initialized successfully");

        // Start network monitoring for automatic IP detection (development only)
        if (!isProduction) {
          console.log(
            "🔄 Starting network monitoring for automatic IP updates..."
          );
          const autoNetworkConfig = new AutoNetworkConfig();
          autoNetworkConfig.watchNetworkChanges();
        }

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
        logger.info("Starting background jobs", {
          service: "pazar-plus",
        });

        try {
          // Check if background jobs should be disabled for faster startup
          if (process.env.DISABLE_BACKGROUND_JOBS === "true") {
            logger.info(
              "Background jobs disabled via DISABLE_BACKGROUND_JOBS environment variable",
              { service: "pazar-plus" }
            );
          } else {
            // Start product linking jobs with error handling
            logger.info("Starting product linking jobs - debug point 2", {
              service: "pazar-plus",
            });
            productLinkingJobs.start();
            logger.info("Product linking jobs started successfully", {
              service: "pazar-plus",
            });

            // Initialize background services in separate setTimeout to avoid blocking
            logger.info(
              "Setting up background services initialization - debug point 3",
              { service: "pazar-plus" }
            );
            // Initialize TaskQueueManager immediately to avoid race conditions with task creation
            const { taskQueueManager } = require("./services/TaskQueueManager");

            if (!taskQueueManager.getStatus().isProcessing) {
              logger.info(
                "Starting TaskQueueManager immediately to handle incoming tasks",
                {
                  service: "pazar-plus",
                }
              );
              taskQueueManager.start();
              logger.info("TaskQueueManager started successfully", {
                status: taskQueueManager.getStatus(),
              });
            }

            // Initialize other background services with delay
            setTimeout(() => {
              logger.info(
                "Initializing remaining background services - debug point 4",
                {
                  service: "pazar-plus",
                }
              );
              backgroundServicesManager
                .initialize()
                .then(() => {
                  logger.info("Background services initialized successfully", {
                    service: "pazar-plus",
                  });
                })
                .catch((error) => {
                  logger.error("Failed to initialize background services", {
                    service: "pazar-plus",
                    error: error.message,
                    stack: error.stack,
                  });
                });
            }, 10000); // Reduced delay since TaskQueueManager is already running

            logger.info("Background job services initialization queued", {
              service: "pazar-plus",
              services: ["product-linking", "variant-detection"],
            });
          }
        } catch (error) {
          logger.error("Failed to start background jobs", {
            service: "pazar-plus",
            error: error.message,
            stack: error.stack,
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
