// Enhanced ProductTableWithVariants with Variant Management
// Integrates automatic detection, manual grouping, suggestions, and enhanced display

import React, { useState, useCallback, useMemo } from "react";
import {
  SortAsc,
  SortDesc,
  Image,
  Copy,
  Info,
  Eye,
  Edit,
  MoreVertical,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronRight,
  GitMerge,
  Lightbulb,
  Settings,
  Link,
  Unlink,
} from "lucide-react";

import { Button, Badge, Tooltip } from "../../ui";
import CompletionScore from "./CompletionScore";
import InlineEditor from "./InlineEditor";
import SKUVariantDetector from "../utils/skuVariantDetector";
import {
  VariantSuggestionsPanel,
  ManualGroupingInterface,
  EnhancedVariantDisplay,
  VariantManagementModal,
} from "./VariantComponents";

// Enhanced ProductTableWithVariants Component
const ProductTableWithVariants = ({
  products = [],
  onView,
  onEdit,
  onDelete,
  onImageClick,
  onProductNameClick,
  selectedProducts = [],
  onSelectProduct,
  onSelectAll,
  sortField,
  sortOrder,
  onSort,
  showMoreMenu,
  onToggleMoreMenu,
  onInlineEdit,
  tableSettings = null,
  // New variant management props
  onCreateVariantGroup,
  onUpdateVariantGroup,
  onDeleteVariantGroup,
  onAcceptVariantSuggestion,
  onRejectVariantSuggestion,
  enableVariantManagement = true,
}) => {
  // State for variant management
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [editingCell, setEditingCell] = useState(null);
  const [variantDetector] = useState(() => new SKUVariantDetector());
  const [showVariantSuggestions, setShowVariantSuggestions] = useState(false);
  const [showManualGrouping, setShowManualGrouping] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedVariantProduct, setSelectedVariantProduct] = useState(null);
  const [manualGroupingProducts, setManualGroupingProducts] = useState([]);
  const [isProcessingVariants, setIsProcessingVariants] = useState(false);

  // Process products with variant detection
  const processedProductsData = useMemo(() => {
    if (!enableVariantManagement) {
      return { products, suggestions: [], analysis: null };
    }

    const analysis = variantDetector.analyzeProducts(products);
    const processed = variantDetector.processProducts(products);

    // Generate suggestions with unique IDs - Convert Map to Array
    const suggestions = Array.from(analysis.suggestions.values()).map((suggestion, index) => ({
      ...suggestion,
      id: `suggestion-${index}`,
    }));

    return {
      products: processed.products,
      suggestions,
      analysis: processed.analysis,
    };
  }, [products, variantDetector, enableVariantManagement]);

  const { products: processedProducts, suggestions } = processedProductsData;

  // Helper functions
  const getStockStatus = (product) => {
    const stock = product.stockQuantity || 0;
    if (stock === 0) {
      return {
        color: "text-red-600",
        icon: <div className="w-2 h-2 bg-red-500 rounded-full" />,
        label: "Stok Yok",
      };
    } else if (stock <= 10) {
      return {
        color: "text-yellow-600",
        icon: <div className="w-2 h-2 bg-yellow-500 rounded-full" />,
        label: "Az Stok",
      };
    } else {
      return {
        color: "text-green-600",
        icon: <div className="w-2 h-2 bg-green-500 rounded-full" />,
        label: "Stokta",
      };
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "danger";
      case "draft":
        return "warning";
      default:
        return "secondary";
    }
  };

  const calculateCompletionScore = (product) => {
    const fields = [
      product.name,
      product.description,
      product.price,
      product.images?.length > 0,
      product.category,
      product.sku,
      product.stockQuantity > 0,
      product.modelCode,
      product.barcode,
    ];
    const filledFields = fields.filter(Boolean).length;
    return Math.round((filledFields / fields.length) * 100);
  };

  // Variant management functions
  const toggleProductExpansion = (productId) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const handleVariantBulkSelect = (productId, selectAll) => {
    const product = processedProducts.find((p) => p.id === productId);
    if (product?.variants) {
      const variantIds = product.variants.map((v) => `variant-${v.id}`);
      if (selectAll) {
        variantIds.forEach((id) => {
          if (!selectedProducts.includes(id)) {
            onSelectProduct?.(id);
          }
        });
      } else {
        variantIds.forEach((id) => {
          if (selectedProducts.includes(id)) {
            onSelectProduct?.(id);
          }
        });
      }
    }
  };

  const areAllVariantsSelected = (product) => {
    if (!product.variants) return false;
    return product.variants.every((v) =>
      selectedProducts.includes(`variant-${v.id}`)
    );
  };

  const areSomeVariantsSelected = (product) => {
    if (!product.variants) return false;
    return product.variants.some((v) =>
      selectedProducts.includes(`variant-${v.id}`)
    );
  };

  // Variant suggestion handlers
  const handleAcceptSuggestion = useCallback(
    async (suggestion) => {
      setIsProcessingVariants(true);
      try {
        await onAcceptVariantSuggestion?.(suggestion);
      } finally {
        setIsProcessingVariants(false);
      }
    },
    [onAcceptVariantSuggestion]
  );

  const handleRejectSuggestion = useCallback(
    async (suggestion) => {
      setIsProcessingVariants(true);
      try {
        await onRejectVariantSuggestion?.(suggestion);
      } finally {
        setIsProcessingVariants(false);
      }
    },
    [onRejectVariantSuggestion]
  );

  // Manual grouping handlers
  const handleStartManualGrouping = useCallback(() => {
    // Get products that aren't already in variant groups
    const availableProducts = processedProducts.filter((p) => !p.hasVariants);
    setManualGroupingProducts(availableProducts);
    setShowManualGrouping(true);
  }, [processedProducts]);

  const handleCreateManualGroup = useCallback(
    async (groupData) => {
      setIsProcessingVariants(true);
      try {
        await onCreateVariantGroup?.(groupData);
        setShowManualGrouping(false);
        setManualGroupingProducts([]);
      } finally {
        setIsProcessingVariants(false);
      }
    },
    [onCreateVariantGroup]
  );

  // Variant management handlers
  const handleUnlinkVariant = useCallback(
    async (product, variant = null) => {
      if (variant) {
        // Unlink specific variant
        const updatedGroup = {
          ...product,
          variants: product.variants.filter((v) => v.id !== variant.id),
        };
        await onUpdateVariantGroup?.(updatedGroup);
      } else {
        // Dissolve entire group
        await onDeleteVariantGroup?.(product);
      }
    },
    [onUpdateVariantGroup, onDeleteVariantGroup]
  );

  const handleEditVariantGroup = useCallback((product) => {
    setSelectedVariantProduct(product);
    setShowVariantModal(true);
  }, []);

  // Inline editing
  const handleInlineEditStart = (productId, field, isVariant = false) => {
    setEditingCell({ productId, field, isVariant });
  };

  const handleInlineEditSave = (productId, field, value, isVariant = false) => {
    onInlineEdit?.(productId, field, value, isVariant);
    setEditingCell(null);
  };

  const handleInlineEditCancel = () => {
    setEditingCell(null);
  };

  const handleSort = (field) => {
    onSort?.(field);
  };

  // Get row height class from settings
  const rowHeightClass = {
    compact: "py-2",
    normal: "py-3",
    comfortable: "py-4",
  }[tableSettings?.rowHeight || "normal"];

  // Helper function to check if column is visible
  const isColumnVisible = (columnId) => {
    if (!tableSettings?.columns?.length) return true;
    const column = tableSettings.columns.find((col) => col.id === columnId);
    return column?.visible !== false;
  };

  const SortHeader = ({ field, children, isVisible = true }) => {
    if (!isVisible) return null;

    return (
      <th
        className={`px-6 ${rowHeightClass} text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 ${
          tableSettings?.stickyHeaders ? "sticky top-0 bg-gray-50 z-10" : ""
        }`}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center space-x-1">
          <span>{children}</span>
          {sortField === field && (
            <div className="flex flex-col">
              {sortOrder === "asc" ? (
                <SortAsc className="w-3 h-3" />
              ) : (
                <SortDesc className="w-3 h-3" />
              )}
            </div>
          )}
        </div>
      </th>
    );
  };

  // Enhanced Product Info Cell Component with Variant Display
  const ProductInfoCell = ({ product, isVariant = false }) => {
    const getImageUrl = (image) => {
      if (typeof image === "string") return image;
      if (typeof image === "object" && image !== null) {
        return image.url || image.src || image.path || "";
      }
      return "";
    };

    const images =
      product.images && product.images.length > 0 ? product.images : [];

    return (
      <td
        className={`px-6 ${rowHeightClass} whitespace-nowrap ${
          !isVariant ? "sticky left-12 bg-white" : "bg-blue-50"
        }`}
      >
        <div className={`flex items-center ${isVariant ? "ml-8" : ""}`}>
          <div className="flex-shrink-0 h-16 w-16 relative">
            {images.length > 0 ? (
              <div className="relative">
                <img
                  className="h-16 w-16 rounded-lg object-cover cursor-pointer hover:opacity-80"
                  src={getImageUrl(images[0])}
                  alt={product.name}
                  onClick={() =>
                    onImageClick?.(
                      getImageUrl(images[0]),
                      product.name,
                      product
                    )
                  }
                />
                {images.length > 1 && (
                  <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1 rounded-full">
                    +{images.length - 1}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center">
                <Image className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          <div className="ml-4 flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 max-w-xs truncate mb-1">
              <Tooltip content={product.name}>
                <span
                  className={`${
                    onProductNameClick
                      ? "cursor-pointer hover:text-blue-600 hover:underline"
                      : ""
                  }`}
                  onClick={() => onProductNameClick?.(product)}
                >
                  {product.name}
                </span>
              </Tooltip>
            </div>

            {/* Enhanced Product Metadata with Variant Info */}
            <div className="space-y-1 text-xs text-gray-500">
              {product.modelCode && (
                <div className="flex items-center space-x-2">
                  <span>Model Kodu:</span>
                  <code className="bg-gray-100 px-1 rounded text-xs">
                    {product.modelCode}
                  </code>
                  <Button
                    onClick={() =>
                      navigator.clipboard.writeText(product.modelCode)
                    }
                    variant="ghost"
                    size="sm"
                    icon={Copy}
                    className="h-4 w-4 p-0"
                  />
                </div>
              )}
              <div className="flex items-center space-x-2">
                <span>Stok Kodu:</span>
                <code className="bg-gray-100 px-1 rounded text-xs">
                  {product.sku}
                </code>
                <Button
                  onClick={() => navigator.clipboard.writeText(product.sku)}
                  variant="ghost"
                  size="sm"
                  icon={Copy}
                  className="h-4 w-4 p-0"
                />
              </div>
              {product.barcode && (
                <div className="flex items-center space-x-2">
                  <span>Barkod:</span>
                  <code className="bg-gray-100 px-1 rounded text-xs">
                    {product.barcode}
                  </code>
                  <Button
                    onClick={() =>
                      navigator.clipboard.writeText(product.barcode)
                    }
                    variant="ghost"
                    size="sm"
                    icon={Copy}
                    className="h-4 w-4 p-0"
                  />
                </div>
              )}

              {/* Enhanced Variant Display */}
              {!isVariant && enableVariantManagement && (
                <EnhancedVariantDisplay
                  product={product}
                  isExpanded={expandedProducts.has(product.id)}
                  onToggleExpansion={() => toggleProductExpansion(product.id)}
                  onUnlinkVariant={handleUnlinkVariant}
                  onEditVariant={() => handleEditVariantGroup(product)}
                  onViewVariant={onView}
                />
              )}
            </div>
          </div>
        </div>
      </td>
    );
  };

  // Price Cell Component
  const PriceCell = ({ product, isVariant = false }) => (
    <td
      className={`px-6 ${rowHeightClass} whitespace-nowrap ${
        isVariant ? "bg-blue-50" : ""
      }`}
    >
      <InlineEditor
        value={product.price || 0}
        onSave={(newPrice) =>
          handleInlineEditSave(product.id, "price", newPrice, isVariant)
        }
        onEdit={() => handleInlineEditStart(product.id, "price", isVariant)}
        onCancel={handleInlineEditCancel}
        isEditing={
          editingCell?.productId === product.id &&
          editingCell?.field === "price" &&
          editingCell?.isVariant === isVariant
        }
        type="number"
        suffix=" ₺"
        className="min-w-24"
      />
    </td>
  );

  // Stock Cell Component
  const StockCell = ({ product, isVariant = false }) => {
    const stockStatus = getStockStatus(product);
    return (
      <td
        className={`px-6 ${rowHeightClass} whitespace-nowrap ${
          isVariant ? "bg-blue-50" : ""
        }`}
        onClick={() => handleInlineEditStart(product.id, "stock", isVariant)}
      >
        <div className="flex items-center space-x-2">
          {stockStatus.icon}
          <InlineEditor
            value={product.stockQuantity || 0}
            onSave={(newStock) =>
              handleInlineEditSave(
                product.id,
                "stockQuantity",
                newStock,
                isVariant
              )
            }
            onEdit={() =>
              handleInlineEditStart(product.id, "stockQuantity", isVariant)
            }
            onCancel={handleInlineEditCancel}
            isEditing={
              editingCell?.productId === product.id &&
              editingCell?.field === "stockQuantity" &&
              editingCell?.isVariant === isVariant
            }
            type="number"
            min="0"
            className="min-w-16"
          />
        </div>
      </td>
    );
  };

  // Enhanced row rendering with variant support
  const renderProductRows = () => {
    return processedProducts.flatMap((product) => {
      const isExpanded = expandedProducts.has(product.id);
      const hasVariants =
        product.hasVariants && product.variants && product.variants.length > 0;
      const completionScore = calculateCompletionScore(product);
      const allVariantsSelected = areAllVariantsSelected(product);
      const someVariantsSelected = areSomeVariantsSelected(product);

      const rows = [];

      // Main product row
      rows.push(
        <tr
          key={product.id}
          className={`hover:bg-gray-50 ${
            tableSettings?.alternateRowColors ? "even:bg-gray-25" : ""
          } ${hasVariants ? "border-l-4 border-l-blue-400" : ""}`}
        >
          {/* Checkbox Column */}
          {isColumnVisible("checkbox") && (
            <td
              className={`px-6 ${rowHeightClass} whitespace-nowrap sticky left-0 bg-white`}
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product.id)}
                  onChange={() => onSelectProduct?.(product.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                {hasVariants && (
                  <>
                    <Button
                      onClick={() => toggleProductExpansion(product.id)}
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-6 w-6 p-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    {/* Variant bulk selection */}
                    <div className="ml-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={allVariantsSelected}
                        ref={(input) => {
                          if (input)
                            input.indeterminate =
                              someVariantsSelected && !allVariantsSelected;
                        }}
                        onChange={(e) =>
                          handleVariantBulkSelect(product.id, e.target.checked)
                        }
                        className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        title="Tüm varyantları seç"
                      />
                    </div>
                  </>
                )}
              </div>
            </td>
          )}

          {/* Product Info */}
          {isColumnVisible("product") && (
            <ProductInfoCell product={product} isVariant={false} />
          )}

          {/* Price Column */}
          {isColumnVisible("price") && (
            <PriceCell product={product} isVariant={false} />
          )}

          {/* Stock Column */}
          {isColumnVisible("stock") && (
            <StockCell product={product} isVariant={false} />
          )}

          {/* Status Column */}
          {isColumnVisible("status") && (
            <td className={`px-6 ${rowHeightClass} whitespace-nowrap`}>
              <Badge variant={getStatusVariant(product.status)}>
                {product.status === "active"
                  ? "Aktif"
                  : product.status === "inactive"
                  ? "Pasif"
                  : "Taslak"}
              </Badge>
            </td>
          )}

          {/* Category Column */}
          {isColumnVisible("category") && (
            <td
              className={`px-6 ${rowHeightClass} whitespace-nowrap text-sm text-gray-900`}
            >
              {product.category}
            </td>
          )}

          {/* Completion Score Column */}
          {isColumnVisible("completion") && (
            <td className={`px-6 ${rowHeightClass} whitespace-nowrap`}>
              <CompletionScore score={completionScore} />
            </td>
          )}

          {/* Actions Column */}
          {isColumnVisible("actions") && (
            <td
              className={`px-6 ${rowHeightClass} whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white`}
            >
              <div className="flex items-center justify-end space-x-2">
                <Button
                  onClick={() => onView?.(product)}
                  variant="ghost"
                  size="sm"
                  icon={Eye}
                  className="text-gray-400 hover:text-gray-600"
                />
                <Button
                  onClick={() => onEdit?.(product)}
                  variant="ghost"
                  size="sm"
                  icon={Edit}
                  className="text-gray-400 hover:text-blue-600"
                />
                {hasVariants && (
                  <Button
                    onClick={() => handleEditVariantGroup(product)}
                    variant="ghost"
                    size="sm"
                    icon={Settings}
                    className="text-gray-400 hover:text-blue-600"
                    title="Varyant Grubunu Yönet"
                  />
                )}
                <Button
                  onClick={() => onDelete?.(product)}
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  className="text-gray-400 hover:text-red-600"
                />
                <div className="relative">
                  <Button
                    onClick={() => onToggleMoreMenu?.(product.id)}
                    variant="ghost"
                    size="sm"
                    icon={MoreVertical}
                    className="text-gray-400 hover:text-gray-600"
                  />
                  {showMoreMenu === product.id && (
                    <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-20 min-w-48">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/product/${product.id}`
                            );
                            onToggleMoreMenu?.(null);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Linki Kopyala
                        </button>
                        <button
                          onClick={() => {
                            onView?.(product);
                            onToggleMoreMenu?.(null);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Info className="w-4 h-4 mr-2" />
                          Detayları Gör
                        </button>
                        {enableVariantManagement && (
                          <>
                            <div className="border-t border-gray-100 my-1" />
                            <button
                              onClick={() => {
                                handleEditVariantGroup(product);
                                onToggleMoreMenu?.(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Varyant Yönetimi
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </td>
          )}
        </tr>
      );

      // Variant rows (if expanded)
      if (hasVariants && isExpanded) {
        product.variants.forEach((variant, index) => {
          const variantCompletionScore = calculateCompletionScore(variant);

          rows.push(
            <tr
              key={`${product.id}-variant-${variant.id || index}`}
              className="bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-200"
            >
              {/* Checkbox Column for Variant */}
              {isColumnVisible("checkbox") && (
                <td
                  className={`px-6 ${rowHeightClass} whitespace-nowrap sticky left-0 bg-blue-50`}
                >
                  <div className="flex items-center pl-8">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(
                        `variant-${variant.id}`
                      )}
                      onChange={() =>
                        onSelectProduct?.(`variant-${variant.id}`)
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                </td>
              )}

              {/* Variant Product Info */}
              {isColumnVisible("product") && (
                <ProductInfoCell product={variant} isVariant={true} />
              )}

              {/* Variant Price */}
              {isColumnVisible("price") && (
                <PriceCell product={variant} isVariant={true} />
              )}

              {/* Variant Stock */}
              {isColumnVisible("stock") && (
                <StockCell product={variant} isVariant={true} />
              )}

              {/* Variant Status */}
              {isColumnVisible("status") && (
                <td
                  className={`px-6 ${rowHeightClass} whitespace-nowrap bg-blue-50`}
                >
                  <Badge variant={getStatusVariant(variant.status || "active")}>
                    {variant.status === "active"
                      ? "Aktif"
                      : variant.status === "inactive"
                      ? "Pasif"
                      : "Varyant"}
                  </Badge>
                </td>
              )}

              {/* Variant Category */}
              {isColumnVisible("category") && (
                <td
                  className={`px-6 ${rowHeightClass} whitespace-nowrap text-sm text-gray-700 bg-blue-50`}
                >
                  <span className="text-blue-600">Varyant</span>
                </td>
              )}

              {/* Variant Completion Score */}
              {isColumnVisible("completion") && (
                <td
                  className={`px-6 ${rowHeightClass} whitespace-nowrap bg-blue-50`}
                >
                  <CompletionScore score={variantCompletionScore} />
                </td>
              )}

              {/* Variant Actions */}
              {isColumnVisible("actions") && (
                <td
                  className={`px-6 ${rowHeightClass} whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-blue-50`}
                >
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      onClick={() => onView?.(variant)}
                      variant="ghost"
                      size="sm"
                      icon={Eye}
                      className="text-gray-400 hover:text-gray-600"
                    />
                    <Button
                      onClick={() => onEdit?.(variant)}
                      variant="ghost"
                      size="sm"
                      icon={Edit}
                      className="text-gray-400 hover:text-blue-600"
                    />
                    <Button
                      onClick={() => handleUnlinkVariant(product, variant)}
                      variant="ghost"
                      size="sm"
                      icon={Unlink}
                      className="text-gray-400 hover:text-red-600"
                      title="Varyantı Ayır"
                    />
                    <div className="relative">
                      <Button
                        onClick={() =>
                          onToggleMoreMenu?.(`variant-${variant.id}`)
                        }
                        variant="ghost"
                        size="sm"
                        icon={MoreVertical}
                        className="text-gray-400 hover:text-gray-600"
                      />
                      {showMoreMenu === `variant-${variant.id}` && (
                        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-20 min-w-48">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/product/${product.id}/variant/${variant.id}`
                                );
                                onToggleMoreMenu?.(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Varyant Linki Kopyala
                            </button>
                            <button
                              onClick={() => {
                                onView?.(variant);
                                onToggleMoreMenu?.(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Info className="w-4 h-4 mr-2" />
                              Varyant Detayları
                            </button>
                            <button
                              onClick={() => {
                                handleUnlinkVariant(product, variant);
                                onToggleMoreMenu?.(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            >
                              <Unlink className="w-4 h-4 mr-2" />
                              Varyantı Ayır
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              )}
            </tr>
          );
        });
      }

      return rows;
    });
  };

  return (
    <div className="space-y-4">
      {/* Variant Management Toolbar */}
      {enableVariantManagement && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Link className="h-5 w-5 text-blue-500" />
              <span className="font-medium text-gray-900">
                Varyant Yönetimi
              </span>
            </div>
            {suggestions.length > 0 && (
              <Badge variant="warning" className="text-xs">
                {suggestions.length} öneri
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {suggestions.length > 0 && (
              <Button
                onClick={() =>
                  setShowVariantSuggestions(!showVariantSuggestions)
                }
                variant="outline"
                size="sm"
                icon={Lightbulb}
                className="text-yellow-600"
              >
                Öneriler ({suggestions.length})
              </Button>
            )}
            <Button
              onClick={handleStartManualGrouping}
              variant="outline"
              size="sm"
              icon={GitMerge}
            >
              Manuel Gruplama
            </Button>
          </div>
        </div>
      )}

      {/* Variant Suggestions Panel */}
      {enableVariantManagement && suggestions.length > 0 && (
        <VariantSuggestionsPanel
          suggestions={suggestions}
          onAcceptSuggestion={handleAcceptSuggestion}
          onRejectSuggestion={handleRejectSuggestion}
          onViewProduct={onView}
          isExpanded={showVariantSuggestions}
          onToggleExpanded={() =>
            setShowVariantSuggestions(!showVariantSuggestions)
          }
        />
      )}

      {/* Manual Grouping Interface */}
      {showManualGrouping && (
        <ManualGroupingInterface
          availableProducts={manualGroupingProducts}
          selectedProducts={[]} // Initialize empty, will be managed internally
          onProductSelect={(product) => {
            // Handle product selection for manual grouping
          }}
          onProductDeselect={(product) => {
            // Handle product deselection for manual grouping
          }}
          onCreateGroup={handleCreateManualGroup}
          onCancel={() => setShowManualGrouping(false)}
          isProcessing={isProcessingVariants}
        />
      )}

      {/* Product Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Checkbox Header */}
              {isColumnVisible("checkbox") && (
                <th
                  className={`px-6 ${rowHeightClass} text-left sticky left-0 bg-gray-50 z-10`}
                >
                  <input
                    type="checkbox"
                    onChange={onSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
              )}

              {/* Product Header */}
              <SortHeader field="name" isVisible={isColumnVisible("product")}>
                Ürün
              </SortHeader>

              {/* Price Header */}
              <SortHeader field="price" isVisible={isColumnVisible("price")}>
                Fiyat
              </SortHeader>

              {/* Stock Header */}
              <SortHeader
                field="stockQuantity"
                isVisible={isColumnVisible("stock")}
              >
                Stok
              </SortHeader>

              {/* Status Header */}
              <SortHeader field="status" isVisible={isColumnVisible("status")}>
                Durum
              </SortHeader>

              {/* Category Header */}
              <SortHeader
                field="category"
                isVisible={isColumnVisible("category")}
              >
                Kategori
              </SortHeader>

              {/* Completion Score Header */}
              <SortHeader
                field="completionScore"
                isVisible={isColumnVisible("completion")}
              >
                Tamamlanma
              </SortHeader>

              {/* Actions Header */}
              {isColumnVisible("actions") && (
                <th
                  className={`px-6 ${rowHeightClass} text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10`}
                >
                  İşlemler
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {renderProductRows()}
          </tbody>
        </table>
      </div>

      {/* Variant Management Modal */}
      {showVariantModal && selectedVariantProduct && (
        <VariantManagementModal
          isOpen={showVariantModal}
          onClose={() => {
            setShowVariantModal(false);
            setSelectedVariantProduct(null);
          }}
          product={selectedVariantProduct}
          onSaveVariantRelationship={onUpdateVariantGroup}
          onDeleteVariantGroup={onDeleteVariantGroup}
          mode="edit"
        />
      )}
    </div>
  );
};

export default ProductTableWithVariants;
