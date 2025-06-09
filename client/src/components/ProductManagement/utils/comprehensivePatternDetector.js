/**
 * Comprehensive Pattern Detection System
 *
 * Advanced pattern detection that unifies and enhances existing detection logic:
 * - Multi-layered pattern analysis (SKU, Name, Attributes, Hierarchical)
 * - Real-time and batch processing modes
 * - Machine learning-inspired similarity scoring
 * - Flexible configuration and pattern management
 * - Integration with both incoming and existing local data
 * - Performance optimization with caching and incremental updates
 *
 * @author AI Assistant
 * @version 3.0.0
 */

import EnhancedPatternDetector from "./enhancedPatternDetector.js";
import SKUVariantDetector from "./skuVariantDetector.js";

// Enhanced Pattern Categories
const PATTERN_CATEGORIES = {
  SKU_BASED: "sku_based",
  NAME_SIMILARITY: "name_similarity",
  ATTRIBUTE_BASED: "attribute_based",
  HIERARCHICAL: "hierarchical",
  CUSTOM: "custom",
  ML_DETECTED: "ml_detected",
};

// Pattern Confidence Levels
const CONFIDENCE_LEVELS = {
  VERY_HIGH: { min: 0.95, label: "Çok Yüksek", color: "green" },
  HIGH: { min: 0.85, label: "Yüksek", color: "blue" },
  MEDIUM: { min: 0.7, label: "Orta", color: "yellow" },
  LOW: { min: 0.5, label: "Düşük", color: "orange" },
  VERY_LOW: { min: 0, label: "Çok Düşük", color: "red" },
};

// Advanced variant indicators with weights
const ENHANCED_VARIANT_INDICATORS = {
  sizes: {
    patterns: [
      "xs",
      "xxs",
      "s",
      "m",
      "l",
      "xl",
      "xxl",
      "xxxl",
      "small",
      "medium",
      "large",
      "extra",
    ],
    weight: 0.9,
    category: "size",
  },
  colors: {
    patterns: [
      "black",
      "white",
      "red",
      "blue",
      "green",
      "yellow",
      "orange",
      "purple",
      "pink",
      "brown",
      "gray",
      "grey",
      "silver",
      "gold",
      "navy",
      "maroon",
      "siyah",
      "beyaz",
      "kırmızı",
      "mavi",
      "yeşil",
      "sarı",
      "turuncu",
      "mor",
    ],
    weight: 0.85,
    category: "color",
  },
  versions: {
    patterns: [
      "v1",
      "v2",
      "v3",
      "v4",
      "v5",
      "ver1",
      "ver2",
      "version1",
      "version2",
      "gen1",
      "gen2",
    ],
    weight: 0.8,
    category: "version",
  },
  materials: {
    patterns: [
      "cotton",
      "polyester",
      "wool",
      "silk",
      "denim",
      "leather",
      "metal",
      "plastic",
      "wood",
    ],
    weight: 0.75,
    category: "material",
  },
  types: {
    patterns: [
      "a",
      "b",
      "c",
      "d",
      "type1",
      "type2",
      "model1",
      "model2",
      "pro",
      "basic",
      "premium",
    ],
    weight: 0.7,
    category: "type",
  },
  languages: {
    patterns: [
      "tr",
      "en",
      "de",
      "fr",
      "es",
      "turkish",
      "english",
      "german",
      "french",
    ],
    weight: 0.6,
    category: "language",
  },
};

class ComprehensivePatternDetector {
  constructor(options = {}) {
    // Initialize sub-detectors
    this.skuDetector = new SKUVariantDetector();
    this.enhancedDetector = new EnhancedPatternDetector();

    // Configuration
    this.config = {
      enableSKUDetection: true,
      enableNameSimilarity: true,
      enableAttributeDetection: true,
      enableHierarchicalDetection: true,
      enableMLDetection: options.enableML || false,

      // Thresholds
      minConfidenceThreshold: options.minConfidence || 0.5,
      skuSimilarityThreshold: options.skuThreshold || 0.8,
      nameSimilarityThreshold: options.nameThreshold || 0.7,
      attributeSimilarityThreshold: options.attributeThreshold || 0.6,

      // Performance
      enableCaching: true,
      batchSize: options.batchSize || 100,
      maxProcessingTime: options.maxTime || 30000, // 30 seconds

      // Data handling
      enableIncrementalUpdates: true,
      enableRealTimeProcessing: options.realTime || false,

      ...options,
    };

    // State management
    this.cache = new Map();
    this.patterns = new Map();
    this.statistics = this.initializeStatistics();
    this.processingQueue = [];
    this.isProcessing = false;

    // Pattern learning
    this.learnedPatterns = new Map();
    this.userFeedback = new Map();

    this.init();
  }

  /**
   * Initialize the detector
   */
  init() {
    this.loadStoredPatterns();
    this.setupEventListeners();

    if (this.config.enableRealTimeProcessing) {
      this.startRealTimeProcessing();
    }
  }

