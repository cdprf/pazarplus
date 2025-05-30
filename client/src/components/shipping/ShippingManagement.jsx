import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Spinner,
  Alert,
  Form,
  InputGroup,
  Modal,
  Tabs,
  Tab,
} from "react-bootstrap";
import api from "../../services/api";
import { useAlert } from "../../contexts/AlertContext";

const ShippingManagement = () => {
  const [activeTab, setActiveTab] = useState("carriers");
  const [carriers, setCarriers] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCarrierModal, setShowCarrierModal] = useState(false);
  const [showCreateShipmentModal, setShowCreateShipmentModal] = useState(false);
  const [showRateComparisonModal, setShowRateComparisonModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [trackingData, setTrackingData] = useState(null);

  const [newCarrier, setNewCarrier] = useState({
    name: "",
    code: "",
    type: "",
    baseRate: "",
    apiEndpoint: "",
    apiKey: "",
    isActive: true,
  });

  // Enhanced package info with Turkish carrier requirements
  const [packageInfo, setPackageInfo] = useState({
    weight: 1000, // in grams
    dimensions: { length: 20, width: 15, height: 10 }, // in cm
    declaredValue: 100, // in TRY
    serviceType: "STANDARD",
    description: "E-commerce shipment",
    quantity: 1,
  });

  // Turkish address format
  const [fromAddress, setFromAddress] = useState({
    name: "Satıcı A.Ş.",
    address1: "Maslak Mahallesi Eski Büyükdere Cad. No:1",
    city: "İstanbul",
    district: "Sarıyer",
    postalCode: "34485",
    phone: "+905551234567",
    email: "info@seller.com",
  });

  const [toAddress, setToAddress] = useState({
    name: "Müşteri Adı",
    address1: "Kızılay Mahallesi Atatürk Bulvarı No:123",
    city: "Ankara",
    district: "Çankaya",
    postalCode: "06420",
    phone: "+905559876543",
    email: "customer@example.com",
  });

  const [trackingInfo, setTrackingInfo] = useState({
    trackingNumber: "",
    carrier: "",
  });

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    carrier: "",
  });

  const { showAlert } = useAlert();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      switch (activeTab) {
        case "carriers":
          const carriersResponse = await api.get("/api/shipping/carriers");
          if (carriersResponse.data.success) {
            setCarriers(carriersResponse.data.data || []);
          }
          break;
        case "shipments":
          const shipmentsResponse = await api.get("/api/shipping/shipments", {
            params: filters,
          });
          if (shipmentsResponse.data.success) {
            setShipments(shipmentsResponse.data.data || []);
          }
          break;
        case "rates":
          // Keep existing rates or fetch new ones
          break;
        default:
          console.warn("Unknown tab:", activeTab);
          break;
      }
    } catch (error) {
      console.error("Failed to fetch shipping data:", error);
      showAlert("Failed to load shipping data", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters, showAlert]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Enhanced rate comparison with Turkish carriers
  const compareRates = async () => {
    setLoading(true);
    setRates([]);

    try {
      const response = await api.post("/api/shipping/rates", {
        packageInfo,
        fromAddress,
        toAddress,
        carriers: null, // Compare all carriers
      });

      if (response.data.success) {
        setRates(response.data.data.carriers || []);
        setShowRateComparisonModal(true);
      } else {
        showAlert(
          response.data.error?.message || "Failed to get rates",
          "error"
        );
      }
    } catch (error) {
      showAlert("Rate comparison failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Enhanced label creation
  const createShippingLabel = async (carrier, rate) => {
    setLoading(true);

    try {
      const shipmentData = {
        packageInfo: {
          ...packageInfo,
          serviceType: rate.serviceCode,
        },
        fromAddress,
        toAddress,
        orderInfo: {
          orderNumber: `ORD-${Date.now()}`,
        },
      };

      const response = await api.post("/api/shipping/labels", {
        shipmentData,
        carrier,
      });

      if (response.data.success) {
        const { trackingNumber } = response.data.data;
        showAlert(
          `Label created successfully! Tracking Number: ${trackingNumber}`,
          "success"
        );

        setTrackingInfo({ trackingNumber, carrier });
        setShowRateComparisonModal(false);
        fetchData(); // Refresh data
      } else {
        showAlert(
          response.data.error?.message || "Failed to create label",
          "error"
        );
      }
    } catch (error) {
      showAlert("Label creation failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Enhanced tracking with detailed history
  const trackPackage = async (trackingNumber = null, carrier = null) => {
    const trackNum = trackingNumber || trackingInfo.trackingNumber;
    const trackCarrier = carrier || trackingInfo.carrier;

    if (!trackNum || !trackCarrier) {
      showAlert("Please enter tracking number and select carrier", "warning");
      return;
    }

    setLoading(true);

    try {
      const response = await api.get(
        `/api/shipping/track/${trackCarrier}/${trackNum}`
      );

      if (response.data.success) {
        setTrackingData(response.data.data);
        setShowTrackingModal(true);
        showAlert(
          "Package tracking information retrieved successfully",
          "success"
        );
      } else {
        showAlert(
          "Failed to track package: " + response.data.error?.message,
          "error"
        );
      }
    } catch (error) {
      showAlert("Tracking failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Fix the missing handleTrackPackage function
  const handleTrackPackage = async (trackingNumber, carrier) => {
    return trackPackage(trackingNumber, carrier);
  };

  const handleCreateShipment = async (orderIds) => {
    try {
      setLoading(true);
      const response = await api.post("/api/shipping/labels/create", {
        orderIds,
        carrier: "auto",
      });
      if (response.data.success) {
        showAlert("Shipment created successfully!", "success");
        setShowCreateShipmentModal(false);
        setSelectedOrders([]);
        fetchData();
      } else {
        throw new Error(
          response.data.error?.message || "Failed to create shipment"
        );
      }
    } catch (error) {
      console.error("Failed to create shipment:", error);
      showAlert("Failed to create shipment: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCarrier = async () => {
    try {
      if (!newCarrier.name || !newCarrier.code || !newCarrier.type) {
        showAlert("Please fill in all required fields", "warning");
        return;
      }

      setLoading(true);
      const response = await api.post("/api/shipping/carriers", newCarrier);
      if (response.data.success) {
        showAlert("Carrier added successfully!", "success");
        setShowCarrierModal(false);
        setNewCarrier({
          name: "",
          code: "",
          type: "",
          baseRate: "",
          apiEndpoint: "",
          apiKey: "",
          isActive: true,
        });
        fetchData();
      } else {
        throw new Error(
          response.data.error?.message || "Failed to add carrier"
        );
      }
    } catch (error) {
      console.error("Failed to add carrier:", error);
      showAlert("Failed to add carrier: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTestCarrier = async (carrierCode) => {
    try {
      setLoading(true);
      const response = await api.post("/api/shipping/carriers/validate", {
        carrier: carrierCode,
      });

      if (response.data.success) {
        showAlert(`${carrierCode} API connection successful!`, "success");
      } else {
        showAlert(
          `${carrierCode} API connection failed: ${response.data.error?.message}`,
          "error"
        );
      }
    } catch (error) {
      showAlert(`Failed to test ${carrierCode}: ` + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: "warning",
      picked_up: "info",
      in_transit: "primary",
      out_for_delivery: "warning",
      delivered: "success",
      cancelled: "danger",
      returned: "secondary",
    };
    return (
      <Badge bg={variants[status] || "secondary"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  // Enhanced getStatusColor function for timeline tracking
  const getStatusColor = (status) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      picked_up: "bg-blue-100 text-blue-800",
      in_transit: "bg-purple-100 text-purple-800",
      out_for_delivery: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      returned: "bg-gray-100 text-gray-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  // Enhanced carrier selection handler
  const handleCarrierSelection = (carrierCode) => {
    console.log("Selected carrier:", carrierCode);
    // This function can be used for future carrier-specific operations
  };

  if (loading && activeTab !== "rates") {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading shipping data...</span>
          </Spinner>
          <p className="mt-2">Loading shipping information...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1>Turkish Shipping Management</h1>
              <p className="text-muted">
                Manage carriers, shipments, rates and tracking for Turkish
                logistics
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-primary"
                onClick={() => setShowRateComparisonModal(true)}
              >
                <i className="fas fa-calculator me-2"></i>Compare Rates
              </Button>
              <Button
                variant="outline-info"
                onClick={() => setShowTrackingModal(true)}
              >
                <i className="fas fa-search-location me-2"></i>Track Package
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowCreateShipmentModal(true)}
              >
                <i className="fas fa-plus me-2"></i>Create Shipment
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
            {/* Enhanced Carriers Tab */}
            <Tab eventKey="carriers" title="Turkish Carriers">
              <Row className="mb-3">
                <Col md={6}>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Search carriers..."
                      value={filters.search}
                      onChange={(e) =>
                        setFilters({ ...filters, search: e.target.value })
                      }
                    />
                    <Button variant="outline-secondary">
                      <i className="fas fa-search"></i>
                    </Button>
                  </InputGroup>
                </Col>
                <Col md={6} className="text-end">
                  <Button
                    variant="primary"
                    onClick={() => setShowCarrierModal(true)}
                  >
                    <i className="fas fa-plus me-2"></i>Add Carrier
                  </Button>
                </Col>
              </Row>

              {carriers.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-truck display-4 text-muted mb-3"></i>
                  <h5 className="text-muted">No Turkish carriers configured</h5>
                  <p className="text-muted">
                    Add Turkish shipping carriers like Aras Kargo, Yurtiçi
                    Kargo, MNG Kargo
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setShowCarrierModal(true)}
                  >
                    <i className="fas fa-plus me-2"></i>Add Your First Carrier
                  </Button>
                </div>
              ) : (
                <Table responsive hover>
                  <thead className="table-light">
                    <tr>
                      <th>Carrier</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>API Status</th>
                      <th>Coverage</th>
                      <th>Est. Cost</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carriers.map((carrier) => (
                      <tr key={carrier.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <img
                              src={carrier.logo || "/api/placeholder/32/32"}
                              alt={carrier.name}
                              className="me-2"
                              style={{ width: "32px", height: "32px" }}
                            />
                            <div>
                              <strong>{carrier.name}</strong>
                              <div className="text-muted small">
                                {carrier.code}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge bg="info">{carrier.type}</Badge>
                        </td>
                        <td>
                          <Badge
                            bg={carrier.isActive ? "success" : "secondary"}
                          >
                            {carrier.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td>
                          <Badge
                            bg={
                              carrier.features?.includes("api")
                                ? "success"
                                : "warning"
                            }
                          >
                            {carrier.features?.includes("api")
                              ? "API Available"
                              : "Manual"}
                          </Badge>
                        </td>
                        <td>{carrier.coverage || "Turkey"}</td>
                        <td>₺{carrier.estimatedCost || "Variable"}</td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              title="Edit"
                              onClick={() =>
                                handleCarrierSelection(carrier.code)
                              }
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                            {carrier.features?.includes("api") && (
                              <Button
                                variant="outline-info"
                                size="sm"
                                title="Test API"
                                onClick={() => handleTestCarrier(carrier.code)}
                                disabled={loading}
                              >
                                <i className="fas fa-plug"></i>
                              </Button>
                            )}
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              title="Settings"
                            >
                              <i className="fas fa-cog"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Tab>

            {/* Shipments Tab */}
            <Tab eventKey="shipments" title="Active Shipments">
              <Row className="mb-3">
                <Col md={4}>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Search shipments..."
                      value={filters.search}
                      onChange={(e) =>
                        setFilters({ ...filters, search: e.target.value })
                      }
                    />
                    <Button variant="outline-secondary">
                      <i className="fas fa-search"></i>
                    </Button>
                  </InputGroup>
                </Col>
                <Col md={3}>
                  <Form.Select
                    value={filters.status}
                    onChange={(e) =>
                      setFilters({ ...filters, status: e.target.value })
                    }
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Select
                    value={filters.carrier}
                    onChange={(e) =>
                      setFilters({ ...filters, carrier: e.target.value })
                    }
                  >
                    <option value="">All Carriers</option>
                    {carriers.map((carrier) => (
                      <option key={carrier.id} value={carrier.id}>
                        {carrier.name}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Button
                    variant="outline-secondary"
                    className="w-100"
                    onClick={fetchData}
                  >
                    <i className="fas fa-sync-alt me-2"></i>Refresh
                  </Button>
                </Col>
              </Row>

              {shipments.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-shipping-fast display-4 text-muted mb-3"></i>
                  <h5 className="text-muted">No shipments found</h5>
                  <p className="text-muted">
                    Create shipments from orders to track deliveries
                  </p>
                </div>
              ) : (
                <Table responsive hover>
                  <thead className="table-light">
                    <tr>
                      <th>Tracking #</th>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Carrier</th>
                      <th>Status</th>
                      <th>Ship Date</th>
                      <th>Est. Delivery</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map((shipment) => (
                      <tr key={shipment.id}>
                        <td>
                          <strong>{shipment.trackingNumber}</strong>
                        </td>
                        <td>{shipment.orderNumber}</td>
                        <td>
                          <div>
                            <div>{shipment.customerName}</div>
                            <small className="text-muted">
                              {shipment.shippingAddress?.city}
                            </small>
                          </div>
                        </td>
                        <td>
                          <Badge bg="secondary">{shipment.carrierName}</Badge>
                        </td>
                        <td>{getStatusBadge(shipment.status)}</td>
                        <td>
                          {shipment.shipDate
                            ? formatDate(shipment.shipDate)
                            : "-"}
                        </td>
                        <td>
                          {shipment.estimatedDelivery
                            ? formatDate(shipment.estimatedDelivery)
                            : "-"}
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              title="Track"
                              onClick={() =>
                                handleTrackPackage(
                                  shipment.trackingNumber,
                                  shipment.carrier
                                )
                              }
                            >
                              <i className="fas fa-map-marker-alt"></i>
                            </Button>
                            <Button
                              variant="outline-info"
                              size="sm"
                              title="Update"
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              title="Label"
                            >
                              <i className="fas fa-print"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Tab>

            {/* Shipping Rates Tab */}
            <Tab eventKey="rates" title="Shipping Rates">
              <Row className="mb-3">
                <Col md={8}>
                  <Alert variant="info">
                    <i className="fas fa-info-circle me-2"></i>
                    Shipping rates are automatically calculated based on carrier
                    settings and destination.
                  </Alert>
                </Col>
                <Col md={4} className="text-end">
                  <Button variant="primary">
                    <i className="fas fa-calculator me-2"></i>Calculate Rate
                  </Button>
                </Col>
              </Row>

              <Row className="g-4">
                {rates.map((rate, index) => (
                  <Col md={6} lg={4} key={index}>
                    <Card className="h-100">
                      <Card.Header className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">{rate.carrierName}</h6>
                        <Badge bg="primary">{rate.serviceType}</Badge>
                      </Card.Header>
                      <Card.Body>
                        <div className="mb-3">
                          <h4 className="text-primary">
                            ${rate.price?.toFixed(2)}
                          </h4>
                          <small className="text-muted">
                            Delivery: {rate.estimatedDays} business days
                          </small>
                        </div>
                        <div className="mb-2">
                          <small className="text-muted">
                            Weight limit: {rate.weightLimit}kg
                          </small>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted">
                            Coverage: {rate.coverage}
                          </small>
                        </div>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="w-100"
                        >
                          Select Rate
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>

              {rates.length === 0 && (
                <div className="text-center py-5">
                  <i className="fas fa-calculator display-4 text-muted mb-3"></i>
                  <h5 className="text-muted">No rates available</h5>
                  <p className="text-muted">
                    Configure carriers to see shipping rates
                  </p>
                </div>
              )}
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* Enhanced Add Carrier Modal */}
      <Modal
        show={showCarrierModal}
        onHide={() => setShowCarrierModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Add Shipping Carrier</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Carrier Name *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., FedEx, UPS, DHL"
                    value={newCarrier.name}
                    onChange={(e) =>
                      setNewCarrier({ ...newCarrier, name: e.target.value })
                    }
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Carrier Code *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., FEDEX, UPS, DHL"
                    value={newCarrier.code}
                    onChange={(e) =>
                      setNewCarrier({
                        ...newCarrier,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Carrier Type *</Form.Label>
                  <Form.Select
                    value={newCarrier.type}
                    onChange={(e) =>
                      setNewCarrier({ ...newCarrier, type: e.target.value })
                    }
                    required
                  >
                    <option value="">Select type...</option>
                    <option value="express">Express</option>
                    <option value="standard">Standard</option>
                    <option value="economy">Economy</option>
                    <option value="freight">Freight</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Base Rate ($)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newCarrier.baseRate}
                    onChange={(e) =>
                      setNewCarrier({ ...newCarrier, baseRate: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>API Endpoint (Optional)</Form.Label>
              <Form.Control
                type="url"
                placeholder="https://api.carrier.com/v1"
                value={newCarrier.apiEndpoint}
                onChange={(e) =>
                  setNewCarrier({ ...newCarrier, apiEndpoint: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>API Key (Optional)</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter API key for rate calculations"
                value={newCarrier.apiKey}
                onChange={(e) =>
                  setNewCarrier({ ...newCarrier, apiKey: e.target.value })
                }
              />
            </Form.Group>
            <Form.Check
              type="switch"
              id="carrier-active"
              label="Set as active carrier"
              checked={newCarrier.isActive}
              onChange={(e) =>
                setNewCarrier({ ...newCarrier, isActive: e.target.checked })
              }
              className="mb-3"
            />
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowCarrierModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAddCarrier}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Adding...
              </>
            ) : (
              "Add Carrier"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Create Shipment Modal */}
      <Modal
        show={showCreateShipmentModal}
        onHide={() => setShowCreateShipmentModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Create New Shipment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <i className="fas fa-info-circle me-2"></i>
            Select orders to create shipments. Orders must be in 'paid' status
            to be eligible for shipping.
          </Alert>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Order IDs (comma-separated)</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., ORD-001, ORD-002, ORD-003"
                value={selectedOrders.join(", ")}
                onChange={(e) =>
                  setSelectedOrders(
                    e.target.value
                      .split(",")
                      .map((id) => id.trim())
                      .filter((id) => id)
                  )
                }
              />
              <Form.Text className="text-muted">
                Enter order IDs separated by commas
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Carrier</Form.Label>
              <Form.Select required>
                <option value="">Select carrier...</option>
                {carriers
                  .filter((c) => c.isActive)
                  .map((carrier) => (
                    <option key={carrier.id} value={carrier.id}>
                      {carrier.name}
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Service Type</Form.Label>
              <Form.Select>
                <option value="standard">Standard</option>
                <option value="express">Express</option>
                <option value="overnight">Overnight</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowCreateShipmentModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => handleCreateShipment(selectedOrders)}
            disabled={loading || selectedOrders.length === 0}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Creating...
              </>
            ) : (
              "Create Shipment"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Enhanced Rate Comparison Modal */}
      <Modal
        show={showRateComparisonModal}
        onHide={() => setShowRateComparisonModal(false)}
        size="xl"
      >
        <Modal.Header closeButton>
          <Modal.Title>Turkish Shipping Rate Comparison</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <h5>Package & Address Details</h5>

              {/* Package Information */}
              <Card className="mb-3">
                <Card.Header>Package Information</Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Weight (grams)</Form.Label>
                        <Form.Control
                          type="number"
                          value={packageInfo.weight}
                          onChange={(e) =>
                            setPackageInfo((prev) => ({
                              ...prev,
                              weight: parseInt(e.target.value),
                            }))
                          }
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Declared Value (₺)</Form.Label>
                        <Form.Control
                          type="number"
                          value={packageInfo.declaredValue}
                          onChange={(e) =>
                            setPackageInfo((prev) => ({
                              ...prev,
                              declaredValue: parseFloat(e.target.value),
                            }))
                          }
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Length (cm)</Form.Label>
                        <Form.Control
                          type="number"
                          value={packageInfo.dimensions.length}
                          onChange={(e) =>
                            setPackageInfo((prev) => ({
                              ...prev,
                              dimensions: {
                                ...prev.dimensions,
                                length: parseInt(e.target.value),
                              },
                            }))
                          }
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Width (cm)</Form.Label>
                        <Form.Control
                          type="number"
                          value={packageInfo.dimensions.width}
                          onChange={(e) =>
                            setPackageInfo((prev) => ({
                              ...prev,
                              dimensions: {
                                ...prev.dimensions,
                                width: parseInt(e.target.value),
                              },
                            }))
                          }
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Height (cm)</Form.Label>
                        <Form.Control
                          type="number"
                          value={packageInfo.dimensions.height}
                          onChange={(e) =>
                            setPackageInfo((prev) => ({
                              ...prev,
                              dimensions: {
                                ...prev.dimensions,
                                height: parseInt(e.target.value),
                              },
                            }))
                          }
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Address Information */}
              <Card className="mb-3">
                <Card.Header>Address Information</Card.Header>
                <Card.Body>
                  <h6>From Address (Gönderici)</h6>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label>City</Form.Label>
                        <Form.Control
                          value={fromAddress.city}
                          onChange={(e) =>
                            setFromAddress((prev) => ({
                              ...prev,
                              city: e.target.value,
                            }))
                          }
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label>District</Form.Label>
                        <Form.Control
                          value={fromAddress.district}
                          onChange={(e) =>
                            setFromAddress((prev) => ({
                              ...prev,
                              district: e.target.value,
                            }))
                          }
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <h6 className="mt-3">To Address (Alıcı)</h6>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label>City</Form.Label>
                        <Form.Control
                          value={toAddress.city}
                          onChange={(e) =>
                            setToAddress((prev) => ({
                              ...prev,
                              city: e.target.value,
                            }))
                          }
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label>District</Form.Label>
                        <Form.Control
                          value={toAddress.district}
                          onChange={(e) =>
                            setToAddress((prev) => ({
                              ...prev,
                              district: e.target.value,
                            }))
                          }
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Button
                onClick={compareRates}
                disabled={loading}
                className="w-100"
                variant="primary"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Comparing Rates...
                  </>
                ) : (
                  "Compare Turkish Carrier Rates"
                )}
              </Button>
            </Col>

            <Col md={6}>
              <h5>Rate Comparison Results</h5>
              {rates.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="fas fa-calculator display-4 mb-3"></i>
                  <p>
                    Fill in package details and click "Compare Rates" to see
                    available options.
                  </p>
                </div>
              ) : (
                <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                  {rates.map((carrier, index) => (
                    <Card key={index} className="mb-3">
                      <Card.Header className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">{carrier.carrierName}</h6>
                        <Badge bg={carrier.success ? "success" : "danger"}>
                          {carrier.success ? "Available" : "Error"}
                        </Badge>
                      </Card.Header>
                      <Card.Body>
                        {carrier.success ? (
                          <div>
                            {carrier.rates.map((rate, rateIndex) => (
                              <div
                                key={rateIndex}
                                className="d-flex justify-content-between align-items-center p-2 border rounded mb-2"
                              >
                                <div>
                                  <strong>{rate.serviceName}</strong>
                                  <div className="small text-muted">
                                    {rate.estimatedDeliveryDays} gün •{" "}
                                    {rate.features?.join(", ")}
                                  </div>
                                </div>
                                <div className="text-end">
                                  <div className="h5 text-primary mb-1">
                                    ₺{rate.price}
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      createShippingLabel(carrier.carrier, rate)
                                    }
                                    disabled={loading}
                                  >
                                    Create Label
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-danger">
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            {carrier.error}
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowRateComparisonModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Enhanced Tracking Modal */}
      <Modal
        show={showTrackingModal}
        onHide={() => setShowTrackingModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Package Tracking</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Card>
                <Card.Header>Track Package</Card.Header>
                <Card.Body>
                  <Form.Group className="mb-3">
                    <Form.Label>Tracking Number</Form.Label>
                    <Form.Control
                      value={trackingInfo.trackingNumber}
                      onChange={(e) =>
                        setTrackingInfo((prev) => ({
                          ...prev,
                          trackingNumber: e.target.value,
                        }))
                      }
                      placeholder="Enter tracking number"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Carrier</Form.Label>
                    <Form.Select
                      value={trackingInfo.carrier}
                      onChange={(e) =>
                        setTrackingInfo((prev) => ({
                          ...prev,
                          carrier: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select Carrier</option>
                      {carriers.map((carrier) => (
                        <option key={carrier.code} value={carrier.code}>
                          {carrier.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Button
                    onClick={() => trackPackage()}
                    disabled={
                      loading ||
                      !trackingInfo.trackingNumber ||
                      !trackingInfo.carrier
                    }
                    className="w-100"
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Tracking...
                      </>
                    ) : (
                      "Track Package"
                    )}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Header>Tracking Information</Card.Header>
                <Card.Body style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {!trackingData ? (
                    <div className="text-center text-muted py-4">
                      <i className="fas fa-search-location display-4 mb-3"></i>
                      <p>
                        Enter tracking number and select carrier to track your
                        package.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {/* Current Status */}
                      <div
                        className="border rounded p-3 mb-3"
                        style={{ backgroundColor: "#f8f9fa" }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6>Current Status</h6>
                          {getStatusBadge(trackingData.status)}
                        </div>
                        <div className="small">
                          <div>
                            <strong>Tracking:</strong>{" "}
                            {trackingData.trackingNumber}
                          </div>
                          <div>
                            <strong>Carrier:</strong> {trackingData.carrierName}
                          </div>
                          {trackingData.estimatedDeliveryDate && (
                            <div>
                              <strong>Est. Delivery:</strong>{" "}
                              {formatDate(trackingData.estimatedDeliveryDate)}
                            </div>
                          )}
                          {trackingData.currentLocation && (
                            <div>
                              <strong>Location:</strong>{" "}
                              {trackingData.currentLocation.city} -{" "}
                              {trackingData.currentLocation.facility}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tracking Events */}
                      {trackingData.events &&
                        trackingData.events.length > 0 && (
                          <div>
                            <h6>Tracking History</h6>
                            <div className="timeline">
                              {trackingData.events.map((event, index) => (
                                <div key={index} className="d-flex mb-3">
                                  <div className="me-3">
                                    <div
                                      className="rounded-circle d-flex align-items-center justify-content-center"
                                      style={{
                                        width: "12px",
                                        height: "12px",
                                        backgroundColor:
                                          event.status === "delivered"
                                            ? "#28a745"
                                            : "#6c757d",
                                      }}
                                    ></div>
                                  </div>
                                  <div className="flex-grow-1">
                                    <div className="d-flex justify-content-between">
                                      <strong className="small">
                                        {event.description}
                                      </strong>
                                      <span className="small text-muted">
                                        {event.date && event.time
                                          ? new Date(
                                              `${event.date} ${event.time}`
                                            ).toLocaleString("tr-TR")
                                          : "N/A"}
                                      </span>
                                    </div>
                                    {event.location && (
                                      <div className="small text-muted">
                                        {event.location}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowTrackingModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ShippingManagement;
