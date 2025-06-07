// Enhanced Variant Management Components
// Components for automatic detection, manual grouping, and suggestions

import React, { useState, useCallback, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Link,
  Unlink,
  GitMerge,
  AlertCircle,
  CheckCircle,
  Eye,
  X,
  Lightbulb,
  Plus,
  Minus,
  GripVertical,
  Check,
} from "lucide-react";
import { Button, Badge, Tooltip } from "../../ui";
import { Card, CardContent, CardHeader } from "../../ui/Card";

// Variant Suggestion Card Component
export const VariantSuggestionCard = ({
  suggestion,
  onAccept,
  onReject,
  onView,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const confidenceColor = useMemo(() => {
    if (suggestion.confidence >= 0.8) return "text-green-600 bg-green-50";
    if (suggestion.confidence >= 0.6) return "text-yellow-600 bg-yellow-50";
    return "text-orange-600 bg-orange-50";
  }, [suggestion.confidence]);

  const confidenceLabel = useMemo(() => {
    if (suggestion.confidence >= 0.8) return "Yüksek";
    if (suggestion.confidence >= 0.6) return "Orta";
    return "Düşük";
  }, [suggestion.confidence]);

  return (
    <Card className={`border-l-4 border-l-blue-400 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <div>
              <h4 className="font-medium text-gray-900">
                Varyant Grubu Önerisi
              </h4>
              <p className="text-sm text-gray-500">
                {suggestion.products.length} ürün için varyant önerisi
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant="outline"
              className={`text-xs ${confidenceColor} border-current`}
            >
              {confidenceLabel} Güven
            </Badge>
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="ghost"
              size="sm"
              icon={isExpanded ? ChevronDown : ChevronRight}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Products Preview */}
        <div className="space-y-2">
          {suggestion.products
            .slice(0, isExpanded ? undefined : 2)
            .map((product, index) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-white rounded border flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">{product.sku}</p>
                  </div>
                </div>
                <Button
                  onClick={() => onView?.(product)}
                  variant="ghost"
                  size="sm"
                  icon={Eye}
                  className="opacity-60 hover:opacity-100"
                />
              </div>
            ))}

          {!isExpanded && suggestion.products.length > 2 && (
            <div className="text-center py-2">
              <Button
                onClick={() => setIsExpanded(true)}
                variant="ghost"
                size="sm"
                className="text-xs text-gray-500"
              >
                +{suggestion.products.length - 2} ürün daha
              </Button>
            </div>
          )}
        </div>

        {/* Suggestion Details */}
        {isExpanded && (
          <div className="mt-4 space-y-3">
            <div className="border-t pt-3">
              <h5 className="text-sm font-medium text-gray-900 mb-2">
                Benzerlik Detayları
              </h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Güven Skoru:</span>
                  <span className="ml-2 font-medium">
                    {Math.round(suggestion.confidence * 100)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Ortak SKU Kökü:</span>
                  <span className="ml-2 font-mono text-xs bg-gray-100 px-1 rounded">
                    {suggestion.baseSKU}
                  </span>
                </div>
              </div>
            </div>

            {suggestion.differences && suggestion.differences.length > 0 && (
              <div className="border-t pt-3">
                <h5 className="text-sm font-medium text-gray-900 mb-2">
                  Tespit Edilen Farklar
                </h5>
                <div className="space-y-1">
                  {suggestion.differences.slice(0, 3).map((diff, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 text-xs"
                    >
                      <div className="w-1 h-1 bg-blue-400 rounded-full" />
                      <span className="text-gray-600">{diff}</span>
                    </div>
                  ))}
                  {suggestion.differences.length > 3 && (
                    <div className="text-xs text-gray-500 ml-3">
                      +{suggestion.differences.length - 3} fark daha
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t">
          <Button
            onClick={() => onReject?.(suggestion)}
            variant="ghost"
            size="sm"
            icon={X}
            className="text-gray-500"
          >
            Reddet
          </Button>
          <Button
            onClick={() => onAccept?.(suggestion)}
            variant="primary"
            size="sm"
            icon={Check}
          >
            Kabul Et
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Variant Suggestions Panel Component
export const VariantSuggestionsPanel = ({
  suggestions = [],
  onAcceptSuggestion,
  onRejectSuggestion,
  onViewProduct,
  isExpanded = false,
  onToggleExpanded,
  className = "",
}) => {
  const [processingId, setProcessingId] = useState(null);

  const handleAccept = useCallback(
    async (suggestion) => {
      setProcessingId(suggestion.id);
      try {
        await onAcceptSuggestion?.(suggestion);
      } finally {
        setProcessingId(null);
      }
    },
    [onAcceptSuggestion]
  );

  const handleReject = useCallback(
    async (suggestion) => {
      setProcessingId(suggestion.id);
      try {
        await onRejectSuggestion?.(suggestion);
      } finally {
        setProcessingId(null);
      }
    },
    [onRejectSuggestion]
  );

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className={`border-l-4 border-l-yellow-400 ${className}`}>
      <CardHeader
        className="cursor-pointer hover:bg-gray-50"
        onClick={onToggleExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <div>
              <h3 className="font-medium text-gray-900">
                Akıllı Varyant Önerileri
              </h3>
              <p className="text-sm text-gray-500">
                {suggestions.length} varyant grubu önerisi mevcut
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="warning" className="text-xs">
              {suggestions.length}
            </Badge>
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <VariantSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAccept={handleAccept}
                onReject={handleReject}
                onView={onViewProduct}
                className={processingId === suggestion.id ? "opacity-50" : ""}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// Manual Grouping Product Item Component
export const ManualGroupingProductItem = ({
  product,
  isSelected = false,
  onSelect,
  onDeselect,
  isDragging = false,
  dragHandleProps,
  className = "",
}) => {
  return (
    <div
      className={`
        flex items-center space-x-3 p-3 border rounded-lg transition-all
        ${
          isSelected ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"
        }
        ${isDragging ? "shadow-lg scale-105" : "hover:border-gray-300"}
        ${className}
      `}
    >
      {/* Drag Handle */}
      <div
        {...dragHandleProps}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>

      {/* Product Image */}
      <div className="flex-shrink-0">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <span className="text-gray-400 text-xs">IMG</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
          {product.name}
        </h4>
        <p className="text-xs text-gray-500 font-mono">{product.sku}</p>
        {product.price && (
          <p className="text-xs text-gray-600">
            ₺{product.price.toLocaleString()}
          </p>
        )}
      </div>

      {/* Selection Button */}
      <div className="flex-shrink-0">
        {isSelected ? (
          <Button
            onClick={() => onDeselect?.(product)}
            variant="ghost"
            size="sm"
            icon={Minus}
            className="text-red-500 hover:text-red-700"
          />
        ) : (
          <Button
            onClick={() => onSelect?.(product)}
            variant="ghost"
            size="sm"
            icon={Plus}
            className="text-blue-500 hover:text-blue-700"
          />
        )}
      </div>
    </div>
  );
};

// Manual Grouping Interface Component
export const ManualGroupingInterface = ({
  availableProducts = [],
  selectedProducts = [],
  onProductSelect,
  onProductDeselect,
  onCreateGroup,
  onCancel,
  isProcessing = false,
  className = "",
}) => {
  const [groupName, setGroupName] = useState("");

  const handleCreateGroup = useCallback(() => {
    if (selectedProducts.length < 2) {
      return;
    }

    onCreateGroup?.({
      name: groupName || `Grup - ${selectedProducts[0].name}`,
      products: selectedProducts,
    });
  }, [selectedProducts, groupName, onCreateGroup]);

  const canCreateGroup = selectedProducts.length >= 2 && !isProcessing;

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <GitMerge className="h-5 w-5 text-blue-500" />
            <div>
              <h3 className="font-medium text-gray-900">
                Manuel Varyant Gruplama
              </h3>
              <p className="text-sm text-gray-500">
                Ürünleri sürükleyerek varyant grubu oluşturun
              </p>
            </div>
          </div>
          <Button onClick={onCancel} variant="ghost" size="sm" icon={X} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Group Name Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grup Adı (İsteğe Bağlı)
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Otomatik olarak ilk ürün adından oluşturulacak"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Products */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Mevcut Ürünler ({availableProducts.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableProducts.map((product) => (
                <ManualGroupingProductItem
                  key={product.id}
                  product={product}
                  isSelected={false}
                  onSelect={onProductSelect}
                />
              ))}
            </div>
          </div>

          {/* Selected Products */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Seçilen Ürünler ({selectedProducts.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  <GitMerge className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">
                    Varyant grubu oluşturmak için
                    <br />
                    en az 2 ürün seçin
                  </p>
                </div>
              ) : (
                selectedProducts.map((product) => (
                  <ManualGroupingProductItem
                    key={product.id}
                    product={product}
                    isSelected={true}
                    onDeselect={onProductDeselect}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            {selectedProducts.length >= 2 && (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Grup oluşturmaya hazır</span>
              </div>
            )}
            {selectedProducts.length === 1 && (
              <div className="flex items-center space-x-2 text-sm text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                <span>En az bir ürün daha seçin</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <Button onClick={onCancel} variant="ghost" disabled={isProcessing}>
              İptal
            </Button>
            <Button
              onClick={handleCreateGroup}
              variant="primary"
              disabled={!canCreateGroup}
              loading={isProcessing}
            >
              Grup Oluştur
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Enhanced Variant Display Component
export const EnhancedVariantDisplay = ({
  product,
  isExpanded = false,
  onToggleExpansion,
  onUnlinkVariant,
  onEditVariant,
  onViewVariant,
  className = "",
}) => {
  const hasVariants =
    product.hasVariants && product.variants && product.variants.length > 0;

  if (!hasVariants) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Badge variant="outline" className="text-xs text-gray-400">
          Tekil Ürün
        </Badge>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Variant Group Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            onClick={onToggleExpansion}
            variant="ghost"
            size="sm"
            icon={isExpanded ? ChevronDown : ChevronRight}
            className="h-6 w-6 p-0"
          />
          <Badge variant="primary" className="text-xs">
            <Link className="h-3 w-3 mr-1" />
            {product.variants.length} Varyant
          </Badge>
        </div>

        <Tooltip content="Varyant grubunu çöz">
          <Button
            onClick={() => onUnlinkVariant?.(product)}
            variant="ghost"
            size="sm"
            icon={Unlink}
            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
          />
        </Tooltip>
      </div>

      {/* Variant List (when expanded) */}
      {isExpanded && (
        <div className="ml-6 space-y-1">
          {product.variants.map((variant, index) => (
            <div
              key={variant.id || index}
              className="flex items-center justify-between p-2 bg-blue-50 rounded text-sm"
            >
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-200 rounded-full flex items-center justify-center text-xs">
                  {index + 1}
                </div>
                <span className="font-medium text-gray-900">
                  {variant.name}
                </span>
                <code className="text-xs bg-white px-1 rounded">
                  {variant.sku}
                </code>
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  onClick={() => onViewVariant?.(variant)}
                  variant="ghost"
                  size="sm"
                  icon={Eye}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500"
                />
                <Button
                  onClick={() => onUnlinkVariant?.(product, variant)}
                  variant="ghost"
                  size="sm"
                  icon={Unlink}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Variant Management Modal Component
export const VariantManagementModal = ({
  isOpen,
  onClose,
  product,
  onSaveVariantRelationship,
  onDeleteVariantGroup,
  mode = "view", // "view", "edit", "create"
}) => {
  const [variantData, setVariantData] = useState({
    groupName: "",
    baseProduct: null,
    variants: [],
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize variant data when modal opens
  React.useEffect(() => {
    if (isOpen && product) {
      setVariantData({
        groupName: product.variantGroupName || `${product.name} Grubu`,
        baseProduct: product,
        variants: product.variants || [],
      });
    }
  }, [isOpen, product]);

  const handleSave = useCallback(async () => {
    setIsProcessing(true);
    try {
      await onSaveVariantRelationship?.(variantData);
      onClose();
    } catch (error) {
      console.error("Error saving variant relationship:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [variantData, onSaveVariantRelationship, onClose]);

  const handleDeleteGroup = useCallback(async () => {
    if (
      !window.confirm("Bu varyant grubunu silmek istediğinizden emin misiniz?")
    ) {
      return;
    }

    setIsProcessing(true);
    try {
      await onDeleteVariantGroup?.(product);
      onClose();
    } catch (error) {
      console.error("Error deleting variant group:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [product, onDeleteVariantGroup, onClose]);

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Modal Header */}
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Varyant Grup Yönetimi
              </h3>
              <Button onClick={onClose} variant="ghost" size="sm" icon={X} />
            </div>
          </div>

          {/* Modal Content */}
          <div className="px-6 pb-6">
            <div className="space-y-6">
              {/* Group Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grup Adı
                </label>
                <input
                  type="text"
                  value={variantData.groupName}
                  onChange={(e) =>
                    setVariantData((prev) => ({
                      ...prev,
                      groupName: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={mode === "view"}
                />
              </div>

              {/* Base Product */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ana Ürün
                </label>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {product.images && product.images[0] && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-12 w-12 rounded object-cover"
                      />
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {product.name}
                      </h4>
                      <p className="text-sm text-gray-500 font-mono">
                        {product.sku}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variants List */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Varyantlar ({variantData.variants.length})
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {variantData.variants.map((variant, index) => (
                    <div
                      key={variant.id || index}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        {variant.images && variant.images[0] && (
                          <img
                            src={variant.images[0]}
                            alt={variant.name}
                            className="h-8 w-8 rounded object-cover"
                          />
                        )}
                        <div>
                          <h5 className="text-sm font-medium text-gray-900">
                            {variant.name}
                          </h5>
                          <p className="text-xs text-gray-500 font-mono">
                            {variant.sku}
                          </p>
                        </div>
                      </div>

                      {mode !== "view" && (
                        <Button
                          onClick={() => {
                            setVariantData((prev) => ({
                              ...prev,
                              variants: prev.variants.filter(
                                (_, i) => i !== index
                              ),
                            }));
                          }}
                          variant="ghost"
                          size="sm"
                          icon={X}
                          className="text-red-500 hover:text-red-700"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
            <div>
              {mode !== "view" && (
                <Button
                  onClick={handleDeleteGroup}
                  variant="danger"
                  disabled={isProcessing}
                  className="text-sm"
                >
                  Grubu Sil
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <Button onClick={onClose} variant="ghost" disabled={isProcessing}>
                {mode === "view" ? "Kapat" : "İptal"}
              </Button>
              {mode !== "view" && (
                <Button
                  onClick={handleSave}
                  variant="primary"
                  disabled={isProcessing || !variantData.groupName.trim()}
                  loading={isProcessing}
                >
                  Kaydet
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const VariantComponents = {
  VariantSuggestionCard,
  VariantSuggestionsPanel,
  ManualGroupingInterface,
  EnhancedVariantDisplay,
  VariantManagementModal,
};

export default VariantComponents;
