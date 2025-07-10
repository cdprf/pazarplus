const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Turkish Payment Gateway Service
 * Handles integration with major Turkish payment providers
 */
class TurkishPaymentService {
  constructor() {
    this.gateways = new Map();
    this.initializeGateways();
  }

  /**
   * Initialize supported Turkish payment gateways
   */
  initializeGateways() {
    // İyzico (Most popular in Turkey)
    this.gateways.set('IYZICO', {
      name: 'İyzico',
      apiUrl: process.env.IYZICO_API_URL || 'https://api.iyzipay.com',
      sandboxUrl: 'https://sandbox-api.iyzipay.com',
      supportedCurrencies: ['TRY', 'USD', 'EUR'],
      supportedCards: ['VISA', 'MASTERCARD', 'AMERICAN_EXPRESS', 'TROY'],
      installmentSupport: true,
      maxInstallments: 12,
      features: ['3DS', 'TOKENIZATION', 'RECURRING', 'MARKETPLACE']
    });

    // PayU Turkey
    this.gateways.set('PAYU', {
      name: 'PayU Türkiye',
      apiUrl: process.env.PAYU_API_URL || 'https://secure.payu.com.tr',
      sandboxUrl: 'https://sandbox.payu.com.tr',
      supportedCurrencies: ['TRY'],
      supportedCards: ['VISA', 'MASTERCARD', 'AMERICAN_EXPRESS'],
      installmentSupport: true,
      maxInstallments: 12,
      features: ['3DS', 'TOKENIZATION']
    });

    // Garanti BBVA
    this.gateways.set('GARANTI', {
      name: 'Garanti BBVA',
      apiUrl:
        process.env.GARANTI_API_URL || 'https://sanalposprov.garanti.com.tr',
      sandboxUrl: 'https://sanalposprovtest.garanti.com.tr',
      supportedCurrencies: ['TRY', 'USD', 'EUR'],
      supportedCards: ['VISA', 'MASTERCARD', 'AMERICAN_EXPRESS', 'TROY'],
      installmentSupport: true,
      maxInstallments: 18,
      features: ['3DS', 'TOKENIZATION', 'RECURRING']
    });

    // Akbank
    this.gateways.set('AKBANK', {
      name: 'Akbank',
      apiUrl: process.env.AKBANK_API_URL || 'https://akodeme.akbank.com',
      sandboxUrl: 'https://akodeme-test.akbank.com',
      supportedCurrencies: ['TRY'],
      supportedCards: ['VISA', 'MASTERCARD', 'TROY'],
      installmentSupport: true,
      maxInstallments: 12,
      features: ['3DS', 'TOKENIZATION']
    });
  }

  /**
   * Get available payment methods for Turkish market
   * @param {Object} options - Payment options
   * @returns {Promise<Array>} Available payment methods
   */
  async getPaymentMethods(options = {}) {
    try {
      const { amount, currency = 'TRY', customerType = 'INDIVIDUAL' } = options;

      const paymentMethods = [];

      // Credit/Debit Cards
      paymentMethods.push({
        type: 'CREDIT_CARD',
        name: 'Kredi Kartı',
        icon: 'credit-card',
        supportedCards: ['VISA', 'MASTERCARD', 'AMERICAN_EXPRESS', 'TROY'],
        installmentOptions: await this.getInstallmentOptions(amount, currency),
        fees: {
          percentage: 2.5,
          fixed: 0
        }
      });

      // Bank Transfer (EFT/Havale)
      paymentMethods.push({
        type: 'BANK_TRANSFER',
        name: 'Havale/EFT',
        icon: 'bank',
        processingTime: '1-3 iş günü',
        fees: {
          percentage: 0,
          fixed: 0
        }
      });

      // BKM Express (Turkish local payment method)
      paymentMethods.push({
        type: 'BKM_EXPRESS',
        name: 'BKM Express',
        icon: 'mobile-payment',
        description: 'Mobil bankacılık uygulaması ile ödeme',
        fees: {
          percentage: 1.5,
          fixed: 0
        }
      });

      // Digital Wallets
      paymentMethods.push({
        type: 'DIGITAL_WALLET',
        name: 'Dijital Cüzdan',
        icon: 'wallet',
        providers: ['PAPARA', 'ININAL', 'TOSLA'],
        fees: {
          percentage: 2.0,
          fixed: 0
        }
      });

      return paymentMethods;
    } catch (error) {
      logger.error('Failed to get payment methods:', error);
      throw error;
    }
  }

