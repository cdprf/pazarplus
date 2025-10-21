const { PlatformConnection, Product } = require("../models");
const PlatformServiceFactory = require("../modules/order-management/services/platforms/platformServiceFactory");
const logger = require("../utils/logger");

class MarketplaceController {
  /**
   * Syncs all products to all active marketplace connections for the user.
   */
  async syncAllMarketplaces(req, res) {
    try {
      const userId = req.user.id;

      // 1. Get all active platform connections for the user
      const connections = await PlatformConnection.findAll({
        where: { userId, isActive: true },
      });

      if (connections.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No active marketplace connections found.",
        });
      }

      // 2. Get all products for the user to be synced
      const products = await Product.findAll({
        where: { userId, status: 'active' }, // Sync only active products
      });

      if (products.length === 0) {
        return res.json({
          success: true,
          message: "No active products to sync.",
          data: { results: [] },
        });
      }

      logger.info(`Starting sync for ${products.length} products across ${connections.length} platforms for user ${userId}.`);

      // 3. Iterate over each connection and sync products
      const syncPromises = connections.map(async (connection) => {
        try {
          const platformService = PlatformServiceFactory.createService(
            connection.platformType,
            connection.id
          );

          await platformService.initialize();

          // This assumes a method like `publishProducts` exists on the service.
          // This method would need to be implemented in each platform-specific service.
          if (typeof platformService.publishProducts !== "function") {
            logger.warn(`Platform ${connection.platformType} does not support bulk product publishing.`);
            return {
              platform: connection.platformType,
              success: false,
              message: "Bulk publishing not supported.",
            };
          }

          const result = await platformService.publishProducts(products);
          return {
            platform: connection.platformType,
            success: result.success,
            message: result.message || "Sync completed.",
            data: result.data,
          };
        } catch (error) {
          logger.error(`Failed to sync with ${connection.platformType}:`, error);
          return {
            platform: connection.platformType,
            success: false,
            message: error.message,
          };
        }
      });

      const results = await Promise.all(syncPromises);

      res.json({
        success: true,
        message: "Marketplace synchronization process completed.",
        data: { results },
      });

    } catch (error) {
      logger.error("Marketplace sync failed:", error);
      res.status(500).json({
        success: false,
        message: "Failed to sync with marketplaces.",
        error: error.message,
      });
    }
  }
}

module.exports = new MarketplaceController();