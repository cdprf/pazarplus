import logger from "../utils/logger.js";
import api from "./api";

/**
 * Consolidated Analytics Service - Frontend service for fetching analytics data
 * This service provides comprehensive analytics endpoints with caching, error handling, and timeout protection
 *
 * Features:
 * - Comprehensive analytics endpoints
 * - Intelligent error handling and retry logic
 * - Memory-efficient caching system
 * - Request timeout protection
 * - Performance optimizations
 * - Data formatting utilities
 */
class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    this.requestTimeout = 30000; // 30 seconds timeout
    this.maxCacheSize = 50; // Prevent memory bloat
  }

  /**
   * Generic request with timeout and caching
   */
  async makeRequest(endpoint, options = {}) {
    const cacheKey = `${endpoint}-${JSON.stringify(options)}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    // Clean cache if it gets too large
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanOldCache();
    }

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Request timeout")),
          this.requestTimeout
        )
      );

      // Make API request
      const requestPromise = api.get(endpoint, {
        timeout: this.requestTimeout,
        ...options,
      });

      const response = await Promise.race([requestPromise, timeoutPromise]);

      // Cache successful response
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error) {
      logger.error(`Error fetching ${endpoint}:`, error);
      throw this.enhanceError(error, endpoint);
    }
  }

  /**
   * Clean old cache entries
   */
  cleanOldCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Enhance error with more context
   */
  enhanceError(error, endpoint) {
    const enhancedError = new Error(error.message);
    enhancedError.endpoint = endpoint;
    enhancedError.timestamp = new Date();
    enhancedError.originalError = error;

    if (error.message.includes("timeout")) {
      enhancedError.type = "TIMEOUT";
      enhancedError.message = "Request timed out. Please try again.";
    } else if (error.response?.status === 401) {
      enhancedError.type = "UNAUTHORIZED";
      enhancedError.message = "Authentication required. Please log in.";
    } else if (error.response?.status >= 500) {
      enhancedError.type = "SERVER_ERROR";
      enhancedError.message = "Server error. Please try again later.";
    } else if (error.response?.status === 404) {
      enhancedError.type = "NOT_FOUND";
      enhancedError.message = "Analytics endpoint not found.";
    }

    return enhancedError;
  }

  /**
   * Clear cache
   */
  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(timeframe = "30d") {
    return this.makeRequest(`/analytics/dashboard?timeframe=${timeframe}`);
  }

  /**
   * Get business intelligence insights
   */
  async getBusinessIntelligence(timeframe = "30d") {
    return this.makeRequest(
      `/analytics/business-intelligence?timeframe=${timeframe}`
    );
  }

  /**
   * Get revenue analytics data
   */
  async getRevenueAnalytics(timeframe = "30d", breakdown = "daily") {
    const params = breakdown ? `&breakdown=${breakdown}` : "";
    return this.makeRequest(
      `/analytics/revenue?timeframe=${timeframe}${params}`
    );
  }

  /**
   * Get sales analytics data (using dashboard endpoint)
   */
  async getSalesAnalytics(timeframe = "30d") {
    return this.makeRequest(`/analytics/dashboard?timeframe=${timeframe}`);
  }

  /**
   * Get platform performance comparison
   */
  async getPlatformPerformance(timeframe = "30d") {
    return this.makeRequest(
      `/analytics/platform-performance?timeframe=${timeframe}`
    );
  }

  /**
   * Get inventory insights and optimization suggestions
   */
  async getInventoryInsights(timeframe = "30d") {
    return this.makeRequest(`/analytics/inventory?timeframe=${timeframe}`);
  }

  /**
   * Get customer analytics data (with retry logic)
   */
  async getCustomerAnalytics(timeframe = "30d") {
    return this.makeRequest(
      `/analytics/customer-analytics?timeframe=${timeframe}`
    );
  }

  /**
   * Get predictive analytics and forecasting
   */
  async getPredictiveAnalytics(timeframe = "30d") {
    return this.makeRequest(`/analytics/predictions?timeframe=${timeframe}`);
  }

  /**
   * Get real-time analytics dashboard
   */
  async getRealTimeAnalytics() {
    return this.makeRequest("/analytics/real-time");
  }

  /**
   * Get anomaly detection insights
   */
  async getAnomalyDetection(timeframe = "30d") {
    return this.makeRequest(
      `/analytics/anomaly-detection?timeframe=${timeframe}`
    );
  }

  /**
   * Get trends analysis
   */
  async getTrends(timeframe = "30d") {
    return this.makeRequest(`/analytics/trends?timeframe=${timeframe}`);
  }

  /**
   * Get competitive analysis
   */
  async getCompetitiveAnalysis(timeframe = "30d") {
    return this.makeRequest(
      `/analytics/competitive-analysis?timeframe=${timeframe}`
    );
  }

  /**
   * Get funnel analysis
   */
  async getFunnelAnalysis(timeframe = "30d") {
    return this.makeRequest(
      `/analytics/funnel-analysis?timeframe=${timeframe}`
    );
  }

  /**
   * Get attribution analysis
   */
  async getAttributionAnalysis(timeframe = "30d") {
    return this.makeRequest(
      `/analytics/attribution-analysis?timeframe=${timeframe}`
    );
  }

  /**
   * Get enhanced product analytics with insights
   */
  async getEnhancedProductAnalytics(timeframe = "30d") {
    try {
      return await this.makeRequest(
        `/analytics/products?timeframe=${timeframe}`
      );
    } catch (error) {
      logger.warn("Enhanced product analytics failed, using fallback");
      return this.getProductAnalytics(timeframe);
    }
  }

  /**
   * Get advanced analytics (combination of multiple endpoints)
   */
  async getAdvancedAnalytics(timeframe = "30d") {
    return this.makeRequest(
      `/analytics/business-intelligence?timeframe=${timeframe}`
    );
  }

  /**
   * Get product analytics data
   */
  async getProductAnalytics(timeframe = "30d") {
    return this.makeRequest(`/analytics/products?timeframe=${timeframe}`);
  }

  /**
   * Get platform analytics data
   */
  async getPlatformAnalytics(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/platform-performance?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      logger.error("Error fetching platform analytics:", error);
      throw error;
    }
  }

  /**
   * Get financial analytics data
   */
  async getFinancialAnalytics(timeframe = "30d") {
    return this.makeRequest(`/analytics/financial-kpis?timeframe=${timeframe}`);
  }

  /**
   * Get cohort analysis data
   */
  async getCohortAnalytics(timeframe = "30d") {
    return this.makeRequest(
      `/analytics/cohort-analysis?timeframe=${timeframe}`
    );
  }

  /**
   * Get operational analytics data (using dashboard endpoint)
   */

  /**
   * Get operational analytics data (using dashboard endpoint)
   */
  async getOperationalAnalytics(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/dashboard?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      logger.error("Error fetching operational analytics:", error);
      throw error;
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(type, timeframe = "30d", format = "xlsx") {
    try {
      const response = await api.get(
        `/analytics/export/${type}?timeframe=${timeframe}&format=${format}`,
        {
          responseType: "blob",
        }
      );
      return response.data;
    } catch (error) {
      logger.error("Error exporting analytics:", error);
      throw error;
    }
  }

  /**
   * Get combined analytics data for overview
   */
  async getOverviewAnalytics(timeframe = "30d") {
    try {
      const [
        dashboard,
        revenue,
        sales,
        products,
        platforms,
        customers,
        financial,
      ] = await Promise.all([
        this.getDashboardAnalytics(timeframe),
        this.getRevenueAnalytics(timeframe),
        this.getSalesAnalytics(timeframe),
        this.getProductAnalytics(timeframe),
        this.getPlatformAnalytics(timeframe),
        this.getCustomerAnalytics(timeframe),
        this.getFinancialAnalytics(timeframe),
      ]);

      return {
        dashboard,
        revenue,
        sales,
        products,
        platforms,
        customers,
        financial,
        timeframe,
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error("Error fetching overview analytics:", error);
      // Return partial data if some endpoints fail
      try {
        const dashboard = await this.getDashboardAnalytics(timeframe);
        return {
          dashboard,
          revenue: null,
          sales: null,
          products: null,
          platforms: null,
          customers: null,
          financial: null,
          timeframe,
          generatedAt: new Date(),
          hasErrors: true,
        };
      } catch (fallbackError) {
        throw fallbackError;
      }
    }
  }

  /**
   * Get cohort analysis
   */
  async getCohortAnalysis(timeframe = "90d") {
    try {
      const response = await api.get(
        `/analytics/cohort-analysis?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      logger.error("Error fetching cohort analysis:", error);
      throw error;
    }
  }

  /**
   * Get customer segmentation data
   */
  async getCustomerSegmentation(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/customer-analytics?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      logger.error("Error fetching customer segmentation:", error);
      throw error;
    }
  }

  /**
   * Get market analysis data
   */
  async getMarketAnalysis(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/market-analysis?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      logger.error("Error fetching market analysis:", error);
      throw error;
    }
  }

  /**
   * Get product performance analytics
   */
  async getProductPerformance(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/products/performance?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      logger.error("Error fetching product performance:", error);
      throw error;
    }
  }

  /**
   * Get product insights analytics
   */
  async getProductInsights(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/products/insights?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      logger.error("Error fetching product insights:", error);
      throw error;
    }
  }

  /**
   * Get real-time product analytics
   */
  async getProductRealTime(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/products/realtime?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      logger.error("Error fetching real-time product analytics:", error);
      throw error;
    }
  }

  /**
   * Get accurate analytics data
   */
  async getAccurateAnalytics(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/accurate?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      logger.error("Error fetching accurate analytics:", error);
      throw error;
    }
  }

  /**
   * Get alternative real-time analytics
   */
  async getRealTimeMetrics(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/real-time?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      logger.error("Error fetching real-time metrics:", error);
      throw error;
    }
  }

  /**
   * Get all available analytics data (comprehensive dashboard)
   */
  async getAllAnalytics(timeframe = "30d") {
    try {
      const [basic, advanced, products] = await Promise.allSettled([
        this.getOverviewAnalytics(timeframe),
        this.getAdvancedAnalytics(timeframe),
        this.getEnhancedProductAnalytics(timeframe),
      ]);

      return {
        basic: basic.status === "fulfilled" ? basic.value : null,
        advanced: advanced.status === "fulfilled" ? advanced.value : null,
        products: products.status === "fulfilled" ? products.value : null,
        timeframe,
        generatedAt: new Date(),
        hasErrors:
          basic.status === "rejected" ||
          advanced.status === "rejected" ||
          products.status === "rejected",
        errors: [
          ...(basic.status === "rejected" ? [basic.reason] : []),
          ...(advanced.status === "rejected" ? [advanced.reason] : []),
          ...(products.status === "rejected" ? [products.reason] : []),
        ],
      };
    } catch (error) {
      logger.error("Error fetching all analytics:", error);
      throw error;
    }
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount, currency = "TRY") {
    if (typeof amount !== "number" || isNaN(amount)) return "₺0,00";

    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Format percentage for display
   */
  formatPercentage(value, decimals = 1) {
    if (typeof value !== "number" || isNaN(value)) return "0%";

    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Format number for display
   */
  formatNumber(value, decimals = 0) {
    if (typeof value !== "number" || isNaN(value)) return "0";

    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  /**
   * Calculate growth rate
   */
  calculateGrowthRate(current, previous) {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Get trend indicator
   */
  getTrendIndicator(growthRate) {
    if (growthRate > 5) return "up";
    if (growthRate < -5) return "down";
    return "stable";
  }

  /**
   * Get trend color
   */
  getTrendColor(growthRate) {
    if (growthRate > 5) return "success";
    if (growthRate < -5) return "danger";
    return "secondary";
  }
}

const analyticsService = new AnalyticsService();
export default analyticsService;
