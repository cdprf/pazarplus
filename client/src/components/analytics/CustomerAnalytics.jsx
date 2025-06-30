import React, { useState, useEffect } from "react";
import {
  OptimizedLineChart,
  OptimizedBarChart,
  OptimizedPieChart,
  ChartContainer,
} from "./OptimizedCharts";
import { UserGroupIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import analyticsService from "../../services/analyticsService";
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
} from "../../utils/analyticsFormatting";
import ExportButton from "./ExportButton";

const CustomerAnalytics = ({ timeframe = "30d" }) => {
  const [data, setData] = useState(null);
  const [cohortData, setCohortData] = useState(null);
  const [segmentationData, setSegmentationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState("overview");

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("🔍 Fetching customer analytics for timeframe:", timeframe);

        // Fetch all customer analytics data
        const [customerData, cohorts, segmentation] = await Promise.all([
          analyticsService.getCustomerAnalytics(timeframe),
          analyticsService
            .getCohortAnalysis(timeframe === "30d" ? "90d" : timeframe)
            .catch((err) => {
              console.warn("Cohort analysis failed:", err);
              return null;
            }),
          analyticsService.getCustomerSegmentation
            ? analyticsService
                .getCustomerSegmentation(timeframe)
                .catch((err) => {
                  console.warn("Customer segmentation failed:", err);
                  return null;
                })
            : Promise.resolve(null),
        ]);

        console.log("✅ Customer analytics data received:", {
          customerSuccess: customerData?.success,
          hasCustomerData: !!customerData?.data,
          hasCohortData: !!cohorts,
          hasSegmentationData: !!segmentation,
        });

        // Process customer data
        if (customerData && (customerData.success || customerData.data)) {
          const processedData = customerData.data || customerData;
          const normalizedData = {
            ...processedData,
            summary: processedData.summary || processedData.orderSummary || {},
            customers: processedData.customers || {
              total: 0,
              new: 0,
              returning: 0,
              retention: 0,
            },
          };
          setData(normalizedData);
        } else {
          console.warn("⚠️ No customer data received, setting empty data");
          setData({
            summary: {},
            customers: {
              total: 0,
              new: 0,
              returning: 0,
              retention: 0,
            },
          });
        }

        // Set cohort and segmentation data with fallbacks
        setCohortData(cohorts || { cohorts: [], retention: [] });
        setSegmentationData(segmentation || { segments: [], demographics: [] });
      } catch (err) {
        console.error("Customer analytics error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [timeframe]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">
          Loading customer analytics...
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
              Error Loading Customer Analytics
            </h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state handling
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Customer Data Available
            </h3>
            <p className="text-gray-600 mb-4 max-w-md">
              We couldn't find any customer analytics data for the selected
              period. This might be because:
            </p>
            <ul className="text-left text-gray-600 mb-6 space-y-1">
              <li>• No customer orders exist for this timeframe</li>
              <li>• Customer data is still being processed</li>
              <li>• The selected period is too recent</li>
            </ul>
            <div className="flex gap-3 justify-center">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                onClick={() => window.location.reload()}
                aria-label="Refresh customer data"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Refresh Data
              </button>
              <a
                href="/analytics"
                className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-200 transition-colors"
                aria-label="Go to main analytics dashboard"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-blue-100">
                <UserGroupIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">
                  Total Customers
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(data?.totalCustomers || 0)}
              </p>
              {data?.customerGrowth !== 0 && (
                <p
                  className={`ml-2 text-sm font-medium ${
                    data?.customerGrowth > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {data?.customerGrowth > 0 ? "+" : ""}
                  {formatPercentage(data?.customerGrowth)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-green-100">
                <UserGroupIcon className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">
                  New Customers
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(data?.newCustomers || 0)}
              </p>
              {data?.newCustomerGrowth !== 0 && (
                <p
                  className={`ml-2 text-sm font-medium ${
                    data?.newCustomerGrowth > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {data?.newCustomerGrowth > 0 ? "+" : ""}
                  {formatPercentage(data?.newCustomerGrowth)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-purple-100">
                <UserGroupIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">
                  Customer LTV
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(data?.averageLifetimeValue || 0)}
              </p>
              {data?.ltvGrowth !== 0 && (
                <p
                  className={`ml-2 text-sm font-medium ${
                    data?.ltvGrowth > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {data?.ltvGrowth > 0 ? "+" : ""}
                  {formatPercentage(data?.ltvGrowth)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-orange-100">
                <UserGroupIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">
                  Retention Rate
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {formatPercentage(data?.retentionRate || 0)}
              </p>
              {data?.retentionChange !== 0 && (
                <p
                  className={`ml-2 text-sm font-medium ${
                    data?.retentionChange > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {data?.retentionChange > 0 ? "+" : ""}
                  {formatPercentage(data?.retentionChange)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Customer Acquisition Trend
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              New vs returning customers over time
            </p>
          </div>
          <div className="p-6">
            <div className="h-80">
              <ChartContainer isLoading={loading} error={error}>
                <OptimizedLineChart
                  data={data?.acquisitionTrend || []}
                  height={300}
                  lines={[
                    {
                      dataKey: "newCustomers",
                      color: "#8884d8",
                      name: "New Customers",
                    },
                    {
                      dataKey: "returningCustomers",
                      color: "#82ca9d",
                      name: "Returning Customers",
                    },
                  ]}
                />
              </ChartContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Customer Segments
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Distribution by customer type
            </p>
          </div>
          <div className="p-6">
            <div className="h-80">
              <ChartContainer isLoading={loading} error={error}>
                <OptimizedPieChart
                  data={segmentationData?.segments || []}
                  height={300}
                  colors={COLORS}
                />
              </ChartContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCohorts = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Customer Retention Cohort Analysis
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Customer retention by cohort over time
        </p>
      </div>
      <div className="p-6">
        {cohortData?.cohorts?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cohort
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month 0
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month 1
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month 2
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month 3
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month 6
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month 12
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cohortData.cohorts.map((cohort, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {cohort.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cohort.totalCustomers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        100%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cohort.month1 > 30
                            ? "bg-green-100 text-green-800"
                            : cohort.month1 > 15
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {cohort.month1}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cohort.month2 > 25
                            ? "bg-green-100 text-green-800"
                            : cohort.month2 > 10
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {cohort.month2}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cohort.month3 > 20
                            ? "bg-green-100 text-green-800"
                            : cohort.month3 > 8
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {cohort.month3}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cohort.month6 > 15
                            ? "bg-green-100 text-green-800"
                            : cohort.month6 > 5
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {cohort.month6}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cohort.month12 > 10
                            ? "bg-green-100 text-green-800"
                            : cohort.month12 > 3
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {cohort.month12}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="text-blue-800">
                <p className="text-sm">
                  No cohort data available for this time period.
                </p>
              </div>
            </div>
          </div>
        )}

        {cohortData?.insights && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Key Insights:
            </h4>
            <ul className="space-y-1">
              {cohortData.insights.map((insight, index) => (
                <li key={index} className="text-sm text-gray-600">
                  • {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  const renderSegmentation = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            RFM Customer Segments
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Customer distribution by segment
          </p>
        </div>
        <div className="p-6">
          <div className="h-96">
            <ChartContainer isLoading={loading} error={error}>
              <OptimizedBarChart
                data={segmentationData?.segments || []}
                height={350}
                bars={[
                  { dataKey: "count", color: "#8884d8", name: "Customers" },
                  { dataKey: "revenue", color: "#82ca9d", name: "Revenue" },
                ]}
                formatter={formatCurrency}
              />
            </ChartContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Segment Descriptions
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Understanding each customer segment
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
              <div>
                <div className="font-medium text-green-700">Champions</div>
                <div className="text-sm text-gray-600">
                  High value, frequent buyers
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5"></div>
              <div>
                <div className="font-medium text-blue-700">Loyal Customers</div>
                <div className="text-sm text-gray-600">
                  Regular, consistent buyers
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1.5"></div>
              <div>
                <div className="font-medium text-yellow-700">
                  Potential Loyalists
                </div>
                <div className="text-sm text-gray-600">
                  Recent customers with potential
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full mt-1.5"></div>
              <div>
                <div className="font-medium text-purple-700">New Customers</div>
                <div className="text-sm text-gray-600">
                  Recent first-time buyers
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full mt-1.5"></div>
              <div>
                <div className="font-medium text-orange-700">At Risk</div>
                <div className="text-sm text-gray-600">
                  Were frequent buyers, now declining
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5"></div>
              <div>
                <div className="font-medium text-red-700">Can't Lose Them</div>
                <div className="text-sm text-gray-600">
                  High value customers in decline
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header Section */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Customer Analytics
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Customer behavior and retention insights
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeView === "overview"
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                onClick={() => setActiveView("overview")}
              >
                Overview
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeView === "cohorts"
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                onClick={() => setActiveView("cohorts")}
              >
                Cohorts
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeView === "segmentation"
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                onClick={() => setActiveView("segmentation")}
              >
                Segmentation
              </button>
            </div>
            <ExportButton
              onExport={() =>
                analyticsService.exportAnalytics("customers", timeframe)
              }
              filename={`customer-analytics-${timeframe}`}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-6">
        {activeView === "overview" && renderOverview()}
        {activeView === "cohorts" && renderCohorts()}
        {activeView === "segmentation" && renderSegmentation()}
      </div>
    </div>
  );
};

export default CustomerAnalytics;
