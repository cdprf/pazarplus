import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Badge,
  Modal,
  Alert,
  Form,
  Row,
  Col,
  ListGroup,
  Spinner,
} from "react-bootstrap";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";

const PlatformSyncControl = ({
  productId,
  productType = "main", // 'main' or 'variant'
  showInline = true,
  onSyncComplete,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [syncMode, setSyncMode] = useState("all"); // 'all' or 'fields'

  // Available fields for field-specific sync
  const availableFields = [
    { key: "name", label: "Product Name" },
    { key: "description", label: "Description" },
    { key: "basePrice", label: "Price" },
    { key: "baseCostPrice", label: "Cost Price" },
    { key: "stockQuantity", label: "Stock Quantity" },
    { key: "category", label: "Category" },
    { key: "brand", label: "Brand" },
    { key: "status", label: "Status" },
    { key: "attributes", label: "Attributes" },
    { key: "images", label: "Images" },
  ];

  // Get auth token
  const getAuthToken = () => localStorage.getItem("token");

  // Fetch sync status
  const fetchSyncStatus = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/products/${productId}/sync/status`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch sync status:", error);
    }
  };

  // Sync all product data
  const syncAllData = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/products/${productId}/sync`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            operation: "update",
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setSyncResult(data.data);
        await fetchSyncStatus();
        if (onSyncComplete) {
          onSyncComplete(data.data);
        }
      } else {
        throw new Error(data.message || "Sync failed");
      }
    } catch (error) {
      console.error("Sync failed:", error);
      setSyncResult({
        success: false,
        error: error.message,
      });
    } finally {
      setSyncing(false);
    }
  };

  // Sync specific fields
  const syncSpecificFields = async () => {
    if (selectedFields.length === 0) {
      alert("Please select at least one field to sync");
      return;
    }

    setSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/products/${productId}/sync/fields`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: selectedFields,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setSyncResult(data.data);
        await fetchSyncStatus();
        if (onSyncComplete) {
          onSyncComplete(data.data);
        }
      } else {
        throw new Error(data.message || "Field sync failed");
      }
    } catch (error) {
      console.error("Field sync failed:", error);
      setSyncResult({
        success: false,
        error: error.message,
      });
    } finally {
      setSyncing(false);
    }
  };

  // Handle sync action
  const handleSync = () => {
    if (syncMode === "all") {
      syncAllData();
    } else {
      syncSpecificFields();
    }
  };

  // Handle field selection
  const handleFieldToggle = (fieldKey) => {
    setSelectedFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((f) => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  // Load sync status on mount
  useEffect(() => {
    if (productId) {
      const loadSyncStatus = async () => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/products/${productId}/sync/status`,
            {
              headers: {
                Authorization: `Bearer ${getAuthToken()}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            setSyncStatus(data.data);
          }
        } catch (error) {
          console.error("Failed to fetch sync status:", error);
        }
      };

      loadSyncStatus();
    }
  }, [productId]);

  // Render sync status badge
  const renderSyncStatusBadge = () => {
    if (!syncStatus) {
      return <Badge bg="secondary">Unknown</Badge>;
    }

    const { status } = syncStatus;
    switch (status) {
      case "completed":
        return <Badge bg="success">Synced</Badge>;
      case "pending":
        return <Badge bg="warning">Pending</Badge>;
      case "failed":
        return <Badge bg="danger">Failed</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  // Render platform status
  const renderPlatformStatus = (results) => {
    if (!results || !Array.isArray(results)) {
      return null;
    }

    return (
      <ListGroup className="mt-3">
        {results.map((result, index) => (
          <ListGroup.Item
            key={index}
            className="d-flex justify-content-between align-items-center"
          >
            <div>
              <strong>{result.platform}</strong>
              {result.error && (
                <div className="text-danger small mt-1">{result.error}</div>
              )}
            </div>
            <div>
              {result.success ? (
                <CheckCircleIcon className="h-5 w-5 text-success" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-danger" />
              )}
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>
    );
  };

  if (showInline) {
    return (
      <div className="d-flex align-items-center gap-2">
        {renderSyncStatusBadge()}
        <Button
          size="sm"
          variant="outline-primary"
          onClick={() => setShowModal(true)}
          disabled={syncing}
        >
          {syncing ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <ArrowPathIcon className="h-4 w-4" />
          )}
          Sync
        </Button>

        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Platform Sync Control</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {/* Sync Mode Selection */}
            <Form.Group className="mb-3">
              <Form.Label>Sync Mode</Form.Label>
              <Form.Select
                value={syncMode}
                onChange={(e) => setSyncMode(e.target.value)}
              >
                <option value="all">Sync All Product Data</option>
                <option value="fields">Sync Specific Fields</option>
              </Form.Select>
            </Form.Group>

            {/* Field Selection (if fields mode) */}
            {syncMode === "fields" && (
              <Form.Group className="mb-3">
                <Form.Label>Select Fields to Sync</Form.Label>
                <Row>
                  {availableFields.map((field) => (
                    <Col md={6} key={field.key} className="mb-2">
                      <Form.Check
                        type="checkbox"
                        id={`field-${field.key}`}
                        label={field.label}
                        checked={selectedFields.includes(field.key)}
                        onChange={() => handleFieldToggle(field.key)}
                      />
                    </Col>
                  ))}
                </Row>
              </Form.Group>
            )}

            {/* Sync Result */}
            {syncResult && (
              <Alert variant={syncResult.success ? "success" : "danger"}>
                {syncResult.success ? (
                  <div>
                    <strong>✅ Sync Completed!</strong>
                    <div>
                      Synced to {syncResult.synced}/{syncResult.total} platforms
                    </div>
                    {renderPlatformStatus(syncResult.results)}
                  </div>
                ) : (
                  <div>
                    <strong>❌ Sync Failed</strong>
                    <div>{syncResult.error}</div>
                  </div>
                )}
              </Alert>
            )}

            {/* Current Sync Status */}
            {syncStatus && (
              <div className="mt-3">
                <h6>Current Status</h6>
                <div className="d-flex align-items-center gap-2">
                  <span>Last Sync:</span>
                  {renderSyncStatusBadge()}
                  <span className="text-muted small">
                    {syncStatus.lastSync
                      ? new Date(syncStatus.lastSync).toLocaleString()
                      : "Never"}
                  </span>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handleSync}
              disabled={
                syncing ||
                (syncMode === "fields" && selectedFields.length === 0)
              }
            >
              {syncing ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Syncing...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4 me-2" />
                  Start Sync
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }

  // Full component view (not inline)
  return (
    <div className="platform-sync-control">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Platform Sync</h5>
        {renderSyncStatusBadge()}
      </div>

      {/* Rest of the component would be here for full view */}
    </div>
  );
};

export default PlatformSyncControl;
