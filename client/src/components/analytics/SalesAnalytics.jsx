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
  processAnalyticsData,
} from "../../utils/analyticsFormatting";
import KPICard from "./KPICard";
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
          analyticsService.getDashboardAnalytics(timeframe),
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

        if (isAuthError) {
          console.warn("🔐 Authentication required for sales analytics");
        } else if (isTimeoutError) {
          console.warn("⏰ Analytics service timed out");
        } else {
          console.warn("🔄 Analytics service error, using empty data");
        }

        setError(null); // Don't show error, just use empty data for better UX
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
        trends: [
          { date: "2024-01-01", revenue: 0 },
          { date: "2024-01-02", revenue: 0 },
          { date: "2024-01-03", revenue: 0 },
        ],
        total: 0,
        growth: 0,
      },
      topProducts: [
        {
          name: "Sample Product",
          totalRevenue: 0,
          totalSold: 0,
          avgPrice: 0,
        },
      ],
      platforms: { comparison: [] },
    };
    return processAnalyticsData(emptyData);
  };

  // Loading state
  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="flex items-center justify-center min-h-96">
          <div className="flex items-center gap-3">
            <div className="loading-spinner"></div>
            <span className="text-secondary">Loading sales analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="analytics-dashboard">
        <div className="analytics-error-state">
          <div className="analytics-error-icon">
            <svg className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="analytics-error-title">
            Unable to load sales analytics
          </h3>
          <div className="analytics-error-description">
            <p>{error}</p>
            {error.includes("Authentication required") ||
            error.includes("log in") ? (
              <p>
                Please ensure you are logged in to view sales analytics data.
              </p>
            ) : error.includes("timeout") ? (
              <p>The sales analytics service is taking too long to respond.</p>
            ) : (
              <p>
                There was an issue connecting to the sales analytics service.
              </p>
            )}
          </div>
          <button
            className="btn btn-danger"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Extract sales data from response
  const salesData = data || {};
  const orderSummary = salesData.orderSummary || salesData.summary || {};
  const revenueData = salesData.revenue || {};
  const topProducts = salesData.topProducts || [];

  // Sales KPIs - Pass raw numeric values to KPICard
  const salesKPIs = [
    {
      title: "Total Revenue",
      value: orderSummary.totalRevenue || 0,
      change: orderSummary.growth || 0,
      icon: CurrencyDollarIcon,
      color: "primary",
      format: "currency",
    },
    {
      title: "Total Orders",
      value: orderSummary.totalOrders || 0,
      change: orderSummary.orderGrowth || 0,
      icon: ShoppingBagIcon,
      color: "success",
      format: "number",
    },
    {
      title: "Average Order Value",
      value: orderSummary.averageOrderValue || 0,
      change: orderSummary.aovGrowth || 0,
      icon: ChartBarIcon,
      color: "info",
      format: "currency",
    },
    {
      title: "Conversion Rate",
      value: orderSummary.conversionRate || 0,
      change: orderSummary.conversionGrowth || 0,
      icon: ArrowTrendingUpIcon,
      color: "warning",
      format: "percentage",
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
    <div className="analytics-dashboard">
      {/* Header Section */}
      <div className="card-header bg-gradient-primary">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <CurrencyDollarIcon className="h-6 w-6" />
              Sales Analytics
            </h2>
            <p className="text-white/80 mt-1">
              Revenue trends and sales performance insights
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-white/10 rounded-lg p-1">
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  chartType === "line"
                    ? "bg-white text-primary-600 shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
                onClick={() => setChartType("line")}
              >
                Line
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  chartType === "area"
                    ? "bg-white text-primary-600 shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
                onClick={() => setChartType("area")}
              >
                Area
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  chartType === "bar"
                    ? "bg-white text-primary-600 shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-white/10"
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

      <div className="page-content">
        {/* KPI Cards */}
        <div className="analytics-kpi-grid">
          {salesKPIs.map((kpi, index) => (
            <KPICard
              key={index}
              title={kpi.title}
              value={kpi.value}
              change={kpi.change}
              icon={kpi.icon}
              color={kpi.color}
              format={kpi.format}
            />
          ))}
        </div>

        {/* Revenue Trends Chart */}
        <div className="analytics-chart-container">
          <div className="analytics-chart-header">
            <h3 className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5" />
              Revenue Trends
            </h3>
            <p className="text-secondary mt-1">Sales performance over time</p>
          </div>
          <div className="analytics-chart-body">
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
        <div className="analytics-chart-container">
          <div className="analytics-chart-header">
            <h3 className="flex items-center gap-2">
              <ShoppingBagIcon className="h-5 w-5" />
              Top Selling Products
            </h3>
            <p className="text-secondary mt-1">
              Best performing products by revenue
            </p>
          </div>
          <div className="analytics-chart-body">
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
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5" />
              Product Performance Details
            </h3>
            <p className="text-secondary">
              Detailed statistics for each product
            </p>
          </div>
          <div className="card-body">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Revenue</th>
                    <th>Units Sold</th>
                    <th>Avg Price</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {topProductsData.map((product, index) => (
                    <tr key={index}>
                      <td>
                        <div className="font-medium text-primary">
                          {product.fullName}
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold">
                          {formatCurrency(product.revenue)}
                        </div>
                      </td>
                      <td>
                        <div className="text-secondary">
                          {formatNumber(product.unitsSold)}
                        </div>
                      </td>
                      <td>
                        <div className="text-secondary">
                          {formatCurrency(product.avgPrice)}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
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
                          <span className="text-sm text-secondary">
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
