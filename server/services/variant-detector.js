const { ProductVariant, PlatformData } = require('../models');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Import the variant detection service for SKU pattern parsing
const VariantDetectionService = require('./variant-detection-service');

class VariantDetector {
  /**
   * Parse SKU using your structured format: NWK-APPL001-TR
   */
  static parseSKU(sku) {
    const variantService = new VariantDetectionService();
    return variantService.parseSKU(sku);
  }

  /**
   * Generate SKU using your structured format
   */
  static generateSKU(productInfo) {
    const variantService = new VariantDetectionService();
    return variantService.generateSKU(productInfo);
  }

  /**
   * Detect and classify a product's variant status
   * @param {Object} product - Product to analyze
   * @param {Object} detectionRules - Detection rules to use
   * @returns {Object} Variant classification result
   */
  static async classifyProductVariantStatus(product, detectionRules = {}) {
    try {
      const classification = {
        isVariant: false,
        isMainProduct: false,
        variantType: null,
        variantValue: null,
        variantGroupId: null,
        confidence: 0,
        source: 'auto',
        reasoning: []
      };

      // Check if product looks like a variant based on SKU pattern
      const skuAnalysis = this.analyzeSKUForVariantPattern(product.sku);
      if (skuAnalysis.isVariant) {
        classification.isVariant = true;
        classification.variantType = skuAnalysis.variantType;
        classification.variantValue = skuAnalysis.variantValue;
        classification.confidence = Math.max(
          classification.confidence,
          skuAnalysis.confidence
        );
        classification.reasoning.push(
          `SKU pattern indicates variant: ${skuAnalysis.reasoning}`
        );
      }

      // Check platform data for variant indicators
      if (product.platformData && product.platformData.length > 0) {
        const platformAnalysis = this.analyzePlatformDataForVariants(
          product.platformData
        );
        if (platformAnalysis.isVariant) {
          classification.isVariant = true;
          classification.variantType =
            platformAnalysis.variantType || classification.variantType;
          classification.variantValue =
            platformAnalysis.variantValue || classification.variantValue;
          classification.confidence = Math.max(
            classification.confidence,
            platformAnalysis.confidence
          );
          classification.reasoning.push(
            `Platform data indicates variant: ${platformAnalysis.reasoning}`
          );
        }
      }

      // Check name/description for variant patterns
      const textAnalysis = this.analyzeTextForVariantPattern(
        product.name,
        product.description
      );
      if (textAnalysis.isVariant) {
        classification.isVariant = true;
        classification.variantType =
          textAnalysis.variantType || classification.variantType;
        classification.variantValue =
          textAnalysis.variantValue || classification.variantValue;
        classification.confidence = Math.max(
          classification.confidence,
          textAnalysis.confidence
        );
        classification.reasoning.push(
          `Text analysis indicates variant: ${textAnalysis.reasoning}`
        );
      }

      // Check if product has potential variants (making it a main product)
      const hasVariantsAnalysis = await this.checkForPotentialVariants(product);
      if (hasVariantsAnalysis.hasVariants) {
        classification.isMainProduct = true;
        classification.confidence = Math.max(
          classification.confidence,
          hasVariantsAnalysis.confidence
        );
        classification.reasoning.push(
          `Product appears to have variants: ${hasVariantsAnalysis.reasoning}`
        );
        classification.variantGroupId = this.generateVariantGroupId(product);
      }

      // If neither variant nor main product, set appropriate confidence
      if (!classification.isVariant && !classification.isMainProduct) {
        classification.confidence = 0.1; // Low confidence for no variant status
        classification.reasoning.push('No variant indicators found');
      }

      return {
        success: true,
        classification,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error in product variant classification:', error);
      throw error;
    }
  }

  /**
   * Analyze SKU for variant patterns
   */
  static analyzeSKUForVariantPattern(sku) {
    if (!sku) {return { isVariant: false, confidence: 0 };}

    const result = {
      isVariant: false,
      variantType: null,
      variantValue: null,
      confidence: 0,
      reasoning: ''
    };

    // Parse SKU using enhanced service
    try {
      const parsed = this.parseSKU(sku);
      if (parsed && parsed.variant) {
        result.isVariant = true;
        result.confidence = 0.8;
        result.reasoning = `SKU has variant code: ${parsed.variant}`;

        // Determine variant type based on variant code
        const variantCode = parsed.variant.toUpperCase();
        if (
          ['SYH', 'BEYAZ', 'KIRMIZI', 'BLACK', 'WHITE', 'RED', 'BLUE'].some(
            (color) => variantCode.includes(color)
          )
        ) {
          result.variantType = 'color';
          result.variantValue = parsed.variant;
        } else if (['S', 'M', 'L', 'XL', 'XXL'].includes(variantCode)) {
          result.variantType = 'size';
          result.variantValue = parsed.variant;
        } else if (['TR', 'UK', 'US', 'ING'].includes(variantCode)) {
          result.variantType = 'feature';
          result.variantValue = parsed.variant;
        } else if (['V1', 'V2', 'V3'].some((v) => variantCode.includes(v))) {
          result.variantType = 'model';
          result.variantValue = parsed.variant;
        } else {
          result.variantType = 'unknown';
          result.variantValue = parsed.variant;
        }
      }
    } catch (error) {
      // If SKU parsing fails, try simple pattern matching
      const simpleVariantPattern = /-([A-Z0-9]+)$/;
      const match = sku.match(simpleVariantPattern);
      if (match && match[1]) {
        result.isVariant = true;
        result.confidence = 0.6;
        result.reasoning = `Simple SKU pattern match: ${match[1]}`;
        result.variantType = 'unknown';
        result.variantValue = match[1];
      }
    }

    return result;
  }

  /**
   * Analyze platform data for variant indicators
   */
  static analyzePlatformDataForVariants(platformDataArray) {
    const result = {
      isVariant: false,
      variantType: null,
      variantValue: null,
      confidence: 0,
      reasoning: ''
    };

    for (const platformData of platformDataArray) {
      const data = platformData.data;

      // Check for explicit variant indicators
      if (data.isVariant || data.variant === true) {
        result.isVariant = true;
        result.confidence = 0.9;
        result.reasoning = `Platform explicitly marks as variant`;
        break;
      }

      // Check for parent product indicators
      if (data.parentId || data.parentSKU || data.masterProduct) {
        result.isVariant = true;
        result.confidence = 0.8;
        result.reasoning = `Platform data has parent product reference`;
      }

      // Check for variant attributes
      if (data.color && data.color !== 'default') {
        result.isVariant = true;
        result.variantType = 'color';
        result.variantValue = data.color;
        result.confidence = Math.max(result.confidence, 0.7);
        result.reasoning = `Platform data has color variant: ${data.color}`;
      }

      if (data.size && data.size !== 'default') {
        result.isVariant = true;
        result.variantType = 'size';
        result.variantValue = data.size;
        result.confidence = Math.max(result.confidence, 0.7);
        result.reasoning = `Platform data has size variant: ${data.size}`;
      }
    }

    return result;
  }

  /**
   * Analyze product name/description for variant patterns
   */
  static analyzeTextForVariantPattern(name, description) {
    const result = {
      isVariant: false,
      variantType: null,
      variantValue: null,
      confidence: 0,
      reasoning: ''
    };

    const text = `${name || ''} ${description || ''}`.toLowerCase();

    // Color patterns
    const colorPatterns = [
      { pattern: /\b(siyah|black)\b/i, value: 'Black', type: 'color' },
      { pattern: /\b(beyaz|white)\b/i, value: 'White', type: 'color' },
      { pattern: /\b(kırmızı|red)\b/i, value: 'Red', type: 'color' },
      { pattern: /\b(mavi|blue)\b/i, value: 'Blue', type: 'color' },
      { pattern: /\b(yeşil|green)\b/i, value: 'Green', type: 'color' }
    ];

    // Size patterns
    const sizePatterns = [
      { pattern: /\b(small|küçük|s)\b/i, value: 'Small', type: 'size' },
      { pattern: /\b(medium|orta|m)\b/i, value: 'Medium', type: 'size' },
      { pattern: /\b(large|büyük|l)\b/i, value: 'Large', type: 'size' },
      { pattern: /\b(extra large|xl)\b/i, value: 'Extra Large', type: 'size' }
    ];

    // Check patterns
    const allPatterns = [...colorPatterns, ...sizePatterns];
    for (const { pattern, value, type } of allPatterns) {
      if (pattern.test(text)) {
        result.isVariant = true;
        result.variantType = type;
        result.variantValue = value;
        result.confidence = 0.6;
        result.reasoning = `Text contains ${type} variant indicator: ${value}`;
        break;
      }
    }

    return result;
  }

  /**
   * Check if a product has potential variants (multiple similar products)
   */
  static async checkForPotentialVariants(product) {
    try {
      const { Product } = require('../models');
      const { Op } = require('sequelize');

      const result = {
        hasVariants: false,
        confidence: 0,
        reasoning: '',
        similarProducts: []
      };

      // Look for similar products based on name/SKU patterns
      const baseName = product.name
        .replace(
          /\s+(siyah|beyaz|kırmızı|mavi|small|medium|large|s|m|l|xl).*$/i,
          ''
        )
        .trim();
      const baseSKU = product.sku ? product.sku.split('-')[0] : null;

      const whereConditions = [];

      if (baseName.length > 3) {
        whereConditions.push({
          name: {
            [Op.iLike]: `%${baseName}%`
          }
        });
      }

      if (baseSKU) {
        whereConditions.push({
          sku: {
            [Op.iLike]: `${baseSKU}%`
          }
        });
      }

      if (whereConditions.length === 0) {
        return result;
      }

      const similarProducts = await Product.findAll({
        where: {
          [Op.and]: [
            {
              id: { [Op.ne]: product.id }
            },
            {
              userId: product.userId
            },
            {
              [Op.or]: whereConditions
            }
          ]
        },
        limit: 10
      });

      if (similarProducts.length > 0) {
        result.hasVariants = true;
        result.confidence = Math.min(0.9, 0.5 + similarProducts.length * 0.1);
        result.reasoning = `Found ${similarProducts.length} similar products`;
        result.similarProducts = similarProducts.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku
        }));
      }

