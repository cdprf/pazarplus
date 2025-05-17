/* eslint-disable no-unused-vars */
// src/client/components/OrderDashboard.jsx

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Badge, 
  Dropdown, 
  Button, 
  Card, 
  Form, 
  Row, 
  Col, 
  Pagination,
  Modal,
  Spinner,
  Alert
} from 'react-bootstrap';
import { Search, Filter, Calendar, Box, Truck, X, Download, ArrowClockwise } from 'react-bootstrap-icons';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const OrderDashboard = () => {
  // State
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  
  // Modal states
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [carriers, setCarriers] = useState([]);
  const [cancelReason, setCancelReason] = useState('');
  
  // Fetch orders with pagination and filters
  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let params = {
        page,
        size,
        sortBy: 'orderDate',
        sortOrder: 'DESC'
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (statusFilter) {
        params.status = statusFilter;
      }
      
      if (platformFilter) {
        params.platform = platformFilter;
      }
      
      if (startDate) {
        params.startDate = startDate.toISOString();
      }
      
      if (endDate) {
        params.endDate = endDate.toISOString();
      }
      
      const response = await axios.get('/api/orders', { params });
      
      if (response.data.success) {
        setOrders(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
        setTotalElements(response.data.pagination.totalElements);
        setSelectedOrders([]);
        setSelectAll(false);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError('Failed to fetch orders. Please try again later.');
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [page, size, searchTerm, statusFilter, platformFilter, startDate, endDate]);

  // Initial data fetch
  useEffect(() => {
    fetchCarriers();
    fetchOrders();
  }, [page, size, statusFilter, platformFilter, startDate, endDate, fetchOrders]);
  
  // Fetch carrier list
  const fetchCarriers = async () => {
    try {
      const response = await axios.get('/api/shipping/carriers');
      if (response.data.success) {
        setCarriers(response.data.data);
        if (response.data.data.length > 0) {
          setCarrier(response.data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch carriers:', error);
    }
  };
  
  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0); // Reset to first page on new search
    fetchOrders();
  };
  
  // Handle order selection
  const handleSelect = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };
  
  // Handle select all orders
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order.id));
    }
    setSelectAll(!selectAll);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPlatformFilter('');
    setStartDate(null);
    setEndDate(null);
    setPage(0);
  };
  
  // Mark selected orders as shipped
  const handleMarkAsShipped = async () => {
    if (selectedOrders.length === 0) {
      setModalError('Please select at least one order');
      return;
    }
    
    if (!trackingNumber || !carrier) {
      setModalError('Tracking number and carrier are required');
      return;
    }
    
    setModalLoading(true);
    setModalError(null);
    
    try {
      const response = await axios.post('/api/shipping/mark-shipped', {
        orderIds: selectedOrders,
        trackingNumber,
        carrier,
        shippingDate: new Date().toISOString()
      });
      
      if (response.data.success) {
        setShowShippingModal(false);
        setTrackingNumber('');
        fetchOrders(); // Refresh orders
      } else {
        setModalError(response.data.message);
      }
    } catch (error) {
      setModalError('Failed to mark orders as shipped');
      console.error('Error marking orders as shipped:', error);
    } finally {
      setModalLoading(false);
    }
  };
  
  // Generate shipping labels for selected orders
  const handleGenerateLabels = async () => {
    if (selectedOrders.length === 0) {
      setModalError('Please select at least one order');
      return;
    }
    
    if (!carrier) {
      setModalError('Please select a carrier');
      return;
    }
    
    setModalLoading(true);
    setModalError(null);
    
    try {
      const response = await axios.post('/api/shipping/labels/bulk', {
        orderIds: selectedOrders,
        carrier
      });
      
      if (response.data.success) {
        // Open the PDF in a new tab
        window.open(response.data.data.labelUrl, '_blank');
        setShowLabelModal(false);
        fetchOrders(); // Refresh orders
      } else {
        setModalError(response.data.message);
      }
    } catch (error) {
      setModalError('Failed to generate shipping labels');
      console.error('Error generating labels:', error);
    } finally {
      setModalLoading(false);
    }
  };
  
  // Cancel selected orders
  const handleCancelOrders = async () => {
    if (selectedOrders.length === 0) {
      setModalError('Please select at least one order');
      return;
    }
    
    setModalLoading(true);
    setModalError(null);
    
    try {
      const response = await axios.post('/api/orders/process/cancel', {
        orderIds: selectedOrders,
        reason: cancelReason
      });
      
      if (response.data.success) {
        setShowCancelModal(false);
        setCancelReason('');
        fetchOrders(); // Refresh orders
      } else {
        setModalError(response.data.message);
      }
    } catch (error) {
      setModalError('Failed to cancel orders');
      console.error('Error cancelling orders:', error);
    } finally {
      setModalLoading(false);
    }
  };
  
  // Get status badge color
  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return 'primary';
      case 'processing':
        return 'info';
      case 'shipped':
        return 'success';
      case 'delivered':
        return 'secondary';
      case 'cancelled':
        return 'danger';
      case 'returned':
        return 'warning';
      case 'failed':
        return 'dark';
      default:
        return 'light';
    }
  };
  
  // Get platform badge color
  const getPlatformBadge = (platform) => {
    switch (platform) {
      case 'trendyol':
        return 'warning';
      case 'hepsiburada':
        return 'danger';
      case 'n11':
        return 'success';
      default:
        return 'info';
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Render pagination
  const renderPagination = () => {
    const pages = [];
    
    // Add first page
    pages.push(
      <Pagination.Item 
        key={0} 
        active={page === 0} 
        onClick={() => setPage(0)}
      >
        1
      </Pagination.Item>
    );
    
    // Add ellipsis if needed
    if (page > 3) {
      pages.push(<Pagination.Ellipsis key="ellipsis1" />);
    }
    
    // Add pages around current page
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) {
      pages.push(
        <Pagination.Item 
          key={i} 
          active={page === i} 
          onClick={() => setPage(i)}
        >
          {i + 1}
        </Pagination.Item>
      );
    }
    
    // Add ellipsis if needed
    if (page < totalPages - 4) {
      pages.push(<Pagination.Ellipsis key="ellipsis2" />);
    }
    
    // Add last page if we have more than one page
    if (totalPages > 1) {
      pages.push(
        <Pagination.Item 
          key={totalPages - 1} 
          active={page === totalPages - 1} 
          onClick={() => setPage(totalPages - 1)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }
    
    return (
      <Pagination>
        <Pagination.Prev 
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
        />
        {pages}
        <Pagination.Next 
          onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
          disabled={page === totalPages - 1 || totalPages === 0}
        />
      </Pagination>
    );
  };

  return (
    <div className="order-dashboard">
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Order Dashboard</h5>
          <div>
            <Button 
              variant="outline-primary" 
              className="me-2"
              onClick={() => fetchOrders()}
            >
              <ArrowClockwise /> Refresh
            </Button>
            <Button 
              variant="primary"
              onClick={() => {
                // Implement sync all platforms here
                alert('Sync feature will be implemented in the next version');
              }}
            >
              Sync Orders
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleSearch}>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Search</Form.Label>
                  <div className="input-group">
                    <Form.Control
                      type="text"
                      placeholder="Order #, Customer, Tracking..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Button type="submit" variant="outline-secondary">
                      <Search />
                    </Button>
                  </div>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="new">New</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="returned">Returned</option>
                    <option value="failed">Failed</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>Platform</Form.Label>
                  <Form.Select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                  >
                    <option value="">All Platforms</option>
                    <option value="trendyol">Trendyol</option>
                    <option value="hepsiburada">Hepsiburada</option>
                    <option value="n11">N11</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>From Date</Form.Label>
                  <DatePicker
                    selected={startDate}
                    onChange={date => setStartDate(date)}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    className="form-control"
                    placeholderText="Start Date"
                    dateFormat="MM/dd/yyyy"
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>To Date</Form.Label>
                  <DatePicker
                    selected={endDate}
                    onChange={date => setEndDate(date)}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate}
                    className="form-control"
                    placeholderText="End Date"
                    dateFormat="MM/dd/yyyy"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col className="d-flex justify-content-between">
                <Button variant="outline-secondary" onClick={clearFilters}>
                  <X /> Clear Filters
                </Button>
                <div>
                  <Button 
                    variant="outline-primary" 
                    className="me-2"
                    disabled={selectedOrders.length === 0}
                    onClick={() => setShowLabelModal(true)}
                  >
                    <Download /> Generate Labels
                  </Button>
                  <Button 
                    variant="outline-success" 
                    className="me-2"
                    disabled={selectedOrders.length === 0}
                    onClick={() => setShowShippingModal(true)}
                  >
                    <Truck /> Mark Shipped
                  </Button>
                  <Button 
                    variant="outline-danger"
                    disabled={selectedOrders.length === 0}
                    onClick={() => setShowCancelModal(true)}
                  >
                    <X /> Cancel Orders
                  </Button>
                </div>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center p-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-2">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center p-5">
              <Box size={48} className="mb-3 text-secondary" />
              <h5>No Orders Found</h5>
              <p className="text-muted">
                Try changing your filters or sync new orders from your platforms.
              </p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover>
                  <thead>
                    <tr>
                      <th>
                        <Form.Check
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          label=""
                        />
                      </th>
                      <th>Order #</th>
                      <th>Platform</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id}>
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => handleSelect(order.id)}
                            label=""
                          />
                        </td>
                        <td>{order.platformOrderId}</td>
                        <td>
                          <Badge bg={getPlatformBadge(order.platformId)}>
                            {order.platformId}
                          </Badge>
                        </td>
                        <td>{formatDate(order.orderDate)}</td>
                        <td>{order.customerName}</td>
                        <td>
                          <Badge bg={getStatusBadge(order.orderStatus)}>
                            {order.orderStatus}
                          </Badge>
                        </td>
                        <td>{order.OrderItems?.length || 0}</td>
                        <td>{order.totalAmount.toFixed(2)} {order.currency}</td>
                        <td>
                          <Dropdown>
                            <Dropdown.Toggle variant="light" size="sm" id={`dropdown-${order.id}`}>
                              Actions
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item href={`/orders/${order.id}`}>View Details</Dropdown.Item>
                              <Dropdown.Item onClick={() => {
                                setSelectedOrders([order.id]);
                                setShowLabelModal(true);
                              }}>Generate Label</Dropdown.Item>
                              <Dropdown.Item onClick={() => {
                                setSelectedOrders([order.id]);
                                setShowShippingModal(true);
                              }}>Mark as Shipped</Dropdown.Item>
                              <Dropdown.Divider />
                              <Dropdown.Item 
                                className="text-danger"
                                onClick={() => {
                                  setSelectedOrders([order.id]);
                                  setShowCancelModal(true);
                                }}
                              >
                                Cancel Order
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div>
                  <small className="text-muted">
                    Showing {orders.length} of {totalElements} orders
                  </small>
                </div>
                {renderPagination()}
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Shipping Modal */}
      <Modal show={showShippingModal} onHide={() => setShowShippingModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Mark Orders as Shipped</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalError && (
            <Alert variant="danger">{modalError}</Alert>
          )}
          <p>Mark {selectedOrders.length} order(s) as shipped</p>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Tracking Number</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Carrier</Form.Label>
              <Form.Select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                required
              >
                {carriers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowShippingModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleMarkAsShipped}
            disabled={modalLoading}
          >
            {modalLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Processing...
              </>
            ) : (
              'Mark as Shipped'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Label Generation Modal */}
      <Modal show={showLabelModal} onHide={() => setShowLabelModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Generate Shipping Labels</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalError && (
            <Alert variant="danger">{modalError}</Alert>
          )}
          <p>Generate shipping labels for {selectedOrders.length} order(s)</p>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Carrier</Form.Label>
              <Form.Select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                required
              >
                {carriers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLabelModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleGenerateLabels}
            disabled={modalLoading}
          >
            {modalLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Generating...
              </>
            ) : (
              'Generate Labels'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Cancel Orders Modal */}
      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Cancel Orders</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalError && (
            <Alert variant="danger">{modalError}</Alert>
          )}
          <p>Are you sure you want to cancel {selectedOrders.length} order(s)?</p>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Cancellation Reason</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter reason for cancellation"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
            No, Keep Orders
          </Button>
          <Button 
            variant="danger" 
            onClick={handleCancelOrders}
            disabled={modalLoading}
          >
            {modalLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Processing...
              </>
            ) : (
              'Yes, Cancel Orders'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default OrderDashboard;