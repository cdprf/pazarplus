const { Op } = require("sequelize");
const pLimit = require("p-limit");
const logger = require("../utils/logger");

// Limit concurrent database operations to prevent overwhelming the database
const dbConcurrencyLimit = pLimit(10);

class DatabaseService {
  constructor() {
    this.retryOptions = {
      maxAttempts: 3,
      delay: 1000, // 1 second
      backoff: 2, // exponential backoff
    };
  }

  /**
   * Execute a database operation with retry logic and concurrency control
   * @param {Function} operation - The database operation to execute
   * @param {Object} options - Retry options
   * @returns {Promise} Result of the operation
   */
  async executeWithRetry(operation, options = {}) {
    const { maxAttempts, delay, backoff } = {
      ...this.retryOptions,
      ...options,
    };

    return dbConcurrencyLimit(async () => {
      let lastError;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error;

          // Check if it's a retryable error
          if (this.isRetryableError(error) && attempt < maxAttempts) {
            const waitTime = delay * Math.pow(backoff, attempt - 1);
            logger.warn(
              `Database operation failed (attempt ${attempt}/${maxAttempts}). Retrying in ${waitTime}ms...`,
              {
                error: error.message,
                attempt,
                waitTime,
              }
            );

            await this.sleep(waitTime);
            continue;
          }

          // If not retryable or max attempts reached, throw the error
          throw error;
        }
      }

      throw lastError;
    });
  }

  /**
   * Check if an error is retryable
   * @param {Error} error - The error to check
   * @returns {boolean} True if the error is retryable
   */
  isRetryableError(error) {
    if (!error) return false;

    const retryableMessages = [
      "SQLITE_BUSY",
      "database is locked",
      "ECONNRESET",
      "Connection terminated",
      "Connection lost",
      "deadlock detected",
      "Lock wait timeout",
      "connection pool exhausted",
    ];

    const errorMessage = error.message || error.toString();
    return retryableMessages.some((msg) =>
      errorMessage.toLowerCase().includes(msg.toLowerCase())
    );
  }

  /**
   * Safely upsert data with proper conflict resolution
   * @param {Object} Model - Sequelize model
   * @param {Object} data - Data to upsert
   * @param {Object} options - Upsert options
   * @returns {Promise} Upsert result
   */
  async safeUpsert(Model, data, options = {}) {
    return this.executeWithRetry(async () => {
      try {
        // Use findOrCreate for better conflict handling
        const [instance, created] = await Model.findOrCreate({
          where: options.where || { id: data.id },
          defaults: data,
          ...options,
        });

        if (!created && options.updateOnConflict !== false) {
          // Update the existing record
          await instance.update(data);
        }

        return [instance, created];
      } catch (error) {
        // If findOrCreate fails, try a manual upsert approach
        if (error.name === "SequelizeUniqueConstraintError") {
          logger.warn(
            "Unique constraint error in upsert, attempting manual update",
            {
              model: Model.tableName,
              error: error.message,
            }
          );

          // Try to find and update
          const existing = await Model.findOne({
            where: options.where || { id: data.id },
          });
          if (existing) {
            await existing.update(data);
            return [existing, false];
          } else {
            // Create new if not found
            const instance = await Model.create(data);
            return [instance, true];
          }
        }
        throw error;
      }
    });
  }

  /**
   * Bulk operations with improved error handling
   * @param {Object} Model - Sequelize model
   * @param {Array} data - Array of data to process
   * @param {Object} options - Bulk operation options
   * @returns {Promise} Bulk operation result
   */
  async safeBulkCreate(Model, data, options = {}) {
    return this.executeWithRetry(async () => {
      try {
        return await Model.bulkCreate(data, {
          ignoreDuplicates: true,
          updateOnDuplicate: options.updateOnDuplicate || [],
          ...options,
        });
      } catch (error) {
        // Fallback to individual creates if bulk fails
        if (
          error.name === "SequelizeUniqueConstraintError" ||
          error.message.includes("UNIQUE constraint failed")
        ) {
          logger.warn(
            "Bulk create failed, falling back to individual operations",
            {
              model: Model.tableName,
              count: data.length,
            }
          );

          const results = [];
          for (const item of data) {
            try {
              const [instance] = await this.safeUpsert(Model, item, options);
              results.push(instance);
            } catch (itemError) {
              logger.error("Failed to create individual item", {
                model: Model.tableName,
                item,
                error: itemError.message,
              });
            }
          }
          return results;
        }
        throw error;
      }
    });
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after the delay
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new DatabaseService();
