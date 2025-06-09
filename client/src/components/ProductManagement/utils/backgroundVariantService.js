/**
 * Background Variant Detection Service
 *
 * Automatically processes products in the background to detect variants:
 * - Runs periodic analysis on local data
 * - Maintains detection cache for performance
 * - Provides real-time suggestions
 * - Handles incremental updates
 * - Queue-based processing for large datasets
 *
 * @author AI Assistant
 * @version 1.0.0
 */

import EnhancedPatternDetector from "./enhancedPatternDetector.js";

class BackgroundVariantDetectionService {
  constructor() {
    this.detector = new EnhancedPatternDetector();
    this.cache = new Map();
    this.processingQueue = [];
    this.isProcessing = false;
    this.lastAnalysis = null;
    this.listeners = new Set();

    // Configuration
    this.config = {
      analysisInterval: 5 * 60 * 1000, // 5 minutes
      batchSize: 100,
      maxCacheAge: 30 * 60 * 1000, // 30 minutes
      autoStart: true,
    };

    // Statistics
    this.stats = {
      totalAnalyses: 0,
      lastAnalysisTime: null,
      lastAnalysisDuration: 0,
      cacheHits: 0,
      cacheMisses: 0,
      suggestionsGenerated: 0,
    };

    this.init();
  }

