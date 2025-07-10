const { ProductVariant, PlatformData } = require('../models');
const logger = require('../utils/logger');

/**
 * Enhanced Variant Detection Service for SKU pattern analysis
 * Merged from enhanced-variant-detection-service.js
 */
class VariantDetectionService {
  constructor() {
    // Brand configuration - add all your brands here
    this.brandConfig = {
      ownBrands: {
        NW: 'Noteware'
      },

      productTypes: {
        K: 'Klavye',
        AD: 'Adaptör',
        DV: 'Drive',
        KASA: 'Kasa',
        KASSA: 'Kasa',
        M: 'Mouse',
        H: 'Headset',
        W: 'Webcam',
        T: 'Tablet'
      },

      externalBrands: {
        // Current brands from your database
        IBM: 'Lenovo/IBM',
        HP: 'HP',
        DE: 'Dell',
        AS: 'Asus',
        AC: 'Acer',
        MSI: 'MSI',
        LN: 'Lenovo',
        MON: 'Monster',

        // Additional common brands
        APPL: 'Apple',
        SAMS: 'Samsung',
        LOGI: 'Logitech',
        RAZE: 'Razer',
        MSFT: 'Microsoft',
        CORS: 'Corsair',
        STEE: 'SteelSeries',
        HYPR: 'HyperX',
        ROCS: 'Roccat'
      },

      variantCodes: {
        // Layout variants
        TR: 'Turkish Layout',
        UK: 'UK Layout',
        ING: 'English Layout',
        US: 'US Layout',

        // Feature variants
        ORJ: 'Original',
        LED: 'LED Backlit',

        // Inclusion variants
        KASALI: 'With Case',

        // Color variants
        SYH: 'Black Color',
        KIRMIZI: 'Red Color',
        BEYAZ: 'White Color',

        // Version variants
        V1: 'Version 1',
        V2: 'Version 2',
        V3: 'Version 3',

        // Size variants
        S: 'Small',
        M: 'Medium',
        L: 'Large',

        // Additional descriptive variants found in your SKUs
        MC: 'Menteşe Kapağı', // Hinge Cover
        D: 'Alt Kasa' // Bottom Case
      }
    };
  }

  /**
   * Parse SKU using structured format: NWK-APPL001-TR
   */
  static parseSKU(sku) {
    const instance = new VariantDetectionService();
    return instance.parseSKU(sku);
  }

  /**
   * Parse your SKU format: NWK-IBM048-TR
   */
  parseSKU(sku) {
    if (!sku || typeof sku !== 'string') {return null;}

    // Main pattern: {NW+ProductType}-{Brand+Number}-{Variant}
    const mainPattern = /^(NW)([A-Z]+)-([A-Z]+)(\d+)-([A-Z0-9\-]+)$/;
    const match = sku.match(mainPattern);

    if (match) {
      return {
        ownBrand: match[1], // NW
        productType: match[2], // K, AD, etc.
        brandCode: match[3], // IBM, HP, etc.
        sequence: parseInt(match[4]), // 048
        variant: match[5], // TR, ORJ, etc.
        isStructured: true
      };
    }

    // Handle complex case patterns like KASA-AC001-D-V3
    const casePattern = /^(KASA|KASSA)-([A-Z]+)(\d+)-([A-Z0-9\-]+)$/;
    const caseMatch = sku.match(casePattern);

    if (caseMatch) {
      return {
        ownBrand: 'NW',
        productType: caseMatch[1],
        brandCode: caseMatch[2],
        sequence: parseInt(caseMatch[3]),
        variant: caseMatch[4],
        isStructured: true
      };
    }

    return null;
  }

  /**
   * Generate SKU using structured format
   */
  static generateSKU(productInfo) {
    const instance = new VariantDetectionService();
    return instance.generateSKU(productInfo);
  }