  /**
   * Initialize statistics tracking
   */
  initializeStatistics() {
    return {
      totalProcessed: 0,
      patternsDetected: 0,
      groupsCreated: 0,
      suggestionsGenerated: 0,
      processingTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      confidenceDistribution: {},
      categoryDistribution: {},
      lastProcessed: null,
      performance: {
        averageProcessingTime: 0,
        maxProcessingTime: 0,
        minProcessingTime: Infinity,
      },
    };
  }

  /**
   * Main analysis method - comprehensive pattern detection
   * @param {Array} products - Products to analyze
   * @param {Object} options - Analysis options
   * @returns {Object} - Complete analysis results
   */
  async analyzeProducts(products, options = {}) {
    const startTime = Date.now();

    try {
      // Validate input
      if (!Array.isArray(products) || products.length === 0) {
        return this.getEmptyResults();
      }

      // Prepare analysis context
      const analysisContext = {
        products,
        options: { ...this.config, ...options },
        timestamp: Date.now(),
        requestId: this.generateRequestId(),
      };

      // Check cache first
      const cacheKey = this.generateCacheKey(products, options);
      if (this.config.enableCaching && this.cache.has(cacheKey)) {
        this.statistics.cacheHits++;
        return this.cache.get(cacheKey);
      }

      this.statistics.cacheMisses++;

      // Initialize results structure
      const results = {
        groups: new Map(),
        suggestions: [],
        patterns: new Map(),
        statistics: { ...this.statistics },
        insights: [],
        recommendations: [],
        confidence: {},
        metadata: {
          processedAt: new Date().toISOString(),
          processingTime: 0,
          productCount: products.length,
          detectionMethods: [],
        },
      };

      // Multi-layer pattern detection
      await this.performMultiLayerDetection(products, results, analysisContext);

      // Merge and consolidate results
      await this.consolidateResults(results, analysisContext);

      // Generate insights and recommendations
      await this.generateInsights(results, analysisContext);

      // Update statistics
      const processingTime = Date.now() - startTime;
      this.updateStatistics(processingTime, results);

      // Cache results
      if (this.config.enableCaching) {
        this.cache.set(cacheKey, results);
      }

      return results;
    } catch (error) {
      console.error("Error in comprehensive pattern analysis:", error);
      return this.getErrorResults(error);
    }
  }

  /**
   * Perform multi-layer pattern detection
   * @param {Array} products - Products to analyze
   * @param {Object} results - Results object to populate
   * @param {Object} context - Analysis context
   */
  async performMultiLayerDetection(products, results, context) {
    const detectionMethods = [];

    // Layer 1: SKU-based detection
    if (this.config.enableSKUDetection) {
      await this.performSKUDetection(products, results, context);
      detectionMethods.push("SKU-based");
    }

    // Layer 2: Enhanced pattern detection
    if (
      this.config.enableNameSimilarity ||
      this.config.enableHierarchicalDetection
    ) {
      await this.performEnhancedDetection(products, results, context);
      detectionMethods.push("Enhanced patterns");
    }

    // Layer 3: Attribute-based detection
    if (this.config.enableAttributeDetection) {
      await this.performAttributeDetection(products, results, context);
      detectionMethods.push("Attribute-based");
    }

    // Layer 4: ML-inspired detection
    if (this.config.enableMLDetection) {
      await this.performMLDetection(products, results, context);
      detectionMethods.push("ML-inspired");
    }

    // Layer 5: Custom pattern detection
    await this.performCustomPatternDetection(products, results, context);
    detectionMethods.push("Custom patterns");

    results.metadata.detectionMethods = detectionMethods;
  }

  /**
   * SKU-based detection layer
   */
  async performSKUDetection(products, results, context) {
    try {
      const skuAnalysis = this.skuDetector.analyzeProducts(products);

      // Process SKU groups
      for (const [baseSKU, groupProducts] of skuAnalysis.groups) {
        const group = {
          id: this.generateGroupId(),
          basePattern: baseSKU,
          type: PATTERN_CATEGORIES.SKU_BASED,
          products: groupProducts,
          confidence: this.calculateSKUGroupConfidence(groupProducts),
          metadata: {
            detectionMethod: "SKU pattern analysis",
            baseSKU,
            variantCount: groupProducts.length - 1,
          },
        };

        results.groups.set(group.id, group);
      }

      // Process SKU suggestions
      for (const [key, suggestion] of skuAnalysis.suggestions) {
        results.suggestions.push({
          id: this.generateSuggestionId(),
          type: PATTERN_CATEGORIES.SKU_BASED,
          products: suggestion.products,
          confidence: suggestion.similarity,
          reason: suggestion.reason,
          metadata: {
            detectionMethod: "SKU similarity",
            originalKey: key,
          },
        });
      }
    } catch (error) {
      console.error("SKU detection error:", error);
    }
  }

