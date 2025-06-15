/**
 * Unified Product Intelligence Service
 *
 * Integrates Enhanced SKU Classification System with existing Product Merge Logic
 * to provide comprehensive product pattern detection, similarity matching, and duplicate identification.
 *
 * This service combines:
 * - Enhanced SKU Classification (barcode vs SKU detection)
 * - Product Merge Logic (similarity matching and grouping)
 * - Pattern Detection utilities (variant detection)
 * - Intelligent confidence scoring
 *
 * @author AI Assistant
 * @version 1.0.0
 */

const logger = require("../utils/logger");
const { Op } = require("sequelize");

// Import existing services
const productMergeService = require("./product-merge-service");
const IntelligentSKUClassifier = require("./intelligent-sku-classifier-enhanced");
const IntegratedPatternDetectionEngine = require("./integrated-pattern-detection-engine");

/**
 * Unified Product Intelligence Service
 * Combines all product intelligence capabilities into a single service
 */
class UnifiedProductIntelligenceService {
  constructor() {
    this.productMergeService = productMergeService; // Use pre-instantiated service
    this.skuClassifier = new IntelligentSKUClassifier();
    this.patternEngine = new IntegratedPatternDetectionEngine();

    // Initialize unified configuration
    this.config = {
      similarity: {
        thresholds: {
          sku: 0.8,
          name: 0.75,
          barcode: 1.0, // Exact match required
          description: 0.6,
        },
        weights: {
          sku: 0.35,
          name: 0.3,
          barcode: 0.25,
          category: 0.1,
        },
      },
      classification: {
        confidence_threshold: 0.4,
        learning_enabled: true,
        pattern_analysis: true,
      },
      merging: {
        grouping_strategy: "multi_pass", // SKU -> barcode -> name -> pattern
        confidence_minimum: 0.6,
      },
    };

    this.statistics = {
      products_processed: 0,
      classifications_made: 0,
      groups_created: 0,
      patterns_detected: 0,
      merge_operations: 0,
      learning_updates: 0,
    };
  }