  /**
   * Generate SKU in your format
   */
  generateSKU(productInfo) {
    const {
      productType,
      brand,
      sequence,
      variant = 'ORJ',
      isVariant = false
    } = productInfo;

    // Get brand code
    const brandCode = this.getBrandCode(brand);

    // Generate sequence number if not provided
    const sequenceNumber =
      sequence || this.generateSequenceNumber(brandCode, productType);

    // Format sequence with leading zeros
    const sequenceStr = sequenceNumber.toString().padStart(3, '0');

    // Build SKU: NW + ProductType - BrandCode + Sequence - Variant
    return `NW${productType}-${brandCode}${sequenceStr}-${variant}`;
  }

  /**
   * Generate a sequence number for a brand/product type combination
   */
  generateSequenceNumber(brandCode, productType) {
    // For now, generate a random number between 1-999
    // In production, this should query the database for the highest existing sequence
    return Math.floor(Math.random() * 999) + 1;
  }

  /**
   * Get brand code from configuration
   */
  getBrandCode(brandName) {
    // First check exact matches
    for (const [code, name] of Object.entries(
      this.brandConfig.externalBrands
    )) {
      if (name.toLowerCase() === brandName.toLowerCase()) {
        return code;
      }
    }

    // Generate new code if not found
    return this.generateBrandCode(brandName);
  }

  /**
   * Generate brand code from name
   */
  generateBrandCode(brandName) {
    if (brandName.length <= 3) {
      return brandName.toUpperCase();
    }

    // For compound names, take initials
    const words = brandName.split(/[\s\-_]+/);
    if (words.length > 1) {
      return words
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase();
    }

    // For single words, take first 2-4 characters
    return brandName.substring(0, Math.min(4, brandName.length)).toUpperCase();
  }

  /**
   * Detect variants from similar SKUs
   */
  async detectVariantsFromSKUs(skus) {
    const variants = [];
    const grouped = new Map();

    // Group SKUs by base pattern (without variant)
    skus.forEach((sku) => {
      const parsed = this.parseSKU(sku);
      if (parsed && parsed.isStructured) {
        const baseKey = `${parsed.ownBrand}${parsed.productType}-${
          parsed.brandCode
        }${parsed.sequence.toString().padStart(3, '0')}`;

        if (!grouped.has(baseKey)) {
          grouped.set(baseKey, []);
        }

        grouped.get(baseKey).push({
          sku,
          parsed,
          variant: parsed.variant
        });
      }
    });

    // Find groups with multiple variants
    grouped.forEach((items, baseKey) => {
      if (items.length > 1) {
        const baseProduct = items[0];
        const variantList = items.map((item) => ({
          sku: item.sku,
          variant: item.variant,
          description:
            this.brandConfig.variantCodes[item.variant] || item.variant,
          attributes: this.parseVariantAttributes(item.variant)
        }));

        variants.push({
          basePattern: baseKey,
          productType:
            this.brandConfig.productTypes[baseProduct.parsed.productType],
          brand: this.brandConfig.externalBrands[baseProduct.parsed.brandCode],
          variants: variantList,
          confidence: 0.9 // High confidence for structured SKUs
        });
      }
    });

    return variants;
  }

  /**
   * Parse variant attributes from variant code
   */
  parseVariantAttributes(variantCode) {
    const attributes = {};

    // Layout detection
    if (['TR', 'UK', 'ING', 'US'].includes(variantCode)) {
      attributes.layout = variantCode;
    }

    // Feature detection
    if (variantCode.includes('LED')) {
      attributes.backlight = 'LED';
    }

    if (variantCode.includes('KASALI')) {
      attributes.casing = 'included';
    }

    // Color detection
    if (variantCode.includes('SYH')) {
      attributes.color = 'black';
    } else if (variantCode.includes('KIRMIZI')) {
      attributes.color = 'red';
    }

    return attributes;
  }

