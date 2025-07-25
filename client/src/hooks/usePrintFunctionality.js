import logger from "../utils/logger.js";
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
        // Construct full URL for PDF access (like legacy code)
        const baseUrl =
          process.env.NODE_ENV === "development"
            ? "http://localhost:5001"
            : window.location.origin;
        const fullUrl = response.pdfUrl.startsWith("http")
          ? response.pdfUrl
          : `${baseUrl}${response.pdfUrl}`;

        window.open(fullUrl, "_blank");
        return { success: true, url: fullUrl };
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
        // Construct full URL for PDF access (like legacy code)
        const baseUrl =
          process.env.NODE_ENV === "development"
            ? "http://localhost:5001"
            : window.location.origin;
        const fullUrl = response.data.labelUrl.startsWith("http")
          ? response.data.labelUrl
          : `${baseUrl}${response.data.labelUrl}`;

        logger.info(`🖨️ Opening shipping slip: ${fullUrl}`);

        window.open(fullUrl, "_blank");
        return { success: true, url: fullUrl };
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
