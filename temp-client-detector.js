
    /**
 * Intelligent Product Variant Pattern Detection System
 *
 * This module provides advanced pattern detection for product variants with:
 * - Dynamic pattern discovery from actual data
 * - Confidence scoring based on multiple factors
 * - Smart exclusions for special patterns
 * - Support for multiple separators
 * - Variant type detection (color, size, version, etc.)
 *
 * @author AI Assistant
 * @version 1.0.0
 */

// Supported separators for SKU pattern analysis
const SEPARATORS = ["-", "_", ".", " "];

// Patterns that should be excluded from variant grouping (remain separate)
const EXCLUDED_PATTERNS = [
  "orj",
  "original",
  "org", // Original variants should remain separate
  "master",
  "main",
  "base", // Base/master products
];

// Color patterns for variant type detection
const COLOR_PATTERNS = [
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
  "olive",
  "lime",
  "aqua",
  "teal",
  "fuchsia",
  "darkblue",
  "lightblue",
  "darkgreen",
  "lightgreen",
  "siyah",
  "beyaz",
  "kırmızı",
  "mavi",
  "yeşil",
  "sarı",
  "turuncu",
  "mor",
  "pembe",
  "kahverengi",
  "gri",
  "gümüş",
  "altın",
  "lacivert",
];

// Size patterns for variant type detection
const SIZE_PATTERNS = [
  "xs",
  "s",
  "m",
  "l",
  "xl",
  "xxl",
  "xxxl",
  "small",
  "medium",
  "large",
  "extralarge",
  "mini",
  "normal",
  "maxi",
  "jumbo",
  "küçük",
  "orta",
  "büyük",
];

// Version patterns for variant type detection
const VERSION_PATTERNS = [
  "v1",
  "v2",
  "v3",
  "v4",
  "v5",
  "ver1",
  "ver2",
  "ver3",
  "version1",
  "version2",
  "version3",
  "gen1",
  "gen2",
  "gen3",
  "pro",
  "plus",
  "premium",
  "lite",
  "basic",
  "standard",
  "deluxe",
  "ultimate",
];

/**
 * Intelligent Pattern Detector Class
 */
class IntelligentPatternDetector {
  constructor(options = {}) {
    this.options = {
      minGroupSize: 2, // Minimum products needed to form a variant group
      minConfidence: 0.6, // Minimum confidence threshold for suggestions
      maxPatternLength: 5, // Maximum number of segments in a pattern
      enableSmartExclusions: true,
      enableMultipleSeparators: true,
      ...options,
    };

    this.detectedPatterns = new Map();
    this.suggestions = new Map();
    this.statistics = {};
  }

  /**
   * Main analysis method - analyzes all products and detects patterns
   * @param {Array} products - Array of product objects
   * @returns {Object} - Analysis results with suggestions and statistics
   */
  analyzeProducts(products) {
    if (!Array.isArray(products) || products.length === 0) {
      return this._getEmptyResults();
    }

    // Reset internal state
    this.detectedPatterns.clear();
    this.suggestions.clear();

    // Step 1: Extract all possible patterns from SKUs
    const allPatterns = this._extractAllPatterns(products);

    // Step 2: Filter and score patterns
    const scoredPatterns = this._scorePatterns(allPatterns, products);

    // Step 3: Generate variant grouping suggestions
    const suggestions = this._generateSuggestions(scoredPatterns, products);

    // Step 4: Calculate statistics
    const statistics = this._calculateStatistics(products, suggestions);

    return {
      suggestions: Array.from(suggestions.values()),
      statistics,
      detectedPatterns: Array.from(this.detectedPatterns.values()),
      rawPatterns: allPatterns,
    };
  }

