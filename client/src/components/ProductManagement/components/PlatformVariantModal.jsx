import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "../../ui/Modal";
import Button from "../../ui/Button";
import { Input } from "../../ui/Input";
import { useAlert } from "../../../contexts/AlertContext";
import { Copy, Package, AlertCircle, CheckCircle } from "lucide-react";

/**
 * Loading Component
 */
const Loading = ({ className = "w-4 h-4 animate-spin" }) => (
  <div
    className={`border-2 border-t-transparent border-gray-400 rounded-full ${className}`}
  />
);

/**
 * Platform Variant Creation Modal
 * Allows users to select a product and create variants or copies on other platforms
 */
const PlatformVariantModal = ({
  isOpen,
  onClose,
  selectedProduct,
  platformConnections = [],
}) => {
  const { showAlert } = useAlert();
  const [step, setStep] = useState(1); // 1: Platform selection, 2: Category selection, 3: Field configuration
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [fieldDefinitions, setFieldDefinitions] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Available platforms
  const platforms = [
    { id: "trendyol", name: "Trendyol", color: "orange" },
    { id: "hepsiburada", name: "Hepsiburada", color: "orange" },
    { id: "n11", name: "N11", color: "purple" },
  ];

  const syncCategories = useCallback(
    async (platform) => {
      try {
        const connectionId = platformConnections.find(
          (conn) => conn.platform === platform
        )?.id;
        if (!connectionId) {
          throw new Error(`No connection found for ${platform}`);
        }

        const response = await fetch(
          `/api/platform-products/${platform}/categories/sync`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ connectionId, forceRefresh: true }),
          }
        );

        const data = await response.json();
        if (data.success) {
          showAlert(
            `Successfully synced ${data.data.categoriesCount} categories`,
            "success"
          );
        } else {
          throw new Error(data.message || "Sync failed");
        }
      } catch (error) {
        console.error("Error syncing categories:", error);
        showAlert(`Failed to sync categories: ${error.message}`, "error");
      }
    },
    [platformConnections, showAlert]
  );

  const fetchCategories = useCallback(
    async (platform) => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/platform-products/${platform}/categories`
        );
        const data = await response.json();

        if (data.success) {
          setCategories(data.data || []);

          // If no categories, offer to sync
          if (data.data.length === 0) {
            setSyncing(true);
            showAlert(
              "No categories found. Attempting to sync categories...",
              "info"
            );
            await syncCategories(platform);
            // Refetch after sync
            const retryResponse = await fetch(
              `/api/platform-products/${platform}/categories`
            );
            const retryData = await retryResponse.json();
            if (retryData.success) {
              setCategories(retryData.data || []);
            }
          }
        } else {
          throw new Error(data.message || "Failed to fetch categories");
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        showAlert(`Failed to fetch categories: ${error.message}`, "error");
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [showAlert, syncCategories]
  );

  const fetchCategoryFields = useCallback(
    async (platform, categoryId) => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/platform-products/${platform}/fields?categoryId=${categoryId}`
        );
        const data = await response.json();

        if (data.success) {
          // Store field definitions
          setFieldDefinitions(data.data);

          // Initialize field values with product data
          const initialValues = {};
          if (selectedProduct) {
            // Map existing product fields to platform-specific fields
            initialValues.productName = selectedProduct.name;
            initialValues.description = selectedProduct.description;
            initialValues.barcode = selectedProduct.barcode;
            initialValues.stockCode = selectedProduct.sku;
            initialValues.listPrice = selectedProduct.price;
            initialValues.salePrice = selectedProduct.price;
            initialValues.quantity = selectedProduct.stockQuantity;
          }
          setFieldValues(initialValues);
        } else {
          throw new Error(data.message || "Failed to fetch category fields");
        }
      } catch (error) {
        console.error("Error fetching category fields:", error);
        showAlert(`Failed to fetch category fields: ${error.message}`, "error");
      } finally {
        setLoading(false);
      }
    },
    [selectedProduct, showAlert]
  );

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedPlatform("");
      setCategories([]);
      setSelectedCategory("");
      setFieldDefinitions(null);
      setFieldValues({});
    }
  }, [isOpen]);

  // Fetch categories when platform is selected
  useEffect(() => {
    if (selectedPlatform) {
      fetchCategories(selectedPlatform);
    }
  }, [selectedPlatform, fetchCategories]);

  // Fetch category fields when category is selected
  useEffect(() => {
    if (selectedPlatform && selectedCategory) {
      fetchCategoryFields(selectedPlatform, selectedCategory);
    }
  }, [selectedPlatform, selectedCategory, fetchCategoryFields]);

  const handleFieldChange = (fieldName, value) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleNext = () => {
    if (step === 1 && selectedPlatform) {
      setStep(2);
    } else if (step === 2 && selectedCategory) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCreateVariant = async () => {
    setLoading(true);
    try {
      const connectionId = platformConnections.find(
        (conn) => conn.platform === selectedPlatform
      )?.id;
      if (!connectionId) {
        throw new Error(`No connection found for ${selectedPlatform}`);
      }

      // Find the selected category details
      const category = categories.find(
        (cat) => cat.platformCategoryId === selectedCategory
      );

      // Prepare product data for the platform
      const productData = {
        ...fieldValues,
        categoryId: selectedCategory,
        categoryName: category?.name,
        // Include original product reference
        originalProductId: selectedProduct?.id,
        originalProductSku: selectedProduct?.sku,
      };

      const response = await fetch(
        `/api/platform-products/${selectedPlatform}/products`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productData,
            connectionId,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        showAlert(
          `Successfully created product variant on ${selectedPlatform}!`,
          "success"
        );
        onClose();
      } else {
        throw new Error(data.message || "Failed to create product variant");
      }
    } catch (error) {
      console.error("Error creating variant:", error);
      showAlert(`Failed to create variant: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Package className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">Select Target Platform</h3>
              <p className="text-gray-600">
                Choose where you want to create a variant of this product
              </p>
            </div>

            {selectedProduct && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-2">Source Product:</h4>
                <p className="text-sm">
                  <strong>Name:</strong> {selectedProduct.name}
                </p>
                <p className="text-sm">
                  <strong>SKU:</strong> {selectedProduct.sku}
                </p>
                <p className="text-sm">
                  <strong>Price:</strong> ${selectedProduct.price}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    selectedPlatform === platform.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{platform.name}</h4>
                      <p className="text-sm text-gray-600">
                        Create variant on {platform.name}
                      </p>
                    </div>
                    {selectedPlatform === platform.id && (
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Copy className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">Select Category</h3>
              <p className="text-gray-600">
                Choose the category for your product on {selectedPlatform}
              </p>
            </div>

            {syncing && (
              <div className="bg-blue-50 p-4 rounded-lg flex items-center">
                <Loading className="w-5 h-5 text-blue-500 mr-2" />
                <span className="text-blue-700">
                  Syncing categories from {selectedPlatform}...
                </span>
              </div>
            )}

            {categories.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {categories.map((category) => (
                  <button
                    key={category.platformCategoryId}
                    onClick={() =>
                      setSelectedCategory(category.platformCategoryId)
                    }
                    className={`w-full p-3 border rounded-lg text-left transition-all ${
                      selectedCategory === category.platformCategoryId
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{category.name}</h4>
                        {category.path && (
                          <p className="text-sm text-gray-600">
                            {category.path}
                          </p>
                        )}
                        {category.requiredFields &&
                          category.requiredFields.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Required: {category.requiredFields.join(", ")}
                            </p>
                          )}
                      </div>
                      {selectedCategory === category.platformCategoryId && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : loading ? (
              <div className="text-center py-8">
                <Loading className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Loading categories...</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No categories available</p>
                <Button
                  onClick={() => syncCategories(selectedPlatform)}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Sync Categories
                </Button>
              </div>
            )}
          </div>
        );

      case 3:
        const category = categories.find(
          (cat) => cat.platformCategoryId === selectedCategory
        );
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <CheckCircle className="w-12 h-12 text-purple-500 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">
                Configure Product Fields
              </h3>
              <p className="text-gray-600">
                Fill in the required fields for {category?.name} on{" "}
                {selectedPlatform}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-2">Category: {category?.name}</h4>
              {fieldDefinitions && (
                <div className="text-sm text-gray-600">
                  <p>
                    Required platform fields:{" "}
                    {fieldDefinitions.requiredFields?.length || 0}
                  </p>
                  <p>
                    Category attributes:{" "}
                    {fieldDefinitions.categoryAttributes?.length || 0}
                  </p>
                  <p>
                    Optional fields:{" "}
                    {fieldDefinitions.optionalFields?.length || 0}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Basic product fields */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Product Name"
                  value={fieldValues.productName || ""}
                  onChange={(e) =>
                    handleFieldChange("productName", e.target.value)
                  }
                  required
                />
                <Input
                  label="SKU/Stock Code"
                  value={fieldValues.stockCode || ""}
                  onChange={(e) =>
                    handleFieldChange("stockCode", e.target.value)
                  }
                  required
                />
              </div>

              <Input
                label="Description"
                value={fieldValues.description || ""}
                onChange={(e) =>
                  handleFieldChange("description", e.target.value)
                }
                multiline
                rows={3}
              />

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="List Price"
                  type="number"
                  value={fieldValues.listPrice || ""}
                  onChange={(e) =>
                    handleFieldChange(
                      "listPrice",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  required
                />
                <Input
                  label="Sale Price"
                  type="number"
                  value={fieldValues.salePrice || ""}
                  onChange={(e) =>
                    handleFieldChange(
                      "salePrice",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  required
                />
                <Input
                  label="Quantity"
                  type="number"
                  value={fieldValues.quantity || ""}
                  onChange={(e) =>
                    handleFieldChange("quantity", parseInt(e.target.value) || 0)
                  }
                  required
                />
              </div>

              <Input
                label="Barcode"
                value={fieldValues.barcode || ""}
                onChange={(e) => handleFieldChange("barcode", e.target.value)}
              />

              {/* Platform-specific required fields */}
              {fieldDefinitions?.requiredFields &&
                fieldDefinitions.requiredFields.map((field) => {
                  if (
                    [
                      "productName",
                      "stockCode",
                      "description",
                      "listPrice",
                      "salePrice",
                      "quantity",
                      "barcode",
                    ].includes(field.name)
                  ) {
                    return null; // Already handled above
                  }

                  return (
                    <Input
                      key={field.name}
                      label={
                        field.label ||
                        field.name.charAt(0).toUpperCase() + field.name.slice(1)
                      }
                      value={fieldValues[field.name] || ""}
                      onChange={(e) =>
                        handleFieldChange(field.name, e.target.value)
                      }
                      required={field.required}
                      placeholder={
                        field.description ||
                        `Enter ${field.label || field.name}`
                      }
                      type={field.type === "number" ? "number" : "text"}
                    />
                  );
                })}

              {/* Category-specific attributes */}
              {fieldDefinitions?.categoryAttributes &&
                fieldDefinitions.categoryAttributes.map((attr) => (
                  <Input
                    key={attr.name}
                    label={attr.label || attr.name}
                    value={fieldValues[attr.name] || ""}
                    onChange={(e) =>
                      handleFieldChange(attr.name, e.target.value)
                    }
                    required={attr.required}
                    placeholder={
                      attr.description || `Enter ${attr.label || attr.name}`
                    }
                    type={attr.type === "number" ? "number" : "text"}
                  />
                ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedPlatform;
      case 2:
        return selectedCategory;
      case 3:
        if (!fieldDefinitions) return false;

        // Check basic required fields
        const basicFields = [
          "productName",
          "listPrice",
          "salePrice",
          "quantity",
        ];
        const basicFieldsValid = basicFields.every((field) => {
          const value = fieldValues[field];
          return value !== undefined && value !== null && value !== "";
        });

        // Check platform-specific required fields
        const platformFieldsValid =
          fieldDefinitions.requiredFields?.every((field) => {
            if (
              ["productName", "listPrice", "salePrice", "quantity"].includes(
                field.name
              )
            ) {
              return true; // Already checked above
            }
            const value = fieldValues[field.name];
            return (
              !field.required ||
              (value !== undefined && value !== null && value !== "")
            );
          }) ?? true;

        // Check required category attributes
        const categoryAttributesValid =
          fieldDefinitions.categoryAttributes?.every((attr) => {
            const value = fieldValues[attr.name];
            return (
              !attr.required ||
              (value !== undefined && value !== null && value !== "")
            );
          }) ?? true;

        return (
          basicFieldsValid && platformFieldsValid && categoryAttributesValid
        );
      default:
        return false;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Platform Variant"
      size="lg"
    >
      <div className="p-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((stepNum) => (
              <div
                key={stepNum}
                className={`flex items-center ${stepNum < 3 ? "mr-4" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    stepNum === step
                      ? "bg-blue-500 text-white"
                      : stepNum < step
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {stepNum < step ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    stepNum
                  )}
                </div>
                {stepNum < 3 && (
                  <div
                    className={`w-12 h-1 ml-4 ${
                      stepNum < step ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        {renderStepContent()}

        {/* Navigation buttons */}
        <div
          className={`flex justify-between mt-6 pt-4 border-t ${
            step === 1 ? "justify-end" : ""
          }`}
        >
          {step > 1 && (
            <Button onClick={handleBack} variant="outline" disabled={loading}>
              Back
            </Button>
          )}

          <div className="flex space-x-2">
            <Button onClick={onClose} variant="outline" disabled={loading}>
              Cancel
            </Button>

            {step < 3 ? (
              <Button onClick={handleNext} disabled={!canProceed() || loading}>
                {loading ? "Loading..." : "Next"}
              </Button>
            ) : (
              <Button
                onClick={handleCreateVariant}
                disabled={!canProceed() || loading}
                className="bg-green-500 text-white hover:bg-green-600"
              >
                {loading ? "Creating..." : "Create Variant"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PlatformVariantModal;
