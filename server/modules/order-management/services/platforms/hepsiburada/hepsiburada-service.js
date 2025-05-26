const axios = require('axios');
const { Order, OrderItem, User, PlatformConnection, ShippingDetail, HepsiburadaOrder } = require('../../../../../models');
const { Op } = require('sequelize');
const sequelize = require('../../../../../config/database');
const logger = require('../../../../../utils/logger');
const BasePlatformService = require('../BasePlatformService'); // Fixed import path

class HepsiburadaService extends BasePlatformService {
  constructor(connectionId) {
    super(connectionId);
    // Default to test environment, will be updated based on environment setting
    this.apiUrl = 'https://oms-external.hepsiburada.com'; // Removed -sit from default
    this.merchantId = null;
    this.isTestEnvironment = true;
  }

  /**
   * Get the platform type
   * @returns {string} Platform type identifier
   */
  getPlatformType() {
    return 'hepsiburada';
  }

  /**
   * Setup Axios instance with appropriate headers and config
   * Implementation of abstract method from BasePlatformService
   */
  async setupAxiosInstance() {
    const credentials = this.decryptCredentials(this.connection.credentials);
    const { username, merchantId, apiKey, environment } = credentials;
    
    if (!username || !apiKey || !merchantId) {
      throw new Error('Missing required Hepsiburada credentials. Username, Merchant ID, and API Key are required.');
    }
    
    // Set the correct API URL based on environment
    this.isTestEnvironment = environment === 'test' || environment === 'sandbox' || !environment;
    this.apiUrl = this.isTestEnvironment 
      ? 'https://oms-external-sit.hepsiburada.com'
      : 'https://oms-external.hepsiburada.com';
    
    // Create Basic auth header with merchantId:apiKey (not username:apiKey)
    const authString = Buffer.from(`${merchantId}:${apiKey}`).toString('base64');
    
    this.axiosInstance = await this.createAxiosInstance({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Basic ${authString}`,
        'User-Agent': 'sentosyazilim_dev',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
    
    this.merchantId = merchantId;
    return true;
  }

  /**
   * Create an Axios instance - helper method for setupAxiosInstance
   * @param {Object} config - Axios configuration 
   * @returns {Object} Axios instance
   */
  async createAxiosInstance(config) {
    return axios.create(config);
  }

  /**
   * Override decryptCredentials for Hepsiburada-specific format
   * @param {string|object} encryptedCredentials 
   * @returns {object} Decrypted credentials
   */
  decryptCredentials(encryptedCredentials) {
    try {
      // Use the parent implementation for basic parsing
      const credentials = super.decryptCredentials(encryptedCredentials);
      
      // Debug logging to see what we received
      logger.info('Decrypting Hepsiburada credentials', {
        credentialsType: typeof credentials,
        credentialsKeys: credentials ? Object.keys(credentials) : 'null',
        hasUsername: !!credentials?.username,
        hasMerchantId: !!credentials?.merchantId,
        hasApiKey: !!credentials?.apiKey,
        connectionId: this.connectionId
      });
      
      // Make sure we have the required fields
      if (!credentials || !credentials.username || !credentials.merchantId || !credentials.apiKey) {
        const missing = [];
        if (!credentials) missing.push('credentials object is null/undefined');
        if (!credentials?.username) missing.push('username');
        if (!credentials?.merchantId) missing.push('merchantId');
        if (!credentials?.apiKey) missing.push('apiKey');
        
        throw new Error(`Missing required credentials: ${missing.join(', ')}`);
      }
      
      return {
        username: credentials.username,
        merchantId: credentials.merchantId,
        apiKey: credentials.apiKey,
        environment: credentials.environment || 'test'
      };
    } catch (error) {
      logger.error(`Failed to decrypt Hepsiburada credentials: ${error.message}`, { 
        error,
        connectionId: this.connectionId,
        credentialsType: typeof encryptedCredentials
      });
      throw new Error(`Failed to decrypt credentials: ${error.message}`);
    }
  }

  /**
   * Fetch completed orders (Ödemesi Tamamlanmış Siparişler)
   * These are orders ready to be packaged
   */
  async fetchCompletedOrders(params = {}) {
    try {
      await this.initialize();
      
      const defaultParams = {
        offset: 0,
        limit: 100 // Updated to match API documentation
      };
      
      const queryParams = { ...defaultParams, ...params };
      
      // Ensure limit doesn't exceed maximum
      if (queryParams.limit > 100) {
        queryParams.limit = 100;
      }
      
      // Use the correct API endpoint for getting orders
      const url = `/packages/merchantid/${this.merchantId}`;
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(url, { params: queryParams })
      );
      
      // Handle empty responses as successful connections (for testing purposes)
      if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
        return {
          success: true,
          message: 'Successfully connected to Hepsiburada API - no packages found (account may be empty)',
          data: []
        };
      }
      
      if (!Array.isArray(response.data)) {
        return {
          success: false,
          message: 'Invalid response format from Hepsiburada API',
          data: []
        };
      }
      
      return {
        success: true,
        message: `Successfully fetched ${response.data.length} completed orders from Hepsiburada`,
        data: response.data,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.length
        }
      };
    } catch (error) {
      logger.error(`Failed to fetch completed orders from Hepsiburada: ${error.message}`, { 
        error, 
        connectionId: this.connectionId 
      });
      
      return {
        success: false,
        message: `Failed to fetch completed orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }

  /**
   * Fetch pending payment orders (Ödemesi Beklenen Siparişler)
   * These are orders waiting for payment confirmation
   */
  async fetchPendingPaymentOrders(params = {}) {
    try {
      await this.initialize();
      
      const defaultParams = {
        offset: 0,
        limit: 100 // Updated to match API documentation
      };
      
      const queryParams = { ...defaultParams, ...params };
      
      if (queryParams.limit > 100) {
        queryParams.limit = 100;
      }
      
      // Use the correct API endpoint pattern
      const url = `/packages/merchantid/${this.merchantId}/notpaid`;
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(url, { params: queryParams })
      );
      
      // Handle empty responses as successful connections (for testing purposes)
      if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
        return {
          success: true,
          message: 'Successfully connected to Hepsiburada API - no pending payment orders found',
          data: []
        };
      }
      
      if (!Array.isArray(response.data)) {
        return {
          success: false,
          message: 'Invalid response format from Hepsiburada API',
          data: []
        };
      }
      
      return {
        success: true,
        message: `Successfully fetched ${response.data.length} pending payment orders from Hepsiburada`,
        data: response.data,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.length
        }
      };
    } catch (error) {
      logger.error(`Failed to fetch pending payment orders from Hepsiburada: ${error.message}`, { 
        error, 
        connectionId: this.connectionId 
      });
      
      return {
        success: false,
        message: `Failed to fetch pending payment orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }

  /**
   * Fetch packages (Paket Bilgileri)
   * These are packaged orders ready to ship
   */
  async fetchPackages(params = {}) {
    try {
      await this.initialize();
      
      const defaultParams = {
        offset: 0,
        limit: 50
      };
      
      const queryParams = { ...defaultParams, ...params };
      
      if (queryParams.limit > 50) {
        queryParams.limit = 50;
      }
      
      // Support both date range and offset/limit pagination
      let url = `/packages/merchantid/${this.merchantId}`;
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(url, { params: queryParams })
      );
      
      if (!response.data || !Array.isArray(response.data)) {
        return {
          success: false,
          message: 'No package data returned from Hepsiburada',
          data: []
        };
      }
      
      return {
        success: true,
        message: `Successfully fetched ${response.data.length} packages from Hepsiburada`,
        data: response.data,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.length
        }
      };
    } catch (error) {
      logger.error(`Failed to fetch packages from Hepsiburada: ${error.message}`, { 
        error, 
        connectionId: this.connectionId 
      });
      
      return {
        success: false,
        message: `Failed to fetch packages: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }

  /**
   * Fetch delivered orders (Teslim Edilen Siparişler)
   * Only last 1 month of data is available
   */
  async fetchDeliveredOrders(params = {}) {
    try {
      await this.initialize();
      
      const defaultParams = {
        offset: 0,
        limit: 100 // Updated to match API documentation
      };
      
      const queryParams = { ...defaultParams, ...params };
      
      if (queryParams.limit > 100) {
        queryParams.limit = 100;
      }
      
      // Use the correct API endpoint pattern
      const url = `/packages/merchantid/${this.merchantId}/delivered`;
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(url, { params: queryParams })
      );
      
      // Handle empty responses as successful connections (for testing purposes)
      if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
        return {
          success: true,
          message: 'Successfully connected to Hepsiburada API - no delivered orders found',
          data: []
        };
      }
      
      if (!Array.isArray(response.data)) {
        return {
          success: false,
          message: 'Invalid response format from Hepsiburada API',
          data: []
        };
      }
      
      return {
        success: true,
        message: `Successfully fetched ${response.data.length} delivered orders from Hepsiburada`,
        data: response.data,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.length
        }
      };
    } catch (error) {
      logger.error(`Failed to fetch delivered orders from Hepsiburada: ${error.message}`, { 
        error, 
        connectionId: this.connectionId 
      });
      
      return {
        success: false,
        message: `Failed to fetch delivered orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }

  /**
   * Fetch cancelled orders (İptal Sipariş Bilgileri)
   * Only last 1 month of data is available
   */
  async fetchCancelledOrders(params = {}) {
    try {
      await this.initialize();
      
      const defaultParams = {
        offset: 0,
        limit: 100 // Updated to match API documentation
      };
      
      const queryParams = { ...defaultParams, ...params };
      
      if (queryParams.limit > 100) {
        queryParams.limit = 100;
      }
      
      // Use the correct API endpoint pattern
      const url = `/packages/merchantid/${this.merchantId}/cancelled`;
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(url, { params: queryParams })
      );
      
      // Handle empty responses as successful connections (for testing purposes)
      if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
        return {
          success: true,
          message: 'Successfully connected to Hepsiburada API - no cancelled orders found',
          data: []
        };
      }
      
      if (!Array.isArray(response.data)) {
        return {
          success: false,
          message: 'Invalid response format from Hepsiburada API',
          data: []
        };
      }
      
      return {
        success: true,
        message: `Successfully fetched ${response.data.length} cancelled orders from Hepsiburada`,
        data: response.data,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.length
        }
      };
    } catch (error) {
      logger.error(`Failed to fetch cancelled orders from Hepsiburada: ${error.message}`, { 
        error, 
        connectionId: this.connectionId 
      });
      
      return {
        success: false,
        message: `Failed to fetch cancelled orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }

  /**
   * Main method to fetch orders - now uses the appropriate endpoint based on status
   * Implementation of abstract method from BasePlatformService
   */
  async fetchOrders(params = {}) {
    try {
      await this.initialize();
      
      // If no specific status is requested, fetch completed orders (most common use case)
      const status = params.status || 'completed';
      
      switch(status) {
        case 'pending_payment':
          return await this.fetchPendingPaymentOrders(params);
        case 'packages':
          return await this.fetchPackages(params);
        case 'delivered':
          return await this.fetchDeliveredOrders(params);
        case 'cancelled':
          return await this.fetchCancelledOrders(params);
        case 'completed':
        default:
          return await this.fetchCompletedOrders(params);
      }
    } catch (error) {
      logger.error(`Failed to fetch orders from Hepsiburada: ${error.message}`, { 
        error, 
        connectionId: this.connectionId 
      });
      
      return {
        success: false,
        message: `Failed to fetch orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }
  
  /**
   * Get detailed information for a specific order by its order number
   * @param {string} orderNumber - The Hepsiburada order number
   * @returns {Object} - Order details or error
   */
  async getOrderDetails(orderNumber) {
    try {
      await this.initialize();
      
      // Use the correct API endpoint pattern
      const url = `/packages/merchantid/${this.merchantId}/ordernumber/${orderNumber}`;
      
      logger.info(`Fetching order details from Hepsiburada: ${orderNumber}`);
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(url)
      );
      
      if (!response.data || !response.data.orderId) {
        return {
          success: false,
          message: 'Invalid order data returned from Hepsiburada',
          data: null
        };
      }
      
      return {
        success: true,
        message: 'Successfully fetched order details',
        data: response.data
      };
    } catch (error) {
      logger.error(`Failed to fetch order details from Hepsiburada: ${error.message}`, { 
        error, 
        connectionId: this.connectionId,
        orderNumber 
      });
      
      return {
        success: false,
        message: `Failed to fetch order details: ${error.message}`,
        error: error.response?.data || error.message,
        data: null
      };
    }
  }

  /**
   * Create a package for shipping (Paket Oluşturma)
   * @param {Array} orderItemIds - Array of order item IDs to package together
   * @param {Object} shippingInfo - Shipping information
   * @returns {Object} - Result of package creation
   */
  async createPackage(orderItemIds, shippingInfo = {}) {
    try {
      await this.initialize();
      
      const url = `/packages/merchantid/${this.merchantId}`;
      
      const packageData = {
        items: orderItemIds.map(itemId => ({ id: itemId })),
        cargoCompany: shippingInfo.cargoCompany || '',
        desi: shippingInfo.desi || 1,
        packageNumber: shippingInfo.packageNumber || '',
        ...shippingInfo
      };
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.post(url, packageData)
      );
      
      return {
        success: true,
        message: 'Package created successfully',
        data: response.data
      };
    } catch (error) {
      logger.error(`Failed to create package on Hepsiburada: ${error.message}`, { 
        error, 
        connectionId: this.connectionId,
        orderItemIds 
      });
      
      return {
        success: false,
        message: `Failed to create package: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Update package shipping information (Paket Kargo Bilgisi Güncelleme)
   * @param {string} packageNumber - Package number
   * @param {Object} shippingUpdate - Updated shipping information
   * @returns {Object} - Result of shipping update
   */
  async updatePackageShipping(packageNumber, shippingUpdate) {
    try {
      await this.initialize();
      
      const url = `/packages/merchantid/${this.merchantId}/packagenumber/${packageNumber}/cargo`;
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.put(url, shippingUpdate)
      );
      
      return {
        success: true,
        message: 'Package shipping information updated successfully',
        data: response.data
      };
    } catch (error) {
      logger.error(`Failed to update package shipping on Hepsiburada: ${error.message}`, { 
        error, 
        connectionId: this.connectionId,
        packageNumber 
      });
      
      return {
        success: false,
        message: `Failed to update package shipping: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Cancel an order (İptal Bilgisi Gönderme)
   * Daily limit: 100 cancellations
   * @param {string} orderItemId - Order item ID to cancel
   * @param {string} reason - Cancellation reason
   * @returns {Object} - Result of cancellation
   */
  async cancelOrder(orderItemId, reason = 'MerchantCancel') {
    try {
      await this.initialize();
      
      // Use the correct API endpoint pattern
      const url = `/packages/merchantid/${this.merchantId}/items/${orderItemId}/cancel`;
      
      const cancellationData = {
        reason: reason
      };
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.put(url, cancellationData)
      );
      
      return {
        success: true,
        message: 'Order cancelled successfully',
        data: response.data
      };
    } catch (error) {
      logger.error(`Failed to cancel order on Hepsiburada: ${error.message}`, { 
        error, 
        connectionId: this.connectionId,
        orderItemId,
        reason 
      });
      
      return {
        success: false,
        message: `Failed to cancel order: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Generate shipping barcode (Ortak Barkod Oluşturma)
   * Supports HepsiJet and Aras cargo companies
   * @param {string} packageNumber - Package number
   * @param {string} format - Output format (zpl, base64zpl, pdf, png, jpg)
   * @returns {Object} - Barcode data
   */
  async generateShippingBarcode(packageNumber, format = 'pdf') {
    try {
      await this.initialize();
      
      const url = `/packages/merchantid/${this.merchantId}/packagenumber/${packageNumber}/barcode`;
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(url, { 
          params: { format },
          responseType: format === 'pdf' ? 'arraybuffer' : 'json'
        })
      );
      
      return {
        success: true,
        message: 'Barcode generated successfully',
        data: response.data,
        format: format
      };
    } catch (error) {
      logger.error(`Failed to generate barcode on Hepsiburada: ${error.message}`, { 
        error, 
        connectionId: this.connectionId,
        packageNumber,
        format 
      });
      
      return {
        success: false,
        message: `Failed to generate barcode: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Create test order (Test İçin Sipariş Oluşturma)
   * Only available in test environment
   * @param {Object} testOrderData - Test order data
   * @returns {Object} - Created test order
   */
  async createTestOrder(testOrderData) {
    try {
      if (!this.isTestEnvironment) {
        throw new Error('Test order creation is only available in test environment');
      }
      
      await this.initialize();
      
      // Use the correct API endpoint pattern
      const url = `/packages/merchantid/${this.merchantId}/test`;
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.post(url, testOrderData)
      );
      
      return {
        success: true,
        message: 'Test order created successfully',
        data: response.data
      };
    } catch (error) {
      logger.error(`Failed to create test order on Hepsiburada: ${error.message}`, { 
        error, 
        connectionId: this.connectionId,
        testOrderData 
      });
      
      return {
        success: false,
        message: `Failed to create test order: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Map Hepsiburada order status to internal system status
   * Updated based on documentation
   * @param {string} hepsiburadaStatus - Platform-specific status
   * @returns {string} Internal status
   */
  mapOrderStatus(hepsiburadaStatus) {
    const statusMap = {
      'Open': 'new',
      'Pending': 'pending_payment',
      'Picking': 'processing',
      'Packaging': 'processing',
      'Packaged': 'ready_to_ship',
      'Invoiced': 'processing',
      'ReadyToShip': 'ready_to_ship',
      'Shipped': 'shipped',
      'InTransit': 'shipped',
      'Delivered': 'delivered',
      'Cancelled': 'cancelled',
      'CancelledByMerchant': 'cancelled',
      'CancelledByCustomer': 'cancelled',
      'CancelledBySap': 'cancelled',
      'Returned': 'returned',
      'ReturnInProgress': 'return_pending',
      'PartiallyReturned': 'partially_returned',
      'UnDelivered': 'failed',
      'UnPaid': 'pending_payment',
      'WaitingForApproval': 'pending_approval',
      'Approved': 'approved',
      'OnHold': 'on_hold',
      'ClaimCreated': 'dispute'
    };
    
    return statusMap[hepsiburadaStatus] || 'new';
  }

  /**
   * Map internal status to Hepsiburada platform status
   * Updated based on documentation
   * @param {string} internalStatus - Internal status
   * @returns {string} Platform-specific status
   */
  mapToPlatformStatus(internalStatus) {
    const statusMap = {
      'new': 'Open',
      'pending_payment': 'Pending',
      'processing': 'Picking',
      'ready_to_ship': 'Packaged',
      'shipped': 'InTransit',
      'delivered': 'Delivered',
      'cancelled': 'CancelledByMerchant',
      'returned': 'Returned',
      'return_pending': 'ReturnInProgress',
      'partially_returned': 'PartiallyReturned',
      'failed': 'UnDelivered',
      'pending_approval': 'WaitingForApproval',
      'approved': 'Approved',
      'on_hold': 'OnHold',
      'dispute': 'ClaimCreated'
    };
    
    return statusMap[internalStatus] || 'Open';
  }

  /**
   * Update order status on Hepsiburada platform
   * @param {string} orderId - Internal order ID
   * @param {string} newStatus - New status to set
   * @returns {Object} - Result of the status update operation
   */
  async updateOrderStatus(orderId, newStatus) {
    try {
      await this.initialize();
      
      const order = await Order.findByPk(orderId, {
        include: [{ model: HepsiburadaOrder }]
      });
      
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      
      if (!order.HepsiburadaOrder) {
        throw new Error(`Hepsiburada order details not found for order ID ${orderId}`);
      }
      
      const hepsiburadaStatus = this.mapToPlatformStatus(newStatus);
      
      if (!hepsiburadaStatus) {
        throw new Error(`Cannot map status '${newStatus}' to Hepsiburada status`);
      }
      
      const packageNumber = order.HepsiburadaOrder.packageNumber;
      
      if (!packageNumber) {
        throw new Error('Package number not found in order details');
      }

      // Special handling for status transitions that require additional API calls
      let apiEndpoint = `/packages/merchantid/${this.merchantId}/packagenumber/${packageNumber}/status`;
      let requestData = { status: hepsiburadaStatus };

      // Handle special status transitions
      switch(newStatus) {
        case 'shipped':
          if (!order.trackingNumber) {
            throw new Error('Tracking number is required for shipping status update');
          }
          requestData.trackingNumber = order.trackingNumber;
          requestData.cargoCompany = order.carrierName || 'Other';
          apiEndpoint = `/packages/merchantid/${this.merchantId}/packagenumber/${packageNumber}/ship`;
          break;

        case 'cancelled':
          if (!order.cancellationReason) {
            requestData.reason = 'MerchantCancel';
          } else {
            requestData.reason = order.cancellationReason;
          }
          apiEndpoint = `/packages/merchantid/${this.merchantId}/packagenumber/${packageNumber}/cancel`;
          break;

        case 'return_approved':
          apiEndpoint = `/packages/merchantid/${this.merchantId}/packagenumber/${packageNumber}/return/approve`;
          break;

        case 'return_rejected':
          apiEndpoint = `/packages/merchantid/${this.merchantId}/packagenumber/${packageNumber}/return/reject`;
          break;
      }
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.put(apiEndpoint, requestData)
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update status on Hepsiburada');
      }
      
      // Update local order status with transaction
      await sequelize.transaction(async (t) => {
        await order.update({
          status: newStatus,
          lastSyncedAt: new Date()
        }, { transaction: t });
        
        await order.HepsiburadaOrder.update({
          platformStatus: hepsiburadaStatus
        }, { transaction: t });
      });
      
      return {
        success: true,
        message: `Order status updated to ${newStatus}`,
        data: order
      };

    } catch (error) {
      logger.error(`Failed to update order status on Hepsiburada: ${error.message}`, {
        error,
        orderId,
        newStatus
      });
      
      throw error;
    }
  }

  /**
   * Get orders from Hepsiburada - required implementation for BasePlatformService
   * @param {Object} options - Options for fetching orders
   * @returns {Promise<Array>} List of orders
   */
  async getOrders(options = {}) {
    try {
      const result = await this.fetchOrders(options);
      
      if (!result.success) {
        logger.error(`Failed to get orders from Hepsiburada: ${result.message}`, {
          error: result.error,
          connectionId: this.connectionId,
          platformType: this.getPlatformType()
        });
        return [];
      }
      
      return result.data;
    } catch (error) {
      logger.error(`Error in getOrders method for Hepsiburada: ${error.message}`, {
        error,
        connectionId: this.connectionId,
        platformType: this.getPlatformType()
      });
      throw error;
    }
  }

  /**
   * Fetch products from Hepsiburada (Listing Bilgileri)
   * @param {Object} params - Query parameters 
   * @returns {Promise<Object>} Result containing product data
   */
  async fetchProducts(params = {}) {
    try {
      await this.initialize();
      
      const defaultParams = {
        offset: 0,
        limit: 50 // Aligned with order limits
      };
      
      const queryParams = { ...defaultParams, ...params };
      
      if (queryParams.limit > 50) {
        queryParams.limit = 50;
      }
      
      const url = `/listings/merchantid/${this.merchantId}`;
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(url, { params: queryParams })
      );
      
      if (!response.data || !Array.isArray(response.data)) {
        return {
          success: false,
          message: 'No product data returned from Hepsiburada',
          data: []
        };
      }
      
      return {
        success: true,
        message: `Successfully fetched ${response.data.length} products from Hepsiburada`,
        data: response.data,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.length
        }
      };
    } catch (error) {
      logger.error(`Failed to fetch products from Hepsiburada: ${error.message}`, { 
        error, 
        connectionId: this.connectionId 
      });
      
      return {
        success: false,
        message: `Failed to fetch products: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }

  /**
   * Update product listing information (Listing Bilgilerini Güncelleme)
   * @param {Object} listingData - Product listing data to update
   * @returns {Object} - Result of listing update
   */
  async updateProductListing(listingData) {
    try {
      await this.initialize();
      
      const url = `/listings/merchantid/${this.merchantId}`;
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.put(url, listingData, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        })
      );
      
      return {
        success: true,
        message: 'Product listing updated successfully',
        data: response.data,
        trackingId: response.data.trackingId
      };
    } catch (error) {
      logger.error(`Failed to update product listing on Hepsiburada: ${error.message}`, { 
        error, 
        connectionId: this.connectionId,
        listingData 
      });
      
      return {
        success: false,
        message: `Failed to update product listing: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  // We're using the BasePlatformService implementation for retryRequest and syncOrdersFromDate
}

module.exports = HepsiburadaService;