import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Alert,
  Spinner,
  Button,
  ButtonGroup,
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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import analyticsService from "../../services/analyticsService";
import KPICard from "./KPICard";
import ExportButton from "./ExportButton";

const CustomerAnalytics = ({ timeframe = "30d" }) => {
  const [data, setData] = useState(null);
  const [cohortData, setCohortData] = useState(null);
  const [segmentationData, setSegmentationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState("overview");

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        setLoading(true);

        // Fetch all customer analytics data
        const [customerData, cohorts, segmentation] = await Promise.all([
          analyticsService.getCustomerAnalytics(timeframe),
          analyticsService.getCohortAnalysis(
            timeframe === "30d" ? "90d" : timeframe
          ),
          analyticsService.getCustomerSegmentation
            ? analyticsService.getCustomerSegmentation(timeframe)
            : Promise.resolve(null),
        ]);

        setData(customerData);
        setCohortData(cohorts);
        setSegmentationData(segmentation);
      } catch (err) {
        console.error("Customer analytics error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
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
      <Alert variant="danger">Error loading customer analytics: {error}</Alert>
    );
  }

  const renderOverview = () => (
    <>
      <Row className="mb-4">
        <Col md={3}>
          <KPICard
            title="Total Customers"
            value={data?.totalCustomers || 0}
            change={data?.customerGrowth || 0}
            format="number"
          />
        </Col>
        <Col md={3}>
          <KPICard
            title="New Customers"
            value={data?.newCustomers || 0}
            change={data?.newCustomerGrowth || 0}
            format="number"
          />
        </Col>
        <Col md={3}>
          <KPICard
            title="Customer LTV"
            value={data?.averageLifetimeValue || 0}
            change={data?.ltvGrowth || 0}
            format="currency"
          />
        </Col>
        <Col md={3}>
          <KPICard
            title="Retention Rate"
            value={data?.retentionRate || 0}
            change={data?.retentionChange || 0}
            format="percentage"
          />
        </Col>
      </Row>

      <Row>
        <Col md={8}>
          <Card className="mb-4">
            <Card.Header>
              <Card.Title>Customer Acquisition Trend</Card.Title>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.acquisitionTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="newCustomers"
                    stroke="#8884d8"
                    name="New Customers"
                  />
                  <Line
                    type="monotone"
                    dataKey="returningCustomers"
                    stroke="#82ca9d"
                    name="Returning Customers"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="mb-4">
            <Card.Header>
              <Card.Title>Customer Segments</Card.Title>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={segmentationData?.segments || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {(segmentationData?.segments || []).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );

  const renderCohorts = () => (
    <Row>
      <Col>
        <Card>
          <Card.Header>
            <Card.Title>Customer Retention Cohort Analysis</Card.Title>
          </Card.Header>
          <Card.Body>
            {cohortData?.cohorts?.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Cohort</th>
                      <th>Customers</th>
                      <th>Month 0</th>
                      <th>Month 1</th>
                      <th>Month 2</th>
                      <th>Month 3</th>
                      <th>Month 6</th>
                      <th>Month 12</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohortData.cohorts.map((cohort, index) => (
                      <tr key={index}>
                        <td>{cohort.period}</td>
                        <td>{cohort.totalCustomers}</td>
                        <td className="bg-success text-white">100%</td>
                        <td
                          className={`${
                            cohort.month1 > 30
                              ? "bg-success"
                              : cohort.month1 > 15
                              ? "bg-warning"
                              : "bg-danger"
                          } text-white`}
                        >
                          {cohort.month1}%
                        </td>
                        <td
                          className={`${
                            cohort.month2 > 25
                              ? "bg-success"
                              : cohort.month2 > 10
                              ? "bg-warning"
                              : "bg-danger"
                          } text-white`}
                        >
                          {cohort.month2}%
                        </td>
                        <td
                          className={`${
                            cohort.month3 > 20
                              ? "bg-success"
                              : cohort.month3 > 8
                              ? "bg-warning"
                              : "bg-danger"
                          } text-white`}
                        >
                          {cohort.month3}%
                        </td>
                        <td
                          className={`${
                            cohort.month6 > 15
                              ? "bg-success"
                              : cohort.month6 > 5
                              ? "bg-warning"
                              : "bg-danger"
                          } text-white`}
                        >
                          {cohort.month6}%
                        </td>
                        <td
                          className={`${
                            cohort.month12 > 10
                              ? "bg-success"
                              : cohort.month12 > 3
                              ? "bg-warning"
                              : "bg-danger"
                          } text-white`}
                        >
                          {cohort.month12}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Alert variant="info">
                No cohort data available for this time period.
              </Alert>
            )}

            {cohortData?.insights && (
              <div className="mt-3">
                <h6>Key Insights:</h6>
                <ul>
                  {cohortData.insights.map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  const renderSegmentation = () => (
    <Row>
      <Col md={8}>
        <Card className="mb-4">
          <Card.Header>
            <Card.Title>RFM Customer Segments</Card.Title>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={segmentationData?.segments || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" name="Customers" />
                <Bar dataKey="revenue" fill="#82ca9d" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      </Col>
      <Col md={4}>
        <Card className="mb-4">
          <Card.Header>
            <Card.Title>Segment Descriptions</Card.Title>
          </Card.Header>
          <Card.Body>
            <div className="small">
              <div className="mb-2">
                <strong className="text-success">Champions:</strong> High value,
                frequent buyers
              </div>
              <div className="mb-2">
                <strong className="text-primary">Loyal Customers:</strong>{" "}
                Regular, consistent buyers
              </div>
              <div className="mb-2">
                <strong className="text-warning">Potential Loyalists:</strong>{" "}
                Recent customers with potential
              </div>
              <div className="mb-2">
                <strong className="text-info">New Customers:</strong> Recent
                first-time buyers
              </div>
              <div className="mb-2">
                <strong className="text-secondary">At Risk:</strong> Were
                frequent buyers, now declining
              </div>
              <div className="mb-2">
                <strong className="text-danger">Can't Lose Them:</strong> High
                value customers in decline
              </div>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col md={8}>
          <h2>Customer Analytics</h2>
        </Col>
        <Col md={4} className="text-end">
          <ExportButton
            onExport={() =>
              analyticsService.exportAnalytics("customers", timeframe)
            }
            filename={`customer-analytics-${timeframe}`}
          />
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <ButtonGroup>
            <Button
              variant={
                activeView === "overview" ? "primary" : "outline-primary"
              }
              onClick={() => setActiveView("overview")}
            >
              Overview
            </Button>
            <Button
              variant={activeView === "cohorts" ? "primary" : "outline-primary"}
              onClick={() => setActiveView("cohorts")}
            >
              Cohort Analysis
            </Button>
            <Button
              variant={
                activeView === "segmentation" ? "primary" : "outline-primary"
              }
              onClick={() => setActiveView("segmentation")}
            >
              RFM Segmentation
            </Button>
          </ButtonGroup>
        </Col>
      </Row>

      {activeView === "overview" && renderOverview()}
      {activeView === "cohorts" && renderCohorts()}
      {activeView === "segmentation" && renderSegmentation()}
    </Container>
  );
};

export default CustomerAnalytics;
