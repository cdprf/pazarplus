/**
 * Enhanced SKU Input Component
 * Provides intelligent SKU generation, validation, and brand management
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wand2,
  Check,
  AlertCircle,
  Info,
  Loader,
  ChevronDown,
} from "lucide-react";
import { skuSystemAPI } from "../../services/skuSystemAPI";

const SKUInput = ({
  value = "",
  onChange,
  productName = "",
  category = "",
  brand = "",
  disabled = false,
  onValidationChange,
  className = "",
  autoGenerate = true,
  ...props
}) => {
  // State management
  const [isGenerating, setIsGenerating] = useState(false);
  const [validation, setValidation] = useState({ isValid: true, errors: [] });
  const [skuComponents, setSKUComponents] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [availableBrands, setAvailableBrands] = useState([]);
  const [availableProductTypes, setAvailableProductTypes] = useState([]);
  const [availableVariants, setAvailableVariants] = useState([]);
  const [generatorForm, setGeneratorForm] = useState({
    productType: "",
    brand: "",
    variant: "ORJ",
    customBrand: "",
  });

  // Load configuration data from enhanced API
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        const data = await skuSystemAPI.getData();

        // Transform brands from enhanced API format
        const allBrands = [...data.brands.own, ...data.brands.external];
        setAvailableBrands(
          allBrands.map((brand) => ({ code: brand.code, name: brand.name }))
        );

        // Transform product types
        setAvailableProductTypes(
          data.productTypes.map((type) => ({
            code: type.code,
            name: type.name,
          }))
        );

        // Transform variant codes
        setAvailableVariants(
          data.variantCodes.map((variant) => ({
            code: variant.code,
            description: variant.name,
          }))
        );
      } catch (error) {
        console.error("Error loading SKU configuration:", error);
      }
    };

    loadConfiguration();
  }, []);

  // Process and parse SKU/barcode when value changes
  useEffect(() => {
    const processCode = async () => {
      if (value && value.length > 3) {
        try {
          const result = await skuSystemAPI.processCode(value);

          if (result.classification.type === "sku" && result.sku) {
            setSKUComponents(result.sku);

            if (result.sku.parsed) {
              setGeneratorForm({
                productType: result.sku.parsed.main || "",
                brand: result.sku.parsed.prefix || "",
                variant: result.sku.parsed.suffix || "",
                customBrand: "",
              });
            }
          } else if (result.classification.type === "barcode") {
            // Handle barcode detection
            setSKUComponents({
              isBarcode: true,
              barcode: value,
              actions: result.actions || [],
            });
          } else {
            setSKUComponents(null);
          }
        } catch (error) {
          setSKUComponents(null);
        }
      } else {
        setSKUComponents(null);
      }
    };

    processCode();
  }, [value]);

  // Validate SKU using enhanced API
  useEffect(() => {
    const validateSKU = async () => {
      if (value) {
        try {
          const result = await skuSystemAPI.processCode(value);
          const validationResult = {
            isValid: result.classification.type === "sku",
            isBarcode: result.classification.type === "barcode",
            confidence: result.classification.confidence,
            errors:
              result.classification.type === "sku"
                ? []
                : [`Detected as ${result.classification.type}`],
            actions: result.actions || [],
          };
          setValidation(validationResult);
          onValidationChange?.(validationResult);
        } catch (error) {
          const errorResult = { isValid: false, errors: ["Validation failed"] };
          setValidation(errorResult);
          onValidationChange?.(errorResult);
        }
      } else {
        const validResult = { isValid: true, errors: [] };
        setValidation(validResult);
        onValidationChange?.(validResult);
      }
    };

    const debounceTimer = setTimeout(validateSKU, 300);
    return () => clearTimeout(debounceTimer);
  }, [value, onValidationChange]);

  // Auto-suggest SKU generation based on product info
  useEffect(() => {
    if (autoGenerate && !value && productName && category) {
      const suggestFromProductInfo = () => {
        // Map category to product type
        const categoryMapping = {
          Elektronik: "K",
          Bilgisayar: "K",
          Mouse: "M",
          Klavye: "K",
          Kulaklık: "H",
          Hoparlör: "SP",
        };

        const productType = categoryMapping[category] || "K";

        setGeneratorForm((prev) => ({
          ...prev,
          productType,
          brand: brand || "",
        }));
      };

      suggestFromProductInfo();
    }
  }, [autoGenerate, value, productName, category, brand]);

  // Generate SKU
  const handleGenerateSKU = useCallback(async () => {
    setIsGenerating(true);
    try {
      const brandCode = generatorForm.customBrand || generatorForm.brand;

      // Add custom brand if needed
      if (
        generatorForm.customBrand &&
        !availableBrands.find((b) => b.code === generatorForm.customBrand)
      ) {
        await skuSystemAPI.addBrand(generatorForm.customBrand);
      }

      // Get next sequence number
      const sequenceResponse = await skuSystemAPI.getNextSequence(
        brandCode,
        generatorForm.productType
      );

      // Generate SKU
      const skuResponse = await skuSystemAPI.generateSKU({
        productType: generatorForm.productType,
        brand: brandCode,
        sequence: sequenceResponse.nextSequence,
        variant: generatorForm.variant,
      });

      onChange(skuResponse.sku);
      setShowGenerator(false);
    } catch (error) {
      console.error("Error generating SKU:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [generatorForm, onChange, availableBrands]);

  // Quick generate SKU
  const handleQuickGenerate = useCallback(async () => {
    if (!generatorForm.productType || !generatorForm.brand) return;

    setIsGenerating(true);
    try {
      const sequenceResponse = await skuSystemAPI.getNextSequence(
        generatorForm.brand,
        generatorForm.productType
      );
      const skuResponse = await skuSystemAPI.generateSKU({
        productType: generatorForm.productType,
        brand: generatorForm.brand,
        sequence: sequenceResponse.nextSequence,
        variant: generatorForm.variant,
      });

      onChange(skuResponse.sku);
    } catch (error) {
      console.error("Error generating SKU:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [generatorForm, onChange]);

  // Handle barcode actions
  const handleBarcodeAction = useCallback(
    async (action) => {
      switch (action.action) {
        case "enter_sku":
          // Clear the current value and prompt for SKU entry
          onChange("");
          // Could show a modal or focus on input for SKU entry
          break;

        case "create_barcode_sku_mapping":
          // Open a modal to create mapping between barcode and SKU
          // This would be implemented in a parent component or modal
          console.log("Create barcode-SKU mapping for:", value);
          break;

        case "use_as_sku":
          // Allow using barcode as SKU (not recommended)
          // Keep the current value but mark it as acceptable
          console.log("Using barcode as SKU:", value);
          break;

        default:
          console.log("Unknown barcode action:", action);
      }
    },
    [value, onChange]
  );

  // Get validation icon and color
  const getValidationIcon = () => {
    if (!value) return null;

    if (validation.isValid) {
      return <Check className="w-4 h-4 text-green-500" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const inputClassName = useMemo(() => {
    let baseClass = `w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`;

    if (validation.isValid) {
      baseClass += " border-gray-300 dark:border-gray-600";
    } else {
      baseClass += " border-red-500";
    }

    if (disabled) {
      baseClass += " opacity-50 cursor-not-allowed";
    }

    return baseClass;
  }, [validation.isValid, disabled, className]);

  return (
    <div className="space-y-2">
      {/* Main SKU Input */}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputClassName}
          placeholder="SKU kodunu girin veya otomatik oluşturun"
          {...props}
        />

        {/* Validation icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
          {getValidationIcon()}

          {/* Generate button */}
          {!disabled && (
            <button
              type="button"
              onClick={() => setShowGenerator(!showGenerator)}
              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
              title="SKU Oluşturucu"
            >
              <Wand2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Validation errors */}
      {!validation.isValid && validation.errors.length > 0 && (
        <div className="text-red-500 text-xs space-y-1">
          {validation.errors.map((error, index) => (
            <div key={index} className="flex items-center space-x-1">
              <AlertCircle className="w-3 h-3" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* SKU Components Display */}
      {skuComponents && skuComponents.isStructured && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-3">
          <div className="flex items-center space-x-2 text-sm">
            <Info className="w-4 h-4 text-blue-500" />
            <span className="font-medium text-blue-700 dark:text-blue-300">
              SKU Analizi:
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">
                Marka:
              </span>
              <div className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                {skuComponents.ownBrand}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">
                Tip:
              </span>
              <div className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                {skuComponents.productType}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">
                Marka Kodu:
              </span>
              <div className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                {skuComponents.brandCode}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">
                Varyant:
              </span>
              <div className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                {skuComponents.variant}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Detection Alert */}
      {validation.isBarcode && skuComponents?.isBarcode && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Barkod Tespit Edildi
              </h4>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Bu kod bir barkod olarak görünüyor. SKU sistemi için aşağıdaki
                seçeneklerden birini kullanabilirsiniz:
              </p>

              {skuComponents.actions && skuComponents.actions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {skuComponents.actions.map((action, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleBarcodeAction(action)}
                      className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                        action.priority === "high"
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                          : action.priority === "medium"
                          ? "bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                          : "bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <div className="font-medium">{action.message}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Generate Row */}
      {!disabled && (generatorForm.productType || generatorForm.brand) && (
        <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Hızlı Oluştur:
          </span>
          <button
            type="button"
            onClick={handleQuickGenerate}
            disabled={
              isGenerating || !generatorForm.productType || !generatorForm.brand
            }
            className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Wand2 className="w-3 h-3 mr-1" />
            )}
            {`NW${generatorForm.productType}-${generatorForm.brand}###-${generatorForm.variant}`}
          </button>
        </div>
      )}

      {/* SKU Generator Panel */}
      {showGenerator && !disabled && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              SKU Oluşturucu
            </h4>
            <button
              type="button"
              onClick={() => setShowGenerator(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Product Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ürün Tipi *
              </label>
              <select
                value={generatorForm.productType}
                onChange={(e) =>
                  setGeneratorForm((prev) => ({
                    ...prev,
                    productType: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Seçin</option>
                {availableProductTypes.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.code} - {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Marka *
              </label>
              <select
                value={generatorForm.brand}
                onChange={(e) => {
                  setGeneratorForm((prev) => ({
                    ...prev,
                    brand: e.target.value,
                    customBrand: "",
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Seçin</option>
                {availableBrands.map((brand) => (
                  <option key={brand.code} value={brand.code}>
                    {brand.code} - {brand.name}
                  </option>
                ))}
                <option value="custom">Yeni Marka Ekle...</option>
              </select>

              {/* Custom brand input */}
              {generatorForm.brand === "custom" && (
                <input
                  type="text"
                  value={generatorForm.customBrand}
                  onChange={(e) =>
                    setGeneratorForm((prev) => ({
                      ...prev,
                      customBrand: e.target.value,
                    }))
                  }
                  placeholder="Yeni marka kodu girin"
                  className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              )}
            </div>

            {/* Variant */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Varyant
              </label>
              <select
                value={generatorForm.variant}
                onChange={(e) =>
                  setGeneratorForm((prev) => ({
                    ...prev,
                    variant: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {availableVariants.map((variant) => (
                  <option key={variant.code} value={variant.code}>
                    {variant.code} - {variant.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleGenerateSKU}
              disabled={
                isGenerating ||
                !generatorForm.productType ||
                (!generatorForm.brand && !generatorForm.customBrand)
              }
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isGenerating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  SKU Oluştur
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SKUInput;
