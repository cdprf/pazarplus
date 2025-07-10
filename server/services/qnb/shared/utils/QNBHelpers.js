/**
 * QNB Finans Utility Helpers
 * Common utility functions for QNB Finans e-Archive integration
 *
 * Based on QNB Finans e-Arşiv Entegrasyon Kılavuzu
 */

const crypto = require('crypto');
const QNBConfig = require('../config/QNBConfig');

class QNBHelpers {
  /**
   * Generate unique transaction ID for QNB operations
   * @returns {string} Transaction ID
   */
  static generateTransactionId() {
    return crypto.randomUUID();
  }

  /**
   * Format date for QNB Finans API (yyyy-MM-dd HH:mm:ss)
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string
   */
  static formatDateForQNB(date) {
    if (!date || !(date instanceof Date)) {
      date = new Date();
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Format date for UBL XML (yyyy-MM-dd)
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string
   */
  static formatDateForUBL(date) {
    if (!date || !(date instanceof Date)) {
      date = new Date();
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Format time for UBL XML (HH:mm:ss)
   * @param {Date} date - Date to get time from
   * @returns {string} Formatted time string
   */
  static formatTimeForUBL(date) {
    if (!date || !(date instanceof Date)) {
      date = new Date();
    }

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Format currency amount for QNB/UBL (2 decimal places)
   * @param {number} amount - Amount to format
   * @returns {string} Formatted amount
   */
  static formatCurrency(amount) {
    if (typeof amount !== 'number') {
      amount = parseFloat(amount) || 0;
    }
    return amount.toFixed(2);
  }

  /**
   * Calculate VAT amount from total and VAT rate
   * @param {number} totalAmount - Total amount including VAT
   * @param {number} vatRate - VAT rate (e.g., 18 for 18%)
   * @returns {Object} VAT calculation result
   */
  static calculateVAT(totalAmount, vatRate) {
    if (typeof totalAmount !== 'number') {
      totalAmount = parseFloat(totalAmount) || 0;
    }
    if (typeof vatRate !== 'number') {
      vatRate = parseFloat(vatRate) || 0;
    }

    const vatMultiplier = 1 + vatRate / 100;
    const baseAmount = totalAmount / vatMultiplier;
    const vatAmount = totalAmount - baseAmount;

    return {
      baseAmount: parseFloat(baseAmount.toFixed(2)),
      vatAmount: parseFloat(vatAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      vatRate: vatRate
    };
  }

  /**
   * Validate Turkish tax number (VKN/TCKN)
   * @param {string} taxNumber - Tax number to validate
   * @returns {boolean} Is valid
   */
  static validateTurkishTaxNumber(taxNumber) {
    if (!taxNumber || typeof taxNumber !== 'string') {
      return false;
    }

    // Remove spaces and convert to string
    taxNumber = taxNumber.replace(/\s/g, '');

    // Check if it's 10 digits (VKN) or 11 digits (TCKN)
    if (!/^\d{10}$/.test(taxNumber) && !/^\d{11}$/.test(taxNumber)) {
      return false;
    }

    if (taxNumber.length === 11) {
      // TCKN validation
      return this.validateTCKN(taxNumber);
    } else {
      // VKN validation (basic format check)
      return /^\d{10}$/.test(taxNumber);
    }
  }

  /**
   * Validate Turkish Citizenship Number (TCKN)
   * @param {string} tckn - TCKN to validate
   * @returns {boolean} Is valid
   */
  static validateTCKN(tckn) {
    if (!tckn || tckn.length !== 11 || !/^\d{11}$/.test(tckn)) {
      return false;
    }

    const digits = tckn.split('').map(Number);

    // First digit cannot be 0
    if (digits[0] === 0) {
      return false;
    }

    // Calculate check digits
    const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const sum2 = digits[1] + digits[3] + digits[5] + digits[7];

    const check1 = (sum1 * 7 - sum2) % 10;
    const check2 = (sum1 + sum2 + digits[9]) % 10;

    return check1 === digits[9] && check2 === digits[10];
  }

  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid
   */
  static validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validate QNB Finans configuration
   * @param {Object} config - Configuration object
   * @returns {Object} Validation result
   */
  static validateConfiguration(config) {
    const errors = [];

    if (!config) {
      errors.push('Configuration is required');
      return { isValid: false, errors };
    }

    // Required fields
    if (!config.username) {
      errors.push('Username is required');
    }

    if (!config.password) {
      errors.push('Password is required');
    }

    if (!config.companyInfo) {
      errors.push('Company information is required');
    } else {
      if (!config.companyInfo.taxNumber) {
        errors.push('Company tax number is required');
      } else if (!this.validateTurkishTaxNumber(config.companyInfo.taxNumber)) {
        errors.push('Invalid Turkish tax number format');
      }

      if (!config.companyInfo.name) {
        errors.push('Company name is required');
      }

      if (!config.companyInfo.address) {
        errors.push('Company address is required');
      }
    }

    // Optional but validated if present
    if (config.environment && !QNBConfig.ENVIRONMENTS[config.environment]) {
      errors.push(`Invalid environment: ${config.environment}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate order data for invoice generation
   * @param {Object} order - Order object
   * @returns {Object} Validation result
   */
  static validateOrderData(order) {
    const errors = [];

    if (!order) {
      errors.push('Order data is required');
      return { isValid: false, errors };
    }

    // Required order fields
    if (!order.id) {
      errors.push('Order ID is required');
    }

    if (!order.customer) {
      errors.push('Customer information is required');
    } else {
      if (!order.customer.name) {
        errors.push('Customer name is required');
      }

      if (!order.customer.address) {
        errors.push('Customer address is required');
      }

      // Validate customer tax number if corporate customer
      if (
        order.customer.taxNumber &&
        !this.validateTurkishTaxNumber(order.customer.taxNumber)
      ) {
        errors.push('Invalid customer tax number format');
      }

      // Validate customer email if provided
      if (order.customer.email && !this.validateEmail(order.customer.email)) {
        errors.push('Invalid customer email format');
      }
    }

    if (
      !order.items ||
      !Array.isArray(order.items) ||
      order.items.length === 0
    ) {
      errors.push('Order items are required');
    } else {
      order.items.forEach((item, index) => {
        if (!item.name) {
          errors.push(`Item ${index + 1}: Product name is required`);
        }

        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Valid quantity is required`);
        }

        if (!item.unitPrice || item.unitPrice < 0) {
          errors.push(`Item ${index + 1}: Valid unit price is required`);
        }

        if (
          item.vatRate !== undefined &&
          (item.vatRate < 0 || item.vatRate > 100)
        ) {
          errors.push(`Item ${index + 1}: VAT rate must be between 0 and 100`);
        }
      });
    }

    if (!order.total || order.total <= 0) {
      errors.push('Valid order total is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize string for XML
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized string
   */
  static sanitizeForXML(str) {
    if (!str || typeof str !== 'string') {
      return '';
    }

    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .trim();
  }

  /**
   * Generate invoice sequence number
   * @param {string} prefix - Prefix for sequence
   * @param {number} number - Sequential number
   * @returns {string} Formatted sequence
   */
  static generateInvoiceSequence(prefix = 'INV', number) {
    if (typeof number !== 'number') {
      number = parseInt(number) || 1;
    }

    const year = new Date().getFullYear();
    const paddedNumber = String(number).padStart(8, '0');

    return `${prefix}${year}${paddedNumber}`;
  }

  /**
   * Convert Turkish locale number to standard format
   * @param {string} turkishNumber - Number in Turkish locale format
   * @returns {number} Parsed number
   */
  static parseTurkishNumber(turkishNumber) {
    if (typeof turkishNumber === 'number') {
      return turkishNumber;
    }

    if (!turkishNumber || typeof turkishNumber !== 'string') {
      return 0;
    }

    // Replace Turkish decimal separator (comma) with dot
    // Remove thousand separators (dots in Turkish format)
    const normalized = turkishNumber
      .replace(/\./g, '') // Remove thousand separators
      .replace(/,/g, '.'); // Replace decimal separator

    return parseFloat(normalized) || 0;
  }

  /**
   * Format number in Turkish locale
   * @param {number} number - Number to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted number
   */
  static formatTurkishNumber(number, decimals = 2) {
    if (typeof number !== 'number') {
      number = parseFloat(number) || 0;
    }

    return number.toLocaleString('tr-TR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Generate UUID v4
   * @returns {string} UUID
   */
  static generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * Create hash for data integrity
   * @param {string} data - Data to hash
   * @param {string} algorithm - Hash algorithm (default: sha256)
   * @returns {string} Hash
   */
  static createHash(data, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Safe JSON parse with fallback
   * @param {string} jsonString - JSON string to parse
   * @param {*} fallback - Fallback value if parse fails
   * @returns {*} Parsed object or fallback
   */
  static safeJSONParse(jsonString, fallback = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return fallback;
    }
  }

  /**
   * Get Turkish province code by name
   * @param {string} provinceName - Province name
   * @returns {string} Province code
   */
  static getTurkishProvinceCode(provinceName) {
    const provinces = {
      adana: '01',
      adıyaman: '02',
      afyonkarahisar: '03',
      ağrı: '04',
      amasya: '05',
      ankara: '06',
      antalya: '07',
      artvin: '08',
      aydın: '09',
      balıkesir: '10',
      bilecik: '11',
      bingöl: '12',
      bitlis: '13',
      bolu: '14',
      burdur: '15',
      bursa: '16',
      çanakkale: '17',
      çankırı: '18',
      çorum: '19',
      denizli: '20',
      diyarbakır: '21',
      edirne: '22',
      elazığ: '23',
      erzincan: '24',
      erzurum: '25',
      eskişehir: '26',
      gaziantep: '27',
      giresun: '28',
      gümüşhane: '29',
      hakkari: '30',
      hatay: '31',
      isparta: '32',
      mersin: '33',
      istanbul: '34',
      izmir: '35',
      kars: '36',
      kastamonu: '37',
      kayseri: '38',
      kırklareli: '39',
      kırşehir: '40',
      kocaeli: '41',
      konya: '42',
      kütahya: '43',
      malatya: '44',
      manisa: '45',
      kahramanmaraş: '46',
      mardin: '47',
      muğla: '48',
      muş: '49',
      nevşehir: '50',
      niğde: '51',
      ordu: '52',
      rize: '53',
      sakarya: '54',
      samsun: '55',
      siirt: '56',
      sinop: '57',
      sivas: '58',
      tekirdağ: '59',
      tokat: '60',
      trabzon: '61',
      tunceli: '62',
      şanlıurfa: '63',
      uşak: '64',
      van: '65',
      yozgat: '66',
      zonguldak: '67',
      aksaray: '68',
      bayburt: '69',
      karaman: '70',
      kırıkkale: '71',
      batman: '72',
      şırnak: '73',
      bartın: '74',
      ardahan: '75',
      iğdır: '76',
      yalova: '77',
      karabük: '78',
      kilis: '79',
      osmaniye: '80',
      düzce: '81'
    };

    if (!provinceName || typeof provinceName !== 'string') {
      return '34'; // Default to Istanbul
    }

    const normalized = provinceName
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');

    return provinces[normalized] || '34';
  }

  /**
   * Mask sensitive data for logging
   * @param {string} data - Sensitive data
   * @param {number} visibleChars - Number of visible characters at start/end
   * @returns {string} Masked data
   */
  static maskSensitiveData(data, visibleChars = 2) {
    if (!data || typeof data !== 'string' || data.length <= visibleChars * 2) {
      return '***';
    }

    const start = data.substring(0, visibleChars);
    const end = data.substring(data.length - visibleChars);
    const middle = '*'.repeat(Math.max(3, data.length - visibleChars * 2));

    return `${start}${middle}${end}`;
  }

  /**
   * Get current timestamp in ISO format
   * @returns {string} ISO timestamp
   */
  static getCurrentTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Check if string is valid UUID
   * @param {string} uuid - UUID to validate
   * @returns {boolean} Is valid UUID
   */
  static isValidUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') {
      return false;
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

module.exports = QNBHelpers;