  /**
   * Get installment options for Turkish market
   * @param {number} amount - Payment amount
   * @param {string} currency - Currency code
   * @returns {Promise<Array>} Installment options
   */
  async getInstallmentOptions(amount, currency = 'TRY') {
    try {
      const installmentOptions = [];

      // Minimum amount for installments (typically 100 TRY)
      const minInstallmentAmount = 100;

      if (amount < minInstallmentAmount) {
        return [{ installments: 1, rate: 0, total: amount }];
      }

      // Standard Turkish installment options
      const installmentRates = {
        1: 0, // Tek çekim (no interest)
        2: 0.05, // 2 taksit
        3: 0.08, // 3 taksit
        6: 0.15, // 6 taksit
        9: 0.22, // 9 taksit
        12: 0.3 // 12 taksit
      };

      for (const [installments, rate] of Object.entries(installmentRates)) {
        const totalAmount = amount * (1 + rate);
        const monthlyAmount = totalAmount / installments;

        installmentOptions.push({
          installments: parseInt(installments),
          rate: rate,
          monthlyAmount: Math.round(monthlyAmount * 100) / 100,
          totalAmount: Math.round(totalAmount * 100) / 100,
          description:
            installments === '1' ? 'Tek Çekim' : `${installments} Taksit`
        });
      }

      return installmentOptions;
    } catch (error) {
      logger.error('Failed to get installment options:', error);
      return [{ installments: 1, rate: 0, total: amount }];
    }
  }

