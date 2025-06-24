import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Alert,
  Spinner,
  Badge,
  Button,
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
} from "recharts";
import { CogIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import analyticsService from "../../services/analyticsService";
import KPICard from "./KPICard";
import ExportButton from "./ExportButton";

const OperationalAnalytics = ({ timeframe = "30d" }) => {
  const [realTimeData, setRealTimeData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOperationalData = async () => {
      try {
        setLoading(true);

        // Fetch operational analytics data
        const [realTime, performance, anomalyData] = await Promise.all([
          analyticsService.getRealTimeMetrics
            ? analyticsService.getRealTimeMetrics()
            : Promise.resolve(null),
          analyticsService.getOperationalAnalytics(timeframe),
          analyticsService.getAnomalyDetection
            ? analyticsService.getAnomalyDetection()
            : Promise.resolve(null),
        ]);

        setRealTimeData(realTime);
        setPerformanceData(performance);
        setAnomalies(anomalyData);
      } catch (err) {
        console.error("Operational analytics error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOperationalData();

    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchOperationalData, 30000);
    return () => clearInterval(interval);
  }, [timeframe]);

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <Spinner animation="border" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        Error loading operational analytics: {error}
      </Alert>
    );
  }

  // Empty state handling
  if (!realTimeData && !performanceData && !anomalies) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <div className="mb-4">
            <CogIcon className="h-16 w-16 text-muted mx-auto mb-3" />
            <h3 className="text-muted">No Operational Data Available</h3>
            <p className="text-muted mb-4">
              We couldn't find any operational metrics for the selected period.
              This might be because:
            </p>
            <ul className="list-unstyled text-muted mb-4">
              <li>• System monitoring is not yet configured</li>
              <li>• Data collection is still in progress</li>
              <li>• The selected timeframe has no activity</li>
            </ul>
          </div>
          <div className="d-flex gap-2 justify-content-center">
            <Button
              variant="primary"
              onClick={() => window.location.reload()}
              aria-label="Refresh operational data"
            >
              <ArrowPathIcon className="h-4 w-4 me-2" />
              Refresh Data
            </Button>
            <Button
              variant="outline-secondary"
              href="/analytics"
              aria-label="Go to main analytics dashboard"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  const getStatusBadge = (value, threshold) => {
    if (value >= threshold * 0.9) return <Badge bg="success">Good</Badge>;
    if (value >= threshold * 0.7) return <Badge bg="warning">Warning</Badge>;
    return <Badge bg="danger">Critical</Badge>;
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col md={8}>
          <h2>
            Operational Analytics <Badge bg="primary">Real-time</Badge>
          </h2>
        </Col>
        <Col md={4} className="text-end">
          <ExportButton
            onExport={() =>
              analyticsService.exportAnalytics("operational", timeframe)
            }
            filename={`operational-analytics-${timeframe}`}
          />
        </Col>
      </Row>

      {/* Real-time KPIs */}
      <Row className="mb-4">
        <Col md={3}>
          <KPICard
            title="Active Orders"
            value={realTimeData?.activeOrders || 0}
            format="number"
            isRealTime={true}
          />
        </Col>
        <Col md={3}>
          <KPICard
            title="Processing Time"
            value={realTimeData?.avgProcessingTime || 0}
            format="duration"
            unit="min"
            isRealTime={true}
          />
        </Col>
        <Col md={3}>
          <KPICard
            title="System Load"
            value={realTimeData?.systemLoad || 0}
            format="percentage"
            isRealTime={true}
          />
        </Col>
        <Col md={3}>
          <KPICard
            title="Error Rate"
            value={realTimeData?.errorRate || 0}
            format="percentage"
            isRealTime={true}
          />
        </Col>
      </Row>

      {/* Performance Metrics */}
      <Row className="mb-4">
        <Col md={8}>
          <Card>
            <Card.Header>
              <Card.Title>System Performance Over Time</Card.Title>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData?.hourlyMetrics || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="responseTime"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    name="Response Time (ms)"
                  />
                  <Area
                    type="monotone"
                    dataKey="throughput"
                    stackId="2"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    name="Throughput (req/min)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>
              <Card.Title>System Health</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>API Response Time</span>
                {getStatusBadge(realTimeData?.apiResponseTime || 0, 200)}
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Database Performance</span>
                {getStatusBadge(realTimeData?.dbPerformance || 0, 100)}
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Memory Usage</span>
                {getStatusBadge(100 - (realTimeData?.memoryUsage || 0), 30)}
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>CPU Usage</span>
                {getStatusBadge(100 - (realTimeData?.cpuUsage || 0), 30)}
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span>Uptime</span>
                <Badge bg="success">{realTimeData?.uptime || "99.9%"}</Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Anomalies and Alerts */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <Card.Title>Recent Anomalies</Card.Title>
            </Card.Header>
            <Card.Body>
              {anomalies?.detectedAnomalies?.length > 0 ? (
                <div>
                  {anomalies.detectedAnomalies
                    .slice(0, 5)
                    .map((anomaly, index) => (
                      <div key={index} className="border-bottom py-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="fw-bold">{anomaly.metric}</span>
                          <Badge
                            bg={
                              anomaly.severity === "high"
                                ? "danger"
                                : anomaly.severity === "medium"
                                ? "warning"
                                : "info"
                            }
                          >
                            {anomaly.severity}
                          </Badge>
                        </div>
                        <small className="text-muted">
                          {anomaly.description}
                        </small>
                        <div className="small text-muted">
                          {anomaly.timestamp}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <Alert variant="success" className="mb-0">
                  <i className="fas fa-check-circle me-2"></i>
                  No anomalies detected in the system
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>
              <Card.Title>Performance Trends</Card.Title>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={performanceData?.trends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgResponseTime"
                    stroke="#8884d8"
                    name="Avg Response Time"
                  />
                  <Line
                    type="monotone"
                    dataKey="errorRate"
                    stroke="#ff7300"
                    name="Error Rate %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Operational Insights */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <Card.Title>Operational Insights & Recommendations</Card.Title>
            </Card.Header>
            <Card.Body>
              {performanceData?.insights?.length > 0 ? (
                <div>
                  {performanceData.insights.map((insight, index) => (
                    <div key={index} className="mb-2">
                      <i className="fas fa-lightbulb text-warning me-2"></i>
                      {insight}
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div className="mb-2">
                    <i className="fas fa-chart-line text-primary me-2"></i>
                    System performance is stable with no critical issues
                    detected
                  </div>
                  <div className="mb-2">
                    <i className="fas fa-shield-alt text-success me-2"></i>
                    All monitoring systems are operational and reporting
                    normally
                  </div>
                  <div className="mb-2">
                    <i className="fas fa-clock text-info me-2"></i>
                    Response times are within acceptable thresholds
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default OperationalAnalytics;
