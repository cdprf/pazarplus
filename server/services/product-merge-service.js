/**
 * Product Merge Service - Enhanced with Database Transaction Management
 * Handles fetching and merging products across multiple platforms with user-controlled database transaction management
 */
const logger = require("../utils/logger");
const {
  Product,
  PlatformData,
  PlatformConnection,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");
const PlatformServiceFactory = require("../modules/order-management/services/platforms/platformServiceFactory");
const dbTransactionManager = require("./database-transaction-manager");

class ProductMergeService {
  constructor() {
    this.platformTypes = ["trendyol", "hepsiburada", "n11"];
  }

  /**
   * Fetch products from all active integrations
   */
  async fetchAllProducts(userId, options = {}) {
    try {
      // Get all active platform connections for the user
      const connections = await PlatformConnection.findAll({
        where: {
          userId,
          isActive: true,
        },
      });

      if (connections.length === 0) {
        return {
          success: true,
          message: "No active platform connections found",
          data: [],
        };
      }

      // Track results from each platform
      const platformResults = [];
      const allProducts = [];
      const errors = [];

      // Fetch from each platform in parallel
      await Promise.all(
        connections.map(async (connection) => {
          try {
            // Create appropriate service for this platform
            const platformService = PlatformServiceFactory.createService(
              connection.platformType,
              connection.id
            );

            // Initialize service
            try {
              await platformService.initialize();

              // Fetch products
              if (platformService.fetchProducts) {
                const result = await platformService.fetchProducts(options);

                // Add source platform info to each product
                const productsWithSource = (result.data || []).map(
                  (product) => ({
                    ...product,
                    sourcePlatform: connection.platformType,
                    connectionId: connection.id,
                    connectionName: connection.name,
                  })
                );

                platformResults.push({
                  platform: connection.platformType,
                  success: result.success,
                  count: productsWithSource.length,
                });

                allProducts.push(...productsWithSource);
              } else {
                platformResults.push({
                  platform: connection.platformType,
                  success: false,
                  error: "Platform does not support product fetching",
                });
              }
            } catch (initError) {
              // Check if this is a credentials error
              if (
                initError.message.includes("Missing required") ||
                initError.message.includes("credentials") ||
                initError.message.includes("App key") ||
                initError.message.includes("app secret") ||
                initError.message.includes("appKey") ||
                initError.message.includes("appSecret")
              ) {
                logger.warn(
                  `Skipping ${connection.platformType} due to missing credentials: ${initError.message}`,
                  { connectionId: connection.id }
                );

                platformResults.push({
                  platform: connection.platformType,
                  success: false,
                  error: `Missing required credentials for ${connection.platformType}`,
                  skipped: true,
                });
              } else {
                // Re-throw for other types of errors
                throw initError;
              }
            }
          } catch (error) {
            logger.error(
              `Error fetching products from ${connection.platformType}:`,
              error
            );
            errors.push({
              platform: connection.platformType,
              error: error.message,
            });

            platformResults.push({
              platform: connection.platformType,
              success: false,
              error: error.message,
            });
          }
        })
      );

      // Return all products from all platforms
      return {
        success: true,
        message: `Successfully fetched ${allProducts.length} products from ${
          platformResults.filter((r) => r.success).length
        } platforms`,
        data: allProducts,
        platformResults,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      logger.error("Failed to fetch products from integrations:", error);
      return {
        success: false,
        message: `Failed to fetch products: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Merge products from all platforms by identifying duplicates
   * @param {Array} products - Products from all platforms
   * @returns {Array} - Merged unique products
   */
  async mergeProducts(products) {
    // Group by potential identifiers
    const productGroups = {};

    // First pass - group by exact SKU match
    products.forEach((product) => {
      const sku = this.extractSku(product);
      if (sku) {
        if (!productGroups[sku]) {
          productGroups[sku] = [];
        }
        productGroups[sku].push(product);
      } else {
        // Products without SKU get their own group
        const uniqueKey = `nosku-${
          product.sourcePlatform
        }-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        productGroups[uniqueKey] = [product];
      }
    });

    // Second pass - try to group by barcode for products not already grouped by SKU
    const ungroupedByBarcode = [];
    products.forEach((product) => {
      // Skip products already grouped by SKU
      const sku = this.extractSku(product);
      if (sku && productGroups[sku].length > 1) return;

      // Try to group by barcode
      const barcode = this.extractBarcode(product);
      if (barcode) {
        // Check if a group with this barcode already exists
        let found = false;
        Object.keys(productGroups).forEach((key) => {
          // Skip if this is the product's own SKU group
          if (key === sku) return;

          const firstProductInGroup = productGroups[key][0];
          const groupBarcode = this.extractBarcode(firstProductInGroup);

          if (groupBarcode && groupBarcode === barcode) {
            // Add to this group
            productGroups[key].push(product);
            found = true;
          }
        });

        if (!found && (!sku || productGroups[sku].length <= 1)) {
          ungroupedByBarcode.push(product);
        }
      } else if (!sku) {
        ungroupedByBarcode.push(product);
      }
    });

    // Third pass - try to group by name similarity for products not grouped by SKU or barcode
    ungroupedByBarcode.forEach((product) => {
      const name = this.extractName(product);
      if (!name) return;

      let bestMatch = null;
      let bestSimilarity = 0.7; // Threshold for name similarity

      Object.keys(productGroups).forEach((key) => {
        const group = productGroups[key];
        const firstProductInGroup = group[0];
        const groupName = this.extractName(firstProductInGroup);

        if (groupName) {
          const similarity = this.calculateStringSimilarity(name, groupName);
          if (similarity > bestSimilarity) {
            bestMatch = key;
            bestSimilarity = similarity;
          }
        }
      });

      if (bestMatch) {
        productGroups[bestMatch].push(product);
      } else {
        // Create new group
        const uniqueKey = `name-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`;
        productGroups[uniqueKey] = [product];
      }
    });

    // Now merge each group into a single product
    const mergedProducts = Object.values(productGroups).map((group) =>
      this.createMergedProduct(group)
    );

    return mergedProducts;
  }

  /**
   * Create a merged product from a group of similar products
   */
  createMergedProduct(productGroup) {
    // Start with the product that has the most complete information
    let bestProduct = productGroup.reduce((best, current) => {
      const bestScore = this.calculateProductCompleteness(best);
      const currentScore = this.calculateProductCompleteness(current);
      return currentScore > bestScore ? current : best;
    }, productGroup[0]);

    // Create a base merged product with all extracted fields
    const mergedProduct = {
      ...bestProduct,
      // Basic product information
      name: this.extractName(bestProduct),
      sku: this.extractSku(bestProduct),
      barcode: this.extractBarcode(bestProduct),
      description: this.extractDescription(bestProduct),
      price: this.extractPrice(bestProduct),
      stockQuantity: this.extractStockQuantity(bestProduct),
      images: this.extractImages(bestProduct),
      category: this.extractCategory(bestProduct),

      // Brand and manufacturer information
      brand: this.extractBrand(bestProduct),
      brandId: this.extractBrandId(bestProduct),
      manufacturer: this.extractManufacturer(bestProduct),

      // Product variants and attributes
      variants: this.extractVariants(bestProduct),
      variantAttributes: this.extractVariantAttributes(bestProduct),
      attributes: this.extractAttributes(bestProduct),

      // Physical product details
      weight: this.extractWeight(bestProduct),
      dimensions: this.extractDimensions(bestProduct),
      vatRate: this.extractVatRate(bestProduct),

      // Platform-specific information
      platformProductId: this.extractPlatformProductId(bestProduct),
      stockCode: this.extractStockCode(bestProduct),
      categoryId: this.extractCategoryId(bestProduct),

      // Status and approval information
      approvalStatus: this.extractApprovalStatus(bestProduct),
      platformStatus: this.extractPlatformStatus(bestProduct),

      // URLs and metadata
      urls: this.extractUrls(bestProduct),
      metadata: this.extractMetadata(bestProduct),
      shippingInfo: this.extractShippingInfo(bestProduct),
      errorInfo: this.extractErrorInfo(bestProduct),

      // Add sources information
      sources: productGroup.map((p) => ({
        platform: p.sourcePlatform,
        connectionId: p.connectionId,
        connectionName: p.connectionName,
        externalId: p.id || p.productCode || p.externalProductId,
        sku: this.extractSku(p),
        price: this.extractPrice(p),
        stockQuantity: this.extractStockQuantity(p),
        platformProductId: this.extractPlatformProductId(p),
        stockCode: this.extractStockCode(p),
        metadata: this.extractMetadata(p),
      })),
    };

    // Merge additional images from all products in the group
    const allImages = new Set();
    productGroup.forEach((product) => {
      const images = this.extractImages(product);
      if (Array.isArray(images)) {
        images.forEach((img) => allImages.add(img));
      }
    });

    mergedProduct.images = Array.from(allImages);

    // Take highest stock quantity
    mergedProduct.stockQuantity = Math.max(
      ...productGroup.map((p) => this.extractStockQuantity(p) || 0)
    );

    // Merge variants from all products in the group
    const allVariants = [];
    productGroup.forEach((product) => {
      const variants = this.extractVariants(product);
      if (Array.isArray(variants) && variants.length > 0) {
        allVariants.push(...variants);
      }
    });
    if (allVariants.length > 0) {
      mergedProduct.variants = allVariants;
    }

    // Merge attributes from all products, with preference for the best product
    const allAttributes = {};
    productGroup.forEach((product) => {
      const attributes = this.extractAttributes(product);
      if (attributes && typeof attributes === "object") {
        Object.assign(allAttributes, attributes);
      }
    });
    // Override with best product's attributes last to give them priority
    const bestAttributes = this.extractAttributes(bestProduct);
    if (bestAttributes && typeof bestAttributes === "object") {
      Object.assign(allAttributes, bestAttributes);
    }
    if (Object.keys(allAttributes).length > 0) {
      mergedProduct.attributes = allAttributes;
    }

    return mergedProduct;
  }

  /**
   * Save merged products to database with enhanced transaction management
   */
  async saveMergedProducts(mergedProducts, userId) {
    const operationId = `product_merge_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const savedProducts = [];
    const errors = [];
    const batchSize = 50;

    // Register the operation with the transaction manager
    await dbTransactionManager.registerTransaction(operationId, {
      operationType: "product_merge",
      userId,
      totalProducts: mergedProducts.length,
      batchSize,
      description: `Merging ${mergedProducts.length} products from multiple platforms`,
    });

    logger.info(
      `Processing ${mergedProducts.length} products in batches of ${batchSize} with transaction management`
    );

    try {
      // Execute with transaction control
      const result = await dbTransactionManager.executeWithTransactionControl(
        operationId,
        async () => {
          return await this.processProductBatches(
            mergedProducts,
            userId,
            operationId
          );
        },
        {
          userControlled: true,
          pausable: true,
        }
      );

      return result;
    } catch (error) {
      logger.error(`Product merge operation ${operationId} failed:`, error);
      throw error;
    }
  }

  /**
   * Process product batches with progress tracking
   */
  async processProductBatches(mergedProducts, userId, operationId) {
    const savedProducts = [];
    const errors = [];
    const batchSize = 50;

    // Process products in batches
    for (let i = 0; i < mergedProducts.length; i += batchSize) {
      const batch = mergedProducts.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(mergedProducts.length / batchSize);

      // Emit progress update
      dbTransactionManager.emit("operationProgress", {
        operationId,
        batchNumber,
        totalBatches,
        processedProducts: i,
        totalProducts: mergedProducts.length,
        progress: Math.round((i / mergedProducts.length) * 100),
      });

      logger.info(
        `Processing batch ${batchNumber}/${totalBatches} (${batch.length} products)`
      );

      try {
        // Process batch with transaction control
        const batchOperationId = `${operationId}_batch_${batchNumber}`;
        await dbTransactionManager.registerTransaction(batchOperationId, {
          operationType: "product_batch",
          parentOperationId: operationId,
          batchNumber,
          batchSize: batch.length,
        });

        const batchResults =
          await dbTransactionManager.executeWithTransactionControl(
            batchOperationId,
            async () => {
              return await this.processBatch(batch, userId);
            },
            {
              userControlled: false, // Don't prompt user for each batch
              pausable: true,
            }
          );

        savedProducts.push(...batchResults.savedProducts);
        errors.push(...batchResults.errors);

        logger.info(`Batch ${batchNumber} completed successfully`);
      } catch (error) {
        logger.error(`Batch ${batchNumber} failed:`, error);

        // Try processing individually as fallback
        try {
          const individualResults = await this.processIndividualProducts(
            batch,
            userId
          );
          savedProducts.push(...individualResults.savedProducts);
          errors.push(...individualResults.errors);
        } catch (fallbackError) {
          logger.error(`Individual processing fallback failed:`, fallbackError);
          // Mark all products in this batch as failed
          batch.forEach((product) => {
            errors.push({
              product: product.sku || product.name || "unknown",
              error: "Failed to process - database transaction error",
            });
          });
        }
      }

      // Small delay between batches
      if (i + batchSize < mergedProducts.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Final progress update
    dbTransactionManager.emit("operationProgress", {
      operationId,
      batchNumber: Math.ceil(mergedProducts.length / batchSize),
      totalBatches: Math.ceil(mergedProducts.length / batchSize),
      processedProducts: mergedProducts.length,
      totalProducts: mergedProducts.length,
      progress: 100,
      completed: true,
    });

    if (errors.length > 0) {
      logger.warn(
        `Failed to save ${errors.length} products:`,
        errors.slice(0, 5)
      );
    }

    logger.info(
      `Successfully saved ${savedProducts.length} products out of ${mergedProducts.length} merged products`
    );

    return { savedProducts, errors, operationId };
  }

  /**
   * Process a batch of products in a single transaction
   */
  async processBatch(batch, userId) {
    const savedProducts = [];
    const errors = [];
    const transaction = await sequelize.transaction();

    try {
      for (const mergedProduct of batch) {
        try {
          const product = await this.processSingleProduct(
            mergedProduct,
            userId,
            transaction
          );
          if (product) {
            savedProducts.push(product);
          }
        } catch (productError) {
          logger.error(
            `Error processing product ${
              mergedProduct.sku || mergedProduct.name
            }:`,
            productError
          );
          errors.push({
            product: mergedProduct.sku || mergedProduct.name || "unknown",
            error: productError.message,
          });

          // Continue processing other products instead of failing the entire batch
          // The error is logged and added to the errors array for reporting
        }
      }

      // Commit the entire batch transaction
      await transaction.commit();
      logger.debug(
        `Batch processed successfully: ${savedProducts.length} products saved, ${errors.length} errors`
      );

      return { savedProducts, errors };
    } catch (error) {
      await transaction.rollback();
      logger.error("Batch processing failed:", error);
      throw error;
    }
  }

  /**
   * Process a single product (used by both batch and individual processing)
   */
  async processSingleProduct(mergedProduct, userId, transaction) {
    // Validate required fields before attempting to save
    if (!mergedProduct.name || mergedProduct.name.trim() === "") {
      throw new Error("Product name is required");
    }

    // Generate SKU if missing
    if (!mergedProduct.sku || mergedProduct.sku.trim() === "") {
      const namePrefix = mergedProduct.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .substring(0, 10);
      mergedProduct.sku = `${namePrefix}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 5)}`;
      logger.info(
        `Generated SKU for product "${mergedProduct.name}": ${mergedProduct.sku}`
      );
    }

    // Enhanced product lookup - try multiple methods
    let existingProduct = null;

    // 1. Try to find by platform data first (most reliable)
    existingProduct = await this.findExistingProductByPlatformData(
      mergedProduct,
      userId,
      transaction
    );

    // 2. Check if product already exists by SKU
    if (!existingProduct && mergedProduct.sku) {
      existingProduct = await Product.findOne({
        where: { userId, sku: mergedProduct.sku },
        include: [
          {
            model: PlatformData,
            as: "platformData",
            where: { entityType: "product" },
            required: false,
          },
        ],
        transaction,
      });
    }

    // 3. Or by barcode if no SKU match
    if (!existingProduct && mergedProduct.barcode) {
      existingProduct = await Product.findOne({
        where: { userId, barcode: mergedProduct.barcode },
        include: [
          {
            model: PlatformData,
            as: "platformData",
            where: { entityType: "product" },
            required: false,
          },
        ],
        transaction,
      });
    }

    // Update existing or create new
    let product;
    if (existingProduct) {
      // Update existing product with new extracted fields
      await existingProduct.update(
        {
          name: mergedProduct.name || existingProduct.name,
          description: mergedProduct.description || existingProduct.description,
          price: mergedProduct.price || existingProduct.price,
          stockQuantity:
            mergedProduct.stockQuantity || existingProduct.stockQuantity,
          images: mergedProduct.images || existingProduct.images,
          barcode: mergedProduct.barcode || existingProduct.barcode,
          category: mergedProduct.category || existingProduct.category,
          brand: mergedProduct.brand || existingProduct.brand,
          manufacturer:
            mergedProduct.manufacturer || existingProduct.manufacturer,
          variants: mergedProduct.variants || existingProduct.variants,
          variantAttributes:
            mergedProduct.variantAttributes ||
            existingProduct.variantAttributes,
          attributes: mergedProduct.attributes || existingProduct.attributes,
          weight: mergedProduct.weight || existingProduct.weight,
          dimensions: mergedProduct.dimensions || existingProduct.dimensions,
          vatRate: mergedProduct.vatRate || existingProduct.vatRate,
          platformProductId:
            mergedProduct.platformProductId ||
            existingProduct.platformProductId,
          stockCode: mergedProduct.stockCode || existingProduct.stockCode,
          categoryId: mergedProduct.categoryId || existingProduct.categoryId,
          approvalStatus:
            mergedProduct.approvalStatus !== null
              ? mergedProduct.approvalStatus
              : existingProduct.approvalStatus,
          platformStatus:
            mergedProduct.platformStatus || existingProduct.platformStatus,
          urls: mergedProduct.urls || existingProduct.urls,
          metadata: mergedProduct.metadata || existingProduct.metadata,
          shippingInfo:
            mergedProduct.shippingInfo || existingProduct.shippingInfo,
          errorInfo: mergedProduct.errorInfo || existingProduct.errorInfo,
          lastSyncedAt: new Date(),
        },
        { transaction }
      );

      product = existingProduct;
      logger.debug(`Updated existing product: ${product.sku}`);
    } else {
      // Create new product with required fields and all extracted data
      const productData = {
        userId,
        sku: mergedProduct.sku,
        name: mergedProduct.name,
        description: mergedProduct.description || "",
        price: parseFloat(mergedProduct.price) || 0,
        stockQuantity: parseInt(mergedProduct.stockQuantity) || 0,
        minStockLevel: parseInt(mergedProduct.minStockLevel) || 0,
        category: mergedProduct.category || "Uncategorized",
        images: Array.isArray(mergedProduct.images) ? mergedProduct.images : [],
        status: "active",
        platforms: mergedProduct.platforms || {},
        attributes: mergedProduct.attributes || {},
        tags: Array.isArray(mergedProduct.tags) ? mergedProduct.tags : [],
        hasVariants: mergedProduct.hasVariants || false,
        variantAttributes: Array.isArray(mergedProduct.variantAttributes)
          ? mergedProduct.variantAttributes
          : [],
        dimensions: mergedProduct.dimensions || null,
        brand: mergedProduct.brand || null,
        brandId: mergedProduct.brandId || null,
        manufacturer: mergedProduct.manufacturer || null,
        variants: Array.isArray(mergedProduct.variants)
          ? mergedProduct.variants
          : [],
        weight: mergedProduct.weight || null,
        vatRate: mergedProduct.vatRate || null,
        platformProductId: mergedProduct.platformProductId || null,
        stockCode: mergedProduct.stockCode || null,
        categoryId: mergedProduct.categoryId || null,
        approvalStatus: mergedProduct.approvalStatus,
        platformStatus: mergedProduct.platformStatus || null,
        urls: mergedProduct.urls || null,
        metadata: mergedProduct.metadata || null,
        shippingInfo: mergedProduct.shippingInfo || null,
        errorInfo: mergedProduct.errorInfo || null,
        lastSyncedAt: new Date(),
      };

      // Only add barcode if it exists and is not empty
      if (mergedProduct.barcode && mergedProduct.barcode.trim() !== "") {
        productData.barcode = mergedProduct.barcode;
      }

      product = await Product.create(productData, { transaction });
      logger.info(`Created new product: ${product.sku} - ${product.name}`);
    }

    // Update platform connections if sources exist
    if (mergedProduct.sources && Array.isArray(mergedProduct.sources)) {
      for (const source of mergedProduct.sources) {
        try {
          if (source.platform && source.externalId) {
            await this.upsertPlatformData(product, source, transaction);
          }
        } catch (platformError) {
          logger.error(
            `Error updating platform data for product ${product.sku}:`,
            platformError
          );
          // Continue with other sources instead of failing the entire product
        }
      }
    }

    return product;
  }

  /**
   * Process products individually (fallback when batch processing fails)
   */
  async processIndividualProducts(products, userId) {
    const savedProducts = [];
    const errors = [];

    for (const mergedProduct of products) {
      const transaction = await sequelize.transaction();

      try {
        const product = await this.processSingleProduct(
          mergedProduct,
          userId,
          transaction
        );
        await transaction.commit();

        if (product) {
          savedProducts.push(product);
        }
      } catch (error) {
        await transaction.rollback();
        logger.error(
          `Error saving individual product ${
            mergedProduct.sku || mergedProduct.name
          }:`,
          error
        );
        errors.push({
          product: mergedProduct.sku || mergedProduct.name || "unknown",
          error: error.message,
        });
      }
    }

    return { savedProducts, errors };
  }

  /**
   * Find existing product by platform data
   */
  async findExistingProductByPlatformData(mergedProduct, userId, transaction) {
    // Try to find by platform entity IDs from sources
    if (mergedProduct.sources && Array.isArray(mergedProduct.sources)) {
      for (const source of mergedProduct.sources) {
        if (source.platform && source.externalId) {
          const platformData = await PlatformData.findOne({
            where: {
              entityType: "product",
              platformType: source.platform,
              platformEntityId: source.externalId,
            },
            include: [
              {
                model: Product,
                as: "product",
                where: { userId },
              },
            ],
            transaction,
          });

          if (platformData && platformData.product) {
            logger.debug(
              `Found existing product by platform data: ${source.platform}:${source.externalId} -> ${platformData.product.sku}`
            );
            return platformData.product;
          }
        }
      }
    }
    return null;
  }

  /**
   * Enhanced platform data upsert with better conflict handling
   */
  async upsertPlatformData(product, source, transaction) {
    try {
      // Prepare platform data
      const platformDataValues = {
        entityType: "product",
        entityId: product.id,
        platformType: source.platform,
        platformEntityId: source.externalId,
        platformSku: source.sku || product.sku,
        platformPrice: parseFloat(source.price) || 0,
        platformQuantity: parseInt(source.stockQuantity) || 0,
        lastSyncedAt: new Date(),
        status: "active",
        data: {
          source,
          connectionId: source.connectionId,
          connectionName: source.connectionName,
        },
      };

      // Use upsert for better concurrency handling
      const [platformData, created] = await PlatformData.upsert(
        platformDataValues,
        {
          transaction,
          conflictFields: ["entityType", "entityId", "platformType"],
        }
      );

      logger.debug(
        `${created ? "Created" : "Updated"} platform data for ${
          source.platform
        }: ${source.externalId}`
      );

      return platformData;
    } catch (platformError) {
      // Handle unique constraint violations gracefully
      if (platformError.name === "SequelizeUniqueConstraintError") {
        logger.warn(
          `Constraint violation for product ${product.sku} on ${source.platform}, attempting manual update:`,
          platformError.message
        );

        // Try to find and update the existing record
        const existingPlatformData = await PlatformData.findOne({
          where: {
            entityType: "product",
            entityId: product.id,
            platformType: source.platform,
          },
          transaction,
        });

        if (existingPlatformData) {
          await existingPlatformData.update(
            {
              platformEntityId: source.externalId,
              platformSku: source.sku || product.sku,
              platformPrice: parseFloat(source.price) || 0,
              platformQuantity: parseInt(source.stockQuantity) || 0,
              lastSyncedAt: new Date(),
              status: "active",
              data: {
                source,
                connectionId: source.connectionId,
                connectionName: source.connectionName,
              },
            },
            { transaction }
          );

          logger.debug(
            `Successfully updated existing platform data for ${source.platform}: ${source.externalId}`
          );
          return existingPlatformData;
        }
      }
      throw platformError;
    }
  }

  // ... [All the existing extraction methods remain the same]

  /**
   * Helper to calculate product completeness score
   */
  calculateProductCompleteness(product) {
    let score = 0;
    if (this.extractName(product)) score += 10;
    if (this.extractSku(product)) score += 10;
    if (this.extractBarcode(product)) score += 8;
    if (this.extractDescription(product)) score += 6;
    if (this.extractPrice(product) > 0) score += 8;
    if (this.extractStockQuantity(product) > 0) score += 8;
    if (this.extractCategory(product)) score += 6;
    const images = this.extractImages(product);
    if (images && Array.isArray(images)) {
      score += Math.min(images.length * 5, 20);
    }
    return score;
  }

  /**
   * Calculate string similarity
   */
  calculateStringSimilarity(str1, str2) {
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
    const s1 = normalize(str1);
    const s2 = normalize(str2);
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    let matches = 0;
    for (let i = 0; i < s1.length; i++) {
      if (s2.includes(s1[i])) matches++;
    }
    const avgLength = (s1.length + s2.length) / 2;
    return matches / avgLength;
  }

  // Extraction methods
  extractSku(product) {
    return (
      product.sku ||
      product.stockCode ||
      product.merchantSku ||
      product.sellerStockCode ||
      (product.rawData && product.rawData.sku)
    );
  }

  extractBarcode(product) {
    return (
      product.barcode ||
      product.barcodes?.[0] ||
      (product.rawData && product.rawData.barcode)
    );
  }

  extractName(product) {
    return (
      product.name ||
      product.title ||
      product.productName ||
      (product.rawData && product.rawData.name)
    );
  }

  extractDescription(product) {
    return (
      product.description ||
      product.productDescription ||
      (product.rawData && product.rawData.description)
    );
  }

  extractPrice(product) {
    const price =
      product.price ||
      product.listPrice ||
      product.salePrice ||
      (product.rawData && (product.rawData.price || product.rawData.listPrice));
    return parseFloat(price) || 0;
  }

  extractStockQuantity(product) {
    const quantity =
      product.stockQuantity ||
      product.quantity ||
      (product.rawData &&
        (product.rawData.stockQuantity || product.rawData.quantity));
    return parseInt(quantity) || 0;
  }

  extractImages(product) {
    if (product.images && Array.isArray(product.images)) return product.images;
    if (product.image) return [product.image];
    if (product.imageUrl) return [product.imageUrl];
    if (product.imageUrls && Array.isArray(product.imageUrls))
      return product.imageUrls;
    if (product.rawData && product.rawData.images)
      return product.rawData.images;
    return [];
  }

  extractCategory(product) {
    return (
      product.category ||
      product.categoryName ||
      (product.rawData && product.rawData.category)
    );
  }

  extractBrand(product) {
    return (
      product.brand ||
      product.brandName ||
      product.manufacturer ||
      (product.rawData && (product.rawData.brand || product.rawData.brandName))
    );
  }

  extractBrandId(product) {
    return product.brandId || (product.rawData && product.rawData.brandId);
  }

  extractManufacturer(product) {
    return (
      product.manufacturer ||
      product.brand ||
      product.brandName ||
      (product.rawData &&
        (product.rawData.manufacturer || product.rawData.brand))
    );
  }

  extractVariants(product) {
    if (product.variants && Array.isArray(product.variants))
      return product.variants;
    if (
      product.rawData &&
      product.rawData.variants &&
      Array.isArray(product.rawData.variants)
    )
      return product.rawData.variants;
    if (product.variant) return [product.variant];
    return [];
  }

  extractVariantAttributes(product) {
    const attributes = {};
    if (product.color) attributes.color = product.color;
    if (product.size) attributes.size = product.size;
    if (product.material) attributes.material = product.material;
    if (product.pattern) attributes.pattern = product.pattern;
    if (product.rawData) {
      if (product.rawData.color) attributes.color = product.rawData.color;
      if (product.rawData.size) attributes.size = product.rawData.size;
      if (product.rawData.material)
        attributes.material = product.rawData.material;
      if (product.rawData.pattern) attributes.pattern = product.rawData.pattern;
      if (product.rawData.attributes)
        Object.assign(attributes, product.rawData.attributes);
    }
    if (product.variantAttributes)
      Object.assign(attributes, product.variantAttributes);
    return Object.keys(attributes).length > 0 ? attributes : null;
  }

  extractAttributes(product) {
    const attributes = {};
    if (product.attributes && typeof product.attributes === "object") {
      Object.assign(attributes, product.attributes);
    }
    if (product.rawData && product.rawData.attributes) {
      Object.assign(attributes, product.rawData.attributes);
    }
    return Object.keys(attributes).length > 0 ? attributes : null;
  }

  extractMetadata(product) {
    return {
      sourcePlatform: product.sourcePlatform,
      connectionId: product.connectionId,
      connectionName: product.connectionName,
      lastUpdated: new Date().toISOString(),
    };
  }

  extractWeight(product) {
    const weight =
      product.weight ||
      product.dimensionalWeight ||
      (product.rawData &&
        (product.rawData.weight || product.rawData.dimensionalWeight));
    return weight ? parseFloat(weight) : null;
  }

  extractDimensions(product) {
    const dimensions = {};
    if (product.width) dimensions.width = parseFloat(product.width);
    if (product.height) dimensions.height = parseFloat(product.height);
    if (product.length) dimensions.length = parseFloat(product.length);
    if (product.depth) dimensions.depth = parseFloat(product.depth);
    if (product.rawData) {
      if (product.rawData.width)
        dimensions.width = parseFloat(product.rawData.width);
      if (product.rawData.height)
        dimensions.height = parseFloat(product.rawData.height);
      if (product.rawData.length)
        dimensions.length = parseFloat(product.rawData.length);
      if (product.rawData.depth)
        dimensions.depth = parseFloat(product.rawData.depth);
    }
    if (product.dimensions && typeof product.dimensions === "object") {
      Object.assign(dimensions, product.dimensions);
    }
    return Object.keys(dimensions).length > 0 ? dimensions : null;
  }

  extractVatRate(product) {
    const vatRate =
      product.vatRate ||
      product.taxRate ||
      (product.rawData && (product.rawData.vatRate || product.rawData.taxRate));
    return vatRate ? parseFloat(vatRate) : null;
  }

  extractPlatformProductId(product) {
    return (
      product.platformProductId ||
      product.productId ||
      product.externalId ||
      product.id ||
      (product.rawData &&
        (product.rawData.id ||
          product.rawData.productId ||
          product.rawData.productMainId))
    );
  }

  extractStockCode(product) {
    return (
      product.stockCode ||
      product.sku ||
      product.merchantSku ||
      product.sellerStockCode ||
      (product.rawData && (product.rawData.stockCode || product.rawData.sku))
    );
  }

  extractApprovalStatus(product) {
    if (product.approved !== undefined) return product.approved;
    if (product.status) {
      const status = product.status.toLowerCase();
      if (status === "approved" || status === "active") return true;
      if (status === "rejected" || status === "inactive") return false;
    }
    if (product.rawData) {
      if (product.rawData.approved !== undefined)
        return product.rawData.approved;
      if (product.rawData.status) {
        const status = product.rawData.status.toLowerCase();
        if (status === "approved" || status === "active") return true;
        if (status === "rejected" || status === "inactive") return false;
      }
    }
    return null;
  }

  extractPlatformStatus(product) {
    return (
      product.status ||
      product.platformStatus ||
      (product.rawData &&
        (product.rawData.status || product.rawData.platformStatus))
    );
  }

  extractErrorInfo(product) {
    const errorInfo = {};
    if (product.error) errorInfo.error = product.error;
    if (product.errorMessage) errorInfo.errorMessage = product.errorMessage;
    if (product.errorCode) errorInfo.errorCode = product.errorCode;
    if (product.hasError) errorInfo.hasError = product.hasError;
    if (product.rawData) {
      if (product.rawData.error) errorInfo.error = product.rawData.error;
      if (product.rawData.errorMessage)
        errorInfo.errorMessage = product.rawData.errorMessage;
      if (product.rawData.errorCode)
        errorInfo.errorCode = product.rawData.errorCode;
      if (product.rawData.hasError)
        errorInfo.hasError = product.rawData.hasError;
    }
    if (product.sourcePlatform && product.failureReasons) {
      errorInfo.failureReasons = product.failureReasons;
    }
    return Object.keys(errorInfo).length > 0 ? errorInfo : null;
  }

  extractCategoryId(product) {
    return (
      product.categoryId || (product.rawData && product.rawData.categoryId)
    );
  }

  extractUrls(product) {
    const urls = {};
    if (product.productUrl) urls.productUrl = product.productUrl;
    if (product.platformUrl) urls.platformUrl = product.platformUrl;
    if (product.detailUrl) urls.detailUrl = product.detailUrl;
    if (product.rawData) {
      if (product.rawData.productUrl)
        urls.productUrl = product.rawData.productUrl;
      if (product.rawData.platformUrl)
        urls.platformUrl = product.rawData.platformUrl;
      if (product.rawData.detailUrl) urls.detailUrl = product.rawData.detailUrl;
    }
    return Object.keys(urls).length > 0 ? urls : null;
  }

  extractShippingInfo(product) {
    const shipping = {};
    if (product.shippingWeight)
      shipping.weight = parseFloat(product.shippingWeight);
    if (product.freeShipping !== undefined)
      shipping.freeShipping = product.freeShipping;
    if (product.shippingTemplate) shipping.template = product.shippingTemplate;
    if (product.rawData) {
      if (product.rawData.shippingWeight)
        shipping.weight = parseFloat(product.rawData.shippingWeight);
      if (product.rawData.freeShipping !== undefined)
        shipping.freeShipping = product.rawData.freeShipping;
      if (product.rawData.shippingTemplate)
        shipping.template = product.rawData.shippingTemplate;
    }
    return Object.keys(shipping).length > 0 ? shipping : null;
  }
}

module.exports = new ProductMergeService();
