import React, { useState, useEffect, useCallback } from "react";
import analyticsService from "../../services/analyticsService";
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
  TrendingUpIcon,
  TrendingDownIcon,
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

      // Use the analytics service to get comprehensive data
      const analyticsData = await analyticsService.getDashboardAnalytics(
        timeframe
      );

      console.log("📊 Analytics data received:", {
        success: analyticsData?.success,
        hasData: !!analyticsData?.data,
        dataKeys: analyticsData?.data ? Object.keys(analyticsData.data) : [],
      });

      if (analyticsData && (analyticsData.success || analyticsData.data)) {
        const data = analyticsData.data || analyticsData;

        // Handle both API response formats
        const processedData = {
          orderSummary: data.summary ||
            data.orderSummary || {
              totalOrders: 0,
              totalRevenue: 0,
              validOrders: 0,
              averageOrderValue: 0,
              cancelledOrders: 0,
              returnedOrders: 0,
            },
          revenue: data.revenue || {
            trends: [],
            total: 0,
            growth: 0,
            previousPeriod: 0,
          },
          orders: {
            trends: data.orderTrends?.orders || data.orders?.trends || [],
          },
          platforms: data.platformComparison || { comparison: [] },
          topProducts: data.topProducts || [],
          performance: data.performanceMetrics || { metrics: {} },
        };

        setAnalytics(processedData);

        // Set business intelligence data
        setBusinessIntelligence({
          insights: data.insights || data.predictions?.insights || [],
          recommendations:
            data.recommendations || data.predictions?.recommendations || [],
          predictions: data.predictiveInsights || {},
        });
      } else {
        console.warn("⚠️ No analytics data received, using fallback data");
        // Fallback to basic structure if no data
        setAnalytics({
          orderSummary: {
            totalOrders: 0,
            totalRevenue: 0,
            validOrders: 0,
            averageOrderValue: 0,
            cancelledOrders: 0,
            returnedOrders: 0,
          },
          revenue: {
            trends: [],
            total: 0,
            growth: 0,
            previousPeriod: 0,
          },
          orders: { trends: [] },
          platforms: { comparison: [] },
          topProducts: [],
          performance: { metrics: {} },
        });
        setBusinessIntelligence({
          insights: [],
          recommendations: [],
          predictions: {},
        });
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("❌ Error fetching analytics:", err);
      setError(err.message || "Failed to load analytics data");

      // Set empty state on error
      setAnalytics({
        orderSummary: {
          totalOrders: 0,
          totalRevenue: 0,
          validOrders: 0,
          averageOrderValue: 0,
          cancelledOrders: 0,
          returnedOrders: 0,
        },
        revenue: {
          trends: [],
          total: 0,
          growth: 0,
          previousPeriod: 0,
        },
        orders: { trends: [] },
        platforms: { comparison: [] },
        topProducts: [],
        performance: { metrics: {} },
      });
      setBusinessIntelligence({
        insights: [],
        recommendations: [],
        predictions: {},
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

  // Export analytics data
  const handleExport = async (format) => {
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

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  // Get trend icon
  const getTrendIcon = (value) => {
    return value > 0 ? (
      <DocumentArrowUpIcon className="h-4 w-4 text-success" />
    ) : (
      <DocumentArrowDownIcon className="h-4 w-4 text-danger" />
    );
  };

  // Get priority badge variant
  const getPriorityVariant = (priority) => {
    switch (priority) {
      case "high":
        return "danger";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "secondary";
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

  if (error) {
    return (
      <Alert variant="danger">
        <ExclamationTriangleIcon className="h-5 w-5 me-2" />
        Error loading analytics: {error}
        <Button
          variant="outline-danger"
          size="sm"
          className="ms-2"
          onClick={fetchAnalytics}
        >
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div className="business-intelligence-dashboard">
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
                {analytics.platforms[1].completionRate ||
                  analytics?.platforms?.length ||
                  0}
              </div>
              <div className="text-muted">Active Platforms</div>
              <div className="text-info mt-2">
                <small>Integrated & Syncing</small>
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
                  {businessIntelligence.recommendations.map((rec, index) => (
                    <Col md={6} lg={4} key={index} className="mb-3">
                      <Card
                        className="h-100 border-start border-4"
                        style={{
                          borderLeftColor:
                            colors[getPriorityVariant(rec.priority)],
                        }}
                      >
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <Badge
                              bg={getPriorityVariant(rec.priority)}
                              className="text-uppercase"
                            >
                              {rec.priority} Priority
                            </Badge>
                            <small className="text-muted">{rec.category}</small>
                          </div>
                          <h6 className="card-title">{rec.title}</h6>
                          <p className="card-text small text-muted">
                            {rec.description}
                          </p>
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-success fw-bold">
                              {rec.estimatedImpact}
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
                  ))}
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
              {analytics?.revenue?.daily && (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={analytics.revenue.daily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis dataKey="revenue" />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), "Revenue"]}
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
              {analytics?.topProducts && (
                <ListGroup variant="flush">
                  {analytics.topProducts.slice(0, 5).map((product, index) => (
                    <ListGroup.Item
                      key={index}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <h6 className="mb-1">{product.name}</h6>
                        <small className="text-muted">
                          SKU: {product.sku} | {product.category}
                        </small>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold text-success">
                          {formatCurrency(product.totalRevenue)}
                        </div>
                        <small className="text-muted">
                          {product.totalSold} sold
                        </small>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
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
              {businessIntelligence?.financialKPIs && (
                <Row>
                  <Col sm={6} className="mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <div className="h4 text-success">
                        {formatPercentage(
                          businessIntelligence.financialKPIs.growthRates
                            ?.revenue || 0
                        )}
                      </div>
                      <div className="text-muted">Revenue Growth</div>
                    </div>
                  </Col>
                  <Col sm={6} className="mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <div className="h4 text-primary">
                        {formatCurrency(
                          businessIntelligence.financialKPIs.avgOrderValue || 0
                        )}
                      </div>
                      <div className="text-muted">Avg Order Value</div>
                    </div>
                  </Col>
                  <Col sm={6} className="mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <div className="h4 text-info">
                        {formatCurrency(
                          businessIntelligence.financialKPIs
                            .customerLifetimeValue || 0
                        )}
                      </div>
                      <div className="text-muted">Customer LTV</div>
                    </div>
                  </Col>
                  <Col sm={6} className="mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <div className="h4 text-warning">
                        {formatPercentage(
                          businessIntelligence.financialKPIs.profitMargins
                            ?.grossMargin || 0
                        )}
                      </div>
                      <div className="text-muted">Gross Margin</div>
                    </div>
                  </Col>
                </Row>
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
    </div>
  );
};

export default BusinessIntelligenceDashboard;
