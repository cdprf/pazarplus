/**
 * UBL Invoice Generator for QNB Finans e-Archive
 * Generates UBL 2.1 compliant XML for Turkish e-archive standards
 */

let xml2js;
let xmlEnabled = true;

try {
  xml2js = require('xml2js');
} catch (error) {
  console.warn('XML processing dependencies not available:', error.message);
  xmlEnabled = false;

  // Create fallback XML implementation
  xml2js = {
    Builder: class {
      constructor() {}
      buildObject() {
        throw new Error('XML generation disabled - dependencies not available');
      }
    },
    parseString: () => {
      throw new Error('XML parsing disabled - dependencies not available');
    }
  };
}

const config = require('../config/QNBConfig');
const QNBHelpers = require('../utils/QNBHelpers');

class UBLGenerator {
  constructor() {
    if (!xmlEnabled) {
      console.warn('UBL Generator disabled - XML dependencies not available');
      return;
    }

    this.xmlBuilder = new xml2js.Builder({ headless: true });
  }

  /**
   * Generate complete UBL invoice XML
   * @param {Object} order - Order/invoice data
   * @param {Object} companyInfo - Company information
   * @param {Object} options - Generation options
   * @returns {string} UBL XML string
   */
  generateInvoiceUBL(order, companyInfo, options = {}) {
    const {
      invoiceNumber = 'TEMP',
      uuid = this.generateUUID(),
      profileId = config.invoiceProfiles.E_ARCHIVE,
      copyIndicator = config.defaults.copyIndicator,
      customizationId = config.defaults.customizationId
    } = options;

    const invoiceDate = this.formatDate(new Date());
    const invoiceTime = this.formatTime(new Date());

    const ublData = {
      Invoice: {
        $: {
          xmlns: config.namespaces.ubl,
          'xmlns:cac': config.namespaces.cac,
          'xmlns:cbc': config.namespaces.cbc
        },

        // Document identification
        'cbc:UBLVersionID': config.defaults.ublVersion,
        'cbc:CustomizationID': customizationId,
        'cbc:ProfileID': profileId,
        'cbc:ID': invoiceNumber,
        'cbc:CopyIndicator': copyIndicator,
        'cbc:UUID': uuid,
        'cbc:IssueDate': invoiceDate,
        'cbc:IssueTime': invoiceTime,
        'cbc:InvoiceTypeCode': config.defaults.invoiceTypeCode,
        'cbc:DocumentCurrencyCode': config.defaults.currency,

        // Additional notes
        ...(order.notes && { 'cbc:Note': order.notes }),

        // Supplier party (company)
        'cac:AccountingSupplierParty': this.createSupplierParty(companyInfo),

        // Customer party
        'cac:AccountingCustomerParty': this.createCustomerParty(order),

        // Invoice lines
        'cac:InvoiceLine': this.createInvoiceLines(order),

        // Tax totals
        'cac:TaxTotal': this.createTaxTotal(order),

        // Legal monetary totals
        'cac:LegalMonetaryTotal': this.createMonetaryTotal(order)
      }
    };

    return this.xmlBuilder.buildObject(ublData);
  }

  /**
   * Create supplier party section
   * @param {Object} companyInfo - Company information
   * @returns {Object} UBL supplier party
   */
  createSupplierParty(companyInfo) {
    return {
      'cac:Party': {
        'cac:PartyName': {
          'cbc:Name': companyInfo.companyName || ''
        },
        'cac:PostalAddress': {
          'cbc:StreetName': companyInfo.address || '',
          'cbc:CityName': companyInfo.city || '',
          'cbc:PostalZone': companyInfo.postalCode || '',
          'cac:Country': {
            'cbc:IdentificationCode': config.defaults.country,
            'cbc:Name': config.defaults.countryName
          }
        },
        'cac:PartyTaxScheme': {
          'cbc:TaxNumber': companyInfo.taxNumber || '',
          'cac:TaxScheme': {
            'cbc:Name': 'VKN'
          }
        },
        ...(companyInfo.phone && {
          'cac:Contact': {
            'cbc:Telephone': companyInfo.phone,
            ...(companyInfo.email && {
              'cbc:ElectronicMail': companyInfo.email
            })
          }
        })
      }
    };
  }

