/**
 * Payment Service Factory
 * Centralized payment gateway management for Turkish e-commerce
 */

const IyzicoService = require('./IyzicoService');
const PayTRService = require('./PayTRService');
const logger = require('../../../utils/logger');

class PaymentServiceFactory {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = 'iyzico';
    this.initializeProviders();
  }

  /**
   * Initialize all payment providers
   */
  initializeProviders() {
    // Initialize Iyzico
    this.providers.set('iyzico', {
      service: IyzicoService,
      name: 'Iyzico',
      enabled: true,
      features: ['3ds', 'installments', 'refunds', 'recurring'],
      currencies: ['TRY', 'USD', 'EUR'],
      priority: 1
    });

    // Initialize PayTR
    this.providers.set('paytr', {
      service: PayTRService,
      name: 'PayTR',
      enabled: true,
      features: ['3ds', 'installments', 'refunds', 'bkm'],
      currencies: ['TL'],
      priority: 2
    });

    logger.info('Payment providers initialized', {
      providers: Array.from(this.providers.keys())
    });
  }

  /**
   * Get payment service instance
   */
  getPaymentService(provider = null, credentials = {}) {
    const providerKey = provider || this.defaultProvider;
    
    if (!this.providers.has(providerKey)) {
      throw new Error(`Payment provider '${providerKey}' not supported`);
    }

    const providerConfig = this.providers.get(providerKey);
    
    if (!providerConfig.enabled) {
      throw new Error(`Payment provider '${providerKey}' is disabled`);
    }

    return new providerConfig.service(credentials);
  }

  /**
   * Get all available payment providers
   */
  getAvailableProviders() {
    return Array.from(this.providers.entries())
      .filter(([_, config]) => config.enabled)
      .map(([key, config]) => ({
        key,
        name: config.name,
        features: config.features,
        currencies: config.currencies,
        priority: config.priority
      }))
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Process payment with automatic provider selection
   */
  async processPayment(paymentData, preferredProvider = null) {
    const provider = preferredProvider || this.selectOptimalProvider(paymentData);
    
    try {
      const service = this.getPaymentService(provider, paymentData.credentials);
      const result = await service.createPayment(paymentData);
      
      // Log payment attempt
      logger.info('Payment processed', {
        provider,
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        success: result.success
      });

      return {
        ...result,
        provider,
        attemptedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Payment processing failed', {
        provider,
        orderId: paymentData.orderId,
        error: error.message
      });

      // Try fallback provider if available
      if (!preferredProvider && provider !== 'paytr') {
        logger.info('Attempting fallback payment provider', { 
          original: provider, 
          fallback: 'paytr' 
        });
        
        return this.processPayment(paymentData, 'paytr');
      }

      throw error;
    }
  }

  /**
   * Process 3D Secure payment
   */
  async process3DPayment(paymentData, preferredProvider = null) {
    const provider = preferredProvider || this.defaultProvider;
    
    try {
      const service = this.getPaymentService(provider, paymentData.credentials);
      
      if (service.create3DPayment) {
        const result = await service.create3DPayment(paymentData);
        
        logger.info('3D Secure payment initiated', {
          provider,
          orderId: paymentData.orderId,
          success: result.success
        });

        return {
          ...result,
          provider,
          initiatedAt: new Date().toISOString()
        };
      } else {
        // Fallback to regular payment creation
        return this.processPayment(paymentData, provider);
      }

    } catch (error) {
      logger.error('3D Secure payment failed', {
        provider,
        orderId: paymentData.orderId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Complete 3D Secure payment
   */
  async complete3DPayment(callbackData, provider) {
    try {
      const service = this.getPaymentService(provider, callbackData.credentials);
      
      let result;
      if (service.complete3DPayment) {
        result = await service.complete3DPayment(callbackData);
      } else if (service.verifyCallback) {
        result = service.verifyCallback(callbackData);
      } else {
        throw new Error('3D Secure completion not supported by provider');
      }

      logger.info('3D Secure payment completed', {
        provider,
        success: result.success,
        orderId: callbackData.orderId || callbackData.conversationId
      });

      return {
        ...result,
        provider,
        completedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('3D Secure completion failed', {
        provider,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Process refund across providers
   */
  async processRefund(refundData) {
    const { provider, transactionId, amount, reason } = refundData;
    
    try {
      const service = this.getPaymentService(provider, refundData.credentials);
      const result = await service.refundPayment(transactionId, amount, reason);

      logger.info('Refund processed', {
        provider,
        transactionId,
        amount,
        success: result.success
      });

      return {
        ...result,
        provider,
        processedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Refund processing failed', {
        provider,
        transactionId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Get payment details from any provider
   */
  async getPaymentDetails(transactionId, provider) {
    try {
      const service = this.getPaymentService(provider);
      const result = await service.getPaymentDetails(transactionId);

      return {
        ...result,
        provider,
        queriedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Payment details query failed', {
        provider,
        transactionId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Get installment options for amount
   */
  async getInstallmentOptions(amount, cardBin = null, provider = null) {
    const providerKey = provider || this.defaultProvider;
    
    try {
      const service = this.getPaymentService(providerKey);
      
      if (service.getInstallmentRates) {
        return await service.getInstallmentRates(amount);
      } else if (service.getBinInfo && cardBin) {
        return await service.getBinInfo(cardBin);
      } else {
        // Return default installment options
        return {
          success: true,
          data: this.getDefaultInstallmentOptions(amount)
        };
      }

    } catch (error) {
      logger.error('Installment options query failed', {
        provider: providerKey,
        amount,
        error: error.message
      });

      return {
        success: false,
        error: {
          code: 'INSTALLMENT_QUERY_FAILED',
          message: error.message
        }
      };
    }
  }

  /**
   * Test all payment providers
   */
  async testAllProviders() {
    const results = {};
    
    for (const [providerKey, config] of this.providers) {
      if (!config.enabled) continue;
      
      try {
        const service = this.getPaymentService(providerKey);
        const testResult = await service.testConnection();
        
        results[providerKey] = {
          name: config.name,
          status: testResult.success ? 'connected' : 'failed',
          message: testResult.message,
          features: config.features,
          testedAt: new Date().toISOString()
        };

      } catch (error) {
        results[providerKey] = {
          name: config.name,
          status: 'error',
          message: error.message,
          testedAt: new Date().toISOString()
        };
      }
    }

    return results;
  }

  /**
   * Select optimal payment provider based on payment data
   */
  selectOptimalProvider(paymentData) {
    const { amount, currency = 'TRY', customer, features = [] } = paymentData;

    // Filter providers by currency support
    const compatibleProviders = Array.from(this.providers.entries())
      .filter(([_, config]) => {
        return config.enabled && 
               config.currencies.includes(currency) &&
               features.every(feature => config.features.includes(feature));
      })
      .sort((a, b) => a[1].priority - b[1].priority);

    if (compatibleProviders.length === 0) {
      return this.defaultProvider;
    }

    // Business logic for provider selection
    const [providerKey] = compatibleProviders[0];

    // Prefer Iyzico for larger amounts or international cards
    if (amount > 1000 || customer?.international) {
      const iyzicoProvider = compatibleProviders.find(([key]) => key === 'iyzico');
      if (iyzicoProvider) {
        return 'iyzico';
      }
    }

    return providerKey;
  }

  /**
   * Get default installment options
   */
  getDefaultInstallmentOptions(amount) {
    const installments = [1, 2, 3, 6, 9, 12];
    
    return installments.map(installmentCount => ({
      installmentNumber: installmentCount,
      totalPrice: amount,
      installmentPrice: amount / installmentCount,
      bankCommissionRate: installmentCount > 1 ? 0.02 : 0,
      available: amount >= (installmentCount * 10) // Minimum 10 TL per installment
    })).filter(option => option.available);
  }

  /**
   * Validate payment data
   */
  validatePaymentData(paymentData) {
    const required = ['orderId', 'amount', 'customer', 'basketItems'];
    const missing = required.filter(field => !paymentData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required payment fields: ${missing.join(', ')}`);
    }

    if (paymentData.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    if (!paymentData.customer.email || !paymentData.customer.phone) {
      throw new Error('Customer email and phone are required');
    }

    if (!Array.isArray(paymentData.basketItems) || paymentData.basketItems.length === 0) {
      throw new Error('Basket items are required');
    }

    return true;
  }

  /**
   * Format payment response
   */
  formatPaymentResponse(result, additionalData = {}) {
    return {
      success: result.success,
      data: result.success ? {
        ...result.data,
        ...additionalData,
        timestamp: new Date().toISOString()
      } : null,
      error: !result.success ? {
        ...result.error,
        timestamp: new Date().toISOString()
      } : null
    };
  }
}

module.exports = PaymentServiceFactory;