  /**
   * Detect variants for a product based on its information
   */
  async detectVariants(productInfo) {
    const { name, description, category, sku } = productInfo;
    const detectedVariants = [];

    try {
      // Parse SKU if provided
      if (sku) {
        const parsed = this.parseSKU(sku);
        if (parsed && parsed.variant) {
          detectedVariants.push({
            type: 'sku',
            code: parsed.variant,
            name:
              this.brandConfig.variantCodes[parsed.variant] || parsed.variant,
            source: 'SKU parsing'
          });
        }
      }

      // Detect from product name
      if (name) {
        const nameVariants = this.detectVariantsFromText(name);
        detectedVariants.push(...nameVariants);
      }

      // Detect from description
      if (description) {
        const descVariants = this.detectVariantsFromText(description);
        detectedVariants.push(...descVariants);
      }

      // Remove duplicates
      const uniqueVariants = detectedVariants.filter(
        (variant, index, self) =>
          index === self.findIndex((v) => v.code === variant.code)
      );

      return uniqueVariants;
    } catch (error) {
      logger.error('Error detecting variants:', error);
      return [];
    }
  }

  /**
   * Detect variants from text content
   */
  detectVariantsFromText(text) {
    const detectedVariants = [];
    const lowerText = text.toLowerCase();

    // Check for layout variants
    const layoutPatterns = {
      TR: /\b(turkish|türkçe|tr|q klavye)\b/i,
      UK: /\b(uk|british|english uk)\b/i,
      US: /\b(us|american|english us)\b/i,
      ING: /\b(english|ingilizce|ing)\b/i
    };

    // Check for feature variants
    const featurePatterns = {
      LED: /\b(led|backlit|aydınlatmalı)\b/i,
      RGB: /\b(rgb|multicolor|çok renkli)\b/i,
      MECH: /\b(mechanical|mekanik)\b/i,
      WLES: /\b(wireless|kablosuz)\b/i,
      BT: /\b(bluetooth|bt)\b/i
    };

    // Check for color variants
    const colorPatterns = {
      SYH: /\b(black|siyah|siyah renk)\b/i,
      BEYAZ: /\b(white|beyaz|beyaz renk)\b/i,
      KIRMIZI: /\b(red|kırmızı|kirmizi)\b/i,
      MAVI: /\b(blue|mavi)\b/i
    };

    // Detect all patterns
    const allPatterns = {
      ...layoutPatterns,
      ...featurePatterns,
      ...colorPatterns
    };

    Object.entries(allPatterns).forEach(([code, pattern]) => {
      if (pattern.test(lowerText)) {
        detectedVariants.push({
          type: 'text',
          code,
          name: this.brandConfig.variantCodes[code] || code,
          source: 'Text analysis'
        });
      }
    });

    return detectedVariants;
  }

  /**
   * Validate SKU format
   */
  validateSKU(sku) {
    const parsed = this.parseSKU(sku);
    return {
      isValid: parsed !== null && parsed.isStructured,
      parsed,
      errors: parsed ? [] : ['Invalid SKU format']
    };
  }

  /**
   * Add new brand to configuration
   */
  addBrand(brandName, brandCode = null) {
    const code = brandCode || this.generateBrandCode(brandName);
    this.brandConfig.externalBrands[code] = brandName;
    return code;
  }

  /**
   * Get available product types
   */
  getProductTypes() {
    return this.brandConfig.productTypes;
  }

  /**
   * Get available brands
   */
  getBrands() {
    return this.brandConfig.externalBrands;
  }

  /**
   * Get available variant codes
   */
  getVariantCodes() {
    return this.brandConfig.variantCodes;
  }

