/**
 * Enhanced Variant Detection Service for your specific SKU pattern
 * Supports: {NW+ProductType}-{Brand+Number}-{Variant}
 */

// Optional model dependency - only used if available
let ProductVariant;
try {
  ProductVariant = require("../models").ProductVariant;
} catch (error) {
  // Models not available in standalone mode
}

// Simple logger fallback
const logger = {
  error: (message, ...args) => console.error("ERROR:", message, ...args),
  info: (message, ...args) => console.log("INFO:", message, ...args),
  warn: (message, ...args) => console.warn("WARN:", message, ...args),
};

class EnhancedVariantDetectionService {
  constructor() {
    // Your brand configuration - add all your brands here
    this.brandConfig = {
      ownBrands: {
        NW: "Noteware",
      },

      productTypes: {
        K: "Klavye",
        AD: "Adaptör",
        DV: "Drive",
        KASA: "Kasa",
        KASSA: "Kasa",
        M: "Mouse",
        H: "Headset",
        W: "Webcam",
        T: "Tablet",
      },

      externalBrands: {
        // Current brands from your database
        IBM: "Lenovo/IBM",
        HP: "HP",
        DE: "Dell",
        AS: "Asus",
        AC: "Acer",
        MSI: "MSI",
        LN: "Lenovo",
        MON: "Monster",

        // Additional common brands (add your actual brands here)
        APPL: "Apple",
        SAMS: "Samsung",
        LOGI: "Logitech",
        RAZE: "Razer",
        MSFT: "Microsoft",
        CORS: "Corsair",
        STEE: "SteelSeries",
        HYPR: "HyperX",
        ROCS: "Roccat",
        // Add more brands as needed
      },

      variantCodes: {
        // Layout variants
        TR: "Turkish Layout",
        UK: "UK Layout",
        ING: "English Layout",
        US: "US Layout",

        // Feature variants
        ORJ: "Original",
        LED: "LED Backlit",

        // Inclusion variants
        KASALI: "With Case",

        // Color variants
        SYH: "Black Color",
        KIRMIZI: "Red Color",
        BEYAZ: "White Color",

        // Version variants
        V1: "Version 1",
        V2: "Version 2",
        V3: "Version 3",

        // Size variants
        S: "Small",
        M: "Medium",
        L: "Large",

        // Additional descriptive variants found in your SKUs
        MC: "Menteşe Kapağı", // Hinge Cover
        D: "Alt Kasa", // Bottom Case
      },
    };
  }

