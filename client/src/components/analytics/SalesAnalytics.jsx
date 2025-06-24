import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  ButtonGroup,
  Button,
  Alert,
  Spinner,
} from "react-bootstrap";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";
import analyticsService from "../../services/analyticsService";
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  processAnalyticsData,
  safeNumeric,
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
  const [chartPeriod, setChartPeriod] = useState("daily");
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
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading sales analytics...</span>
        </Spinner>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="danger" className="m-4">
        <Alert.Heading>Unable to load sales analytics</Alert.Heading>
        <div>
          <p className="mb-2">{error}</p>
          {error.includes("Authentication required") ||
          error.includes("log in") ? (
            <p className="mb-2">
              <small className="text-muted">
                Please ensure you are logged in to view sales analytics data.
              </small>
            </p>
          ) : error.includes("timeout") ? (
            <p className="mb-2">
              <small className="text-muted">
                The sales analytics service is taking too long to respond.
                Please try again.
              </small>
            </p>
          ) : (
            <p className="mb-2">
              <small className="text-muted">
                There was an issue connecting to the sales analytics service.
              </small>
            </p>
          )}
          <Button
            variant="outline-danger"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </Alert>
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
    <div className="sales-analytics">
      {/* KPI Cards */}
      <Row className="mb-4">
        {salesKPIs.map((kpi, index) => (
          <Col lg={3} md={6} key={index}>
            <KPICard {...kpi} />
          </Col>
        ))}
      </Row>

      {/* Chart Controls */}
      <Row className="mb-3">
        <Col md={6}>
          <ButtonGroup>
            <Button
              variant={chartType === "line" ? "primary" : "outline-primary"}
              onClick={() => setChartType("line")}
            >
              Line Chart
            </Button>
            <Button
              variant={chartType === "area" ? "primary" : "outline-primary"}
              onClick={() => setChartType("area")}
            >
              Area Chart
            </Button>
            <Button
              variant={chartType === "bar" ? "primary" : "outline-primary"}
              onClick={() => setChartType("bar")}
            >
              Bar Chart
            </Button>
          </ButtonGroup>
        </Col>
        <Col md={6} className="text-end">
          <ExportButton
            data={data}
            filename={`sales-analytics-${timeframe}`}
            title="Export Sales Data"
          />
        </Col>
      </Row>

      {/* Revenue Trends Chart */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <Card.Title>Revenue Trends</Card.Title>
            </Card.Header>
            <Card.Body>
              <div style={{ height: "300px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "line" && (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [
                          formatCurrency(value),
                          "Revenue",
                        ]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke={colors[0]}
                        strokeWidth={2}
                        dot={{ fill: colors[0] }}
                      />
                    </LineChart>
                  )}
                  {chartType === "area" && (
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [
                          formatCurrency(value),
                          "Revenue",
                        ]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke={colors[0]}
                        fill={colors[0]}
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  )}
                  {chartType === "bar" && (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [
                          formatCurrency(value),
                          "Revenue",
                        ]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill={colors[0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Top Selling Products */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <Card.Title>Top Selling Products</Card.Title>
            </Card.Header>
            <Card.Body>
              <div style={{ height: "400px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip
                      formatter={(value, name, props) => {
                        if (name === "revenue") {
                          const data = topProductsData[props.payload?.index];
                          return [
                            formatCurrency(value),
                            `Revenue (${data?.unitsSold || 0} units sold)`,
                          ];
                        }
                        return [value, name];
                      }}
                      labelFormatter={(label) => `Product: ${label}`}
                    />
                    <Legend />
                    <Bar
                      dataKey="revenue"
                      fill={colors[0]}
                      radius={[0, 4, 4, 0]}
                      name="Revenue"
                    >
                      <LabelList
                        dataKey="revenue"
                        position="right"
                        formatter={(value, props) => {
                          try {
                            if (!value || value === 0) return "";

                            if (
                              !props ||
                              props.index === undefined ||
                              !topProductsData ||
                              !topProductsData[props.index]
                            ) {
                              return formatCurrency(Number(value));
                            }

                            const data = topProductsData[props.index];
                            const units = data.unitsSold || data.totalSold || 0;
                            return `${formatCurrency(
                              Number(value)
                            )} (${units} units)`;
                          } catch (error) {
                            console.warn("LabelList formatter error:", error);
                            return value ? formatCurrency(Number(value)) : "";
                          }
                        }}
                        style={{ fontSize: "10px", fill: "#666" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Product Statistics Table */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <Card.Title>Product Performance Details</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <table className="table table-striped">
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
                          <strong>{product.fullName}</strong>
                        </td>
                        <td>{formatCurrency(product.revenue)}</td>
                        <td>{formatNumber(product.unitsSold)}</td>
                        <td>{formatCurrency(product.avgPrice)}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div
                              className="progress me-2"
                              style={{ width: "60px", height: "6px" }}
                            >
                              <div
                                className="progress-bar bg-primary"
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
                            <small className="text-muted">
                              {Math.round(
                                (product.revenue /
                                  (topProductsData[0]?.revenue || 1)) *
                                  100
                              )}
                              %
                            </small>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SalesAnalytics;
