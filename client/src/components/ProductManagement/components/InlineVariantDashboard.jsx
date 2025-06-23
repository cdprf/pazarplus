import React, { useState, useCallback } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Upload,
  DollarSign,
  Package,
  Settings,
  ChevronDown,
  ChevronRight,
  Globe,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronLeft,
} from "lucide-react";
import { Button, Badge, Tooltip } from "../../ui";
import MediaUploadComponent from "./MediaUploadComponent.jsx";

/**
 * Inline Variant Dashboard
 * Comprehensive variant management interface accessed from main product detail view
 */
const InlineVariantDashboard = ({
  mainProduct,
  onUpdate,
  onCreateVariant,
  onEditVariant,
  onUpdateVariant,
  onDeleteVariant,
  onPublishVariant,
  onUpdateStock,
  onUploadMedia,
  onBackToList,
  loading,
}) => {
  const [activeTab, setActiveTab] = useState("variants");
  const [expandedVariants, setExpandedVariants] = useState(new Set());
  const [bulkSelection, setBulkSelection] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Platform configurations
  const platforms = [
    { id: "trendyol", name: "Trendyol", color: "orange", icon: "🛒" },
    { id: "hepsiburada", name: "Hepsiburada", color: "blue", icon: "🏪" },
    { id: "n11", name: "N11", color: "purple", icon: "🛍️" },
    { id: "amazon", name: "Amazon", color: "yellow", icon: "📦" },
    { id: "gittigidiyor", name: "GittiGidiyor", color: "red", icon: "🛒" },
  ];

  const tabs = [
    { id: "variants", label: "Platform Variants", icon: Globe },
    { id: "stock", label: "Stock Management", icon: Package },
    { id: "media", label: "Media Management", icon: Upload },
    { id: "pricing", label: "Pricing Strategy", icon: DollarSign },
    { id: "templates", label: "Templates", icon: Settings },
  ];

  // Toggle variant expansion
  const toggleVariantExpansion = useCallback((variantId) => {
    setExpandedVariants((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(variantId)) {
        newSet.delete(variantId);
      } else {
        newSet.add(variantId);
      }
      return newSet;
    });
  }, []);

  // Bulk selection handlers
  const toggleBulkSelection = useCallback((variantId) => {
    setBulkSelection((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(variantId)) {
        newSet.delete(variantId);
      } else {
        newSet.add(variantId);
      }
      return newSet;
    });
  }, []);

  const selectAllVariants = useCallback(() => {
    const allVariantIds = mainProduct.platformVariants.map((v) => v.id);
    setBulkSelection(new Set(allVariantIds));
  }, [mainProduct.platformVariants]);

  const clearBulkSelection = useCallback(() => {
    setBulkSelection(new Set());
  }, []);

  // Status formatting helpers
  const getSyncStatusBadge = (syncStatus) => {
    const configs = {
      success: { variant: "success", icon: CheckCircle, label: "Synced" },
      pending: { variant: "warning", icon: Clock, label: "Pending" },
      error: { variant: "danger", icon: AlertTriangle, label: "Error" },
      syncing: { variant: "info", icon: Clock, label: "Syncing" },
    };

    const config = configs[syncStatus] || configs.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPlatformBadge = (platform) => {
    const platformConfig = platforms.find((p) => p.id === platform);
    if (!platformConfig) return null;

    return (
      <Badge
        variant="outline"
        className={`border-${platformConfig.color}-300 text-${platformConfig.color}-700`}
      >
        <span className="mr-1">{platformConfig.icon}</span>
        {platformConfig.name}
      </Badge>
    );
  };

  // Render variant row
  const renderVariantRow = (variant) => {
    const isExpanded = expandedVariants.has(variant.id);
    const isSelected = bulkSelection.has(variant.id);

    return (
      <div key={variant.id} className="border rounded-lg mb-4 overflow-hidden">
        {/* Variant Header */}
        <div className="bg-gray-50 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleBulkSelection(variant.id)}
              className="rounded border-gray-300"
            />

            <button
              onClick={() => toggleVariantExpansion(variant.id)}
              className="flex items-center space-x-2 text-left"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
              <div>
                <div className="font-medium">{variant.platformSku}</div>
                <div className="text-sm text-gray-500">
                  {variant.platformTitle || mainProduct.name}
                </div>
              </div>
            </button>

            {getPlatformBadge(variant.platform)}
            {getSyncStatusBadge(variant.syncStatus)}

            {variant.isPublished && <Badge variant="success">Published</Badge>}
          </div>

          <div className="flex items-center space-x-2">
            {variant.platformPrice && (
              <span className="font-medium text-green-600">
                ₺{variant.platformPrice.toLocaleString()}
              </span>
            )}

            <Tooltip content="Edit Variant">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditVariant && onEditVariant(variant)}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </Tooltip>

            {variant.externalUrl && (
              <Tooltip content="View on Platform">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(variant.externalUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Tooltip>
            )}

            <Tooltip content="Delete Variant">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteVariant(variant.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* Expanded Variant Details */}
        {isExpanded && (
          <div className="p-4 border-t bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Basic Information */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Basic Information</h4>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-gray-500">Platform SKU:</span>{" "}
                    {variant.platformSku}
                  </div>
                  <div>
                    <span className="text-gray-500">Barcode:</span>{" "}
                    {variant.platformBarcode || "N/A"}
                  </div>
                  <div>
                    <span className="text-gray-500">Category:</span>{" "}
                    {variant.platformCategory || mainProduct.category}
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <Badge
                      variant={
                        variant.status === "active" ? "success" : "secondary"
                      }
                      className="ml-2"
                    >
                      {variant.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Pricing Information */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Pricing</h4>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-gray-500">Strategy:</span>
                    <Badge
                      variant={variant.useMainPrice ? "info" : "warning"}
                      className="ml-2"
                    >
                      {variant.useMainPrice
                        ? "Inherit from Main"
                        : "Custom Price"}
                    </Badge>
                  </div>
                  {variant.platformPrice && (
                    <div>
                      <span className="text-gray-500">Platform Price:</span> ₺
                      {variant.platformPrice.toLocaleString()}
                    </div>
                  )}
                  {variant.priceMarkup && (
                    <div>
                      <span className="text-gray-500">Markup:</span>{" "}
                      {variant.priceMarkup}%
                    </div>
                  )}
                </div>
              </div>

              {/* Sync Information */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Sync Status</h4>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-gray-500">Last Sync:</span>{" "}
                    {variant.lastSyncAt
                      ? new Date(variant.lastSyncAt).toLocaleDateString()
                      : "Never"}
                  </div>
                  <div>
                    <span className="text-gray-500">Published:</span>{" "}
                    {variant.publishedAt
                      ? new Date(variant.publishedAt).toLocaleDateString()
                      : "Not published"}
                  </div>
                  {variant.syncError && (
                    <div className="text-red-600 text-xs bg-red-50 p-2 rounded">
                      {variant.syncError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Platform-specific Attributes */}
            {variant.platformAttributes &&
              Object.keys(variant.platformAttributes).length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Platform Attributes
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(variant.platformAttributes).map(
                      ([key, value]) => (
                        <div key={key}>
                          <span className="text-gray-500">{key}:</span> {value}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Action Buttons */}
            <div className="mt-4 flex space-x-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onPublishVariant(variant.id)}
                disabled={variant.isPublished}
              >
                {variant.isPublished ? "Published" : "Publish to Platform"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditVariant && onEditVariant(variant)}
              >
                Edit Details
              </Button>

              {variant.syncStatus === "error" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPublishVariant(variant.id, true)}
                >
                  Retry Sync
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render variants tab
  const renderVariantsTab = () => (
    <div className="space-y-4">
      {/* Header with bulk actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium">
            Platform Variants ({mainProduct.platformVariants?.length || 0})
          </h3>

          {bulkSelection.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {bulkSelection.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkActions(!showBulkActions)}
              >
                Bulk Actions
              </Button>
              <Button variant="ghost" size="sm" onClick={clearBulkSelection}>
                Clear
              </Button>
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          {mainProduct.platformVariants?.length > 0 && (
            <Button variant="outline" size="sm" onClick={selectAllVariants}>
              Select All
            </Button>
          )}

          <Button
            variant="primary"
            onClick={() => onCreateVariant && onCreateVariant()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Platform Variant
          </Button>
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {showBulkActions && bulkSelection.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-blue-900">Bulk Actions</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBulkActions(false)}
            >
              ×
            </Button>
          </div>
          <div className="mt-3 flex space-x-2">
            <Button variant="outline" size="sm">
              Publish Selected
            </Button>
            <Button variant="outline" size="sm">
              Update Prices
            </Button>
            <Button variant="outline" size="sm">
              Sync with Platforms
            </Button>
            <Button variant="outline" size="sm" className="text-red-600">
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Variants List */}
      <div className="space-y-2">
        {mainProduct.platformVariants?.length > 0 ? (
          mainProduct.platformVariants.map(renderVariantRow)
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Globe className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No platform variants yet</p>
            <p className="text-sm">
              Create variants to publish this product to different platforms
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Render stock management tab
  const renderStockTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Stock Management</h3>

      {/* Stock Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Total Stock</p>
              <p className="text-2xl font-bold text-blue-900">
                {mainProduct.stockStatus?.totalStock || 0}
              </p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600">Reserved</p>
              <p className="text-2xl font-bold text-yellow-900">
                {mainProduct.stockStatus?.reservedStock || 0}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Available</p>
              <p className="text-2xl font-bold text-green-900">
                {mainProduct.stockStatus?.availableStock || 0}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Stock Actions */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium mb-4">Stock Actions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update Stock Quantity
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                min="0"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                placeholder="New quantity"
              />
              <Button onClick={() => console.log("Update stock")}>
                Update
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reserve Stock
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                min="1"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                placeholder="Quantity to reserve"
              />
              <Button variant="outline">Reserve</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {mainProduct.stockStatus?.isLowStock && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <h4 className="font-medium text-red-900">Low Stock Alert</h4>
              <p className="text-sm text-red-700">
                Stock is below minimum level ({mainProduct.minStockLevel} units)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Main render
  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBackToList && (
            <Button
              variant="ghost"
              onClick={onBackToList}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Ana Ürün Listesi
            </Button>
          )}

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mainProduct?.title || "Ürün Detayları"}
            </h1>
            <p className="text-gray-600">
              {mainProduct?.stockCode && `SKU: ${mainProduct.stockCode}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Yükleniyor...</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-lg">
        {/* Tab Navigation */}
        <div className="border-b bg-gray-50">
          <nav className="flex space-x-1 p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    activeTab === tab.id
                      ? "bg-white text-blue-600 border border-gray-200"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "variants" && renderVariantsTab()}
          {activeTab === "stock" && renderStockTab()}
          {activeTab === "media" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Main Product Media
                </h3>
                <MediaUploadComponent
                  mainProductId={mainProduct.id}
                  existingMedia={mainProduct.mediaAssets || []}
                  onMediaUploaded={(newMedia) => {
                    // Update the main product with new media
                    onUpdate({
                      ...mainProduct,
                      mediaAssets: [
                        ...(mainProduct.mediaAssets || []),
                        ...newMedia,
                      ],
                    });
                  }}
                />
              </div>

              {/* Platform-specific media sections */}
              {mainProduct.platformVariants?.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Platform-Specific Media
                  </h3>
                  {mainProduct.platformVariants.map((variant) => (
                    <div key={variant.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">
                          {variant.platform.charAt(0).toUpperCase() +
                            variant.platform.slice(1)}{" "}
                          - {variant.platformSku}
                        </h4>
                        <Badge
                          variant={
                            variant.status === "published"
                              ? "success"
                              : variant.status === "draft"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {variant.status}
                        </Badge>
                      </div>
                      <MediaUploadComponent
                        mainProductId={mainProduct.id}
                        variantId={variant.id}
                        existingMedia={variant.mediaAssets || []}
                        onMediaUploaded={(newMedia) => {
                          // Update the variant with new media
                          const updatedVariants =
                            mainProduct.platformVariants.map((v) =>
                              v.id === variant.id
                                ? {
                                    ...v,
                                    mediaAssets: [
                                      ...(v.mediaAssets || []),
                                      ...newMedia,
                                    ],
                                  }
                                : v
                            );
                          onUpdate({
                            ...mainProduct,
                            platformVariants: updatedVariants,
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === "pricing" && <div>Pricing Strategy (Coming Soon)</div>}
          {activeTab === "templates" && <div>Templates (Coming Soon)</div>}
        </div>
      </div>
    </div>
  );
};

export default InlineVariantDashboard;
