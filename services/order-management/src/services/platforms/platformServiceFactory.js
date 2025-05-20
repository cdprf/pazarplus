const config = require('../../config/config');
const logger = require('../../utils/logger');
// Import the service factory for Trendyol
const { createTrendyolService } = require('./trendyol/trendyol-service-factory');
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
   * @param {boolean} forceGeneric - Force using the generic implementation
   * @returns {Promise<object>} A platform service instance
   */
  static async createService(connectionId, forceGeneric = false) {
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
      
      // Create connection data object to pass to service factories
      const connectionData = {
        id: connection.id,
        userId: connection.userId,
        platformType: connection.platformType,
        credentials,
        settings: connection.settings || {}
      };
      
      // Pass the connection data when creating the service
      return this.createServiceByType(connectionData, forceGeneric);
    } catch (error) {
      logger.error(`Failed to create platform service: ${error.message}`, { error, connectionId });
      throw error;
    }
  }

  /**
   * Create a service instance for a specific platform type with credentials
   * @param {object} connectionData - Connection data including platformType and credentials
   * @param {boolean} forceGeneric - Force using the generic implementation
   * @returns {object} A platform service instance
   */
  static createServiceByType(connectionData, forceGeneric = false) {
    try {
      if (!connectionData || !connectionData.platformType) {
        throw new Error('Platform type is required');
      }
      
      if (!connectionData.credentials) {
        throw new Error('Credentials are required');
      }
      
      // Convert to lowercase for case-insensitive matching
      const platform = connectionData.platformType.toLowerCase().trim();
      
      // Decide whether to use generic implementation
      const useGeneric = forceGeneric || 
                         config.platform?.useGenericModel || 
                         process.env.USE_GENERIC_PLATFORM_MODEL === 'true';
      
      // Log which implementation will be used
      logger.debug(`Creating ${useGeneric ? 'generic' : 'legacy'} service for ${platform} platform`);
      
      switch (platform) {
        case 'trendyol':
          // Use the factory to create the appropriate Trendyol service
          return createTrendyolService(connectionData, forceGeneric);
          
        case 'hepsiburada':
          // Import with a try-catch to handle potential missing implementation
          try {
            // Check if generic implementation exists
            if (useGeneric) {
              const HepsiburadaServiceGeneric = require('./hepsiburada/hepsiburada-service-generic');
              return new HepsiburadaServiceGeneric(connectionData);
            } else {
              const HepsiburadaService = require('./hepsiburada/hepsiburada-service');
              return new HepsiburadaService(connectionData);
            }
          } catch (importError) {
            logger.warn(`Failed to import Hepsiburada service: ${importError.message}, falling back to legacy implementation`);
            const HepsiburadaService = require('./hepsiburada/hepsiburada-service');
            return new HepsiburadaService(connectionData);
          }
          
        case 'n11':
          const N11Service = require('./n11/n11-service');
          return new N11Service(connectionData);
          
        case 'csv':
          const CSVImporterService = require('./csv/csv-importer');
          return new CSVImporterService(connectionData);
          
        default:
          throw new Error(`Unknown platform type: ${platform}`);
      }
    } catch (error) {
      logger.error(`Failed to create platform service by type: ${error.message}`, { 
        error, 
        platformType: connectionData?.platformType 
      });
      throw error;
    }
  }
}

module.exports = PlatformServiceFactory;