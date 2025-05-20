/**
 * Base Platform Service
 * Provides common functionality for all platform services
 */
const logger = require('../../../utils/logger');
const retryRequest = require('../../../utils/apiUtils/retryRequest');
const { Order, OrderItem, ShippingDetail, Product } = require('../../../models');
const axios = require('axios');

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
    const PlatformConnection = require('../../../models/platform-connection.model');
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
      
      // Default implementation for platforms that don't implement their own testConnection method
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
   * Get orders from the platform
   * @param {Object} options - Options for fetching orders
   * @returns {Promise<Array>} List of orders
   */
  async getOrders(options = {}) {
    throw new Error('getOrders or fetchOrders must be implemented by platform service');
  }
  
  /**
   * Sync orders from the platform from a given date range
   * @param {Date} startDate - Start date for syncing
   * @param {Date} endDate - End date for syncing
   * @returns {Promise<Object>} Sync result
   */
  async syncOrdersFromDate(startDate, endDate = new Date()) {
    try {
      logger.info(`Syncing orders from ${this.getPlatformType()} for period ${startDate.toISOString()} to ${endDate.toISOString()}`, {
        connectionId: this.connectionId,
        platformType: this.getPlatformType(),
        startDate,
        endDate
      });

      // Make sure we have a connection and axios instance
      if (!this.axiosInstance) {
        await this.initialize();
      }
      
      // Format dates as ISO strings if they are Date objects
      const formattedStartDate = startDate instanceof Date ? startDate.toISOString() : startDate;
      const formattedEndDate = endDate instanceof Date ? endDate.toISOString() : endDate;

      // Get orders using the platform-specific implementation
      const options = {
        startDate: formattedStartDate,
        endDate: formattedEndDate
      };
      
      const orders = await this.getOrders(options);
      
      if (!orders || orders.length === 0) {
        logger.info(`No new orders found from ${this.getPlatformType()} for the specified date range`, {
          connectionId: this.connectionId,
          platformType: this.getPlatformType()
        });
        
        return {
          success: true,
          message: 'No new orders found for the specified date range',
          data: {
            count: 0,
            skipped: 0
          }
        };
      }
      
      logger.info(`Retrieved ${orders.length} orders from ${this.getPlatformType()}`, {
        connectionId: this.connectionId,
        platformType: this.getPlatformType(),
        orderCount: orders.length
      });

      // Save orders to the database
      let savedCount = 0;
      let skippedCount = 0;
      
      const PlatformConnection = require('../../../models/platform-connection.model');
      const Order = require('../../../models').Order;
      const OrderItem = require('../../../models').OrderItem;
      
      for (const orderData of orders) {
        try {
          // Check if order already exists
          const existingOrder = await Order.findOne({
            where: {
              platformOrderId: orderData.platformOrderId,
              connectionId: this.connectionId
            }
          });
          
          if (existingOrder) {
            logger.debug(`Order ${orderData.platformOrderId} already exists in the database, skipping`, {
              connectionId: this.connectionId,
              platformType: this.getPlatformType(),
              orderId: orderData.platformOrderId
            });
            
            skippedCount++;
            continue;
          }
          
          // Create new order
          const order = await Order.create({
            platformOrderId: orderData.platformOrderId,
            customerId: orderData.customerId,
            customerName: orderData.customerName,
            customerEmail: orderData.customerEmail,
            customerPhone: orderData.customerPhone,
            orderDate: orderData.orderDate,
            totalAmount: orderData.totalAmount,
            status: orderData.status,
            connectionId: this.connectionId,
            platformDetails: orderData.platformDetails || {}
          });
          
          // Create order items
          if (orderData.items && orderData.items.length > 0) {
            for (const itemData of orderData.items) {
              await OrderItem.create({
                orderId: order.id,
                platformItemId: itemData.platformItemId,
                productId: itemData.productId,
                sku: itemData.sku,
                name: itemData.name,
                quantity: itemData.quantity,
                unitPrice: itemData.unitPrice,
                totalPrice: itemData.totalPrice,
                status: itemData.status,
                platformDetails: itemData.platformDetails || {}
              });
            }
          }
          
          savedCount++;
        } catch (orderError) {
          logger.error(`Failed to save order ${orderData.platformOrderId}: ${orderError.message}`, {
            error: orderError,
            connectionId: this.connectionId,
            platformType: this.getPlatformType(),
            orderId: orderData.platformOrderId
          });
        }
      }
      
      // Update the connection's last sync time
      await PlatformConnection.update(
        { lastSyncAt: new Date() },
        { where: { id: this.connectionId } }
      );
      
      logger.info(`Sync completed for ${this.getPlatformType()}: Saved ${savedCount} orders, skipped ${skippedCount} orders`, {
        connectionId: this.connectionId,
        platformType: this.getPlatformType(),
        savedCount,
        skippedCount
      });
      
      return {
        success: true,
        message: `Successfully synchronized orders from ${this.getPlatformType()}`,
        data: {
          count: savedCount,
          skipped: skippedCount
        }
      };
    } catch (error) {
      logger.error(`Failed to sync orders from ${this.getPlatformType()}: ${error.message}`, {
        error,
        connectionId: this.connectionId,
        platformType: this.getPlatformType()
      });
      
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
      /\b(\d{10,11})\b/
    ];
    
    // Default implementation checks common locations in order object
    let phoneCandidate = '';
    
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
    
    return '';
  }
  
  /**
   * Retry a request with exponential backoff
   * @param {Function} requestFn - Request function to retry
   * @param {Number} maxRetries - Maximum number of retries
   * @param {Number} delay - Base delay in milliseconds
   * @returns {Promise<any>} - Result from the request
   */
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    let retries = 0;
    let lastError = null;
    
    while (retries < maxRetries) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable - generally 429 (rate limit) or 5xx (server errors)
        if (error.response && (error.response.status === 429 || error.response.status >= 500)) {
          retries++;
          logger.warn(`Retrying API request for ${this.getPlatformType()} (${retries}/${maxRetries}) after error: ${error.message}`);
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, retries - 1)));
        } else {
          // Non-retryable error
          throw error;
        }
      }
    }
    
    // If we've exhausted retries
    throw lastError;
  }
}

module.exports = BasePlatformService;