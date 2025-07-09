/**
 * Product Management Service
 * Handles main products, platform variants, and auto-learning capabilities
 * Consolidated from enhanced-product-management-service.js
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
const StockService = require("./stock-service");
// const SKUSystemManager = require("../../sku-system-manager"); // Temporarily disabled - missing module

class ProductManagementService {
  constructor() {
    // this.skuManager = new SKUSystemManager(); // Temporarily disabled
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
        await StockService.updateStock(
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
      // TODO: Re-enable SKU manager when available
      // const skuData = await this.skuManager.generateSKU({
      //   productType: productData.productType,
      //   brand: productData.brand,
      //   productName: productData.name,
      //   category: productData.category,
      // });
      // return skuData;

      // Temporary fallback to simple generation
      const fallbackSKU = this.generateFallbackSKU(productData);
      return { sku: fallbackSKU, isGenerated: true };
    } catch (error) {
      logger.error("Error generating base SKU:", error);
      // Fallback to simple generation
      const timestamp = Date.now().toString().slice(-6);
      return `PROD-${timestamp}`;
    }
  }

  /**
   * Generate a simple fallback SKU when the SKU manager is not available
   */
  generateFallbackSKU(productData) {
    const brand = (productData.brand || "UNK").substring(0, 3).toUpperCase();
    const category = (productData.category || "CAT")
      .substring(0, 3)
      .toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `${brand}-${category}-${timestamp}`;
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
        isNew: true,
      };
    } catch (error) {
      logger.error("Error creating main product from sync:", error);
      throw error;
    }
  }

  /**
   * Extract brand from SKU pattern
   */
  extractBrandFromSKU(sku) {
    const patternInfo = this.analyzeStockCodePattern(sku);
    if (patternInfo.components && patternInfo.components.brand) {
      return patternInfo.components.brand.replace(/\d+$/, "");
    }
    return "Unknown";
  }

  /**
   * Extract media from synced product
   */
  extractMediaFromSync(syncedProduct) {
    const media = [];

    if (syncedProduct.images && Array.isArray(syncedProduct.images)) {
      syncedProduct.images.forEach((image, index) => {
        media.push({
          type: "image",
          url: image.url || image,
          alt: image.alt || `Product image ${index + 1}`,
          isPrimary: index === 0,
        });
      });
    }

    if (syncedProduct.videos && Array.isArray(syncedProduct.videos)) {
      syncedProduct.videos.forEach((video) => {
        media.push({
          type: "video",
          url: video.url || video,
          thumbnail: video.thumbnail,
          isPrimary: false,
        });
      });
    }

    return media;
  }

  /**
   * Learn from variant creation
   */
  async learnFromVariant(platformVariant, template, transaction) {
    try {
      // Update template usage statistics
      if (template) {
        await template.increment("usageCount", { transaction });
        await template.update({ lastUsedAt: new Date() }, { transaction });
      }

      // Learn platform-specific patterns
      const learningData = {
        platform: platformVariant.platform,
        category: platformVariant.platformCategory,
        attributes: platformVariant.platformAttributes,
        pricing: {
          useMainPrice: platformVariant.useMainPrice,
          priceMultiplier: platformVariant.priceMultiplier,
        },
        media: {
          useMainMedia: platformVariant.useMainMedia,
        },
        success: true,
      };

      // Store learning data for future recommendations
      await this.storeLearnedPattern(learningData, transaction);

      logger.debug(
        `Learned from variant creation: ${platformVariant.platformSku}`
      );
    } catch (error) {
      logger.error("Error learning from variant:", error);
      // Don't throw - learning is optional
    }
  }

  /**
   * Learn from synced product
   */
  async learnFromSyncedProduct(syncedProduct, platformInfo, userId) {
    try {
      const learningData = {
        platform: platformInfo.platform,
        category: syncedProduct.category,
        brand: syncedProduct.brand,
        skuPattern: this.analyzeStockCodePattern(syncedProduct.sku),
        priceRange: {
          min: parseFloat(syncedProduct.price) || 0,
          max: parseFloat(syncedProduct.price) || 0,
        },
        success: true,
        userId,
      };

      await this.storeLearnedPattern(learningData);

      logger.debug(`Learned from synced product: ${syncedProduct.sku}`);
    } catch (error) {
      logger.error("Error learning from synced product:", error);
      // Don't throw - learning is optional
    }
  }

  /**
   * Store learned pattern for future use
   */
  async storeLearnedPattern(learningData, transaction = null) {
    try {
      // For now, just log the pattern
      // In future, this could be stored in a dedicated learning table
      logger.debug("Stored learned pattern:", learningData);
    } catch (error) {
      logger.error("Error storing learned pattern:", error);
    }
  }

  /**
   * Get recommendations based on learned patterns
   */
  async getRecommendations(productData, userId) {
    try {
      // Analyze product to understand its characteristics
      const analysis = {
        category: productData.category,
        brand: productData.brand,
        skuPattern: this.analyzeStockCodePattern(productData.sku || ""),
        priceRange: productData.price
          ? {
              min: productData.price * 0.8,
              max: productData.price * 1.2,
            }
          : null,
      };

      // Find similar successful products
      const similarProducts = await MainProduct.findAll({
        where: {
          userId,
          [Op.or]: [{ category: analysis.category }, { brand: analysis.brand }],
        },
        include: [
          {
            model: PlatformVariant,
            as: "variants",
            where: { syncStatus: "success" },
            required: false,
          },
        ],
        limit: 5,
      });

      // Generate recommendations
      const recommendations = {
        platforms: this.recommendPlatforms(analysis, similarProducts),
        templates: await this.recommendTemplates(analysis),
        pricing: this.recommendPricing(analysis, similarProducts),
      };

      return recommendations;
    } catch (error) {
      logger.error("Error getting recommendations:", error);
      return {
        platforms: [],
        templates: [],
        pricing: null,
      };
    }
  }

  /**
   * Recommend platforms based on similar products
   */
  recommendPlatforms(analysis, similarProducts) {
    const platformCounts = {};

    similarProducts.forEach((product) => {
      if (product.variants) {
        product.variants.forEach((variant) => {
          platformCounts[variant.platform] =
            (platformCounts[variant.platform] || 0) + 1;
        });
      }
    });

    return Object.entries(platformCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([platform, count]) => ({
        platform,
        confidence: Math.min(count / similarProducts.length, 1),
        reason: `${count} similar products found on ${platform}`,
      }));
  }

  /**
   * Recommend templates based on analysis
   */
  async recommendTemplates(analysis) {
    try {
      const templates = await PlatformTemplate.findAll({
        where: {
          [Op.or]: [
            { category: analysis.category },
            { tags: { [Op.contains]: [analysis.category] } },
          ],
        },
        order: [["usageCount", "DESC"]],
        limit: 3,
      });

      return templates.map((template) => ({
        id: template.id,
        name: template.name,
        platform: template.platform,
        confidence: template.usageCount > 0 ? 0.8 : 0.5,
        reason:
          template.usageCount > 0
            ? `Used ${template.usageCount} times successfully`
            : "Matches category",
      }));
    } catch (error) {
      logger.error("Error recommending templates:", error);
      return [];
    }
  }

  /**
   * Recommend pricing based on similar products
   */
  recommendPricing(analysis, similarProducts) {
    if (!analysis.priceRange || similarProducts.length === 0) {
      return null;
    }

    const prices = similarProducts
      .filter((p) => p.basePrice > 0)
      .map((p) => p.basePrice);

    if (prices.length === 0) {
      return null;
    }

    const avgPrice =
      prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    return {
      suggested: avgPrice,
      range: { min: minPrice, max: maxPrice },
      confidence: prices.length / similarProducts.length,
      reason: `Based on ${prices.length} similar products`,
    };
  }

  /**
   * Bulk create products from array
   */
  async bulkCreateProducts(productsData, userId) {
    const transaction = await sequelize.transaction();
    const results = [];

    try {
      for (const productData of productsData) {
        try {
          const mainProduct = await this.createMainProduct(productData, userId);
          results.push({ success: true, product: mainProduct });
        } catch (error) {
          logger.error(`Error creating product ${productData.name}:`, error);
          results.push({
            success: false,
            error: error.message,
            productData: productData.name,
          });
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

module.exports = new ProductManagementService();
