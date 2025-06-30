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
  safeInteger,
  processProductData,
  processInsightsData,
} from "../../utils/analyticsFormatting";
import KPICard from "./KPICard";
import ExportButton from "./ExportButton";
import {
  CubeIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const ProductAnalytics = ({ timeframe = "30d", filters = {} }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState("performance");

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("🔍 Fetching product analytics for timeframe:", timeframe);

        const productData = await analyticsService.getProductAnalytics(
          timeframe
        );

        console.log("✅ Product analytics data received:", {
          success: productData?.success,
          hasData: !!productData?.data,
          dataKeys: productData?.data ? Object.keys(productData.data) : [],
        });

        // Process the data to handle different API response formats
        if (productData && (productData.success || productData.data)) {
          const rawData = productData.data || productData;

          // Ensure consistent data structure
          const normalizedData = {
            ...rawData,
            topProducts: processProductData(rawData.topProducts || []),
            performance: rawData.performance || {
              categories: [],
              sales: [],
              stockStatus: [],
            },
            inventory: rawData.inventory || {
              lowStock: [],
              outOfStock: [],
              overStock: [],
            },
            insights: processInsightsData(rawData.insights || {}),
          };

          console.log("📊 Processed product analytics:", {
            topProductsLength: normalizedData.topProducts?.length || 0,
            hasPerformance: !!normalizedData.performance,
            hasInsights: !!normalizedData.insights,
            normalizedData: normalizedData,
          });

          setData(normalizedData);
        } else {
          console.warn("⚠️ No product data received, setting empty data");
          setData({
            topProducts: [],
            performance: {
              categories: [],
              sales: [],
              stockStatus: [],
            },
            inventory: {
              lowStock: [],
              outOfStock: [],
              overStock: [],
            },
            insights: {
              recommendations: [],
              opportunities: [],
              warnings: [],
            },
          });
        }
      } catch (err) {
        console.error("Error fetching product analytics:", err);
        setError(err.message || "Failed to load product analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [timeframe]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading product analytics...</span>
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
              Error Loading Product Analytics
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

  // Extract product data from response
  const productAnalytics = data || {};
  const topProducts = productAnalytics.topProducts || [];
  const performance = productAnalytics.performance || {};
  const categoryData = performance.categories || [];
  const insights = productAnalytics.insights || {};

  // Prepare data for charts
  const topProductsChart = topProducts.slice(0, 10).map((product) => ({
    name: product.name || `Product ${product.id}`,
    quantity: product.totalSold || 0,
    revenue: product.totalRevenue || 0,
    orders: product.orderCount || 0,
  }));

  const categoryChart = categoryData.map((category) => ({
    name: category.name || "Unknown",
    value: category.revenue || 0,
    count: category.count || 0,
  }));

  // Calculate KPIs
  const totalProducts = topProducts.length;
  const totalRevenue = topProducts.reduce(
    (sum, p) => sum + (p.totalRevenue || 0),
    0
  );
  const totalQuantity = topProducts.reduce(
    (sum, p) => sum + (p.totalSold || 0),
    0
  );
  const avgOrderValue = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Product Analytics
          </h2>
          <p className="text-gray-600">
            Product performance, inventory insights, and recommendations
          </p>
        </div>
        <ExportButton type="products" timeframe={timeframe} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Products"
          value={totalProducts.toLocaleString()}
          icon={CubeIcon}
          color="primary"
        />
        <KPICard
          title="Product Revenue"
          value={formatCurrency(totalRevenue)}
          icon={ChartBarIcon}
          color="success"
        />
        <KPICard
          title="Units Sold"
          value={formatNumber(totalQuantity)}
          icon={ArrowTrendingUpIcon}
          color="info"
        />
        <KPICard
          title="Avg Order Value"
          value={formatCurrency(avgOrderValue)}
          icon={ExclamationTriangleIcon}
          color="warning"
        />
      </div>

      {/* Chart Controls */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            chartType === "performance"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => setChartType("performance")}
        >
          Product Performance
        </button>
        <button
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            chartType === "categories"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => setChartType("categories")}
        >
          Category Breakdown
        </button>
        <button
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            chartType === "inventory"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => setChartType("inventory")}
        >
          Inventory Analysis
        </button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {chartType === "performance" && "Top Performing Products"}
              {chartType === "categories" && "Category Performance"}
              {chartType === "inventory" && "Inventory Levels"}
            </h3>
            <ChartContainer height={400}>
              {chartType === "performance" && (
                <OptimizedBarChart
                  data={topProductsChart}
                  bars={[
                    {
                      dataKey: "quantity",
                      fill: "#8884d8",
                      name: "Quantity Sold",
                    },
                    {
                      dataKey: "revenue",
                      fill: "#82ca9d",
                      name: "Revenue ($)",
                    },
                  ]}
                  xAxisKey="name"
                  showGrid
                  showLegend
                  height={400}
                />
              )}
              {chartType === "categories" && (
                <OptimizedPieChart
                  data={categoryChart}
                  dataKey="value"
                  nameKey="name"
                  height={400}
                  showLegend
                />
              )}
              {chartType === "inventory" && (
                <OptimizedBarChart
                  data={topProductsChart}
                  bars={[
                    { dataKey: "orders", fill: "#ffc658", name: "Order Count" },
                  ]}
                  xAxisKey="name"
                  showGrid
                  showLegend
                  height={400}
                />
              )}
            </ChartContainer>
          </div>
        </div>
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Product Insights
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Top Performer
                </h4>
                <p className="text-green-600 font-medium">
                  {topProducts[0]?.name || "No data"}
                </p>
                <p className="text-sm text-gray-500">
                  {safeInteger(
                    topProducts[0]?.orderCount || 0
                  ).toLocaleString()}{" "}
                  orders
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Categories
                </h4>
                <p className="text-sm text-gray-500">
                  {categoryData.length} categories tracked
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Performance Metrics
                </h4>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Conversion Rate</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {totalQuantity > 0
                      ? ((totalProducts / totalQuantity) * 100).toFixed(1)
                      : "0"}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Top Products Details
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity Sold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topProducts.slice(0, 10).map((product, index) => {
                const quantity = parseInt(product.totalQuantity) || 0;
                const revenue = parseFloat(product.totalRevenue) || 0;
                const orders = parseInt(product.orderCount) || 1;
                const avgPrice = revenue / Math.max(quantity, 1);
                const performance = Math.min(
                  100,
                  (revenue / Math.max(totalRevenue, 1)) * 100 * 10
                );

                return (
                  <tr key={product.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {product.name || `Product ${product.id}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {product.id}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {quantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {orders.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${avgPrice.toFixed(2)}
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
                          {performance.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {topProducts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No product data available for the selected timeframe.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Product Insights Section */}
      {insights &&
        (insights.recommendations?.length > 0 ||
          insights.opportunities?.length > 0 ||
          insights.warnings?.length > 0) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Product Insights & Recommendations
              </h3>
            </div>
            <div className="p-6">
              {insights.recommendations?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center">
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Recommendations
                  </h4>
                  <div className="space-y-2">
                    {insights.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="bg-green-50 border border-green-200 rounded-md p-3"
                      >
                        <p className="text-sm text-green-800">{rec.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.opportunities?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-blue-700 mb-2 flex items-center">
                    <ArrowTrendingUpIcon className="h-4 w-4 mr-2" />
                    Opportunities
                  </h4>
                  <div className="space-y-2">
                    {insights.opportunities.map((opp, index) => (
                      <div
                        key={index}
                        className="bg-blue-50 border border-blue-200 rounded-md p-3"
                      >
                        <p className="text-sm text-blue-800">{opp.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.warnings?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-yellow-700 mb-2 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                    Warnings
                  </h4>
                  <div className="space-y-2">
                    {insights.warnings.map((warn, index) => (
                      <div
                        key={index}
                        className="bg-yellow-50 border border-yellow-200 rounded-md p-3"
                      >
                        <p className="text-sm text-yellow-800">{warn.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
};

export default ProductAnalytics;
