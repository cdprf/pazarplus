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
import analyticsService from "../../services/analyticsService";
import KPICard from "./KPICard";
import ExportButton from "./ExportButton";
import {
  CubeIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
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
          const processedData = productData.data || productData;

          // Ensure consistent data structure
          const normalizedData = {
            ...processedData,
            topProducts: processedData.topProducts || [],
            performance: processedData.performance || {
              categories: [],
              sales: [],
              stockStatus: [],
            },
            inventory: processedData.inventory || {
              lowStock: [],
              outOfStock: [],
              overStock: [],
            },
          };

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
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading product analytics...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Product Analytics</Alert.Heading>
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

  // Extract product data from response
  const productData = data?.data || {};
  const dashboardData = productData.dashboard || {};
  const topProducts = dashboardData.topProducts || [];
  const categoryData = dashboardData.categories || [];

  // Colors for charts
  const CHART_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  // Prepare data for charts
  const topProductsChart = topProducts.slice(0, 10).map((product) => ({
    name: product.name || `Product ${product.id}`,
    quantity: parseInt(product.totalQuantity) || 0,
    revenue: parseFloat(product.totalRevenue) || 0,
    orders: parseInt(product.orderCount) || 0,
  }));

  const categoryChart = categoryData.map((category) => ({
    name: category.name || "Unknown",
    value: parseFloat(category.revenue) || 0,
    count: parseInt(category.count) || 0,
  }));

  // Calculate KPIs
  const totalProducts = topProducts.length;
  const totalRevenue = topProducts.reduce(
    (sum, p) => sum + (parseFloat(p.totalRevenue) || 0),
    0
  );
  const totalQuantity = topProducts.reduce(
    (sum, p) => sum + (parseInt(p.totalQuantity) || 0),
    0
  );
  const avgOrderValue = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;

  return (
    <div>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-1">Product Analytics</h4>
              <p className="text-muted">
                Product performance, inventory insights, and recommendations
              </p>
            </div>
            <ExportButton type="products" timeframe={timeframe} />
          </div>
        </Col>
      </Row>

      {/* KPI Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <KPICard
            title="Total Products"
            value={totalProducts.toLocaleString()}
            icon={CubeIcon}
            color="primary"
          />
        </Col>
        <Col md={3}>
          <KPICard
            title="Product Revenue"
            value={`$${totalRevenue.toLocaleString()}`}
            icon={ChartBarIcon}
            color="success"
          />
        </Col>
        <Col md={3}>
          <KPICard
            title="Units Sold"
            value={totalQuantity.toLocaleString()}
            icon={ArrowTrendingUpIcon}
            color="info"
          />
        </Col>
        <Col md={3}>
          <KPICard
            title="Avg Order Value"
            value={`$${avgOrderValue.toFixed(2)}`}
            icon={ExclamationTriangleIcon}
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
                chartType === "performance" ? "primary" : "outline-primary"
              }
              onClick={() => setChartType("performance")}
            >
              Product Performance
            </Button>
            <Button
              variant={
                chartType === "categories" ? "primary" : "outline-primary"
              }
              onClick={() => setChartType("categories")}
            >
              Category Breakdown
            </Button>
            <Button
              variant={
                chartType === "inventory" ? "primary" : "outline-primary"
              }
              onClick={() => setChartType("inventory")}
            >
              Inventory Analysis
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
                {chartType === "performance" && "Top Performing Products"}
                {chartType === "categories" && "Category Performance"}
                {chartType === "inventory" && "Inventory Levels"}
              </Card.Title>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={400}>
                {chartType === "performance" && (
                  <BarChart data={topProductsChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="quantity"
                      fill="#8884d8"
                      name="Quantity Sold"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="revenue"
                      fill="#82ca9d"
                      name="Revenue ($)"
                    />
                  </BarChart>
                )}
                {chartType === "categories" && (
                  <PieChart>
                    <Pie
                      data={categoryChart}
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
                      {categoryChart.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                )}
                {chartType === "inventory" && (
                  <BarChart data={topProductsChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="orders" fill="#ffc658" name="Order Count" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card>
            <Card.Header>
              <Card.Title>Product Insights</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <h6>Top Performer</h6>
                <p className="text-success mb-1">
                  {topProducts[0]?.name || "No data"}
                </p>
                <small className="text-muted">
                  $
                  {parseFloat(
                    topProducts[0]?.totalRevenue || 0
                  ).toLocaleString()}{" "}
                  revenue
                </small>
              </div>
              <div className="mb-3">
                <h6>Categories</h6>
                <small className="text-muted">
                  {categoryData.length} categories tracked
                </small>
              </div>
              <div className="mb-3">
                <h6>Performance Metrics</h6>
                <div className="d-flex justify-content-between">
                  <span>Conversion Rate</span>
                  <Badge bg="success">
                    {totalQuantity > 0
                      ? ((totalProducts / totalQuantity) * 100).toFixed(1)
                      : "0"}
                    %
                  </Badge>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Product Table */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <Card.Title>Top Products Details</Card.Title>
            </Card.Header>
            <Card.Body>
              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity Sold</th>
                    <th>Revenue</th>
                    <th>Orders</th>
                    <th>Avg. Price</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
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
                      <tr key={product.id || index}>
                        <td>
                          <div>
                            <strong>
                              {product.name || `Product ${product.id}`}
                            </strong>
                            <br />
                            <small className="text-muted">
                              ID: {product.id}
                            </small>
                          </div>
                        </td>
                        <td>{quantity.toLocaleString()}</td>
                        <td>${revenue.toLocaleString()}</td>
                        <td>{orders.toLocaleString()}</td>
                        <td>${avgPrice.toFixed(2)}</td>
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
                          <small>{performance.toFixed(1)}%</small>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
              {topProducts.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-muted">
                    No product data available for the selected timeframe.
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

export default ProductAnalytics;
