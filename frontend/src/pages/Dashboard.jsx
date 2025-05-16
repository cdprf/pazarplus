/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useContext } from 'react';
import { Row, Col, Card, Button, ListGroup, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { 
  FaShoppingCart, 
  FaBoxOpen, 
  FaShippingFast, 
  FaExclamationTriangle,
  FaPlug,
  FaSync
} from 'react-icons/fa';
import axios from 'axios';
import { AlertContext } from '../context/AlertContext';
import PlatformStatusCard from '../components/dashboard/PlatformStatusCard';
import OrdersChart from '../components/dashboard/OrdersChart';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    newOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    totalOrders: 0,
    platforms: {
      active: 0,
      error: 0,
      total: 0
    }
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [platformConnections, setPlatformConnections] = useState([]);
  const [syncingPlatforms, setSyncingPlatforms] = useState([]);
  
  const { error } = useContext(AlertContext);
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch order stats
        const statsRes = await axios.get('/orders/stats');
        
        // Fetch recent orders
        const recentOrdersRes = await axios.get('/orders?page=0&size=5&sortBy=orderDate&sortOrder=DESC');
        
        // Fetch platform connections
        const platformsRes = await axios.get('/platforms/connections');
        
        if (statsRes.data.success) {
          setStats(statsRes.data.data);
        }
        
        if (recentOrdersRes.data.success) {
          setRecentOrders(recentOrdersRes.data.data);
        }
        
        if (platformsRes.data.success) {
          setPlatformConnections(platformsRes.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
        error('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [error]);
  
  // Sync orders from platform
  const syncPlatform = async (connectionId) => {
    try {
      setSyncingPlatforms(prev => [...prev, connectionId]);
      
      const res = await axios.post(`/orders/sync/${connectionId}`, {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      });
      
      if (res.data.success) {
        // Refresh dashboard data
        const statsRes = await axios.get('/orders/stats');
        const recentOrdersRes = await axios.get('/orders?page=0&size=5&sortBy=orderDate&sortOrder=DESC');
        
        if (statsRes.data.success) {
          setStats(statsRes.data.data);
        }
        
        if (recentOrdersRes.data.success) {
          setRecentOrders(recentOrdersRes.data.data);
        }
      } else {
        error(res.data.message || 'Failed to sync orders');
      }
    } catch (err) {
      console.error('Failed to sync orders', err);
      error('Failed to sync orders. Please try again.');
    } finally {
      setSyncingPlatforms(prev => prev.filter(id => id !== connectionId));
    }
  };
  
  // Get badge color for order status
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
      default:
        return 'light';
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
  
  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading dashboard...</p>
      </div>
    );
  }
  
  return (
    <div className="dashboard">
      <h2 className="mb-4">Dashboard</h2>
      
      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="icon-wrapper bg-primary text-white">
                <FaShoppingCart size={24} />
              </div>
              <div className="ms-3">
                <Card.Title className="mb-0">{stats.newOrders}</Card.Title>
                <Card.Text className="text-muted">New Orders</Card.Text>
              </div>
            </Card.Body>
            <Card.Footer className="bg-white border-0">
              <Link to="/orders?status=new" className="text-decoration-none">
                View New Orders
              </Link>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="icon-wrapper bg-info text-white">
                <FaBoxOpen size={24} />
              </div>
              <div className="ms-3">
                <Card.Title className="mb-0">{stats.processingOrders}</Card.Title>
                <Card.Text className="text-muted">Processing</Card.Text>
              </div>
            </Card.Body>
            <Card.Footer className="bg-white border-0">
              <Link to="/orders?status=processing" className="text-decoration-none">
                View Processing Orders
              </Link>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="icon-wrapper bg-success text-white">
                <FaShippingFast size={24} />
              </div>
              <div className="ms-3">
                <Card.Title className="mb-0">{stats.shippedOrders}</Card.Title>
                <Card.Text className="text-muted">Shipped</Card.Text>
              </div>
            </Card.Body>
            <Card.Footer className="bg-white border-0">
              <Link to="/orders?status=shipped" className="text-decoration-none">
                View Shipped Orders
              </Link>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="icon-wrapper bg-warning text-white">
                <FaExclamationTriangle size={24} />
              </div>
              <div className="ms-3">
                <Card.Title className="mb-0">{stats.platforms.error}</Card.Title>
                <Card.Text className="text-muted">Connection Issues</Card.Text>
              </div>
            </Card.Body>
            <Card.Footer className="bg-white border-0">
              <Link to="/platforms" className="text-decoration-none">
                View Platform Connections
              </Link>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
      
      {/* Main Dashboard Content */}
      <Row>
        <Col md={8}>
          {/* Order Trends Chart */}
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Order Trends</h5>
            </Card.Header>
            <Card.Body>
              <OrdersChart />
            </Card.Body>
          </Card>
          
          {/* Recent Orders */}
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Recent Orders</h5>
              <Link to="/orders" className="btn btn-sm btn-outline-primary">
                View All Orders
              </Link>
            </Card.Header>
            <Card.Body>
              {recentOrders.length === 0 ? (
                <div className="text-center p-4">
                  <p className="text-muted">No recent orders</p>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {recentOrders.map(order => (
                    <ListGroup.Item 
                      key={order.id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <h6 className="mb-0">
                          <Link to={`/orders/${order.id}`} className="text-decoration-none">
                            {order.platformOrderId}
                          </Link>
                        </h6>
                        <small className="text-muted">
                          {formatDate(order.orderDate)} - {order.customerName}
                        </small>
                      </div>
                      <div>
                        <Badge bg={getStatusBadge(order.orderStatus)}>
                          {order.orderStatus}
                        </Badge>
                        <span className="ms-3">{order.totalAmount.toFixed(2)} {order.currency}</span>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          {/* Platform Status */}
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Platform Status</h5>
              <Link to="/platforms" className="btn btn-sm btn-outline-primary">
                Manage Platforms
              </Link>
            </Card.Header>
            <Card.Body>
              {platformConnections.length === 0 ? (
                <div className="text-center p-4">
                  <FaPlug size={24} className="text-muted mb-2" />
                  <p className="text-muted">No platform connections</p>
                  <Link to="/platforms" className="btn btn-sm btn-primary">
                    Add Platform
                  </Link>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {platformConnections.map(connection => (
                    <ListGroup.Item 
                      key={connection.id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <h6 className="mb-0">{connection.name}</h6>
                        <small className="text-muted text-capitalize">
                          {connection.platformType}
                        </small>
                      </div>
                      <div>
                        <Badge 
                          bg={connection.status === 'active' ? 'success' : 'danger'}
                          className="me-2"
                        >
                          {connection.status}
                        </Badge>
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={() => syncPlatform(connection.id)}
                          disabled={syncingPlatforms.includes(connection.id)}
                        >
                          {syncingPlatforms.includes(connection.id) ? (
                            <Spinner 
                              as="span" 
                              animation="border" 
                              size="sm" 
                              role="status" 
                              aria-hidden="true" 
                            />
                          ) : (
                            <FaSync />
                          )}
                        </Button>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
          
          {/* Quick Actions */}
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button variant="primary" as={Link} to="/import">
                  Import Orders from CSV
                </Button>
                <Button variant="outline-primary" as={Link} to="/shipping">
                  Generate Shipping Labels
                </Button>
                <Button variant="outline-primary" as={Link} to="/export">
                  Export Data
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;