const TrendyolService = require('./trendyol/trendyol-service');
const logger = require('../../utils/logger');
// Fix import to use the correct models index file instead of importing directly from the model file
const { PlatformConnection } = require('../../models');

/**
 * Factory for creating platform-specific service instances
 * Implements the factory pattern to create the appropriate service based on platform type
 */
class PlatformServiceFactory {
  /**
   * Create a service instance for a specific connection ID
   * @param {string} connectionId - The connection ID
   * @returns {Promise<object>} A platform service instance
   */
  static async createService(connectionId) {
    try {
      if (!connectionId) {
        throw new Error('Connection ID is required');
      }
      
      const connection = await PlatformConnection.findByPk(connectionId);
      
      if (!connection) {
        throw new Error(`Platform connection with ID ${connectionId} not found`);
      }
      
      let credentials;
      try {
        // Handle both string and object formats for credentials
        credentials = typeof connection.credentials === 'string'
          ? JSON.parse(connection.credentials)
          : connection.credentials;
      } catch (parseError) {
        logger.error(`Failed to parse connection credentials: ${parseError.message}`, { 
          error: parseError, 
          connectionId 
        });
        throw new Error(`Invalid connection credentials format: ${parseError.message}`);
      }
      
      // Pass the connectionId when creating the service
      return this.createServiceByType(connection.platformType, credentials, connectionId);
    } catch (error) {
      logger.error(`Failed to create platform service: ${error.message}`, { error, connectionId });
      throw error;
    }
  }

  /**
   * Create a service instance for a specific platform type with credentials
   * @param {string} platformType - The platform type (e.g., 'trendyol')
   * @param {object} credentials - The platform credentials
   * @param {string} connectionId - Optional connection ID
   * @returns {object} A platform service instance
   */
  static createServiceByType(platformType, credentials, connectionId = null) {
    try {
      if (!platformType) {
        throw new Error('Platform type is required');
      }
      
      if (!credentials) {
        throw new Error('Credentials are required');
      }
      
      // Convert to lowercase for case-insensitive matching
      const platform = platformType.toLowerCase().trim();
      
      switch (platform) {
        case 'trendyol':
          return new TrendyolService(connectionId, credentials);
        case 'hepsiburada':
          const HepsiburadaService = require('./hepsiburada/hepsiburada-service');
          return new HepsiburadaService(connectionId, credentials);
        case 'n11':
          // Will be implemented in the next phase
          throw new Error('N11 integration not implemented yet');
        case 'csv':
          const CSVImporterService = require('./csv/csv-importer');
          return new CSVImporterService(connectionId, credentials);
        default:
          throw new Error(`Unknown platform type: ${platform}`);
      }
    } catch (error) {
      logger.error(`Failed to create platform service by type: ${error.message}`, { error, platformType });
      throw error;
    }
  }
}

module.exports = PlatformServiceFactory;