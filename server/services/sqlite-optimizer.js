/**
 * SQLite Optimizer Service
 * Handles SQLite-specific optimizations for better concurrency and performance
 */
const logger = require("../utils/logger");
const { sequelize } = require("../models");

class SQLiteOptimizer {
  constructor() {
    this.isOptimized = false;
    this.retryAttempts = new Map(); // Track retry attempts per operation
  }

  /**
   * Initialize SQLite with optimal settings for concurrency
   */
  async optimizeSQLite() {
    if (this.isOptimized) {
      return;
    }

    try {
      // Check if we're using SQLite dialect
      const dialect = sequelize.getDialect();

      if (dialect !== "sqlite") {
        logger.info(
          `Database dialect is ${dialect}, skipping SQLite-specific optimizations`
        );
        this.isOptimized = true;
        return;
      }

      logger.info("Applying SQLite optimizations for better concurrency...");

      // Critical SQLite settings for better concurrency
      const optimizations = [
        // Enable WAL mode for better concurrency (allows concurrent reads)
        "PRAGMA journal_mode = WAL",

        // Set busy timeout (how long to wait when database is locked)
        "PRAGMA busy_timeout = 30000",

        // Optimize synchronous mode for better performance while maintaining safety
        "PRAGMA synchronous = NORMAL",

        // Increase cache size for better performance
        "PRAGMA cache_size = 10000",

        // Store temporary tables in memory for better performance
        "PRAGMA temp_store = MEMORY",

        // Optimize page size
        "PRAGMA page_size = 4096",

        // Enable memory-mapped I/O for better performance
        "PRAGMA mmap_size = 268435456", // 256MB

        // Optimize WAL checkpoint
        "PRAGMA wal_autocheckpoint = 1000",

        // Optimize locking mode
        "PRAGMA locking_mode = NORMAL",

        // Enable query planner optimizations
        "PRAGMA optimize",
      ];

      for (const pragma of optimizations) {
        try {
          await sequelize.query(pragma);
          logger.debug(`Applied: ${pragma}`);
        } catch (error) {
          logger.warn(`Failed to apply ${pragma}:`, error.message);
        }
      }

      // Verify WAL mode is enabled
      const [walModeResult] = await sequelize.query("PRAGMA journal_mode");
      const walMode = walModeResult[0]?.journal_mode;

      if (walMode === "wal") {
        logger.info(
          "✅ WAL mode enabled successfully - concurrent reads now supported"
        );
      } else {
        logger.warn(
          `⚠️ WAL mode not enabled (current: ${walMode}). Concurrency may be limited.`
        );
      }

      // Verify busy timeout
      const [busyTimeoutResult] = await sequelize.query("PRAGMA busy_timeout");
      const busyTimeout = busyTimeoutResult[0]?.busy_timeout;
      logger.info(`SQLite busy timeout set to: ${busyTimeout}ms`);

      this.isOptimized = true;
      logger.info("✅ SQLite optimization completed successfully");
    } catch (error) {
      logger.error("Failed to optimize SQLite:", error);
      throw error;
    }
  }

