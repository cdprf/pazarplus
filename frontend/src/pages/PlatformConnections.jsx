/* eslint-disable no-unused-vars */
// frontend/src/pages/PlatformConnections.jsx

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Badge, 
  Spinner, 
  Modal, 
  Form, 
  Alert,
  Row, 
  Col,
  ListGroup,
  Tabs,
  Tab
} from 'react-bootstrap';
import { 
  FaPlug, 
  FaSync, 
  FaTrash, 
  FaEdit, 
  FaPlus, 
  FaCheck, 
  FaExclamationTriangle,
  FaInfoCircle
} from 'react-icons/fa';
import axios from 'axios';
import { AlertContext } from '../context/AlertContext';
import { useAuth } from '../hooks/useAuth';

// Set the base URL for API requests
axios.defaults.baseURL = 'http://localhost:3001/api';

// Platform field configurations - maps each platform to its required fields
const platformFieldConfigs = {
  trendyol: {
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'text', required: true, placeholder: 'Enter Trendyol API Key' },
      { name: 'apiSecret', label: 'API Secret', type: 'password', required: true, placeholder: 'Enter Trendyol API Secret' },
      { name: 'sellerId', label: 'Seller ID', type: 'text', required: true, placeholder: 'Enter Trendyol Seller ID' },
    ],
    description: 'Connect to Trendyol marketplace to synchronize orders and manage inventory.',
    credentialMapping: (formData) => ({
      apiKey: formData.apiKey,
      apiSecret: formData.apiSecret,
      sellerId: formData.sellerId
    })
  },
  hepsiburada: {
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'text', required: true, placeholder: 'Enter Hepsiburada API Key' },
      { name: 'apiSecret', label: 'API Secret', type: 'password', required: true, placeholder: 'Enter Hepsiburada API Secret' },
      { name: 'merchantId', label: 'Merchant ID', type: 'text', required: true, placeholder: 'Enter Hepsiburada Merchant ID' },
    ],
    description: 'Connect to Hepsiburada marketplace to synchronize orders and manage inventory.',
    credentialMapping: (formData) => ({
      apiKey: formData.apiKey,
      apiSecret: formData.apiSecret,
      merchantId: formData.merchantId
    })
  },
  n11: {
    fields: [
      { name: 'appKey', label: 'App Key', type: 'text', required: true, placeholder: 'Enter N11 App Key' },
      { name: 'appSecret', label: 'App Secret', type: 'password', required: true, placeholder: 'Enter N11 App Secret' }
    ],
    description: 'Connect to N11 marketplace using their REST API to synchronize orders and manage inventory.',
    credentialMapping: (formData) => ({
      appKey: formData.appKey,
      appSecret: formData.appSecret
    })
  },
  amazon: {
    fields: [
      { name: 'sellerCentralId', label: 'Seller Central ID', type: 'text', required: true, placeholder: 'Enter Amazon Seller Central ID' },
      { name: 'marketplaceId', label: 'Marketplace ID', type: 'text', required: true, placeholder: 'Enter Amazon Marketplace ID' },
      { name: 'accessKey', label: 'Access Key', type: 'text', required: true, placeholder: 'Enter Amazon MWS Access Key' },
      { name: 'secretKey', label: 'Secret Key', type: 'password', required: true, placeholder: 'Enter Amazon MWS Secret Key' },
      { name: 'authToken', label: 'Auth Token', type: 'password', required: true, placeholder: 'Enter MWS Auth Token' },
    ],
    description: 'Connect to Amazon marketplace to synchronize orders and manage inventory.',
    credentialMapping: (formData) => ({
      sellerCentralId: formData.sellerCentralId,
      marketplaceId: formData.marketplaceId,
      accessKey: formData.accessKey,
      secretKey: formData.secretKey,
      authToken: formData.authToken
    })
  },
  etsy: {
    fields: [
      { name: 'shopName', label: 'Shop Name', type: 'text', required: true, placeholder: 'Enter Etsy Shop Name' },
      { name: 'apiKey', label: 'API Key', type: 'text', required: true, placeholder: 'Enter Etsy API Key' },
      { name: 'apiSecret', label: 'API Secret', type: 'password', required: true, placeholder: 'Enter Etsy API Secret' },
      { name: 'accessToken', label: 'Access Token', type: 'password', required: true, placeholder: 'Enter Etsy OAuth Access Token' },
      { name: 'refreshToken', label: 'Refresh Token', type: 'password', required: false, placeholder: 'Enter Etsy OAuth Refresh Token (optional)' },
    ],
    description: 'Connect to Etsy marketplace to synchronize orders and manage inventory.',
    credentialMapping: (formData) => ({
      shopName: formData.shopName,
      apiKey: formData.apiKey,
      apiSecret: formData.apiSecret,
      accessToken: formData.accessToken,
      refreshToken: formData.refreshToken || ''
    })
  },
  shopify: {
    fields: [
      { name: 'shopUrl', label: 'Shop URL', type: 'text', required: true, placeholder: 'Enter Shopify Store URL (e.g., mystore.myshopify.com)' },
      { name: 'apiKey', label: 'API Key', type: 'text', required: true, placeholder: 'Enter Shopify API Key' },
      { name: 'apiSecret', label: 'API Secret', type: 'password', required: true, placeholder: 'Enter Shopify API Secret' },
      { name: 'accessToken', label: 'Access Token', type: 'password', required: true, placeholder: 'Enter Shopify Access Token' },
    ],
    description: 'Connect to Shopify store to synchronize orders and manage inventory.',
    credentialMapping: (formData) => ({
      shopUrl: formData.shopUrl,
      apiKey: formData.apiKey,
      apiSecret: formData.apiSecret,
      accessToken: formData.accessToken
    })
  },
  csv: {
    fields: [
      { name: 'delimiter', label: 'CSV Delimiter', type: 'text', required: false, placeholder: 'Enter CSV delimiter (default: ,)', defaultValue: ',' },
      { name: 'dateFormat', label: 'Date Format', type: 'text', required: false, placeholder: 'Enter date format (default: YYYY-MM-DD)', defaultValue: 'YYYY-MM-DD' },
    ],
    description: 'Import orders from CSV files with custom formatting.',
    credentialMapping: (formData) => ({
      delimiter: formData.delimiter || ',',
      dateFormat: formData.dateFormat || 'YYYY-MM-DD'
    })
  }
};

