// SKU Variant Detection Utility
// Automatically detects and groups products based on SKU patterns
// Excludes "orj" extensions as separate products per requirements

// SKU variant patterns to detect (excluding orj)
const VARIANT_PATTERNS = [
  "-xl", // Extra Large
  "-s", // Small
  "-m", // Medium
  "-l", // Large
  "-v2", // Version 2
  "-v3", // Version 3
  "-a", // Type A
  "-b", // Type B
  "-c", // Type C
  "-d", // Type D
  "-ab", // Type AB
  "-cd", // Type CD
  "-1", // Variant 1
  "-2", // Variant 2
  "-3", // Variant 3
  "-black", // Color variants
  "-white",
  "-red",
  "-blue",
  "-green",
  "-yellow",
  "-purple",
  "-tr", // Turkish variant
  "-en", // English variant
  "-ing",
  "-gr",
];

// Patterns that should NOT be considered variants (separate products)
const EXCLUDED_PATTERNS = [
  "-orj", // Original - should remain separate
  "-org", // Original (alternative) - should remain separate
];

class SKUVariantDetector {
  constructor() {
    this.detectedGroups = new Map();
    this.suggestions = new Map();
  }

  /**
   * Extract base SKU by removing variant suffixes
   * @param {string} sku - Product SKU
   * @returns {string} - Base SKU or original if no pattern found
   */
  extractBaseSKU(sku) {
    if (!sku) return null;

    const lowerSku = sku.toLowerCase();

    // Check if SKU has excluded patterns - if so, treat as separate product
    for (const excludedPattern of EXCLUDED_PATTERNS) {
      if (lowerSku.endsWith(excludedPattern)) {
        return sku; // Return original SKU, don't extract base
      }
    }

    // Sort patterns by length (longest first) to avoid partial matches
    const sortedPatterns = VARIANT_PATTERNS.sort((a, b) => b.length - a.length);

    for (const pattern of sortedPatterns) {
      if (lowerSku.endsWith(pattern)) {
        return sku.substring(0, sku.length - pattern.length);
      }
    }

    return sku; // Return original if no variant pattern found
  }

  /**
   * Detect variant type from SKU
   * @param {string} sku - Product SKU
   * @param {string} baseSKU - Base SKU
   * @returns {string} - Variant type description
   */
  detectVariantType(sku, baseSKU) {
    if (!sku || !baseSKU || sku.length <= baseSKU.length) return "Standard";

    const suffix = sku.substring(baseSKU.length).toLowerCase();

    const variantTypeMap = {
      "-xl": "Extra Large",
      "-s": "Small",
      "-m": "Medium",
      "-l": "Large",
      "-v2": "Version 2",
      "-v3": "Version 3",
      "-a": "Type A",
      "-b": "Type B",
      "-c": "Type C",
      "-d": "Type D",
      "-ab": "Type AB",
      "-cd": "Type CD",
      "-1": "Variant 1",
      "-2": "Variant 2",
      "-3": "Variant 3",
      "-black": "Black",
      "-white": "White",
      "-red": "Red",
      "-blue": "Blue",
      "-green": "Green",
      "-yellow": "Yellow",
      "-purple": "Purple",
      "-tr": "Turkish",
      "-en": "English",
      "-ing": "Ing",
      "-gr": "Gr",
    };

    return variantTypeMap[suffix] || `Variant ${suffix}`;
  }

  /**
   * Analyze products and group by base SKU
   * @param {Array} products - Array of product objects
   * @returns {Object} - Grouped products and analysis results
   */
  analyzeProducts(products) {
    if (!Array.isArray(products))
      return { groups: new Map(), suggestions: new Map(), stats: {} };

    const productGroups = new Map();
    const suggestions = new Map();
    let stats = {
      totalProducts: products.length,
      potentialGroups: 0,
      variantsDetected: 0,
      processedProducts: 0,
      excludedProducts: 0,
    };

    // Group products by base SKU
    for (const product of products) {
      if (!product.sku) continue;

      const baseSKU = this.extractBaseSKU(product.sku);
      const variantType = this.detectVariantType(product.sku, baseSKU);
      const isVariant = product.sku !== baseSKU;
      const isExcluded = this.isExcludedProduct(product.sku);

      if (isExcluded) {
        stats.excludedProducts++;
      }

      if (!productGroups.has(baseSKU)) {
        productGroups.set(baseSKU, []);
      }

      productGroups.get(baseSKU).push({
        ...product,
        baseSKU,
        variantType,
        isVariant,
        isExcluded,
        differences: this.calculateDifferences(
          product,
          productGroups.get(baseSKU)[0]
        ),
      });

      stats.processedProducts++;
    }

    // Filter groups that have more than one product
    const variantGroups = new Map();
    for (const [baseSKU, groupProducts] of productGroups) {
      if (groupProducts.length > 1) {
        variantGroups.set(baseSKU, groupProducts);
        stats.potentialGroups++;
        stats.variantsDetected += groupProducts.length - 1;
      }
    }

    // Generate suggestions for manual grouping
    this.generateSuggestions(products, suggestions);

    return {
      groups: variantGroups,
      suggestions,
      stats,
      allGroups: productGroups,
    };
  }

  /**
   * Check if product should be excluded from variant grouping
   * @param {string} sku - Product SKU
   * @returns {boolean} - True if excluded
   */
  isExcludedProduct(sku) {
    if (!sku) return false;
    const lowerSku = sku.toLowerCase();
    return EXCLUDED_PATTERNS.some((pattern) => lowerSku.endsWith(pattern));
  }

