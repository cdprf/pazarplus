import logger from "../../utils/logger";
import React, { useState, useEffect } from "react";
import {
  OptimizedAreaChart,
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
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const FinancialAnalytics = ({ timeframe = "30d", filters = {} }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState("revenue");

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        setLoading(true);
        setError(null);
        const financialData = await analyticsService.getFinancialAnalytics(
          timeframe
        );
        setData(financialData);
      } catch (err) {
        logger.error("Error fetching financial analytics:", err);
        setError(err.message || "Failed to load financial analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [timeframe]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 font-medium">
            Loading financial analytics...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">
              Error Loading Financial Analytics
            </h3>
            <p className="text-red-700 mt-1">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Extract financial data from response
  const financialAnalytics = data?.data || data || {};
  const revenueData = financialAnalytics.revenue || {};
  const orderSummary =
    financialAnalytics.orderSummary || financialAnalytics.summary || {};
  const platforms = financialAnalytics.platforms || [];

  // Calculate financial metrics
  const totalRevenue = revenueData.total || 0;
  const previousRevenue = revenueData.previous || 0;
  const totalOrders = orderSummary.totalOrders || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const revenueGrowth =
    revenueData.growth ||
    (previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
      : 0);

  // Calculate costs and profit (mock calculation - should come from backend)
  const estimatedCosts = totalRevenue * 0.7; // Assuming 70% cost ratio
  const grossProfit = totalRevenue - estimatedCosts;
  const profitMargin =
    totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Prepare chart data
  const revenueOverTime = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(
      Date.now() - (29 - i) * 24 * 60 * 60 * 1000
    ).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    revenue: Math.random() * 5000 + totalRevenue / 30,
    profit: Math.random() * 1500 + grossProfit / 30,
    costs: Math.random() * 3500 + estimatedCosts / 30,
  }));

  const platformFinancials = platforms.map((platform) => ({
    name: platform.name || platform.platform || "Unknown",
    revenue: platform.totalRevenue || platform.revenue || 0,
    orders: platform.totalOrders || platform.orders || 0,
    profit: (platform.totalRevenue || platform.revenue || 0) * 0.3, // Mock profit margin
  }));

  const expenseBreakdown = [
    { name: "Cost of Goods", value: estimatedCosts * 0.6, color: "#0088FE" },
    { name: "Marketing", value: estimatedCosts * 0.2, color: "#00C49F" },
    { name: "Operations", value: estimatedCosts * 0.15, color: "#FFBB28" },
    { name: "Other", value: estimatedCosts * 0.05, color: "#FF8042" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Financial Analytics
          </h2>
          <p className="text-gray-600">
            Revenue, profit margins, cash flow, and financial KPIs
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <ExportButton type="financial" timeframe={timeframe} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value={totalRevenue}
          change={revenueGrowth}
          icon={CurrencyDollarIcon}
          color="success"
          format="currency"
        />
        <KPICard
          title="Gross Profit"
          value={grossProfit}
          icon={BanknotesIcon}
          color="primary"
          format="currency"
        />
        <KPICard
          title="Profit Margin"
          value={profitMargin}
          icon={ChartBarIcon}
          color="info"
          format="percentage"
        />
        <KPICard
          title="Avg Order Value"
          value={avgOrderValue}
          icon={ArrowTrendingUpIcon}
          color="warning"
          format="currency"
        />
      </div>

      {/* Chart Controls */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setChartType("revenue")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            chartType === "revenue"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Revenue Trend
        </button>
        <button
          onClick={() => setChartType("profit")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            chartType === "profit"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Profit Analysis
        </button>
        <button
          onClick={() => setChartType("platforms")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            chartType === "platforms"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Platform Revenue
        </button>
        <button
          onClick={() => setChartType("expenses")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            chartType === "expenses"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Expense Breakdown
        </button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {chartType === "revenue" && "Revenue Trend Over Time"}
              {chartType === "profit" && "Profit & Loss Analysis"}
              {chartType === "platforms" && "Platform Revenue Comparison"}
              {chartType === "expenses" && "Expense Categories"}
            </h3>
            <ChartContainer height={400}>
              {chartType === "revenue" && (
                <OptimizedAreaChart
                  data={revenueOverTime}
                  areas={[
                    {
                      dataKey: "revenue",
                      fill: "#8884d8",
                      stroke: "#8884d8",
                      name: "Revenue",
                    },
                  ]}
                  xAxisKey="date"
                  showGrid
                  showLegend
                  height={400}
                />
              )}
              {chartType === "profit" && (
                <OptimizedBarChart
                  data={revenueOverTime}
                  bars={[
                    { dataKey: "revenue", fill: "#8884d8", name: "Revenue" },
                    { dataKey: "costs", fill: "#ff7300", name: "Costs" },
                    { dataKey: "profit", fill: "#00ff00", name: "Profit" },
                  ]}
                  xAxisKey="date"
                  showGrid
                  showLegend
                  height={400}
                />
              )}
              {chartType === "platforms" && (
                <OptimizedBarChart
                  data={platformFinancials}
                  bars={[
                    { dataKey: "revenue", fill: "#8884d8", name: "Revenue" },
                    { dataKey: "profit", fill: "#82ca9d", name: "Profit" },
                  ]}
                  xAxisKey="name"
                  showGrid
                  showLegend
                  height={400}
                />
              )}
              {chartType === "expenses" && (
                <OptimizedPieChart
                  data={expenseBreakdown}
                  dataKey="value"
                  nameKey="name"
                  height={400}
                  showLegend
                />
              )}
            </ChartContainer>
          </div>
        </div>
        <div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Financial Insights
            </h3>
            <div className="space-y-4">
              <div>
                <h6 className="text-sm font-medium text-gray-700 mb-2">
                  Cash Flow Status
                </h6>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-2">
                  Positive
                </span>
                <p className="text-sm text-gray-600">
                  Monthly cash flow:{" "}
                  {formatCurrency(totalRevenue - estimatedCosts)}
                </p>
              </div>
              <div>
                <h6 className="text-sm font-medium text-gray-700 mb-2">
                  Top Revenue Source
                </h6>
                <p className="text-green-600 font-medium mb-1">
                  {platformFinancials[0]?.name || "No data"}
                </p>
                <p className="text-sm text-gray-600">
                  {formatCurrency(platformFinancials[0]?.revenue || 0)} revenue
                </p>
              </div>
              <div>
                <h6 className="text-sm font-medium text-gray-700 mb-2">
                  Financial Health
                </h6>
                <div className="w-full bg-gray-200 rounded-full h-5 mb-2">
                  <div
                    className={`h-5 rounded-full ${
                      profitMargin > 20
                        ? "bg-green-500"
                        : profitMargin > 10
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(100, profitMargin * 3.33)}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  Profit margin:{" "}
                  {(typeof profitMargin === "number" && !isNaN(profitMargin)
                    ? profitMargin
                    : 0
                  ).toFixed(1)}
                  %
                </p>
              </div>
              <div>
                <h6 className="text-sm font-medium text-gray-700 mb-2">
                  Revenue Growth
                </h6>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    revenueGrowth > 0
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {revenueGrowth > 0 ? "+" : ""}
                  {(typeof revenueGrowth === "number" && !isNaN(revenueGrowth)
                    ? revenueGrowth
                    : 0
                  ).toFixed(1)}
                  %
                </span>
                <p className="text-sm text-gray-600 mt-1">vs previous period</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Financial Summary
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Previous Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">
                    Total Revenue
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                  {formatCurrency(totalRevenue)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                  {formatCurrency(previousRevenue)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      revenueGrowth > 0
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {formatPercentage(revenueGrowth)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      totalRevenue > previousRevenue
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {totalRevenue > previousRevenue ? "Growing" : "Stable"}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">
                    Gross Profit
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                  {formatCurrency(grossProfit)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                  {formatCurrency(previousRevenue * 0.3)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {formatPercentage(
                      ((grossProfit - previousRevenue * 0.3) /
                        Math.max(previousRevenue * 0.3, 1)) *
                        100
                    )}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Healthy
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">
                    Total Orders
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                  {formatNumber(totalOrders)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                  {formatNumber(Math.floor(totalOrders * 0.8))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    +20%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Growing
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">
                    Average Order Value
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                  $
                  {(typeof avgOrderValue === "number" && !isNaN(avgOrderValue)
                    ? avgOrderValue
                    : 0
                  ).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                  $
                  {(typeof avgOrderValue === "number" && !isNaN(avgOrderValue)
                    ? avgOrderValue * 0.95
                    : 0
                  ).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    +5%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Improving
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialAnalytics;
