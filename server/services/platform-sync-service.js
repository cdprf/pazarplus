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
    this.encryptionService = require("../utils/encryption"); // Add encryption service
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

      // Handle platform-synced products differently
      // Support both old "platform_sync" and new "platform" enum values during transition
      if (
        product.creationSource === "platform" ||
        product.creationSource === "platform_sync"
      ) {
        // For platform-synced products, only sync back to the original platform
        return await this.syncPlatformProductBackToOrigin(
          userId,
          product,
          operation,
          changes
        );
      }

      // If product ID is provided, fetch full product data to check creation source and origin
      let fullProduct = null;
      if (product.id && !product.creationSource) {
        fullProduct = await MainProduct.findByPk(product.id, {
          attributes: [
            "id",
            "name",
            "creationSource",
            "scrapedFrom",
            "importedFrom",
          ],
        });

        if (
          fullProduct &&
          (fullProduct.creationSource === "platform" ||
            fullProduct.creationSource === "platform_sync")
        ) {
          // For platform-synced products, only sync back to the original platform
          return await this.syncPlatformProductBackToOrigin(
            userId,
            fullProduct,
            operation,
            changes
          );
        }
      }

      // Get all active platform connections for this user from database
      const connections = await PlatformConnection.findAll({
        where: {
          userId,
          isActive: true,
          status: "active",
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
   * Sync platform-originated product back to its original platform only
   * @param {string} userId - User ID
   * @param {Object} product - Platform-synced product data
   * @param {string} operation - 'create', 'update', 'delete'
   * @param {Object} changes - Specific changes made
   */
  async syncPlatformProductBackToOrigin(
    userId,
    product,
    operation = "update",
    changes = {}
  ) {
    try {
      logger.info(
        `🔄 Syncing platform-originated product ${
          product.id || product.name
        } back to origin`,
        {
          operation,
          userId,
          changes: Object.keys(changes),
          creationSource: product.creationSource,
          scrapedFrom: product.scrapedFrom,
          importedFrom: product.importedFrom,
        }
      );

      // Determine the original platform
      let originPlatform = null;

      // Check scrapedFrom field first (more specific)
      if (product.scrapedFrom) {
        originPlatform = product.scrapedFrom.toLowerCase();
      }
      // Fallback to importedFrom if available
      else if (product.importedFrom) {
        originPlatform = product.importedFrom.toLowerCase();
      }
      // Try to extract from platform variants
      else if (product.id) {
        const platformVariants = await PlatformVariant.findAll({
          where: { mainProductId: product.id },
          attributes: ["platform", "externalId"],
        });

        // Find the variant with an external ID (indicates it came from that platform)
        const originVariant = platformVariants.find((v) => v.externalId);
        if (originVariant) {
          originPlatform = originVariant.platform.toLowerCase();
        }
      }

      if (!originPlatform) {
        logger.warn(
          `Cannot determine origin platform for product ${
            product.id || product.name
          }`,
          {
            productId: product.id,
            scrapedFrom: product.scrapedFrom,
            importedFrom: product.importedFrom,
          }
        );
        return [
          {
            status: "skipped",
            reason: "unknown_origin_platform",
            message: "Cannot determine original platform for sync",
            timestamp: new Date().toISOString(),
          },
        ];
      }

      // Find the connection for the origin platform
      const originConnection = await PlatformConnection.findOne({
        where: {
          userId,
          platformType: originPlatform,
          isActive: true,
          status: "active",
        },
      });

      if (!originConnection) {
        logger.warn(
          `No active connection found for origin platform ${originPlatform}`,
          {
            userId,
            productId: product.id,
            originPlatform,
          }
        );
        return [
          {
            status: "skipped",
            reason: "no_origin_connection",
            message: `No active connection for origin platform ${originPlatform}`,
            timestamp: new Date().toISOString(),
          },
        ];
      }

      logger.info(`Found origin platform connection: ${originPlatform}`, {
        connectionId: originConnection.id,
        platformType: originConnection.platformType,
      });

      // Sync only to the origin platform
      try {
        const result = await this.syncToSinglePlatform(
          product.id || product,
          originConnection.platformType,
          changes,
          {
            userId,
            operation,
            connection: originConnection,
            isOriginSync: true, // Flag to indicate this is syncing back to origin
          }
        );

        // Update sync status in database
        if (product.id) {
          await this.updateSyncStatus(product.id, [result], userId);
        }

        logger.info(
          `✅ Successfully synced platform-originated product ${
            product.id || product.name
          } back to ${originPlatform}`,
          {
            platform: originPlatform,
            operation,
            result,
          }
        );

        return [result];
      } catch (error) {
        logger.error(
          `Failed to sync platform-originated product to origin ${originPlatform}`,
          {
            error: error.message,
            platform: originPlatform,
            connectionId: originConnection.id,
            productId: product.id,
          }
        );

        const errorResult = {
          platform: originConnection.platformType,
          connectionId: originConnection.id,
          status: "error",
          error: error.message,
          timestamp: new Date().toISOString(),
        };

        // Update sync status in database
        if (product.id) {
          await this.updateSyncStatus(product.id, [errorResult], userId);
        }

        return [errorResult];
      }
    } catch (error) {
      logger.error("Platform origin sync failed:", {
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
    const {
      userId,
      operation = "update",
      connection,
      isOriginSync = false,
    } = options;

    try {
      logger.info(
        `🔄 Syncing product ${productId} to single platform: ${platformType}`,
        {
          productId,
          platformType,
          operation,
          isOriginSync,
          changes: Object.keys(changes),
        }
      );

      // Validate platform type
      const validPlatforms = ["trendyol", "hepsiburada", "n11"];
      if (!validPlatforms.includes(platformType.toLowerCase())) {
        throw new Error(`Unsupported platform type: ${platformType}`);
      }

      // Use provided connection or find it
      let platformConnection = connection;
      if (!platformConnection) {
        platformConnection = await PlatformConnection.findOne({
          where: {
            userId,
            platformType: platformType.toLowerCase(),
            isActive: true,
            status: "active",
          },
        });

        if (!platformConnection) {
          throw new Error(
            `No active connection found for platform ${platformType}`
          );
        }
      }

      // Get product data from database
      const product = await MainProduct.findByPk(productId, {
        include: [
          {
            model: PlatformVariant,
            as: "platformVariants",
            where: { platform: platformType.toLowerCase() },
            required: false,
          },
        ],
      });

      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      // Get platform service
      const platformService = this.platformServiceManager.getService(
        platformType.toLowerCase()
      );

      if (!platformService) {
        throw new Error(`No service available for platform ${platformType}`);
      }

      // Decrypt credentials
      const credentials = JSON.parse(
        this.encryptionService.decrypt(platformConnection.credentials)
      );

      // Transform product data for the platform
      const transformedProduct = await this.transformProductForPlatform(
        product,
        platformType.toLowerCase(),
        changes
      );

      // Determine sync operation
      const platformVariant = product.platformVariants?.[0];
      let syncResult;

      if (operation === "delete") {
        // Delete product from platform
        if (platformVariant?.externalId) {
          syncResult = await platformService.deleteProduct(
            platformVariant.externalId,
            credentials
          );
        } else {
          syncResult = {
            status: "skipped",
            reason: "no_external_id",
            message: "Product not found on platform",
          };
        }
      } else if (platformVariant?.externalId) {
        // Update existing product
        syncResult = await platformService.updateProduct(
          platformVariant.externalId,
          transformedProduct,
          credentials
        );
      } else {
        // Create new product
        syncResult = await platformService.createProduct(
          transformedProduct,
          credentials
        );

        // If successful, store external ID
        if (syncResult.status === "success" && syncResult.externalId) {
          await this.updatePlatformVariantExternalId(
            productId,
            platformType.toLowerCase(),
            syncResult.externalId
          );
        }
      }

      // Update platform variant sync status
      await this.updatePlatformVariantSyncStatus(
        productId,
        platformType.toLowerCase(),
        syncResult.status === "success" ? "synced" : "error",
        syncResult.status === "error"
          ? syncResult.error || syncResult.message
          : null
      );

      logger.info(`✅ Single platform sync completed for ${platformType}`, {
        productId,
        platformType,
        operation,
        status: syncResult.status,
        isOriginSync,
      });

      return {
        platform: platformType.toLowerCase(),
        connectionId: platformConnection.id,
        status: syncResult.status,
        externalId: syncResult.externalId,
        message: syncResult.message,
        error: syncResult.error,
        timestamp: new Date().toISOString(),
        isOriginSync,
      };
    } catch (error) {
      logger.error(`Single platform sync failed for ${platformType}:`, {
        error: error.message,
        productId,
        platformType,
        operation,
        isOriginSync,
        stack: error.stack,
      });

      return {
        platform: platformType.toLowerCase(),
        connectionId: connection?.id,
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
        isOriginSync,
      };
    }
  }

  /**
   * Update platform variant external ID after successful product creation
   * @param {string} productId - Main product ID
   * @param {string} platform - Platform name
   * @param {string} externalId - External ID assigned by platform
   */
  async updatePlatformVariantExternalId(productId, platform, externalId) {
    try {
      const [platformVariant, created] = await PlatformVariant.findOrCreate({
        where: {
          mainProductId: productId,
          platform: platform.toLowerCase(),
        },
        defaults: {
          mainProductId: productId,
          platform: platform.toLowerCase(),
          externalId,
          status: "synced",
          lastSyncAt: new Date(),
        },
      });

      if (!created) {
        await platformVariant.update({
          externalId,
          status: "synced",
          lastSyncAt: new Date(),
        });
      }

      logger.info(
        `Updated platform variant external ID for ${platform}: ${externalId}`,
        {
          productId,
          platform,
          externalId,
          created,
        }
      );

      return platformVariant;
    } catch (error) {
      logger.error("Failed to update platform variant external ID:", {
        error: error.message,
        productId,
        platform,
        externalId,
      });
      throw error;
    }
  }

  /**
   * Transform product data for a specific platform
   * @param {Object} product - Main product data
   * @param {string} platform - Platform name
   * @param {Object} changes - Specific changes to apply
   */
  async transformProductForPlatform(product, platform, changes = {}) {
    try {
      // Base product data
      const transformedData = {
        name: product.name,
        description: product.description,
        price: product.price,
        discountedPrice: product.discountedPrice,
        stockQuantity: product.stockQuantity,
        sku: product.sku,
        barcode: product.barcode,
        categoryId: product.categoryId,
        brand: product.brand,
        weight: product.weight,
        dimensions: product.dimensions,
        images: product.images,
        attributes: product.attributes,
        tags: product.tags,
        isActive: product.isActive,
        ...changes, // Apply any specific changes
      };

      // Platform-specific transformations
      switch (platform.toLowerCase()) {
        case "trendyol":
          return this.transformForTrendyol(transformedData, product);
        case "hepsiburada":
          return this.transformForHepsiburada(transformedData, product);
        case "n11":
          return this.transformForN11(transformedData, product);
        default:
          logger.warn(`No specific transformation for platform: ${platform}`);
          return transformedData;
      }
    } catch (error) {
      logger.error("Product transformation failed:", {
        error: error.message,
        platform,
        productId: product.id,
      });
      throw error;
    }
  }

  /**
   * Transform product data for Trendyol platform
   */
  transformForTrendyol(productData, originalProduct) {
    return {
      ...productData,
      categoryId: productData.categoryId || originalProduct.trendyolCategoryId,
      brand: productData.brand || "Generic",
      stockQuantity: Math.max(0, productData.stockQuantity || 0),
      // Trendyol-specific fields
      shipmentAddressId: originalProduct.shipmentAddressId,
      returningAddressId: originalProduct.returningAddressId,
    };
  }

  /**
   * Transform product data for Hepsiburada platform
   */
  transformForHepsiburada(productData, originalProduct) {
    return {
      ...productData,
      categoryId:
        productData.categoryId || originalProduct.hepsiburadaCategoryId,
      brand: productData.brand || "Generic",
      stockQuantity: Math.max(0, productData.stockQuantity || 0),
      // Hepsiburada-specific fields
      merchantId: originalProduct.merchantId,
    };
  }

  /**
   * Transform product data for N11 platform
   */
  transformForN11(productData, originalProduct) {
    return {
      ...productData,
      categoryId: productData.categoryId || originalProduct.n11CategoryId,
      brand: productData.brand || "Generic",
      stockQuantity: Math.max(0, productData.stockQuantity || 0),
      // N11-specific fields
      productSellingType: originalProduct.productSellingType || "NEW",
    };
  }

  /**
      const platformService = this.platformServiceManager.getService(
        platform,
        connection.id, // Connection ID for database auth
        null // No direct credentials since we're using database auth
      );

      if (!platformService) {
        throw new Error(`Platform service not available for ${platform}`);
      }

      // Get the main product and its variants from database
      let mainProduct = await MainProduct.findByPk(productId, {
        include: [
          {
            model: PlatformVariant,
            as: "platformVariants",
            where: { platform: platformType },
            required: false,
          },
        ],
      });

      // If not found in MainProduct table, check if it's in the legacy Product table
      if (!mainProduct) {
        const { Product } = require("../models");
        const legacyProduct = await Product.findByPk(productId);

        if (legacyProduct) {
          // Check if this is a platform-synced product that shouldn't be synced back
          // Support both old "platform_sync" and new "platform" enum values
          if (legacyProduct.creationSource === "platform_sync" || legacyProduct.creationSource === "platform") {
            logger.warn(
              `Product ${productId} is platform-synced and cannot be synced back to platforms. This would create a loop.`,
              {
                productId,
                legacyProductName: legacyProduct.name,
                creationSource: legacyProduct.creationSource,
                platform: platformType,
                operation,
              }
            );
            throw new Error(
              `Product ${productId} was created from platform sync and cannot be synced back. Only user-created products can be synced to platforms.`
            );
          }

          logger.warn(
            `Product ${productId} found in legacy Product table, but platform sync requires MainProduct. Skipping sync.`,
            {
              productId,
              legacyProductName: legacyProduct.name,
              platform: platformType,
              operation,
            }
          );
          throw new Error(
            `Product ${productId} is in legacy format and cannot be synced. Please migrate to MainProduct table.`
          );
        }

        throw new Error(`Product ${productId} not found`);
      }

      // Check if this is a platform-synced main product that shouldn't be synced back
      // Support both old "platform_sync" and new "platform" enum values
      if (mainProduct.creationSource === "platform_sync" || mainProduct.creationSource === "platform") {
        logger.warn(
          `MainProduct ${productId} is platform-synced and cannot be synced back to platforms. This would create a loop.`,
          {
            productId,
            productName: mainProduct.name,
            creationSource: mainProduct.creationSource,
            platform: platformType,
            operation,
          }
        );
        throw new Error(
          `Product ${productId} was created from platform sync and cannot be synced back. Only user-created products can be synced to platforms.`
        );
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
        error.message
      );

      logger.error(
        `❌ Failed to sync product ${productId} to ${platformType}`,
        {
          error: error.message,
          errorType: error.name || "Unknown",
          platform,
          operation,
          connectionId: connection?.id,
          userId,
          productId,
          platformType,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          changes: Object.keys(changes),
          retryCount: options.retryCount || 0,
          connectionStatus: connection?.status,
          connectionIsActive: connection?.isActive,
          httpStatus: error.status || error.statusCode,
          platformResponse: error.response?.data || error.response,
          requestDuration: options.startTime
            ? Date.now() - options.startTime
            : undefined,
          isCreationSourceError: error.message?.includes("creationSource"),
          errorCategory:
            error.message?.includes("column") &&
            error.message?.includes("does not exist")
              ? "database_schema"
              : error.message?.includes("JSON")
              ? "json_parsing"
              : "general",
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
      // Convert error result to clean text string
      let syncError = null;
      if (status === "error") {
        if (typeof result === "string") {
          syncError = result;
        } else if (result && typeof result === "object") {
          syncError = result.error || result.message || JSON.stringify(result);
        } else {
          syncError = String(result);
        }

        // Clean the error message to prevent database issues
        if (syncError) {
          // Remove any problematic characters and ensure it's plain text
          syncError = syncError
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
            .replace(/\\/g, "\\\\") // Escape backslashes
            .trim();

          // Ensure the error message is not too long for database storage
          if (syncError.length > 1000) {
            syncError = syncError.substring(0, 997) + "...";
          }
        }
      }

      await PlatformVariant.update(
        {
          syncStatus: status,
          lastSyncAt: new Date(),
          syncError: syncError,
        },
        {
          where: {
            mainProductId: productId,
            platform: platform,
          },
        }
      );

      logger.debug(
        `Updated sync status for product ${productId} on ${platform}`,
        {
          productId,
          platform,
          status,
          hasError: !!syncError,
        }
      );
    } catch (error) {
      logger.error("Failed to update sync status:", {
        error: error.message,
        productId,
        platform,
        status,
        originalResult:
          typeof result === "string"
            ? result.substring(0, 200)
            : JSON.stringify(result).substring(0, 200),
        stack: error.stack,
        sqlState: error.original?.code,
        sqlDetail: error.original?.detail,
      });
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