  /**
   * Process payment with İyzico
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} Payment result
   */
  async processIyzicoPayment(paymentData) {
    try {
      const {
        orderId,
        amount,
        currency = 'TRY',
        cardData,
        customerData,
        installments = 1,
        use3DS = true
      } = paymentData;

      const gateway = this.gateways.get('IYZICO');
      const apiKey = process.env.IYZICO_API_KEY;
      const secretKey = process.env.IYZICO_SECRET_KEY;

      if (!apiKey || !secretKey) {
        throw new Error('İyzico credentials not configured');
      }

      // Prepare payment request
      const paymentRequest = {
        locale: 'tr',
        conversationId: orderId,
        price: amount.toString(),
        paidPrice: amount.toString(),
        currency: currency,
        installment: installments,
        basketId: orderId,
        paymentChannel: 'WEB',
        paymentGroup: 'PRODUCT',
        paymentCard: {
          cardHolderName: cardData.holderName,
          cardNumber: cardData.number.replace(/\s/g, ''),
          expireMonth: cardData.expireMonth,
          expireYear: cardData.expireYear,
          cvc: cardData.cvc,
          registerCard: '0'
        },
        buyer: {
          id: customerData.id,
          name: customerData.firstName,
          surname: customerData.lastName,
          gsmNumber: customerData.phone,
          email: customerData.email,
          identityNumber: customerData.identityNumber || '11111111111',
          lastLoginDate: new Date().toISOString(),
          registrationDate:
            customerData.registrationDate || new Date().toISOString(),
          registrationAddress: customerData.address,
          ip: customerData.ip,
          city: customerData.city,
          country: 'Turkey',
          zipCode: customerData.zipCode
        },
        shippingAddress: {
          contactName: `${customerData.firstName} ${customerData.lastName}`,
          city: customerData.city,
          country: 'Turkey',
          address: customerData.address,
          zipCode: customerData.zipCode
        },
        billingAddress: {
          contactName: `${customerData.firstName} ${customerData.lastName}`,
          city: customerData.city,
          country: 'Turkey',
          address: customerData.address,
          zipCode: customerData.zipCode
        },
        basketItems: paymentData.basketItems || [
          {
            id: orderId,
            name: 'Order Payment',
            category1: 'E-commerce',
            itemType: 'PHYSICAL',
            price: amount.toString()
          }
        ]
      };

      // Generate authorization header
      const authString = this.generateIyzicoAuth(
        paymentRequest,
        apiKey,
        secretKey
      );

      const response = await axios.post(
        `${gateway.apiUrl}/payment/auth`,
        paymentRequest,
        {
          headers: {
            Authorization: authString,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      );

      const result = response.data;

      if (result.status === 'success') {
        return {
          success: true,
          paymentId: result.paymentId,
          transactionId:
            result.fraudStatus === 1
              ? result.paymentItems[0].paymentTransactionId
              : null,
          status: result.fraudStatus === 1 ? 'APPROVED' : 'PENDING',
          message: 'Payment processed successfully',
          gatewayResponse: result
        };
      } else {
        return {
          success: false,
          error: result.errorMessage || 'Payment failed',
          errorCode: result.errorCode,
          gatewayResponse: result
        };
      }
    } catch (error) {
      logger.error('İyzico payment failed:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed',
        gatewayResponse: error.response?.data
      };
    }
  }

  /**
   * Process payment with PayU Turkey
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} Payment result
   */
  async processPayUPayment(paymentData) {
    try {
      const {
        orderId,
        amount,
        currency = 'TRY',
        cardData,
        customerData,
        installments = 1
      } = paymentData;

      const gateway = this.gateways.get('PAYU');
      const merchantId = process.env.PAYU_MERCHANT_ID;
      const secretKey = process.env.PAYU_SECRET_KEY;

      if (!merchantId || !secretKey) {
        throw new Error('PayU credentials not configured');
      }

      // Prepare payment request
      const paymentRequest = {
        MERCHANT: merchantId,
        ORDER_REF: orderId,
        ORDER_DATE: new Date().toISOString().slice(0, 19),
        ORDER_PNAME: 'Order Payment',
        ORDER_PCODE: orderId,
        ORDER_PINFO: 'E-commerce order payment',
        ORDER_PRICE: amount,
        ORDER_QTY: 1,
        ORDER_VAT: Math.round(amount * 0.18 * 100) / 100, // 18% KDV
        ORDER_SHIPPING: 0,
        PRICES_CURRENCY: currency,
        DISCOUNT: 0,
        PAY_METHOD: 'CCVISAMC',
        CC_NUMBER: cardData.number.replace(/\s/g, ''),
        EXP_MONTH: cardData.expireMonth,
        EXP_YEAR: cardData.expireYear,
        CC_CVV: cardData.cvc,
        CC_OWNER: cardData.holderName,
        BILL_LNAME: customerData.lastName,
        BILL_FNAME: customerData.firstName,
        BILL_EMAIL: customerData.email,
        BILL_PHONE: customerData.phone,
        BILL_ADDRESS: customerData.address,
        BILL_CITY: customerData.city,
        BILL_COUNTRYCODE: 'TR',
        BILL_ZIPCODE: customerData.zipCode,
        INSTALLMENTS_NO: installments,
        LANGUAGE: 'TR'
      };

      // Generate signature
      const signature = this.generatePayUSignature(paymentRequest, secretKey);
      paymentRequest.ORDER_HASH = signature;

      const response = await axios.post(
        `${gateway.apiUrl}/order/alu.php`,
        new URLSearchParams(paymentRequest),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const result = this.parsePayUResponse(response.data);

      if (result.RESPONSE_CODE === '1') {
        return {
          success: true,
          paymentId: result.REFNO,
          transactionId: result.REFNO,
          status: 'APPROVED',
          message: 'Payment processed successfully',
          gatewayResponse: result
        };
      } else {
        return {
          success: false,
          error: result.RESPONSE_MSG || 'Payment failed',
          errorCode: result.RESPONSE_CODE,
          gatewayResponse: result
        };
      }
    } catch (error) {
      logger.error('PayU payment failed:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed',
        gatewayResponse: error.response?.data
      };
    }
  }

  /**
   * Process refund
   * @param {Object} refundData - Refund information
   * @returns {Promise<Object>} Refund result
   */
  async processRefund(refundData) {
    try {
      const { gateway, paymentId, amount, reason } = refundData;

      switch (gateway) {
      case 'IYZICO':
        return await this.processIyzicoRefund(paymentId, amount, reason);
      case 'PAYU':
        return await this.processPayURefund(paymentId, amount, reason);
      default:
        throw new Error(`Unsupported gateway for refund: ${gateway}`);
      }
    } catch (error) {
      logger.error('Refund processing failed:', error);
      throw error;
    }
  }

  /**
   * Process İyzico refund
   */
  async processIyzicoRefund(paymentId, amount, reason) {
    try {
      const gateway = this.gateways.get('IYZICO');
      const apiKey = process.env.IYZICO_API_KEY;
      const secretKey = process.env.IYZICO_SECRET_KEY;

      const refundRequest = {
        locale: 'tr',
        conversationId: `refund_${paymentId}_${Date.now()}`,
        paymentTransactionId: paymentId,
        price: amount.toString(),
        reason: reason || 'Customer request'
      };

      const authString = this.generateIyzicoAuth(
        refundRequest,
        apiKey,
        secretKey
      );

      const response = await axios.post(
        `${gateway.apiUrl}/payment/refund`,
        refundRequest,
        {
          headers: {
            Authorization: authString,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data;

      return {
        success: result.status === 'success',
        refundId: result.paymentId,
        message:
          result.status === 'success'
            ? 'Refund processed successfully'
            : result.errorMessage,
        gatewayResponse: result
      };
    } catch (error) {
      logger.error('İyzico refund failed:', error);
      throw error;
    }
  }

  /**
   * Validate Turkish credit card number
   * @param {string} cardNumber - Card number
   * @returns {Object} Validation result
   */
  validateTurkishCreditCard(cardNumber) {
    const cleanNumber = cardNumber.replace(/\s/g, '');

    // Basic Luhn algorithm
    const luhnCheck = (num) => {
      let sum = 0;
      let isEven = false;

      for (let i = num.length - 1; i >= 0; i--) {
        let digit = parseInt(num[i]);

        if (isEven) {
          digit *= 2;
          if (digit > 9) {digit -= 9;}
        }

        sum += digit;
        isEven = !isEven;
      }

      return sum % 10 === 0;
    };

    // Card type detection for Turkish market
    const getCardType = (number) => {
      const patterns = {
        VISA: /^4[0-9]{12}(?:[0-9]{3})?$/,
        MASTERCARD: /^5[1-5][0-9]{14}$/,
        AMERICAN_EXPRESS: /^3[47][0-9]{13}$/,
        TROY: /^9792[0-9]{12}$/ // Turkish national card system
      };

      for (const [type, pattern] of Object.entries(patterns)) {
        if (pattern.test(number)) {return type;}
      }

      return 'UNKNOWN';
    };

    const isValid = luhnCheck(cleanNumber);
    const cardType = getCardType(cleanNumber);

    return {
      isValid,
      cardType,
      isTurkishCard: cardType === 'TROY',
      length: cleanNumber.length,
      formatted: cleanNumber.replace(/(.{4})/g, '$1 ').trim()
    };
  }

  /**
   * Generate İyzico authorization header
   */
  generateIyzicoAuth(request, apiKey, secretKey) {
    const randomString = Math.random().toString(36).substring(2, 15);
    const requestString = JSON.stringify(request);
    const hashData = apiKey + randomString + secretKey + requestString;
    const hash = crypto
      .createHmac('sha256', secretKey)
      .update(hashData)
      .digest('base64');

    return `IYZWS ${apiKey}:${hash}`;
  }

  /**
   * Generate PayU signature
   */
  generatePayUSignature(params, secretKey) {
    const signatureString =
      params.MERCHANT +
      params.ORDER_REF +
      params.ORDER_DATE +
      params.ORDER_PNAME +
      params.ORDER_PCODE +
      params.ORDER_PRICE +
      params.PRICES_CURRENCY +
      secretKey;

    return crypto.createHash('md5').update(signatureString).digest('hex');
  }

  /**
   * Parse PayU response
   */
  parsePayUResponse(responseData) {
    const result = {};
    const lines = responseData.split('\n');

    lines.forEach((line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        result[key] = value;
      }
    });

    return result;
  }

  /**
   * Get payment gateway status
   * @param {string} gatewayCode - Gateway code
   * @returns {Object} Gateway status
   */
  getGatewayStatus(gatewayCode) {
    const gateway = this.gateways.get(gatewayCode);

    if (!gateway) {
      return { available: false, error: 'Gateway not found' };
    }

    // Check if credentials are configured
    const credentialsConfigured = this.checkGatewayCredentials(gatewayCode);

    return {
      available: credentialsConfigured,
      name: gateway.name,
      features: gateway.features,
      supportedCurrencies: gateway.supportedCurrencies,
      supportedCards: gateway.supportedCards,
      installmentSupport: gateway.installmentSupport,
      maxInstallments: gateway.maxInstallments
    };
  }

  /**
   * Check if gateway credentials are configured
   */
  checkGatewayCredentials(gatewayCode) {
    switch (gatewayCode) {
    case 'IYZICO':
      return !!(process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY);
    case 'PAYU':
      return !!(process.env.PAYU_MERCHANT_ID && process.env.PAYU_SECRET_KEY);
    case 'GARANTI':
      return !!(
        process.env.GARANTI_TERMINAL_ID && process.env.GARANTI_PASSWORD
      );
    case 'AKBANK':
      return !!(
        process.env.AKBANK_MERCHANT_ID && process.env.AKBANK_PASSWORD
      );
    default:
      return false;
    }
  }

  /**
   * Get available payment methods (alias for compatibility)
   */
  async getAvailablePaymentMethods(options) {
    return this.getPaymentMethods(options);
  }

  /**
   * Process payment (generic method)
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Payment result
   */
  async processPayment(paymentData) {
    const { gateway = 'IYZICO' } = paymentData;

    switch (gateway.toUpperCase()) {
    case 'IYZICO':
      return this.processIyzicoPayment(paymentData);
    case 'PAYU':
      return this.processPayUPayment(paymentData);
    default:
      throw new Error(`Unsupported gateway: ${gateway}`);
    }
  }

  /**
   * Verify payment status
   * @param {string} paymentId - Payment ID
   * @returns {Promise<Object>} Payment verification
   */
  async verifyPayment(paymentId) {
    return {
      paymentId,
      status: 'VERIFIED',
      verifiedAt: new Date()
    };
  }

  /**
   * Get payment history
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Payment history
   */
  async getPaymentHistory(options) {
    return {
      payments: [],
      pagination: {
        page: options.page,
        limit: options.limit,
        total: 0
      }
    };
  }

  /**
   * Get saved cards
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Saved cards
   */
  async getSavedCards(userId) {
    return [];
  }

  /**
   * Save card
   * @param {Object} cardData - Card data
   * @returns {Promise<Object>} Saved card
   */
  async saveCard(cardData) {
    return {
      id: Date.now().toString(),
      alias: cardData.cardAlias,
      maskedNumber: '****-****-****-1234',
      cardType: cardData.cardType,
      savedAt: new Date()
    };
  }

  /**
   * Delete card
   * @param {string} cardId - Card ID
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteCard(cardId, userId) {
    // Implementation for deleting saved card
  }

  /**
   * Verify webhook signature
   * @param {string} signature - Webhook signature
   * @param {string} payload - Webhook payload
   * @returns {Promise<boolean>} Is valid
   */
  async verifyWebhookSignature(signature, payload) {
    return true; // Simplified implementation
  }

  /**
   * Handle payment status webhook
   * @param {Object} webhookData - Webhook data
   * @returns {Promise<void>}
   */
  async handlePaymentStatusWebhook(webhookData) {
    // Implementation for handling webhook
  }

  /**
   * Check payment compliance
   * @param {Object} options - Compliance check options
   * @returns {Promise<Object>} Compliance result
   */
  async checkPaymentCompliance(options) {
    return {
      compliant: true,
      checks: []
    };
  }

  /**
   * Get exchange rates
   * @returns {Promise<Object>} Exchange rates
   */
  async getExchangeRates() {
    return {
      USD: 30.5,
      EUR: 33.2,
      updatedAt: new Date()
    };
  }
}

module.exports = { TurkishPaymentService };
