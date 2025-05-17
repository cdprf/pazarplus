const axios = require('axios');
const crypto = require('crypto');
const { Order } = require('../../../models/Order');
const { OrderItem } = require('../../../models/OrderItem');
const { ShippingDetail } = require('../../../models/ShippingDetail');
const { PlatformConnection } = require('../../../models/platform-connection.model');
const logger = require('../../../utils/logger');

class HepsiburadaService {
  constructor(connectionId) {
    this.connectionId = connectionId;
    this.connection = null;
    this.apiUrl = 'https://api.hepsiburada.com';
    this.axiosInstance = null;
  }

  async initialize() {
    try {
      this.connection = await PlatformConnection.findByPk(this.connectionId);
      
      if (!this.connection) {
        throw new Error(`Platform connection with ID ${this.connectionId} not found`);
      }

      const { merchantId, apiKey } = this.decryptCredentials(this.connection.credentials);
      
      this.axiosInstance = axios.create({
        baseURL: this.apiUrl,
        headers: {
          'MerchantId': merchantId,
          'ApiKey': apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'Pazar+ Order Management System'
        },
        timeout: 30000
      });

      return true;
    } catch (error) {
      logger.error(`Failed to initialize Hepsiburada service: ${error.message}`, { error, connectionId: this.connectionId });
      throw new Error(`Failed to initialize Hepsiburada service: ${error.message}`);
    }
  }

  decryptCredentials(encryptedCredentials) {
    try {
      // Mock decryption - replace with actual decryption logic
      const credentials = JSON.parse(encryptedCredentials);
      return {
        merchantId: credentials.merchantId,
        apiKey: credentials.apiKey
      };
    } catch (error) {
      logger.error(`Failed to decrypt credentials: ${error.message}`);
      throw new Error('Failed to decrypt credentials');
    }
  }

