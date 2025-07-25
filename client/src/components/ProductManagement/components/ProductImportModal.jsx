import React, { useState, useRef, useCallback } from "react";
import {
  Modal,
  Button,
  Form,
  Row,
  Col,
  Table,
  Alert,
  ProgressBar,
  Tab,
  Tabs,
  Card,
  ListGroup,
  Spinner,
} from "react-bootstrap";
import {
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";

const ProductImportModal = ({ show, onHide, onSuccess, showAlert }) => {
  // State management
  const [activeTab, setActiveTab] = useState("upload");
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [fieldMappings, setFieldMappings] = useState({});
  const [validationResults, setValidationResults] = useState(null);
  const [importOptions, setImportOptions] = useState({
    classificationMode: "manual",
    variantGrouping: "name",
    createMissing: true,
    updateExisting: false,
    dryRun: false,
  });
  const [availableOptions, setAvailableOptions] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [mainProductMapping, setMainProductMapping] = useState({});

  const fileInputRef = useRef(null);

  // Reset modal state
  const resetModal = useCallback(() => {
    setActiveTab("upload");
    setLoading(false);
    setUploadedFile(null);
    setPreviewData(null);
    setFieldMappings({});
    setValidationResults(null);
    setImportOptions({
      classificationMode: "manual",
      variantGrouping: "name",
      createMissing: true,
      updateExisting: false,
      dryRun: false,
    });
    setImportProgress(null);
    setMainProductMapping({});
  }, []);

  // Handle modal close
  const handleClose = useCallback(() => {
    resetModal();
    onHide();
  }, [resetModal, onHide]);

  // Fetch import options on modal open
  React.useEffect(() => {
    if (show && !availableOptions) {
      fetchImportOptions();
    }
  }, [show, availableOptions]);

  const fetchImportOptions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/import/options`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setAvailableOptions(result.data);
      }
    } catch (error) {
      console.error("Error fetching import options:", error);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    const allowedExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));

    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtensions.includes(fileExtension)
    ) {
      showAlert("Please select a CSV or Excel file", "error");
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      showAlert("File size must be less than 10MB", "error");
      return;
    }

    setUploadedFile(file);
    await previewFile(file);
  };

  // Preview uploaded file
  const previewFile = async (file) => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/products/import/preview`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to preview file");
      }

      const result = await response.json();
      setPreviewData(result.data);
      setFieldMappings(result.data.mappingSuggestions.mappings || {});
      setActiveTab("mapping");

      showAlert(
        `File uploaded successfully! Found ${result.data.preview.totalRows} rows.`,
        "success"
      );
    } catch (error) {
      console.error("Error previewing file:", error);
      showAlert("Error previewing file: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Update field mapping
  const updateFieldMapping = (targetField, sourceField) => {
    setFieldMappings((prev) => ({
      ...prev,
      [targetField]: sourceField,
    }));
  };

  // Validate mapped data
  const validateData = async () => {
    if (!previewData) return;

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/products/import/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          parsedData: previewData.preview,
          fieldMappings,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to validate data");
      }

      const result = await response.json();
      setValidationResults(result.data);
      setActiveTab("validation");
    } catch (error) {
      console.error("Error validating data:", error);
      showAlert("Error validating data: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Perform import
  const performImport = async () => {
    if (!uploadedFile || !validationResults) return;

    try {
      setLoading(true);
      setImportProgress({ current: 0, total: validationResults.totalRows });

      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("fieldMappings", JSON.stringify(fieldMappings));
      formData.append("classificationMode", importOptions.classificationMode);
      formData.append("variantGrouping", importOptions.variantGrouping);
      formData.append("createMissing", importOptions.createMissing);
      formData.append("updateExisting", importOptions.updateExisting);
      formData.append("dryRun", importOptions.dryRun);
      formData.append("mainProductMapping", JSON.stringify(mainProductMapping));

      const response = await fetch(`${API_BASE_URL}/products/import/csv`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Import failed");
      }

      const result = await response.json();

      const message = importOptions.dryRun
        ? `Dry run completed. Would create ${result.data.importResult.created} products.`
        : `Import completed! Created ${result.data.importResult.created} products.`;

      showAlert(message, "success");

      if (onSuccess && !importOptions.dryRun) {
        onSuccess(result.data.importResult);
      }

      if (!importOptions.dryRun) {
        handleClose();
      }
    } catch (error) {
      console.error("Error importing products:", error);
      showAlert("Error importing products: " + error.message, "error");
    } finally {
      setLoading(false);
      setImportProgress(null);
    }
  };

  // Download template
  const downloadTemplate = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/import/template`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "product_import_template.csv";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showAlert("Template downloaded successfully", "success");
      }
    } catch (error) {
      console.error("Error downloading template:", error);
      showAlert("Error downloading template", "error");
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="xl"
      backdrop="static"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>Import Products from CSV/Excel</Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ minHeight: "500px" }}>
        <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
          {/* Upload Tab */}
          <Tab eventKey="upload" title="1. Upload File">
            <div className="text-center py-4">
              <CloudArrowUpIcon className="h-16 w-16 text-muted mx-auto mb-3" />
              <h5>Upload CSV or Excel File</h5>
              <p className="text-muted mb-4">
                Upload your product data file to get started. We support CSV and
                Excel formats.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,.xlsx,.xls"
                style={{ display: "none" }}
              />

              <div className="d-flex justify-content-center gap-3 mb-4">
                <Button
                  variant="primary"
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

                <Button variant="outline-secondary" onClick={downloadTemplate}>
                  Download Template
                </Button>
              </div>

              {uploadedFile && (
                <Alert variant="success">
                  <CheckCircleIcon className="h-5 w-5 me-2 d-inline" />
                  File uploaded: {uploadedFile.name} (
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                </Alert>
              )}

              <div className="mt-4 text-start">
                <h6>Supported Formats:</h6>
                <ul className="list-unstyled">
                  <li>• CSV files (.csv)</li>
                  <li>• Excel files (.xlsx, .xls)</li>
                  <li>• Maximum file size: 10MB</li>
                </ul>
              </div>
            </div>
          </Tab>

          {/* Mapping Tab */}
          <Tab
            eventKey="mapping"
            title="2. Field Mapping"
            disabled={!previewData}
          >
            {previewData && (
              <div>
                <Alert variant="info">
                  <InformationCircleIcon className="h-5 w-5 me-2 d-inline" />
                  Map your file columns to product fields. We've suggested
                  mappings based on your column headers.
                </Alert>

                <Row>
                  <Col md={6}>
                    <h6>Field Mapping</h6>
                    {previewData.supportedFields.map((field) => (
                      <Form.Group key={field.key} className="mb-3">
                        <Form.Label>
                          {field.label}
                          {field.required && (
                            <span className="text-danger"> *</span>
                          )}
                        </Form.Label>
                        <Form.Select
                          value={fieldMappings[field.key] || ""}
                          onChange={(e) =>
                            updateFieldMapping(field.key, e.target.value)
                          }
                        >
                          <option value="">-- Not Mapped --</option>
                          {previewData.preview.headers.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    ))}
                  </Col>

                  <Col md={6}>
                    <h6>Preview Data</h6>
                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                      <Table striped bordered size="sm">
                        <thead>
                          <tr>
                            {previewData.preview.headers.map((header) => (
                              <th key={header}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.preview.sampleRows
                            .slice(0, 5)
                            .map((row, index) => (
                              <tr key={index}>
                                {previewData.preview.headers.map((header) => (
                                  <td key={header}>
                                    {row[header]
                                      ? String(row[header]).substring(0, 50)
                                      : ""}
                                  </td>
                                ))}
                              </tr>
                            ))}
                        </tbody>
                      </Table>
                    </div>
                    <small className="text-muted">
                      Showing first 5 rows of {previewData.preview.totalRows}{" "}
                      total rows
                    </small>
                  </Col>
                </Row>

                <div className="d-flex justify-content-end mt-3">
                  <Button
                    variant="primary"
                    onClick={validateData}
                    disabled={
                      loading || Object.keys(fieldMappings).length === 0
                    }
                  >
                    {loading ? "Validating..." : "Validate Data"}
                  </Button>
                </div>
              </div>
            )}
          </Tab>

          {/* Validation Tab */}
          <Tab
            eventKey="validation"
            title="3. Validation"
            disabled={!validationResults}
          >
            {validationResults && (
              <div>
                <Row className="mb-3">
                  <Col md={3}>
                    <Card className="text-center">
                      <Card.Body>
                        <h4 className="text-success">
                          {validationResults.totalRows}
                        </h4>
                        <small>Total Rows</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center">
                      <Card.Body>
                        <h4 className="text-success">
                          {validationResults.validRows}
                        </h4>
                        <small>Valid Rows</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center">
                      <Card.Body>
                        <h4 className="text-danger">
                          {validationResults.invalidRows}
                        </h4>
                        <small>Invalid Rows</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center">
                      <Card.Body>
                        <h4 className="text-warning">
                          {
                            validationResults.validData.filter(
                              (row) => row.warnings.length > 0
                            ).length
                          }
                        </h4>
                        <small>Warnings</small>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {validationResults.hasErrors && (
                  <Alert variant="warning">
                    <ExclamationTriangleIcon className="h-5 w-5 me-2 d-inline" />
                    Some rows have validation errors. Review them below or
                    continue to import only valid rows.
                  </Alert>
                )}

                {validationResults.invalidRows > 0 && (
                  <Card className="mb-3">
                    <Card.Header>
                      <h6 className="mb-0">Validation Errors</h6>
                    </Card.Header>
                    <Card.Body
                      style={{ maxHeight: "200px", overflowY: "auto" }}
                    >
                      <ListGroup variant="flush">
                        {validationResults.invalidData
                          .slice(0, 10)
                          .map((row, index) => (
                            <ListGroup.Item key={index}>
                              <strong>Row {row.rowIndex}:</strong>
                              <ul className="mb-0 mt-1">
                                {row.errors.map((error, errorIndex) => (
                                  <li key={errorIndex} className="text-danger">
                                    {error}
                                  </li>
                                ))}
                              </ul>
                            </ListGroup.Item>
                          ))}
                      </ListGroup>
                    </Card.Body>
                  </Card>
                )}

                <div className="d-flex justify-content-end">
                  <Button
                    variant="primary"
                    onClick={() => setActiveTab("options")}
                    disabled={validationResults.validRows === 0}
                  >
                    Configure Import Options
                  </Button>
                </div>
              </div>
            )}
          </Tab>

          {/* Options Tab */}
          <Tab
            eventKey="options"
            title="4. Import Options"
            disabled={!validationResults}
          >
            <div>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Classification Mode</Form.Label>
                    <Form.Select
                      value={importOptions.classificationMode}
                      onChange={(e) =>
                        setImportOptions((prev) => ({
                          ...prev,
                          classificationMode: e.target.value,
                        }))
                      }
                    >
                      {availableOptions?.classificationModes.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      {
                        availableOptions?.classificationModes.find(
                          (m) => m.value === importOptions.classificationMode
                        )?.description
                      }
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Variant Grouping</Form.Label>
                    <Form.Select
                      value={importOptions.variantGrouping}
                      onChange={(e) =>
                        setImportOptions((prev) => ({
                          ...prev,
                          variantGrouping: e.target.value,
                        }))
                      }
                    >
                      {availableOptions?.groupingOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      {
                        availableOptions?.groupingOptions.find(
                          (o) => o.value === importOptions.variantGrouping
                        )?.description
                      }
                    </Form.Text>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Create missing main products"
                      checked={importOptions.createMissing}
                      onChange={(e) =>
                        setImportOptions((prev) => ({
                          ...prev,
                          createMissing: e.target.checked,
                        }))
                      }
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Update existing products"
                      checked={importOptions.updateExisting}
                      onChange={(e) =>
                        setImportOptions((prev) => ({
                          ...prev,
                          updateExisting: e.target.checked,
                        }))
                      }
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Dry run (test without importing)"
                      checked={importOptions.dryRun}
                      onChange={(e) =>
                        setImportOptions((prev) => ({
                          ...prev,
                          dryRun: e.target.checked,
                        }))
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>

              {importProgress && (
                <div className="mb-3">
                  <ProgressBar
                    now={(importProgress.current / importProgress.total) * 100}
                    label={`${importProgress.current} / ${importProgress.total}`}
                  />
                </div>
              )}

              <div className="d-flex justify-content-between">
                <Button
                  variant="outline-secondary"
                  onClick={() => setActiveTab("validation")}
                >
                  Back to Validation
                </Button>

                <Button
                  variant={importOptions.dryRun ? "warning" : "success"}
                  onClick={performImport}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      {importOptions.dryRun
                        ? "Running Test..."
                        : "Importing..."}
                    </>
                  ) : importOptions.dryRun ? (
                    "Run Test Import"
                  ) : (
                    "Import Products"
                  )}
                </Button>
              </div>
            </div>
          </Tab>
        </Tabs>
      </Modal.Body>
    </Modal>
  );
};

export default ProductImportModal;
