/**
 * Enhanced Server Stability Manager
 * Handles process management, error recovery, and graceful shutdowns
 */

const logger = require("./logger");

class ServerStabilityManager {
  constructor() {
    this.isShuttingDown = false;
    this.activeConnections = new Set();
    this.backgroundJobs = new Set();
    this.cleanupHandlers = [];
    this.gracefulShutdownTimeout = 30000; // 30 seconds
    this.setupProcessHandlers();
  }

  /**
   * Set up comprehensive process event handlers
   */
  setupProcessHandlers() {
    // Handle graceful shutdown signals
    process.on("SIGTERM", () => this.gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => this.gracefulShutdown("SIGINT"));
    process.on("SIGUSR2", () => this.gracefulShutdown("SIGUSR2")); // Nodemon restart

    // Handle EIO errors that don't crash the server
    process.stdin.on("error", (err) => this.handleIOError(err, "STDIN"));
    process.stdout.on("error", (err) => this.handleIOError(err, "STDOUT"));
    process.stderr.on("error", (err) => this.handleIOError(err, "STDERR"));

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      this.handleUnhandledRejection(reason, promise);
    });

    // Handle uncaught exceptions (last resort)
    process.on("uncaughtException", (error) => {
      this.handleUncaughtException(error);
    });

    // Handle memory warnings
    if (process.memoryUsage) {
      setInterval(() => this.checkMemoryUsage(), 60000); // Check every minute
    }

    logger.info("Server stability manager initialized", {
      environment: process.env.NODE_ENV,
      pid: process.pid,
      platform: process.platform,
    });
  }

  /**
   * Handle I/O errors gracefully without crashing
   */
  handleIOError(error, stream) {
    if (error.code === "EIO" || error.code === "EPIPE") {
      // These are common in development environments
      // Log but don't crash the server
      logger.debug(`I/O error on ${stream}`, {
        code: error.code,
        message: error.message,
        recoverable: true,
      });
      return;
    }

    // For other I/O errors, log as warning
    logger.warn(`${stream} error`, {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
  }

  /**
   * Handle unhandled promise rejections
   */
  handleUnhandledRejection(reason, promise) {
    // Don't crash on common recoverable errors
    const recoverableErrors = ["EPIPE", "EIO", "ECONNRESET", "ECONNREFUSED"];

    if (reason && recoverableErrors.includes(reason.code)) {
      logger.debug("Recoverable promise rejection", {
        code: reason.code,
        message: reason.message,
      });
      return;
    }

    logger.error("Unhandled Promise Rejection", {
      reason:
        reason instanceof Error
          ? {
              message: reason.message,
              stack: reason.stack,
              code: reason.code,
            }
          : reason,
      promise: promise,
    });

    // In development, exit after logging
    if (process.env.NODE_ENV === "development") {
      setTimeout(() => process.exit(1), 1000);
    }
  }

  /**
   * Handle uncaught exceptions
   */
  handleUncaughtException(error) {
    // Don't crash on I/O errors
    if (error.code === "EIO" || error.code === "EPIPE") {
      logger.debug("Ignoring I/O related uncaught exception", {
        code: error.code,
        message: error.message,
      });
      return;
    }

    logger.error("Uncaught Exception - Server will exit", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });

    // Try graceful shutdown, then force exit
    this.forceShutdown(1);
  }

  /**
   * Check memory usage and warn if too high
   */
  checkMemoryUsage() {
    const usage = process.memoryUsage();
    const mbUsed = Math.round(usage.heapUsed / 1024 / 1024);
    const mbTotal = Math.round(usage.heapTotal / 1024 / 1024);

    if (mbUsed > 500) {
      // Warn if using more than 500MB
      logger.warn("High memory usage detected", {
        heapUsed: `${mbUsed}MB`,
        heapTotal: `${mbTotal}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`,
      });
    }
  }

  /**
   * Register a connection to track for graceful shutdown
   */
  registerConnection(connection) {
    this.activeConnections.add(connection);

    connection.on("close", () => {
      this.activeConnections.delete(connection);
    });
  }

  /**
   * Register a background job for cleanup
   */
  registerBackgroundJob(job) {
    this.backgroundJobs.add(job);
  }

  /**
   * Register a cleanup handler
   */
  registerCleanupHandler(handler) {
    this.cleanupHandlers.push(handler);
  }

  /**
   * Graceful shutdown process
   */
  async gracefulShutdown(signal) {
    if (this.isShuttingDown) {
      logger.warn("Shutdown already in progress, forcing exit...");
      this.forceShutdown(0);
      return;
    }

    this.isShuttingDown = true;
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    // Set a timeout for graceful shutdown
    const shutdownTimer = setTimeout(() => {
      logger.error("Graceful shutdown timeout, forcing exit");
      this.forceShutdown(1);
    }, this.gracefulShutdownTimeout);

    try {
      // Stop accepting new connections
      logger.info("Stopping new connections...");

      // Close active connections
      logger.info(
        `Closing ${this.activeConnections.size} active connections...`
      );
      for (const connection of this.activeConnections) {
        try {
          connection.destroy();
        } catch (error) {
          logger.debug("Error closing connection", { error: error.message });
        }
      }

      // Stop background jobs
      logger.info(`Stopping ${this.backgroundJobs.size} background jobs...`);
      for (const job of this.backgroundJobs) {
        try {
          if (typeof job.stop === "function") {
            await job.stop();
          }
        } catch (error) {
          logger.debug("Error stopping background job", {
            error: error.message,
          });
        }
      }

      // Run cleanup handlers
      logger.info(`Running ${this.cleanupHandlers.length} cleanup handlers...`);
      for (const handler of this.cleanupHandlers) {
        try {
          await handler();
        } catch (error) {
          logger.debug("Error in cleanup handler", { error: error.message });
        }
      }

      clearTimeout(shutdownTimer);
      logger.info("Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      clearTimeout(shutdownTimer);
      logger.error("Error during graceful shutdown", { error: error.message });
      this.forceShutdown(1);
    }
  }

  /**
   * Force shutdown when graceful shutdown fails
   */
  forceShutdown(exitCode) {
    logger.warn("Forcing server shutdown...");
    setTimeout(() => {
      process.exit(exitCode);
    }, 100);
  }

  /**
   * Create a server wrapper with stability features
   */
  wrapServer(server) {
    // Track connections
    server.on("connection", (connection) => {
      this.registerConnection(connection);
    });

    // Handle server errors
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.error("Port already in use", {
          port: server.address()?.port || "unknown",
          error: error.message,
        });
        this.forceShutdown(1);
      } else {
        logger.error("Server error", { error: error.message });
      }
    });

    // Log server start
    server.on("listening", () => {
      const address = server.address();
      logger.info("Server is listening", {
        port: address.port,
        address: address.address,
      });
    });

    return server;
  }
}

module.exports = ServerStabilityManager;
