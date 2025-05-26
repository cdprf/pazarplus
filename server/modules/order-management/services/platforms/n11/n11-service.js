/**
 * N11 Platform Service
 * Implements the N11 REST API for order management
 * Updated with all REST API endpoints from N11 documentation
 */

const axios = require('axios');
const { Order, OrderItem, User, PlatformConnection } = require('../../../../../models');
const logger = require('../../../../../utils/logger');

const BasePlatformService = require('../BasePlatformService');

// N11 API Constants
const N11_API = {
  BASE_URL: 'https://api.n11.com/rest',
  ENDPOINTS: {
    // Order Management
    ORDERS: '/order/v1/list',
    ORDER_DETAIL: '/order/v1/detail',
    UPDATE_ORDER: '/order/v1/update',
    ACCEPT_ORDER: '/order/v1/accept',
    REJECT_ORDER: '/order/v1/reject',
    SHIP_ORDER: '/order/v1/ship',
    DELIVER_ORDER: '/order/v1/delivery',
    SPLIT_PACKAGE: '/order/v1/splitCombinePackage',
    LABOR_COST: '/order/v1/laborCost',
    
    // Product Management
    PRODUCTS: '/product/v1/list',
    PRODUCT_DETAIL: '/product/v1/detail',
    PRODUCT_QUERY: '/product/v1/getProductQuery',
    
    // Category Management
    CATEGORIES: '/category/v1/getCategories',
    CATEGORY_ATTRIBUTES: '/category/v1/getCategoryAttributesList',
    
    // Catalog Service
    CATALOG_SEARCH: '/catalog/v1/search',
    CATALOG_UPLOAD: '/catalog/v1/upload',
    
    // Return Management
    RETURNS: '/return/v1/list',
    RETURN_APPROVE: '/return/v1/approve',
    RETURN_REJECT: '/return/v1/reject',
    RETURN_POSTPONE: '/return/v1/postpone',
    
    // Delivery Management
    SHIPMENT_PACKAGES: '/delivery/v1/shipmentPackages',
    ONLINE_DELIVERY_UPDATE: '/delivery/v1/onlineDeliveryUpdate'
  }
};

class N11Service extends BasePlatformService {
  constructor(connectionId, directCredentials = null) {
    super(connectionId);
    this.directCredentials = directCredentials;
    this.apiUrl = N11_API.BASE_URL;
    this.logger = this.getLogger();
  }
  
  /**
   * Get the platform type
   * @returns {string} Platform type
   */
  getPlatformType() {
    return 'n11';
  }

  /**
   * Find connection in database or use direct credentials
   * Override to handle direct credentials case
   * @returns {Promise<Object>} Connection object
   */
  async findConnection() {
    if (this.directCredentials) {
      return { credentials: JSON.stringify(this.directCredentials) };
    } else {
      return await super.findConnection();
    }
  }
  
  /**
   * Setup Axios instance with N11-specific headers and config
   * Implementation of abstract method from BasePlatformService
   */
  async setupAxiosInstance() {
    const credentials = this.decryptCredentials(this.connection.credentials);
    const { appKey, appSecret } = credentials;
    
    // Validate required credentials
    if (!appKey || !appSecret) {
      throw new Error('Missing required N11 credentials. App key and app secret are required.');
    }
    
    this.axiosInstance = axios.create({
      baseURL: N11_API.BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'appKey': appKey,
        'appSecret': appSecret
      },
      timeout: 30000
    });

