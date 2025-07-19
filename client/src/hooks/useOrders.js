import { useState, useEffect, useCallback } from "react";
import api from "../services/api";

export const useOrders = (initialFilters = {}) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [filters, setFilters] = useState({
    status: "",
    platform: "",
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    ...initialFilters,
  });

  const fetchOrders = useCallback(
    async (newFilters = {}, abortSignal = null) => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = { ...filters, ...newFilters };
        const config = abortSignal ? { signal: abortSignal } : {};
        const response = await api.getOrders(queryParams, config);

        if (response.success) {
          setOrders(response.data || []);
          setPagination(
            response.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            }
          );
        } else {
          throw new Error(response.message || "Failed to fetch orders");
        }
      } catch (err) {
        // Handle cancellation silently
        if (
          err.name === "AbortError" ||
          err.code === "ERR_CANCELED" ||
          err.message === "canceled"
        ) {
          console.log("🔄 Order fetch was cancelled");
          return;
        }

        console.error("Error fetching orders:", err);
        setError(err.message);
        setOrders([]); // Set empty array on error
        setPagination({
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1 when filtering
  }, []);

  const changePage = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const refreshOrders = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const abortController = new AbortController();
    fetchOrders({}, abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    pagination,
    filters,
    updateFilters,
    changePage,
    refreshOrders,
    fetchOrders,
  };
};

