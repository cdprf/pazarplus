import logger from "../../../utils/logger";
// Enhanced ProductTableWithVariants with AI-Powered Variant Management
// Integrates with Product Intelligence API for advanced pattern detection and suggestions

import React, { useState, useCallback, useMemo, useEffect } from "react";
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
import IntelligentVariantPanel from "./IntelligentVariantPanel";
import IntelligentAnalysisConfig from "./IntelligentAnalysisConfig";
import ProductIntelligenceApi from "../../../services/productIntelligenceApi";
import {
  VariantManagementModal,
  EnhancedVariantDisplay,
  ManualGroupingInterface,
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
  const [showVariantSuggestions, setShowVariantSuggestions] = useState(false);
  const [showManualGrouping, setShowManualGrouping] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [showPatternManagement, setShowPatternManagement] = useState(false);
  const [selectedVariantProduct, setSelectedVariantProduct] = useState(null);
  const [manualGroupingProducts, setManualGroupingProducts] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  // AI Analysis configuration
  const [analysisConfig, setAnalysisConfig] = useState({
    sensitivity: 0.8,
    minConfidence: 0.6,
    minGroupSize: 2,
    detectVariants: true,
    analyzeNaming: true,
    analyzeClassification: true,
    generateSuggestions: true,
    enableMultiLanguage: true,
    enableBrandGrouping: true,
    enableSizeColorVariants: true,
    enablePriceAnalysis: true,
    enableCategoryGrouping: true,
    maxPatternLength: 5,
    enableSmartExclusions: true,
    useAiEnhancement: true,
    enableLearning: true,
    batchSize: 100,
    maxAnalysisTime: 30000,
  });

  // Analysis results state
  const [analysisResults, setAnalysisResults] = useState({
    suggestions: [],
    statistics: {},
    variantGroups: [],
    patterns: [],
    error: null,
  });

  // API-based analysis functions
  const performApiAnalysis = useCallback(
    async (forceRefresh = false) => {
      if (!enableVariantManagement || products.length === 0) {
        setAnalysisResults({
          suggestions: [],
          statistics: {},
          variantGroups: [],
          patterns: [],
          error: null,
        });
        return;
      }

      // Skip if already analyzing or recent analysis exists
      if (
        isAnalyzing ||
        (!forceRefresh &&
          lastAnalysisTime &&
          Date.now() - lastAnalysisTime < 30000)
      ) {
        return;
      }

      setIsAnalyzing(true);
      setAnalysisError(null);

      try {
        const api = new ProductIntelligenceApi();

        // Perform complete analysis using the API
        const analysisResult = await api.performCompleteAnalysis(
          products,
          analysisConfig
        );

        if (analysisResult.success) {
          setAnalysisResults({
            suggestions: analysisResult.data.suggestions || [],
            statistics: analysisResult.data.statistics || {},
            variantGroups: analysisResult.data.variantGroups || [],
            patterns: analysisResult.data.patterns || [],
            error: null,
          });
          setLastAnalysisTime(Date.now());
        } else {
          throw new Error(analysisResult.error?.message || "Analysis failed");
        }
      } catch (error) {
        logger.error("API Analysis failed:", error);
        setAnalysisError(error.message);
        setAnalysisResults({
          suggestions: [],
          statistics: {},
          variantGroups: [],
          patterns: [],
          error: error.message,
        });
      } finally {
        setIsAnalyzing(false);
      }
    },
    [
      products,
      enableVariantManagement,
      analysisConfig,
      isAnalyzing,
      lastAnalysisTime,
    ]
  );

  // Trigger analysis when products or config changes
  useEffect(() => {
    performApiAnalysis();
  }, [performApiAnalysis]);

  // Process products with API-based analysis results
  const processedProductsData = useMemo(() => {
    if (!enableVariantManagement) {
      return {
        products,
        suggestions: [],
        analysis: analysisResults,
        apiAnalysis: analysisResults,
      };
    }

    // Use the results from API analysis
    const { suggestions, variantGroups, patterns, statistics } =
      analysisResults;

    // Process products to include variant information from API results
    const processedProducts = products.map((product) => {
      const variantGroup = variantGroups.find((group) =>
        group.products.some((p) => p.id === product.id)
      );

      if (variantGroup) {
        return {
          ...product,
          hasVariants: true,
          variantGroup: variantGroup.id,
          variants: variantGroup.products.filter((p) => p.id !== product.id),
          isMainVariant: variantGroup.mainProductId === product.id,
        };
      }

      return product;
    });

    return {
      products: processedProducts,
      suggestions: suggestions || [],
      analysis: analysisResults,
      apiAnalysis: analysisResults,
      statistics,
      patterns,
    };
  }, [products, analysisResults, enableVariantManagement]);

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

  // Enhanced variant suggestion handlers with API feedback
  const handleAcceptSuggestion = useCallback(
    async (suggestion) => {
      setIsAnalyzing(true);
      try {
        await onAcceptVariantSuggestion?.(suggestion);

        // Send feedback to API for learning
        const api = new ProductIntelligenceApi();
        await api.submitFeedback({
          suggestionId: suggestion.id,
          action: "accepted",
          confidence: suggestion.confidence,
          timestamp: Date.now(),
          metadata: {
            source: suggestion.source,
            type: suggestion.type,
          },
        });

        // Refresh analysis to get updated suggestions
        setTimeout(() => performApiAnalysis(true), 1000);
      } catch (error) {
        logger.error("Error accepting suggestion:", error);
        setAnalysisError("Failed to accept suggestion");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [onAcceptVariantSuggestion, performApiAnalysis]
  );

  const handleRejectSuggestion = useCallback(
    async (suggestion) => {
      setIsAnalyzing(true);
      try {
        await onRejectVariantSuggestion?.(suggestion);

        // Send feedback to API for learning
        const api = new ProductIntelligenceApi();
        await api.submitFeedback({
          suggestionId: suggestion.id,
          action: "rejected",
          confidence: suggestion.confidence,
          timestamp: Date.now(),
          reason: "user_rejected",
          metadata: {
            source: suggestion.source,
            type: suggestion.type,
          },
        });

        // Refresh analysis to get updated suggestions
        setTimeout(() => performApiAnalysis(true), 1000);
      } catch (error) {
        logger.error("Error rejecting suggestion:", error);
        setAnalysisError("Failed to reject suggestion");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [onRejectVariantSuggestion, performApiAnalysis]
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
      setIsAnalyzing(true);
      try {
        await onCreateVariantGroup?.(groupData);

        // Send feedback to API for learning from manual grouping
        const api = new ProductIntelligenceApi();
        await api.submitFeedback({
          action: "manual_group_created",
          groupData,
          products: groupData.products,
          timestamp: Date.now(),
          type: "manual",
          metadata: {
            groupName: groupData.name,
            productCount: groupData.products.length,
          },
        });

        setShowManualGrouping(false);
        setManualGroupingProducts([]);

        // Refresh analysis to get updated suggestions
        setTimeout(() => performApiAnalysis(true), 1000);
      } catch (error) {
        logger.error("Error creating manual group:", error);
        setAnalysisError("Failed to create manual group");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [onCreateVariantGroup, performApiAnalysis]
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

  const SortHeader = ({
    field,
    children,
    isVisible = true,
    className = "",
  }) => {
    if (!isVisible) return null;

    return (
      <th
        className={`px-6 ${rowHeightClass} text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 ${
          tableSettings?.stickyHeaders ? "sticky top-0 bg-gray-50 z-10" : ""
        } ${className}`}
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
        className={`table-col-product px-6 ${rowHeightClass} ${
          !isVariant ? "table-sticky-left-2" : "bg-blue-50"
        }`}
      >
        <div className={`product-info-cell ${isVariant ? "ml-8" : ""}`}>
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

          <div className="ml-4 flex-1 product-name-container">
            <div className="text-sm font-medium text-gray-900 product-name-text mb-1">
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
      className={`table-col-price px-6 ${rowHeightClass} ${
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
        className="min-w-20 w-full"
        min="0"
        step="0.01"
      />
    </td>
  );

  // Stock Cell Component
  const StockCell = ({ product, isVariant = false }) => {
    const stockStatus = getStockStatus(product);
    return (
      <td
        className={`table-col-stock px-6 ${rowHeightClass} ${
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
            className="min-w-16 w-full"
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
            <td className="table-col-checkbox table-sticky-left-1 px-6 py-3">
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
            <td className="table-col-status px-6 py-3">
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
            <td className="table-col-category px-6 py-3 text-sm text-gray-900">
              <span className="category-cell-content">{product.category}</span>
            </td>
          )}

          {/* Completion Score Column */}
          {isColumnVisible("completion") && (
            <td className="table-col-completion px-6 py-3">
              <CompletionScore score={completionScore} />
            </td>
          )}

          {/* Actions Column */}
          {isColumnVisible("actions") && (
            <td className="table-col-actions table-sticky-right px-6 py-3 text-right text-sm font-medium">
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
                  className={`w-16 px-6 ${rowHeightClass} sticky left-0 bg-blue-50 z-10 border-r border-gray-200`}
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
                <td className={`w-28 px-6 ${rowHeightClass} bg-blue-50`}>
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
                  className={`w-40 px-6 ${rowHeightClass} text-sm text-gray-700 bg-blue-50`}
                >
                  <span className="text-blue-600 truncate block">Varyant</span>
                </td>
              )}

              {/* Variant Completion Score */}
              {isColumnVisible("completion") && (
                <td className={`w-32 px-6 ${rowHeightClass} bg-blue-50`}>
                  <CompletionScore score={variantCompletionScore} />
                </td>
              )}

              {/* Variant Actions */}
              {isColumnVisible("actions") && (
                <td
                  className={`w-40 px-6 ${rowHeightClass} text-right text-sm font-medium sticky right-0 bg-blue-50 z-10 border-l border-gray-200`}
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
              onClick={() => setShowPatternManagement(!showPatternManagement)}
              variant="outline"
              size="sm"
              icon={Settings}
              className="text-blue-600"
            >
              Akıllı Algılama
            </Button>
            <Button
              onClick={handleStartManualGrouping}
              variant="outline"
              size="sm"
              icon={GitMerge}
            >
              Manuel Gruplama
            </Button>

            {/* Analysis Configuration */}
            <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-gray-200">
              <span className="text-sm text-gray-600">Hassasiyet:</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={analysisConfig.sensitivity}
                onChange={(e) =>
                  setAnalysisConfig((prev) => ({
                    ...prev,
                    sensitivity: parseFloat(e.target.value),
                  }))
                }
                className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-500">
                {Math.round(analysisConfig.sensitivity * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Intelligent Variant Suggestions Panel */}
      {enableVariantManagement && suggestions.length > 0 && (
        <IntelligentVariantPanel
          suggestions={suggestions}
          onAcceptSuggestion={handleAcceptSuggestion}
          onRejectSuggestion={handleRejectSuggestion}
          onViewProduct={onView}
          isExpanded={showVariantSuggestions}
          onToggleExpanded={() =>
            setShowVariantSuggestions(!showVariantSuggestions)
          }
          isAnalyzing={isAnalyzing}
          analysisConfig={analysisConfig}
        />
      )}

      {/* Enhanced Analysis Interface */}
      {enableVariantManagement && showPatternManagement && (
        <IntelligentAnalysisConfig
          config={analysisConfig}
          onConfigChange={setAnalysisConfig}
          onClose={() => setShowPatternManagement(false)}
          onAnalyze={() => performApiAnalysis(true)}
          isAnalyzing={isAnalyzing}
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
          isProcessing={isAnalyzing}
        />
      )}

      {/* Enhanced Analysis Summary */}
      {enableVariantManagement && analysisResults && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {analysisResults.variantGroups?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Varyant Grupları</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analysisResults.patterns?.length || 0}
              </div>
              <div className="text-sm text-gray-600">
                Tespit Edilen Desenler
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {suggestions.length}
              </div>
              <div className="text-sm text-gray-600">Toplam Öneri</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(analysisConfig.sensitivity * 100)}%
              </div>
              <div className="text-sm text-gray-600">Hassasiyet</div>
            </div>
          </div>

          {analysisResults.patterns && analysisResults.patterns.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="text-sm text-gray-700">
                <strong>API Tespit Edilen Desenler:</strong>{" "}
                {analysisResults.patterns.slice(0, 3).map((pattern, index) => (
                  <span
                    key={index}
                    className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2"
                  >
                    {pattern.name || pattern.type}
                  </span>
                ))}
                {analysisResults.patterns.length > 3 && (
                  <span className="text-gray-500">
                    +{analysisResults.patterns.length - 3} daha
                  </span>
                )}
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="flex items-center justify-center text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                API Analizi Yapılıyor...
              </div>
            </div>
          )}

          {analysisError && (
            <div className="mt-3 pt-3 border-t border-red-200">
              <div className="text-sm text-red-600">
                <strong>Hata:</strong> {analysisError}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product Table */}
      <div className="enhanced-table-container">
        <table className="enhanced-table">
          <thead className="table-header-sticky">
            <tr>
              {/* Checkbox Header */}
              {isColumnVisible("checkbox") && (
                <th className="table-col-checkbox table-header-sticky table-sticky-left-1 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    onChange={onSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
              )}

              {/* Product Header */}
              <SortHeader
                field="name"
                isVisible={isColumnVisible("product")}
                className="table-col-product table-header-sticky table-sticky-left-2"
              >
                Ürün
              </SortHeader>

              {/* Price Header */}
              <SortHeader
                field="price"
                isVisible={isColumnVisible("price")}
                className="table-col-price table-header-sticky"
              >
                Fiyat
              </SortHeader>

              {/* Stock Header */}
              <SortHeader
                field="stockQuantity"
                isVisible={isColumnVisible("stock")}
                className="table-col-stock table-header-sticky"
              >
                Stok
              </SortHeader>

              {/* Status Header */}
              <SortHeader
                field="status"
                isVisible={isColumnVisible("status")}
                className="table-col-status table-header-sticky"
              >
                Durum
              </SortHeader>

              {/* Category Header */}
              <SortHeader
                field="category"
                isVisible={isColumnVisible("category")}
                className="table-col-category table-header-sticky"
              >
                Kategori
              </SortHeader>

              {/* Completion Score Header */}
              <SortHeader
                field="completionScore"
                isVisible={isColumnVisible("completion")}
                className="table-col-completion table-header-sticky"
              >
                Tamamlanma
              </SortHeader>

              {/* Actions Header */}
              {isColumnVisible("actions") && (
                <th className="table-col-actions table-header-sticky table-sticky-right px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
