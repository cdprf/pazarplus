/**
 * Enhanced BulkActions - Component for bulk operations on selected orders
 * Implements Pazar+ Design System patterns with enhanced UX
 * Features: Progress tracking, batch processing, error handling, undo functionality
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";

import {
  CheckCircle,
  Package,
  Truck,
  Trash2,
  X,
  AlertTriangle,
  Printer,
  FileText,
  Ban,
  RotateCcw,
  Download,
  Upload,
  Clock,
  CheckSquare,
  Square,
  Loader2,
  PlayCircle,
  PauseCircle,
  StopCircle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Calendar,
  DollarSign,
} from "lucide-react";

// Enhanced bulk actions with categories and advanced options
const ENHANCED_BULK_ACTIONS = {
  // Order Management Actions
  orderManagement: {
    label: "Sipariş İşlemleri",
    icon: Package,
    actions: {
      accept: {
        label: "Toplu Onayla",
        icon: CheckCircle,
        variant: "primary",
        color: "success",
        description: "Seçili siparişleri onayla ve işleme al",
        confirmRequired: true,
        batchSize: 10,
        estimatedTime: 2, // seconds per item
        prerequisites: ["pending", "awaiting_approval"],
      },
      process: {
        label: "Hazırlanıyor",
        icon: Package,
        variant: "outline",
        color: "info",
        description: "Seçili siparişleri hazırlanıyor olarak işaretle",
        confirmRequired: false,
        batchSize: 15,
        estimatedTime: 1,
      },
      ship: {
        label: "Toplu Kargola",
        icon: Truck,
        variant: "primary",
        color: "primary",
        description: "Seçili siparişleri kargoda olarak işaretle",
        confirmRequired: true,
        batchSize: 20,
        estimatedTime: 3,
        requiresShippingInfo: true,
      },
      delivered: {
        label: "Teslim Edildi",
        icon: CheckCircle,
        variant: "outline",
        color: "success",
        description: "Seçili siparişleri teslim edildi olarak işaretle",
        confirmRequired: true,
        batchSize: 25,
        estimatedTime: 1,
      },
    },
  },

  // Document Operations
  documentOperations: {
    label: "Belge İşlemleri",
    icon: FileText,
    actions: {
      print_shipping: {
        label: "Gönderi Belgeleri",
        icon: Printer,
        variant: "outline",
        color: "info",
        description: "Seçili siparişler için gönderi belgelerini yazdır",
        confirmRequired: false,
        batchSize: 50,
        estimatedTime: 0.5,
        generatesPDF: true,
      },
      print_invoice: {
        label: "Fatura Yazdır",
        icon: FileText,
        variant: "outline",
        color: "primary",
        description: "Seçili siparişlerin faturalarını yazdır",
        confirmRequired: false,
        batchSize: 30,
        estimatedTime: 1,
        generatesPDF: true,
      },
      export_excel: {
        label: "Excel İndir",
        icon: Download,
        variant: "outline",
        color: "info",
        description: "Seçili siparişleri Excel formatında indir",
        confirmRequired: false,
        batchSize: 100,
        estimatedTime: 0.1,
      },
    },
  },

  // Destructive Actions
  destructiveActions: {
    label: "Diğer İşlemler",
    icon: AlertTriangle,
    actions: {
      cancel: {
        label: "Toplu İptal",
        icon: Ban,
        variant: "outline",
        color: "warning",
        description: "Seçili siparişleri iptal et",
        confirmRequired: true,
        requiresReason: true,
        batchSize: 5,
        estimatedTime: 5,
        destructive: true,
      },
      delete: {
        label: "Toplu Sil",
        icon: Trash2,
        variant: "outline",
        color: "danger",
        description: "Seçili siparişleri kalıcı olarak sil",
        confirmRequired: true,
        requiresConfirmation: true,
        batchSize: 5,
        estimatedTime: 2,
        destructive: true,
        irreversible: true,
      },
    },
  },
};

const BULK_ACTIONS = {
  accept: {
    label: "Onayla",
    icon: CheckCircle,
    variant: "outline",
    color: "success",
    description: "Seçili siparişleri onayla ve işleme al",
  },
  process: {
    label: "Hazırlanıyor",
    icon: Package,
    variant: "outline",
    color: "info",
    description: "Seçili siparişleri hazırlanıyor olarak işaretle",
  },
  ship: {
    label: "Kargola",
    icon: Truck,
    variant: "outline",
    color: "primary",
    description: "Seçili siparişleri kargoda olarak işaretle",
  },
  delivered: {
    label: "Teslim Edildi",
    icon: CheckCircle,
    variant: "outline",
    color: "success",
    description: "Seçili siparişleri teslim edildi olarak işaretle",
  },
  print_shipping: {
    label: "Gönderi Belgeleri",
    icon: Printer,
    variant: "outline",
    color: "info",
    description: "Seçili siparişler için gönderi belgelerini yazdır",
  },
  print_shipping_bulk: {
    label: "Toplu Gönderi PDF",
    icon: Printer,
    variant: "filled",
    color: "primary",
    description: "Seçili siparişlerin gönderi belgelerini tek PDF'te indir",
  },
  print_invoice: {
    label: "Faturalar",
    icon: FileText,
    variant: "outline",
    color: "info",
    description: "Seçili siparişler için faturaları yazdır",
  },
  print_invoice_bulk: {
    label: "Toplu Fatura PDF",
    icon: FileText,
    variant: "filled",
    color: "secondary",
    description: "Seçili siparişlerin faturalarını tek PDF'te indir",
  },
  cancel: {
    label: "İptal Et",
    icon: Ban,
    variant: "outline",
    color: "warning",
    description: "Seçili siparişleri iptal et",
    confirmRequired: true,
  },
  delete: {
    label: "Sil",
    icon: Trash2,
    variant: "outline",
    color: "danger",
    description: "Seçili siparişleri sil",
    confirmRequired: true,
  },
};

const EnhancedOrderBulkActions = ({
  selectedOrders = [],
  onBulkAction,
  onClearSelection,
  loading = false,
  className = "",
  orders = [],
  // Enhanced props
  onUndo,
  recentActions = [],
  maxRecentActions = 5,
  enableBatchProcessing = true,
  enableProgressTracking = true,
  enableAdvancedFiltering = false,
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
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [actionOptions, setActionOptions] = useState({});
  const [filterOptions, setFilterOptions] = useState({
    onlyEligible: true,
    groupBySimilar: false,
  });

  // Refs for cancellation
  const processingRef = useRef({ cancelled: false });
  const timeoutRef = useRef(null);

  // Computed values
  const selectedCount = selectedOrders.length;

  const eligibleActions = useMemo(() => {
    if (selectedCount === 0) return {};

    const eligible = {};

    Object.entries(ENHANCED_BULK_ACTIONS).forEach(([categoryKey, category]) => {
      eligible[categoryKey] = {
        ...category,
        actions: {},
      };

      Object.entries(category.actions).forEach(([actionKey, action]) => {
        // Check prerequisites
        if (action.prerequisites) {
          const eligibleOrders = selectedOrders.filter((orderId) => {
            const order = orders.find((o) => o.id === orderId);
            return order && action.prerequisites.includes(order.status);
          });

          if (eligibleOrders.length > 0) {
            eligible[categoryKey].actions[actionKey] = {
              ...action,
              eligibleCount: eligibleOrders.length,
              ineligibleCount: selectedCount - eligibleOrders.length,
            };
          }
        } else {
          eligible[categoryKey].actions[actionKey] = {
            ...action,
            eligibleCount: selectedCount,
            ineligibleCount: 0,
          };
        }
      });

      // Remove categories with no eligible actions
      if (Object.keys(eligible[categoryKey].actions).length === 0) {
        delete eligible[categoryKey];
      }
    });

    return eligible;
  }, [selectedOrders, orders, selectedCount]);

  // Enhanced action handler with progress tracking
  const handleBulkAction = useCallback(async (categoryKey, actionKey) => {
    const action = ENHANCED_BULK_ACTIONS[categoryKey]?.actions?.[actionKey];
    if (!action) return;

    // Show confirmation if required
    if (action.confirmRequired || action.destructive) {
      setActionToConfirm({ categoryKey, actionKey, action });
      setShowConfirmation(true);
      return;
    }

    await executeBulkAction(categoryKey, actionKey, action);
  }, []);

  const executeBulkAction = useCallback(
    async (categoryKey, actionKey, action, options = {}) => {
      try {
        setShowProgress(true);
        processingRef.current.cancelled = false;

        const batchSize = action.batchSize || 10;
        const total = selectedOrders.length;
        const batches = [];

        // Create batches
        for (let i = 0; i < total; i += batchSize) {
          batches.push(selectedOrders.slice(i, i + batchSize));
        }

        setProcessingStatus({
          current: 0,
          total,
          currentItem: "Başlatılıyor...",
          action: action.label,
          canCancel: !action.irreversible,
          errors: [],
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
              timeoutRef.current = setTimeout(resolve, 100);
            });
          } catch (error) {
            errors.push({
              batch: batchIndex,
              orderIds: batch,
              error: error.message,
            });

            // Continue or stop based on action configuration
            if (action.stopOnError) break;
          }
        }

        setProcessingStatus((prev) => ({
          ...prev,
          current: total,
          currentItem: "Tamamlandı",
          errors,
        }));

        // Auto-hide progress after success
        setTimeout(() => {
          setShowProgress(false);
          setActionOptions({});
        }, 2000);
      } catch (error) {
        setProcessingStatus((prev) => ({
          ...prev,
          errors: [...prev.errors, { general: error.message }],
        }));
      }
    },
    [selectedOrders, onBulkAction, actionOptions]
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

  // Cleanup on unmount
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
      <div className={`card border-l-4 border-l-primary-500 ${className}`}>
        <div className="card-content p-4">
          <div className="flex items-center justify-between">
            {/* Selection Info */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-warning-600" />
                <span className="text-sm font-medium">
                  {selectedCount} sipariş seçildi
                </span>
              </div>

              {/* Recent Actions Undo */}
              {recentActions.length > 0 && onUndo && (
                <div className="tooltip" data-tooltip="Son işlemi geri al">
                  <button
                    onClick={() => onUndo(recentActions[0])}
                    className="btn btn-ghost btn-sm text-muted-foreground hover:text-primary-600"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Geri Al
                  </button>
                </div>
              )}
            </div>

            {/* Action Categories */}
            <div className="flex items-center space-x-2">
              {Object.entries(eligibleActions).map(
                ([categoryKey, category]) => (
                  <ActionCategoryDropdown
                    key={categoryKey}
                    category={category}
                    categoryKey={categoryKey}
                    onAction={(actionKey) =>
                      handleBulkAction(categoryKey, actionKey)
                    }
                    disabled={loading}
                  />
                )
              )}

              {/* Advanced Options */}
              {enableAdvancedFiltering && (
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="btn btn-ghost btn-sm text-muted-foreground"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  {showAdvanced ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              )}

              {/* Clear Selection */}
              <button
                onClick={onClearSelection}
                disabled={loading}
                className="btn btn-ghost btn-sm text-muted-foreground hover:text-danger-600"
              >
                <X className="h-4 w-4 mr-1" />
                Temizle
              </button>
            </div>
          </div>

          {/* Advanced Options Panel */}
          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Filtreleme
                  </label>
                  <div className="space-y-1">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filterOptions.onlyEligible}
                        onChange={(e) =>
                          setFilterOptions((prev) => ({
                            ...prev,
                            onlyEligible: e.target.checked,
                          }))
                        }
                      />
                      <span className="text-sm">Sadece uygun siparişler</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filterOptions.groupBySimilar}
                        onChange={(e) =>
                          setFilterOptions((prev) => ({
                            ...prev,
                            groupBySimilar: e.target.checked,
                          }))
                        }
                      />
                      <span className="text-sm">Benzer siparişleri grupla</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    İşlem Seçenekleri
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Batch boyutu"
                      type="number"
                      min="1"
                      max="100"
                      className="input input-sm"
                      value={actionOptions.batchSize || ""}
                      onChange={(e) =>
                        setActionOptions((prev) => ({
                          ...prev,
                          batchSize: parseInt(e.target.value) || undefined,
                        }))
                      }
                    />
                    <input
                      placeholder="Gecikme (ms)"
                      type="number"
                      min="0"
                      className="input input-sm"
                      value={actionOptions.delay || ""}
                      onChange={(e) =>
                        setActionOptions((prev) => ({
                          ...prev,
                          delay: parseInt(e.target.value) || undefined,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">
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
                    className="select select-sm w-full"
                  >
                    <option value="continue">Hatalarda devam et</option>
                    <option value="stop">İlk hatada dur</option>
                    <option value="retry">Hataları yeniden dene</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Confirmation Modal */}
      {showConfirmation && actionToConfirm && (
        <EnhancedConfirmationModal
          isOpen={showConfirmation}
          onClose={() => {
            setShowConfirmation(false);
            setActionToConfirm(null);
            setActionOptions({});
          }}
          onConfirm={handleConfirmAction}
          action={actionToConfirm.action}
          selectedCount={selectedCount}
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
          loading={loading}
          onOptionsChange={setActionOptions}
          options={actionOptions}
        />
      )}

      {/* Enhanced Progress Modal */}
      {showProgress && (
        <EnhancedProgressModal
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

// Action Category Dropdown Component
const ActionCategoryDropdown = ({
  category,
  categoryKey,
  onAction,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const CategoryIcon = category.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="btn btn-outline btn-sm flex items-center space-x-2"
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
          <div className="absolute top-full left-0 z-20 mt-1 bg-white border border-gray-200 rounded-md shadow-lg min-w-[250px]">
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
                      w-full px-4 py-2 text-left text-sm hover:bg-gray-50
                      flex items-center justify-between
                      ${
                        action.destructive ? "text-danger-600" : "text-gray-700"
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <ActionIcon className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{action.label}</div>
                        <div className="text-xs text-gray-500">
                          {action.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {hasIneligible && (
                        <span className="bg-warning-100 text-warning-800 text-xs px-2 py-1 rounded">
                          {action.eligibleCount}/
                          {action.eligibleCount + action.ineligibleCount}
                        </span>
                      )}
                      {action.estimatedTime && (
                        <div className="text-xs text-gray-500 flex items-center">
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

// Enhanced Confirmation Modal
const EnhancedConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  selectedCount,
  eligibleCount,
  ineligibleCount,
  loading,
  onOptionsChange,
  options,
}) => {
  const ActionIcon = action.icon;
  const hasIneligible = ineligibleCount > 0;

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div
        className="modal-container max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="flex items-center space-x-3">
            <div
              className={`
              p-2 rounded-full 
              ${action.destructive ? "bg-danger-50" : "bg-primary-50"}
            `}
            >
              <ActionIcon
                className={`
                h-6 w-6 
                ${action.destructive ? "text-danger-600" : "text-primary-600"}
              `}
              />
            </div>
            <div>
              <h3 className="modal-title">{action.label}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </div>
          </div>
        </div>

        <div className="modal-body space-y-4">
          {/* Action Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Seçili sipariş:</span>
                <span className="ml-2 font-medium">{selectedCount}</span>
              </div>
              <div>
                <span className="text-gray-600">İşlenebilir:</span>
                <span className="ml-2 font-medium text-success-600">
                  {eligibleCount}
                </span>
              </div>
              {hasIneligible && (
                <>
                  <div>
                    <span className="text-gray-600">İşlenemez:</span>
                    <span className="ml-2 font-medium text-warning-600">
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
            <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-danger-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-danger-800 mb-1">
                    Dikkat!
                  </div>
                  <div className="text-danger-700">
                    {action.irreversible
                      ? "Bu işlem geri alınamaz ve siparişler kalıcı olarak silinecektir."
                      : "Bu işlem siparişlerin durumunu değiştirecektir."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {hasIneligible && (
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-warning-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-warning-800 mb-1">Bilgi</div>
                  <div className="text-warning-700">
                    {ineligibleCount} sipariş mevcut durumu nedeniyle
                    işlenemeyecek ve atlanacaktır.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action-specific options */}
          {action.requiresReason && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">İptal Nedeni</label>
              <textarea
                value={options.reason || ""}
                onChange={(e) =>
                  onOptionsChange((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                placeholder="İptal nedenini belirtiniz..."
                rows={3}
                className="textarea w-full resize-none"
                required
              />
            </div>
          )}

          {action.requiresShippingInfo && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Kargo Şirketi
                </label>
                <select
                  value={options.shippingCompany || ""}
                  onChange={(e) =>
                    onOptionsChange((prev) => ({
                      ...prev,
                      shippingCompany: e.target.value,
                    }))
                  }
                  className="select w-full"
                  required
                >
                  <option value="">Seçiniz...</option>
                  <option value="aras">Aras Kargo</option>
                  <option value="yurtici">Yurtiçi Kargo</option>
                  <option value="mng">MNG Kargo</option>
                  <option value="ptt">PTT Kargo</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Kargo Takip No
                </label>
                <input
                  type="text"
                  value={options.trackingNumber || ""}
                  onChange={(e) =>
                    onOptionsChange((prev) => ({
                      ...prev,
                      trackingNumber: e.target.value,
                    }))
                  }
                  placeholder="Otomatik oluşturulacak"
                  className="input w-full"
                />
              </div>
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
                className="checkbox"
              />
              <label htmlFor="confirmDestructive" className="text-sm">
                Bu işlemi gerçekleştirmek istediğimi onaylıyorum
              </label>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="modal-footer">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn btn-ghost flex-1"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            disabled={
              loading ||
              (action.requiresReason && !options.reason) ||
              (action.requiresShippingInfo && !options.shippingCompany) ||
              (action.requiresConfirmation && !options.confirmed)
            }
            className={`btn ${
              action.destructive ? "btn-danger" : "btn-primary"
            } flex-1`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                İşleniyor...
              </>
            ) : (
              action.label
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Progress Modal
const EnhancedProgressModal = ({ isOpen, onClose, onCancel, status }) => {
  const percentage =
    status.total > 0 ? Math.round((status.current / status.total) * 100) : 0;
  const hasErrors = status.errors.length > 0;

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div
        className="modal-backdrop"
        onClick={percentage === 100 ? onClose : undefined}
      ></div>
      <div
        className="modal-container max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-primary-50">
              {percentage === 100 ? (
                <CheckCircle className="h-6 w-6 text-success-600" />
              ) : (
                <Loader2 className="h-6 w-6 text-primary-600 animate-spin" />
              )}
            </div>
            <div>
              <h3 className="modal-title">
                {percentage === 100 ? "İşlem Tamamlandı" : status.action}
              </h3>
              <p className="text-sm text-gray-600">{status.currentItem}</p>
            </div>
          </div>
        </div>

        <div className="modal-body space-y-4">
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
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="text-center text-sm text-gray-600">
              %{percentage} tamamlandı
            </div>
          </div>

          {/* Errors Display */}
          {hasErrors && (
            <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-danger-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm flex-1">
                  <div className="font-medium text-danger-800 mb-2">
                    {status.errors.length} Hata Oluştu
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {status.errors.map((error, index) => (
                      <div key={index} className="text-danger-700 text-xs">
                        {error.general ||
                          `Batch ${error.batch + 1}: ${error.error}`}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status Messages */}
          <div className="text-center">
            {percentage === 100 ? (
              <div className="text-success-600 font-medium">
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
        <div className="modal-footer">
          {percentage === 100 ? (
            <button onClick={onClose} className="btn btn-primary w-full">
              Tamam
            </button>
          ) : (
            onCancel &&
            status.canCancel && (
              <button onClick={onCancel} className="btn btn-ghost w-full">
                İptal Et
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

const BulkActions = ({
  selectedCount = 0,
  onBulkAction,
  onClearSelection,
  availableActions = [
    "accept",
    "process",
    "ship",
    "delivered",
    "print_shipping",
    "print_shipping_bulk",
    "print_invoice",
    "print_invoice_bulk",
    "cancel",
    "delete",
  ],
  loading = false,
  className = "",
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState(null);

  const handleBulkAction = (actionKey) => {
    const action = BULK_ACTIONS[actionKey];

    if (action.confirmRequired) {
      setActionToConfirm(actionKey);
      setShowConfirmation(true);
    } else {
      onBulkAction(actionKey);
    }
  };

  const handleConfirmAction = () => {
    if (actionToConfirm) {
      onBulkAction(actionToConfirm);
      setShowConfirmation(false);
      setActionToConfirm(null);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setActionToConfirm(null);
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div className={`card ${className}`}>
        <div className="card-content p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-warning-600" />
                <span className="text-sm font-medium">
                  {selectedCount} sipariş seçildi
                </span>
              </div>

              <div className="flex space-x-2">
                {availableActions.map((actionKey) => {
                  const action = BULK_ACTIONS[actionKey];
                  if (!action) return null;

                  const Icon = action.icon;

                  return (
                    <button
                      key={actionKey}
                      onClick={() => handleBulkAction(actionKey)}
                      disabled={loading}
                      className={`btn btn-${action.variant} btn-sm flex items-center space-x-2 text-${action.color}-600 hover:text-${action.color}-700`}
                      title={action.description}
                      aria-label={`${action.label} - ${action.description}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={onClearSelection}
              disabled={loading}
              className="btn btn-outline btn-sm flex items-center space-x-2"
              aria-label="Seçimi Temizle"
            >
              <X className="h-4 w-4" />
              <span>Seçimi Temizle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && actionToConfirm && (
        <BulkActionConfirmation
          isOpen={showConfirmation}
          onClose={handleCancelConfirmation}
          onConfirm={handleConfirmAction}
          action={actionToConfirm}
          selectedCount={selectedCount}
          loading={loading}
        />
      )}
    </>
  );
};

// Bulk action confirmation modal component
const BulkActionConfirmation = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  selectedCount,
  loading = false,
}) => {
  if (!isOpen || !action) return null;

  const actionConfig = BULK_ACTIONS[action];
  if (!actionConfig) return null;

  const Icon = actionConfig.icon;

  return (
    <div className="modal modal-open">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div
        className="modal-container max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-full ${
                action === "delete" ? "bg-danger-50" : "bg-primary-50"
              }`}
            >
              <Icon
                className={`h-6 w-6 ${
                  action === "delete" ? "text-danger-600" : "text-primary-600"
                }`}
              />
            </div>
            <div>
              <h3 className="modal-title">Toplu İşlem Onayı</h3>
              <p className="text-sm text-muted">{actionConfig.description}</p>
            </div>
          </div>
        </div>

        <div className="modal-body">
          <p className="text-base">
            {selectedCount} sipariş için <strong>{actionConfig.label}</strong>{" "}
            işlemini gerçekleştirmek istediğinizden emin misiniz?
          </p>

          {action === "delete" && (
            <div className="mt-3 p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-800">
                <strong>Uyarı:</strong> Bu işlem geri alınamaz. Silinecek
                siparişler kalıcı olarak kaldırılacaktır.
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn btn-ghost flex-1"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`btn ${
              action === "delete" ? "btn-danger" : "btn-primary"
            } flex-1`}
          >
            {loading ? "İşleniyor..." : actionConfig.label}
          </button>
        </div>
      </div>
    </div>
  );
};

// Bulk action progress indicator
const BulkActionProgress = ({
  isVisible,
  action,
  progress,
  total,
  currentItem = "",
  onCancel,
}) => {
  if (!isVisible) return null;

  const actionConfig = BULK_ACTIONS[action];
  if (!actionConfig) return null;

  const Icon = actionConfig.icon;
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="fixed bottom-4 right-4 card max-w-sm shadow-lg">
      <div className="card-content p-4">
        <div className="flex items-center space-x-3 mb-3">
          <Icon className="h-5 w-5 text-primary-600 animate-pulse" />
          <div className="flex-1">
            <h4 className="text-sm font-medium">{actionConfig.label} İşlemi</h4>
            <p className="text-xs text-muted">
              {progress} / {total} tamamlandı
            </p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="btn btn-outline btn-sm p-1"
              aria-label="İşlemi İptal Et"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-muted">
            <span>{percentage}%</span>
            <span>{currentItem}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Status update bulk action component
const StatusUpdateBulkAction = ({
  selectedCount,
  onStatusUpdate,
  onClearSelection,
  loading = false,
  className = "",
}) => {
  const statusOptions = [
    { value: "pending", label: "Bekleyen", color: "warning" },
    { value: "processing", label: "Hazırlanıyor", color: "info" },
    { value: "shipped", label: "Kargoda", color: "primary" },
    { value: "delivered", label: "Teslim Edildi", color: "success" },
    { value: "cancelled", label: "İptal Edildi", color: "danger" },
  ];

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className={`card ${className}`}>
      <div className="card-content p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">
              {selectedCount} sipariş seçildi - Durum güncelle:
            </span>

            <div className="flex space-x-2">
              {statusOptions.map((status) => (
                <button
                  key={status.value}
                  onClick={() => onStatusUpdate(status.value)}
                  disabled={loading}
                  className={`btn btn-outline btn-sm text-${status.color}-600 hover:text-${status.color}-700 hover:border-${status.color}-300`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onClearSelection}
            disabled={loading}
            className="btn btn-outline btn-sm flex items-center space-x-2"
            aria-label="Seçimi İptal Et"
          >
            <X className="h-4 w-4" />
            <span>İptal</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedOrderBulkActions;
export {
  EnhancedOrderBulkActions,
  BulkActions,
  BulkActionConfirmation,
  BulkActionProgress,
  StatusUpdateBulkAction,
  BULK_ACTIONS,
  ENHANCED_BULK_ACTIONS,
};
