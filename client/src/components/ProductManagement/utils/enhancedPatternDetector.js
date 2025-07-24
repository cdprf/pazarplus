import logger from "../../../utils/logger";
/**
 * Enhanced Product Variant Pattern Detection System
 *
 * Advanced pattern detection that handles:
 * - Complex SKU patterns like "nwk-as001", "abc-def-123"
 * - Dynamic pattern discovery from actual data
 * - Name-based similarity detection with fuzzy matching
 * - Custom pattern configuration and management
 * - Confidence scoring with multiple factors
 * - Background processing capabilities
 *
 * @author AI Assistant
 * @version 2.0.0
 */

// Levenshtein distance for string similarity
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1)
    .fill()
    .map(() => Array(str1.length + 1).fill(0));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1, // deletion
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

// Calculate string similarity (0-1)
function stringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const maxLength = Math.max(str1.length, str2.length);
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return (maxLength - distance) / maxLength;
}

// Advanced pattern types
const PATTERN_TYPES = {
  SIMPLE_SUFFIX: "simple_suffix", // product-v1, product-xl
  NUMERIC_SUFFIX: "numeric_suffix", // product-001, product-123
  COMPLEX_HIERARCHICAL: "complex_hierarchical", // nwk-as001, abc-def-123
  NAME_SIMILARITY: "name_similarity", // Similar product names
  CUSTOM: "custom", // User-defined patterns
};

// Enhanced separators and delimiters
const SEPARATORS = ["-", "_", ".", " ", "/", "\\"];

// Patterns that should remain separate (not grouped as variants)
const EXCLUDED_PATTERNS = [
  "orj",
  "original",
  "org", // Original products
  "master",
  "main",
  "base", // Base products
  "kit",
  "set",
  "bundle", // Bundles/sets
  "demo",
  "sample",
  "test", // Demo/test products
];

// Built-in variant indicators
const VARIANT_INDICATORS = {
  sizes: ["xs", "s", "m", "l", "xl", "xxl", "xxxl"],
  colors: [
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
  ],
  versions: ["v1", "v2", "v3", "ver1", "ver2", "version1", "version2"],
  types: ["a", "b", "c", "d", "type1", "type2", "model1", "model2"],
  languages: ["tr", "en", "de", "fr", "es", "turkish", "english"],
};

class EnhancedPatternDetector {
  constructor() {
    this.customPatterns = new Map();
    this.detectedPatterns = new Map();
    this.statistics = {
      totalProducts: 0,
      patternsDetected: 0,
      variantGroupsCreated: 0,
      nameSimilarityMatches: 0,
      confidenceDistribution: {},
    };

    // Load custom patterns from localStorage if available
    this.loadCustomPatterns();
  }

  /**
   * Main analysis method - detects all types of patterns
   * @param {Array} products - Array of product objects
   * @param {Object} options - Analysis options
   * @returns {Object} - Complete analysis results
   */
  analyzeProducts(products, options = {}) {
    this.statistics.totalProducts = products.length;

    const results = {
      skuBasedGroups: new Map(),
      nameSimilarityGroups: new Map(),
      suggestions: [],
      statistics: { ...this.statistics },
      patternInsights: [],
      confidence: {},
    };

    // 1. SKU-based pattern detection
    this.detectSKUPatterns(products, results);

    // 2. Name-based similarity detection
    this.detectNameSimilarity(products, results);

    // 3. Generate intelligent suggestions
    this.generateIntelligentSuggestions(products, results);

    // 4. Calculate confidence scores
    this.calculateConfidenceScores(results);

    // 5. Generate pattern insights
    this.generatePatternInsights(results);

    return results;
  }

  /**
   * Detect SKU-based patterns including complex hierarchical patterns
   * @param {Array} products - Products to analyze
   * @param {Object} results - Results object to populate
   */
  detectSKUPatterns(products, results) {
    const skuGroups = new Map();
    const patternCache = new Map();

    for (const product of products) {
      if (!product.sku) continue;

      // Extract various pattern types
      const patterns = this.extractAllPatternTypes(product.sku);

      for (const pattern of patterns) {
        if (this.isExcludedPattern(pattern.base)) continue;

        if (!skuGroups.has(pattern.base)) {
          skuGroups.set(pattern.base, {
            basePattern: pattern.base,
            patternType: pattern.type,
            products: [],
            confidence: 0,
          });
        }

        skuGroups.get(pattern.base).products.push({
          ...product,
          variantInfo: pattern.variant,
          patternType: pattern.type,
        });
      }
    }

    // Filter groups with multiple products and calculate confidence
    for (const [base, group] of skuGroups) {
      if (group.products.length > 1) {
        group.confidence = this.calculateGroupConfidence(group);
        results.skuBasedGroups.set(base, group);
        this.statistics.patternsDetected++;
      }
    }
  }