      return result;
    } catch (error) {
      logger.error('Error checking for potential variants:', error);
      return {
        hasVariants: false,
        confidence: 0,
        reasoning: 'Error checking variants',
        similarProducts: []
      };
    }
  }

  /**
   * Check if a string is a valid UUID format
   */
  static isValidUUID(str) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Generate a variant group ID for related products
   * Creates a deterministic UUID based on the product's base characteristics
   */
  static generateVariantGroupId(product) {
    // Use base SKU or name to generate consistent group ID
    const baseSKU = product.sku ? product.sku.split('-')[0] : null;
    const baseName = product.name
      ? product.name.replace(
        /\s+(siyah|beyaz|kırmızı|mavi|small|medium|large|s|m|l|xl).*$/i,
        ''
      )
      : null;

    const base = baseSKU || baseName || product.id;

    // Generate a deterministic UUID based on the base identifier
    // This ensures the same base products always get the same variant group ID
    const baseString = `variant-group-${base
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase()}`;
    const hash = crypto.createHash('sha256').update(baseString).digest('hex');

    // Create a UUID v4 format from the hash
    const uuid = [
      hash.substr(0, 8),
      hash.substr(8, 4),
      '4' + hash.substr(13, 3), // Version 4
      ((parseInt(hash.substr(16, 1), 16) & 0x3) | 0x8).toString(16) +
        hash.substr(17, 3), // Variant bits
      hash.substr(20, 12)
    ].join('-');

    return uuid;
  }

  /**
   * Update product variant status in database
   */
  static async updateProductVariantStatus(productId, classification) {
    try {
      const { Product } = require('../models');

      // Validate variantGroupId is a proper UUID format if provided
      let variantGroupId = classification.variantGroupId;
      if (variantGroupId && !this.isValidUUID(variantGroupId)) {
        logger.warn(
          `Invalid UUID format for variantGroupId: ${variantGroupId}, setting to null`,
          {
            productId,
            originalVariantGroupId: variantGroupId
          }
        );
        variantGroupId = null;
      }

      const updateData = {
        isVariant: classification.isVariant,
        isMainProduct: classification.isMainProduct,
        variantType: classification.variantType,
        variantValue: classification.variantValue,
        variantGroupId: variantGroupId,
        variantDetectionConfidence: classification.confidence,
        variantDetectionSource: classification.source,
        lastVariantDetectionAt: new Date()
      };

      await Product.update(updateData, {
        where: { id: productId }
      });

      logger.info(
        `Updated variant status for product ${productId}:`,
        updateData
      );
      return { success: true, updated: updateData };
    } catch (error) {
      logger.error(
        `Error updating variant status for product ${productId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Remove variant status from a product
   */
  static async removeVariantStatus(productId) {
    try {
      const { Product } = require('../models');

      const updateData = {
        isVariant: false,
        isMainProduct: false,
        variantType: null,
        variantValue: null,
        variantGroupId: null,
        parentProductId: null,
        variantDetectionConfidence: null,
        variantDetectionSource: 'manual',
        lastVariantDetectionAt: new Date()
      };

      await Product.update(updateData, {
        where: { id: productId }
      });

      logger.info(`Removed variant status from product ${productId}`);
      return { success: true, message: 'Variant status removed successfully' };
    } catch (error) {
      logger.error(
        `Error removing variant status from product ${productId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Run variant detection on multiple products
   */
  static async runBatchVariantDetection(products, detectionRules = {}) {
    const results = {
      processed: 0,
      updated: 0,
      errors: 0,
      classifications: []
    };

    for (const product of products) {
      try {
        const classification = await this.classifyProductVariantStatus(
          product,
          detectionRules
        );

        if (
          classification.success &&
          classification.classification.confidence > 0.5
        ) {
          await this.updateProductVariantStatus(
            product.id,
            classification.classification
          );
          results.updated++;
        }

        results.classifications.push({
          productId: product.id,
          productName: product.name,
          classification: classification.classification
        });

        results.processed++;
      } catch (error) {
        logger.error(`Error processing product ${product.id}:`, error);
        results.errors++;
      }
    }

    return results;
  }
}

module.exports = VariantDetector;
