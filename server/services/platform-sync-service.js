const logger = require("../utils/logger");
const {
  PlatformConnection,
  MainProduct,
  PlatformVariant,
} = require("../models");
const platformServiceManager = require("./platform-service-manager");

/**
 * Platform Sync Service
 * Handles automatic synchronization of product changes to connected platforms
 * Uses database authentication from PlatformConnection table
 */
class PlatformSyncService {
  constructor() {
    this.platformServiceManager = platformServiceManager;
    this.syncQueue = new Map(); // Store pending sync operations
    this.isProcessing = false;
  }

  /**
   * Sync product changes to all connected platforms using database authentication
   * @param {string} userId - User ID
   * @param {Object} product - Main product or variant data
   * @param {string} operation - 'create', 'update', 'delete'
   * @param {Object} changes - Specific changes made
   */
  async syncProductToAllPlatforms(
    userId,
    product,
    operation = "update",
    changes = {}
  ) {
    try {
      logger.info(
        `🔄 Starting platform sync for product ${product.id || product.name}`,
        {
          operation,
          userId,
          changes: Object.keys(changes),
        }
      );

      // Get all active platform connections for this user from database
      const connections = await PlatformConnection.findAll({
        where: {
          userId,
          isActive: true,
          status: "connected",
        },
      });

      if (connections.length === 0) {
        logger.warn(`No active platform connections found for user ${userId}`, {
          userId,
          productId: product.id,
        });
        return [];
      }

      logger.info(`Found ${connections.length} active platform connections`, {
        platforms: connections.map((c) => c.platformType),
        userId,
      });

      const syncResults = [];

      // Process each platform connection using database credentials
      for (const connection of connections) {
        try {
          const result = await this.syncToSinglePlatform(
            product.id || product,
            connection.platformType,
            changes,
            {
              userId,
              operation,
              connection,
            }
          );
          syncResults.push(result);
        } catch (error) {
          logger.error(`Failed to sync to ${connection.platformType}`, {
            error: error.message,
            platform: connection.platformType,
            connectionId: connection.id,
            productId: product.id,
          });

          syncResults.push({
            platform: connection.platformType,
            connectionId: connection.id,
            status: "error",
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Update sync status in database
      if (product.id) {
        await this.updateSyncStatus(product.id, syncResults, userId);
      }

      logger.info(
        `Platform sync completed for product ${product.id || product.name}`,
        {
          successCount: syncResults.filter((r) => r.status === "success")
            .length,
          errorCount: syncResults.filter((r) => r.status === "error").length,
          totalPlatforms: syncResults.length,
        }
      );

      return syncResults;
    } catch (error) {
      logger.error("Platform sync failed:", {
        error: error.message,
        userId,
        productId: product.id || product.name,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Sync product to a single platform using database authentication
   * @param {string} productId - Product ID
   * @param {string} platformType - Platform type (trendyol, hepsiburada, n11)
   * @param {Object} changes - Changes made to product
   * @param {Object} options - Additional options including connection and userId
   */
  async syncToSinglePlatform(
    productId,
    platformType,
    changes = {},
    options = {}
  ) {
    const { userId, operation = "update", connection } = options;
    const platform = platformType.toLowerCase();

    try {
      logger.info(`🔄 Syncing product ${productId} to ${platformType}`, {
        platform,
        operation,
        changes: Object.keys(changes),
        connectionId: connection?.id,
      });

      // Get platform service using the database connection
      // This will automatically use the credentials stored in connection.credentials
      const platformService = this.platformServiceManager.getService(
        platform,
        connection.id, // Connection ID for database auth
        null // No direct credentials since we're using database auth
      );

      if (!platformService) {
        throw new Error(`Platform service not available for ${platform}`);
      }

      // Get the main product and its variants from database
      const mainProduct = await MainProduct.findByPk(productId, {
        include: [
          {
            model: PlatformVariant,
            where: { platform: platformType },
            required: false,
          },
        ],
      });

      if (!mainProduct) {
        throw new Error(`Product ${productId} not found`);
      }

      // Map product data for the specific platform
      const mappedData = this.mapProductDataForPlatform(
        mainProduct.toJSON(),
        platform
      );

      // Apply the changes to mapped data
      Object.assign(mappedData, changes);

      // Perform the sync operation based on type
      let syncResult;
      switch (operation) {
        case "create":
          if (platformService.createProduct) {
            syncResult = await platformService.createProduct(
              mappedData,
              connection
            );
          } else {
            throw new Error(`${platform} does not support product creation`);
          }
          break;
        case "update":
          if (platformService.updateProduct) {
            syncResult = await platformService.updateProduct(
              mappedData,
              connection
            );
          } else {
            throw new Error(`${platform} does not support product updates`);
          }
          break;
        case "delete":
          if (platformService.deleteProduct) {
            syncResult = await platformService.deleteProduct(
              productId,
              connection
            );
          } else {
            throw new Error(`${platform} does not support product deletion`);
          }
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      // Update platform variant with sync results
      await this.updatePlatformVariantSyncStatus(
        productId,
        platformType,
        "success",
        syncResult
      );

      logger.info(
        `✅ Successfully synced product ${productId} to ${platformType}`,
        {
          platform,
          operation,
          syncResult,
        }
      );

      return {
        platform: platformType,
        connectionId: connection.id,
        status: "success",
        result: syncResult,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Update platform variant with error status
      await this.updatePlatformVariantSyncStatus(
        productId,
        platformType,
        "error",
        { error: error.message }
      );

      logger.error(
        `❌ Failed to sync product ${productId} to ${platformType}`,
        {
          error: error.message,
          platform,
          operation,
          connectionId: connection?.id,
        }
      );

      throw error;
    }
  }

  /**
   * Update platform variant sync status in database
   */
  async updatePlatformVariantSyncStatus(productId, platform, status, result) {
    try {
      await PlatformVariant.update(
        {
          syncStatus: status,
          lastSyncAt: new Date(),
          syncError: status === "error" ? result : null,
        },
        {
          where: {
            mainProductId: productId,
            platform: platform,
          },
        }
      );
    } catch (error) {
      logger.error("Failed to update sync status:", error);
    }
  }

  /**
   * Update overall sync status for a product
   */
  async updateSyncStatus(productId, results, userId) {
    try {
      const successCount = results.filter((r) => r.status === "success").length;
      const totalCount = results.length;

      // Update main product with last sync info
      await MainProduct.update(
        {
          lastSyncedAt: new Date(),
        },
        {
          where: { id: productId, userId },
        }
      );

      logger.info(`Updated sync status for product ${productId}`, {
        success: successCount,
        total: totalCount,
      });
    } catch (error) {
      logger.error("Failed to update product sync status:", error);
    }
  }

  /**
   * Map product data for specific platform
   * @param {Object} productData - Product data from database
   * @param {string} platform - Platform type
   */
  mapProductDataForPlatform(productData, platform) {
    const baseMapping = {
      title: productData.name,
      description: productData.description,
      sku: productData.baseSku,
      price: productData.basePrice,
      stockQuantity: productData.stockQuantity,
      brand: productData.brand,
      category: productData.category,
    };

    // Platform-specific mappings
    switch (platform.toLowerCase()) {
      case "trendyol":
        return {
          ...baseMapping,
          listPrice: productData.basePrice,
          categoryId: productData.platformTemplates?.trendyol?.categoryId,
          barcode: productData.baseSku,
          attributes: productData.attributes || {},
          images: productData.media || [],
          productMainId: productData.id,
          approved: true,
          hasActiveCampaign: false,
          vatRate: 18,
          dimensionalWeight: productData.weight || 0,
          stockCode: productData.baseSku,
        };

      case "hepsiburada":
        return {
          ...baseMapping,
          marketPrice: productData.basePrice,
          categoryId: productData.platformTemplates?.hepsiburada?.categoryId,
          productId: productData.id,
          merchantId: productData.platformTemplates?.hepsiburada?.merchantId,
          images: productData.media || [],
          attributes: productData.attributes || {},
        };

      case "n11":
        return {
          ...baseMapping,
          salePrice: productData.basePrice,
          productPrice: productData.basePrice,
          categoryId: productData.platformTemplates?.n11?.categoryId,
          productId: productData.id,
          images: productData.media || [],
          attributes: productData.attributes || {},
        };

      default:
        return baseMapping;
    }
  }

  /**
   * Check if product changes should trigger sync to all variants
   */
  shouldUpdateAllVariants(changes) {
    const globalFields = [
      "name",
      "description",
      "brand",
      "category",
      "basePrice",
      "stockQuantity",
      "status",
    ];
    return globalFields.some((field) => changes.hasOwnProperty(field));
  }

  /**
   * Queue product sync for batch processing
   */
  async queueProductSync(userId, product, operation, changes) {
    const key = `${userId}-${product.id || product}`;
    this.syncQueue.set(key, {
      userId,
      product,
      operation,
      changes,
      timestamp: Date.now(),
    });

    // Process queue if not already processing
    if (!this.isProcessing) {
      setTimeout(() => this.processSyncQueue(), 100);
    }
  }

  /**
   * Process queued sync operations
   */
  async processSyncQueue() {
    if (this.isProcessing || this.syncQueue.size === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const entries = Array.from(this.syncQueue.entries());
      this.syncQueue.clear();

      for (const [key, syncData] of entries) {
        try {
          await this.syncProductToAllPlatforms(
            syncData.userId,
            syncData.product,
            syncData.operation,
            syncData.changes
          );
        } catch (error) {
          logger.error(`Failed to process queued sync for ${key}:`, error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Sync specific fields of a product
   */
  async syncSpecificFields(userId, product, fields) {
    const changes = {};
    fields.forEach((field) => {
      if (product[field] !== undefined) {
        changes[field] = product[field];
      }
    });

    return await this.syncProductToAllPlatforms(
      userId,
      product,
      "update",
      changes
    );
  }

  /**
   * Get sync status for a product
   */
  async getSyncStatus(productId) {
    try {
      const variants = await PlatformVariant.findAll({
        where: { mainProductId: productId },
        attributes: ["platform", "syncStatus", "lastSyncAt", "syncError"],
      });

      return {
        productId,
        platforms: variants.map((v) => ({
          platform: v.platform,
          status: v.syncStatus,
          lastSync: v.lastSyncAt,
          error: v.syncError,
        })),
      };
    } catch (error) {
      logger.error("Failed to get sync status:", error);
      throw error;
    }
  }
}

// Export as singleton to maintain state
module.exports = new PlatformSyncService();
