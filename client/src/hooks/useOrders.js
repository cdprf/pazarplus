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
    async (newFilters = {}) => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = { ...filters, ...newFilters };
        const response = await api.getOrders(queryParams);

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
    fetchOrders();
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

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch both stats and recent orders
      const [statsResponse, ordersResponse] = await Promise.all([
        api.getOrderStats(),
        api.getOrders({ limit: 10, sortBy: "createdAt", sortOrder: "desc" }),
      ]);

      if (statsResponse.success && statsResponse.data) {
        const stats = statsResponse.data;

        // Transform the data to match Dashboard expectations
        const transformedData = {
          total: stats.totalOrders || 0,
          totalRevenue: 0, // Will be calculated from recent orders if available
          byStatus: {
            new: stats.newOrders || 0,
            pending: stats.newOrders || 0, // Map 'new' to 'pending' for consistency
            processing: stats.processingOrders || 0,
            shipped: stats.shippedOrders || 0,
            delivered: 0, // Not provided by current endpoint
            cancelled: 0, // Not provided by current endpoint
          },
          byPlatform: {}, // Will be populated if recent orders are available
          recentOrders: [],
          growth: {
            orders: 0, // Placeholder - would need historical data
            revenue: 0, // Placeholder - would need historical data
          },
          trends: [],
          summary: {
            new: stats.newOrders || 0,
            processing: stats.processingOrders || 0,
            shipped: stats.shippedOrders || 0,
            delivered: 0,
            cancelled: 0,
            returned: 0,
          },
        };

        // If we have recent orders, calculate additional metrics
        if (
          ordersResponse.success &&
          ordersResponse.data &&
          Array.isArray(ordersResponse.data)
        ) {
          const orders = ordersResponse.data;
          transformedData.recentOrders = orders;

          // Calculate total revenue from all orders (approximate)
          transformedData.totalRevenue = orders.reduce((sum, order) => {
            const amount = parseFloat(order.totalAmount) || 0;
            return sum + amount;
          }, 0);

          // Calculate platform distribution
          const platformCounts = {};
          orders.forEach((order) => {
            const platform = order.platform || "unknown";
            platformCounts[platform] = (platformCounts[platform] || 0) + 1;
          });
          transformedData.byPlatform = platformCounts;

          // Update status counts from actual recent orders
          const statusCounts = {};
          orders.forEach((order) => {
            const status = order.orderStatus || "unknown";
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });

          // Merge with backend stats (backend stats are more accurate for total counts)
          transformedData.byStatus = {
            ...transformedData.byStatus,
            ...statusCounts,
          };
        }

        console.log("Transformed order stats:", transformedData);
        setData(transformedData);
      } else {
        throw new Error(
          statsResponse.message || "Failed to fetch order statistics"
        );
      }
    } catch (err) {
      console.error("Error fetching order stats:", err);
      setError(err.message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
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

        const response = await api.getOrderTrends(period);

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
