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

  // Print shipping slip
  const handlePrintShippingSlip = useCallback(
    async (orderId) => {
      console.log("🚀 handlePrintShippingSlip called with orderId:", orderId);

      if (isPrintingShippingSlip) {
        console.log("⚠️ Already printing, ignoring request");
        return;
      }

      setIsPrintingShippingSlip(true);

      try {
        console.log(`Starting shipping slip printing for order ID: ${orderId}`);

        if (!orderId) {
          console.log("❌ No orderId provided");
          showAlert("Sipariş kimliği eksik", "error");
          return;
        }

        console.log("📋 Checking for default template...");
        let defaultTemplateId = null;

        try {
          console.log("🔍 Calling api.shipping.getDefaultTemplate()");
          const defaultTemplateResponse =
            await api.shipping.getDefaultTemplate();
          console.log("📄 Default template response:", defaultTemplateResponse);

          if (defaultTemplateResponse.success && defaultTemplateResponse.data) {
            defaultTemplateId = defaultTemplateResponse.data.defaultTemplateId;
            console.log("✅ Default template found:", defaultTemplateId);

            // If no default template is set but templates exist, use the first one
            if (
              !defaultTemplateId &&
              defaultTemplateResponse.data.availableTemplates &&
              defaultTemplateResponse.data.availableTemplates.length > 0
            ) {
              defaultTemplateId =
                defaultTemplateResponse.data.availableTemplates[0].id;
              console.log(
                "✅ Using first available template:",
                defaultTemplateId
              );
            }
          }

          // If still no template found, check all available templates
          if (!defaultTemplateId) {
            console.log("🔍 Checking for any available templates...");
            try {
              const templatesResponse = await api.shipping.getTemplates();
              console.log(
                "📋 Available templates response:",
                templatesResponse
              );

              if (
                templatesResponse.success &&
                templatesResponse.data &&
                templatesResponse.data.length > 0
              ) {
                defaultTemplateId = templatesResponse.data[0].id;
                console.log(
                  "✅ Using first available template:",
                  defaultTemplateId
                );
              } else {
                console.log("❌ No templates found");
                showAlert(
                  "Kargo şablonu bulunamadı. Lütfen önce bir şablon oluşturun.",
                  "warning"
                );
                return;
              }
            } catch (templatesError) {
              console.error("❌ Error fetching templates:", templatesError);
              showAlert(
                "Şablon kontrol edilirken hata oluştu. Şablon olmadan devam ediliyor.",
                "warning"
              );
            }
          }
        } catch (templateError) {
          console.error("❌ Error getting default template:", templateError);
          // Don't return here - try to proceed without template
          console.log("⚠️ Template error, proceeding without template ID");
        }

        console.log("🖨️ Generating shipping slip...");
        const response = await api.shipping.generatePDF(
          orderId,
          defaultTemplateId
        );
        console.log("📄 Shipping slip response:", response);

        if (response.success) {
          console.log("✅ Shipping slip generated successfully");

          // Priority handling for different PDF URL formats
          let pdfUrl = null;

          // Check for different URL properties in response
          if (response.data && response.data.labelUrl) {
            pdfUrl = response.data.labelUrl;
            console.log("🌐 Using labelUrl:", pdfUrl);
          } else if (response.data && response.data.pdfUrl) {
            pdfUrl = response.data.pdfUrl;
            console.log("🌐 Using pdfUrl:", pdfUrl);
          } else if (response.labelUrl) {
            pdfUrl = response.labelUrl;
            console.log("🌐 Using response.labelUrl:", pdfUrl);
          } else if (response.pdfUrl) {
            pdfUrl = response.pdfUrl;
            console.log("🌐 Using response.pdfUrl:", pdfUrl);
          }

          if (pdfUrl) {
            // Construct full URL for PDF access (like legacy code)
            const baseUrl =
              process.env.NODE_ENV === "development"
                ? "http://localhost:5001"
                : window.location.origin;
            const fullPdfUrl = pdfUrl.startsWith("http")
              ? pdfUrl
              : `${baseUrl}${pdfUrl}`;

            console.log(`✅ Opening PDF URL: ${fullPdfUrl}`);
            const pdfWindow = window.open(fullPdfUrl, "_blank");
            if (pdfWindow) {
              // Use onload event like legacy code for better timing
              pdfWindow.onload = () => {
                try {
                  console.log("🖨️ Triggering print...");
                  pdfWindow.print();
                } catch (printError) {
                  console.warn("Print trigger failed:", printError);
                }
              };
            } else {
              showAlert(
                "Gönderi belgesi açılamadı. Lütfen popup engelleyicisini devre dışı bırakın.",
                "warning"
              );
            }
            showAlert("Gönderi belgesi hazırlandı", "success");
          } else if (response.data && response.data.pdf) {
            // Handle base64 PDF
            console.log("📄 Handling base64 PDF");
            const byteCharacters = atob(response.data.pdf);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);

            const pdfWindow = window.open(url, "_blank");
            if (pdfWindow) {
              // Add timeout for base64 PDF print trigger
              setTimeout(() => {
                try {
                  console.log("🖨️ Triggering print for base64 PDF...");
                  pdfWindow.print();
                  // Clean up the blob URL after a delay
                  setTimeout(() => URL.revokeObjectURL(url), 5000);
                } catch (printError) {
                  console.warn(
                    "Print trigger failed for base64 PDF:",
                    printError
                  );
                }
              }, 1500);
            } else {
              // Clean up if popup was blocked
              URL.revokeObjectURL(url);
              showAlert(
                "Popup engellenmiş olabilir. PDF'yi manuel olarak açın.",
                "warning"
              );
            }
            showAlert("Gönderi belgesi hazırlandı ve yazdırılıyor", "success");
          } else {
            console.log("⚠️ No PDF data in response");
            showAlert("Gönderi belgesi verisi bulunamadı", "warning");
          }
        } else {
          console.log("❌ Shipping slip generation failed:", response.message);
          showAlert(
            response.message || "Gönderi belgesi oluşturulamadı",
            "error"
          );
        }
      } catch (error) {
        console.error("❌ Error printing shipping slip:", error);

        // Provide more specific error messages based on the error type
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Gönderi belgesi yazdırılırken bir hata oluştu";
        showAlert(errorMessage, "error");
        console.error("Error details:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
      } finally {
        setIsPrintingShippingSlip(false);
      }
    },
    [showAlert, isPrintingShippingSlip]
  );

  // Print invoice
  const handlePrintInvoice = useCallback(
    async (orderId) => {
      if (isPrintingInvoice) {
        console.log("⚠️ Already printing invoice, ignoring request");
        return;
      }

      setIsPrintingInvoice(true);
      try {
        const response = await api.orders.printInvoice(orderId);
        if (response.success) {
          // Handle both full URLs and relative paths
          let invoiceUrl = response.data.pdfUrl;
          if (invoiceUrl && !invoiceUrl.startsWith("http")) {
            const baseUrl =
              process.env.NODE_ENV === "development"
                ? "http://localhost:5001"
                : window.location.origin;
            invoiceUrl = `${baseUrl}${invoiceUrl}`;
          }

          const pdfWindow = window.open(invoiceUrl, "_blank");
          if (pdfWindow) {
            pdfWindow.onload = () => {
              pdfWindow.print();
            };
          } else {
            showAlert(
              "Fatura açılamadı. Lütfen popup engelleyicisini devre dışı bırakın.",
              "warning"
            );
          }
          showAlert("Fatura hazırlandı", "success");
        }
      } catch (error) {
        console.error("Error printing invoice:", error);
        showAlert("Fatura yazdırma işlemi başarısız", "error");
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
