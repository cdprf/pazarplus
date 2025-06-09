import React, { useState, useEffect } from "react";
import api from "../../services/api";

const PrintOrderActions = ({ order }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await api.shipping.getShippingTemplates();
      setTemplates(response.data || response.templates || []);

      // Set default template if available
      const defaultTemplate = response.data?.find((t) => t.isDefault);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate.id);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  const handlePrintPDF = async () => {
    if (!order?.id) {
      alert("No order selected");
      return;
    }

    setLoading(true);
    try {
      const response = await api.shipping.generatePDF(
        order.id,
        selectedTemplate || null
      );

      if (response.success && response.pdfUrl) {
        // Open PDF in new window
        window.open(response.pdfUrl, "_blank");
      } else if (response.pdfBlob) {
        // Handle blob response
        const blob = new Blob([response.pdfBlob], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        // Clean up the blob URL
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        throw new Error("No PDF data received");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintShippingSlip = async () => {
    if (!order?.id) {
      alert("No order selected");
      return;
    }

    setLoading(true);
    try {
      const response = await api.shipping.generateShippingSlip(order.id);

      if (response.success && response.pdfUrl) {
        window.open(response.pdfUrl, "_blank");
      } else {
        throw new Error("Failed to generate shipping slip");
      }
    } catch (error) {
      console.error("Error generating shipping slip:", error);
      alert("Failed to generate shipping slip: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Also support the legacy order service methods
  const handlePrintInvoice = async () => {
    if (!order?.id) {
      alert("No order selected");
      return;
    }

    setLoading(true);
    try {
      const response = await api.orders.printInvoice(order.id);

      if (response.success && response.pdfUrl) {
        window.open(response.pdfUrl, "_blank");
      }
    } catch (error) {
      console.error("Error printing invoice:", error);
      alert("Failed to print invoice: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="print-actions">
      <div className="template-selector">
        <label htmlFor="template-select">Template:</label>
        <select
          id="template-select"
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          disabled={loading}
        >
          <option value="">Default Template</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </div>

      <div className="print-buttons">
        <button
          onClick={handlePrintPDF}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? "Generating..." : "Print PDF"}
        </button>

        <button
          onClick={handlePrintShippingSlip}
          disabled={loading}
          className="btn btn-secondary"
        >
          {loading ? "Generating..." : "Print Shipping Slip"}
        </button>

        <button
          onClick={handlePrintInvoice}
          disabled={loading}
          className="btn btn-outline"
        >
          {loading ? "Generating..." : "Print Invoice"}
        </button>
      </div>

      {order && (
        <div className="order-info">
          <small>Order: {order.orderNumber || order.id}</small>
        </div>
      )}
    </div>
  );
};

export default PrintOrderActions;