export const useOrderStats = (options = {}) => {
  const { period = "30d" } = options;
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(
    async (abortSignal = null) => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch comprehensive stats from backend with period parameter
        const config = abortSignal ? { signal: abortSignal } : {};
        const statsResponse = await api.getOrderStats({ period }, config);

        if (statsResponse.success && statsResponse.data) {
          const stats = statsResponse.data;
          console.log("📊 Comprehensive stats from backend:", stats);

          // The backend now returns all the data we need
          const transformedData = {
            // Main metrics
            total: stats.total || stats.totalOrders || 0,
            totalRevenue: stats.totalRevenue || 0,

            // Status breakdown (already provided by backend)
            byStatus: {
              pending: stats.byStatus?.new || stats.newOrders || 0,
              processing:
                stats.byStatus?.processing || stats.processingOrders || 0,
              shipped: stats.byStatus?.shipped || stats.shippedOrders || 0,
              delivered:
                stats.byStatus?.delivered || stats.deliveredOrders || 0,
              cancelled:
                stats.byStatus?.cancelled || stats.cancelledOrders || 0,
              // Keep original status names too
              ...stats.byStatus,
            },

            // Platform breakdown (already provided by backend)
            byPlatform: stats.byPlatform || {},

            // Recent orders (already provided by backend)
            recentOrders: stats.recentOrders || [],

            // Growth metrics (already calculated by backend)
            growth: {
              orders: stats.growth?.orders || 0,
              revenue: stats.growth?.revenue || 0,
            },

            // Additional comprehensive data
            averageOrderValue: stats.averageOrderValue || 0,
            completionRate: stats.completionRate || 0,
            cancellationRate: stats.cancellationRate || 0,

            // Period information
            period: stats.period || { selected: period },

            // Platform info
            platforms: stats.platforms || { active: 0, inactive: 0, total: 0 },

            // Trends and summary for compatibility
            trends: [],
            summary: {
              new: stats.byStatus?.new || stats.newOrders || 0,
              processing:
                stats.byStatus?.processing || stats.processingOrders || 0,
              shipped: stats.byStatus?.shipped || stats.shippedOrders || 0,
              delivered:
                stats.byStatus?.delivered || stats.deliveredOrders || 0,
              cancelled:
                stats.byStatus?.cancelled || stats.cancelledOrders || 0,
              returned: stats.byStatus?.returned || 0,
            },
          };

          console.log("📊 Transformed comprehensive stats:", transformedData);
          setData(transformedData);
        } else {
          throw new Error(
            statsResponse.message || "Failed to fetch order statistics"
          );
        }
      } catch (err) {
        // Handle cancellation silently
        if (
          err.name === "AbortError" ||
          err.code === "ERR_CANCELED" ||
          err.message === "canceled"
        ) {
          console.log("🔄 Order stats fetch was cancelled");
          return;
        }

        console.error("Error fetching comprehensive order stats:", err);
        setError(err.message);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [period]
  );

  useEffect(() => {
    const abortController = new AbortController();
    fetchStats(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [fetchStats]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchStats,
  };
};

export const useOrderTrends = (timeRange = "30d") => {
  const [trends, setTrends] = useState({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchTrends = async () => {
      try {
        setTrends((prev) => ({ ...prev, loading: true, error: null }));

        // Map frontend timeRange to backend period format
        const periodMap = {
          "7d": "week",
          "30d": "month",
          "90d": "month",
          "1y": "year",
        };
        const period = periodMap[timeRange] || "month";

        const response = await api.getOrderTrends(period, {
          signal: abortController.signal,
        });

        if (isMounted && response.success && response.data) {
          // Transform backend data format to what charts expect
          const transformedData = Array.isArray(response.data)
            ? response.data.map((item) => ({
                date: item.date,
                newOrders: item.newOrders || 0,
                processingOrders: 0, // Backend doesn't track this in trends
                shippedOrders: item.shippedOrders || 0,
                deliveredOrders: 0, // Backend doesn't track this in trends
                totalOrders: item.totalOrders || 0,
                revenue: parseFloat(item.revenue) || 0,
                // Add previous period data if available
                previousNewOrders: item.previousNewOrders || 0,
                previousShippedOrders: item.previousShippedOrders || 0,
                previousTotalOrders: item.previousTotalOrders || 0,
                previousRevenue: parseFloat(item.previousRevenue) || 0,
              }))
            : [];

          console.log("Transformed trends data:", transformedData);

          setTrends({
            data: transformedData,
            loading: false,
            error: null,
          });
        } else if (isMounted) {
          // Handle case where API returns success but no data
          console.warn("No trends data returned from API");
          setTrends({
            data: [],
            loading: false,
            error: response.message || "No trend data available",
          });
        }
      } catch (error) {
        // Handle cancellation silently
        if (
          error.name === "AbortError" ||
          error.code === "ERR_CANCELED" ||
          error.message === "canceled"
        ) {
          console.log("🔄 Order trends fetch was cancelled");
          return;
        }

        console.error("Error fetching order trends:", error);
        if (isMounted) {
          setTrends((prev) => ({
            ...prev,
            loading: false,
            error: error.message || "Failed to fetch order trends",
          }));
        }
      }
    };

    fetchTrends();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [timeRange]);

  const refreshTrends = useCallback(() => {
    const fetchTrends = async () => {
      try {
        setTrends((prev) => ({ ...prev, loading: true, error: null }));

        const periodMap = {
          "7d": "week",
          "30d": "month",
          "90d": "month",
          "1y": "year",
        };
        const period = periodMap[timeRange] || "month";

        const response = await api.getOrderTrends(period);

        if (response.success && response.data) {
          const transformedData = Array.isArray(response.data)
            ? response.data.map((item) => ({
                date: item.date,
                newOrders: item.newOrders || 0,
                processingOrders: 0,
                shippedOrders: item.shippedOrders || 0,
                deliveredOrders: 0,
                totalOrders: item.totalOrders || 0,
                revenue: parseFloat(item.revenue) || 0,
                previousNewOrders: item.previousNewOrders || 0,
                previousShippedOrders: item.previousShippedOrders || 0,
                previousTotalOrders: item.previousTotalOrders || 0,
                previousRevenue: parseFloat(item.previousRevenue) || 0,
              }))
            : [];

          setTrends({
            data: transformedData,
            loading: false,
            error: null,
          });
        } else {
          setTrends({
            data: [],
            loading: false,
            error: response.message || "No trend data available",
          });
        }
      } catch (error) {
        console.error("Error refreshing order trends:", error);
        setTrends((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Failed to refresh order trends",
        }));
      }
    };

    fetchTrends();
  }, [timeRange]);

  return {
    data: trends.data,
    loading: trends.loading,
    error: trends.error,
    refreshTrends,
  };
};
