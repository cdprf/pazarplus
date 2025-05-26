import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Table, Form, InputGroup } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const PlatformSyncHistory = () => {
  const { platformId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    dateRange: '30d',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  useEffect(() => {
    fetchSyncHistory();
  }, [platformId, filters, pagination.page]);

  const fetchSyncHistory = async () => {
    try {
      setLoading(true);
      
      // Fetch platform details
      const platformResponse = await api.platforms.getConnection(platformId);
      setPlatform(platformResponse.data);
      
      // Fetch sync history
      const historyResponse = await api.platforms.getSyncHistory(platformId, {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      
      setSyncHistory(historyResponse.data.history || []);
      setPagination(prev => ({
        ...prev,
        total: historyResponse.data.total || 0
      }));
    } catch (error) {
      console.error('Failed to fetch sync history:', error);
      setError('Failed to load sync history');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleRetrySync = async (syncId) => {
    try {
      await api.platforms.retrySync(platformId, syncId);
      alert('Sync retry initiated successfully!');
      fetchSyncHistory(); // Refresh the history
    } catch (error) {
      console.error('Failed to retry sync:', error);
      alert('Failed to retry sync: ' + (error.response?.data?.message || error.message));
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      success: 'success',
      failed: 'danger',
      running: 'primary',
      pending: 'warning',
      cancelled: 'secondary'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const formatDuration = (milliseconds) => {
    if (!milliseconds) return 'N/A';
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading sync history...</span>
          </Spinner>
          <p className="mt-2">Loading sync history...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={() => navigate(`/platforms/${platformId}/settings`)}>
            Back to Settings
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1>{platform?.name} Sync History</h1>
              <p className="text-muted">Track all synchronization activities</p>
            </div>
            <div className="d-flex gap-2">
              <Button variant="primary" onClick={fetchSyncHistory}>
                <i className="fas fa-sync-alt me-2"></i>Refresh
              </Button>
              <Button variant="outline-secondary" onClick={() => navigate(`/platforms/${platformId}/settings`)}>
                <i className="fas fa-arrow-left me-2"></i>Back to Settings
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col md={3}>
          <Form.Select 
            value={filters.status} 
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select 
            value={filters.dateRange} 
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </Form.Select>
        </Col>
        <Col md={6}>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Search by sync ID or error message..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            <Button variant="outline-secondary">
              <i className="fas fa-search"></i>
            </Button>
          </InputGroup>
        </Col>
      </Row>

      {/* Sync History Table */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white">
          <h5 className="mb-0">Sync History ({pagination.total})</h5>
        </Card.Header>
        <Card.Body className="p-0">
          {syncHistory.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-history display-4 text-muted mb-3"></i>
              <h5 className="text-muted">No sync history found</h5>
              <p className="text-muted">
                {Object.values(filters).some(v => v) 
                  ? 'Try adjusting your filters'
                  : 'No synchronizations have been performed yet'
                }
              </p>
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Sync ID</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Records</th>
                  <th>Error</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {syncHistory.map((sync) => (
                  <tr key={sync.id}>
                    <td>
                      <code className="text-primary">{sync.id}</code>
                    </td>
                    <td>
                      {getStatusBadge(sync.status)}
                    </td>
                    <td>
                      <Badge bg="info">{sync.type || 'Manual'}</Badge>
                    </td>
                    <td>
                      <div>{new Date(sync.startedAt).toLocaleString()}</div>
                      <small className="text-muted">by {sync.initiatedBy || 'System'}</small>
                    </td>
                    <td>
                      {formatDuration(sync.duration)}
                    </td>
                    <td>
                      <div>
                        <strong className="text-success">{sync.recordsProcessed || 0}</strong> processed
                      </div>
                      {sync.recordsSkipped > 0 && (
                        <small className="text-warning">{sync.recordsSkipped} skipped</small>
                      )}
                    </td>
                    <td>
                      {sync.errorMessage ? (
                        <span 
                          className="text-danger" 
                          title={sync.errorMessage}
                          style={{ cursor: 'help' }}
                        >
                          {sync.errorMessage.length > 50 
                            ? sync.errorMessage.substring(0, 50) + '...' 
                            : sync.errorMessage
                          }
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => {/* View details */}}
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i>
                        </Button>
                        {sync.status === 'failed' && (
                          <Button 
                            variant="outline-warning" 
                            size="sm"
                            onClick={() => handleRetrySync(sync.id)}
                            title="Retry Sync"
                          >
                            <i className="fas fa-redo"></i>
                          </Button>
                        )}
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={() => {/* Download logs */}}
                          title="Download Logs"
                        >
                          <i className="fas fa-download"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <Row className="mt-3">
          <Col className="d-flex justify-content-between align-items-center">
            <div className="text-muted">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
            </div>
            <div className="btn-group">
              <Button 
                variant="outline-secondary" 
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Button 
                variant="outline-secondary" 
                size="sm"
                disabled={pagination.page * pagination.limit >= pagination.total}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default PlatformSyncHistory;