import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Alert,
  Spinner,
  Badge,
  Table,
} from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import api from "../../services/api";

const PlatformAnalytics = () => {
  const { platformId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("30d");

  const fetchPlatformAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch platform details
      const platformResponse = await api.platforms.getConnection(platformId);
      setPlatform(platformResponse.data);

      // Fetch analytics data
      const analyticsResponse = await api.platforms.getAnalytics(
        platformId,
        timeRange
      );
      setAnalytics(analyticsResponse.data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to fetch platform analytics:", error);
      }
      setError("Failed to load platform analytics");
    } finally {
      setLoading(false);
    }
  }, [platformId, timeRange]);

  useEffect(() => {
    fetchPlatformAnalytics();
  }, [fetchPlatformAnalytics]);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading analytics...</span>
          </Spinner>
          <p className="mt-2">Loading platform analytics...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
          <Button
            variant="outline-danger"
            onClick={() => navigate(`/platforms/${platformId}/settings`)}
          >
            Back to Settings
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1>{platform?.name} Analytics</h1>
              <p className="text-muted">Performance insights and metrics</p>
            </div>
            <div className="d-flex gap-2">
              <select
                className="form-select"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                style={{ width: "auto" }}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <Button
                variant="outline-secondary"
                onClick={() => navigate(`/platforms/${platformId}/settings`)}
              >
                <i className="fas fa-arrow-left me-2"></i>Back to Settings
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Key Metrics */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary">{analytics?.totalOrders || 0}</h3>
              <p className="text-muted mb-0">Total Orders</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success">${analytics?.totalRevenue || 0}</h3>
              <p className="text-muted mb-0">Total Revenue</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-info">
                ${analytics?.averageOrderValue || 0}
              </h3>
              <p className="text-muted mb-0">Avg Order Value</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-warning">{analytics?.syncCount || 0}</h3>
              <p className="text-muted mb-0">Syncs Performed</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row className="mb-4">
        <Col lg={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Orders Over Time</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics?.ordersOverTime || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#8884d8"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#82ca9d"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Order Status Distribution</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics?.statusDistribution || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(analytics?.statusDistribution || []).map(
                      (entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      )
                    )}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Sync Performance */}
      <Row className="mb-4">
        <Col lg={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Sync Performance</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics?.syncPerformance || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="successful" fill="#28a745" />
                  <Bar dataKey="failed" fill="#dc3545" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Recent Activity</h5>
            </Card.Header>
            <Card.Body>
              <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                {analytics?.recentActivity?.map((activity, index) => (
                  <div
                    key={index}
                    className="d-flex justify-content-between align-items-center py-2 border-bottom"
                  >
                    <div>
                      <strong>{activity.action}</strong>
                      <div className="text-muted small">
                        {activity.description}
                      </div>
                    </div>
                    <div className="text-end">
                      <Badge
                        bg={
                          activity.status === "success" ? "success" : "danger"
                        }
                      >
                        {activity.status}
                      </Badge>
                      <div className="text-muted small">
                        {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center text-muted py-4">
                    <i className="fas fa-chart-line display-4 mb-3"></i>
                    <p>No recent activity data available</p>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Performance Metrics Table */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Performance Metrics</h5>
            </Card.Header>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Current Period</th>
                    <th>Previous Period</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.performanceMetrics?.map((metric, index) => (
                    <tr key={index}>
                      <td>
                        <strong>{metric.name}</strong>
                      </td>
                      <td>{metric.current}</td>
                      <td>{metric.previous}</td>
                      <td>
                        <Badge
                          bg={
                            metric.change > 0
                              ? "success"
                              : metric.change < 0
                              ? "danger"
                              : "secondary"
                          }
                        >
                          {metric.change > 0 ? "+" : ""}
                          {metric.change}%
                        </Badge>
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan="4" className="text-center text-muted py-4">
                        No performance metrics available
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default PlatformAnalytics;