    return true;
  }

  /**
   * Override decryptCredentials for N11-specific format
   * @param {string|object} encryptedCredentials 
   * @returns {object} Decrypted credentials
   */
  decryptCredentials(encryptedCredentials) {
    try {
      const credentials = super.decryptCredentials(encryptedCredentials);
      
      return {
        appKey: credentials.appKey,
        appSecret: credentials.appSecret,
        endpointUrl: credentials.endpointUrl || N11_API.BASE_URL
      };
    } catch (error) {
      this.logger.error(`Failed to decrypt N11 credentials: ${error.message}`, { error });
      throw new Error('Failed to decrypt credentials');
    }
  }

  /**
   * Test the connection to N11
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);
      
      if (!credentials.appKey || !credentials.appSecret) {
        return {
          success: false,
          message: 'Connection failed: App key or app secret is missing from credentials',
          error: 'Missing required parameters'
        };
      }

      this.logger.debug(`Testing N11 connection with appKey: ${credentials.appKey}`);
      
      try {
        // Test connection by fetching categories (lightweight operation)
        const response = await this.retryRequest(() => 
          this.axiosInstance.get(N11_API.ENDPOINTS.CATEGORIES)
        );
        
        if (response.data && response.data.result && response.data.result.status === 'success') {
          return {
            success: true,
            message: 'Connection successful',
            data: {
              platform: 'n11',
              connectionId: this.connectionId,
              status: 'active'
            }
          };
        } else {
          throw new Error(response.data?.result?.errorMessage || 'Connection test failed');
        }
      } catch (requestError) {
        this.logger.error('N11 API request failed', {
          error: requestError.message,
          status: requestError.response?.status,
          data: requestError.response?.data
        });
        
        let errorMessage = requestError.message;
        const errorData = requestError.response?.data;
        
        if (errorData && errorData.result && errorData.result.errorMessage) {
          errorMessage = errorData.result.errorMessage;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      this.logger.error(`N11 connection test failed: ${error.message}`, { error, connectionId: this.connectionId });
      
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Fetch orders from N11
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing order data
   */
  async fetchOrders(params = {}) {
    try {
      await this.initialize();
      
      // Default parameters for N11 order list API
      const defaultParams = {
        status: params.status || 'Confirmed',
        period: params.period || 'lastOrderDate',
        startDate: params.startDate || this.getDefaultStartDate(),
        endDate: params.endDate || this.getDefaultEndDate(),
        pagingData: {
          currentPage: params.page || 0,
          pageSize: params.size || 50
        }
      };
      
      const queryParams = { ...defaultParams, ...params };
      
      this.logger.debug(`Fetching N11 orders with params: ${JSON.stringify(queryParams)}`);
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.post(N11_API.ENDPOINTS.ORDERS, queryParams)
      );
      
      if (!response.data || !response.data.result || response.data.result.status !== 'success') {
        return {
          success: false,
          message: response.data?.result?.errorMessage || 'Failed to fetch orders from N11',
          data: []
        };
      }
      
      const orders = response.data.orderList || [];
      
      this.logger.info(`Retrieved ${orders.length} orders from N11`);
      
      const normalizeResult = await this.normalizeOrders(orders);
      
      return {
        success: true,
        message: `Successfully fetched ${normalizeResult.data.length} orders from N11`,
        data: normalizeResult.data,
        stats: normalizeResult.stats,
        pagination: response.data.pagingData ? {
          page: response.data.pagingData.currentPage || 0,
          size: response.data.pagingData.pageSize || queryParams.pagingData.pageSize,
          totalPages: Math.ceil((response.data.pagingData.totalCount || 0) / (response.data.pagingData.pageSize || 50)),
          totalElements: response.data.pagingData.totalCount || orders.length
        } : undefined
      };
    } catch (error) {
      this.logger.error(`Failed to fetch orders from N11: ${error.message}`, { 
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
   * Get orders from N11 - required implementation for BasePlatformService
   * @param {Object} options - Options for fetching orders
   * @returns {Promise<Array>} List of orders
   */
  async getOrders(options = {}) {
    try {
      const result = await this.fetchOrders(options);
      
      if (!result.success) {
        this.logger.error(`Failed to get orders from N11: ${result.message}`, {
          error: result.error,
          connectionId: this.connectionId,
          platformType: this.getPlatformType()
        });
        return [];
      }
      
      return Array.isArray(result.data) ? result.data : [];
    } catch (error) {
      this.logger.error(`Error in getOrders method for N11: ${error.message}`, {
        error,
        connectionId: this.connectionId,
        platformType: this.getPlatformType()
      });
      return [];
    }
  }

  /**
   * Normalize N11 orders to internal format
   * @param {Array} n11Orders - Orders from N11 API
   * @returns {Promise<Object>} Normalized orders with statistics
   */
  async normalizeOrders(n11Orders) {
    const normalizedOrders = [];
    let successCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    try {
      const { sequelize } = require('../../../../../models');
      const { Op } = require('sequelize');

      for (const order of n11Orders) {
        try {
          const phoneNumber = this.extractPhoneNumber(order);
          
          // Check if order already exists
          const existingOrder = await Order.findOne({
            where: {
              connectionId: this.connectionId,
              externalOrderId: order.id.toString()
            }
          });

          if (existingOrder) {
            // Update existing order
            try {
              await existingOrder.update({
                status: this.mapOrderStatus(order.status),
                rawData: JSON.stringify(order),
                lastSyncedAt: new Date()
              });
              
              updatedCount++;
              normalizedOrders.push(existingOrder);
              continue;
            } catch (updateError) {
              this.logger.error(`Failed to update existing order ${order.id}: ${updateError.message}`, {
                error: updateError,
                orderId: order.id,
                connectionId: this.connectionId
              });
              skippedCount++;
              continue;
            }
          }

          // Create new order
          const result = await sequelize.transaction(async (t) => {
            // Create shipping detail first
            const { ShippingDetail } = require('../../../../../models');
            const shippingDetail = await ShippingDetail.create({
              recipientName: order.recipient?.fullName || '',
              address1: order.billingAddress?.address || '',
              city: order.billingAddress?.city || '',
              state: order.billingAddress?.district || '',
              postalCode: order.billingAddress?.postalCode || '',
              country: 'Turkey',
              phone: phoneNumber || '',
              email: order.buyer?.email || ''
            }, { transaction: t });

            // Create the order record
            const normalizedOrder = await Order.create({
              externalOrderId: order.id.toString(),
              connectionId: this.connectionId,
              userId: this.connection.userId,
              customerName: order.buyer?.fullName || 'Unknown',
              customerEmail: order.buyer?.email || '',
              customerPhone: phoneNumber || '',
              orderDate: new Date(order.createDate),
              status: this.mapOrderStatus(order.status),
              totalAmount: parseFloat(order.totalAmount || 0),
              currency: 'TRY',
              shippingDetailId: shippingDetail.id,
              notes: order.note || '',
              paymentStatus: 'pending',
              rawData: JSON.stringify(order),
              lastSyncedAt: new Date()
            }, { transaction: t });

            // Create order items
            if (order.orderItemList && Array.isArray(order.orderItemList)) {
              for (const item of order.orderItemList) {
                await OrderItem.create({
                  orderId: normalizedOrder.id,
                  externalProductId: item.productId?.toString() || item.id?.toString(),
                  name: item.productName || item.title,
                  sku: item.productSellerCode || item.sellerStockCode,
                  quantity: parseInt(item.quantity || 1, 10),
                  unitPrice: parseFloat(item.price || 0),
                  totalPrice: parseFloat(item.totalAmount || item.price * item.quantity || 0),
                  discount: parseFloat(item.discount || 0),
                  options: item.attributes ? {
                    attributes: item.attributes
                  } : null,
                  metadata: {
                    platformData: item
                  }
                }, { transaction: t });
              }
            }

            // Create N11-specific order record
            await this.createN11OrderRecord(normalizedOrder.id, order, t);

            return normalizedOrder;
          });

          normalizedOrders.push(result);
          successCount++;

        } catch (error) {
          this.logger.error(`Failed to process order ${order.id}: ${error.message}`, {
            error,
            orderId: order.id,
            connectionId: this.connectionId
          });
          skippedCount++;
        }
      }

      return {
        success: true,
        message: `Successfully processed ${successCount} orders (${updatedCount} updated, ${skippedCount} skipped)`,
        data: normalizedOrders,
        stats: {
          total: n11Orders.length,
          success: successCount,
          updated: updatedCount,
          skipped: skippedCount
        }
      };
    } catch (error) {
      this.logger.error(`Failed to normalize orders: ${error.message}`, {
        error,
        connectionId: this.connectionId
      });
      throw error;
    }
  }

  /**
   * Create N11-specific order record
   * @param {string} orderId - The main Order record ID
   * @param {Object} n11OrderData - Raw order data from N11 API
   * @param {Object} transaction - Sequelize transaction object
   * @returns {Promise<Object>} Created N11Order record
   */
  async createN11OrderRecord(orderId, n11OrderData, transaction) {
    try {
      const { N11Order } = require('../../../../../models');

      return await N11Order.create({
        orderId: orderId,
        n11OrderId: n11OrderData.id?.toString(),
        orderNumber: n11OrderData.orderNumber,
        sellerId: n11OrderData.sellerId,
        buyerId: n11OrderData.buyer?.id?.toString(),
        orderStatus: this.mapToN11ModelStatus(n11OrderData.status),
        paymentType: this.mapPaymentType(n11OrderData.paymentType),
        paymentStatus: this.mapPaymentStatus(n11OrderData.paymentStatus),
        shippingCompany: n11OrderData.shippingCompany?.name,
        trackingNumber: n11OrderData.trackingNumber,
        trackingUrl: n11OrderData.trackingUrl,
        estimatedDeliveryDate: n11OrderData.estimatedDeliveryDate ? new Date(n11OrderData.estimatedDeliveryDate) : null,
        actualDeliveryDate: n11OrderData.actualDeliveryDate ? new Date(n11OrderData.actualDeliveryDate) : null,
        shippingAddress: n11OrderData.deliveryAddress || n11OrderData.shippingAddress,
        billingAddress: n11OrderData.billingAddress,
        customerInfo: {
          fullName: n11OrderData.buyer?.fullName,
          email: n11OrderData.buyer?.email,
          gsm: n11OrderData.buyer?.gsm,
          citizenshipId: n11OrderData.citizenshipId
        },
        invoiceInfo: n11OrderData.invoiceInfo,
        n11OrderDate: n11OrderData.createDate ? new Date(n11OrderData.createDate) : new Date(),
        lastSyncAt: new Date(),
        platformFees: n11OrderData.platformFees || n11OrderData.commission,
        cancellationReason: n11OrderData.cancellationReason,
        returnReason: n11OrderData.returnReason,
        platformOrderData: n11OrderData
      }, { transaction });
    } catch (error) {
      this.logger.error(`Failed to create N11Order record: ${error.message}`, { 
        error, 
        orderId,
        orderNumber: n11OrderData.orderNumber 
      });
      throw error;
    }
  }

  /**
   * Map N11 API status to N11Order model status enum
   * @param {string} apiStatus - Status from N11 API
   * @returns {string} N11Order model status
   */
  mapToN11ModelStatus(apiStatus) {
    const statusMap = {
      'Confirmed': 'Onaylandi',
      'UnConfirmed': 'Yeni',
      'Picking': 'Hazirlaniyor',
      'Shipped': 'Kargoya_Verildi',
      'Delivered': 'Teslim_Edildi',
      'Cancelled': 'Iptal_Edildi',
      'Rejected': 'Iptal_Edildi',
      'Returned': 'Iade_Edildi',
      'Completing': 'Hazirlaniyor'
    };
    
    return statusMap[apiStatus] || 'Yeni';
  }

  /**
   * Map payment type to N11Order model enum
   * @param {string} paymentType - Payment type from N11 API
   * @returns {string} N11Order model payment type
   */
  mapPaymentType(paymentType) {
    const paymentMap = {
      'CreditCard': 'Kredi_Karti',
      'BankTransfer': 'Havale_EFT',
      'CashOnDelivery': 'Kapida_Odeme',
      'N11Wallet': 'N11_Cuzdan'
    };
    
    return paymentMap[paymentType] || 'Kredi_Karti';
  }

  /**
   * Map payment status to N11Order model enum
   * @param {string} paymentStatus - Payment status from N11 API
   * @returns {string} N11Order model payment status
   */
  mapPaymentStatus(paymentStatus) {
    const statusMap = {
      'Pending': 'Bekliyor',
      'Confirmed': 'Onaylandi',
      'Cancelled': 'Iptal_Edildi'
    };
    
    return statusMap[paymentStatus] || 'Bekliyor';
  }

  /**
   * Test the connection to N11
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);
      
      if (!credentials.appKey || !credentials.appSecret) {
        return {
          success: false,
          message: 'Connection failed: App key or app secret is missing from credentials',
          error: 'Missing required parameters'
        };
      }

      this.logger.debug(`Testing N11 connection with appKey: ${credentials.appKey}`);
      
      try {
        // Test connection by fetching categories (lightweight operation)
        const response = await this.retryRequest(() => 
          this.axiosInstance.get(N11_API.ENDPOINTS.CATEGORIES)
        );
        
        if (response.data && response.data.result && response.data.result.status === 'success') {
          return {
            success: true,
            message: 'Connection successful',
            data: {
              platform: 'n11',
              connectionId: this.connectionId,
              status: 'active'
            }
          };
        } else {
          throw new Error(response.data?.result?.errorMessage || 'Connection test failed');
        }
      } catch (requestError) {
        this.logger.error('N11 API request failed', {
          error: requestError.message,
          status: requestError.response?.status,
          data: requestError.response?.data
        });
        
        let errorMessage = requestError.message;
        const errorData = requestError.response?.data;
        
        if (errorData && errorData.result && errorData.result.errorMessage) {
          errorMessage = errorData.result.errorMessage;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      this.logger.error(`N11 connection test failed: ${error.message}`, { error, connectionId: this.connectionId });
      
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Fetch orders from N11
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing order data
   */
  async fetchOrders(params = {}) {
    try {
      await this.initialize();
      
      // Default parameters for N11 order list API
      const defaultParams = {
        status: params.status || 'Confirmed',
        period: params.period || 'lastOrderDate',
        startDate: params.startDate || this.getDefaultStartDate(),
        endDate: params.endDate || this.getDefaultEndDate(),
        pagingData: {
          currentPage: params.page || 0,
          pageSize: params.size || 50
        }
      };
      
      const queryParams = { ...defaultParams, ...params };
      
      this.logger.debug(`Fetching N11 orders with params: ${JSON.stringify(queryParams)}`);
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.post(N11_API.ENDPOINTS.ORDERS, queryParams)
      );
      
      if (!response.data || !response.data.result || response.data.result.status !== 'success') {
        return {
          success: false,
          message: response.data?.result?.errorMessage || 'Failed to fetch orders from N11',
          data: []
        };
      }
      
      const orders = response.data.orderList || [];
      
      this.logger.info(`Retrieved ${orders.length} orders from N11`);
      
      const normalizeResult = await this.normalizeOrders(orders);
      
      return {
        success: true,
        message: `Successfully fetched ${normalizeResult.data.length} orders from N11`,
        data: normalizeResult.data,
        stats: normalizeResult.stats,
        pagination: response.data.pagingData ? {
          page: response.data.pagingData.currentPage || 0,
          size: response.data.pagingData.pageSize || queryParams.pagingData.pageSize,
          totalPages: Math.ceil((response.data.pagingData.totalCount || 0) / (response.data.pagingData.pageSize || 50)),
          totalElements: response.data.pagingData.totalCount || orders.length
        } : undefined
      };
    } catch (error) {
      this.logger.error(`Failed to fetch orders from N11: ${error.message}`, { 
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
   * Get orders from N11 - required implementation for BasePlatformService
   * @param {Object} options - Options for fetching orders
   * @returns {Promise<Array>} List of orders
   */
  async getOrders(options = {}) {
    try {
      const result = await this.fetchOrders(options);
      
      if (!result.success) {
        this.logger.error(`Failed to get orders from N11: ${result.message}`, {
          error: result.error,
          connectionId: this.connectionId,
          platformType: this.getPlatformType()
        });
        return [];
      }
      
      return Array.isArray(result.data) ? result.data : [];
    } catch (error) {
      this.logger.error(`Error in getOrders method for N11: ${error.message}`, {
        error,
        connectionId: this.connectionId,
        platformType: this.getPlatformType()
      });
      return [];
    }
  }

  /**
   * Normalize N11 orders to internal format
   * @param {Array} n11Orders - Orders from N11 API
   * @returns {Promise<Object>} Normalized orders with statistics
   */
  async normalizeOrders(n11Orders) {
    const normalizedOrders = [];
    let successCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    try {
      const { sequelize } = require('../../../../../models');
      const { Op } = require('sequelize');

      for (const order of n11Orders) {
        try {
          const phoneNumber = this.extractPhoneNumber(order);
          
          // Check if order already exists
          const existingOrder = await Order.findOne({
            where: {
              connectionId: this.connectionId,
              externalOrderId: order.id.toString()
            }
          });

          if (existingOrder) {
            // Update existing order
            try {
              await existingOrder.update({
                status: this.mapOrderStatus(order.status),
                rawData: JSON.stringify(order),
                lastSyncedAt: new Date()
              });
              
              updatedCount++;
              normalizedOrders.push(existingOrder);
              continue;
            } catch (updateError) {
              this.logger.error(`Failed to update existing order ${order.id}: ${updateError.message}`, {
                error: updateError,
                orderId: order.id,
                connectionId: this.connectionId
              });
              skippedCount++;
              continue;
            }
          }

          // Create new order
          const result = await sequelize.transaction(async (t) => {
            // Create shipping detail first
            const { ShippingDetail } = require('../../../../../models');
            const shippingDetail = await ShippingDetail.create({
              recipientName: order.recipient?.fullName || '',
              address1: order.billingAddress?.address || '',
              city: order.billingAddress?.city || '',
              state: order.billingAddress?.district || '',
              postalCode: order.billingAddress?.postalCode || '',
              country: 'Turkey',
              phone: phoneNumber || '',
              email: order.buyer?.email || ''
            }, { transaction: t });

            // Create the order record
            const normalizedOrder = await Order.create({
              externalOrderId: order.id.toString(),
              connectionId: this.connectionId,
              userId: this.connection.userId,
              customerName: order.buyer?.fullName || 'Unknown',
              customerEmail: order.buyer?.email || '',
              customerPhone: phoneNumber || '',
              orderDate: new Date(order.createDate),
              status: this.mapOrderStatus(order.status),
              totalAmount: parseFloat(order.totalAmount || 0),
              currency: 'TRY',
              shippingDetailId: shippingDetail.id,
              notes: order.note || '',
              paymentStatus: 'pending',
              rawData: JSON.stringify(order),
              lastSyncedAt: new Date()
            }, { transaction: t });

            // Create order items
            if (order.orderItemList && Array.isArray(order.orderItemList)) {
              for (const item of order.orderItemList) {
                await OrderItem.create({
                  orderId: normalizedOrder.id,
                  externalProductId: item.productId?.toString() || item.id?.toString(),
                  name: item.productName || item.title,
                  sku: item.productSellerCode || item.sellerStockCode,
                  quantity: parseInt(item.quantity || 1, 10),
                  unitPrice: parseFloat(item.price || 0),
                  totalPrice: parseFloat(item.totalAmount || item.price * item.quantity || 0),
                  discount: parseFloat(item.discount || 0),
                  options: item.attributes ? {
                    attributes: item.attributes
                  } : null,
                  metadata: {
                    platformData: item
                  }
                }, { transaction: t });
              }
            }

            // Create N11-specific order record
            await this.createN11OrderRecord(normalizedOrder.id, order, t);

            return normalizedOrder;
          });

          normalizedOrders.push(result);
          successCount++;

        } catch (error) {
          this.logger.error(`Failed to process order ${order.id}: ${error.message}`, {
            error,
            orderId: order.id,
            connectionId: this.connectionId
          });
          skippedCount++;
        }
      }

      return {
        success: true,
        message: `Successfully processed ${successCount} orders (${updatedCount} updated, ${skippedCount} skipped)`,
        data: normalizedOrders,
        stats: {
          total: n11Orders.length,
          success: successCount,
          updated: updatedCount,
          skipped: skippedCount
        }
      };
    } catch (error) {
      this.logger.error(`Failed to normalize orders: ${error.message}`, {
        error,
        connectionId: this.connectionId
      });
      throw error;
    }
  }

  /**
   * Create N11-specific order record
   * @param {string} orderId - The main Order record ID
   * @param {Object} n11OrderData - Raw order data from N11 API
   * @param {Object} transaction - Sequelize transaction object
   * @returns {Promise<Object>} Created N11Order record
   */
  async createN11OrderRecord(orderId, n11OrderData, transaction) {
    try {
      const { N11Order } = require('../../../../../models');

      return await N11Order.create({
        orderId: orderId,
        n11OrderId: n11OrderData.id?.toString(),
        orderNumber: n11OrderData.orderNumber,
        sellerId: n11OrderData.sellerId,
        buyerId: n11OrderData.buyer?.id?.toString(),
        orderStatus: this.mapToN11ModelStatus(n11OrderData.status),
        paymentType: this.mapPaymentType(n11OrderData.paymentType),
        paymentStatus: this.mapPaymentStatus(n11OrderData.paymentStatus),
        shippingCompany: n11OrderData.shippingCompany?.name,
        trackingNumber: n11OrderData.trackingNumber,
        trackingUrl: n11OrderData.trackingUrl,
        estimatedDeliveryDate: n11OrderData.estimatedDeliveryDate ? new Date(n11OrderData.estimatedDeliveryDate) : null,
        actualDeliveryDate: n11OrderData.actualDeliveryDate ? new Date(n11OrderData.actualDeliveryDate) : null,
        shippingAddress: n11OrderData.deliveryAddress || n11OrderData.shippingAddress,
        billingAddress: n11OrderData.billingAddress,
        customerInfo: {
          fullName: n11OrderData.buyer?.fullName,
          email: n11OrderData.buyer?.email,
          gsm: n11OrderData.buyer?.gsm,
          citizenshipId: n11OrderData.citizenshipId
        },
        invoiceInfo: n11OrderData.invoiceInfo,
        n11OrderDate: n11OrderData.createDate ? new Date(n11OrderData.createDate) : new Date(),
        lastSyncAt: new Date(),
        platformFees: n11OrderData.platformFees || n11OrderData.commission,
        cancellationReason: n11OrderData.cancellationReason,
        returnReason: n11OrderData.returnReason,
        platformOrderData: n11OrderData
      }, { transaction });
    } catch (error) {
      this.logger.error(`Failed to create N11Order record: ${error.message}`, { 
        error, 
        orderId,
        orderNumber: n11OrderData.orderNumber 
      });
      throw error;
    }
  }

  /**
   * Map N11 API status to N11Order model status enum
   * @param {string} apiStatus - Status from N11 API
   * @returns {string} N11Order model status
   */
  mapToN11ModelStatus(apiStatus) {
    const statusMap = {
      'Confirmed': 'Onaylandi',
      'UnConfirmed': 'Yeni',
      'Picking': 'Hazirlaniyor',
      'Shipped': 'Kargoya_Verildi',
      'Delivered': 'Teslim_Edildi',
      'Cancelled': 'Iptal_Edildi',
      'Rejected': 'Iptal_Edildi',
      'Returned': 'Iade_Edildi',
      'Completing': 'Hazirlaniyor'
    };
    
    return statusMap[apiStatus] || 'Yeni';
  }

  /**
   * Map payment type to N11Order model enum
   * @param {string} paymentType - Payment type from N11 API
   * @returns {string} N11Order model payment type
   */
  mapPaymentType(paymentType) {
    const paymentMap = {
      'CreditCard': 'Kredi_Karti',
      'BankTransfer': 'Havale_EFT',
      'CashOnDelivery': 'Kapida_Odeme',
      'N11Wallet': 'N11_Cuzdan'
    };
    
    return paymentMap[paymentType] || 'Kredi_Karti';
  }

  /**
   * Map payment status to N11Order model enum
   * @param {string} paymentStatus - Payment status from N11 API
   * @returns {string} N11Order model payment status
   */
  mapPaymentStatus(paymentStatus) {
    const statusMap = {
      'Pending': 'Bekliyor',
      'Confirmed': 'Onaylandi',
      'Cancelled': 'Iptal_Edildi'
    };
    
    return statusMap[paymentStatus] || 'Bekliyor';
  }

  /**
   * Test the connection to N11
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);
      
      if (!credentials.appKey || !credentials.appSecret) {
        return {
          success: false,
          message: 'Connection failed: App key or app secret is missing from credentials',
          error: 'Missing required parameters'
        };
      }

      this.logger.debug(`Testing N11 connection with appKey: ${credentials.appKey}`);
      
      try {
        // Test connection by fetching categories (lightweight operation)
        const response = await this.retryRequest(() => 
          this.axiosInstance.get(N11_API.ENDPOINTS.CATEGORIES)
        );
        
        if (response.data && response.data.result && response.data.result.status === 'success') {
          return {
            success: true,
            message: 'Connection successful',
            data: {
              platform: 'n11',
              connectionId: this.connectionId,
              status: 'active'
            }
          };
        } else {
          throw new Error(response.data?.result?.errorMessage || 'Connection test failed');
        }
      } catch (requestError) {
        this.logger.error('N11 API request failed', {
          error: requestError.message,
          status: requestError.response?.status,
          data: requestError.response?.data
        });
        
        let errorMessage = requestError.message;
        const errorData = requestError.response?.data;
        
        if (errorData && errorData.result && errorData.result.errorMessage) {
          errorMessage = errorData.result.errorMessage;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      this.logger.error(`N11 connection test failed: ${error.message}`, { error, connectionId: this.connectionId });
      
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Fetch orders from N11
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing order data
   */
  async fetchOrders(params = {}) {
    try {
      await this.initialize();
      
      // Default parameters for N11 order list API
      const defaultParams = {
        status: params.status || 'Confirmed',
        period: params.period || 'lastOrderDate',
        startDate: params.startDate || this.getDefaultStartDate(),
        endDate: params.endDate || this.getDefaultEndDate(),
        pagingData: {
          currentPage: params.page || 0,
          pageSize: params.size || 50
        }
      };
      
      const queryParams = { ...defaultParams, ...params };
      
      this.logger.debug(`Fetching N11 orders with params: ${JSON.stringify(queryParams)}`);
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.post(N11_API.ENDPOINTS.ORDERS, queryParams)
      );
      
      if (!response.data || !response.data.result || response.data.result.status !== 'success') {
        return {
          success: false,
          message: response.data?.result?.errorMessage || 'Failed to fetch orders from N11',
          data: []
        };
      }
      
      const orders = response.data.orderList || [];
      
      this.logger.info(`Retrieved ${orders.length} orders from N11`);
      
      const normalizeResult = await this.normalizeOrders(orders);
      
      return {
        success: true,
        message: `Successfully fetched ${normalizeResult.data.length} orders from N11`,
        data: normalizeResult.data,
        stats: normalizeResult.stats,
        pagination: response.data.pagingData ? {
          page: response.data.pagingData.currentPage || 0,
          size: response.data.pagingData.pageSize || queryParams.pagingData.pageSize,
          totalPages: Math.ceil((response.data.pagingData.totalCount || 0) / (response.data.pagingData.pageSize || 50)),
          totalElements: response.data.pagingData.totalCount || orders.length
        } : undefined
      };
    } catch (error) {
      this.logger.error(`Failed to fetch orders from N11: ${error.message}`, { 
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
   * Get orders from N11 - required implementation for BasePlatformService
   * @param {Object} options - Options for fetching orders
   * @returns {Promise<Array>} List of orders
   */
  async getOrders(options = {}) {
    try {
      const result = await this.fetchOrders(options);
      
      if (!result.success) {
        this.logger.error(`Failed to get orders from N11: ${result.message}`, {
          error: result.error,
          connectionId: this.connectionId,
          platformType: this.getPlatformType()
        });
        return [];
      }
      
      return Array.isArray(result.data) ? result.data : [];
    } catch (error) {
      this.logger.error(`Error in getOrders method for N11: ${error.message}`, {
        error,
        connectionId: this.connectionId,
        platformType: this.getPlatformType()
      });
      return [];
    }
  }

  /**
   * Normalize N11 orders to internal format
   * @param {Array} n11Orders - Orders from N11 API
   * @returns {Promise<Object>} Normalized orders with statistics
   */
  async normalizeOrders(n11Orders) {
    const normalizedOrders = [];
    let successCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    try {
      const { sequelize } = require('../../../../../models');
      const { Op } = require('sequelize');

      for (const order of n11Orders) {
        try {
          const phoneNumber = this.extractPhoneNumber(order);
          
          // Check if order already exists
          const existingOrder = await Order.findOne({
            where: {
              connectionId: this.connectionId,
              externalOrderId: order.id.toString()
            }
          });

          if (existingOrder) {
            // Update existing order
            try {
              await existingOrder.update({
                status: this.mapOrderStatus(order.status),
                rawData: JSON.stringify(order),
                lastSyncedAt: new Date()
              });
              
              updatedCount++;
              normalizedOrders.push(existingOrder);
              continue;
            } catch (updateError) {
              this.logger.error(`Failed to update existing order ${order.id}: ${updateError.message}`, {
                error: updateError,
                orderId: order.id,
                connectionId: this.connectionId
              });
              skippedCount++;
              continue;
            }
          }

          // Create new order
          const result = await sequelize.transaction(async (t) => {
            // Create shipping detail first
            const { ShippingDetail } = require('../../../../../models');
            const shippingDetail = await ShippingDetail.create({
              recipientName: order.recipient?.fullName || '',
              address1: order.billingAddress?.address || '',
              city: order.billingAddress?.city || '',
              state: order.billingAddress?.district || '',
              postalCode: order.billingAddress?.postalCode || '',
              country: 'Turkey',
              phone: phoneNumber || '',
              email: order.buyer?.email || ''
            }, { transaction: t });

            // Create the order record
            const normalizedOrder = await Order.create({
              externalOrderId: order.id.toString(),
              connectionId: this.connectionId,
              userId: this.connection.userId,
              customerName: order.buyer?.fullName || 'Unknown',
              customerEmail: order.buyer?.email || '',
              customerPhone: phoneNumber || '',
              orderDate: new Date(order.createDate),
              status: this.mapOrderStatus(order.status),
              totalAmount: parseFloat(order.totalAmount || 0),
              currency: 'TRY',
              shippingDetailId: shippingDetail.id,
              notes: order.note || '',
              paymentStatus: 'pending',
              rawData: JSON.stringify(order),
              lastSyncedAt: new Date()
            }, { transaction: t });

            // Create order items
            if (order.orderItemList && Array.isArray(order.orderItemList)) {
              for (const item of order.orderItemList) {
                await OrderItem.create({
                  orderId: normalizedOrder.id,
                  externalProductId: item.productId?.toString() || item.id?.toString(),
                  name: item.productName || item.title,
                  sku: item.productSellerCode || item.sellerStockCode,
                  quantity: parseInt(item.quantity || 1, 10),
                  unitPrice: parseFloat(item.price || 0),
                  totalPrice: parseFloat(item.totalAmount || item.price * item.quantity || 0),
                  discount: parseFloat(item.discount || 0),
                  options: item.attributes ? {
                    attributes: item.attributes
                  } : null,
                  metadata: {
                    platformData: item
                  }
                }, { transaction: t });
              }
            }

            // Create N11-specific order record
            await this.createN11OrderRecord(normalizedOrder.id, order, t);

            return normalizedOrder;
          });

          normalizedOrders.push(result);
          successCount++;

        } catch (error) {
          this.logger.error(`Failed to process order ${order.id}: ${error.message}`, {
            error,
            orderId: order.id,
            connectionId: this.connectionId
          });
          skippedCount++;
        }
      }

      return {
        success: true,
        message: `Successfully processed ${successCount} orders (${updatedCount} updated, ${skippedCount} skipped)`,
        data: normalizedOrders,
        stats: {
          total: n11Orders.length,
          success: successCount,
          updated: updatedCount,
          skipped: skippedCount
        }
      };
    } catch (error) {
      this.logger.error(`Failed to normalize orders: ${error.message}`, {
        error,
        connectionId: this.connectionId
      });
      throw error;
    }
  }

  /**
   * Create N11-specific order record
   * @param {string} orderId - The main Order record ID
   * @param {Object} n11OrderData - Raw order data from N11 API
   * @param {Object} transaction - Sequelize transaction object
   * @returns {Promise<Object>} Created N11Order record
   */
  async createN11OrderRecord(orderId, n11OrderData, transaction) {
    try {
      const { N11Order } = require('../../../../../models');

      return await N11Order.create({
        orderId: orderId,
        n11OrderId: n11OrderData.id?.toString(),
        orderNumber: n11OrderData.orderNumber,
        sellerId: n11OrderData.sellerId,
        buyerId: n11OrderData.buyer?.id?.toString(),
        orderStatus: this.mapToN11ModelStatus(n11OrderData.status),
        paymentType: this.mapPaymentType(n11OrderData.paymentType),
        paymentStatus: this.mapPaymentStatus(n11OrderData.paymentStatus),
        shippingCompany: n11OrderData.shippingCompany?.name,
        trackingNumber: n11OrderData.trackingNumber,
        trackingUrl: n11OrderData.trackingUrl,
        estimatedDeliveryDate: n11OrderData.estimatedDeliveryDate ? new Date(n11OrderData.estimatedDeliveryDate) : null,
        actualDeliveryDate: n11OrderData.actualDeliveryDate ? new Date(n11OrderData.actualDeliveryDate) : null,
        shippingAddress: n11OrderData.deliveryAddress || n11OrderData.shippingAddress,
        billingAddress: n11OrderData.billingAddress,
        customerInfo: {
          fullName: n11OrderData.buyer?.fullName,
          email: n11OrderData.buyer?.email,
          gsm: n11OrderData.buyer?.gsm,
          citizenshipId: n11OrderData.citizenshipId
        },
        invoiceInfo: n11OrderData.invoiceInfo,
        n11OrderDate: n11OrderData.createDate ? new Date(n11OrderData.createDate) : new Date(),
        lastSyncAt: new Date(),
        platformFees: n11OrderData.platformFees || n11OrderData.commission,
        cancellationReason: n11OrderData.cancellationReason,
        returnReason: n11OrderData.returnReason,
        platformOrderData: n11OrderData
      }, { transaction });
    } catch (error) {
      this.logger.error(`Failed to create N11Order record: ${error.message}`, { 
        error, 
        orderId,
        orderNumber: n11OrderData.orderNumber 
      });
      throw error;
    }
  }

  /**
   * Map N11 API status to N11Order model status enum
   * @param {string} apiStatus - Status from N11 API
   * @returns {string} N11Order model status
   */
  mapToN11ModelStatus(apiStatus) {
    const statusMap = {
      'Confirmed': 'Onaylandi',
      'UnConfirmed': 'Yeni',
      'Picking': 'Hazirlaniyor',
      'Shipped': 'Kargoya_Verildi',
      'Delivered': 'Teslim_Edildi',
      'Cancelled': 'Iptal_Edildi',
      'Rejected': 'Iptal_Edildi',
      'Returned': 'Iade_Edildi',
      'Completing': 'Hazirlaniyor'
    };
    
    return statusMap[apiStatus] || 'Yeni';
  }

  /**
   * Map payment type to N11Order model enum
   * @param {string} paymentType - Payment type from N11 API
   * @returns {string} N11Order model payment type
   */
  mapPaymentType(paymentType) {
    const paymentMap = {
      'CreditCard': 'Kredi_Karti',
      'BankTransfer': 'Havale_EFT',
      'CashOnDelivery': 'Kapida_Odeme',
      'N11Wallet': 'N11_Cuzdan'
    };
    
    return paymentMap[paymentType] || 'Kredi_Karti';
  }

  /**
   * Map payment status to N11Order model enum
   * @param {string} paymentStatus - Payment status from N11 API
   * @returns {string} N11Order model payment status
   */
  mapPaymentStatus(paymentStatus) {
    const statusMap = {
      'Pending': 'Bekliyor',
      'Confirmed': 'Onaylandi',
      'Cancelled': 'Iptal_Edildi'
    };
    
    return statusMap[paymentStatus] || 'Bekliyor';
  }

  /**
   * Test the connection to N11
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);
      
      if (!credentials.appKey || !credentials.appSecret) {
        return {
          success: false,
          message: 'Connection failed: App key or app secret is missing from credentials',
          error: 'Missing required parameters'
        };
      }

      this.logger.debug(`Testing N11 connection with appKey: ${credentials.appKey}`);
      
      try {
        // Test connection by fetching categories (lightweight operation)
        const response = await this.retryRequest(() => 
          this.axiosInstance.get(N11_API.ENDPOINTS.CATEGORIES)
        );
        
        if (response.data && response.data.result && response.data.result.status === 'success') {
          return {
            success: true,
            message: 'Connection successful',
            data: {
              platform: 'n11',
              connectionId: this.connectionId,
              status: 'active'
            }
          };
        } else {
          throw new Error(response.data?.result?.errorMessage || 'Connection test failed');
        }
      } catch (requestError) {
        this.logger.error('N11 API request failed', {
          error: requestError.message,
          status: requestError.response?.status,
          data: requestError.response?.data
        });
        
        let errorMessage = requestError.message;
        const errorData = requestError.response?.data;
        
        if (errorData && errorData.result && errorData.result.errorMessage) {
          errorMessage = errorData.result.errorMessage;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      this.logger.error(`N11 connection test failed: ${error.message}`, { error, connectionId: this.connectionId });
      
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Fetch orders from N11
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing order data
   */
  async fetchOrders(params = {}) {
    try {
      await this.initialize();
      
      // Default parameters for N11 order list API
      const defaultParams = {
        status: params.status || 'Confirmed',
        period: params.period || 'lastOrderDate',
        startDate: params.startDate || this.getDefaultStartDate(),
        endDate: params.endDate || this.getDefaultEndDate(),
        pagingData: {
          currentPage: params.page || 0,
          pageSize: params.size || 50
        }
      };
      
      const queryParams = { ...defaultParams, ...params };
      
      this.logger.debug(`Fetching N11 orders with params: ${JSON.stringify(queryParams)}`);
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.post(N11_API.ENDPOINTS.ORDERS, queryParams)
      );
      
      if (!response.data || !response.data.result || response.data.result.status !== 'success') {
        return {
          success: false,
          message: response.data?.result?.errorMessage || 'Failed to fetch orders from N11',
          data: []
        };
      }
      
      const orders = response.data.orderList || [];
      
      this.logger.info(`Retrieved ${orders.length} orders from N11`);
      
      const normalizeResult = await this.normalizeOrders(orders);
      
      return {
        success: true,
        message: `Successfully fetched ${normalizeResult.data.length} orders from N11`,
        data: normalizeResult.data,
        stats: normalizeResult.stats,
        pagination: response.data.pagingData ? {
          page: response.data.pagingData.currentPage || 0,
          size: response.data.pagingData.pageSize || queryParams.pagingData.pageSize,
          totalPages: Math.ceil((response.data.pagingData.totalCount || 0) / (response.data.pagingData.pageSize || 50)),
          totalElements: response.data.pagingData.totalCount || orders.length
        } : undefined
      };
    } catch (error) {
      this.logger.error(`Failed to fetch orders from N11: ${error.message}`, { 
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
   * Get orders from N11 - required implementation for BasePlatformService
   * @param {Object} options - Options for fetching orders
   * @returns {Promise<Array>} List of orders
   */
  async getOrders(options = {}) {
    try {
      const result = await this.fetchOrders(options);
      
      if (!result.success) {
        this.logger.error(`Failed to get orders from N11: ${result.message}`, {
          error: result.error,
          connectionId: this.connectionId,
          platformType: this.getPlatformType()
        });
        return [];
      }
      
      return Array.isArray(result.data) ? result.data : [];
    } catch (error) {
      this.logger.error(`Error in getOrders method for N11: ${error.message}`, {
        error,
        connectionId: this.connectionId,
        platformType: this.getPlatformType()
      });
      return [];
    }
  }

  /**
   * Normalize N11 orders to internal format
   * @param {Array} n11Orders - Orders from N11 API
   * @returns {Promise<Object>} Normalized orders with statistics
   */
  async normalizeOrders(n11Orders) {
    const normalizedOrders = [];
    let successCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    try {
      const { sequelize } = require('../../../../../models');
      const { Op } = require('sequelize');

      for (const order of n11Orders) {
        try {
          const phoneNumber = this.extractPhoneNumber(order);
          
          // Check if order already exists
          const existingOrder = await Order.findOne({
            where: {
              connectionId: this.connectionId,
              externalOrderId: order.id.toString()
            }
          });

          if (existingOrder) {
            // Update existing order
            try {
              await existingOrder.update({
                status: this.mapOrderStatus(order.status),
                rawData: JSON.stringify(order),
                lastSyncedAt: new Date()
              });
              
              updatedCount++;
              normalizedOrders.push(existingOrder);
              continue;
            } catch (updateError) {
              this.logger.error(`Failed to update existing order ${order.id}: ${updateError.message}`, {
                error: updateError,
                orderId: order.id,
                connectionId: this.connectionId
              });
              skippedCount++;
              continue;
            }
          }

          // Create new order
          const result = await sequelize.transaction(async (t) => {
            // Create shipping detail first
            const { ShippingDetail } = require('../../../../../models');
            const shippingDetail = await ShippingDetail.create({
              recipientName: order.recipient?.fullName || '',
              address1: order.billingAddress?.address || '',
              city: order.billingAddress?.city || '',
              state: order.billingAddress?.district || '',
              postalCode: order.billingAddress?.postalCode || '',
              country: 'Turkey',
              phone: phoneNumber || '',
              email: order.buyer?.email || ''
            }, { transaction: t });

            // Create the order record
            const normalizedOrder = await Order.create({
              externalOrderId: order.id.toString(),
              connectionId: this.connectionId,
              userId: this.connection.userId,
              customerName: order.buyer?.fullName || 'Unknown',
              customerEmail: order.buyer?.email || '',
              customerPhone: phoneNumber || '',
              orderDate: new Date(order.createDate),
              status: this.mapOrderStatus(order.status),
              totalAmount: parseFloat(order.totalAmount || 0),
              currency: 'TRY',
              shippingDetailId: shippingDetail.id,
              notes: order.note || '',
              paymentStatus: 'pending',
              rawData: JSON.stringify(order),
              lastSyncedAt: new Date()
            }, { transaction: t });

            // Create order items
            if (order.orderItemList && Array.isArray(order.orderItemList)) {
              for (const item of order.orderItemList) {
                await OrderItem.create({
                  orderId: normalizedOrder.id,
                  externalProductId: item.productId?.toString() || item.id?.toString(),
                  name: item.productName || item.title,
                  sku: item.productSellerCode || item.sellerStockCode,
                  quantity: parseInt(item.quantity || 1, 10),
                  unitPrice: parseFloat(item.price || 0),
                  totalPrice: parseFloat(item.totalAmount || item.price * item.quantity || 0),
                  discount: parseFloat(item.discount || 0),
                  options: item.attributes ? {
                    attributes: item.attributes
                  } : null,
                  metadata: {
                    platformData: item
                  }
                }, { transaction: t });
              }
            }

            // Create N11-specific order record
            await this.createN11OrderRecord(normalizedOrder.id, order, t);

            return normalizedOrder;
          });

          normalizedOrders.push(result);
          successCount++;

        } catch (error) {
          this.logger.error(`Failed to process order ${order.id}: ${error.message}`, {
            error,
            orderId: order.id,
            connectionId: this.connectionId
          });
          skippedCount++;
        }
      }

      return {
        success: true,
        message: `Successfully processed ${successCount} orders (${updatedCount} updated, ${skippedCount} skipped)`,
        data: normalizedOrders,
        stats: {
          total: n11Orders.length,
          success: successCount,
          updated: updatedCount,
          skipped: skippedCount
        }
      };
    } catch (error) {
      this.logger.error(`Failed to normalize orders: ${error.message}`, {
        error,
        connectionId: this.connectionId
      });
      throw error;
    }
  }

  /**
   * Create N11-specific order record
   * @param {string} orderId - The main Order record ID
   * @param {Object} n11OrderData - Raw order data from N11 API
   * @param {Object} transaction - Sequelize transaction object
   * @returns {Promise<Object>} Created N11Order record
   */
  async createN11OrderRecord(orderId, n11OrderData, transaction) {
    try {
      const { N11Order } = require('../../../../../models');

      return await N11Order.create({
        orderId: orderId,
        n11OrderId: n11OrderData.id?.toString(),
        orderNumber: n11OrderData.orderNumber,
        sellerId: n11OrderData.sellerId,
        buyerId: n11OrderData.buyer?.id?.toString(),
        orderStatus: this.mapToN11ModelStatus(n11OrderData.status),
        paymentType: this.mapPaymentType(n11OrderData.paymentType),
        paymentStatus: this.mapPaymentStatus(n11OrderData.paymentStatus),
        shippingCompany: n11OrderData.shippingCompany?.name,
        trackingNumber: n11OrderData.trackingNumber,
        trackingUrl: n11OrderData.trackingUrl,
        estimatedDeliveryDate: n11OrderData.estimatedDeliveryDate ? new Date(n11OrderData.estimatedDeliveryDate) : null,
        actualDeliveryDate: n11OrderData.actualDeliveryDate ? new Date(n11OrderData.actualDeliveryDate) : null,
        shippingAddress: n11OrderData.deliveryAddress || n11OrderData.shippingAddress,
        billingAddress: n11OrderData.billingAddress,
        customerInfo: {
          fullName: n11OrderData.buyer?.fullName,
          email: n11OrderData.buyer?.email,
          gsm: n11OrderData.buyer?.gsm,
          citizenshipId: n11OrderData.citizenshipId
        },
        invoiceInfo: n11OrderData.invoiceInfo,
        n11OrderDate: n11OrderData.createDate ? new Date(n11OrderData.createDate) : new Date(),
        lastSyncAt: new Date(),
        platformFees: n11OrderData.platformFees || n11OrderData.commission,
        cancellationReason: n11OrderData.cancellationReason,
        returnReason: n11OrderData.returnReason,
        platformOrderData: n11OrderData
      }, { transaction });
    } catch (error) {
      this.logger.error(`Failed to create N11Order record: ${error.message}`, { 
        error, 
        orderId,
        orderNumber: n11OrderData.orderNumber 
      });
      throw error;
    }
  }

  /**
   * Map N11 API status to N11Order model status enum
   * @param {string} apiStatus - Status from N11 API
   * @returns {string} N11Order model status
   */
  mapToN11ModelStatus(apiStatus) {
    const statusMap = {
      'Confirmed': 'Onaylandi',
      'UnConfirmed': 'Yeni',
      'Picking': 'Hazirlaniyor',
      'Shipped': 'Kargoya_Verildi',
      'Delivered': 'Teslim_Edildi',
      'Cancelled': 'Iptal_Edildi',
      'Rejected': 'Iptal_Edildi',
      'Returned': 'Iade_Edildi',
      'Completing': 'Hazirlaniyor'
    };
    
    return statusMap[apiStatus] || 'Yeni';
  }

  /**
   * Map payment type to N11Order model enum
   * @param {string} paymentType - Payment type from N11 API
   * @returns {string} N11Order model payment type
   */
  mapPaymentType(paymentType) {
    const paymentMap = {
      'CreditCard': 'Kredi_Karti',
      'BankTransfer': 'Havale_EFT',
      'CashOnDelivery': 'Kapida_Odeme',
      'N11Wallet': 'N11_Cuzdan'
    };
    
    return paymentMap[paymentType] || 'Kredi_Karti';
  }

  /**
   * Map payment status to N11Order model enum
   * @param {string} paymentStatus - Payment status from N11 API
   * @returns {string} N11Order model payment status
   */
  mapPaymentStatus(paymentStatus) {
    const statusMap = {
      'Pending': 'Bekliyor',
      'Confirmed': 'Onaylandi',
      'Cancelled': 'Iptal_Edildi'
    };
    
    return statusMap[paymentStatus] || 'Bekliyor';
  }

  /**
   * Test the connection to N11
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);
      
      if (!credentials.appKey || !credentials.appSecret) {
        return {
          success: false,
          message: 'Connection failed: App key or app secret is missing from credentials',
          error: 'Missing required parameters'
        };
      }

      this.logger.debug(`Testing N11 connection with appKey: ${credentials.appKey}`);
      
      try {
        // Test connection by fetching categories (lightweight operation)
        const response = await this.retryRequest(() => 
          this.axiosInstance.get(N11_API.ENDPOINTS.CATEGORIES)
        );
        
        if (response.data && response.data.result && response.data.result.status === 'success') {
          return {
            success: true,
            message: 'Connection successful',
            data: {
              platform: 'n11',
              connectionId: this.connectionId,
              status: 'active'
            }
          };
        } else {
          throw new Error(response.data?.result?.errorMessage || 'Connection test failed');
        }
      } catch (requestError) {
        this.logger.error('N11 API request failed', {
          error: requestError.message,
          status: requestError.response?.status,
          data: requestError.response?.data
        });
        
        let errorMessage = requestError.message;
        const errorData = requestError.response?.data;
        
        if (errorData && errorData.result && errorData.result.errorMessage) {
          errorMessage = errorData.result.errorMessage;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      this.logger.error(`N11 connection test failed: ${error.message}`, { error, connectionId: this.connectionId });
      
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Fetch orders from N11
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing order data
   */
  async fetchOrders(params = {}) {
    try {
      await this.initialize();
      
      // Default parameters for N11 order list API
      const defaultParams = {
        status: params.status || 'Confirmed',
        period: params.period || 'lastOrderDate',
        startDate: params.startDate || this.getDefaultStartDate(),
        endDate: params.endDate || this.getDefaultEndDate(),
        pagingData: {
          currentPage: params.page || 0,
          pageSize: params.size || 50
        }
      };
      
      const queryParams = { ...defaultParams, ...params };
      
      this.logger.debug(`Fetching N11 orders with params: ${JSON.stringify(queryParams)}`);
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.post(N11_API.ENDPOINTS.ORDERS, queryParams)
      );
      
      if (!response.data || !response.data.result || response.data.result.status !== 'success') {
        return {
          success: false,
          message: response.data?.result?.errorMessage || 'Failed to fetch orders from N11',
          data: []
        };
      }
      
      const orders = response.data.orderList || [];
      
      this.logger.info(`Retrieved ${orders.length} orders from N11`);
      
      const normalizeResult = await this.normalizeOrders(orders);
      
      return {
        success: true,
        message: `Successfully fetched ${normalizeResult.data.length} orders from N11`,
        data: normalizeResult.data,
        stats: normalizeResult.stats,
        pagination: response.data.pagingData ? {
          page: response.data.pagingData.currentPage || 0,
          size: response.data.pagingData.pageSize || queryParams.pagingData.pageSize,
          totalPages: Math.ceil((response.data.pagingData.totalCount || 0) / (response.data.pagingData.pageSize || 50)),
          totalElements: response.data.pagingData.totalCount || orders.length
        } : undefined
      };
    } catch (error) {
      this.logger.error(`Failed to fetch orders from N11: ${error.message}`, { 
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
   * Get orders from N11 - required implementation for BasePlatformService
   * @param {Object} options - Options for fetching orders
   * @returns {Promise<Array>} List of orders
   */
  async getOrders(options = {}) {
    try {
      const result = await this.fetchOrders(options);
      
      if (!result.success) {
        this.logger.error(`Failed to get orders from N11: ${result.message}`, {
          error: result.error,
          connectionId: this.connectionId,
          platformType: this.getPlatformType()
        });
        return [];
      }
      
      return Array.isArray(result.data) ? result.data : [];
    } catch (error) {
      this.logger.error(`Error in getOrders method for N11: ${error.message}`, {
        error,
        connectionId: this.connectionId,
        platformType: this.getPlatformType()
      });
      return [];
    }
  }

  /**
   * Normalize N11 orders to internal format
   * @param {Array} n11Orders - Orders from N11 API
   * @returns {Promise<Object>} Normalized orders with statistics
   */
  async normalizeOrders(n11Orders) {
    const normalizedOrders = [];
    let successCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    try {
      const { sequelize } = require('../../../../../models');
      const { Op } = require('sequelize');

      for (const order of n11Orders) {
        try {
          const phoneNumber = this.extractPhoneNumber(order);
          
          // Check if order already exists
          const existingOrder = await Order.findOne({
            where: {
              connectionId: this.connectionId,
              externalOrderId: order.id.toString()
            }
          });

          if (existingOrder) {
            // Update existing order
            try {
              await existingOrder.update({
                status: this.mapOrderStatus(order.status),
                rawData: JSON.stringify(order),
                lastSyncedAt: new Date()
              });
              
              updatedCount++;
              normalizedOrders.push(existingOrder);
              continue;
            } catch (updateError) {
              this.logger.error(`Failed to update existing order ${order.id}: ${updateError.message}`, {
                error: updateError,
                orderId: order.id,
                connectionId: this.connectionId
              });
              skippedCount++;
              continue;
            }
          }

          // Create new order
          const result = await sequelize.transaction(async (t) => {
            // Create shipping detail first
            const { ShippingDetail } = require('../../../../../models');
            const shippingDetail = await ShippingDetail.create({
              recipientName: order.recipient?.fullName || '',
              address1: order.billingAddress?.address || '',
              city: order.billingAddress?.city || '',
              state: order.billingAddress?.district || '',
              postalCode: order.billingAddress?.postalCode || '',
              country: 'Turkey',
              phone: phoneNumber || '',
              email: order.buyer?.email || ''
            }, { transaction: t });

            // Create the order record
            const normalizedOrder = await Order.create({
              externalOrderId: order.id.toString(),
              connectionId: this.connectionId,
              userId: this.connection.userId,
              customerName: order.buyer?.fullName || 'Unknown',
              customerEmail: order.buyer?.email || '',
              customerPhone: phoneNumber || '',
              orderDate: new Date(order.createDate),
              status: this.mapOrderStatus(order.status),
              totalAmount: parseFloat(order.totalAmount || 0),
              currency: 'TRY',
              shippingDetailId: shippingDetail.id,
              notes: order.note || '',
              paymentStatus: 'pending',
              rawData: JSON.stringify(order),
              lastSyncedAt: new Date()
            }, { transaction: t });

            // Create order items
            if (order.orderItemList && Array.isArray(order.orderItemList)) {
              for (const item of order.orderItemList) {
                await OrderItem.create({
                  orderId: normalizedOrder.id,
                  externalProductId: item.productId?.toString() || item.id?.toString(),
                  name: item.productName || item.title,
                  sku: item.productSellerCode || item.sellerStockCode,
                  quantity: parseInt(item.quantity || 1, 10),
                  unitPrice: parseFloat(item.price || 0),
                  totalPrice: parseFloat(item.totalAmount || item.price * item.quantity || 0),
                  discount: parseFloat(item.discount || 0),
                  options: item.attributes ? {
                    attributes: item.attributes
                  } : null,
                  metadata: {
                    platformData: item
                  }
                }, { transaction: t });
              }
            }

            // Create N11-specific order record
            await this.createN11OrderRecord(normalizedOrder.id, order, t);

            return normalizedOrder;
          });

          normalizedOrders.push(result);
          successCount++;

        } catch (error) {
          this.logger.error(`Failed to process order ${order.id}: ${error.message}`, {
            error,
            orderId: order.id,
            connectionId: this.connectionId
          });
          skippedCount++;
        }
      }

      return {
        success: true,
        message: `Successfully processed ${successCount} orders (${updatedCount} updated, ${skippedCount} skipped)`,
        data: normalizedOrders,
        stats: {
          total: n11Orders.length,
          success: successCount,
          updated: updatedCount,
          skipped: skippedCount
        }
      };
    } catch (error) {
      this.logger.error(`Failed to normalize orders: ${error.message}`, {
        error,
        connectionId: this.connectionId
      });
      throw error;
    }
  }

  /**
   * Create N11-specific order record
   * @param {string} orderId - The main Order record ID
   * @param {Object} n11OrderData - Raw order data from N11 API
   * @param {Object} transaction - Sequelize transaction object
   * @returns {Promise<Object>} Created N11Order record
   */
  async createN11OrderRecord(orderId, n11OrderData, transaction) {
    try {
      const { N11Order } = require('../../../../../models');

      return await N11Order.create({
        orderId: orderId,
        n11OrderId: n11OrderData.id?.toString(),
        orderNumber: n11OrderData.orderNumber,
        sellerId: n11OrderData.sellerId,
        buyerId: n11OrderData.buyer?.id?.toString(),
        orderStatus: this.mapToN11ModelStatus(n11OrderData.status),
        paymentType: this.mapPaymentType(n11OrderData.paymentType),
        paymentStatus: this.mapPaymentStatus(n11OrderData.paymentStatus),
        shippingCompany: n11OrderData.shippingCompany?.name,
        trackingNumber: n11OrderData.trackingNumber,
        trackingUrl: n11OrderData.trackingUrl,
        estimatedDeliveryDate: n11OrderData.estimatedDeliveryDate ? new Date(n11OrderData.estimatedDeliveryDate) : null,
        actualDeliveryDate: n11OrderData.actualDeliveryDate ? new Date(n11OrderData.actualDeliveryDate) : null,
        shippingAddress: n11OrderData.deliveryAddress || n11OrderData.shippingAddress,
        billingAddress: n11OrderData.billingAddress,
        customerInfo: {
          fullName: n11OrderData.buyer?.fullName,
          email: n11OrderData.buyer?.email,
          gsm: n11OrderData.buyer?.gsm,
          citizenshipId: n11OrderData.citizenshipId
        },
        invoiceInfo: n11OrderData.invoiceInfo,
        n11OrderDate: n11OrderData.createDate ? new Date(n11OrderData.createDate) : new Date(),
        lastSyncAt: new Date(),
        platformFees: n11OrderData.platformFees || n11OrderData.commission,
        cancellationReason: n11OrderData.cancellationReason,
        returnReason: n11OrderData.returnReason,
        platformOrderData: n11OrderData
      }, { transaction });
    } catch (error) {
      this.logger.error(`Failed to create N11Order record: ${error.message}`, { 
        error, 
        orderId,
        orderNumber: n11OrderData.orderNumber 
      });
      throw error;
    }
  }

  /**
   * Map N11 API status to N11Order model status enum
   * @param {string} apiStatus - Status from N11 API
   * @returns {string} N11Order model status
   */
  mapToN11ModelStatus(apiStatus) {
    const statusMap = {
      'Confirmed': 'Onaylandi',
      'UnConfirmed': 'Yeni',
      'Picking': 'Hazirlaniyor',
      'Shipped': 'Kargoya_Verildi',
      'Delivered': 'Teslim_Edildi',
      'Cancelled': 'Iptal_Edildi',
      'Rejected': 'Iptal_Edildi',
      'Returned': 'Iade_Edildi',
      'Completing': 'Hazirlaniyor'
    };
    
    return statusMap[apiStatus] || 'Yeni';
  }

  /**
   * Map payment type to N11Order model enum
   * @param {string} paymentType - Payment type from N11 API
   * @returns {string} N11Order model payment type
   */
  mapPaymentType(paymentType) {
    const paymentMap = {
      'CreditCard': 'Kredi_Karti',
      'BankTransfer': 'Havale_EFT',
      'CashOnDelivery': 'Kapida_Odeme',
      'N11Wallet': 'N11_Cuzdan'
    };
    
    return paymentMap[paymentType] || 'Kredi_Karti';
  }

  /**
   * Map payment status to N11Order model enum
   * @param {string} paymentStatus - Payment status from N11 API
   * @returns {string} N11Order model payment status
   */
  mapPaymentStatus(paymentStatus) {
    const statusMap = {
      'Pending': 'Bekliyor',
      'Confirmed': 'Onaylandi',
      'Cancelled': 'Iptal_Edildi'
    };
    
    return statusMap[paymentStatus] || 'Bekliyor';
  }

  /**
   * Update order status in N11
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   * @param {Array} lineIds - Order line IDs to update
   * @returns {Promise<Object>} Update result
   */
  async updateOrderStatus(orderId, status, lineIds) {
    try {
      if (!this.axiosInstance) {
        await this.setupAxiosInstance();
      }

      const order = await Order.findByPk(orderId, {
        include: [{ model: OrderItem }]
      });

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Map internal status to N11 status
      const n11Status = this.mapToPlatformStatus(status);
      
      // Each status has its own endpoint and data structure in N11 API
      let endpoint;
      let requestData;

      switch (status) {
        case 'processing':
          endpoint = '/order/v1/accept';
          requestData = {
            orderNumber: order.externalOrderId,
            lines: lineIds || order.OrderItems.map(item => ({ lineId: item.externalLineId }))
          };
          break;

        case 'shipped':
          if (!order.trackingNumber) {
            throw new Error('Tracking number is required for shipping status update');
          }
          endpoint = '/order/v1/ship';
          requestData = {
            orderNumber: order.externalOrderId,
            lines: lineIds || order.OrderItems.map(item => ({ lineId: item.externalLineId })),
            shipmentInfo: {
              trackingNumber: order.trackingNumber,
              trackingUrl: order.trackingUrl || '',
              shipmentCompany: order.carrierName || 'Other'
            }
          };
          break;

        case 'cancelled':
          endpoint = '/order/v1/reject';
          requestData = {
            orderNumber: order.externalOrderId,
            lines: lineIds || order.OrderItems.map(item => ({ lineId: item.externalLineId })),
            rejectReason: order.cancellationReason || 'MerchantCancel',
            rejectDescription: order.cancellationNotes || ''
          };
          break;

        case 'delivered':
          endpoint = '/order/v1/delivery';
          requestData = {
            orderNumber: order.externalOrderId,
            lines: lineIds || order.OrderItems.map(item => ({ lineId: item.externalLineId })),
            deliveryInfo: {
              deliveryDate: new Date().toISOString()
            }
          };
          break;

        case 'return_approved':
          endpoint = '/order/v1/return/approve';
          requestData = {
            orderNumber: order.externalOrderId,
            lines: lineIds || order.OrderItems.map(item => ({ lineId: item.externalLineId }))
          };
          break;

        case 'return_rejected':
          endpoint = '/order/v1/return/reject';
          requestData = {
            orderNumber: order.externalOrderId,
            lines: lineIds || order.OrderItems.map(item => ({ lineId: item.externalLineId })),
            rejectReason: order.returnRejectionReason || 'Other'
          };
          break;

        default:
          throw new Error(`Status update to '${status}' is not supported by N11 API`);
      }

      // Make the API request
      const response = await this.axiosInstance.post(endpoint, requestData);

      // Check response and handle results
      if (response.data && response.data.result === 'success') {
        // Update local order status with transaction
        await sequelize.transaction(async (t) => {
          await order.update({
            status,
            lastSyncedAt: new Date()
          }, { transaction: t });

          // Update additional fields based on status
          if (status === 'delivered') {
            await order.update({
              deliveryDate: new Date()
            }, { transaction: t });
          } else if (status === 'cancelled') {
            await order.update({
              cancellationDate: new Date()
            }, { transaction: t });
          }
        });

        return {
          success: true,
          message: `Successfully updated order status to ${status}`,
          data: order
        };
      } else {
        throw new Error(response.data?.message || 'Failed to update status on N11');
      }
    } catch (error) {
      logger.error(`Failed to update order status in N11: ${error.message}`, {
        error,
        orderId,
        status
      });
      
      throw error;
    }
  }

  /**
   * Update order items using N11 UpdateOrder service
   * @param {string} orderId - Order ID
   * @param {Array} orderItems - Updated order items
   * @returns {Promise<Object>} Update result
   */
  async updateOrderItems(orderId, orderItems) {
    try {
      await this.initialize();
      
      const updateData = {
        orderNumber: orderId,
        orderItemList: orderItems.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          dueAmount: item.dueAmount
        }))
      };

      const response = await this.retryRequest(() => 
        this.axiosInstance.post(N11_API.ENDPOINTS.UPDATE_ORDER, updateData)
      );

      if (response.data && response.data.result && response.data.result.status === 'success') {
        return {
          success: true,
          message: 'Order items updated successfully',
          data: response.data
        };
      } else {
        throw new Error(response.data?.result?.errorMessage || 'Failed to update order items');
      }
    } catch (error) {
      this.logger.error(`Failed to update order items: ${error.message}`, {
        error,
        orderId,
        connectionId: this.connectionId
      });
      
      return {
        success: false,
        message: `Failed to update order items: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Split or combine packages using N11 splitCombinePackage service
   * @param {string} orderId - Order ID
   * @param {Object} packageData - Package split/combine data
   * @returns {Promise<Object>} Operation result
   */
  async splitCombinePackage(orderId, packageData) {
    try {
      await this.initialize();
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.post(N11_API.ENDPOINTS.SPLIT_PACKAGE, {
          orderNumber: orderId,
          ...packageData
        })
      );

      if (response.data && response.data.result && response.data.result.status === 'success') {
        return {
          success: true,
          message: 'Package operation completed successfully',
          data: response.data
        };
      } else {
        throw new Error(response.data?.result?.errorMessage || 'Failed to split/combine package');
      }
    } catch (error) {
      this.logger.error(`Failed to split/combine package: ${error.message}`, {
        error,
        orderId,
        connectionId: this.connectionId
      });
      
      return {
        success: false,
        message: `Failed to split/combine package: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Send labor cost to order items using N11 LaborCost service
   * @param {string} orderId - Order ID
   * @param {Array} laborCosts - Labor cost data for order items
   * @returns {Promise<Object>} Operation result
   */
  async sendLaborCost(orderId, laborCosts) {
    try {
      await this.initialize();
      
      const laborData = {
        orderNumber: orderId,
        orderItemList: laborCosts.map(cost => ({
          id: cost.itemId,
          laborCost: cost.laborCost
        }))
      };

      const response = await this.retryRequest(() => 
        this.axiosInstance.post(N11_API.ENDPOINTS.LABOR_COST, laborData)
      );

      if (response.data && response.data.result && response.data.result.status === 'success') {
        return {
          success: true,
          message: 'Labor costs sent successfully',
          data: response.data
        };
      } else {
        throw new Error(response.data?.result?.errorMessage || 'Failed to send labor costs');
      }
    } catch (error) {
      this.logger.error(`Failed to send labor costs: ${error.message}`, {
        error,
        orderId,
        connectionId: this.connectionId
      });
      
      return {
        success: false,
        message: `Failed to send labor costs: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Get categories using N11 GetCategories service
   * @returns {Promise<Object>} Categories data
   */
  async getCategories() {
    try {
      await this.initialize();
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(N11_API.ENDPOINTS.CATEGORIES)
      );

      if (response.data && response.data.result && response.data.result.status === 'success') {
        return {
          success: true,
          message: 'Categories fetched successfully',
          data: response.data.categoryList || []
        };
      } else {
        throw new Error(response.data?.result?.errorMessage || 'Failed to fetch categories');
      }
    } catch (error) {
      this.logger.error(`Failed to fetch categories: ${error.message}`, {
        error,
        connectionId: this.connectionId
      });
      
      return {
        success: false,
        message: `Failed to fetch categories: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }

  /**
   * Get category attributes using N11 GetCategoryAttributesList service
   * @param {string} categoryId - Category ID
   * @returns {Promise<Object>} Category attributes data
   */
  async getCategoryAttributes(categoryId) {
    try {
      await this.initialize();
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.post(N11_API.ENDPOINTS.CATEGORY_ATTRIBUTES, {
          categoryId: categoryId
        })
      );

      if (response.data && response.data.result && response.data.result.status === 'success') {
        return {
          success: true,
          message: 'Category attributes fetched successfully',
          data: response.data.categoryAttributeList || []
        };
      } else {
        throw new Error(response.data?.result?.errorMessage || 'Failed to fetch category attributes');
      }
    } catch (error) {
      this.logger.error(`Failed to fetch category attributes: ${error.message}`, {
        error,
        categoryId,
        connectionId: this.connectionId
      });
      
      return {
        success: false,
        message: `Failed to fetch category attributes: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }

  /**
   * Query seller products using N11 GetProductQuery service
   * @param {Object} queryParams - Product query parameters
   * @returns {Promise<Object>} Products data
   */
  async getProductQuery(queryParams = {}) {
    try {
      await this.initialize();
      
      const defaultParams = {
        pagingData: {
          currentPage: queryParams.page || 0,
          pageSize: queryParams.size || 50
        }
      };
      
      const requestData = { ...defaultParams, ...queryParams };

      const response = await this.retryRequest(() => 
        this.axiosInstance.post(N11_API.ENDPOINTS.PRODUCT_QUERY, requestData)
      );

      if (response.data && response.data.result && response.data.result.status === 'success') {
        return {
          success: true,
          message: 'Products fetched successfully',
          data: response.data.productList || [],
          pagination: response.data.pagingData
        };
      } else {
        throw new Error(response.data?.result?.errorMessage || 'Failed to fetch products');
      }
    } catch (error) {
      this.logger.error(`Failed to fetch products: ${error.message}`, {
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
   * Search catalog using N11 CatalogService
   * @param {Object} searchParams - Catalog search parameters
   * @returns {Promise<Object>} Catalog search results
   */
  async searchCatalog(searchParams = {}) {
    try {
      await this.initialize();
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.post(N11_API.ENDPOINTS.CATALOG_SEARCH, searchParams)
      );

      if (response.data && response.data.result && response.data.result.status === 'success') {
        return {
          success: true,
          message: 'Catalog search completed successfully',
          data: response.data.productList || []
        };
      } else {
        throw new Error(response.data?.result?.errorMessage || 'Failed to search catalog');
      }
    } catch (error) {
      this.logger.error(`Failed to search catalog: ${error.message}`, {
        error,
        connectionId: this.connectionId
      });
      
      return {
        success: false,
        message: `Failed to search catalog: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }

  /**
   * Get return requests using N11 ReturnService
   * @param {Object} params - Return request parameters
   * @returns {Promise<Object>} Return requests data
   */
  async getReturnRequests(params = {}) {
    try {
      await this.initialize();
      
      const defaultParams = {
        period: params.period || 'lastOrderDate',
        startDate: params.startDate || this.getDefaultStartDate(),
        endDate: params.endDate || this.getDefaultEndDate(),
        pagingData: {
          currentPage: params.page || 0,
          pageSize: params.size || 50
        }
      };
      
      const queryParams = { ...defaultParams, ...params };

      const response = await this.retryRequest(() => 
        this.axiosInstance.post(N11_API.ENDPOINTS.RETURNS, queryParams)
      );

      if (response.data && response.data.result && response.data.result.status === 'success') {
        return {
          success: true,
          message: 'Return requests fetched successfully',
          data: response.data.returnList || [],
          pagination: response.data.pagingData
        };
      } else {
        throw new Error(response.data?.result?.errorMessage || 'Failed to fetch return requests');
      }
    } catch (error) {
      this.logger.error(`Failed to fetch return requests: ${error.message}`, {
        error,
        connectionId: this.connectionId
      });
      
      return {
        success: false,
        message: `Failed to fetch return requests: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }

  /**
   * Approve return request using N11 ReturnService
   * @param {string} returnId - Return request ID
   * @returns {Promise<Object>} Operation result
   */
  async approveReturn(returnId) {
    try {
      await this.initialize();
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.post(N11_API.ENDPOINTS.RETURN_APPROVE, {
          returnId: returnId
        })
      );

      if (response.data && response.data.result && response.data.result.status === 'success') {
        return {
          success: true,
          message: 'Return request approved successfully',
          data: response.data
        };
      } else {
        throw new Error(response.data?.result?.errorMessage || 'Failed to approve return request');
      }
    } catch (error) {
      this.logger.error(`Failed to approve return request: ${error.message}`, {
        error,
        returnId,
        connectionId: this.connectionId
      });
      
      return {
        success: false,
        message: `Failed to approve return request: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Reject return request using N11 ReturnService
   * @param {string} returnId - Return request ID
   * @param {string} rejectReason - Rejection reason
   * @returns {Promise<Object>} Operation result
   */
  async rejectReturn(returnId, rejectReason) {
    try {
      await this.initialize();
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.post(N11_API.ENDPOINTS.RETURN_REJECT, {
          returnId: returnId,
          rejectReason: rejectReason
        })
      );

      if (response.data && response.data.result && response.data.result.status === 'success') {
        return {
          success: true,
          message: 'Return request rejected successfully',
          data: response.data
        };
      } else {
        throw new Error(response.data?.result?.errorMessage || 'Failed to reject return request');
      }
    } catch (error) {
      this.logger.error(`Failed to reject return request: ${error.message}`, {
        error,
        returnId,
        connectionId: this.connectionId
      });
      
      return {
        success: false,
        message: `Failed to reject return request: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Update online delivery order using N11 Online Delivery Update service
   * @param {string} orderId - Order ID
   * @param {Object} deliveryData - Delivery update data
   * @returns {Promise<Object>} Update result
   */
  async updateOnlineDelivery(orderId, deliveryData) {
    try {
      await this.initialize();
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.post(N11_API.ENDPOINTS.ONLINE_DELIVERY_UPDATE, {
          orderNumber: orderId,
          ...deliveryData
        })
      );

      if (response.data && response.data.result && response.data.result.status === 'success') {
        return {
          success: true,
          message: 'Online delivery updated successfully',
          data: response.data
        };
      } else {
        throw new Error(response.data?.result?.errorMessage || 'Failed to update online delivery');
      }
    } catch (error) {
      this.logger.error(`Failed to update online delivery: ${error.message}`, {
        error,
        orderId,
        connectionId: this.connectionId
      });
      
      return {
        success: false,
        message: `Failed to update online delivery: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Get default start date (7 days ago)
   * @returns {string} ISO date string
   */
  getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get default end date (today)
   * @returns {string} ISO date string
   */
  getDefaultEndDate() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Update order status on N11 platform
   * @param {string} orderId - Internal order ID
   * @param {string} newStatus - New status to set
   * @returns {Object} - Result of the status update operation
   */
  async updateOrderStatus(orderId, newStatus) {
    try {
      await this.initialize();
      
      const order = await Order.findByPk(orderId);
      
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      
      const n11Status = this.mapToPlatformStatus(newStatus);
      let endpoint;
      let requestData;

      // Map status to appropriate N11 API endpoint
      switch (newStatus) {
        case 'processing':
          endpoint = N11_API.ENDPOINTS.ACCEPT_ORDER;
          requestData = {
            orderNumber: order.externalOrderId
          };
          break;

        case 'shipped':
          endpoint = N11_API.ENDPOINTS.SHIP_ORDER;
          requestData = {
            orderNumber: order.externalOrderId,
            trackingNumber: order.trackingNumber || '',
            shipmentCompany: order.carrierName || 'Other'
          };
          break;

        case 'cancelled':
          endpoint = N11_API.ENDPOINTS.REJECT_ORDER;
          requestData = {
            orderNumber: order.externalOrderId,
            rejectReason: order.cancellationReason || 'MerchantCancel'
          };
          break;

        case 'delivered':
          endpoint = N11_API.ENDPOINTS.DELIVER_ORDER;
          requestData = {
            orderNumber: order.externalOrderId
          };
          break;

        default:
          throw new Error(`Status update to '${newStatus}' is not supported by N11 API`);
      }

      const response = await this.retryRequest(() => 
        this.axiosInstance.post(endpoint, requestData)
      );

      if (response.data && response.data.result && response.data.result.status === 'success') {
        // Update local order status
        await order.update({
          status: newStatus,
          lastSyncedAt: new Date()
        });
        
        return {
          success: true,
          message: `Order status updated to ${newStatus}`,
          data: order
        };
      } else {
        throw new Error(response.data?.result?.errorMessage || 'Failed to update status on N11');
      }
    } catch (error) {
      this.logger.error(`Failed to update order status on N11: ${error.message}`, { 
        error, 
        orderId, 
        connectionId: this.connectionId 
      });
      
      return {
        success: false,
        message: `Failed to update order status: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = N11Service;