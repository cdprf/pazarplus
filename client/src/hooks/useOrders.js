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

export const useOrderStats = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    byStatus: {},
    summary: {
      new: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getOrderStats();

      if (response.success) {
        setStats(
          response.data || {
            totalOrders: 0,
            totalRevenue: 0,
            byStatus: {},
            summary: {
              new: 0,
              processing: 0,
              shipped: 0,
              delivered: 0,
              cancelled: 0,
              returned: 0,
            },
          }
        );
      } else {
        throw new Error(response.message || "Failed to fetch order statistics");
      }
    } catch (err) {
      console.error("Error fetching order stats:", err);
      setError(err.message);
      // Keep default stats on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
};

export const useOrderTrends = (timeRange = "30d") => {
  const [trends, setTrends] = useState({
    labels: [],
    datasets: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchTrends = async () => {
      try {
        setTrends((prev) => ({ ...prev, loading: true, error: null }));

        const response = await api.getOrderTrends(timeRange);

        if (isMounted && response.success && response.data) {
          setTrends({
            labels: response.data.labels || [],
            datasets: response.data.datasets || [],
            loading: false,
            error: null,
          });
        } else if (isMounted) {
          // Handle case where API returns success but no data
          setTrends({
            labels: [],
            datasets: [],
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

        const response = await api.getOrderTrends(timeRange);

        if (response.success && response.data) {
          setTrends({
            labels: response.data.labels || [],
            datasets: response.data.datasets || [],
            loading: false,
            error: null,
          });
        } else {
          setTrends({
            labels: [],
            datasets: [],
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
    ...trends,
    refreshTrends,
  };
};