  /**
   * Detect and classify a product's variant status
   * @param {Object} product - Product to analyze
   * @param {Object} detectionRules - Detection rules to use
   * @returns {Object} Variant classification result
   */
  static async classifyProductVariantStatus(product, detectionRules = {}) {
    try {
      // Run variant detection
      const detectionResult = await this.detectVariants(
        product,
        detectionRules
      );

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

      // Check if product has detected variants
      if (detectionResult.variants && detectionResult.variants.length > 0) {
        classification.isMainProduct = true;
        classification.confidence = Math.max(
          ...detectionResult.variants.map((v) => v.confidence)
        );
        classification.source = 'variant_detection';
        classification.reasoning.push(
          `Product has ${detectionResult.variants.length} detected variants`
        );

        // Generate variant group ID based on product SKU/name
        classification.variantGroupId = this.generateVariantGroupId(product);
      }

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

      // If neither variant nor main product, set appropriate confidence
      if (!classification.isVariant && !classification.isMainProduct) {
        classification.confidence = 0.1; // Low confidence for no variant status
        classification.reasoning.push('No variant indicators found');
      }

      return {
        success: true,
        classification,
        detectionResult,
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
    const parsed = this.parseSKU(sku);
    if (parsed.variant) {
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
   * Generate a variant group ID for related products
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
    return `vg_${base.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
  }

  /**
   * Update product variant status in database
   */
  static async updateProductVariantStatus(productId, classification) {
    try {
      const { Product } = require('../models');

      const updateData = {
        isVariant: classification.isVariant,
        isMainProduct: classification.isMainProduct,
        variantType: classification.variantType,
        variantValue: classification.variantValue,
        variantGroupId: classification.variantGroupId,
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
   * Detect potential variants from platform data and product information
   */
  static async detectVariants(product, detectionRules = {}) {
    try {
      const variants = [];
      const suggestions = [];
      const patterns = [];

      // Default detection rules if not provided
      const rules = {
        colorPatterns: detectionRules.colorPatterns || [
          /(?:color|colour|renk):\s*([^,;]+)/i,
          /(?:^|\s)(black|white|red|blue|green|yellow|pink|purple|orange|gray|grey|brown)(?:\s|$)/i
        ],
        sizePatterns: detectionRules.sizePatterns || [
          /(?:size|beden):\s*([^,;]+)/i,
          /(?:^|\s)(xs|s|m|l|xl|xxl|xxxl|\d+)(?:\s|$)/i
        ],
        modelPatterns: detectionRules.modelPatterns || [
          /(?:model|tip):\s*([^,;]+)/i
        ],
        priceVariations: detectionRules.priceVariations !== false,
        stockVariations: detectionRules.stockVariations !== false,
        ...detectionRules
      };

      // Analyze platform data for variant patterns
      if (product.platformData && product.platformData.length > 0) {
        for (const platformData of product.platformData) {
          const detected = this.analyzeplatformData(platformData, rules);
          if (detected.variants.length > 0) {
            variants.push(...detected.variants);
            patterns.push(...detected.patterns);
          }
        }
      }

      // Analyze product name and description for variant indicators
      const nameAnalysis = this.analyzeProductText(
        product.name,
        product.description,
        rules
      );
      if (nameAnalysis.suggestions.length > 0) {
        suggestions.push(...nameAnalysis.suggestions);
      }

      // Group similar variants and create unique combinations
      const uniqueVariants = this.deduplicateVariants(variants);
      const variantCombinations = this.generateVariantCombinations(
        uniqueVariants,
        patterns
      );

      // Generate SKUs for detected variants
      const variantsWithSKUs = variantCombinations.map((variant, index) => ({
        ...variant,
        sku: this.generateVariantSKU(product.sku, variant, index),
        isDetected: true,
        confidence: variant.confidence || 0.8
      }));

      return {
        success: true,
        variants: variantsWithSKUs,
        suggestions,
        patterns,
        analytics: {
          totalFound: variantsWithSKUs.length,
          highConfidence: variantsWithSKUs.filter((v) => v.confidence >= 0.9)
            .length,
          mediumConfidence: variantsWithSKUs.filter(
            (v) => v.confidence >= 0.7 && v.confidence < 0.9
          ).length,
          lowConfidence: variantsWithSKUs.filter((v) => v.confidence < 0.7)
            .length
        }
      };
    } catch (error) {
      logger.error('Error in variant detection:', error);
      throw error;
    }
  }

  /**
   * Analyze platform data for variant patterns
   */
  static analyzeplatformData(platformData, rules) {
    const variants = [];
    const patterns = [];
    const data = platformData.data;

    try {
      // Check for color variations
      if (data.color || data.colours || data.renk) {
        const colors = this.extractValues(
          data.color || data.colours || data.renk
        );
        colors.forEach((color) => {
          variants.push({
            type: 'color',
            value: color,
            platform: platformData.platformType,
            confidence: 0.9,
            source: 'platform_data'
          });
        });
        patterns.push({
          type: 'color',
          found: colors.length,
          source: 'platform_data'
        });
      }

      // Check for size variations
      if (data.size || data.sizes || data.beden) {
        const sizes = this.extractValues(data.size || data.sizes || data.beden);
        sizes.forEach((size) => {
          variants.push({
            type: 'size',
            value: size,
            platform: platformData.platformType,
            confidence: 0.9,
            source: 'platform_data'
          });
        });
        patterns.push({
          type: 'size',
          found: sizes.length,
          source: 'platform_data'
        });
      }

      // Check for model variations
      if (data.model || data.variant || data.type) {
        const models = this.extractValues(
          data.model || data.variant || data.type
        );
        models.forEach((model) => {
          variants.push({
            type: 'model',
            value: model,
            platform: platformData.platformType,
            confidence: 0.8,
            source: 'platform_data'
          });
        });
        patterns.push({
          type: 'model',
          found: models.length,
          source: 'platform_data'
        });
      }

      // Check for price variations indicating variants
      if (
        rules.priceVariations &&
        data.variants &&
        Array.isArray(data.variants)
      ) {
        const priceVariations = data.variants.filter(
          (v) => v.price && v.price !== data.price
        );
        if (priceVariations.length > 0) {
          priceVariations.forEach((variant, index) => {
            variants.push({
              type: 'price_variant',
              value: `Variant ${index + 1}`,
              price: variant.price,
              attributes: variant.attributes || {},
              platform: platformData.platformType,
              confidence: 0.7,
              source: 'price_variation'
            });
          });
          patterns.push({
            type: 'price_variant',
            found: priceVariations.length,
            source: 'platform_data'
          });
        }
      }

      // Check for barcode variations
      if (
        data.barcodes &&
        Array.isArray(data.barcodes) &&
        data.barcodes.length > 1
      ) {
        data.barcodes.forEach((barcode, index) => {
          if (index > 0) {
            // Skip first as it's likely the main product
            variants.push({
              type: 'barcode_variant',
              value: `Barcode Variant ${index}`,
              barcode: barcode,
              platform: platformData.platformType,
              confidence: 0.8,
              source: 'barcode_variation'
            });
          }
        });
        patterns.push({
          type: 'barcode_variant',
          found: data.barcodes.length - 1,
          source: 'platform_data'
        });
      }
    } catch (error) {
      logger.error('Error analyzing platform data:', error);
    }

    return { variants, patterns };
  }

  /**
   * Analyze product text for variant indicators
   */
  static analyzeProductText(name, description, rules) {
    const suggestions = [];
    const text = `${name || ''} ${description || ''}`.toLowerCase();

    try {
      // Check for color patterns in text
      rules.colorPatterns.forEach((pattern) => {
        const matches = text.match(pattern);
        if (matches) {
          suggestions.push({
            type: 'color',
            value: matches[1] || matches[0],
            confidence: 0.6,
            source: 'text_analysis',
            pattern: pattern.toString()
          });
        }
      });

      // Check for size patterns in text
      rules.sizePatterns.forEach((pattern) => {
        const matches = text.match(pattern);
        if (matches) {
          suggestions.push({
            type: 'size',
            value: matches[1] || matches[0],
            confidence: 0.6,
            source: 'text_analysis',
            pattern: pattern.toString()
          });
        }
      });

      // Check for model patterns in text
      rules.modelPatterns.forEach((pattern) => {
        const matches = text.match(pattern);
        if (matches) {
          suggestions.push({
            type: 'model',
            value: matches[1] || matches[0],
            confidence: 0.5,
            source: 'text_analysis',
            pattern: pattern.toString()
          });
        }
      });

      // Check for common variant indicators
      const variantIndicators = [
        'different colors available',
        'multiple sizes',
        'various models',
        'farklı renkler',
        'çeşitli bedenler',
        'değişik modeller'
      ];

      variantIndicators.forEach((indicator) => {
        if (text.includes(indicator.toLowerCase())) {
          suggestions.push({
            type: 'general',
            value: 'Multiple variants available',
            confidence: 0.7,
            source: 'text_analysis',
            indicator: indicator
          });
        }
      });
    } catch (error) {
      logger.error('Error analyzing product text:', error);
    }

    return { suggestions };
  }

  /**
   * Extract values from various data formats
   */
  static extractValues(data) {
    if (!data) {return [];}

    if (Array.isArray(data)) {
      return data.filter(Boolean);
    }

    if (typeof data === 'string') {
      // Split by common delimiters
      return data
        .split(/[,;|\/]/)
        .map((v) => v.trim())
        .filter(Boolean);
    }

    if (typeof data === 'object') {
      return Object.values(data).filter(Boolean);
    }

    return [data.toString()];
  }

  /**
   * Remove duplicate variants
   */
  static deduplicateVariants(variants) {
    const seen = new Set();
    return variants.filter((variant) => {
      const key = `${variant.type}:${variant.value}`.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Generate variant combinations from detected patterns
   */
  static generateVariantCombinations(variants, patterns) {
    const combinations = [];

    // Group variants by type
    const variantsByType = variants.reduce((acc, variant) => {
      if (!acc[variant.type]) {
        acc[variant.type] = [];
      }
      acc[variant.type].push(variant);
      return acc;
    }, {});

    const types = Object.keys(variantsByType);

    if (types.length === 0) {
      return combinations;
    }

    // Generate combinations for single type
    if (types.length === 1) {
      const type = types[0];
      variantsByType[type].forEach((variant) => {
        combinations.push({
          attributes: { [type]: variant.value },
          price: variant.price,
          barcode: variant.barcode,
          confidence: variant.confidence,
          sources: [variant.source]
        });
      });
      return combinations;
    }

    // Generate combinations for multiple types
    const generateCombinations = (typeIndex, currentCombination) => {
      if (typeIndex >= types.length) {
        combinations.push({
          attributes: { ...currentCombination.attributes },
          confidence: currentCombination.confidence,
          sources: currentCombination.sources
        });
        return;
      }

      const currentType = types[typeIndex];
      variantsByType[currentType].forEach((variant) => {
        generateCombinations(typeIndex + 1, {
          attributes: {
            ...currentCombination.attributes,
            [currentType]: variant.value
          },
          confidence: Math.min(
            currentCombination.confidence,
            variant.confidence
          ),
          sources: [...currentCombination.sources, variant.source]
        });
      });
    };

    generateCombinations(0, { attributes: {}, confidence: 1, sources: [] });

    return combinations;
  }

  /**
   * Generate SKU for variant
   */
  static generateVariantSKU(baseSKU, variant, index) {
    try {
      // Check if base SKU follows your structured format
      const parsedBaseSKU = this.parseSKU(baseSKU);

      if (parsedBaseSKU && parsedBaseSKU.isStructured) {
        // Use your SKU format: NWK-APPL001-TR
        const variantCode = this.generateVariantCode(variant.attributes);
        return `${parsedBaseSKU.ownBrand}${parsedBaseSKU.productType}-${
          parsedBaseSKU.brandCode
        }${parsedBaseSKU.sequence.toString().padStart(3, '0')}-${variantCode}`;
      }

      // Fallback to existing logic for non-structured SKUs
      let sku = baseSKU || 'PROD';

      // Add variant attributes to SKU
      Object.entries(variant.attributes).forEach(([type, value]) => {
        const cleanValue = value
          .toString()
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase();
        sku += `-${type.charAt(0).toUpperCase()}${cleanValue.substring(0, 3)}`;
      });

      // Always add index to ensure uniqueness
      sku += `-V${(index + 1).toString().padStart(2, '0')}`;

      return sku;
    } catch (error) {
      logger.error('Error generating variant SKU:', error);
      return `${baseSKU || 'PROD'}-V${(index + 1).toString().padStart(2, '0')}`;
    }
  }

  /**
   * Generate variant code from attributes (for your SKU format)
   */
  static generateVariantCode(attributes) {
    // Priority-based variant code generation
    if (attributes.layout) {
      const layoutCode = attributes.layout.toUpperCase();
      if (attributes.backlight === 'LED') {
        return `${layoutCode}-LED`;
      }
      return layoutCode;
    }

    if (attributes.color) {
      const colorMap = {
        black: 'SYH',
        red: 'KIRMIZI',
        white: 'BEYAZ',
        blue: 'MAVI'
      };
      return (
        colorMap[attributes.color.toLowerCase()] ||
        attributes.color.toUpperCase()
      );
    }

    if (attributes.features && attributes.features.includes('LED')) {
      return 'LED';
    }

    // Default variant code
    return 'VAR';
  }

  /**
   * Create variants from detection results
   */
  static async createVariantsFromDetection(
    productId,
    detectionResults,
    userId
  ) {
    try {
      const createdVariants = [];
      const { variants } = detectionResults;

      for (let i = 0; i < variants.length; i++) {
        const variantData = variants[i];

        // Generate variant name from attributes
        const attributePairs = Object.entries(variantData.attributes || {});
        const variantName =
          attributePairs.map(([key, value]) => `${key}: ${value}`).join(', ') ||
          `Variant ${i + 1}`;

        const variant = await ProductVariant.create({
          productId,
          name: variantName,
          sku: variantData.sku,
          attributes: variantData.attributes,
          price: variantData.price || null,
          barcode: variantData.barcode || null,
          stockQuantity: 0, // Default stock quantity
          minStockLevel: 0, // Default minimum stock level
          status: 'active', // Default status
          isDefault: i === 0,
          sortOrder: i,
          metadata: {
            detectionSource: variantData.sources,
            confidence: variantData.confidence,
            detectedAt: new Date()
          }
        });

        createdVariants.push(variant);
      }

      return {
        success: true,
        created: createdVariants.length,
        variants: createdVariants
      };
    } catch (error) {
      logger.error('Error creating variants from detection:', error);
      throw error;
    }
  }

  /**
   * Detect and classify a product's variant status
   * @param {Object} product - Product to analyze
   * @param {Object} detectionRules - Detection rules to use
   * @returns {Object} Variant classification result
   */
  static async classifyProductVariantStatus(product, detectionRules = {}) {
    try {
      // Run variant detection
      const detectionResult = await this.detectVariants(
        product,
        detectionRules
      );

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

      // Check if product has detected variants
      if (detectionResult.variants && detectionResult.variants.length > 0) {
        classification.isMainProduct = true;
        classification.confidence = Math.max(
          ...detectionResult.variants.map((v) => v.confidence)
        );
        classification.source = 'variant_detection';
        classification.reasoning.push(
          `Product has ${detectionResult.variants.length} detected variants`
        );

        // Generate variant group ID based on product SKU/name
        classification.variantGroupId = this.generateVariantGroupId(product);
      }

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

      // If neither variant nor main product, set appropriate confidence
      if (!classification.isVariant && !classification.isMainProduct) {
        classification.confidence = 0.1; // Low confidence for no variant status
        classification.reasoning.push('No variant indicators found');
      }

      return {
        success: true,
        classification,
        detectionResult,
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
    const parsed = this.parseSKU(sku);
    if (parsed.variant) {
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
   * Generate a variant group ID for related products
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
    return `vg_${base.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
  }

  /**
   * Update product variant status in database
   */
  static async updateProductVariantStatus(productId, classification) {
    try {
      const { Product } = require('../models');

      const updateData = {
        isVariant: classification.isVariant,
        isMainProduct: classification.isMainProduct,
        variantType: classification.variantType,
        variantValue: classification.variantValue,
        variantGroupId: classification.variantGroupId,
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
}

module.exports = VariantDetectionService;