  /**
   * Enhanced pattern detection layer
   */
  async performEnhancedDetection(products, results, context) {
    try {
      const enhancedAnalysis = this.enhancedDetector.analyzeProducts(products);

      // Process enhanced groups
      for (const [basePattern, group] of enhancedAnalysis.skuBasedGroups) {
        const enhancedGroup = {
          id: this.generateGroupId(),
          basePattern,
          type: PATTERN_CATEGORIES.HIERARCHICAL,
          products: group.products,
          confidence: group.confidence,
          metadata: {
            detectionMethod: "Enhanced pattern analysis",
            patternType: group.patternType,
            insights: group.insights || [],
          },
        };

        results.groups.set(enhancedGroup.id, enhancedGroup);
      }

      // Process name similarity groups
      for (const [key, group] of enhancedAnalysis.nameSimilarityGroups) {
        const nameGroup = {
          id: this.generateGroupId(),
          basePattern: key,
          type: PATTERN_CATEGORIES.NAME_SIMILARITY,
          products: group.products,
          confidence: group.confidence,
          metadata: {
            detectionMethod: "Name similarity analysis",
            similarityScore: group.similarityScore,
          },
        };

        results.groups.set(nameGroup.id, nameGroup);
      }
    } catch (error) {
      console.error("Enhanced detection error:", error);
    }
  }

  /**
   * Attribute-based detection layer
   */
  async performAttributeDetection(products, results, context) {
    try {
      const attributeGroups = new Map();

      // Group by extracted attributes
      for (const product of products) {
        const attributes = this.extractProductAttributes(product);

        if (Object.keys(attributes).length > 0) {
          const attributeKey = this.generateAttributeKey(attributes);

          if (!attributeGroups.has(attributeKey)) {
            attributeGroups.set(attributeKey, {
              products: [],
              attributes,
              confidence: 0,
            });
          }

          attributeGroups.get(attributeKey).products.push(product);
        }
      }

      // Convert to result format
      for (const [key, group] of attributeGroups) {
        if (group.products.length > 1) {
          const attributeGroup = {
            id: this.generateGroupId(),
            basePattern: key,
            type: PATTERN_CATEGORIES.ATTRIBUTE_BASED,
            products: group.products,
            confidence: this.calculateAttributeGroupConfidence(group),
            metadata: {
              detectionMethod: "Attribute-based analysis",
              attributes: group.attributes,
              attributeCount: Object.keys(group.attributes).length,
            },
          };

          results.groups.set(attributeGroup.id, attributeGroup);
        }
      }
    } catch (error) {
      console.error("Attribute detection error:", error);
    }
  }

  /**
   * ML-inspired detection layer
   */
  async performMLDetection(products, results, context) {
    try {
      // Feature extraction
      const features = products.map((product) =>
        this.extractMLFeatures(product)
      );

      // Clustering-inspired grouping
      const clusters = await this.performFeatureClustering(features, products);

      // Convert clusters to groups
      for (const cluster of clusters) {
        if (cluster.products.length > 1) {
          const mlGroup = {
            id: this.generateGroupId(),
            basePattern: cluster.centroid,
            type: PATTERN_CATEGORIES.ML_DETECTED,
            products: cluster.products,
            confidence: cluster.confidence,
            metadata: {
              detectionMethod: "ML-inspired clustering",
              features: cluster.features,
              clusterSize: cluster.products.length,
            },
          };

          results.groups.set(mlGroup.id, mlGroup);
        }
      }
    } catch (error) {
      console.error("ML detection error:", error);
    }
  }

  /**
   * Custom pattern detection layer
   */
  async performCustomPatternDetection(products, results, context) {
    try {
      // Apply learned patterns
      for (const [patternKey, patternConfig] of this.learnedPatterns) {
        const matches = await this.applyCustomPattern(products, patternConfig);

        if (matches.length > 0) {
          const customGroup = {
            id: this.generateGroupId(),
            basePattern: patternKey,
            type: PATTERN_CATEGORIES.CUSTOM,
            products: matches,
            confidence: patternConfig.confidence,
            metadata: {
              detectionMethod: "Custom learned pattern",
              patternConfig,
              learnedFrom: patternConfig.source,
            },
          };

          results.groups.set(customGroup.id, customGroup);
        }
      }
    } catch (error) {
      console.error("Custom pattern detection error:", error);
    }
  }

  /**
   * Consolidate results from multiple detection layers
   */
  async consolidateResults(results, context) {
    // Remove duplicates and merge overlapping groups
    const consolidatedGroups = new Map();
    const processedProducts = new Set();

    // Sort groups by confidence
    const sortedGroups = Array.from(results.groups.values()).sort(
      (a, b) => b.confidence - a.confidence
    );

    for (const group of sortedGroups) {
      const uniqueProducts = group.products.filter(
        (product) => !processedProducts.has(product.id)
      );

      if (uniqueProducts.length > 1) {
        // Mark products as processed
        uniqueProducts.forEach((product) => processedProducts.add(product.id));

        // Create consolidated group
        const consolidatedGroup = {
          ...group,
          products: uniqueProducts,
          metadata: {
            ...group.metadata,
            consolidatedAt: new Date().toISOString(),
            originalGroupCount: 1,
          },
        };

        consolidatedGroups.set(group.id, consolidatedGroup);
      }
    }

    results.groups = consolidatedGroups;

    // Filter suggestions to avoid duplicates with groups
    results.suggestions = results.suggestions.filter((suggestion) => {
      return !suggestion.products.some((product) =>
        processedProducts.has(product.id)
      );
    });
  }

