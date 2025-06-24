import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  ButtonGroup,
  Button,
  Alert,
  Spinner,
  Table,
  Badge,
  ProgressBar,
} from "react-bootstrap";
import {
  BarChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import analyticsService from "../../services/analyticsService";
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  processAnalyticsData,
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
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading platform analytics...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Platform Analytics</Alert.Heading>
        <p>{error}</p>
        <Button
          variant="outline-danger"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </Alert>
    );
  }

  // Extract platform data from response
  const platformAnalytics = data || {};
  const platforms = platformAnalytics.platforms || [];
  const performance = platformAnalytics.performance || {};
  const summary = platformAnalytics.summary || {};

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
    <div>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-1">Platform Analytics</h4>
              <p className="text-muted">
                Performance comparison across different e-commerce platforms
              </p>
            </div>
            <ExportButton type="platforms" timeframe={timeframe} />
          </div>
        </Col>
      </Row>

      {/* KPI Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <KPICard
            title="Active Platforms"
            value={totalPlatforms.toString()}
            icon={GlobeAltIcon}
            color="primary"
          />
        </Col>
        <Col md={3}>
          <KPICard
            title="Total Revenue"
            value={formatCurrency(totalRevenue)}
            icon={ChartBarIcon}
            color="success"
          />
        </Col>
        <Col md={3}>
          <KPICard
            title="Total Orders"
            value={formatNumber(totalOrders)}
            icon={ShoppingBagIcon}
            color="info"
          />
        </Col>
        <Col md={3}>
          <KPICard
            title="Avg Order Value"
            value={formatCurrency(avgOrderValue)}
            icon={ArrowTrendingUpIcon}
            color="warning"
          />
        </Col>
      </Row>

      {/* Chart Controls */}
      <Row className="mb-3">
        <Col>
          <ButtonGroup>
            <Button
              variant={
                chartType === "comparison" ? "primary" : "outline-primary"
              }
              onClick={() => setChartType("comparison")}
            >
              Revenue Comparison
            </Button>
            <Button
              variant={chartType === "orders" ? "primary" : "outline-primary"}
              onClick={() => setChartType("orders")}
            >
              Order Volume
            </Button>
            <Button
              variant={
                chartType === "performance" ? "primary" : "outline-primary"
              }
              onClick={() => setChartType("performance")}
            >
              Performance Metrics
            </Button>
            <Button
              variant={
                chartType === "distribution" ? "primary" : "outline-primary"
              }
              onClick={() => setChartType("distribution")}
            >
              Revenue Distribution
            </Button>
          </ButtonGroup>
        </Col>
      </Row>

      {/* Charts */}
      <Row className="mb-4">
        <Col lg={8}>
          <Card>
            <Card.Header>
              <Card.Title>
                {chartType === "comparison" && "Platform Revenue Comparison"}
                {chartType === "orders" && "Order Volume by Platform"}
                {chartType === "performance" && "Platform Performance Metrics"}
                {chartType === "distribution" && "Revenue Distribution"}
              </Card.Title>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={400}>
                {chartType === "comparison" && (
                  <BarChart data={platformChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue ($)" />
                  </BarChart>
                )}
                {chartType === "orders" && (
                  <BarChart data={platformChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="orders" fill="#82ca9d" name="Orders" />
                  </BarChart>
                )}
                {chartType === "performance" && (
                  <ComposedChart data={platformChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="avgOrderValue"
                      fill="#8884d8"
                      name="Avg Order Value ($)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="conversionRate"
                      stroke="#ff7300"
                      name="Conversion Rate (%)"
                    />
                  </ComposedChart>
                )}
                {chartType === "distribution" && (
                  <PieChart>
                    <Pie
                      data={platformPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {platformPieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card>
            <Card.Header>
              <Card.Title>Platform Insights</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <h6>Best Performer</h6>
                <p className="text-success mb-1">
                  {bestPlatform.name || bestPlatform.platform || "No data"}
                </p>
                <small className="text-muted">
                  {formatCurrency(
                    bestPlatform.totalRevenue || bestPlatform.revenue || 0
                  )}{" "}
                  revenue
                </small>
              </div>
              <div className="mb-3">
                <h6>Platform Coverage</h6>
                <small className="text-muted">
                  {totalPlatforms} platforms active
                </small>
              </div>
              <div className="mb-3">
                <h6>Order Distribution</h6>
                {platforms.slice(0, 3).map((platform, index) => {
                  const orders = platform.totalOrders || platform.orders || 0;
                  const percentage =
                    totalOrders > 0 ? (orders / totalOrders) * 100 : 0;
                  return (
                    <div key={index} className="mb-2">
                      <div className="d-flex justify-content-between">
                        <span className="small">
                          {platform.name || platform.platform}
                        </span>
                        <span className="small">
                          {formatPercentage(percentage, 1)}
                        </span>
                      </div>
                      <ProgressBar now={percentage} style={{ height: "8px" }} />
                    </div>
                  );
                })}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Platform Table */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <Card.Title>Platform Performance Details</Card.Title>
            </Card.Header>
            <Card.Body>
              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Orders</th>
                    <th>Revenue</th>
                    <th>Avg Order Value</th>
                    <th>Conversion Rate</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {platforms.map((platform, index) => {
                    const orders = platform.totalOrders || platform.orders || 0;
                    const revenue =
                      platform.totalRevenue || platform.revenue || 0;
                    const avgOrderValue =
                      platform.avgOrderValue ||
                      (orders > 0 ? revenue / orders : 0);
                    const conversionRate =
                      platform.conversionRate || platform.completionRate || 0;
                    const performance = Math.min(
                      100,
                      (revenue / Math.max(totalRevenue, 1)) * 100
                    );

                    return (
                      <tr key={platform.name || platform.platform || index}>
                        <td>
                          <div>
                            <strong>
                              {platform.name || platform.platform || "Unknown"}
                            </strong>
                            <br />
                            <Badge bg="secondary" className="small">
                              {platform.platform || "Platform"}
                            </Badge>
                          </div>
                        </td>
                        <td>{formatNumber(orders)}</td>
                        <td>{formatCurrency(revenue)}</td>
                        <td>{formatCurrency(avgOrderValue)}</td>
                        <td>
                          <Badge
                            bg={
                              conversionRate > 80
                                ? "success"
                                : conversionRate > 50
                                ? "warning"
                                : "danger"
                            }
                          >
                            {formatPercentage(conversionRate, 1)}
                          </Badge>
                        </td>
                        <td>
                          <ProgressBar
                            now={performance}
                            variant={
                              performance > 75
                                ? "success"
                                : performance > 50
                                ? "warning"
                                : "danger"
                            }
                            style={{ height: "20px" }}
                          />
                          <small>{formatPercentage(performance, 1)}</small>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
              {platforms.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-muted">
                    No platform data available for the selected timeframe.
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PlatformAnalytics;
