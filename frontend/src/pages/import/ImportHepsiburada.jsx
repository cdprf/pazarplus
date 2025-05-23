import React, { useState, useEffect, useContext } from 'react';
import { 
  Card, 
  Button, 
  Form, 
  Row, 
  Col, 
  Spinner, 
  Alert, 
  Table,
  Badge,
  Tabs,
  Tab
} from 'react-bootstrap';
import { FaUpload, FaFileImport, FaCode, FaPaste, FaExclamationTriangle, FaCheck, FaSync, FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { AlertContext } from '../../context/AlertContext';
import { useImportHepsiburadaOrder } from '../../hooks/useOrders';
import axios from 'axios';

const ImportHepsiburada = () => {
  const [loading, setLoading] = useState(false);
  const [platformConnections, setPlatformConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState('');
  const [jsonData, setJsonData] = useState('');
  const [file, setFile] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [directFetchMode, setDirectFetchMode] = useState(false);
  const [merchantId, setMerchantId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [fetchingOrders, setFetchingOrders] = useState(false);
  const [fetchingOrderDetails, setFetchingOrderDetails] = useState(false);
  
  const { success, error: showError } = useContext(AlertContext);
  const navigate = useNavigate();
  
  // Use the import hook
  const { mutate: importOrder, isLoading: isImporting, isError, isSuccess, data: importResult } = useImportHepsiburadaOrder();
  
  // Fetch Hepsiburada platform connections
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        setLoading(true);
        
        // Fetch platform connections
        const response = await axios.get('/api/platforms/connections');
        
        if (response.data.success) {
          // Filter to only show Hepsiburada connections
          const hbConnections = response.data.data.filter(
            conn => conn.platformType === 'hepsiburada'
          );
          
          setPlatformConnections(hbConnections);
          
          // Select the first connection by default if available
          if (hbConnections.length > 0) {
            setSelectedConnection(hbConnections[0].id);
            
            // Extract merchantId from the first connection
            try {
              const credentials = JSON.parse(hbConnections[0].credentials);
              if (credentials && credentials.merchantId) {
                setMerchantId(credentials.merchantId);
              }
            } catch (e) {
              console.error('Error parsing connection credentials:', e);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch platform connections', err);
        showError('Failed to load Hepsiburada connections. Please check your connection setup.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchConnections();
  }, [showError]);
  
  // Handle JSON text change
  const handleJsonChange = (e) => {
    setJsonData(e.target.value);
    setValidationError(null);
    setValidationSuccess(false);
    setParsedData(null);
  };
  
  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setJsonData('');
    setValidationError(null);
    setValidationSuccess(false);
    setParsedData(null);
  };
  
  // Validate JSON data
  const validateJson = () => {
    setValidationError(null);
    setValidationSuccess(false);
    
    try {
      let dataToValidate = jsonData;
      
      // Parse the JSON data
      let parsedJson;
      try {
        parsedJson = JSON.parse(dataToValidate);
      } catch (e) {
        // Try to parse as a single object if the data is not an array
        if (dataToValidate.trim().startsWith('{')) {
          parsedJson = JSON.parse(dataToValidate);
        } else {
          throw e;
        }
      }
      
      // Handle array of orders
      if (Array.isArray(parsedJson)) {
        if (parsedJson.length === 0) {
          setValidationError('The JSON data is an empty array. There are no orders to import.');
          return;
        }
        
        // Use the first order for validation
        parsedJson = parsedJson[0];
      }
      
      // Support both package list and order details formats
      if (parsedJson.id && parsedJson.packageNumber) {
        // Package list format
        setParsedData(parsedJson);
        setValidationSuccess(true);
        success('Order data validated successfully.');
      } else if (parsedJson.orderId && parsedJson.orderNumber && parsedJson.items) {
        // Order details format
        setParsedData(parsedJson);
        setValidationSuccess(true);
        success('Order data validated successfully.');
      } else {
        setValidationError('Invalid Hepsiburada order format. Missing required fields.');
        return;
      }
      
    } catch (err) {
      console.error('JSON validation error:', err);
      setValidationError('Invalid JSON format. Please check your data.');
    }
  };
  
  // Read file and validate
  const readAndValidateFile = () => {
    if (!file) {
      showError('Please select a file to upload');
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const fileContent = e.target.result;
        setJsonData(fileContent);
        
        // Parse the JSON data
        let parsedJson;
        try {
          parsedJson = JSON.parse(fileContent);
        } catch (e) {
          // Try to parse as a single object if the data is not an array
          if (fileContent.trim().startsWith('{')) {
            parsedJson = JSON.parse(fileContent);
          } else {
            throw e;
          }
        }
        
        // Handle array of orders
        if (Array.isArray(parsedJson)) {
          if (parsedJson.length === 0) {
            setValidationError('The JSON file is an empty array. There are no orders to import.');
            return;
          }
          
          // Use the first order for validation
          parsedJson = parsedJson[0];
        }
        
        // Support both package list and order details formats
        if (parsedJson.id && parsedJson.packageNumber) {
          // Package list format
          setParsedData(parsedJson);
          setValidationSuccess(true);
          success('Order data validated successfully.');
        } else if (parsedJson.orderId && parsedJson.orderNumber && parsedJson.items) {
          // Order details format
          setParsedData(parsedJson);
          setValidationSuccess(true);
          success('Order data validated successfully.');
        } else {
          setValidationError('Invalid Hepsiburada order format. Missing required fields.');
          return;
        }
        
      } catch (err) {
        console.error('File read error:', err);
        setValidationError('Invalid JSON file. Please check the file format.');
      }
    };
    
    reader.onerror = () => {
      setValidationError('Error reading file. Please try again.');
    };
    
    reader.readAsText(file);
  };
  
  // Fetch orders directly from Hepsiburada API
  const fetchOrdersDirectly = async () => {
    if (!merchantId || !apiKey) {
      showError('Please enter both Merchant ID and API Key');
      return;
    }
    
    try {
      setFetchingOrders(true);
      setValidationError(null);
      
      // Use the proxy endpoint to make the request to Hepsiburada
      const response = await axios.post('/api/proxy/hepsiburada', {
        url: `https://oms-external.hepsiburada.com/packages/merchantid/${merchantId}?offset=0&limit=100`,
        headers: {
          'User-Agent': 'sentosyazilim_dev',
          'Authorization': `Basic ${apiKey}`
        }
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        setValidationError('Invalid response from Hepsiburada API. No orders found.');
        return;
      }
      
      if (response.data.length === 0) {
        setValidationError('No orders found for the provided Merchant ID.');
        return;
      }
      
      // Format the response as JSON
      const formattedData = JSON.stringify(response.data, null, 2);
      setJsonData(formattedData);
      
      // Store the first order for preview
      setParsedData(response.data[0]);
      setValidationSuccess(true);
      success(`Successfully fetched ${response.data.length} orders from Hepsiburada.`);
      
    } catch (err) {
      console.error('Error fetching orders from Hepsiburada:', err);
      setValidationError(`Failed to fetch orders: ${err.message}`);
    } finally {
      setFetchingOrders(false);
    }
  };
  
  // Fetch specific order details by order number
  const fetchOrderDetails = async () => {
    if (!merchantId || !apiKey || !orderNumber) {
      showError('Please enter Merchant ID, API Key and Order Number');
      return;
    }
    
    try {
      setFetchingOrderDetails(true);
      setValidationError(null);
      
      // Use the proxy endpoint to make the request to Hepsiburada
      const response = await axios.post('/api/proxy/hepsiburada', {
        url: `https://oms-external.hepsiburada.com/orders/merchantid/${merchantId}/ordernumber/${orderNumber}`,
        headers: {
          'User-Agent': 'sentosyazilim_dev',
          'Authorization': `Basic ${apiKey}`
        }
      });
      
      if (!response.data || !response.data.orderId) {
        setValidationError('Invalid response from Hepsiburada API. Order details not found.');
        return;
      }
      
      // Format the response as JSON
      const formattedData = JSON.stringify(response.data, null, 2);
      setJsonData(formattedData);
      
      // Store the order data for preview
      setParsedData(response.data);
      setValidationSuccess(true);
      success(`Successfully fetched order details for order ${orderNumber}.`);
      
    } catch (err) {
      console.error('Error fetching order details from Hepsiburada:', err);
      setValidationError(`Failed to fetch order details: ${err.message}`);
    } finally {
      setFetchingOrderDetails(false);
    }
  };
  
  // Import the order
  const handleImport = () => {
    if (!parsedData) {
      showError('Please validate the order data first');
      return;
    }
    
    if (!selectedConnection) {
      showError('Please select a Hepsiburada connection');
      return;
    }
    
    // Check if we have multiple orders (array)
    let orderData = parsedData;
    
    try {
      // If jsonData is an array, process all orders
      const jsonOrders = JSON.parse(jsonData);
      if (Array.isArray(jsonOrders)) {
        // Import first order for now, ideally would batch import
        orderData = jsonOrders[0];
        
        // TODO: Implement batch import for multiple orders
        success(`Importing the first order out of ${jsonOrders.length} orders. Batch import will be available in future updates.`);
      }
    } catch (e) {
      // If not valid JSON array, continue with single order
    }
    
    // Send the import request
    importOrder({
      orderData: orderData,
      connectionId: selectedConnection
    });
  };
  
  // Navigate to order details after successful import
  useEffect(() => {
    if (isSuccess && importResult?.data?.id) {
      success('Order imported successfully!');
      setTimeout(() => {
        navigate(`/orders/${importResult.data.id}`);
      }, 1500);
    }
  }, [isSuccess, importResult, navigate, success]);
  
  // Handle selection of a connection
  const handleConnectionChange = (e) => {
    const selectedConnId = e.target.value;
    setSelectedConnection(selectedConnId);
    
    // Find the selected connection
    const selectedConn = platformConnections.find(conn => conn.id === selectedConnId);
    if (selectedConn) {
      try {
        const credentials = JSON.parse(selectedConn.credentials);
        if (credentials && credentials.merchantId) {
          setMerchantId(credentials.merchantId);
        }
      } catch (e) {
        console.error('Error parsing connection credentials:', e);
      }
    }
  };
  
  // Render a preview of the order based on format
  const renderOrderPreview = () => {
    if (!parsedData) return null;
    
    // Handle order details format
    if (parsedData.orderId && parsedData.orderNumber && parsedData.items) {
      const { 
        orderId, 
        orderNumber, 
        orderDate, 
        paymentStatus, 
        items,
        customer
      } = parsedData;
      
      return (
        <div className="mt-4">
          <h5 className="mb-3">Order Preview (Order Details Format)</h5>
          <Row>
            <Col md={6}>
              <Table bordered>
                <tbody>
                  <tr>
                    <th>Order Number</th>
                    <td>{orderNumber}</td>
                  </tr>
                  <tr>
                    <th>Order ID</th>
                    <td>{orderId}</td>
                  </tr>
                  <tr>
                    <th>Date</th>
                    <td>{new Date(orderDate).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <th>Customer</th>
                    <td>{customer?.name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Status</th>
                    <td>
                      <Badge bg="info">{paymentStatus || 'N/A'}</Badge>
                    </td>
                  </tr>
                  <tr>
                    <th>Shipping</th>
                    <td>{items?.[0]?.cargoCompany || 'N/A'}</td>
                  </tr>
                </tbody>
              </Table>
            </Col>
            <Col md={6}>
              <h6>Items ({items?.length || 0})</h6>
              <Table bordered size="sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Quantity</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {items?.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>
                        {item.totalPrice?.amount} {item.totalPrice?.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Col>
          </Row>
        </div>
      );
    }
    
    // Handle package list format
    const { 
      id, 
      packageNumber, 
      orderDate, 
      customerName, 
      recipientName, 
      status, 
      items,
      totalPrice,
      cargoCompany,
      estimatedArrivalDate
    } = parsedData;
    
    return (
      <div className="mt-4">
        <h5 className="mb-3">Order Preview (Package Format)</h5>
        <Row>
          <Col md={6}>
            <Table bordered>
              <tbody>
                <tr>
                  <th>Package Number</th>
                  <td>{packageNumber}</td>
                </tr>
                <tr>
                  <th>ID</th>
                  <td>{id}</td>
                </tr>
                <tr>
                  <th>Date</th>
                  <td>{new Date(orderDate).toLocaleString()}</td>
                </tr>
                <tr>
                  <th>Customer</th>
                  <td>{customerName || recipientName || 'N/A'}</td>
                </tr>
                <tr>
                  <th>Status</th>
                  <td>
                    <Badge bg="info">{status || 'N/A'}</Badge>
                  </td>
                </tr>
                <tr>
                  <th>Cargo Company</th>
                  <td>{cargoCompany || 'N/A'}</td>
                </tr>
                <tr>
                  <th>Est. Delivery</th>
                  <td>{estimatedArrivalDate ? new Date(estimatedArrivalDate).toLocaleDateString() : 'N/A'}</td>
                </tr>
                <tr>
                  <th>Total Price</th>
                  <td>{totalPrice?.amount} {totalPrice?.currency}</td>
                </tr>
              </tbody>
            </Table>
          </Col>
          <Col md={6}>
            <h6>Items ({items?.length || 0})</h6>
            <Table bordered size="sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Quantity</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {items?.map((item, index) => (
                  <tr key={index}>
                    <td>{item.productName}</td>
                    <td>{item.quantity}</td>
                    <td>
                      {item.totalPrice?.amount} {item.totalPrice?.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Col>
        </Row>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading connections...</p>
      </div>
    );
  }
  
  return (
    <div className="import-hepsiburada">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Import Hepsiburada Order</h2>
        
        <div>
          <Button 
            variant={directFetchMode ? "primary" : "outline-primary"}
            onClick={() => setDirectFetchMode(!directFetchMode)}
            className="me-2"
          >
            <FaSync className="me-2" />
            {directFetchMode ? "Manual Import Mode" : "Direct API Fetch Mode"}
          </Button>
        </div>
      </div>
      
      {platformConnections.length === 0 ? (
        <Alert variant="warning">
          <Alert.Heading>No Hepsiburada Connections</Alert.Heading>
          <p>
            You need to set up a Hepsiburada platform connection before importing orders.
          </p>
          <div className="d-flex justify-content-end">
            <Button variant="warning" href="/platforms">
              Set Up Connection
            </Button>
          </div>
        </Alert>
      ) : (
        <>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Import Order Data</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-4">
                <Form.Label>Select Hepsiburada Connection</Form.Label>
                <Form.Select
                  value={selectedConnection}
                  onChange={handleConnectionChange}
                  required
                >
                  {platformConnections.map(conn => (
                    <option key={conn.id} value={conn.id}>{conn.name}</option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Select the Hepsiburada platform connection to use for this order.
                </Form.Text>
              </Form.Group>
              
              {directFetchMode ? (
                <div className="direct-fetch-mode mb-4">
                  <h5 className="mb-3">Fetch Orders from Hepsiburada API</h5>
                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Merchant ID</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="e.g., 0d18db3e-a981-4583-b26b-bb0712ee83ac"
                          value={merchantId}
                          onChange={(e) => setMerchantId(e.target.value)}
                        />
                        <Form.Text className="text-muted">
                          Your Hepsiburada merchant ID
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>API Key</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder="e.g., MGQxOGRiM2UtYTk4MS00NTgzLWIyNmItYmIwNzEyZWU4M2Fj..."
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                        />
                        <Form.Text className="text-muted">
                          Base64 encoded API key for authentication
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Tabs defaultActiveKey="list" className="mb-4">
                    <Tab eventKey="list" title={<><FaSync className="me-2" /> Order List</>}>
                      <div className="mt-3 mb-3">
                        <p className="text-muted">
                          Fetch a list of recent orders from Hepsiburada using the following endpoint:
                          <br />
                          <code>https://oms-external.hepsiburada.com/packages/merchantid/{merchantId}</code>
                        </p>
                        
                        <Button
                          variant="primary"
                          onClick={fetchOrdersDirectly}
                          disabled={!merchantId || !apiKey || fetchingOrders}
                        >
                          {fetchingOrders ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                              Fetching Orders...
                            </>
                          ) : (
                            <>
                              <FaSync className="me-2" />
                              Fetch Orders
                            </>
                          )}
                        </Button>
                      </div>
                    </Tab>
                    
                    <Tab eventKey="details" title={<><FaSearch className="me-2" /> Order Details</>}>
                      <div className="mt-3 mb-3">
                        <p className="text-muted">
                          Fetch details for a specific order from Hepsiburada using the following endpoint:
                          <br />
                          <code>https://oms-external.hepsiburada.com/orders/merchantid/{merchantId}/ordernumber/{'{orderNumber}'}</code>
                        </p>
                        
                        <Row className="mb-3">
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Order Number</Form.Label>
                              <Form.Control
                                type="text"
                                placeholder="e.g., 4138548772"
                                value={orderNumber}
                                onChange={(e) => setOrderNumber(e.target.value)}
                              />
                              <Form.Text className="text-muted">
                                The Hepsiburada order number to fetch details for
                              </Form.Text>
                            </Form.Group>
                          </Col>
                          <Col md={6} className="d-flex align-items-end">
                            <Button
                              variant="primary"
                              onClick={fetchOrderDetails}
                              disabled={!merchantId || !apiKey || !orderNumber || fetchingOrderDetails}
                              className="mb-3"
                            >
                              {fetchingOrderDetails ? (
                                <>
                                  <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-2"
                                  />
                                  Fetching Order...
                                </>
                              ) : (
                                <>
                                  <FaSearch className="me-2" />
                                  Fetch Order Details
                                </>
                              )}
                            </Button>
                          </Col>
                        </Row>
                      </div>
                    </Tab>
                  </Tabs>
                </div>
              ) : (
                <Tabs defaultActiveKey="paste" className="mb-4">
                  <Tab eventKey="paste" title={<><FaPaste className="me-2" /> Paste JSON</>}>
                    <Form.Group className="mt-3 mb-3">
                      <Form.Label>Paste Hepsiburada Order JSON</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={10}
                        value={jsonData}
                        onChange={handleJsonChange}
                        placeholder="Paste your Hepsiburada order JSON data here..."
                      />
                      <Form.Text className="text-muted">
                        Paste the complete Hepsiburada order JSON response from the API.
                      </Form.Text>
                    </Form.Group>
                    
                    <Button
                      variant="primary"
                      onClick={validateJson}
                      disabled={!jsonData.trim()}
                      className="me-2"
                    >
                      <FaCode className="me-2" />
                      Validate JSON
                    </Button>
                  </Tab>
                  
                  <Tab eventKey="file" title={<><FaFileImport className="me-2" /> Upload File</>}>
                    <Form.Group className="mt-3 mb-3">
                      <Form.Label>Upload Hepsiburada Order JSON File</Form.Label>
                      <Form.Control
                        type="file"
                        onChange={handleFileChange}
                        accept=".json"
                      />
                      <Form.Text className="text-muted">
                        Select a JSON file containing Hepsiburada order data.
                      </Form.Text>
                    </Form.Group>
                    
                    <Button
                      variant="primary"
                      onClick={readAndValidateFile}
                      disabled={!file}
                      className="me-2"
                    >
                      <FaCode className="me-2" />
                      Validate File
                    </Button>
                  </Tab>
                </Tabs>
              )}
              
              {validationError && (
                <Alert variant="danger" className="mt-3">
                  <FaExclamationTriangle className="me-2" />
                  {validationError}
                </Alert>
              )}
              
              {validationSuccess && (
                <Alert variant="success" className="mt-3">
                  <FaCheck className="me-2" />
                  Order data is valid and ready to import.
                </Alert>
              )}
              
              {jsonData && renderOrderPreview()}
              
              <div className="mt-4">
                <Button
                  variant="success"
                  onClick={handleImport}
                  disabled={!validationSuccess || !selectedConnection || isImporting}
                  className="me-2"
                >
                  {isImporting ? (
                    <>
                      <Spinner 
                        as="span" 
                        animation="border" 
                        size="sm" 
                        role="status" 
                        aria-hidden="true" 
                        className="me-2"
                      />
                      Importing...
                    </>
                  ) : (
                    <>
                      <FaUpload className="me-2" />
                      Import Order
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline-secondary"
                  href="/import"
                >
                  Cancel
                </Button>
              </div>
              
              {isSuccess && importResult && (
                <Alert variant="success" className="mt-4">
                  <Alert.Heading>Import Successful!</Alert.Heading>
                  <p>
                    The order has been successfully imported into your system.
                  </p>
                  <div className="d-flex justify-content-end">
                    <Button
                      variant="outline-success"
                      href={`/orders/${importResult.data.id}`}
                    >
                      View Order
                    </Button>
                  </div>
                </Alert>
              )}
              
              {isError && (
                <Alert variant="danger" className="mt-4">
                  <Alert.Heading>Import Failed</Alert.Heading>
                  <p>
                    Failed to import the order. Please check the data and try again.
                  </p>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
};

export default ImportHepsiburada;