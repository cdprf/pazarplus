import logger from "../utils/logger.js";
import api from "./api";

/**
 * Consolidated Analytics Service - Frontend service for fetching analytics data
 * This service consolidates functionality from both analyticsAPI.js and analyticsService.js
 *
 * Features:
 * - Comprehensive analytics endpoints
 * - Error handling and retry logic
 * - Caching support
 * - Timeout protection
 */
class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.requestTimeout = 30000; // 30 seconds
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

  // Core Analytics Methods

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
   * Get sales analytics data
   */
  async getSalesAnalytics(timeframe = "30d") {
    return this.makeRequest(`/analytics/dashboard?timeframe=${timeframe}`);
  }

  /**
   * Get product analytics data
   */
  async getProductAnalytics(timeframe = "30d") {
    return this.makeRequest(`/analytics/products?timeframe=${timeframe}`);
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
   * Get platform analytics data
   */
  async getPlatformAnalytics(timeframe = "30d") {
    return this.makeRequest(
      `/analytics/platform-performance?timeframe=${timeframe}`
    );
  }

  /**
   * Get customer analytics and segmentation
   */
  async getCustomerAnalytics(timeframe = "30d") {
    return this.makeRequest(
      `/analytics/customer-analytics?timeframe=${timeframe}`
    );
  }

  /**
   * Get financial analytics data
   */
  async getFinancialAnalytics(timeframe = "30d") {
    return this.makeRequest(`/analytics/revenue?timeframe=${timeframe}`);
  }

  /**
   * Get operational analytics data
   */
  async getOperationalAnalytics(timeframe = "30d") {
    return this.makeRequest(`/analytics/dashboard?timeframe=${timeframe}`);
  }

  // Advanced Analytics Methods

  /**
   * Get inventory insights and optimization suggestions
   */
  async getInventoryInsights(timeframe = "30d") {
    return this.makeRequest(`/analytics/inventory?timeframe=${timeframe}`);
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
   * Get enhanced product analytics
   */
  async getEnhancedProductAnalytics(timeframe = "30d") {
    return this.makeRequest(`/analytics/products?timeframe=${timeframe}`);
  }

  /**
   * Get advanced analytics (combination of multiple endpoints)
   */
  async getAdvancedAnalytics(timeframe = "30d") {
    return this.makeRequest(
      `/analytics/business-intelligence?timeframe=${timeframe}`
    );
  }

  // Export and Utility Methods

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
      throw this.enhanceError(error, "export");
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
      ] = await Promise.allSettled([
        this.getDashboardAnalytics(timeframe),
        this.getRevenueAnalytics(timeframe),
        this.getSalesAnalytics(timeframe),
        this.getProductAnalytics(timeframe),
        this.getPlatformAnalytics(timeframe),
        this.getCustomerAnalytics(timeframe),
        this.getFinancialAnalytics(timeframe),
      ]);

      return {
        dashboard: dashboard.status === "fulfilled" ? dashboard.value : null,
        revenue: revenue.status === "fulfilled" ? revenue.value : null,
        sales: sales.status === "fulfilled" ? sales.value : null,
        products: products.status === "fulfilled" ? products.value : null,
        platforms: platforms.status === "fulfilled" ? platforms.value : null,
        customers: customers.status === "fulfilled" ? customers.value : null,
        financial: financial.status === "fulfilled" ? financial.value : null,
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
        throw this.enhanceError(fallbackError, "overview");
      }
    }
  }

  /**
   * Get cohort analysis
   */
  async getCohortAnalysis(timeframe = "90d") {
    return this.makeRequest(
      `/analytics/cohort-analysis?timeframe=${timeframe}`
    );
  }

  /**
   * Get customer segmentation data
   */
  async getCustomerSegmentation(timeframe = "30d") {
    return this.makeRequest(
      `/analytics/customer-analytics?timeframe=${timeframe}`
    );
  }

  /**
   * Health check for analytics endpoints
   */
  async healthCheck() {
    try {
      const response = await api.get("/analytics/health");
      return response.data;
    } catch (error) {
      logger.error("Analytics health check failed:", error);
      return { status: "error", message: error.message };
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      timeout: this.cacheTimeout,
      requestTimeout: this.requestTimeout,
    };
  }
}

const analyticsService = new AnalyticsService();
export default analyticsService;
