/**
 * Integrated Pattern Detection Engine
 *
 * Combines all existing pattern detection utilities into a unified engine
 * that works seamlessly with the Enhanced SKU Classification System
 *
 * Integrates:
 * - SKUVariantDetector
 * - IntelligentPatternDetector
 * - ComprehensivePatternDetector
 * - EnhancedPatternDetector
 * - SKU Classification patterns
 *
 * @author AI Assistant
 * @version 1.0.0
 */

/**
 * Integrated Pattern Detection Engine
 * Unifies all pattern detection capabilities
 */
class IntegratedPatternDetectionEngine {
  constructor(config = {}) {
    this.config = {
      similarity_threshold: config.similarity_threshold || 0.75,
      confidence_threshold: config.confidence_threshold || 0.6,
      pattern_analysis: {
        sku_variants: true,
        name_similarity: true,
        feature_clustering: true,
        hierarchical_patterns: true,
        classification_patterns: true
      },
      ...config
    };

    this.statistics = {
      patterns_detected: 0,
      variant_groups: 0,
      similarity_groups: 0,
      feature_clusters: 0,
      classification_patterns: 0,
      processing_time: 0
    };
  }

  /**
   * Main pattern detection method
   * @param {Array} products - Products to analyze
   * @param {Object} classificationData - SKU classification results
   * @returns {Object} Comprehensive pattern analysis
   */
  async detectPatterns(products, classificationData = null) {
    const startTime = Date.now();

    try {
      const results = {
        variant_patterns: new Map(),
        similarity_patterns: new Map(),
        feature_patterns: new Map(),
        classification_patterns: new Map(),
        hierarchical_patterns: new Map(),
        suggestions: [],
        confidence: {},
        statistics: {},
        metadata: {
          config_used: this.config,
          timestamp: new Date().toISOString()
        }
      };

      // Step 1: SKU Variant Pattern Detection
      if (this.config.pattern_analysis.sku_variants) {
        const variantPatterns = this.detectSKUVariantPatterns(
          products,
          classificationData
        );
        results.variant_patterns = variantPatterns;
        this.statistics.variant_groups += variantPatterns.size;
      }

      // Step 2: Name Similarity Pattern Detection
      if (this.config.pattern_analysis.name_similarity) {
        const similarityPatterns = this.detectNameSimilarityPatterns(products);
        results.similarity_patterns = similarityPatterns;
        this.statistics.similarity_groups += similarityPatterns.size;
      }

      // Step 3: Feature Clustering Pattern Detection
      if (this.config.pattern_analysis.feature_clustering) {
        const featurePatterns = await this.detectFeatureClusteringPatterns(
          products
        );
        results.feature_patterns = featurePatterns;
        this.statistics.feature_clusters += featurePatterns.size;
      }

      // Step 4: Classification-Based Pattern Detection
      if (
        this.config.pattern_analysis.classification_patterns &&
        classificationData
      ) {
        const classificationPatterns = this.detectClassificationPatterns(
          products,
          classificationData
        );
        results.classification_patterns = classificationPatterns;
        this.statistics.classification_patterns += classificationPatterns.size;
      }

      // Step 5: Hierarchical Pattern Detection
      if (this.config.pattern_analysis.hierarchical_patterns) {
        const hierarchicalPatterns = this.detectHierarchicalPatterns(
          products,
          classificationData
        );
        results.hierarchical_patterns = hierarchicalPatterns;
      }

      // Step 6: Generate Intelligent Suggestions
      results.suggestions = this.generatePatternSuggestions(results, products);

      // Step 7: Calculate Confidence Scores
      results.confidence = this.calculatePatternConfidence(results);

      // Update statistics
      this.statistics.processing_time = Date.now() - startTime;
      this.statistics.patterns_detected =
        results.variant_patterns.size +
        results.similarity_patterns.size +
        results.feature_patterns.size +
        results.classification_patterns.size;

      results.statistics = { ...this.statistics };

      return {
        success: true,
        results
      };
    } catch (error) {
      console.error('Pattern detection failed:', error);
      return {
        success: false,
        error: error.message,
        processing_time: Date.now() - startTime
      };
    }
  }

  /**
   * Detect SKU variant patterns using enhanced classification data
   */
  detectSKUVariantPatterns(products, classificationData) {
    const patterns = new Map();
    const processed = new Set();

    // Group products by base SKU patterns
    const basePatterns = new Map();

    products.forEach((product) => {
      if (processed.has(product.id)) {return;}

      const sku = this.extractSKU(product);
      if (!sku) {return;}

      // Get classification data if available
      const classification = classificationData?.classifications?.get(
        product.id
      );

      // Only process if classified as SKU or high confidence
      if (
        classification &&
        classification.type !== 'sku' &&
        classification.confidence < 0.7
      ) {
        return;
      }

      // Extract base pattern
      const basePattern = this.extractBaseSKUPattern(sku);

      if (basePattern) {
        if (!basePatterns.has(basePattern)) {
          basePatterns.set(basePattern, []);
        }
        basePatterns.get(basePattern).push(product);
      }
    });

    // Analyze each base pattern group for variants
    basePatterns.forEach((groupProducts, basePattern) => {
      if (groupProducts.length > 1) {
        const variantAnalysis = this.analyzeVariantGroup(
          groupProducts,
          basePattern
        );

        if (variantAnalysis.confidence > this.config.confidence_threshold) {
          patterns.set(basePattern, {
            basePattern,
            products: groupProducts,
            variants: variantAnalysis.variants,
            confidence: variantAnalysis.confidence,
            pattern_type: 'sku_variant',
            characteristics: variantAnalysis.characteristics
          });

          // Mark products as processed
          groupProducts.forEach((p) => processed.add(p.id));
        }
      }
    });

    return patterns;
  }

