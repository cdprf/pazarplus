import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  User,
  Truck,
  Edit,
  Save,
  X,
  Printer,
  FileText,
  Download,
  Eye,
  Settings,
  Link,
  CheckCircle,
} from "lucide-react";
import api from "../../services/api";
import { useAlert } from "../../contexts/AlertContext";
import OrderTimeline from "./OrderTimeline";
import OrderProductLinks from "./OrderProductLinks";
import PaymentDetails from "./PaymentDetails";
import ShippingAddress from "./ShippingAddress";

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedOrder, setEditedOrder] = useState({});
  const [defaultTemplate, setDefaultTemplate] = useState(null);
  const [linkedTemplate, setLinkedTemplate] = useState(null);
  const [generatingSlip, setGeneratingSlip] = useState(false);
  const [linkingTemplate, setLinkingTemplate] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const { showNotification } = useAlert();

  // Auto-link order with default template
  const handleAutoLinkTemplate = useCallback(
    async (template) => {
      try {
        setLinkingTemplate(true);

        const response = await api.shipping.linkOrderTemplate({
          orderId: order.id,
          templateId: template.id,
          autoMap: true, // Automatically map order data to template fields
        });

        if (response.success) {
          setLinkedTemplate(template);
          setOrder((prev) => ({ ...prev, shippingTemplateId: template.id }));
          showNotification(
            `Order automatically linked with template "${template.name}"`,
            "success"
          );
        }
      } catch (error) {
        console.error("Error auto-linking template:", error);
        showNotification("Failed to link template automatically", "warning");
      } finally {
        setLinkingTemplate(false);
      }
    },
    [order, showNotification]
  );

  const fetchLinkedTemplate = useCallback(async (templateId) => {
    try {
      const response = await api.shipping.getTemplate(templateId);
      if (response.success) {
        setLinkedTemplate(response.data);
      }
    } catch (error) {
      console.error("Error loading linked template:", error);
    }
  }, []);

  // Wrap fetchOrder in useCallback to include it in dependency array
  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getOrder(id);
      setOrder(response.data);
      setEditedOrder(response.data);

      // Check if order already has a linked template
      if (response.data.shippingTemplateId) {
        await fetchLinkedTemplate(response.data.shippingTemplateId);
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      showNotification("Error loading order details", "error");
    } finally {
      setLoading(false);
    }
  }, [id, showNotification, fetchLinkedTemplate]);

  const fetchDefaultTemplate = useCallback(async () => {
    try {
      const response = await api.shipping.getDefaultTemplate();
      if (response.success) {
        setDefaultTemplate(response.data);

        // Auto-link with default template if no template is linked yet
        if (order && !order.shippingTemplateId && !linkedTemplate) {
          await handleAutoLinkTemplate(response.data);
        }
      }
    } catch (error) {
      // Don't show error for no default template set
      if (error.response?.status !== 404) {
        console.error("Error loading default template:", error);
      }
    }
  }, [order, linkedTemplate, handleAutoLinkTemplate]);

  const fetchAvailableTemplates = useCallback(async () => {
    try {
      const response = await api.shipping.getTemplates();
      if (response.success) {
        setAvailableTemplates(response.data);
      }
    } catch (error) {
      console.error("Error loading available templates:", error);
    }
  }, []);

  // Manually link order with selected template
  const handleLinkTemplate = async (templateId) => {
    try {
      setLinkingTemplate(true);

      const response = await api.shipping.linkOrderTemplate({
        orderId: order.id,
        templateId: templateId,
        autoMap: true,
      });

      if (response.success) {
        const template = availableTemplates.find((t) => t.id === templateId);
        setLinkedTemplate(template);
        setOrder((prev) => ({ ...prev, shippingTemplateId: templateId }));
        setShowTemplateSelector(false);
        showNotification(
          `Order linked with template "${template.name}"`,
          "success"
        );
      }
    } catch (error) {
      console.error("Error linking template:", error);
      showNotification("Failed to link template", "error");
    } finally {
      setLinkingTemplate(false);
    }
  };

  // Enhanced shipping slip generation with template mapping
  const handleGenerateShippingSlip = async () => {
    if (!linkedTemplate && !defaultTemplate) {
      showNotification("No shipping template linked to this order", "warning");
      return;
    }

    try {
      setGeneratingSlip(true);

      const templateToUse = linkedTemplate || defaultTemplate;

      const response = await api.shipping.generatePDF(
        order.id,
        templateToUse.id
      );

      if (response.success) {
        showNotification("Shipping slip generated successfully", "success");

        // Open the generated PDF in a new window for printing
        if (response.data.labelUrl) {
          // Construct full URL for PDF access (like legacy code)
          const baseUrl =
            process.env.NODE_ENV === "development"
              ? "http://localhost:5001"
              : window.location.origin;
          const fullUrl = response.data.labelUrl.startsWith("http")
            ? response.data.labelUrl
            : `${baseUrl}${response.data.labelUrl}`;

          const pdfWindow = window.open(fullUrl, "_blank");
          if (pdfWindow) {
            pdfWindow.onload = () => {
              pdfWindow.print();
            };
          }
        }

        // Update order with generated slip info
        if (response.data.labelUrl) {
          setOrder((prev) => ({
            ...prev,
            shippingSlipUrl: response.data.labelUrl,
            shippingSlipGeneratedAt: new Date().toISOString(),
            labelUrl: response.data.labelUrl,
            shippingTemplateId: templateToUse.id,
          }));
        }
      }
    } catch (error) {
      console.error("Error generating shipping slip:", error);
      showNotification("Error generating shipping slip", "error");
    } finally {
      setGeneratingSlip(false);
    }
  };

  const handlePreviewWithTemplate = () => {
    const templateToUse = linkedTemplate || defaultTemplate;

    if (!templateToUse) {
      showNotification("No shipping template available for preview", "warning");
      return;
    }

    // Open the shipping slip designer in preview mode with order data
    const url = `/shipping-slip-designer?templateId=${templateToUse.id}&mode=preview&orderId=${order.id}`;
    window.open(url, "_blank");
  };

  const handleEditTemplate = () => {
    const templateToUse = linkedTemplate || defaultTemplate;

    if (!templateToUse) {
      showNotification("No template to edit", "warning");
      return;
    }

    // Open template designer
    const url = `/shipping-slip-designer?templateId=${templateToUse.id}&mode=edit`;
    window.open(url, "_blank");
  };

  // Print PDF using shipping API
  // Print shipping slip
  // eslint-disable-next-line no-unused-vars
  const handlePrintShippingSlip = async (e) => {
    // Prevent any default browser behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log("🖨️ Print shipping slip clicked");

    if (!order?.id) {
      console.warn("No order ID available");
      showNotification("No order selected", "error");
      return;
    }

    // Check if template is available
    if (!linkedTemplate && !defaultTemplate) {
      showNotification(
        "No shipping template found. Please create or link a shipping template to this order before printing.",
        "warning"
      );
      return;
    }

    setGeneratingSlip(true);
    console.log(`🖨️ Starting PDF generation for order ${order.id}`);

    try {
      const response = await api.shipping.generatePDF(order.id);
      console.log("📄 PDF generation response:", response);

      if (response.success && response.data?.labelUrl) {
        // Construct full URL for PDF access (like legacy code)
        const baseUrl =
          process.env.NODE_ENV === "development"
            ? "http://localhost:5001"
            : window.location.origin;
        const labelUrl = response.data.labelUrl.startsWith("http")
          ? response.data.labelUrl
          : `${baseUrl}${response.data.labelUrl}`;
        console.log(`🖨️ Attempting to open PDF: ${labelUrl}`);

        // Try multiple approaches to open the PDF
        let pdfWindow = null;

        try {
          // Method 1: Standard window.open
          pdfWindow = window.open(labelUrl, "_blank", "noopener,noreferrer");
          console.log("🖨️ window.open result:", pdfWindow);
        } catch (windowOpenError) {
          console.error("🖨️ window.open failed:", windowOpenError);
        }

        if (!pdfWindow || pdfWindow.closed) {
          console.warn(
            "🖨️ Popup blocked or failed, trying alternative methods"
          );

          // Method 2: Try opening in same window if popup blocked
          try {
            // Create a temporary link and click it
            const link = document.createElement("a");
            link.href = labelUrl;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log("🖨️ Alternative link click method used");
            showNotification("PDF opened in new tab", "success");
          } catch (linkError) {
            console.error("🖨️ Link click method failed:", linkError);

            // Method 3: Direct navigation as last resort
            showNotification(
              "Opening PDF in current tab due to popup restrictions",
              "info"
            );
            window.location.href = labelUrl;
          }
        } else {
          console.log("✅ PDF window opened successfully");

          // Check if the window loaded successfully after a short delay
          setTimeout(() => {
            try {
              if (pdfWindow.location.href === "about:blank") {
                console.warn(
                  "⚠️ PDF window seems to be blank, possible network issue"
                );
                showNotification(
                  "PDF may not have loaded correctly. Please check your network connection.",
                  "warning"
                );
                pdfWindow.close();
              }
            } catch (e) {
              // Cross-origin error is expected for successful loads
              console.log(
                "✅ PDF window loaded successfully (cross-origin expected)"
              );
            }
          }, 2000);

          showNotification("Shipping slip generated successfully", "success");
        }
      } else {
        console.error(
          "PDF generation failed - no success or labelUrl",
          response
        );
        throw new Error("Failed to generate shipping slip - no valid response");
      }
    } catch (error) {
      console.error("Error generating shipping slip:", error);
      showNotification(
        `Failed to generate shipping slip: ${error.message}. This might be a network connectivity issue.`,
        "error"
      );
    } finally {
      setGeneratingSlip(false);
      console.log("🖨️ PDF generation process completed");
    }
  };

  // Print invoice using order API
  const handlePrintInvoice = async () => {
    if (!order?.id) {
      showNotification("No order selected", "error");
      return;
    }

    setGeneratingSlip(true);
    try {
      const response = await api.orders.printInvoice(order.id);

      if (response.success && response.pdfUrl) {
        window.open(response.pdfUrl, "_blank");
        showNotification("Invoice generated successfully", "success");
      } else {
        throw new Error("Failed to generate invoice");
      }
    } catch (error) {
      console.error("Error generating invoice:", error);
      showNotification(`Failed to generate invoice: ${error.message}`, "error");
    } finally {
      setGeneratingSlip(false);
    }
  };

  // Load available templates
  const loadAvailableTemplates = useCallback(async () => {
    try {
      const [templatesResponse, defaultResponse] = await Promise.all([
        api.shipping.getShippingTemplates(),
        api.shipping.getDefaultTemplate(),
      ]);

      const templates =
        templatesResponse.data || templatesResponse.templates || [];
      const defaultTemplateId = defaultResponse.success
        ? defaultResponse.data.defaultTemplateId
        : null;

      // Mark the default template
      const templatesWithDefault = templates.map((template) => ({
        ...template,
        isDefault: template.id === defaultTemplateId,
      }));

      setAvailableTemplates(templatesWithDefault);
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id, fetchOrder]);

  useEffect(() => {
    if (order) {
      fetchDefaultTemplate();
      fetchAvailableTemplates();
      loadAvailableTemplates();
    }
  }, [
    order,
    fetchDefaultTemplate,
    fetchAvailableTemplates,
    loadAvailableTemplates,
  ]);

  const handleStatusUpdate = async (newStatus) => {
    try {
      await api.updateOrderStatus(order.id, newStatus);
      setOrder((prev) => ({ ...prev, status: newStatus }));
      showNotification("Order status updated successfully", "success");
    } catch (error) {
      console.error("Error updating order status:", error);
      showNotification("Error updating order status", "error");
    }
  };

  const handleSaveEdit = async () => {
    try {
      await api.updateOrder(order.id, editedOrder);
      setOrder(editedOrder);
      setEditing(false);
      showNotification("Order updated successfully", "success");
    } catch (error) {
      console.error("Error updating order:", error);
      showNotification("Error updating order", "error");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "returned":
        return "bg-orange-100 text-orange-800";
      case "claim_created":
        return "bg-pink-100 text-pink-800";
      case "claim_approved":
        return "bg-teal-100 text-teal-800";
      case "claim_rejected":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-600 dark:text-gray-400">
            Loading order details...
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Order not found
          </h3>
          <p className="text-gray-500">
            The order you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate("/orders")}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/orders")}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Order #{order.orderNumber || order.id}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Placed on {formatDate(order.orderDate)} • {order.platform}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span
            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
              order.orderStatus
            )}`}
          >
            {order.orderStatus}
          </span>

          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSaveEdit}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditedOrder(order);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enhanced Order Items with Product Links */}
          <OrderProductLinks
            order={order}
            onProductClick={(product) => {
              // Navigate to product detail page
              window.open(`/products/${product.id}`, "_blank");
            }}
          />

          {/* Enhanced Order Timeline */}
          <OrderTimeline order={order} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Enhanced Shipping Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Truck className="w-5 h-5 mr-2" />
              Shipping Actions
            </h2>

            {/* Template Status */}
            <div className="mb-4">
              {linkedTemplate ? (
                <div className="text-sm text-gray-600 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      <span className="font-medium text-green-800">
                        Linked Template: {linkedTemplate.name}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowTemplateSelector(true)}
                      className="text-green-600 hover:text-green-700"
                      title="Change Template"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-green-700 text-xs">
                    Order data is automatically mapped to template fields
                  </p>
                </div>
              ) : defaultTemplate ? (
                <div className="text-sm text-gray-600 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Link className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="font-medium text-blue-800">
                        Default Template Available: {defaultTemplate.name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAutoLinkTemplate(defaultTemplate)}
                      disabled={linkingTemplate}
                      className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
                      title="Link Template"
                    >
                      {linkingTemplate ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : (
                        <Link className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-blue-700 text-xs">
                    Click to link and auto-map order data to template
                  </p>
                </div>
              ) : (
                <div className="text-sm text-gray-600 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center mb-2">
                    <FileText className="w-4 h-4 text-yellow-600 mr-2" />
                    <span className="font-medium text-yellow-800">
                      No Template Available
                    </span>
                  </div>
                  <p className="text-yellow-700 text-xs mb-3">
                    Set up a shipping template to generate shipping slips.
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate("/settings/shipping-templates")}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-xs font-medium"
                    >
                      Configure Template
                    </button>
                    <button
                      onClick={() => setShowTemplateSelector(true)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-xs font-medium"
                    >
                      Select Template
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {(linkedTemplate || defaultTemplate) && (
                <>
                  <button
                    onClick={handlePreviewWithTemplate}
                    className="w-full bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Shipping Slip
                  </button>

                  <button
                    onClick={handleGenerateShippingSlip}
                    disabled={generatingSlip}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center"
                  >
                    {generatingSlip ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4 mr-2" />
                        Generate & Print Slip
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleEditTemplate}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Template
                  </button>

                  {order.shippingSlipUrl && (
                    <button
                      onClick={() =>
                        window.open(order.shippingSlipUrl, "_blank")
                      }
                      className="w-full bg-purple-100 hover:bg-purple-200 text-purple-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Last Generated Slip
                    </button>
                  )}

                  {/* Print Actions - Reorganized */}
                  <div className="border-t pt-4 space-y-3">
                    {/* Print Invoice Button */}
                    <button
                      type="button"
                      onClick={handlePrintInvoice}
                      disabled={generatingSlip}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      {generatingSlip ? "Generating..." : "Generate Invoice"}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Template Selector Modal */}
            {showTemplateSelector && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
                  <h3 className="text-lg font-semibold mb-4">
                    Select Shipping Template
                  </h3>
                  <div className="space-y-2 mb-4">
                    {availableTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleLinkTemplate(template.id)}
                        disabled={linkingTemplate}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-gray-500">
                          {template.description}
                        </div>
                        {template.isDefault && (
                          <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            Default
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowTemplateSelector(false)}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => navigate("/shipping-slip-designer")}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    >
                      Create New
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Update Status
            </h2>
            <div className="space-y-2">
              {[
                "pending",
                "processing",
                "shipped",
                "delivered",
                "cancelled",
              ].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusUpdate(status)}
                  disabled={order.orderStatus === status}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      order.orderStatus === status
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                >
                  Mark as {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Customer
            </h2>
            <div className="space-y-3">
              <div>
                {order.customerEmail ? (
                  <button
                    onClick={() =>
                      navigate(
                        `/customers/${encodeURIComponent(order.customerEmail)}`
                      )
                    }
                    className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 hover:underline text-left"
                  >
                    {order.customerName || order.customerEmail}
                  </button>
                ) : (
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {order.customerName || "İsimsiz Müşteri"}
                  </p>
                )}

                {order.customerEmail && (
                  <p className="text-sm text-gray-500">{order.customerEmail}</p>
                )}
                {order.customerPhone && (
                  <p className="text-sm text-gray-500">{order.customerPhone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <ShippingAddress order={order} />

          {/* Payment Info */}
          <PaymentDetails order={order} />

          {/* Shipping Info */}
          {order.trackingNumber && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Truck className="w-5 h-5 mr-2" />
                Shipping
              </h2>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Carrier:
                  </span>
                  <span className="ml-2 font-medium">
                    {order.shippingCarrier || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Tracking:
                  </span>
                  <span className="ml-2 font-medium">
                    {order.trackingNumber}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
