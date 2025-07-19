/**
 * BulkActions - Component for bulk operations on selected orders
 * Implements Pazar+ Design System patterns for bulk operations
 * Follows design system for buttons, cards, and confirmation patterns
 */

import React, { useState } from "react";

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
} from "lucide-react";

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

export default BulkActions;
export {
  BulkActions,
  BulkActionConfirmation,
  BulkActionProgress,
  StatusUpdateBulkAction,
  BULK_ACTIONS,
};
