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

        const salesData = await analyticsService.getSalesAnalytics(timeframe);
        setData(salesData);
      } catch (err) {
        console.error("Error fetching sales analytics:", err);
        setError(err.message || "Failed to load sales data");
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [timeframe]);

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
      <Alert variant="danger">
        <Alert.Heading>Error Loading Sales Analytics</Alert.Heading>
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

  // Extract sales data from response
  const salesData = data?.data || {};
  const dashboardData = salesData.dashboard || {};
  const orderSummary = dashboardData.orderSummary || {};
  const revenueData = dashboardData.revenue || {};
  const topProducts = dashboardData.topProducts || [];

  // Sales KPIs
  const salesKPIs = [
    {
      title: "Total Revenue",
      value: analyticsService.formatCurrency(orderSummary.totalRevenue || 0),
      change: analyticsService.calculateGrowthRate(
        orderSummary.totalRevenue || 0,
        orderSummary.previousRevenue || 0
      ),
      icon: CurrencyDollarIcon,
      color: "primary",
    },
    {
      title: "Total Orders",
      value: analyticsService.formatNumber(orderSummary.totalOrders || 0),
      change: analyticsService.calculateGrowthRate(
        orderSummary.totalOrders || 0,
        orderSummary.previousOrders || 0
      ),
      icon: ShoppingBagIcon,
      color: "success",
    },
    {
      title: "Average Order Value",
      value: analyticsService.formatCurrency(orderSummary.avgOrderValue || 0),
      change: analyticsService.calculateGrowthRate(
        orderSummary.avgOrderValue || 0,
        orderSummary.previousAvgOrderValue || 0
      ),
      icon: ChartBarIcon,
      color: "info",
    },
    {
      title: "Conversion Rate",
      value: analyticsService.formatPercentage(
        orderSummary.conversionRate || 0
      ),
      change: analyticsService.calculateGrowthRate(
        orderSummary.conversionRate || 0,
        orderSummary.previousConversionRate || 0
      ),
      icon: ArrowTrendingUpIcon,
      color: "warning",
    },
  ];

  // Chart colors
  const colors = ["#007bff", "#28a745", "#ffc107", "#dc3545", "#17a2b8"];

  // Prepare chart data
  const chartData = revenueData.trends || [];
  const topProductsData = topProducts.slice(0, 10).map((product) => ({
    name:
      product.name?.substring(0, 20) +
        (product.name?.length > 20 ? "..." : "") || "Unknown Product",
    fullName: product.name || "Unknown Product",
    revenue: parseFloat(product.revenue) || 0,
    totalSold: parseInt(product.totalSold) || 0,
    unitsSold: parseInt(product.unitsSold) || parseInt(product.totalSold) || 0,
    avgPrice: parseFloat(product.avgPrice) || 0,
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
                          analyticsService.formatCurrency(value),
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
                          analyticsService.formatCurrency(value),
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
                          analyticsService.formatCurrency(value),
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
                            analyticsService.formatCurrency(value),
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
                              return analyticsService.formatCurrency(
                                Number(value)
                              );
                            }

                            const data = topProductsData[props.index];
                            const units = data.unitsSold || data.totalSold || 0;
                            return `${analyticsService.formatCurrency(
                              Number(value)
                            )} (${units} units)`;
                          } catch (error) {
                            console.warn("LabelList formatter error:", error);
                            return value
                              ? analyticsService.formatCurrency(Number(value))
                              : "";
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
                        <td>
                          {analyticsService.formatCurrency(product.revenue)}
                        </td>
                        <td>
                          {analyticsService.formatNumber(product.unitsSold)}
                        </td>
                        <td>
                          {analyticsService.formatCurrency(product.avgPrice)}
                        </td>
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
