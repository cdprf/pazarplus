import logger from "../utils/logger";
/**
 * Export functionality for orders
 */

import api from "../services/api";

export const exportOrders = async (showAlert) => {
  try {
    const response = await api.importExport.exportData("orders", "csv");

    // Since responseType is 'blob', response.data is already a Blob
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `orders-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    showAlert("Siparişler başarıyla dışa aktarıldı", "success");
  } catch (error) {
    logger.error("Error exporting orders:", error);
    showAlert("Eksport işlemi başarısız", "error");
  }
};

export const exportOrdersAsJSON = async (orders, showAlert) => {
  try {
    const dataStr = JSON.stringify(orders, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = window.URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `orders-${new Date().toISOString().split("T")[0]}.json`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    showAlert("Siparişler JSON olarak dışa aktarıldı", "success");
  } catch (error) {
    logger.error("Error exporting orders as JSON:", error);
    showAlert("JSON eksport işlemi başarısız", "error");
  }
};

export const exportOrdersAsExcel = async (showAlert) => {
  try {
    const response = await api.importExport.exportData("orders", "xlsx");
    // Since responseType is 'blob', response.data is already a Blob
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `orders-${new Date().toISOString().split("T")[0]}.xlsx`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    showAlert("Siparişler Excel olarak dışa aktarıldı", "success");
  } catch (error) {
    logger.error("Error exporting orders as Excel:", error);
    showAlert("Excel eksport işlemi başarısız", "error");
  }
};