  /**
   * Extract all possible patterns from product SKUs
   * @param {Array} products - Array of products
   * @returns {Map} - Map of patterns with their occurrences
   */
  _extractAllPatterns(products) {
    const patterns = new Map();

    for (const product of products) {
      if (!product.sku) continue;

      // Try each separator
      for (const separator of SEPARATORS) {
        if (!product.sku.includes(separator)) continue;

        const segments = product.sku.split(separator);

        // Generate patterns of different lengths
        for (
          let length = 1;
          length < Math.min(segments.length, this.options.maxPatternLength);
          length++
        ) {
          const pattern = segments.slice(0, length).join(separator);

          // Skip if pattern is too short or contains excluded terms
          if (this._shouldExcludePattern(pattern)) continue;

          if (!patterns.has(pattern)) {
            patterns.set(pattern, {
              pattern,
              separator,
              segments: length,
              products: [],
              frequency: 0,
              variants: [],
            });
          }

          const patternData = patterns.get(pattern);
          patternData.products.push(product);
          patternData.frequency++;

          // If this product has more segments, it's a potential variant
          if (segments.length > length) {
            const remainingSuffix = segments.slice(length).join(separator);
            patternData.variants.push({
              product,
              suffix: remainingSuffix,
              fullSku: product.sku,
            });
          }
        }
      }
    }

    return patterns;
  }

