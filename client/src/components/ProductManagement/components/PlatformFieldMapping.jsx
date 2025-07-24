import logger from "../../../utils/logger";
import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Button,
  Row,
  Col,
  Alert,
  Spinner,
  Card,
  Badge,
  Table,
  Accordion,
} from "react-bootstrap";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { useAlert } from "../../../contexts/AlertContext";

/**
 * Platform Field Mapping Component
 * Helps map fields between different platforms for data compatibility
 */
const PlatformFieldMapping = ({
  show,
  onHide,
  sourcePlatform,
  targetPlatform,
  sampleData,
  onMappingComplete,
}) => {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [fieldMapping, setFieldMapping] = useState({});
  const [previewData, setPreviewData] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  // Platform field definitions
  const platformFields = {
    trendyol: {
      required: [
        { key: "title", label: "Product Title", type: "string" },
        { key: "description", label: "Description", type: "text" },
        { key: "price", label: "Price", type: "number" },
        { key: "category", label: "Category", type: "string" },
        { key: "brand", label: "Brand", type: "string" },
        { key: "barcode", label: "Barcode", type: "string" },
        { key: "stockQuantity", label: "Stock Quantity", type: "number" },
      ],
      optional: [
        { key: "discountPrice", label: "Discount Price", type: "number" },
        { key: "images", label: "Product Images", type: "array" },
        { key: "attributes", label: "Product Attributes", type: "object" },
        { key: "weight", label: "Weight (gram)", type: "number" },
        { key: "dimensions", label: "Dimensions", type: "object" },
      ],
    },
    hepsiburada: {
      required: [
        { key: "productName", label: "Product Name", type: "string" },
        {
          key: "productDescription",
          label: "Product Description",
          type: "text",
        },
        { key: "listPrice", label: "List Price", type: "number" },
        { key: "categoryId", label: "Category ID", type: "string" },
        { key: "brandName", label: "Brand Name", type: "string" },
        { key: "merchantSku", label: "Merchant SKU", type: "string" },
        { key: "quantity", label: "Quantity", type: "number" },
      ],
      optional: [
        { key: "salePrice", label: "Sale Price", type: "number" },
        { key: "images", label: "Images", type: "array" },
        { key: "variants", label: "Variants", type: "array" },
        { key: "packageWeight", label: "Package Weight", type: "number" },
        {
          key: "packageDimensions",
          label: "Package Dimensions",
          type: "object",
        },
      ],
    },
    n11: {
      required: [
        { key: "title", label: "Title", type: "string" },
        { key: "subtitle", label: "Subtitle", type: "string" },
        { key: "salePrice", label: "Sale Price", type: "number" },
        { key: "categoryId", label: "Category ID", type: "string" },
        { key: "brand", label: "Brand", type: "string" },
        { key: "productCode", label: "Product Code", type: "string" },
        { key: "stockQuantity", label: "Stock Quantity", type: "number" },
      ],
      optional: [
        { key: "listPrice", label: "List Price", type: "number" },
        { key: "images", label: "Images", type: "array" },
        { key: "attributes", label: "Attributes", type: "object" },
        { key: "weight", label: "Weight", type: "number" },
        { key: "dimensions", label: "Dimensions", type: "object" },
      ],
    },
    generic: {
      required: [
        { key: "name", label: "Product Name", type: "string" },
        { key: "description", label: "Description", type: "text" },
        { key: "price", label: "Price", type: "number" },
        { key: "category", label: "Category", type: "string" },
        { key: "sku", label: "SKU", type: "string" },
        { key: "stock", label: "Stock", type: "number" },
      ],
      optional: [
        { key: "brand", label: "Brand", type: "string" },
        { key: "costPrice", label: "Cost Price", type: "number" },
        { key: "images", label: "Images", type: "array" },
        { key: "attributes", label: "Attributes", type: "object" },
        { key: "weight", label: "Weight", type: "number" },
        { key: "dimensions", label: "Dimensions", type: "object" },
      ],
    },
  };

  // Auto-detect field mappings based on field names
  const autoDetectMappings = () => {
    if (!sampleData || !sourcePlatform || !targetPlatform) return;

    const sourceFields =
      Array.isArray(sampleData) && sampleData.length > 0
        ? Object.keys(sampleData[0])
        : Object.keys(sampleData);

    const targetFields = [
      ...(platformFields[targetPlatform]?.required || []),
      ...(platformFields[targetPlatform]?.optional || []),
    ];

    const autoMapping = {};

    targetFields.forEach((targetField) => {
      const targetKey = targetField.key.toLowerCase();

      // Find matching source field
      const matchingSourceField = sourceFields.find((sourceField) => {
        const sourceKey = sourceField.toLowerCase();

        // Exact match
        if (sourceKey === targetKey) return true;

        // Partial matches for common field patterns
        if (
          targetKey.includes("name") &&
          (sourceKey.includes("name") || sourceKey.includes("title"))
        )
          return true;
        if (
          targetKey.includes("title") &&
          (sourceKey.includes("title") || sourceKey.includes("name"))
        )
          return true;
        if (targetKey.includes("price") && sourceKey.includes("price"))
          return true;
        if (
          targetKey.includes("description") &&
          sourceKey.includes("description")
        )
          return true;
        if (targetKey.includes("category") && sourceKey.includes("category"))
          return true;
        if (targetKey.includes("brand") && sourceKey.includes("brand"))
          return true;
        if (
          targetKey.includes("sku") &&
          (sourceKey.includes("sku") || sourceKey.includes("code"))
        )
          return true;
        if (
          targetKey.includes("stock") &&
          (sourceKey.includes("stock") || sourceKey.includes("quantity"))
        )
          return true;
        if (
          targetKey.includes("quantity") &&
          (sourceKey.includes("quantity") || sourceKey.includes("stock"))
        )
          return true;
        if (targetKey.includes("weight") && sourceKey.includes("weight"))
          return true;
        if (targetKey.includes("image") && sourceKey.includes("image"))
          return true;

        return false;
      });

      if (matchingSourceField) {
        autoMapping[targetField.key] = matchingSourceField;
      }
    });

    setFieldMapping(autoMapping);
  };

  useEffect(() => {
    if (show && sampleData) {
      autoDetectMappings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, sampleData, sourcePlatform, targetPlatform]);

  // Handle field mapping change
  const handleMappingChange = (targetField, sourceField) => {
    setFieldMapping((prev) => ({
      ...prev,
      [targetField]: sourceField || undefined,
    }));
  };

  // Validate current mapping
  const validateMapping = () => {
    const errors = [];
    const targetFields = platformFields[targetPlatform];

    if (!targetFields) {
      errors.push(`Unknown target platform: ${targetPlatform}`);
      return errors;
    }

    // Check required fields
    targetFields.required.forEach((field) => {
      if (!fieldMapping[field.key]) {
        errors.push(`Required field '${field.label}' is not mapped`);
      }
    });

    return errors;
  };

  // Generate preview of mapped data
  const generatePreview = () => {
    if (!sampleData || Object.keys(fieldMapping).length === 0) {
      setPreviewData(null);
      return;
    }

    try {
      const sourceDataArray = Array.isArray(sampleData)
        ? sampleData.slice(0, 3)
        : [sampleData];
      const mappedData = sourceDataArray.map((sourceItem) => {
        const mappedItem = {};

        Object.entries(fieldMapping).forEach(([targetField, sourceField]) => {
          if (sourceField && sourceItem[sourceField] !== undefined) {
            const targetFieldInfo = [
              ...(platformFields[targetPlatform]?.required || []),
              ...(platformFields[targetPlatform]?.optional || []),
            ].find((f) => f.key === targetField);

            let value = sourceItem[sourceField];

            // Type conversion based on target field type
            if (targetFieldInfo) {
              switch (targetFieldInfo.type) {
                case "number":
                  value = parseFloat(value) || 0;
                  break;
                case "string":
                  value = String(value || "");
                  break;
                case "array":
                  value = Array.isArray(value) ? value : [value];
                  break;
                case "object":
                  value = typeof value === "object" ? value : {};
                  break;
                default:
                  // Keep original value
                  break;
              }
            }

            mappedItem[targetField] = value;
          }
        });

        return mappedItem;
      });

      setPreviewData(mappedData);
    } catch (error) {
      logger.error("Error generating preview:", error);
      setPreviewData(null);
    }
  };

  // Handle save mapping
  const handleSaveMapping = async () => {
    const errors = validateMapping();
    setValidationErrors(errors);

    if (errors.length > 0) {
      showAlert(`Please fix ${errors.length} validation error(s)`, "error");
      return;
    }

    try {
      setLoading(true);

      // Generate the complete mapped data
      generatePreview();

      // Call the completion handler with the mapping configuration
      onMappingComplete({
        sourcePlatform,
        targetPlatform,
        fieldMapping,
        previewData,
        mappingConfig: {
          createdAt: new Date().toISOString(),
          sourceFields:
            Array.isArray(sampleData) && sampleData.length > 0
              ? Object.keys(sampleData[0])
              : Object.keys(sampleData),
          targetFields: platformFields[targetPlatform],
        },
      });

      showAlert("Field mapping configuration saved successfully", "success");
      onHide();
    } catch (error) {
      logger.error("Error saving mapping:", error);
      showAlert("Error saving mapping configuration", "error");
    } finally {
      setLoading(false);
    }
  };

  // Update preview when mapping changes
  useEffect(() => {
    generatePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldMapping]);

  const sourceFields = sampleData
    ? Array.isArray(sampleData) && sampleData.length > 0
      ? Object.keys(sampleData[0])
      : Object.keys(sampleData)
    : [];

  const targetFields = platformFields[targetPlatform] || {
    required: [],
    optional: [],
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          Platform Field Mapping: {sourcePlatform} → {targetPlatform}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
        {/* Auto-detection controls */}
        <Card className="mb-4">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="mb-1">Field Mapping Configuration</h6>
                <small className="text-muted">
                  Map fields from {sourcePlatform} to {targetPlatform} format
                </small>
              </div>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={autoDetectMappings}
                disabled={!sampleData}
              >
                <ArrowPathIcon className="h-4 w-4 me-1" />
                Auto-Detect
              </Button>
            </div>
          </Card.Body>
        </Card>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <Alert variant="danger" className="mb-4">
            <ExclamationTriangleIcon className="h-5 w-5 me-2 d-inline" />
            <strong>Validation Errors:</strong>
            <ul className="mb-0 mt-2">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        <Row>
          {/* Field Mapping Table */}
          <Col lg={7}>
            <Card>
              <Card.Header>
                <h6 className="mb-0">Field Mapping</h6>
              </Card.Header>
              <Card.Body>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>Target Field ({targetPlatform})</th>
                      <th>Source Field ({sourcePlatform})</th>
                      <th>Type</th>
                      <th>Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Required fields */}
                    {targetFields.required.map((field) => (
                      <tr
                        key={field.key}
                        className={
                          !fieldMapping[field.key] ? "table-warning" : ""
                        }
                      >
                        <td>
                          <strong>{field.label}</strong>
                          <br />
                          <small className="text-muted">{field.key}</small>
                        </td>
                        <td>
                          <Form.Select
                            size="sm"
                            value={fieldMapping[field.key] || ""}
                            onChange={(e) =>
                              handleMappingChange(field.key, e.target.value)
                            }
                          >
                            <option value="">-- Select Source Field --</option>
                            {sourceFields.map((sourceField) => (
                              <option key={sourceField} value={sourceField}>
                                {sourceField}
                              </option>
                            ))}
                          </Form.Select>
                        </td>
                        <td>
                          <Badge bg="secondary">{field.type}</Badge>
                        </td>
                        <td>
                          <CheckCircleIcon className="h-4 w-4 text-danger" />
                        </td>
                      </tr>
                    ))}

                    {/* Optional fields */}
                    {targetFields.optional.map((field) => (
                      <tr key={field.key}>
                        <td>
                          {field.label}
                          <br />
                          <small className="text-muted">{field.key}</small>
                        </td>
                        <td>
                          <Form.Select
                            size="sm"
                            value={fieldMapping[field.key] || ""}
                            onChange={(e) =>
                              handleMappingChange(field.key, e.target.value)
                            }
                          >
                            <option value="">-- Select Source Field --</option>
                            {sourceFields.map((sourceField) => (
                              <option key={sourceField} value={sourceField}>
                                {sourceField}
                              </option>
                            ))}
                          </Form.Select>
                        </td>
                        <td>
                          <Badge bg="info">{field.type}</Badge>
                        </td>
                        <td>
                          <span className="text-muted">Optional</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>

          {/* Preview */}
          <Col lg={5}>
            <Card>
              <Card.Header>
                <h6 className="mb-0">Data Preview</h6>
              </Card.Header>
              <Card.Body>
                {previewData ? (
                  <Accordion>
                    {previewData.map((item, index) => (
                      <Accordion.Item key={index} eventKey={index.toString()}>
                        <Accordion.Header>Sample {index + 1}</Accordion.Header>
                        <Accordion.Body>
                          <pre
                            className="small bg-light p-2 rounded"
                            style={{ fontSize: "11px" }}
                          >
                            {JSON.stringify(item, null, 2)}
                          </pre>
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center text-muted py-4">
                    <InformationCircleIcon className="h-8 w-8 mx-auto mb-2" />
                    <p>Configure field mappings to see preview</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer>
        <div className="d-flex justify-content-between align-items-center w-100">
          <div>
            <small className="text-muted">
              {Object.keys(fieldMapping).length} of{" "}
              {targetFields.required.length + targetFields.optional.length}{" "}
              fields mapped
            </small>
          </div>
          <div>
            <Button
              variant="secondary"
              onClick={onHide}
              disabled={loading}
              className="me-2"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveMapping}
              disabled={loading || validationErrors.length > 0}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                "Save Mapping"
              )}
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default PlatformFieldMapping;
