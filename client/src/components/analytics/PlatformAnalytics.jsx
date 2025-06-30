import React, { useState, useEffect } from "react";
import {
  OptimizedBarChart,
  OptimizedPieChart,
  ChartContainer,
} from "./OptimizedCharts";
import analyticsService from "../../services/analyticsService";
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
} from "../../utils/analyticsFormatting";
import KPICard from "./KPICard";
import ExportButton from "./ExportButton";
import {
  GlobeAltIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";

const PlatformAnalytics = ({ timeframe = "30d", filters = {} }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState("comparison");

  useEffect(() => {
    const fetchPlatformData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("🔍 Fetching platform analytics for timeframe:", timeframe);

        const platformData = await analyticsService.getPlatformAnalytics(
          timeframe
        );

        console.log("✅ Platform analytics data received:", {
          success: platformData?.success,
          hasData: !!platformData?.data,
          dataKeys: platformData?.data ? Object.keys(platformData.data) : [],
        });

        // Process the data to handle different API response formats
        if (platformData && (platformData.success || platformData.data)) {
          const rawData = platformData.data || platformData;

          // Ensure consistent data structure
          const normalizedData = {
            ...rawData,
            platforms: rawData.platforms || rawData.comparison || [],
            performance: rawData.performance || {},
            summary: rawData.summary || rawData.orderSummary || {},
          };

          console.log("📊 Processed platform data:", {
            platformsLength: normalizedData.platforms?.length || 0,
            hasPerformance: !!normalizedData.performance,
            hasSummary: !!normalizedData.summary,
            normalizedData: normalizedData,
          });

          setData(normalizedData);
        } else {
          console.warn("⚠️ No platform data received, setting empty data");
          setData({
            platforms: [],
            performance: {},
            summary: {},
          });
        }
      } catch (err) {
        console.error("Error fetching platform analytics:", err);
        setError(err.message || "Failed to load platform analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchPlatformData();
  }, [timeframe]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">
          Loading platform analytics...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error Loading Platform Analytics
            </h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-3">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Extract platform data from response
  const platformAnalytics = data || {};
  const platforms = platformAnalytics.platforms || {};

  // Colors for charts
  const CHART_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  // Prepare data for charts
  const platformChart = platforms.map((platform) => ({
    name: platform.name || platform.platform || "Unknown",
    orders: platform.totalOrders || platform.orders || 0,
    revenue: platform.totalRevenue || platform.revenue || 0,
    avgOrderValue: platform.avgOrderValue || 0,
    conversionRate: platform.conversionRate || platform.completionRate || 0,
    completedOrders: platform.completedOrders || 0,
  }));

  const platformPieData = platforms.map((platform) => ({
    name: platform.name || platform.platform || "Unknown",
    value: platform.totalRevenue || platform.revenue || 0,
  }));

  // Calculate KPIs
  const totalPlatforms = platforms.length;
  const totalRevenue = platforms.reduce(
    (sum, p) => sum + (p.totalRevenue || p.revenue || 0),
    0
  );
  const totalOrders = platforms.reduce(
    (sum, p) => sum + (p.totalOrders || p.orders || 0),
    0
  );
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Find best performing platform
  const bestPlatform = platforms.reduce((best, current) => {
    const currentRevenue = current.totalRevenue || current.revenue || 0;
    const bestRevenue = best.totalRevenue || best.revenue || 0;
    return currentRevenue > bestRevenue ? current : best;
  }, platforms[0] || {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Platform Analytics
          </h2>
          <p className="text-gray-600">
            Performance comparison across different e-commerce platforms
          </p>
        </div>
        <ExportButton type="platforms" timeframe={timeframe} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Active Platforms"
          value={totalPlatforms.toString()}
          icon={GlobeAltIcon}
          color="primary"
        />
        <KPICard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={ChartBarIcon}
          color="success"
        />
        <KPICard
          title="Total Orders"
          value={formatNumber(totalOrders)}
          icon={ShoppingBagIcon}
          color="info"
        />
        <KPICard
          title="Avg Order Value"
          value={formatCurrency(avgOrderValue)}
          icon={ArrowTrendingUpIcon}
          color="warning"
        />
      </div>

      {/* Chart Controls */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            chartType === "comparison"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => setChartType("comparison")}
        >
          Revenue Comparison
        </button>
        <button
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            chartType === "orders"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => setChartType("orders")}
        >
          Order Volume
        </button>
        <button
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            chartType === "performance"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => setChartType("performance")}
        >
          Performance Metrics
        </button>
        <button
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            chartType === "distribution"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => setChartType("distribution")}
        >
          Revenue Distribution
        </button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {chartType === "comparison" && "Platform Revenue Comparison"}
              {chartType === "orders" && "Order Volume by Platform"}
              {chartType === "performance" && "Platform Performance Metrics"}
              {chartType === "distribution" && "Revenue Distribution"}
            </h3>
            <ChartContainer height={400}>
              {chartType === "comparison" && (
                <OptimizedBarChart
                  data={platformChart}
                  bars={[
                    {
                      dataKey: "revenue",
                      fill: "#8884d8",
                      name: "Revenue ($)",
                    },
                  ]}
                  xAxisKey="name"
                  showGrid
                  showLegend
                  height={400}
                />
              )}
              {chartType === "orders" && (
                <OptimizedBarChart
                  data={platformChart}
                  bars={[
                    { dataKey: "orders", fill: "#82ca9d", name: "Orders" },
                  ]}
                  xAxisKey="name"
                  showGrid
                  showLegend
                  height={400}
                />
              )}
              {(chartType === "performance" ||
                chartType === "distribution") && (
                <OptimizedPieChart
                  data={platformPieData}
                  height={400}
                  colors={CHART_COLORS}
                />
              )}
            </ChartContainer>
          </div>
        </div>
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Platform Insights
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Best Performer
                </h4>
                <p className="text-green-600 font-medium">
                  {bestPlatform.name || bestPlatform.platform || "No data"}
                </p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(
                    bestPlatform.totalRevenue || bestPlatform.revenue || 0
                  )}{" "}
                  revenue
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Platform Coverage
                </h4>
                <p className="text-sm text-gray-500">
                  {totalPlatforms} platforms active
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Order Distribution
                </h4>
                <div className="space-y-2">
                  {platforms.slice(0, 3).map((platform, index) => {
                    const orders = platform.totalOrders || platform.orders || 0;
                    const percentage =
                      totalOrders > 0 ? (orders / totalOrders) * 100 : 0;
                    return (
                      <div key={index}>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {platform.name || platform.platform}
                          </span>
                          <span className="text-gray-900">
                            {formatPercentage(percentage, 1)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Platform Performance Details
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Order Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {platforms.map((platform, index) => {
                const orders = platform.totalOrders || platform.orders || 0;
                const revenue = platform.totalRevenue || platform.revenue || 0;
                const avgOrderValue =
                  platform.avgOrderValue || (orders > 0 ? revenue / orders : 0);
                const conversionRate =
                  platform.conversionRate || platform.completionRate || 0;
                const performance = Math.min(
                  100,
                  (revenue / Math.max(totalRevenue, 1)) * 100
                );

                return (
                  <tr
                    key={platform.name || platform.platform || index}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {platform.name || platform.platform || "Unknown"}
                        </div>
                        <div className="text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {platform.platform || "Platform"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(orders)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(avgOrderValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          conversionRate > 80
                            ? "bg-green-100 text-green-800"
                            : conversionRate > 50
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {formatPercentage(conversionRate, 1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              performance > 75
                                ? "bg-green-500"
                                : performance > 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${performance}%` }}
                          ></div>
                        </div>
                        <span className="text-xs">
                          {formatPercentage(performance, 1)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {platforms.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No platform data available for the selected timeframe.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlatformAnalytics;
