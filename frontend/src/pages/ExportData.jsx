/* eslint-disable no-unused-vars */
// frontend/src/pages/ExportData.jsx

import React, { useState, useEffect, useContext } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Form, 
  Spinner, 
  Alert, 
  Badge,
  Modal
} from 'react-bootstrap';
import { 
  FaFileExport, 
  FaFileExcel, 
  FaFileCsv, 
  FaFilePdf, 
  FaFileCode,
  FaDownload,
  FaCalendarAlt,
  FaFilter
} from 'react-icons/fa';
import axios from 'axios';
import { AlertContext } from '../context/AlertContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const ExportData = () => {
  const [loading, setLoading] = useState(false);
  const [exportFormats, setExportFormats] = useState([
    {
      id: 'csv',
      name: 'CSV',
      description: 'Export data in CSV format, suitable for spreadsheet applications',
      icon: <FaFileCsv size={36} className="text-success" />,
      extension: '.csv',
      contentType: 'text/csv'
    },
    {
      id: 'excel',
      name: 'Excel',
      description: 'Export data in Excel format, with formatting and multiple sheets',
      icon: <FaFileExcel size={36} className="text-primary" />,
      extension: '.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      id: 'pdf',
      name: 'PDF',
      description: 'Export data in PDF format, suitable for printing and sharing',
      icon: <FaFilePdf size={36} className="text-danger" />,
      extension: '.pdf',
      contentType: 'application/pdf'
    },
    {
      id: 'json',
      name: 'JSON',
      description: 'Export data in JSON format, suitable for developers and API integration',
      icon: <FaFileCode size={36} className="text-warning" />,
      extension: '.json',
      contentType: 'application/json'
    }
  ]);
  
  const [exportTypes, setExportTypes] = useState([
    {
      id: 'orders',
      name: 'Orders',
      description: 'Export order details including customer and shipping information'
    },
    {
      id: 'customers',
      name: 'Customers',
      description: 'Export customer information including contact details and order history'
    },
    {
      id: 'products',
      name: 'Products',
      description: 'Export product information including SKUs and order counts'
    },
    {
      id: 'shipping',
      name: 'Shipping Labels',
      description: 'Export shipping labels as a batch PDF file'
    }
  ]);
  
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)), // 30 days ago
    endDate: new Date(),
    platform: '',
    status: '',
    includeDetails: true
  });
  
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [selectedType, setSelectedType] = useState('orders');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [platforms, setPlatforms] = useState([]);
  
  const { success, error } = useContext(AlertContext);
  
  // Fetch platform connections
  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const response = await axios.get('/platforms/connections');
        
        if (response.data.success) {
          setPlatforms(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching platforms:', err);
      }
    };
    
    fetchPlatforms();
  }, []);
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFilters({
      ...filters,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Handle date changes
  const handleDateChange = (date, name) => {
    setFilters({
      ...filters,
      [name]: date
    });
  };
  
  // Generate export file
  const generateExport = async () => {
    try {
      setLoading(true);
      
      // Convert dates to ISO strings
      const exportParams = {
        ...filters,
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
        format: selectedFormat,
        type: selectedType
      };
      
      const response = await axios.post('/export/generate', exportParams, {
        responseType: 'blob'
      });
      
      // Create file name
      const now = new Date();
      const timestamp = now.toISOString().split('T')[0];
      const fileName = `${selectedType}_export_${timestamp}${getFileExtension(selectedFormat)}`;
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      success('Export generated successfully');
    } catch (err) {
      console.error('Error generating export:', err);
      error('Failed to generate export. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Get file extension for selected format
  const getFileExtension = (format) => {
    const selectedFormat = exportFormats.find(f => f.id === format);
    return selectedFormat ? selectedFormat.extension : '.csv';
  };
  
  // Get format icon
  const getFormatIcon = (formatId) => {
    const format = exportFormats.find(f => f.id === formatId);
    return format ? format.icon : null;
  };
  
  return (
    <div className="export-data">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Export Data</h2>
      </div>
      
      <Row>
        <Col lg={8}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Export Options</h5>
            </Card.Header>
            <Card.Body>
              <h6 className="mb-3">1. Select Export Type</h6>
              
              <Row className="export-options mb-4">
                {exportTypes.map(type => (
                  <Col md={6} key={type.id} className="mb-3">
                    <Card 
                      className={`h-100 ${selectedType === type.id ? 'border-primary' : ''}`}
                      onClick={() => setSelectedType(type.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Card.Body className="d-flex align-items-center">
                        <Form.Check
                          type="radio"
                          id={`export-type-${type.id}`}
                          name="exportType"
                          checked={selectedType === type.id}
                          onChange={() => setSelectedType(type.id)}
                          className="me-3"
                        />
                        <div>
                          <h6 className="mb-1">{type.name}</h6>
                          <p className="text-muted mb-0 small">{type.description}</p>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
              
              <h6 className="mb-3">2. Select Format</h6>
              
              <Row className="export-options mb-4">
                {exportFormats.map(format => (
                  <Col md={3} sm={6} key={format.id} className="mb-3">
                    <Card 
                      className={`h-100 text-center ${selectedFormat === format.id ? 'border-primary' : ''}`}
                      onClick={() => setSelectedFormat(format.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Card.Body>
                        <div className="card-icon mb-2">
                          {format.icon}
                        </div>
                        <h6 className="mb-1">{format.name}</h6>
                        <p className="text-muted mb-0 small">{format.extension}</p>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
              
              <h6 className="mb-3">3. Set Date Range</h6>
              
              <Row className="mb-4">
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Start Date</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <FaCalendarAlt />
                      </span>
                      <DatePicker
                        selected={filters.startDate}
                        onChange={(date) => handleDateChange(date, 'startDate')}
                        selectsStart
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        className="form-control"
                        dateFormat="yyyy-MM-dd"
                      />
                    </div>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>End Date</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <FaCalendarAlt />
                      </span>
                      <DatePicker
                        selected={filters.endDate}
                        onChange={(date) => handleDateChange(date, 'endDate')}
                        selectsEnd
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        minDate={filters.startDate}
                        className="form-control"
                        dateFormat="yyyy-MM-dd"
                      />
                    </div>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
            <Card.Footer className="bg-white d-flex justify-content-between">
              <Button 
                variant="outline-secondary"
                onClick={() => setShowFilterModal(true)}
              >
                <FaFilter className="me-2" />
                Advanced Filters
              </Button>
              
              <Button 
                variant="primary"
                onClick={generateExport}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FaDownload className="me-2" />
                    Generate Export
                  </>
                )}
              </Button>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col lg={4}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Export Summary</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3 pb-3 border-bottom">
                <h6>Export Type</h6>
                <p className="mb-0">
                  {exportTypes.find(t => t.id === selectedType)?.name || 'Orders'}
                </p>
              </div>
              
              <div className="mb-3 pb-3 border-bottom">
                <h6>Format</h6>
                <div className="d-flex align-items-center">
                  {getFormatIcon(selectedFormat)}
                  <div className="ms-2">
                    <p className="mb-0">
                      {exportFormats.find(f => f.id === selectedFormat)?.name || 'CSV'}
                    </p>
                    <small className="text-muted">
                      {getFileExtension(selectedFormat)}
                    </small>
                  </div>
                </div>
              </div>
              
              <div className="mb-3 pb-3 border-bottom">
                <h6>Date Range</h6>
                <p className="mb-0">
                  {filters.startDate.toLocaleDateString()} to {filters.endDate.toLocaleDateString()}
                </p>
              </div>
              
              <div className="mb-3 pb-3 border-bottom">
                <h6>Filters</h6>
                {filters.platform || filters.status ? (
                  <>
                    {filters.platform && (
                      <Badge bg="primary" className="me-2 mb-2">
                        Platform: {platforms.find(p => p.id === filters.platform)?.name || filters.platform}
                      </Badge>
                    )}
                    {filters.status && (
                      <Badge bg="info" className="me-2 mb-2">
                        Status: {filters.status}
                      </Badge>
                    )}
                  </>
                ) : (
                  <p className="text-muted mb-0">No filters applied</p>
                )}
              </div>
              
              <div>
                <h6>Options</h6>
                <Form.Check
                  type="checkbox"
                  id="include-details"
                  label="Include detailed information"
                  checked={filters.includeDetails}
                  onChange={(e) => handleFilterChange({
                    target: {
                      name: 'includeDetails',
                      type: 'checkbox',
                      checked: e.target.checked
                    }
                  })}
                  className="mb-2"
                />
              </div>
            </Card.Body>
          </Card>
          
          <Card className="shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Help</h5>
            </Card.Header>
            <Card.Body>
              <h6>Export Types</h6>
              <ul className="small mb-3">
                <li><strong>Orders:</strong> Includes order details, customer info, and items.</li>
                <li><strong>Customers:</strong> Includes customer details and order history.</li>
                <li><strong>Products:</strong> Includes product info and order counts.</li>
                <li><strong>Shipping:</strong> Generates a batch of shipping labels as PDF.</li>
              </ul>
              
              <h6>File Formats</h6>
              <ul className="small">
                <li><strong>CSV:</strong> Simple format for spreadsheet apps.</li>
                <li><strong>Excel:</strong> Formatted spreadsheet with multiple sheets.</li>
                <li><strong>PDF:</strong> Formatted document suitable for printing.</li>
                <li><strong>JSON:</strong> Data format for developers and integrations.</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Advanced Filters Modal */}
      <Modal show={showFilterModal} onHide={() => setShowFilterModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Advanced Filters</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Platform</Form.Label>
              <Form.Select
                name="platform"
                value={filters.platform}
                onChange={handleFilterChange}
              >
                <option value="">All Platforms</option>
                {platforms.map(platform => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Order Status</Form.Label>
              <Form.Select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="returned">Returned</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Include Options</Form.Label>
              <Form.Check
                type="checkbox"
                id="include-details-modal"
                name="includeDetails"
                label="Include detailed information"
                checked={filters.includeDetails}
                onChange={handleFilterChange}
                className="mb-2"
              />
              <Form.Text className="text-muted">
                Includes additional details such as customer notes, shipping instructions, etc.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="outline-secondary" 
            onClick={() => {
              setFilters({
                ...filters,
                platform: '',
                status: '',
                includeDetails: true
              });
            }}
          >
            Reset Filters
          </Button>
          <Button 
            variant="primary" 
            onClick={() => setShowFilterModal(false)}
          >
            Apply Filters
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ExportData;