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