  /**
   * Get user's products with optional filtering
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} User's products
   */
  async getUserProducts(userId, options = {}) {
    try {
      const { Op } = require("sequelize");
      const { Product, ProductVariant, PlatformData } = require("../models");

      const {
        limit = 1000,
        offset = 0,
        includeVariants = false,
        includePlatformData = false,
        status = null,
        category = null,
        platform = null,
        searchTerm = null,
      } = options;

      // Build where clause
      const whereClause = { userId };

      if (status) {
        whereClause.status = status;
      }

      if (category) {
        whereClause.category = category;
      }

      if (searchTerm) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${searchTerm}%` } },
          { sku: { [Op.iLike]: `%${searchTerm}%` } },
          { barcode: { [Op.iLike]: `%${searchTerm}%` } },
        ];
      }

      // Build include array
      const include = [];

      if (includeVariants) {
        include.push({
          model: ProductVariant,
          as: "variants",
          required: false,
        });
      }

      if (includePlatformData) {
        include.push({
          model: PlatformData,
          as: "platformData",
          required: false,
          where: platform ? { platform } : undefined,
        });
      }

      const products = await Product.findAll({
        where: whereClause,
        include,
        limit,
        offset,
        order: [["updatedAt", "DESC"]],
      });

      logger.info(`Retrieved ${products.length} products for user ${userId}`);

      // Convert to plain objects to avoid circular references
      return products.map((product) => product.get({ plain: true }));
    } catch (error) {
      logger.error("Error retrieving user products:", error);
      throw new Error(`Failed to retrieve user products: ${error.message}`);
    }
  }

  /**
   * Main intelligence analysis method
   * Processes products through all intelligence systems
   * @param {Array} products - Products to analyze
   * @param {Object} options - Analysis options
   * @returns {Object} Comprehensive analysis results
   */
  async analyzeProducts(products, options = {}) {
    const startTime = Date.now();

    try {
      logger.info(
        `Starting unified product intelligence analysis for ${products.length} products`
      );

      // Step 1: Classify all SKU/barcode identifiers
      const classificationResults = await this.classifyIdentifiers(products);

      // Step 2: Enhanced product merging using classification data
      const mergeResults = await this.enhancedProductMerging(
        products,
        classificationResults
      );

      // Step 3: Pattern detection and variant analysis
      const patternResults = await this.detectProductPatterns(
        mergeResults.groups
      );

      // Step 4: Generate intelligent suggestions
      const suggestions = await this.generateIntelligentSuggestions(
        products,
        classificationResults,
        mergeResults,
        patternResults
      );

      // Step 5: Calculate unified confidence scores
      const confidenceAnalysis = this.calculateUnifiedConfidence(
        classificationResults,
        mergeResults,
        patternResults
      );

      const processingTime = Date.now() - startTime;
      this.updateStatistics(
        products,
        classificationResults,
        mergeResults,
        patternResults
      );

      return {
        success: true,
        processingTime,
        statistics: this.statistics,
        classification: classificationResults,
        merging: mergeResults,
        patterns: patternResults,
        suggestions,
        confidence: confidenceAnalysis,
        metadata: {
          config_used: this.config,
          products_analyzed: products.length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error("Unified product intelligence analysis failed:", error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Classify all product identifiers using Enhanced SKU Classification
   * @param {Array} products - Products to classify
   * @returns {Object} Classification results
   */
  async classifyIdentifiers(products) {
    const results = {
      classifications: new Map(),
      patterns_discovered: new Map(),
      confidence_distribution: {},
      statistics: {
        total_classified: 0,
        skus_detected: 0,
        barcodes_detected: 0,
        patterns_learned: 0,
      },
    };

    for (const product of products) {
      const identifier = this.extractPrimaryIdentifier(product);

      if (identifier) {
        const classification = await this.skuClassifier.classify(identifier);

        // Enhance classification with product context
        const enhancedClassification = this.enhanceClassificationWithContext(
          classification,
          product
        );

        results.classifications.set(
          product.id || product.sku,
          enhancedClassification
        );

        // Update statistics
        results.statistics.total_classified++;
        if (enhancedClassification.type === "sku") {
          results.statistics.skus_detected++;
        } else if (enhancedClassification.type === "barcode") {
          results.statistics.barcodes_detected++;
        }

        // Learn from high-confidence classifications
        if (
          enhancedClassification.confidence > 0.8 &&
          this.config.classification.learning_enabled
        ) {
          await this.skuClassifier.learnFromClassification(
            identifier,
            enhancedClassification
          );
          results.statistics.patterns_learned++;
        }
      }
    }

    // Analyze confidence distribution
    results.confidence_distribution = this.analyzeConfidenceDistribution(
      results.classifications
    );

    return results;
  }

  /**
   * Enhanced product merging that uses SKU classification data
   * @param {Array} products - Products to merge
   * @param {Object} classificationResults - Classification data to inform merging
   * @returns {Object} Enhanced merge results
   */
  async enhancedProductMerging(products, classificationResults) {
    // Ensure products is an array
    if (!Array.isArray(products)) {
      logger.error("Products parameter is not an array:", typeof products);
      return {
        groups: [],
        merged_products: [],
        statistics: {
          original_count: 0,
          merged_count: 0,
          reduction_percentage: "0.00",
          groups_created: 0,
          avg_group_size: "0.00",
        },
      };
    }

    // Create enhanced products with classification metadata
    const enhancedProducts = products.map((product) => {
      const classification = classificationResults.classifications.get(
        product.id || product.sku
      );
      return {
        ...product,
        _intelligence: {
          classification,
          primary_identifier: this.extractPrimaryIdentifier(product),
          identifier_type: classification?.type || "unknown",
          confidence: classification?.confidence || 0,
        },
      };
    });

    // Use enhanced multi-pass grouping strategy
    const groups = await this.performIntelligentGrouping(enhancedProducts);

    // Create merged products with intelligence metadata
    const mergedProducts = groups.map((group) =>
      this.createIntelligentMergedProduct(group)
    );

    return {
      groups,
      merged_products: mergedProducts,
      statistics: {
        original_count: products.length,
        merged_count: mergedProducts.length,
        reduction_percentage: (
          ((products.length - mergedProducts.length) / products.length) *
          100
        ).toFixed(2),
        groups_created: groups.length,
        avg_group_size: (products.length / groups.length).toFixed(2),
      },
    };
  }

  /**
   * Intelligent grouping using classification data and multiple strategies
   * @param {Array} enhancedProducts - Products with intelligence metadata
   * @returns {Array} Product groups
   */
  async performIntelligentGrouping(enhancedProducts) {
    const groups = new Map();
    const ungrouped = [...enhancedProducts];

    // Strategy 1: Group by classified SKUs (high confidence)
    this.groupByClassifiedSKUs(ungrouped, groups);

    // Strategy 2: Group by classified barcodes (exact match)
    this.groupByClassifiedBarcodes(ungrouped, groups);

    // Strategy 3: Group by name similarity with pattern context
    this.groupByIntelligentNameSimilarity(ungrouped, groups);

    // Strategy 4: Group by pattern detection
    this.groupByDetectedPatterns(ungrouped, groups);

    return Array.from(groups.values());
  }

  /**
   * Group products by SKUs that are classified with high confidence
   */
  groupByClassifiedSKUs(ungrouped, groups) {
    const skuGroups = new Map();

    ungrouped.forEach((product, index) => {
      const intelligence = product._intelligence;

      if (
        intelligence?.identifier_type === "sku" &&
        intelligence.confidence > 0.7
      ) {
        const normalizedSku = this.normalizeSKU(
          intelligence.primary_identifier
        );

        if (!skuGroups.has(normalizedSku)) {
          skuGroups.set(normalizedSku, []);
        }

        skuGroups.get(normalizedSku).push(product);
        ungrouped.splice(index, 1);
      }
    });

    // Add SKU groups to main groups
    let groupId = 0;
    skuGroups.forEach((group) => {
      if (group.length > 0) {
        groups.set(`sku_group_${groupId++}`, {
          products: group,
          grouping_strategy: "classified_sku",
          confidence: this.calculateGroupConfidence(group, "sku"),
          primary_identifier: group[0]._intelligence.primary_identifier,
        });
      }
    });
  }

  /**
   * Group products by barcodes that are classified with high confidence
   */
  groupByClassifiedBarcodes(ungrouped, groups) {
    const barcodeGroups = new Map();

    ungrouped.forEach((product, index) => {
      const intelligence = product._intelligence;

      if (
        intelligence?.identifier_type === "barcode" &&
        intelligence.confidence > 0.8
      ) {
        const barcode = intelligence.primary_identifier;

        if (!barcodeGroups.has(barcode)) {
          barcodeGroups.set(barcode, []);
        }

        barcodeGroups.get(barcode).push(product);
        ungrouped.splice(index, 1);
      }
    });

    // Add barcode groups to main groups
    let groupId = 0;
    barcodeGroups.forEach((group) => {
      if (group.length > 0) {
        groups.set(`barcode_group_${groupId++}`, {
          products: group,
          grouping_strategy: "classified_barcode",
          confidence: this.calculateGroupConfidence(group, "barcode"),
          primary_identifier: group[0]._intelligence.primary_identifier,
        });
      }
    });
  }

  /**
   * Group by name similarity enhanced with pattern context
   */
  groupByIntelligentNameSimilarity(ungrouped, groups) {
    const nameGroups = [];
    const processed = new Set();

    ungrouped.forEach((product1, i) => {
      if (processed.has(i)) return;

      const similarProducts = [product1];
      processed.add(i);

      ungrouped.forEach((product2, j) => {
        if (i !== j && !processed.has(j)) {
          const similarity = this.calculateIntelligentSimilarity(
            product1,
            product2
          );

          if (similarity.overall > this.config.similarity.thresholds.name) {
            similarProducts.push(product2);
            processed.add(j);
          }
        }
      });

      if (similarProducts.length > 1) {
        nameGroups.push({
          products: similarProducts,
          grouping_strategy: "intelligent_name_similarity",
          confidence: this.calculateGroupConfidence(similarProducts, "name"),
          similarity_metrics:
            this.calculateGroupSimilarityMetrics(similarProducts),
        });
      }
    });

    // Add name groups to main groups
    nameGroups.forEach((group, index) => {
      groups.set(`name_group_${index}`, group);
    });
  }

  /**
   * Calculate intelligent similarity considering classification context
   */
  calculateIntelligentSimilarity(product1, product2) {
    const weights = this.config.similarity.weights;
    let totalWeight = 0;
    let weightedScore = 0;

    // Name similarity (enhanced with normalization)
    const name1 = this.extractName(product1);
    const name2 = this.extractName(product2);
    if (name1 && name2) {
      const nameSimilarity = this.calculateStringSimilarity(name1, name2);
      weightedScore += nameSimilarity * weights.name;
      totalWeight += weights.name;
    }

    // SKU similarity (considering classification)
    const sku1 = product1._intelligence?.primary_identifier;
    const sku2 = product2._intelligence?.primary_identifier;
    if (
      sku1 &&
      sku2 &&
      product1._intelligence?.identifier_type === "sku" &&
      product2._intelligence?.identifier_type === "sku"
    ) {
      const skuSimilarity = this.calculateStringSimilarity(sku1, sku2);
      weightedScore += skuSimilarity * weights.sku;
      totalWeight += weights.sku;
    }

    // Category similarity
    if (product1.category && product2.category) {
      const categorySimilarity =
        product1.category === product2.category ? 1 : 0;
      weightedScore += categorySimilarity * weights.category;
      totalWeight += weights.category;
    }

    return {
      overall: totalWeight > 0 ? weightedScore / totalWeight : 0,
      components: {
        name: name1 && name2 ? this.calculateStringSimilarity(name1, name2) : 0,
        sku: sku1 && sku2 ? this.calculateStringSimilarity(sku1, sku2) : 0,
        category:
          product1.category && product2.category
            ? product1.category === product2.category
              ? 1
              : 0
            : 0,
      },
    };
  }

  /**
   * Detect product patterns using enhanced pattern detection
   */
  async detectProductPatterns(groups) {
    // Safely extract all products from groups
    const allProducts = Array.isArray(groups)
      ? groups.flatMap((group) =>
          Array.isArray(group.products) ? group.products : []
        )
      : [];

    if (allProducts.length === 0) {
      return {
        variant_patterns: new Map(),
        naming_patterns: new Map(),
        classification_patterns: new Map(),
        statistics: {
          patterns_detected: 0,
          variant_groups: 0,
          confidence_distribution: {},
        },
      };
    }

    // Use the integrated pattern detection engine
    const patternResults = await this.patternEngine.detectPatterns(allProducts);

    if (!patternResults.success) {
      logger.error("Pattern detection failed:", patternResults.error);
      return {
        variant_patterns: new Map(),
        naming_patterns: new Map(),
        classification_patterns: new Map(),
        statistics: {
          patterns_detected: 0,
          variant_groups: 0,
          confidence_distribution: {},
        },
      };
    }

    return {
      variant_patterns: patternResults.results.variant_patterns,
      naming_patterns: patternResults.results.similarity_patterns,
      classification_patterns: patternResults.results.classification_patterns,
      feature_patterns: patternResults.results.feature_patterns,
      hierarchical_patterns: patternResults.results.hierarchical_patterns,
      statistics: patternResults.results.statistics,
      confidence: patternResults.results.confidence,
    };
  }

  /**
   * Generate intelligent suggestions based on all analysis
   */
  async generateIntelligentSuggestions(
    products,
    classificationResults,
    mergeResults,
    patternResults
  ) {
    const suggestions = {
      merging_suggestions: [],
      classification_suggestions: [],
      pattern_suggestions: [],
      optimization_suggestions: [],
    };

    // Generate merging suggestions
    suggestions.merging_suggestions =
      this.generateMergingSuggestions(mergeResults);

    // Generate classification suggestions
    suggestions.classification_suggestions =
      this.generateClassificationSuggestions(classificationResults);

    // Generate pattern suggestions
    suggestions.pattern_suggestions =
      this.generatePatternSuggestions(patternResults);

    // Generate optimization suggestions
    suggestions.optimization_suggestions = this.generateOptimizationSuggestions(
      products,
      classificationResults,
      mergeResults,
      patternResults
    );

    return suggestions;
  }

  /**
   * Helper Methods
   */

  extractPrimaryIdentifier(product) {
    return product.sku || product.barcode || product.stockCode || product.id;
  }

  extractName(product) {
    return product.name || product.title || product.productName;
  }

  enhanceClassificationWithContext(classification, product) {
    // Add product context to improve classification accuracy
    const context = {
      has_numeric_only: /^\d+$/.test(classification.input),
      has_platform_source: product.sourcePlatform,
      has_category: !!product.category,
      length: classification.input?.length || 0,
    };

    // Adjust confidence based on context
    let adjustedConfidence = classification.confidence;

    if (context.has_numeric_only && context.length >= 8) {
      // Likely barcode if numeric and 8+ digits
      if (classification.type === "barcode") {
        adjustedConfidence = Math.min(adjustedConfidence + 0.1, 1.0);
      }
    }

    return {
      ...classification,
      confidence: adjustedConfidence,
      context,
    };
  }

  normalizeSKU(sku) {
    if (!sku) return "";
    return sku.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  calculateStringSimilarity(str1, str2) {
    // Use Levenshtein distance for similarity calculation
    return this.productMergeService.calculateStringSimilarity(str1, str2);
  }

  calculateGroupConfidence(products, strategy) {
    // Calculate confidence based on grouping strategy and product consistency
    let baseConfidence = 0.5;

    switch (strategy) {
      case "sku":
        baseConfidence = 0.9;
        break;
      case "barcode":
        baseConfidence = 0.95;
        break;
      case "name":
        baseConfidence = 0.7;
        break;
    }

    // Adjust based on group size and consistency
    const sizeBonus = Math.min(products.length * 0.05, 0.2);
    const consistencyBonus = this.calculateGroupConsistency(products) * 0.1;

    return Math.min(baseConfidence + sizeBonus + consistencyBonus, 1.0);
  }

  calculateGroupConsistency(products) {
    // Calculate how consistent the products in a group are
    let consistency = 0;

    // Check category consistency
    const categories = new Set(products.map((p) => p.category).filter(Boolean));
    if (categories.size === 1) consistency += 0.3;

    // Check brand consistency
    const brands = new Set(products.map((p) => p.brand).filter(Boolean));
    if (brands.size === 1) consistency += 0.3;

    // Check price range consistency
    const prices = products
      .map((p) => parseFloat(p.price) || 0)
      .filter((p) => p > 0);
    if (prices.length > 1) {
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);
      const priceVariation = (maxPrice - minPrice) / maxPrice;
      if (priceVariation < 0.2) consistency += 0.4; // Prices within 20%
    }

    return Math.min(consistency, 1.0);
  }

  createIntelligentMergedProduct(group) {
    // Use existing merge service but enhance with intelligence metadata
    const mergedProduct = this.productMergeService.createMergedProduct(
      group.products
    );

    // Add intelligence metadata
    mergedProduct._intelligence = {
      grouping_strategy: group.grouping_strategy,
      group_confidence: group.confidence,
      source_count: group.products.length,
      classifications: group.products
        .map((p) => p._intelligence?.classification)
        .filter(Boolean),
      merge_timestamp: new Date().toISOString(),
    };

    return mergedProduct;
  }

  analyzeConfidenceDistribution(classifications) {
    const distribution = { high: 0, medium: 0, low: 0 };

    classifications.forEach((classification) => {
      if (classification.confidence >= 0.8) {
        distribution.high++;
      } else if (classification.confidence >= 0.5) {
        distribution.medium++;
      } else {
        distribution.low++;
      }
    });

    return distribution;
  }

  calculateUnifiedConfidence(
    classificationResults,
    mergeResults,
    patternResults
  ) {
    return {
      overall_confidence: this.calculateOverallConfidence(
        classificationResults,
        mergeResults,
        patternResults
      ),
      classification_confidence: this.calculateAverageConfidence(
        classificationResults.classifications
      ),
      merging_confidence: this.calculateMergingConfidence(mergeResults),
      pattern_confidence: this.calculatePatternConfidence(patternResults),
    };
  }

  updateStatistics(
    products,
    classificationResults,
    mergeResults,
    patternResults
  ) {
    this.statistics.products_processed += products.length;
    this.statistics.classifications_made +=
      classificationResults.statistics.total_classified;
    this.statistics.groups_created += mergeResults.groups.length;
    this.statistics.patterns_detected +=
      patternResults.statistics.patterns_detected;
    this.statistics.merge_operations++;
  }

  /**
   * Advanced Pattern Detection Methods
   */

  /**
   * Detect variant patterns using SKU classification results
   * Enhanced to handle both pre-processed and raw product data
   * @param {Array} products - Products to analyze
   * @param {Object} options - Detection options
   * @returns {Object} Detected variant patterns with metadata
   */
  /**
   * Detect variant patterns using SKU classification results
   * Enhanced to handle both pre-processed and raw product data
   * @param {Array} products - Products to analyze
   * @param {Object} options - Detection options
   * @returns {Object} Detected variant patterns with metadata
   */
  detectVariantPatterns(products, options = {}) {
    try {
      logger.info(
        `🔍 Starting variant pattern detection for ${products.length} products`
      );

      if (!Array.isArray(products) || products.length === 0) {
        return {
          detected_groups: [],
          total_products: 0,
          processing_time: 0,
          message: "No products provided for analysis",
        };
      }

      const startTime = Date.now();
      const variantGroups = [];
      const skuGroups = new Map();

      // Group products by normalized SKU patterns
      for (const product of products) {
        // Handle both pre-processed products (with _intelligence) and raw products
        let sku = null;
        let confidence = 1.0; // Default confidence for raw products

        if (
          product._intelligence?.identifier_type === "sku" &&
          product._intelligence.confidence > 0.7
        ) {
          // Pre-processed product with high confidence SKU classification
          sku = product._intelligence.primary_identifier;
          confidence = product._intelligence.confidence;
        } else if (product.sku && typeof product.sku === "string") {
          // Raw product with SKU field
          sku = product.sku;
          confidence = 0.8; // Assume moderate confidence for raw SKUs
        }

        if (sku && sku.trim().length > 0) {
          const baseSku = this.extractBaseSKUPattern(sku);

          if (baseSku && baseSku.length > 0) {
            if (!skuGroups.has(baseSku)) {
              skuGroups.set(baseSku, []);
            }
            skuGroups.get(baseSku).push({
              ...product,
              _detectionMeta: { sku, confidence, baseSku },
            });
          }
        }
      }

      logger.info(`📊 Found ${skuGroups.size} potential base SKU patterns`);

      // Analyze each group for variant patterns
      for (const [baseSku, groupProducts] of skuGroups) {
        if (groupProducts.length > 1) {
          const pattern = this.analyzeVariantPattern(groupProducts, baseSku);
          if (pattern.confidence > 0.5) {
            // Lowered threshold for better detection
            variantGroups.push(pattern);
            logger.info(
              `✅ Found variant group: ${baseSku} with ${groupProducts.length} products (confidence: ${pattern.confidence})`
            );
          }
        }
      }

      const processingTime = Date.now() - startTime;

      logger.info(
        `🎯 Variant detection completed: ${variantGroups.length} groups found in ${processingTime}ms`
      );

      return {
        detected_groups: variantGroups,
        total_products: products.length,
        processing_time: processingTime,
        base_patterns_analyzed: skuGroups.size,
        message: `Detected ${variantGroups.length} variant groups`,
      };
    } catch (error) {
      logger.error("Error in variant pattern detection:", error);
      return {
        detected_groups: [],
        total_products: products.length,
        processing_time: 0,
        error: error.message,
      };
    }
  }

  /**
   * Extract base SKU pattern for variant grouping
   * Enhanced to handle complex hierarchical patterns
   * @param {string} sku - SKU to analyze
   * @returns {string} Base SKU pattern
   */
  extractBaseSKUPattern(sku) {
    if (!sku) return "";

    // For complex patterns like "iPhone-15-Pro-Max", we need multiple strategies
    const separators = ["-", "_", ".", " "];

    for (const separator of separators) {
      if (sku.includes(separator)) {
        const parts = sku.split(separator);

        // Strategy 1: Try different base pattern lengths
        for (let baseLength = 1; baseLength < parts.length; baseLength++) {
          const potentialBase = parts.slice(0, baseLength).join(separator);

          // Check if this could be a meaningful base pattern
          if (this.isValidBasePattern(potentialBase, parts.slice(baseLength))) {
            return potentialBase;
          }
        }
      }
    }

    // Fallback: Use existing suffix removal logic
    const variantSuffixes = [
      /-[a-z]+$/i, // -red, -blue, -large
      /-\d+$/, // -1, -2, -001
      /-v\d+$/i, // -v1, -v2
      /_[a-z]+$/i, // _red, _blue
      /\.[a-z]+$/i, // .red, .blue
      /-Pro$/i, // -Pro
      /-Max$/i, // -Max
      /-Plus$/i, // -Plus
      /-Mini$/i, // -Mini
    ];

    let baseSku = sku;
    for (const suffix of variantSuffixes) {
      const match = baseSku.match(suffix);
      if (match) {
        baseSku = baseSku.replace(suffix, "");
        break;
      }
    }

    return baseSku;
  }

  /**
   * Check if a potential base pattern is valid
   * @param {string} basePattern - Potential base pattern
   * @param {Array} remainingParts - Remaining parts after base
   * @returns {boolean} Whether this is a valid base pattern
   */
  isValidBasePattern(basePattern, remainingParts) {
    if (!basePattern || remainingParts.length === 0) return false;

    // Base pattern should be meaningful (not just a single letter/number)
    if (basePattern.length < 2) return false;

    // Remaining parts should look like variants
    const variantIndicators = [
      "pro",
      "max",
      "plus",
      "mini",
      "lite",
      "ultra",
      "red",
      "blue",
      "green",
      "black",
      "white",
      "yellow",
      "orange",
      "xs",
      "s",
      "m",
      "l",
      "xl",
      "xxl",
      "small",
      "medium",
      "large",
      /^\d+$/, // Pure numbers
      /^v\d+$/i, // Version numbers
    ];

    const remainingText = remainingParts.join("-").toLowerCase();

    // Check if remaining parts contain variant indicators
    return variantIndicators.some((indicator) => {
      if (typeof indicator === "string") {
        return remainingText.includes(indicator);
      } else {
        return indicator.test(remainingText);
      }
    });
  }

  /**
   * Analyze variant pattern in a group of products
   * Enhanced to handle both pre-processed and raw products
   * @param {Array} products - Products in the group
   * @param {string} baseSku - Base SKU pattern
   * @returns {Object} Variant pattern analysis
   */
  analyzeVariantPattern(products, baseSku) {
    const variants = products.map((product) => {
      // Handle both pre-processed and raw products
      const sku =
        product._intelligence?.primary_identifier ||
        product._detectionMeta?.sku ||
        product.sku;
      const suffix = sku ? sku.replace(baseSku, "") : "";

      return {
        product,
        sku,
        suffix,
        variantType: this.detectVariantType(suffix),
      };
    });

    // Calculate pattern confidence
    const confidence = this.calculateVariantPatternConfidence(variants);

    return {
      id: `variant_${baseSku.replace(/[^a-zA-Z0-9]/g, "_")}`,
      baseSku,
      basePattern: baseSku,
      variants,
      products: products,
      confidence,
      variantTypes: [...new Set(variants.map((v) => v.variantType))],
      productCount: products.length,
      pattern_type: "sku_variant",
    };
  }

  /**
   * Detect variant type from suffix
   * @param {string} suffix - SKU suffix
   * @returns {string} Variant type
   */
  detectVariantType(suffix) {
    const cleanSuffix = suffix.toLowerCase().replace(/[-_.]/g, "");

    // Color variants
    const colors = [
      "red",
      "blue",
      "green",
      "black",
      "white",
      "yellow",
      "orange",
      "purple",
      "pink",
      "brown",
      "gray",
      "grey",
    ];
    if (colors.some((color) => cleanSuffix.includes(color))) return "color";

    // Size variants
    const sizes = [
      "xs",
      "s",
      "m",
      "l",
      "xl",
      "xxl",
      "small",
      "medium",
      "large",
      "mini",
      "max",
    ];
    if (sizes.some((size) => cleanSuffix.includes(size))) return "size";

    // Version variants
    if (/v?\d+$/.test(cleanSuffix) || cleanSuffix.includes("version"))
      return "version";

    // Numeric variants
    if (/^\d+$/.test(cleanSuffix)) return "numeric";

    return "generic";
  }

  /**
   * Calculate confidence for variant pattern
   * @param {Array} variants - Variant analysis
   * @returns {number} Confidence score
   */
  calculateVariantPatternConfidence(variants) {
    let confidence = 0.5;

    // Boost for consistent variant types
    const uniqueTypes = new Set(variants.map((v) => v.variantType));
    if (uniqueTypes.size === 1 && !uniqueTypes.has("generic")) {
      confidence += 0.3;
    }

    // Boost for logical progression (e.g., v1, v2, v3)
    if (this.hasLogicalProgression(variants)) {
      confidence += 0.2;
    }

    // Boost for group size
    confidence += Math.min(variants.length * 0.05, 0.2);

    return Math.min(confidence, 1.0);
  }

  /**
   * Check if variants follow logical progression
   * @param {Array} variants - Variant analysis
   * @returns {boolean} Has logical progression
   */
  hasLogicalProgression(variants) {
    const suffixes = variants.map((v) =>
      v.suffix.toLowerCase().replace(/[-_.]/g, "")
    );

    // Check for numeric progression
    const numbers = suffixes
      .filter((s) => /^\d+$/.test(s))
      .map(Number)
      .sort((a, b) => a - b);
    if (numbers.length > 1) {
      const isSequential = numbers.every(
        (num, i) => i === 0 || num === numbers[i - 1] + 1
      );
      if (isSequential) return true;
    }

    // Check for version progression
    const versions = suffixes
      .filter((s) => /^v?\d+$/.test(s))
      .map((s) => parseInt(s.replace("v", "")))
      .sort((a, b) => a - b);
    if (versions.length > 1) {
      const isSequential = versions.every(
        (num, i) => i === 0 || num === versions[i - 1] + 1
      );
      if (isSequential) return true;
    }

    return false;
  }

  /**
   * Detect naming patterns across products
   * @param {Array} products - Products to analyze
   * @returns {Array} Detected naming patterns
   */
  detectNamingPatterns(products) {
    const namingPatterns = [];
    const nameGroups = new Map();

    // Group by normalized names
    for (const product of products) {
      const normalizedName = this.normalizeProductName(
        this.extractName(product)
      );
      const baseName = this.extractBaseProductName(normalizedName);

      if (!nameGroups.has(baseName)) {
        nameGroups.set(baseName, []);
      }
      nameGroups.get(baseName).push(product);
    }

    // Analyze naming patterns
    for (const [baseName, groupProducts] of nameGroups) {
      if (groupProducts.length > 1) {
        const pattern = this.analyzeNamingPattern(groupProducts, baseName);
        if (pattern.confidence > 0.6) {
          namingPatterns.push(pattern);
        }
      }
    }

    return namingPatterns;
  }

  /**
   * Normalize product name for pattern analysis
   * @param {string} name - Product name
   * @returns {string} Normalized name
   */
  normalizeProductName(name) {
    if (!name) return "";

    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special chars except word chars, spaces, hyphens
      .replace(/\s+/g, " "); // Normalize whitespace
  }

  /**
   * Extract base product name by removing common variant indicators
   * @param {string} name - Normalized product name
   * @returns {string} Base product name
   */
  extractBaseProductName(name) {
    // Common patterns to remove
    const patterns = [
      /\s+(red|blue|green|black|white|yellow|orange|purple|pink|brown|gray|grey)$/,
      /\s+(xs|s|m|l|xl|xxl|small|medium|large|mini|max)$/,
      /\s+(v\d+|version\s+\d+)$/,
      /\s+\d+$/,
      /\s*-\s*(red|blue|green|black|white|yellow|orange|purple|pink|brown|gray|grey)$/,
      /\s*-\s*(xs|s|m|l|xl|xxl|small|medium|large|mini|max)$/,
    ];

    let baseName = name;
    for (const pattern of patterns) {
      baseName = baseName.replace(pattern, "");
    }

    return baseName.trim();
  }

  /**
   * Analyze naming pattern in a group
   * @param {Array} products - Products in group
   * @param {string} baseName - Base name
   * @returns {Object} Naming pattern analysis
   */
  analyzeNamingPattern(products, baseName) {
    const nameVariants = products.map((product) => {
      const fullName = this.normalizeProductName(this.extractName(product));
      const variant = fullName.replace(baseName, "").trim();
      return {
        product,
        variant,
        variantType: this.detectNameVariantType(variant),
      };
    });

    const confidence = this.calculateNamePatternConfidence(nameVariants);

    return {
      baseName,
      variants: nameVariants,
      confidence,
      variantTypes: [...new Set(nameVariants.map((v) => v.variantType))],
      productCount: products.length,
      pattern_type: "name_variant",
    };
  }

  /**
   * Detect variant type from name variant
   * @param {string} variant - Name variant part
   * @returns {string} Variant type
   */
  detectNameVariantType(variant) {
    const cleanVariant = variant.toLowerCase().replace(/[-_\s]/g, "");

    // Color detection
    const colors = [
      "red",
      "blue",
      "green",
      "black",
      "white",
      "yellow",
      "orange",
      "purple",
      "pink",
      "brown",
      "gray",
      "grey",
    ];
    if (colors.some((color) => cleanVariant.includes(color))) return "color";

    // Size detection
    const sizes = [
      "xs",
      "s",
      "m",
      "l",
      "xl",
      "xxl",
      "small",
      "medium",
      "large",
      "mini",
      "max",
    ];
    if (sizes.some((size) => cleanVariant.includes(size))) return "size";

    // Version detection
    if (/v?\d+/.test(cleanVariant) || cleanVariant.includes("version"))
      return "version";

    return "description";
  }

  /**
   * Calculate confidence for name pattern
   * @param {Array} nameVariants - Name variant analysis
   * @returns {number} Confidence score
   */
  calculateNamePatternConfidence(nameVariants) {
    let confidence = 0.4;

    // Boost for consistent variant types
    const uniqueTypes = new Set(nameVariants.map((v) => v.variantType));
    if (uniqueTypes.size === 1 && !uniqueTypes.has("description")) {
      confidence += 0.3;
    }

    // Boost for meaningful variants (not empty)
    const meaningfulVariants = nameVariants.filter((v) => v.variant.length > 0);
    confidence += (meaningfulVariants.length / nameVariants.length) * 0.2;

    // Boost for group size
    confidence += Math.min(nameVariants.length * 0.05, 0.15);

    return Math.min(confidence, 1.0);
  }

  /**
   * Detect classification patterns across products
   * @param {Array} products - Products to analyze
   * @returns {Array} Classification patterns
   */
  detectClassificationPatterns(products) {
    const classificationPatterns = [];
    const typeGroups = new Map();

    // Group by classification type and confidence
    for (const product of products) {
      const intelligence = product._intelligence;
      if (intelligence?.classification) {
        const key = `${intelligence.identifier_type}_${
          Math.floor(intelligence.confidence * 10) / 10
        }`;

        if (!typeGroups.has(key)) {
          typeGroups.set(key, {
            type: intelligence.identifier_type,
            confidenceRange: Math.floor(intelligence.confidence * 10) / 10,
            products: [],
          });
        }
        typeGroups.get(key).products.push(product);
      }
    }

    // Analyze classification patterns
    for (const [key, group] of typeGroups) {
      if (group.products.length > 1) {
        const pattern = this.analyzeClassificationPattern(group);
        classificationPatterns.push(pattern);
      }
    }

    return classificationPatterns;
  }

  /**
   * Analyze classification pattern in a group
   * @param {Object} group - Classification group
   * @returns {Object} Classification pattern
   */
  analyzeClassificationPattern(group) {
    const { type, confidenceRange, products } = group;

    // Find common characteristics
    const characteristics = this.findCommonCharacteristics(products);

    return {
      classification_type: type,
      confidence_range: confidenceRange,
      product_count: products.length,
      characteristics,
      pattern_type: "classification",
      confidence: confidenceRange,
    };
  }

  /**
   * Find common characteristics in a group of products
   * @param {Array} products - Products to analyze
   * @returns {Object} Common characteristics
   */
  findCommonCharacteristics(products) {
    const characteristics = {
      categories: new Set(),
      brands: new Set(),
      sourcePlatforms: new Set(),
      identifierLengths: [],
      hasNumericOnly: 0,
      hasAlphaNumeric: 0,
    };

    for (const product of products) {
      if (product.category) characteristics.categories.add(product.category);
      if (product.brand) characteristics.brands.add(product.brand);
      if (product.sourcePlatform)
        characteristics.sourcePlatforms.add(product.sourcePlatform);

      const identifier = this.extractPrimaryIdentifier(product);
      if (identifier) {
        characteristics.identifierLengths.push(identifier.length);
        if (/^\d+$/.test(identifier)) characteristics.hasNumericOnly++;
        if (/^(?=.*[a-zA-Z])(?=.*\d)/.test(identifier))
          characteristics.hasAlphaNumeric++;
      }
    }

    return {
      common_categories: Array.from(characteristics.categories),
      common_brands: Array.from(characteristics.brands),
      common_platforms: Array.from(characteristics.sourcePlatforms),
      avg_identifier_length:
        characteristics.identifierLengths.length > 0
          ? Math.round(
              characteristics.identifierLengths.reduce((a, b) => a + b, 0) /
                characteristics.identifierLengths.length
            )
          : 0,
      numeric_only_ratio: characteristics.hasNumericOnly / products.length,
      alpha_numeric_ratio: characteristics.hasAlphaNumeric / products.length,
    };
  }

  /**
   * Calculate group similarity metrics
   * @param {Array} products - Products in group
   * @returns {Object} Similarity metrics
   */
  calculateGroupSimilarityMetrics(products) {
    if (products.length < 2) return {};

    const metrics = {
      name_similarity: 0,
      sku_similarity: 0,
      category_consistency: 0,
      brand_consistency: 0,
      price_variance: 0,
    };

    let totalComparisons = 0;
    let nameSimilaritySum = 0;
    let skuSimilaritySum = 0;

    // Pairwise comparisons
    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const product1 = products[i];
        const product2 = products[j];

        // Name similarity
        const name1 = this.extractName(product1);
        const name2 = this.extractName(product2);
        if (name1 && name2) {
          nameSimilaritySum += this.calculateStringSimilarity(name1, name2);
        }

        // SKU similarity
        const sku1 = this.extractPrimaryIdentifier(product1);
        const sku2 = this.extractPrimaryIdentifier(product2);
        if (sku1 && sku2) {
          skuSimilaritySum += this.calculateStringSimilarity(sku1, sku2);
        }

        totalComparisons++;
      }
    }

    if (totalComparisons > 0) {
      metrics.name_similarity = nameSimilaritySum / totalComparisons;
      metrics.sku_similarity = skuSimilaritySum / totalComparisons;
    }

    // Category consistency
    const categories = new Set(products.map((p) => p.category).filter(Boolean));
    metrics.category_consistency =
      categories.size === 1 ? 1 : categories.size > 0 ? 1 / categories.size : 0;

    // Brand consistency
    const brands = new Set(products.map((p) => p.brand).filter(Boolean));
    metrics.brand_consistency =
      brands.size === 1 ? 1 : brands.size > 0 ? 1 / brands.size : 0;

    // Price variance
    const prices = products
      .map((p) => parseFloat(p.price) || 0)
      .filter((p) => p > 0);
    if (prices.length > 1) {
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance =
        prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) /
        prices.length;
      metrics.price_variance = variance / (avgPrice * avgPrice); // Coefficient of variation squared
    }

    return metrics;
  }

  /**
   * Group products by detected patterns using classification data
   * @param {Array} ungrouped - Ungrouped products
   * @param {Map} groups - Groups map to populate
   */
  groupByDetectedPatterns(ungrouped, groups) {
    // Detect variant patterns in remaining ungrouped products
    const variantPatternsResult = this.detectVariantPatterns(ungrouped);
    const variantPatterns = variantPatternsResult.detected_groups || [];

    for (const pattern of variantPatterns) {
      if (pattern.confidence > 0.7) {
        const groupKey = `pattern_${pattern.baseSku}`;

        // Safely extract products from variants
        const products =
          pattern.variants && Array.isArray(pattern.variants)
            ? pattern.variants.map((v) => v.product).filter((p) => p)
            : pattern.products || [];

        if (products.length > 0) {
          groups.set(groupKey, {
            products,
            grouping_strategy: "detected_pattern",
            confidence: pattern.confidence,
            pattern_info: {
              type: pattern.pattern_type,
              base_sku: pattern.baseSku,
              variant_types: pattern.variantTypes,
            },
          });

          // Remove grouped products from ungrouped
          if (pattern.variants && Array.isArray(pattern.variants)) {
            pattern.variants.forEach((variant) => {
              if (variant.product && variant.product.id) {
                const index = ungrouped.findIndex(
                  (p) => p.id === variant.product.id
                );
                if (index !== -1) ungrouped.splice(index, 1);
              }
            });
          }
        }
      }
    }
  }

  /**
   * Generate merging suggestions based on analysis results
   * @param {Object} mergeResults - Merge analysis results
   * @returns {Array} Merging suggestions
   */
  generateMergingSuggestions(mergeResults) {
    const suggestions = [];

    for (const group of mergeResults.groups) {
      if (group.products.length > 1) {
        const suggestion = {
          type: "merge",
          confidence: group.confidence,
          strategy: group.grouping_strategy,
          products: group.products,
          reason: this.generateMergeReason(group),
          potential_savings: this.calculateMergeSavings(group.products),
          action: "merge_products",
        };

        suggestions.push(suggestion);
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate merge reason explanation
   * @param {Object} group - Product group
   * @returns {string} Merge reason
   */
  generateMergeReason(group) {
    const { grouping_strategy, confidence } = group;
    const confidenceText =
      confidence > 0.9 ? "very high" : confidence > 0.7 ? "high" : "moderate";

    switch (grouping_strategy) {
      case "classified_sku":
        return `${confidenceText} confidence SKU-based grouping using enhanced classification`;
      case "classified_barcode":
        return `${confidenceText} confidence barcode-based grouping with exact match`;
      case "intelligent_name_similarity":
        return `${confidenceText} confidence name similarity with pattern context`;
      case "detected_pattern":
        return `${confidenceText} confidence pattern-based grouping`;
      default:
        return `${confidenceText} confidence similarity-based grouping`;
    }
  }

  /**
   * Calculate potential savings from merging
   * @param {Array} products - Products to merge
   * @returns {Object} Savings calculation
   */
  calculateMergeSavings(products) {
    return {
      duplicate_reduction: products.length - 1,
      storage_efficiency: `${(
        ((products.length - 1) / products.length) *
        100
      ).toFixed(1)}%`,
      management_simplification:
        products.length > 5 ? "high" : products.length > 2 ? "medium" : "low",
    };
  }

  /**
   * Generate classification suggestions
   * @param {Object} classificationResults - Classification results
   * @returns {Array} Classification suggestions
   */
  generateClassificationSuggestions(classificationResults) {
    const suggestions = [];

    // Handle null or undefined classificationResults
    if (!classificationResults) {
      logger.warn(
        "No classification results provided for suggestion generation"
      );
      return suggestions;
    }

    const { confidence_distribution, classifications } = classificationResults;

    // Additional validation for required properties
    if (!classifications || !confidence_distribution) {
      logger.warn(
        "Invalid classification results structure - missing required properties"
      );
      return suggestions;
    }

    // Suggest manual review for low confidence classifications
    const lowConfidenceProducts = Array.from(classifications.entries())
      .filter(([_, classification]) => classification.confidence < 0.6)
      .map(([productId, classification]) => ({ productId, classification }));

    if (lowConfidenceProducts.length > 0) {
      suggestions.push({
        type: "manual_review",
        confidence: 0.8,
        products: lowConfidenceProducts,
        reason: "Low confidence classifications need manual review",
        action: "review_classifications",
        count: lowConfidenceProducts.length,
      });
    }

    // Suggest pattern learning for consistent patterns
    const patternSuggestions =
      this.identifyLearningOpportunities(classifications);
    suggestions.push(...patternSuggestions);

    return suggestions;
  }

  /**
   * Identify learning opportunities from classifications
   * @param {Map} classifications - Classification results
   * @returns {Array} Learning suggestions
   */
  identifyLearningOpportunities(classifications) {
    const suggestions = [];
    const patternGroups = new Map();

    // Group by pattern characteristics
    for (const [productId, classification] of classifications) {
      const pattern = this.extractClassificationPattern(classification);

      if (!patternGroups.has(pattern)) {
        patternGroups.set(pattern, []);
      }
      patternGroups.get(pattern).push({ productId, classification });
    }

    // Find patterns with consistent high confidence
    for (const [pattern, group] of patternGroups) {
      if (group.length >= 3) {
        const avgConfidence =
          group.reduce((sum, item) => sum + item.classification.confidence, 0) /
          group.length;

        if (avgConfidence > 0.85) {
          suggestions.push({
            type: "pattern_learning",
            confidence: avgConfidence,
            pattern,
            count: group.length,
            reason: `Consistent pattern detected: ${pattern}`,
            action: "learn_pattern",
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Extract classification pattern for learning
   * @param {Object} classification - Classification result
   * @returns {string} Pattern key
   */
  extractClassificationPattern(classification) {
    const { input, type, confidence } = classification;
    const length = input?.length || 0;
    const isNumeric = /^\d+$/.test(input || "");
    const hasLetters = /[a-zA-Z]/.test(input || "");

    return `${type}_${length}_${isNumeric ? "num" : ""}${
      hasLetters ? "alpha" : ""
    }_${Math.floor(confidence * 10)}`;
  }

  /**
   * Generate pattern suggestions
   * @param {Object} patternResults - Pattern detection results
   * @returns {Array} Pattern suggestions
   */
  generatePatternSuggestions(patternResults) {
    const suggestions = [];

    // Variant pattern suggestions
    if (patternResults.variant_patterns) {
      for (const [key, pattern] of patternResults.variant_patterns) {
        if (pattern.confidence > 0.7) {
          suggestions.push({
            type: "variant_grouping",
            confidence: pattern.confidence,
            pattern: pattern.baseSku,
            products: pattern.variants.map((v) => v.product),
            reason: `Strong variant pattern detected for ${pattern.baseSku}`,
            action: "create_variant_group",
            variant_types: pattern.variantTypes,
          });
        }
      }
    }

    // Naming pattern suggestions
    if (patternResults.naming_patterns) {
      for (const [key, pattern] of patternResults.naming_patterns) {
        if (pattern.confidence > 0.6) {
          suggestions.push({
            type: "name_standardization",
            confidence: pattern.confidence,
            pattern: pattern.baseName,
            products: pattern.variants.map((v) => v.product),
            reason: `Naming pattern suggests standardization opportunity`,
            action: "standardize_names",
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate optimization suggestions
   * @param {Array} products - Original products
   * @param {Object} classificationResults - Classification results
   * @param {Object} mergeResults - Merge results
   * @param {Object} patternResults - Pattern results
   * @returns {Array} Optimization suggestions
   */
  generateOptimizationSuggestions(
    products,
    classificationResults,
    mergeResults,
    patternResults
  ) {
    const suggestions = [];

    // Data quality suggestions
    const dataQualitySuggestions = this.generateDataQualitySuggestions(
      products,
      classificationResults
    );
    suggestions.push(...dataQualitySuggestions);

    // Performance suggestions
    const performanceSuggestions = this.generatePerformanceSuggestions(
      mergeResults,
      patternResults
    );
    suggestions.push(...performanceSuggestions);

    // Learning suggestions
    const learningSuggestions = this.generateLearningSuggestions(
      classificationResults,
      patternResults
    );
    suggestions.push(...learningSuggestions);

    return suggestions;
  }

  /**
   * Generate data quality suggestions
   * @param {Array} products - Products
   * @param {Object} classificationResults - Classification results
   * @returns {Array} Data quality suggestions
   */
  generateDataQualitySuggestions(products, classificationResults) {
    const suggestions = [];

    // Missing identifiers
    const missingIdentifiers = products.filter(
      (p) => !this.extractPrimaryIdentifier(p)
    );
    if (missingIdentifiers.length > 0) {
      suggestions.push({
        type: "data_quality",
        subtype: "missing_identifiers",
        confidence: 1.0,
        count: missingIdentifiers.length,
        reason: "Products missing primary identifiers (SKU/barcode)",
        action: "add_identifiers",
        impact: "high",
      });
    }

    // Inconsistent naming
    const namingInconsistencies = this.detectNamingInconsistencies(products);
    if (namingInconsistencies.length > 0) {
      suggestions.push({
        type: "data_quality",
        subtype: "naming_inconsistencies",
        confidence: 0.8,
        count: namingInconsistencies.length,
        reason: "Inconsistent product naming patterns detected",
        action: "standardize_naming",
        impact: "medium",
      });
    }

    return suggestions;
  }

  /**
   * Detect naming inconsistencies
   * @param {Array} products - Products to analyze
   * @returns {Array} Inconsistencies found
   */
  detectNamingInconsistencies(products) {
    const inconsistencies = [];
    const namePatterns = new Map();

    for (const product of products) {
      const name = this.extractName(product);
      if (name) {
        const pattern = this.extractNamingPattern(name);

        if (!namePatterns.has(pattern)) {
          namePatterns.set(pattern, []);
        }
        namePatterns.get(pattern).push(product);
      }
    }

    // Find patterns with low consistency
    for (const [pattern, products] of namePatterns) {
      if (products.length > 1) {
        const consistency = this.calculateNamingConsistency(products);
        if (consistency < 0.7) {
          inconsistencies.push({
            pattern,
            products,
            consistency,
          });
        }
      }
    }

    return inconsistencies;
  }

  /**
   * Extract naming pattern
   * @param {string} name - Product name
   * @returns {string} Naming pattern
   */
  extractNamingPattern(name) {
    // Simplified pattern extraction based on structure
    const normalized = name.toLowerCase().trim();
    const hasNumbers = /\d/.test(normalized);
    const hasSpecialChars = /[^a-z0-9\s]/.test(normalized);
    const wordCount = normalized.split(/\s+/).length;

    return `${wordCount}words_${hasNumbers ? "num" : "nonum"}_${
      hasSpecialChars ? "special" : "nospecial"
    }`;
  }

  /**
   * Calculate naming consistency
   * @param {Array} products - Products with similar pattern
   * @returns {number} Consistency score
   */
  calculateNamingConsistency(products) {
    if (products.length < 2) return 1.0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const name1 = this.extractName(products[i]);
        const name2 = this.extractName(products[j]);
        if (name1 && name2) {
          totalSimilarity += this.calculateStringSimilarity(name1, name2);
          comparisons++;
        }
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Generate performance suggestions
   * @param {Object} mergeResults - Merge results
   * @param {Object} patternResults - Pattern results
   * @returns {Array} Performance suggestions
   */
  generatePerformanceSuggestions(mergeResults, patternResults) {
    const suggestions = [];

    // Merge efficiency
    if (mergeResults?.statistics?.reduction_percentage > 20) {
      suggestions.push({
        type: "performance",
        subtype: "merge_efficiency",
        confidence: 0.9,
        value: mergeResults.statistics.reduction_percentage,
        reason: `High merge potential: ${mergeResults.statistics.reduction_percentage}% reduction possible`,
        action: "implement_merging",
        impact: "high",
      });
    }

    // Pattern utilization
    const patternUtilization = this.calculatePatternUtilization(patternResults);
    if (patternUtilization < 0.5) {
      suggestions.push({
        type: "performance",
        subtype: "pattern_utilization",
        confidence: 0.7,
        value: patternUtilization,
        reason: "Low pattern utilization suggests optimization opportunities",
        action: "improve_pattern_detection",
        impact: "medium",
      });
    }

    return suggestions;
  }

  /**
   * Calculate pattern utilization
   * @param {Object} patternResults - Pattern results
   * @returns {number} Utilization score
   */
  calculatePatternUtilization(patternResults) {
    const totalPatterns =
      (patternResults.variant_patterns?.size || 0) +
      (patternResults.naming_patterns?.size || 0) +
      (patternResults.classification_patterns?.length || 0);

    const highConfidencePatterns = [
      ...(patternResults.variant_patterns?.values() || []),
      ...(patternResults.naming_patterns?.values() || []),
      ...(patternResults.classification_patterns || []),
    ].filter((pattern) => pattern.confidence > 0.7).length;

    return totalPatterns > 0 ? highConfidencePatterns / totalPatterns : 0;
  }

  /**
   * Generate learning suggestions
   * @param {Object} classificationResults - Classification results
   * @param {Object} patternResults - Pattern results
   * @returns {Array} Learning suggestions
   */
  generateLearningSuggestions(classificationResults, patternResults) {
    const suggestions = [];

    // Classification learning opportunities - with null safety
    const learningOpps =
      classificationResults?.statistics?.patterns_learned || 0;
    if (learningOpps > 0) {
      suggestions.push({
        type: "learning",
        subtype: "classification_patterns",
        confidence: 0.8,
        count: learningOpps,
        reason:
          "New classification patterns learned and available for future use",
        action: "review_learned_patterns",
        impact: "medium",
      });
    }

    // Pattern refinement opportunities
    const refinementOpps =
      this.identifyPatternRefinementOpportunities(patternResults);
    if (refinementOpps.length > 0) {
      suggestions.push({
        type: "learning",
        subtype: "pattern_refinement",
        confidence: 0.7,
        opportunities: refinementOpps,
        reason: "Pattern detection can be refined based on current results",
        action: "refine_patterns",
        impact: "low",
      });
    }

    return suggestions;
  }

  /**
   * Identify pattern refinement opportunities
   * @param {Object} patternResults - Pattern results
   * @returns {Array} Refinement opportunities
   */
  identifyPatternRefinementOpportunities(patternResults) {
    const opportunities = [];

    // Low confidence patterns that appear frequently
    const lowConfidencePatterns = [
      ...(patternResults.variant_patterns?.values() || []),
      ...(patternResults.naming_patterns?.values() || []),
    ].filter((pattern) => pattern.confidence < 0.7 && pattern.productCount > 2);

    opportunities.push(
      ...lowConfidencePatterns.map((pattern) => ({
        type: pattern.pattern_type,
        confidence: pattern.confidence,
        productCount: pattern.productCount,
        refinement: "increase_confidence_threshold",
      }))
    );

    return opportunities;
  }

  /**
   * Enhanced Confidence Calculation Methods
   */

  /**
   * Calculate overall confidence across all analysis
   * @param {Object} classificationResults - Classification results
   * @param {Object} mergeResults - Merge results
   * @param {Object} patternResults - Pattern results
   * @returns {number} Overall confidence score
   */
  calculateOverallConfidence(
    classificationResults,
    mergeResults,
    patternResults
  ) {
    const weights = {
      classification: 0.4,
      merging: 0.35,
      patterns: 0.25,
    };

    const classificationConf = this.calculateAverageConfidence(
      classificationResults.classifications
    );
    const mergingConf = this.calculateMergingConfidence(mergeResults);
    const patternConf = this.calculatePatternConfidence(patternResults);

    return (
      classificationConf * weights.classification +
      mergingConf * weights.merging +
      patternConf * weights.patterns
    );
  }

  /**
   * Calculate average confidence from classifications
   * @param {Map} classifications - Classification map
   * @returns {number} Average confidence
   */
  calculateAverageConfidence(classifications) {
    if (classifications.size === 0) return 0;

    let totalConfidence = 0;
    for (const [_, classification] of classifications) {
      totalConfidence += classification.confidence;
    }

    return totalConfidence / classifications.size;
  }

  /**
   * Calculate merging confidence
   * @param {Object} mergeResults - Merge results
   * @returns {number} Merging confidence
   */
  calculateMergingConfidence(mergeResults) {
    if (mergeResults.groups.length === 0) return 0;

    let totalConfidence = 0;
    let totalProducts = 0;

    for (const group of mergeResults.groups) {
      totalConfidence += group.confidence * group.products.length;
      totalProducts += group.products.length;
    }

    return totalProducts > 0 ? totalConfidence / totalProducts : 0;
  }

  /**
   * Calculate pattern confidence
   * @param {Object} patternResults - Pattern results
   * @returns {number} Pattern confidence
   */
  calculatePatternConfidence(patternResults) {
    const allPatterns = [
      ...(patternResults.variant_patterns?.values() || []),
      ...(patternResults.naming_patterns?.values() || []),
      ...(patternResults.classification_patterns || []),
    ];

    if (allPatterns.length === 0) return 0;

    let totalConfidence = 0;
    let totalWeight = 0;

    for (const pattern of allPatterns) {
      const weight = pattern.productCount || 1;
      totalConfidence += pattern.confidence * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalConfidence / totalWeight : 0;
  }
}

module.exports = UnifiedProductIntelligenceService;
