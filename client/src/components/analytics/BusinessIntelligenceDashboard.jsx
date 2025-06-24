import React, { useState, useEffect, useCallback } from "react";
import analyticsService from "../../services/analyticsService";
import {
  formatCurrency,
  formatPercentage,
  processAnalyticsData,
  processInsightsData,
} from "../../utils/analyticsFormatting";
import {
  Card,
  Row,
  Col,
  Badge,
  Button,
  Dropdown,
  Alert,
  Spinner,
  ProgressBar,
  ListGroup,
  Modal,
} from "react-bootstrap";
import {
  ChartBarIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Color schemes for charts
  const colors = {
    primary: "#0066cc",
    success: "#28a745",
    warning: "#ffc107",
    danger: "#dc3545",
    info: "#17a2b8",
    secondary: "#6c757d",
  };

  const chartColors = [
    "#0066cc",
    "#28a745",
    "#ffc107",
    "#dc3545",
    "#17a2b8",
    "#6c757d",
  ];

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

    if (autoRefresh) {
      const interval = setInterval(fetchAnalytics, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [fetchAnalytics, autoRefresh]);

  // Helper functions
  const getTrendIcon = (value) => {
    if (value > 0)
      return <ArrowTrendingUpIcon className="h-4 w-4 text-success" />;
    if (value < 0)
      return <ArrowTrendingDownIcon className="h-4 w-4 text-danger" />;
    return <span className="h-4 w-4 text-muted">-</span>;
  };

  const getPriorityVariant = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
      case "critical":
        return "danger";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "secondary";
    }
  };

  const handleExport = (format) => {
    // Placeholder export functionality
    console.log(`Exporting analytics data in ${format} format`);
    // In a real implementation, this would export the analytics data
  };

  // Export analytics data
  const handleExportData = async (format) => {
    try {
      const data = await analyticsService.exportAnalytics(
        "dashboard",
        timeframe,
        format
      );

      const blob = new Blob([data], {
        type:
          format === "csv"
            ? "text/csv"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-dashboard-${timeframe}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (error) {
      console.error("Export failed:", error);
      setError("Failed to export data");
    }
  };

  if (loading && !analytics) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "400px" }}
      >
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <div className="mt-2">Loading Business Intelligence...</div>
        </div>
      </div>
    );
  }

  // Empty state handling
  if (!loading && !error && (!analytics || !businessIntelligence)) {
    return (
      <div className="business-intelligence-dashboard">
        <div className="text-center py-5">
          <div className="mb-4">
            <ChartBarIcon className="h-16 w-16 text-muted mx-auto mb-3" />
            <h3 className="text-muted">No Analytics Data Available</h3>
            <p className="text-muted mb-4">
              We couldn't find any analytics data for the selected time period.
              This might be because:
            </p>
            <ul className="list-unstyled text-muted mb-4">
              <li>• No orders or sales data exists for this period</li>
              <li>• The selected timeframe is too recent</li>
              <li>• Data is still being processed</li>
            </ul>
          </div>
          <div className="d-flex gap-2 justify-content-center">
            <Button
              variant="primary"
              onClick={fetchAnalytics}
              aria-label="Refresh analytics data"
            >
              <ArrowPathIcon className="h-4 w-4 me-2" />
              Refresh Data
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => setTimeframe("90d")}
              aria-label="Try a longer time period"
            >
              Try Longer Period
            </Button>
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
      <div className="business-intelligence-dashboard">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h2 className="mb-1">Business Intelligence</h2>
                <small className="text-muted">
                  AI-powered insights and recommendations
                </small>
              </div>
            </div>
          </Col>
        </Row>

        <div className="text-center py-5">
          <div className="mb-4">
            <ExclamationTriangleIcon className="h-16 w-16 text-warning mx-auto mb-3" />
            <h3 className="text-muted">No Insights Generated</h3>
            <p className="text-muted mb-4">
              We have analytics data but couldn't generate business insights.
              This could be due to insufficient data patterns or recent changes.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={fetchAnalytics}
            aria-label="Generate new insights"
          >
            <ArrowPathIcon className="h-4 w-4 me-2" />
            Generate Insights
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="m-4">
        <ExclamationTriangleIcon className="h-5 w-5 me-2" />
        <div>
          <strong>Unable to load analytics data</strong>
          <p className="mb-2">{error}</p>
          {error.includes("Access denied") || error.includes("401") ? (
            <p className="mb-2">
              <small className="text-muted">
                Please ensure you are logged in to view analytics data.
              </small>
            </p>
          ) : error.includes("timeout") ? (
            <p className="mb-2">
              <small className="text-muted">
                The analytics service is taking too long to respond. Please try
                again.
              </small>
            </p>
          ) : (
            <p className="mb-2">
              <small className="text-muted">
                There was an issue connecting to the analytics service.
              </small>
            </p>
          )}
          <Button variant="outline-danger" size="sm" onClick={fetchAnalytics}>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <main
      className="business-intelligence-dashboard"
      role="main"
      aria-label="Business Intelligence Dashboard"
    >
      {/* Header Controls */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Business Intelligence</h2>
              <small className="text-muted">
                AI-powered insights and recommendations
                {lastUpdated && (
                  <span className="ms-2">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </small>
            </div>
            <div className="d-flex gap-2">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" size="sm">
                  {timeframe}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => setTimeframe("7d")}>
                    Last 7 days
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setTimeframe("30d")}>
                    Last 30 days
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setTimeframe("90d")}>
                    Last 90 days
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setTimeframe("1y")}>
                    Last year
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              <Button
                variant="outline-primary"
                size="sm"
                onClick={fetchAnalytics}
                disabled={loading}
              >
                <ArrowPathIcon className="h-4 w-4" />
              </Button>

              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setShowExportModal(true)}
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Key Performance Indicators */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="display-6 text-primary fw-bold">
                {formatCurrency(
                  analytics?.summary?.totalRevenue ||
                    analytics?.orderSummary?.totalRevenue ||
                    analytics?.revenue?.total ||
                    0
                )}
              </div>
              <div className="text-muted">Total Revenue</div>
              {(analytics?.revenue?.growth || analytics?.summary?.growth) && (
                <div className="d-flex align-items-center justify-content-center mt-2">
                  {getTrendIcon(
                    analytics.revenue.growth.rate ||
                      analytics.revenue.growth.current ||
                      0
                  )}
                  <span
                    className={`ms-1 ${
                      (analytics.revenue?.growth?.rate ||
                        analytics.revenue.growth.current ||
                        0) > 0
                        ? "text-success"
                        : "text-danger"
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
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="display-6 text-info fw-bold">
                {analytics?.orderSummary?.totalOrders || 0}
              </div>
              <div className="text-muted">Total Orders</div>
              <div className="text-success mt-2">
                <small>
                  Avg:{" "}
                  {formatCurrency(
                    analytics?.orderSummary?.avgOrderValue ||
                      analytics?.orderSummary?.averageOrderValue ||
                      analytics?.summary?.averageOrderValue ||
                      0
                  )}
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="display-6 text-success fw-bold">
                {analytics?.platforms?.length || 0}
              </div>
              <div className="text-muted">Active Platforms</div>
              <div className="text-info mt-2">
                <small>
                  {analytics?.platforms?.length > 0
                    ? "Integrated & Syncing"
                    : "No platforms connected"}
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="display-6 text-warning fw-bold">
                {businessIntelligence?.recommendations?.length || 0}
              </div>
              <div className="text-muted">AI Recommendations</div>
              <div className="text-danger mt-2">
                <small>Action Required</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* AI Recommendations */}
      {businessIntelligence?.recommendations?.length > 0 && (
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Header
                className="bg-gradient"
                style={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
              >
                <div className="d-flex align-items-center text-white">
                  <BellIcon className="h-5 w-5 me-2" />
                  <h5 className="mb-0">AI-Powered Recommendations</h5>
                </div>
              </Card.Header>
              <Card.Body>
                <Row>
                  {businessIntelligence.recommendations.map((rec, index) => {
                    return (
                      <Col md={6} lg={4} key={index} className="mb-3">
                        <Card
                          className="h-100 border-start border-4"
                          style={{
                            borderLeftColor:
                              colors[
                                getPriorityVariant(rec.priority || "medium")
                              ],
                          }}
                        >
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <Badge
                                bg={getPriorityVariant(
                                  rec.priority || "medium"
                                )}
                                className="text-uppercase"
                              >
                                {rec.priority || "medium"} Priority
                              </Badge>
                              <small className="text-muted">
                                {rec.category || "General"}
                              </small>
                            </div>
                            <h6 className="card-title">
                              {rec.title || "Recommendation"}
                            </h6>
                            <p className="card-text small text-muted">
                              {rec.description || "No details available"}
                            </p>
                            <div className="d-flex justify-content-between align-items-center">
                              <small className="text-success fw-bold">
                                {rec.estimatedImpact || "High Impact"}
                              </small>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => setSelectedRecommendation(rec)}
                              >
                                View Details
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Revenue Analytics & Sales Forecast */}
      <Row className="mb-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header>
              <h5 className="mb-0">Revenue Trends & Forecast</h5>
            </Card.Header>
            <Card.Body>
              {analytics?.revenue?.trends?.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={analytics.revenue.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), "Revenue"]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={colors.primary}
                      fill={colors.primary}
                      fillOpacity={0.3}
                      name="Daily Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted">
                    No revenue trend data available for this period.
                  </p>
                  <small className="text-muted">
                    Revenue trend data will appear here once orders are
                    processed.
                  </small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header>
              <h5 className="mb-0">Platform Performance</h5>
            </Card.Header>
            <Card.Body>
              {analytics?.platforms && (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={analytics.platforms}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="totalRevenue"
                      nameKey="platform"
                      label={({ platform, percent }) =>
                        `${platform} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {analytics.platforms.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={chartColors[index % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), "Revenue"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Top Products & Market Intelligence */}
      <Row className="mb-4">
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header>
              <h5 className="mb-0">Top Performing Products</h5>
            </Card.Header>
            <Card.Body>
              {analytics?.topProducts?.length > 0 ? (
                <ListGroup variant="flush">
                  {analytics.topProducts.slice(0, 5).map((product, index) => (
                    <ListGroup.Item
                      key={product.id || index}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <h6 className="mb-1">
                          {product.name || "Unknown Product"}
                        </h6>
                        <small className="text-muted">
                          SKU: {product.sku || "N/A"} |{" "}
                          {product.category || "Uncategorized"}
                        </small>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold text-success">
                          {formatCurrency(product.totalRevenue)}
                        </div>
                        <small className="text-muted">
                          {product.totalSold || 0} sold
                        </small>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted">
                    No top products data available for this period.
                  </p>
                  <small className="text-muted">
                    Product performance data will appear here once orders are
                    processed.
                  </small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header>
              <h5 className="mb-0">Financial KPIs</h5>
            </Card.Header>
            <Card.Body>
              {analytics?.financialKPIs ||
              businessIntelligence?.financialKPIs ? (
                <Row>
                  <Col sm={6} className="mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <div className="h4 text-success">
                        {formatPercentage(
                          analytics?.financialKPIs?.growthRates?.revenue ||
                            businessIntelligence?.financialKPIs?.growthRates
                              ?.revenue ||
                            analytics?.revenue?.growth ||
                            0
                        )}
                      </div>
                      <div className="text-muted">Revenue Growth</div>
                    </div>
                  </Col>
                  <Col sm={6} className="mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <div className="h4 text-primary">
                        {formatCurrency(
                          analytics?.financialKPIs?.avgOrderValue ||
                            businessIntelligence?.financialKPIs
                              ?.avgOrderValue ||
                            analytics?.orderSummary?.averageOrderValue ||
                            0
                        )}
                      </div>
                      <div className="text-muted">Avg Order Value</div>
                    </div>
                  </Col>
                  <Col sm={6} className="mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <div className="h4 text-info">
                        {formatCurrency(
                          analytics?.financialKPIs?.customerLifetimeValue ||
                            businessIntelligence?.financialKPIs
                              ?.customerLifetimeValue ||
                            0
                        )}
                      </div>
                      <div className="text-muted">Customer LTV</div>
                    </div>
                  </Col>
                  <Col sm={6} className="mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <div className="h4 text-warning">
                        {formatPercentage(
                          analytics?.financialKPIs?.profitMargins?.gross ||
                            businessIntelligence?.financialKPIs?.profitMargins
                              ?.gross ||
                            analytics?.financialKPIs?.keyMetrics?.grossMargin ||
                            0
                        )}
                      </div>
                      <div className="text-muted">Gross Margin</div>
                    </div>
                  </Col>
                </Row>
              ) : (
                <div className="text-center text-muted py-4">
                  <p>No financial data available for the selected timeframe.</p>
                  <small>
                    Financial KPIs will appear here once order data is
                    available.
                  </small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Order Status & Trends Analytics */}
      <Row className="mb-4">
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header>
              <h5 className="mb-0">Order Status Breakdown</h5>
            </Card.Header>
            <Card.Body>
              {analytics?.orderSummary?.ordersByStatus?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.orderSummary.ordersByStatus.map(
                        (status) => ({
                          name: status.status || "Unknown",
                          value: status.count || 0,
                          amount: status.totalAmount || 0,
                        })
                      )}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {analytics.orderSummary.ordersByStatus.map(
                        (entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={chartColors[index % chartColors.length]}
                          />
                        )
                      )}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} orders`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted">No order status data available.</p>
                  <small className="text-muted">
                    {error
                      ? "Unable to load order status data. Please check your connection and try again."
                      : "Order status breakdown will appear here once orders are processed."}
                  </small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header>
              <h5 className="mb-0">Orders & Revenue Trends</h5>
            </Card.Header>
            <Card.Body>
              {analytics?.orders?.trends?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={analytics.orders.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="orders"
                      fill={colors.info}
                      name="Orders"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke={colors.success}
                      strokeWidth={2}
                      name="Revenue"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted">No order trends data available.</p>
                  <small className="text-muted">
                    {error
                      ? "Unable to load order trends data. Please check your connection and try again."
                      : "Order and revenue trends will appear here once orders are processed."}
                  </small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recommendation Details Modal */}
      <Modal
        show={!!selectedRecommendation}
        onHide={() => setSelectedRecommendation(null)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>{selectedRecommendation?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRecommendation && (
            <>
              <div className="mb-3">
                <Badge
                  bg={getPriorityVariant(selectedRecommendation.priority)}
                  className="me-2"
                >
                  {selectedRecommendation.priority} Priority
                </Badge>
                <Badge bg="secondary">{selectedRecommendation.category}</Badge>
              </div>

              <p>{selectedRecommendation.description}</p>

              <h6>Recommended Actions:</h6>
              <ul>
                {selectedRecommendation.actions?.map((action, index) => (
                  <li key={index}>{action}</li>
                ))}
              </ul>

              <Row className="mt-3">
                <Col sm={6}>
                  <strong>Estimated Impact:</strong>
                  <div className="text-success">
                    {selectedRecommendation.estimatedImpact}
                  </div>
                </Col>
                <Col sm={6}>
                  <strong>Timeframe:</strong>
                  <div className="text-info">
                    {selectedRecommendation.timeframe}
                  </div>
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setSelectedRecommendation(null)}
          >
            Close
          </Button>
          <Button variant="primary">Mark as Implemented</Button>
        </Modal.Footer>
      </Modal>

      {/* Export Modal */}
      <Modal show={showExportModal} onHide={() => setShowExportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Export Analytics Data</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Choose the format for exporting your analytics data:</p>
          <div className="d-grid gap-2">
            <Button
              variant="outline-primary"
              onClick={() => handleExport("json")}
            >
              Export as JSON
            </Button>
            <Button
              variant="outline-success"
              onClick={() => handleExport("csv")}
            >
              Export as CSV
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </main>
  );
};

export default BusinessIntelligenceDashboard;