  /**
   * Extract all possible pattern types from a SKU
   * @param {string} sku - Product SKU
   * @returns {Array} - Array of pattern objects
   */
  extractAllPatternTypes(sku) {
    const patterns = [];

    // 1. Simple suffix patterns (product-xl, product-v2)
    patterns.push(...this.extractSimpleSuffixPatterns(sku));

    // 2. Numeric suffix patterns (product-001, product-123)
    patterns.push(...this.extractNumericSuffixPatterns(sku));

    // 3. Complex hierarchical patterns (nwk-as001, abc-def-123)
    patterns.push(...this.extractHierarchicalPatterns(sku));

    // 4. Custom user-defined patterns
    patterns.push(...this.extractCustomPatterns(sku));

    return patterns.filter((p) => p !== null);
  }

  /**
   * Extract simple suffix patterns like "product-xl", "item-red"
   * @param {string} sku - Product SKU
   * @returns {Array} - Array of pattern objects
   */
  extractSimpleSuffixPatterns(sku) {
    const patterns = [];

    for (const separator of SEPARATORS) {
      const parts = sku.split(separator);
      if (parts.length >= 2) {
        const base = parts.slice(0, -1).join(separator);
        const suffix = parts[parts.length - 1].toLowerCase();

        // Check if suffix matches known variant indicators
        const variantType = this.identifyVariantType(suffix);
        if (variantType) {
          patterns.push({
            type: PATTERN_TYPES.SIMPLE_SUFFIX,
            base: base,
            variant: {
              value: suffix,
              type: variantType,
              separator: separator,
            },
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Extract numeric suffix patterns like "product-001", "item-123"
   * @param {string} sku - Product SKU
   * @returns {Array} - Array of pattern objects
   */
  extractNumericSuffixPatterns(sku) {
    const patterns = [];

    for (const separator of SEPARATORS) {
      const parts = sku.split(separator);
      if (parts.length >= 2) {
        const suffix = parts[parts.length - 1];

        // Check if suffix is numeric (with optional padding)
        if (/^\d{1,6}$/.test(suffix)) {
          const base = parts.slice(0, -1).join(separator);
          patterns.push({
            type: PATTERN_TYPES.NUMERIC_SUFFIX,
            base: base,
            variant: {
              value: suffix,
              type: "numeric",
              number: parseInt(suffix),
              separator: separator,
            },
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Extract hierarchical patterns like "nwk-as001", "abc-def-123"
   * This handles complex SKUs where the main product has a complex base
   * @param {string} sku - Product SKU
   * @returns {Array} - Array of pattern objects
   */
  extractHierarchicalPatterns(sku) {
    const patterns = [];

    // Pattern: prefix-section-number (like nwk-as001)
    const hierarchicalMatch = sku.match(/^([a-zA-Z]+)-([a-zA-Z]+)(\d{1,6})$/);
    if (hierarchicalMatch) {
      const [, prefix, section, number] = hierarchicalMatch;
      const base = `${prefix}-${section}`;

      patterns.push({
        type: PATTERN_TYPES.COMPLEX_HIERARCHICAL,
        base: base,
        variant: {
          value: number,
          type: "hierarchical_numeric",
          number: parseInt(number),
          separator: "-",
          structure: { prefix, section, number },
        },
      });
    }

    // Pattern: prefix-section-subsection-number
    const deepHierarchicalMatch = sku.match(
      /^([a-zA-Z]+)-([a-zA-Z]+)-([a-zA-Z]+)(\d{1,6})$/
    );
    if (deepHierarchicalMatch) {
      const [, prefix, section, subsection, number] = deepHierarchicalMatch;
      const base = `${prefix}-${section}-${subsection}`;

      patterns.push({
        type: PATTERN_TYPES.COMPLEX_HIERARCHICAL,
        base: base,
        variant: {
          value: number,
          type: "deep_hierarchical_numeric",
          number: parseInt(number),
          separator: "-",
          structure: { prefix, section, subsection, number },
        },
      });
    }

    return patterns;
  }

  /**
   * Extract custom user-defined patterns
   * @param {string} sku - Product SKU
   * @returns {Array} - Array of pattern objects
   */
  extractCustomPatterns(sku) {
    const patterns = [];

    for (const [patternName, patternConfig] of this.customPatterns) {
      const regex = new RegExp(patternConfig.regex);
      const match = sku.match(regex);

      if (match) {
        patterns.push({
          type: PATTERN_TYPES.CUSTOM,
          base: patternConfig.extractBase(match),
          variant: {
            value: patternConfig.extractVariant(match),
            type: "custom",
            customType: patternName,
            match: match,
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Detect name-based similarity for products that don't match SKU patterns
   * @param {Array} products - Products to analyze
   * @param {Object} results - Results object to populate
   */
  detectNameSimilarity(products, results) {
    const threshold = 0.75; // Similarity threshold
    const processed = new Set();

    for (let i = 0; i < products.length; i++) {
      const product1 = products[i];
      if (processed.has(product1.id)) continue;

      const similarProducts = [product1];
      processed.add(product1.id);

      for (let j = i + 1; j < products.length; j++) {
        const product2 = products[j];
        if (processed.has(product2.id)) continue;

        const similarity = this.calculateProductSimilarity(product1, product2);

        if (similarity >= threshold) {
          similarProducts.push(product2);
          processed.add(product2.id);
        }
      }

      if (similarProducts.length > 1) {
        const groupKey = `name_similarity_${product1.id}`;
        results.nameSimilarityGroups.set(groupKey, {
          baseProduct: product1,
          products: similarProducts,
          similarity: this.calculateGroupAverageSimilarity(similarProducts),
          patternType: PATTERN_TYPES.NAME_SIMILARITY,
          confidence: this.calculateNameSimilarityConfidence(similarProducts),
        });
        this.statistics.nameSimilarityMatches++;
      }
    }
  }

  /**
   * Calculate similarity between two products considering multiple factors
   * @param {Object} product1 - First product
   * @param {Object} product2 - Second product
   * @returns {number} - Similarity score (0-1)
   */
  calculateProductSimilarity(product1, product2) {
    let totalWeight = 0;
    let weightedScore = 0;

    // Name similarity (highest weight)
    if (product1.name && product2.name) {
      const nameWeight = 0.5;
      const nameSimilarity = stringSimilarity(product1.name, product2.name);
      weightedScore += nameSimilarity * nameWeight;
      totalWeight += nameWeight;
    }

    // SKU similarity (medium weight)
    if (product1.sku && product2.sku) {
      const skuWeight = 0.3;
      const skuSimilarity = stringSimilarity(product1.sku, product2.sku);
      weightedScore += skuSimilarity * skuWeight;
      totalWeight += skuWeight;
    }

    // Category similarity
    if (product1.category && product2.category) {
      const categoryWeight = 0.1;
      const categorySimilarity =
        product1.category === product2.category ? 1 : 0;
      weightedScore += categorySimilarity * categoryWeight;
      totalWeight += categoryWeight;
    }

    // Brand similarity
    if (product1.brand && product2.brand) {
      const brandWeight = 0.1;
      const brandSimilarity = product1.brand === product2.brand ? 1 : 0;
      weightedScore += brandSimilarity * brandWeight;
      totalWeight += brandWeight;
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  /**
   * Identify variant type from suffix
   * @param {string} suffix - Suffix to analyze
   * @returns {string|null} - Variant type or null
   */
  identifyVariantType(suffix) {
    const lowerSuffix = suffix.toLowerCase();

    if (VARIANT_INDICATORS.sizes.includes(lowerSuffix)) return "size";
    if (VARIANT_INDICATORS.colors.includes(lowerSuffix)) return "color";
    if (VARIANT_INDICATORS.versions.includes(lowerSuffix)) return "version";
    if (VARIANT_INDICATORS.types.includes(lowerSuffix)) return "type";
    if (VARIANT_INDICATORS.languages.includes(lowerSuffix)) return "language";

    // Check numeric patterns
    if (/^\d{1,3}$/.test(lowerSuffix)) return "numeric";
    if (/^v\d+$/.test(lowerSuffix)) return "version";

    return null;
  }

  /**
   * Check if pattern should be excluded from grouping
   * @param {string} pattern - Pattern to check
   * @returns {boolean} - True if excluded
   */
  isExcludedPattern(pattern) {
    if (!pattern) return false;

    const lowerPattern = pattern.toLowerCase();
    return EXCLUDED_PATTERNS.some((excluded) =>
      lowerPattern.includes(excluded.toLowerCase())
    );
  }

  /**
   * Calculate confidence score for a group
   * @param {Object} group - Group to analyze
   * @returns {number} - Confidence score (0-1)
   */
  calculateGroupConfidence(group) {
    let score = 0;
    let factors = 0;

    // Factor 1: Number of products in group
    const sizeScore = Math.min(group.products.length / 5, 1);
    score += sizeScore * 0.3;
    factors += 0.3;

    // Factor 2: Pattern consistency
    const patternConsistency = this.calculatePatternConsistency(group);
    score += patternConsistency * 0.4;
    factors += 0.4;

    // Factor 3: Product similarity within group
    const avgSimilarity = this.calculateGroupAverageSimilarity(group.products);
    score += avgSimilarity * 0.3;
    factors += 0.3;

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate pattern consistency within a group
   * @param {Object} group - Group to analyze
   * @returns {number} - Consistency score (0-1)
   */
  calculatePatternConsistency(group) {
    if (group.products.length < 2) return 1;

    const variants = group.products.map((p) => p.variantInfo?.value || "");
    const uniqueVariants = new Set(variants);

    // Higher score for more unique variants (less duplication)
    return uniqueVariants.size / variants.length;
  }

  /**
   * Calculate average similarity within a group
   * @param {Array} products - Products in group
   * @returns {number} - Average similarity score (0-1)
   */
  calculateGroupAverageSimilarity(products) {
    if (products.length < 2) return 1;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        totalSimilarity += this.calculateProductSimilarity(
          products[i],
          products[j]
        );
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Generate intelligent suggestions based on analysis
   * @param {Array} products - All products
   * @param {Object} results - Results object to populate
   */
  generateIntelligentSuggestions(products, results) {
    // Combine both SKU-based and name-based suggestions
    const allGroups = [
      ...Array.from(results.skuBasedGroups.values()),
      ...Array.from(results.nameSimilarityGroups.values()),
    ];

    // Sort by confidence and filter high-confidence suggestions
    results.suggestions = allGroups
      .filter((group) => group.confidence >= 0.6)
      .sort((a, b) => b.confidence - a.confidence)
      .map((group) => ({
        type: group.patternType,
        basePattern: group.basePattern || group.baseProduct?.name,
        products: group.products,
        confidence: group.confidence,
        reason: this.generateSuggestionReason(group),
      }));
  }

  /**
   * Generate human-readable reason for suggestion
   * @param {Object} group - Group to explain
   * @returns {string} - Explanation text
   */
  generateSuggestionReason(group) {
    switch (group.patternType) {
      case PATTERN_TYPES.SIMPLE_SUFFIX:
        return `Similar SKU pattern with different suffixes`;
      case PATTERN_TYPES.NUMERIC_SUFFIX:
        return `Sequential numeric SKU pattern detected`;
      case PATTERN_TYPES.COMPLEX_HIERARCHICAL:
        return `Complex hierarchical SKU pattern (like nwk-as001 series)`;
      case PATTERN_TYPES.NAME_SIMILARITY:
        return `High name similarity suggests variants`;
      case PATTERN_TYPES.CUSTOM:
        return `Matches custom pattern: ${group.customType}`;
      default:
        return `Pattern-based grouping suggested`;
    }
  }

  /**
   * Calculate confidence scores and distribution
   * @param {Object} results - Results object
   */
  calculateConfidenceScores(results) {
    const allGroups = [
      ...Array.from(results.skuBasedGroups.values()),
      ...Array.from(results.nameSimilarityGroups.values()),
    ];

    const distribution = { high: 0, medium: 0, low: 0 };

    for (const group of allGroups) {
      if (group.confidence >= 0.8) distribution.high++;
      else if (group.confidence >= 0.6) distribution.medium++;
      else distribution.low++;
    }

    results.confidence = {
      distribution,
      averageConfidence:
        allGroups.length > 0
          ? allGroups.reduce((sum, g) => sum + g.confidence, 0) /
            allGroups.length
          : 0,
    };
  }

  /**
   * Generate pattern insights for reporting
   * @param {Object} results - Results object
   */
  generatePatternInsights(results) {
    results.patternInsights = [
      {
        type: "SKU Patterns",
        count: results.skuBasedGroups.size,
        confidence: this.calculateAverageConfidence(
          Array.from(results.skuBasedGroups.values())
        ),
      },
      {
        type: "Name Similarity",
        count: results.nameSimilarityGroups.size,
        confidence: this.calculateAverageConfidence(
          Array.from(results.nameSimilarityGroups.values())
        ),
      },
      {
        type: "High Confidence Suggestions",
        count: results.suggestions.filter((s) => s.confidence >= 0.8).length,
      },
    ];
  }

  /**
   * Calculate average confidence for a set of groups
   * @param {Array} groups - Groups to analyze
   * @returns {number} - Average confidence
   */
  calculateAverageConfidence(groups) {
    if (groups.length === 0) return 0;
    return groups.reduce((sum, g) => sum + g.confidence, 0) / groups.length;
  }

  /**
   * Calculate name similarity confidence
   * @param {Array} products - Products in group
   * @returns {number} - Confidence score
   */
  calculateNameSimilarityConfidence(products) {
    const avgSimilarity = this.calculateGroupAverageSimilarity(products);
    const sizeBonus = Math.min(products.length / 4, 0.2);
    return Math.min(avgSimilarity + sizeBonus, 1);
  }

  /**
   * Add custom pattern configuration
   * @param {string} name - Pattern name
   * @param {Object} config - Pattern configuration
   */
  addCustomPattern(name, config) {
    this.customPatterns.set(name, {
      regex: config.regex,
      extractBase: config.extractBase || ((match) => match[1]),
      extractVariant: config.extractVariant || ((match) => match[2]),
      description: config.description || "",
      examples: config.examples || [],
    });

    this.saveCustomPatterns();
  }

  /**
   * Remove custom pattern
   * @param {string} name - Pattern name
   */
  removeCustomPattern(name) {
    this.customPatterns.delete(name);
    this.saveCustomPatterns();
  }

  /**
   * Get all custom patterns
   * @returns {Array} - Array of custom patterns
   */
  getCustomPatterns() {
    return Array.from(this.customPatterns.entries()).map(([name, config]) => ({
      name,
      ...config,
    }));
  }

  /**
   * Save custom patterns to localStorage
   */
  saveCustomPatterns() {
    try {
      const patterns = Object.fromEntries(this.customPatterns);
      localStorage.setItem(
        "enhanced_custom_patterns",
        JSON.stringify(patterns)
      );
    } catch (error) {
      logger.warn("Failed to save custom patterns:", error);
    }
  }

  /**
   * Load custom patterns from localStorage
   */
  loadCustomPatterns() {
    try {
      const saved = localStorage.getItem("enhanced_custom_patterns");
      if (saved) {
        const patterns = JSON.parse(saved);
        this.customPatterns = new Map(Object.entries(patterns));
      }
    } catch (error) {
      logger.warn("Failed to load custom patterns:", error);
    }
  }

  /**
   * Export detection results for background processing
   * @param {Object} results - Analysis results
   * @returns {Object} - Exportable data
   */
  exportResults(results) {
    return {
      timestamp: new Date().toISOString(),
      statistics: results.statistics,
      groups: {
        skuBased: Array.from(results.skuBasedGroups.entries()),
        nameSimilarity: Array.from(results.nameSimilarityGroups.entries()),
      },
      suggestions: results.suggestions,
      insights: results.patternInsights,
      confidence: results.confidence,
    };
  }

  /**
   * Get processing statistics
   * @returns {Object} - Statistics object
   */
  getStatistics() {
    return { ...this.statistics };
  }
}

export default EnhancedPatternDetector;
export {
  PATTERN_TYPES,
  SEPARATORS,
  EXCLUDED_PATTERNS,
  VARIANT_INDICATORS,
  stringSimilarity,
  levenshteinDistance,
};
