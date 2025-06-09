/**
 * Corrected Server-Side Intelligent Pattern Detector
 * Based on the working client-side algorithm
 */

// Constants
const SEPARATORS = ["-", "_", ".", " "];
const EXCLUSION_PATTERNS = ["orj", "original", "org", "test", "temp", "copy"];

// Color patterns for variant type detection
const COLOR_PATTERNS = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "white",
  "purple",
  "orange",
  "pink",
  "gray",
  "grey",
  "brown",
  "silver",
  "gold",
  "navy",
  "darkblue",
  "lightblue",
  "darkgreen",
  "lightgreen",
  "siyah",
  "beyaz",
  "kırmızı",
  "mavi",
  "yeşil",
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

class CorrectedIntelligentPatternDetector {
  constructor(options = {}) {
    this.options = {
      minGroupSize: 2,
      minConfidence: 70,
      maxPatternLength: 4,
      enableSmartExclusions: true,
      enableMultipleSeparators: true,
      ...options,
    };
  }

  analyzeProducts(products, options = {}) {
    const startTime = Date.now();
    const mergedOptions = { ...this.options, ...options };

    if (!Array.isArray(products) || products.length === 0) {
      return {
        suggestions: [],
        detectedPatterns: [],
        totalProducts: 0,
        totalPatterns: 0,
        processingTime: Date.now() - startTime,
        statistics: {
          totalProducts: 0,
          patternsFound: 0,
          averageConfidence: 0,
        },
      };
    }

    console.log(
      `📊 Analyzing ${products.length} products with options:`,
      mergedOptions
    );

    // Step 1: Extract all possible patterns from SKUs
    const allPatterns = this._extractAllPatterns(products, mergedOptions);

    // Step 2: Filter and score patterns
    const scoredPatterns = this._scorePatterns(
      allPatterns,
      products,
      mergedOptions
    );

    // Step 3: Generate variant grouping suggestions
    const suggestions = this._generateSuggestions(scoredPatterns, products);

    // Step 4: Calculate statistics
    const statistics = this._calculateStatistics(products, suggestions);

    const processingTime = Date.now() - startTime;

    return {
      suggestions: suggestions,
      detectedPatterns: suggestions, // For compatibility
      totalProducts: products.length,
      totalPatterns: suggestions.length,
      processingTime: processingTime,
      statistics: {
        ...statistics,
        processingTime,
      },
    };
  }

