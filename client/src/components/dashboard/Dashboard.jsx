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
  CogIcon,
  BoltIcon,
  ChartBarIcon,
  StarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ExclamationCircleIcon,
  EyeIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import { useOrderStats } from "../../hooks/useOrders";
import { usePlatforms } from "../../hooks/usePlatforms";
import { useAlert } from "../../contexts/AlertContext";
import { Button } from "../ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import OrdersChart from "./OrdersChart";

// Ensure CSS is imported
import "../../index.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [stats, setStats] = useState({
    total: 0,
    totalRevenue: 0,
    byStatus: {},
    byPlatform: {},
    recentOrders: [],
    growth: { orders: 0, revenue: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real data from hooks with selected period
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

  useEffect(() => {
    if (!orderStatsLoading && !platformsLoading) {
      setStats(
        orderStats || {
          total: 0,
          totalRevenue: 0,
          byStatus: {},
          byPlatform: {},
          recentOrders: [],
          growth: { orders: 0, revenue: 0 },
        }
      );
      setLoading(false);
    }

    if (orderStatsError || platformsError) {
      setError(
        orderStatsError?.message ||
          platformsError?.message ||
          "Failed to load dashboard data"
      );
      setLoading(false);
    }
  }, [
    orderStats,
    platforms,
    orderStatsLoading,
    platformsLoading,
    orderStatsError,
    platformsError,
  ]);

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    setLoading(true);
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

  // Enhanced metrics calculations
  const activePlatforms = platforms.filter((p) => p.status === "active");
  const pendingOrders = stats.byStatus?.pending || 0;
  const processingOrders = stats.byStatus?.processing || 0;
  const shippedOrders = stats.byStatus?.shipped || 0;
  const deliveredOrders = stats.byStatus?.delivered || 0;
  const cancelledOrders = stats.byStatus?.cancelled || 0;

  // Calculate performance metrics
  const completionRate =
    stats.total > 0 ? ((deliveredOrders / stats.total) * 100).toFixed(1) : 0;
  const cancellationRate =
    stats.total > 0 ? ((cancelledOrders / stats.total) * 100).toFixed(1) : 0;
  const averageOrderValue =
    stats.total > 0 ? (stats.totalRevenue / stats.total).toFixed(2) : 0;
  const urgentOrders = pendingOrders + processingOrders;

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

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return ClockIcon;
      case "processing":
        return CubeIcon;
      case "shipped":
        return CubeIcon;
      case "delivered":
        return CheckCircleIcon;
      case "cancelled":
        return XCircleIcon;
      default:
        return ClockIcon;
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

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex justify-center items-center py-32">
          <div className="text-center">
            <div className="spinner spinner-lg mx-auto mb-6"></div>
            <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
              Loading dashboard insights...
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Gathering your latest business data
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <Card className="max-w-md mx-auto mt-32">
          <CardContent className="text-center p-8">
            <div className="stat-icon stat-icon-danger mx-auto mb-4">
              <ExclamationTriangleIcon className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-red-800 dark:text-red-400 mb-2">
              Dashboard Error
            </h3>
            <p className="text-red-700 dark:text-red-300 mb-6">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="danger"
              icon={ArrowPathIcon}
            >
              Retry Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Enhanced Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center">
            <div className="stat-icon stat-icon-primary mr-4">
              <CubeIcon className="h-8 w-8" />
            </div>
            Dashboard Overview
          </h1>
          <p className="page-subtitle">
            Monitor your order management system performance
          </p>
          <div className="flex items-center space-x-4 mt-3">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <ClockIcon className="w-4 h-4 mr-1" />
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center text-sm text-green-600 dark:text-green-400">
              <BoltIcon className="w-4 h-4 mr-1" />
              <span>System Active</span>
            </div>
          </div>
        </div>

        <div className="page-actions">
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="form-input"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>

          <Button
            onClick={handleSyncData}
            variant="primary"
            icon={ArrowPathIcon}
          >
            Refresh
          </Button>

          <Button variant="ghost" size="sm" icon={CalendarIcon} />
        </div>
      </div>

      {/* Enhanced Key Metrics */}
      <div className="dashboard-grid mb-8">
        {/* Total Orders */}
        <div className="dashboard-stat">
          <div className="stat-icon stat-icon-primary">
            <CubeIcon className="h-6 w-6" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.total || 0}</div>
            <div className="stat-label">Total Orders</div>
            <div className="stat-change">
              {stats.growth?.orders >= 0 ? (
                <span className="stat-change-positive">
                  +{Math.abs(stats.growth?.orders || 0)}%
                </span>
              ) : (
                <span className="stat-change-negative">
                  -{Math.abs(stats.growth?.orders || 0)}%
                </span>
              )}
              <span className="text-gray-500 dark:text-gray-400 ml-1">
                vs last period
              </span>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="dashboard-stat">
          <div className="stat-icon stat-icon-success">
            <CurrencyDollarIcon className="h-6 w-6" />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {formatCurrency(stats.totalRevenue || 0)}
            </div>
            <div className="stat-label">Total Revenue</div>
            <div className="stat-change">
              {stats.growth?.revenue >= 0 ? (
                <span className="stat-change-positive">
                  +{Math.abs(stats.growth?.revenue || 0)}%
                </span>
              ) : (
                <span className="stat-change-negative">
                  -{Math.abs(stats.growth?.revenue || 0)}%
                </span>
              )}
              <span className="text-gray-500 dark:text-gray-400 ml-1">
                vs last period
              </span>
            </div>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="dashboard-stat">
          <div className="stat-icon stat-icon-warning">
            <BoltIcon className="h-6 w-6" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{pendingOrders || 0}</div>
            <div className="stat-label">Pending Orders</div>
            <div className="stat-change">
              <Badge
                variant="warning"
                size="sm"
                className="inline-flex items-center font-medium rounded-full transition-colors bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 text-xs"
              >
                Urgent
              </Badge>
              <span className="text-gray-500 dark:text-gray-400 ml-2">
                Need attention
              </span>
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="dashboard-stat">
          <div className="stat-icon stat-icon-primary">
            <ChartBarIcon className="h-6 w-6" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{completionRate}%</div>
            <div className="stat-label">Completion Rate</div>
            <div className="stat-change">
              <StarIcon className="w-4 h-4 text-yellow-500 mr-1" />
              <span className="text-gray-500 dark:text-gray-400">
                Delivered orders
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="stat-icon stat-icon-primary">
                <GlobeAltIcon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Active Platforms
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {activePlatforms.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Connected & running
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="stat-icon stat-icon-success">
                <CurrencyDollarIcon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Avg Order Value
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {formatCurrency(averageOrderValue)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Per order
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="stat-icon stat-icon-danger">
                <XCircleIcon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Cancellation Rate
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {cancellationRate}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Of total orders
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Orders Chart Section */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <div className="stat-icon stat-icon-primary mr-3">
                <CubeIcon className="h-5 w-5" />
              </div>
              Orders & Revenue Trends
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" icon={FunnelIcon} />
              <Button variant="ghost" size="sm" icon={ArrowDownTrayIcon} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <OrdersChart />
        </CardContent>
      </Card>

      {/* Enhanced Status and Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Enhanced Order Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircleIcon className="w-5 h-5 mr-2 text-green-600" />
              Order Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={status.variant}>{status.count}</Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Enhanced Recent Orders */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <BoltIcon className="w-5 h-5 mr-2 text-blue-600" />
                  Recent Orders
                </CardTitle>
                <Button
                  onClick={() => navigate("/orders")}
                  variant="ghost"
                  size="sm"
                  icon={EyeIcon}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentOrders?.length > 0 ? (
                  stats.recentOrders.slice(0, 5).map((order, index) => {
                    const StatusIcon = getStatusIcon(order.orderStatus);
                    return (
                      <div
                        key={index}
                        className="card-interactive p-4 cursor-pointer"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="stat-icon stat-icon-primary">
                              <ShoppingCartIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                Order #{order.orderNumber || `ORD-${order.id}`}
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
                            <Badge
                              variant={getStatusVariant(order.orderStatus)}
                              icon={StatusIcon}
                            >
                              {order.orderStatus}
                            </Badge>
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
                      <Button
                        onClick={() => navigate("/platforms")}
                        variant="primary"
                        icon={PlusIcon}
                      >
                        Add Platform
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enhanced Platform Performance and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GlobeAltIcon className="w-5 h-5 mr-2 text-purple-600" />
              Platform Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {platforms.length > 0 ? (
                platforms.slice(0, 4).map((platform, index) => {
                  const platformOrders = stats.byPlatform?.[platform.name] || 0;
                  const platformPercentage =
                    stats.total > 0 ? (platformOrders / stats.total) * 100 : 0;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge
                            variant={
                              platform.status === "active"
                                ? "success"
                                : "secondary"
                            }
                            size="sm"
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                            {platform.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {platformOrders}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({platformPercentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${platformPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state py-8">
                  <div className="empty-state-icon">
                    <GlobeAltIcon className="h-12 w-12 text-purple-600" />
                  </div>
                  <p className="empty-state-description">
                    No platforms connected
                  </p>
                  <div className="empty-state-actions">
                    <Button
                      onClick={() => navigate("/platforms")}
                      variant="primary"
                      size="sm"
                    >
                      Connect Platform
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BoltIcon className="w-5 h-5 mr-2 text-green-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => navigate("/orders/new")}
                variant="primary"
                size="lg"
                fullWidth
                className="flex-col h-20"
              >
                <PlusIcon className="w-6 h-6 mb-1" />
                <span className="text-xs">New Order</span>
              </Button>

              <Button
                onClick={() => navigate("/platforms")}
                variant="success"
                size="lg"
                fullWidth
                className="flex-col h-20"
              >
                <GlobeAltIcon className="w-6 h-6 mb-1" />
                <span className="text-xs">Platforms</span>
              </Button>

              <Button
                onClick={() => navigate("/shipping")}
                variant="secondary"
                size="lg"
                fullWidth
                className="flex-col h-20"
              >
                <CubeIcon className="w-6 h-6 mb-1" />
                <span className="text-xs">Shipping</span>
              </Button>

              <Button
                onClick={() => navigate("/settings")}
                variant="ghost"
                size="lg"
                fullWidth
                className="flex-col h-20"
              >
                <CogIcon className="w-6 h-6 mb-1" />
                <span className="text-xs">Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ArrowTrendingUpIcon className="w-5 h-5 mr-2 text-indigo-600" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="dashboard-stat">
              <div className="stat-icon stat-icon-primary">
                <CheckCircleIcon className="w-6 h-6" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{completionRate}%</div>
                <div className="stat-label">Completion Rate</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {deliveredOrders} of {stats.total} orders delivered
                </div>
              </div>
            </div>

            <div className="dashboard-stat">
              <div className="stat-icon stat-icon-success">
                <CurrencyDollarIcon className="w-6 h-6" />
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  {formatCurrency(averageOrderValue)}
                </div>
                <div className="stat-label">Avg Order Value</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Total revenue: {formatCurrency(stats.totalRevenue)}
                </div>
              </div>
            </div>

            <div className="dashboard-stat">
              <div className="stat-icon stat-icon-warning">
                <ClockIcon className="w-6 h-6" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{urgentOrders}</div>
                <div className="stat-label">Urgent Orders</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Pending: {pendingOrders} • Processing: {processingOrders}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