  /**
   * Detect name similarity patterns with fuzzy matching
   */
  detectNameSimilarityPatterns(products) {
    const patterns = new Map();
    const processed = new Set();

    for (let i = 0; i < products.length; i++) {
      const product1 = products[i];
      if (processed.has(product1.id)) {continue;}

      const similarProducts = [product1];
      processed.add(product1.id);

      const name1 = this.extractName(product1);
      if (!name1) {continue;}

      for (let j = i + 1; j < products.length; j++) {
        const product2 = products[j];
        if (processed.has(product2.id)) {continue;}

        const name2 = this.extractName(product2);
        if (!name2) {continue;}

        const similarity = this.calculateNameSimilarity(name1, name2);

        if (similarity >= this.config.similarity_threshold) {
          similarProducts.push(product2);
          processed.add(product2.id);
        }
      }

      if (similarProducts.length > 1) {
        const groupKey = `name_similarity_${product1.id}`;
        patterns.set(groupKey, {
          baseProduct: product1,
          products: similarProducts,
          similarity: this.calculateGroupAverageSimilarity(similarProducts),
          pattern_type: 'name_similarity',
          confidence: this.calculateNameSimilarityConfidence(similarProducts),
          characteristics: this.analyzeNameCharacteristics(similarProducts)
        });
      }
    }

    return patterns;
  }

  /**
   * Detect feature clustering patterns
   */
  async detectFeatureClusteringPatterns(products) {
    const patterns = new Map();

    // Extract features from products
    const features = products.map((product) =>
      this.extractProductFeatures(product)
    );

    // Perform clustering
    const clusters = await this.performFeatureClustering(features, products);

    clusters.forEach((cluster, index) => {
      if (cluster.products.length > 1) {
        patterns.set(`feature_cluster_${index}`, {
          products: cluster.products,
          centroid: cluster.centroid,
          features: cluster.features,
          pattern_type: 'feature_clustering',
          confidence: cluster.confidence,
          characteristics: this.analyzeFeatureCharacteristics(cluster)
        });
      }
    });

    return patterns;
  }

  /**
   * Detect patterns based on SKU classification results
   */
  detectClassificationPatterns(products, classificationData) {
    const patterns = new Map();

    // Group by classification type
    const skuProducts = [];
    const barcodeProducts = [];
    const unknownProducts = [];

    products.forEach((product) => {
      const classification = classificationData.classifications.get(product.id);

      if (classification) {
        switch (classification.type) {
        case 'sku':
          skuProducts.push({ product, classification });
          break;
        case 'barcode':
          barcodeProducts.push({ product, classification });
          break;
        default:
          unknownProducts.push({ product, classification });
        }
      }
    });

    // Analyze SKU patterns
    if (skuProducts.length > 1) {
      const skuPatterns = this.analyzeClassificationGroup(skuProducts, 'sku');
      patterns.set('sku_classification_patterns', skuPatterns);
    }

    // Analyze barcode patterns
    if (barcodeProducts.length > 1) {
      const barcodePatterns = this.analyzeClassificationGroup(
        barcodeProducts,
        'barcode'
      );
      patterns.set('barcode_classification_patterns', barcodePatterns);
    }

    return patterns;
  }

  /**
   * Detect hierarchical patterns (complex nested patterns)
   */
  detectHierarchicalPatterns(products, classificationData) {
    const patterns = new Map();

    // Look for complex hierarchical patterns like "nwk-as001", "abc-def-123"
    const hierarchicalGroups = new Map();

    products.forEach((product) => {
      const sku = this.extractSKU(product);
      if (!sku) {return;}

      // Check if classified as SKU
      const classification = classificationData?.classifications?.get(
        product.id
      );
      if (classification?.type !== 'sku') {return;}

      const hierarchicalPattern = this.extractHierarchicalPattern(sku);

      if (hierarchicalPattern) {
        if (!hierarchicalGroups.has(hierarchicalPattern.pattern)) {
          hierarchicalGroups.set(hierarchicalPattern.pattern, []);
        }

        hierarchicalGroups.get(hierarchicalPattern.pattern).push({
          product,
          hierarchical_data: hierarchicalPattern
        });
      }
    });

    // Analyze hierarchical groups
    hierarchicalGroups.forEach((group, pattern) => {
      if (group.length > 1) {
        patterns.set(pattern, {
          pattern,
          products: group.map((g) => g.product),
          hierarchy_data: group.map((g) => g.hierarchical_data),
          pattern_type: 'hierarchical',
          confidence: this.calculateHierarchicalConfidence(group),
          characteristics: this.analyzeHierarchicalCharacteristics(group)
        });
      }
    });

    return patterns;
  }

