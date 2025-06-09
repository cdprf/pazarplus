/**
 * Node.js compatible version of IntelligentPatternDetector
 * Fallback for when the React-based version can't be imported
 */

class IntelligentPatternDetector {
  constructor() {
    this.options = {
      minConfidence: 70,
      minGroupSize: 2,
      maxPatternLength: 4,
      enableSmartExclusions: true,
    };
  }

  async analyzeProducts(products, options = {}) {
    const mergedOptions = { ...this.options, ...options };

    console.log(
      `📊 Analyzing ${products.length} products with options:`,
      mergedOptions
    );

    const patterns = this.detectPatterns(products, mergedOptions);
    const statistics = this.calculateStatistics(products, patterns);

    return {
      detectedPatterns: patterns,
      statistics,
      options: mergedOptions,
    };
  }

  detectPatterns(products, options) {
    const patterns = [];
    const separators = ["-", "_", ".", " "];
    const excludePatterns = options.enableSmartExclusions
      ? ["orj", "original", "org"]
      : [];

    // Group products by potential base patterns
    const baseGroups = new Map();

    products.forEach((product) => {
      const sku = product.sku || "";

      for (const separator of separators) {
        if (sku.includes(separator)) {
          const parts = sku.split(separator);

          for (
            let i = 1;
            i < parts.length && i <= options.maxPatternLength;
            i++
          ) {
            const baseParts = parts.slice(0, i);
            const variantParts = parts.slice(i);

            if (variantParts.length === 0) continue;

            const basePattern = baseParts.join(separator);
            const variant = variantParts.join(separator);

            // Skip excluded patterns
            if (
              excludePatterns.some((exc) => variant.toLowerCase().includes(exc))
            ) {
              continue;
            }

            const key = `${basePattern}|${separator}`;

            if (!baseGroups.has(key)) {
              baseGroups.set(key, {
                basePattern,
                separator,
                products: [],
                variants: [],
              });
            }

            baseGroups.get(key).products.push(product);
            baseGroups.get(key).variants.push(variant);
          }
        }
      }
    });

    // Convert valid groups to patterns
    let patternId = 1;
    baseGroups.forEach((group, key) => {
      if (group.products.length >= options.minGroupSize) {
        const confidence = this.calculateConfidence(group);

        if (confidence >= options.minConfidence) {
          patterns.push({
            id: `pattern-${patternId++}`,
            basePattern: group.basePattern,
            separator: group.separator,
            variants: [...new Set(group.variants)],
            products: group.products,
            confidence,
            variantType: this.detectVariantType(group.variants),
          });
        }
      }
    });

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  calculateConfidence(group) {
    let confidence = 50; // Base confidence

    // More products = higher confidence
    confidence += Math.min(group.products.length * 5, 30);

    // Consistent variant patterns
    const variantSet = new Set(group.variants);
    if (variantSet.size === group.variants.length) {
      confidence += 20; // No duplicate variants
    }

    // Pattern consistency
    const avgVariantLength =
      group.variants.reduce((sum, v) => sum + v.length, 0) /
      group.variants.length;
    if (avgVariantLength <= 4) {
      confidence += 10; // Short, clean variants
    }

    return Math.min(confidence, 100);
  }

  detectVariantType(variants) {
    const colorPatterns =
      /^(red|blue|green|yellow|black|white|purple|orange|pink|gray|grey)$/i;
    const sizePatterns = /^(xs|s|m|l|xl|xxl|small|medium|large|\d+)$/i;
    const versionPatterns = /^(v?\d+\.?\d*\.?\d*)$/i;
    const numericPatterns = /^\d+$/;

    const types = variants.map((variant) => {
      if (colorPatterns.test(variant)) return "color";
      if (sizePatterns.test(variant)) return "size";
      if (versionPatterns.test(variant)) return "version";
      if (numericPatterns.test(variant)) return "numeric";
      return "generic";
    });

    // Return most common type
    const typeCounts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(typeCounts).reduce((a, b) =>
      typeCounts[a] > typeCounts[b] ? a : b
    );
  }

  calculateStatistics(products, patterns) {
    const totalProducts = products.length;
    const patternsFound = patterns.length;
    const averageConfidence =
      patterns.length > 0
        ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
        : 0;

    const patternTypes = patterns.reduce((acc, pattern) => {
      acc[pattern.variantType] = (acc[pattern.variantType] || 0) + 1;
      return acc;
    }, {});

    const potentialVariants = patterns.reduce(
      (sum, pattern) => sum + pattern.products.length,
      0
    );

    return {
      totalProducts,
      patternsFound,
      averageConfidence,
      patternTypes,
      potentialVariants,
    };
  }

  async applyPatterns(products, patterns) {
    console.log(
      `🔧 Applying ${patterns.length} patterns to ${products.length} products`
    );

    const groups = {};

    patterns.forEach((pattern) => {
      const groupId = `group-${pattern.id}`;
      groups[groupId] = {
        id: groupId,
        basePattern: pattern.basePattern,
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
    const baseLength = pattern.basePattern.split(pattern.separator).length;
    return parts.slice(baseLength).join(pattern.separator);
  }
}

module.exports = IntelligentPatternDetector;
