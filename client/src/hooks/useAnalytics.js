import logger from "../utils/logger.js";
import { useState, useEffect, useCallback } from "react";
import analyticsService from "../services/analyticsService";

export const useAnalytics = (timeframe = "30d", options = {}) => {
  const { autoRefresh = false, refreshInterval = 300000 } = options; // 5 minutes default
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const analytics = await analyticsService.getDashboardAnalytics(timeframe);
      setData(analytics);
      setLastUpdated(new Date());
    } catch (err) {
      logger.error("Error fetching analytics:", err);
      setError(err.message || "Failed to fetch analytics");
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchAnalytics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchAnalytics]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchAnalytics,
  };
};

export const useBusinessIntelligence = (timeframe = "30d") => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBusinessIntelligence = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const intelligence = await analyticsService.getBusinessIntelligence(
        timeframe
      );
      setData(intelligence);
    } catch (err) {
      logger.error("Error fetching business intelligence:", err);
      setError(err.message || "Failed to fetch business intelligence");
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchBusinessIntelligence();
  }, [fetchBusinessIntelligence]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchBusinessIntelligence,
  };
};

export const useRevenueAnalytics = (timeframe = "30d", breakdown = "daily") => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRevenueAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const revenue = await analyticsService.getRevenueAnalytics(
        timeframe,
        breakdown
      );
      setData(revenue);
    } catch (err) {
      logger.error("Error fetching revenue analytics:", err);
      setError(err.message || "Failed to fetch revenue analytics");
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, breakdown]);

  useEffect(() => {
    fetchRevenueAnalytics();
  }, [fetchRevenueAnalytics]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchRevenueAnalytics,
  };
};

export const usePlatformPerformance = (timeframe = "30d") => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPlatformPerformance = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const performance = await analyticsService.getPlatformPerformance(
        timeframe
      );
      setData(performance);
    } catch (err) {
      logger.error("Error fetching platform performance:", err);
      setError(err.message || "Failed to fetch platform performance");
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchPlatformPerformance();
  }, [fetchPlatformPerformance]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchPlatformPerformance,
  };
};

export const useInventoryInsights = (timeframe = "30d") => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInventoryInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const insights = await analyticsService.getInventoryInsights(timeframe);
      setData(insights);
    } catch (err) {
      logger.error("Error fetching inventory insights:", err);
      setError(err.message || "Failed to fetch inventory insights");
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchInventoryInsights();
  }, [fetchInventoryInsights]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchInventoryInsights,
  };
};

export const useRealTimeMetrics = (enabled = true) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRealTimeMetrics = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const metrics = await analyticsService.getRealTimeMetrics();
      setData(metrics);
    } catch (err) {
      logger.error("Error fetching real-time metrics:", err);
      setError(err.message || "Failed to fetch real-time metrics");
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      fetchRealTimeMetrics();
      // Refresh every 30 seconds
      const interval = setInterval(fetchRealTimeMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [enabled, fetchRealTimeMetrics]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchRealTimeMetrics,
  };
};

export const useAnalyticsAlerts = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const alerts = await analyticsService.getAnalyticsAlerts();
      setData(alerts || []);
    } catch (err) {
      logger.error("Error fetching analytics alerts:", err);
      setError(err.message || "Failed to fetch analytics alerts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchAlerts,
  };
};

export const usePredictiveAnalytics = (timeframe = "30d") => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPredictiveAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const predictions = await analyticsService.getPredictiveAnalytics(
        timeframe
      );
      setData(predictions);
    } catch (err) {
      logger.error("Error fetching predictive analytics:", err);
      setError(err.message || "Failed to fetch predictive analytics");
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchPredictiveAnalytics();
  }, [fetchPredictiveAnalytics]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchPredictiveAnalytics,
  };
};

// Utility hook for exporting analytics data
export const useAnalyticsExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  const exportData = useCallback(
    async (format = "csv", timeframe = "30d", metrics = []) => {
      setIsExporting(true);
      setError(null);

      try {
        const blob = await analyticsService.exportAnalytics(
          format,
          timeframe,
          metrics
        );

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `analytics-${timeframe}-${Date.now()}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return true;
      } catch (err) {
        logger.error("Error exporting analytics:", err);
        setError(err.message || "Failed to export analytics");
        return false;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return {
    exportData,
    isExporting,
    error,
  };
};
