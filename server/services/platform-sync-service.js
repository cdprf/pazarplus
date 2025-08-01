const logger = require("../utils/logger");
const {
  PlatformConnection,
  MainProduct,
  PlatformVariant,
  Product,
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
   * Main sync orchestrator - determines product type and routes to appropriate sync function
   * @param {string} userId - User ID
   * @param {Object} product - Product data
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
        `🔄 Starting intelligent platform sync for product ${
          product.id || product.name
        }`,
        {
          operation,
          userId,
          changes: Object.keys(changes),
        }
      );

      const productId = product.id || product;

      // First, determine if this is a MainProduct or regular Product
      let productData = null;
      let productType = null;
      let isMainProductType = false;

      // Try MainProduct first
      try {
        productData = await MainProduct.findByPk(productId, {
          attributes: [
            "id",
            "name",
            "creationSource",
            "scrapedFrom",
            "importedFrom",
          ],
          include: [
            {
              model: PlatformVariant,
              as: "platformVariants",
              attributes: ["platform", "externalId", "isPublished"],
            },
          ],
        });

        if (productData) {
          productType = "MainProduct";
          isMainProductType = true;
          logger.info(
            `Product ${productId} identified as MainProduct (labeled main product)`,
            {
              productId,
              creationSource: productData.creationSource,
            }
          );
        }
      } catch (error) {
        logger.debug(
          `MainProduct lookup failed for ${productId}:`,
          error.message
        );
      }

      // If not found in MainProduct, try regular Product table
      if (!productData) {
        try {
          productData = await Product.findByPk(productId, {
            attributes: [
              "id",
              "name",
              "creationSource",
              "isMainProduct",
              "sourcePlatform",
            ],
            include: [
              {
                model: PlatformVariant,
                as: "platformVariants",
                attributes: ["platform", "externalId", "isPublished"],
              },
            ],
          });

          if (productData) {
            productType = "Product";
            isMainProductType = productData.isMainProduct || false;
            logger.info(
              `Product ${productId} identified as regular Product (isMainProduct: ${isMainProductType})`,
              {
                productId,
                creationSource: productData.creationSource,
                sourcePlatform: productData.sourcePlatform,
                isMainProduct: isMainProductType,
              }
            );
          }
        } catch (error) {
          logger.debug(
            `Product lookup failed for ${productId}:`,
            error.message
          );
        }
      }

      if (!productData) {
        logger.warn(
          `Product ${productId} not found in either MainProduct or Product tables`,
          {
            productId,
            userId,
          }
        );
        return {
          success: false,
          error: "Product not found in any table",
          platforms: [],
        };
      }

      // Determine sync strategy based on product type and source
      const creationSource = productData.creationSource;
      const isPlatformSourced =
        creationSource === "platform" || creationSource === "platform_sync";

      logger.info(`Product sync routing decision:`, {
        productId,
        productType,
        isMainProductType,
        creationSource,
        isPlatformSourced,
      });

      // Route to appropriate sync function based on product characteristics
      if (isPlatformSourced) {
        // Platform-sourced products: sync back to origin only
        return await this.syncToPlatformSource(
          userId,
          productData,
          operation,
          changes,
          productType
        );
      } else if (isMainProductType) {
        // User-created main products: intelligent multi-platform sync
        return await this.syncToMultiplePlatforms(
          userId,
          productData,
          operation,
          changes,
          productType
        );
      } else {
        // Regular user products: standard sync
        return await this.syncRegularProductToPlatforms(
          userId,
          productData,
          operation,
          changes,
          productType
        );
      }
    } catch (error) {
      logger.error("Intelligent platform sync failed:", {
        error: error.message,
        userId,
        productId: product.id || product.name,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Sync platform-sourced products back to their origin platform only
   * @param {string} userId - User ID
   * @param {Object} product - Platform-sourced product data
   * @param {string} operation - 'create', 'update', 'delete'
   * @param {Object} changes - Specific changes made
   * @param {string} productType - 'MainProduct' or 'Product'
   */
  async syncToPlatformSource(
    userId,
    product,
    operation = "update",
    changes = {},
    productType = "MainProduct"
  ) {
    logger.info(
      `🔄 Syncing platform-sourced ${productType} back to origin platform`,
      {
        productId: product.id,
        operation,
        creationSource: product.creationSource,
        productType,
      }
    );

    // Platform-sourced products should only sync back to their origin
    const result = await this.syncPlatformProductBackToOrigin(
      userId,
      product,
      operation,
      changes
    );

    const existingPlatforms = product.platformVariants || [];
    const publishedPlatforms = existingPlatforms.filter((v) => v.isPublished);

    return {
      ...result,
      platforms: publishedPlatforms.map((v) => ({
        platform: v.platform,
        hasVariant: true,
        isPublished: v.isPublished,
        externalId: v.externalId,
      })),
      syncStrategy: "platform-sourced-origin-only",
      productType,
      platformCount: publishedPlatforms.length,
    };
  }

  /**
   * Sync MainProduct (labeled main products) with intelligent multi-platform strategy
   * @param {string} userId - User ID
   * @param {Object} product - MainProduct data
   * @param {string} operation - 'create', 'update', 'delete'
   * @param {Object} changes - Specific changes made
   * @param {string} productType - 'MainProduct' or 'Product'
   */
  async syncToMultiplePlatforms(
    userId,
    product,
    operation = "update",
    changes = {},
    productType = "MainProduct"
  ) {
    logger.info(
      `🔄 Syncing ${productType} (main product) with intelligent multi-platform strategy`,
      {
        productId: product.id,
        operation,
        productType,
      }
    );

    const existingPlatforms = product.platformVariants || [];
    const publishedPlatforms = existingPlatforms.filter((v) => v.isPublished);
    const platformCount = publishedPlatforms.length;

    logger.info(`Main product has variants on ${platformCount} platforms`, {
      productId: product.id,
      platforms: publishedPlatforms.map((v) => v.platform),
      totalVariants: existingPlatforms.length,
      publishedVariants: publishedPlatforms.length,
    });

    // For main products: if it has multiple platforms, sync to ALL connected platforms
    const hasMultiplePlatforms = platformCount > 1;

    if (hasMultiplePlatforms) {
      logger.info(
        `Main product has multiple platforms - syncing to ALL connected platforms`,
        {
          productId: product.id,
          platformCount,
          platforms: publishedPlatforms.map((v) => v.platform),
          strategy: "main-product-sync-to-all",
        }
      );

      return await this.syncToAllConnectedPlatforms(
        userId,
        product,
        operation,
        changes,
        publishedPlatforms,
        "main-product-multi-platform"
      );
    } else {
      logger.info(
        `Main product has single/no platforms - using targeted sync`,
        {
          productId: product.id,
          platformCount,
          strategy: "main-product-targeted",
        }
      );

      return await this.syncToTargetedPlatforms(
        userId,
        product,
        operation,
        changes,
        publishedPlatforms,
        "main-product-targeted"
      );
    }
  }

  /**
   * Sync regular Product with standard strategy
   * @param {string} userId - User ID
   * @param {Object} product - Regular Product data
   * @param {string} operation - 'create', 'update', 'delete'
   * @param {Object} changes - Specific changes made
   * @param {string} productType - 'MainProduct' or 'Product'
   */
  async syncRegularProductToPlatforms(
    userId,
    product,
    operation = "update",
    changes = {},
    productType = "Product"
  ) {
    logger.info(`🔄 Syncing regular ${productType} with standard strategy`, {
      productId: product.id,
      operation,
      productType,
      isMainProduct: product.isMainProduct,
    });

    const existingPlatforms = product.platformVariants || [];
    const publishedPlatforms = existingPlatforms.filter((v) => v.isPublished);
    const platformCount = publishedPlatforms.length;

    // Regular products: standard sync to existing platforms or user's connected platforms
    if (platformCount > 0) {
      logger.info(
        `Regular product has existing platforms - syncing to those platforms`,
        {
          productId: product.id,
          platformCount,
          platforms: publishedPlatforms.map((v) => v.platform),
          strategy: "regular-product-existing-platforms",
        }
      );

      return await this.syncToExistingPlatforms(
        userId,
        product,
        operation,
        changes,
        publishedPlatforms,
        "regular-product-existing"
      );
    } else {
      logger.info(
        `Regular product has no existing platforms - using default sync`,
        {
          productId: product.id,
          strategy: "regular-product-default",
        }
      );

      return await this.syncToTargetedPlatforms(
        userId,
        product,
        operation,
        changes,
        publishedPlatforms,
        "regular-product-default"
      );
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
      else if (product.creationSource === "platform_sync") {
        originPlatform = product.sourcePlatform.toLowerCase();
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
        return {
          success: false,
          syncResults: [
            {
              status: "skipped",
              reason: "unknown_origin_platform",
              message: "Cannot determine original platform for sync",
              timestamp: new Date().toISOString(),
            },
          ],
          platforms: [],
          syncStrategy: "origin-only",
          platformCount: 0,
          summary: {
            total: 1,
            successful: 0,
            failed: 0,
            skipped: 1,
          },
          timestamp: new Date().toISOString(),
        };
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
        return {
          success: false,
          syncResults: [
            {
              status: "skipped",
              reason: "no_origin_connection",
              message: `No active connection for origin platform ${originPlatform}`,
              platform: originPlatform,
              timestamp: new Date().toISOString(),
            },
          ],
          platforms: [
            {
              platform: originPlatform,
              hasVariant: false,
              isPublished: false,
              hasConnection: false,
            },
          ],
          syncStrategy: "origin-only",
          platformCount: 0,
          summary: {
            total: 1,
            successful: 0,
            failed: 0,
            skipped: 1,
          },
          timestamp: new Date().toISOString(),
        };
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

        return {
          success: result.success !== false,
          syncResults: [result],
          platforms: [
            {
              platform: originPlatform,
              hasVariant: true,
              isPublished: true,
              hasConnection: true,
              syncResult: result,
            },
          ],
          syncStrategy: "origin-only",
          platformCount: 1,
          summary: {
            total: 1,
            successful: result.success !== false ? 1 : 0,
            failed: result.success === false ? 1 : 0,
            skipped: result.skipped ? 1 : 0,
          },
          timestamp: new Date().toISOString(),
        };
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

        return {
          success: false,
          syncResults: [errorResult],
          platforms: [
            {
              platform: originPlatform,
              hasVariant: true,
              isPublished: false,
              hasConnection: true,
              syncResult: errorResult,
            },
          ],
          syncStrategy: "origin-only",
          platformCount: 1,
          summary: {
            total: 1,
            successful: 0,
            failed: 1,
            skipped: 0,
          },
          timestamp: new Date().toISOString(),
        };
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

      // Get product data from database - check both MainProduct and Product tables
      let product = await MainProduct.findByPk(productId, {
        include: [
          {
            model: PlatformVariant,
            as: "platformVariants",
            where: { platform: platformType.toLowerCase() },
            required: false,
          },
        ],
      });

      let isLegacyProduct = false;

      // If not found in MainProduct, check Product table
      if (!product) {
        const { Product } = require("../models");
        product = await Product.findByPk(productId, {
          include: [
            {
              model: PlatformVariant,
              as: "platformVariants",
              where: { platform: platformType.toLowerCase() },
              required: false,
            },
          ],
        });
        isLegacyProduct = true;

        if (product) {
          logger.info(
            `Product ${productId} found in Product table (legacy format)`,
            {
              productId,
              platformType,
              isMainProduct: product.isMainProduct,
              creationSource: product.creationSource,
            }
          );
        }
      }

      if (!product) {
        logger.warn(
          `Product ${productId} not found in either MainProduct or Product table - may have been deleted`,
          {
            productId,
            platformType,
            operation,
          }
        );
        return {
          platform: platformType,
          success: false,
          skipped: true,
          message: `Product ${productId} not found - may have been deleted`,
        };
      }

      // Get platform service
      const platformService = this.platformServiceManager.getService(
        platformType.toLowerCase(),
        platformConnection.id
      );

      if (!platformService) {
        throw new Error(`No service available for platform ${platformType}`);
      }

      // Validate and handle credentials (support both JSON and encrypted formats)
      if (!platformConnection.credentials) {
        logger.error(
          `Platform connection ${platformConnection.id} has no credentials`,
          {
            connectionId: platformConnection.id,
            platformType,
            userId: platformConnection.userId,
            status: platformConnection.status,
            isActive: platformConnection.isActive,
          }
        );

        return {
          platform: platformType.toLowerCase(),
          connectionId: platformConnection.id,
          status: "error",
          error:
            "Platform connection has no credentials configured. Please reconnect to this platform.",
          timestamp: new Date().toISOString(),
          isOriginSync,
        };
      }

      let credentials;
      try {
        // Check if credentials are already in JSON format (modern storage)
        if (typeof platformConnection.credentials === "object") {
          credentials = platformConnection.credentials;
          logger.debug(`Using JSON credentials for platform ${platformType}`, {
            connectionId: platformConnection.id,
            credentialsType: "json",
          });
        }
        // Handle legacy encrypted string format
        else if (
          typeof platformConnection.credentials === "string" &&
          platformConnection.credentials.trim() !== ""
        ) {
          credentials = JSON.parse(
            this.encryptionService.decrypt(platformConnection.credentials)
          );
          logger.debug(
            `Decrypted string credentials for platform ${platformType}`,
            {
              connectionId: platformConnection.id,
              credentialsType: "encrypted_string",
            }
          );
        }
        // Handle empty string case
        else {
          throw new Error("Credentials are empty");
        }
      } catch (decryptError) {
        logger.error(
          `Failed to process credentials for platform connection ${platformConnection.id}`,
          {
            connectionId: platformConnection.id,
            platformType,
            error: decryptError.message,
            credentialsType: typeof platformConnection.credentials,
            credentialsEmpty:
              !platformConnection.credentials ||
              platformConnection.credentials === "",
          }
        );

        return {
          platform: platformType.toLowerCase(),
          connectionId: platformConnection.id,
          status: "error",
          error:
            "Failed to process platform credentials. Please reconnect to this platform.",
          timestamp: new Date().toISOString(),
          isOriginSync,
        };
      }

      // Validate credentials structure
      if (!credentials || typeof credentials !== "object") {
        logger.error(
          `Invalid credentials structure for platform ${platformType}`,
          {
            connectionId: platformConnection.id,
            platformType,
            credentialsType: typeof credentials,
          }
        );

        return {
          platform: platformType.toLowerCase(),
          connectionId: platformConnection.id,
          status: "error",
          error:
            "Invalid credentials format. Please reconnect to this platform.",
          timestamp: new Date().toISOString(),
          isOriginSync,
        };
      }

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
            syncResult.externalId,
            isLegacyProduct
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
          : null,
        isLegacyProduct // Pass whether this is from Product table
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
   * @param {string} productId - Product ID (MainProduct or Product)
   * @param {string} platform - Platform name
   * @param {string} externalId - External ID assigned by platform
   * @param {boolean} isLegacyProduct - Whether this is from Product table
   */
  async updatePlatformVariantExternalId(
    productId,
    platform,
    externalId,
    isLegacyProduct = false
  ) {
    try {
      // Build the where clause and defaults based on table type
      const whereClause = {
        platform: platform.toLowerCase(),
      };
      const defaults = {
        platform: platform.toLowerCase(),
        externalId,
        status: "synced",
        lastSyncAt: new Date(),
      };

      if (isLegacyProduct) {
        whereClause.productId = productId;
        defaults.productId = productId;
      } else {
        whereClause.mainProductId = productId;
        defaults.mainProductId = productId;
      }

      const [platformVariant, created] = await PlatformVariant.findOrCreate({
        where: whereClause,
        defaults: defaults,
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
          isLegacyProduct,
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
  async updatePlatformVariantSyncStatus(
    productId,
    platform,
    status,
    result,
    isLegacyProduct = false
  ) {
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

      // Build the where clause based on whether it's a legacy product or main product
      const whereClause = {
        platform: platform,
      };

      if (isLegacyProduct) {
        whereClause.productId = productId;
      } else {
        whereClause.mainProductId = productId;
      }

      await PlatformVariant.update(
        {
          syncStatus: status,
          lastSyncAt: new Date(),
          syncError: syncError,
        },
        {
          where: whereClause,
        }
      );

      logger.debug(
        `Updated sync status for ${
          isLegacyProduct ? "legacy product" : "main product"
        } ${productId} on ${platform}`,
        {
          productId,
          platform,
          status,
          hasError: !!syncError,
          isLegacyProduct,
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
    const productId = product.id || product;

    // Check if product exists before queuing sync
    const productExists = await MainProduct.findByPk(productId, {
      attributes: ["id"],
    });

    if (!productExists) {
      logger.warn(`Cannot queue sync for non-existent product ${productId}`, {
        productId,
        operation,
        userId,
      });
      return;
    }

    const key = `${userId}-${productId}`;
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
          // Check if product still exists before processing sync
          const productId = syncData.product.id || syncData.product;
          const productExists = await MainProduct.findByPk(productId, {
            attributes: ["id"],
          });

          if (!productExists) {
            logger.warn(
              `Skipping queued sync for deleted product ${productId}`,
              {
                productId,
                operation: syncData.operation,
                userId: syncData.userId,
              }
            );
            continue;
          }

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

  /**
   * Sync to all connected platforms for multi-platform products
   * @param {string} userId - User ID
   * @param {Object} product - Product data
   * @param {string} operation - Operation type
   * @param {Object} changes - Changes made
   * @param {Array} publishedPlatforms - Existing published platforms
   * @param {string} strategy - Sync strategy name
   */
  async syncToAllConnectedPlatforms(
    userId,
    product,
    operation,
    changes,
    publishedPlatforms,
    strategy
  ) {
    // Get all active platform connections for this user
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
      return {
        success: false,
        error: "No active platform connections found",
        platforms: publishedPlatforms.map((v) => ({
          platform: v.platform,
          hasVariant: true,
          isPublished: v.isPublished,
          externalId: v.externalId,
        })),
        syncStrategy: strategy,
        platformCount: publishedPlatforms.length,
        syncResults: [],
      };
    }

    logger.info(`Found ${connections.length} active platform connections`, {
      platforms: connections.map((c) => c.platformType),
      userId,
    });

    const syncResults = [];

    // Process each platform connection
    for (const connection of connections) {
      try {
        const result = await this.syncToSinglePlatform(
          product.id,
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

    logger.info(`Multi-platform sync completed`, {
      productId: product.id,
      successCount: syncResults.filter((r) => r.status === "success").length,
      errorCount: syncResults.filter((r) => r.status === "error").length,
      totalPlatforms: syncResults.length,
      strategy,
    });

    return {
      success: syncResults.some((r) => r.success !== false),
      syncResults,
      platforms: publishedPlatforms.map((v) => ({
        platform: v.platform,
        hasVariant: true,
        isPublished: v.isPublished,
        externalId: v.externalId,
        syncResult: syncResults.find((r) => r.platform === v.platform),
      })),
      allAvailablePlatforms: connections.map((c) => c.platformType),
      syncStrategy: strategy,
      platformCount: publishedPlatforms.length,
      summary: {
        total: syncResults.length,
        successful: syncResults.filter((r) => r.status === "success").length,
        failed: syncResults.filter((r) => r.status === "error").length,
        skipped: syncResults.filter((r) => r.skipped === true).length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Sync to targeted platforms (smart selection)
   * @param {string} userId - User ID
   * @param {Object} product - Product data
   * @param {string} operation - Operation type
   * @param {Object} changes - Changes made
   * @param {Array} publishedPlatforms - Existing published platforms
   * @param {string} strategy - Sync strategy name
   */
  async syncToTargetedPlatforms(
    userId,
    product,
    operation,
    changes,
    publishedPlatforms,
    strategy
  ) {
    // For targeted sync, check if product has a source platform preference
    let targetPlatforms = [];

    // If product has a source platform, prioritize that platform
    if (product.sourcePlatform) {
      const sourceConnection = await PlatformConnection.findOne({
        where: {
          userId,
          platformType: product.sourcePlatform.toLowerCase(),
          isActive: true,
          status: "active",
        },
      });

      if (sourceConnection) {
        targetPlatforms.push(sourceConnection);
        logger.info(
          `Product has source platform preference: ${product.sourcePlatform}`,
          {
            productId: product.id,
            sourcePlatform: product.sourcePlatform,
            strategy,
          }
        );
      }
    }

    // If no source platform or source platform not connected, get user's preferred platforms
    if (targetPlatforms.length === 0) {
      const connections = await PlatformConnection.findAll({
        where: {
          userId,
          isActive: true,
          status: "active",
        },
        order: [
          ["lastSyncAt", "DESC"],
          ["createdAt", "DESC"],
        ], // Prefer recently used (by last sync time)
        limit: 2, // Limit to top 2 platforms for targeted sync
      });

      targetPlatforms = connections;

      logger.info(
        `No source platform preference, using user's preferred platforms`,
        {
          productId: product.id,
          foundConnections: connections.length,
          platforms: connections.map((c) => c.platformType),
          strategy,
        }
      );
    }

    if (targetPlatforms.length === 0) {
      return {
        success: false,
        error: "No active platform connections found",
        platforms: publishedPlatforms,
        syncStrategy: strategy,
        platformCount: publishedPlatforms.length,
        syncResults: [],
      };
    }

    const syncResults = [];

    for (const connection of targetPlatforms) {
      try {
        const result = await this.syncToSinglePlatform(
          product.id,
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
        syncResults.push({
          platform: connection.platformType,
          connectionId: connection.id,
          status: "error",
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (product.id) {
      await this.updateSyncStatus(product.id, syncResults, userId);
    }

    return {
      success: syncResults.some((r) => r.success !== false),
      syncResults,
      platforms: publishedPlatforms,
      syncStrategy: strategy,
      platformCount: publishedPlatforms.length,
      summary: {
        total: syncResults.length,
        successful: syncResults.filter((r) => r.status === "success").length,
        failed: syncResults.filter((r) => r.status === "error").length,
        skipped: syncResults.filter((r) => r.skipped === true).length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Sync to existing platforms only
   * @param {string} userId - User ID
   * @param {Object} product - Product data
   * @param {string} operation - Operation type
   * @param {Object} changes - Changes made
   * @param {Array} publishedPlatforms - Existing published platforms
   * @param {string} strategy - Sync strategy name
   */
  async syncToExistingPlatforms(
    userId,
    product,
    operation,
    changes,
    publishedPlatforms,
    strategy
  ) {
    const syncResults = [];

    // Only sync to platforms where the product already exists
    for (const platformVariant of publishedPlatforms) {
      try {
        // Find the connection for this platform
        const connection = await PlatformConnection.findOne({
          where: {
            userId,
            platformType: platformVariant.platform,
            isActive: true,
            status: "active",
          },
        });

        if (!connection) {
          syncResults.push({
            platform: platformVariant.platform,
            status: "skipped",
            reason: "no_connection",
            message: `No active connection for platform ${platformVariant.platform}`,
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        const result = await this.syncToSinglePlatform(
          product.id,
          platformVariant.platform,
          changes,
          {
            userId,
            operation,
            connection,
          }
        );
        syncResults.push(result);
      } catch (error) {
        syncResults.push({
          platform: platformVariant.platform,
          status: "error",
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (product.id) {
      await this.updateSyncStatus(product.id, syncResults, userId);
    }

    return {
      success: syncResults.some((r) => r.success !== false),
      syncResults,
      platforms: publishedPlatforms.map((v) => ({
        platform: v.platform,
        hasVariant: true,
        isPublished: v.isPublished,
        externalId: v.externalId,
        syncResult: syncResults.find((r) => r.platform === v.platform),
      })),
      syncStrategy: strategy,
      platformCount: publishedPlatforms.length,
      summary: {
        total: syncResults.length,
        successful: syncResults.filter((r) => r.status === "success").length,
        failed: syncResults.filter((r) => r.status === "error").length,
        skipped: syncResults.filter((r) => r.skipped === true).length,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

// Export as singleton to maintain state
module.exports = new PlatformSyncService();