  /**
   * Parse your SKU format: NWK-IBM048-TR
   */
  parseSKU(sku) {
    if (!sku || typeof sku !== "string") return null;

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
        isStructured: true,
      };
    }

    // Handle complex case patterns like KASA-AC001-D-V3
    const casePattern = /^(KASA|KASSA)-([A-Z]+)(\d+)-([A-Z0-9\-]+)$/;
    const caseMatch = sku.match(casePattern);

    if (caseMatch) {
      return {
        ownBrand: "NW",
        productType: caseMatch[1],
        brandCode: caseMatch[2],
        sequence: parseInt(caseMatch[3]),
        variant: caseMatch[4],
        isStructured: true,
      };
    }

    return null;
  }

  /**
   * Generate SKU in your format
   */
  generateSKU(productInfo) {
    const {
      productType,
      brand,
      sequence,
      variant = "ORJ",
      isVariant = false,
    } = productInfo;

    // Get brand code
    const brandCode = this.getBrandCode(brand);

    // Generate sequence number if not provided
    const sequenceNumber =
      sequence || this.generateSequenceNumber(brandCode, productType);

    // Format sequence with leading zeros
    const sequenceStr = sequenceNumber.toString().padStart(3, "0");

    // Build SKU: NW + ProductType - BrandCode + Sequence - Variant
    return `NW${productType}-${brandCode}${sequenceStr}-${variant}`;
  }

  /**
   * Generate a sequence number for a brand/product type combination
   * In production, this would query the database for the next available number
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
        .join("")
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
        }${parsed.sequence.toString().padStart(3, "0")}`;

        if (!grouped.has(baseKey)) {
          grouped.set(baseKey, []);
        }

        grouped.get(baseKey).push({
          sku,
          parsed,
          variant: parsed.variant,
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
          attributes: this.parseVariantAttributes(item.variant),
        }));

        variants.push({
          basePattern: baseKey,
          productType:
            this.brandConfig.productTypes[baseProduct.parsed.productType],
          brand: this.brandConfig.externalBrands[baseProduct.parsed.brandCode],
          variants: variantList,
          confidence: 0.9, // High confidence for structured SKUs
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
    if (["TR", "UK", "ING", "US"].includes(variantCode)) {
      attributes.layout = variantCode;
    }

    // Feature detection
    if (variantCode.includes("LED")) {
      attributes.backlight = "LED";
    }

    if (variantCode.includes("KASALI")) {
      attributes.casing = "included";
    }

    // Color detection
    if (variantCode.includes("SYH")) {
      attributes.color = "black";
    } else if (variantCode.includes("KIRMIZI")) {
      attributes.color = "red";
    }

    return attributes;
  }

  /**
   * Generate variant SKUs for a base product
   */
  generateVariantSKUs(baseInfo, variantTypes) {
    const variants = [];

    variantTypes.forEach((variantType, index) => {
      const sku = this.generateSKU({
        ...baseInfo,
        variant: variantType,
        isVariant: true,
      });

      variants.push({
        sku,
        name: this.generateVariantName(baseInfo, variantType),
        attributes: this.parseVariantAttributes(variantType),
        sortOrder: index,
      });
    });

    return variants;
  }

  /**
   * Generate variant name
   */
  generateVariantName(baseInfo, variantType) {
    const brandName =
      this.brandConfig.externalBrands[this.getBrandCode(baseInfo.brand)] ||
      baseInfo.brand;
    const productTypeName =
      this.brandConfig.productTypes[baseInfo.productType] ||
      baseInfo.productType;
    const variantDesc =
      this.brandConfig.variantCodes[variantType] || variantType;

    return `${brandName} ${productTypeName} - ${variantDesc}`;
  }

  /**
   * Get next sequence number for a brand
   */
  async getNextSequence(brandCode, productType) {
    try {
      // This would query your database for the highest sequence number
      // For now, return a sample
      return Math.floor(Math.random() * 100) + 1;
    } catch (error) {
      logger.error("Error getting next sequence:", error);
      return 1;
    }
  }

  /**
   * Validate SKU format
   */
  validateSKU(sku) {
    const parsed = this.parseSKU(sku);
    return {
      isValid: parsed !== null && parsed.isStructured,
      parsed,
      errors: parsed ? [] : ["Invalid SKU format"],
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
   * Detect variants for a product based on its information
   */
  async detectVariants(productInfo) {
    const { name, description, category, sku } = productInfo;
    const detectedVariants = [];

    try {
      // Parse SKU if provided
      if (sku) {
        const parsed = this.parseSKU(sku);
        if (parsed.variant) {
          detectedVariants.push({
            type: "sku",
            code: parsed.variant,
            name:
              this.brandConfig.variantCodes[parsed.variant] || parsed.variant,
            source: "SKU parsing",
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
      logger.error("Error detecting variants:", error);
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
      ING: /\b(english|ingilizce|ing)\b/i,
    };

    // Check for feature variants
    const featurePatterns = {
      LED: /\b(led|backlit|aydınlatmalı)\b/i,
      RGB: /\b(rgb|multicolor|çok renkli)\b/i,
      MECH: /\b(mechanical|mekanik)\b/i,
      WLES: /\b(wireless|kablosuz)\b/i,
      BT: /\b(bluetooth|bt)\b/i,
    };

    // Check for color variants
    const colorPatterns = {
      SYH: /\b(black|siyah|siyah renk)\b/i,
      BEYAZ: /\b(white|beyaz|beyaz renk)\b/i,
      KIRMIZI: /\b(red|kırmızı|kirmizi)\b/i,
      MAVI: /\b(blue|mavi)\b/i,
    };

    // Detect all patterns
    const allPatterns = {
      ...layoutPatterns,
      ...featurePatterns,
      ...colorPatterns,
    };

    Object.entries(allPatterns).forEach(([code, pattern]) => {
      if (pattern.test(lowerText)) {
        detectedVariants.push({
          type: "text",
          code,
          name: this.brandConfig.variantCodes[code] || code,
          source: "Text analysis",
        });
      }
    });

    return detectedVariants;
  }

  /**
   * Get suggestions based on detected variants
   */
  getSuggestions(detectedVariants) {
    const suggestions = [];

    if (!detectedVariants || detectedVariants.length === 0) {
      suggestions.push(
        "No variants detected. Consider adding layout, color, or feature variants."
      );
      return suggestions;
    }

    const variantTypes = detectedVariants.map((v) =>
      this.getVariantType(v.code)
    );

    // Suggest missing common variants
    if (!variantTypes.includes("layout")) {
      suggestions.push("Consider adding keyboard layout variants (TR, UK, US)");
    }

    if (!variantTypes.includes("color") && detectedVariants.length < 3) {
      suggestions.push("Consider adding color variants (SYH, BEYAZ, KIRMIZI)");
    }

    if (!variantTypes.includes("feature")) {
      suggestions.push("Consider adding feature variants (LED, RGB, MECH)");
    }

    return suggestions;
  }

  /**
   * Get variant type for categorization
   */
  getVariantType(code) {
    const layouts = ["TR", "UK", "US", "ING", "FR", "DE"];
    const features = [
      "ORJ",
      "LED",
      "RGB",
      "MECH",
      "MEMB",
      "WIRE",
      "WLES",
      "BT",
    ];
    const colors = ["SYH", "KIRMIZI", "BEYAZ", "MAVI", "YESIL", "SARI", "GRI"];

    if (layouts.includes(code)) return "layout";
    if (features.includes(code)) return "feature";
    if (colors.includes(code)) return "color";

    return "other";
  }

  /**
   * Validate SKU format
   */
  validateSKUFormat(sku) {
    return this.validateSKU(sku);
  }
}

module.exports = EnhancedVariantDetectionService;
