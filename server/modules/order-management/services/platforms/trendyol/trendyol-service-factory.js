// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/services/platforms/trendyol/trendyol-service-factory.js
/**
 * Factory for creating Trendyol service instances
 * 
 * This factory decides whether to use the legacy platform-specific implementation
 * or the new generic implementation based on configuration.
 * 
 * @date May 20, 2025
 */

const config = require('../../../../../config/config');
const TrendyolService = require('./trendyol-service');
const TrendyolServiceGeneric = require('./trendyol-service-generic');
const logger = require('../../../../../utils/logger');

/**
 * Create a Trendyol service instance
 * 
 * @param {Object} connectionData - Platform connection data
 * @param {boolean} forceGeneric - Force using the generic implementation
 * @returns {TrendyolService|TrendyolServiceGeneric} Trendyol service instance
 */
function createTrendyolService(connectionData, forceGeneric = false) {
  const useGeneric = forceGeneric || config.platform?.useGenericModel || process.env.USE_GENERIC_PLATFORM_MODEL === 'true';
  
  if (useGeneric) {
    logger.debug(`Creating generic Trendyol service for connection ${connectionData.id}`);
    return new TrendyolServiceGeneric(connectionData);
  } else {
    logger.debug(`Creating legacy Trendyol service for connection ${connectionData.id}`);
    return new TrendyolService(connectionData);
  }
}

module.exports = {
  createTrendyolService
};