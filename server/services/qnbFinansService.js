/**
 * QNB Finans e-Solutions Service
 * Integration with QNB Finans API for e-invoice and e-archive generation
 *
 * Note: This is a template implementation. Update with actual QNB Finans API documentation
 * when available.
 */

const axios = require("axios");
const logger = require("../utils/logger");

class QNBFinansService {
  constructor() {
    // These URLs should be updated with actual QNB Finans API endpoints
    this.baseURL = "https://api.qnbfinans.com.tr/e-solutions/v1";
    this.testURL = "https://test-api.qnbfinans.com.tr/e-solutions/v1";
  }

  /**
   * Get appropriate base URL based on environment
   * @param {string} environment - 'test' or 'production'
   * @returns {string} Base URL
   */
  getBaseURL(environment = "test") {
    return environment === "production" ? this.baseURL : this.testURL;
  }

  /**
   * Create axios instance with authentication
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} Axios instance
   */
  createAxiosInstance(config) {
    const baseURL = this.getBaseURL(config.environment);

    return axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "X-Client-ID": config.clientId,
        "X-Client-Secret": config.clientSecret,
      },
      timeout: 30000,
    });
  }

  /**
   * Test connection to QNB Finans API
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} Test result
   */
  async testConnection(config) {
    try {
      const { apiKey, clientId, clientSecret } = config;

      if (!apiKey || !clientId || !clientSecret) {
        throw new Error("QNB Finans credentials not configured");
      }

      const axiosInstance = this.createAxiosInstance(config);

      // Test endpoint - update with actual QNB Finans test endpoint
      const response = await axiosInstance.get("/auth/test");

      return {
        success: true,
        message: "QNB Finans connection successful",
        data: response.data,
      };
    } catch (error) {
      logger.error(`QNB Finans connection test error: ${error.message}`, {
        error,
      });

      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Generate e-invoice using QNB Finans API
   * @param {Object} order - Order object
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} - Invoice generation result
   */
  async generateEInvoice(order, config) {
    try {
      const { apiKey, clientId, clientSecret, companyInfo } = config;

      if (!apiKey || !clientId || !clientSecret) {
        throw new Error("QNB Finans credentials not configured");
      }

      const axiosInstance = this.createAxiosInstance(config);

      // Prepare invoice data according to QNB Finans schema
      const invoiceData = {
        // Invoice header
        invoice: {
          profileID: "TICARIFATURA", // Commercial invoice profile
          invoiceTypeCode: "SATIS", // Sales invoice
          documentCurrencyCode: order.currency || "TRY",
          note: order.notes || "",

          // Company (supplier) information
          accountingSupplierParty: {
            party: {
              partyName: companyInfo?.companyName || "",
              postalAddress: {
                streetName: companyInfo?.address || "",
                cityName: companyInfo?.city || "",
                postalZone: companyInfo?.postalCode || "",
                country: "TR",
              },
              partyTaxScheme: {
                taxNumber: companyInfo?.taxNumber || "",
                taxOffice: companyInfo?.taxOffice || "",
              },
              contact: {
                telephone: companyInfo?.phone || "",
                electronicMail: companyInfo?.email || "",
              },
            },
          },

          // Customer information
          accountingCustomerParty: {
            party: {
              partyName: this.getCustomerName(order),
              postalAddress: {
                streetName: this.getShippingAddress(order),
                cityName: this.getShippingCity(order),
                postalZone: this.getShippingPostalCode(order),
                country: "TR",
              },
              partyTaxScheme: {
                taxNumber: this.getCustomerTaxNumber(order),
              },
              contact: {
                telephone: this.getCustomerPhone(order),
                electronicMail: this.getCustomerEmail(order),
              },
            },
          },

          // Invoice lines
          invoiceLines: this.prepareInvoiceLines(order),

          // Tax summary
          taxTotal: {
            taxAmount: this.calculateTotalTax(order),
            taxSubtotals: this.calculateTaxSubtotals(order),
          },

          // Monetary totals
          legalMonetaryTotal: {
            lineExtensionAmount: this.calculateSubtotal(order),
            taxExclusiveAmount: this.calculateSubtotal(order),
            taxInclusiveAmount: order.totalAmount || 0,
            payableAmount: order.totalAmount || 0,
          },
        },
      };

      // Send to QNB Finans API
      const response = await axiosInstance.post(
        "/einvoice/create",
        invoiceData
      );

      if (response.data.success) {
        return {
          success: true,
          message: "E-invoice created successfully",
          data: {
            invoiceNumber: response.data.data.invoiceNumber,
            invoiceId: response.data.data.invoiceId,
            uuid: response.data.data.uuid,
            pdfUrl: response.data.data.pdfUrl,
            status: response.data.data.status || "CREATED",
            ettn: response.data.data.ettn, // Electronic Tax Identifier
          },
        };
      } else {
        throw new Error(
          response.data.message || "Failed to generate e-invoice"
        );
      }
    } catch (error) {
      logger.error(`QNB Finans e-invoice generation error: ${error.message}`, {
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
   * Generate e-archive using QNB Finans API
   * @param {Object} order - Order object
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} - E-archive generation result
   */
  async generateEArchive(order, config) {
    try {
      const { apiKey, clientId, clientSecret, companyInfo } = config;

      if (!apiKey || !clientId || !clientSecret) {
        throw new Error("QNB Finans credentials not configured");
      }

      const axiosInstance = this.createAxiosInstance(config);

      // Prepare e-archive data
      const archiveData = {
        archive: {
          // Archive header
          profileID: "EARSIVFATURA", // E-archive profile
          invoiceTypeCode: "SATIS",
          documentCurrencyCode: order.currency || "TRY",

          // Supplier party (your company)
          accountingSupplierParty: {
            party: {
              partyName: companyInfo?.companyName || "",
              postalAddress: {
                streetName: companyInfo?.address || "",
                cityName: companyInfo?.city || "",
                postalZone: companyInfo?.postalCode || "",
                country: "TR",
              },
              partyTaxScheme: {
                taxNumber: companyInfo?.taxNumber || "",
              },
            },
          },

          // Customer party (individual customer for e-archive)
          accountingCustomerParty: {
            party: {
              partyName: this.getCustomerName(order),
              postalAddress: {
                streetName: this.getShippingAddress(order),
                cityName: this.getShippingCity(order),
                postalZone: this.getShippingPostalCode(order),
                country: "TR",
              },
              // For individuals, we use TCKN instead of VKN
              partyIdentification: {
                id: this.getCustomerTCKN(order),
              },
            },
          },

          // Invoice lines
          invoiceLines: this.prepareInvoiceLines(order),

          // Tax and monetary totals
          taxTotal: {
            taxAmount: this.calculateTotalTax(order),
          },

          legalMonetaryTotal: {
            lineExtensionAmount: this.calculateSubtotal(order),
            taxExclusiveAmount: this.calculateSubtotal(order),
            taxInclusiveAmount: order.totalAmount || 0,
            payableAmount: order.totalAmount || 0,
          },
        },
      };

      const response = await axiosInstance.post("/earsiv/create", archiveData);

      if (response.data.success) {
        return {
          success: true,
          message: "E-archive created successfully",
          data: {
            archiveNumber: response.data.data.archiveNumber,
            archiveId: response.data.data.archiveId,
            uuid: response.data.data.uuid,
            pdfUrl: response.data.data.pdfUrl,
            status: response.data.data.status || "CREATED",
          },
        };
      } else {
        throw new Error(
          response.data.message || "Failed to generate e-archive"
        );
      }
    } catch (error) {
      logger.error(`QNB Finans e-archive generation error: ${error.message}`, {
        error,
        orderId: order.id,
      });

      return {
        success: false,
        message: `Failed to generate e-archive: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Get invoice status from QNB Finans
   * @param {string} invoiceId - Invoice ID
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} - Invoice status result
   */
  async getInvoiceStatus(invoiceId, config) {
    try {
      const axiosInstance = this.createAxiosInstance(config);

      const response = await axiosInstance.get(`/einvoice/${invoiceId}/status`);

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      logger.error(`QNB Finans invoice status check error: ${error.message}`, {
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
   * Cancel invoice in QNB Finans
   * @param {string} invoiceId - Invoice ID
   * @param {Object} config - User's QNB Finans configuration
   * @param {string} reason - Cancellation reason
   * @returns {Object} - Cancellation result
   */
  async cancelInvoice(invoiceId, config, reason = "") {
    try {
      const axiosInstance = this.createAxiosInstance(config);

      const response = await axiosInstance.post(
        `/einvoice/${invoiceId}/cancel`,
        {
          reason: reason,
        }
      );

      return {
        success: true,
        message: "Invoice cancelled successfully",
        data: response.data.data,
      };
    } catch (error) {
      logger.error(`QNB Finans invoice cancellation error: ${error.message}`, {
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

  // Helper methods for extracting order data
  getCustomerName(order) {
    try {
      const customerInfo =
        typeof order.customerInfo === "string"
          ? JSON.parse(order.customerInfo)
          : order.customerInfo;
      return customerInfo?.name || order.customerName || "";
    } catch (error) {
      return order.customerName || "";
    }
  }

  getCustomerTaxNumber(order) {
    try {
      const customerInfo =
        typeof order.customerInfo === "string"
          ? JSON.parse(order.customerInfo)
          : order.customerInfo;
      return customerInfo?.taxNumber || "";
    } catch (error) {
      return "";
    }
  }

  getCustomerTCKN(order) {
    try {
      const customerInfo =
        typeof order.customerInfo === "string"
          ? JSON.parse(order.customerInfo)
          : order.customerInfo;
      return customerInfo?.tckn || customerInfo?.identityNumber || "";
    } catch (error) {
      return "";
    }
  }

  getCustomerPhone(order) {
    try {
      const shippingAddress =
        typeof order.shippingAddress === "string"
          ? JSON.parse(order.shippingAddress)
          : order.shippingAddress;
      return shippingAddress?.phone || "";
    } catch (error) {
      return "";
    }
  }

  getCustomerEmail(order) {
    try {
      const customerInfo =
        typeof order.customerInfo === "string"
          ? JSON.parse(order.customerInfo)
          : order.customerInfo;
      return customerInfo?.email || "";
    } catch (error) {
      return "";
    }
  }

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

  getShippingPostalCode(order) {
    try {
      const shippingAddress =
        typeof order.shippingAddress === "string"
          ? JSON.parse(order.shippingAddress)
          : order.shippingAddress;
      return shippingAddress?.postalCode || "";
    } catch (error) {
      return "";
    }
  }

  calculateSubtotal(order) {
    const items = order.items || [];
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  calculateTotalTax(order) {
    const items = order.items || [];
    return items.reduce((total, item) => {
      const itemTotal = item.price * item.quantity;
      const taxRate = item.taxRate || 0.18; // Default 18% VAT
      return total + itemTotal * taxRate;
    }, 0);
  }

  calculateTaxSubtotals(order) {
    const taxRates = {};
    const items = order.items || [];

    items.forEach((item) => {
      const taxRate = item.taxRate || 0.18;
      const itemTotal = item.price * item.quantity;
      const taxAmount = itemTotal * taxRate;

      if (!taxRates[taxRate]) {
        taxRates[taxRate] = {
          taxableAmount: 0,
          taxAmount: 0,
        };
      }

      taxRates[taxRate].taxableAmount += itemTotal;
      taxRates[taxRate].taxAmount += taxAmount;
    });

    return Object.entries(taxRates).map(([rate, amounts]) => ({
      taxCategory: {
        taxPercent: parseFloat(rate) * 100,
      },
      taxableAmount: amounts.taxableAmount,
      taxAmount: amounts.taxAmount,
    }));
  }

  prepareInvoiceLines(order) {
    const items = order.items || [];

    return items.map((item, index) => ({
      id: index + 1,
      invoicedQuantity: item.quantity,
      lineExtensionAmount: item.price * item.quantity,
      item: {
        name: item.productName || item.name || "",
        description: item.description || "",
        sellersItemIdentification: {
          id: item.sku || item.productId || "",
        },
      },
      price: {
        priceAmount: item.price,
      },
      taxTotal: {
        taxAmount: item.price * item.quantity * (item.taxRate || 0.18),
      },
    }));
  }
}

module.exports = new QNBFinansService();
