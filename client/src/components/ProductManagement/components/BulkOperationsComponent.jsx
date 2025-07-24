import logger from "../../../utils/logger";
/**
 * Enhanced Product Bulk Actions - Component for bulk operations on selected products
 * Implements Pazar+ Design System patterns with advanced product management features
 * Features: Multi-platform publishing, price management, inventory sync, category operations
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import {
  Loader2,
  DollarSign,
  Package,
  Globe,
  Edit3,
  Trash2,
  Upload,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
  Copy,
  Share2,
  Archive,
  Star,
  TrendingUp,
  Filter,
  Settings,
  PlayCircle,
  StopCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  Plus,
  CheckSquare,
  Square,
  RotateCcw,
  X,
  Calendar,
  Tag,
  AlertCircle,
} from "lucide-react";
import { Button, Badge } from "../../ui";
import { useAlert } from "../../../contexts/AlertContext";
import { API_BASE_URL } from "../utils/constants";

// Enhanced product bulk actions with categories
const ENHANCED_PRODUCT_BULK_ACTIONS = {
  // Product Management
  productManagement: {
    label: "Ürün Yönetimi",
    icon: Package,
    actions: {
      edit: {
        label: "Toplu Düzenle",
        icon: Edit3,
        variant: "primary",
        color: "primary",
        description: "Seçili ürünlerin bilgilerini toplu olarak düzenle",
        batchSize: 20,
        estimatedTime: 2,
        fields: ["name", "description", "category", "brand", "tags"],
      },
      duplicate: {
        label: "Toplu Kopyala",
        icon: Copy,
        variant: "outline",
        color: "info",
        description: "Seçili ürünlerin kopyalarını oluştur",
        confirmRequired: true,
        batchSize: 10,
        estimatedTime: 3,
      },
      archive: {
        label: "Arşivle",
        icon: Archive,
        variant: "outline",
        color: "warning",
        description: "Seçili ürünleri arşivle",
        batchSize: 50,
        estimatedTime: 1,
        reversible: true,
      },
    },
  },

  // Status & Visibility
  statusManagement: {
    label: "Durum & Görünürlük",
    icon: Eye,
    actions: {
      activate: {
        label: "Aktifleştir",
        icon: CheckCircle,
        variant: "primary",
        color: "success",
        description: "Seçili ürünleri aktif duruma getir",
        batchSize: 100,
        estimatedTime: 0.5,
      },
      deactivate: {
        label: "Pasifleştir",
        icon: XCircle,
        variant: "outline",
        color: "warning",
        description: "Seçili ürünleri pasif duruma getir",
        confirmRequired: true,
        batchSize: 100,
        estimatedTime: 0.5,
      },
      feature: {
        label: "Öne Çıkar",
        icon: Star,
        variant: "outline",
        color: "warning",
        description: "Seçili ürünleri öne çıkarılmış olarak işaretle",
        batchSize: 25,
        estimatedTime: 1,
      },
    },
  },

  // Pricing & Inventory
  pricingInventory: {
    label: "Fiyat & Stok",
    icon: DollarSign,
    actions: {
      price_update: {
        label: "Fiyat Güncelle",
        icon: DollarSign,
        variant: "primary",
        color: "success",
        description: "Seçili ürünlerin fiyatlarını toplu güncelle",
        requiresOptions: true,
        batchSize: 50,
        estimatedTime: 1,
        options: ["percentage", "fixed", "formula"],
      },
      stock_sync: {
        label: "Stok Senkronize",
        icon: RefreshCw,
        variant: "outline",
        color: "info",
        description: "Seçili ürünlerin stok bilgilerini senkronize et",
        batchSize: 30,
        estimatedTime: 2,
      },
      stock_update: {
        label: "Stok Güncelle",
        icon: BarChart3,
        variant: "outline",
        color: "primary",
        description: "Seçili ürünlerin stok miktarlarını güncelle",
        requiresOptions: true,
        batchSize: 75,
        estimatedTime: 1,
        options: ["set", "increase", "decrease"],
      },
    },
  },

  // Platform Operations
  platformOperations: {
    label: "Platform İşlemleri",
    icon: Globe,
    actions: {
      publish: {
        label: "Platformlara Yayınla",
        icon: Share2,
        variant: "primary",
        color: "primary",
        description: "Seçili ürünleri seçilen platformlara yayınla",
        requiresOptions: true,
        confirmRequired: true,
        batchSize: 5,
        estimatedTime: 10,
        platforms: ["trendyol", "hepsiburada", "n11", "amazon"],
      },
      sync_platforms: {
        label: "Platform Senkronize",
        icon: RefreshCw,
        variant: "outline",
        color: "info",
        description: "Seçili ürünleri platformlarla senkronize et",
        batchSize: 10,
        estimatedTime: 5,
      },
      unpublish: {
        label: "Platformlardan Kaldır",
        icon: XCircle,
        variant: "outline",
        color: "warning",
        description: "Seçili ürünleri seçilen platformlardan kaldır",
        requiresOptions: true,
        confirmRequired: true,
        destructive: true,
        batchSize: 10,
        estimatedTime: 3,
      },
    },
  },

  // Category & Organization
  categoryOrganization: {
    label: "Kategori & Düzenleme",
    icon: Layers,
    actions: {
      categorize: {
        label: "Kategori Değiştir",
        icon: Tag,
        variant: "outline",
        color: "info",
        description: "Seçili ürünlerin kategorisini değiştir",
        requiresOptions: true,
        batchSize: 100,
        estimatedTime: 0.5,
      },
      tag_add: {
        label: "Etiket Ekle",
        icon: Plus,
        variant: "outline",
        color: "info",
        description: "Seçili ürünlere etiket ekle",
        requiresOptions: true,
        batchSize: 100,
        estimatedTime: 0.5,
      },
      variant_create: {
        label: "Varyant Oluştur",
        icon: Layers,
        variant: "primary",
        color: "primary",
        description: "Seçili ürünler için varyant oluştur",
        requiresOptions: true,
        confirmRequired: true,
        batchSize: 5,
        estimatedTime: 15,
      },
    },
  },

  // Data Operations
  dataOperations: {
    label: "Veri İşlemleri",
    icon: Download,
    actions: {
      export: {
        label: "Excel İndir",
        icon: Download,
        variant: "outline",
        color: "info",
        description: "Seçili ürünleri Excel formatında indir",
        generatesPDF: true,
        batchSize: 1000,
        estimatedTime: 0.1,
      },
      import: {
        label: "Veri İçe Aktar",
        icon: Upload,
        variant: "outline",
        color: "primary",
        description: "Seçili ürünler için veri içe aktar",
        requiresFile: true,
        batchSize: 50,
        estimatedTime: 2,
      },
      analytics_export: {
        label: "Analitik Raporu",
        icon: TrendingUp,
        variant: "outline",
        color: "success",
        description: "Seçili ürünler için detaylı analitik raporu oluştur",
        generatesPDF: true,
        batchSize: 100,
        estimatedTime: 1,
      },
    },
  },

  // Destructive Actions
  destructiveActions: {
    label: "Dikkatli İşlemler",
    icon: AlertTriangle,
    actions: {
      delete: {
        label: "Toplu Sil",
        icon: Trash2,
        variant: "outline",
        color: "danger",
        description: "Seçili ürünleri kalıcı olarak sil",
        confirmRequired: true,
        requiresConfirmation: true,
        destructive: true,
        irreversible: true,
        batchSize: 10,
        estimatedTime: 2,
      },
    },
  },
};

const EnhancedProductBulkActions = ({
  selectedProducts = [],
  products = [],
  onBulkAction,
  onClearSelection,
  loading = false,
  className = "",
  // Enhanced props
  onUndo,
  recentActions = [],
  platformConnections = [],
  categories = [],
  enableAdvancedOptions = true,
  enableBatchProcessing = true,
  onBulkEdit,
  onBulkExport,
}) => {
  // State management
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [processingStatus, setProcessingStatus] = useState({
    current: 0,
    total: 0,
    currentItem: "",
    action: null,
    canCancel: false,
    errors: [],
    results: [],
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [actionOptions, setActionOptions] = useState({});

  // Refs
  const processingRef = useRef({ cancelled: false });
  const timeoutRef = useRef(null);

  // Computed values
  const selectedCount = selectedProducts.length;
  const selectedProductsData = useMemo(() => {
    return products.filter((product) => selectedProducts.includes(product.id));
  }, [selectedProducts, products]);

  // Calculate action eligibility based on product states
  const eligibleActions = useMemo(() => {
    if (selectedCount === 0) return {};

    const eligible = {};

    Object.entries(ENHANCED_PRODUCT_BULK_ACTIONS).forEach(
      ([categoryKey, category]) => {
        eligible[categoryKey] = {
          ...category,
          actions: {},
        };

        Object.entries(category.actions).forEach(([actionKey, action]) => {
          let eligibleCount = selectedCount;
          let warnings = [];

          // Check action-specific eligibility
          if (actionKey === "activate") {
            eligibleCount = selectedProductsData.filter(
              (p) => p.status !== "active"
            ).length;
            if (eligibleCount === 0) warnings.push("Tüm ürünler zaten aktif");
          } else if (actionKey === "deactivate") {
            eligibleCount = selectedProductsData.filter(
              (p) => p.status === "active"
            ).length;
            if (eligibleCount === 0) warnings.push("Aktif ürün bulunamadı");
          } else if (actionKey === "publish") {
            eligibleCount = selectedProductsData.filter(
              (p) => p.completionScore >= 80 && p.images?.length > 0
            ).length;
            if (eligibleCount < selectedCount) {
              warnings.push(
                `${
                  selectedCount - eligibleCount
                } ürün yayınlama gereksinimlerini karşılamıyor`
              );
            }
          }

          if (eligibleCount > 0 || !action.requiresEligibility) {
            eligible[categoryKey].actions[actionKey] = {
              ...action,
              eligibleCount,
              ineligibleCount: selectedCount - eligibleCount,
              warnings,
            };
          }
        });

        // Remove categories with no eligible actions
        if (Object.keys(eligible[categoryKey].actions).length === 0) {
          delete eligible[categoryKey];
        }
      }
    );

    return eligible;
  }, [selectedProducts, selectedProductsData, selectedCount]);

  // Enhanced action handler
  const handleBulkAction = useCallback(
    async (categoryKey, actionKey) => {
      const action =
        ENHANCED_PRODUCT_BULK_ACTIONS[categoryKey]?.actions?.[actionKey];
      if (!action) return;

      // Handle special actions that need custom UI
      if (actionKey === "edit" && onBulkEdit) {
        onBulkEdit(selectedProducts);
        return;
      }

      if (actionKey === "export" && onBulkExport) {
        onBulkExport(selectedProducts);
        return;
      }

      // Show confirmation if required
      if (
        action.confirmRequired ||
        action.destructive ||
        action.requiresOptions
      ) {
        setActionToConfirm({ categoryKey, actionKey, action });
        setShowConfirmation(true);
        return;
      }

      await executeBulkAction(categoryKey, actionKey, action);
    },
    [selectedProducts, onBulkEdit, onBulkExport]
  );

  const executeBulkAction = useCallback(
    async (categoryKey, actionKey, action, options = {}) => {
      try {
        setShowProgress(true);
        processingRef.current.cancelled = false;

        const batchSize = options.batchSize || action.batchSize || 10;
        const total = selectedProducts.length;
        const batches = [];

        // Create batches
        for (let i = 0; i < total; i += batchSize) {
          batches.push(selectedProducts.slice(i, i + batchSize));
        }

        setProcessingStatus({
          current: 0,
          total,
          currentItem: "Başlatılıyor...",
          action: action.label,
          canCancel: !action.irreversible,
          errors: [],
          results: [],
        });

        const results = [];
        const errors = [];

        // Process batches
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          if (processingRef.current.cancelled) break;

          const batch = batches[batchIndex];
          const startIndex = batchIndex * batchSize;

          try {
            setProcessingStatus((prev) => ({
              ...prev,
              current: startIndex,
              currentItem: `İşleniyor: ${startIndex + 1}-${Math.min(
                startIndex + batch.length,
                total
              )} / ${total}`,
            }));

            // Call the actual bulk action
            const result = await onBulkAction(
              `${categoryKey}_${actionKey}`,
              batch,
              {
                ...options,
                ...actionOptions,
              }
            );

            results.push(result);

            // Small delay for better UX
            await new Promise((resolve) => {
              timeoutRef.current = setTimeout(resolve, 200);
            });
          } catch (error) {
            errors.push({
              batch: batchIndex,
              productIds: batch,
              error: error.message,
            });

            if (action.stopOnError) break;
          }
        }

        setProcessingStatus((prev) => ({
          ...prev,
          current: total,
          currentItem: "Tamamlandı",
          errors,
          results,
        }));

        // Auto-hide progress after success
        setTimeout(() => {
          setShowProgress(false);
          setActionOptions({});
        }, 3000);
      } catch (error) {
        setProcessingStatus((prev) => ({
          ...prev,
          errors: [...prev.errors, { general: error.message }],
        }));
      }
    },
    [selectedProducts, onBulkAction, actionOptions]
  );

  const handleCancelProcessing = useCallback(() => {
    processingRef.current.cancelled = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowProgress(false);
    setActionOptions({});
  }, []);

  const handleConfirmAction = useCallback(async () => {
    if (!actionToConfirm) return;

    setShowConfirmation(false);

    await executeBulkAction(
      actionToConfirm.categoryKey,
      actionToConfirm.actionKey,
      actionToConfirm.action,
      actionOptions
    );

    setActionToConfirm(null);
  }, [actionToConfirm, actionOptions, executeBulkAction]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      {/* Main Bulk Actions Bar */}
      <div
        className={`bg-white border-l-4 border-l-blue-500 rounded-lg shadow-sm ${className}`}
      >
        <div className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Selection Info & Quick Stats */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CheckSquare className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">
                  {selectedCount} ürün seçildi
                </span>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>
                    {
                      selectedProductsData.filter((p) => p.status === "active")
                        .length
                    }{" "}
                    aktif
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <XCircle className="h-3 w-3 text-yellow-600" />
                  <span>
                    {
                      selectedProductsData.filter(
                        (p) => p.status === "inactive"
                      ).length
                    }{" "}
                    pasif
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-3 w-3 text-green-600" />
                  <span>
                    Ort. fiyat: ₺
                    {Math.round(
                      selectedProductsData.reduce(
                        (sum, p) => sum + (p.price || 0),
                        0
                      ) / selectedCount
                    )}
                  </span>
                </div>
              </div>

              {/* Undo Button */}
              {recentActions.length > 0 && onUndo && (
                <button
                  onClick={() => onUndo(recentActions[0])}
                  className="text-gray-500 hover:text-blue-600 p-1 rounded"
                  title="Son işlemi geri al"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Geri Al
                </button>
              )}
            </div>

            {/* Action Categories */}
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(eligibleActions).map(
                ([categoryKey, category]) => (
                  <ProductActionCategoryDropdown
                    key={categoryKey}
                    category={category}
                    categoryKey={categoryKey}
                    onAction={(actionKey) =>
                      handleBulkAction(categoryKey, actionKey)
                    }
                    disabled={loading}
                    selectedCount={selectedCount}
                  />
                )
              )}

              {/* Advanced Options */}
              {enableAdvancedOptions && (
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-gray-500 hover:text-blue-600 p-2 rounded flex items-center"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Gelişmiş
                </button>
              )}

              {/* Clear Selection */}
              <button
                onClick={onClearSelection}
                disabled={loading}
                className="text-gray-500 hover:text-red-600 p-2 rounded flex items-center"
              >
                <X className="h-4 w-4 mr-1" />
                Temizle
              </button>
            </div>
          </div>

          {/* Advanced Options Panel */}
          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                    İşlem Seçenekleri
                  </label>
                  <input
                    placeholder="Batch boyutu"
                    type="number"
                    min="1"
                    max="100"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    value={actionOptions.batchSize || ""}
                    onChange={(e) =>
                      setActionOptions((prev) => ({
                        ...prev,
                        batchSize: parseInt(e.target.value) || undefined,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                    Hata Yönetimi
                  </label>
                  <select
                    value={actionOptions.errorHandling || "continue"}
                    onChange={(e) =>
                      setActionOptions((prev) => ({
                        ...prev,
                        errorHandling: e.target.value,
                      }))
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="continue">Devam et</option>
                    <option value="stop">Dur</option>
                    <option value="retry">Yeniden dene</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                    Bildirimler
                  </label>
                  <div className="space-y-1">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={actionOptions.notifications !== false}
                        onChange={(e) =>
                          setActionOptions((prev) => ({
                            ...prev,
                            notifications: e.target.checked,
                          }))
                        }
                      />
                      <span className="text-xs">İşlem bildirimleri</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={actionOptions.emailReport === true}
                        onChange={(e) =>
                          setActionOptions((prev) => ({
                            ...prev,
                            emailReport: e.target.checked,
                          }))
                        }
                      />
                      <span className="text-xs">Email raporu</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                    Filtreler
                  </label>
                  <div className="space-y-1">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={actionOptions.skipIncomplete === true}
                        onChange={(e) =>
                          setActionOptions((prev) => ({
                            ...prev,
                            skipIncomplete: e.target.checked,
                          }))
                        }
                      />
                      <span className="text-xs">Eksik ürünleri atla</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={actionOptions.dryRun === true}
                        onChange={(e) =>
                          setActionOptions((prev) => ({
                            ...prev,
                            dryRun: e.target.checked,
                          }))
                        }
                      />
                      <span className="text-xs">Test modu</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Confirmation Modal */}
      {showConfirmation && actionToConfirm && (
        <EnhancedProductConfirmationModal
          isOpen={showConfirmation}
          onClose={() => {
            setShowConfirmation(false);
            setActionToConfirm(null);
            setActionOptions({});
          }}
          onConfirm={handleConfirmAction}
          action={actionToConfirm.action}
          selectedCount={selectedCount}
          selectedProducts={selectedProductsData}
          eligibleCount={
            eligibleActions[actionToConfirm.categoryKey]?.actions?.[
              actionToConfirm.actionKey
            ]?.eligibleCount
          }
          ineligibleCount={
            eligibleActions[actionToConfirm.categoryKey]?.actions?.[
              actionToConfirm.actionKey
            ]?.ineligibleCount
          }
          warnings={
            eligibleActions[actionToConfirm.categoryKey]?.actions?.[
              actionToConfirm.actionKey
            ]?.warnings
          }
          loading={loading}
          onOptionsChange={setActionOptions}
          options={actionOptions}
          platformConnections={platformConnections}
          categories={categories}
        />
      )}

      {/* Enhanced Progress Modal */}
      {showProgress && (
        <EnhancedProductProgressModal
          isOpen={showProgress}
          onClose={() => setShowProgress(false)}
          onCancel={
            processingStatus.canCancel ? handleCancelProcessing : undefined
          }
          status={processingStatus}
        />
      )}
    </>
  );
};

const BulkOperationsComponent = ({
  selectedVariants = [],
  onSelectionChange,
  onOperationComplete,
  availablePlatforms = [],
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [operationProgress, setOperationProgress] = useState(null);
  const { showAlert } = useAlert();

  // Bulk operation types
  const operations = [
    {
      id: "publish",
      label: "Bulk Publish",
      icon: Globe,
      description: "Publish selected variants to platforms",
      requiresPlatforms: true,
    },
    {
      id: "updatePrices",
      label: "Update Prices",
      icon: DollarSign,
      description: "Update prices for selected variants",
      requiresValue: true,
      valueLabel: "New Price",
      valueType: "number",
    },
    {
      id: "updateStock",
      label: "Update Stock",
      icon: Package,
      description: "Update stock for selected variants",
      requiresValue: true,
      valueLabel: "New Stock Quantity",
      valueType: "number",
    },
  ];

  const [selectedOperation, setSelectedOperation] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [operationValue, setOperationValue] = useState("");

  const handleSelectAll = () => {
    // This would typically come from the parent component
    // For now, just toggle current selection
    if (selectedVariants.length > 0) {
      onSelectionChange([]);
    }
  };

  const executeBulkOperation = async () => {
    if (!selectedOperation || selectedVariants.length === 0) {
      showAlert("Please select an operation and variants", "error");
      return;
    }

    const operation = operations.find((op) => op.id === selectedOperation);

    // Validate requirements
    if (operation.requiresPlatforms && selectedPlatforms.length === 0) {
      showAlert("Please select at least one platform", "error");
      return;
    }

    if (operation.requiresValue && !operationValue) {
      showAlert(
        `Please enter a ${operation.valueLabel.toLowerCase()}`,
        "error"
      );
      return;
    }

    setIsProcessing(true);
    setOperationProgress({
      total: selectedVariants.length,
      completed: 0,
      status: "processing",
    });

    try {
      let endpoint = "";
      let payload = {};

      switch (selectedOperation) {
        case "publish":
          endpoint = `${API_BASE_URL}/products/bulk/publish`;
          payload = {
            variantIds: selectedVariants.map((v) => v.id),
            platforms: selectedPlatforms,
          };
          break;

        case "updatePrices":
          endpoint = `${API_BASE_URL}/products/bulk/update-prices`;
          payload = {
            updates: selectedVariants.map((v) => ({
              variantId: v.id,
              price: parseFloat(operationValue),
            })),
          };
          break;

        case "updateStock":
          endpoint = `${API_BASE_URL}/products/bulk/update-stock`;
          payload = {
            updates: selectedVariants.map((v) => ({
              mainProductId: v.mainProductId,
              quantity: parseInt(operationValue),
            })),
          };
          break;

        default:
          throw new Error("Unknown operation");
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setOperationProgress({
          total: selectedVariants.length,
          completed: selectedVariants.length,
          status: "completed",
        });

        showAlert(
          `${operation.label} completed successfully for ${selectedVariants.length} variants`,
          "success"
        );

        // Clear selections and reset form
        onSelectionChange([]);
        setSelectedOperation("");
        setSelectedPlatforms([]);
        setOperationValue("");

        // Notify parent component
        if (onOperationComplete) {
          onOperationComplete(result);
        }
      } else {
        throw new Error(result.error || "Operation failed");
      }
    } catch (error) {
      logger.error("Bulk operation error:", error);
      setOperationProgress({
        total: selectedVariants.length,
        completed: 0,
        status: "error",
        error: error.message,
      });
      showAlert(`${operation.label} failed: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);

      // Clear progress after 3 seconds
      setTimeout(() => {
        setOperationProgress(null);
      }, 3000);
    }
  };

  const selectedOperation_ = operations.find(
    (op) => op.id === selectedOperation
  );

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Bulk Operations</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {selectedVariants.length} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="text-xs"
          >
            {selectedVariants.length > 0 ? "Clear All" : "Select All"}
          </Button>
        </div>
      </div>

      {selectedVariants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Select variants to perform bulk operations</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Operation Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Operation
            </label>
            <select
              value={selectedOperation}
              onChange={(e) => setSelectedOperation(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose an operation...</option>
              {operations.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.label} - {op.description}
                </option>
              ))}
            </select>
          </div>

          {/* Operation-specific inputs */}
          {selectedOperation_ && (
            <div className="space-y-4">
              {/* Platform selection for publish operation */}
              {selectedOperation_.requiresPlatforms && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Platforms
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availablePlatforms.map((platform) => (
                      <label
                        key={platform.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPlatforms.includes(platform.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPlatforms([
                                ...selectedPlatforms,
                                platform.id,
                              ]);
                            } else {
                              setSelectedPlatforms(
                                selectedPlatforms.filter(
                                  (p) => p !== platform.id
                                )
                              );
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">{platform.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Value input for price/stock operations */}
              {selectedOperation_.requiresValue && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedOperation_.valueLabel}
                  </label>
                  <input
                    type={selectedOperation_.valueType}
                    value={operationValue}
                    onChange={(e) => setOperationValue(e.target.value)}
                    placeholder={`Enter ${selectedOperation_.valueLabel.toLowerCase()}`}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Execute button */}
              <Button
                onClick={executeBulkOperation}
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <selectedOperation_.icon className="w-4 h-4 mr-2" />
                    Execute {selectedOperation_.label}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Progress indicator */}
          {operationProgress && (
            <div
              className={`p-3 rounded-lg ${
                operationProgress.status === "processing"
                  ? "bg-blue-50 border-blue-200"
                  : operationProgress.status === "completed"
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              } border`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-medium ${
                    operationProgress.status === "processing"
                      ? "text-blue-800"
                      : operationProgress.status === "completed"
                      ? "text-green-800"
                      : "text-red-800"
                  }`}
                >
                  {operationProgress.status === "processing" && "Processing..."}
                  {operationProgress.status === "completed" && "Completed!"}
                  {operationProgress.status === "error" && "Error occurred"}
                </span>
                <span
                  className={`text-sm ${
                    operationProgress.status === "processing"
                      ? "text-blue-600"
                      : operationProgress.status === "completed"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {operationProgress.completed}/{operationProgress.total}
                </span>
              </div>
              {operationProgress.status === "error" &&
                operationProgress.error && (
                  <p className="text-red-600 text-sm mt-1">
                    {operationProgress.error}
                  </p>
                )}
            </div>
          )}

          {/* Selected variants preview */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Selected Variants ({selectedVariants.length})
            </h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {selectedVariants.slice(0, 5).map((variant) => (
                <div
                  key={variant.id}
                  className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
                >
                  <span>
                    {variant.platform} - {variant.platformSku}
                  </span>
                  <Badge variant="secondary" size="sm">
                    {variant.status}
                  </Badge>
                </div>
              ))}
              {selectedVariants.length > 5 && (
                <div className="text-xs text-gray-500 text-center">
                  ... and {selectedVariants.length - 5} more
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Product Action Category Dropdown Component
const ProductActionCategoryDropdown = ({
  category,
  categoryKey,
  onAction,
  disabled,
  selectedCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const CategoryIcon = category.icon;
  const hasActions = Object.keys(category.actions).length > 0;

  if (!hasActions) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center space-x-2 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
      >
        <CategoryIcon className="h-4 w-4" />
        <span>{category.label}</span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 z-20 mt-1 bg-white border border-gray-200 rounded-md shadow-lg min-w-[300px]">
            <div className="py-1">
              {Object.entries(category.actions).map(([actionKey, action]) => {
                const ActionIcon = action.icon;
                const hasIneligible = action.ineligibleCount > 0;

                return (
                  <button
                    key={actionKey}
                    onClick={() => {
                      onAction(actionKey);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full px-4 py-3 text-left text-sm hover:bg-gray-50
                      flex items-center justify-between
                      ${
                        action.destructive
                          ? "text-red-600 hover:bg-red-50"
                          : "text-gray-700"
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <ActionIcon className="h-4 w-4 flex-shrink-0" />
                      <div>
                        <div className="font-medium">{action.label}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {action.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {hasIneligible && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                          {action.eligibleCount}/
                          {action.eligibleCount + action.ineligibleCount}
                        </span>
                      )}
                      {action.estimatedTime && (
                        <div className="text-xs text-gray-400 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />~
                          {Math.ceil(
                            action.estimatedTime * action.eligibleCount
                          )}
                          s
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Enhanced Product Confirmation Modal
const EnhancedProductConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  selectedCount,
  selectedProducts,
  eligibleCount,
  ineligibleCount,
  warnings,
  loading,
  onOptionsChange,
  options,
  platformConnections,
  categories,
}) => {
  const ActionIcon = action.icon;
  const hasIneligible = ineligibleCount > 0;
  const hasWarnings = warnings && warnings.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-4">
            <div
              className={`
              p-3 rounded-full 
              ${action.destructive ? "bg-red-50" : "bg-blue-50"}
            `}
            >
              <ActionIcon
                className={`
                h-6 w-6 
                ${action.destructive ? "text-red-600" : "text-blue-600"}
              `}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{action.label}</h3>
              <p className="text-sm text-gray-600 mt-1">{action.description}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Action Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Seçili ürün:</span>
                <span className="ml-2 font-medium">{selectedCount}</span>
              </div>
              <div>
                <span className="text-gray-600">İşlenebilir:</span>
                <span className="ml-2 font-medium text-green-600">
                  {eligibleCount}
                </span>
              </div>
              {hasIneligible && (
                <>
                  <div>
                    <span className="text-gray-600">İşlenemez:</span>
                    <span className="ml-2 font-medium text-yellow-600">
                      {ineligibleCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tahmini süre:</span>
                    <span className="ml-2 font-medium">
                      ~{Math.ceil((action.estimatedTime || 1) * eligibleCount)}s
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Warnings */}
          {action.destructive && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-red-800 mb-1">Dikkat!</div>
                  <div className="text-red-700">
                    {action.irreversible
                      ? "Bu işlem geri alınamaz ve ürünler kalıcı olarak silinecektir."
                      : "Bu işlem ürünlerin durumunu değiştirecektir."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(hasIneligible || hasWarnings) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm flex-1">
                  <div className="font-medium text-yellow-800 mb-1">Bilgi</div>
                  <div className="text-yellow-700 space-y-1">
                    {hasIneligible && (
                      <div>
                        {ineligibleCount} ürün işlenemeyecek ve atlanacaktır.
                      </div>
                    )}
                    {hasWarnings &&
                      warnings.map((warning, index) => (
                        <div key={index}>{warning}</div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Platform Selection */}
          {action.requiresOptions && action.platforms && (
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                Platform Seçimi
              </label>
              <div className="grid grid-cols-2 gap-3">
                {action.platforms.map((platform) => (
                  <label key={platform} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={options.platforms?.includes(platform) || false}
                      onChange={(e) => {
                        const platforms = options.platforms || [];
                        if (e.target.checked) {
                          onOptionsChange((prev) => ({
                            ...prev,
                            platforms: [...platforms, platform],
                          }));
                        } else {
                          onOptionsChange((prev) => ({
                            ...prev,
                            platforms: platforms.filter((p) => p !== platform),
                          }));
                        }
                      }}
                    />
                    <span className="text-sm capitalize">{platform}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Price Update Options */}
          {action.options && action.options.includes("percentage") && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Güncelleme Tipi
                </label>
                <select
                  value={options.priceUpdateType || "percentage"}
                  onChange={(e) =>
                    onOptionsChange((prev) => ({
                      ...prev,
                      priceUpdateType: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="percentage">Yüzde (%)</option>
                  <option value="fixed">Sabit Miktar (₺)</option>
                  <option value="set">Yeni Fiyat Belirle</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  {options.priceUpdateType === "set" ? "Yeni Fiyat" : "Değer"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={options.priceValue || ""}
                  onChange={(e) =>
                    onOptionsChange((prev) => ({
                      ...prev,
                      priceValue: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder={
                    options.priceUpdateType === "percentage" ? "10" : "100.00"
                  }
                />
              </div>
            </div>
          )}

          {/* Category Selection */}
          {action.requiresOptions && action.label.includes("Kategori") && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Yeni Kategori</label>
              <select
                value={options.newCategory || ""}
                onChange={(e) =>
                  onOptionsChange((prev) => ({
                    ...prev,
                    newCategory: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                required
              >
                <option value="">Kategori seçiniz...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tags */}
          {action.label.includes("Etiket") && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Yeni Etiketler
              </label>
              <input
                type="text"
                value={options.tags || ""}
                onChange={(e) =>
                  onOptionsChange((prev) => ({ ...prev, tags: e.target.value }))
                }
                placeholder="Etiketleri virgülle ayırın..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          )}

          {/* Confirmation checkbox for destructive actions */}
          {action.requiresConfirmation && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="confirmDestructive"
                checked={options.confirmed || false}
                onChange={(e) =>
                  onOptionsChange((prev) => ({
                    ...prev,
                    confirmed: e.target.checked,
                  }))
                }
              />
              <label htmlFor="confirmDestructive" className="text-sm">
                Bu işlemi gerçekleştirmek istediğimi onaylıyorum
              </label>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            disabled={
              loading ||
              (action.requiresOptions &&
                action.platforms &&
                (!options.platforms || options.platforms.length === 0)) ||
              (action.requiresConfirmation && !options.confirmed)
            }
            className={`px-4 py-2 text-white rounded-md disabled:opacity-50 ${
              action.destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                İşleniyor...
              </div>
            ) : (
              action.label
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Product Progress Modal
const EnhancedProductProgressModal = ({
  isOpen,
  onClose,
  onCancel,
  status,
}) => {
  const percentage =
    status.total > 0 ? Math.round((status.current / status.total) * 100) : 0;
  const hasErrors = status.errors.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={percentage === 100 ? onClose : undefined}
      ></div>
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-blue-50">
              {percentage === 100 ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {percentage === 100 ? "İşlem Tamamlandı" : status.action}
              </h3>
              <p className="text-sm text-gray-600">{status.currentItem}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>İlerleme</span>
              <span>
                {status.current} / {status.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="text-center text-sm text-gray-600">
              %{percentage} tamamlandı
            </div>
          </div>

          {/* Errors Display */}
          {hasErrors && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm flex-1">
                  <div className="font-medium text-red-800 mb-2">
                    {status.errors.length} Hata Oluştu
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {status.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-red-700 text-xs">
                        {error.general ||
                          `Batch ${error.batch + 1}: ${error.error}`}
                      </div>
                    ))}
                    {status.errors.length > 5 && (
                      <div className="text-red-600 text-xs font-medium">
                        ... ve {status.errors.length - 5} hata daha
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status Messages */}
          <div className="text-center">
            {percentage === 100 ? (
              <div className="text-green-600 font-medium">
                {hasErrors
                  ? `İşlem tamamlandı (${status.errors.length} hata ile)`
                  : "İşlem başarıyla tamamlandı"}
              </div>
            ) : (
              <div className="text-gray-600">
                Lütfen bekleyin, işlem devam ediyor...
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t bg-gray-50">
          {percentage === 100 ? (
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Tamam
            </button>
          ) : (
            onCancel &&
            status.canCancel && (
              <button
                onClick={onCancel}
                className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                İptal Et
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedProductBulkActions;
export {
  EnhancedProductBulkActions,
  BulkOperationsComponent,
  ENHANCED_PRODUCT_BULK_ACTIONS,
};
