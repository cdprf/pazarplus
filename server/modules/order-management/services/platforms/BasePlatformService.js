/**
 * Base Platform Service
 * Provides common functionality for all platform services
 */
const logger = require("../../../../utils/logger");
const {
  Order,
  OrderItem,
  ShippingDetail,
  Product,
  PlatformConnection,
} = require("../../../../models");
const axios = require("axios");

class BasePlatformService {
  constructor(connectionId, directCredentials = null) {
    // Handle both string IDs and object inputs
    this.connectionId =
      typeof connectionId === "object" ? connectionId.id : connectionId;
    this.directCredentials = directCredentials;
    this.connection = null;
    this.apiUrl = null;
    this.axiosInstance = null;
    this.logger = logger; // Provide direct access to logger
  }

  /**
   * Get logger instance
   * @returns {Object} Logger instance
   */
  getLogger() {
    return logger;
  }

  /**
   * Initialize the platform service with connection details
   * @returns {Promise<Boolean>} True if initialization successful
   */
  async initialize() {
    try {
      this.connection = await this.findConnection();

      if (!this.connection) {
        throw new Error(
          `Platform connection with ID ${this.connectionId} not found`
        );
      }

      await this.setupAxiosInstance();
      return true;
    } catch (error) {
      logger.error(`Failed to initialize platform service: ${error.message}`, {
        error,
        connectionId: this.connectionId,
        platformType: this.getPlatformType(),
      });
      throw new Error(
        `Failed to initialize platform service: ${error.message}`
      );
    }
  }

  /**
   * Find connection in database or use direct credentials
   * @returns {Promise<Object>} Platform connection
   */
  async findConnection() {
    if (this.directCredentials) {
      return {
        id: this.connectionId || null,
        userId: null, // No userId for direct credentials
        credentials: JSON.stringify(this.directCredentials),
        type: "direct",
        createdAt: null,
        updatedAt: null,
      };
    }
    // Use the imported PlatformConnection model directly
    const connection = await PlatformConnection.findByPk(this.connectionId);
    if (!connection) return null;
    // Standardize the return structure for downstream compatibility
    return {
      id: connection.id,
      userId: connection.userId,
      credentials: connection.credentials,
      type: connection.type || "db",
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  /**
   * Setup Axios instance with appropriate headers and config
   * Should be implemented by each platform service
   */
  async setupAxiosInstance() {
    throw new Error(
      "setupAxiosInstance must be implemented by platform service"
    );
  }

  /**
   * Decrypt credentials from the platform connection
   * @param {String} encryptedCredentials - Encrypted credentials string
   * @returns {Object} Decrypted credentials
   */
  decryptCredentials(encryptedCredentials) {
    // In a real implementation, this would use proper encryption/decryption
    return typeof encryptedCredentials === "string"
      ? JSON.parse(encryptedCredentials)
      : encryptedCredentials;
  }

  /**
   * Test the connection to the platform
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      await this.initialize();

      // Default implementation for platforms that don't implement their own testConnection method
      return {
        success: true,
        message: `Successfully connected to ${this.getPlatformType()}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to ${this.getPlatformType()}: ${
          error.message
        }`,
        error: error.message,
      };
    }
  }

  /**
   * Get the platform type
   * Should be implemented by each platform service
   */
  getPlatformType() {
    throw new Error("getPlatformType must be implemented by platform service");
  }

  /**
   * Fetch orders from the platform
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing order data
   */
  async fetchOrders(params = {}) {
    throw new Error("fetchOrders must be implemented by platform service");
  }

  /**
   * Get orders from the platform - unified implementation
   * @param {Object} options - Options for fetching orders
   * @returns {Promise<Array>} List of orders
   */
  async getOrders(options = {}) {
    try {
      const result = await this.fetchOrders(options);

      if (!result.success) {
        this.logger.error(
          `Failed to get orders from platform: ${result.message}`,
          {
            error: result.error,
            connectionId: this.connectionId,
            platformType: this.getPlatformType(),
          }
        );
        return [];
      }

      return Array.isArray(result.data) ? result.data : [];
    } catch (error) {
      this.logger.error(`Error in getOrders method: ${error.message}`, {
        error,
        connectionId: this.connectionId,
        platformType: this.getPlatformType(),
      });
      return [];
    }
  }

  /**
   * Sync orders from the platform from a given date range
   * @param {Date} startDate - Start date for syncing
   * @param {Date} endDate - End date for syncing
   * @returns {Promise<Object>} Sync result
   */
  async syncOrdersFromDate(startDate, endDate = new Date()) {
    try {
      logger.info(
        `Syncing orders from ${this.getPlatformType()} for period ${startDate.toISOString()} to ${endDate.toISOString()}`,
        {
          connectionId: this.connectionId,
          platformType: this.getPlatformType(),
          //startDate,
          //endDate,
        }
      );

      // Make sure we have a connection and axios instance
      if (!this.axiosInstance) {
        await this.initialize();
      }

      // Get orders using the platform-specific implementation
      // Ensure startDate is at least 18 months ago
      const now = new Date();
      const minStartDate = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate()
      );

      const options = {
        startDate: minStartDate.getTime(),
        endDate: endDate
          ? endDate instanceof Date
            ? endDate.getTime()
            : new Date(endDate).getTime()
          : now.getTime(),
      };

      // Use fetchOrders method which includes normalization (platform-specific)
      const result = await this.fetchOrders(options);

      // Check if fetchOrders was successful
      if (!result || !result.success) {
        logger.warn(
          `Failed to fetch orders from ${this.getPlatformType()}: ${
            result?.message || "Unknown error"
          }`,
          {
            connectionId: this.connectionId,
            platformType: this.getPlatformType(),
            result,
          }
        );

        return {
          success: false,
          message: result?.message || "Failed to fetch orders from platform",
          data: {
            count: 0,
            skipped: 0,
          },
        };
      }

      // Extract orders and stats from the result
      const orders = result.data || [];
      const stats = result.stats || { success: 0, skipped: 0, updated: 0 };

      logger.info(
        `Sync completed for ${this.getPlatformType()}: Retrieved ${
          orders.length
        } orders, processed ${stats.success} successfully, updated ${
          stats.updated || 0
        }, skipped ${stats.skipped}`,
        {
          connectionId: this.connectionId,
          platformType: this.getPlatformType(),
          totalRetrieved: orders.length,
          successCount: stats.success,
          updatedCount: stats.updated || 0,
          skippedCount: stats.skipped,
        }
      );

      // Update the connection's last sync time
      try {
        await PlatformConnection.update(
          { lastSyncAt: new Date() },
          { where: { id: this.connectionId } }
        );
      } catch (updateError) {
        logger.warn(`Failed to update last sync time: ${updateError.message}`, {
          connectionId: this.connectionId,
          error: updateError,
        });
      }

      return {
        success: true,
        message: `Successfully synchronized orders from ${this.getPlatformType()}`,
        data: {
          count: stats.success || 0,
          updated: stats.updated || 0,
          skipped: stats.skipped || 0,
          total: orders.length,
        },
      };
    } catch (error) {
      logger.error(
        `Failed to sync orders from ${this.getPlatformType()}: ${
          error.message
        }`,
        {
          error,
          connectionId: this.connectionId,
          platformType: this.getPlatformType(),
        }
      );

      throw error;
    }
  }

  /**
   * Update order status on the platform
   * @param {String} orderId - Order ID
   * @param {String} newStatus - New status to set
   * @returns {Promise<Object>} Update result
   */
  async updateOrderStatus(orderId, newStatus) {
    throw new Error(
      "updateOrderStatus must be implemented by platform service"
    );
  }

  /**
   * Map platform-specific order status to internal status
   * @param {String} platformStatus - Platform-specific status
   * @returns {String} Internal status
   */
  mapOrderStatus(platformStatus) {
    throw new Error("mapOrderStatus must be implemented by platform service");
  }

  /**
   * Map internal status to platform-specific status
   * @param {String} internalStatus - Internal status
   * @returns {String} Platform-specific status
   */
  mapToPlatformStatus(internalStatus) {
    throw new Error(
      "mapToPlatformStatus must be implemented by platform service"
    );
  }

  /**
   * Extract phone number from order data
   * Handles various formats and null cases in platform API responses
   * @param {Object} order - The order object from the platform API
   * @returns {string} The extracted phone number or empty string if not available
   */
  extractPhoneNumber(order) {
    // Default implementation that platforms can override
    // Base pattern that works for most Turkish numbers
    const patterns = [
      // Turkish mobile format (05XX)
      /\b(05\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})\b/,
      // With country code (+90 or 0090)
      /\b(\+?90[\s-]?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})\b/,
      // Generic phone number pattern as fallback
      /\b(\d{10,11})\b/,
    ];

