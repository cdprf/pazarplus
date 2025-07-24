// This file platform service is responsible for managing connections to various e-commerce platforms.
// It provides a factory pattern to create platform-specific service instances, test connections, sync orders, and update order statuses.
// It also includes a method to get supported platforms and their required connection parameters.
const TrendyolService = require('./platforms/trendyol/trendyol-service');
// Import other platform services as we add them
// const AmazonService = require('./platforms/amazonService');
// const ShopifyService = require('./platforms/shopifyService');
const logger = require('../../../utils/logger');
const { Order, OrderItem, User, PlatformConnection } = require('../../../models');

/**
 * Factory for platform-specific API services
 */
class PlatformServiceFactory {
  /**
   * Create a platform service instance based on the connection type
   * @param {Object} connection - The platform connection from the database
   * @returns {Object} A platform-specific service instance
   */
  static createService(connection) {
    switch (connection.platformType.toLowerCase()) {
    case 'trendyol':
      return new TrendyolService(connection);
      // Add more platform services as needed
      // case 'amazon':
      //   return new AmazonService(connection);
      // case 'shopify':
      //   return new ShopifyService(connection);
    default:
      throw new Error(`Unsupported platform type: ${connection.platformType}`);
    }
  }
}

/**
 * Test a platform connection
 * @param {Object} connection - The platform connection from the database
 * @returns {Object} Test result
 */
const testConnection = async (connection) => {
  try {
    const service = PlatformServiceFactory.createService(connection);
    return await service.testConnection();
  } catch (error) {
    logger.error(`Connection test failed for ${connection.platformType}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Sync orders from a platform
 * @param {Object} connection - The platform connection from the database
 * @param {String} userId - The user ID associated with the connection
 * @returns {Object} Sync result
 */
const syncOrders = async (connection, userId) => {
  try {
    const service = PlatformServiceFactory.createService(connection);
    return await service.syncOrders(userId);
  } catch (error) {
    logger.error(`Order sync failed for ${connection.platformType}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Update order status on a platform
 * @param {Object} connection - The platform connection from the database
 * @param {String} orderId - The order ID in our system
 * @param {String} status - The new status
 * @returns {Object} Update result
 */
const updateOrderStatus = async (connection, orderId, status) => {
  try {
    const service = PlatformServiceFactory.createService(connection);
    return await service.updateOrderStatus(orderId, status);
  } catch (error) {
    logger.error(`Order status update failed for ${connection.platformType}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get supported platforms with their required connection parameters
 * @returns {Array} List of supported platforms and their configuration
 */
const getSupportedPlatforms = () => {
  return [
    {
      type: 'trendyol',
      name: 'Trendyol',
      logo: '/images/platforms/trendyol.png',
      requiredFields: [
        { name: 'apiKey', type: 'string', label: 'API Key', required: true },
        { name: 'apiSecret', type: 'password', label: 'API Secret', required: true },
        { name: 'sellerId', type: 'string', label: 'Seller ID', required: true },
        { name: 'apiUrl', type: 'string', label: 'API URL', required: false, default: 'https://api.trendyol.com/sapigw' }
      ],
      description: 'Connect to Trendyol marketplace to sync orders and inventory.'
    }
    // Add more platforms with their configurations
    // {
    //   type: 'amazon',
    //   name: 'Amazon',
    //   logo: '/images/platforms/amazon.png',
    //   requiredFields: [...],
    //   description: 'Connect to Amazon marketplace to sync orders and inventory.'
    // }
  ];
};

module.exports = {
  testConnection,
  syncOrders,
  updateOrderStatus,
  getSupportedPlatforms
};