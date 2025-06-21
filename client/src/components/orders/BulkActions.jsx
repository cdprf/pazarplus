/**
 * BulkActions - Component for bulk operations on selected orders
 * Implements Pazar+ Design System patterns for bulk operations
 * Follows design system for buttons, cards, and confirmation patterns
 */

import React from "react";

import {
  CheckCircle,
  Package,
  Truck,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";

const BULK_ACTIONS = {
  accept: {
    label: "Onayla",
    icon: CheckCircle,
    variant: "outline",
    color: "text-success-600 hover:text-success-700 hover:border-success-300",
    description: "Seçili siparişleri onayla ve işleme al",
  },
  process: {
    label: "Hazırlanıyor",
    icon: Package,
    variant: "outline",
    color: "text-info-600 hover:text-info-700 hover:border-info-300",
    description: "Seçili siparişleri hazırlanıyor olarak işaretle",
  },
  ship: {
    label: "Kargola",
    icon: Truck,
    variant: "outline",
    color: "text-primary-600 hover:text-primary-700 hover:border-primary-300",
    description: "Seçili siparişleri kargoda olarak işaretle",
  },
  delete: {
    label: "Sil",
    icon: Trash2,
    variant: "outline",
    color: "text-danger-600 hover:text-danger-700 hover:border-danger-300",
    description: "Seçili siparişleri sil",
    confirmRequired: true,
  },
};

const BulkActions = ({
  selectedCount = 0,
  onBulkAction,
  onClearSelection,
  availableActions = ["accept", "process", "ship", "delete"],
  loading = false,
  className = "",
}) => {
  const handleBulkAction = (actionKey) => {
    const action = BULK_ACTIONS[actionKey];

    if (action.confirmRequired) {
      const message = `${selectedCount} siparişi ${action.label.toLowerCase()} yapmak istediğinizden emin misiniz?`;
      if (!window.confirm(message)) {
        return;
      }
    }

    onBulkAction(actionKey);
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className={`pazar-card ${className}`}>
      <div className="pazar-card-content p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-warning-600" />
              <span className="pazar-text-sm font-medium">
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
                    className={`pazar-btn pazar-btn-${action.variant} pazar-btn-sm flex items-center space-x-2 ${action.color}`}
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
            className="pazar-btn pazar-btn-outline pazar-btn-sm flex items-center space-x-2"
            aria-label="Seçimi Temizle"
          >
            <X className="h-4 w-4" />
            <span>Seçimi Temizle</span>
          </button>
        </div>
      </div>
    </div>
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
    <div className="pazar-modal-overlay" onClick={onClose}>
      <div
        className="pazar-modal-content max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pazar-modal-header">
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
              <h3 className="pazar-modal-title">Toplu İşlem Onayı</h3>
              <p className="pazar-text-sm text-muted">
                {actionConfig.description}
              </p>
            </div>
          </div>
        </div>

        <div className="pazar-modal-body">
          <p className="pazar-text-base">
            {selectedCount} sipariş için <strong>{actionConfig.label}</strong>{" "}
            işlemini gerçekleştirmek istediğinizden emin misiniz?
          </p>

          {action === "delete" && (
            <div className="mt-3 p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="pazar-text-sm text-danger-800">
                <strong>Uyarı:</strong> Bu işlem geri alınamaz. Silinecek
                siparişler kalıcı olarak kaldırılacaktır.
              </p>
            </div>
          )}
        </div>

        <div className="pazar-modal-footer">
          <button
            onClick={onClose}
            disabled={loading}
            className="pazar-btn pazar-btn-outline flex-1"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`pazar-btn ${
              action === "delete" ? "pazar-btn-danger" : "pazar-btn-primary"
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
    <div className="fixed bottom-4 right-4 pazar-card max-w-sm pazar-shadow-lg">
      <div className="pazar-card-content p-4">
        <div className="flex items-center space-x-3 mb-3">
          <Icon className="h-5 w-5 text-primary-600 animate-pulse" />
          <div className="flex-1">
            <h4 className="pazar-text-sm font-medium">
              {actionConfig.label} İşlemi
            </h4>
            <p className="pazar-text-xs text-muted">
              {progress} / {total} tamamlandı
            </p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="pazar-btn pazar-btn-outline pazar-btn-sm p-1"
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

          <div className="flex justify-between pazar-text-xs text-muted">
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
    <div className={`pazar-card ${className}`}>
      <div className="pazar-card-content p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="pazar-text-sm font-medium">
              {selectedCount} sipariş seçildi - Durum güncelle:
            </span>

            <div className="flex space-x-2">
              {statusOptions.map((status) => (
                <button
                  key={status.value}
                  onClick={() => onStatusUpdate(status.value)}
                  disabled={loading}
                  className={`pazar-btn pazar-btn-outline pazar-btn-sm text-${status.color}-600 hover:text-${status.color}-700 hover:border-${status.color}-300`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onClearSelection}
            disabled={loading}
            className="pazar-btn pazar-btn-outline pazar-btn-sm flex items-center space-x-2"
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

export default BulkActions;
export {
  BulkActions,
  BulkActionConfirmation,
  BulkActionProgress,
  StatusUpdateBulkAction,
  BULK_ACTIONS,
};