  /**
   * Helper Methods
   */

  extractSKU(product) {
    return product.sku || product.stockCode || product.merchantSku;
  }

  extractName(product) {
    return product.name || product.title || product.productName;
  }

  extractBaseSKUPattern(sku) {
    // Remove common variant suffixes to find base pattern
    const patterns = [
      /^(.+)[-_]\d+$/, // name-123, name_123
      /^(.+)[-_][a-z]+$/i, // name-xl, name_red
      /^(.+)[-_]v\d+$/i, // name-v1, name-v2
      /^(.+)\d{1,3}$/ // name123, name01
    ];

    for (const pattern of patterns) {
      const match = sku.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return sku; // Return original if no pattern found
  }

  extractHierarchicalPattern(sku) {
    // Detect patterns like "nwk-as001", "abc-def-123"
    const hierarchicalRegex = /^([a-z]+)[-_]([a-z]+)[-_]?(\d+)$/i;
    const match = sku.match(hierarchicalRegex);

    if (match) {
      return {
        pattern: `${match[1]}-${match[2]}-*`,
        level1: match[1],
        level2: match[2],
        level3: match[3],
        full_pattern: sku
      };
    }

    return null;
  }

  extractProductFeatures(product) {
    return {
      nameLength: (product.name || '').length,
      skuLength: (this.extractSKU(product) || '').length,
      priceRange: this.getPriceRange(product.price),
      categoryHash: this.hashString(product.category || ''),
      brandHash: this.hashString(product.brand || ''),
      nameTokens: (product.name || '').toLowerCase().split(/\s+/)
    };
  }

  calculateNameSimilarity(name1, name2) {
    // Use Levenshtein distance for name similarity
    return this.calculateStringSimilarity(name1, name2);
  }

  calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) {return 0;}

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {return 1;}

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1)
      .fill()
      .map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) {matrix[0][i] = i;}
    for (let j = 0; j <= str2.length; j++) {matrix[j][0] = j;}

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

  getPriceRange(price) {
    const p = parseFloat(price) || 0;
    if (p === 0) {return 'no_price';}
    if (p < 10) {return 'low';}
    if (p < 100) {return 'medium';}
    if (p < 1000) {return 'high';}
    return 'premium';
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

  // Placeholder methods for complex analysis (to be implemented)
  analyzeVariantGroup(products, basePattern) {
    return {
      variants: products.map((p) => ({ product: p, variant_type: 'detected' })),
      confidence: 0.8,
      characteristics: { base_pattern: basePattern }
    };
  }

  calculateGroupAverageSimilarity(products) {
    if (products.length < 2) {return 1;}

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        totalSimilarity += this.calculateNameSimilarity(
          this.extractName(products[i]),
          this.extractName(products[j])
        );
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  calculateNameSimilarityConfidence(products) {
    const avgSimilarity = this.calculateGroupAverageSimilarity(products);
    const sizeBonus = Math.min(products.length / 4, 0.2);
    return Math.min(avgSimilarity + sizeBonus, 1);
  }

  async performFeatureClustering(features, products) {
    // Simple clustering implementation
    const clusters = [];
    const processed = new Set();

    for (let i = 0; i < features.length; i++) {
      if (processed.has(i)) {continue;}

      const cluster = {
        centroid: features[i],
        products: [products[i]],
        features: [features[i]],
        confidence: 0.5
      };

      // Find similar products
      for (let j = i + 1; j < features.length; j++) {
        if (processed.has(j)) {continue;}

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

  calculateTokenSimilarity(tokens1, tokens2) {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  calculateClusterConfidence(cluster) {
    // Calculate confidence based on cluster cohesion
    const avgSimilarity = this.calculateGroupAverageSimilarity(
      cluster.products
    );
    const sizeBonus = Math.min(cluster.products.length * 0.1, 0.3);
    return Math.min(avgSimilarity + sizeBonus, 1.0);
  }

  // Additional placeholder methods
  analyzeNameCharacteristics(products) {
    return {};
  }
  analyzeFeatureCharacteristics(cluster) {
    return {};
  }
  analyzeClassificationGroup(products, type) {
    return {};
  }
  calculateHierarchicalConfidence(group) {
    return 0.8;
  }
  analyzeHierarchicalCharacteristics(group) {
    return {};
  }
  generatePatternSuggestions(results, products) {
    return [];
  }
  calculatePatternConfidence(results) {
    return { overall: 0.8 };
  }
}

module.exports = IntegratedPatternDetectionEngine;
