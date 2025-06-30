import React, { useState, useEffect } from "react";
import {
  OptimizedLineChart,
  OptimizedBarChart,
  OptimizedAreaChart,
  ChartContainer,
} from "./OptimizedCharts";
import analyticsService from "../../services/analyticsService";
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  processAnalyticsData,
} from "../../utils/analyticsFormatting";
import ExportButton from "./ExportButton";
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

const SalesAnalytics = ({ timeframe = "30d", filters = {} }) => {
  const [chartType, setChartType] = useState("line");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch sales analytics data
  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(
          "🔍 Fetching sales analytics data for timeframe:",
          timeframe
        );

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 10000)
        );

        const salesData = await Promise.race([
          analyticsService.getSalesAnalytics(timeframe),
          timeoutPromise,
        ]);

        console.log("✅ Sales analytics data received:", {
          success: salesData?.success,
          hasData: !!salesData?.data,
          dataKeys: salesData?.data ? Object.keys(salesData.data) : [],
          orderSummaryTotal:
            salesData?.data?.summary?.totalOrders ||
            salesData?.data?.orderSummary?.totalOrders ||
            0,
          revenueTotal:
            salesData?.data?.revenue?.total ||
            salesData?.data?.summary?.totalRevenue ||
            0,
          revenueTrendsCount: salesData?.data?.revenue?.trends?.length || 0,
          topProductsCount: salesData?.data?.topProducts?.length || 0,
        });

        // Process the data to handle different API response formats
        if (salesData && (salesData.success || salesData.data)) {
          const rawData = salesData.data || salesData;
          const processedData = processAnalyticsData(rawData);

          console.log("📊 Processed sales data:", {
            hasOrderSummary: !!processedData?.orderSummary,
            hasRevenue: !!processedData?.revenue,
            revenueTrendsLength: processedData?.revenue?.trends?.length || 0,
            topProductsLength: processedData?.topProducts?.length || 0,
            processedData: processedData,
          });

          setData(processedData);
        } else {
          console.warn("⚠️ No sales data received, setting empty data");
          setData(getEmptyData());
        }
      } catch (err) {
        console.error("Error fetching sales analytics:", err);

        // Check if this is an authentication error
        const isAuthError =
          err.response?.status === 401 ||
          err.response?.data?.message?.includes("Access denied") ||
          err.response?.data?.message?.includes("No token provided");

        const isTimeoutError = err.message === "Request timeout";

        let errorMessage = err.message || "Failed to load sales data";

        if (isAuthError) {
          errorMessage =
            "Authentication required. Please log in to view sales analytics.";
          console.warn("🔐 Authentication required for sales analytics");
        } else if (isTimeoutError) {
          errorMessage =
            "Sales analytics service is taking too long to respond. Please try again.";
          console.warn("⏰ Analytics service timed out");
        } else {
          console.warn("🔄 Analytics service error, using empty data");
        }

        setError(errorMessage);
        setData(getEmptyData());
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [timeframe]);

  // Generate empty data structure
  const getEmptyData = () => {
    const emptyData = {
      orderSummary: {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        growth: 0,
      },
      revenue: {
        trends: [],
        total: 0,
        growth: 0,
      },
      topProducts: [],
      platforms: { comparison: [] },
    };
    return processAnalyticsData(emptyData);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading sales analytics...</span>
      </div>
    );
  }

  // Error state
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
              Unable to load sales analytics
            </h3>
            <div className="mt-2">
              <p className="text-sm text-red-700 mb-2">{error}</p>
              {error.includes("Authentication required") ||
              error.includes("log in") ? (
                <p className="text-sm text-red-700 mb-2">
                  Please ensure you are logged in to view sales analytics data.
                </p>
              ) : error.includes("timeout") ? (
                <p className="text-sm text-red-700 mb-2">
                  The sales analytics service is taking too long to respond.
                  Please try again.
                </p>
              ) : (
                <p className="text-sm text-red-700 mb-2">
                  There was an issue connecting to the sales analytics service.
                </p>
              )}
              <button
                className="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Extract sales data from response
  const salesData = data || {};
  const orderSummary = salesData.orderSummary || salesData.summary || {};
  const revenueData = salesData.revenue || {};
  const topProducts = salesData.topProducts || [];

  // Sales KPIs
  const salesKPIs = [
    {
      title: "Total Revenue",
      value: formatCurrency(orderSummary.totalRevenue || 0),
      change: orderSummary.growth || 0,
      icon: CurrencyDollarIcon,
      color: "primary",
    },
    {
      title: "Total Orders",
      value: formatNumber(orderSummary.totalOrders || 0),
      change: orderSummary.orderGrowth || 0,
      icon: ShoppingBagIcon,
      color: "success",
    },
    {
      title: "Average Order Value",
      value: formatCurrency(orderSummary.averageOrderValue || 0),
      change: orderSummary.aovGrowth || 0,
      icon: ChartBarIcon,
      color: "info",
    },
    {
      title: "Conversion Rate",
      value: formatPercentage(orderSummary.conversionRate || 0),
      change: orderSummary.conversionGrowth || 0,
      icon: ArrowTrendingUpIcon,
      color: "warning",
    },
  ];

  // Chart colors
  const colors = ["#007bff", "#28a745", "#ffc107", "#dc3545", "#17a2b8"];

  // Prepare chart data
  const chartData = revenueData.trends || [];
  console.log("📊 Chart data preparation:", {
    hasRevenueData: !!revenueData,
    revenueDataKeys: revenueData ? Object.keys(revenueData) : [],
    hasTrends: !!revenueData?.trends,
    trendsLength: revenueData?.trends?.length || 0,
    chartDataLength: chartData.length,
    sampleChartData: chartData.slice(0, 2),
    topProductsLength: topProducts.length,
  });

  const topProductsData = topProducts.slice(0, 10).map((product) => ({
    name:
      product.name?.substring(0, 20) +
        (product.name?.length > 20 ? "..." : "") || "Unknown Product",
    fullName: product.name || "Unknown Product",
    revenue: product.totalRevenue || product.revenue || 0,
    totalSold: product.totalSold || product.quantity || product.sales || 0,
    unitsSold: product.totalSold || product.quantity || product.sales || 0,
    avgPrice: product.avgPrice || 0,
  }));

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header Section */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Sales Analytics
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Revenue trends and sales performance insights
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  chartType === "line"
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                onClick={() => setChartType("line")}
              >
                Line
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  chartType === "area"
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                onClick={() => setChartType("area")}
              >
                Area
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  chartType === "bar"
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                onClick={() => setChartType("bar")}
              >
                Bar
              </button>
            </div>
            <ExportButton
              data={data}
              filename={`sales-analytics-${timeframe}`}
              title="Export Sales Data"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {salesKPIs.map((kpi, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg bg-${kpi.color}-100`}>
                    <kpi.icon className={`h-5 w-5 text-${kpi.color}-600`} />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">
                      {kpi.title}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">
                    {kpi.value}
                  </p>
                  {kpi.change !== 0 && (
                    <p
                      className={`ml-2 text-sm font-medium ${
                        kpi.change > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {kpi.change > 0 ? "+" : ""}
                      {formatPercentage(kpi.change)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue Trends Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Revenue Trends
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Sales performance over time
            </p>
          </div>
          <div className="p-6">
            <div className="h-80">
              <ChartContainer isLoading={loading} error={error}>
                {chartType === "line" && (
                  <OptimizedLineChart
                    data={chartData}
                    height={300}
                    lines={[{ dataKey: "revenue", color: colors[0] }]}
                    formatter={formatCurrency}
                  />
                )}
                {chartType === "area" && (
                  <OptimizedAreaChart
                    data={chartData}
                    height={300}
                    areas={[
                      {
                        dataKey: "revenue",
                        strokeColor: colors[0],
                        fillColor: colors[0],
                        fillOpacity: 0.6,
                      },
                    ]}
                    formatter={formatCurrency}
                  />
                )}
                {chartType === "bar" && (
                  <OptimizedBarChart
                    data={chartData}
                    height={300}
                    bars={[{ dataKey: "revenue", color: colors[0] }]}
                    formatter={formatCurrency}
                  />
                )}
              </ChartContainer>
            </div>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Top Selling Products
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Best performing products by revenue
            </p>
          </div>
          <div className="p-6">
            <div className="h-96">
              <ChartContainer isLoading={loading} error={error}>
                <OptimizedBarChart
                  data={topProductsData}
                  height={350}
                  bars={[{ dataKey: "revenue", color: colors[0] }]}
                  formatter={(value) => {
                    const index = topProductsData.findIndex(
                      (item) => item.revenue === value
                    );
                    const data = topProductsData[index];
                    const units = data?.unitsSold || data?.totalSold || 0;
                    return `${formatCurrency(value)} (${units} units)`;
                  }}
                  layout="horizontal"
                />
              </ChartContainer>
            </div>
          </div>
        </div>

        {/* Product Performance Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Product Performance Details
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Detailed statistics for each product
            </p>
          </div>
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Units Sold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topProductsData.map((product, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {product.fullName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(product.revenue)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatNumber(product.unitsSold)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(product.avgPrice)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (product.revenue /
                                    (topProductsData[0]?.revenue || 1)) *
                                    100
                                )}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {Math.round(
                              (product.revenue /
                                (topProductsData[0]?.revenue || 1)) *
                                100
                            )}
                            %
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesAnalytics;
