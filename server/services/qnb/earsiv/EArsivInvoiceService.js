/**
 * QNB Finans Invoice Service - Main Orchestrator
 * Coordinates authentication, SOAP communication, and UBL generation
 *
 * Based on QNB Finans e-Arşiv Entegrasyon Kılavuzu
 */

const QNBAuthManager = require('./auth/QNBAuthManager');
const SOAPClient = require('./soap/SOAPClient');
const UBLGenerator = require('./xml/UBLGenerator');
const QNBConfig = require('./config/QNBConfig');
const QNBHelpers = require('./utils/QNBHelpers');
const logger = require('../../utils/logger');

class InvoiceService {
  constructor() {
    this.authManager = new QNBAuthManager();
    this.soapClient = new SOAPClient();
    this.ublGenerator = new UBLGenerator();
  }

  /**
   * Test connection to QNB Finans API
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} Test result
   */
  async testConnection(config) {
    try {
      const loginResult = await this.authManager.login(config);

      if (!loginResult.success) {
        return loginResult;
      }

      await this.authManager.logout();

      return {
        success: true,
        message: 'QNB Finans connection successful',
        data: { authenticated: true }
      };
    } catch (error) {
      logger.error(`QNB Finans connection test error: ${error.message}`, {
        error
      });
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
        error: error.message
      };
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
      // Validate configuration
      const validation = QNBHelpers.validateConfiguration(config);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Configuration validation failed: ${validation.errors.join(
            ', '
          )}`,
          error: 'INVALID_CONFIG'
        };
      }

      // Login
      const loginResult = await this.authManager.login(config);
      if (!loginResult.success) {
        return loginResult;
      }

      // Prepare input data according to QNB documentation
      const inputData = {
        islemId:
          invoiceData.transactionId || QNBHelpers.generateTransactionId(),
        vkn: config.companyInfo?.taxNumber || '',
        sube: invoiceData.branch || QNBConfig.DEFAULT_BRANCH,
        kasa: invoiceData.register || QNBConfig.DEFAULT_REGISTER,
        tarih: QNBHelpers.formatDateForQNB(new Date())
      };

      // Create SOAP envelope
      const soapEnvelope = this.soapClient.createSOAPEnvelope({
        'ser:faturaNoUret': {
          input: JSON.stringify(inputData)
        }
      });

      // Make SOAP request
      const response = await this.soapClient.makeRequest(
        soapEnvelope,
        config.environment || 'test'
      );

      // Logout
      await this.authManager.logout();

      // Process response
      if (response.success && response.resultCode === QNBConfig.SUCCESS_CODE) {
        return {
          success: true,
          message: 'Invoice number generated successfully',
          data: {
            invoiceNumber: response.output,
            url: response.resultExtra?.url,
            transactionId: inputData.islemId,
            resultCode: response.resultCode
          }
        };
      } else {
        const errorMessage =
          QNBConfig.ERROR_CODES[response.resultCode] || response.resultText;
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error(
        `QNB Finans invoice number generation error: ${error.message}`,
        {
          error,
          invoiceData: invoiceData.transactionId
        }
      );

      // Ensure logout on error
      await this.authManager.logout();

      return {
        success: false,
        message: `Failed to generate invoice number: ${error.message}`,
        error: error.message
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
      // Validate configuration
      const validation = QNBHelpers.validateConfiguration(config);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Configuration validation failed: ${validation.errors.join(
            ', '
          )}`,
          error: 'INVALID_CONFIG'
        };
      }

      // Validate order data
      const orderValidation = QNBHelpers.validateOrderData(order);
      if (!orderValidation.isValid) {
        return {
          success: false,
          message: `Order validation failed: ${orderValidation.errors.join(
            ', '
          )}`,
          error: 'INVALID_ORDER_DATA'
        };
      }

      // Login
      const loginResult = await this.authManager.login(config);
      if (!loginResult.success) {
        return loginResult;
      }

      // Prepare input data according to QNB documentation
      const inputData = {
        donenBelgeFormati: 3, // PDF format
        islemId: order.transactionId || QNBHelpers.generateTransactionId(),
        vkn: config.companyInfo?.taxNumber || '',
        sube: order.branch || QNBConfig.DEFAULT_BRANCH,
        kasa: order.register || QNBConfig.DEFAULT_REGISTER,
        numaraVerilsinMi: config.autoGenerateNumber !== false ? 1 : 0,
        gzip: 0, // No compression
        taslagaYonlendir: config.sendToDraft ? 1 : 0,
        yerelFaturaNo: order.localInvoiceNumber || ''
      };

      // Generate UBL invoice XML
      const ublInvoiceXML = this.ublGenerator.generateInvoiceXML(order, config);

      // Create SOAP envelope with invoice data
      const soapEnvelope = this.soapClient.createSOAPEnvelope({
        'ser:faturaOlustur': {
          input: JSON.stringify(inputData),
          fatura: {
            belgeFormati: 0, // UBL format
            belgeIcerigi: Buffer.from(ublInvoiceXML).toString('base64')
          },
          output: {} // Holder type for output
        }
      });

      // Make SOAP request
      const response = await this.soapClient.makeRequest(
        soapEnvelope,
        config.environment || 'test'
      );

      // Logout
      await this.authManager.logout();

      // Process response
      if (response.success && response.resultCode === QNBConfig.SUCCESS_CODE) {
        return {
          success: true,
          message: 'E-archive invoice created successfully',
          data: {
            invoiceNumber: response.resultExtra?.faturaNo,
            invoiceId: response.resultExtra?.uuid,
            pdfUrl: response.resultExtra?.faturaURL,
            status: 'CREATED',
            transactionId: inputData.islemId,
            resultCode: response.resultCode
          }
        };
      } else {
        const errorMessage =
          QNBConfig.ERROR_CODES[response.resultCode] || response.resultText;
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error(`QNB Finans e-archive creation error: ${error.message}`, {
        error,
        orderId: order.id
      });

      // Ensure logout on error
      await this.authManager.logout();

      return {
        success: false,
        message: `Failed to create e-archive invoice: ${error.message}`,
        error: error.message
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
      // Validate configuration
      const validation = QNBHelpers.validateConfiguration(config);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Configuration validation failed: ${validation.errors.join(
            ', '
          )}`,
          error: 'INVALID_CONFIG'
        };
      }

      // Login
      const loginResult = await this.authManager.login(config);
      if (!loginResult.success) {
        return loginResult;
      }

      // Prepare input data
      const inputData = {
        uuid: invoiceId,
        vkn: config.companyInfo?.taxNumber || '',
        donenBelgeFormati: 3, // PDF format
        saklamadakiFaturalar: 1 // Include stored invoices
      };

      // Create SOAP envelope
      const soapEnvelope = this.soapClient.createSOAPEnvelope({
        'ser:faturaSorgula': {
          input: JSON.stringify(inputData),
          output: {} // Holder type for output
        }
      });

      // Make SOAP request
      const response = await this.soapClient.makeRequest(
        soapEnvelope,
        config.environment || 'test'
      );

      // Logout
      await this.authManager.logout();

      // Process response
      if (response.success && response.resultCode === QNBConfig.SUCCESS_CODE) {
        return {
          success: true,
          data: response.output,
          resultCode: response.resultCode
        };
      } else {
        const errorMessage =
          QNBConfig.ERROR_CODES[response.resultCode] || response.resultText;
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error(`QNB Finans invoice query error: ${error.message}`, {
        error,
        invoiceId
      });

      // Ensure logout on error
      await this.authManager.logout();

      return {
        success: false,
        message: `Failed to query invoice: ${error.message}`,
        error: error.message
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
  async faturaIptalEt(invoiceId, config, reason = 'İptal') {
    try {
      // Validate configuration
      const validation = QNBHelpers.validateConfiguration(config);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Configuration validation failed: ${validation.errors.join(
            ', '
          )}`,
          error: 'INVALID_CONFIG'
        };
      }

      // Login
      const loginResult = await this.authManager.login(config);
      if (!loginResult.success) {
        return loginResult;
      }

      // Prepare input data
      const inputData = {
        uuid: invoiceId,
        vkn: config.companyInfo?.taxNumber || '',
        iptalNedeni: reason
      };

      // Create SOAP envelope
      const soapEnvelope = this.soapClient.createSOAPEnvelope({
        'ser:faturaIptalEt': {
          input: JSON.stringify(inputData)
        }
      });

      // Make SOAP request
      const response = await this.soapClient.makeRequest(
        soapEnvelope,
        config.environment || 'test'
      );

      // Logout
      await this.authManager.logout();

      // Process response
      if (response.success && response.resultCode === QNBConfig.SUCCESS_CODE) {
        return {
          success: true,
          message: 'Invoice cancelled successfully',
          data: response.data,
          resultCode: response.resultCode
        };
      } else {
        const errorMessage =
          QNBConfig.ERROR_CODES[response.resultCode] || response.resultText;
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error(`QNB Finans invoice cancellation error: ${error.message}`, {
        error,
        invoiceId
      });

      // Ensure logout on error
      await this.authManager.logout();

      return {
        success: false,
        message: `Failed to cancel invoice: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Remove invoice cancellation using QNB Finans API (faturaIptaliKaldir)
   * @param {string} invoiceId - Invoice UUID
   * @param {Object} config - User's QNB Finans configuration
   * @returns {Object} Cancellation removal result
   */
  async faturaIptaliKaldir(invoiceId, config) {
    try {
      // Validate configuration
      const validation = QNBHelpers.validateConfiguration(config);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Configuration validation failed: ${validation.errors.join(
            ', '
          )}`,
          error: 'INVALID_CONFIG'
        };
      }

      // Login
      const loginResult = await this.authManager.login(config);
      if (!loginResult.success) {
        return loginResult;
      }

      // Prepare input data
      const inputData = {
        uuid: invoiceId,
        vkn: config.companyInfo?.taxNumber || ''
      };

      // Create SOAP envelope
      const soapEnvelope = this.soapClient.createSOAPEnvelope({
        'ser:faturaIptaliKaldir': {
          input: JSON.stringify(inputData)
        }
      });

      // Make SOAP request
      const response = await this.soapClient.makeRequest(
        soapEnvelope,
        config.environment || 'test'
      );

      // Logout
      await this.authManager.logout();

      // Process response
      if (response.success && response.resultCode === QNBConfig.SUCCESS_CODE) {
        return {
          success: true,
          message: 'Invoice cancellation removed successfully',
          data: response.data,
          resultCode: response.resultCode
        };
      } else {
        const errorMessage =
          QNBConfig.ERROR_CODES[response.resultCode] || response.resultText;
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error(
        `QNB Finans invoice cancellation removal error: ${error.message}`,
        {
          error,
          invoiceId
        }
      );

      // Ensure logout on error
      await this.authManager.logout();

      return {
        success: false,
        message: `Failed to remove invoice cancellation: ${error.message}`,
        error: error.message
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
      // Validate configuration
      const validation = QNBHelpers.validateConfiguration(config);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Configuration validation failed: ${validation.errors.join(
            ', '
          )}`,
          error: 'INVALID_CONFIG'
        };
      }

      // Login
      const loginResult = await this.authManager.login(config);
      if (!loginResult.success) {
        return loginResult;
      }

      // Prepare input data
      const inputData = {
        uuid: invoiceId,
        vkn: config.companyInfo?.taxNumber || '',
        ePosta: email
      };

      // Create SOAP envelope
      const soapEnvelope = this.soapClient.createSOAPEnvelope({
        'ser:ePostaGonder': {
          input: JSON.stringify(inputData)
        }
      });

      // Make SOAP request
      const response = await this.soapClient.makeRequest(
        soapEnvelope,
        config.environment || 'test'
      );

      // Logout
      await this.authManager.logout();

      // Process response
      if (response.success && response.resultCode === QNBConfig.SUCCESS_CODE) {
        return {
          success: true,
          message: 'Email sent successfully',
          data: response.data,
          resultCode: response.resultCode
        };
      } else {
        const errorMessage =
          QNBConfig.ERROR_CODES[response.resultCode] || response.resultText;
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error(`QNB Finans email sending error: ${error.message}`, {
        error,
        invoiceId,
        email
      });

      // Ensure logout on error
      await this.authManager.logout();

      return {
        success: false,
        message: `Failed to send email: ${error.message}`,
        error: error.message
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
      // Validate configuration and order
      const validation = QNBHelpers.validateConfiguration(config);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Configuration validation failed: ${validation.errors.join(
            ', '
          )}`,
          error: 'INVALID_CONFIG'
        };
      }

      const orderValidation = QNBHelpers.validateOrderData(order);
      if (!orderValidation.isValid) {
        return {
          success: false,
          message: `Order validation failed: ${orderValidation.errors.join(
            ', '
          )}`,
          error: 'INVALID_ORDER_DATA'
        };
      }

      // Login
      const loginResult = await this.authManager.login(config);
      if (!loginResult.success) {
        return loginResult;
      }

      // Prepare input data
      const inputData = {
        islemId: order.transactionId || QNBHelpers.generateTransactionId(),
        vkn: config.companyInfo?.taxNumber || '',
        sube: order.branch || QNBConfig.DEFAULT_BRANCH,
        kasa: order.register || QNBConfig.DEFAULT_REGISTER
      };

      // Generate UBL invoice XML
      const ublInvoiceXML = this.ublGenerator.generateInvoiceXML(order, config);

      // Create SOAP envelope
      const soapEnvelope = this.soapClient.createSOAPEnvelope({
        'ser:faturaTaslakOlustur': {
          input: JSON.stringify(inputData),
          fatura: {
            belgeFormati: 0, // UBL format
            belgeIcerigi: Buffer.from(ublInvoiceXML).toString('base64')
          },
          output: {} // Holder type for output
        }
      });

      // Make SOAP request
      const response = await this.soapClient.makeRequest(
        soapEnvelope,
        config.environment || 'test'
      );

      // Logout
      await this.authManager.logout();

      // Process response
      if (response.success && response.resultCode === QNBConfig.SUCCESS_CODE) {
        return {
          success: true,
          message: 'Draft invoice created successfully',
          data: {
            draftId: response.output,
            transactionId: inputData.islemId,
            resultCode: response.resultCode
          }
        };
      } else {
        const errorMessage =
          QNBConfig.ERROR_CODES[response.resultCode] || response.resultText;
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error(`QNB Finans draft creation error: ${error.message}`, {
        error,
        orderId: order.id
      });

      // Ensure logout on error
      await this.authManager.logout();

      return {
        success: false,
        message: `Failed to create draft invoice: ${error.message}`,
        error: error.message
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

  async cancelInvoice(invoiceId, config, reason = '') {
    return await this.faturaIptalEt(invoiceId, config, reason);
  }
}

module.exports = InvoiceService;
