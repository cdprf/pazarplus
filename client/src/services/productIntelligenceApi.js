import logger from "../utils/logger";
/**
 * Product Intelligence API Service
 *
 * Provides interface to the unified Product Intelligence API
 * for advanced variant detection and pattern analysis
 */

const API_BASE = "/api/product-intelligence";

class ProductIntelligenceApi {
  constructor() {
    // Don't store token in constructor - get it fresh for each request
  }

  /**
   * Get current authentication token
   */
  getToken() {
    return localStorage.getItem("token");
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken(); // Get fresh token for each request

    const config = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      // Enhanced error handling with debugging information
      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};

        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          errorData = {
            message:
              errorText || `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        // Log detailed error information for debugging
        logger.error(`Product Intelligence API Error (${endpoint}):`, {
          status: response.status,
          statusText: response.statusText,
          url: url,
          hasToken: !!token,
          tokenLength: token?.length || 0,
          errorData: errorData,
          headers: response.headers,
        });

        const error = new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
        error.status = response.status;
        error.response = { data: errorData };
        throw error;
      }

      return await response.json();
    } catch (error) {
      // Enhanced error logging
      logger.error(`Product Intelligence API Error (${endpoint}):`, {
        message: error.message,
        status: error.status,
        url: url,
        hasToken: !!token,
        tokenLength: token?.length || 0,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Check API health
   */
  async checkHealth() {
    return this.request("/health");
  }

  /**
   * Detect variant patterns in products
   */
  async detectVariants(products, options = {}) {
    return this.request("/variants/detect", {
      method: "POST",
      body: JSON.stringify({ products, options }),
    });
  }

  /**
   * Analyze naming patterns
   */
  async analyzeNamingPatterns(products, options = {}) {
    return this.request("/naming/patterns", {
      method: "POST",
      body: JSON.stringify({ products, options }),
    });
  }

  /**
   * Analyze classification patterns
   */
  async analyzeClassificationPatterns(products, options = {}) {
    return this.request("/classification/patterns", {
      method: "POST",
      body: JSON.stringify({ products, options }),
    });
  }

  /**
   * Generate intelligent pattern suggestions
   */
  async generatePatternSuggestions(analysisResults, options = {}) {
    return this.request("/suggestions/patterns", {
      method: "POST",
      body: JSON.stringify({ analysisResults, options }),
    });
  }

  /**
   * Generate optimization suggestions
   */
  async generateOptimizationSuggestions(analysisResults, options = {}) {
    return this.request("/suggestions/optimization", {
      method: "POST",
      body: JSON.stringify({ analysisResults, options }),
    });
  }

  /**
   * Submit user feedback for learning
   */
  async submitFeedback(feedback, options = {}) {
    return this.request("/learning/feedback", {
      method: "POST",
      body: JSON.stringify({ feedback, options }),
    });
  }

  /**
   * Perform comprehensive batch analysis
   */
  async batchAnalyze(products, options = {}) {
    return this.request("/batch/analyze", {
      method: "POST",
      body: JSON.stringify({ products, options }),
    });
  }

  /**
   * Get user learning patterns
   */
  async getUserLearning(options = {}) {
    const params = new URLSearchParams(options);
    return this.request(`/learning/patterns?${params}`);
  }

  /**
   * Enhanced analysis with all intelligence features
   */
  async performCompleteAnalysis(products, config = {}) {
    const options = {
      detectVariants: true,
      analyzeNaming: true,
      analyzeClassification: true,
      generateSuggestions: true,
      ...config,
    };

    try {
      logger.info("🔍 Attempting server-side analysis...", {
        endpoint: "/analyze",
        productsCount: products.length,
        hasToken: !!this.getToken(),
      });

      // Use the main analyze endpoint with products data
      const results = await this.request("/analyze", {
        method: "POST",
        body: JSON.stringify({ products, options }),
      });

      logger.info("✅ Server-side analysis successful!", results);

      return {
        success: true,
        data: results.data,
        timestamp: Date.now(),
        productsAnalyzed: products.length,
        source: "server",
      };
    } catch (error) {
      logger.warn(
        "⚠️ API analysis failed, using fallback pattern detection:",
        {
          error: error.message,
          status: error.status,
          hasToken: !!this.getToken(),
        }
      );

      // Generate fallback data with actual pattern detection
      const fallbackData = this._generateFallbackData(products, options);

      return {
        success: true, // Return success for fallback so UI doesn't show error
        data: fallbackData,
        timestamp: Date.now(),
        productsAnalyzed: products.length,
        isFailback: true,
        apiError: error.message,
        apiStatus: error.status,
        source: "fallback",
      };
    }
  }

  /**
   * Generate fallback data with actual pattern detection for offline/error scenarios
   */
  _generateFallbackData(products, options = {}) {
    logger.info(
      "🔧 Generating fallback analysis for",
      products.length,
      "products"
    );

    // Perform basic SKU pattern detection
    const skuGroups = this._detectSKUPatterns(products);
    const nameGroups = this._detectNamePatterns(products);

    // Generate suggestions from detected patterns
    const suggestions = this._generateSuggestions(
      skuGroups,
      nameGroups,
      products
    );

    // Create variant groups
    const variantGroups = this._createVariantGroups(suggestions);

    // Calculate statistics
    const statistics = {
      products_processed: products.length,
      classifications_made: suggestions.length,
      groups_created: variantGroups.length,
      patterns_detected: skuGroups.length + nameGroups.length,
      merge_operations: 0,
      learning_updates: 0,
      total_suggestions: suggestions.length,
      high_confidence_suggestions: suggestions.filter(
        (s) => s.confidence >= 0.8
      ).length,
    };

    return {
      suggestions,
      statistics,
      variantGroups,
      patterns: [...skuGroups, ...nameGroups],
      classification: {
        statistics: {
          total_classified: suggestions.length,
          skus_detected: skuGroups.length,
          barcodes_detected: 0,
          patterns_learned: skuGroups.length + nameGroups.length,
        },
      },
      merging: {
        groups: variantGroups,
      },
      fallbackMode: true,
      timestamp: Date.now(),
    };
  }

  /**
   * Detect SKU-based patterns
   */
  _detectSKUPatterns(products) {
    const skuGroups = {};

    products.forEach((product) => {
      if (!product.sku) return;

      // Split SKU by common separators
      const parts = product.sku.split(/[-_\s]/);
      if (parts.length >= 2) {
        const basePattern = parts[0];

        if (!skuGroups[basePattern]) {
          skuGroups[basePattern] = {
            id: `sku-${basePattern}`,
            type: "sku",
            pattern: basePattern,
            products: [],
            confidence: 0,
          };
        }

        skuGroups[basePattern].products.push(product);
      }
    });

    // Calculate confidence and filter groups
    return Object.values(skuGroups)
      .filter((group) => group.products.length >= 2)
      .map((group) => ({
        ...group,
        confidence: Math.min(0.9, 0.5 + (group.products.length - 2) * 0.1),
      }));
  }

  /**
   * Detect name-based patterns
   */
  _detectNamePatterns(products) {
    const nameGroups = {};

    products.forEach((product) => {
      if (!product.name) return;

      // Extract base name (first few words)
      const words = product.name.toLowerCase().split(/\s+/);
      if (words.length >= 2) {
        const baseWords = words
          .slice(0, Math.min(3, words.length - 1))
          .join(" ");

        if (!nameGroups[baseWords]) {
          nameGroups[baseWords] = {
            id: `name-${baseWords.replace(/\s+/g, "-")}`,
            type: "name",
            pattern: baseWords,
            products: [],
            confidence: 0,
          };
        }

        nameGroups[baseWords].products.push(product);
      }
    });

    // Calculate confidence and filter groups
    return Object.values(nameGroups)
      .filter((group) => group.products.length >= 2)
      .map((group) => ({
        ...group,
        confidence: Math.min(0.8, 0.4 + (group.products.length - 2) * 0.1),
      }));
  }

  /**
   * Generate suggestions from detected patterns
   */
  _generateSuggestions(skuGroups, nameGroups, products) {
    const suggestions = [];

    // Add SKU-based suggestions
    skuGroups.forEach((group) => {
      suggestions.push({
        id: group.id,
        type: "variant",
        basePattern: group.pattern,
        products: group.products,
        confidence: group.confidence,
        reason: `SKU pattern "${group.pattern}" detected in ${group.products.length} products`,
        source: "sku_analysis",
        patternType: "sku_based",
      });
    });

    // Add name-based suggestions
    nameGroups.forEach((group) => {
      // Only add if not already covered by SKU patterns
      const hasSkuOverlap = suggestions.some((s) =>
        s.products.some((p) => group.products.some((gp) => gp.id === p.id))
      );

      if (!hasSkuOverlap) {
        suggestions.push({
          id: group.id,
          type: "variant",
          basePattern: group.pattern,
          products: group.products,
          confidence: group.confidence,
          reason: `Name pattern "${group.pattern}" detected in ${group.products.length} products`,
          source: "name_analysis",
          patternType: "name_based",
        });
      }
    });

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Create variant groups from suggestions
   */
  _createVariantGroups(suggestions) {
    return suggestions.map((suggestion, index) => ({
      id: `group-${index + 1}`,
      name: `${suggestion.basePattern} Variants`,
      products: suggestion.products,
      pattern: suggestion,
      type: "intelligent",
      confidence: suggestion.confidence,
      mainProductId: suggestion.products[0]?.id,
      createdAt: new Date().toISOString(),
    }));
  }
}

export default ProductIntelligenceApi;
