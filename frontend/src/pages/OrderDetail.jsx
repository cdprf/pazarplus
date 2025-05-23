/* eslint-disable no-unused-vars */
// frontend/src/pages/OrderDetail.jsx

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Badge, 
  ListGroup, 
  Spinner, 
  Alert, 
  Tab, 
  Nav,
  Table,
  Modal,
  Form
} from 'react-bootstrap';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FaShoppingCart, 
  FaUser, 
  FaMapMarkerAlt, 
  FaArchive, 
  FaHistory, 
  FaShippingFast, 
  FaDownload, 
  FaPrint, 
  FaExclamationTriangle,
  FaBoxOpen,
  FaTrash,
  FaSync,
  FaCheck,
  FaCopy,
  FaInfo,
  FaTags
} from 'react-icons/fa';
import axios from 'axios';
import { AlertContext } from '../context/AlertContext';
import { orderService } from '../services/api/orderService';
import wsService from '../services/WebSocketService';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [platformDetails, setPlatformDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [hasOrderUpdate, setHasOrderUpdate] = useState(false);
  
  // Modal states
  const [showMarkShippedModal, setShowMarkShippedModal] = useState(false);
  const [showCancelOrderModal, setShowCancelOrderModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [carriers, setCarriers] = useState([]);
  const [cancelReason, setCancelReason] = useState('');
  
  const { success, error: showError } = useContext(AlertContext);
  
  // Wrap fetchOrderDetails in useCallback
  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setHasOrderUpdate(false);
      
      // Fetch basic order details
      const response = await orderService.getOrder(id);
      
      if (response.success) {
        setOrder(response.data);
        
        // Also fetch platform-specific details if available
        try {
          const platformResponse = await orderService.getOrderWithPlatformDetails(id);
          if (platformResponse.success) {
            setPlatformDetails(platformResponse.data);
          }
        } catch (platformError) {
          console.error('Error fetching platform-specific details:', platformError);
          // Don't set error here, as we still have basic order details
        }
      } else {
        setError(response.message || 'Failed to fetch order details');
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError('Failed to fetch order details. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [id]); // Add id as dependency since it's used in the callback

  // Initial fetch
  useEffect(() => {
    fetchOrderDetails();
    fetchCarriers();
  }, [id, fetchOrderDetails]); // Add fetchOrderDetails as dependency
  
  // Set up WebSocket listeners for real-time order updates
  useEffect(() => {
    if (!id) return;
    
    // Subscribe to order updates for this specific order
    const orderUpdateCleanup = wsService.subscribeToOrderUpdates((data) => {
      if (data.order && data.order.id === id) {
        // Show notification that order was updated
        setHasOrderUpdate(true);
      }
    });
    
    // Also listen for order cancellations
    const orderCancelCleanup = wsService.subscribeToOrderCancellations((data) => {
      if (data.order && data.order.id === id) {
        // If order is cancelled, update the order state immediately
        setOrder(prevOrder => ({
          ...prevOrder,
          orderStatus: 'cancelled',
          cancelReason: data.reason,
          cancelledAt: data.timestamp
        }));
        success('Order was cancelled');
      }
    });
    
    return () => {
      orderUpdateCleanup();
      orderCancelCleanup();
    };
  }, [id, success]);
  
  // Fetch carrier list
  const fetchCarriers = async () => {
    try {
      const response = await axios.get('/shipping/carriers');
      
      if (response.data.success) {
        setCarriers(response.data.data);
        if (response.data.data.length > 0) {
          setCarrier(response.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching carriers:', err);
    }
  };
  
  // Mark order as shipped
  const handleMarkAsShipped = async () => {
    if (!trackingNumber || !carrier) {
      showError('Tracking number and carrier are required');
      return;
    }
    
    try {
      setModalLoading(true);
      
      const response = await axios.post(`/orders/${id}/ship`, {
        trackingNumber,
        carrier,
        shippingDate: new Date().toISOString()
      });
      
      if (response.data.success) {
        setShowMarkShippedModal(false);
        setTrackingNumber('');
        
        // Update order state
        setOrder({
          ...order,
          orderStatus: 'shipped',
          trackingNumber,
          carrier,
          shippingDate: new Date().toISOString()
        });
        
        success('Order marked as shipped successfully');
      } else {
        showError(response.data.message || 'Failed to mark order as shipped');
      }
    } catch (err) {
      console.error('Error marking order as shipped:', err);
      showError('Failed to mark order as shipped. Please try again later.');
    } finally {
      setModalLoading(false);
    }
  };
  
  // Cancel order
  const handleCancelOrder = async () => {
    try {
      setModalLoading(true);
      
      const response = await axios.post(`/orders/${id}/cancel`, {
        reason: cancelReason
      });
      
      if (response.data.success) {
        setShowCancelOrderModal(false);
        setCancelReason('');
        
        // Update order state
        setOrder({
          ...order,
          orderStatus: 'cancelled',
          cancelReason,
          cancelledAt: new Date().toISOString()
        });
        
        success('Order cancelled successfully');
      } else {
        showError(response.data.message || 'Failed to cancel order');
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      showError('Failed to cancel order. Please try again later.');
    } finally {
      setModalLoading(false);
    }
  };
  
  // Generate shipping label
  const handleGenerateLabel = async () => {
    try {
      setLoading(true);
      
      const response = await axios.post(`/shipping/labels/${id}`, {
        carrier: order.carrier || carrier
      });
      
      if (response.data.success) {
        // Open the PDF in a new tab
        window.open(response.data.data.labelUrl, '_blank');
        success('Shipping label generated successfully');
      } else {
        showError(response.data.message || 'Failed to generate shipping label');
      }
    } catch (err) {
      console.error('Error generating shipping label:', err);
      showError('Failed to generate shipping label. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Date(dateString).toLocaleString(undefined, options);
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
  
  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading order details...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error}</p>
        <div className="d-flex justify-content-end">
          <Link to="/orders" className="btn btn-outline-danger">
            Back to Orders
          </Link>
        </div>
      </Alert>
    );
  }
  
  if (!order) {
    return (
      <Alert variant="warning">
        <Alert.Heading>Order Not Found</Alert.Heading>
        <p>The requested order could not be found.</p>
        <div className="d-flex justify-content-end">
          <Link to="/orders" className="btn btn-outline-warning">
            Back to Orders
          </Link>
        </div>
      </Alert>
    );
  }
  
  return (
    <div className="order-detail">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          Order #{order.platformOrderId}
          <Badge bg={getStatusBadge(order.orderStatus)} className="ms-2">
            {order.orderStatus}
          </Badge>
        </h2>
        
        <div>
          {hasOrderUpdate && (
            <Button 
              variant="info" 
              className="me-2"
              onClick={fetchOrderDetails}
            >
              <FaSync className="me-2" />
              Order Updated - Refresh
            </Button>
          )}
          
          <Button 
            variant="outline-secondary" 
            className="me-2"
            as={Link}
            to="/orders"
          >
            Back to Orders
          </Button>
          
          <Button 
            variant="success"
            className="me-2"
            disabled={order.orderStatus === 'shipped' || order.orderStatus === 'delivered' || order.orderStatus === 'cancelled'}
            onClick={() => setShowMarkShippedModal(true)}
          >
            <FaShippingFast className="me-2" />
            Mark as Shipped
          </Button>
          
          <Button 
            variant="primary"
            className="me-2"
            disabled={order.orderStatus !== 'shipped' && order.orderStatus !== 'processing'}
            onClick={handleGenerateLabel}
          >
            <FaDownload className="me-2" />
            Generate Label
          </Button>
          
          <Button 
            variant="outline-danger"
            disabled={order.orderStatus === 'cancelled' || order.orderStatus === 'delivered'}
            onClick={() => setShowCancelOrderModal(true)}
          >
            <FaTrash className="me-2" />
            Cancel Order
          </Button>
        </div>
      </div>
      
      <Row>
        <Col lg={8}>
          <Tab.Container id="order-tabs" defaultActiveKey="details">
            <Card className="shadow-sm mb-4">
              <Card.Header className="bg-white">
                <Nav variant="tabs">
                  <Nav.Item>
                    <Nav.Link eventKey="details">
                      <FaShoppingCart className="me-2" />
                      Order Details
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="customer">
                      <FaUser className="me-2" />
                      Customer Info
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="shipping">
                      <FaMapMarkerAlt className="me-2" />
                      Shipping Info
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="history">
                      <FaHistory className="me-2" />
                      Order History
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="platform-details">
                      <FaTags className="me-2" />
                      Platform Details
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
              </Card.Header>
              <Card.Body>
                <Tab.Content>
                  <Tab.Pane eventKey="details">
                    <h5 className="mb-3">Order Items</h5>
                    
                    <Table bordered hover>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>SKU</th>
                          <th>Quantity</th>
                          <th>Price</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.orderItems?.map((item, index) => (
                          <tr key={index}>
                            <td>{item.productTitle}</td>
                            <td>{item.sku || 'N/A'}</td>
                            <td>{item.quantity}</td>
                            <td>{item.unitPrice.toFixed(2)} {order.currency}</td>
                            <td>{(item.unitPrice * item.quantity).toFixed(2)} {order.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="4" className="text-end fw-bold">Subtotal</td>
                          <td>{order.subtotal?.toFixed(2) || (order.totalAmount - order.shippingAmount - order.taxAmount).toFixed(2)} {order.currency}</td>
                        </tr>
                        <tr>
                          <td colSpan="4" className="text-end fw-bold">Shipping</td>
                          <td>{order.shippingAmount?.toFixed(2) || '0.00'} {order.currency}</td>
                        </tr>
                        <tr>
                          <td colSpan="4" className="text-end fw-bold">Tax</td>
                          <td>{order.taxAmount?.toFixed(2) || '0.00'} {order.currency}</td>
                        </tr>
                        <tr>
                          <td colSpan="4" className="text-end fw-bold">Total</td>
                          <td className="fw-bold">{order.totalAmount.toFixed(2)} {order.currency}</td>
                        </tr>
                      </tfoot>
                    </Table>
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="customer">
                    <Row>
                      <Col md={6}>
                        <h5 className="mb-3">Customer Information</h5>
                        
                        <ListGroup variant="flush">
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Customer Name</span>
                            <span>{order.customerName || 'N/A'}</span>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Email</span>
                            <span>{order.customerEmail || 'N/A'}</span>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Phone</span>
                            <span>{order.customerPhone || 'N/A'}</span>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Customer Notes</span>
                            <span>{order.customerNotes || 'None'}</span>
                          </ListGroup.Item>
                        </ListGroup>
                      </Col>
                      
                      <Col md={6}>
                        <h5 className="mb-3">Billing Address</h5>
                        
                        <ListGroup variant="flush">
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Name</span>
                            <span>{order.billingAddress?.name || order.customerName || 'N/A'}</span>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Address</span>
                            <span>{order.billingAddress?.line1 || 'N/A'}</span>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">City/Region</span>
                            <span>
                              {order.billingAddress?.city || 'N/A'}, {order.billingAddress?.region || 'N/A'}
                            </span>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Postal Code</span>
                            <span>{order.billingAddress?.postalCode || 'N/A'}</span>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Country</span>
                            <span>{order.billingAddress?.country || 'N/A'}</span>
                          </ListGroup.Item>
                        </ListGroup>
                      </Col>
                    </Row>
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="shipping">
                    <Row>
                      <Col md={6}>
                        <h5 className="mb-3">Shipping Address</h5>
                        
                        <ListGroup variant="flush">
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Recipient</span>
                            <span>{order.shippingAddress?.name || order.customerName || 'N/A'}</span>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Address</span>
                            <span>{order.shippingAddress?.line1 || 'N/A'}</span>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Address 2</span>
                            <span>{order.shippingAddress?.line2 || 'N/A'}</span>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">City/Region</span>
                            <span>
                              {order.shippingAddress?.city || 'N/A'}, {order.shippingAddress?.region || 'N/A'}
                            </span>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Postal Code</span>
                            <span>{order.shippingAddress?.postalCode || 'N/A'}</span>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Country</span>
                            <span>{order.shippingAddress?.country || 'N/A'}</span>
                          </ListGroup.Item>
                        </ListGroup>
                      </Col>
                      
                      <Col md={6}>
                        <h5 className="mb-3">Shipping Details</h5>
                        
                        <ListGroup variant="flush">
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Shipping Method</span>
                            <span>{order.shippingMethod || 'Standard'}</span>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Carrier</span>
                            <span>{order.carrier || 'N/A'}</span>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Tracking Number</span>
                            <span>
                              {order.trackingNumber ? (
                                <a href={`https://track.shipment.com/${order.trackingNumber}`} target="_blank" rel="noopener noreferrer">
                                  {order.trackingNumber}
                                </a>
                              ) : (
                                'N/A'
                              )}
                            </span>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Shipped Date</span>
                            <span>{order.shippingDate ? formatDate(order.shippingDate) : 'N/A'}</span>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Expected Delivery</span>
                            <span>{order.estimatedDeliveryDate ? formatDate(order.estimatedDeliveryDate) : 'N/A'}</span>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="property-name">Shipping Instructions</span>
                            <span>{order.shippingInstructions || 'None'}</span>
                          </ListGroup.Item>
                        </ListGroup>
                      </Col>
                    </Row>
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="history">
                    <h5 className="mb-3">Order Status History</h5>
                    
                    {order.statusHistory?.length > 0 ? (
                      <Table bordered hover>
                        <thead>
                          <tr>
                            <th>Date & Time</th>
                            <th>Status</th>
                            <th>Comment</th>
                            <th>Updated By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.statusHistory.map((status, index) => (
                            <tr key={index}>
                              <td>{formatDate(status.timestamp)}</td>
                              <td>
                                <Badge bg={getStatusBadge(status.status)}>
                                  {status.status}
                                </Badge>
                              </td>
                              <td>{status.comment || 'N/A'}</td>
                              <td>{status.user || 'System'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      <Alert variant="info">
                        <FaInfo className="me-2" />
                        No status history available for this order.
                      </Alert>
                    )}
                  </Tab.Pane>
                  <Tab.Pane eventKey="platform-details">
                    <h5 className="mb-3">Platform-Specific Details</h5>
                    
                    {platformDetails?.platformDetails ? (
                      <div>
                        <Badge bg={getPlatformBadge(platformDetails.platformDetailsType)} className="mb-3">
                          {platformDetails.platformDetailsType}
                        </Badge>
                        
                        {platformDetails.platformDetailsType === 'trendyol' && (
                          <Row>
                            <Col md={6}>
                              <h6 className="mb-2">Trendyol Order Details</h6>
                              <ListGroup variant="flush">
                                <ListGroup.Item className="d-flex justify-content-between">
                                  <span className="property-name">Order Number</span>
                                  <span>{platformDetails.platformDetails.orderNumber || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between">
                                  <span className="property-name">Trendyol Status</span>
                                  <span>{platformDetails.platformDetails.platformStatus || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between">
                                  <span className="property-name">Cargo Provider</span>
                                  <span>{platformDetails.platformDetails.cargoProviderName || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between">
                                  <span className="property-name">Tracking Number</span>
                                  <span>
                                    {platformDetails.platformDetails.cargoTrackingNumber ? (
                                      <a 
                                        href={platformDetails.platformDetails.cargoTrackingUrl || `https://www.trendyol.com/orders/trackShipment?trackingNumber=${platformDetails.platformDetails.cargoTrackingNumber}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                      >
                                        {platformDetails.platformDetails.cargoTrackingNumber}
                                      </a>
                                    ) : (
                                      'N/A'
                                    )}
                                  </span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between">
                                  <span className="property-name">Customer Notes</span>
                                  <span>{platformDetails.platformDetails.note || 'N/A'}</span>
                                </ListGroup.Item>
                              </ListGroup>
                            </Col>
                            
                            <Col md={6}>
                              <h6 className="mb-2">Trendyol Customer Info</h6>
                              <ListGroup variant="flush">
                                <ListGroup.Item className="d-flex justify-content-between">
                                  <span className="property-name">Customer Name</span>
                                  <span>
                                    {platformDetails.platformDetails.customerFirstName || ''} {platformDetails.platformDetails.customerLastName || ''}
                                  </span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between">
                                  <span className="property-name">Email</span>
                                  <span>{platformDetails.platformDetails.customerEmail || 'N/A'}</span>
                                </ListGroup.Item>
                              </ListGroup>
                              
                              {platformDetails.platformDetails.shipmentAddressJson && (
                                <div className="mt-3">
                                  <h6 className="mb-2">Shipment Address</h6>
                                  <p className="card-text">
                                    {typeof platformDetails.platformDetails.shipmentAddressJson === 'string' 
                                      ? JSON.parse(platformDetails.platformDetails.shipmentAddressJson).fullAddress 
                                      : platformDetails.platformDetails.shipmentAddressJson.fullAddress || 'N/A'}
                                  </p>
                                </div>
                              )}
                            </Col>
                          </Row>
                        )}
                        
                        {platformDetails.platformDetailsType === 'hepsiburada' && (
                          <Row>
                            <Col md={6}>
                              <h6 className="mb-2">Hepsiburada Order Details</h6>
                              <ListGroup variant="flush">
                                <ListGroup.Item className="d-flex justify-content-between">
                                  <span className="property-name">Package Number</span>
                                  <span>{platformDetails.platformDetails.packageNumber || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between">
                                  <span className="property-name">Order Number</span>
                                  <span>{platformDetails.platformDetails.orderNumber || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between">
                                  <span className="property-name">Reference Number</span>
                                  <span>{platformDetails.platformDetails.referenceNumber || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between">
                                  <span className="property-name">Platform Status</span>
                                  <span>{platformDetails.platformDetails.platformStatus || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between">
                                  <span className="property-name">Payment Status</span>
                                  <span>{platformDetails.platformDetails.paymentStatus || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between">
                                  <span className="property-name">Payment Type</span>
                                  <span>{platformDetails.platformDetails.paymentType || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between">
                                  <span className="property-name">Cargo Company</span>
                                  <span>{platformDetails.platformDetails.cargoCompany || 'N/A'}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between">
                                  <span className="property-name">Tracking Number</span>
                                  <span>
                                    {platformDetails.platformDetails.cargoTrackingNumber ? (
                                      <a 
                                        href={platformDetails.platformDetails.cargoTrackingUrl || `https://www.hepsiburada.com/ayagina-gelsin/takip?code=${platformDetails.platformDetails.cargoTrackingNumber}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                      >
                                        {platformDetails.platformDetails.cargoTrackingNumber}
                                      </a>
                                    ) : (
                                      'N/A'
                                    )}
                                  </span>
                                </ListGroup.Item>
                              </ListGroup>
                            </Col>
                            
                            <Col md={6}>
                              <h6 className="mb-2">Addresses</h6>
                              {platformDetails.platformDetails.shippingAddressJson && (
                                <div className="mb-3">
                                  <h6 className="text-muted">Shipping Address</h6>
                                  <p className="card-text">
                                    {typeof platformDetails.platformDetails.shippingAddressJson === 'string' 
                                      ? JSON.parse(platformDetails.platformDetails.shippingAddressJson).name + ', ' +
                                        JSON.parse(platformDetails.platformDetails.shippingAddressJson).address
                                      : platformDetails.platformDetails.shippingAddressJson.name + ', ' +
                                        platformDetails.platformDetails.shippingAddressJson.address || 'N/A'}
                                  </p>
                                  <p>
                                    {typeof platformDetails.platformDetails.shippingAddressJson === 'string' 
                                      ? JSON.parse(platformDetails.platformDetails.shippingAddressJson).city + '/' +
                                        JSON.parse(platformDetails.platformDetails.shippingAddressJson).town
                                      : platformDetails.platformDetails.shippingAddressJson.city + '/' +
                                        platformDetails.platformDetails.shippingAddressJson.town || ''}
                                  </p>
                                </div>
                              )}
                              
                              {platformDetails.platformDetails.billingAddressJson && (
                                <div className="mb-3">
                                  <h6 className="text-muted">Billing Address</h6>
                                  <p className="card-text">
                                    {typeof platformDetails.platformDetails.billingAddressJson === 'string' 
                                      ? JSON.parse(platformDetails.platformDetails.billingAddressJson).name + ', ' +
                                        JSON.parse(platformDetails.platformDetails.billingAddressJson).address
                                      : platformDetails.platformDetails.billingAddressJson.name + ', ' +
                                        platformDetails.platformDetails.billingAddressJson.address || 'N/A'}
                                  </p>
                                  <p>
                                    {typeof platformDetails.platformDetails.billingAddressJson === 'string' 
                                      ? JSON.parse(platformDetails.platformDetails.billingAddressJson).city + '/' +
                                        JSON.parse(platformDetails.platformDetails.billingAddressJson).town
                                      : platformDetails.platformDetails.billingAddressJson.city + '/' +
                                        platformDetails.platformDetails.billingAddressJson.town || ''}
                                  </p>
                                </div>
                              )}
                            </Col>
                          </Row>
                        )}
                      </div>
                    ) : (
                      <Alert variant="info">
                        <FaInfo className="me-2" />
                        No platform-specific details available for this order.
                      </Alert>
                    )}
                  </Tab.Pane>
                </Tab.Content>
              </Card.Body>
            </Card>
          </Tab.Container>
        </Col>
        
        <Col lg={4}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Order Summary</h5>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item className="d-flex justify-content-between">
                  <span className="property-name">Order ID</span>
                  <span>{order.platformOrderId}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between">
                  <span className="property-name">Platform</span>
                  <span>
                    <Badge bg={getPlatformBadge(order.platformId)}>
                      {order.platformId}
                    </Badge>
                  </span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between">
                  <span className="property-name">Order Date</span>
                  <span>{formatDate(order.orderDate)}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between">
                  <span className="property-name">Status</span>
                  <span>
                    <Badge bg={getStatusBadge(order.orderStatus)}>
                      {order.orderStatus}
                    </Badge>
                  </span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between">
                  <span className="property-name">Items</span>
                  <span>{order.orderItems?.length || 0}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between">
                  <span className="property-name">Total Amount</span>
                  <span className="fw-bold">
                    {order.totalAmount.toFixed(2)} {order.currency}
                  </span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between">
                  <span className="property-name">Payment Method</span>
                  <span>{order.paymentMethod || 'N/A'}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between">
                  <span className="property-name">Payment Status</span>
                  <span>
                    <Badge bg={order.paymentStatus === 'paid' ? 'success' : 'warning'}>
                      {order.paymentStatus || 'pending'}
                    </Badge>
                  </span>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
          
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Actions</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button 
                  variant="outline-primary"
                  onClick={handleGenerateLabel}
                  disabled={order.orderStatus !== 'shipped' && order.orderStatus !== 'processing'}
                >
                  <FaDownload className="me-2" />
                  Generate Shipping Label
                </Button>
                
                <Button 
                  variant="outline-secondary"
                  onClick={() => window.print()}
                >
                  <FaPrint className="me-2" />
                  Print Order Details
                </Button>
                
                <Button 
                  variant="outline-success"
                  disabled={order.orderStatus === 'shipped' || order.orderStatus === 'delivered' || order.orderStatus === 'cancelled'}
                  onClick={() => setShowMarkShippedModal(true)}
                >
                  <FaShippingFast className="me-2" />
                  Mark as Shipped
                </Button>
                
                <Button 
                  variant="outline-info"
                  as={Link}
                  to={`/orders/duplicate/${id}`}
                >
                  <FaCopy className="me-2" />
                  Duplicate Order
                </Button>
                
                <Button 
                  variant="outline-danger"
                  disabled={order.orderStatus === 'cancelled' || order.orderStatus === 'delivered'}
                  onClick={() => setShowCancelOrderModal(true)}
                >
                  <FaTrash className="me-2" />
                  Cancel Order
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Mark as Shipped Modal */}
      <Modal show={showMarkShippedModal} onHide={() => setShowMarkShippedModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Mark Order as Shipped</Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMarkShippedModal(false)}>
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
      
      {/* Cancel Order Modal */}
      <Modal show={showCancelOrderModal} onHide={() => setShowCancelOrderModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Cancel Order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to cancel this order?</p>
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
          <Button variant="secondary" onClick={() => setShowCancelOrderModal(false)}>
            No, Keep Order
          </Button>
          <Button 
            variant="danger" 
            onClick={handleCancelOrder}
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
              'Yes, Cancel Order'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default OrderDetail;