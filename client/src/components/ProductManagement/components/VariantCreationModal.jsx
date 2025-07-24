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
  Accordion,
} from "react-bootstrap";
import {
  PlusIcon,
  DocumentDuplicateIcon,
  TagIcon,
  CubeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useAlert } from "../../../contexts/AlertContext";

/**
 * Enhanced Variant Creation Modal
 * Allows creating multiple variants from a main product with customizable attributes
 */
const VariantCreationModal = ({
  show,
  onHide,
  mainProduct,
  onSuccess,
  apiClient,
}) => {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [creationMode, setCreationMode] = useState("single"); // single, multiple, bulk
  const [variants, setVariants] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  // Predefined variant attributes
  const variantAttributes = {
    size: ["XS", "S", "M", "L", "XL", "XXL"],
    color: ["Red", "Blue", "Green", "Yellow", "Black", "White", "Gray"],
    material: ["Cotton", "Polyester", "Wool", "Silk", "Leather", "Denim"],
    style: ["Classic", "Modern", "Vintage", "Casual", "Formal", "Sport"],
  };

  const platforms_list = [
    { id: "trendyol", name: "Trendyol", color: "orange" },
    { id: "hepsiburada", name: "Hepsiburada", color: "blue" },
    { id: "n11", name: "N11", color: "purple" },
    { id: "amazon", name: "Amazon", color: "yellow" },
  ];

  // Reset variants to initial state
  const resetVariants = () => {
    setVariants([
      {
        id: Date.now().toString(),
        platformCode: "",
        platform: "",
        name: mainProduct?.name || "",
        description: mainProduct?.description || "",
        price: mainProduct?.basePrice || 0,
        costPrice: mainProduct?.baseCostPrice || 0,
        stockQuantity: 0,
        minStockLevel: 5,
        weight: mainProduct?.weight || 0,
        dimensions: { ...mainProduct?.dimensions } || {},
        attributes: {},
        platformSpecific: {},
        status: "active",
      },
    ]);
  };

  useEffect(() => {
    if (show && mainProduct) {
      resetVariants();
      setPlatforms(platforms_list);
      setSelectedPlatforms([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, mainProduct]);

  // Add new variant
  const addVariant = () => {
    const newVariant = {
      id: Date.now().toString(),
      platformCode: "",
      platform: "",
      name: mainProduct?.name || "",
      description: mainProduct?.description || "",
      price: mainProduct?.basePrice || 0,
      costPrice: mainProduct?.baseCostPrice || 0,
      stockQuantity: 0,
      minStockLevel: 5,
      weight: mainProduct?.weight || 0,
      dimensions: { ...mainProduct?.dimensions } || {},
      attributes: {},
      platformSpecific: {},
      status: "active",
    };
    setVariants([...variants, newVariant]);
  };

  // Remove variant
  const removeVariant = (variantId) => {
    if (variants.length > 1) {
      setVariants(variants.filter((v) => v.id !== variantId));
    }
  };

  // Update variant
  const updateVariant = (variantId, field, value) => {
    setVariants(
      variants.map((variant) =>
        variant.id === variantId ? { ...variant, [field]: value } : variant
      )
    );
  };

  // Update variant attribute
  const updateVariantAttribute = (variantId, attributeName, value) => {
    setVariants(
      variants.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              attributes: { ...variant.attributes, [attributeName]: value },
            }
          : variant
      )
    );
  };

  // Update variant dimensions
  // const updateVariantDimension = (variantId, dimension, value) => {
  //   setVariants(variants.map(variant =>
  //     variant.id === variantId
  //       ? {
  //           ...variant,
  //           dimensions: { ...variant.dimensions, [dimension]: value }
  //         }
  //       : variant
  //   ));
  // };

  // Generate variants from attributes
  const generateVariantsFromAttributes = () => {
    const attributeKeys = Object.keys(variantAttributes);
    if (attributeKeys.length === 0) return;

    const newVariants = [];

    // Simple example: generate size variants
    variantAttributes.size.forEach((size, index) => {
      const variant = {
        id: `${Date.now()}_${index}`,
        platformCode: `${mainProduct?.baseSku || "PROD"}-${size}`,
        platform: "",
        name: `${mainProduct?.name || "Product"} - ${size}`,
        description: mainProduct?.description || "",
        price: mainProduct?.basePrice || 0,
        costPrice: mainProduct?.baseCostPrice || 0,
        stockQuantity: 0,
        minStockLevel: 5,
        weight: mainProduct?.weight || 0,
        dimensions: { ...mainProduct?.dimensions } || {},
        attributes: { size },
        platformSpecific: {},
        status: "active",
      };
      newVariants.push(variant);
    });

    setVariants(newVariants);
  };

  // Generate cross-platform variants
  const generateCrossPlatformVariants = () => {
    if (selectedPlatforms.length === 0) {
      showAlert("Please select platforms first", "warning");
      return;
    }

    const crossPlatformVariants = [];

    selectedPlatforms.forEach((platformId) => {
      const platform = platforms.find((p) => p.id === platformId);
      if (!platform) return;

      const variant = {
        id: `${Date.now()}_${platformId}`,
        platformCode: `${
          mainProduct?.baseSku || "PROD"
        }-${platform.name.toUpperCase()}`,
        platform: platformId,
        name: mainProduct?.name || "",
        description: mainProduct?.description || "",
        price: mainProduct?.basePrice || 0,
        costPrice: mainProduct?.baseCostPrice || 0,
        stockQuantity: 0,
        minStockLevel: 5,
        weight: mainProduct?.weight || 0,
        dimensions: { ...mainProduct?.dimensions } || {},
        attributes: {},
        platformSpecific: {
          platformName: platform.name,
          platformSpecificFields: {},
        },
        status: "active",
      };
      crossPlatformVariants.push(variant);
    });

    setVariants(crossPlatformVariants);
  };

  // Handle variant creation
  const handleCreateVariants = async () => {
    if (!mainProduct) {
      showAlert("No main product selected", "error");
      return;
    }

    // Validate variants
    const validVariants = variants.filter((variant) => {
      return (
        variant.name.trim() &&
        variant.price > 0 &&
        variant.platform &&
        ["trendyol", "hepsiburada", "n11"].includes(variant.platform)
      );
    });

    if (validVariants.length === 0) {
      showAlert(
        "Please add at least one valid variant with a name, price > 0, and valid platform",
        "error"
      );
      return;
    }

    try {
      setLoading(true);
      const results = [];

      for (const variant of validVariants) {
        try {
          // Validate that a valid platform is selected
          if (
            !variant.platform ||
            !["trendyol", "hepsiburada", "n11"].includes(variant.platform)
          ) {
            results.push({
              success: false,
              variant,
              error:
                "Please select a valid platform (Trendyol, Hepsiburada, or N11)",
            });
            continue;
          }

          const variantData = {
            platform: variant.platform,
            platformSku:
              variant.platformCode || `${mainProduct.baseSku}-${variant.id}`,
            platformFields: {
              platformTitle: variant.name,
              platformDescription: variant.description,
              platformPrice: parseFloat(variant.price),
              costPrice: variant.costPrice
                ? parseFloat(variant.costPrice)
                : null,
              stockQuantity: parseInt(variant.stockQuantity) || 0,
              minStockLevel: parseInt(variant.minStockLevel) || 5,
              weight: variant.weight ? parseFloat(variant.weight) : null,
              dimensions: Object.values(variant.dimensions).some((v) => v)
                ? variant.dimensions
                : null,
              attributes:
                Object.keys(variant.attributes).length > 0
                  ? variant.attributes
                  : null,
              platformSpecific:
                Object.keys(variant.platformSpecific).length > 0
                  ? variant.platformSpecific
                  : null,
              status: variant.status,
            },
            autoPublish: false,
          };

          const response = await apiClient.createPlatformVariant(
            mainProduct.id,
            variantData
          );

          if (response.success) {
            results.push({ success: true, variant: response.data });
          } else {
            results.push({ success: false, variant, error: response.message });
          }
        } catch (error) {
          results.push({ success: false, variant, error: error.message });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;

      if (successCount > 0) {
        showAlert(
          `Successfully created ${successCount} variants${
            failureCount > 0 ? `, ${failureCount} failed` : ""
          }`,
          "success"
        );
        onSuccess(results.filter((r) => r.success).map((r) => r.variant));
        onHide();
      } else {
        showAlert("Failed to create any variants", "error");
      }
    } catch (error) {
      logger.error("Error creating variants:", error);
      showAlert("Error creating variants", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!mainProduct) {
    return null;
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Create Variants for: {mainProduct.name}</Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
        {/* Creation Mode Selection */}
        <Card className="mb-4">
          <Card.Body>
            <h6 className="mb-3">Creation Mode</h6>
            <div className="d-flex gap-2 flex-wrap">
              <Button
                variant={
                  creationMode === "single" ? "primary" : "outline-primary"
                }
                size="sm"
                onClick={() => setCreationMode("single")}
              >
                <PlusIcon className="h-4 w-4 me-1" />
                Single Variant
              </Button>
              <Button
                variant={
                  creationMode === "multiple" ? "primary" : "outline-primary"
                }
                size="sm"
                onClick={() => setCreationMode("multiple")}
              >
                <DocumentDuplicateIcon className="h-4 w-4 me-1" />
                Multiple Variants
              </Button>
              <Button
                variant={
                  creationMode === "bulk" ? "primary" : "outline-primary"
                }
                size="sm"
                onClick={() => setCreationMode("bulk")}
              >
                <CubeIcon className="h-4 w-4 me-1" />
                Bulk Generate
              </Button>
            </div>
          </Card.Body>
        </Card>

        {/* Bulk Generation Tools */}
        {creationMode === "bulk" && (
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0">Bulk Generation Tools</h6>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={6}>
                  <h6>Generate by Attributes</h6>
                  <Button
                    variant="outline-info"
                    size="sm"
                    onClick={generateVariantsFromAttributes}
                  >
                    <TagIcon className="h-4 w-4 me-1" />
                    Generate Size Variants
                  </Button>
                </Col>
                <Col md={6}>
                  <h6>Generate by Platforms</h6>
                  <div className="mb-2">
                    {platforms.map((platform) => (
                      <Form.Check
                        key={platform.id}
                        inline
                        type="checkbox"
                        id={`platform-${platform.id}`}
                        label={platform.name}
                        checked={selectedPlatforms.includes(platform.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPlatforms([
                              ...selectedPlatforms,
                              platform.id,
                            ]);
                          } else {
                            setSelectedPlatforms(
                              selectedPlatforms.filter((p) => p !== platform.id)
                            );
                          }
                        }}
                      />
                    ))}
                  </div>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={generateCrossPlatformVariants}
                    disabled={selectedPlatforms.length === 0}
                  >
                    <CubeIcon className="h-4 w-4 me-1" />
                    Generate Platform Variants
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Variants List */}
        <Card>
          <Card.Header>
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Variants ({variants.length})</h6>
              {(creationMode === "multiple" || creationMode === "single") && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={addVariant}
                >
                  <PlusIcon className="h-4 w-4 me-1" />
                  Add Variant
                </Button>
              )}
            </div>
          </Card.Header>
          <Card.Body>
            <Accordion>
              {variants.map((variant, index) => (
                <Accordion.Item key={variant.id} eventKey={variant.id}>
                  <Accordion.Header>
                    <div className="d-flex justify-content-between align-items-center w-100">
                      <div>
                        <strong>Variant {index + 1}</strong>
                        {variant.name && (
                          <span className="text-muted ms-2">
                            - {variant.name}
                          </span>
                        )}
                        {variant.platform && (
                          <Badge bg="secondary" className="ms-2">
                            {platforms.find((p) => p.id === variant.platform)
                              ?.name || variant.platform}
                          </Badge>
                        )}
                      </div>
                      {variants.length > 1 && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeVariant(variant.id);
                          }}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Accordion.Header>
                  <Accordion.Body>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Variant Name</Form.Label>
                          <Form.Control
                            type="text"
                            value={variant.name}
                            onChange={(e) =>
                              updateVariant(variant.id, "name", e.target.value)
                            }
                            placeholder="Enter variant name"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Platform Code</Form.Label>
                          <Form.Control
                            type="text"
                            value={variant.platformCode}
                            onChange={(e) =>
                              updateVariant(
                                variant.id,
                                "platformCode",
                                e.target.value
                              )
                            }
                            placeholder="Auto-generated if empty"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Platform</Form.Label>
                          <Form.Select
                            value={variant.platform}
                            onChange={(e) =>
                              updateVariant(
                                variant.id,
                                "platform",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Select Platform</option>
                            {platforms.map((platform) => (
                              <option key={platform.id} value={platform.id}>
                                {platform.name}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Price</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            min="0"
                            value={variant.price}
                            onChange={(e) =>
                              updateVariant(variant.id, "price", e.target.value)
                            }
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
                            value={variant.stockQuantity}
                            onChange={(e) =>
                              updateVariant(
                                variant.id,
                                "stockQuantity",
                                e.target.value
                              )
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Cost Price</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            min="0"
                            value={variant.costPrice}
                            onChange={(e) =>
                              updateVariant(
                                variant.id,
                                "costPrice",
                                e.target.value
                              )
                            }
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    {/* Attributes */}
                    <Card className="mb-3">
                      <Card.Header>
                        <h6 className="mb-0">Variant Attributes</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          {Object.entries(variantAttributes).map(
                            ([attrName, options]) => (
                              <Col md={6} key={attrName} className="mb-2">
                                <Form.Group>
                                  <Form.Label className="text-capitalize">
                                    {attrName}
                                  </Form.Label>
                                  <Form.Select
                                    value={variant.attributes[attrName] || ""}
                                    onChange={(e) =>
                                      updateVariantAttribute(
                                        variant.id,
                                        attrName,
                                        e.target.value
                                      )
                                    }
                                  >
                                    <option value="">Select {attrName}</option>
                                    {options.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </Form.Select>
                                </Form.Group>
                              </Col>
                            )
                          )}
                        </Row>
                      </Card.Body>
                    </Card>

                    <Form.Group className="mb-3">
                      <Form.Label>Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={variant.description}
                        onChange={(e) =>
                          updateVariant(
                            variant.id,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Enter variant description"
                      />
                    </Form.Group>
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          </Card.Body>
        </Card>

        {variants.length === 0 && (
          <Alert variant="info" className="mt-3">
            No variants added yet. Click "Add Variant" to create your first
            variant.
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleCreateVariants}
          disabled={loading || variants.length === 0}
        >
          {loading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Creating Variants...
            </>
          ) : (
            `Create ${variants.length} Variant${
              variants.length !== 1 ? "s" : ""
            }`
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default VariantCreationModal;
