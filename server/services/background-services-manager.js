/**
 * Background Services Startup
 *
 * This module handles the startup of background services including
 * the automatic variant detection service.
 */

const logger = require("../utils/logger");
const backgroundVariantDetectionService = require("../services/background-variant-detection-service");
const { taskQueueManager } = require("../services/TaskQueueManager");

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
      // Start task queue manager first
      await this.startTaskQueueManager();

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
   * Start the task queue manager
   */
  async startTaskQueueManager() {
    try {
      logger.info("Starting task queue manager...");

      // Check if task queue manager is already running
      const status = taskQueueManager.getStatus();
      if (status.isProcessing) {
        logger.warn("Task queue manager is already running", { status });
        return;
      }

      // Start the task queue manager
      taskQueueManager.start();

      // Verify it started successfully
      const newStatus = taskQueueManager.getStatus();
      logger.info("Task queue manager started successfully", {
        status: newStatus,
      });

      this.services.push({
        name: "task-queue-manager",
        service: taskQueueManager,
        startedAt: new Date(),
        status: newStatus,
      });

      // Set up logging for task queue events
      taskQueueManager.on("taskProgress", (taskId, progress) => {
        logger.info("Task progress", {
          operation: "background_task",
          taskId,
          progress,
          timestamp: new Date().toISOString(),
        });
      });

      taskQueueManager.on("taskCompleted", (taskId, result) => {
        logger.info("Task completed", { taskId, result });
      });

      taskQueueManager.on("taskFailed", (taskId, error) => {
        logger.error("Task failed", { taskId, error });
      });

      taskQueueManager.on("taskCancelled", (taskId) => {
        logger.info("Task cancelled", { taskId });
      });

      logger.info("Task queue manager event listeners configured");
    } catch (error) {
      logger.error("Error starting task queue manager:", {
        error: error.message,
        stack: error.stack,
      });
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
