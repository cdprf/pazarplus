import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Spinner, Alert, Form, InputGroup, Modal, Tabs, Tab } from 'react-bootstrap';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';

const ShippingManagement = () => {
  const [activeTab, setActiveTab] = useState('carriers');
  const [carriers, setCarriers] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCarrierModal, setShowCarrierModal] = useState(false);
  const [showCreateShipmentModal, setShowCreateShipmentModal] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [newCarrier, setNewCarrier] = useState({
    name: '',
    code: '',
    type: '',
    baseRate: '',
    apiEndpoint: '',
    apiKey: '',
    isActive: true
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    carrier: ''
  });

  const { showAlert } = useAlert();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      switch (activeTab) {
        case 'carriers':
          const carriersResponse = await api.getShippingCarriers();
          setCarriers(carriersResponse.data || []);
          break;
        case 'shipments':
          const shipmentsResponse = await api.getShipments(filters);
          setShipments(shipmentsResponse.data || []);
          break;
        case 'rates':
          const ratesResponse = await api.getShippingRates();
          setRates(ratesResponse.data || []);
          break;
        default:
          console.warn('Unknown tab:', activeTab);
          break;
      }
    } catch (error) {
      console.error('Failed to fetch shipping data:', error);
      showAlert('Failed to load shipping data', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters, showAlert]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateShipment = async (orderIds) => {
    try {
      setLoading(true);
      const response = await api.createShipment({ orderIds });
      if (response.success) {
        showAlert('Shipment created successfully!', 'success');
        setShowCreateShipmentModal(false);
        setSelectedOrders([]);
        fetchData();
      } else {
        throw new Error(response.message || 'Failed to create shipment');
      }
    } catch (error) {
      console.error('Failed to create shipment:', error);
      showAlert('Failed to create shipment: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCarrier = async () => {
    try {
      if (!newCarrier.name || !newCarrier.code || !newCarrier.type) {
        showAlert('Please fill in all required fields', 'warning');
        return;
      }

      setLoading(true);
      const response = await api.createShippingCarrier(newCarrier);
      if (response.success) {
        showAlert('Carrier added successfully!', 'success');
        setShowCarrierModal(false);
        setNewCarrier({
          name: '',
          code: '',
          type: '',
          baseRate: '',
          apiEndpoint: '',
          apiKey: '',
          isActive: true
        });
        fetchData();
      } else {
        throw new Error(response.message || 'Failed to add carrier');
      }
    } catch (error) {
      console.error('Failed to add carrier:', error);
      showAlert('Failed to add carrier: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      in_transit: 'info',
      delivered: 'success',
      cancelled: 'danger',
      returned: 'secondary'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status.replace('_', ' ')}</Badge>;
  };

  if (loading) {
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
              <h1>Shipping Management</h1>
              <p className="text-muted">Manage carriers, shipments, and shipping rates</p>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-primary">
                <i className="fas fa-truck me-2"></i>Track Shipment
              </Button>
              <Button variant="primary" onClick={() => setShowCreateShipmentModal(true)}>
                <i className="fas fa-plus me-2"></i>Create Shipment
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
            {/* Carriers Tab */}
            <Tab eventKey="carriers" title="Shipping Carriers">
              <Row className="mb-3">
                <Col md={6}>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Search carriers..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                    <Button variant="outline-secondary">
                      <i className="fas fa-search"></i>
                    </Button>
                  </InputGroup>
                </Col>
                <Col md={6} className="text-end">
                  <Button variant="primary" onClick={() => setShowCarrierModal(true)}>
                    <i className="fas fa-plus me-2"></i>Add Carrier
                  </Button>
                </Col>
              </Row>

              {carriers.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-truck display-4 text-muted mb-3"></i>
                  <h5 className="text-muted">No carriers configured</h5>
                  <p className="text-muted">Add shipping carriers to start managing shipments</p>
                  <Button variant="primary" onClick={() => setShowCarrierModal(true)}>
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
                      <th>Base Rate</th>
                      <th>Coverage</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carriers.map((carrier) => (
                      <tr key={carrier.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <img 
                              src={carrier.logo || '/api/placeholder/32/32'} 
                              alt={carrier.name}
                              className="me-2"
                              style={{ width: '32px', height: '32px' }}
                            />
                            <div>
                              <strong>{carrier.name}</strong>
                              <div className="text-muted small">{carrier.code}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge bg="info">{carrier.type}</Badge>
                        </td>
                        <td>
                          <Badge bg={carrier.isActive ? 'success' : 'secondary'}>
                            {carrier.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={carrier.apiConnected ? 'success' : 'danger'}>
                            {carrier.apiConnected ? 'Connected' : 'Disconnected'}
                          </Badge>
                        </td>
                        <td>${carrier.baseRate?.toFixed(2) || 'N/A'}</td>
                        <td>{carrier.coverage || 'Domestic'}</td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <Button variant="outline-primary" size="sm" title="Edit">
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button variant="outline-info" size="sm" title="Test API">
                              <i className="fas fa-plug"></i>
                            </Button>
                            <Button variant="outline-secondary" size="sm" title="Settings">
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
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                    <Button variant="outline-secondary">
                      <i className="fas fa-search"></i>
                    </Button>
                  </InputGroup>
                </Col>
                <Col md={3}>
                  <Form.Select 
                    value={filters.status} 
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
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
                    onChange={(e) => setFilters({...filters, carrier: e.target.value})}
                  >
                    <option value="">All Carriers</option>
                    {carriers.map(carrier => (
                      <option key={carrier.id} value={carrier.id}>{carrier.name}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Button variant="outline-secondary" className="w-100" onClick={fetchData}>
                    <i className="fas fa-sync-alt me-2"></i>Refresh
                  </Button>
                </Col>
              </Row>

              {shipments.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-shipping-fast display-4 text-muted mb-3"></i>
                  <h5 className="text-muted">No shipments found</h5>
                  <p className="text-muted">Create shipments from orders to track deliveries</p>
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
                            <small className="text-muted">{shipment.shippingAddress?.city}</small>
                          </div>
                        </td>
                        <td>
                          <Badge bg="secondary">{shipment.carrierName}</Badge>
                        </td>
                        <td>
                          {getStatusBadge(shipment.status)}
                        </td>
                        <td>
                          {shipment.shipDate ? formatDate(shipment.shipDate) : '-'}
                        </td>
                        <td>
                          {shipment.estimatedDelivery ? formatDate(shipment.estimatedDelivery) : '-'}
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <Button variant="outline-primary" size="sm" title="Track">
                              <i className="fas fa-map-marker-alt"></i>
                            </Button>
                            <Button variant="outline-info" size="sm" title="Update">
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button variant="outline-secondary" size="sm" title="Label">
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
                    Shipping rates are automatically calculated based on carrier settings and destination.
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
                          <h4 className="text-primary">${rate.price?.toFixed(2)}</h4>
                          <small className="text-muted">
                            Delivery: {rate.estimatedDays} business days
                          </small>
                        </div>
                        <div className="mb-2">
                          <small className="text-muted">Weight limit: {rate.weightLimit}kg</small>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted">Coverage: {rate.coverage}</small>
                        </div>
                        <Button variant="outline-primary" size="sm" className="w-100">
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
                  <p className="text-muted">Configure carriers to see shipping rates</p>
                </div>
              )}
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* Enhanced Add Carrier Modal */}
      <Modal show={showCarrierModal} onHide={() => setShowCarrierModal(false)} size="lg">
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
                    onChange={(e) => setNewCarrier({...newCarrier, name: e.target.value})}
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
                    onChange={(e) => setNewCarrier({...newCarrier, code: e.target.value.toUpperCase()})}
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
                    onChange={(e) => setNewCarrier({...newCarrier, type: e.target.value})}
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
                    onChange={(e) => setNewCarrier({...newCarrier, baseRate: e.target.value})}
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
                onChange={(e) => setNewCarrier({...newCarrier, apiEndpoint: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>API Key (Optional)</Form.Label>
              <Form.Control 
                type="password" 
                placeholder="Enter API key for rate calculations"
                value={newCarrier.apiKey}
                onChange={(e) => setNewCarrier({...newCarrier, apiKey: e.target.value})}
              />
            </Form.Group>
            <Form.Check
              type="switch"
              id="carrier-active"
              label="Set as active carrier"
              checked={newCarrier.isActive}
              onChange={(e) => setNewCarrier({...newCarrier, isActive: e.target.checked})}
              className="mb-3"
            />
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCarrierModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddCarrier} disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Adding...
              </>
            ) : (
              'Add Carrier'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Create Shipment Modal */}
      <Modal show={showCreateShipmentModal} onHide={() => setShowCreateShipmentModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Shipment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <i className="fas fa-info-circle me-2"></i>
            Select orders to create shipments. Orders must be in 'paid' status to be eligible for shipping.
          </Alert>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Order IDs (comma-separated)</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., ORD-001, ORD-002, ORD-003"
                value={selectedOrders.join(', ')}
                onChange={(e) => setSelectedOrders(e.target.value.split(',').map(id => id.trim()).filter(id => id))}
              />
              <Form.Text className="text-muted">
                Enter order IDs separated by commas
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Carrier</Form.Label>
              <Form.Select required>
                <option value="">Select carrier...</option>
                {carriers.filter(c => c.isActive).map(carrier => (
                  <option key={carrier.id} value={carrier.id}>{carrier.name}</option>
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
          <Button variant="secondary" onClick={() => setShowCreateShipmentModal(false)}>
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
              'Create Shipment'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ShippingManagement;