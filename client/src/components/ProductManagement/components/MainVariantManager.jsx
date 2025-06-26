import React, { useState, useMemo, useCallback } from "react";
import {
  Card,
  Button,
  Form,
  Row,
  Col,
  Alert,
  Badge,
  Table,
  Modal,
  Spinner,
} from "react-bootstrap";
import {
  StarIcon,
  DocumentDuplicateIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useAlert } from "../../../contexts/AlertContext";
import { API_BASE_URL } from "../utils/constants";

/**
 * Main Product and Variant Management Component
 * Handles marking products as main products and creating variants
 */
const MainVariantManager = ({
  products = [],
  selectedProducts = [],
  onSelectionChange,
  onRefresh,
}) => {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [showCreateVariantModal, setShowCreateVariantModal] = useState(false);
  const [selectedMainProduct, setSelectedMainProduct] = useState(null);
  const [showAlertBanner, setShowAlertBanner] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("info");
  const [variantFormData, setVariantFormData] = useState({
    platform: "",
    platformSku: "",
    variantSuffix: "",
    platformCategory: "",
    platformPrice: "",
    platformQuantity: "",
    isPublished: false,
  });

  // Available platforms for variant creation
  const platforms = [
    { value: "trendyol", label: "Trendyol" },
    { value: "hepsiburada", label: "Hepsiburada" },
    { value: "n11", label: "N11" },
    { value: "amazon", label: "Amazon TR" },
  ];

  // Handle bulk mark as main products - memoized to prevent recreation
  const handleBulkMarkAsMain = useCallback(
    async (productIds = selectedProducts) => {
      if (productIds.length === 0) {
        showAlert("Please select products to mark as main products", "warning");
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `${API_BASE_URL}/products/bulk/mark-as-main`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              productIds: productIds,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to mark products as main");
        }

        const result = await response.json();
        showAlert(
          `Successfully marked ${
            result.successCount || productIds.length
          } products as main products`,
          "success"
        );

        // Call onRefresh with a delay to prevent loops
        if (onRefresh) {
          setTimeout(() => onRefresh(), 100);
        }

        if (onSelectionChange) {
          onSelectionChange([]);
        }
      } catch (error) {
        console.error("Error marking products as main:", error);
        showAlert("Error marking products as main: " + error.message, "error");
      } finally {
        setLoading(false);
      }
    },
    [selectedProducts, showAlert, onRefresh, onSelectionChange]
  );

  // Handle create variants for main product - memoized to prevent recreation
  const handleCreateVariants = useCallback((mainProduct) => {
    setSelectedMainProduct(mainProduct);
    setShowCreateVariantModal(true);
  }, []);

  // Handle variant form submission
  const handleVariantSubmit = async () => {
    if (!selectedMainProduct) {
      showAlert("No main product selected", "error");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/products/main-products/${selectedMainProduct.id}/variants`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(variantFormData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create variant");
      }

      const result = await response.json();
      console.log("Variant creation result:", result);
      showAlert(
        result.message || "Variant created successfully!",
        result.success ? "success" : "info"
      );

      setShowCreateVariantModal(false);
      setVariantFormData({
        platform: "",
        platformSku: "",
        variantSuffix: "",
        platformCategory: "",
        platformPrice: "",
        platformQuantity: "",
        isPublished: false,
      });

      if (onRefresh) {
        setTimeout(() => onRefresh(), 100);
      }
    } catch (error) {
      console.error("Error creating variant:", error);
      showAlert("Error creating variant: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk variant creation
  const handleBulkCreateVariants = async () => {
    if (selectedProducts.length === 0) {
      showAlert(
        "Please select main products to create variants for",
        "warning"
      );
      return;
    }

    try {
      setLoading(true);
      const results = [];

      for (const productId of selectedProducts) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/products/main-products/${productId}/variants`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify({
                ...variantFormData,
                variantSuffix: variantFormData.variantSuffix || "VAR",
              }),
            }
          );

          if (response.ok) {
            results.push({ success: true, productId });
          } else {
            results.push({ success: false, productId });
          }
        } catch (error) {
          results.push({ success: false, productId, error: error.message });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      showAlert(
        `Created variants for ${successCount} of ${selectedProducts.length} products`,
        successCount > 0 ? "success" : "error"
      );

      if (onRefresh) {
        setTimeout(() => onRefresh(), 100);
      }

      if (onSelectionChange) {
        onSelectionChange([]);
      }
    } catch (error) {
      console.error("Error creating bulk variants:", error);
      showAlert("Error creating bulk variants: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Get main products from selected products - memoized to prevent infinite loops
  const getMainProducts = useMemo(() => {
    return products.filter(
      (p) => selectedProducts.includes(p.id) && !p.isVariant
    );
  }, [products, selectedProducts]);

  // Get regular products that can be marked as main - memoized to prevent infinite loops
  const getMarkableProducts = useMemo(() => {
    return products.filter(
      (p) => selectedProducts.includes(p.id) && !p.isMainProduct
    );
  }, [products, selectedProducts]);

  // Filtered selected products - memoized to prevent infinite loops
  const selectedProductsData = useMemo(() => {
    return products.filter((p) => selectedProducts.includes(p.id));
  }, [products, selectedProducts]);

  return (
    <div className="main-variant-manager">
      {/* Alert Banner */}
      {showAlertBanner && (
        <Alert
          variant={alertVariant}
          onClose={() => setShowAlertBanner(false)}
          dismissible
          className="mb-3"
        >
          {alertMessage}
        </Alert>
      )}

      {/* Selection Summary */}
      {selectedProducts.length > 0 && (
        <Card className="mb-4 border-primary">
          <Card.Body className="p-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <StarIcon className="h-5 w-5 text-warning flex-shrink-0" />
                <div>
                  <h6 className="mb-1 text-sm font-semibold">
                    Ana Ürün & Varyant Yönetimi
                  </h6>
                  <p className="mb-0 text-muted small">
                    {selectedProducts.length} ürün seçildi
                  </p>
                </div>
              </div>
              <div className="d-flex flex-wrap gap-2">
                {getMarkableProducts.length > 0 && (
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={handleBulkMarkAsMain}
                    disabled={loading}
                    className="d-flex align-items-center gap-1"
                  >
                    {loading ? (
                      <Spinner size="sm" />
                    ) : (
                      <StarIcon className="h-4 w-4" />
                    )}
                    <span className="d-none d-sm-inline">Ana Ürün Yap</span>
                    <span className="badge bg-light text-dark ms-1">
                      {getMarkableProducts.length}
                    </span>
                  </Button>
                )}

                {getMainProducts.length > 0 && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleBulkCreateVariants}
                    disabled={loading}
                    className="d-flex align-items-center gap-1"
                  >
                    {loading ? (
                      <Spinner size="sm" />
                    ) : (
                      <DocumentDuplicateIcon className="h-4 w-4" />
                    )}
                    <span className="d-none d-sm-inline">Varyant Oluştur</span>
                    <span className="badge bg-light text-dark ms-1">
                      {getMainProducts.length}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Products Table */}
      {selectedProducts.length > 0 && (
        <Card className="mb-4">
          <Card.Header>
            <h6 className="mb-0">Selected Products Details</h6>
          </Card.Header>
          <Card.Body>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedProductsData.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name || product.title}</td>
                    <td>{product.sku}</td>
                    <td>
                      <Badge
                        bg={
                          product.status === "active" ? "success" : "secondary"
                        }
                      >
                        {product.status}
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        bg={
                          product.isMainProduct
                            ? "primary"
                            : product.isVariant
                            ? "secondary"
                            : "light"
                        }
                      >
                        {product.isMainProduct
                          ? "Main Product"
                          : product.isVariant
                          ? "Variant"
                          : "Regular"}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => {
                          setAlertMessage(
                            `Are you sure you want to remove ${product.name}?`
                          );
                          setAlertVariant("warning");
                          setShowAlertBanner(true);
                        }}
                        title="Remove from selection"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Product Cards with Main/Variant Actions */}
      <Row>
        {selectedProductsData.map((product) => (
          <Col md={6} lg={4} key={product.id} className="mb-3">
            <Card className={product.isMainProduct ? "border-warning" : ""}>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h6 className="mb-1">{product.name}</h6>
                  {product.isMainProduct && (
                    <Badge bg="warning" className="ms-2">
                      <StarIcon className="h-3 w-3 me-1" />
                      Main
                    </Badge>
                  )}
                </div>

                <p className="text-muted small mb-2">
                  SKU: {product.baseSku || product.sku}
                </p>

                {product.platformVariants &&
                  product.platformVariants.length > 0 && (
                    <div className="mb-2">
                      <small className="text-muted">Variants:</small>
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {product.platformVariants.map((variant, index) => (
                          <Badge key={index} bg="info" size="sm">
                            {variant.platform}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="d-flex gap-2 mt-3">
                  {!product.isMainProduct && (
                    <Button
                      variant="outline-warning"
                      size="sm"
                      onClick={() => handleBulkMarkAsMain([product.id])}
                      disabled={loading}
                    >
                      <StarIcon className="h-4 w-4" />
                    </Button>
                  )}

                  {product.isMainProduct && (
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => handleCreateVariants(product)}
                      disabled={loading}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Create Variant Modal */}
      <Modal
        show={showCreateVariantModal}
        onHide={() => setShowCreateVariantModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Create Variant for {selectedMainProduct?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Platform *</Form.Label>
                  <Form.Select
                    value={variantFormData.platform}
                    onChange={(e) =>
                      setVariantFormData((prev) => ({
                        ...prev,
                        platform: e.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Select Platform</option>
                    {platforms.map((platform) => (
                      <option key={platform.value} value={platform.value}>
                        {platform.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Variant Suffix</Form.Label>
                  <Form.Control
                    type="text"
                    value={variantFormData.variantSuffix}
                    onChange={(e) =>
                      setVariantFormData((prev) => ({
                        ...prev,
                        variantSuffix: e.target.value,
                      }))
                    }
                    placeholder="e.g., TR, HB, N11"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Platform SKU</Form.Label>
                  <Form.Control
                    type="text"
                    value={variantFormData.platformSku}
                    onChange={(e) =>
                      setVariantFormData((prev) => ({
                        ...prev,
                        platformSku: e.target.value,
                      }))
                    }
                    placeholder="Auto-generated if empty"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Platform Category</Form.Label>
                  <Form.Control
                    type="text"
                    value={variantFormData.platformCategory}
                    onChange={(e) =>
                      setVariantFormData((prev) => ({
                        ...prev,
                        platformCategory: e.target.value,
                      }))
                    }
                    placeholder="Platform-specific category"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Platform Price</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={variantFormData.platformPrice}
                    onChange={(e) =>
                      setVariantFormData((prev) => ({
                        ...prev,
                        platformPrice: e.target.value,
                      }))
                    }
                    placeholder="Uses main product price if empty"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Platform Quantity</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={variantFormData.platformQuantity}
                    onChange={(e) =>
                      setVariantFormData((prev) => ({
                        ...prev,
                        platformQuantity: e.target.value,
                      }))
                    }
                    placeholder="Uses main product stock if empty"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Publish immediately to platform"
                checked={variantFormData.isPublished}
                onChange={(e) =>
                  setVariantFormData((prev) => ({
                    ...prev,
                    isPublished: e.target.checked,
                  }))
                }
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowCreateVariantModal(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleVariantSubmit}
            disabled={loading || !variantFormData.platform}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Creating...
              </>
            ) : (
              "Create Variant"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default React.memo(MainVariantManager);
