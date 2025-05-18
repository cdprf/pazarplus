// src/services/platforms/trendyol/trendyol-service.js

const axios = require('axios');
const crypto = require('crypto');
// Fix model imports to use the centralized models index file
const { Order, OrderItem, ShippingDetail, PlatformConnection } = require('../../../models');
const logger = require('../../../utils/logger');

class TrendyolService {
  constructor(connectionId, directCredentials = null) {
    this.connectionId = connectionId;
    this.directCredentials = directCredentials;
    this.connection = null;
    this.apiUrl = 'https://api.trendyol.com/sapigw';
    this.axiosInstance = null;
  }

  async initialize() {
    try {
      // If we're testing with direct credentials (no connection ID)
      if (this.directCredentials) {
        // Skip finding the connection in the database
        this.connection = { credentials: JSON.stringify(this.directCredentials) };
      } else {
        // Find connection by ID in the database
        this.connection = await PlatformConnection.findByPk(this.connectionId);
        
        if (!this.connection) {
          throw new Error(`Platform connection with ID ${this.connectionId} not found`);
        }
      }

      const { apiKey, apiSecret, sellerId } = this.decryptCredentials(this.connection.credentials);
      
      // Log for debugging
      logger.debug(`Initializing Trendyol service with apiKey: ${apiKey.substring(0, 5)}..., sellerId: ${sellerId}`);
      
      // Format the auth credentials according to Trendyol's requirements
      // Trendyol requires the apiKey (supplierId) and apiSecret in Basic auth format
      const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
      
      this.axiosInstance = axios.create({
        baseURL: this.apiUrl,
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
          'User-Agent': '120101 - SelfIntegration' // Required by Trendyol
        },
        timeout: 30000
      });

      return true;
    } catch (error) {
      logger.error(`Failed to initialize Trendyol service: ${error.message}`, { error, connectionId: this.connectionId });
      throw new Error(`Failed to initialize Trendyol service: ${error.message}`);
    }
  }

  decryptCredentials(encryptedCredentials) {
    // In a real implementation, you would decrypt the credentials using a secure method
    // For this implementation, we'll assume the credentials are stored encrypted
    // and this method would decrypt them
    
    try {
      // Mock decryption - replace with actual decryption logic
      const credentials = JSON.parse(encryptedCredentials);
      return {
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        sellerId: credentials.sellerId
      };
    } catch (error) {
      logger.error(`Failed to decrypt credentials: ${error.message}`);
      throw new Error('Failed to decrypt credentials');
    }
  }

  async testConnection() {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);
      
      // Check if sellerId exists in the credentials
      if (!credentials.sellerId) {
        return {
          success: false,
          message: 'Connection failed: Seller ID is missing from credentials',
          error: 'Missing required parameter: sellerId'
        };
      }
      
      logger.debug(`Testing Trendyol connection for sellerId: ${credentials.sellerId}`);
      
      try {
        // Format dates as timestamps in milliseconds, which is what Trendyol expects
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const now = new Date();
        
        // Convert to epoch timestamps (milliseconds)
        const startDateTs = yesterday.getTime();
        const endDateTs = now.getTime();
        
        logger.debug(`Using date range timestamps: ${startDateTs} to ${endDateTs}`);
        
        // Test the connection with timestamp date formatting
        const response = await this.axiosInstance.get(`/suppliers/${credentials.sellerId}/orders`, {
          params: {
            startDate: startDateTs,
            endDate: endDateTs,
            page: 0,
            size: 1
          }
        });
        
        logger.debug(`Connection test successful: ${JSON.stringify(response.data).substring(0, 100)}...`);
        
        return {
          success: true,
          message: 'Connection successful',
          data: {
            platform: 'trendyol',
            connectionId: this.connectionId,
            status: 'active'
          }
        };
      } catch (requestError) {
        // Enhanced error handling with more details
        logger.error('Trendyol API request failed', {
          error: requestError.message,
          status: requestError.response?.status,
          data: requestError.response?.data,
          headers: requestError.config?.headers,
          url: requestError.config?.url,
          params: requestError.config?.params
        });
        
        // Check for specific error conditions in the response
        const errorData = requestError.response?.data;
        let errorMessage = requestError.message;
        
        if (errorData) {
          if (typeof errorData === 'object' && errorData.message) {
            errorMessage = errorData.message;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error(`Trendyol connection test failed: ${error.message}`, { error, connectionId: this.connectionId });
      
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  async fetchOrders(params = {}) {
    try {
      await this.initialize();
      const { sellerId } = this.decryptCredentials(this.connection.credentials);
      
      // Format dates as timestamps (epoch time in milliseconds)
      const defaultEndDate = new Date();
      const defaultStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Convert to timestamp format (milliseconds since epoch)
      const startDateTs = params.startDate ? new Date(params.startDate).getTime() : defaultStartDate.getTime();
      const endDateTs = params.endDate ? new Date(params.endDate).getTime() : defaultEndDate.getTime();
      
      const defaultParams = {
        startDate: startDateTs,
        endDate: endDateTs,
        page: 0,
        size: 50,
        orderByField: 'PackageLastModifiedDate',
        orderByDirection: 'DESC',
        status: 'Created,Picking,Invoiced,Shipped'
      };
      
      const queryParams = { ...defaultParams, ...params };
      logger.debug(`Fetching Trendyol orders with params: ${JSON.stringify(queryParams)}`);
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(`/suppliers/${sellerId}/orders`, { params: queryParams })
      );
      
      if (!response.data || !response.data.content) {
        return {
          success: false,
          message: 'No order data returned from Trendyol',
          data: []
        };
      }
      
      const normalizedOrders = await this.normalizeOrders(response.data.content);
      
      return {
        success: true,
        message: `Successfully fetched ${normalizedOrders.length} orders from Trendyol`,
        data: normalizedOrders,
        pagination: {
          page: response.data.number,
          size: response.data.size,
          totalPages: response.data.totalPages,
          totalElements: response.data.totalElements
        }
      };
    } catch (error) {
      logger.error(`Failed to fetch orders from Trendyol: ${error.message}`, { error, connectionId: this.connectionId });
      
      return {
        success: false,
        message: `Failed to fetch orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }

  async normalizeOrders(trendyolOrders) {
    try {
      const normalizedOrders = [];
      
      for (const order of trendyolOrders) {
        const shippingDetail = await ShippingDetail.create({
          recipientName: `${order.shipmentAddress.firstName} ${order.shipmentAddress.lastName}`,
          address: order.shipmentAddress.address1,
          city: order.shipmentAddress.city,
          state: order.shipmentAddress.district,
          postalCode: order.shipmentAddress.postalCode,
          country: 'Turkey', // Trendyol operates in Turkey
          phone: order.shipmentAddress.phoneNumber,
          email: order.customerEmail || '',
          shippingMethod: order.cargoProviderName
        });
        
        const normalizedOrder = await Order.create({
          platformOrderId: order.orderNumber,
          platformId: this.connection.platformId,
          connectionId: this.connectionId,
          orderDate: new Date(order.orderDate),
          orderStatus: this.mapOrderStatus(order.status),
          totalAmount: order.totalPrice,
          currency: 'TRY',
          shippingDetailId: shippingDetail.id,
          customerName: `${order.customerFirstName} ${order.customerLastName}`,
          customerEmail: order.customerEmail,
          customerPhone: order.shipmentAddress.phoneNumber,
          notes: order.note || '',
          rawData: JSON.stringify(order)
        });
        
        // Create order items
        for (const item of order.lines) {
          await OrderItem.create({
            orderId: normalizedOrder.id,
            platformProductId: item.productId.toString(),
            sku: item.merchantSku,
            barcode: item.barcode,
            title: item.productName,
            quantity: item.quantity,
            price: item.price,
            currency: 'TRY',
            variantInfo: item.variantFeatures ? JSON.stringify(item.variantFeatures) : null,
            rawData: JSON.stringify(item)
          });
        }
        
        normalizedOrders.push(normalizedOrder);
      }
      
      return normalizedOrders;
    } catch (error) {
      logger.error(`Failed to normalize Trendyol orders: ${error.message}`, { error, connectionId: this.connectionId });
      throw error;
    }
  }

  mapOrderStatus(trendyolStatus) {
    const statusMap = {
      'Created': 'new',
      'Picking': 'processing',
      'Invoiced': 'processing',
      'Shipped': 'shipped',
      'Delivered': 'delivered',
      'Cancelled': 'cancelled',
      'UnDelivered': 'failed',
      'Returned': 'returned'
    };
    
    return statusMap[trendyolStatus] || 'unknown';
  }

  async updateOrderStatus(orderId, newStatus) {
    try {
      await this.initialize();
      const { sellerId } = this.decryptCredentials(this.connection.credentials);
      
      const order = await Order.findByPk(orderId);
      
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      
      const trendyolStatus = this.mapToTrendyolStatus(newStatus);
      
      if (!trendyolStatus) {
        throw new Error(`Cannot map status '${newStatus}' to Trendyol status`);
      }
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.put(`/suppliers/${sellerId}/orders/${order.platformOrderId}/status`, {
          status: trendyolStatus
        })
      );
      
      // Update local order status
      await order.update({
        orderStatus: newStatus
      });
      
      return {
        success: true,
        message: `Order status updated to ${newStatus}`,
        data: order
      };
    } catch (error) {
      logger.error(`Failed to update order status on Trendyol: ${error.message}`, { error, orderId, connectionId: this.connectionId });
      
      return {
        success: false,
        message: `Failed to update order status: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  mapToTrendyolStatus(internalStatus) {
    const reverseStatusMap = {
      'new': 'Created',
      'processing': 'Picking',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'returned': 'Returned',
      'failed': 'UnDelivered'
    };
    
    return reverseStatusMap[internalStatus];
  }

  async syncOrdersFromDate(startDate, endDate = new Date()) {
    try {
      await this.initialize();
      const { sellerId } = this.decryptCredentials(this.connection.credentials);
      
      // Convert dates to timestamps (milliseconds)
      const startDateTs = new Date(startDate).getTime();
      const endDateTs = new Date(endDate).getTime();
      
      const params = {
        startDate: startDateTs,
        endDate: endDateTs,
        page: 0,
        size: 100
      };
      
      let hasMoreOrders = true;
      let totalSyncedOrders = 0;
      
      while (hasMoreOrders) {
        const response = await this.retryRequest(() => this.fetchOrders(params));
        
        if (!response.success || !response.data || response.data.length === 0) {
          hasMoreOrders = false;
          continue;
        }
        
        totalSyncedOrders += response.data.length;
        
        // Move to the next page
        params.page += 1;
        
        // Check if we've reached the end
        if (params.page >= response.pagination.totalPages) {
          hasMoreOrders = false;
        }
      }
      
      return {
        success: true,
        message: `Successfully synced ${totalSyncedOrders} orders from Trendyol`,
        data: { totalSyncedOrders }
      };
    } catch (error) {
      logger.error(`Failed to sync orders from Trendyol: ${error.message}`, { error, connectionId: this.connectionId });
      
      return {
        success: false,
        message: `Failed to sync orders: ${error.message}`,
        error: error.message
      };
    }
  }

  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    let retries = 0;
    let lastError = null;
    
    while (retries < maxRetries) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (error.response && (error.response.status === 429 || error.response.status >= 500)) {
          retries++;
          logger.warn(`Retrying Trendyol API request (${retries}/${maxRetries}) after error: ${error.message}`);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, retries - 1)));
        } else {
          // Non-retryable error
          throw error;
        }
      }
    }
    
    // If we've exhausted retries
    throw lastError;
  }

  /**
   * Fetch products from Trendyol
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing product data
   */
  async fetchProducts(params = {}) {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);
      
      // Check if sellerId exists in the credentials
      if (!credentials.sellerId) {
        return {
          success: false,
          message: 'Product fetch failed: Seller ID is missing from credentials',
          error: 'Missing required parameter: sellerId',
          data: []
        };
      }
      
      const defaultParams = {
        size: 50,
        page: 0
      };
      
      const queryParams = { ...defaultParams, ...params };
      
      // Use the products endpoint similar to the example
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(`/integration/product/sellers/${credentials.sellerId}/products`, { 
          params: queryParams 
        })
      );
      
      if (!response.data || !response.data.content) {
        return {
          success: false,
          message: 'No product data returned from Trendyol',
          data: []
        };
      }
      
      return {
        success: true,
        message: `Successfully fetched ${response.data.content.length} products from Trendyol`,
        data: response.data.content,
        pagination: {
          page: response.data.number || 0,
          size: response.data.size || queryParams.size,
          totalPages: response.data.totalPages || 1,
          totalElements: response.data.totalElements || response.data.content.length
        }
      };
    } catch (error) {
      logger.error(`Failed to fetch products from Trendyol: ${error.message}`, { 
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
}

module.exports = TrendyolService;