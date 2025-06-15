const { ProductVariant, PlatformData } = require("../models");
const logger = require("../utils/logger");

// Import the enhanced detection service for SKU pattern parsing
const EnhancedVariantDetectionService = require("./enhanced-variant-detection-service");

class VariantDetectionService {
  /**
   * Parse SKU using your structured format: NWK-APPL001-TR
   */
  static parseSKU(sku) {
    const enhancedService = new EnhancedVariantDetectionService();
    return enhancedService.parseSKU(sku);
  }

  /**
   * Generate SKU using your structured format
   */
  static generateSKU(productInfo) {
    const enhancedService = new EnhancedVariantDetectionService();
    return enhancedService.generateSKU(productInfo);
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
          /(?:^|\s)(black|white|red|blue|green|yellow|pink|purple|orange|gray|grey|brown)(?:\s|$)/i,
        ],
        sizePatterns: detectionRules.sizePatterns || [
          /(?:size|beden):\s*([^,;]+)/i,
          /(?:^|\s)(xs|s|m|l|xl|xxl|xxxl|\d+)(?:\s|$)/i,
        ],
        modelPatterns: detectionRules.modelPatterns || [
          /(?:model|tip):\s*([^,;]+)/i,
        ],
        priceVariations: detectionRules.priceVariations !== false,
        stockVariations: detectionRules.stockVariations !== false,
        ...detectionRules,
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
        confidence: variant.confidence || 0.8,
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
            .length,
        },
      };
    } catch (error) {
      logger.error("Error in variant detection:", error);
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
            type: "color",
            value: color,
            platform: platformData.platformType,
            confidence: 0.9,
            source: "platform_data",
          });
        });
        patterns.push({
          type: "color",
          found: colors.length,
          source: "platform_data",
        });
      }

      // Check for size variations
      if (data.size || data.sizes || data.beden) {
        const sizes = this.extractValues(data.size || data.sizes || data.beden);
        sizes.forEach((size) => {
          variants.push({
            type: "size",
            value: size,
            platform: platformData.platformType,
            confidence: 0.9,
            source: "platform_data",
          });
        });
        patterns.push({
          type: "size",
          found: sizes.length,
          source: "platform_data",
        });
      }

      // Check for model variations
      if (data.model || data.variant || data.type) {
        const models = this.extractValues(
          data.model || data.variant || data.type
        );
        models.forEach((model) => {
          variants.push({
            type: "model",
            value: model,
            platform: platformData.platformType,
            confidence: 0.8,
            source: "platform_data",
          });
        });
        patterns.push({
          type: "model",
          found: models.length,
          source: "platform_data",
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
              type: "price_variant",
              value: `Variant ${index + 1}`,
              price: variant.price,
              attributes: variant.attributes || {},
              platform: platformData.platformType,
              confidence: 0.7,
              source: "price_variation",
            });
          });
          patterns.push({
            type: "price_variant",
            found: priceVariations.length,
            source: "platform_data",
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
              type: "barcode_variant",
              value: `Barcode Variant ${index}`,
              barcode: barcode,
              platform: platformData.platformType,
              confidence: 0.8,
              source: "barcode_variation",
            });
          }
        });
        patterns.push({
          type: "barcode_variant",
          found: data.barcodes.length - 1,
          source: "platform_data",
        });
      }
    } catch (error) {
      logger.error("Error analyzing platform data:", error);
    }

    return { variants, patterns };
  }

  /**
   * Analyze product text for variant indicators
   */
  static analyzeProductText(name, description, rules) {
    const suggestions = [];
    const text = `${name || ""} ${description || ""}`.toLowerCase();

    try {
      // Check for color patterns in text
      rules.colorPatterns.forEach((pattern) => {
        const matches = text.match(pattern);
        if (matches) {
          suggestions.push({
            type: "color",
            value: matches[1] || matches[0],
            confidence: 0.6,
            source: "text_analysis",
            pattern: pattern.toString(),
          });
        }
      });

      // Check for size patterns in text
      rules.sizePatterns.forEach((pattern) => {
        const matches = text.match(pattern);
        if (matches) {
          suggestions.push({
            type: "size",
            value: matches[1] || matches[0],
            confidence: 0.6,
            source: "text_analysis",
            pattern: pattern.toString(),
          });
        }
      });

      // Check for model patterns in text
      rules.modelPatterns.forEach((pattern) => {
        const matches = text.match(pattern);
        if (matches) {
          suggestions.push({
            type: "model",
            value: matches[1] || matches[0],
            confidence: 0.5,
            source: "text_analysis",
            pattern: pattern.toString(),
          });
        }
      });

      // Check for common variant indicators
      const variantIndicators = [
        "different colors available",
        "multiple sizes",
        "various models",
        "farklı renkler",
        "çeşitli bedenler",
        "değişik modeller",
      ];

      variantIndicators.forEach((indicator) => {
        if (text.includes(indicator.toLowerCase())) {
          suggestions.push({
            type: "general",
            value: "Multiple variants available",
            confidence: 0.7,
            source: "text_analysis",
            indicator: indicator,
          });
        }
      });
    } catch (error) {
      logger.error("Error analyzing product text:", error);
    }

    return { suggestions };
  }

  /**
   * Extract values from various data formats
   */
  static extractValues(data) {
    if (!data) return [];

    if (Array.isArray(data)) {
      return data.filter(Boolean);
    }

    if (typeof data === "string") {
      // Split by common delimiters
      return data
        .split(/[,;|\/]/)
        .map((v) => v.trim())
        .filter(Boolean);
    }

    if (typeof data === "object") {
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
          sources: [variant.source],
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
          sources: currentCombination.sources,
        });
        return;
      }

      const currentType = types[typeIndex];
      variantsByType[currentType].forEach((variant) => {
        generateCombinations(typeIndex + 1, {
          attributes: {
            ...currentCombination.attributes,
            [currentType]: variant.value,
          },
          confidence: Math.min(
            currentCombination.confidence,
            variant.confidence
          ),
          sources: [...currentCombination.sources, variant.source],
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
        }${parsedBaseSKU.sequence.toString().padStart(3, "0")}-${variantCode}`;
      }

      // Fallback to existing logic for non-structured SKUs
      let sku = baseSKU || "PROD";

      // Add variant attributes to SKU
      Object.entries(variant.attributes).forEach(([type, value]) => {
        const cleanValue = value
          .toString()
          .replace(/[^a-zA-Z0-9]/g, "")
          .toUpperCase();
        sku += `-${type.charAt(0).toUpperCase()}${cleanValue.substring(0, 3)}`;
      });

      // Always add index to ensure uniqueness
      sku += `-V${(index + 1).toString().padStart(2, "0")}`;

      return sku;
    } catch (error) {
      logger.error("Error generating variant SKU:", error);
      return `${baseSKU || "PROD"}-V${(index + 1).toString().padStart(2, "0")}`;
    }
  }

  /**
   * Generate variant code from attributes (for your SKU format)
   */
  static generateVariantCode(attributes) {
    // Priority-based variant code generation
    if (attributes.layout) {
      const layoutCode = attributes.layout.toUpperCase();
      if (attributes.backlight === "LED") {
        return `${layoutCode}-LED`;
      }
      return layoutCode;
    }

    if (attributes.color) {
      const colorMap = {
        black: "SYH",
        red: "KIRMIZI",
        white: "BEYAZ",
        blue: "MAVI",
      };
      return (
        colorMap[attributes.color.toLowerCase()] ||
        attributes.color.toUpperCase()
      );
    }

    if (attributes.features && attributes.features.includes("LED")) {
      return "LED";
    }

    // Default variant code
    return "VAR";
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
          attributePairs.map(([key, value]) => `${key}: ${value}`).join(", ") ||
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
          status: "active", // Default status
          isDefault: i === 0,
          sortOrder: i,
          metadata: {
            detectionSource: variantData.sources,
            confidence: variantData.confidence,
            detectedAt: new Date(),
          },
        });

        createdVariants.push(variant);
      }

      return {
        success: true,
        created: createdVariants.length,
        variants: createdVariants,
      };
    } catch (error) {
      logger.error("Error creating variants from detection:", error);
      throw error;
    }
  }
}

module.exports = VariantDetectionService;