  _extractAllPatterns(products, options) {
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
          length < Math.min(segments.length, options.maxPatternLength);
          length++
        ) {
          const pattern = segments.slice(0, length).join(separator);

          // Skip if pattern is too short or contains excluded terms
          if (this._shouldExcludePattern(pattern, options)) continue;

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

            // Skip variants that contain excluded patterns
            if (
              options.enableSmartExclusions &&
              this._shouldExcludeVariant(remainingSuffix)
            ) {
              continue;
            }

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

  _shouldExcludePattern(pattern, options) {
    if (!pattern || pattern.length < 2) return true;

    if (options.enableSmartExclusions) {
      const lowerPattern = pattern.toLowerCase();
      return EXCLUSION_PATTERNS.some((exc) => lowerPattern.includes(exc));
    }

    return false;
  }

  _shouldExcludeVariant(variant) {
    if (!variant) return false;

    const lowerVariant = variant.toLowerCase();
    return EXCLUSION_PATTERNS.some((exc) => lowerVariant.includes(exc));
  }

  _scorePatterns(patterns, products, options) {
    const scoredPatterns = [];

    for (const [, patternData] of patterns) {
      // Only consider patterns with multiple products
      if (patternData.frequency < options.minGroupSize) continue;

      const score = this._calculatePatternScore(patternData, products);

      if (score.totalConfidence >= options.minConfidence) {
        scoredPatterns.push({
          ...patternData,
          score,
          confidence: Math.round(score.totalConfidence),
        });
      }
    }

    // Sort by confidence (descending)
    return scoredPatterns.sort((a, b) => b.confidence - a.confidence);
  }

  _calculatePatternScore(patternData, allProducts) {
    let score = 50; // Base score

    // Frequency factor (more products = higher score)
    const frequencyScore = Math.min(patternData.frequency * 10, 30);
    score += frequencyScore;

    // Variant diversity factor
    const uniqueVariants = new Set(patternData.variants.map((v) => v.suffix));
    const diversityScore = Math.min(uniqueVariants.size * 5, 20);
    score += diversityScore;

    // Pattern quality factor
    const avgVariantLength =
      patternData.variants.reduce((sum, v) => sum + v.suffix.length, 0) /
      patternData.variants.length;
    if (avgVariantLength <= 4) {
      score += 10; // Short, clean variants
    }

    // Variant type bonus
    const variantType = this._detectVariantType(Array.from(uniqueVariants));
    if (variantType !== "generic") {
      score += 10;
    }

    return {
      totalConfidence: Math.min(score, 100),
      frequencyScore,
      diversityScore,
      variantType,
    };
  }

  _generateSuggestions(scoredPatterns, products) {
    const suggestions = [];

    scoredPatterns.forEach((pattern, index) => {
      const variantList = [...new Set(pattern.variants.map((v) => v.suffix))];
      const variantType = this._detectVariantType(variantList);

      suggestions.push({
        id: `pattern-${index + 1}`,
        pattern: pattern.pattern,
        basePattern: pattern.pattern,
        separator: pattern.separator,
        confidence: pattern.confidence,
        variantType: variantType,
        groupType: variantType, // Alias for compatibility
        variants: variantList,
        products: pattern.products,
        productCount: pattern.products.length,
        variantCount: variantList.length,
      });
    });

    return suggestions;
  }

  _detectVariantType(variants) {
    if (!variants || variants.length === 0) return "generic";

    const colorCount = variants.filter((v) =>
      COLOR_PATTERNS.some((color) => v.toLowerCase() === color.toLowerCase())
    ).length;

    const sizeCount = variants.filter((v) =>
      SIZE_PATTERNS.some((size) => v.toLowerCase() === size.toLowerCase())
    ).length;

    const versionCount = variants.filter((v) => {
      const lower = v.toLowerCase();
      return (
        VERSION_PATTERNS.some((ver) => lower === ver.toLowerCase()) ||
        /^v?\d+\.?\d*\.?\d*$/.test(v)
      );
    }).length;

    const numericCount = variants.filter((v) => /^\d+$/.test(v)).length;

    // Return the most common type
    if (colorCount >= variants.length * 0.5) return "color";
    if (sizeCount >= variants.length * 0.5) return "size";
    if (versionCount >= variants.length * 0.5) return "version";
    if (numericCount >= variants.length * 0.5) return "numeric";

    return "generic";
  }

  _calculateStatistics(products, suggestions) {
    const totalProducts = products.length;
    const patternsFound = suggestions.length;
    const averageConfidence =
      suggestions.length > 0
        ? suggestions.reduce((sum, s) => sum + s.confidence, 0) /
          suggestions.length
        : 0;

    const patternTypes = suggestions.reduce((acc, suggestion) => {
      acc[suggestion.variantType] = (acc[suggestion.variantType] || 0) + 1;
      return acc;
    }, {});

    const potentialVariants = suggestions.reduce(
      (sum, suggestion) => sum + suggestion.products.length,
      0
    );

    return {
      totalProducts,
      patternsFound,
      averageConfidence,
      avgConfidence: averageConfidence, // Alias for compatibility
      patternTypes,
      potentialVariants,
    };
  }

  // Additional methods for compatibility
  detectPatterns(products, options) {
    const analysis = this.analyzeProducts(products, options);
    return analysis.suggestions;
  }

  calculateStatistics(products, patterns) {
    return this._calculateStatistics(products, patterns);
  }

  calculateConfidence(group) {
    return this._calculatePatternScore(group, []).totalConfidence;
  }

  detectVariantType(variants) {
    return this._detectVariantType(variants);
  }

  applyPatterns(products, patterns) {
    console.log(
      `🔧 Applying ${patterns.length} patterns to ${products.length} products`
    );

    const groups = {};

    patterns.forEach((pattern, index) => {
      const groupId = `group-${pattern.id || index + 1}`;
      groups[groupId] = {
        id: groupId,
        basePattern: pattern.basePattern || pattern.pattern,
        separator: pattern.separator,
        variantType: pattern.variantType,
        products: pattern.products.map((product) => {
          const variant = this.extractVariant(product.sku, pattern);
          return {
            ...product,
            detectedVariant: variant,
            groupId,
          };
        }),
      };
    });

    return { groups };
  }

  extractVariant(sku, pattern) {
    const parts = sku.split(pattern.separator);
    const baseLength = (pattern.basePattern || pattern.pattern).split(
      pattern.separator
    ).length;
    return parts.slice(baseLength).join(pattern.separator);
  }
}

module.exports = CorrectedIntelligentPatternDetector;
