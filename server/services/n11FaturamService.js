/**
 * N11 Faturam Service
 * Integration with N11 Faturam API for e-invoice generation
 */

const axios = require("axios");
const logger = require("../utils/logger");

class N11FaturamService {
  constructor() {
    this.baseURL = "https://api.n11faturam.com/v1";
  }

  /**
   * Generate e-invoice using N11 Faturam API
   * @param {Object} order - Order object
   * @param {Object} config - User's invoice configuration
   * @returns {Object} - Invoice generation result
   */
  async generateInvoice(order, config) {
    try {
      const { apiKey, username, password, companyInfo } = config;

      if (!apiKey || !username || !password) {
        throw new Error("N11 Faturam credentials not configured");
      }

      // Prepare invoice data
      const invoiceData = {
        // Company information
        sender: {
          vkn: companyInfo?.taxNumber || "",
          unvan: companyInfo?.companyName || "",
          adres: companyInfo?.address || "",
          il: companyInfo?.city || "",
          ilce: companyInfo?.district || "",
          postaKodu: companyInfo?.postalCode || "",
          telefon: companyInfo?.phone || "",
          email: companyInfo?.email || "",
        },

        // Customer information from order
        receiver: {
          ad: order.customerName || "",
          vkn: order.customerTaxNumber || "",
          adres: this.getShippingAddress(order),
          il: this.getShippingCity(order),
          ilce: this.getShippingDistrict(order),
          telefon: order.customerPhone || "",
          email: order.customerEmail || "",
        },

        // Invoice details
        invoice: {
          faturaTipi: "SATIS",
          belgeNumarasi: `INV-${order.id}-${Date.now()}`,
          belgeTarihi: new Date().toISOString().split("T")[0],
          paraBirimi: order.currency || "TRY",
          toplamTutar: order.totalAmount || 0,
          kdvToplamTutar: this.calculateTotalTax(order),
          genelToplamTutar: order.totalAmount || 0,
        },

        // Invoice lines
        lines: this.prepareInvoiceLines(order),
      };

      // Make API request to N11 Faturam
      const response = await axios.post(
        `${this.baseURL}/invoice/create`,
        invoiceData,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          auth: {
            username,
            password,
          },
        }
      );

      if (response.data.success) {
        return {
          success: true,
          message: "E-invoice generated successfully",
          data: {
            invoiceNumber: response.data.data.invoiceNumber,
            invoiceId: response.data.data.invoiceId,
            pdfUrl: response.data.data.pdfUrl,
            uuid: response.data.data.uuid,
            status: "CREATED",
          },
        };
      } else {
        throw new Error(
          response.data.message || "Failed to generate e-invoice"
        );
      }
    } catch (error) {
      logger.error(`N11 Faturam API error: ${error.message}`, {
        error,
        orderId: order.id,
      });

      return {
        success: false,
        message: `Failed to generate e-invoice: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Get invoice status from N11 Faturam
   * @param {string} invoiceId - Invoice ID
   * @param {Object} config - User's invoice configuration
   * @returns {Object} - Invoice status result
   */
  async getInvoiceStatus(invoiceId, config) {
    try {
      const { apiKey, username, password } = config;

      const response = await axios.get(
        `${this.baseURL}/invoice/${invoiceId}/status`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          auth: {
            username,
            password,
          },
        }
      );

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      logger.error(`N11 Faturam status check error: ${error.message}`, {
        error,
        invoiceId,
      });

      return {
        success: false,
        message: `Failed to get invoice status: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Cancel invoice in N11 Faturam
   * @param {string} invoiceId - Invoice ID
   * @param {Object} config - User's invoice configuration
   * @returns {Object} - Cancellation result
   */
  async cancelInvoice(invoiceId, config) {
    try {
      const { apiKey, username, password } = config;

      const response = await axios.post(
        `${this.baseURL}/invoice/${invoiceId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          auth: {
            username,
            password,
          },
        }
      );

      return {
        success: true,
        message: "Invoice cancelled successfully",
        data: response.data.data,
      };
    } catch (error) {
      logger.error(`N11 Faturam cancellation error: ${error.message}`, {
        error,
        invoiceId,
      });

      return {
        success: false,
        message: `Failed to cancel invoice: ${error.message}`,
        error: error.message,
      };
    }
  }

  // Helper methods
  getShippingAddress(order) {
    try {
      const shippingAddress =
        typeof order.shippingAddress === "string"
          ? JSON.parse(order.shippingAddress)
          : order.shippingAddress;
      return shippingAddress?.address || "";
    } catch (error) {
      return "";
    }
  }

  getShippingCity(order) {
    try {
      const shippingAddress =
        typeof order.shippingAddress === "string"
          ? JSON.parse(order.shippingAddress)
          : order.shippingAddress;
      return shippingAddress?.city || "";
    } catch (error) {
      return "";
    }
  }

  getShippingDistrict(order) {
    try {
      const shippingAddress =
        typeof order.shippingAddress === "string"
          ? JSON.parse(order.shippingAddress)
          : order.shippingAddress;
      return shippingAddress?.district || "";
    } catch (error) {
      return "";
    }
  }

  calculateTotalTax(order) {
    const items = order.items || [];
    return items.reduce((total, item) => {
      const itemTotal = (item.unitPrice || 0) * (item.quantity || 1);
      const taxRate = item.taxRate || 0.18; // Default 18% KDV
      return total + itemTotal * taxRate;
    }, 0);
  }

  prepareInvoiceLines(order) {
    const items = order.items || [];

    return items.map((item, index) => ({
      siraNo: index + 1,
      malHizmet: item.productName || "Product",
      miktar: item.quantity || 1,
      birim: "Adet",
      birimFiyat: item.unitPrice || 0,
      malHizmetTutari: (item.unitPrice || 0) * (item.quantity || 1),
      kdvOrani: (item.taxRate || 0.18) * 100, // Convert to percentage
      kdvTutari:
        (item.unitPrice || 0) * (item.quantity || 1) * (item.taxRate || 0.18),
      toplamTutar:
        (item.unitPrice || 0) *
        (item.quantity || 1) *
        (1 + (item.taxRate || 0.18)),
    }));
  }
}

module.exports = new N11FaturamService();
