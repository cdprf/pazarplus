/**
 * Background Services Startup
 *
 * This module handles the startup of background services including
 * the automatic variant detection service.
 */

const logger = require("../utils/logger");
const backgroundVariantDetectionService = require("../services/background-variant-detection-service");

class BackgroundServicesManager {
  constructor() {
    this.services = [];
    this.isInitialized = false;
  }

  /**
   * Initialize all background services
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn("Background services already initialized");
      return;
    }

    logger.info("Initializing background services...");

    try {
      // Start variant detection service
      await this.startVariantDetectionService();

      this.isInitialized = true;
      logger.info("All background services initialized successfully");
    } catch (error) {
      logger.error("Error initializing background services:", error);
      throw error;
    }
  }

  /**
   * Start the variant detection service
   */
  async startVariantDetectionService() {
    try {
      logger.info("Starting background variant detection service...");

      // Configure the service with production settings
      backgroundVariantDetectionService.updateConfig({
        minConfidenceThreshold: 0.5,
        processOnCreate: true,
        processOnUpdate: true,
        reprocessInterval: 24 * 60 * 60 * 1000, // 24 hours
      });

      // Start the service
      backgroundVariantDetectionService.start();

      this.services.push({
        name: "variant-detection",
        service: backgroundVariantDetectionService,
        startedAt: new Date(),
      });

      logger.info("Background variant detection service started successfully");
    } catch (error) {
      logger.error("Error starting variant detection service:", error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown all background services
   */
  async shutdown() {
    logger.info("Shutting down background services...");

    for (const serviceInfo of this.services) {
      try {
        logger.info(`Stopping ${serviceInfo.name} service...`);

        if (
          serviceInfo.service &&
          typeof serviceInfo.service.stop === "function"
        ) {
          serviceInfo.service.stop();
        }

        logger.info(`${serviceInfo.name} service stopped`);
      } catch (error) {
        logger.error(`Error stopping ${serviceInfo.name} service:`, error);
      }
    }

    this.services = [];
    this.isInitialized = false;
    logger.info("All background services shut down");
  }

  /**
   * Get status of all background services
   */
  getServicesStatus() {
    return {
      initialized: this.isInitialized,
      services: this.services.map((serviceInfo) => ({
        name: serviceInfo.name,
        startedAt: serviceInfo.startedAt,
        status: serviceInfo.service.getStatus
          ? serviceInfo.service.getStatus()
          : "unknown",
      })),
    };
  }

  /**
   * Restart all services
   */
  async restart() {
    logger.info("Restarting background services...");
    await this.shutdown();
    await this.initialize();
    logger.info("Background services restarted successfully");
  }
}

// Export singleton instance
const backgroundServicesManager = new BackgroundServicesManager();

// Handle graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Received SIGINT signal, shutting down background services...");
  await backgroundServicesManager.shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM signal, shutting down background services...");
  await backgroundServicesManager.shutdown();
  process.exit(0);
});

module.exports = backgroundServicesManager;
