import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Badge,
  Button,
  Alert,
  Spinner,
  Table,
  ProgressBar,
  Modal,
  Form,
} from "react-bootstrap";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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

/**
 * Advanced Inventory Insights Component for Month 5 Phase 1
 * Provides AI-powered inventory optimization and stock predictions
 */
const InventoryInsights = () => {
  const [timeframe, setTimeframe] = useState("30d");
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showReorderModal, setShowReorderModal] = useState(false);

  // Fetch inventory insights
  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/analytics/inventory-insights?timeframe=${timeframe}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch inventory insights");
      }

      const data = await response.json();
      setInsights(data.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case "critical":
        return "danger";
      case "low":
        return "warning";
      case "normal":
        return "success";
      case "overstock":
        return "info";
      default:
        return "secondary";
    }
  };

  // Get urgency color
  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case "high":
        return "#dc3545";
      case "medium":
        return "#ffc107";
      case "low":
        return "#28a745";
      default:
        return "#6c757d";
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount);
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "400px" }}
      >
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <div className="mt-2">Loading Inventory Insights...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <ExclamationTriangleIcon className="h-5 w-5 me-2" />
        Error loading inventory insights: {error}
        <Button
          variant="outline-danger"
          size="sm"
          className="ms-2"
          onClick={fetchInsights}
        >
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div className="inventory-insights">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Inventory Intelligence</h2>
          <small className="text-muted">
            AI-powered stock optimization and predictions
          </small>
        </div>
        <Button
          variant="outline-primary"
          onClick={fetchInsights}
          disabled={loading}
        >
          Refresh Data
        </Button>
      </div>

      {/* Alert Summary */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <div className="display-6 text-danger fw-bold">
                {insights?.alerts?.lowStock?.length || 0}
              </div>
              <div className="text-muted">Low Stock Items</div>
              <small className="text-danger">
                Requires immediate attention
              </small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <div className="display-6 text-warning fw-bold">
                {insights?.alerts?.reorderNeeded?.length || 0}
              </div>
              <div className="text-muted">Reorder Needed</div>
              <small className="text-warning">Below reorder point</small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <div className="display-6 text-info fw-bold">
                {insights?.alerts?.overstock?.length || 0}
              </div>
              <div className="text-muted">Overstock Items</div>
              <small className="text-info">Consider promotions</small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <div className="display-6 text-success fw-bold">
                {formatCurrency(insights?.optimization?.estimatedSavings || 0)}
              </div>
              <div className="text-muted">Potential Savings</div>
              <small className="text-success">Through optimization</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Critical Alerts */}
      {insights?.alerts?.lowStock?.length > 0 && (
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-danger text-white">
                <div className="d-flex align-items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 me-2" />
                  <h5 className="mb-0">Critical Stock Alerts</h5>
                </div>
              </Card.Header>
              <Card.Body>
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Current Stock</th>
                      <th>Days Until Stockout</th>
                      <th>Daily Demand</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.alerts.lowStock.slice(0, 5).map((item, index) => (
                      <tr key={index}>
                        <td>
                          <div>
                            <strong>{item.name}</strong>
                            <br />
                            <small className="text-muted">
                              ID: {item.productId}
                            </small>
                          </div>
                        </td>
                        <td>
                          <span className="fw-bold text-danger">
                            {item.currentStock}
                          </span>
                        </td>
                        <td>
                          <Badge
                            bg={
                              item.daysUntilStockout < 7 ? "danger" : "warning"
                            }
                          >
                            {item.daysUntilStockout} days
                          </Badge>
                        </td>
                        <td>{item.predictedDemand.toFixed(1)}</td>
                        <td>
                          <Badge bg={getStatusVariant(item.status)}>
                            {item.status}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(item);
                              setShowReorderModal(true);
                            }}
                          >
                            Reorder
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Top Products Performance */}
      <Row className="mb-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Header>
              <h5 className="mb-0">Product Performance Analysis</h5>
            </Card.Header>
            <Card.Body>
              {insights?.topProducts && (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={insights.topProducts.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => [
                        name === "totalRevenue" ? formatCurrency(value) : value,
                        name === "totalRevenue" ? "Revenue" : "Units Sold",
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="totalSold" fill="#17a2b8" name="Units Sold" />
                    <Bar dataKey="totalRevenue" fill="#28a745" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm">
            <Card.Header>
              <h5 className="mb-0">Optimization Priorities</h5>
            </Card.Header>
            <Card.Body>
              {insights?.optimization?.priorities && (
                <div className="space-y-3">
                  {insights.optimization.priorities.map((priority, index) => (
                    <div
                      key={index}
                      className="d-flex justify-content-between align-items-center p-3 bg-light rounded"
                    >
                      <div>
                        <div className="fw-bold">{priority.action}</div>
                        <small className="text-muted">
                          {priority.items} items
                        </small>
                      </div>
                      <Badge
                        bg={
                          priority.urgency === "high"
                            ? "danger"
                            : priority.urgency === "medium"
                            ? "warning"
                            : "info"
                        }
                      >
                        {priority.urgency}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {insights?.optimization?.actions && (
                <div className="mt-3">
                  <h6>Recommended Actions:</h6>
                  <ul className="list-unstyled">
                    {insights.optimization.actions.map((action, index) => (
                      <li
                        key={index}
                        className="d-flex align-items-center mb-2"
                      >
                        <CheckCircleIcon className="h-4 w-4 text-success me-2" />
                        <small>{action}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Inventory Predictions */}
      {insights?.predictions?.products && (
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Header>
                <h5 className="mb-0">Stock Predictions & Recommendations</h5>
              </Card.Header>
              <Card.Body>
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Current Stock</th>
                      <th>Predicted Demand (30d)</th>
                      <th>Days Until Stockout</th>
                      <th>Reorder Point</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.predictions.products
                      .slice(0, 10)
                      .map((prediction, index) => (
                        <tr key={index}>
                          <td>
                            <div>
                              <strong>{prediction.name}</strong>
                              <br />
                              <small className="text-muted">
                                ID: {prediction.productId}
                              </small>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`fw-bold ${
                                prediction.currentStock <
                                prediction.reorderPoint
                                  ? "text-danger"
                                  : "text-success"
                              }`}
                            >
                              {prediction.currentStock}
                            </span>
                          </td>
                          <td>{prediction.predictedDemand}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <span
                                className={
                                  prediction.daysUntilStockout < 14
                                    ? "text-danger"
                                    : "text-success"
                                }
                              >
                                {prediction.daysUntilStockout}
                              </span>
                              <ClockIcon className="h-4 w-4 ms-1" />
                            </div>
                          </td>
                          <td>
                            <Badge bg="secondary">
                              {prediction.reorderPoint}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={getStatusVariant(prediction.status)}>
                              {prediction.status}
                            </Badge>
                          </td>
                          <td>
                            {prediction.currentStock <=
                              prediction.reorderPoint && (
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => {
                                  setSelectedProduct(prediction);
                                  setShowReorderModal(true);
                                }}
                              >
                                <ShoppingCartIcon className="h-4 w-4 me-1" />
                                Reorder
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Reorder Modal */}
      <Modal show={showReorderModal} onHide={() => setShowReorderModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reorder Product</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProduct && (
            <>
              <div className="mb-3">
                <h6>{selectedProduct.name}</h6>
                <small className="text-muted">
                  Product ID: {selectedProduct.productId}
                </small>
              </div>

              <Row className="mb-3">
                <Col sm={6}>
                  <strong>Current Stock:</strong>
                  <div className="text-danger">
                    {selectedProduct.currentStock}
                  </div>
                </Col>
                <Col sm={6}>
                  <strong>Recommended Reorder:</strong>
                  <div className="text-success">
                    {selectedProduct.reorderPoint}
                  </div>
                </Col>
              </Row>

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Reorder Quantity</Form.Label>
                  <Form.Control
                    type="number"
                    defaultValue={selectedProduct.reorderPoint}
                    min="1"
                  />
                  <Form.Text className="text-muted">
                    Recommended: {selectedProduct.reorderPoint} units
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Supplier</Form.Label>
                  <Form.Select>
                    <option>Select supplier...</option>
                    <option>Primary Supplier</option>
                    <option>Alternative Supplier</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Add any special instructions..."
                  />
                </Form.Group>
              </Form>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowReorderModal(false)}
          >
            Cancel
          </Button>
          <Button variant="primary">Create Purchase Order</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default InventoryInsights;
