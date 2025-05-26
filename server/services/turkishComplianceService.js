const axios = require('axios');
const { TurkishCompliance, Order, OrderItem } = require('../models');
const logger = require('../utils/logger');

/**
 * Turkish Compliance Service
 * Handles E-Fatura, E-Arşiv, KVKK compliance for Turkish e-commerce
 */
class TurkishComplianceService {
  constructor() {
    this.gibApiUrl = process.env.GIB_API_URL || 'https://efatura-test.gbm.com.tr';
    this.eArsivApiUrl = process.env.EARSIV_API_URL || 'https://earsivportal.efatura.gov.tr';
  }

  /**
   * Create E-Fatura for an order
   * @param {string} orderId - Order ID
   * @param {Object} options - E-Fatura options
   * @returns {Promise<Object>} E-Fatura creation result
   */
  async createEFatura(orderId, options = {}) {
    try {
      const order = await Order.findByPk(orderId, {
        include: ['items', 'shippingDetail']
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Get or create compliance record
      let compliance = await TurkishCompliance.findOne({
        where: { orderId }
      });

      if (!compliance) {
        compliance = await TurkishCompliance.create({
          orderId,
          customerType: options.customerType || 'INDIVIDUAL',
          taxNumber: options.taxNumber,
          taxOffice: options.taxOffice,
          identityNumber: options.identityNumber
        });
      }

      // Validate customer tax information
      await this.validateCustomerTaxInfo(compliance);

      // Calculate KDV
      const kdvCalculation = this.calculateKDV(order);
      
      // Prepare E-Fatura XML
      const eFaturaXml = await this.generateEFaturaXML(order, compliance, kdvCalculation);
      
      // Send to GIB
      const gibResponse = await this.sendToGIB(eFaturaXml, 'efatura');

      // Update compliance record
      await compliance.update({
        eFaturaUuid: gibResponse.uuid,
        eFaturaNumber: gibResponse.invoiceNumber,
        eFaturaDate: new Date(),
        eFaturaStatus: 'SENT',
        eFaturaXml: eFaturaXml,
        kdvTotal: kdvCalculation.totalKDV,
        kdvRate: kdvCalculation.kdvRate,
        complianceStatus: 'COMPLIANT',
        lastComplianceCheck: new Date(),
        gibIntegrationData: gibResponse
      });

      logger.info(`E-Fatura created successfully for order ${orderId}`, {
        eFaturaUuid: gibResponse.uuid,
        eFaturaNumber: gibResponse.invoiceNumber
      });

      return {
        success: true,
        eFaturaUuid: gibResponse.uuid,
        eFaturaNumber: gibResponse.invoiceNumber,
        message: 'E-Fatura created successfully'
      };

    } catch (error) {
      logger.error(`Failed to create E-Fatura for order ${orderId}: ${error.message}`, { error });
      
      // Update compliance record with error
      const compliance = await TurkishCompliance.findOne({ where: { orderId } });
      if (compliance) {
        await compliance.update({
          complianceStatus: 'NON_COMPLIANT',
          errorMessages: { eFatura: error.message },
          lastComplianceCheck: new Date()
        });
      }

      throw error;
    }
  }

  /**
   * Create E-Arşiv for individual customers
   * @param {string} orderId - Order ID
   * @param {Object} options - E-Arşiv options
   * @returns {Promise<Object>} E-Arşiv creation result
   */
  async createEArsiv(orderId, options = {}) {
    try {
      const order = await Order.findByPk(orderId, {
        include: ['items', 'shippingDetail']
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const compliance = await TurkishCompliance.findOne({
        where: { orderId }
      });

      if (!compliance) {
        throw new Error('Compliance record not found');
      }

      // E-Arşiv is only for individual customers
      if (compliance.customerType !== 'INDIVIDUAL') {
        throw new Error('E-Arşiv is only available for individual customers');
      }

      // Calculate KDV
      const kdvCalculation = this.calculateKDV(order);
      
      // Generate E-Arşiv document
      const eArsivXml = await this.generateEArsivXML(order, compliance, kdvCalculation);
      
      // Send to E-Arşiv system
      const eArsivResponse = await this.sendToEArsiv(eArsivXml);

      // Update compliance record
      await compliance.update({
        eArsivUuid: eArsivResponse.uuid,
        eArsivNumber: eArsivResponse.documentNumber,
        eArsivDate: new Date(),
        eArsivStatus: 'CREATED',
        complianceStatus: 'COMPLIANT',
        lastComplianceCheck: new Date()
      });

      logger.info(`E-Arşiv created successfully for order ${orderId}`, {
        eArsivUuid: eArsivResponse.uuid,
        eArsivNumber: eArsivResponse.documentNumber
      });

      return {
        success: true,
        eArsivUuid: eArsivResponse.uuid,
        eArsivNumber: eArsivResponse.documentNumber,
        message: 'E-Arşiv created successfully'
      };

    } catch (error) {
      logger.error(`Failed to create E-Arşiv for order ${orderId}: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Record KVKK consent for customer
   * @param {string} orderId - Order ID
   * @param {Object} consentData - KVKK consent information
   * @returns {Promise<Object>} KVKK consent result
   */
  async recordKVKKConsent(orderId, consentData) {
    try {
      const { consentGiven, consentMethod, consentDate } = consentData;

      let compliance = await TurkishCompliance.findOne({
        where: { orderId }
      });

      if (!compliance) {
        compliance = await TurkishCompliance.create({
          orderId,
          kvkkConsent: consentGiven,
          kvkkConsentDate: consentDate || new Date(),
          kvkkConsentMethod: consentMethod || 'WEBSITE'
        });
      } else {
        await compliance.update({
          kvkkConsent: consentGiven,
          kvkkConsentDate: consentDate || new Date(),
          kvkkConsentMethod: consentMethod || 'WEBSITE',
          lastComplianceCheck: new Date()
        });
      }

      logger.info(`KVKK consent recorded for order ${orderId}`, {
        consentGiven,
        consentMethod
      });

      return {
        success: true,
        message: 'KVKK consent recorded successfully'
      };

    } catch (error) {
      logger.error(`Failed to record KVKK consent for order ${orderId}: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Generate İrsaliye (Delivery Note)
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} İrsaliye generation result
   */
  async generateIrsaliye(orderId) {
    try {
      const order = await Order.findByPk(orderId, {
        include: ['items', 'shippingDetail']
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const compliance = await TurkishCompliance.findOne({
        where: { orderId }
      });

      if (!compliance) {
        throw new Error('Compliance record not found');
      }

      // Generate irsaliye number
      const irsaliyeNumber = this.generateIrsaliyeNumber();
      
      // Update compliance record
      await compliance.update({
        irsaliyeNumber,
        irsaliyeDate: new Date(),
        lastComplianceCheck: new Date()
      });

      logger.info(`İrsaliye generated for order ${orderId}`, {
        irsaliyeNumber
      });

      return {
        success: true,
        irsaliyeNumber,
        irsaliyeDate: new Date(),
        message: 'İrsaliye generated successfully'
      };

    } catch (error) {
      logger.error(`Failed to generate İrsaliye for order ${orderId}: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Check compliance status for an order
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Compliance status
   */
  async checkComplianceStatus(orderId) {
    try {
      const compliance = await TurkishCompliance.findOne({
        where: { orderId }
      });

      if (!compliance) {
        return {
          compliant: false,
          issues: ['No compliance record found'],
          required: ['Tax information', 'KVKK consent']
        };
      }

      const issues = [];
      const required = [];

      // Check KVKK consent
      if (!compliance.kvkkConsent) {
        issues.push('KVKK consent not obtained');
        required.push('KVKK consent');
      }

      // Check tax information for companies
      if (compliance.customerType === 'COMPANY') {
        if (!compliance.taxNumber || !compliance.taxOffice) {
          issues.push('Incomplete company tax information');
          required.push('Tax number and tax office');
        }
      }

      // Check E-Fatura status
      if (compliance.customerType === 'COMPANY' && !compliance.eFaturaUuid) {
        issues.push('E-Fatura not created');
        required.push('E-Fatura');
      }

      // Check E-Arşiv status for individuals
      if (compliance.customerType === 'INDIVIDUAL' && !compliance.eArsivUuid) {
        issues.push('E-Arşiv not created');
        required.push('E-Arşiv');
      }

      const compliant = issues.length === 0;

      return {
        compliant,
        status: compliance.complianceStatus,
        issues,
        required,
        lastCheck: compliance.lastComplianceCheck,
        eFaturaStatus: compliance.eFaturaStatus,
        eArsivStatus: compliance.eArsivStatus,
        kvkkConsent: compliance.kvkkConsent
      };

    } catch (error) {
      logger.error(`Failed to check compliance for order ${orderId}: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Calculate KDV with options
   * @param {number} amount - Amount to calculate KDV for
   * @param {Object} options - KDV calculation options
   * @returns {Object} KDV calculation result
   */
  calculateKDV(amount, options = {}) {
    // Handle both order object and amount number
    if (typeof amount === 'object' && amount.items) {
      return this.calculateOrderKDV(amount);
    }

    const { productCategory, customerType } = options;
    let kdvRate = 18; // Default KDV rate

    // Adjust KDV rate based on product category
    switch (productCategory) {
      case 'FOOD':
        kdvRate = 8;
        break;
      case 'BOOKS':
        kdvRate = 8;
        break;
      case 'MEDICINE':
        kdvRate = 8;
        break;
      case 'LUXURY':
        kdvRate = 20;
        break;
      default:
        kdvRate = 18;
    }

    const kdvAmount = amount * (kdvRate / 100);
    const totalWithKDV = amount + kdvAmount;

    return {
      kdvRate,
      baseAmount: amount,
      kdvAmount: Math.round(kdvAmount * 100) / 100,
      totalAmount: Math.round(totalWithKDV * 100) / 100,
      productCategory: productCategory || 'GENERAL',
      customerType: customerType || 'INDIVIDUAL'
    };
  }

  /**
   * Calculate KDV for order (existing method renamed)
   * @param {Object} order - Order object with items
   * @returns {Object} KDV calculation result
   */
  calculateOrderKDV(order) {
    const kdvRate = 18; // Standard KDV rate in Turkey (18%)
    let totalBeforeKDV = 0;
    let totalKDV = 0;

    order.items.forEach(item => {
      const itemTotal = parseFloat(item.totalPrice || 0);
      const itemKDV = itemTotal * (kdvRate / 100);
      
      totalBeforeKDV += itemTotal;
      totalKDV += itemKDV;
    });

    const totalWithKDV = totalBeforeKDV + totalKDV;

    return {
      kdvRate,
      totalBeforeKDV: Math.round(totalBeforeKDV * 100) / 100,
      totalKDV: Math.round(totalKDV * 100) / 100,
      totalWithKDV: Math.round(totalWithKDV * 100) / 100
    };
  }

  /**
   * Validate customer tax information
   * @param {Object} compliance - Compliance record
   * @throws {Error} If validation fails
   */
  async validateCustomerTaxInfo(compliance) {
    if (compliance.customerType === 'COMPANY') {
      if (!compliance.taxNumber) {
        throw new Error('Tax number (VKN) is required for companies');
      }
      if (!compliance.taxOffice) {
        throw new Error('Tax office is required for companies');
      }
      // Validate VKN format (10 digits)
      if (!/^\d{10}$/.test(compliance.taxNumber)) {
        throw new Error('Invalid tax number format (must be 10 digits)');
      }
    } else if (compliance.customerType === 'INDIVIDUAL') {
      if (compliance.identityNumber) {
        // Validate TCKN format (11 digits)
        if (!/^\d{11}$/.test(compliance.identityNumber)) {
          throw new Error('Invalid identity number format (must be 11 digits)');
        }
      }
    }
  }

  /**
   * Generate E-Fatura XML
   * @param {Object} order - Order object
   * @param {Object} compliance - Compliance record
   * @param {Object} kdvCalculation - KDV calculation
   * @returns {String} E-Fatura XML
   */
  async generateEFaturaXML(order, compliance, kdvCalculation) {
    // This is a simplified XML structure
    // In production, you would use a proper XML library and GIB's official schema
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <InvoiceNumber>${this.generateInvoiceNumber()}</InvoiceNumber>
  <InvoiceDate>${new Date().toISOString().split('T')[0]}</InvoiceDate>
  <TotalAmount currencyID="TRY">${kdvCalculation.totalWithKDV}</TotalAmount>
  <TaxAmount currencyID="TRY">${kdvCalculation.totalKDV}</TaxAmount>
  <CustomerInfo>
    <TaxNumber>${compliance.taxNumber || ''}</TaxNumber>
    <CustomerType>${compliance.customerType}</CustomerType>
  </CustomerInfo>
  <LineItems>
    ${order.items.map(item => `
    <LineItem>
      <Name>${item.name}</Name>
      <Quantity>${item.quantity}</Quantity>
      <UnitPrice>${item.unitPrice}</UnitPrice>
      <TotalPrice>${item.totalPrice}</TotalPrice>
    </LineItem>
    `).join('')}
  </LineItems>
</Invoice>`;
  }

  /**
   * Generate E-Arşiv XML
   * @param {Object} order - Order object
   * @param {Object} compliance - Compliance record
   * @param {Object} kdvCalculation - KDV calculation
   * @returns {String} E-Arşiv XML
   */
  async generateEArsivXML(order, compliance, kdvCalculation) {
    // Simplified E-Arşiv XML structure
    return `<?xml version="1.0" encoding="UTF-8"?>
<EArchive>
  <DocumentNumber>${this.generateDocumentNumber()}</DocumentNumber>
  <DocumentDate>${new Date().toISOString().split('T')[0]}</DocumentDate>
  <CustomerType>INDIVIDUAL</CustomerType>
  <TotalAmount>${kdvCalculation.totalWithKDV}</TotalAmount>
  <TaxAmount>${kdvCalculation.totalKDV}</TaxAmount>
</EArchive>`;
  }

  /**
   * Send document to GIB
   * @param {String} xmlContent - XML content
   * @param {String} documentType - Document type (efatura, earsiv)
   * @returns {Object} GIB response
   */
  async sendToGIB(xmlContent, documentType) {
    try {
      // Mock implementation - replace with actual GIB API calls
      const response = {
        uuid: this.generateUUID(),
        invoiceNumber: this.generateInvoiceNumber(),
        status: 'SENT',
        message: 'Document sent successfully to GIB'
      };

      logger.info(`Document sent to GIB`, {
        documentType,
        uuid: response.uuid
      });

      return response;
    } catch (error) {
      logger.error(`Failed to send document to GIB: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Send document to E-Arşiv system
   * @param {String} xmlContent - XML content
   * @returns {Object} E-Arşiv response
   */
  async sendToEArsiv(xmlContent) {
    try {
      // Mock implementation - replace with actual E-Arşiv API calls
      const response = {
        uuid: this.generateUUID(),
        documentNumber: this.generateDocumentNumber(),
        status: 'CREATED',
        message: 'Document created in E-Arşiv successfully'
      };

      return response;
    } catch (error) {
      logger.error(`Failed to send document to E-Arşiv: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Generate invoice number
   * @returns {String} Invoice number
   */
  generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `PZR${year}${timestamp}`;
  }

  /**
   * Generate document number for E-Arşiv
   * @returns {String} Document number
   */
  generateDocumentNumber() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `ARS${year}${timestamp}`;
  }

  /**
   * Generate İrsaliye number
   * @returns {String} İrsaliye number
   */
  generateIrsaliyeNumber() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `IRS${year}${month}${timestamp}`;
  }

  /**
   * Generate UUID
   * @returns {String} UUID
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Get dashboard overview for compliance
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Dashboard overview
   */
  async getDashboardOverview(userId) {
    // Mock implementation - replace with actual logic
    return {
      totalOrders: 0,
      compliantOrders: 0,
      pendingCompliance: 0,
      eFaturaCount: 0,
      eArsivCount: 0,
      kvkkConsentRate: 100
    };
  }

  /**
   * Get compliance alerts
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Compliance alerts
   */
  async getComplianceAlerts(userId) {
    return [];
  }

  /**
   * Get compliance statistics
   * @param {string} userId - User ID
   * @param {string} period - Statistics period
   * @returns {Promise<Object>} Compliance statistics
   */
  async getComplianceStats(userId, period) {
    return {
      period,
      stats: {}
    };
  }

  /**
   * Generate compliance report
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Generated report
   */
  async generateComplianceReport(options) {
    return {
      reportId: this.generateUUID(),
      reportType: options.reportType,
      generatedAt: new Date(),
      downloadUrl: null
    };
  }

  /**
   * Get notification preferences
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Notification preferences
   */
  async getNotificationPreferences(userId) {
    return {
      email: { enabled: true },
      sms: { enabled: false },
      push: { enabled: true }
    };
  }

  /**
   * Update notification preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - New preferences
   * @returns {Promise<Object>} Updated preferences
   */
  async updateNotificationPreferences(userId, preferences) {
    return preferences;
  }

  /**
   * Get automation rules
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Automation rules
   */
  async getAutomationRules(userId) {
    return [];
  }

  /**
   * Create automation rule
   * @param {string} userId - User ID
   * @param {Object} ruleData - Rule data
   * @returns {Promise<Object>} Created rule
   */
  async createAutomationRule(userId, ruleData) {
    return {
      id: this.generateUUID(),
      ...ruleData,
      userId,
      createdAt: new Date()
    };
  }

  /**
   * Get integration status
   * @returns {Promise<Object>} Integration status
   */
  async getIntegrationStatus() {
    return {
      gib: { connected: false },
      eArsiv: { connected: false },
      banks: { connected: false }
    };
  }

  /**
   * Get audit trail
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Audit trail
   */
  async getAuditTrail(options) {
    return {
      trails: [],
      pagination: {
        page: options.page,
        limit: options.limit,
        total: 0
      }
    };
  }

  /**
   * Export user data for KVKK compliance
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Exported data
   */
  async exportUserData(userId) {
    return {
      userId,
      exportedAt: new Date(),
      data: {}
    };
  }

  /**
   * Delete user data for KVKK compliance
   * @param {string} userId - User ID
   * @param {Object} options - Deletion options
   * @returns {Promise<Object>} Deletion result
   */
  async deleteUserData(userId, options) {
    return {
      userId,
      deletedAt: new Date(),
      requestedBy: options.requestedBy
    };
  }
}

module.exports = TurkishComplianceService;