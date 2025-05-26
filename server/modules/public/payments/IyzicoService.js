/**
 * Iyzico Payment Service
 * Integration with Turkey's most popular payment gateway
 */

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../../../utils/logger');

class IyzicoService {
  constructor(credentials = {}) {
    this.apiKey = credentials.apiKey || process.env.IYZICO_API_KEY;
    this.secretKey = credentials.secretKey || process.env.IYZICO_SECRET_KEY;
    this.baseURL = credentials.sandbox ? 
      'https://sandbox-api.iyzipay.com' : 
      'https://api.iyzipay.com';
    
    this.providerName = 'Iyzico';
    this.currency = 'TRY';
    
    if (!this.apiKey || !this.secretKey) {
      logger.warn('Iyzico credentials not provided');
    }
  }

  /**
   * Generate authorization header for Iyzico API
   */
  generateAuthString(request, randomString) {
    const hashData = this.apiKey + randomString + this.secretKey + request;
    return crypto.createHmac('sha1', this.secretKey).update(hashData).digest('base64');
  }

  /**
   * Create payment request
   */
  async createPayment(paymentData) {
    try {
      const {
        orderId,
        amount,
        currency = 'TRY',
        customer,
        billingAddress,
        shippingAddress,
        basketItems,
        paymentCard,
        installment = 1
      } = paymentData;

      const randomString = Math.random().toString(36).substring(2, 15);
      const requestBody = {
        locale: 'tr',
        conversationId: orderId,
        price: amount.toString(),
        paidPrice: amount.toString(),
        currency: currency,
        installment: installment,
        basketId: orderId,
        paymentChannel: 'WEB',
        paymentGroup: 'PRODUCT',
        paymentCard: {
          cardHolderName: paymentCard.holderName,
          cardNumber: paymentCard.number,
          expireMonth: paymentCard.expireMonth,
          expireYear: paymentCard.expireYear,
          cvc: paymentCard.cvc,
          registerCard: '0'
        },
        buyer: {
          id: customer.id,
          name: customer.name,
          surname: customer.surname,
          gsmNumber: customer.phone,
          email: customer.email,
          identityNumber: customer.identityNumber || '11111111111',
          lastLoginDate: new Date().toISOString(),
          registrationDate: customer.registrationDate || new Date().toISOString(),
          registrationAddress: billingAddress.address,
          ip: customer.ip || '127.0.0.1',
          city: billingAddress.city,
          country: billingAddress.country || 'Turkey',
          zipCode: billingAddress.zipCode
        },
        shippingAddress: {
          contactName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
          city: shippingAddress.city,
          country: shippingAddress.country || 'Turkey',
          address: shippingAddress.address,
          zipCode: shippingAddress.zipCode
        },
        billingAddress: {
          contactName: `${billingAddress.firstName} ${billingAddress.lastName}`,
          city: billingAddress.city,
          country: billingAddress.country || 'Turkey',
          address: billingAddress.address,
          zipCode: billingAddress.zipCode
        },
        basketItems: basketItems.map((item, index) => ({
          id: item.id || `item_${index}`,
          name: item.name,
          category1: item.category || 'General',
          category2: item.subcategory || 'Product',
          itemType: 'PHYSICAL',
          price: item.price.toString()
        }))
      };

      const requestString = JSON.stringify(requestBody);
      const authorization = this.generateAuthString(requestString, randomString);

      const response = await axios.post(`${this.baseURL}/payment/auth`, requestBody, {
        headers: {
          'Authorization': `IYZWS ${this.apiKey}:${authorization}`,
          'x-iyzi-rnd': randomString,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      if (response.data.status === 'success') {
        return {
          success: true,
          data: {
            transactionId: response.data.paymentId,
            status: 'completed',
            amount: parseFloat(response.data.paidPrice),
            currency: response.data.currency,
            authCode: response.data.authCode,
            hostReference: response.data.hostReference,
            fraudStatus: response.data.fraudStatus,
            installmentNumber: response.data.installment,
            provider: this.providerName,
            raw: response.data
          }
        };
      } else {
        return {
          success: false,
          error: {
            code: response.data.errorCode,
            message: response.data.errorMessage,
            group: response.data.errorGroup
          }
        };
      }

    } catch (error) {
      logger.error(`Iyzico payment failed: ${error.message}`, { error });
      return {
        success: false,
        error: {
          code: 'PAYMENT_FAILED',
          message: error.response?.data?.errorMessage || error.message
        }
      };
    }
  }

  /**
   * Create 3D Secure payment
   */
  async create3DPayment(paymentData) {
    try {
      const {
        orderId,
        amount,
        currency = 'TRY',
        customer,
        billingAddress,
        shippingAddress,
        basketItems,
        paymentCard,
        callbackUrl
      } = paymentData;

      const randomString = Math.random().toString(36).substring(2, 15);
      const requestBody = {
        locale: 'tr',
        conversationId: orderId,
        price: amount.toString(),
        paidPrice: amount.toString(),
        currency: currency,
        basketId: orderId,
        paymentGroup: 'PRODUCT',
        callbackUrl: callbackUrl,
        paymentCard: {
          cardHolderName: paymentCard.holderName,
          cardNumber: paymentCard.number,
          expireMonth: paymentCard.expireMonth,
          expireYear: paymentCard.expireYear,
          cvc: paymentCard.cvc
        },
        buyer: {
          id: customer.id,
          name: customer.name,
          surname: customer.surname,
          gsmNumber: customer.phone,
          email: customer.email,
          identityNumber: customer.identityNumber || '11111111111',
          lastLoginDate: new Date().toISOString(),
          registrationDate: customer.registrationDate || new Date().toISOString(),
          registrationAddress: billingAddress.address,
          ip: customer.ip || '127.0.0.1',
          city: billingAddress.city,
          country: billingAddress.country || 'Turkey',
          zipCode: billingAddress.zipCode
        },
        shippingAddress: {
          contactName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
          city: shippingAddress.city,
          country: shippingAddress.country || 'Turkey',
          address: shippingAddress.address,
          zipCode: shippingAddress.zipCode
        },
        billingAddress: {
          contactName: `${billingAddress.firstName} ${billingAddress.lastName}`,
          city: billingAddress.city,
          country: billingAddress.country || 'Turkey',
          address: billingAddress.address,
          zipCode: billingAddress.zipCode
        },
        basketItems: basketItems.map((item, index) => ({
          id: item.id || `item_${index}`,
          name: item.name,
          category1: item.category || 'General',
          category2: item.subcategory || 'Product',
          itemType: 'PHYSICAL',
          price: item.price.toString()
        }))
      };

      const requestString = JSON.stringify(requestBody);
      const authorization = this.generateAuthString(requestString, randomString);

      const response = await axios.post(`${this.baseURL}/payment/3dsecure/initialize`, requestBody, {
        headers: {
          'Authorization': `IYZWS ${this.apiKey}:${authorization}`,
          'x-iyzi-rnd': randomString,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      if (response.data.status === 'success') {
        return {
          success: true,
          data: {
            threeDSHtmlContent: response.data.threeDSHtmlContent,
            paymentId: response.data.paymentId,
            conversationId: response.data.conversationId,
            status: 'pending_3ds',
            provider: this.providerName
          }
        };
      } else {
        return {
          success: false,
          error: {
            code: response.data.errorCode,
            message: response.data.errorMessage,
            group: response.data.errorGroup
          }
        };
      }

    } catch (error) {
      logger.error(`Iyzico 3D payment failed: ${error.message}`, { error });
      return {
        success: false,
        error: {
          code: 'PAYMENT_3D_FAILED',
          message: error.response?.data?.errorMessage || error.message
        }
      };
    }
  }

  /**
   * Complete 3D Secure payment
   */
  async complete3DPayment(request) {
    try {
      const randomString = Math.random().toString(36).substring(2, 15);
      const requestBody = {
        locale: 'tr',
        conversationId: request.conversationId,
        paymentId: request.paymentId,
        paymentConversationId: request.paymentConversationId
      };

      const requestString = JSON.stringify(requestBody);
      const authorization = this.generateAuthString(requestString, randomString);

      const response = await axios.post(`${this.baseURL}/payment/3dsecure/auth`, requestBody, {
        headers: {
          'Authorization': `IYZWS ${this.apiKey}:${authorization}`,
          'x-iyzi-rnd': randomString,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      if (response.data.status === 'success') {
        return {
          success: true,
          data: {
            transactionId: response.data.paymentId,
            status: 'completed',
            amount: parseFloat(response.data.paidPrice),
            currency: response.data.currency,
            authCode: response.data.authCode,
            hostReference: response.data.hostReference,
            fraudStatus: response.data.fraudStatus,
            provider: this.providerName,
            raw: response.data
          }
        };
      } else {
        return {
          success: false,
          error: {
            code: response.data.errorCode,
            message: response.data.errorMessage,
            group: response.data.errorGroup
          }
        };
      }

    } catch (error) {
      logger.error(`Iyzico 3D completion failed: ${error.message}`, { error });
      return {
        success: false,
        error: {
          code: 'PAYMENT_3D_COMPLETION_FAILED',
          message: error.response?.data?.errorMessage || error.message
        }
      };
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(transactionId, amount, reason = 'Customer request') {
    try {
      const randomString = Math.random().toString(36).substring(2, 15);
      const requestBody = {
        locale: 'tr',
        conversationId: `refund_${transactionId}_${Date.now()}`,
        paymentTransactionId: transactionId,
        price: amount.toString(),
        ip: '127.0.0.1',
        reason: reason
      };

      const requestString = JSON.stringify(requestBody);
      const authorization = this.generateAuthString(requestString, randomString);

      const response = await axios.post(`${this.baseURL}/payment/refund`, requestBody, {
        headers: {
          'Authorization': `IYZWS ${this.apiKey}:${authorization}`,
          'x-iyzi-rnd': randomString,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      if (response.data.status === 'success') {
        return {
          success: true,
          data: {
            refundId: response.data.paymentTransactionId,
            amount: parseFloat(response.data.price),
            currency: response.data.currency,
            status: 'completed',
            provider: this.providerName
          }
        };
      } else {
        return {
          success: false,
          error: {
            code: response.data.errorCode,
            message: response.data.errorMessage
          }
        };
      }

    } catch (error) {
      logger.error(`Iyzico refund failed: ${error.message}`, { error });
      return {
        success: false,
        error: {
          code: 'REFUND_FAILED',
          message: error.response?.data?.errorMessage || error.message
        }
      };
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(transactionId) {
    try {
      const randomString = Math.random().toString(36).substring(2, 15);
      const requestBody = {
        locale: 'tr',
        conversationId: `inquiry_${transactionId}`,
        paymentId: transactionId
      };

      const requestString = JSON.stringify(requestBody);
      const authorization = this.generateAuthString(requestString, randomString);

      const response = await axios.post(`${this.baseURL}/payment/detail`, requestBody, {
        headers: {
          'Authorization': `IYZWS ${this.apiKey}:${authorization}`,
          'x-iyzi-rnd': randomString,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      if (response.data.status === 'success') {
        return {
          success: true,
          data: {
            transactionId: response.data.paymentId,
            status: response.data.paymentStatus?.toLowerCase(),
            amount: parseFloat(response.data.paidPrice),
            currency: response.data.currency,
            createdDate: response.data.createdDate,
            provider: this.providerName,
            raw: response.data
          }
        };
      } else {
        return {
          success: false,
          error: {
            code: response.data.errorCode,
            message: response.data.errorMessage
          }
        };
      }

    } catch (error) {
      logger.error(`Iyzico payment inquiry failed: ${error.message}`, { error });
      return {
        success: false,
        error: {
          code: 'INQUIRY_FAILED',
          message: error.response?.data?.errorMessage || error.message
        }
      };
    }
  }

  /**
   * Test connection to Iyzico API
   */
  async testConnection() {
    try {
      // Test with a simple API call
      const randomString = Math.random().toString(36).substring(2, 15);
      const requestBody = { locale: 'tr' };
      const requestString = JSON.stringify(requestBody);
      const authorization = this.generateAuthString(requestString, randomString);

      const response = await axios.post(`${this.baseURL}/payment/iyzipos/checkoutform/auth/ecom/detail`, requestBody, {
        headers: {
          'Authorization': `IYZWS ${this.apiKey}:${authorization}`,
          'x-iyzi-rnd': randomString,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      return {
        success: true,
        message: 'Iyzico connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: `Iyzico connection failed: ${error.message}`
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
      }
    ];
  }

  /**
   * Get installment rates for a given amount
   */
  async getInstallmentRates(amount, cardBrand = null) {
    try {
      const randomString = Math.random().toString(36).substring(2, 15);
      const requestBody = {
        locale: 'tr',
        conversationId: `installment_${Date.now()}`,
        price: amount.toString()
      };

      const requestString = JSON.stringify(requestBody);
      const authorization = this.generateAuthString(requestString, randomString);

      const response = await axios.post(`${this.baseURL}/payment/iyzipos/installment`, requestBody, {
        headers: {
          'Authorization': `IYZWS ${this.apiKey}:${authorization}`,
          'x-iyzi-rnd': randomString,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      if (response.data.status === 'success') {
        return {
          success: true,
          data: response.data.installmentDetails.map(detail => ({
            bankName: detail.bankName,
            bankCode: detail.bankCode,
            installments: detail.installmentPrices.map(installment => ({
              installmentNumber: installment.installmentNumber,
              totalPrice: parseFloat(installment.totalPrice),
              installmentPrice: parseFloat(installment.installmentPrice),
              bankCommissionRate: parseFloat(installment.bankCommissionRate || 0),
              iyzicoCommissionRateAmount: parseFloat(installment.iyzicoCommissionRateAmount || 0)
            }))
          }))
        };
      } else {
        return {
          success: false,
          error: {
            code: response.data.errorCode,
            message: response.data.errorMessage
          }
        };
      }

    } catch (error) {
      logger.error(`Iyzico installment rates failed: ${error.message}`, { error });
      return {
        success: false,
        error: {
          code: 'INSTALLMENT_RATES_FAILED',
          message: error.response?.data?.errorMessage || error.message
        }
      };
    }
  }
}

module.exports = IyzicoService;