  /**
   * Initialize the background service
   */
  init() {
    this.loadCache();

    if (this.config.autoStart) {
      this.start();
    }

    // Listen for visibility changes to pause/resume
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          this.pause();
        } else {
          this.resume();
        }
      });
    }
  }

  /**
   * Start the background service
   */
  start() {
    if (this.intervalId) return;

    console.log("🚀 Starting Background Variant Detection Service");

    // Run initial analysis
    this.scheduleAnalysis();

    // Set up periodic analysis
    this.intervalId = setInterval(() => {
      this.scheduleAnalysis();
    }, this.config.analysisInterval);

    this.notifyListeners("service_started");
  }

  /**
   * Stop the background service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isProcessing = false;
    this.processingQueue = [];

    console.log("⏹️ Background Variant Detection Service stopped");
    this.notifyListeners("service_stopped");
  }

  /**
   * Pause the background service
   */
  pause() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log("⏸️ Background service paused");
  }

  /**
   * Resume the background service
   */
  resume() {
    if (!this.intervalId) {
      this.start();
      console.log("▶️ Background service resumed");
    }
  }

  /**
   * Schedule a new analysis
   * @param {Array} products - Optional specific products to analyze
   * @param {Object} options - Analysis options
   */
  async scheduleAnalysis(products = null, options = {}) {
    const analysisTask = {
      id: Date.now(),
      products: products,
      options: {
        priority: options.priority || "normal",
        cache: options.cache !== false,
        incremental: options.incremental || false,
        ...options,
      },
      timestamp: new Date().toISOString(),
    };

    // High priority tasks go to front of queue
    if (analysisTask.options.priority === "high") {
      this.processingQueue.unshift(analysisTask);
    } else {
      this.processingQueue.push(analysisTask);
    }

    this.processQueue();
  }

  /**
   * Process the analysis queue
   */
  async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) return;

    this.isProcessing = true;

    try {
      while (this.processingQueue.length > 0) {
        const task = this.processingQueue.shift();
        await this.executeAnalysis(task);

        // Small delay to prevent blocking
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } catch (error) {
      console.error("Error processing analysis queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single analysis task
   * @param {Object} task - Analysis task
   */
  async executeAnalysis(task) {
    const startTime = Date.now();

    try {
      console.log(`🔍 Executing background analysis task ${task.id}`);

      let products = task.products;

      // Get products from API if not provided
      if (!products) {
        products = await this.getProductsFromAPI();
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(products, task.options);
      if (task.options.cache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.config.maxCacheAge) {
          this.stats.cacheHits++;
          this.notifyListeners("analysis_cached", {
            taskId: task.id,
            results: cached.results,
          });
          return;
        }
      }

      // Perform analysis
      const results = await this.detector.analyzeProducts(
        products,
        task.options
      );

      // Update statistics
      this.stats.totalAnalyses++;
      this.stats.lastAnalysisTime = new Date().toISOString();
      this.stats.lastAnalysisDuration = Date.now() - startTime;
      this.stats.suggestionsGenerated += results.suggestions.length;
      this.stats.cacheMisses++;

      // Cache results
      if (task.options.cache) {
        this.cache.set(cacheKey, {
          results: results,
          timestamp: Date.now(),
          products: products.length,
        });
      }

      // Store last analysis
      this.lastAnalysis = {
        results: results,
        timestamp: new Date().toISOString(),
        taskId: task.id,
      };

      // Save cache to localStorage
      this.saveCache();

      // Notify listeners
      this.notifyListeners("analysis_complete", {
        taskId: task.id,
        results: results,
        duration: Date.now() - startTime,
      });

      console.log(
        `✅ Analysis task ${task.id} completed in ${Date.now() - startTime}ms`
      );
    } catch (error) {
      console.error(`❌ Analysis task ${task.id} failed:`, error);
      this.notifyListeners("analysis_error", {
        taskId: task.id,
        error: error.message,
      });
    }
  }

  /**
   * Get products from API
   * @returns {Array} - Array of products
   */
  async getProductsFromAPI() {
    try {
      const response = await fetch("/api/products?include_variants=false");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data.products || data || [];
    } catch (error) {
      console.error("Failed to fetch products from API:", error);
      return [];
    }
  }

  /**
   * Generate cache key for analysis
   * @param {Array} products - Products array
   * @param {Object} options - Analysis options
   * @returns {string} - Cache key
   */
  generateCacheKey(products, options) {
    const productHashes = products.map(
      (p) => `${p.id}_${p.updatedAt || p.sku}`
    );
    const productHash = this.simpleHash(productHashes.join(""));
    const optionsHash = this.simpleHash(JSON.stringify(options));
    return `analysis_${productHash}_${optionsHash}`;
  }

  /**
   * Simple hash function for cache keys
   * @param {string} str - String to hash
   * @returns {string} - Hash
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get real-time suggestions for a specific product
   * @param {Object} product - Product to analyze
   * @param {Array} allProducts - All products for context
   * @returns {Array} - Array of suggestions
   */
  async getProductSuggestions(product, allProducts) {
    if (!product || !allProducts) return [];

    try {
      // Quick analysis for single product context
      const miniAnalysis = await this.detector.analyzeProducts(
        [product, ...allProducts.filter((p) => p.id !== product.id)],
        { cache: false, lightweight: true }
      );

      // Find suggestions that include this product
      return miniAnalysis.suggestions.filter((suggestion) =>
        suggestion.products.some((p) => p.id === product.id)
      );
    } catch (error) {
      console.error("Error getting product suggestions:", error);
      return [];
    }
  }

  /**
   * Force immediate analysis
   * @param {Array} products - Products to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise} - Analysis results
   */
  async forceAnalysis(products = null, options = {}) {
    return new Promise((resolve, reject) => {
      const taskId = Date.now();

      // Listen for completion
      const handler = (event, data) => {
        if (data.taskId === taskId) {
          this.removeListener(handler);
          if (event === "analysis_complete") {
            resolve(data.results);
          } else if (event === "analysis_error") {
            reject(new Error(data.error));
          }
        }
      };

      this.addListener(handler);

      // Schedule high-priority analysis
      this.scheduleAnalysis(products, {
        ...options,
        priority: "high",
        cache: false,
      });
    });
  }

  /**
   * Get cached results if available
   * @param {Array} products - Products array
   * @param {Object} options - Analysis options
   * @returns {Object|null} - Cached results or null
   */
  getCachedResults(products, options = {}) {
    const cacheKey = this.generateCacheKey(products, options);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.config.maxCacheAge) {
      this.stats.cacheHits++;
      return cached.results;
    }

    this.stats.cacheMisses++;
    return null;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.saveCache();
    console.log("🗑️ Cache cleared");
  }

  /**
   * Save cache to localStorage
   */
  saveCache() {
    try {
      const cacheData = {
        cache: Array.from(this.cache.entries()),
        stats: this.stats,
        timestamp: Date.now(),
      };
      localStorage.setItem(
        "background_variant_cache",
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.warn("Failed to save cache:", error);
    }
  }

  /**
   * Load cache from localStorage
   */
  loadCache() {
    try {
      const saved = localStorage.getItem("background_variant_cache");
      if (saved) {
        const data = JSON.parse(saved);

        // Check if cache is not too old (24 hours)
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          this.cache = new Map(data.cache);
          this.stats = { ...this.stats, ...data.stats };
        }
      }
    } catch (error) {
      console.warn("Failed to load cache:", error);
    }
  }

  /**
   * Add event listener
   * @param {Function} listener - Event listener function
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   * @param {Function} listener - Event listener function
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of an event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  notifyListeners(event, data = {}) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (error) {
        console.error("Error in background service listener:", error);
      }
    });
  }

  /**
   * Get service status
   * @returns {Object} - Status object
   */
  getStatus() {
    return {
      isRunning: !!this.intervalId,
      isProcessing: this.isProcessing,
      queueLength: this.processingQueue.length,
      cacheSize: this.cache.size,
      lastAnalysis: this.lastAnalysis?.timestamp,
      statistics: { ...this.stats },
    };
  }

  /**
   * Update service configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    const oldInterval = this.config.analysisInterval;
    this.config = { ...this.config, ...newConfig };

    // Restart service if interval changed
    if (
      newConfig.analysisInterval &&
      newConfig.analysisInterval !== oldInterval
    ) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get configuration
   * @returns {Object} - Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Export analytics data
   * @returns {Object} - Analytics data
   */
  exportAnalytics() {
    return {
      statistics: { ...this.stats },
      config: { ...this.config },
      cacheInfo: {
        size: this.cache.size,
        entries: this.cache.size > 0 ? Array.from(this.cache.keys()) : [],
      },
      lastAnalysis: this.lastAnalysis,
      queueStatus: {
        length: this.processingQueue.length,
        isProcessing: this.isProcessing,
      },
    };
  }
}

// Singleton instance
let serviceInstance = null;

/**
 * Get singleton instance of the background service
 * @returns {BackgroundVariantDetectionService} - Service instance
 */
export function getBackgroundService() {
  if (!serviceInstance) {
    serviceInstance = new BackgroundVariantDetectionService();
  }
  return serviceInstance;
}

export default BackgroundVariantDetectionService;
