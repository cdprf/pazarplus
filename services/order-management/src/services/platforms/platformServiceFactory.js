const TrendyolService = require('./trendyol/trendyol-service');
const logger = require('../../utils/logger');
const { PlatformConnection } = require('../../models/platform-connection.model');

class PlatformServiceFactory {
  static async createService(connectionId) {
    try {
      const connection = await PlatformConnection.findByPk(connectionId);
      
      if (!connection) {
        throw new Error(`Platform connection with ID ${connectionId} not found`);
      }
      
      switch (connection.platformType) {
        case 'trendyol':
          return new TrendyolService(connectionId);
        case 'hepsiburada':
          const HepsiburadaService = require('./hepsiburada/hepsiburada-service');
          return new HepsiburadaService(connectionId);
        case 'n11':
          // Will be implemented in the next phase
          throw new Error('N11 integration not implemented yet');
        case 'csv':
          const CSVImporterService = require('./csv/csv-importer');
          return new CSVImporterService(connectionId);
        default:
          throw new Error(`Unknown platform type: ${connection.platformType}`);
      }
    } catch (error) {
      logger.error(`Failed to create platform service: ${error.message}`, { error, connectionId });
      throw error;
    }
  }
}

module.exports = PlatformServiceFactory;