  /**
   * Generate insights and recommendations
   */
  async generateInsights(results, context) {
    const insights = [];
    const recommendations = [];

    // Analyze group distribution
    const groupsByType = new Map();
    for (const group of results.groups.values()) {
      const type = group.type;
      if (!groupsByType.has(type)) {
        groupsByType.set(type, []);
      }
      groupsByType.get(type).push(group);
    }

    // Generate type-specific insights
    for (const [type, groups] of groupsByType) {
      insights.push({
        type: "pattern_distribution",
        category: type,
        message: `${groups.length} group detected using ${type} analysis`,
        confidence: this.calculateAverageConfidence(groups),
        data: {
          groupCount: groups.length,
          productCount: groups.reduce((sum, g) => sum + g.products.length, 0),
        },
      });
    }

    // Generate recommendations
    if (results.suggestions.length > 5) {
      recommendations.push({
        type: "suggestion_management",
        priority: "medium",
        message: `Consider reviewing ${results.suggestions.length} suggestions for manual grouping`,
        action: "review_suggestions",
      });
    }

    const highConfidenceGroups = Array.from(results.groups.values()).filter(
      (g) => g.confidence > 0.9
    );

    if (highConfidenceGroups.length > 0) {
      recommendations.push({
        type: "auto_apply",
        priority: "high",
        message: `${highConfidenceGroups.length} high-confidence groups ready for automatic application`,
        action: "auto_apply_groups",
        data: { groupIds: highConfidenceGroups.map((g) => g.id) },
      });
    }

    results.insights = insights;
    results.recommendations = recommendations;
  }

  /**
   * Extract product attributes for analysis
   */
  extractProductAttributes(product) {
    const attributes = {};

    // Extract from product properties
    if (product.color) attributes.color = product.color.toLowerCase();
    if (product.size) attributes.size = product.size.toLowerCase();
    if (product.material) attributes.material = product.material.toLowerCase();
    if (product.brand) attributes.brand = product.brand.toLowerCase();
    if (product.category) attributes.category = product.category.toLowerCase();

    // Extract from name
    const nameAttributes = this.extractAttributesFromText(product.name);
    Object.assign(attributes, nameAttributes);

    // Extract from SKU
    const skuAttributes = this.extractAttributesFromText(product.sku);
    Object.assign(attributes, skuAttributes);

    // Extract from description
    if (product.description) {
      const descAttributes = this.extractAttributesFromText(
        product.description
      );
      Object.assign(attributes, descAttributes);
    }

    return attributes;
  }

  /**
   * Extract attributes from text using pattern matching
   */
  extractAttributesFromText(text) {
    if (!text) return {};

    const attributes = {};
    const lowerText = text.toLowerCase();

    // Check for variant indicators
    for (const [, config] of Object.entries(ENHANCED_VARIANT_INDICATORS)) {
      for (const pattern of config.patterns) {
        if (lowerText.includes(pattern)) {
          attributes[config.category] = pattern;
          break;
        }
      }
    }

    return attributes;
  }

