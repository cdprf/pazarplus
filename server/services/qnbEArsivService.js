/**
 * QNB Finans e-Archive Service
 * Refactored modular integration with QNB Finans SOAP-based e-Archive API
 *
 * Based on official QNB Finans e-Archive Integration Guide
 * Contact: proje@destek.qnbefinans.com for production WSDL URLs
 */

const InvoiceService = require("./qnb/InvoiceService");
const QNBConfig = require("./qnb/config/QNBConfig");
const QNBHelpers = require("./qnb/utils/QNBHelpers");
const logger = require("../utils/logger");

class QNBFinansService {
  constructor() {
    // Initialize the modular invoice service
    this.invoiceService = new InvoiceService();

    // Maintain backward compatibility
    this.errorCodes = QNBConfig.ERROR_CODES;
  }

  /**
   * Test connection to QNB Finans API
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} Test result
   */
  async testConnection(config) {
    try {
      logger.info("Testing QNB Finans connection", {
        username: QNBHelpers.maskSensitiveData(config?.username || "N/A"),
      });

      const result = await this.invoiceService.testConnection(config);

      if (result.success) {
        logger.info("QNB Finans connection test successful");
      } else {
        logger.warn("QNB Finans connection test failed", {
          message: result.message,
          error: result.error,
        });
      }

      return result;
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
   * Login to QNB Finans system using UserService
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} Login result
   */
  async wsLogin(config) {
    try {
      const { username, password, language = "tr" } = config;

      if (!username || !password) {
        throw new Error("QNB Finans credentials not configured");
      }

      const soapEnvelope = {
        "soapenv:Envelope": {
          $: {
            "xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
            "xmlns:ser": "http://service.user.cs.com.tr/",
          },
          "soapenv:Header": {},
          "soapenv:Body": {
            "ser:wsLogin": {
              kullaniciAdi: username,
              sifre: password,
              dil: language,
            },
          },
        },
      };

      const soapXML = this.xmlBuilder.buildObject(soapEnvelope);

      const response = await axios.post(this.userServiceWSDL, soapXML, {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "",
        },
        withCredentials: true,
      });

      // Extract session cookie from response
      const cookies = response.headers["set-cookie"];
      if (cookies) {
        this.sessionCookie = cookies.find((cookie) =>
          cookie.includes("JSESSIONID")
        );
      }

      return {
        success: true,
        message: "QNB Finans login successful",
        sessionCookie: this.sessionCookie,
      };
    } catch (error) {
      logger.error(`QNB Finans login error: ${error.message}`, { error });
      return {
        success: false,
        message: `Login failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Logout from QNB Finans system
   * @returns {Object} Logout result
   */
  async logout() {
    try {
      const soapEnvelope = {
        "soapenv:Envelope": {
          $: {
            "xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
            "xmlns:ser": "http://service.user.cs.com.tr/",
          },
          "soapenv:Header": {},
          "soapenv:Body": {
            "ser:logout": {},
          },
        },
      };

      const soapXML = this.xmlBuilder.buildObject(soapEnvelope);

      await axios.post(this.userServiceWSDL, soapXML, {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "",
          Cookie: this.sessionCookie,
        },
      });

      this.sessionCookie = null;

      return {
        success: true,
        message: "Logout successful",
      };
    } catch (error) {
      logger.error(`QNB Finans logout error: ${error.message}`, { error });
      return {
        success: false,
        message: `Logout failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Create SOAP envelope with authentication header
   * @param {Object} bodyContent - SOAP body content
   * @param {Object} config - User's configuration
   * @returns {string} SOAP XML
   */
  createSOAPEnvelope(bodyContent, config = null) {
    const envelope = {
      "soapenv:Envelope": {
        $: {
          "xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
          "xmlns:ser": "http://service.earsiv.uut.cs.com.tr/",
        },
        "soapenv:Header": {},
        "soapenv:Body": bodyContent,
      },
    };

    // Add authentication header if no session cookie and config provided
    if (!this.sessionCookie && config && config.username && config.password) {
      envelope["soapenv:Envelope"]["soapenv:Header"] = {
        "wsse:Security": {
          $: {
            "xmlns:wsse":
              "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd",
          },
          "wsse:UsernameToken": {
            "wsse:Username": config.username,
            "wsse:Password": config.password,
          },
        },
      };
    }

    return this.xmlBuilder.buildObject(envelope);
  }

  /**
   * Make SOAP request to QNB Finans service
   * @param {string} soapXML - SOAP envelope XML
   * @param {Object} config - Configuration
   * @returns {Object} Parsed response
   */
  async makeSOAPRequest(soapXML, config) {
    try {
      const headers = {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "",
      };

      // Add session cookie if available
      if (this.sessionCookie) {
        headers.Cookie = this.sessionCookie;
      }

      const response = await axios.post(
        this.getWSDLURL(config.environment),
        soapXML,
        {
          headers,
          timeout: 30000,
        }
      );

      // Parse SOAP response
      const parsedResponse = await this.xmlParser.parseStringPromise(
        response.data
      );
      return this.parseSOAPResponse(parsedResponse);
    } catch (error) {
      logger.error(`SOAP request error: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Parse SOAP response and extract result
   * @param {Object} soapResponse - Parsed SOAP response
   * @returns {Object} Extracted result
   */
  parseSOAPResponse(soapResponse) {
    try {
      const body =
        soapResponse["S:Envelope"] ||
        soapResponse["soap:Envelope"] ||
        soapResponse["soapenv:Envelope"];
      const responseBody =
        body["S:Body"] || body["soap:Body"] || body["soapenv:Body"];

      // Extract the actual response content
      const responseKeys = Object.keys(responseBody);
      const responseContent = responseBody[responseKeys[0]];

      if (responseContent.return) {
        const result = responseContent.return;
        return {
          success: result.resultCode === "AE00000",
          resultCode: result.resultCode,
          resultText: result.resultText,
          resultExtra: result.resultExtra,
          output: responseContent.output,
          data: result,
        };
      }

      return responseContent;
    } catch (error) {
      logger.error(`SOAP response parsing error: ${error.message}`, { error });
      throw new Error("Failed to parse SOAP response");
    }
  }

  /**
   * Generate invoice number using QNB Finans API (faturaNoUret)
   * @param {Object} invoiceData - Invoice data
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} Invoice number generation result
   */
  async faturaNoUret(invoiceData, config) {
    try {
      logger.info("Generating QNB Finans invoice number", {
        transactionId: invoiceData?.transactionId,
      });

      const result = await this.invoiceService.faturaNoUret(
        invoiceData,
        config
      );

      if (result.success) {
        logger.info("QNB Finans invoice number generated successfully", {
          invoiceNumber: result.data?.invoiceNumber,
          transactionId: result.data?.transactionId,
        });
      } else {
        logger.warn("QNB Finans invoice number generation failed", {
          message: result.message,
          error: result.error,
        });
      }

      return result;
    } catch (error) {
      logger.error(
        `QNB Finans invoice number generation error: ${error.message}`,
        { error }
      );
      return {
        success: false,
        message: `Failed to generate invoice number: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Create e-archive invoice using QNB Finans API (faturaOlustur)
   * @param {Object} order - Order object
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} E-archive generation result
   */
  async faturaOlustur(order, config) {
    try {
      logger.info("Creating QNB Finans e-archive invoice", {
        orderId: order?.id,
        transactionId: order?.transactionId,
      });

      const result = await this.invoiceService.faturaOlustur(order, config);

      if (result.success) {
        logger.info("QNB Finans e-archive invoice created successfully", {
          invoiceNumber: result.data?.invoiceNumber,
          invoiceId: result.data?.invoiceId,
          orderId: order?.id,
        });
      } else {
        logger.warn("QNB Finans e-archive invoice creation failed", {
          message: result.message,
          error: result.error,
          orderId: order?.id,
        });
      }

      return result;
    } catch (error) {
      logger.error(`QNB Finans e-archive creation error: ${error.message}`, {
        error,
        orderId: order?.id,
      });
      return {
        success: false,
        message: `Failed to create e-archive invoice: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Query invoice using QNB Finans API (faturaSorgula)
   * @param {string} invoiceId - Invoice UUID
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} Invoice query result
   */
  async faturaSorgula(invoiceId, config) {
    try {
      logger.info("Querying QNB Finans invoice", { invoiceId });

      const result = await this.invoiceService.faturaSorgula(invoiceId, config);

      if (result.success) {
        logger.info("QNB Finans invoice query successful", { invoiceId });
      } else {
        logger.warn("QNB Finans invoice query failed", {
          message: result.message,
          error: result.error,
          invoiceId,
        });
      }

      return result;
    } catch (error) {
      logger.error(`QNB Finans invoice query error: ${error.message}`, {
        error,
        invoiceId,
      });
      return {
        success: false,
        message: `Failed to query invoice: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Cancel invoice using QNB Finans API (faturaIptalEt)
   * @param {string} invoiceId - Invoice UUID
   * @param {Object} config - User's QNB Finans configuration
   * @param {string} reason - Cancellation reason
   * @returns {Object} Cancellation result
   */
  async faturaIptalEt(invoiceId, config, reason = "İptal") {
    try {
      logger.info("Cancelling QNB Finans invoice", { invoiceId, reason });

      const result = await this.invoiceService.faturaIptalEt(
        invoiceId,
        config,
        reason
      );

      if (result.success) {
        logger.info("QNB Finans invoice cancelled successfully", { invoiceId });
      } else {
        logger.warn("QNB Finans invoice cancellation failed", {
          message: result.message,
          error: result.error,
          invoiceId,
        });
      }

      return result;
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

  /**
   * Create UBL invoice data for QNB Finans
   * @param {Object} order - Order object
   * @param {Object} config - Configuration
   * @returns {string} UBL XML string
   */
  createUBLInvoiceData(order, config) {
    const invoiceDate = new Date().toISOString().split("T")[0];
    const invoiceTime = new Date().toISOString().split("T")[1].split(".")[0];

    const ublData = {
      Invoice: {
        $: {
          xmlns: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
          "xmlns:cac":
            "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
          "xmlns:cbc":
            "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
        },
        "cbc:UBLVersionID": "2.1",
        "cbc:CustomizationID": "TR1.2",
        "cbc:ProfileID": "EARSIVFATURA",
        "cbc:ID": order.invoiceNumber || "TEMP",
        "cbc:CopyIndicator": "false",
        "cbc:UUID": order.uuid || this.generateUUID(),
        "cbc:IssueDate": invoiceDate,
        "cbc:IssueTime": invoiceTime,
        "cbc:InvoiceTypeCode": "SATIS",
        "cbc:DocumentCurrencyCode": "TRY",

        // Supplier Party (Company)
        "cac:AccountingSupplierParty": {
          "cac:Party": {
            "cac:PartyName": {
              "cbc:Name": config.companyInfo?.companyName || "",
            },
            "cac:PostalAddress": {
              "cbc:StreetName": config.companyInfo?.address || "",
              "cbc:CityName": config.companyInfo?.city || "",
              "cbc:PostalZone": config.companyInfo?.postalCode || "",
              "cac:Country": {
                "cbc:Name": "Türkiye",
              },
            },
            "cac:PartyTaxScheme": {
              "cbc:TaxNumber": config.companyInfo?.taxNumber || "",
            },
          },
        },

        // Customer Party
        "cac:AccountingCustomerParty": {
          "cac:Party": {
            "cac:PartyName": {
              "cbc:Name": this.getCustomerName(order),
            },
            "cac:PostalAddress": {
              "cbc:StreetName": this.getShippingAddress(order),
              "cbc:CityName": this.getShippingCity(order),
              "cbc:PostalZone": this.getShippingPostalCode(order),
              "cac:Country": {
                "cbc:Name": "Türkiye",
              },
            },
          },
        },

        // Invoice Lines
        "cac:InvoiceLine": this.prepareUBLInvoiceLines(order),

        // Tax Total
        "cac:TaxTotal": {
          "cbc:TaxAmount": {
            $: { currencyID: "TRY" },
            _: this.calculateTotalTax(order).toFixed(2),
          },
        },

        // Legal Monetary Total
        "cac:LegalMonetaryTotal": {
          "cbc:LineExtensionAmount": {
            $: { currencyID: "TRY" },
            _: this.calculateSubtotal(order).toFixed(2),
          },
          "cbc:TaxExclusiveAmount": {
            $: { currencyID: "TRY" },
            _: this.calculateSubtotal(order).toFixed(2),
          },
          "cbc:TaxInclusiveAmount": {
            $: { currencyID: "TRY" },
            _: (order.totalAmount || 0).toFixed(2),
          },
          "cbc:PayableAmount": {
            $: { currencyID: "TRY" },
            _: (order.totalAmount || 0).toFixed(2),
          },
        },
      },
    };

    return this.xmlBuilder.buildObject(ublData);
  }

  /**
   * Generate UUID for invoices
   * @returns {string} UUID
   */
  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  // Legacy method names for backward compatibility
  async generateEInvoice(order, config) {
    return await this.faturaOlustur(order, config);
  }

  async generateEArchive(order, config) {
    return await this.faturaOlustur(order, config);
  }

  async getInvoiceStatus(invoiceId, config) {
    return await this.faturaSorgula(invoiceId, config);
  }

  async cancelInvoice(invoiceId, config, reason = "") {
    return await this.faturaIptalEt(invoiceId, config, reason);
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

  prepareUBLInvoiceLines(order) {
    const items = order.items || [];

    return items.map((item, index) => ({
      "cbc:ID": (index + 1).toString(),
      "cbc:InvoicedQuantity": {
        $: { unitCode: "NIU" },
        _: item.quantity.toString(),
      },
      "cbc:LineExtensionAmount": {
        $: { currencyID: "TRY" },
        _: (item.price * item.quantity).toFixed(2),
      },
      "cac:Item": {
        "cbc:Name": item.productName || item.name || "",
        "cbc:Description": item.description || "",
        "cac:SellersItemIdentification": {
          "cbc:ID": item.sku || item.productId || "",
        },
      },
      "cac:Price": {
        "cbc:PriceAmount": {
          $: { currencyID: "TRY" },
          _: item.price.toFixed(2),
        },
      },
    }));
  }

  /**
   * Remove invoice cancellation using QNB Finans API (faturaIptaliKaldir)
   * @param {string} invoiceId - Invoice UUID
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} Cancellation removal result
   */
  async faturaIptaliKaldir(invoiceId, config) {
    try {
      logger.info("Removing QNB Finans invoice cancellation", { invoiceId });

      const result = await this.invoiceService.faturaIptaliKaldir(
        invoiceId,
        config
      );

      if (result.success) {
        logger.info("QNB Finans invoice cancellation removed successfully", {
          invoiceId,
        });
      } else {
        logger.warn("QNB Finans invoice cancellation removal failed", {
          message: result.message,
          error: result.error,
          invoiceId,
        });
      }

      return result;
    } catch (error) {
      logger.error(
        `QNB Finans invoice cancellation removal error: ${error.message}`,
        {
          error,
          invoiceId,
        }
      );
      return {
        success: false,
        message: `Failed to remove invoice cancellation: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Send email using QNB Finans API (ePostaGonder)
   * @param {string} invoiceId - Invoice UUID
   * @param {string} email - Recipient email
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} Email sending result
   */
  async ePostaGonder(invoiceId, email, config) {
    try {
      logger.info("Sending QNB Finans invoice email", { invoiceId, email });

      const result = await this.invoiceService.ePostaGonder(
        invoiceId,
        email,
        config
      );

      if (result.success) {
        logger.info("QNB Finans invoice email sent successfully", {
          invoiceId,
          email,
        });
      } else {
        logger.warn("QNB Finans invoice email sending failed", {
          message: result.message,
          error: result.error,
          invoiceId,
          email,
        });
      }

      return result;
    } catch (error) {
      logger.error(`QNB Finans invoice email sending error: ${error.message}`, {
        error,
        invoiceId,
        email,
      });
      return {
        success: false,
        message: `Failed to send invoice email: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Create draft invoice using QNB Finans API (faturaTaslakOlustur)
   * @param {Object} order - Order object
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} Draft creation result
   */
  async faturaTaslakOlustur(order, config) {
    try {
      logger.info("Creating QNB Finans draft invoice", {
        orderId: order?.id,
        transactionId: order?.transactionId,
      });

      const result = await this.invoiceService.faturaTaslakOlustur(
        order,
        config
      );

      if (result.success) {
        logger.info("QNB Finans draft invoice created successfully", {
          draftId: result.data?.draftId,
          transactionId: result.data?.transactionId,
          orderId: order?.id,
        });
      } else {
        logger.warn("QNB Finans draft invoice creation failed", {
          message: result.message,
          error: result.error,
          orderId: order?.id,
        });
      }

      return result;
    } catch (error) {
      logger.error(`QNB Finans draft creation error: ${error.message}`, {
        error,
        orderId: order?.id,
      });
      return {
        success: false,
        message: `Failed to create draft invoice: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Validate configuration using QNB helpers
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validateConfiguration(config) {
    return QNBHelpers.validateConfiguration(config);
  }

  /**
   * Validate order data using QNB helpers
   * @param {Object} order - Order to validate
   * @returns {Object} Validation result
   */
  validateOrderData(order) {
    return QNBHelpers.validateOrderData(order);
  }

  // Legacy method names for backward compatibility
  async generateEInvoice(order, config) {
    logger.info(
      "Legacy method generateEInvoice called, redirecting to faturaOlustur"
    );
    return await this.faturaOlustur(order, config);
  }

  async generateEArchive(order, config) {
    logger.info(
      "Legacy method generateEArchive called, redirecting to faturaOlustur"
    );
    return await this.faturaOlustur(order, config);
  }

  async getInvoiceStatus(invoiceId, config) {
    logger.info(
      "Legacy method getInvoiceStatus called, redirecting to faturaSorgula"
    );
    return await this.faturaSorgula(invoiceId, config);
  }

  async cancelInvoice(invoiceId, config, reason = "") {
    logger.info(
      "Legacy method cancelInvoice called, redirecting to faturaIptalEt"
    );
    return await this.faturaIptalEt(invoiceId, config, reason);
  }

  // Legacy helper methods (kept for backward compatibility)
  getCustomerName(order) {
    return (
      QNBHelpers.safeJSONParse(order.customerInfo, {})?.name ||
      order.customerName ||
      ""
    );
  }

  getCustomerTaxNumber(order) {
    return QNBHelpers.safeJSONParse(order.customerInfo, {})?.taxNumber || "";
  }

  getCustomerTCKN(order) {
    const customerInfo = QNBHelpers.safeJSONParse(order.customerInfo, {});
    return customerInfo?.tckn || customerInfo?.identityNumber || "";
  }

  getCustomerPhone(order) {
    return QNBHelpers.safeJSONParse(order.shippingAddress, {})?.phone || "";
  }

  getCustomerEmail(order) {
    return QNBHelpers.safeJSONParse(order.customerInfo, {})?.email || "";
  }

  getShippingAddress(order) {
    return QNBHelpers.safeJSONParse(order.shippingAddress, {})?.address || "";
  }

  getShippingCity(order) {
    return QNBHelpers.safeJSONParse(order.shippingAddress, {})?.city || "";
  }

  getShippingPostalCode(order) {
    return (
      QNBHelpers.safeJSONParse(order.shippingAddress, {})?.postalCode || ""
    );
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

  prepareUBLInvoiceLines(order) {
    const items = order.items || [];

    return items.map((item, index) => ({
      "cbc:ID": (index + 1).toString(),
      "cbc:InvoicedQuantity": {
        $: { unitCode: "NIU" },
        _: item.quantity.toString(),
      },
      "cbc:LineExtensionAmount": {
        $: { currencyID: "TRY" },
        _: (item.price * item.quantity).toFixed(2),
      },
      "cac:Item": {
        "cbc:Name": item.productName || item.name || "",
        "cbc:Description": item.description || "",
        "cac:SellersItemIdentification": {
          "cbc:ID": item.sku || item.productId || "",
        },
      },
      "cac:Price": {
        "cbc:PriceAmount": {
          $: { currencyID: "TRY" },
          _: item.price.toFixed(2),
        },
      },
    }));
  }
}

module.exports = new QNBFinansService();
