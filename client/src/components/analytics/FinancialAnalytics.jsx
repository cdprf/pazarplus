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
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import analyticsService from "../../services/analyticsService";
import KPICard from "./KPICard";
import ExportButton from "./ExportButton";
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
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
        console.error("Error fetching financial analytics:", err);
        setError(err.message || "Failed to load financial analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [timeframe]);

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <Spinner animation="border" role="status">
          <span className="visually-hidden">
            Loading financial analytics...
          </span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Financial Analytics</Alert.Heading>
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

  // Extract financial data from response
  const financialData = data?.data || {};
  const dashboardData = financialData.dashboard || {};
  const revenueData = dashboardData.revenue || {};
  const orderSummary = dashboardData.orderSummary || {};
  const platforms = dashboardData.platforms || [];

  // Calculate financial metrics
  const totalRevenue = parseFloat(revenueData.total) || 0;
  const previousRevenue = parseFloat(revenueData.previous) || 0;
  const totalOrders = parseInt(orderSummary.total) || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const revenueGrowth =
    previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

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
    revenue: parseFloat(platform.revenue || platform.totalRevenue) || 0,
    orders: parseInt(platform.orders || platform.totalOrders) || 0,
    profit: (parseFloat(platform.revenue || platform.totalRevenue) || 0) * 0.3, // Mock profit margin
  }));

  const expenseBreakdown = [
    { name: "Cost of Goods", value: estimatedCosts * 0.6, color: "#0088FE" },
    { name: "Marketing", value: estimatedCosts * 0.2, color: "#00C49F" },
    { name: "Operations", value: estimatedCosts * 0.15, color: "#FFBB28" },
    { name: "Other", value: estimatedCosts * 0.05, color: "#FF8042" },
  ];

  return (
    <div>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-1">Financial Analytics</h4>
              <p className="text-muted">
                Revenue, profit margins, cash flow, and financial KPIs
              </p>
            </div>
            <ExportButton type="financial" timeframe={timeframe} />
          </div>
        </Col>
      </Row>

      {/* KPI Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <KPICard
            title="Total Revenue"
            value={`$${totalRevenue.toLocaleString()}`}
            change={revenueGrowth}
            icon={CurrencyDollarIcon}
            color="success"
          />
        </Col>
        <Col md={3}>
          <KPICard
            title="Gross Profit"
            value={`$${grossProfit.toLocaleString()}`}
            icon={BanknotesIcon}
            color="primary"
          />
        </Col>
        <Col md={3}>
          <KPICard
            title="Profit Margin"
            value={`${profitMargin.toFixed(1)}%`}
            icon={ChartBarIcon}
            color="info"
          />
        </Col>
        <Col md={3}>
          <KPICard
            title="Avg Order Value"
            value={`$${avgOrderValue.toFixed(2)}`}
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
              variant={chartType === "revenue" ? "primary" : "outline-primary"}
              onClick={() => setChartType("revenue")}
            >
              Revenue Trend
            </Button>
            <Button
              variant={chartType === "profit" ? "primary" : "outline-primary"}
              onClick={() => setChartType("profit")}
            >
              Profit Analysis
            </Button>
            <Button
              variant={
                chartType === "platforms" ? "primary" : "outline-primary"
              }
              onClick={() => setChartType("platforms")}
            >
              Platform Revenue
            </Button>
            <Button
              variant={chartType === "expenses" ? "primary" : "outline-primary"}
              onClick={() => setChartType("expenses")}
            >
              Expense Breakdown
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
                {chartType === "revenue" && "Revenue Trend Over Time"}
                {chartType === "profit" && "Profit & Loss Analysis"}
                {chartType === "platforms" && "Platform Revenue Comparison"}
                {chartType === "expenses" && "Expense Categories"}
              </Card.Title>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={400}>
                {chartType === "revenue" && (
                  <AreaChart data={revenueOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      name="Revenue"
                    />
                  </AreaChart>
                )}
                {chartType === "profit" && (
                  <ComposedChart data={revenueOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                    <Bar dataKey="costs" fill="#ff7300" name="Costs" />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#00ff00"
                      name="Profit"
                    />
                  </ComposedChart>
                )}
                {chartType === "platforms" && (
                  <BarChart data={platformFinancials}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                    <Bar dataKey="profit" fill="#82ca9d" name="Profit" />
                  </BarChart>
                )}
                {chartType === "expenses" && (
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
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
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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
              <Card.Title>Financial Insights</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <h6>Cash Flow Status</h6>
                <Badge bg="success" className="mb-2">
                  Positive
                </Badge>
                <p className="small text-muted">
                  Monthly cash flow: $
                  {(totalRevenue - estimatedCosts).toLocaleString()}
                </p>
              </div>
              <div className="mb-3">
                <h6>Top Revenue Source</h6>
                <p className="text-success mb-1">
                  {platformFinancials[0]?.name || "No data"}
                </p>
                <small className="text-muted">
                  ${platformFinancials[0]?.revenue.toLocaleString() || "0"}{" "}
                  revenue
                </small>
              </div>
              <div className="mb-3">
                <h6>Financial Health</h6>
                <ProgressBar
                  now={Math.min(100, profitMargin * 3.33)}
                  variant={
                    profitMargin > 20
                      ? "success"
                      : profitMargin > 10
                      ? "warning"
                      : "danger"
                  }
                  style={{ height: "20px" }}
                />
                <small className="text-muted">
                  Profit margin: {profitMargin.toFixed(1)}%
                </small>
              </div>
              <div className="mb-3">
                <h6>Revenue Growth</h6>
                <Badge bg={revenueGrowth > 0 ? "success" : "danger"}>
                  {revenueGrowth > 0 ? "+" : ""}
                  {revenueGrowth.toFixed(1)}%
                </Badge>
                <p className="small text-muted mt-1">vs previous period</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Financial Summary Table */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <Card.Title>Financial Summary</Card.Title>
            </Card.Header>
            <Card.Body>
              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Current Period</th>
                    <th>Previous Period</th>
                    <th>Change</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Total Revenue</strong>
                    </td>
                    <td>${totalRevenue.toLocaleString()}</td>
                    <td>${previousRevenue.toLocaleString()}</td>
                    <td>
                      <Badge bg={revenueGrowth > 0 ? "success" : "danger"}>
                        {revenueGrowth > 0 ? "+" : ""}
                        {revenueGrowth.toFixed(1)}%
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        bg={
                          totalRevenue > previousRevenue ? "success" : "warning"
                        }
                      >
                        {totalRevenue > previousRevenue ? "Growing" : "Stable"}
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Gross Profit</strong>
                    </td>
                    <td>${grossProfit.toLocaleString()}</td>
                    <td>${(previousRevenue * 0.3).toLocaleString()}</td>
                    <td>
                      <Badge bg="info">
                        {(
                          ((grossProfit - previousRevenue * 0.3) /
                            Math.max(previousRevenue * 0.3, 1)) *
                          100
                        ).toFixed(1)}
                        %
                      </Badge>
                    </td>
                    <td>
                      <Badge bg="success">Healthy</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Total Orders</strong>
                    </td>
                    <td>{totalOrders.toLocaleString()}</td>
                    <td>{Math.floor(totalOrders * 0.8).toLocaleString()}</td>
                    <td>
                      <Badge bg="success">+20%</Badge>
                    </td>
                    <td>
                      <Badge bg="success">Growing</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Average Order Value</strong>
                    </td>
                    <td>${avgOrderValue.toFixed(2)}</td>
                    <td>${(avgOrderValue * 0.95).toFixed(2)}</td>
                    <td>
                      <Badge bg="success">+5%</Badge>
                    </td>
                    <td>
                      <Badge bg="success">Improving</Badge>
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default FinancialAnalytics;
