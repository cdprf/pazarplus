import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CubeIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  BoltIcon,
  ChartBarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ExclamationCircleIcon,
  EyeIcon,
  ShoppingCartIcon,
  BellIcon,
  ArrowTrendingDownIcon,
  PresentationChartBarIcon,
} from "@heroicons/react/24/outline";
import { useOrderStats } from "../../hooks/useOrders";
import { usePlatforms } from "../../hooks/usePlatforms";
import {
  useAnalytics,
  useRealTimeMetrics,
  useAnalyticsAlerts,
} from "../../hooks/useAnalytics";
import { useAlert } from "../../contexts/AlertContext";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import OrdersChart from "./OrdersChart";

// Ensure CSS is imported
import "../../index.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [stats, setStats] = useState({
    total: 0,
    totalRevenue: 0,
    byStatus: {},
    byPlatform: {},
    recentOrders: [],
    growth: { orders: 0, revenue: 0 },
  });

  // Enhanced data fetching with analytics
  const {
    data: orderStats,
    isLoading: orderStatsLoading,
    error: orderStatsError,
    refetch,
  } = useOrderStats({ period: selectedPeriod });

  const {
    data: platforms = [],
    isLoading: platformsLoading,
    error: platformsError,
  } = usePlatforms();

  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useAnalytics(selectedPeriod, { autoRefresh: true });

  const { data: realTimeMetrics, isLoading: realTimeLoading } =
    useRealTimeMetrics(true);

  const { data: alerts = [] } = useAnalyticsAlerts();

  const loading = orderStatsLoading || platformsLoading || analyticsLoading;
  const error = orderStatsError || platformsError || analyticsError;

  useEffect(() => {
    if (!loading) {
      // Merge order stats with analytics data for comprehensive view
      setStats((prevStats) => ({
        ...prevStats,
        ...(orderStats || {}),
        ...(analyticsData?.summary || {}),
        realTime: realTimeMetrics,
      }));
    }
  }, [orderStats, analyticsData, realTimeMetrics, loading]);

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    refetch();
  };

  const handleSyncData = async () => {
    try {
      await refetch();
      showAlert("Dashboard data refreshed successfully", "success");
    } catch (error) {
      showAlert("Failed to refresh dashboard data", "error");
    }
  };

  // Enhanced metrics calculations with error handling
  const activePlatforms = platforms.filter((p) => p.status === "active");
  const pendingOrders = stats.byStatus?.pending || 0;
  const processingOrders = stats.byStatus?.processing || 0;
  const shippedOrders = stats.byStatus?.shipped || 0;
  const deliveredOrders = stats.byStatus?.delivered || 0;
  const cancelledOrders = stats.byStatus?.cancelled || 0;

  // Calculate performance metrics with safe division
  const safeCalculatePercentage = (numerator, denominator) => {
    if (!denominator || denominator === 0) return 0;
    return ((numerator / denominator) * 100).toFixed(1);
  };

  const completionRate = safeCalculatePercentage(deliveredOrders, stats.total);
  const cancellationRate = safeCalculatePercentage(
    cancelledOrders,
    stats.total
  );
  const averageOrderValue =
    stats.total > 0 ? (stats.totalRevenue / stats.total).toFixed(2) : 0;

  // Real-time indicators
  const isRealTimeActive = realTimeMetrics && !realTimeLoading;
  const hasActiveAlerts = alerts.length > 0;

  const getStatusVariant = (status) => {
    switch (status) {
      case "pending":
        return "warning";
      case "processing":
        return "info";
      case "shipped":
        return "purple";
      case "delivered":
        return "success";
      case "cancelled":
        return "danger";
      default:
        return "secondary";
    }
  };

  // Utility functions
  const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) return "₺0.00";
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Intl.DateTimeFormat("tr-TR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateString));
    } catch (error) {
      return "Invalid Date";
    }
  };

  const getTrendIcon = (value) => {
    if (value > 0) return ArrowTrendingUpIcon;
    if (value < 0) return ArrowTrendingDownIcon;
    return ArrowPathIcon;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <div className="skeleton skeleton-text h-8 w-64 mb-2"></div>
            <div className="skeleton skeleton-text h-5 w-96"></div>
          </div>
          <div className="skeleton skeleton-text h-10 w-32"></div>
        </div>
        <div className="page-content">
          <LoadingSkeleton type="dashboard" />
          <LoadingSkeleton type="chart" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LoadingSkeleton type="card" />
            <LoadingSkeleton type="card" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-state error-state-page">
          <div className="error-content">
            <div className="error-icon">
              <ExclamationTriangleIcon className="h-16 w-16 text-red-500 dark:text-red-400" />
            </div>
            <h1 className="error-title">Dashboard Error</h1>
            <p className="error-description">{error}</p>
            <div className="error-actions">
              <button
                onClick={() => window.location.reload()}
                className="btn btn-danger"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Retry Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" role="main" aria-label="Dashboard">
      {/* Enhanced Header with Real-time Status */}
      <div className="page-header">
        <div className="flex-1">
          <div className="flex items-center mb-4">
            <div className="stat-icon stat-icon-primary mr-4 flex-shrink-0">
              <PresentationChartBarIcon className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="page-title flex items-center" id="dashboard-title">
                Dashboard Overview
                {isRealTimeActive && (
                  <span
                    className="real-time-indicator ml-3"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></div>
                      Live
                    </span>
                  </span>
                )}
              </h1>
              <p className="page-subtitle mt-1">
                Monitor your order management system performance and key metrics
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <ClockIcon className="w-4 h-4 mr-2 icon-contrast-secondary" />
              <span className="font-medium">Last updated:</span>
              <span className="ml-1">{new Date().toLocaleTimeString()}</span>
            </div>

            <div className="flex items-center text-sm text-green-600 dark:text-green-400">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                <BoltIcon className="w-4 h-4 mr-1 icon-contrast-success" />
                <span className="font-medium">System Active</span>
              </div>
            </div>

            {hasActiveAlerts && (
              <div className="flex items-center text-sm text-amber-600 dark:text-amber-400">
                <BellIcon className="w-4 h-4 mr-2 icon-contrast-warning animate-pulse" />
                <span className="font-medium">
                  {alerts.length} Alert{alerts.length !== 1 ? "s" : ""}
                </span>
                <span className="ml-1 text-xs">(requiring attention)</span>
              </div>
            )}
          </div>
        </div>

        <div className="page-actions flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="form-group">
              <label className="sr-only" htmlFor="time-period">
                Time Period
              </label>
              <select
                id="time-period"
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="form-input min-w-[140px]"
                aria-label="Select time period for dashboard data"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncData}
                className="btn btn-primary flex items-center gap-2"
                title="Refresh dashboard data"
              >
                <ArrowPathIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                className="btn btn-ghost btn-sm"
                title="Calendar view"
                aria-label="Open calendar view"
              >
                <CalendarIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Banner */}
      {hasActiveAlerts && (
        <div className="page-content">
          <div className="alert-banner alert-banner-warning">
            <BellIcon className="alert-banner-icon text-amber-600 dark:text-amber-400" />
            <div className="alert-banner-content">
              <div className="alert-banner-title">System Alerts</div>
              <div className="alert-banner-message">
                {alerts.length} active alert{alerts.length !== 1 ? "s" : ""}{" "}
                requiring attention
              </div>
            </div>
            <div className="alert-banner-actions">
              <button className="btn btn-ghost btn-sm">View All</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-content">
        {/* Enhanced Key Metrics */}
        <section className="section" aria-labelledby="key-metrics-title">
          <div className="section-header">
            <h2 id="key-metrics-title" className="section-title">
              Key Performance Metrics
            </h2>
            <p className="section-subtitle">
              Overview of your order management performance
            </p>
          </div>
          <div className="section-content">
            <div
              className="dashboard-grid mb-8"
              role="region"
              aria-labelledby="key-metrics-title"
            >
              {/* Total Orders */}
              <div
                className="dashboard-stat"
                role="article"
                aria-label="Total Orders Statistic"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="stat-icon stat-icon-primary">
                      <CubeIcon className="h-6 w-6 text-white" />
                    </div>
                    <div className="stat-label text-sm font-medium text-gray-500 dark:text-gray-400">
                      Total Orders
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 mb-3">
                    <CubeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div className="stat-value text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.total || 0}
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    {(() => {
                      const TrendIcon = getTrendIcon(stats.growth?.orders);
                      return (
                        <>
                          <TrendIcon
                            className={`h-4 w-4 mr-1 ${
                              stats.growth?.orders >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          />
                          <span
                            className={
                              stats.growth?.orders >= 0
                                ? "text-green-600 text-sm font-medium"
                                : "text-red-600 text-sm font-medium"
                            }
                          >
                            {Math.abs(stats.growth?.orders || 0)}%
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                            vs last period
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Total Revenue */}
              <div
                className="dashboard-stat"
                role="article"
                aria-label="Total Revenue Statistic"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="stat-icon stat-icon-success">
                      <CurrencyDollarIcon className="h-6 w-6 text-white" />
                    </div>
                    <div className="stat-label text-sm font-medium text-gray-500 dark:text-gray-400">
                      Total Revenue
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 mb-3">
                    <CurrencyDollarIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div className="stat-value text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(stats.totalRevenue || 0)}
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    {(() => {
                      const TrendIcon = getTrendIcon(stats.growth?.revenue);
                      return (
                        <>
                          <TrendIcon
                            className={`h-4 w-4 mr-1 ${
                              stats.growth?.revenue >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          />
                          <span
                            className={
                              stats.growth?.revenue >= 0
                                ? "text-green-600 text-sm font-medium"
                                : "text-red-600 text-sm font-medium"
                            }
                          >
                            {Math.abs(stats.growth?.revenue || 0)}%
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                            vs last period
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Pending Orders */}
              <div
                className="dashboard-stat"
                role="article"
                aria-label="Pending Orders Statistic"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="stat-icon stat-icon-warning">
                      <BoltIcon className="h-6 w-6 text-white" />
                    </div>
                    <div className="stat-label text-sm font-medium text-gray-500 dark:text-gray-400">
                      Pending Orders
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 mb-3">
                    <BoltIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <div className="stat-value text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {pendingOrders || 0}
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="badge badge-warning mr-2">Urgent</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Need attention
                    </span>
                  </div>
                </div>
              </div>

              {/* Completion Rate */}
              <div
                className="dashboard-stat"
                role="article"
                aria-label="Completion Rate Statistic"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="stat-icon stat-icon-primary">
                      <ChartBarIcon className="h-6 w-6 text-white" />
                    </div>
                    <div className="stat-label text-sm font-medium text-gray-500 dark:text-gray-400">
                      Completion Rate
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 mb-3">
                    <ChartBarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div className="stat-value text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {completionRate}%
                    </div>
                  </div>
                  <div className="progress-bar progress-bar-success mt-2">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${completionRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced Secondary Metrics */}
        <section className="section" aria-labelledby="secondary-metrics-title">
          <div className="section-header">
            <h2 id="secondary-metrics-title" className="section-title">
              Secondary Metrics
            </h2>
            <p className="section-subtitle">
              Additional performance indicators
            </p>
          </div>
          <div className="section-content">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <div className="stat-icon stat-icon-primary">
                      <GlobeAltIcon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Active Platforms
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 mb-2">
                    <GlobeAltIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {activePlatforms.length}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Connected & running
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <div className="stat-icon stat-icon-success">
                      <CurrencyDollarIcon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Avg Order Value
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 mb-2">
                    <CurrencyDollarIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(averageOrderValue)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Per order
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <div className="stat-icon stat-icon-danger">
                      <XCircleIcon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Cancellation Rate
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 mb-2">
                    <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {cancellationRate}%
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Of total orders
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced Orders Chart Section */}
        <section className="section" aria-labelledby="orders-chart-title">
          <div className="card mb-8">
            <div className="card-header">
              <div className="flex justify-between items-center">
                <h3
                  id="orders-chart-title"
                  className="card-title flex items-center"
                >
                  <div className="stat-icon stat-icon-primary mr-3">
                    <CubeIcon className="h-5 w-5 text-white" />
                  </div>
                  Orders & Revenue Trends
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    className="btn btn-ghost btn-sm"
                    aria-label="Filter chart data"
                  >
                    <FunnelIcon className="h-4 w-4" />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    aria-label="Export chart data"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-0">
              <div
                className="chart-container"
                role="img"
                aria-label="Orders and revenue trends chart"
              >
                <OrdersChart />
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced Status and Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Enhanced Order Status Breakdown */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title flex items-center">
                <div className="stat-icon stat-icon-success mr-3">
                  <CheckCircleIcon className="w-5 h-5 text-white" />
                </div>
                Order Status
              </h3>
            </div>
            <div className="card-body space-y-6">
              {[
                {
                  label: "Delivered",
                  count: deliveredOrders,
                  variant: "success",
                  icon: CheckCircleIcon,
                },
                {
                  label: "Shipped",
                  count: shippedOrders,
                  variant: "purple",
                  icon: CubeIcon,
                },
                {
                  label: "Processing",
                  count: processingOrders,
                  variant: "info",
                  icon: ClockIcon,
                },
                {
                  label: "Pending",
                  count: pendingOrders,
                  variant: "warning",
                  icon: ExclamationCircleIcon,
                },
                ...(cancelledOrders > 0
                  ? [
                      {
                        label: "Cancelled",
                        count: cancelledOrders,
                        variant: "danger",
                        icon: XCircleIcon,
                      },
                    ]
                  : []),
              ].map((status) => {
                const percentage = stats.total
                  ? (status.count / stats.total) * 100
                  : 0;
                const Icon = status.icon;
                return (
                  <div key={status.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {status.label}
                        </span>
                      </div>{" "}
                      <div className="flex items-center space-x-2">
                        <span className={`badge badge-${status.variant}`}>
                          {status.count}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div
                      className={`progress-bar progress-bar-${status.variant}`}
                    >
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enhanced Recent Orders */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <div className="flex justify-between items-center">
                  <h3 className="card-title flex items-center">
                    <div className="stat-icon stat-icon-primary mr-3">
                      <BoltIcon className="w-5 h-5 text-white" />
                    </div>
                    Recent Orders
                  </h3>
                  <button
                    onClick={() => navigate("/orders")}
                    className="btn btn-ghost btn-sm"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    View All
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  {stats.recentOrders?.length > 0 ? (
                    stats.recentOrders.slice(0, 5).map((order, index) => {
                      return (
                        <div
                          key={index}
                          className="card-interactive p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                          onClick={() => navigate(`/orders/${order.id}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="stat-icon stat-icon-primary">
                                <ShoppingCartIcon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                  Order #
                                  {order.orderNumber || `ORD-${order.id}`}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  <span className="font-medium">
                                    {order.customerName}
                                  </span>{" "}
                                  •
                                  <span className="mx-1 capitalize">
                                    {order.platform}
                                  </span>{" "}
                                  •
                                  <span className="font-semibold text-green-600 dark:text-green-400">
                                    {formatCurrency(order.totalAmount)}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <span className="text-xs text-gray-500 dark:text-gray-400 block">
                                  {formatDate(order.createdAt)}
                                </span>
                              </div>
                              <span
                                className={`badge badge-${getStatusVariant(
                                  order.orderStatus
                                )}`}
                              >
                                {order.orderStatus}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <ShoppingCartIcon className="h-16 w-16 text-gray-400" />
                      </div>
                      <h4 className="empty-state-title">No recent orders</h4>
                      <p className="empty-state-description">
                        Connect a platform to start receiving orders
                      </p>
                      <div className="empty-state-actions">
                        <button
                          onClick={() => navigate("/platforms")}
                          className="btn btn-primary"
                        >
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Add Platform
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Final Dashboard Metrics Summary */}
        <section
          className="section"
          aria-labelledby="performance-insights-title"
        >
          <div className="section-header">
            <h2 id="performance-insights-title" className="section-title">
              Performance Summary
            </h2>
            <p className="section-subtitle">
              Key performance indicators overview
            </p>
          </div>
          <div className="section-content">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="dashboard-metric">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="dashboard-metric-icon stat-icon-primary">
                      <CheckCircleIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Completion Rate
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 mb-2">
                    <CheckCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div className="dashboard-metric-value text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {completionRate}%
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {deliveredOrders} of {stats.total} orders delivered
                  </div>
                </div>
              </div>

              <div className="dashboard-metric">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="dashboard-metric-icon stat-icon-success">
                      <CurrencyDollarIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Avg Order Value
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 mb-2">
                    <CurrencyDollarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div className="dashboard-metric-value text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(averageOrderValue)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Total revenue: {formatCurrency(stats.totalRevenue)}
                  </div>
                </div>
              </div>

              <div className="dashboard-metric">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="dashboard-metric-icon stat-icon-warning">
                      <ClockIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Active Orders
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 mb-2">
                    <ClockIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <div className="dashboard-metric-value text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {pendingOrders + processingOrders}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Pending: {pendingOrders} • Processing: {processingOrders}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
