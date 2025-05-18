const TrendyolService = require('./trendyol/trendyol-service');
const logger = require('../../utils/logger');
// Fix import to use the correct models index file instead of importing directly from the model file
const { PlatformConnection } = require('../../models');

class PlatformServiceFactory {
  static async createService(connectionId) {
    try {
      const connection = await PlatformConnection.findByPk(connectionId);
      
      if (!connection) {
        throw new Error(`Platform connection with ID ${connectionId} not found`);
      }
      
      // Pass the connectionId when creating the service
      return this.createServiceByType(connection.platformType, JSON.parse(connection.credentials), connectionId);
    } catch (error) {
      logger.error(`Failed to create platform service: ${error.message}`, { error, connectionId });
      throw error;
    }
  }

  static createServiceByType(platformType, credentials, connectionId = null) {
    try {
      switch (platformType) {
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
          throw new Error(`Unknown platform type: ${platformType}`);
      }
    } catch (error) {
      logger.error(`Failed to create platform service by type: ${error.message}`, { error, platformType });
      throw error;
    }
  }
}

module.exports = PlatformServiceFactory;