  async testConnection() {
    try {
      await this.initialize();
      
      // Test the connection by fetching a small amount of data
      const response = await this.axiosInstance.get('/orders', {
        params: {
          offset: 0,
          limit: 1,
          beginDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          status: 'Created'
        }
      });

      return {
        success: true,
        message: 'Connection successful',
        data: {
          platform: 'hepsiburada',
          connectionId: this.connectionId,
          status: 'active'
        }
      };
    } catch (error) {
      logger.error(`Hepsiburada connection test failed: ${error.message}`, { error, connectionId: this.connectionId });
      
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
      
      const defaultParams = {
        offset: 0,
        limit: 50,
        beginDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        status: 'Created,Packaging,Invoiced,Shipped'
      };
      
      const queryParams = { ...defaultParams, ...params };
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get('/orders', { params: queryParams })
      );
      
      if (!response.data || !response.data.items) {
        return {
          success: false,
          message: 'No order data returned from Hepsiburada',
          data: []
        };
      }
      
      const normalizedOrders = await this.normalizeOrders(response.data.items);
      
      return {
        success: true,
        message: `Successfully fetched ${normalizedOrders.length} orders from Hepsiburada`,
        data: normalizedOrders,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.totalCount || normalizedOrders.length
        }
      };
    } catch (error) {
      logger.error(`Failed to fetch orders from Hepsiburada: ${error.message}`, { error, connectionId: this.connectionId });
      
      return {
        success: false,
        message: `Failed to fetch orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }

  async normalizeOrders(hepsiburadaOrders) {
    try {
      const normalizedOrders = [];
      
      for (const order of hepsiburadaOrders) {
        // Fetch order details for complete information
        const orderDetailsResponse = await this.retryRequest(() => 
          this.axiosInstance.get(`/orders/${order.id}`)
        );
        
        const orderDetails = orderDetailsResponse.data;
        
        if (!orderDetails) {
          logger.warn(`Failed to fetch details for Hepsiburada order: ${order.id}`);
          continue;
        }
        
        // Extract shipping address from order details
        const shippingAddress = orderDetails.shippingAddress || {};
        
        const shippingDetail = await ShippingDetail.create({
          recipientName: `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim(),
          address: shippingAddress.address || '',
          city: shippingAddress.city || '',
          state: shippingAddress.district || '',
          postalCode: shippingAddress.postalCode || '',
          country: 'Turkey', // Hepsiburada operates in Turkey
          phone: shippingAddress.phoneNumber || '',
          email: orderDetails.customerEmail || '',
          shippingMethod: orderDetails.cargoCompany || ''
        });
        
        const normalizedOrder = await Order.create({
          platformOrderId: order.id || order.number,
          platformId: this.connection.platformId,
          connectionId: this.connectionId,
          orderDate: new Date(order.orderDate || Date.now()),
          orderStatus: this.mapOrderStatus(order.status),
          totalAmount: order.totalPrice || 0,
          currency: 'TRY',
          shippingDetailId: shippingDetail.id,
          customerName: `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim(),
          customerEmail: orderDetails.customerEmail || '',
          customerPhone: shippingAddress.phoneNumber || '',
          notes: orderDetails.customerNote || '',
          rawData: JSON.stringify(orderDetails)
        });
        
        // Create order items
        if (orderDetails.items && Array.isArray(orderDetails.items)) {
          for (const item of orderDetails.items) {
            await OrderItem.create({
              orderId: normalizedOrder.id,
              platformProductId: item.productId || '',
              sku: item.merchantSku || '',
              barcode: item.barcode || '',
              title: item.productName || '',
              quantity: parseInt(item.quantity) || 1,
              price: parseFloat(item.price) || 0,
              currency: 'TRY',
              variantInfo: item.properties ? JSON.stringify(item.properties) : null,
              rawData: JSON.stringify(item)
            });
          }
        }
        
        normalizedOrders.push(normalizedOrder);
      }
      
      return normalizedOrders;
    } catch (error) {
      logger.error(`Failed to normalize Hepsiburada orders: ${error.message}`, { error, connectionId: this.connectionId });
      throw error;
    }
  }

  mapOrderStatus(hepsiburadaStatus) {
    const statusMap = {
      'Created': 'new',
      'Packaging': 'processing',
      'ReadyToShip': 'processing',
      'Shipped': 'shipped',
      'Delivered': 'delivered',
      'Cancelled': 'cancelled',
      'UnDelivered': 'failed',
      'Returned': 'returned'
    };
    
    return statusMap[hepsiburadaStatus] || 'unknown';
  }

  mapToHepsiburadaStatus(internalStatus) {
    const reverseStatusMap = {
      'new': 'Created',
      'processing': 'Packaging',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'returned': 'Returned',
      'failed': 'UnDelivered'
    };
    
    return reverseStatusMap[internalStatus];
  }

  async updateOrderStatus(orderId, newStatus) {
    try {
      await this.initialize();
      
      const order = await Order.findByPk(orderId);
      
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      
      const hepsiburadaStatus = this.mapToHepsiburadaStatus(newStatus);
      
      if (!hepsiburadaStatus) {
        throw new Error(`Cannot map status '${newStatus}' to Hepsiburada status`);
      }
      
      // Hepsiburada requires different endpoints for different status updates
      let endpoint;
      let payload;
      
      switch (hepsiburadaStatus) {
        case 'Shipped':
          endpoint = `/orders/${order.platformOrderId}/status/shipping`;
          payload = {
            trackingNumber: order.trackingNumber,
            shippingCompany: order.carrier
          };
          break;
        case 'Cancelled':
          endpoint = `/orders/${order.platformOrderId}/status/cancel`;
          payload = {
            reasonId: 1, // Default reason
            reason: 'Cancelled by merchant'
          };
          break;
        default:
          endpoint = `/orders/${order.platformOrderId}/status`;
          payload = {
            status: hepsiburadaStatus
          };
      }
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.put(endpoint, payload)
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
      logger.error(`Failed to update order status on Hepsiburada: ${error.message}`, { error, orderId, connectionId: this.connectionId });
      
      return {
        success: false,
        message: `Failed to update order status: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  async syncOrdersFromDate(startDate, endDate = new Date()) {
    try {
      await this.initialize();
      
      const params = {
        offset: 0,
        limit: 50,
        beginDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
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
        params.offset += params.limit;
        
        // Check if we've reached the end
        if (response.data.length < params.limit || 
            params.offset >= response.pagination.totalCount) {
          hasMoreOrders = false;
        }
      }
      
      return {
        success: true,
        message: `Successfully synced ${totalSyncedOrders} orders from Hepsiburada`,
        data: { totalSyncedOrders }
      };
    } catch (error) {
      logger.error(`Failed to sync orders from Hepsiburada: ${error.message}`, { error, connectionId: this.connectionId });
      
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
          logger.warn(`Retrying Hepsiburada API request (${retries}/${maxRetries}) after error: ${error.message}`);
          
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
}

module.exports = HepsiburadaService;