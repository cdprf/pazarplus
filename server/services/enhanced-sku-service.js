/**
 * Enhanced SKU Management Service
 * Integrates intelligent classification, dynamic data management, and user control
 */

const IntelligentSKUClassifier = require("./intelligent-sku-classifier-enhanced");
const DynamicSKUDataManager = require("./dynamic-sku-data-manager");

class EnhancedSKUService {
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
      console.log("Initializing Enhanced SKU Service...");

      // Learn from connected platforms
      if (Object.keys(platformServices).length > 0) {
        await this.dataManager.learnFromPlatforms(platformServices);
        console.log("Learned data from connected platforms");
      }

      this.initialized = true;
      console.log("Enhanced SKU Service initialized successfully");

      return { success: true, message: "Service initialized" };
    } catch (error) {
      console.error("Failed to initialize Enhanced SKU Service:", error);
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
        type: "ignore",
        message: "Use barcode as identifier (not recommended for SKU system)",
        action: "use_as_sku",
        priority: "low",
      },
    ];
  }

  /**
   * Get actions for recognized SKU
   */
  getSKUActions(classification, context) {
    const actions = [
      {
        type: "sku_recognized",
        message: `SKU recognized with ${Math.round(
          classification.confidence * 100
        )}% confidence`,
        action: "use_sku",
        priority: "high",
      },
    ];

    if (classification.confidence < 0.8) {
      actions.push({
        type: "verify_pattern",
        message: "Low confidence - please verify the pattern is correct",
        action: "verify_sku_pattern",
        priority: "medium",
      });
    }

    if (classification.parsed) {
      actions.push({
        type: "enhance_data",
        message: "Parsed components available - enhance with additional data",
        action: "enhance_sku_data",
        priority: "low",
      });
    }

    return actions;
  }

  /**
   * Get actions for unrecognized code
   */
  getUnrecognizedActions(classification, context) {
    const actions = [
      {
        type: "pattern_not_recognized",
        message: "Code pattern not recognized",
        action: "choose_action",
        priority: "high",
      },
    ];

    // Add suggestion-specific actions
    if (classification.suggestions) {
      classification.suggestions.forEach((suggestion) => {
        actions.push({
          type: suggestion.type,
          message: suggestion.reason,
          action: suggestion.action,
          priority: "medium",
        });
      });
    }

    return actions;
  }

  /**
   * Process a recognized SKU
   */
  processSKU(classification, context) {
    const result = {
      code: classification.normalized,
      pattern: classification.pattern,
      confidence: classification.confidence,
      parsed: classification.parsed || {},
    };

    // Try to enhance with known data
    if (classification.parsed) {
      result.enhanced = this.enhanceParsedSKU(classification.parsed);
    }

    return result;
  }

  /**
   * Enhance parsed SKU with known data
   */
  enhanceParsedSKU(parsed) {
    const enhanced = { ...parsed };

    // Look up brand information
    if (parsed.prefix || parsed.brandCode) {
      const brandCode = parsed.prefix || parsed.brandCode;
      const brand = this.findBrand(brandCode);
      if (brand) {
        enhanced.brand = brand;
      }
    }

    // Look up product type
    if (parsed.productType) {
      const productType = this.dataManager.productTypes.get(parsed.productType);
      if (productType) {
        enhanced.productType = productType;
      }
    }

    // Look up variant
    if (parsed.variant || parsed.suffix) {
      const variantCode = parsed.variant || parsed.suffix;
      const variant = this.dataManager.variantCodes.get(variantCode);
      if (variant) {
        enhanced.variant = variant;
      }
    }

    return enhanced;
  }

  /**
   * Find brand by code
   */
  findBrand(code) {
    const ownBrand = this.dataManager.ownBrands.get(code.toUpperCase());
    if (ownBrand) return { ...ownBrand, type: "own" };

    const externalBrand = this.dataManager.externalBrands.get(
      code.toUpperCase()
    );
    if (externalBrand) return { ...externalBrand, type: "external" };

    return null;
  }

  /**
   * Generate SKU with user's data
   */
  generateSKU(parameters) {
    const { ownBrand, productType, brand, variant, sequence } = parameters;

    // Validate required parameters
    if (!ownBrand || !productType || !brand) {
      throw new Error("Own brand, product type, and brand are required");
    }

    // Get brand code
    const brandData = this.findBrand(brand);
    const brandCode = brandData ? brandData.code : brand;

    // Generate or use provided sequence
    const seq = sequence || this.generateSequenceNumber(brandCode, productType);

    // Format sequence with leading zeros
    const sequenceStr = seq.toString().padStart(3, "0");

    // Build SKU: {OwnBrand}{ProductType}-{Brand}{Sequence}-{Variant}
    const sku = `${ownBrand}${productType}-${brandCode}${sequenceStr}-${
      variant || "STD"
    }`;

    return {
      sku,
      components: {
        ownBrand,
        productType,
        brandCode,
        sequence: seq,
        variant: variant || "STD",
      },
      generated: true,
      timestamp: new Date(),
    };
  }

  /**
   * Generate sequence number
   */
  generateSequenceNumber(brandCode, productType) {
    // In a real implementation, this would query the database
    // for the highest existing sequence for this brand/type combination
    return Math.floor(Math.random() * 999) + 1;
  }

  /**
   * Learn pattern from user examples
   */
  learnPatternFromUser(patternData) {
    const { name, description, regex, groups, examples } = patternData;

    if (!name || !regex) {
      return { success: false, error: "Pattern name and regex are required" };
    }

    try {
      const result = this.classifier.learnPattern(
        name,
        {
          regex,
          groups: groups || [],
          description: description || "",
        },
        examples || []
      );

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Pattern Management Methods
   */

  /**
   * Add user-defined pattern
   */
  addUserPattern(patternData) {
    try {
      const result = this.classifier.addUserPattern(patternData.name, {
        regex: patternData.regex,
        description: patternData.description,
        examples: patternData.examples || [],
        userDefined: true,
        createdAt: new Date(),
      });

      return {
        success: true,
        pattern: result,
        message: "User pattern added successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Learn pattern from user feedback
   */
  learnPatternFromUser(feedbackData) {
    try {
      const { code, expectedType, confidence } = feedbackData;

      // Add to classifier's learning system
      const result = this.classifier.learnFromFeedback(
        code,
        expectedType,
        confidence
      );

      return {
        success: true,
        learned: result,
        message: "Pattern learned from user feedback",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Data Removal Methods
   */

  /**
   * Remove own brand
   */
  removeOwnBrand(code) {
    try {
      const result = this.dataManager.removeOwnBrand(code);
      return {
        success: true,
        removed: result,
        message: "Own brand removed successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Search functionality
   */
  search(query, type = "all") {
    const results = {};

    if (type === "all" || type === "brands") {
      results.brands = this.dataManager.searchBrands(query);
    }

    if (type === "all" || type === "productTypes") {
      results.productTypes = this.dataManager.searchProductTypes(query);
    }

    if (type === "all" || type === "variantCodes") {
      results.variantCodes = this.dataManager.searchVariantCodes(query);
    }

    return results;
  }

  /**
   * Update data management methods
   */
  addOwnBrand(brandData) {
    return this.dataManager.setOwnBrand(brandData);
  }

  addExternalBrand(brandData) {
    return this.dataManager.setExternalBrand(brandData);
  }

  addProductType(typeData) {
    return this.dataManager.setProductType(typeData);
  }

  addVariantCode(variantData) {
    return this.dataManager.setVariantCode(variantData);
  }

  removeOwnBrand(code) {
    return this.dataManager.removeOwnBrand(code);
  }

  removeExternalBrand(code) {
    return this.dataManager.removeExternalBrand(code);
  }

  removeProductType(code) {
    try {
      const result = this.dataManager.removeProductType(code);
      return {
        success: true,
        removed: result,
        message: "Product type removed successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Remove variant code
   */
  removeVariantCode(code) {
    try {
      const result = this.dataManager.removeVariantCode(code);
      return {
        success: true,
        removed: result,
        message: "Variant code removed successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Export/Import functionality
   */
  exportData() {
    return {
      dataManager: this.dataManager.exportData(),
      patterns: this.classifier.getAllPatterns(),
      exportedAt: new Date(),
    };
  }

  importData(data) {
    const results = [];

    if (data.dataManager) {
      results.push(this.dataManager.importData(data.dataManager));
    }

    if (data.patterns) {
      // Import patterns
      if (data.patterns.userDefined) {
        data.patterns.userDefined.forEach((pattern) => {
          const result = this.classifier.addUserPattern(pattern.name, pattern);
          results.push(result);
        });
      }
    }

    return {
      success: results.every((r) => r.success),
      results,
      importedAt: new Date(),
    };
  }

  /**
   * Get all available data
   */
  getAllData() {
    try {
      // Get all brands
      const ownBrands = Array.from(this.dataManager.ownBrands.values());
      const externalBrands = Array.from(
        this.dataManager.externalBrands.values()
      );

      // Get all product types
      const productTypes = Array.from(this.dataManager.productTypes.values());

      // Get all variant codes
      const variantCodes = Array.from(this.dataManager.variantCodes.values());

      // Get all patterns
      const patterns = this.classifier.getAllPatterns();

      // Calculate statistics
      const statistics = {
        ownBrands: ownBrands.length,
        externalBrands: externalBrands.length,
        productTypes: productTypes.length,
        variantCodes: variantCodes.length,
        platformsConnected: this.dataManager.platformData.size,
        lastUpdated: new Date(),
      };

      return {
        brands: {
          own: ownBrands,
          external: externalBrands,
        },
        productTypes,
        variantCodes,
        patterns,
        statistics,
      };
    } catch (error) {
      throw new Error(`Failed to get all data: ${error.message}`);
    }
  }

  /**
   * Analyze codes for patterns
   */
  analyzeCodesForPatterns(codes) {
    try {
      if (!Array.isArray(codes)) {
        throw new Error("Codes must be an array");
      }

      const analysis = {
        barcodes: [],
        skus: [],
        unrecognized: [],
        suggestedPatterns: [],
      };

      // Classify each code
      codes.forEach((code) => {
        const classification = this.classifier.classify(code);

        switch (classification.type) {
          case "barcode":
            analysis.barcodes.push(classification);
            break;
          case "sku":
            analysis.skus.push(classification);
            break;
          default:
            analysis.unrecognized.push(classification);
        }
      });

      // Generate suggestions based on analysis
      const suggestions = [];

      if (analysis.barcodes.length > 0) {
        suggestions.push({
          type: "barcode_handling",
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
      console.log(`User feedback received for code: ${code}`);
      console.log(`Expected: ${classification}, Correct: ${isCorrect}`);
      if (comment) {
        console.log(`Comment: ${comment}`);
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

module.exports = EnhancedSKUService;
