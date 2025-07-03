import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNetworkAwareInterval } from "../../hooks/useNetworkStatus";
import analyticsService from "../../services/analyticsService";
import {
  formatCurrency,
  formatPercentage,
  processAnalyticsData,
  processInsightsData,
} from "../../utils/analyticsFormatting";
import {
  OptimizedBarChart,
  OptimizedAreaChart,
  OptimizedPieChart,
} from "./OptimizedCharts";
import AnalyticsErrorBoundary from "./AnalyticsErrorBoundary";
import AnalyticsSkeletons from "./AnalyticsSkeletons";
import ChartPlaceholder from "./ChartPlaceholder";
import {
  ChartBarIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BellIcon,
} from "@heroicons/react/24/solid";

/**
 * Enhanced Business Intelligence Dashboard for Month 5 Phase 1
 * Features AI-powered insights, predictive analytics, and actionable recommendations
 */
const BusinessIntelligenceDashboard = () => {
  const [timeframe, setTimeframe] = useState("30d");
  const [analytics, setAnalytics] = useState(null);
  const [businessIntelligence, setBusinessIntelligence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);

  // Memoized color scheme for consistent theming
  const chartColors = useMemo(
    () => ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#6b7280"],
    []
  );

  // Fetch dashboard analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Fetching dashboard analytics for timeframe:", timeframe);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      );

      // Use the analytics service to get comprehensive data
      const analyticsData = await Promise.race([
        analyticsService.getDashboardAnalytics(timeframe),
        timeoutPromise,
      ]);

      console.log("📊 Analytics data received:", {
        success: analyticsData?.success,
        hasData: !!analyticsData?.data,
        dataKeys: analyticsData?.data ? Object.keys(analyticsData.data) : [],
        orderSummaryKeys: analyticsData?.data?.orderSummary
          ? Object.keys(analyticsData.data.orderSummary)
          : "No orderSummary",
        hasOrdersByStatus: !!analyticsData?.data?.orderSummary?.ordersByStatus,
        ordersByStatusLength:
          analyticsData?.data?.orderSummary?.ordersByStatus?.length || 0,
        hasOrderTrends: !!analyticsData?.data?.orderTrends,
        orderTrendsKeys: analyticsData?.data?.orderTrends
          ? Object.keys(analyticsData.data.orderTrends)
          : "No orderTrends",
        hasDailyTrends: !!analyticsData?.data?.orderTrends?.daily,
        dailyTrendsLength: analyticsData?.data?.orderTrends?.daily?.length || 0,
      });

      if (analyticsData && (analyticsData.success || analyticsData.data)) {
        const data = analyticsData.data || analyticsData;

        // Process the data using safe formatting
        const processedData = processAnalyticsData({
          orderSummary: {
            ...(data.summary || data.orderSummary || {}),
            // Ensure default values for missing fields
            totalOrders: (data.summary || data.orderSummary)?.totalOrders || 0,
            totalRevenue:
              (data.summary || data.orderSummary)?.totalRevenue || 0,
            validOrders: (data.summary || data.orderSummary)?.validOrders || 0,
            averageOrderValue:
              (data.summary || data.orderSummary)?.averageOrderValue || 0,
            cancelledOrders:
              (data.summary || data.orderSummary)?.cancelledOrders || 0,
            returnedOrders:
              (data.summary || data.orderSummary)?.returnedOrders || 0,
            // Preserve ordersByStatus if it exists
            ordersByStatus:
              (data.summary || data.orderSummary)?.ordersByStatus || [],
          },
          revenue: data.revenue || {
            trends: [],
            total: 0,
            growth: 0,
            previousPeriod: 0,
          },
          orders: {
            trends: data.orderTrends?.daily || data.orders?.trends || [],
          },
          platforms: data.platforms || data.platformComparison || [],
          topProducts: data.topProducts || [],
          performance: data.performanceMetrics || { metrics: {} },
          financialKPIs: data.financialKPIs || {}, // Add Financial KPIs to main analytics
        });

        setAnalytics(processedData);

        // Set business intelligence data with Financial KPIs
        setBusinessIntelligence({
          insights: data.insights || data.predictions?.insights || [],
          recommendations: processInsightsData(
            data.recommendations
              ? { recommendations: data.recommendations }
              : data.predictions?.recommendations
              ? { recommendations: data.predictions.recommendations }
              : {}
          ).recommendations,
          predictions: data.predictiveInsights || {},
          financialKPIs: data.financialKPIs || {}, // Add Financial KPIs to business intelligence
        });
      } else {
        console.warn("⚠️ No analytics data received, using empty data");
        // Fallback to basic structure if no data
        setAnalytics({
          orderSummary: {
            totalOrders: 0,
            totalRevenue: 0,
            validOrders: 0,
            averageOrderValue: 0,
            cancelledOrders: 0,
            returnedOrders: 0,
            ordersByStatus: [],
          },
          revenue: {
            trends: [],
            total: 0,
            growth: 0,
            previousPeriod: 0,
          },
          orders: { trends: [] },
          platforms: [],
          topProducts: [],
          performance: { metrics: {} },
          financialKPIs: {},
        });
        setBusinessIntelligence({
          insights: [],
          recommendations: [],
          predictions: {},
          financialKPIs: {},
        });
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("❌ Error fetching analytics:", err);

      // Check if this is an authentication error
      const isAuthError =
        err.response?.status === 401 ||
        err.response?.data?.message?.includes("Access denied") ||
        err.response?.data?.message?.includes("No token provided");

      const isTimeoutError = err.message === "Request timeout";

      let errorMessage = err.message || "Failed to load analytics data";

      if (isAuthError) {
        errorMessage =
          "Authentication required. Please log in to view analytics.";
      } else if (isTimeoutError) {
        errorMessage =
          "Analytics service is taking too long to respond. Please try again.";
      }

      setError(errorMessage);

      // Use empty data on error to show proper loading states
      console.warn("🔄 Setting empty data due to analytics service error");
      setAnalytics({
        orderSummary: {
          totalOrders: 0,
          totalRevenue: 0,
          validOrders: 0,
          averageOrderValue: 0,
          cancelledOrders: 0,
          returnedOrders: 0,
          ordersByStatus: [],
        },
        revenue: {
          trends: [],
          total: 0,
          growth: 0,
          previousPeriod: 0,
        },
        orders: { trends: [] },
        platforms: [],
        topProducts: [],
        performance: { metrics: {} },
        financialKPIs: {},
      });
      setBusinessIntelligence({
        insights: [],
        recommendations: [],
        predictions: {},
        financialKPIs: {},
      });
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  // Auto-refresh functionality
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Network-aware auto-refresh
  useNetworkAwareInterval(() => {
    if (autoRefresh) {
      fetchAnalytics();
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Helper functions for UI
  const getTrendIcon = useCallback((value) => {
    if (value > 0)
      return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
    if (value < 0)
      return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
    return <span className="h-4 w-4 text-gray-400">-</span>;
  }, []);

  const getPriorityVariant = useCallback((priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
      case "critical":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, []);

  const getPriorityBorderColor = useCallback((priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
      case "critical":
        return "border-red-500";
      case "medium":
        return "border-yellow-500";
      case "low":
        return "border-blue-500";
      default:
        return "border-gray-300";
    }
  }, []);

  const handleExport = useCallback((format) => {
    // Placeholder export functionality
    console.log(`Exporting analytics data in ${format} format`);
    setShowExportModal(false);
    // In a real implementation, this would export the analytics data
  }, []);

  const timeframeOptions = useMemo(
    () => [
      { value: "7d", label: "Last 7 days" },
      { value: "30d", label: "Last 30 days" },
      { value: "90d", label: "Last 90 days" },
      { value: "1y", label: "Last year" },
    ],
    []
  );

  // Loading state
  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <AnalyticsSkeletons.DashboardSkeleton />
      </div>
    );
  }

  // Empty state handling
  if (!loading && !error && (!analytics || !businessIntelligence)) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Analytics Data Available
          </h3>
          <p className="text-gray-500 mb-4">
            We couldn't find any analytics data for the selected time period.
            This might be because:
          </p>
          <ul className="text-left text-gray-500 mb-6 space-y-1">
            <li>• No orders or sales data exists for this period</li>
            <li>• The selected timeframe is too recent</li>
            <li>• Data is still being processed</li>
          </ul>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
              aria-label="Refresh analytics data"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Refresh Data
            </button>
            <button
              onClick={() => setTimeframe("90d")}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Try a longer time period"
            >
              Try Longer Period
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check for empty business intelligence data specifically
  if (
    !loading &&
    !error &&
    analytics &&
    businessIntelligence &&
    (!businessIntelligence.insights ||
      businessIntelligence.insights.length === 0) &&
    (!businessIntelligence.recommendations ||
      businessIntelligence.recommendations.length === 0)
  ) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Business Intelligence
            </h2>
            <p className="text-gray-500">
              AI-powered insights and recommendations
            </p>
          </div>
        </div>

        <div className="min-h-96 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <ExclamationTriangleIcon className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Insights Generated
            </h3>
            <p className="text-gray-500 mb-6">
              We have analytics data but couldn't generate business insights.
              This could be due to insufficient data patterns or recent changes.
            </p>
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors mx-auto"
              aria-label="Generate new insights"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Generate Insights
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-red-800 font-medium mb-1">
                Unable to load analytics data
              </h3>
              <p className="text-red-700 mb-3">{error}</p>
              {error.includes("Access denied") || error.includes("401") ? (
                <p className="text-red-600 text-sm mb-3">
                  Please ensure you are logged in to view analytics data.
                </p>
              ) : error.includes("timeout") ? (
                <p className="text-red-600 text-sm mb-3">
                  The analytics service is taking too long to respond. Please
                  try again.
                </p>
              ) : (
                <p className="text-red-600 text-sm mb-3">
                  There was an issue connecting to the analytics service.
                </p>
              )}
              <button
                onClick={fetchAnalytics}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnalyticsErrorBoundary>
      <main
        className="space-y-6"
        role="main"
        aria-label="Business Intelligence Dashboard"
      >
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Business Intelligence
            </h2>
            <p className="text-gray-500">
              AI-powered insights and recommendations
              {lastUpdated && (
                <span className="ml-2 text-sm">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            {/* Timeframe Selector */}
            <div className="relative">
              <button
                onClick={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-2"
              >
                {timeframeOptions.find((opt) => opt.value === timeframe)
                  ?.label || timeframe}
                <ChevronDownIcon className="h-4 w-4" />
              </button>

              {showTimeframeDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {timeframeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTimeframe(option.value);
                        setShowTimeframeDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Refresh data"
            >
              <ArrowPathIcon
                className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
              />
            </button>

            {/* Export Button */}
            <button
              onClick={() => setShowExportModal(true)}
              className="p-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Export data"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {formatCurrency(
                  analytics?.summary?.totalRevenue ||
                    analytics?.orderSummary?.totalRevenue ||
                    analytics?.revenue?.total ||
                    0
                )}
              </div>
              <div className="text-gray-500 text-sm mb-3">Total Revenue</div>
              {(analytics?.revenue?.growth || analytics?.summary?.growth) && (
                <div className="flex items-center justify-center gap-1">
                  {getTrendIcon(
                    analytics.revenue.growth.rate ||
                      analytics.revenue.growth.current ||
                      0
                  )}
                  <span
                    className={`text-sm font-medium ${
                      (analytics.revenue?.growth?.rate ||
                        analytics.revenue.growth.current ||
                        0) > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatPercentage(
                      analytics.revenue?.growth?.rate ||
                        analytics.summary?.growth ||
                        0
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-600 mb-1">
                {analytics?.orderSummary?.totalOrders || 0}
              </div>
              <div className="text-gray-500 text-sm mb-3">Total Orders</div>
              <div className="text-green-600 text-sm font-medium">
                Avg:{" "}
                {formatCurrency(
                  analytics?.orderSummary?.avgOrderValue ||
                    analytics?.orderSummary?.averageOrderValue ||
                    analytics?.summary?.averageOrderValue ||
                    0
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {analytics?.platforms?.length || 0}
              </div>
              <div className="text-gray-500 text-sm mb-3">Active Platforms</div>
              <div className="text-cyan-600 text-sm font-medium">
                {analytics?.platforms?.length > 0
                  ? "Integrated & Syncing"
                  : "No platforms connected"}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-1">
                {businessIntelligence?.recommendations?.length || 0}
              </div>
              <div className="text-gray-500 text-sm mb-3">
                AI Recommendations
              </div>
              <div className="text-red-600 text-sm font-medium">
                Action Required
              </div>
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        {businessIntelligence?.recommendations?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center text-gray-900">
                <BellIcon className="h-5 w-5 mr-3 text-blue-600" />
                <h3 className="text-lg font-semibold">
                  AI-Powered Recommendations
                </h3>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {businessIntelligence.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`bg-white rounded-lg border-l-4 ${getPriorityBorderColor(
                      rec.priority || "medium"
                    )} border border-gray-200 shadow-sm p-4 h-full`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full uppercase ${getPriorityVariant(
                          rec.priority || "medium"
                        )}`}
                      >
                        {rec.priority || "medium"} Priority
                      </span>
                      <span className="text-sm text-gray-500">
                        {rec.category || "General"}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      {rec.title || "Recommendation"}
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      {rec.description || "No details available"}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-600">
                        {rec.estimatedImpact || "High Impact"}
                      </span>
                      <button
                        onClick={() => setSelectedRecommendation(rec)}
                        className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Revenue Analytics & Sales Forecast */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Revenue Trends & Forecast
                </h3>
              </div>
              <div className="p-6">
                {analytics?.revenue?.trends?.length > 0 ? (
                  <OptimizedAreaChart
                    data={analytics.revenue.trends}
                    height={350}
                    xKey="date"
                    yKey="revenue"
                    title="Revenue Trends"
                  />
                ) : (
                  <ChartPlaceholder
                    icon={ChartBarIcon}
                    title="Revenue Trends Chart"
                    description="Revenue trend data will appear here once orders are processed."
                    height={350}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Platform Performance
                </h3>
              </div>
              <div className="p-6">
                {analytics?.platforms?.length > 0 ? (
                  <OptimizedPieChart
                    data={analytics.platforms.map((platform) => ({
                      name: platform.platform || platform.name,
                      value: platform.totalRevenue || platform.revenue || 0,
                      color:
                        chartColors[
                          analytics.platforms.indexOf(platform) %
                            chartColors.length
                        ],
                    }))}
                    height={350}
                    showLabels={true}
                    showTooltip={true}
                  />
                ) : (
                  <ChartPlaceholder
                    icon={ChartBarIcon}
                    title="Platform Performance"
                    description="Platform performance data will appear here once platforms are connected."
                    height={350}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Top Products & Market Intelligence */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Top Performing Products
              </h3>
            </div>
            <div className="p-6">
              {analytics?.topProducts?.length > 0 ? (
                <div className="space-y-4">
                  {analytics.topProducts.slice(0, 5).map((product, index) => {
                    // Enhanced field mapping with debugging
                    const productName =
                      product.name ||
                      product.title ||
                      product.productName ||
                      product.product_name ||
                      product.Product?.name ||
                      "Unknown Product";

                    const productSku =
                      product.sku ||
                      product.SKU ||
                      product.productSku ||
                      product.product_sku ||
                      product.Product?.sku ||
                      "N/A";

                    const productCategory =
                      product.category ||
                      product.categoryName ||
                      product.category_name ||
                      product.productCategory ||
                      product.Product?.category ||
                      "Uncategorized";

                    const revenue =
                      product.totalRevenue ||
                      product.total_revenue ||
                      product.revenue ||
                      0;

                    const sold =
                      product.totalSold ||
                      product.total_sold ||
                      product.quantity_sold ||
                      product.sold ||
                      product.sales ||
                      0;

                    return (
                      <div
                        key={product.id || product.productId || index}
                        className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {productName}
                          </h4>
                          <p className="text-sm text-gray-500">
                            SKU: {productSku} | {productCategory}
                          </p>
                          {product.platform && (
                            <p className="text-xs text-blue-600 mt-1">
                              Platform: {product.platform}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            {formatCurrency(revenue)}
                          </div>
                          <p className="text-sm text-gray-500">{sold} sold</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">
                    No top products data available for this period.
                  </p>
                  <p className="text-sm text-gray-400">
                    Product performance data will appear here once orders are
                    processed.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Financial KPIs
              </h3>
            </div>
            <div className="p-6">
              {analytics?.financialKPIs ||
              businessIntelligence?.financialKPIs ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {formatPercentage(
                        analytics?.financialKPIs?.growthRates?.revenue ||
                          businessIntelligence?.financialKPIs?.growthRates
                            ?.revenue ||
                          analytics?.revenue?.growth ||
                          0
                      )}
                    </div>
                    <div className="text-sm text-gray-500">Revenue Growth</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {formatCurrency(
                        analytics?.financialKPIs?.avgOrderValue ||
                          businessIntelligence?.financialKPIs?.avgOrderValue ||
                          analytics?.orderSummary?.averageOrderValue ||
                          0
                      )}
                    </div>
                    <div className="text-sm text-gray-500">Avg Order Value</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-cyan-600 mb-1">
                      {formatCurrency(
                        analytics?.financialKPIs?.customerLifetimeValue ||
                          businessIntelligence?.financialKPIs
                            ?.customerLifetimeValue ||
                          0
                      )}
                    </div>
                    <div className="text-sm text-gray-500">Customer LTV</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600 mb-1">
                      {formatPercentage(
                        analytics?.financialKPIs?.profitMargins?.gross ||
                          businessIntelligence?.financialKPIs?.profitMargins
                            ?.gross ||
                          analytics?.financialKPIs?.keyMetrics?.grossMargin ||
                          0
                      )}
                    </div>
                    <div className="text-sm text-gray-500">Gross Margin</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">
                    No financial data available for the selected timeframe.
                  </p>
                  <p className="text-sm text-gray-400">
                    Financial KPIs will appear here once order data is
                    available.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Status & Trends Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Order Status Breakdown
              </h3>
            </div>
            <div className="p-6">
              {analytics?.orderSummary?.ordersByStatus?.length > 0 ? (
                <OptimizedPieChart
                  data={analytics.orderSummary.ordersByStatus.map(
                    (status, index) => ({
                      name: status.status || "Unknown",
                      value: status.count || 0,
                      amount: status.totalAmount || 0,
                      color: chartColors[index % chartColors.length],
                    })
                  )}
                  height={300}
                  showLabels={true}
                  showTooltip={true}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">
                    No order status data available.
                  </p>
                  <p className="text-sm text-gray-400">
                    {error
                      ? "Unable to load order status data. Please check your connection and try again."
                      : "Order status breakdown will appear here once orders are processed."}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Orders & Revenue Trends
              </h3>
            </div>
            <div className="p-6">
              {analytics?.orders?.trends?.length > 0 ? (
                <OptimizedBarChart
                  data={analytics.orders.trends}
                  height={300}
                  xKey="date"
                  leftYKey="orders"
                  rightYKey="revenue"
                  leftYLabel="Orders"
                  rightYLabel="Revenue"
                  showLegend={true}
                />
              ) : (
                <ChartPlaceholder
                  icon={ChartBarIcon}
                  title="Order & Revenue Trends"
                  description={
                    error
                      ? "Unable to load order trends data. Please check your connection and try again."
                      : "Order and revenue trends will appear here once orders are processed."
                  }
                  height={300}
                />
              )}
            </div>
          </div>
        </div>

        {/* Recommendation Details Modal */}
        {selectedRecommendation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedRecommendation.title}
                </h3>
                <button
                  onClick={() => setSelectedRecommendation(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4 flex gap-2">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full uppercase ${getPriorityVariant(
                      selectedRecommendation.priority
                    )}`}
                  >
                    {selectedRecommendation.priority} Priority
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                    {selectedRecommendation.category}
                  </span>
                </div>

                <p className="text-gray-700 mb-6">
                  {selectedRecommendation.description}
                </p>

                {selectedRecommendation.actions?.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Recommended Actions:
                    </h4>
                    <ul className="space-y-2">
                      {selectedRecommendation.actions.map((action, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          <span className="text-gray-700">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <strong className="text-gray-900">Estimated Impact:</strong>
                    <div className="text-green-600 font-medium">
                      {selectedRecommendation.estimatedImpact}
                    </div>
                  </div>
                  <div>
                    <strong className="text-gray-900">Timeframe:</strong>
                    <div className="text-blue-600 font-medium">
                      {selectedRecommendation.timeframe}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedRecommendation(null)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Mark as Implemented
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Export Analytics Data
                </h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-gray-700 mb-4">
                  Choose the format for exporting your analytics data:
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => handleExport("json")}
                    className="w-full px-4 py-3 border border-blue-300 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5" />
                    Export as JSON
                  </button>
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full px-4 py-3 border border-green-300 text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5" />
                    Export as CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </AnalyticsErrorBoundary>
  );
};

export default BusinessIntelligenceDashboard;
