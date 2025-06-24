import api from "./api";

/**
 * Analytics Service - Frontend service for fetching analytics data
 */
class AnalyticsService {
  /**
   * Get dashboard analytics data
   */
  async getDashboardAnalytics(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/dashboard?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching dashboard analytics:", error);
      throw error;
    }
  }

  /**
   * Get revenue analytics data
   */
  async getRevenueAnalytics(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/revenue?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching revenue analytics:", error);
      throw error;
    }
  }

  /**
   * Get sales analytics data (using dashboard endpoint)
   */
  async getSalesAnalytics(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/dashboard?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching sales analytics:", error);
      throw error;
    }
  }

  /**
   * Get product analytics data
   */
  async getProductAnalytics(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/products?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching product analytics:", error);
      throw error;
    }
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
      console.error("Error fetching platform analytics:", error);
      throw error;
    }
  }

  /**
   * Get customer analytics data (using dashboard endpoint for now)
   */
  async getCustomerAnalytics(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/dashboard?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching customer analytics:", error);
      throw error;
    }
  }

  /**
   * Get financial analytics data (using revenue endpoint)
   */
  async getFinancialAnalytics(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/revenue?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching financial analytics:", error);
      throw error;
    }
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
      console.error("Error fetching operational analytics:", error);
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
      console.error("Error exporting analytics:", error);
      throw error;
    }
  }

  /**
   * Get business intelligence data
   */
  async getBusinessIntelligence(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/business-intelligence?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching business intelligence:", error);
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
      console.error("Error fetching overview analytics:", error);
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
      console.error("Error fetching cohort analysis:", error);
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
      console.error("Error fetching customer segmentation:", error);
      throw error;
    }
  }

  /**
   * Get inventory insights analytics
   */
  async getInventoryInsights(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/inventory-insights?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching inventory insights:", error);
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
      console.error("Error fetching market analysis:", error);
      throw error;
    }
  }

  /**
   * Get real-time analytics data
   */
  async getRealTimeAnalytics(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/realtime?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching real-time analytics:", error);
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
      console.error("Error fetching product performance:", error);
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
      console.error("Error fetching product insights:", error);
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
      console.error("Error fetching real-time product analytics:", error);
      throw error;
    }
  }

  /**
   * Get trends analytics
   */
  async getTrends(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/trends?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching trends:", error);
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
      console.error("Error fetching accurate analytics:", error);
      throw error;
    }
  }

  /**
   * Get competitive analysis data
   */
  async getCompetitiveAnalysis(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/competitive-analysis?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching competitive analysis:", error);
      throw error;
    }
  }

  /**
   * Get funnel analysis data
   */
  async getFunnelAnalysis(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/funnel-analysis?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching funnel analysis:", error);
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
      console.error("Error fetching real-time metrics:", error);
      throw error;
    }
  }

  /**
   * Get attribution analysis data
   */
  async getAttributionAnalysis(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/attribution-analysis?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching attribution analysis:", error);
      throw error;
    }
  }

  /**
   * Get anomaly detection data
   */
  async getAnomalyDetection(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/anomaly-detection?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching anomaly detection:", error);
      throw error;
    }
  }

  /**
   * Get comprehensive analytics combining multiple endpoints
   */
  async getAdvancedAnalytics(timeframe = "30d") {
    try {
      const [
        inventory,
        market,
        trends,
        competitive,
        funnel,
        attribution,
        anomalies,
      ] = await Promise.allSettled([
        this.getInventoryInsights(timeframe),
        this.getMarketAnalysis(timeframe),
        this.getTrends(timeframe),
        this.getCompetitiveAnalysis(timeframe),
        this.getFunnelAnalysis(timeframe),
        this.getAttributionAnalysis(timeframe),
        this.getAnomalyDetection(timeframe),
      ]);

      return {
        inventory: inventory.status === "fulfilled" ? inventory.value : null,
        market: market.status === "fulfilled" ? market.value : null,
        trends: trends.status === "fulfilled" ? trends.value : null,
        competitive:
          competitive.status === "fulfilled" ? competitive.value : null,
        funnel: funnel.status === "fulfilled" ? funnel.value : null,
        attribution:
          attribution.status === "fulfilled" ? attribution.value : null,
        anomalies: anomalies.status === "fulfilled" ? anomalies.value : null,
        timeframe,
        generatedAt: new Date(),
        errors: [
          ...(inventory.status === "rejected" ? [inventory.reason] : []),
          ...(market.status === "rejected" ? [market.reason] : []),
          ...(trends.status === "rejected" ? [trends.reason] : []),
          ...(competitive.status === "rejected" ? [competitive.reason] : []),
          ...(funnel.status === "rejected" ? [funnel.reason] : []),
          ...(attribution.status === "rejected" ? [attribution.reason] : []),
          ...(anomalies.status === "rejected" ? [anomalies.reason] : []),
        ],
      };
    } catch (error) {
      console.error("Error fetching advanced analytics:", error);
      throw error;
    }
  }

  /**
   * Get enhanced product analytics combining multiple product endpoints
   */
  async getEnhancedProductAnalytics(timeframe = "30d") {
    try {
      const [products, performance, insights, realtime] =
        await Promise.allSettled([
          this.getProductAnalytics(timeframe),
          this.getProductPerformance(timeframe),
          this.getProductInsights(timeframe),
          this.getProductRealTime(timeframe),
        ]);

      return {
        overview: products.status === "fulfilled" ? products.value : null,
        performance:
          performance.status === "fulfilled" ? performance.value : null,
        insights: insights.status === "fulfilled" ? insights.value : null,
        realtime: realtime.status === "fulfilled" ? realtime.value : null,
        timeframe,
        generatedAt: new Date(),
        errors: [
          ...(products.status === "rejected" ? [products.reason] : []),
          ...(performance.status === "rejected" ? [performance.reason] : []),
          ...(insights.status === "rejected" ? [insights.reason] : []),
          ...(realtime.status === "rejected" ? [realtime.reason] : []),
        ],
      };
    } catch (error) {
      console.error("Error fetching enhanced product analytics:", error);
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
      console.error("Error fetching all analytics:", error);
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
