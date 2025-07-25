import logger from "../../utils/logger.js";
import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Alert,
  Spinner,
  Badge,
  Table,
  Pagination,
  Form,
  Modal,
} from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { FaSync, FaEye, FaFilter, FaDownload } from "react-icons/fa";
import api from "../../services/api";

const PlatformSyncHistory = () => {
  const { platformId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: "",
    startDate: "",
    endDate: "",
    syncType: "",
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSync, setSelectedSync] = useState(null);

  const fetchPlatformInfo = useCallback(async () => {
    try {
      const response = await api.platforms.getConnection(platformId);
      setPlatform(response.data);
    } catch (err) {
      logger.error("Error fetching platform info:", err);
      setError("Failed to load platform information");
    }
  }, [platformId]);

  const fetchSyncHistory = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = {
          page,
          limit: 20,
          ...filters,
        };

        const response = await api.platforms.getSyncHistory(platformId, params);
        setSyncHistory(response.data.history || []);
        setCurrentPage(response.data.currentPage || 1);
        setTotalPages(response.data.totalPages || 1);
      } catch (err) {
        logger.error("Error fetching sync history:", err);
        setError("Failed to load sync history");
      } finally {
        setLoading(false);
      }
    },
    [platformId, filters]
  );

  useEffect(() => {
    fetchPlatformInfo();
    fetchSyncHistory();
  }, [fetchPlatformInfo, fetchSyncHistory]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchSyncHistory(1);
  };

  const handleClearFilters = () => {
    setFilters({
      status: "",
      startDate: "",
      endDate: "",
      syncType: "",
    });
    setCurrentPage(1);
    fetchSyncHistory(1);
  };

  const handleViewDetails = (sync) => {
    setSelectedSync(sync);
    setShowDetailsModal(true);
  };

  const handleTriggerSync = async () => {
    try {
      await api.platforms.syncPlatform(platformId);
      // Refresh sync history after triggering
      fetchSyncHistory();
    } catch (err) {
      logger.error("Error triggering sync:", err);
      setError("Failed to trigger sync");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "-";
    const duration = new Date(endTime) - new Date(startTime);
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      success: { variant: "success", text: "Success" },
      failed: { variant: "danger", text: "Failed" },
      running: { variant: "primary", text: "Running" },
      pending: { variant: "warning", text: "Pending" },
      cancelled: { variant: "secondary", text: "Cancelled" },
    };

    const config = statusConfig[status] || {
      variant: "secondary",
      text: status,
    };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const getSyncTypeBadge = (type) => {
    const typeConfig = {
      full: { variant: "info", text: "Full Sync" },
      incremental: { variant: "secondary", text: "Incremental" },
      orders: { variant: "primary", text: "Orders" },
      products: { variant: "success", text: "Products" },
      inventory: { variant: "warning", text: "Inventory" },
    };

    const config = typeConfig[type] || { variant: "light", text: type };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  if (loading && !syncHistory.length) {
    return (
      <Container fluid className="py-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
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
              <h2>Sync History</h2>
              {platform && (
                <p className="text-muted mb-0">
                  Platform: {platform.name} ({platform.platform})
                </p>
              )}
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-primary"
                onClick={() => navigate(`/platforms/${platformId}`)}
              >
                Back to Platform
              </Button>
              <Button
                variant="primary"
                onClick={handleTriggerSync}
                disabled={loading}
              >
                <FaSync className="me-2" />
                Trigger Sync
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <h5 className="mb-3">
                <FaFilter className="me-2" />
                Filters
              </h5>
              <Row>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      value={filters.status}
                      onChange={(e) =>
                        handleFilterChange("status", e.target.value)
                      }
                    >
                      <option value="">All Statuses</option>
                      <option value="success">Success</option>
                      <option value="failed">Failed</option>
                      <option value="running">Running</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Sync Type</Form.Label>
                    <Form.Select
                      value={filters.syncType}
                      onChange={(e) =>
                        handleFilterChange("syncType", e.target.value)
                      }
                    >
                      <option value="">All Types</option>
                      <option value="full">Full Sync</option>
                      <option value="incremental">Incremental</option>
                      <option value="orders">Orders</option>
                      <option value="products">Products</option>
                      <option value="inventory">Inventory</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={filters.startDate}
                      onChange={(e) =>
                        handleFilterChange("startDate", e.target.value)
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>End Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={filters.endDate}
                      onChange={(e) =>
                        handleFilterChange("endDate", e.target.value)
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row className="mt-3">
                <Col>
                  <div className="d-flex gap-2">
                    <Button variant="primary" onClick={handleApplyFilters}>
                      Apply Filters
                    </Button>
                    <Button
                      variant="outline-secondary"
                      onClick={handleClearFilters}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Sync History Table */}
      <Row>
        <Col>
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Sync History</h5>
                <Button variant="outline-secondary" size="sm">
                  <FaDownload className="me-2" />
                  Export
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : syncHistory.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No sync history found</p>
                </div>
              ) : (
                <>
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>Date/Time</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Records Processed</th>
                        <th>Errors</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncHistory.map((sync) => (
                        <tr key={sync.id}>
                          <td>
                            <div>
                              <div>{formatDate(sync.startTime)}</div>
                              {sync.endTime && (
                                <small className="text-muted">
                                  Ended: {formatDate(sync.endTime)}
                                </small>
                              )}
                            </div>
                          </td>
                          <td>{getSyncTypeBadge(sync.type)}</td>
                          <td>{getStatusBadge(sync.status)}</td>
                          <td>
                            {formatDuration(sync.startTime, sync.endTime)}
                          </td>
                          <td>
                            <div>
                              <span className="fw-bold">
                                {sync.recordsProcessed || 0}
                              </span>
                              {sync.recordsTotal && (
                                <span className="text-muted">
                                  {" "}
                                  / {sync.recordsTotal}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            {sync.errorCount > 0 ? (
                              <Badge bg="danger">{sync.errorCount}</Badge>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleViewDetails(sync)}
                            >
                              <FaEye className="me-1" />
                              Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-center mt-3">
                      <Pagination>
                        <Pagination.First
                          disabled={currentPage === 1}
                          onClick={() => {
                            setCurrentPage(1);
                            fetchSyncHistory(1);
                          }}
                        />
                        <Pagination.Prev
                          disabled={currentPage === 1}
                          onClick={() => {
                            const prevPage = currentPage - 1;
                            setCurrentPage(prevPage);
                            fetchSyncHistory(prevPage);
                          }}
                        />

                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
                            const pageNumber = Math.max(1, currentPage - 2) + i;
                            if (pageNumber <= totalPages) {
                              return (
                                <Pagination.Item
                                  key={pageNumber}
                                  active={pageNumber === currentPage}
                                  onClick={() => {
                                    setCurrentPage(pageNumber);
                                    fetchSyncHistory(pageNumber);
                                  }}
                                >
                                  {pageNumber}
                                </Pagination.Item>
                              );
                            }
                            return null;
                          }
                        )}

                        <Pagination.Next
                          disabled={currentPage === totalPages}
                          onClick={() => {
                            const nextPage = currentPage + 1;
                            setCurrentPage(nextPage);
                            fetchSyncHistory(nextPage);
                          }}
                        />
                        <Pagination.Last
                          disabled={currentPage === totalPages}
                          onClick={() => {
                            setCurrentPage(totalPages);
                            fetchSyncHistory(totalPages);
                          }}
                        />
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Details Modal */}
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Sync Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSync && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Sync ID:</strong> {selectedSync.id}
                </Col>
                <Col md={6}>
                  <strong>Type:</strong> {getSyncTypeBadge(selectedSync.type)}
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Status:</strong> {getStatusBadge(selectedSync.status)}
                </Col>
                <Col md={6}>
                  <strong>Duration:</strong>{" "}
                  {formatDuration(selectedSync.startTime, selectedSync.endTime)}
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Start Time:</strong>{" "}
                  {formatDate(selectedSync.startTime)}
                </Col>
                <Col md={6}>
                  <strong>End Time:</strong> {formatDate(selectedSync.endTime)}
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Records Processed:</strong>{" "}
                  {selectedSync.recordsProcessed || 0}
                </Col>
                <Col md={6}>
                  <strong>Error Count:</strong> {selectedSync.errorCount || 0}
                </Col>
              </Row>

              {selectedSync.message && (
                <Row className="mb-3">
                  <Col>
                    <strong>Message:</strong>
                    <div className="mt-1">
                      <Alert variant="info" className="mb-0">
                        {selectedSync.message}
                      </Alert>
                    </div>
                  </Col>
                </Row>
              )}

              {selectedSync.errors && selectedSync.errors.length > 0 && (
                <Row className="mb-3">
                  <Col>
                    <strong>Errors:</strong>
                    <div className="mt-1">
                      {selectedSync.errors.map((error, index) => (
                        <Alert key={index} variant="danger" className="mb-1">
                          {error}
                        </Alert>
                      ))}
                    </div>
                  </Col>
                </Row>
              )}

              {selectedSync.details && (
                <Row>
                  <Col>
                    <strong>Additional Details:</strong>
                    <pre className="mt-1 bg-light p-2 rounded">
                      {JSON.stringify(selectedSync.details, null, 2)}
                    </pre>
                  </Col>
                </Row>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDetailsModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PlatformSyncHistory;
