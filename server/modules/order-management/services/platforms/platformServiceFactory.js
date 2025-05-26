const config = require('../../../../config/config');
const logger = require('../../../../utils/logger');
const { Order, OrderItem, User } = require('../../../../models');

// Platform service imports
const TrendyolService = require('./trendyol/trendyol-service');
const HepsiburadaService = require('./hepsiburada/hepsiburada-service');
const N11Service = require('./n11/n11-service');
const CSVImporterService = require('./csv/csv-importer');

class PlatformServiceFactory {
  /**
   * Create a platform service instance based on platform type
   * @param {string} platformType - The platform type (trendyol, hepsiburada, n11, csv)
   * @param {string|Object} connectionData - Connection ID or connection object
   * @returns {Object} Platform service instance
   */
  static createService(platformType, connectionData) {
    const normalizedType = platformType.toLowerCase();
    
    switch (normalizedType) {
      case 'trendyol':
        return new TrendyolService(connectionData);
        
      case 'hepsiburada':
        return new HepsiburadaService(connectionData);
        
      case 'n11':
        return new N11Service(connectionData);
        
      case 'csv':
        return new CSVImporterService(connectionData);
        
      default:
        throw new Error(`Unsupported platform type: ${platformType}`);
    }
  }
  
  /**
   * Get supported platform types
   * @returns {Array} List of supported platform types
   */
  static getSupportedPlatforms() {
    return ['trendyol', 'hepsiburada', 'n11', 'csv'];
  }
  
  /**
   * Check if a platform type is supported
   * @param {string} platformType - Platform type to check
   * @returns {boolean} True if supported
   */
  static isSupported(platformType) {
    return this.getSupportedPlatforms().includes(platformType.toLowerCase());
  }
}

module.exports = PlatformServiceFactory;