import logger from "../../utils/logger.js";
/**
 * Order Actions Component - Handles all order operations
 * Follows Pazar+ Design System patterns for buttons and actions
 */

import React, { useState, useCallback, useEffect } from "react";

import {
  CheckCircle,
  Edit,
  Eye,
  MoreHorizontal,
  Printer,
  FileText,
  Ban,
  Trash2,
  ChevronDown,
} from "lucide-react";
import CancelOrderDialog from "../dialogs/CancelOrderDialog";
import { DropdownMenu } from "../ui";
import api from "../../services/api";
import enhancedPDFService from "../../services/enhancedPDFService";
import qnbFinansService from "../../services/qnbFinansService";

const OrderActions = ({
  order,
  onView,
  onEdit,
  onViewDetail,
  onAccept,
  onCancel,
  onDelete,
  showAlert,
}) => {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isPrintingShippingSlip, setIsPrintingShippingSlip] = useState(false);
  const [isPrintingInvoice, setIsPrintingInvoice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Error boundary for component
  useEffect(() => {
    if (!order || !order.id) {
      logger.warn("OrderActions: Invalid order data received", order);
      showAlert?.("Sipariş verileri eksik veya hatalı", "warning");
    }
  }, [order, showAlert]);

  // Safe execution wrapper
  const safeExecute = useCallback(
    async (operation, errorMessage) => {
      try {
        setIsLoading(true);
        await operation();
      } catch (error) {
        logger.error(`OrderActions error: ${errorMessage}`, error);
        showAlert?.(`${errorMessage}: ${error.message}`, "error");
      } finally {
        setIsLoading(false);
      }
    },
    [showAlert]
  );

  // Enhanced print shipping slip using new service
  const handlePrintShippingSlip = useCallback(
    async (orderId) => {
      await safeExecute(async () => {
        logger.info(
          "🚀 Enhanced handlePrintShippingSlip called with orderId:",
          orderId
        );

        if (isPrintingShippingSlip) {
          logger.info("⚠️ Already printing, ignoring request");
          return;
        }

        if (!orderId) {
          logger.info("❌ No orderId provided");
          throw new Error("Sipariş kimliği eksik");
        }

        setIsPrintingShippingSlip(true);

        try {
          // Get default template ID
          let defaultTemplateId = null;
          try {
            const defaultTemplateResponse =
              await api.shipping.getDefaultTemplate();
            if (
              defaultTemplateResponse.success &&
              defaultTemplateResponse.data
            ) {
              defaultTemplateId =
                defaultTemplateResponse.data.defaultTemplateId;

              // If no default template but templates exist, use first one
              if (
                !defaultTemplateId &&
                defaultTemplateResponse.data.availableTemplates?.length > 0
              ) {
                defaultTemplateId =
                  defaultTemplateResponse.data.availableTemplates[0].id;
              }
            }
          } catch (templateError) {
            logger.warn(
              "Template detection failed, proceeding without template:",
              templateError
            );
          }

          logger.info(
            "🔍 Template check - defaultTemplateId:",
            defaultTemplateId
          );

          // Check if a template is available before proceeding
          if (!defaultTemplateId) {
            logger.info("❌ No shipping template available - showing alert");
            showAlert(
              "No shipping template found. Please create or link a shipping template to this order before printing.",
              "warning"
            );
            return;
          }

          logger.info("✅ Template found, proceeding with PDF generation");

          // Use enhanced PDF service
          const result = await enhancedPDFService.generateAndOpenShippingSlip(
            orderId,
            defaultTemplateId
          );

          if (result.success) {
            showAlert("Gönderi belgesi hazırlandı ve açıldı", "success");
            if (!result.accessible) {
              showAlert(
                "Gönderi belgesi oluşturuldu ancak ağ erişimi sınırlı olabilir. PDF dosyası indirilen dosyalarınızda.",
                "warning"
              );
            }
          } else {
            throw new Error(result.message || result.error);
          }
        } finally {
          setIsPrintingShippingSlip(false);
        }
      }, "Gönderi belgesi yazdırılırken hata oluştu");
    },
    [safeExecute, showAlert, isPrintingShippingSlip]
  );

  // Enhanced print invoice using new service
  const handlePrintInvoice = useCallback(
    async (orderId) => {
      if (isPrintingInvoice) {
        logger.info("⚠️ Already printing invoice, ignoring request");
        return;
      }

      if (!orderId) {
        showAlert("Sipariş kimliği eksik", "error");
        return;
      }

      setIsPrintingInvoice(true);

      try {
        const result = await enhancedPDFService.generateAndOpenInvoice(orderId);

        if (result.success) {
          showAlert("Fatura hazırlandı ve açıldı", "success");
          if (!result.accessible) {
            showAlert(
              "Fatura oluşturuldu ancak ağ erişimi sınırlı olabilir. PDF dosyası indirilen dosyalarınızda.",
              "warning"
            );
          }
        } else {
          throw new Error(result.message || result.error);
        }
      } catch (error) {
        logger.error("Error printing invoice:", error);
        showAlert(
          `Fatura yazdırılırken hata oluştu: ${error.message}`,
          "error"
        );
      } finally {
        setIsPrintingInvoice(false);
      }
    },
    [showAlert, isPrintingInvoice]
  );

  // QNB Finans invoice generation
  const handleQNBFinansInvoice = useCallback(
    async (orderId, documentType = "auto") => {
      if (isPrintingInvoice) {
        logger.info("⚠️ Already printing QNB Finans invoice, ignoring request");
        return;
      }

      if (!orderId) {
        showAlert("Sipariş kimliği eksik", "error");
        return;
      }

      setIsPrintingInvoice(true);

      try {
        let result;

        if (documentType === "auto") {
          // Let the service determine the appropriate document type
          result = await qnbFinansService.autoGenerateDocument(orderId);
        } else if (documentType === "einvoice") {
          result = await qnbFinansService.generateEInvoice(orderId);
        } else if (documentType === "earsiv") {
          result = await qnbFinansService.generateEArchive(orderId);
        } else {
          throw new Error("Geçersiz belge tipi");
        }

        if (result.success) {
          const docType =
            documentType === "einvoice" || result.data?.invoiceNumber
              ? "E-Fatura"
              : "E-Arşiv";
          showAlert(`${docType} başarıyla oluşturuldu`, "success");

          // Open PDF if available
          if (result.data?.pdfUrl) {
            window.open(result.data.pdfUrl, "_blank");
          }
        } else {
          throw new Error(result.message || result.error);
        }
      } catch (error) {
        logger.error("Error generating QNB Finans invoice:", error);
        showAlert(
          `QNB Finans fatura oluşturulurken hata oluştu: ${qnbFinansService.formatErrorMessage(
            error
          )}`,
          "error"
        );
      } finally {
        setIsPrintingInvoice(false);
      }
    },
    [showAlert, isPrintingInvoice]
  );

  // Handle cancel order with dialog
  const handleCancelOrder = useCallback(
    (orderId, reason) => {
      setShowCancelDialog(false);
      if (onCancel) {
        onCancel(orderId, reason);
      }
    },
    [onCancel]
  );

  // Check if any operation is in progress
  const isAnyOperationInProgress =
    isLoading || isPrintingShippingSlip || isPrintingInvoice;

  // Validate order data
  if (!order || !order.id) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-danger-600 text-sm">Invalid order data</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center space-x-2">
        {/* Accept Order Button - only show for new/pending orders */}
        {(order.orderStatus === "new" || order.orderStatus === "pending") && (
          <button
            onClick={() => onAccept?.(order.id)}
            className="pazar-btn pazar-btn-ghost pazar-btn-sm p-1 text-success-600 hover:text-success-700 disabled:opacity-50"
            title="Siparişi Onayla"
            aria-label="Siparişi Onayla"
            disabled={isAnyOperationInProgress || !onAccept}
          >
            <CheckCircle className="h-4 w-4 icon-contrast-success" />
          </button>
        )}

        <button
          onClick={() => onView?.(order)}
          className="pazar-btn pazar-btn-ghost pazar-btn-sm p-1 disabled:opacity-50"
          title="Görüntüle"
          aria-label="Siparişi Görüntüle"
          disabled={!onView || isAnyOperationInProgress}
        >
          <Eye className="h-4 w-4 icon-contrast-primary" />
        </button>

        <button
          onClick={() => onEdit?.(order)}
          className="pazar-btn pazar-btn-ghost pazar-btn-sm p-1 disabled:opacity-50"
          title="Düzenle"
          aria-label="Siparişi Düzenle"
          disabled={!onEdit || isAnyOperationInProgress}
        >
          <Edit className="h-4 w-4 icon-contrast-secondary" />
        </button>

        <button
          onClick={() => onViewDetail?.(order.id)}
          className="pazar-btn pazar-btn-ghost pazar-btn-sm p-1 disabled:opacity-50"
          title="Detaylar"
          aria-label="Sipariş Detayları"
          disabled={!onViewDetail || isAnyOperationInProgress}
        >
          <MoreHorizontal className="h-4 w-4 icon-contrast-secondary" />
        </button>

        <button
          onClick={() => handlePrintShippingSlip(order.id)}
          className="pazar-btn pazar-btn-ghost pazar-btn-sm p-1 disabled:opacity-50"
          disabled={isPrintingShippingSlip || isAnyOperationInProgress}
          title={
            isPrintingShippingSlip
              ? "Gönderi belgesi hazırlanıyor..."
              : "Gönderi Belgesi Yazdır"
          }
          aria-label={
            isPrintingShippingSlip
              ? "Gönderi belgesi hazırlanıyor"
              : "Gönderi Belgesi Yazdır"
          }
        >
          <Printer className="h-4 w-4" />
        </button>

        {/* Invoice Generation Dropdown */}
        <DropdownMenu
          trigger={
            <button
              className="pazar-btn pazar-btn-ghost pazar-btn-sm p-1 flex items-center gap-1 disabled:opacity-50"
              disabled={isPrintingInvoice || isAnyOperationInProgress}
              title={
                isPrintingInvoice
                  ? "Fatura hazırlanıyor..."
                  : "Fatura Seçenekleri"
              }
              aria-label={
                isPrintingInvoice ? "Fatura hazırlanıyor" : "Fatura Seçenekleri"
              }
            >
              <FileText className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </button>
          }
          items={[
            {
              label: "Standart Fatura",
              onClick: () => handlePrintInvoice(order.id),
              disabled: isPrintingInvoice || isAnyOperationInProgress,
            },
            {
              label: "QNB Finans (Otomatik)",
              onClick: () => handleQNBFinansInvoice(order.id, "auto"),
              disabled: isPrintingInvoice || isAnyOperationInProgress,
            },
            {
              label: "QNB E-Fatura",
              onClick: () => handleQNBFinansInvoice(order.id, "einvoice"),
              disabled: isPrintingInvoice || isAnyOperationInProgress,
            },
            {
              label: "QNB E-Arşiv",
              onClick: () => handleQNBFinansInvoice(order.id, "earsiv"),
              disabled: isPrintingInvoice || isAnyOperationInProgress,
            },
          ]}
        />

        <button
          onClick={() => setShowCancelDialog(true)}
          className="pazar-btn pazar-btn-ghost pazar-btn-sm p-1 text-danger-600 hover:text-danger-700 disabled:opacity-50"
          title="Siparişi İptal Et"
          aria-label="Siparişi İptal Et"
          disabled={isAnyOperationInProgress}
        >
          <Ban className="h-4 w-4" />
        </button>

        <button
          onClick={() => onDelete?.(order.id)}
          className="pazar-btn pazar-btn-ghost pazar-btn-sm p-1 text-danger-600 hover:text-danger-700 disabled:opacity-50"
          title="Siparişi Sil"
          aria-label="Siparişi Sil"
          disabled={isAnyOperationInProgress || !onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Cancel Order Dialog */}
      {showCancelDialog && (
        <CancelOrderDialog
          orderId={order.id}
          orderNumber={order.orderNumber}
          isOpen={showCancelDialog}
          onClose={() => setShowCancelDialog(false)}
          onConfirm={handleCancelOrder}
        />
      )}
    </>
  );
};

export default OrderActions;
