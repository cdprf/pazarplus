import { useState, useCallback } from "react";
import api from "../../services/api";

export const usePrintFunctionality = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const printPDF = useCallback(async (orderId, templateId = null) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.shipping.generatePDF(orderId, templateId);

      if (response.success && response.pdfUrl) {
        window.open(response.pdfUrl, "_blank");
        return { success: true, url: response.pdfUrl };
      } else if (response.pdfBlob) {
        const blob = new Blob([response.pdfBlob], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return { success: true, blob: blob };
      } else {
        throw new Error("No PDF data received");
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const printShippingSlip = useCallback(async (orderId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.shipping.generatePDF(orderId);

      if (response.success && response.data?.labelUrl) {
        window.open(response.data.labelUrl, "_blank");
        return { success: true, url: response.data.labelUrl };
      } else {
        throw new Error("Failed to generate shipping slip");
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const printInvoice = useCallback(async (orderId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.orders.printInvoice(orderId);

      if (response.success && response.pdfUrl) {
        window.open(response.pdfUrl, "_blank");
        return { success: true, url: response.pdfUrl };
      } else {
        throw new Error("Failed to generate invoice");
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getTemplates = useCallback(async () => {
    try {
      const response = await api.shipping.getShippingTemplates();
      return response.data || response.templates || [];
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  return {
    loading,
    error,
    printPDF,
    printShippingSlip,
    printInvoice,
    getTemplates,
  };
};

export default usePrintFunctionality;