  /**
   * Execute a database operation with automatic retry logic for SQLite busy errors
   */
  async executeWithRetry(operationFn, operationId = null, maxRetries = 5) {
    const dialect = sequelize.getDialect();

    // For non-SQLite databases, just execute the operation without retry logic
    if (dialect !== "sqlite") {
      return await operationFn();
    }

    const opId =
      operationId ||
      `op_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    let lastError = null;

    // Initialize retry count for this operation
    if (!this.retryAttempts.has(opId)) {
      this.retryAttempts.set(opId, 0);
    }

    const currentAttempt = this.retryAttempts.get(opId);

    for (let attempt = currentAttempt; attempt < maxRetries; attempt++) {
      try {
        this.retryAttempts.set(opId, attempt);

        // Execute the operation
        const result = await operationFn();

        // Success - clean up retry tracking
        this.retryAttempts.delete(opId);

        if (attempt > 0) {
          logger.info(
            `✅ Operation ${opId} succeeded after ${attempt + 1} attempts`
          );
        }

        return result;
      } catch (error) {
        lastError = error;

        // Check if this is a retryable SQLite error
        if (this.isSQLiteBusyError(error)) {
          const delay = this.calculateBackoffDelay(attempt);

          logger.warn(
            `⚠️ SQLite busy error (attempt ${
              attempt + 1
            }/${maxRetries}) for operation ${opId}: ${
              error.message
            }. Retrying in ${delay}ms...`
          );

          // Don't wait on the last attempt if it failed
          if (attempt < maxRetries - 1) {
            await this.sleep(delay);
            continue;
          }
        }

        // Non-retryable error or max retries reached
        this.retryAttempts.delete(opId);

        if (attempt >= maxRetries - 1) {
          logger.error(
            `❌ Operation ${opId} failed after ${maxRetries} attempts. Last error: ${error.message}`
          );
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Check if error is a SQLite busy/lock error that should be retried
   */
  isSQLiteBusyError(error) {
    if (!error || !error.message) return false;

    const busyIndicators = [
      "database is locked",
      "SQLITE_BUSY",
      "SQLITE_LOCKED",
      "database busy",
      "cannot start a transaction within a transaction",
      "database table is locked",
      "database schema has changed",
      "locking protocol",
    ];

    const errorMessage = error.message.toLowerCase();
    return busyIndicators.some((indicator) =>
      errorMessage.includes(indicator.toLowerCase())
    );
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  calculateBackoffDelay(attempt) {
    // Base delay: 100ms, exponential backoff with max 5 seconds
    const baseDelay = 100;
    const maxDelay = 5000;

    // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms, etc.
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, attempt),
      maxDelay
    );

    // Add jitter (random variation) to prevent thundering herd
    const jitter = Math.random() * 0.3; // 30% jitter
    const finalDelay = exponentialDelay * (1 + jitter);

    return Math.floor(finalDelay);
  }

  /**
   * Sleep utility for delays
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get retry statistics for monitoring
   */
  getRetryStats() {
    return {
      activeOperations: this.retryAttempts.size,
      operations: Array.from(this.retryAttempts.entries()).map(
        ([id, attempts]) => ({
          operationId: id,
          attempts: attempts + 1,
        })
      ),
    };
  }

  /**
   * Clear retry tracking (useful for cleanup)
   */
  clearRetryTracking() {
    this.retryAttempts.clear();
  }

  /**
   * Check SQLite health and configuration
   */
  async checkSQLiteHealth() {
    try {
      const dialect = sequelize.getDialect();

      if (dialect !== "sqlite") {
        logger.info(
          `Database dialect is ${dialect}, skipping SQLite health check`
        );
        return { status: "N/A - Not using SQLite" };
      }

      const checks = [
        { query: "PRAGMA journal_mode", expected: "wal", name: "WAL Mode" },
        { query: "PRAGMA busy_timeout", name: "Busy Timeout" },
        { query: "PRAGMA cache_size", name: "Cache Size" },
        { query: "PRAGMA synchronous", name: "Synchronous Mode" },
        { query: "PRAGMA temp_store", name: "Temp Store" },
      ];

      const results = {};

      for (const check of checks) {
        try {
          const [result] = await sequelize.query(check.query);
          const value = Object.values(result[0])[0];
          results[check.name] = {
            value,
            status: check.expected
              ? value === check.expected
                ? "✅"
                : "⚠️"
              : "ℹ️",
          };
        } catch (error) {
          results[check.name] = {
            value: "Error",
            status: "❌",
            error: error.message,
          };
        }
      }

      logger.info("SQLite Health Check:", results);
      return results;
    } catch (error) {
      logger.error("SQLite health check failed:", error);
      throw error;
    }
  }

  /**
   * Perform emergency WAL checkpoint if needed
   */
  async emergencyCheckpoint() {
    try {
      const dialect = sequelize.getDialect();

      if (dialect !== "sqlite") {
        logger.info(`Database dialect is ${dialect}, skipping WAL checkpoint`);
        return true;
      }

      logger.info("Performing emergency WAL checkpoint...");

      // Force WAL checkpoint
      await sequelize.query("PRAGMA wal_checkpoint(TRUNCATE)");

      // Check WAL file size
      const [walInfo] = await sequelize.query("PRAGMA wal_checkpoint");
      logger.info("WAL checkpoint completed:", walInfo[0]);

      return true;
    } catch (error) {
      logger.error("Emergency WAL checkpoint failed:", error);
      return false;
    }
  }
}

module.exports = new SQLiteOptimizer();