  /**
   * Create customer party section
   * @param {Object} order - Order data
   * @returns {Object} UBL customer party
   */
  createCustomerParty(order) {
    const customerName = QNBHelpers.getCustomerName(order);
    const customerTaxNumber = QNBHelpers.getCustomerTaxNumber(order);
    const customerTCKN = QNBHelpers.getCustomerTCKN(order);

    const party = {
      'cac:Party': {
        'cac:PartyName': {
          'cbc:Name': customerName
        },
        'cac:PostalAddress': {
          'cbc:StreetName': QNBHelpers.getShippingAddress(order),
          'cbc:CityName': QNBHelpers.getShippingCity(order),
          'cbc:PostalZone': QNBHelpers.getShippingPostalCode(order),
          'cac:Country': {
            'cbc:IdentificationCode': config.defaults.country,
            'cbc:Name': config.defaults.countryName
          }
        }
      }
    };

    // Add tax identification
    if (customerTaxNumber) {
      party['cac:Party']['cac:PartyTaxScheme'] = {
        'cbc:TaxNumber': customerTaxNumber,
        'cac:TaxScheme': {
          'cbc:Name': 'VKN'
        }
      };
    } else if (customerTCKN) {
      party['cac:Party']['cac:PartyIdentification'] = {
        'cbc:ID': {
          $: { schemeID: 'TCKN' },
          _: customerTCKN
        }
      };
    }

    // Add contact information
    const phone = QNBHelpers.getCustomerPhone(order);
    const email = QNBHelpers.getCustomerEmail(order);

    if (phone || email) {
      party['cac:Party']['cac:Contact'] = {};
      if (phone) {party['cac:Party']['cac:Contact']['cbc:Telephone'] = phone;}
      if (email)
      {party['cac:Party']['cac:Contact']['cbc:ElectronicMail'] = email;}
    }

    return party;
  }

  /**
   * Create invoice lines
   * @param {Object} order - Order data
   * @returns {Array} UBL invoice lines
   */
  createInvoiceLines(order) {
    const items = order.items || [];

    return items.map((item, index) => {
      const lineExtensionAmount = item.price * item.quantity;
      const taxAmount =
        lineExtensionAmount * (item.taxRate || config.defaultTaxRates.VAT_18);

      return {
        'cbc:ID': (index + 1).toString(),
        'cbc:InvoicedQuantity': {
          $: { unitCode: 'NIU' }, // Number of items unit
          _: item.quantity.toString()
        },
        'cbc:LineExtensionAmount': {
          $: { currencyID: config.defaults.currency },
          _: lineExtensionAmount.toFixed(2)
        },
        'cac:Item': {
          'cbc:Name': item.productName || item.name || '',
          ...(item.description && { 'cbc:Description': item.description }),
          'cac:SellersItemIdentification': {
            'cbc:ID': item.sku || item.productId || ''
          },
          'cac:ClassifiedTaxCategory': {
            'cbc:ID': 'S', // Standard rate
            'cbc:Percent': (
              (item.taxRate || config.defaultTaxRates.VAT_18) * 100
            ).toFixed(0),
            'cac:TaxScheme': {
              'cbc:ID': 'KDV',
              'cbc:Name': 'Katma Değer Vergisi'
            }
          }
        },
        'cac:Price': {
          'cbc:PriceAmount': {
            $: { currencyID: config.defaults.currency },
            _: item.price.toFixed(2)
          }
        },
        'cac:TaxTotal': {
          'cbc:TaxAmount': {
            $: { currencyID: config.defaults.currency },
            _: taxAmount.toFixed(2)
          },
          'cac:TaxSubtotal': {
            'cbc:TaxableAmount': {
              $: { currencyID: config.defaults.currency },
              _: lineExtensionAmount.toFixed(2)
            },
            'cbc:TaxAmount': {
              $: { currencyID: config.defaults.currency },
              _: taxAmount.toFixed(2)
            },
            'cac:TaxCategory': {
              'cbc:ID': 'S',
              'cbc:Percent': (
                (item.taxRate || config.defaultTaxRates.VAT_18) * 100
              ).toFixed(0),
              'cac:TaxScheme': {
                'cbc:ID': 'KDV'
              }
            }
          }
        }
      };
    });
  }