  /**
   * Calculate differences between variant and base product
   * @param {Object} variant - Variant product
   * @param {Object} baseProduct - Base product
   * @returns {Object} - Differences object
   */
  calculateDifferences(variant, baseProduct) {
    if (!baseProduct) return {};

    const differences = {};

    // Price difference
    if (variant.price !== baseProduct.price) {
      differences.price = `₺${variant.price?.toLocaleString("tr-TR") || 0}`;
    }

    // Stock difference
    if (variant.stockQuantity !== baseProduct.stockQuantity) {
      differences.stock = variant.stockQuantity || 0;
    }

    // Status difference
    if (variant.status !== baseProduct.status) {
      differences.status = variant.status;
    }

    return differences;
  }

  /**
   * Generate suggestions for manual grouping
   * @param {Array} products - Array of products
   * @param {Map} suggestions - Suggestions map to populate
   */
  generateSuggestions(products, suggestions) {
    // Find products with similar names or SKUs that could be variants
    const similarityThreshold = 0.7;

    for (let i = 0; i < products.length; i++) {
      const product1 = products[i];
      if (this.isExcludedProduct(product1.sku)) continue;

      for (let j = i + 1; j < products.length; j++) {
        const product2 = products[j];
        if (this.isExcludedProduct(product2.sku)) continue;

        const similarity = this.calculateSimilarity(product1, product2);

        if (similarity >= similarityThreshold) {
          const suggestionKey = `${product1.id}-${product2.id}`;
          suggestions.set(suggestionKey, {
            products: [product1, product2],
            similarity,
            reason: this.getSuggestionReason(product1, product2, similarity),
            confidence: this.getConfidenceLevel(similarity),
          });
        }
      }
    }
  }

  /**
   * Calculate similarity between two products
   * @param {Object} product1 - First product
   * @param {Object} product2 - Second product
   * @returns {number} - Similarity score (0-1)
   */
  calculateSimilarity(product1, product2) {
    let score = 0;
    let factors = 0;

    // SKU similarity
    if (product1.sku && product2.sku) {
      const skuSimilarity = this.stringSimilarity(product1.sku, product2.sku);
      score += skuSimilarity * 0.4;
      factors += 0.4;
    }

    // Name similarity
    if (product1.name && product2.name) {
      const nameSimilarity = this.stringSimilarity(
        product1.name,
        product2.name
      );
      score += nameSimilarity * 0.3;
      factors += 0.3;
    }

    // Category similarity
    if (product1.category && product2.category) {
      const categorySimilarity =
        product1.category === product2.category ? 1 : 0;
      score += categorySimilarity * 0.2;
      factors += 0.2;
    }

    // Brand similarity
    if (product1.brand && product2.brand) {
      const brandSimilarity = product1.brand === product2.brand ? 1 : 0;
      score += brandSimilarity * 0.1;
      factors += 0.1;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Similarity score (0-1)
   */
  stringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
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
   * Get suggestion reason based on similarity analysis
   * @param {Object} product1 - First product
   * @param {Object} product2 - Second product
   * @param {number} similarity - Similarity score
   * @returns {string} - Suggestion reason
   */
  getSuggestionReason(product1, product2, similarity) {
    const reasons = [];

    if (this.stringSimilarity(product1.sku, product2.sku) > 0.8) {
      reasons.push("Benzer SKU");
    }

    if (this.stringSimilarity(product1.name, product2.name) > 0.8) {
      reasons.push("Benzer isim");
    }

    if (product1.category === product2.category) {
      reasons.push("Aynı kategori");
    }

    if (product1.brand === product2.brand) {
      reasons.push("Aynı marka");
    }

    return reasons.length > 0 ? reasons.join(", ") : "Genel benzerlik";
  }

  /**
   * Get confidence level based on similarity score
   * @param {number} similarity - Similarity score
   * @returns {string} - Confidence level
   */
  getConfidenceLevel(similarity) {
    if (similarity >= 0.9) return "Yüksek";
    if (similarity >= 0.8) return "Orta";
    if (similarity >= 0.7) return "Düşük";
    return "Çok Düşük";
  }

  /**
   * Process products for automatic variant grouping
   * @param {Array} products - Array of products
   * @returns {Array} - Processed products with variant relationships
   */
  processProducts(products) {
    const analysis = this.analyzeProducts(products);
    const processedProducts = [];

    // Add base products with their variants
    for (const [baseSKU, groupProducts] of analysis.groups) {
      const baseProduct =
        groupProducts.find((p) => !p.isVariant) || groupProducts[0];

      // Mark as having variants and add variant array
      const enhancedBaseProduct = {
        ...baseProduct,
        hasVariants: true,
        variants: groupProducts
          .filter((p) => p.isVariant)
          .map((variant) => ({
            ...variant,
            id: `variant-${variant.id}`,
          })),
      };

      processedProducts.push(enhancedBaseProduct);
    }

    // Add products that don't have variants (including excluded ones)
    for (const [baseSKU, groupProducts] of analysis.allGroups) {
      if (groupProducts.length === 1) {
        processedProducts.push({
          ...groupProducts[0],
          hasVariants: false,
          variants: [],
        });
      }
    }

    return {
      products: processedProducts,
      analysis,
    };
  }
}

export default SKUVariantDetector;
export { VARIANT_PATTERNS, EXCLUDED_PATTERNS };
