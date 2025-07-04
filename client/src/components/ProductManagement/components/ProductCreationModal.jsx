import React, { useState, useRef, useCallback } from "react";
import {
  Modal,
  Nav,
  Tab,
  Button,
  Form,
  Row,
  Col,
  Alert,
  Spinner,
  Card,
  Badge,
  Table,
  InputGroup,
  ProgressBar,
} from "react-bootstrap";
import {
  PlusIcon,
  DocumentArrowUpIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { useAlert } from "../../../contexts/AlertContext";
import { API_BASE_URL } from "../utils/constants";
import "./ProductCreationModal.css";

/**
 * Enhanced Product Creation Modal
 * Supports multiple creation methods: Manual Form, CSV/JSON Import, Platform Data Copy
 */
const ProductCreationModal = ({ show, onHide, onSuccess }) => {
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState("manual");
  const [loading, setLoading] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [fieldMapping, setFieldMapping] = useState({});
  const [platformData, setPlatformData] = useState(null);
  const [platformUrl, setPlatformUrl] = useState("");
  const [importProgress, setImportProgress] = useState(null);
  const fileInputRef = useRef(null);

  // Categories for product creation
  const categories = [
    "Elektronik",
    "Giyim & Aksesuar",
    "Ev & Yaşam",
    "Kozmetik & Kişisel Bakım",
    "Spor & Outdoor",
    "Kitap & Müzik",
    "Anne & Bebek",
    "Otomotiv",
    "Süpermarket",
    "Petshop",
    "Oyuncak & Hobi",
    "Yapı Market",
  ];

  // Manual form state
  const [formData, setFormData] = useState({
    name: "",
    baseSku: "",
    description: "",
    category: "",
    brand: "",
    productType: "",
    basePrice: "",
    baseCostPrice: "",
    stockQuantity: "",
    minStockLevel: 5,
    weight: "",
    dimensions: {
      length: "",
      width: "",
      height: "",
    },
    attributes: {},
    tags: [],
    status: "active",
  });

  // Form validation
  const [errors, setErrors] = useState({});

  // Reset modal state
  const resetModal = () => {
    setActiveTab("manual");
    setFormData({
      name: "",
      baseSku: "",
      description: "",
      category: "",
      brand: "",
      productType: "",
      basePrice: "",
      baseCostPrice: "",
      stockQuantity: "",
      minStockLevel: 5,
      weight: "",
      dimensions: { length: "", width: "", height: "" },
      attributes: {},
      tags: [],
      status: "active",
    });
    setErrors({});
    setImportPreview(null);
    setFieldMapping({});
    setPlatformData(null);
    setPlatformUrl("");
    setImportProgress(null);
  };

  // Handle modal close
  const handleClose = () => {
    resetModal();
    onHide();
  };

  // Validate form data
  const validateForm = (data) => {
    const newErrors = {};

    if (!data.name?.trim()) {
      newErrors.name = "Product name is required";
    }
    if (!data.category?.trim()) {
      newErrors.category = "Category is required";
    }
    if (
      !data.basePrice ||
      isNaN(data.basePrice) ||
      parseFloat(data.basePrice) < 0
    ) {
      newErrors.basePrice = "Valid base price is required";
    }

    return newErrors;
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  // Handle manual form submission
  const handleManualSubmit = async () => {
    try {
      setLoading(true);

      // Validate form
      const validationErrors = validateForm(formData);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      // Call API to create product
      const response = await fetch(`${API_BASE_URL}/products/main-products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create product");
      }

      const result = await response.json();
      showAlert("Product created successfully!", "success");

      if (onSuccess) {
        onSuccess(result);
      }

      handleClose();
    } catch (error) {
      console.error("Error creating product:", error);
      showAlert("Error creating product: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle dimension changes
  const handleDimensionChange = (dimension, value) => {
    setFormData((prev) => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [dimension]: value,
      },
    }));
  };

  // Handle file upload for CSV/JSON import
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      showAlert("File size must be less than 10MB", "error");
      return;
    }

    // Validate file type
    const allowedTypes = ["text/csv", "application/json"];
    if (
      !allowedTypes.includes(file.type) &&
      !file.name.match(/\.(csv|json)$/i)
    ) {
      showAlert("Please select a CSV or JSON file", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let data;
        if (file.type === "application/json" || file.name.endsWith(".json")) {
          // Parse JSON
          data = JSON.parse(event.target.result);
          if (!Array.isArray(data)) {
            data = [data]; // Convert single object to array
          }
        } else {
          // Parse CSV
          const csvText = event.target.result;
          const lines = csvText.split("\n").filter((line) => line.trim());
          if (lines.length < 2) {
            throw new Error(
              "CSV must have at least a header row and one data row"
            );
          }

          const headers = lines[0]
            .split(",")
            .map((h) => h.trim().replace(/"/g, ""));
          data = lines.slice(1).map((line) => {
            const values = line
              .split(",")
              .map((v) => v.trim().replace(/"/g, ""));
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = values[index] || "";
            });
            return obj;
          });
        }

        setImportPreview({
          fileName: file.name,
          fileType: file.type,
          data: data.slice(0, 10), // Preview first 10 rows
          totalRows: data.length,
          headers: Object.keys(data[0] || {}),
          fullData: data, // Store full data for import
        });

        // Initialize field mapping
        const mapping = {};
        const headers = Object.keys(data[0] || {});
        headers.forEach((header) => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes("name") || lowerHeader.includes("title")) {
            mapping.name = header;
          } else if (
            lowerHeader.includes("price") &&
            !lowerHeader.includes("cost")
          ) {
            mapping.basePrice = header;
          } else if (lowerHeader.includes("cost")) {
            mapping.baseCostPrice = header;
          } else if (lowerHeader.includes("category")) {
            mapping.category = header;
          } else if (lowerHeader.includes("brand")) {
            mapping.brand = header;
          } else if (lowerHeader.includes("description")) {
            mapping.description = header;
          } else if (
            lowerHeader.includes("sku") ||
            lowerHeader.includes("code")
          ) {
            mapping.baseSku = header;
          } else if (
            lowerHeader.includes("stock") ||
            lowerHeader.includes("quantity")
          ) {
            mapping.stockQuantity = header;
          }
        });
        setFieldMapping(mapping);

        showAlert(
          `Successfully loaded ${data.length} products from ${file.name}`,
          "success"
        );
      } catch (error) {
        console.error("Error parsing file:", error);
        showAlert("Error parsing file. Please check the format.", "error");
      }
    };

    reader.readAsText(file);
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    if (!importPreview?.fullData) {
      showAlert("Please upload a file first", "error");
      return;
    }

    try {
      setLoading(true);
      setImportProgress({ current: 0, total: importPreview.fullData.length });

      // Map the data according to field mapping
      const mappedData = importPreview.fullData.map((row) => {
        const mappedRow = {};
        Object.entries(fieldMapping).forEach(([targetField, sourceField]) => {
          if (sourceField && row[sourceField] !== undefined) {
            mappedRow[targetField] = row[sourceField];
          }
        });

        // Set default values
        if (!mappedRow.status) mappedRow.status = "active";
        if (!mappedRow.minStockLevel) mappedRow.minStockLevel = 5;

        return mappedRow;
      });

      // Call import API
      const response = await fetch(`${API_BASE_URL}/products/import/csv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          csvData: mappedData,
          fieldMapping: fieldMapping,
          fileName: importPreview.fileName,
        }),
      });

      if (!response.ok) {
        throw new Error("Import failed");
      }

      const result = await response.json();
      showAlert(
        `Successfully imported ${result.imported || 0} products!`,
        "success"
      );

      if (onSuccess) {
        onSuccess(result);
      }

      handleClose();
    } catch (error) {
      console.error("Error importing products:", error);
      showAlert("Error importing products: " + error.message, "error");
    } finally {
      setLoading(false);
      setImportProgress(null);
    }
  };

  // Handle platform URL fetch
  const handlePlatformFetch = async () => {
    if (!platformUrl.trim()) {
      showAlert("Please enter a valid product URL", "error");
      return;
    }

    try {
      setLoading(true);

      // Call backend service to scrape product data
      const response = await fetch(
        `${API_BASE_URL}/products/import-from-platform`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            url: platformUrl,
            platform: detectPlatform(platformUrl),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch platform data");
      }

      const data = await response.json();
      setPlatformData(data.productData);

      // Initialize field mapping for platform data
      const mapping = {};
      Object.keys(data.productData || {}).forEach((key) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes("name") || lowerKey.includes("title"))
          mapping.name = key;
        else if (lowerKey.includes("price")) mapping.basePrice = key;
        else if (lowerKey.includes("category")) mapping.category = key;
        else if (lowerKey.includes("brand")) mapping.brand = key;
        else if (lowerKey.includes("description")) mapping.description = key;
        else if (lowerKey.includes("sku")) mapping.baseSku = key;
      });
      setFieldMapping(mapping);

      showAlert("Platform data fetched successfully!", "success");
    } catch (error) {
      console.error("Error fetching platform data:", error);
      showAlert("Error fetching platform data: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Detect platform from URL
  const detectPlatform = (url) => {
    if (url.includes("trendyol.com")) return "trendyol";
    if (url.includes("hepsiburada.com")) return "hepsiburada";
    if (url.includes("n11.com")) return "n11";
    return "unknown";
  };

  // Handle platform product import
  const handlePlatformImport = async () => {
    if (!platformData) {
      showAlert("Please fetch platform data first", "error");
      return;
    }

    try {
      setLoading(true);

      // Map platform data to our product structure
      const mappedData = {};
      Object.entries(fieldMapping).forEach(([targetField, sourceField]) => {
        if (sourceField && platformData[sourceField] !== undefined) {
          mappedData[targetField] = platformData[sourceField];
        }
      });

      // Set default values
      if (!mappedData.status) mappedData.status = "active";
      if (!mappedData.minStockLevel) mappedData.minStockLevel = 5;

      // Create product
      const response = await fetch(`${API_BASE_URL}/products/main-products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ...mappedData,
          metadata: {
            source: "platform_import",
            originalUrl: platformUrl,
            platform: detectPlatform(platformUrl),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create product from platform data");
      }

      const result = await response.json();
      showAlert("Product imported from platform successfully!", "success");

      if (onSuccess) {
        onSuccess(result);
      }

      handleClose();
    } catch (error) {
      console.error("Error importing from platform:", error);
      showAlert("Error importing from platform: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle platform scraping
  const handlePlatformScrape = async () => {
    if (!platformUrl.trim()) {
      showAlert("Please enter a product URL", "error");
      return;
    }

    try {
      setLoading(true);
      showAlert("Platform scraping feature coming soon!", "info");
      // Placeholder for actual implementation
    } catch (error) {
      console.error("Error scraping platform data:", error);
      showAlert("Error fetching platform data", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="lg"
      backdrop="static"
      centered
      style={{
        zIndex: "var(--z-modal)",
      }}
      contentClassName="border-0 shadow-lg"
      dialogClassName="modal-dialog-scrollable"
    >
      <Modal.Header closeButton className="border-bottom">
        <Modal.Title>Create Product</Modal.Title>
      </Modal.Header>

      <Modal.Body
        style={{
          minHeight: "400px",
          backgroundColor: "white",
          position: "relative",
          zIndex: 10000,
        }}
        className="p-4"
      >
        {/* Debug Section */}
        <div
          className="alert alert-success mb-3"
          style={{ position: "relative", zIndex: 10001 }}
        >
          <h5>🎉 Modal is Working!</h5>
          <p>If you can see this message, the modal is displaying correctly.</p>
          <p>
            <strong>Active Tab:</strong> {activeTab}
          </p>
          <p>
            <strong>Show State:</strong> {show ? "true" : "false"}
          </p>
        </div>
        {/* Tab navigation and content */}
        <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
          <Nav variant="tabs" className="mb-4">
            <Nav.Item>
              <Nav.Link eventKey="manual">
                <PlusIcon className="h-4 w-4 me-2 d-inline" />
                Manual Entry
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="import">
                <DocumentArrowUpIcon className="h-4 w-4 me-2 d-inline" />
                CSV/JSON Import
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="platform">
                <GlobeAltIcon className="h-4 w-4 me-2 d-inline" />
                Copy from Platform
              </Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content>
            {/* Manual Entry Tab */}
            <Tab.Pane eventKey="manual">
              <Form onSubmit={handleManualSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Product Name *</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        isInvalid={!!errors.name}
                        placeholder="Enter product name"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.name}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>SKU</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.baseSku}
                        onChange={(e) =>
                          handleInputChange("baseSku", e.target.value)
                        }
                        placeholder="Auto-generated if empty"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Category *</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.category}
                        onChange={(e) =>
                          handleInputChange("category", e.target.value)
                        }
                        isInvalid={!!errors.category}
                        placeholder="Enter product category"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.category}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Brand</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.brand}
                        onChange={(e) =>
                          handleInputChange("brand", e.target.value)
                        }
                        placeholder="Enter brand name"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Base Price *</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.basePrice}
                        onChange={(e) =>
                          handleInputChange("basePrice", e.target.value)
                        }
                        isInvalid={!!errors.basePrice}
                        placeholder="0.00"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.basePrice}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Cost Price</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.baseCostPrice}
                        onChange={(e) =>
                          handleInputChange("baseCostPrice", e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Stock Quantity</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        value={formData.stockQuantity}
                        onChange={(e) =>
                          handleInputChange("stockQuantity", e.target.value)
                        }
                        placeholder="0"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Min Stock Level</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        value={formData.minStockLevel}
                        onChange={(e) =>
                          handleInputChange("minStockLevel", e.target.value)
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    placeholder="Enter product description"
                  />
                </Form.Group>

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Weight (kg)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.weight}
                        onChange={(e) =>
                          handleInputChange("weight", e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={8}>
                    <Form.Label>Dimensions (cm)</Form.Label>
                    <Row>
                      <Col>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.dimensions.length}
                          onChange={(e) =>
                            handleDimensionChange("length", e.target.value)
                          }
                          placeholder="Length"
                        />
                      </Col>
                      <Col>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.dimensions.width}
                          onChange={(e) =>
                            handleDimensionChange("width", e.target.value)
                          }
                          placeholder="Width"
                        />
                      </Col>
                      <Col>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.dimensions.height}
                          onChange={(e) =>
                            handleDimensionChange("height", e.target.value)
                          }
                          placeholder="Height"
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={formData.status}
                    onChange={(e) =>
                      handleInputChange("status", e.target.value)
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </Form.Select>
                </Form.Group>
              </Form>
            </Tab.Pane>

            {/* CSV/JSON Import Tab */}
            <Tab.Pane eventKey="import">
              <Card className="mb-4">
                <Card.Body>
                  <div className="text-center">
                    <DocumentArrowUpIcon className="h-12 w-12 text-muted mx-auto mb-3" />
                    <h5>Import Products from File</h5>
                    <p className="text-muted mb-3">
                      Upload a CSV or JSON file containing your product data
                    </p>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".csv,.json"
                      style={{ display: "none" }}
                    />

                    <Button
                      variant="outline-primary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Processing...
                        </>
                      ) : (
                        "Choose File"
                      )}
                    </Button>
                  </div>
                </Card.Body>
              </Card>

              {importPreview && (
                <>
                  <Card className="mb-4">
                    <Card.Header>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>Preview: {importPreview.fileName}</strong>
                          <Badge bg="info" className="ms-2">
                            {importPreview.data.length} products
                          </Badge>
                        </div>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => setImportPreview(null)}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card.Header>
                    <Card.Body>
                      <h6>Field Mapping</h6>
                      <Row className="mb-3">
                        {[
                          "name",
                          "baseSku",
                          "category",
                          "basePrice",
                          "brand",
                          "description",
                          "stockQuantity",
                        ].map((field) => (
                          <Col md={6} key={field} className="mb-2">
                            <Form.Group>
                              <Form.Label className="small text-capitalize">
                                {field.replace(/([A-Z])/g, " $1").trim()}
                                {["name", "category", "basePrice"].includes(
                                  field
                                ) && " *"}
                              </Form.Label>
                              <Form.Select
                                size="sm"
                                value={fieldMapping[field] || ""}
                                onChange={(e) =>
                                  setFieldMapping((prev) => ({
                                    ...prev,
                                    [field]: e.target.value,
                                  }))
                                }
                              >
                                <option value="">-- Select Field --</option>
                                {importPreview.headers.map((header) => (
                                  <option key={header} value={header}>
                                    {header}
                                  </option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        ))}
                      </Row>

                      <h6>Data Preview</h6>
                      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                        <Table striped bordered hover size="sm">
                          <thead>
                            <tr>
                              {importPreview.headers
                                .slice(0, 6)
                                .map((header) => (
                                  <th key={header}>{header}</th>
                                ))}
                              {importPreview.headers.length > 6 && <th>...</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.data
                              .slice(0, 5)
                              .map((row, index) => (
                                <tr key={index}>
                                  {importPreview.headers
                                    .slice(0, 6)
                                    .map((header) => (
                                      <td key={header}>
                                        {String(row[header] || "").substring(
                                          0,
                                          50
                                        )}
                                      </td>
                                    ))}
                                  {importPreview.headers.length > 6 && (
                                    <td>...</td>
                                  )}
                                </tr>
                              ))}
                          </tbody>
                        </Table>
                      </div>
                    </Card.Body>
                  </Card>
                </>
              )}
            </Tab.Pane>

            {/* Platform Copy Tab */}
            <Tab.Pane eventKey="platform">
              <Card>
                <Card.Body>
                  <div className="text-center mb-4">
                    <GlobeAltIcon className="h-12 w-12 text-muted mx-auto mb-3" />
                    <h5>Copy Product from Platform</h5>
                    <p className="text-muted">
                      Enter a product URL from supported platforms to
                      automatically import product data
                    </p>
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Label>Product URL</Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Control
                        type="url"
                        value={platformUrl}
                        onChange={(e) => setPlatformUrl(e.target.value)}
                        placeholder="https://example.com/product-page"
                      />
                      <Button
                        variant="primary"
                        onClick={handlePlatformFetch}
                        disabled={loading || !platformUrl.trim()}
                      >
                        {loading ? (
                          <Spinner size="sm" />
                        ) : (
                          <MagnifyingGlassIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Form.Text className="text-muted">
                      Supported platforms: Trendyol, Hepsiburada, N11, Amazon
                      (Coming Soon)
                    </Form.Text>
                  </Form.Group>

                  {platformData && (
                    <Card className="mt-3">
                      <Card.Header>
                        <strong>Fetched Product Data</strong>
                      </Card.Header>
                      <Card.Body>
                        <pre
                          className="small bg-light p-3 rounded"
                          style={{ maxHeight: "200px", overflowY: "auto" }}
                        >
                          {JSON.stringify(platformData, null, 2)}
                        </pre>
                      </Card.Body>
                    </Card>
                  )}

                  <Alert variant="info" className="mt-3">
                    <strong>Note:</strong> Platform data scraping is in
                    development. Currently supports basic product information
                    extraction.
                  </Alert>
                </Card.Body>
              </Card>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>

        {activeTab === "manual" && (
          <Button
            variant="primary"
            onClick={handleManualSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Creating...
              </>
            ) : (
              "Create Product"
            )}
          </Button>
        )}

        {activeTab === "import" && importPreview && (
          <Button
            variant="success"
            onClick={handleBulkImport}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Importing...
              </>
            ) : (
              `Import ${importPreview.data.length} Products`
            )}
          </Button>
        )}

        {activeTab === "platform" && platformData && (
          <Button
            variant="primary"
            onClick={() => {
              // Convert platform data to form format and switch to manual tab
              const mappedData = {};
              Object.entries(fieldMapping).forEach(
                ([targetField, sourceField]) => {
                  if (sourceField && platformData[sourceField] !== undefined) {
                    mappedData[targetField] = platformData[sourceField];
                  }
                }
              );
              setFormData((prev) => ({ ...prev, ...mappedData }));
              setActiveTab("manual");
            }}
            disabled={loading}
          >
            Use This Data
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ProductCreationModal;
