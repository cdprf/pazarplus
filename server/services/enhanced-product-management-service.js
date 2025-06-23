/**
 * Enhanced Product Management Service
 * Handles main products, platform variants, and auto-learning capabilities
 */

const logger = require("../utils/logger");
const {
  MainProduct,
  PlatformVariant,
  PlatformTemplate,
  PlatformData,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");
const EnhancedStockService = require("./enhanced-stock-service");
const SKUSystemManager = require("../../sku-system-manager");

class EnhancedProductManagementService {
  constructor() {
    this.skuManager = new SKUSystemManager();
  }

  /**
   * Create a new main product with auto-generated SKU pattern
   */
  async createMainProduct(productData, userId) {
    const transaction = await sequelize.transaction();

    try {
      // Generate base SKU if not provided
      let baseSku = productData.baseSku;
      if (!baseSku) {
        baseSku = await this.generateBaseSKU(productData);
      }

      // Detect stock code pattern
      const patternInfo = this.analyzeStockCodePattern(baseSku);

      const mainProduct = await MainProduct.create(
        {
          ...productData,
          baseSku,
          stockCodePattern: patternInfo.pattern,
          patternConfidence: patternInfo.confidence,
          userId,
          status: productData.status || "draft",
          hasVariants: false,
        },
        { transaction }
      );

      // Create initial stock record if quantity provided
      if (productData.stockQuantity > 0) {
        await EnhancedStockService.updateStock(
          mainProduct.id,
          productData.stockQuantity,
          "Initial stock",
          userId,
          { initialCreation: true }
        );
      }

      await transaction.commit();

      logger.info(`Created main product: ${mainProduct.baseSku}`);
      return mainProduct;
    } catch (error) {
      await transaction.rollback();
      logger.error("Error creating main product:", error);
      throw error;
    }
  }

  /**
   * Create platform variant for a main product
   */
  async createPlatformVariant(mainProductId, variantData, userId) {
    const transaction = await sequelize.transaction();

    try {
      const mainProduct = await MainProduct.findByPk(mainProductId, {
        transaction,
      });
      if (!mainProduct) {
        throw new Error("Main product not found");
      }

      // Generate platform SKU if not provided
      let platformSku = variantData.platformSku;
      if (!platformSku) {
        const suffix =
          variantData.variantSuffix || variantData.platform.toUpperCase();
        platformSku = `${mainProduct.baseSku}-${suffix}`;
      }

      // Find or create appropriate template
      let template = null;
      if (variantData.templateId) {
        template = await PlatformTemplate.findByPk(variantData.templateId, {
          transaction,
        });
      } else {
        template = await PlatformTemplate.findBestTemplate(
          variantData.platform,
          variantData.platformCategory || mainProduct.category,
          mainProduct.attributes
        );
      }

      const platformVariant = await PlatformVariant.create(
        {
          ...variantData,
          mainProductId,
          platformSku,
          templateId: template?.id,
          status: variantData.status || "draft",
        },
        { transaction }
      );

      // Update main product to indicate it has variants
      if (!mainProduct.hasVariants) {
        await mainProduct.update({ hasVariants: true }, { transaction });
      }

      // Learn from this variant creation
      if (template) {
        await this.learnFromVariant(platformVariant, template, transaction);
      }

      await transaction.commit();

      logger.info(
        `Created platform variant: ${platformVariant.platformSku} for ${variantData.platform}`
      );
      return platformVariant;
    } catch (error) {
      await transaction.rollback();
      logger.error("Error creating platform variant:", error);
      throw error;
    }
  }

  /**
   * Generate base SKU using pattern detection
   */
  async generateBaseSKU(productData) {
    try {
      // Use SKU manager to generate structured SKU
      const skuData = await this.skuManager.generateSKU({
        productType: productData.productType,
        brand: productData.brand,
        productName: productData.name,
        category: productData.category,
      });

      return skuData;
    } catch (error) {
      logger.error("Error generating base SKU:", error);
      // Fallback to simple generation
      const timestamp = Date.now().toString().slice(-6);
      return `PROD-${timestamp}`;
    }
  }

  /**
   * Analyze stock code pattern for auto-matching
   */
  analyzeStockCodePattern(sku) {
    try {
      // Pattern: {ProductType || {OwnBrand+ProductTypeInitials}}-ProductBrand{000}-{ORJ||VARIANTS}
      const patterns = [
        {
          regex: /^([A-Z]{1,4})-([A-Z]{2,6}\d{3})-?(ORJ|[A-Z]{2,4})?$/,
          type: "structured_v1",
          confidence: 0.9,
        },
        {
          regex: /^([A-Z]{2,3})-([A-Z]{3,6}\d{2,4})-?(.+)?$/,
          type: "structured_v2",
          confidence: 0.8,
        },
        {
          regex: /^([A-Z]+\d+)-?(.+)?$/,
          type: "simple_alphanumeric",
          confidence: 0.6,
        },
      ];

      for (const pattern of patterns) {
        const match = sku.match(pattern.regex);
        if (match) {
          return {
            pattern: pattern.type,
            confidence: pattern.confidence,
            components: {
              prefix: match[1],
              brand: match[2],
              variant: match[3] || null,
            },
            isStructured: pattern.confidence > 0.7,
          };
        }
      }

      return {
        pattern: "unstructured",
        confidence: 0.3,
        components: null,
        isStructured: false,
      };
    } catch (error) {
      logger.error("Error analyzing stock code pattern:", error);
      return {
        pattern: "unknown",
        confidence: 0.1,
        components: null,
        isStructured: false,
      };
    }
  }

  /**
   * Match synced products to existing main products
   */
  async matchSyncedProduct(syncedProduct, userId) {
    try {
      const sku = syncedProduct.sku || syncedProduct.stockCode;
      if (!sku) return null;

      // Analyze the SKU pattern
      const patternInfo = this.analyzeStockCodePattern(sku);

      if (!patternInfo.isStructured) {
        logger.debug(`Unstructured SKU, skipping auto-match: ${sku}`);
        return null;
      }

      // Extract base pattern (remove variant suffix)
      const baseSku = this.extractBaseSKU(sku, patternInfo);

      // Find existing main product with this base SKU
      const existingProduct = await MainProduct.findOne({
        where: {
          baseSku,
          userId,
        },
      });

      if (existingProduct) {
        logger.info(
          `Matched synced product ${sku} to existing main product ${baseSku}`
        );
        return {
          mainProduct: existingProduct,
          isVariant: sku !== baseSku,
          suggestedVariantSuffix: this.extractVariantSuffix(sku, baseSku),
          confidence: patternInfo.confidence,
        };
      }

      // Look for similar patterns
      const similarProducts = await this.findSimilarProducts(baseSku, userId);

      if (similarProducts.length > 0) {
        return {
          similarProducts,
          suggestedBaseSku: baseSku,
          confidence: patternInfo.confidence * 0.8, // Reduce confidence for similar matches
        };
      }

      return null;
    } catch (error) {
      logger.error("Error matching synced product:", error);
      return null;
    }
  }

  /**
   * Extract base SKU from full SKU
   */
  extractBaseSKU(fullSku, patternInfo) {
    if (!patternInfo.components) return fullSku;

    const { prefix, brand } = patternInfo.components;
    return `${prefix}-${brand}`;
  }

  /**
   * Extract variant suffix from full SKU
   */
  extractVariantSuffix(fullSku, baseSku) {
    return fullSku.replace(baseSku, "").replace(/^-/, "");
  }

  /**
   * Find products with similar SKU patterns
   */
  async findSimilarProducts(baseSku, userId, limit = 5) {
    try {
      // Extract components for similarity matching
      const parts = baseSku.split("-");
      if (parts.length < 2) return [];

      const [prefix, brand] = parts;

      const similarProducts = await MainProduct.findAll({
        where: {
          userId,
          [Op.or]: [
            { baseSku: { [Op.like]: `${prefix}-%` } },
            { baseSku: { [Op.like]: `%-${brand}` } },
            { brand: brand.replace(/\d+$/, "") }, // Remove numbers from brand
          ],
        },
        limit,
        order: [["createdAt", "DESC"]],
      });

      return similarProducts;
    } catch (error) {
      logger.error("Error finding similar products:", error);
      return [];
    }
  }

  /**
   * Create main product from synced product data
   */
  async createMainProductFromSync(syncedProduct, userId, platformInfo = {}) {
    try {
      // Extract and clean product data
      const productData = {
        name: syncedProduct.name || syncedProduct.title,
        baseSku: this.extractBaseSKU(
          syncedProduct.sku,
          this.analyzeStockCodePattern(syncedProduct.sku)
        ),
        description: syncedProduct.description,
        category: syncedProduct.category,
        brand:
          syncedProduct.brand || this.extractBrandFromSKU(syncedProduct.sku),
        basePrice: parseFloat(syncedProduct.price) || 0,
        baseCostPrice: parseFloat(syncedProduct.costPrice) || null,
        stockQuantity: parseInt(syncedProduct.stockQuantity) || 0,
        media: this.extractMediaFromSync(syncedProduct),
        attributes: syncedProduct.attributes || {},
        learnedFields: {
          [platformInfo.platform]: syncedProduct,
        },
      };

      const mainProduct = await this.createMainProduct(productData, userId);

      // Create platform variant
      const variantData = {
        platform: platformInfo.platform,
        platformSku: syncedProduct.sku,
        platformBarcode: syncedProduct.barcode,
        variantSuffix: this.extractVariantSuffix(
          syncedProduct.sku,
          mainProduct.baseSku
        ),
        platformTitle: syncedProduct.name,
        platformDescription: syncedProduct.description,
        platformCategory: syncedProduct.category,
        platformAttributes: syncedProduct.platformSpecificData || {},
        useMainPrice: true,
        useMainMedia: true,
        isPublished: true,
        syncStatus: "success",
        externalId: syncedProduct.externalId,
        externalUrl: syncedProduct.externalUrl,
      };

      const platformVariant = await this.createPlatformVariant(
        mainProduct.id,
        variantData,
        userId
      );

      // Learn from this sync
      await this.learnFromSyncedProduct(syncedProduct, platformInfo, userId);

      return {
        mainProduct,
        platformVariant,
        isNewProduct: true,
      };
    } catch (error) {
      logger.error("Error creating main product from sync:", error);
      throw error;
    }
  }

  /**
   * Learn from platform variant creation or sync
   */
  async learnFromVariant(platformVariant, template, transaction = null) {
    try {
      // Update template usage statistics
      if (template) {
        await template.update(
          {
            usageCount: template.usageCount + 1,
            lastLearningUpdate: new Date(),
          },
          { transaction }
        );
      }

      // Extract patterns from variant data
      const patterns = this.extractVariantPatterns(platformVariant);

      // TODO: Store learned patterns for future use
      logger.debug(
        `Learned patterns from variant ${platformVariant.platformSku}:`,
        patterns
      );

      return true;
    } catch (error) {
      logger.error("Error learning from variant:", error);
      return false;
    }
  }

  /**
   * Learn from synced product data
   */
  async learnFromSyncedProduct(syncedProduct, platformInfo, userId) {
    try {
      // Learn template patterns
      await PlatformTemplate.learnFromProduct(
        platformInfo.platform,
        syncedProduct.category,
        syncedProduct,
        userId
      );

      // Learn category mappings
      await this.learnCategoryMappings(syncedProduct, platformInfo, userId);

      // Learn field patterns
      await this.learnFieldPatterns(syncedProduct, platformInfo, userId);

      return true;
    } catch (error) {
      logger.error("Error learning from synced product:", error);
      return false;
    }
  }

  /**
   * Extract media from synced product
   */
  extractMediaFromSync(syncedProduct) {
    const media = [];

    // Handle different media formats from platforms
    if (syncedProduct.images) {
      const images = Array.isArray(syncedProduct.images)
        ? syncedProduct.images
        : [syncedProduct.images];

      images.forEach((imageUrl, index) => {
        if (imageUrl) {
          media.push({
            type: "image",
            url: imageUrl,
            alt: `${syncedProduct.name} - Image ${index + 1}`,
            isPrimary: index === 0,
            platforms: [], // Will be populated later
          });
        }
      });
    }

    return media;
  }

  /**
   * Extract brand from SKU pattern
   */
  extractBrandFromSKU(sku) {
    try {
      const patternInfo = this.analyzeStockCodePattern(sku);
      if (patternInfo.components && patternInfo.components.brand) {
        return patternInfo.components.brand.replace(/\d+$/, ""); // Remove numbers
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract variant patterns for learning
   */
  extractVariantPatterns(platformVariant) {
    return {
      platform: platformVariant.platform,
      skuPattern: platformVariant.platformSku,
      priceStrategy: platformVariant.useMainPrice ? "inherit" : "override",
      mediaStrategy: platformVariant.useMainMedia ? "inherit" : "custom",
      categoryMapping: platformVariant.platformCategory,
      attributePatterns: Object.keys(platformVariant.platformAttributes || {}),
    };
  }

  /**
   * Learn category mappings across platforms
   */
  async learnCategoryMappings(syncedProduct, platformInfo, userId) {
    // TODO: Implement category mapping learning
    logger.debug(
      `Learning category mapping: ${syncedProduct.category} -> ${platformInfo.platform}`
    );
    return true;
  }

  /**
   * Learn field patterns from synced data
   */
  async learnFieldPatterns(syncedProduct, platformInfo, userId) {
    // TODO: Implement field pattern learning
    logger.debug(`Learning field patterns for ${platformInfo.platform}`);
    return true;
  }

  /**
   * Get comprehensive product information
   */
  async getProductWithVariants(mainProductId, userId) {
    try {
      const mainProduct = await MainProduct.findOne({
        where: { id: mainProductId, userId },
        include: [
          {
            model: PlatformVariant,
            as: "platformVariants",
            include: [
              {
                model: PlatformTemplate,
                as: "template",
                required: false,
              },
            ],
          },
        ],
      });

      if (!mainProduct) {
        throw new Error("Main product not found");
      }

      // Get stock status
      const stockStatus = await EnhancedStockService.getStockStatus(
        mainProductId
      );

      return {
        ...mainProduct.toJSON(),
        stockStatus,
        variantCount: mainProduct.platformVariants.length,
        publishedVariants: mainProduct.platformVariants.filter(
          (v) => v.isPublished
        ).length,
      };
    } catch (error) {
      logger.error("Error getting product with variants:", error);
      throw error;
    }
  }

  /**
   * Bulk operations for multiple products
   */
  async bulkOperation(operation, productIds, operationData, userId) {
    const results = [];
    const transaction = await sequelize.transaction();

    try {
      for (const productId of productIds) {
        try {
          let result;
          switch (operation) {
            case "publish":
              result = await this.publishToPlatforms(
                productId,
                operationData.platforms,
                transaction
              );
              break;
            case "updatePrice":
              result = await this.updateProductPrice(
                productId,
                operationData.price,
                transaction
              );
              break;
            case "updateStock":
              result = await EnhancedStockService.updateStock(
                productId,
                operationData.stockQuantity,
                "Bulk update",
                userId
              );
              break;
            default:
              throw new Error(`Unknown operation: ${operation}`);
          }

          results.push({ productId, success: true, result });
        } catch (error) {
          results.push({ productId, success: false, error: error.message });
        }
      }

      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      logger.error("Error in bulk operation:", error);
      throw error;
    }
  }

  /**
   * Publish product to specific platforms
   */
  async publishToPlatforms(mainProductId, platforms, transaction = null) {
    try {
      const mainProduct = await MainProduct.findByPk(mainProductId, {
        transaction,
      });
      if (!mainProduct) {
        throw new Error("Main product not found");
      }

      const results = [];

      for (const platformData of platforms) {
        // Check if variant already exists
        let variant = await PlatformVariant.findOne({
          where: {
            mainProductId,
            platform: platformData.platform,
          },
          transaction,
        });

        if (!variant) {
          // Create new variant
          variant = await this.createPlatformVariant(
            mainProductId,
            {
              ...platformData,
              status: "active",
            },
            mainProduct.userId
          );
        }

        // TODO: Implement actual platform publishing
        await variant.update(
          {
            isPublished: true,
            publishedAt: new Date(),
            syncStatus: "pending",
          },
          { transaction }
        );

        results.push({
          platform: platformData.platform,
          variant: variant.toJSON(),
          success: true,
        });
      }

      return results;
    } catch (error) {
      logger.error("Error publishing to platforms:", error);
      throw error;
    }
  }

  /**
   * Update product price across all variants
   */
  async updateProductPrice(mainProductId, newPrice, transaction = null) {
    try {
      const mainProduct = await MainProduct.findByPk(mainProductId, {
        transaction,
      });
      if (!mainProduct) {
        throw new Error("Main product not found");
      }

      // Update main product price
      await mainProduct.update({ basePrice: newPrice }, { transaction });

      // Update variants that inherit price
      await PlatformVariant.update(
        { syncStatus: "pending" }, // Mark for sync
        {
          where: {
            mainProductId,
            useMainPrice: true,
          },
          transaction,
        }
      );

      return { success: true, newPrice };
    } catch (error) {
      logger.error("Error updating product price:", error);
      throw error;
    }
  }
}

module.exports = new EnhancedProductManagementService();
