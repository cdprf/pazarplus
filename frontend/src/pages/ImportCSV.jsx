// src/client/pages/ImportCSV.jsx

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
  ProgressBar,
  Badge
} from 'react-bootstrap';
import { FaUpload, FaTable, FaCog, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';
import { AlertContext } from '../context/AlertContext';

const ImportCSV = () => {
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState(null);
  const [platformConnections, setPlatformConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState('');
  const [csvTemplates, setCsvTemplates] = useState({});
  const [csvOptions, setCsvOptions] = useState({
    hasHeaders: true,
    skipHeader: false,
    delimiter: ',',
    overwriteExisting: false
  });
  const [columnMapping, setColumnMapping] = useState({});
  const [validationResult, setValidationResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Map Columns, 3: Import
  
  const { success, error } = useContext(AlertContext);
  
  // Fetch platform connections and CSV templates
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch platform connections
        const connectionsRes = await axios.get('/platforms/connections');
        
        // Fetch CSV templates
        const templatesRes = await axios.get('/csv/templates');
        
        if (connectionsRes.data.success) {
          // Filter to only show CSV type connections
          const csvConnections = connectionsRes.data.data.filter(
            conn => conn.platformType === 'csv'
          );
          
          setPlatformConnections(csvConnections);
        }
        
        if (templatesRes.data.success) {
          setCsvTemplates(templatesRes.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
        error('Failed to load required data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [error]);
  
  // Handle file change
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    // Reset validation and import results
    setValidationResult(null);
    setImportResult(null);
  };
  
  // Handle CSV options change
  const handleOptionChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setCsvOptions({
      ...csvOptions,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Handle template selection
  const handleTemplateChange = (e) => {
    const template = e.target.value;
    
    if (template && csvTemplates[template]) {
      setColumnMapping(csvTemplates[template]);
    } else {
      setColumnMapping({});
    }
  };
  
  // Handle column mapping change
  const handleMappingChange = (e) => {
    const { name, value } = e.target;
    
    setColumnMapping({
      ...columnMapping,
      [name]: value
    });
  };
  
  // Validate CSV file
  const validateFile = async () => {
    if (!file) {
      error('Please select a file to upload');
      return;
    }
    
    try {
      setValidating(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('hasHeaders', csvOptions.hasHeaders);
      formData.append('skipHeader', csvOptions.skipHeader);
      formData.append('delimiter', csvOptions.delimiter);
      
      if (Object.keys(columnMapping).length > 0) {
        formData.append('columnMap', JSON.stringify(columnMapping));
      }
      
      // Validate CSV file
      const res = await axios.post('/csv/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setValidationResult(res.data);
      
      if (res.data.success) {
        setStep(2); // Move to column mapping
        success('File validated successfully');
      } else {
        error(res.data.message || 'Failed to validate file');
      }
    } catch (err) {
      console.error('Failed to validate file', err);
      error('Failed to validate file. Please try again.');
    } finally {
      setValidating(false);
    }
  };
  
  // Import CSV file
  const importFile = async () => {
    if (!file || !selectedConnection) {
      error('Please select a file and platform connection');
      return;
    }
    
    try {
      setImporting(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('hasHeaders', csvOptions.hasHeaders);
      formData.append('skipHeader', csvOptions.skipHeader);
      formData.append('delimiter', csvOptions.delimiter);
      formData.append('overwriteExisting', csvOptions.overwriteExisting);
      
      if (Object.keys(columnMapping).length > 0) {
        formData.append('columnMap', JSON.stringify(columnMapping));
      }
      
      // Import CSV file
      const res = await axios.post(`/csv/import/${selectedConnection}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setImportResult(res.data);
      
      if (res.data.success) {
        setStep(3); // Move to import results
        success('File imported successfully');
      } else {
        error(res.data.message || 'Failed to import file');
      }
    } catch (err) {
      console.error('Failed to import file', err);
      error('Failed to import file. Please try again.');
    } finally {
      setImporting(false);
    }
  };
  
  // Reset the import process
  const resetImport = () => {
    setFile(null);
    setSelectedConnection('');
    setColumnMapping({});
    setValidationResult(null);
    setImportResult(null);
    setStep(1);
    
    // Reset file input
    const fileInput = document.getElementById('csv-file-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };
  
  // Render step 1 - File Upload
  const renderStep1 = () => (
    <Card className="shadow-sm">
      <Card.Header className="bg-white">
        <h5 className="mb-0">Upload CSV File</h5>
      </Card.Header>
      <Card.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Select CSV File</Form.Label>
            <Form.Control
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
            <Form.Text className="text-muted">
              Select a CSV file containing order data to import.
            </Form.Text>
          </Form.Group>
          
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>CSV Options</Form.Label>
                <Form.Check
                  type="checkbox"
                  id="hasHeaders"
                  name="hasHeaders"
                  label="CSV has header row"
                  checked={csvOptions.hasHeaders}
                  onChange={handleOptionChange}
                  className="mb-2"
                />
                <Form.Check
                  type="checkbox"
                  id="skipHeader"
                  name="skipHeader"
                  label="Skip header row"
                  checked={csvOptions.skipHeader}
                  onChange={handleOptionChange}
                  className="mb-2"
                />
                <Form.Check
                  type="checkbox"
                  id="overwriteExisting"
                  name="overwriteExisting"
                  label="Overwrite existing orders"
                  checked={csvOptions.overwriteExisting}
                  onChange={handleOptionChange}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Delimiter</Form.Label>
                <Form.Select
                  name="delimiter"
                  value={csvOptions.delimiter}
                  onChange={handleOptionChange}
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="\t">Tab</option>
                  <option value="|">Pipe (|)</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          
          <div className="d-grid gap-2">
            <Button
              variant="primary"
              onClick={validateFile}
              disabled={!file || validating}
            >
              {validating ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Validating...
                </>
              ) : (
                <>
                  <FaUpload className="me-2" />
                  Validate & Proceed
                </>
              )}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
  
  // Render step 2 - Column Mapping
  const renderStep2 = () => {
    if (!validationResult) {
      return null;
    }
    
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-white">
          <h5 className="mb-0">Map CSV Columns</h5>
        </Card.Header>
        <Card.Body>
          {/* Sample Data Preview */}
          <h6 className="mb-3">Data Preview</h6>
          {validationResult.data?.sampleRows && (
            <div className="table-responsive mb-4">
              <Table bordered hover size="sm">
                <thead>
                  <tr>
                    {validationResult.data.headers.map((header, index) => (
                      <th key={index}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validationResult.data.sampleRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {validationResult.data.headers.map((header, colIndex) => (
                        <td key={colIndex}>{row[header]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
          
          {/* Column Mapping */}
          <Form>
            <h6 className="mb-3">Column Mapping</h6>
            
            <Form.Group className="mb-3">
              <Form.Label>Use Template</Form.Label>
              <Form.Select onChange={handleTemplateChange}>
                <option value="">Select a template</option>
                <option value="generic">Generic CSV</option>
                <option value="trendyol">Trendyol Export</option>
                <option value="hepsiburada">Hepsiburada Export</option>
                <option value="n11">N11 Export</option>
              </Form.Select>
              <Form.Text className="text-muted">
                Select a predefined template or map columns manually below.
              </Form.Text>
            </Form.Group>
            
            <Row>
              {/* Essential Fields */}
              <Col md={6}>
                <h6 className="mb-3">Essential Fields</h6>
                
                <Form.Group className="mb-3">
                  <Form.Label>Order ID</Form.Label>
                  <Form.Select
                    name="orderId"
                    value={columnMapping.orderId || ''}
                    onChange={handleMappingChange}
                    required
                  >
                    <option value="">Select Column</option>
                    {validationResult.data?.headers.map((header, index) => (
                      <option key={index} value={header}>{header}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Order Date</Form.Label>
                  <Form.Select
                    name="orderDate"
                    value={columnMapping.orderDate || ''}
                    onChange={handleMappingChange}
                  >
                    <option value="">Select Column</option>
                    {validationResult.data?.headers.map((header, index) => (
                      <option key={index} value={header}>{header}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Product Title</Form.Label>
                  <Form.Select
                    name="productTitle"
                    value={columnMapping.productTitle || ''}
                    onChange={handleMappingChange}
                    required
                  >
                    <option value="">Select Column</option>
                    {validationResult.data?.headers.map((header, index) => (
                      <option key={index} value={header}>{header}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Quantity</Form.Label>
                  <Form.Select
                    name="quantity"
                    value={columnMapping.quantity || ''}
                    onChange={handleMappingChange}
                    required
                  >
                    <option value="">Select Column</option>
                    {validationResult.data?.headers.map((header, index) => (
                      <option key={index} value={header}>{header}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              
              {/* Additional Fields */}
              <Col md={6}>
                <h6 className="mb-3">Additional Fields</h6>
                
                <Form.Group className="mb-3">
                  <Form.Label>Customer Name</Form.Label>
                  <Form.Select
                    name="customerName"
                    value={columnMapping.customerName || ''}
                    onChange={handleMappingChange}
                  >
                    <option value="">Select Column</option>
                    {validationResult.data?.headers.map((header, index) => (
                      <option key={index} value={header}>{header}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Price</Form.Label>
                  <Form.Select
                    name="price"
                    value={columnMapping.price || ''}
                    onChange={handleMappingChange}
                  >
                    <option value="">Select Column</option>
                    {validationResult.data?.headers.map((header, index) => (
                      <option key={index} value={header}>{header}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Shipping Address</Form.Label>
                  <Form.Select
                    name="address"
                    value={columnMapping.address || ''}
                    onChange={handleMappingChange}
                  >
                    <option value="">Select Column</option>
                    {validationResult.data?.headers.map((header, index) => (
                      <option key={index} value={header}>{header}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Recipient Name</Form.Label>
                  <Form.Select
                    name="recipientName"
                    value={columnMapping.recipientName || ''}
                    onChange={handleMappingChange}
                  >
                    <option value="">Select Column</option>
                    {validationResult.data?.headers.map((header, index) => (
                      <option key={index} value={header}>{header}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <hr className="my-4" />
            
            {/* CSV Connection Selection */}
            <h6 className="mb-3">Select CSV Connection</h6>
            
            <Form.Group className="mb-4">
              <Form.Label>Platform Connection</Form.Label>
              <Form.Select
                value={selectedConnection}
                onChange={(e) => setSelectedConnection(e.target.value)}
                required
              >
                <option value="">Select CSV Connection</option>
                {platformConnections.map(conn => (
                  <option key={conn.id} value={conn.id}>{conn.name}</option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Select the CSV platform connection to associate with imported orders.
              </Form.Text>
            </Form.Group>
            
            <div className="d-flex justify-content-between">
              <Button variant="outline-secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              
              <Button
                variant="primary"
                onClick={importFile}
                disabled={
                  !columnMapping.orderId ||
                  !columnMapping.productTitle ||
                  !columnMapping.quantity ||
                  !selectedConnection ||
                  importing
                }
              >
                {importing ? (
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
                    Import Data
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    );
  };
  
  // Render step 3 - Import Results
  const renderStep3 = () => {
    if (!importResult) {
      return null;
    }
    
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-white">
          <h5 className="mb-0">Import Results</h5>
        </Card.Header>
        <Card.Body>
          {importResult.success ? (
            <Alert variant="success">
              <Alert.Heading>
                <FaCheck className="me-2" />
                Import Successful
              </Alert.Heading>
              <p>
                {importResult.message}
              </p>
            </Alert>
          ) : (
            <Alert variant="danger">
              <Alert.Heading>
                <FaExclamationTriangle className="me-2" />
                Import Failed
              </Alert.Heading>
              <p>
                {importResult.message}
              </p>
            </Alert>
          )}
          
          {importResult.data && (
            <div className="mt-4">
              <h6>Import Statistics</h6>
              
              <Table bordered className="mt-3">
                <tbody>
                  <tr>
                    <th>Total Rows Processed</th>
                    <td>{importResult.data.totalRowsProcessed}</td>
                  </tr>
                  <tr>
                    <th>Orders Imported</th>
                    <td>{importResult.data.importedCount}</td>
                  </tr>
                  <tr>
                    <th>Failed Imports</th>
                    <td>{importResult.data.failedCount}</td>
                  </tr>
                </tbody>
              </Table>
              
              <div className="mt-3">
                <h6>Import Progress</h6>
                <ProgressBar className="mt-2">
                  <ProgressBar 
                    variant="success" 
                    now={(importResult.data.importedCount / importResult.data.totalRowsProcessed) * 100} 
                    key={1}
                    label={`${importResult.data.importedCount} Successful`}
                  />
                  <ProgressBar 
                    variant="danger" 
                    now={(importResult.data.failedCount / importResult.data.totalRowsProcessed) * 100} 
                    key={2}
                    label={`${importResult.data.failedCount} Failed`}
                  />
                </ProgressBar>
              </div>
            </div>
          )}
          
          <div className="d-flex justify-content-between mt-4">
            <Button variant="outline-secondary" onClick={resetImport}>
              Import Another File
            </Button>
            
            <Button variant="primary" as="a" href="/orders">
              View Orders
            </Button>
          </div>
        </Card.Body>
      </Card>
    );
  };
  
  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading...</p>
      </div>
    );
  }
  
  return (
    <div className="import-csv">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Import CSV</h2>
      </div>
      
      {/* Progress Steps */}
      <div className="progress-steps mb-4">
        <Row>
          <Col md={4}>
            <div className={`step ${step >= 1 ? 'active' : ''}`}>
              <div className="step-number">1</div>
              <div className="step-label">Upload CSV</div>
            </div>
          </Col>
          <Col md={4}>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-label">Map Columns</div>
            </div>
          </Col>
          <Col md={4}>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <div className="step-label">Import Results</div>
            </div>
          </Col>
        </Row>
      </div>
      
      {/* Step Content */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
};

export default ImportCSV;