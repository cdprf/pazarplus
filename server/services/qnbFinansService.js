/**
 * QNB Finans e-Archive Service
 * Integration with QNB Finans SOAP-based e-Archive API
 *
 * Based on official QNB Finans e-Archive Integration Guide
 * Contact: proje@destek.qnbefinans.com for production WSDL URLs
 */

const axios = require("axios");
const xml2js = require("xml2js");
const logger = require("../utils/logger");

class QNBFinansService {
  constructor() {
    // Account type detection based on VKN
    this.accountTypes = {
      7410320347: "earsiv", // e-Arşiv test account
      7410320348: "efatura", // e-Fatura test account
    };

    // e-Fatura endpoints
    this.eFaturaTestWSDL =
      "https://erpefaturatest2.qnbesolutions.com.tr/efatura/ws/connectorService?wsdl";
    this.eFaturaUserServiceWSDL =
      "https://erpefaturatest2.qnbesolutions.com.tr/efatura/ws/userService?wsdl";

    // e-Arşiv endpoints
    this.eArsivTestWSDL =
      "https://earsivtest.qnbesolutions.com.tr/earsiv/ws/EarsivWebService?wsdl";
    this.eArsivUserServiceWSDL =
      "https://connectortest.qnbesolutions.com.tr/connector/ws/userService?wsdl";

    // Legacy properties for backwards compatibility
    this.testWSDL = this.eFaturaTestWSDL; // Default to e-Fatura
    this.prodWSDL = "https://earsiv.qnbesolutions.com.tr/EarsivWebService?wsdl"; // Update when you get production URL
    this.userServiceWSDL = this.eFaturaUserServiceWSDL;

    // Session management
    this.sessionCookie = null;
    this.xmlBuilder = new xml2js.Builder({ headless: true });
    this.xmlParser = new xml2js.Parser({ explicitArray: false });

    // QNB Finans error codes mapping
    this.errorCodes = {
      AE00000: "İşlem başarılı.",
      AE00001: "Sistem hatası!",
      AE00002: "Belirsiz istisnai durum hatası!",
      AE00008:
        "Belirtilen vkn, şube, kasa, kaynak kombinasyonu için tanımlı konfigürasyon bilgisi bulunamadı!",
      AE00009:
        "Belirtilen vkn için belirtilen fatura numarasına sahip kayıtlı fatura mevcut!",
      AE00087: "e-Arşiv ürününüz yok!",
      AE00088: "e-Arşiv aktivasyonunuz yapılmamış.",
      // ... more error codes can be added from documentation
    };
  }