const PlatformConnections = () => {
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  // Initialize empty form data
  const [formData, setFormData] = useState({
    name: '',
    platformType: 'trendyol',
    isActive: true
  });
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [platformTypes, setPlatformTypes] = useState([
    { id: 'trendyol', name: 'Trendyol', icon: '🇹🇷' },
    { id: 'hepsiburada', name: 'Hepsiburada', icon: '🔴' },
    { id: 'n11', name: 'N11', icon: '🟢' },
    { id: 'amazon', name: 'Amazon', icon: '📦' },
    { id: 'etsy', name: 'Etsy', icon: '🧶' },
    { id: 'shopify', name: 'Shopify', icon: '🛒' },
    { id: 'csv', name: 'CSV Import', icon: '📊' }
  ]);
  
  const { success, error } = useContext(AlertContext);
  const { isAuthenticated } = useAuth();
  
  // Fetch connections
  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      
      // Ensure we have the authentication token in headers
      const token = localStorage.getItem('token');
      if (token) {
        // Make sure we're using the correct format: "Bearer TOKEN"
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Updated endpoint to match backend routes
      const response = await axios.get('/platforms/connections');
      
      if (response.data.success) {
        setConnections(response.data.data);
      } else {
        error(response.data.message || 'Failed to fetch platform connections');
      }
    } catch (err) {
      console.error('Error fetching connections:', err);
      error('Failed to fetch platform connections. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [error]);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchConnections();
    }
  }, [fetchConnections, isAuthenticated]);
  
  // Handle form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Handle platform type change
  const handlePlatformTypeChange = (e) => {
    const newPlatformType = e.target.value;
    
    // Keep existing basic form data
    const newFormData = {
      ...formData,
      platformType: newPlatformType
    };
    
    // Reset platform-specific fields to empty or default values
    if (platformFieldConfigs[newPlatformType]) {
      platformFieldConfigs[newPlatformType].fields.forEach(field => {
        newFormData[field.name] = field.defaultValue || '';
      });
    }
    
    setFormData(newFormData);
    // Clear test results when platform changes
    setTestResult(null);
  };
  
  // Reset form
  const resetForm = () => {
    // Start with basic form data
    const newFormData = {
      name: '',
      platformType: 'trendyol',
      isActive: true
    };
    
    // Add empty fields for all possible platform fields
    // This ensures we don't get 'undefined' errors when switching platforms
    Object.values(platformFieldConfigs).forEach(config => {
      config.fields.forEach(field => {
        newFormData[field.name] = field.defaultValue || '';
      });
    });
    
    setFormData(newFormData);
    setTestResult(null);
  };
  
  // Test connection
  const testConnection = async () => {
    try {
      setTestLoading(true);
      setTestResult(null);
      
      // Ensure authentication token is set
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Format credentials with the correct fields based on platform type
      const platformConfig = platformFieldConfigs[formData.platformType];
      const credentials = platformConfig.credentialMapping(formData);
      
      // Format the data correctly for the test endpoint
      const testData = {
        platformType: formData.platformType,
        credentials: credentials
      };
      
      let response;
      
      // If we're editing an existing connection, use the existing connection test endpoint
      if (selectedConnection) {
        response = await axios.post(`/platforms/connections/${selectedConnection.id}/test`, testData);
      } else {
        // For new connections, use the test endpoint for new connections
        response = await axios.post(`/platforms/connections/test`, testData);
      }
      
      setTestResult(response.data);
    } catch (err) {
      console.error('Error testing connection:', err);
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'Error testing connection'
      });
    } finally {
      setTestLoading(false);
    }
  };
  
  // Add connection
  const addConnection = async (e) => {
    e.preventDefault();
    
    try {
      setModalLoading(true);
      
      // Ensure authentication token is set
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Format credentials with the correct fields based on platform type
      const platformConfig = platformFieldConfigs[formData.platformType];
      const credentials = platformConfig.credentialMapping(formData);
      
      // Format the data according to what the backend expects
      const connectionData = {
        platformType: formData.platformType,
        name: formData.name,
        platformName: formData.name, // Add platformName field to match backend requirement
        credentials: credentials,
        status: formData.isActive ? 'active' : 'inactive'
      };
      
      const response = await axios.post('/platforms/connections', connectionData);
      
      if (response.data.success) {
        setShowAddModal(false);
        resetForm();
        fetchConnections();
        success('Platform connection added successfully');
      } else {
        error(response.data.message || 'Failed to add platform connection');
      }
    } catch (err) {
      console.error('Error adding connection:', err);
      error(err.response?.data?.message || 'Failed to add platform connection');
    } finally {
      setModalLoading(false);
    }
  };
  
  // Edit connection
  const editConnection = async (e) => {
    e.preventDefault();
    
    try {
      setModalLoading(true);
      
      // Ensure authentication token is set
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Format credentials with the correct fields based on platform type
      const platformConfig = platformFieldConfigs[formData.platformType];
      const credentials = platformConfig.credentialMapping(formData);
      
      // Format data properly for update, including platformName
      const updateData = {
        name: formData.name,
        platformName: formData.name, // Ensure platformName is updated along with name
        credentials: credentials,
        status: formData.isActive ? 'active' : 'inactive'
      };
      
      const response = await axios.put(`/platforms/connections/${selectedConnection.id}`, updateData);
      
      if (response.data.success) {
        setShowEditModal(false);
        resetForm();
        fetchConnections();
        success('Platform connection updated successfully');
      } else {
        error(response.data.message || 'Failed to update platform connection');
      }
    } catch (err) {
      console.error('Error updating connection:', err);
      error(err.response?.data?.message || 'Failed to update platform connection');
    } finally {
      setModalLoading(false);
    }
  };
  
  // Delete connection
  const deleteConnection = async () => {
    try {
      setModalLoading(true);
      
      // Ensure authentication token is set
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.delete(`/platforms/connections/${selectedConnection.id}`);
      
      if (response.data.success) {
        setShowDeleteModal(false);
        setSelectedConnection(null);
        fetchConnections();
        success('Platform connection deleted successfully');
      } else {
        error(response.data.message || 'Failed to delete platform connection');
      }
    } catch (err) {
      console.error('Error deleting connection:', err);
      error(err.response?.data?.message || 'Failed to delete platform connection');
    } finally {
      setModalLoading(false);
    }
  };
  
  // Sync orders
  const syncOrders = async (connectionId) => {
    try {
      // Ensure authentication token is set
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Show sync is starting
      success(`Starting order sync. This may take a moment...`);
      
      const response = await axios.post(`/orders/sync/${connectionId}`, {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
        endDate: new Date().toISOString()
      });
      
      if (response.data.success) {
        // Check if we have information about skipped/duplicate orders
        const newOrders = response.data.data?.count || 0;
        const skippedOrders = response.data.data?.skipped || 0;
        
        let message = `Successfully synced ${newOrders} orders`;
        if (skippedOrders > 0) {
          message += ` (${skippedOrders} duplicate orders were skipped)`;
        }
        
        success(message);
        
        // Refresh the connection to update lastSyncAt time
        fetchConnections();
      } else {
        error(response.data.message || 'Failed to sync orders');
      }
    } catch (err) {
      console.error('Error syncing orders:', err);
      
      // Handle duplicate order error more gracefully
      if (err.response?.data?.error?.name === 'SequelizeUniqueConstraintError') {
        error('Orders are already synced. Try again later or with a different date range.');
      } else {
        error(err.response?.data?.message || 'Failed to sync orders. Check server logs for details.');
      }
    }
  };
  
  // Handle edit click
  const handleEditClick = async (connection) => {
    setSelectedConnection(connection);

    try {
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get(`/platforms/connections/${connection.id}`);

      if (response.data.success) {
        const connectionData = response.data.data;
        
        // Start with basic form data
        const newFormData = {
          name: connectionData.name,
          platformType: connectionData.platformType,
          isActive: connectionData.status === 'active'
        };

        try {
          const credentials = typeof connectionData.credentials === 'string'
            ? JSON.parse(connectionData.credentials)
            : connectionData.credentials;
          
          // Map credential fields based on platform type
          if (connectionData.platformType && platformFieldConfigs[connectionData.platformType]) {
            const platformConfig = platformFieldConfigs[connectionData.platformType];
            
            // Map each field from the credentials to the form data
            platformConfig.fields.forEach(field => {
              // For platform-specific field names, map them from the credentials
              newFormData[field.name] = credentials[field.name] || '';
            });
            
            // Handle special cases
            if (connectionData.platformType === 'trendyol' && credentials.sellerId) {
              newFormData.sellerId = credentials.sellerId;
            } else if (connectionData.platformType === 'n11') {
              if (credentials.appKey) newFormData.appKey = credentials.appKey;
              if (credentials.appSecret) newFormData.appSecret = credentials.appSecret;
            } else if (connectionData.platformType === 'hepsiburada' && credentials.merchantId) {
              newFormData.merchantId = credentials.merchantId;
            }
          }
        } catch (err) {
          console.error('Error parsing connection credentials:', err);
        }

        setFormData(newFormData);
      } else {
        error('Failed to load connection details');
      }
    } catch (err) {
      console.error('Error loading connection details:', err);
      error('Failed to load connection details');
    }

    setShowEditModal(true);
  };
  
  // Handle delete click
  const handleDeleteClick = (connection) => {
    setSelectedConnection(connection);
    setShowDeleteModal(true);
  };
  
  // Get status badge color
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'error':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'secondary';
    }
  };
  
  // Get platform icon
  const getPlatformIcon = (platformType) => {
    const platform = platformTypes.find(p => p.id === platformType);
    return platform ? platform.icon : '🔌';
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading platform connections...</p>
      </div>
    );
  }
  
  return (
    <div className="platform-connections">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Platform Connections</h2>
        <Button 
          variant="primary" 
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          <FaPlus className="me-2" />
          Add Platform
        </Button>
      </div>
      
      <Card className="shadow-sm">
        <Card.Body>
          {connections.length === 0 ? (
            <div className="text-center p-5">
              <FaPlug size={48} className="text-muted mb-3" />
              <h5>No Platform Connections</h5>
              <p className="text-muted mb-4">
                Connect your e-commerce platforms to centralize order management.
              </p>
              <Button 
                variant="primary" 
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
              >
                <FaPlus className="me-2" />
                Add Your First Platform
              </Button>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Store ID</th>
                    <th>Last Sync</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {connections.map(connection => (
                    <tr key={connection.id}>
                      <td>
                        <span className="me-2" style={{ fontSize: '1.5rem' }}>
                          {getPlatformIcon(connection.platformType)}
                        </span>
                        <span className="text-capitalize">{connection.platformType}</span>
                      </td>
                      <td>{connection.name}</td>
                      <td>
                        <Badge bg={getStatusBadge(connection.status)}>
                          {connection.status}
                        </Badge>
                      </td>
                      <td>{connection.storeId || 'N/A'}</td>
                      <td>{formatDate(connection.lastSyncAt)}</td>
                      <td>
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          className="me-2"
                          onClick={() => syncOrders(connection.id)}
                          disabled={connection.status !== 'active'}
                        >
                          <FaSync />
                          <span className="d-none d-md-inline ms-1">Sync</span>
                        </Button>
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          className="me-2"
                          onClick={() => handleEditClick(connection)}
                        >
                          <FaEdit />
                          <span className="d-none d-md-inline ms-1">Edit</span>
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => handleDeleteClick(connection)}
                        >
                          <FaTrash />
                          <span className="d-none d-md-inline ms-1">Delete</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
      
      {/* Add Connection Modal */}
      <Modal 
        show={showAddModal} 
        onHide={() => setShowAddModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Add Platform Connection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={addConnection}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Platform</Form.Label>
                  <Form.Select
                    name="platformType"
                    value={formData.platformType}
                    onChange={handlePlatformTypeChange}
                    required
                  >
                    {platformTypes.map(platform => (
                      <option key={platform.id} value={platform.id}>
                        {platform.icon} {platform.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Connection Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., My Trendyol Store"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            {platformFieldConfigs[formData.platformType].fields.map(field => (
              <Form.Group className="mb-3" key={field.name}>
                <Form.Label>{field.label}</Form.Label>
                <Form.Control
                  type={field.type}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              </Form.Group>
            ))}
            
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                label="Active"
              />
              <Form.Text className="text-muted">
                Inactive connections won't sync orders.
              </Form.Text>
            </Form.Group>
            
            {testResult && (
              <Alert variant={testResult.success ? 'success' : 'danger'} className="mt-3">
                {testResult.success ? <FaCheck className="me-2" /> : <FaExclamationTriangle className="me-2" />}
                {typeof testResult.message === 'object' ? 
                  (testResult.message instanceof Error ? 
                    testResult.message.toString() : 
                    JSON.stringify(testResult.message)) : 
                  testResult.message}
              </Alert>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="outline-secondary" 
            onClick={() => {
              setShowAddModal(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="info"
            onClick={testConnection}
            disabled={testLoading}
            className="me-2"
          >
            {testLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Testing...
              </>
            ) : (
              <>
                <FaInfoCircle className="me-2" />
                Test Connection
              </>
            )}
          </Button>
          <Button 
            variant="primary" 
            onClick={addConnection}
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
                Adding...
              </>
            ) : (
              <>
                <FaPlus className="me-2" />
                Add Connection
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Edit Connection Modal */}
      <Modal 
        show={showEditModal} 
        onHide={() => setShowEditModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Platform Connection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={editConnection}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Platform</Form.Label>
                  <Form.Select
                    name="platformType"
                    value={formData.platformType}
                    onChange={handleChange}
                    disabled
                  >
                    {platformTypes.map(platform => (
                      <option key={platform.id} value={platform.id}>
                        {platform.icon} {platform.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Platform type cannot be changed.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Connection Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., My Trendyol Store"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            {platformFieldConfigs[formData.platformType].fields.map(field => (
              <Form.Group className="mb-3" key={field.name}>
                <Form.Label>{field.label}</Form.Label>
                <Form.Control
                  type={field.type}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  required={field.required}
                />
                {field.name === 'apiSecret' && (
                  <Form.Text className="text-muted">
                    Leave blank to keep current secret.
                  </Form.Text>
                )}
              </Form.Group>
            ))}
            
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                label="Active"
              />
              <Form.Text className="text-muted">
                Inactive connections won't sync orders.
              </Form.Text>
            </Form.Group>
            
            {testResult && (
              <Alert variant={testResult.success ? 'success' : 'danger'} className="mt-3">
                {testResult.success ? <FaCheck className="me-2" /> : <FaExclamationTriangle className="me-2" />}
                {typeof testResult.message === 'object' ? 
                  (testResult.message instanceof Error ? 
                    testResult.message.toString() : 
                    JSON.stringify(testResult.message)) : 
                  testResult.message}
              </Alert>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="outline-secondary" 
            onClick={() => {
              setShowEditModal(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="info"
            onClick={testConnection}
            disabled={testLoading}
            className="me-2"
          >
            {testLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Testing...
              </>
            ) : (
              <>
                <FaInfoCircle className="me-2" />
                Test Connection
              </>
            )}
          </Button>
          <Button 
            variant="primary" 
            onClick={editConnection}
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
                Saving...
              </>
            ) : (
              <>
                <FaCheck className="me-2" />
                Save Changes
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Delete Connection Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Connection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to delete the connection to{' '}
            <strong>{selectedConnection?.name}</strong>?
          </p>
          <Alert variant="warning">
            <FaExclamationTriangle className="me-2" />
            This action cannot be undone. Order history from this platform will remain in the system.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={deleteConnection}
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
                Deleting...
              </>
            ) : (
              <>
                <FaTrash className="me-2" />
                Delete Connection
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PlatformConnections;