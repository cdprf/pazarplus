/**
 * Base Platform Service
 * Provides common functionality for all platform services
 */
const logger = require('../../utils/logger');
const retryRequest = require('../../utils/apiUtils/retryRequest');
const { Order, OrderItem, ShippingDetail, Product } = require('../../models');

class BasePlatformService {
  constructor(connectionId) {
    this.connectionId = connectionId;
    this.connection = null;
    this.apiUrl = null;
    this.axiosInstance = null;
  }
  
  /**
   * Initialize the platform service with connection details
   * @returns {Promise<Boolean>} True if initialization successful
   */
  async initialize() {
    try {
      this.connection = await this.findConnection();
      
      if (!this.connection) {
        throw new Error(`Platform connection with ID ${this.connectionId} not found`);
      }
      
      await this.setupAxiosInstance();
      return true;
    } catch (error) {
      logger.error(`Failed to initialize platform service: ${error.message}`, { 
        error, 
        connectionId: this.connectionId,
        platformType: this.getPlatformType()
      });
      throw new Error(`Failed to initialize platform service: ${error.message}`);
    }
  }

  /**
   * Find connection in database
   * @returns {Promise<Object>} Platform connection
   */
  async findConnection() {
    const PlatformConnection = require('../../models/platform-connection.model');
    return await PlatformConnection.findByPk(this.connectionId);
  }
  
  /**
   * Setup Axios instance with appropriate headers and config
   * Should be implemented by each platform service
   */
  async setupAxiosInstance() {
    throw new Error('setupAxiosInstance must be implemented by platform service');
  }
  
  /**
   * Decrypt credentials from the platform connection
   * @param {String} encryptedCredentials - Encrypted credentials string
   * @returns {Object} Decrypted credentials
   */
  decryptCredentials(encryptedCredentials) {
    // In a real implementation, this would use proper encryption/decryption
    return typeof encryptedCredentials === 'string' 
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
      return {
        success: true,
        message: `Successfully connected to ${this.getPlatformType()}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to ${this.getPlatformType()}: ${error.message}`,
        error: error.message
      };
    }
  }
  
  /**
   * Get the platform type
   * Should be implemented by each platform service
   */
  getPlatformType() {
    throw new Error('getPlatformType must be implemented by platform service');
  }
  
  /**
   * Fetch orders from the platform
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing order data
   */
  async fetchOrders(params = {}) {
    throw new Error('fetchOrders must be implemented by platform service');
  }
  
  /**
   * Sync orders from the platform from a given date range
   * @param {Date} startDate - Start date for syncing
   * @param {Date} endDate - End date for syncing
   * @returns {Promise<Object>} Sync result
   */
  async syncOrdersFromDate(startDate, endDate = new Date()) {
    throw new Error('syncOrdersFromDate must be implemented by platform service');
  }
  
  /**
   * Update order status on the platform
   * @param {String} orderId - Order ID
   * @param {String} newStatus - New status to set
   * @returns {Promise<Object>} Update result
   */
  async updateOrderStatus(orderId, newStatus) {
    throw new Error('updateOrderStatus must be implemented by platform service');
  }
  
  /**
   * Map platform-specific order status to internal status
   * @param {String} platformStatus - Platform-specific status
   * @returns {String} Internal status
   */
  mapOrderStatus(platformStatus) {
    throw new Error('mapOrderStatus must be implemented by platform service');
  }
  
  /**
   * Map internal status to platform-specific status
   * @param {String} internalStatus - Internal status
   * @returns {String} Platform-specific status
   */
  mapToPlatformStatus(internalStatus) {
    throw new Error('mapToPlatformStatus must be implemented by platform service');
  }
  
  /**
   * Retry a request with exponential backoff
   * @param {Function} requestFn - Request function to retry
   * @param {Number} maxRetries - Maximum number of retries
   * @param {Number} delay - Base delay in milliseconds
   * @returns {Promise<any>} - Result from the request
   */
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    return retryRequest(requestFn, maxRetries, delay);
  }
}

module.exports = BasePlatformService;