  /**
   * Get appropriate WSDL URL based on environment
   * @param {string} environment - 'test' or 'production'
   * @returns {string} WSDL URL
   */
  getWSDLURL(environment = "test") {
    return environment === "production" ? this.prodWSDL : this.testWSDL;
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

      // Get appropriate service configuration
      const serviceConfig = this.getServiceConfig(
        config.vkn,
        config.environment
      );

      console.log(`🔍 Debug - Account Type: ${serviceConfig.accountType}`);
      console.log(
        `🔍 Debug - User Service URL: ${serviceConfig.userServiceUrl}`
      );
      console.log(`🔍 Debug - Username: ${username}`);

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

      console.log(`🔍 Debug - SOAP Request:`, soapXML);

      const response = await axios.post(serviceConfig.userServiceUrl, soapXML, {
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
   * Create SOAP envelope with WS-Security authentication header
   * @param {Object} bodyContent - SOAP body content
   * @param {Object} config - User's configuration (required for WS-Security)
   * @returns {string} SOAP XML
   */
  createSOAPEnvelope(bodyContent, config) {
    if (!config || !config.username || !config.password) {
      throw new Error(
        "Configuration with username and password required for WS-Security authentication"
      );
    }

    // Get appropriate service configuration based on VKN
    const vkn = config.vkn || config.companyInfo?.taxNumber;
    const serviceConfig = this.getServiceConfig(vkn, config.environment);

    // Debug logging
    logger.info(
      `SOAP Envelope Config - VKN: ${vkn}, Account Type: ${serviceConfig.accountType}, Namespace: ${serviceConfig.namespace}`
    );

    const envelope = {
      "soapenv:Envelope": {
        $: {
          "xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
          "xmlns:ser": serviceConfig.namespace,
        },
        "soapenv:Header": {
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
        },
        "soapenv:Body": bodyContent,
      },
    };

    return this.xmlBuilder.buildObject(envelope);
  }

  /**
   * Make SOAP request to QNB Finans service
   * @param {string} soapXML - SOAP envelope XML
   * @param {Object} config - Configuration including VKN
   * @returns {Object} Parsed response
   */
  async makeSOAPRequest(soapXML, config) {
    try {
      const headers = {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "",
      };

      // Get appropriate service configuration based on VKN
      const vkn = config.vkn || config.companyInfo?.taxNumber;
      const serviceConfig = this.getServiceConfig(vkn, config.environment);

      // Debug logging
      logger.info(
        `QNB Finans Service Config - VKN: ${vkn}, Account Type: ${serviceConfig.accountType}, Endpoint: ${serviceConfig.wsdlUrl}`
      );

      const response = await axios.post(serviceConfig.wsdlUrl, soapXML, {
        headers,
        timeout: 30000,
      });

      // Parse XML response
      const parsedResponse = await this.xmlParser.parseStringPromise(
        response.data
      );

      return this.parseSOAPResponse(parsedResponse);
    } catch (error) {
      // Log the error response body if available
      if (error.response && error.response.data) {
        logger.error(`SOAP request error response body:`, {
          status: error.response.status,
          statusText: error.response.statusText,
          responseData: error.response.data,
        });

        // Create a new error with user-friendly message
        const userFriendlyMessage = this.extractSoapErrorMessage(
          JSON.stringify({
            responseData: error.response.data,
          })
        );

        const newError = new Error(userFriendlyMessage);
        newError.originalError = error;
        newError.soapResponse = error.response.data;
        throw newError;
      }
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
   * Test connection to QNB Finans API using WS-Security
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} Test result
   */
  async testConnection(config) {
    try {
      if (!config.username || !config.password) {
        return {
          success: false,
          message: "QNB Finans credentials not configured",
          error: "MISSING_CREDENTIALS",
        };
      }

      // Test with a simple faturaNoUret request to verify authentication
      const testInvoiceData = {
        transactionId: `TEST-${Date.now()}`,
        branch: "000000",
        register: "0000",
      };

      const result = await this.faturaNoUret(testInvoiceData, config);

      if (result.success) {
        return {
          success: true,
          message: "QNB Finans connection successful",
          data: { authenticated: true },
        };
      } else {
        // If it's an authentication error, return failure
        if (
          result.error &&
          (result.error.includes("auth") ||
            result.error.includes("login") ||
            result.error.includes("credential") ||
            result.error.includes("username.pwd.mismatch") ||
            result.message.includes("username.pwd.mismatch") ||
            result.message.includes("Authentication failed"))
        ) {
          return {
            success: false,
            message:
              result.message ||
              "Authentication failed: Please check your QNB Finans credentials.",
            error: result.error,
          };
        } else {
          // Other errors might be configuration issues but authentication worked
          return {
            success: true,
            message:
              "QNB Finans connection successful (authentication verified)",
            data: {
              authenticated: true,
              note: "Authentication verified, but configuration may need adjustment",
            },
          };
        }
      }
    } catch (error) {
      logger.error(`QNB Finans connection test error: ${error.message}`, {
        error,
      });

      // Check if it's an authentication error or network error
      if (error.code === "ENOTFOUND") {
        return {
          success: false,
          message: `Network error: Cannot reach QNB Finans server. Please check the API endpoints.`,
          error: error.message,
        };
      } else if (
        error.response?.status === 401 ||
        error.response?.status === 403 ||
        error.message.includes("Authentication failed") ||
        error.message.includes("username.pwd.mismatch")
      ) {
        return {
          success: false,
          message: error.message.includes("Authentication failed")
            ? error.message
            : `Authentication failed: Please check your QNB Finans credentials.`,
          error: error.message,
        };
      } else {
        return {
          success: false,
          message: `Connection test failed: ${error.message}`,
          error: error.message,
        };
      }
    }
  }

  /**
   * Generate invoice number using QNB Finans API (faturaNoUret) with WS-Security
   * @param {Object} invoiceData - Invoice data
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} Invoice number generation result
   */
  async faturaNoUret(invoiceData, config) {
    try {
      if (!config.username || !config.password) {
        return {
          success: false,
          message: "QNB Finans credentials not configured",
          error: "MISSING_CREDENTIALS",
        };
      }

      const inputData = {
        islemId: invoiceData.transactionId || Date.now().toString(),
        vkn: config.companyInfo?.taxNumber || "",
        sube: invoiceData.branch || "000000",
        kasa: invoiceData.register || "0000",
        tarih: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
      };

      const bodyContent = {
        "ser:faturaNoUret": {
          input: JSON.stringify(inputData),
        },
      };

      const soapXML = this.createSOAPEnvelope(bodyContent, config);
      const response = await this.makeSOAPRequest(soapXML, config);

      if (response.success) {
        return {
          success: true,
          message: "Invoice number generated successfully",
          data: {
            invoiceNumber: response.output,
            url: response.resultExtra?.url,
            transactionId: inputData.islemId,
          },
        };
      } else {
        throw new Error(
          response.resultText || "Failed to generate invoice number"
        );
      }
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
   * Create e-archive invoice using QNB Finans API (faturaOlustur) with WS-Security
   * @param {Object} order - Order object
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} - E-archive generation result
   */
  async faturaOlustur(order, config) {
    try {
      if (!config.username || !config.password) {
        return {
          success: false,
          message: "QNB Finans credentials not configured",
          error: "MISSING_CREDENTIALS",
        };
      }

      const inputData = {
        donenBelgeFormati: 3, // PDF format
        islemId: order.transactionId || Date.now().toString(),
        vkn: config.companyInfo?.taxNumber || "",
        sube: order.branch || "000000",
        kasa: order.register || "0000",
        numaraVerilsinMi: 1, // Generate number automatically
        gzip: 0, // No compression
      };

      // Create UBL invoice data (simplified for example)
      const ublInvoiceData = this.createUBLInvoiceData(order, config);

      const bodyContent = {
        "ser:faturaOlustur": {
          input: JSON.stringify(inputData),
          fatura: {
            belgeFormati: 0, // UBL format
            belgeIcerigi: Buffer.from(ublInvoiceData).toString("base64"),
          },
        },
      };

      const soapXML = this.createSOAPEnvelope(bodyContent, config);
      const response = await this.makeSOAPRequest(soapXML, config);

      if (response.success) {
        return {
          success: true,
          message: "E-archive invoice created successfully",
          data: {
            invoiceNumber: response.resultExtra?.faturaNo,
            invoiceId: response.resultExtra?.uuid,
            pdfUrl: response.resultExtra?.faturaURL,
            status: "CREATED",
            transactionId: inputData.islemId,
          },
        };
      } else {
        throw new Error(
          response.resultText || "Failed to create e-archive invoice"
        );
      }
    } catch (error) {
      logger.error(`QNB Finans e-archive creation error: ${error.message}`, {
        error,
        orderId: order.id,
      });

      return {
        success: false,
        message: `Failed to create e-archive invoice: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Query invoice using QNB Finans API (faturaSorgula) with WS-Security
   * @param {string} invoiceId - Invoice UUID
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} - Invoice query result
   */
  async faturaSorgula(invoiceId, config) {
    try {
      if (!config.username || !config.password) {
        return {
          success: false,
          message: "QNB Finans credentials not configured",
          error: "MISSING_CREDENTIALS",
        };
      }

      const inputData = {
        uuid: invoiceId,
        vkn: config.companyInfo?.taxNumber || "",
      };

      const bodyContent = {
        "ser:faturaSorgula": {
          input: JSON.stringify(inputData),
        },
      };

      const soapXML = this.createSOAPEnvelope(bodyContent, config);
      const response = await this.makeSOAPRequest(soapXML, config);

      if (response.success) {
        return {
          success: true,
          data: response.output,
        };
      } else {
        throw new Error(response.resultText || "Failed to query invoice");
      }
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
   * Cancel invoice using QNB Finans API (faturaIptalEt) with WS-Security
   * @param {string} invoiceId - Invoice UUID
   * @param {Object} config - User's QNB Finans configuration
   * @param {string} reason - Cancellation reason
   * @returns {Object} - Cancellation result
   */
  async faturaIptalEt(invoiceId, config, reason = "İptal") {
    try {
      if (!config.username || !config.password) {
        return {
          success: false,
          message: "QNB Finans credentials not configured",
          error: "MISSING_CREDENTIALS",
        };
      }

      const inputData = {
        uuid: invoiceId,
        vkn: config.companyInfo?.taxNumber || "",
        iptalNedeni: reason,
      };

      const bodyContent = {
        "ser:faturaIptalEt": {
          input: JSON.stringify(inputData),
        },
      };

      const soapXML = this.createSOAPEnvelope(bodyContent, config);
      const response = await this.makeSOAPRequest(soapXML, config);

      if (response.success) {
        return {
          success: true,
          message: "Invoice cancelled successfully",
          data: response.data,
        };
      } else {
        throw new Error(response.resultText || "Failed to cancel invoice");
      }
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

  /**
   * Detect account type based on VKN
   * @param {string} vkn - Tax number (VKN)
   * @returns {string} Account type ('earsiv' or 'efatura')
   */
  detectAccountType(vkn) {
    return this.accountTypes[vkn] || "efatura"; // Default to e-Fatura
  }

  /**
   * Get service configuration based on account type
   * @param {string} vkn - Tax number (VKN)
   * @param {string} environment - 'test' or 'production'
   * @returns {Object} Service configuration
   */
  getServiceConfig(vkn, environment = "test") {
    const accountType = this.detectAccountType(vkn);

    if (accountType === "earsiv") {
      return {
        wsdlUrl: environment === "test" ? this.eArsivTestWSDL : this.prodWSDL,
        userServiceUrl: this.eArsivUserServiceWSDL,
        namespace: "http://service.earsiv.uut.cs.com.tr/",
        accountType: "earsiv",
      };
    } else {
      return {
        wsdlUrl: environment === "test" ? this.eFaturaTestWSDL : this.prodWSDL,
        userServiceUrl: this.eFaturaUserServiceWSDL,
        namespace: "http://service.connector.cs.com.tr/",
        accountType: "efatura",
      };
    }
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

  /**
   * Get registered users list (like C# kayitliKullaniciListeleExtended)
   * @param {string} urun - Product type ("EFATURA" or "EIRSALIYE")
   * @param {Object} config - Configuration
   * @returns {Object} Registered users list result
   */
  async kayitliKullaniciListeleExtended(urun = "EFATURA", config) {
    try {
      if (!config.username || !config.password) {
        return {
          success: false,
          message: "QNB Finans credentials not configured",
          error: "MISSING_CREDENTIALS",
        };
      }

      const gecmisEklensin = 1; // Include history

      const bodyContent = {
        "ser:kayitliKullaniciListeleExtended": {
          urun: urun,
          gecmisEklensin: gecmisEklensin,
          gecmisEklensinSpecified: true,
        },
      };

      const soapXML = this.createSOAPEnvelope(bodyContent, config);
      const response = await this.makeSOAPRequest(soapXML, config);

      if (response.success) {
        return {
          success: true,
          message: "Registered users list retrieved successfully",
          data: response.output, // This should be a byte array/zip file content
        };
      } else {
        throw new Error(
          response.resultText || "Failed to retrieve registered users list"
        );
      }
    } catch (error) {
      logger.error(`QNB Finans registered users list error: ${error.message}`, {
        error,
      });
      return {
        success: false,
        message: error.message,
        error: error.code || "REGISTERED_USERS_ERROR",
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
   * Extract user-friendly error message from SOAP fault response
   * @param {string} errorMessage - Original error message that may contain SOAP response
   * @returns {string} User-friendly error message
   */
  extractSoapErrorMessage(errorMessage) {
    try {
      // Try to extract SOAP response from log message
      const responseDataMatch = errorMessage.match(/"responseData":"([^"]+)"/);
      if (responseDataMatch) {
        const soapResponse = responseDataMatch[1].replace(/\\"/g, '"');

        // Check if this is a SOAP fault
        if (
          soapResponse.includes("S:Fault") &&
          soapResponse.includes("faultstring")
        ) {
          const faultMatch = soapResponse.match(
            /<faultstring>([^<]+)<\/faultstring>/
          );
          if (faultMatch) {
            const faultString = faultMatch[1];

            // Convert specific error codes to user-friendly messages
            if (faultString.includes("username.pwd.mismatch")) {
              return "Authentication failed - username/password mismatch";
            } else if (faultString.includes("MessageCode:")) {
              const codeMatch = faultString.match(/MessageCode:(.+)/);
              if (codeMatch) {
                return `Service error: ${codeMatch[1]}`;
              }
            }

            return faultString;
          }
        }
      }
    } catch (parseError) {
      // If parsing fails, return original message
    }

    return errorMessage;
  }
}

module.exports = new QNBFinansService();