  /**
   * Calculate confidence for different group types
   */
  calculateSKUGroupConfidence(products) {
    let confidence = 0.8; // Base confidence for SKU matching

    // Boost confidence based on group size
    if (products.length > 5) confidence += 0.1;
    if (products.length > 10) confidence += 0.05;

    // Check for consistent patterns
    const variants = products.filter((p) => p.isVariant);
    if (variants.length > 0) {
      const variantTypeConsistency =
        this.calculateVariantTypeConsistency(variants);
      confidence += variantTypeConsistency * 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  calculateAttributeGroupConfidence(group) {
    let confidence = 0.6; // Base confidence for attribute matching

    // Boost based on number of matching attributes
    const attributeCount = Object.keys(group.attributes).length;
    confidence += Math.min(attributeCount * 0.1, 0.3);

    // Boost based on group size
    if (group.products.length > 3) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * ML feature extraction for products
   */
  extractMLFeatures(product) {
    return {
      id: product.id,
      nameLength: product.name ? product.name.length : 0,
      skuLength: product.sku ? product.sku.length : 0,
      priceRange: this.getPriceRange(product.price),
      hasImages: product.images && product.images.length > 0,
      categoryHash: this.hashString(product.category || ""),
      brandHash: this.hashString(product.brand || ""),
      nameTokens: this.tokenizeString(product.name || ""),
      skuTokens: this.tokenizeString(product.sku || ""),
    };
  }

  /**
   * Simple clustering implementation
   */
  async performFeatureClustering(features, products) {
    const clusters = [];
    const processed = new Set();

    for (let i = 0; i < features.length; i++) {
      if (processed.has(i)) continue;

      const cluster = {
        centroid: features[i],
        products: [products[i]],
        features: [features[i]],
        confidence: 0.5,
      };

      // Find similar products
      for (let j = i + 1; j < features.length; j++) {
        if (processed.has(j)) continue;

        const similarity = this.calculateFeatureSimilarity(
          features[i],
          features[j]
        );
        if (similarity > 0.7) {
          cluster.products.push(products[j]);
          cluster.features.push(features[j]);
          processed.add(j);
        }
      }

      if (cluster.products.length > 1) {
        cluster.confidence = this.calculateClusterConfidence(cluster);
        clusters.push(cluster);
      }

      processed.add(i);
    }

    return clusters;
  }

  /**
   * Feature similarity calculation
   */
  calculateFeatureSimilarity(feature1, feature2) {
    let similarity = 0;
    let factors = 0;

    // Compare numerical features
    if (Math.abs(feature1.nameLength - feature2.nameLength) < 10) {
      similarity += 0.1;
    }
    factors += 0.1;

    if (Math.abs(feature1.skuLength - feature2.skuLength) < 5) {
      similarity += 0.1;
    }
    factors += 0.1;

    if (feature1.priceRange === feature2.priceRange) {
      similarity += 0.2;
    }
    factors += 0.2;

    if (feature1.categoryHash === feature2.categoryHash) {
      similarity += 0.3;
    }
    factors += 0.3;

    if (feature1.brandHash === feature2.brandHash) {
      similarity += 0.2;
    }
    factors += 0.2;

    // Token similarity
    const tokenSimilarity = this.calculateTokenSimilarity(
      feature1.nameTokens,
      feature2.nameTokens
    );
    similarity += tokenSimilarity * 0.1;
    factors += 0.1;

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Utility methods
   */
  generateRequestId() {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateGroupId() {
    return `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSuggestionId() {
    return `suggestion-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  generateCacheKey(products, options) {
    const productIds = products
      .map((p) => p.id)
      .sort()
      .join(",");
    const optionsHash = this.hashString(JSON.stringify(options));
    return `${productIds}-${optionsHash}`;
  }

  generateAttributeKey(attributes) {
    return Object.entries(attributes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join("|");
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  tokenizeString(str) {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 1);
  }

  getPriceRange(price) {
    if (!price) return "unknown";
    if (price < 50) return "low";
    if (price < 200) return "medium";
    if (price < 500) return "high";
    return "premium";
  }

  calculateTokenSimilarity(tokens1, tokens2) {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  calculateAverageConfidence(groups) {
    if (groups.length === 0) return 0;
    const sum = groups.reduce((acc, group) => acc + group.confidence, 0);
    return sum / groups.length;
  }

  calculateVariantTypeConsistency(variants) {
    const types = variants.map((v) => v.variantType);
    const uniqueTypes = new Set(types);
    return uniqueTypes.size / types.length;
  }

  calculateClusterConfidence(cluster) {
    // Base confidence
    let confidence = 0.5;

    // Boost based on cluster size
    confidence += Math.min(cluster.products.length * 0.05, 0.2);

    // Boost based on feature consistency
    const featureConsistency = this.calculateFeatureConsistency(
      cluster.features
    );
    confidence += featureConsistency * 0.3;

    return Math.min(confidence, 1.0);
  }

  calculateFeatureConsistency(features) {
    // Simplified consistency calculation
    if (features.length < 2) return 0;

    let consistency = 0;
    const first = features[0];

    for (let i = 1; i < features.length; i++) {
      consistency += this.calculateFeatureSimilarity(first, features[i]);
    }

    return consistency / (features.length - 1);
  }

  updateStatistics(processingTime, results) {
    // Ensure results and required properties exist
    if (!results || !results.metadata) {
      console.warn("Invalid results object passed to updateStatistics");
      return;
    }

    const productCount = results.metadata.productCount || 0;
    const groupsSize = results.groups ? results.groups.size || 0 : 0;
    const suggestionsLength = results.suggestions
      ? results.suggestions.length || 0
      : 0;

    this.statistics.totalProcessed += productCount;
    this.statistics.patternsDetected += groupsSize;
    this.statistics.suggestionsGenerated += suggestionsLength;
    this.statistics.processingTime += processingTime;
    this.statistics.lastProcessed = new Date().toISOString();

    // Update performance metrics
    this.statistics.performance.maxProcessingTime = Math.max(
      this.statistics.performance.maxProcessingTime,
      processingTime
    );
    this.statistics.performance.minProcessingTime = Math.min(
      this.statistics.performance.minProcessingTime,
      processingTime
    );
    this.statistics.performance.averageProcessingTime =
      this.statistics.processingTime / this.statistics.totalProcessed;
  }

  getEmptyResults() {
    return {
      groups: new Map(),
      suggestions: [],
      patterns: new Map(),
      statistics: this.statistics,
      insights: [],
      recommendations: [],
      confidence: {},
      metadata: {
        processedAt: new Date().toISOString(),
        processingTime: 0,
        productCount: 0,
        detectionMethods: [],
      },
    };
  }

  getErrorResults(error) {
    return {
      ...this.getEmptyResults(),
      error: {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Additional methods for pattern management, caching, etc.
  loadStoredPatterns() {
    try {
      const stored = localStorage.getItem(
        "comprehensivePatternDetector_patterns"
      );
      if (stored) {
        const patterns = JSON.parse(stored);
        this.learnedPatterns = new Map(patterns);
      }
    } catch (error) {
      console.warn("Failed to load stored patterns:", error);
    }
  }

  savePatterns() {
    try {
      const patterns = Array.from(this.learnedPatterns.entries());
      localStorage.setItem(
        "comprehensivePatternDetector_patterns",
        JSON.stringify(patterns)
      );
    } catch (error) {
      console.warn("Failed to save patterns:", error);
    }
  }

  setupEventListeners() {
    // Setup any necessary event listeners
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.savePatterns();
      });
    }
  }

  startRealTimeProcessing() {
    // Implementation for real-time processing
    console.log("Real-time processing started");
  }

  async applyCustomPattern(products, patternConfig) {
    // Implementation for applying custom patterns
    return [];
  }

  /**
   * Main analysis method used by EnhancedProductTableWithVariants
   * @param {Array} products - Array of product objects to analyze
   * @param {Object} config - Configuration for pattern detection
   * @returns {Object} Analysis results with patterns, suggestions, and statistics
   */
  analyzePatterns(products, config = {}) {
    try {
      const startTime = Date.now();

      // Validate input
      if (!Array.isArray(products)) {
        console.warn("analyzePatterns: products must be an array");
        return this.getEmptyResults();
      }

      // Run comprehensive analysis with the provided configuration
      const analysisOptions = {
        sensitivity: config.sensitivity || 0.8,
        enableMultiLanguage: config.enableMultiLanguage !== false,
        enableBrandGrouping: config.enableBrandGrouping !== false,
        enableSizeColorVariants: config.enableSizeColorVariants !== false,
        minGroupSize: config.minGroupSize || 2,
        ...config,
      };

      // Perform the comprehensive analysis
      const results = this.analyzeProducts(products, analysisOptions);

      // Ensure results have the expected structure
      if (!results || typeof results !== "object") {
        console.warn("analyzeProducts returned invalid results");
        return this.getEmptyResults();
      }

      // Ensure results.groups exists and is iterable
      if (!results.groups) {
        results.groups = new Map();
      }

      // Generate suggestions based on detected patterns
      const suggestions = this.generateSuggestions(results, analysisOptions);

      // Calculate processing statistics
      const processingTime = Date.now() - startTime;
      this.updateStatistics(processingTime, results);

      // Cache results if enabled
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(products, analysisOptions);
        this.cache.set(cacheKey, {
          results,
          suggestions,
          timestamp: Date.now(),
        });
      }

      return {
        patterns: Array.from(results.groups || new Map()),
        suggestions: suggestions || [],
        statistics: {
          ...(results.statistics || {}),
          processingTime,
          analysisOptions,
        },
        confidence: results.confidence || {},
        metadata: {
          ...(results.metadata || {}),
          configUsed: analysisOptions,
        },
      };
    } catch (error) {
      console.error("Error in analyzePatterns:", error);
      return this.getErrorResults(error);
    }
  }

  /**
   * Learn from user actions to improve future pattern detection
   * @param {Object} actionData - Data about the user's action
   */
  learnFromUserAction(actionData) {
    try {
      const { action, timestamp = Date.now(), ...data } = actionData;

      // Store the learning data
      const learningKey = `${action}_${timestamp}`;
      const learningEntry = {
        action,
        timestamp,
        data,
        sessionId: this.generateSessionId(),
      };

      this.learnedPatterns.set(learningKey, learningEntry);

      // Process different types of user actions
      switch (action) {
        case "suggestion_accepted":
          this.processAcceptedSuggestion(data);
          break;

        case "suggestion_rejected":
          this.processRejectedSuggestion(data);
          break;

        case "manual_group_created":
          this.processManualGrouping(data);
          break;

        case "patterns_applied":
          this.processAppliedPatterns(data);
          break;

        default:
          console.log("Unknown user action for learning:", action);
      }

      // Update confidence adjustments based on feedback
      this.updateConfidenceAdjustments(actionData);

      // Save patterns periodically
      if (this.learnedPatterns.size % 10 === 0) {
        this.savePatterns();
      }

      console.log(`Learned from user action: ${action}`, data);
    } catch (error) {
      console.error("Error in learnFromUserAction:", error);
    }
  }

  /**
   * Generate suggestions from analysis results
   * @param {Object} results - Analysis results
   * @param {Object} options - Analysis options
   * @returns {Array} Array of suggestions
   */
  generateSuggestions(results, options) {
    const suggestions = [];

    try {
      // Validate input parameters
      if (!results || !results.groups) {
        console.warn("Invalid results object passed to generateSuggestions");
        return suggestions;
      }

      // Ensure results.groups is iterable (Map or array)
      let groupsIterable;
      if (results.groups instanceof Map) {
        groupsIterable = results.groups;
      } else if (Array.isArray(results.groups)) {
        groupsIterable = new Map(results.groups);
      } else if (typeof results.groups === "object") {
        groupsIterable = new Map(Object.entries(results.groups));
      } else {
        console.warn("results.groups is not iterable:", typeof results.groups);
        return suggestions;
      }

      // Generate suggestions from detected groups
      for (const [groupKey, group] of groupsIterable) {
        if (
          group &&
          group.products &&
          Array.isArray(group.products) &&
          group.products.length >= (options?.minGroupSize || 2)
        ) {
          const confidence = this.calculateGroupConfidence(group);

          // Only suggest groups with reasonable confidence
          if (confidence >= (options.sensitivity || 0.8)) {
            suggestions.push({
              id: `suggestion-${suggestions.length}`,
              type: "pattern-based",
              groupKey,
              products: group.products,
              confidence,
              reason: this.generateSuggestionReason(group),
              pattern: group.pattern,
              source: "comprehensive",
            });
          }
        }
      }

      // Sort suggestions by confidence
      suggestions.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    } catch (error) {
      console.error("Error generating suggestions:", error);
    }

    return suggestions;
  }

  /**
   * Process accepted suggestion for learning
   * @param {Object} data - Suggestion data
   */
  processAcceptedSuggestion(data) {
    if (data.suggestion && data.confidence) {
      // Increase confidence for similar patterns
      const patternKey = this.extractPatternKey(data.suggestion);
      this.adjustPatternConfidence(patternKey, 0.1); // Increase confidence
    }
  }

  /**
   * Process rejected suggestion for learning
   * @param {Object} data - Suggestion data
   */
  processRejectedSuggestion(data) {
    if (data.suggestion) {
      // Decrease confidence for similar patterns
      const patternKey = this.extractPatternKey(data.suggestion);
      this.adjustPatternConfidence(patternKey, -0.05); // Decrease confidence
    }
  }

  /**
   * Process manual grouping for learning
   * @param {Object} data - Manual grouping data
   */
  processManualGrouping(data) {
    if (data.groupData && data.products) {
      // Learn from manual grouping patterns
      const pattern = this.extractManualPattern(data.groupData, data.products);
      if (pattern) {
        const patternKey = `manual_${pattern.type}_${pattern.characteristics}`;
        this.learnedPatterns.set(patternKey, {
          type: "manual_pattern",
          pattern,
          confidence: 0.9, // High confidence for manual patterns
          timestamp: data.timestamp,
        });
      }
    }
  }

  /**
   * Process applied patterns for learning
   * @param {Object} data - Applied patterns data
   */
  processAppliedPatterns(data) {
    if (data.patterns && Array.isArray(data.patterns)) {
      data.patterns.forEach((pattern) => {
        const patternKey = this.extractPatternKey({ pattern });
        this.adjustPatternConfidence(patternKey, 0.05); // Small confidence boost
      });
    }
  }

  /**
   * Update confidence adjustments based on user feedback
   * @param {Object} actionData - User action data
   */
  updateConfidenceAdjustments(actionData) {
    // Implementation for confidence adjustment learning
    const { action, data } = actionData;

    if (action === "suggestion_accepted" && data.confidence) {
      // Track successful pattern confidence levels
      this.statistics.successfulConfidenceLevels =
        this.statistics.successfulConfidenceLevels || [];
      this.statistics.successfulConfidenceLevels.push(data.confidence);

      // Keep only recent data
      if (this.statistics.successfulConfidenceLevels.length > 100) {
        this.statistics.successfulConfidenceLevels =
          this.statistics.successfulConfidenceLevels.slice(-50);
      }
    }
  }

  /**
   * Generate a session ID for tracking related actions
   * @returns {string} Session ID
   */
  generateSessionId() {
    if (
      !this.currentSessionId ||
      Date.now() - this.sessionStartTime > 3600000
    ) {
      // 1 hour
      this.currentSessionId = `session_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      this.sessionStartTime = Date.now();
    }
    return this.currentSessionId;
  }

  /**
   * Extract pattern key for learning
   * @param {Object} suggestion - Suggestion object
   * @returns {string} Pattern key
   */
  extractPatternKey(suggestion) {
    if (suggestion.pattern) {
      return `${suggestion.pattern.type || "unknown"}_${
        suggestion.pattern.characteristics || "default"
      }`;
    }
    return `${suggestion.type || "unknown"}_${suggestion.source || "default"}`;
  }

  /**
   * Adjust pattern confidence based on feedback
   * @param {string} patternKey - Pattern identifier
   * @param {number} adjustment - Confidence adjustment (-1 to 1)
   */
  adjustPatternConfidence(patternKey, adjustment) {
    if (!this.confidenceAdjustments) {
      this.confidenceAdjustments = new Map();
    }

    const current = this.confidenceAdjustments.get(patternKey) || 0;
    const newAdjustment = Math.max(-0.5, Math.min(0.5, current + adjustment));
    this.confidenceAdjustments.set(patternKey, newAdjustment);
  }

  /**
   * Extract manual pattern characteristics
   * @param {Object} groupData - Group data
   * @param {Array} products - Products in the group
   * @returns {Object} Pattern characteristics
   */
  extractManualPattern(groupData, products) {
    try {
      // Analyze the manual grouping to extract pattern characteristics
      const characteristics = {
        namePatterns: this.extractNamePatterns(products),
        priceRanges: this.extractPriceRanges(products),
        categoryPatterns: this.extractCategoryPatterns(products),
        skuPatterns: this.extractSKUPatterns(products),
      };

      return {
        type: "manual_grouping",
        characteristics: JSON.stringify(characteristics),
        productCount: products.length,
        groupName: groupData.name,
      };
    } catch (error) {
      console.error("Error extracting manual pattern:", error);
      return null;
    }
  }

  /**
   * Generate reason for suggestion
   * @param {Object} group - Group data
   * @returns {string} Human-readable reason
   */
  generateSuggestionReason(group) {
    const reasons = [];

    if (group.pattern) {
      if (group.pattern.type === "name_similarity") {
        reasons.push("Benzer ürün adları");
      }
      if (group.pattern.type === "sku_pattern") {
        reasons.push("SKU deseni");
      }
      if (group.pattern.type === "price_range") {
        reasons.push("Benzer fiyat aralığı");
      }
      if (group.pattern.type === "category_match") {
        reasons.push("Aynı kategori");
      }
    }

    if (reasons.length === 0) {
      reasons.push("Kapsamlı desen analizi");
    }

    return reasons.join(", ");
  }

  /**
   * Extract name patterns from products
   * @param {Array} products - Products to analyze
   * @returns {Array} Name patterns
   */
  extractNamePatterns(products) {
    return products.map((p) => ({
      length: p.name?.length || 0,
      wordCount: p.name?.split(" ").length || 0,
      hasNumbers: /\d/.test(p.name || ""),
      commonWords: this.extractCommonWords(products.map((pr) => pr.name)),
    }));
  }

  /**
   * Extract price ranges from products
   * @param {Array} products - Products to analyze
   * @returns {Object} Price range data
   */
  extractPriceRanges(products) {
    const prices = products.map((p) => p.price || 0).filter((p) => p > 0);
    if (prices.length === 0) return { min: 0, max: 0, range: 0 };

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max, range: max - min };
  }

  /**
   * Extract category patterns from products
   * @param {Array} products - Products to analyze
   * @returns {Array} Category patterns
   */
  extractCategoryPatterns(products) {
    const categories = [
      ...new Set(products.map((p) => p.category).filter(Boolean)),
    ];
    return categories;
  }

  /**
   * Extract SKU patterns from products
   * @param {Array} products - Products to analyze
   * @returns {Array} SKU patterns
   */
  extractSKUPatterns(products) {
    return products.map((p) => ({
      length: p.sku?.length || 0,
      hasPrefix: this.detectSKUPrefix(p.sku),
      hasSuffix: this.detectSKUSuffix(p.sku),
      commonBase: this.findCommonSKUBase(products.map((pr) => pr.sku)),
    }));
  }

  /**
   * Extract common words from a list of names
   * @param {Array} names - List of product names
   * @returns {Array} Common words
   */
  extractCommonWords(names) {
    if (!names || names.length < 2) return [];

    const wordCounts = new Map();
    names.forEach((name) => {
      if (name) {
        const words = name.toLowerCase().split(/\s+/);
        words.forEach((word) => {
          if (word.length > 2) {
            // Ignore very short words
            wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
          }
        });
      }
    });

    // Return words that appear in at least half of the names
    const threshold = Math.max(1, Math.floor(names.length / 2));
    return Array.from(wordCounts.entries())
      .filter(([word, count]) => count >= threshold)
      .map(([word]) => word);
  }

  /**
   * Detect SKU prefix patterns
   * @param {string} sku - SKU to analyze
   * @returns {string} Detected prefix
   */
  detectSKUPrefix(sku) {
    if (!sku || sku.length < 3) return "";

    const match = sku.match(/^([A-Z]+)/);
    return match ? match[1] : "";
  }

  /**
   * Detect SKU suffix patterns
   * @param {string} sku - SKU to analyze
   * @returns {string} Detected suffix
   */
  detectSKUSuffix(sku) {
    if (!sku || sku.length < 3) return "";

    const match = sku.match(/([A-Z0-9-]+)$/);
    return match ? match[1] : "";
  }

  /**
   * Find common SKU base among products
   * @param {Array} skus - List of SKUs
   * @returns {string} Common base
   */
  findCommonSKUBase(skus) {
    if (!skus || skus.length < 2) return "";

    const validSkus = skus.filter(Boolean);
    if (validSkus.length < 2) return "";

    let commonBase = validSkus[0];
    for (let i = 1; i < validSkus.length; i++) {
      commonBase = this.findCommonPrefix(commonBase, validSkus[i]);
      if (commonBase.length < 2) break;
    }

    return commonBase;
  }

  /**
   * Find common prefix between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {string} Common prefix
   */
  findCommonPrefix(str1, str2) {
    if (!str1 || !str2) return "";

    let i = 0;
    while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
      i++;
    }

    return str1.substring(0, i);
  }

  /**
   * Get empty results structure
   * @returns {Object} Empty results object
   */
  getEmptyResults() {
    return {
      patterns: new Map(),
      suggestions: [],
      statistics: {
        processingTime: 0,
        analysisOptions: {},
      },
      confidence: {},
      metadata: {
        configUsed: {},
      },
    };
  }

  /**
   * Get error results structure
   * @param {Error} error - The error that occurred
   * @returns {Object} Error results object
   */
  getErrorResults(error) {
    console.error("Pattern analysis error:", error);
    return {
      patterns: new Map(),
      suggestions: [],
      statistics: {
        processingTime: 0,
        analysisOptions: {},
        error: error.message,
      },
      confidence: {},
      metadata: {
        configUsed: {},
        error: error.message,
      },
    };
  }
}

export default ComprehensivePatternDetector;
export { PATTERN_CATEGORIES, CONFIDENCE_LEVELS, ENHANCED_VARIANT_INDICATORS };
