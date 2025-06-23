/**
 * Product Variant Manager Component
 * Manages product variants with your structured SKU system
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Wand2,
  ChevronDown,
  ChevronRight,
  Layers,
  CheckCircle,
  Loader,
} from "lucide-react";
import { skuSystemAPI } from "../../../services/skuSystemAPI";
import EnhancedSKUInput from "../../common/EnhancedSKUInput";

const ProductVariantManager = ({
  baseProduct,
  variants = [],
  onVariantsChange,
  onCreateVariant,
  onUpdateVariant,
  onDeleteVariant,
  disabled = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [availableVariantTypes, setAvailableVariantTypes] = useState([]);
  const [detectedVariants, setDetectedVariants] = useState([]);
  const [variantForm, setVariantForm] = useState({
    name: "",
    sku: "",
    variant: "",
    price: "",
    costPrice: "",
    stockQuantity: 0,
    attributes: {},
  });

  // Load variant types
  useEffect(() => {
    const loadVariantTypes = async () => {
      try {
        const variantCodes = await skuSystemAPI.getVariantCodes();
        setAvailableVariantTypes(
          Object.entries(variantCodes).map(([code, description]) => ({
            code,
            description,
          }))
        );
      } catch (error) {
        console.error("Error loading variant types:", error);
      }
    };

    loadVariantTypes();
  }, []);

  // Auto-detect variants when base product changes
  useEffect(() => {
    const detectSimilarVariants = async () => {
      if (baseProduct?.sku) {
        try {
          const skus = [baseProduct.sku, ...variants.map((v) => v.sku)].filter(
            Boolean
          );
          const detected = await skuSystemAPI.detectVariants(skus);
          setDetectedVariants(detected);
        } catch (error) {
          console.error("Error detecting variants:", error);
        }
      }
    };

    detectSimilarVariants();
  }, [baseProduct, variants]);

  // Generate variants automatically
  const handleGenerateVariants = useCallback(
    async (variantTypes) => {
      if (!baseProduct?.sku) return;

      setIsGenerating(true);
      try {
        const parsedSKU = await skuSystemAPI.parseSKU(baseProduct.sku);
        if (!parsedSKU || !parsedSKU.isStructured) {
          throw new Error(
            "Base product must have a structured SKU to generate variants"
          );
        }

        const baseInfo = {
          productType: parsedSKU.productType,
          brand: parsedSKU.brandCode,
          sequence: parsedSKU.sequence,
        };

        const generatedVariants = await skuSystemAPI.generateVariants(
          baseInfo,
          variantTypes
        );

        // Create variants with generated SKUs
        const variantsToCreate = generatedVariants.map((variant) => ({
          name: variant.name,
          sku: variant.sku,
          price: baseProduct.price,
          costPrice: baseProduct.costPrice,
          stockQuantity: 0,
          attributes: variant.attributes,
          sortOrder: variant.sortOrder,
        }));

        onVariantsChange(variantsToCreate);
      } catch (error) {
        console.error("Error generating variants:", error);
        alert("Varyant oluşturma hatası: " + error.message);
      } finally {
        setIsGenerating(false);
      }
    },
    [baseProduct, onVariantsChange]
  );

  // Handle variant form submission
  const handleSaveVariant = useCallback(async () => {
    try {
      const variantData = {
        ...variantForm,
        productId: baseProduct.id,
        price: parseFloat(variantForm.price) || baseProduct.price,
        costPrice: parseFloat(variantForm.costPrice) || baseProduct.costPrice,
        stockQuantity: parseInt(variantForm.stockQuantity) || 0,
      };

      if (editingVariant) {
        await onUpdateVariant(editingVariant.id, variantData);
      } else {
        await onCreateVariant(variantData);
      }

      // Reset form
      setVariantForm({
        name: "",
        sku: "",
        variant: "",
        price: "",
        costPrice: "",
        stockQuantity: 0,
        attributes: {},
      });
      setShowVariantForm(false);
      setEditingVariant(null);
    } catch (error) {
      console.error("Error saving variant:", error);
      alert("Varyant kaydetme hatası: " + error.message);
    }
  }, [
    variantForm,
    editingVariant,
    baseProduct,
    onCreateVariant,
    onUpdateVariant,
  ]);

  // Auto-generate variant name and SKU when variant type changes
  useEffect(() => {
    if (variantForm.variant && baseProduct?.sku) {
      const generateVariantInfo = async () => {
        try {
          const parsedBaseSKU = await skuSystemAPI.parseSKU(baseProduct.sku);
          if (parsedBaseSKU?.isStructured) {
            const generatedSKU = await skuSystemAPI.generateSKU({
              productType: parsedBaseSKU.productType,
              brand: parsedBaseSKU.brandCode,
              sequence: parsedBaseSKU.sequence,
              variant: variantForm.variant,
            });

            const variantType = availableVariantTypes.find(
              (v) => v.code === variantForm.variant
            );
            const generatedName = `${baseProduct.name} - ${
              variantType?.description || variantForm.variant
            }`;

            setVariantForm((prev) => ({
              ...prev,
              sku: generatedSKU.sku,
              name: generatedName,
            }));
          }
        } catch (error) {
          console.error("Error generating variant info:", error);
        }
      };

      generateVariantInfo();
    }
  }, [variantForm.variant, baseProduct, availableVariantTypes]);

  // Quick variant generation presets
  const quickVariantPresets = [
    { name: "Klavye Düzenleri", types: ["TR", "UK", "ING"] },
    { name: "Renkler", types: ["SYH", "BEYAZ", "KIRMIZI"] },
    { name: "Özellikler", types: ["LED", "RGB", "MECH"] },
    { name: "Boyutlar", types: ["S", "M", "L"] },
  ];

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
          <Layers className="w-5 h-5 text-blue-500" />
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Ürün Varyantları
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {variants.length} varyant{" "}
              {detectedVariants.length > 0 &&
                `• ${detectedVariants.length} otomatik tespit`}
            </p>
          </div>
        </div>

        {!disabled && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowVariantForm(true);
              }}
              className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ekle
            </button>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
          {/* Quick Generation */}
          {!disabled && baseProduct?.sku && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                Hızlı Varyant Oluşturma
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickVariantPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleGenerateVariants(preset.types)}
                    disabled={isGenerating}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    <div className="text-left">
                      <div className="font-medium text-sm">{preset.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {preset.types.join(", ")}
                      </div>
                    </div>
                    {isGenerating ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4 text-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Auto-detected Variants */}
          {detectedVariants.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-3">
                Otomatik Tespit Edilen Varyantlar
              </h4>
              {detectedVariants.map((group, index) => (
                <div key={index} className="space-y-2">
                  <div className="font-medium text-sm">{group.basePattern}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {group.variants.map((variant, vIndex) => (
                      <div
                        key={vIndex}
                        className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded"
                      >
                        <div>
                          <div className="font-mono text-xs">{variant.sku}</div>
                          <div className="text-xs text-gray-500">
                            {variant.description}
                          </div>
                        </div>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Existing Variants List */}
          {variants.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                Mevcut Varyantlar
              </h4>
              <div className="space-y-2">
                {variants.map((variant, index) => (
                  <div
                    key={variant.id || index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="font-medium text-sm">
                          {variant.name}
                        </div>
                        <code className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded">
                          {variant.sku}
                        </code>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ₺{variant.price} • Stok: {variant.stockQuantity}
                        {variant.attributes &&
                          Object.keys(variant.attributes).length > 0 && (
                            <span className="ml-2">
                              •{" "}
                              {Object.entries(variant.attributes)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(", ")}
                            </span>
                          )}
                      </div>
                    </div>

                    {!disabled && (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVariant(variant);
                            setVariantForm({
                              name: variant.name,
                              sku: variant.sku,
                              variant: variant.variant || "",
                              price: variant.price.toString(),
                              costPrice: variant.costPrice?.toString() || "",
                              stockQuantity: variant.stockQuantity,
                              attributes: variant.attributes || {},
                            });
                            setShowVariantForm(true);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-500"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            navigator.clipboard.writeText(variant.sku)
                          }
                          className="p-1 text-gray-400 hover:text-green-500"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onDeleteVariant && onDeleteVariant(variant.id)
                          }
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Variant Form */}
          {showVariantForm && !disabled && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                {editingVariant ? "Varyant Düzenle" : "Yeni Varyant Ekle"}
              </h4>

              <div className="space-y-4">
                {/* Variant Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Varyant Tipi *
                  </label>
                  <select
                    value={variantForm.variant}
                    onChange={(e) =>
                      setVariantForm((prev) => ({
                        ...prev,
                        variant: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seçin</option>
                    {availableVariantTypes.map((type) => (
                      <option key={type.code} value={type.code}>
                        {type.code} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Variant Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Varyant Adı *
                  </label>
                  <input
                    type="text"
                    value={variantForm.name}
                    onChange={(e) =>
                      setVariantForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Varyant adını girin"
                  />
                </div>

                {/* SKU */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SKU *
                  </label>
                  <EnhancedSKUInput
                    value={variantForm.sku}
                    onChange={(sku) =>
                      setVariantForm((prev) => ({ ...prev, sku }))
                    }
                    productName={variantForm.name}
                    brand={baseProduct?.brand}
                    autoGenerate={false}
                  />
                </div>

                {/* Price and Stock */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fiyat (₺)
                    </label>
                    <input
                      type="number"
                      value={variantForm.price}
                      onChange={(e) =>
                        setVariantForm((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={baseProduct?.price?.toString() || "0"}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Maliyet (₺)
                    </label>
                    <input
                      type="number"
                      value={variantForm.costPrice}
                      onChange={(e) =>
                        setVariantForm((prev) => ({
                          ...prev,
                          costPrice: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={baseProduct?.costPrice?.toString() || "0"}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Stok
                    </label>
                    <input
                      type="number"
                      value={variantForm.stockQuantity}
                      onChange={(e) =>
                        setVariantForm((prev) => ({
                          ...prev,
                          stockQuantity: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVariantForm(false);
                      setEditingVariant(null);
                      setVariantForm({
                        name: "",
                        sku: "",
                        variant: "",
                        price: "",
                        costPrice: "",
                        stockQuantity: 0,
                        attributes: {},
                      });
                    }}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveVariant}
                    disabled={
                      !variantForm.name ||
                      !variantForm.sku ||
                      !variantForm.variant
                    }
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingVariant ? "Güncelle" : "Kaydet"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductVariantManager;
