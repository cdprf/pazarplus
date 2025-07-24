import logger from "../../utils/logger";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNetworkAwareInterval } from "../../hooks/useNetworkStatus";
import {
  Container,
  Row,
  Col,
  Card,
  Alert,
  Spinner,
  Button,
  ButtonGroup,
  Badge,
  Nav,
  Tab,
  Tabs,
  Modal,
  Form,
  Table,
  ProgressBar,
} from "react-bootstrap";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  ScatterChart,
  Scatter,
} from "recharts";
import {
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  CogIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  UserGroupIcon,
  BanknotesIcon,
  ClockIcon,
  LockClosedIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";

import analyticsService from "../../services/analyticsService";
import KPICard from "./KPICard";
import ExportButton from "./ExportButton";
import DateRangePicker from "./DateRangePicker";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

const AdvancedAnalyticsDashboard = ({
  timeframe: initialTimeframe = "30d",
}) => {
  // State management
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Analytics data state
  const [dashboardData, setDashboardData] = useState(null);
  const [advancedData, setAdvancedData] = useState(null);
  const [productData, setProductData] = useState(null);
  const [realTimeData, setRealTimeData] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [trends, setTrends] = useState(null);
  const [competitiveData, setCompetitiveData] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [attributionData, setAttributionData] = useState(null);

  // UI state
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Debug state
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [endpointStatus, setEndpointStatus] = useState({});

  // Authentication context
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Color scheme for charts
  const COLORS = {
    primary: "#0066cc",
    success: "#28a745",
    warning: "#ffc107",
    danger: "#dc3545",
    info: "#17a2b8",
    secondary: "#6c757d",
    purple: "#6f42c1",
    pink: "#e83e8c",
    orange: "#fd7e14",
    teal: "#20c997",
  };

  const CHART_COLORS = Object.values(COLORS);

  // Enhanced fetch with debug info
  const fetchAllAnalyticsWithDebug = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError(null);

        logger.info(
          "🔍 AdvancedAnalyticsDashboard: Starting to fetch all analytics data..."
        );

        // Track endpoint status for debugging
        const status = {};

        // Fetch data in parallel for better performance
        const [
          dashboard,
          advanced,
          products,
          realtime,
          anomaliesData,
          trendsData,
          competitive,
          funnel,
          attribution,
        ] = await Promise.allSettled([
          analyticsService.getDashboardAnalytics(timeframe),
          analyticsService.getAdvancedAnalytics(timeframe),
          analyticsService.getEnhancedProductAnalytics(timeframe),
          analyticsService.getRealTimeAnalytics(timeframe),
          analyticsService.getAnomalyDetection(timeframe),
          analyticsService.getTrends(timeframe),
          analyticsService.getCompetitiveAnalysis(timeframe),
          analyticsService.getFunnelAnalysis(timeframe),
          analyticsService.getAttributionAnalysis(timeframe),
        ]);

        // Process results and track status
        const endpoints = [
          { name: "Dashboard", result: dashboard, setter: setDashboardData },
          { name: "Advanced", result: advanced, setter: setAdvancedData },
          { name: "Products", result: products, setter: setProductData },
          { name: "Real-time", result: realtime, setter: setRealTimeData },
          { name: "Anomalies", result: anomaliesData, setter: setAnomalies },
          { name: "Trends", result: trendsData, setter: setTrends },
          {
            name: "Competitive",
            result: competitive,
            setter: setCompetitiveData,
          },
          { name: "Funnel", result: funnel, setter: setFunnelData },
          {
            name: "Attribution",
            result: attribution,
            setter: setAttributionData,
          },
        ];

        let successCount = 0;
        let totalDataPoints = 0;
        let authErrors = 0;

        endpoints.forEach(({ name, result, setter }) => {
          if (result.status === "fulfilled") {
            status[name] = { success: true, data: !!result.value, error: null };
            setter(result.value);
            successCount++;

            // Count data points
            if (result.value?.data) {
              const data = result.value.data;
              if (data.orders)
                totalDataPoints += Array.isArray(data.orders)
                  ? data.orders.length
                  : 0;
              if (data.summary?.totalOrders)
                totalDataPoints += data.summary.totalOrders;
            }

            logger.info(`✅ ${name} analytics loaded successfully`);
          } else {
            const isAuthError =
              result.reason?.response?.status === 401 ||
              result.reason?.message?.includes("Access denied") ||
              result.reason?.message?.includes("No token provided");

            if (isAuthError) {
              authErrors++;
            }

            status[name] = {
              success: false,
              data: false,
              error: result.reason?.message || "Unknown error",
              authError: isAuthError,
            };
            logger.error(`❌ ${name} analytics failed:`, result.reason);
          }
        });

        setEndpointStatus(status);
        setLastUpdated(new Date());

        logger.info(
          `📊 Analytics Summary: ${successCount}/${endpoints.length} endpoints successful, ${totalDataPoints} total data points, ${authErrors} auth errors`
        );

        // Set appropriate error messages based on the type of failures
        if (successCount === 0) {
          if (authErrors > 0) {
            setError("authentication_required");
          } else {
            setError(
              "All analytics endpoints failed to load. Please check your connection and try again."
            );
          }
        } else if (successCount < endpoints.length) {
          if (authErrors > 0) {
            setError("partial_auth_failure");
          } else {
            logger.warn(
              `⚠️ Partial loading: ${
                endpoints.length - successCount
              } endpoints failed`
            );
          }
        }
      } catch (error) {
        logger.error("🚨 Critical error in analytics loading:", error);
        setError(error.message || "Failed to load analytics data");
        setEndpointStatus({});
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [timeframe]
  );

  // Fetch all analytics data
  const fetchAllAnalytics = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError(null);

        // Fetch data in parallel for better performance
        const [
          dashboard,
          advanced,
          products,
          realtime,
          anomaliesData,
          trendsData,
          competitive,
          funnel,
          attribution,
        ] = await Promise.allSettled([
          analyticsService.getDashboardAnalytics(timeframe),
          analyticsService.getAdvancedAnalytics(timeframe),
          analyticsService.getEnhancedProductAnalytics(timeframe),
          analyticsService.getRealTimeAnalytics(timeframe),
          analyticsService.getAnomalyDetection(timeframe),
          analyticsService.getTrends(timeframe),
          analyticsService.getCompetitiveAnalysis(timeframe),
          analyticsService.getFunnelAnalysis(timeframe),
          analyticsService.getAttributionAnalysis(timeframe),
        ]);

        // Process successful results
        if (dashboard.status === "fulfilled") setDashboardData(dashboard.value);
        if (advanced.status === "fulfilled") setAdvancedData(advanced.value);
        if (products.status === "fulfilled") setProductData(products.value);
        if (realtime.status === "fulfilled") setRealTimeData(realtime.value);
        if (anomaliesData.status === "fulfilled")
          setAnomalies(anomaliesData.value);
        if (trendsData.status === "fulfilled") setTrends(trendsData.value);
        if (competitive.status === "fulfilled")
          setCompetitiveData(competitive.value);
        if (funnel.status === "fulfilled") setFunnelData(funnel.value);
        if (attribution.status === "fulfilled")
          setAttributionData(attribution.value);

        setLastUpdated(new Date());

        // Check for any failures
        const failures = [
          dashboard,
          advanced,
          products,
          realtime,
          anomaliesData,
          trendsData,
          competitive,
          funnel,
          attribution,
        ].filter((result) => result.status === "rejected");

        if (failures.length > 0) {
          logger.warn(`${failures.length} analytics endpoints failed to load`);
          // Still show partial data rather than complete failure
        }
      } catch (error) {
        logger.error("Error fetching analytics data:", error);
        setError(error.message || "Failed to load analytics data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [timeframe]
  );

  // Auto-refresh functionality with network awareness
  useNetworkAwareInterval(() => {
    if (autoRefresh) {
      fetchAllAnalytics(false);
    }
  }, 30000);

  // Initial data fetch
  useEffect(() => {
    fetchAllAnalyticsWithDebug();
  }, [fetchAllAnalyticsWithDebug]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllAnalyticsWithDebug(false);
  }, [fetchAllAnalyticsWithDebug]);

  // Handle timeframe change
  const handleTimeframeChange = useCallback((newTimeframe) => {
    setTimeframe(newTimeframe);
  }, []);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!dashboardData && !advancedData) return null;

    return {
      totalRevenue: dashboardData?.summary?.totalRevenue || 0,
      totalOrders: dashboardData?.summary?.totalOrders || 0,
      activeProducts: productData?.overview?.activeProducts || 0,
      marketShare: competitiveData?.marketShare || 0,
      conversionRate: funnelData?.overallConversion || 0,
      anomaliesCount: anomalies?.anomalies?.length || 0,
      trendsDirection: trends?.overallTrend || "stable",
    };
  }, [
    dashboardData,
    advancedData,
    productData,
    competitiveData,
    funnelData,
    anomalies,
    trends,
  ]);

  // Loading state
  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center">
          <Spinner animation="border" size="lg" />
          <h4 className="mt-3">Loading Advanced Analytics...</h4>
          <p className="text-muted">
            Gathering data from 21 analytics endpoints
          </p>
        </div>
      </Container>
    );
  }

  // Error state with authentication handling
  if (error && !dashboardData) {
    // Check if this is an authentication error
    const isAuthError =
      error === "authentication_required" || error === "partial_auth_failure";

    if (isAuthError) {
      return (
        <Container fluid className="py-4">
          <div className="text-center py-5">
            <LockClosedIcon className="h-16 w-16 text-warning mx-auto mb-3" />
            <h3 className="text-warning">Authentication Required</h3>
            <p className="text-muted mb-4">
              {error === "authentication_required"
                ? "You need to be logged in to view analytics data. Please log in to access your dashboard."
                : "Some analytics endpoints require authentication. Please ensure you're logged in."}
            </p>
            <div className="mb-4">
              <Button
                variant="primary"
                onClick={() => navigate("/login")}
                className="me-2"
              >
                <UserPlusIcon className="h-4 w-4 me-2" />
                Log In
              </Button>
              <Button variant="outline-primary" onClick={handleRefresh}>
                <ArrowPathIcon className="h-4 w-4 me-2" />
                Retry
              </Button>
            </div>

            {user && (
              <Alert
                variant="info"
                className="mt-3 text-start"
                style={{ maxWidth: "600px", margin: "0 auto" }}
              >
                <InformationCircleIcon className="h-5 w-5 me-2" />
                <strong>
                  You appear to be logged in as {user.email || user.username}
                </strong>
                <p className="mb-2 mt-2">
                  If you're still seeing this error, try:
                </p>
                <ol className="mb-0">
                  <li>Refreshing the page</li>
                  <li>Logging out and logging back in</li>
                  <li>Checking your internet connection</li>
                  <li>Contacting support if the issue persists</li>
                </ol>
              </Alert>
            )}

            <Button
              variant="outline-secondary"
              className="mt-3"
              onClick={() => setShowDebugInfo(!showDebugInfo)}
            >
              <InformationCircleIcon className="h-4 w-4 me-2" />
              {showDebugInfo ? "Hide" : "Show"} Technical Details
            </Button>

            {showDebugInfo && (
              <div
                className="mt-4 p-3 bg-light rounded text-start"
                style={{ maxWidth: "800px", margin: "0 auto" }}
              >
                <h6>🔍 Endpoint Status Debug Information:</h6>
                <Table size="sm" className="mt-2">
                  <thead>
                    <tr>
                      <th>Endpoint</th>
                      <th>Status</th>
                      <th>Auth Error</th>
                      <th>Error Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(endpointStatus).map(([name, status]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td>
                          {status.success ? (
                            <Badge bg="success">Success</Badge>
                          ) : (
                            <Badge bg="danger">Failed</Badge>
                          )}
                        </td>
                        <td>
                          {status.authError ? (
                            <Badge bg="warning">Auth Required</Badge>
                          ) : (
                            <Badge bg="secondary">No</Badge>
                          )}
                        </td>
                        <td
                          className="text-break"
                          style={{ maxWidth: "200px" }}
                        >
                          {status.error || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                <Alert variant="info" className="mt-3 mb-0">
                  <strong>Current User:</strong>{" "}
                  {user
                    ? `${user.email || user.username} (ID: ${user.id})`
                    : "Not logged in"}
                  <br />
                  <strong>Token:</strong>{" "}
                  {localStorage.getItem("token") ? "Present" : "Missing"}
                  <br />
                  <strong>Last Updated:</strong>{" "}
                  {lastUpdated ? lastUpdated.toLocaleString() : "Never"}
                </Alert>
              </div>
            )}
          </div>
        </Container>
      );
    }

    // Regular error state for non-auth errors
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">
          <ExclamationTriangleIcon className="h-5 w-5 me-2" />
          <strong>Error loading analytics:</strong> {error}
          <div className="mt-3">
            <Button variant="outline-danger" onClick={handleRefresh}>
              <ArrowPathIcon className="h-4 w-4 me-2" />
              Retry
            </Button>
            <Button
              variant="outline-secondary"
              className="ms-2"
              onClick={() => setShowDebugInfo(!showDebugInfo)}
            >
              <InformationCircleIcon className="h-4 w-4 me-2" />
              {showDebugInfo ? "Hide" : "Show"} Debug Info
            </Button>
          </div>
          {showDebugInfo && (
            <div className="mt-4 p-3 bg-light rounded">
              <h6>🔍 Endpoint Status Debug Information:</h6>
              <Table size="sm" className="mt-2">
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th>Status</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(endpointStatus).map(([name, status]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>
                        {status.success ? (
                          <Badge bg="success">Success</Badge>
                        ) : (
                          <Badge bg="danger">Failed</Badge>
                        )}
                      </td>
                      <td className="text-break" style={{ maxWidth: "200px" }}>
                        {status.error || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Alert>
      </Container>
    );
  }

  // Empty state with debug info
  if (!dashboardData && !advancedData && !loading) {
    const hasAnyData =
      dashboardData ||
      advancedData ||
      productData ||
      realTimeData ||
      anomalies ||
      trends ||
      competitiveData ||
      funnelData ||
      attributionData;

    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <ChartBarIcon className="h-16 w-16 text-muted mx-auto mb-3" />
          <h3 className="text-muted">No Analytics Data Available</h3>
          <p className="text-muted mb-4">
            {hasAnyData
              ? "Some analytics data was loaded, but core dashboard data is missing."
              : "No data could be loaded from any analytics endpoints."}
          </p>
          <div className="mb-4">
            <Button variant="primary" onClick={handleRefresh} className="me-2">
              <ArrowPathIcon className="h-4 w-4 me-2" />
              Refresh Data
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => setShowDebugInfo(!showDebugInfo)}
            >
              <InformationCircleIcon className="h-4 w-4 me-2" />
              {showDebugInfo ? "Hide" : "Show"} Debug Info
            </Button>
          </div>

          {showDebugInfo && (
            <div
              className="text-start p-4 bg-light rounded mx-auto"
              style={{ maxWidth: "600px" }}
            >
              <h6>🔍 Analytics Status:</h6>
              <Row className="mt-3">
                {Object.entries(endpointStatus).map(([name, status]) => (
                  <Col md={6} key={name} className="mb-2">
                    <div className="d-flex align-items-center">
                      <Badge
                        variant={status.success ? "success" : "danger"}
                        className="me-2"
                      >
                        {status.success ? "✅" : "❌"}
                      </Badge>
                      <span className="small">{name}</span>
                    </div>
                    {status.error && (
                      <div className="small text-muted ms-4">
                        {status.error}
                      </div>
                    )}
                  </Col>
                ))}
              </Row>

              <Alert variant="info" className="mt-3 mb-0">
                <strong>🎯 Quick Fix:</strong>
                <ol className="mb-0 mt-2">
                  <li>Ensure you're logged in to the application</li>
                  <li>Check browser Network tab for 401 errors</li>
                  <li>Try refreshing the page</li>
                  <li>Contact support if issues persist</li>
                </ol>
              </Alert>
            </div>
          )}
        </div>
      </Container>
    );
  }

  return (
    <main
      className="advanced-analytics-dashboard"
      role="main"
      aria-label="Advanced Analytics Dashboard"
    >
      <Container fluid className="py-4">
        {/* Header Section */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="mb-1">Advanced Analytics Dashboard</h1>
                <p className="text-muted mb-0">
                  Comprehensive insights from all 21 analytics endpoints
                  {lastUpdated && (
                    <span className="ms-2">
                      • Last updated: {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
              <div className="d-flex gap-2">
                <DateRangePicker
                  value={timeframe}
                  onChange={handleTimeframeChange}
                  aria-label="Select analytics timeframe"
                />
                <Button
                  variant={autoRefresh ? "success" : "outline-secondary"}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  aria-label={
                    autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"
                  }
                >
                  <ClockIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  aria-label="Refresh analytics data"
                >
                  <ArrowPathIcon
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                </Button>
                <ExportButton
                  data={{
                    dashboard: dashboardData,
                    advanced: advancedData,
                    products: productData,
                  }}
                  filename="advanced-analytics"
                  title="Export All"
                  aria-label="Export all analytics data"
                />
              </div>
            </div>
          </Col>
        </Row>

        {/* Summary KPIs */}
        {summaryMetrics && (
          <Row className="mb-4">
            <Col md={3}>
              <KPICard
                title="Total Revenue"
                value={`$${
                  summaryMetrics.totalRevenue?.toLocaleString() || "0"
                }`}
                change={dashboardData?.summary?.revenueGrowth}
                icon={BanknotesIcon}
                color="success"
                aria-label="Total revenue KPI"
              />
            </Col>
            <Col md={3}>
              <KPICard
                title="Total Orders"
                value={summaryMetrics.totalOrders?.toLocaleString() || "0"}
                change={dashboardData?.summary?.ordersGrowth}
                icon={UserGroupIcon}
                color="primary"
                aria-label="Total orders KPI"
              />
            </Col>
            <Col md={3}>
              <KPICard
                title="Active Products"
                value={summaryMetrics.activeProducts?.toLocaleString() || "0"}
                change={productData?.overview?.productsGrowth}
                icon={CubeIcon}
                color="info"
                aria-label="Active products KPI"
              />
            </Col>
            <Col md={3}>
              <KPICard
                title="Anomalies Detected"
                value={summaryMetrics.anomaliesCount}
                icon={ExclamationTriangleIcon}
                color={
                  summaryMetrics.anomaliesCount > 0 ? "warning" : "success"
                }
                onClick={() =>
                  summaryMetrics.anomaliesCount > 0 && setShowAnomalyModal(true)
                }
                aria-label={`${summaryMetrics.anomaliesCount} anomalies detected`}
              />
            </Col>
          </Row>
        )}

        {/* Partial data warning */}
        {error && (dashboardData || advancedData) && (
          <Row className="mb-3">
            <Col>
              <Alert variant="warning" dismissible>
                <InformationCircleIcon className="h-4 w-4 me-2" />
                Some analytics data couldn't be loaded. Showing available data
                only.
              </Alert>
            </Col>
          </Row>
        )}

        {/* Main Content Tabs */}
        <Tabs
          activeKey={activeTab}
          onSelect={setActiveTab}
          className="mb-4"
          variant="tabs"
        >
          <Tab
            eventKey="overview"
            title={
              <span>
                <ChartBarIcon className="h-4 w-4 me-2" />
                Overview
              </span>
            }
          >
            {/* Overview content would go here */}
            <Row>
              <Col>
                <Card>
                  <Card.Header>
                    <h5>Analytics Overview</h5>
                  </Card.Header>
                  <Card.Body>
                    <p>
                      Comprehensive overview utilizing all 21 analytics
                      endpoints
                    </p>
                    {/* Add overview charts and data here */}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab
            eventKey="trends"
            title={
              <span>
                <TrendingUpIcon className="h-4 w-4 me-2" />
                Trends
              </span>
            }
          >
            {/* Trends analysis content */}
            <Row>
              <Col>
                <Card>
                  <Card.Header>
                    <h5>Trends Analysis</h5>
                  </Card.Header>
                  <Card.Body>
                    {trends ? (
                      <p>Trends data loaded successfully</p>
                    ) : (
                      <p className="text-muted">No trends data available</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab
            eventKey="competitive"
            title={
              <span>
                <BuildingStorefrontIcon className="h-4 w-4 me-2" />
                Competitive
              </span>
            }
          >
            {/* Competitive analysis content */}
            <Row>
              <Col>
                <Card>
                  <Card.Header>
                    <h5>Competitive Analysis</h5>
                  </Card.Header>
                  <Card.Body>
                    {competitiveData ? (
                      <p>Competitive analysis data loaded successfully</p>
                    ) : (
                      <p className="text-muted">
                        No competitive data available
                      </p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab
            eventKey="funnel"
            title={
              <span>
                <FunnelIcon className="h-4 w-4 me-2" />
                Funnel
              </span>
            }
          >
            {/* Funnel analysis content */}
            <Row>
              <Col>
                <Card>
                  <Card.Header>
                    <h5>Funnel Analysis</h5>
                  </Card.Header>
                  <Card.Body>
                    {funnelData ? (
                      <p>Funnel analysis data loaded successfully</p>
                    ) : (
                      <p className="text-muted">No funnel data available</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab
            eventKey="realtime"
            title={
              <span>
                <EyeIcon className="h-4 w-4 me-2" />
                Real-time
                {autoRefresh && (
                  <Badge bg="success" className="ms-2">
                    Live
                  </Badge>
                )}
              </span>
            }
          >
            {/* Real-time analytics content */}
            <Row>
              <Col>
                <Card>
                  <Card.Header>
                    <h5>Real-time Analytics</h5>
                  </Card.Header>
                  <Card.Body>
                    {realTimeData ? (
                      <p>Real-time data loaded successfully</p>
                    ) : (
                      <p className="text-muted">No real-time data available</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>
        </Tabs>

        {/* Anomaly Detection Modal */}
        <Modal
          show={showAnomalyModal}
          onHide={() => setShowAnomalyModal(false)}
          size="lg"
          centered
          aria-labelledby="anomaly-modal-title"
        >
          <Modal.Header closeButton>
            <Modal.Title id="anomaly-modal-title">
              <ExclamationTriangleIcon className="h-5 w-5 me-2" />
              Detected Anomalies
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {anomalies?.anomalies ? (
              <div>
                <p>
                  Found {anomalies.anomalies.length} anomalies in your data:
                </p>
                {/* Add anomaly details here */}
              </div>
            ) : (
              <p>No anomaly data available</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowAnomalyModal(false)}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </main>
  );
};

export default AdvancedAnalyticsDashboard;