  /**
   * Score patterns based on various factors
   * @param {Map} patterns - Map of patterns
   * @param {Array} products - Array of products
   * @returns {Array} - Sorted array of scored patterns
   */
  _scorePatterns(patterns, products) {
    const scoredPatterns = [];

    for (const [, patternData] of patterns) {
      // Only consider patterns with multiple products
      if (patternData.frequency < this.options.minGroupSize) continue;

      const score = this._calculatePatternScore(patternData, products);

      if (score.totalConfidence >= this.options.minConfidence) {
        scoredPatterns.push({
          ...patternData,
          score,
          confidence: Math.round(score.totalConfidence * 100),
        });
      }
    }

    // Sort by confidence score descending
    return scoredPatterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate confidence score for a pattern
   * @param {Object} patternData - Pattern data
   * @param {Array} products - All products
   * @returns {Object} - Detailed scoring breakdown
   */
  _calculatePatternScore(patternData, products) {
    const scores = {
      structureConsistency: 0, // 30% - How consistent are SKU structures?
      nameSimilarity: 0, // 25% - How similar are product names?
      priceVariation: 0, // 20% - Are prices reasonably different?
      categoryConsistency: 0, // 15% - Same category products?
      patternLength: 0, // 10% - Is pattern length appropriate?
    };

    const weights = {
      structureConsistency: 0.3,
      nameSimilarity: 0.25,
      priceVariation: 0.2,
      categoryConsistency: 0.15,
      patternLength: 0.1,
    };

    // 1. Structure Consistency (30%)
    scores.structureConsistency =
      this._calculateStructureConsistency(patternData);

    // 2. Name Similarity (25%)
    scores.nameSimilarity = this._calculateNameSimilarity(patternData.products);

    // 3. Price Variation (20%)
    scores.priceVariation = this._calculatePriceVariation(patternData.products);

    // 4. Category Consistency (15%)
    scores.categoryConsistency = this._calculateCategoryConsistency(
      patternData.products
    );

    // 5. Pattern Length Appropriateness (10%)
    scores.patternLength = this._calculatePatternLengthScore(patternData);

    // Calculate weighted total
    const totalConfidence = Object.keys(scores).reduce((total, key) => {
      return total + scores[key] * weights[key];
    }, 0);

    return {
      ...scores,
      totalConfidence,
      breakdown: Object.keys(scores).map((key) => ({
        factor: key,
        score: scores[key],
        weight: weights[key],
        weighted: scores[key] * weights[key],
      })),
    };
  }

  /**
   * Calculate structure consistency score
   * @param {Object} patternData - Pattern data
   * @returns {number} - Score between 0 and 1
   */
  _calculateStructureConsistency(patternData) {
    if (patternData.variants.length === 0) return 0;

    const suffixPatterns = patternData.variants.map(
      (v) => v.suffix.split(patternData.separator).length
    );
    const avgSuffixLength =
      suffixPatterns.reduce((a, b) => a + b, 0) / suffixPatterns.length;

    // Higher score for consistent suffix lengths
    const variance =
      suffixPatterns.reduce(
        (acc, len) => acc + Math.pow(len - avgSuffixLength, 2),
        0
      ) / suffixPatterns.length;

    return Math.max(0, 1 - variance / 4); // Normalize variance
  }

  /**
   * Calculate name similarity score
   * @param {Array} products - Products in the pattern
   * @returns {number} - Score between 0 and 1
   */
  _calculateNameSimilarity(products) {
    if (products.length < 2) return 0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const similarity = this._calculateStringSimilarity(
          products[i].name || "",
          products[j].name || ""
        );
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Calculate price variation score
   * @param {Array} products - Products in the pattern
   * @returns {number} - Score between 0 and 1
   */
  _calculatePriceVariation(products) {
    const prices = products.filter((p) => p.price != null).map((p) => p.price);
    if (prices.length < 2) return 0.5; // Neutral score if insufficient data

    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const maxDeviation = Math.max(...prices.map((p) => Math.abs(p - avgPrice)));

    // Score higher for reasonable price variations (not too extreme)
    const deviationRatio = maxDeviation / avgPrice;

    if (deviationRatio <= 0.3) return 1.0; // ±30% is excellent
    if (deviationRatio <= 0.5) return 0.8; // ±50% is good
    if (deviationRatio <= 1.0) return 0.6; // ±100% is acceptable
    return 0.3; // Higher deviations are suspicious
  }

  /**
   * Calculate category consistency score
   * @param {Array} products - Products in the pattern
   * @returns {number} - Score between 0 and 1
   */
  _calculateCategoryConsistency(products) {
    const categories = products
      .filter((p) => p.category)
      .map((p) => p.category);
    if (categories.length === 0) return 0.5; // Neutral if no category data

    const uniqueCategories = new Set(categories);
    return uniqueCategories.size === 1 ? 1.0 : 0.2; // High score only if all same category
  }

  /**
   * Calculate pattern length appropriateness score
   * @param {Object} patternData - Pattern data
   * @returns {number} - Score between 0 and 1
   */
  _calculatePatternLengthScore(patternData) {
    const optimalLength = 2; // 2 segments is often optimal (e.g., "ABC-001")
    const length = patternData.segments;

    if (length === optimalLength) return 1.0;
    if (length === optimalLength + 1 || length === optimalLength - 1)
      return 0.8;
    if (length === 1) return 0.4; // Too generic
    return 0.6; // Reasonable but not optimal
  }

  /**
   * Generate variant grouping suggestions
   * @param {Array} scoredPatterns - Scored patterns
   * @param {Array} products - All products
   * @returns {Map} - Map of suggestions
   */
  _generateSuggestions(scoredPatterns, products) {
    const suggestions = new Map();

    for (const pattern of scoredPatterns) {
      if (pattern.variants.length === 0) continue;

      // Find the main product (exact match with pattern or shortest SKU)
      const mainProduct = this._findMainProduct(pattern);
      const variantProducts = pattern.variants.map((v) => v.product);

      // Detect variant type
      const variantType = this._detectVariantType(pattern.variants);

      // Generate recommendation text
      const recommendation = this._generateRecommendation(pattern.confidence);

      const suggestion = {
        id: `pattern-${pattern.pattern.replace(/[^a-zA-Z0-9]/g, "-")}`,
        pattern: pattern.pattern,
        confidence: pattern.confidence,
        groupType: variantType,
        mainProduct: mainProduct,
        variants: variantProducts,
        description: this._generateDescription(pattern, variantType),
        recommendation: recommendation,
        score: pattern.score,
        separator: pattern.separator,
        totalProducts: pattern.frequency,
        metadata: {
          patternLength: pattern.segments,
          avgPriceDiff: this._calculateAvgPriceDifference(pattern.products),
          hasImages: pattern.products.filter(
            (p) => p.images && p.images.length > 0
          ).length,
          categories: [
            ...new Set(
              pattern.products.filter((p) => p.category).map((p) => p.category)
            ),
          ],
        },
      };

      suggestions.set(suggestion.id, suggestion);
    }

    return suggestions;
  }

  /**
   * Find the main product for a pattern group
   * @param {Object} pattern - Pattern data
   * @returns {Object} - Main product
   */
  _findMainProduct(pattern) {
    // Try to find exact match with pattern
    const exactMatch = pattern.products.find((p) => p.sku === pattern.pattern);
    if (exactMatch) return exactMatch;

    // Otherwise, use the product with the shortest SKU (likely the base)
    return pattern.products.reduce((shortest, current) =>
      current.sku.length < shortest.sku.length ? current : shortest
    );
  }

  /**
   * Detect variant type based on suffixes
   * @param {Array} variants - Array of variant objects
   * @returns {string} - Variant type
   */
  _detectVariantType(variants) {
    const suffixes = variants.map((v) => v.suffix.toLowerCase());

    // Check for color variants
    if (
      suffixes.some((suffix) =>
        COLOR_PATTERNS.some((color) => suffix.includes(color))
      )
    ) {
      return "color";
    }

    // Check for size variants
    if (
      suffixes.some((suffix) =>
        SIZE_PATTERNS.some((size) => suffix.includes(size))
      )
    ) {
      return "size";
    }

    // Check for version variants
    if (
      suffixes.some((suffix) =>
        VERSION_PATTERNS.some((version) => suffix.includes(version))
      )
    ) {
      return "version";
    }

    // Check for numeric variants
    if (suffixes.some((suffix) => /\d+/.test(suffix))) {
      return "numeric";
    }

    return "generic";
  }

  /**
   * Generate description text for a suggestion
   * @param {Object} pattern - Pattern data
   * @param {string} variantType - Type of variants
   * @returns {string} - Description text
   */
  _generateDescription(pattern, variantType) {
    const variantCount = pattern.variants.length;
    const typeText =
      {
        color: "renk varyantı",
        size: "beden varyantı",
        version: "versiyon varyantı",
        numeric: "numaralı varyant",
        generic: "varyant",
      }[variantType] || "varyant";

    return `${pattern.pattern} deseni için ${variantCount} ${typeText} tespit edildi. Bu ürünleri gruplayarak daha iyi organize edebilirsiniz.`;
  }

  /**
   * Generate recommendation text based on confidence
   * @param {number} confidence - Confidence score (0-100)
   * @returns {string} - Recommendation text
   */
  _generateRecommendation(confidence) {
    if (confidence >= 90)
      return "Kesinlikle önerilen - Çok güçlü desen tespit edildi";
    if (confidence >= 80)
      return "Yüksek düzeyde önerilen - Güçlü desen tespit edildi";
    if (confidence >= 70) return "Önerilen - İyi desen tespit edildi";
    if (confidence >= 60)
      return "Dikkatli inceleme önerilen - Orta düzey desen";
    return "Manuel inceleme gerekli - Düşük güven düzeyi";
  }

  /**
   * Calculate statistics
   * @param {Array} products - All products
   * @param {Map} suggestions - Generated suggestions
   * @returns {Object} - Statistics object
   */
  _calculateStatistics(products, suggestions) {
    const suggestionsArray = Array.from(suggestions.values());

    return {
      totalProducts: products.length,
      totalSuggestions: suggestionsArray.length,
      highConfidenceSuggestions: suggestionsArray.filter(
        (s) => s.confidence >= 80
      ).length,
      mediumConfidenceSuggestions: suggestionsArray.filter(
        (s) => s.confidence >= 60 && s.confidence < 80
      ).length,
      lowConfidenceSuggestions: suggestionsArray.filter(
        (s) => s.confidence < 60
      ).length,
      avgConfidence:
        suggestionsArray.length > 0
          ? Math.round(
              suggestionsArray.reduce((sum, s) => sum + s.confidence, 0) /
                suggestionsArray.length
            )
          : 0,
      potentialVariants: suggestionsArray.reduce(
        (sum, s) => sum + s.variants.length,
        0
      ),
      variantTypes: {
        color: suggestionsArray.filter((s) => s.groupType === "color").length,
        size: suggestionsArray.filter((s) => s.groupType === "size").length,
        version: suggestionsArray.filter((s) => s.groupType === "version")
          .length,
        numeric: suggestionsArray.filter((s) => s.groupType === "numeric")
          .length,
        generic: suggestionsArray.filter((s) => s.groupType === "generic")
          .length,
      },
      separatorUsage: this._calculateSeparatorUsage(products),
      patternComplexity: this._calculatePatternComplexity(suggestionsArray),
    };
  }

  /**
   * Helper method to check if pattern should be excluded
   * @param {string} pattern - Pattern to check
   * @returns {boolean} - True if should be excluded
   */
  _shouldExcludePattern(pattern) {
    if (!this.options.enableSmartExclusions) return false;

    const lowerPattern = pattern.toLowerCase();
    return EXCLUDED_PATTERNS.some((excluded) =>
      lowerPattern.includes(excluded)
    );
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Similarity score (0-1)
   */
  _calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    const distance = this._levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Levenshtein distance
   */
  _levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate average price difference in a pattern
   * @param {Array} products - Products in pattern
   * @returns {number} - Average price difference
   */
  _calculateAvgPriceDifference(products) {
    const prices = products.filter((p) => p.price != null).map((p) => p.price);
    if (prices.length < 2) return 0;

    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const deviations = prices.map((p) => Math.abs(p - avgPrice));
    return deviations.reduce((a, b) => a + b, 0) / deviations.length;
  }

  /**
   * Calculate separator usage statistics
   * @param {Array} products - All products
   * @returns {Object} - Separator usage stats
   */
  _calculateSeparatorUsage(products) {
    const usage = {};
    SEPARATORS.forEach((sep) => {
      usage[sep] = 0;
    });

    products.forEach((product) => {
      if (!product.sku) return;
      SEPARATORS.forEach((sep) => {
        if (product.sku.includes(sep)) usage[sep]++;
      });
    });

    return usage;
  }

  /**
   * Calculate pattern complexity metrics
   * @param {Array} suggestions - Array of suggestions
   * @returns {Object} - Complexity metrics
   */
  _calculatePatternComplexity(suggestions) {
    if (suggestions.length === 0)
      return { avgSegments: 0, maxSegments: 0, minSegments: 0 };

    const segments = suggestions.map((s) => s.metadata.patternLength);
    return {
      avgSegments: segments.reduce((a, b) => a + b, 0) / segments.length,
      maxSegments: Math.max(...segments),
      minSegments: Math.min(...segments),
    };
  }

  /**
   * Get empty results structure
   * @returns {Object} - Empty results
   */
  _getEmptyResults() {
    return {
      suggestions: [],
      statistics: {
        totalProducts: 0,
        totalSuggestions: 0,
        highConfidenceSuggestions: 0,
        mediumConfidenceSuggestions: 0,
        lowConfidenceSuggestions: 0,
        avgConfidence: 0,
        potentialVariants: 0,
        variantTypes: { color: 0, size: 0, version: 0, numeric: 0, generic: 0 },
        separatorUsage: {},
        patternComplexity: { avgSegments: 0, maxSegments: 0, minSegments: 0 },
      },
      detectedPatterns: [],
      rawPatterns: new Map(),
    };
  }

  /**
   * Apply user configuration
   * @param {Object} config - User configuration
   */
  applyConfiguration(config) {
    this.options = { ...this.options, ...config };
  }

  /**
   * Get current configuration
   * @returns {Object} - Current options
   */
  getConfiguration() {
    return { ...this.options };
  }
}

IntelligentPatternDetector;
{
  SEPARATORS,
  EXCLUDED_PATTERNS,
  COLOR_PATTERNS,
  SIZE_PATTERNS,
  VERSION_PATTERNS,
};

    module.exports = IntelligentPatternDetector;
  