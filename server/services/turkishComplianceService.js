const EventEmitter = require('events');
const { TurkishCompliance, Order, OrderItem } = require('../models');
const logger = require('../utils/logger');

/**
 * Turkish Compliance Service
 * Handles Turkish tax compliance requirements including:
 * - E-invoice generation (GIB schema)
 * - E-archive integration
 * - Tax calculations
 * - Document management
 * - Compliance status tracking
 */
class TurkishComplianceService extends EventEmitter {
  constructor() {
    super();

    this.complianceRules = {
      einvoiceThreshold: 50, // TRY
      companyVKNLength: 10,
      individualTCKNLength: 11,
      taxRate: 0.18, // 18% KDV
      exemptCategories: ['Books', 'Education', 'Medicine']
    };

    this.documentStatus = {
      DRAFT: 'draft',
      GENERATED: 'generated',
      SENT: 'sent',
      ACCEPTED: 'accepted',
      REJECTED: 'rejected',
      GIB_FAILED: 'gib_failed'
    };

    logger.info('Turkish Compliance Service initialized');
  }

  /**
   * Initialize compliance processing for an order
   */
  async initializeOrderCompliance(complianceData) {
    try {
      const { ComplianceDocuments } = require('../models');

      logger.info(
        `Initializing compliance for order ${complianceData.orderId}`
      );

      // Create compliance document record
      const complianceDoc = await ComplianceDocuments.create({
        orderId: complianceData.orderId,
        documentType: this.determineDocumentType(complianceData),
        status: this.documentStatus.DRAFT,
        customerType: complianceData.customerType,
        customerInfo: JSON.stringify(complianceData.customerInfo),
        orderData: JSON.stringify(complianceData.orderData),
        createdAt: new Date()
      });

      // Process based on compliance requirements
      if (this.requiresEInvoice(complianceData)) {
        await this.processEInvoice(complianceDoc, complianceData);
      } else {
        await this.processEArchive(complianceDoc, complianceData);
      }

      this.emit('complianceInitialized', {
        orderId: complianceData.orderId,
        documentId: complianceDoc.id,
        documentType: complianceDoc.documentType
      });

      return complianceDoc;
    } catch (error) {
      logger.error(
        `Compliance initialization failed for order ${complianceData.orderId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Determine document type based on customer and order data
   */
  determineDocumentType(complianceData) {
    if (complianceData.customerType === 'COMPANY') {
      return 'e-invoice';
    }

    const amount = complianceData.orderData.totalAmount;
    if (amount >= this.complianceRules.einvoiceThreshold) {
      return 'e-invoice';
    }

    return 'e-archive';
  }

  /**
   * Check if order requires e-invoice
   */
  requiresEInvoice(complianceData) {
    return this.determineDocumentType(complianceData) === 'e-invoice';
  }

  /**
   * Process e-invoice generation
   */
  async processEInvoice(complianceDoc, complianceData) {
    try {
      logger.info(`Processing e-invoice for order ${complianceData.orderId}`);

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber('EINV');

      // Calculate taxes
      const taxCalculation = this.calculateTaxes(complianceData.orderData);

      // Generate XML content (GIB UBL-TR schema)
      const xmlContent = this.generateEInvoiceXML({
        invoiceNumber,
        complianceData,
        taxCalculation
      });

      // Update compliance document
      await complianceDoc.update({
        documentNumber: invoiceNumber,
        xmlContent: xmlContent,
        status: this.documentStatus.GENERATED,
        generatedAt: new Date()
      });

      // Send to GIB system
      try {
        await this.sendToGIB(complianceDoc);
        logger.info(
          `E-invoice sent to GIB successfully for order ${complianceData.orderId}`,
          {
            invoiceNumber,
            documentId: complianceDoc.id
          }
        );
      } catch (gibError) {
        logger.error(
          `Failed to send e-invoice to GIB for order ${complianceData.orderId}:`,
          {
            error: gibError.message,
            invoiceNumber,
            documentId: complianceDoc.id
          }
        );
        // Update document status to indicate GIB submission failed
        await complianceDoc.update({
          status: this.documentStatus.GIB_FAILED,
          gibError: gibError.message
        });
      }

      this.emit('eInvoiceGenerated', {
        orderId: complianceData.orderId,
        invoiceNumber,
        documentId: complianceDoc.id
      });

      return complianceDoc;
    } catch (error) {
      logger.error(
        `E-invoice processing failed for order ${complianceData.orderId}:`,
        error
      );
      await complianceDoc.update({ status: this.documentStatus.REJECTED });
      throw error;
    }
  }

  /**
   * Process e-archive generation
   */
  async processEArchive(complianceDoc, complianceData) {
    try {
      logger.info(`Processing e-archive for order ${complianceData.orderId}`);

      // Generate archive number
      const archiveNumber = await this.generateInvoiceNumber('ARCH');

      // Calculate taxes
      const taxCalculation = this.calculateTaxes(complianceData.orderData);

      // Generate XML content
      const xmlContent = this.generateEArchiveXML({
        archiveNumber,
        complianceData,
        taxCalculation
      });

      // Update compliance document
      await complianceDoc.update({
        documentNumber: archiveNumber,
        xmlContent: xmlContent,
        status: this.documentStatus.GENERATED,
        generatedAt: new Date()
      });

      this.emit('eArchiveGenerated', {
        orderId: complianceData.orderId,
        archiveNumber,
        documentId: complianceDoc.id
      });

      return complianceDoc;
    } catch (error) {
      logger.error(
        `E-archive processing failed for order ${complianceData.orderId}:`,
        error
      );
      await complianceDoc.update({ status: this.documentStatus.REJECTED });
      throw error;
    }
  }

  /**
   * Calculate taxes for order items
   */
  calculateTaxes(orderData) {
    const items = orderData.items || [];
    let subtotal = 0;
    let totalTax = 0;

    const taxedItems = items.map((item) => {
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      const isExempt = this.complianceRules.exemptCategories.includes(
        item.productCategory
      );
      const taxAmount = isExempt ? 0 : itemTotal * this.complianceRules.taxRate;

      subtotal += itemTotal;
      totalTax += taxAmount;

      return {
        ...item,
        itemTotal,
        taxAmount,
        taxRate: isExempt ? 0 : this.complianceRules.taxRate,
        isExempt
      };
    });

    return {
      items: taxedItems,
      subtotal,
      totalTax,
      grandTotal: subtotal + totalTax,
      currency: orderData.currency || 'TRY'
    };
  }

  /**
   * Generate unique invoice/archive number
   */
  async generateInvoiceNumber(prefix) {
    const year = new Date().getFullYear();
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');

    return `${prefix}${year}${timestamp}${random}`;
  }

  /**
   * Generate e-invoice XML (simplified GIB UBL-TR schema)
   */
  generateEInvoiceXML({ invoiceNumber, complianceData, taxCalculation }) {
    const currentDate = new Date().toISOString().split('T')[0];
    const customerInfo = complianceData.customerInfo;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>${invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${currentDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${
  taxCalculation.currency
}</cbc:DocumentCurrencyCode>
  
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Pazar+ Marketplace</cbc:Name>
      </cac:PartyName>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${customerInfo.name}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${customerInfo.address?.address1 || ''}</cbc:StreetName>
        <cbc:CityName>${customerInfo.address?.city || ''}</cbc:CityName>
        <cbc:PostalZone>${
  customerInfo.address?.postalCode || ''
}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>TR</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  ${taxCalculation.items
    .map(
      (item, index) => `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="NIU">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${
  taxCalculation.currency
}">${item.itemTotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${item.productName || 'Product'}</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${
  taxCalculation.currency
}">${item.price.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${
  taxCalculation.currency
}">${item.taxAmount.toFixed(2)}</cbc:TaxAmount>
    </cac:TaxTotal>
  </cac:InvoiceLine>`
    )
    .join('')}
  
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${
  taxCalculation.currency
}">${taxCalculation.totalTax.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${
  taxCalculation.currency
}">${taxCalculation.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${
  taxCalculation.currency
}">${taxCalculation.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${
  taxCalculation.currency
}">${taxCalculation.grandTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${
  taxCalculation.currency
}">${taxCalculation.grandTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;
  }

  /**
   * Generate e-archive XML (simplified)
   */
  generateEArchiveXML({ archiveNumber, complianceData, taxCalculation }) {
    const currentDate = new Date().toISOString().split('T')[0];
    const customerInfo = complianceData.customerInfo;

    return `<?xml version="1.0" encoding="UTF-8"?>
<ArchiveInvoice>
  <ID>${archiveNumber}</ID>
  <IssueDate>${currentDate}</IssueDate>
  <DocumentType>ARCHIVE</DocumentType>
  <Currency>${taxCalculation.currency}</Currency>
  
  <Supplier>
    <Name>Pazar+ Marketplace</Name>
  </Supplier>
  
  <Customer>
    <Name>${customerInfo.name}</Name>
    <Email>${customerInfo.email || ''}</Email>
    <Phone>${customerInfo.phone || ''}</Phone>
  </Customer>
  
  <Items>
    ${taxCalculation.items
    .map(
      (item, index) => `
    <Item>
      <LineNumber>${index + 1}</LineNumber>
      <ProductName>${item.productName || 'Product'}</ProductName>
      <Quantity>${item.quantity}</Quantity>
      <UnitPrice>${item.price.toFixed(2)}</UnitPrice>
      <TotalAmount>${item.itemTotal.toFixed(2)}</TotalAmount>
      <TaxAmount>${item.taxAmount.toFixed(2)}</TaxAmount>
    </Item>`
    )
    .join('')}
  </Items>
  
  <Summary>
    <Subtotal>${taxCalculation.subtotal.toFixed(2)}</Subtotal>
    <TotalTax>${taxCalculation.totalTax.toFixed(2)}</TotalTax>
    <GrandTotal>${taxCalculation.grandTotal.toFixed(2)}</GrandTotal>
  </Summary>
</ArchiveInvoice>`;
  }

  /**
   * Get compliance status for an order
   */
  async getComplianceStatus(orderId) {
    try {
      const { ComplianceDocuments } = require('../models');

      const docs = await ComplianceDocuments.findAll({
        where: { orderId },
        order: [['createdAt', 'DESC']]
      });

      return {
        orderId,
        hasCompliance: docs.length > 0,
        documents: docs.map((doc) => ({
          id: doc.id,
          type: doc.documentType,
          number: doc.documentNumber,
          status: doc.status,
          createdAt: doc.createdAt,
          generatedAt: doc.generatedAt
        }))
      };
    } catch (error) {
      logger.error(
        `Failed to get compliance status for order ${orderId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(dateRange) {
    try {
      const { ComplianceDocuments } = require('../models');
      const { Op } = require('sequelize');

      const docs = await ComplianceDocuments.findAll({
        where: {
          createdAt: {
            [Op.between]: [dateRange.startDate, dateRange.endDate]
          }
        },
        order: [['createdAt', 'DESC']]
      });

      const stats = {
        total: docs.length,
        eInvoices: docs.filter((d) => d.documentType === 'e-invoice').length,
        eArchives: docs.filter((d) => d.documentType === 'e-archive').length,
        statuses: {
          draft: docs.filter((d) => d.status === this.documentStatus.DRAFT)
            .length,
          generated: docs.filter(
            (d) => d.status === this.documentStatus.GENERATED
          ).length,
          sent: docs.filter((d) => d.status === this.documentStatus.SENT)
            .length,
          accepted: docs.filter(
            (d) => d.status === this.documentStatus.ACCEPTED
          ).length,
          rejected: docs.filter(
            (d) => d.status === this.documentStatus.REJECTED
          ).length
        }
      };

      return {
        dateRange,
        stats,
        documents: docs
      };
    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  /**
   * Send compliance document to GIB (Revenue Administration) system
   * @param {Object} complianceDoc - The compliance document to send
   * @returns {Promise<Object>} GIB response
   */
  async sendToGIB(complianceDoc) {
    try {
      const gibConfig = {
        endpoint: process.env.GIB_ENDPOINT || 'https://test-ebelge.gib.gov.tr',
        username: process.env.GIB_USERNAME,
        password: process.env.GIB_PASSWORD,
        timeout: parseInt(process.env.GIB_TIMEOUT || '30000')
      };

      if (!gibConfig.username || !gibConfig.password) {
        throw new Error('GIB credentials not configured');
      }

      logger.info(`Sending document to GIB: ${complianceDoc.documentNumber}`, {
        documentId: complianceDoc.id,
        documentType: complianceDoc.documentType,
        endpoint: gibConfig.endpoint
      });

      // Prepare the SOAP envelope for GIB submission
      const soapEnvelope = this.createGIBSoapEnvelope(complianceDoc, gibConfig);

      // For now, simulate the GIB API call
      // In production, this would make an actual SOAP request to GIB
      const gibResponse = await this.simulateGIBSubmission(
        soapEnvelope,
        gibConfig
      );

      // Update document status based on GIB response
      await complianceDoc.update({
        status: gibResponse.success
          ? this.documentStatus.SENT
          : this.documentStatus.GIB_FAILED,
        gibSubmissionId: gibResponse.submissionId,
        gibResponse: gibResponse,
        sentAt: gibResponse.success ? new Date() : null
      });

      logger.info(
        `GIB submission completed for document ${complianceDoc.documentNumber}`,
        {
          success: gibResponse.success,
          submissionId: gibResponse.submissionId
        }
      );

      return gibResponse;
    } catch (error) {
      logger.error(
        `GIB submission failed for document ${complianceDoc.documentNumber}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Create SOAP envelope for GIB submission
   * @param {Object} complianceDoc - The compliance document
   * @param {Object} gibConfig - GIB configuration
   * @returns {string} SOAP envelope XML
   */
  createGIBSoapEnvelope(complianceDoc, gibConfig) {
    const documentXml = Buffer.from(complianceDoc.xmlContent).toString(
      'base64'
    );

    return `<?xml version="1.0" encoding="UTF-8"?>
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:gib="http://gib.gov.tr/">
        <soapenv:Header>
          <gib:Authentication>
            <gib:Username>${gibConfig.username}</gib:Username>
            <gib:Password>${gibConfig.password}</gib:Password>
          </gib:Authentication>
        </soapenv:Header>
        <soapenv:Body>
          <gib:SendDocument>
            <gib:DocumentType>${complianceDoc.documentType}</gib:DocumentType>
            <gib:DocumentNumber>${
  complianceDoc.documentNumber
}</gib:DocumentNumber>
            <gib:DocumentContent>${documentXml}</gib:DocumentContent>
            <gib:Timestamp>${new Date().toISOString()}</gib:Timestamp>
          </gib:SendDocument>
        </soapenv:Body>
      </soapenv:Envelope>`;
  }

  /**
   * Simulate GIB submission for development/testing
   * @param {string} soapEnvelope - The SOAP envelope
   * @param {Object} gibConfig - GIB configuration
   * @returns {Promise<Object>} Simulated GIB response
   */
  async simulateGIBSubmission(soapEnvelope, gibConfig) {
    // Simulate network delay
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 2000)
    );

    // Simulate success/failure based on configuration
    const shouldSucceed =
      process.env.NODE_ENV !== 'production' || Math.random() > 0.1;

    if (shouldSucceed) {
      return {
        success: true,
        submissionId: `GIB_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        status: 'ACCEPTED',
        message: 'Document successfully submitted to GIB',
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error('GIB system temporarily unavailable');
    }
  }
}

module.exports = { TurkishComplianceService };