  /**
   * Create tax total section
   * @param {Object} order - Order data
   * @returns {Object} UBL tax total
   */
  createTaxTotal(order) {
    const taxSubtotals = QNBHelpers.calculateTaxSubtotals(order);
    const totalTaxAmount = QNBHelpers.calculateTotalTax(order);

    return {
      'cbc:TaxAmount': {
        $: { currencyID: config.defaults.currency },
        _: totalTaxAmount.toFixed(2)
      },
      'cac:TaxSubtotal': taxSubtotals.map((subtotal) => ({
        'cbc:TaxableAmount': {
          $: { currencyID: config.defaults.currency },
          _: subtotal.taxableAmount.toFixed(2)
        },
        'cbc:TaxAmount': {
          $: { currencyID: config.defaults.currency },
          _: subtotal.taxAmount.toFixed(2)
        },
        'cac:TaxCategory': {
          'cbc:ID': 'S',
          'cbc:Percent': subtotal.taxCategory.taxPercent.toFixed(0),
          'cac:TaxScheme': {
            'cbc:ID': 'KDV',
            'cbc:Name': 'Katma Değer Vergisi'
          }
        }
      }))
    };
  }

  /**
   * Create legal monetary total section
   * @param {Object} order - Order data
   * @returns {Object} UBL monetary total
   */
  createMonetaryTotal(order) {
    const lineExtensionAmount = QNBHelpers.calculateSubtotal(order);
    const taxAmount = QNBHelpers.calculateTotalTax(order);
    const taxInclusiveAmount = lineExtensionAmount + taxAmount;
    const payableAmount = order.totalAmount || taxInclusiveAmount;

    return {
      'cbc:LineExtensionAmount': {
        $: { currencyID: config.defaults.currency },
        _: lineExtensionAmount.toFixed(2)
      },
      'cbc:TaxExclusiveAmount': {
        $: { currencyID: config.defaults.currency },
        _: lineExtensionAmount.toFixed(2)
      },
      'cbc:TaxInclusiveAmount': {
        $: { currencyID: config.defaults.currency },
        _: taxInclusiveAmount.toFixed(2)
      },
      'cbc:PayableAmount': {
        $: { currencyID: config.defaults.currency },
        _: payableAmount.toFixed(2)
      }
    };
  }

  /**
   * Generate UUID for invoices
   * @returns {string} UUID v4
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  /**
   * Format date for UBL
   * @param {Date} date - Date to format
   * @returns {string} Formatted date (YYYY-MM-DD)
   */
  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  /**
   * Format time for UBL
   * @param {Date} date - Date to format
   * @returns {string} Formatted time (HH:MM:SS)
   */
  formatTime(date) {
    return date.toISOString().split('T')[1].split('.')[0];
  }

  /**
   * Validate UBL XML structure
   * @param {string} ublXml - UBL XML to validate
   * @returns {Object} Validation result
   */
  validateUBL(ublXml) {
    try {
      // Basic XML validation
      const xml2js = require('xml2js');
      const parser = new xml2js.Parser();

      parser.parseString(ublXml, (err, result) => {
        if (err) {
          throw new Error(`Invalid XML: ${err.message}`);
        }
      });

      // Basic UBL structure validation
      if (!ublXml.includes('<Invoice') || !ublXml.includes('</Invoice>')) {
        throw new Error('Invalid UBL structure - missing Invoice element');
      }

      return {
        isValid: true,
        message: 'UBL XML is valid'
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

module.exports = UBLGenerator;
