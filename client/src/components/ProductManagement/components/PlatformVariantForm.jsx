import React, { useState, useEffect } from "react";
import { X, Plus, Save, AlertCircle } from "lucide-react";
import { Button } from "../../ui";

/**
 * Platform Variant Form Modal
 * Form for creating and editing platform variants
 */
const PlatformVariantForm = ({
  isOpen,
  onClose,
  onSave,
  mainProduct,
  editingVariant = null,
  availableTemplates = [],
}) => {
  const [formData, setFormData] = useState({
    platform: "",
    platformSku: "",
    platformBarcode: "",
    variantSuffix: "",
    useMainPrice: true,
    platformPrice: "",
    platformCostPrice: "",
    priceMarkup: "",
    platformTitle: "",
    platformDescription: "",
    platformCategory: "",
    platformAttributes: {},
    useMainMedia: true,
    platformMedia: [],
    templateId: "",
    templateFields: {},
    status: "draft",
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const platforms = [
    {
      id: "trendyol",
      name: "Trendyol",
      color: "orange",
      icon: "🛒",
      categories: ["Elektronik", "Bilgisayar", "Telefon", "Oyun"],
    },
    {
      id: "hepsiburada",
      name: "Hepsiburada",
      color: "blue",
      icon: "🏪",
      categories: ["Elektronik", "Bilgisayar & Ofis", "Telefon", "Oyun & Hobi"],
    },
    {
      id: "n11",
      name: "N11",
      color: "purple",
      icon: "🛍️",
      categories: ["Elektronik", "Bilgisayar", "Cep Telefonu", "Oyun"],
    },
    {
      id: "amazon",
      name: "Amazon",
      color: "yellow",
      icon: "📦",
      categories: ["Electronics", "Computers", "Cell Phones", "Video Games"],
    },
    {
      id: "gittigidiyor",
      name: "GittiGidiyor",
      color: "red",
      icon: "🛒",
      categories: ["Elektronik", "Bilgisayar", "Telefon", "Oyun"],
    },
  ];

  // Initialize form data
  useEffect(() => {
    if (editingVariant) {
      setFormData({
        platform: editingVariant.platform || "",
        platformSku: editingVariant.platformSku || "",
        platformBarcode: editingVariant.platformBarcode || "",
        variantSuffix: editingVariant.variantSuffix || "",
        useMainPrice: editingVariant.useMainPrice !== false,
        platformPrice: editingVariant.platformPrice || "",
        platformCostPrice: editingVariant.platformCostPrice || "",
        priceMarkup: editingVariant.priceMarkup || "",
        platformTitle: editingVariant.platformTitle || "",
        platformDescription: editingVariant.platformDescription || "",
        platformCategory: editingVariant.platformCategory || "",
        platformAttributes: editingVariant.platformAttributes || {},
        useMainMedia: editingVariant.useMainMedia !== false,
        platformMedia: editingVariant.platformMedia || [],
        templateId: editingVariant.templateId || "",
        templateFields: editingVariant.templateFields || {},
        status: editingVariant.status || "draft",
      });
    } else {
      // Reset for new variant
      setFormData({
        platform: "",
        platformSku: "",
        platformBarcode: "",
        variantSuffix: "",
        useMainPrice: true,
        platformPrice: "",
        platformCostPrice: "",
        priceMarkup: "",
        platformTitle: mainProduct?.name || "",
        platformDescription: mainProduct?.description || "",
        platformCategory: mainProduct?.category || "",
        platformAttributes: {},
        useMainMedia: true,
        platformMedia: [],
        templateId: "",
        templateFields: {},
        status: "draft",
      });
    }
    setErrors({});
  }, [editingVariant, mainProduct, isOpen]);

  // Auto-generate platform SKU when platform or suffix changes
  useEffect(() => {
    if (formData.platform && mainProduct?.baseSku) {
      const suffix = formData.variantSuffix || formData.platform.toUpperCase();
      const generatedSku = `${mainProduct.baseSku}-${suffix}`;

      if (!editingVariant || formData.platformSku === "") {
        setFormData((prev) => ({
          ...prev,
          platformSku: generatedSku,
        }));
      }
    }
  }, [
    formData.platform,
    formData.variantSuffix,
    formData.platformSku,
    mainProduct?.baseSku,
    editingVariant,
  ]);

  // Handle template selection
  useEffect(() => {
    if (formData.templateId) {
      const template = availableTemplates.find(
        (t) => t.id === formData.templateId
      );
      setSelectedTemplate(template);

      if (template) {
        // Apply template defaults
        setFormData((prev) => ({
          ...prev,
          templateFields: { ...template.defaultValues },
          platformAttributes: {
            ...prev.platformAttributes,
            ...template.defaultValues,
          },
        }));
      }
    } else {
      setSelectedTemplate(null);
    }
  }, [formData.templateId, availableTemplates]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleAttributeChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      platformAttributes: {
        ...prev.platformAttributes,
        [key]: value,
      },
    }));
  };

  const addCustomAttribute = () => {
    const key = prompt("Enter attribute name:");
    if (key && !formData.platformAttributes[key]) {
      handleAttributeChange(key, "");
    }
  };

  const removeAttribute = (key) => {
    setFormData((prev) => {
      const newAttributes = { ...prev.platformAttributes };
      delete newAttributes[key];
      return { ...prev, platformAttributes: newAttributes };
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.platform) {
      newErrors.platform = "Platform is required";
    }

    if (!formData.platformSku) {
      newErrors.platformSku = "Platform SKU is required";
    }

    if (!formData.useMainPrice && !formData.platformPrice) {
      newErrors.platformPrice =
        "Platform price is required when not using main price";
    }

    if (formData.platformPrice && parseFloat(formData.platformPrice) < 0) {
      newErrors.platformPrice = "Price must be non-negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const submitData = {
        ...formData,
        platformPrice: formData.useMainPrice
          ? null
          : parseFloat(formData.platformPrice) || null,
        platformCostPrice: parseFloat(formData.platformCostPrice) || null,
        priceMarkup: parseFloat(formData.priceMarkup) || null,
      };

      await onSave(submitData);
      onClose();
    } catch (error) {
      console.error("Error saving variant:", error);
      setErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedPlatform = platforms.find((p) => p.id === formData.platform);
  const platformTemplates = availableTemplates.filter(
    (t) => t.platform === formData.platform
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {editingVariant
              ? "Edit Platform Variant"
              : "Create Platform Variant"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto max-h-[calc(90vh-140px)]"
        >
          <div className="p-6 space-y-6">
            {/* Platform Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform *
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) =>
                    handleInputChange("platform", e.target.value)
                  }
                  className={`w-full border rounded-md px-3 py-2 ${
                    errors.platform ? "border-red-300" : "border-gray-300"
                  }`}
                  disabled={!!editingVariant}
                >
                  <option value="">Select Platform</option>
                  {platforms.map((platform) => (
                    <option key={platform.id} value={platform.id}>
                      {platform.icon} {platform.name}
                    </option>
                  ))}
                </select>
                {errors.platform && (
                  <p className="mt-1 text-sm text-red-600">{errors.platform}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template
                </label>
                <select
                  value={formData.templateId}
                  onChange={(e) =>
                    handleInputChange("templateId", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">No Template</option>
                  {platformTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.category || "General"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SKU Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform SKU *
                </label>
                <input
                  type="text"
                  value={formData.platformSku}
                  onChange={(e) =>
                    handleInputChange("platformSku", e.target.value)
                  }
                  className={`w-full border rounded-md px-3 py-2 ${
                    errors.platformSku ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="Auto-generated"
                />
                {errors.platformSku && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.platformSku}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variant Suffix
                </label>
                <input
                  type="text"
                  value={formData.variantSuffix}
                  onChange={(e) =>
                    handleInputChange("variantSuffix", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., TR, UK, ORJ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform Barcode
                </label>
                <input
                  type="text"
                  value={formData.platformBarcode}
                  onChange={(e) =>
                    handleInputChange("platformBarcode", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Pricing Configuration */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useMainPrice"
                  checked={formData.useMainPrice}
                  onChange={(e) =>
                    handleInputChange("useMainPrice", e.target.checked)
                  }
                  className="rounded border-gray-300"
                />
                <label
                  htmlFor="useMainPrice"
                  className="text-sm font-medium text-gray-700"
                >
                  Use main product price (₺
                  {mainProduct?.basePrice?.toLocaleString() || "0"})
                </label>
              </div>

              {!formData.useMainPrice && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Platform Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.platformPrice}
                      onChange={(e) =>
                        handleInputChange("platformPrice", e.target.value)
                      }
                      className={`w-full border rounded-md px-3 py-2 ${
                        errors.platformPrice
                          ? "border-red-300"
                          : "border-gray-300"
                      }`}
                      placeholder="0.00"
                    />
                    {errors.platformPrice && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.platformPrice}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cost Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.platformCostPrice}
                      onChange={(e) =>
                        handleInputChange("platformCostPrice", e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Markup %
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.priceMarkup}
                      onChange={(e) =>
                        handleInputChange("priceMarkup", e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Product Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform Title
                </label>
                <input
                  type="text"
                  value={formData.platformTitle}
                  onChange={(e) =>
                    handleInputChange("platformTitle", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Product title for platform"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform Category
                </label>
                <select
                  value={formData.platformCategory}
                  onChange={(e) =>
                    handleInputChange("platformCategory", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select Category</option>
                  {selectedPlatform?.categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform Description
              </label>
              <textarea
                rows={3}
                value={formData.platformDescription}
                onChange={(e) =>
                  handleInputChange("platformDescription", e.target.value)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Product description for platform"
              />
            </div>

            {/* Platform Attributes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Platform Attributes</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomAttribute}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Attribute
                </Button>
              </div>

              {Object.keys(formData.platformAttributes).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(formData.platformAttributes).map(
                    ([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={key}
                          readOnly
                          className="w-1/3 border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                        />
                        <input
                          type="text"
                          value={value}
                          onChange={(e) =>
                            handleAttributeChange(key, e.target.value)
                          }
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Value"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttribute(key)}
                          className="text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No platform-specific attributes added
                </p>
              )}
            </div>

            {/* Template Fields */}
            {selectedTemplate &&
              selectedTemplate.requiredFields?.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Template Fields</h3>
                  <div className="space-y-3">
                    {selectedTemplate.requiredFields.map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.name} *
                        </label>
                        <input
                          type={field.type === "number" ? "number" : "text"}
                          value={formData.templateFields[field.name] || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              templateFields: {
                                ...prev.templateFields,
                                [field.name]: e.target.value,
                              },
                            }))
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder={field.description || field.name}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Error Display */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{errors.submit}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                "Saving..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingVariant ? "Update Variant" : "Create Variant"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlatformVariantForm;
