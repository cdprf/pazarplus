// Enhanced analytics API client for Dashboard
import api from "./api";

class AnalyticsAPI {
  /**
   * Get comprehensive dashboard analytics
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
   * Get business intelligence insights
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
   * Get revenue analytics with forecasting
   */
  async getRevenueAnalytics(timeframe = "30d", breakdown = "daily") {
    try {
      const response = await api.get(
        `/analytics/revenue?timeframe=${timeframe}&breakdown=${breakdown}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching revenue analytics:", error);
      throw error;
    }
  }

  /**
   * Get platform performance comparison
   */
  async getPlatformPerformance(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/platform-performance?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching platform performance:", error);
      throw error;
    }
  }

  /**
   * Get inventory insights and optimization suggestions
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
   * Get order analytics with predictions
   */
  async getOrderAnalytics(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/orders?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching order analytics:", error);
      throw error;
    }
  }

  /**
   * Get customer analytics and segmentation
   */
  async getCustomerAnalytics(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/customer-analytics-temp?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching customer analytics:", error);
      throw error;
    }
  }

  /**
   * Get financial KPIs and performance metrics
   */
  async getFinancialKPIs(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/financial-kpis-temp?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching financial KPIs:", error);
      throw error;
    }
  }

  /**
   * Get predictive analytics and forecasting
   */
  async getPredictiveAnalytics(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/predictive?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching predictive analytics:", error);
      throw error;
    }
  }

  /**
   * Get market intelligence and trends
   */
  async getMarketIntelligence(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/market-intelligence?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching market intelligence:", error);
      throw error;
    }
  }

  /**
   * Get performance benchmarks against competitors
   */
  async getPerformanceBenchmarks(timeframe = "30d") {
    try {
      const response = await api.get(
        `/analytics/benchmarks?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching performance benchmarks:", error);
      throw error;
    }
  }

  /**
   * Get custom analytics reports
   */
  async getCustomReport(reportConfig) {
    try {
      const response = await api.post("/analytics/custom-report", reportConfig);
      return response.data;
    } catch (error) {
      console.error("Error generating custom report:", error);
      throw error;
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(format = "csv", timeframe = "30d", metrics = []) {
    try {
      const response = await api.post(
        "/analytics/export",
        {
          format,
          timeframe,
          metrics,
        },
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
   * Get real-time metrics for dashboard
   */
  async getRealTimeMetrics() {
    try {
      const response = await api.get("/analytics/realtime");
      return response.data;
    } catch (error) {
      console.error("Error fetching real-time metrics:", error);
      throw error;
    }
  }

  /**
   * Get alerts and notifications for anomalies
   */
  async getAnalyticsAlerts() {
    try {
      const response = await api.get("/analytics/alerts");
      return response.data;
    } catch (error) {
      console.error("Error fetching analytics alerts:", error);
      throw error;
    }
  }

  /**
   * Submit feedback on analytics insights
   */
  async submitInsightFeedback(insightId, feedback) {
    try {
      const response = await api.post(
        `/analytics/insights/${insightId}/feedback`,
        { feedback }
      );
      return response.data;
    } catch (error) {
      console.error("Error submitting insight feedback:", error);
      throw error;
    }
  }
}

const analyticsAPI = new AnalyticsAPI();
export default analyticsAPI;
