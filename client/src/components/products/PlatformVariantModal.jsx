import React, { useState, useEffect, useCallback } from "react";
import { Modal, Button } from "../ui";
import { useAlert } from "../../contexts/AlertContext";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  RefreshCw,
  Globe,
} from "lucide-react";
import PlatformVariantsAPI from "../../services/platformVariantsAPI";

/**
 * Loading Component
 */
const Loading = ({ className = "w-4 h-4 animate-spin" }) => (
  <div
    className={`border-2 border-t-transparent border-gray-400 rounded-full ${className}`}
  />
);

/**
 * Platform Selection Step
 */
const PlatformSelectionStep = ({ selectedPlatform, onSelect, platforms }) => {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Globe className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Platform Seçin
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Varyant oluşturmak istediğiniz platformu seçin
        </p>
      </div>

      <div className="grid gap-3">
        {platforms.map((platform) => (
          <button
            key={platform.id}
            onClick={() => onSelect(platform.id)}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              selectedPlatform === platform.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    platform.id === "trendyol"
                      ? "bg-orange-100 text-orange-600"
                      : platform.id === "hepsiburada"
                      ? "bg-orange-100 text-orange-700"
                      : platform.id === "n11"
                      ? "bg-purple-100 text-purple-600"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {platform.id === "trendyol"
                    ? "🛒"
                    : platform.id === "hepsiburada"
                    ? "🛍️"
                    : platform.id === "n11"
                    ? "🏪"
                    : "🌐"}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {platform.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {platform.description ||
                      `${platform.name} platformuna varyant oluştur`}
                  </p>
                </div>
              </div>
              {selectedPlatform === platform.id && (
                <Check className="w-5 h-5 text-blue-600" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Category Selection Step
 */
const CategorySelectionStep = ({
  selectedCategory,
  onSelect,
  categories,
  loading,
  onRefresh,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Kategori Seçin
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Ürününüz için uygun kategoriyi seçin
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loading className="w-6 h-6" />
          <span className="ml-2 text-gray-600">Kategoriler yükleniyor...</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Kategori bulunamadı. Platform bağlantınızı kontrol edin.
          </p>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onSelect(category.id)}
              className={`w-full p-3 border rounded-lg text-left transition-all ${
                selectedCategory === category.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {category.name}
                  </p>
                  {category.path && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {category.path}
                    </p>
                  )}
                </div>
                {selectedCategory === category.id && (
                  <Check className="w-5 h-5 text-blue-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Field Configuration Step
 */
const FieldConfigurationStep = ({
  fields,
  values,
  onChange,
  loading,
  errors = {},
}) => {
  const renderField = (field) => {
    const hasError = errors[field.key];
    const value = values[field.key] || "";

    const baseClasses = `w-full px-3 py-2 border rounded-lg transition-colors ${
      hasError
        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
        : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
    } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`;

    switch (field.type) {
      case "textarea":
        return (
          <textarea
            id={field.key}
            value={value}
            onChange={(e) => onChange(field.key, e.target.value)}
            rows={3}
            className={baseClasses}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            disabled={loading}
          />
        );

      case "select":
        return (
          <select
            id={field.key}
            value={value}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={baseClasses}
            disabled={loading}
          >
            <option value="">{field.placeholder || "Seçin"}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "number":
        return (
          <input
            id={field.key}
            type="number"
            value={value}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={baseClasses}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step}
            disabled={loading}
          />
        );

      default:
        return (
          <input
            id={field.key}
            type="text"
            value={value}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={baseClasses}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            pattern={field.pattern}
            disabled={loading}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Platform Alanlarını Doldurun
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Seçilen platform için gerekli bilgileri girin
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loading className="w-6 h-6" />
          <span className="ml-2 text-gray-600">Alanlar yükleniyor...</span>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-4">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <label
                htmlFor={field.key}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField(field)}
              {field.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {field.description}
                </p>
              )}
              {errors[field.key] && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {errors[field.key]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced Platform Variant Modal
 */
const PlatformVariantModal = ({
  isOpen,
  onClose,
  product,
  variant = null,
  onSave,
}) => {
  const { showAlert } = useAlert();
  const [step, setStep] = useState(1);
  const [selectedPlatform, setSelectedPlatform] = useState(
    variant?.platform || ""
  );
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [fields, setFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const platforms = [
    {
      id: "trendyol",
      name: "Trendyol",
      description: "Türkiye'nin önde gelen e-ticaret platformu",
    },
    {
      id: "hepsiburada",
      name: "Hepsiburada",
      description: "Teknoloji ve genel kategoriler",
    },
    {
      id: "n11",
      name: "N11",
      description: "Doğuş holding e-ticaret platformu",
    },
  ];

  // Initialize form for editing
  useEffect(() => {
    if (variant && isOpen) {
      setSelectedPlatform(variant.platform);
      setFieldValues(variant.platformAttributes || {});
      if (variant.platformCategory) {
        setSelectedCategory(variant.platformCategory);
      }
    }
  }, [variant, isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedPlatform("");
      setSelectedCategory("");
      setCategories([]);
      setFields([]);
      setFieldValues({});
      setErrors({});
    }
  }, [isOpen]);

  // Fetch categories when platform is selected
  const fetchCategories = useCallback(
    async (platform) => {
      if (!platform) return;

      try {
        setLoading(true);
        const categories = await PlatformVariantsAPI.getPlatformCategories(
          platform
        );
        setCategories(categories);
      } catch (error) {
        console.error("Fetch categories error:", error);
        showAlert(error.message || "Kategoriler getirilemedi", "error");
        setCategories([]);
      } finally {
        setLoading(false);
      }
    },
    [showAlert]
  );

  // Fetch platform fields when category is selected
  const fetchPlatformFields = useCallback(
    async (platform, categoryId) => {
      if (!platform) return;

      try {
        setLoading(true);
        const fieldsData = await PlatformVariantsAPI.getPlatformFields(
          platform,
          categoryId
        );
        setFields(fieldsData.fields);

        // Initialize field values with product data
        const initialValues = {
          platformTitle: product?.name || "",
          platformDescription: product?.description || "",
          platformPrice: product?.price || "",
          categoryId: categoryId || "",
          ...fieldValues, // Keep existing values
        };
        setFieldValues(initialValues);
      } catch (error) {
        console.error("Fetch platform fields error:", error);
        showAlert(error.message || "Platform alanları getirilemedi", "error");
        setFields([]);
      } finally {
        setLoading(false);
      }
    },
    [product, fieldValues, showAlert]
  );

  // Handle platform selection
  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform);
    setSelectedCategory("");
    setCategories([]);
    setFields([]);
    setFieldValues({});
    fetchCategories(platform);
  };

  // Handle category selection
  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    fetchPlatformFields(selectedPlatform, categoryId);
  };

  // Handle field value change
  const handleFieldChange = (key, value) => {
    setFieldValues((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Clear error for this field
    if (errors[key]) {
      setErrors((prev) => ({
        ...prev,
        [key]: null,
      }));
    }
  };

  // Handle next step
  const handleNext = () => {
    if (step === 1 && selectedPlatform) {
      setStep(2);
    } else if (step === 2 && selectedCategory) {
      setStep(3);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Handle save
  const handleSave = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Generate platform SKU if not provided
      if (
        !fieldValues.platformSku &&
        !fieldValues.stockCode &&
        !fieldValues.merchantSku
      ) {
        const platformPrefix = selectedPlatform.toUpperCase().substring(0, 2);
        const baseSku = product?.sku || "PRODUCT";
        const platformSku = `${platformPrefix}-${baseSku}-${Date.now()
          .toString()
          .slice(-6)}`;

        setFieldValues((prev) => ({
          ...prev,
          platformSku,
          stockCode: platformSku,
          merchantSku: platformSku,
        }));
      }

      const variantData = {
        platform: selectedPlatform,
        platformSku:
          fieldValues.platformSku ||
          fieldValues.stockCode ||
          fieldValues.merchantSku,
        platformFields: {
          ...fieldValues,
          categoryId: selectedCategory,
        },
        autoPublish: false,
      };

      if (variant) {
        // Update existing variant
        await PlatformVariantsAPI.updatePlatformVariant(variant.id, {
          platformFields: variantData.platformFields,
        });
      } else {
        // Create new variant
        await PlatformVariantsAPI.createPlatformVariant(
          product.id,
          variantData
        );
      }

      showAlert(
        variant
          ? "Platform varyantı başarıyla güncellendi"
          : "Platform varyantı başarıyla oluşturuldu",
        "success"
      );
      onSave();
    } catch (error) {
      console.error("Save variant error:", error);

      // Handle validation errors
      if (error.validationErrors) {
        const errorObj = {};
        error.validationErrors.forEach((err) => {
          errorObj[err.field] = err.message;
        });
        setErrors(errorObj);
      }

      showAlert(error.message || "Varyant kaydedilemedi", "error");
    } finally {
      setSaving(false);
    }
  };

  // Check if can proceed to next step
  const canProceed = () => {
    if (step === 1) return selectedPlatform;
    if (step === 2) return selectedCategory;
    if (step === 3) return true;
    return false;
  };

  // Check if form is valid for saving
  const isFormValid = () => {
    return selectedPlatform && selectedCategory && fields.length > 0;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={variant ? "Platform Varyantını Düzenle" : "Yeni Platform Varyantı"}
      size="lg"
    >
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i <= step
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                {i < step ? <Check className="w-4 h-4" /> : i}
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Adım {step} / 3
          </div>
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">
          {step === 1 && (
            <PlatformSelectionStep
              selectedPlatform={selectedPlatform}
              onSelect={handlePlatformSelect}
              platforms={platforms}
            />
          )}

          {step === 2 && (
            <CategorySelectionStep
              selectedCategory={selectedCategory}
              onSelect={handleCategorySelect}
              categories={categories}
              loading={loading}
              onRefresh={() => fetchCategories(selectedPlatform)}
            />
          )}

          {step === 3 && (
            <FieldConfigurationStep
              fields={fields}
              values={fieldValues}
              onChange={handleFieldChange}
              loading={loading}
              errors={errors}
            />
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Geri
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>
              İptal
            </Button>

            {step < 3 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-2"
              >
                İleri
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={!isFormValid() || saving}
                className="flex items-center gap-2"
              >
                {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                {variant ? "Güncelle" : "Oluştur"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PlatformVariantModal;
