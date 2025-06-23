/**
 * Order Actions Component - Handles all order operations
 * Follows Pazar+ Design System patterns for buttons and actions
 */

import React, { useState, useCallback } from "react";

import {
  CheckCircle,
  Edit,
  Eye,
  MoreHorizontal,
  Printer,
  FileText,
  Ban,
  Trash2,
} from "lucide-react";
import CancelOrderDialog from "../dialogs/CancelOrderDialog";
import api from "../../services/api";
import enhancedPDFService from "../../services/enhancedPDFService";

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

  // Enhanced print shipping slip using new service
  const handlePrintShippingSlip = useCallback(
    async (orderId) => {
      console.log(
        "🚀 Enhanced handlePrintShippingSlip called with orderId:",
        orderId
      );

      if (isPrintingShippingSlip) {
        console.log("⚠️ Already printing, ignoring request");
        return;
      }

      if (!orderId) {
        console.log("❌ No orderId provided");
        showAlert("Sipariş kimliği eksik", "error");
        return;
      }

      setIsPrintingShippingSlip(true);

      try {
        // Get default template ID
        let defaultTemplateId = null;
        try {
          const defaultTemplateResponse =
            await api.shipping.getDefaultTemplate();
          if (defaultTemplateResponse.success && defaultTemplateResponse.data) {
            defaultTemplateId = defaultTemplateResponse.data.defaultTemplateId;

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
          console.warn(
            "Template detection failed, proceeding without template:",
            templateError
          );
        }

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
      } catch (error) {
        console.error("❌ Error printing shipping slip:", error);
        showAlert(
          `Gönderi belgesi yazdırılırken hata oluştu: ${error.message}`,
          "error"
        );
      } finally {
        setIsPrintingShippingSlip(false);
      }
    },
    [showAlert, isPrintingShippingSlip]
  );

  // Enhanced print invoice using new service
  const handlePrintInvoice = useCallback(
    async (orderId) => {
      if (isPrintingInvoice) {
        console.log("⚠️ Already printing invoice, ignoring request");
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
        console.error("Error printing invoice:", error);
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

  return (
    <>
      <div className="flex items-center space-x-2">
        {/* Accept Order Button - only show for new/pending orders */}
        {(order.orderStatus === "new" || order.orderStatus === "pending") && (
          <button
            onClick={() => onAccept(order.id)}
            className="pazar-btn pazar-btn-ghost pazar-btn-sm p-1 text-success-600 hover:text-success-700"
            title="Siparişi Onayla"
            aria-label="Siparişi Onayla"
          >
            <CheckCircle className="h-4 w-4 icon-contrast-success" />
          </button>
        )}

        <button
          onClick={() => onView && onView(order)}
          className="pazar-btn pazar-btn-ghost pazar-btn-sm p-1"
          title="Görüntüle"
          aria-label="Siparişi Görüntüle"
          disabled={!onView}
        >
          <Eye className="h-4 w-4 icon-contrast-primary" />
        </button>

        <button
          onClick={() => onEdit && onEdit(order)}
          className="pazar-btn pazar-btn-ghost pazar-btn-sm p-1"
          title="Düzenle"
          aria-label="Siparişi Düzenle"
          disabled={!onEdit}
        >
          <Edit className="h-4 w-4 icon-contrast-secondary" />
        </button>

        <button
          onClick={() => onViewDetail && onViewDetail(order.id)}
          className="pazar-btn pazar-btn-ghost pazar-btn-sm p-1"
          title="Detaylar"
          aria-label="Sipariş Detayları"
          disabled={!onViewDetail}
        >
          <MoreHorizontal className="h-4 w-4 icon-contrast-secondary" />
        </button>

        <button
          onClick={() => handlePrintShippingSlip(order.id)}
          className="pazar-btn pazar-btn-ghost pazar-btn-sm p-1"
          disabled={isPrintingShippingSlip}
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

        <button
          onClick={() => handlePrintInvoice(order.id)}
          className="pazar-btn pazar-btn-ghost pazar-btn-sm p-1"
          disabled={isPrintingInvoice}
          title={isPrintingInvoice ? "Fatura hazırlanıyor..." : "Fatura Yazdır"}
          aria-label={
            isPrintingInvoice ? "Fatura hazırlanıyor" : "Fatura Yazdır"
          }
        >
          <FileText className="h-4 w-4" />
        </button>

        <button
          onClick={() => setShowCancelDialog(true)}
          className="pazar-btn pazar-btn-ghost pazar-btn-sm p-1 text-danger-600 hover:text-danger-700"
          title="Siparişi İptal Et"
          aria-label="Siparişi İptal Et"
        >
          <Ban className="h-4 w-4" />
        </button>

        <button
          onClick={() => onDelete(order.id)}
          className="pazar-btn pazar-btn-ghost pazar-btn-sm p-1 text-danger-600 hover:text-danger-700"
          title="Siparişi Sil"
          aria-label="Siparişi Sil"
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
