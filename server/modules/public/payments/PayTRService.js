/**
 * PayTR Payment Service
 * Integration with popular Turkish payment gateway
 */

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../../../utils/logger');

class PayTRService {
  constructor(credentials = {}) {
    this.merchantId = credentials.merchantId || process.env.PAYTR_MERCHANT_ID;
    this.merchantKey = credentials.merchantKey || process.env.PAYTR_MERCHANT_KEY;
    this.merchantSalt = credentials.merchantSalt || process.env.PAYTR_MERCHANT_SALT;
    this.baseURL = 'https://www.paytr.com/odeme/api';
    
    this.providerName = 'PayTR';
    this.currency = 'TL';
    
    if (!this.merchantId || !this.merchantKey || !this.merchantSalt) {
      logger.warn('PayTR credentials not provided');
    }
  }

  /**
   * Generate hash for PayTR API
   */
  generateHash(data) {
    const hashString = data.join('');
    return crypto.createHmac('sha256', this.merchantKey).update(hashString + this.merchantSalt).digest('base64');
  }

  /**
   * Create payment request
   */
  async createPayment(paymentData) {
    try {
      const {
        orderId,
        amount,
        customer,
        billingAddress,
        basketItems,
        successUrl,
        failUrl,
        installment = 0,
        currency = 'TL'
      } = paymentData;

      // Convert amount to kuruş (PayTR expects amount in kuruş)
      const amountInKurus = Math.round(amount * 100);

      const basketStr = basketItems.map(item => 
        `${item.name},${(item.price * 100).toFixed(0)},${item.quantity || 1}`
      ).join(';');

      const userBasket = Buffer.from(basketStr).toString('base64');

      const hashData = [
        this.merchantId,
        customer.ip || '127.0.0.1',
        orderId,
        customer.email,
        amountInKurus.toString(),
        userBasket,
        installment.toString(),
        currency,
        '1', // test_mode (0 for production, 1 for test)
        '0'  // non_3d (0 for 3D Secure, 1 for non-3D)
      ];

      const paytrToken = this.generateHash(hashData);

      const requestData = {
        merchant_id: this.merchantId,
        user_ip: customer.ip || '127.0.0.1',
        merchant_oid: orderId,
        email: customer.email,
        payment_amount: amountInKurus,
        paytr_token: paytrToken,
        user_basket: userBasket,
        debug_on: 1,
        no_installment: installment === 0 ? 1 : 0,
        max_installment: installment || 0,
        user_name: `${customer.name} ${customer.surname}`,
        user_address: billingAddress.address,
        user_phone: customer.phone,
        merchant_ok_url: successUrl,
        merchant_fail_url: failUrl,
        timeout_limit: 30,
        currency: currency,
        test_mode: 1,
        non_3d: 0
      };

      const response = await axios.post(`${this.baseURL}/odeme/duzenle`, 
        Object.keys(requestData)
          .map(key => `${key}=${encodeURIComponent(requestData[key])}`)
          .join('&'),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 30000
        }
      );

      if (response.data.status === 'success') {
        return {
          success: true,
          data: {
            paymentUrl: response.data.payment_url,
            token: response.data.token,
            orderId: orderId,
            status: 'pending_redirect',
            provider: this.providerName,
            redirectRequired: true
          }
        };
      } else {
        return {
          success: false,
          error: {
            code: 'PAYMENT_FAILED',
            message: response.data.reason || 'Payment initialization failed'
          }
        };
      }

    } catch (error) {
      logger.error(`PayTR payment failed: ${error.message}`, { error });
      return {
        success: false,
        error: {
          code: 'PAYMENT_FAILED',
          message: error.response?.data?.reason || error.message
        }
      };
    }
  }

  /**
   * Verify payment callback
   */
  verifyCallback(callbackData) {
    try {
      const {
        merchant_oid,
        status,
        total_amount,
        hash
      } = callbackData;

      // Verify hash
      const verifyData = [
        merchant_oid,
        this.merchantSalt,
        status,
        total_amount
      ];

      const expectedHash = crypto.createHmac('sha256', this.merchantKey)
        .update(verifyData.join(''))
        .digest('base64');

      if (hash !== expectedHash) {
        return {
          success: false,
          error: {
            code: 'INVALID_HASH',
            message: 'Payment verification failed - invalid hash'
          }
        };
      }

      return {
        success: true,
        data: {
          orderId: merchant_oid,
          status: status === 'success' ? 'completed' : 'failed',
          amount: parseFloat(total_amount) / 100, // Convert from kuruş to TL
          currency: 'TL',
          provider: this.providerName,
          verified: true
        }
      };

    } catch (error) {
      logger.error(`PayTR callback verification failed: ${error.message}`, { error });
      return {
        success: false,
        error: {
          code: 'VERIFICATION_FAILED',
          message: error.message
        }
      };
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(transactionId, amount, reason = 'Customer request') {
    try {
      // Convert amount to kuruş
      const amountInKurus = Math.round(amount * 100);

      const hashData = [
        this.merchantId,
        transactionId,
        amountInKurus.toString()
      ];

      const paytrToken = this.generateHash(hashData);

      const requestData = {
        merchant_id: this.merchantId,
        merchant_oid: transactionId,
        return_amount: amountInKurus,
        paytr_token: paytrToken,
        reason: reason
      };

      const response = await axios.post(`${this.baseURL}/odeme/iade`, 
        Object.keys(requestData)
          .map(key => `${key}=${encodeURIComponent(requestData[key])}`)
          .join('&'),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 30000
        }
      );

      if (response.data.status === 'success') {
        return {
          success: true,
          data: {
            refundId: response.data.return_id,
            amount: amountInKurus / 100,
            currency: 'TL',
            status: 'completed',
            provider: this.providerName
          }
        };
      } else {
        return {
          success: false,
          error: {
            code: 'REFUND_FAILED',
            message: response.data.reason || 'Refund failed'
          }
        };
      }

    } catch (error) {
      logger.error(`PayTR refund failed: ${error.message}`, { error });
      return {
        success: false,
        error: {
          code: 'REFUND_FAILED',
          message: error.response?.data?.reason || error.message
        }
      };
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(transactionId) {
    try {
      const hashData = [
        this.merchantId,
        transactionId
      ];

      const paytrToken = this.generateHash(hashData);

      const requestData = {
        merchant_id: this.merchantId,
        merchant_oid: transactionId,
        paytr_token: paytrToken
      };

      const response = await axios.post(`${this.baseURL}/odeme/durum`, 
        Object.keys(requestData)
          .map(key => `${key}=${encodeURIComponent(requestData[key])}`)
          .join('&'),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 30000
        }
      );

      if (response.data.status === 'success') {
        return {
          success: true,
          data: {
            transactionId: transactionId,
            status: response.data.payment_status,
            amount: parseFloat(response.data.payment_amount) / 100,
            currency: 'TL',
            paymentDate: response.data.payment_date,
            provider: this.providerName,
            raw: response.data
          }
        };
      } else {
        return {
          success: false,
          error: {
            code: 'INQUIRY_FAILED',
            message: response.data.reason || 'Payment inquiry failed'
          }
        };
      }

    } catch (error) {
      logger.error(`PayTR payment inquiry failed: ${error.message}`, { error });
      return {
        success: false,
        error: {
          code: 'INQUIRY_FAILED',
          message: error.response?.data?.reason || error.message
        }
      };
    }
  }

  /**
   * Test connection to PayTR API
   */
  async testConnection() {
    try {
      // Test with a simple payment creation (will fail but verify API access)
      const testData = {
        orderId: 'test_' + Date.now(),
        amount: 1,
        customer: {
          name: 'Test',
          surname: 'User',
          email: 'test@example.com',
          phone: '5551234567',
          ip: '127.0.0.1'
        },
        billingAddress: {
          address: 'Test Address'
        },
        basketItems: [{
          name: 'Test Product',
          price: 1,
          quantity: 1
        }],
        successUrl: 'https://example.com/success',
        failUrl: 'https://example.com/fail'
      };

      await this.createPayment(testData);

      return {
        success: true,
        message: 'PayTR connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: `PayTR connection failed: ${error.message}`
      };
    }
  }

  /**
   * Get supported payment methods
   */
  getSupportedPaymentMethods() {
    return [
      {
        type: 'credit_card',
        name: 'Kredi Kartı',
        brands: ['visa', 'mastercard', 'amex'],
        installments: [1, 2, 3, 6, 9, 12],
        threeDSecure: true
      },
      {
        type: 'debit_card',
        name: 'Banka Kartı',
        brands: ['visa', 'mastercard'],
        installments: [1],
        threeDSecure: true
      },
      {
        type: 'bkm',
        name: 'BKM Express',
        brands: ['bkm'],
        installments: [1],
        threeDSecure: false
      }
    ];
  }

  /**
   * Get bin information for installment options
   */
  async getBinInfo(cardNumber) {
    try {
      const bin = cardNumber.substring(0, 6);
      
      const hashData = [
        this.merchantId,
        bin
      ];

      const paytrToken = this.generateHash(hashData);

      const requestData = {
        merchant_id: this.merchantId,
        bin: bin,
        paytr_token: paytrToken
      };

      const response = await axios.post(`${this.baseURL}/odeme/bin-detail`, 
        Object.keys(requestData)
          .map(key => `${key}=${encodeURIComponent(requestData[key])}`)
          .join('&'),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 30000
        }
      );

      if (response.data.status === 'success') {
        return {
          success: true,
          data: {
            cardType: response.data.card_type,
            cardFamily: response.data.card_family,
            bankName: response.data.bank_name,
            maxInstallment: parseInt(response.data.max_installment),
            commercial: response.data.commercial === '1',
            installmentRates: response.data.installment_rates || []
          }
        };
      } else {
        return {
          success: false,
          error: {
            code: 'BIN_INQUIRY_FAILED',
            message: response.data.reason || 'BIN inquiry failed'
          }
        };
      }

    } catch (error) {
      logger.error(`PayTR BIN inquiry failed: ${error.message}`, { error });
      return {
        success: false,
        error: {
          code: 'BIN_INQUIRY_FAILED',
          message: error.response?.data?.reason || error.message
        }
      };
    }
  }
}

module.exports = PayTRService;