const logger = require("../utils/logger");
/**
 * SKU Management Service
 * Integrates intelligent classification, dynamic data management, and user control
 * Consolidated from enhanced-sku-service.js
 */

const IntelligentSKUClassifier = require("./intelligent-sku-classifier-enhanced");
const DynamicSKUDataManager = require("./dynamic-sku-data-manager");

class SKUService {
  constructor() {
    this.classifier = new IntelligentSKUClassifier();
    this.dataManager = new DynamicSKUDataManager();
    this.initialized = false;
  }

  /**
   * Initialize the service with platform data
   */
  async initialize(platformServices = {}) {
    try {
      logger.info("Initializing SKU Service", {
        operation: "sku_service_init",
      });

      // Learn from connected platforms
      if (Object.keys(platformServices).length > 0) {
        await this.dataManager.learnFromPlatforms(platformServices);
        logger.info("Learned data from connected platforms", {
          operation: "sku_service_learning",
          dataCount: this.learnedData?.length || 0,
        });
      }

      this.initialized = true;
      logger.info("SKU Service initialized successfully", {
        operation: "sku_service_init_complete",
        timestamp: new Date().toISOString(),
      });

      return { success: true, message: "Service initialized" };
    } catch (error) {
      logger.error("Failed to initialize SKU Service:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process and classify a code (barcode or SKU)
   */
  processCode(code, context = {}) {
    if (!code) {
      return {
        success: false,
        error: "Code is required",
      };
    }

    // Classify the code
    const classification = this.classifier.classify(code);

    const result = {
      success: true,
      original: code,
      classification,
      timestamp: new Date(),
    };

    // Handle different classification types
    switch (classification.type) {
      case "barcode":
        result.actions = this.getBarcodeActions(classification, context);
        break;

      case "sku":
        result.sku = this.processSKU(classification, context);
        result.actions = this.getSKUActions(classification, context);
        break;

      case "unrecognized":
        result.actions = this.getUnrecognizedActions(classification, context);
        break;

      default:
        result.actions = [
          { type: "error", message: "Unknown classification type" },
        ];
    }

    return result;
  }

  /**
   * Get actions for barcode
   */
  getBarcodeActions(classification, context) {
    return [
      {
        type: "barcode_detected",
        message: "Barcode detected - please enter the corresponding SKU",
        action: "enter_sku",
        priority: "high",
      },
      {
        type: "create_mapping",
        message: "Create a mapping between this barcode and a SKU",
        action: "create_barcode_sku_mapping",
        priority: "medium",
      },
      {
        type: "product_lookup",
        message: "Look up product using this barcode",
        action: "lookup_product_by_barcode",
        priority: "low",
      },
    ];
  }

  /**
   * Get actions for SKU
   */
  getSKUActions(classification, context) {
    const actions = [
      {
        type: "sku_accepted",
        message: "SKU recognized and ready for processing",
        action: "process_sku",
        priority: "high",
      },
    ];

    if (classification.hasVariants) {
      actions.push({
        type: "variant_detection",
        message: "Variants detected - consider grouping",
        action: "group_variants",
        priority: "medium",
      });
    }

    return actions;
  }

  /**
   * Get actions for unrecognized codes
   */
  getUnrecognizedActions(classification, context) {
    return [
      {
        type: "manual_classification",
        message:
          "Code not recognized - please specify if it's a barcode or SKU",
        action: "manual_classify",
        priority: "high",
      },
      {
        type: "create_pattern",
        message: "Create a custom pattern for this code type",
        action: "create_custom_pattern",
        priority: "medium",
      },
      {
        type: "skip_code",
        message: "Skip this code and continue",
        action: "skip",
        priority: "low",
      },
    ];
  }

  /**
   * Process SKU classification
   */
  processSKU(classification, context) {
    const sku = {
      original: classification.code,
      parsed: classification.parsed || {},
      hasVariants: classification.hasVariants || false,
      confidence: classification.confidence || 0.5,
    };

    // Add dynamic data if available
    if (this.dataManager.hasData(classification.code)) {
      sku.dynamicData = this.dataManager.getData(classification.code);
    }

    // Add context-based enhancements
    if (context.platform) {
      sku.platformContext = {
        platform: context.platform,
        suggestions: this.getPlatformSuggestions(
          classification.code,
          context.platform
        ),
      };
    }

    return sku;
  }

  /**
   * Get platform-specific suggestions
   */
  getPlatformSuggestions(code, platform) {
    const suggestions = [];

    // Platform-specific formatting suggestions
    switch (platform) {
      case "trendyol":
        suggestions.push({
          type: "format_check",
          message: "Ensure SKU follows Trendyol format requirements",
          action: "validate_trendyol_format",
        });
        break;

      case "hepsiburada":
        suggestions.push({
          type: "format_check",
          message: "Ensure SKU follows Hepsiburada format requirements",
          action: "validate_hepsiburada_format",
        });
        break;

      case "n11":
        suggestions.push({
          type: "format_check",
          message: "Ensure SKU follows N11 format requirements",
          action: "validate_n11_format",
        });
        break;
    }

    return suggestions;
  }

  /**
   * Validate SKU format
   */
  validateSKU(sku, rules = {}) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Basic validation
    if (!sku || typeof sku !== "string") {
      validation.valid = false;
      validation.errors.push("SKU must be a non-empty string");
      return validation;
    }

    // Length validation
    if (rules.minLength && sku.length < rules.minLength) {
      validation.valid = false;
      validation.errors.push(
        `SKU must be at least ${rules.minLength} characters`
      );
    }

    if (rules.maxLength && sku.length > rules.maxLength) {
      validation.valid = false;
      validation.errors.push(
        `SKU must not exceed ${rules.maxLength} characters`
      );
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(sku)) {
      validation.valid = false;
      validation.errors.push("SKU does not match required pattern");
    }

    // Character validation
    if (rules.allowedChars && !rules.allowedChars.test(sku)) {
      validation.valid = false;
      validation.errors.push("SKU contains invalid characters");
    }

    // Uniqueness check (if context provided)
    if (rules.checkUniqueness && rules.existingSKUs) {
      if (rules.existingSKUs.includes(sku)) {
        validation.valid = false;
        validation.errors.push("SKU already exists");
      }
    }

    return validation;
  }

  /**
   * Generate SKU based on product data
   */
  generateSKU(productData, options = {}) {
    try {
      const {
        brand = "UNK",
        category = "CAT",
        productType = "PROD",
        sequence = Date.now().toString().slice(-6),
        format = "standard",
      } = productData;

      let sku;

      switch (format) {
        case "structured":
          sku = this.generateStructuredSKU(
            brand,
            category,
            productType,
            sequence
          );
          break;

        case "simple":
          sku = this.generateSimpleSKU(brand, category, sequence);
          break;

        case "custom":
          sku = this.generateCustomSKU(productData, options);
          break;

        default:
          sku = this.generateStandardSKU(brand, category, sequence);
      }

      return {
        success: true,
        sku,
        generated: true,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate structured SKU
   */
  generateStructuredSKU(brand, category, productType, sequence) {
    const brandCode = brand.substring(0, 3).toUpperCase();
    const categoryCode = category.substring(0, 3).toUpperCase();
    const typeCode = productType.substring(0, 4).toUpperCase();
    return `${typeCode}-${brandCode}${sequence}-${categoryCode}`;
  }

  /**
   * Generate simple SKU
   */
  generateSimpleSKU(brand, category, sequence) {
    const brandCode = brand.substring(0, 3).toUpperCase();
    const categoryCode = category.substring(0, 3).toUpperCase();
    return `${brandCode}-${categoryCode}-${sequence}`;
  }

  /**
   * Generate custom SKU
   */
  generateCustomSKU(productData, options) {
    const template = options.template || "{brand}-{category}-{sequence}";
    let sku = template;

    // Replace placeholders with actual values
    Object.keys(productData).forEach((key) => {
      const placeholder = `{${key}}`;
      if (sku.includes(placeholder)) {
        sku = sku.replace(placeholder, productData[key]);
      }
    });

    return sku;
  }

  /**
   * Generate standard SKU
   */
  generateStandardSKU(brand, category, sequence) {
    const brandCode = brand.substring(0, 3).toUpperCase();
    const categoryCode = category.substring(0, 3).toUpperCase();
    return `${brandCode}-${categoryCode}${sequence}`;
  }

  /**
   * Batch process multiple codes
   */
  batchProcessCodes(codes, context = {}) {
    try {
      if (!Array.isArray(codes)) {
        throw new Error("Codes must be an array");
      }

      const results = codes.map((code) => {
        try {
          return this.processCode(code, context);
        } catch (error) {
          return {
            success: false,
            original: code,
            error: error.message,
          };
        }
      });

      // Analyze batch results
      const analysis = this.analyzeBatchResults(results);

      return {
        success: true,
        results,
        analysis,
        processedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Analyze batch processing results
   */
  analyzeBatchResults(results) {
    const analysis = {
      total: results.length,
      successful: 0,
      failed: 0,
      barcodes: [],
      skus: [],
      unrecognized: [],
    };

    results.forEach((result) => {
      if (result.success) {
        analysis.successful++;

        switch (result.classification?.type) {
          case "barcode":
            analysis.barcodes.push(result);
            break;
          case "sku":
            analysis.skus.push(result);
            break;
          case "unrecognized":
            analysis.unrecognized.push(result);
            break;
        }
      } else {
        analysis.failed++;
      }
    });

    return analysis;
  }

  /**
   * Get processing suggestions based on batch analysis
   */
  getSuggestions(analysis) {
    try {
      const suggestions = [];

      if (analysis.barcodes.length > 0) {
        suggestions.push({
          type: "barcode_mapping",
          count: analysis.barcodes.length,
          message: `${analysis.barcodes.length} barcodes detected - consider SKU mapping`,
          action: "create_barcode_mappings",
        });
      }

      if (analysis.unrecognized.length > 0) {
        suggestions.push({
          type: "pattern_creation",
          count: analysis.unrecognized.length,
          message: `${analysis.unrecognized.length} unrecognized codes - consider creating patterns`,
          action: "create_custom_patterns",
        });
      }

      if (analysis.skus.length > 5) {
        // Look for common patterns in SKUs
        const patterns = this.extractCommonPatterns(analysis.skus);
        if (patterns.length > 0) {
          analysis.suggestedPatterns = patterns;
          suggestions.push({
            type: "pattern_optimization",
            count: patterns.length,
            message: `${patterns.length} common patterns found - consider optimization`,
            action: "optimize_patterns",
          });
        }
      }

      return {
        success: true,
        analysis,
        suggestions,
        processedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract common patterns from classified SKUs
   */
  extractCommonPatterns(skus) {
    const patterns = [];
    const structures = new Map();

    // Group SKUs by similar structure
    skus.forEach((sku) => {
      if (sku.parsed) {
        const structure = this.getStructure(sku.original);
        if (!structures.has(structure)) {
          structures.set(structure, []);
        }
        structures.get(structure).push(sku);
      }
    });

    // Find patterns that appear multiple times
    structures.forEach((group, structure) => {
      if (group.length >= 3) {
        patterns.push({
          structure,
          count: group.length,
          examples: group.slice(0, 3).map((s) => s.original),
          confidence: Math.min(0.9, group.length / skus.length),
        });
      }
    });

    return patterns;
  }

  /**
   * Get structure pattern from code
   */
  getStructure(code) {
    return code
      .replace(/[A-Z]/g, "A")
      .replace(/[a-z]/g, "a")
      .replace(/[0-9]/g, "0");
  }

  /**
   * Provide feedback for learning system
   */
  provideFeedback(feedbackData) {
    try {
      const { code, classification, isCorrect, comment } = feedbackData;

      if (!code || !classification || typeof isCorrect !== "boolean") {
        throw new Error("Code, classification, and isCorrect are required");
      }

      // Process the feedback with the classifier
      const result = this.classifier.provideFeedback({
        code,
        expectedType: classification,
        wasCorrect: isCorrect,
        comment,
      });

      // Log the feedback for analytics
      logger.info("User feedback received for code", {
        operation: "sku_user_feedback",
        code,
        expected: classification,
        correct: isCorrect,
        timestamp: new Date().toISOString(),
      });
      if (comment) {
        logger.info(`Comment: ${comment}`);
      }

      return {
        success: true,
        feedback: result,
        message: "Feedback processed successfully",
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = SKUService;