    // Default implementation checks common locations in order object
    let phoneCandidate = "";

    // Try to extract from common fields in order APIs
    if (order.shipmentAddress && order.shipmentAddress.phone) {
      phoneCandidate = order.shipmentAddress.phone;
    } else if (order.customerPhone) {
      phoneCandidate = order.customerPhone;
    } else if (order.phoneNumber) {
      phoneCandidate = order.phoneNumber;
    } else if (order.shippingAddress && order.shippingAddress.phone) {
      phoneCandidate = order.shippingAddress.phone;
    }

    // Check if we found a phone candidate
    if (phoneCandidate) {
      return phoneCandidate;
    }

    // If no phone found in common fields, search all text fields for patterns
    const searchText = JSON.stringify(order);

    for (const pattern of patterns) {
      const match = searchText.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return "";
  }

  /**
   * Retry a request with exponential backoff
   * @param {Function} requestFn - Request function to retry
   * @param {Number} maxRetries - Maximum number of retries
   * @param {Number} delay - Base delay in milliseconds
   * @returns {Promise<any>} - Result from the request
   */
  async retryRequest(requestFn, maxRetries = 3, delay = 1000, apiUrl = null) {
    let retries = 0;
    let lastError = null;

    while (retries < maxRetries) {
      try {
        return await requestFn(apiUrl);
      } catch (error) {
        lastError = error;

        // Check if error is retryable - generally 429 (rate limit) or 5xx (server errors)
        if (
          error.response &&
          (error.response.status === 429 || error.response.status >= 500)
        ) {
          retries++;
          logger.warn(
            `Retrying API request for ${this.getPlatformType()} (${retries}/${maxRetries}) after error: ${
              error.message
            }`
          );

          // Wait before retrying with exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, delay * Math.pow(2, retries - 1))
          );
        } else {
          // Non-retryable error
          logger.error(
            `Non-retryable error in API request for ${this.getPlatformType()}: ${
              error.message
            }`,
            {
              error,
              connectionId: this.connectionId,
              platformType: this.getPlatformType(),
            }
          );
          throw error;
        }
      }
    }

    // If we've exhausted retries
    throw lastError;
  }

  /**
   * Get default start date for order fetching (30 days ago)
   * @returns {string} ISO date string
   */
  getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 30); // 30 days ago
    return date.toISOString().split("T")[0]; // Return YYYY-MM-DD format
  }

  /**
   * Get default end date for order fetching (today)
   * @returns {string} ISO date string
   */
  getDefaultEndDate() {
    const date = new Date();
    return date.toISOString().split("T")[0]; // Return YYYY-MM-DD format
  }
}

module.exports = BasePlatformService;
