import logger from "../../utils/logger.js";
import React from "react";
import { Printer } from "lucide-react";
import api from "../../services/api";

const QuickPrintButton = ({ orderId, type = "pdf", className = "" }) => {
  const handlePrint = async () => {
    try {
      let response;

      switch (type) {
        case "shipping-slip":
          response = await api.shipping.generatePDF(orderId);
          break;
        case "invoice":
          response = await api.orders.printInvoice(orderId);
          break;
        default:
          throw new Error("Invalid print type");
      }

      if (response.success && response.pdfUrl) {
        window.open(response.pdfUrl, "_blank");
      } else if (response.pdfBlob) {
        const blob = new Blob([response.pdfBlob], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      logger.error("Print error:", error);
      alert(`Failed to print: ${error.message}`);
    }
  };

  return (
    <button
      onClick={handlePrint}
      className={`inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 ${className}`}
      title={`Print ${type.replace("-", " ")}`}
    >
      <Printer className="w-4 h-4 mr-2" />
      Print
    </button>
  );
};

export default QuickPrintButton;
