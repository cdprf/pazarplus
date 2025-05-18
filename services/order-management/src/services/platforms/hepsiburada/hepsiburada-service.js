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
    this.apiUrl = 'https://oms-external.hepsiburada.com';
    this.axiosInstance = null;
  }

  async initialize() {
    try {
      this.connection = await PlatformConnection.findByPk(this.connectionId);
      
      if (!this.connection) {
        throw new Error(`Platform connection with ID ${this.connectionId} not found`);
      }

      const credentials = this.decryptCredentials(this.connection.credentials);
      const { merchantId, apiKey } = credentials;
      
      // Set up axios instance with authentication from your snippet
      this.axiosInstance = axios.create({
        baseURL: this.apiUrl,
        headers: {
          'User-Agent': 'sentosyazilim_dev',
          'Authorization': `Basic ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      this.merchantId = merchantId;

      return true;
    } catch (error) {
      logger.error(`Failed to initialize Hepsiburada service: ${error.message}`, { error, connectionId: this.connectionId });
      throw new Error(`Failed to initialize Hepsiburada service: ${error.message}`);
    }
  }

  decryptCredentials(encryptedCredentials) {
    try {
      // Simple parse for development - in production would use proper decryption
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
      const url = `/packages/merchantid/${this.merchantId}?limit=1`;
      const response = await this.axiosInstance.get(url);
      
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
        limit: 100
      };
      
      const queryParams = { ...defaultParams, ...params };
      const url = `/packages/merchantid/${this.merchantId}`;
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(url, { params: queryParams })
      );
      
      if (!response.data || !Array.isArray(response.data)) {
        return {
          success: false,
          message: 'No order data returned from Hepsiburada',
          data: []
        };
      }
      
      const normalizedOrders = await this.normalizeOrders(response.data);
      
      return {
        success: true,
        message: `Successfully fetched ${normalizedOrders.length} orders from Hepsiburada`,
        data: normalizedOrders,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.length
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
  
  /**
   * Get detailed information for a specific order by its order number
   * @param {string} orderNumber - The Hepsiburada order number
   * @returns {Object} - Order details or error
   */
  async getOrderDetails(orderNumber) {
    try {
      await this.initialize();
      
      const url = `/orders/merchantid/${this.merchantId}/ordernumber/${orderNumber}`;
      
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

  async normalizeOrders(hepsiburadaOrders) {
    try {
      const normalizedOrders = [];
      
      for (const order of hepsiburadaOrders) {
        // Create shipping details from the order data
        const shippingDetail = await ShippingDetail.create({
          recipientName: order.recipientName || '',
          address: order.shippingAddressDetail || '',
          city: order.shippingCity || '',
          state: order.shippingTown || '',
          postalCode: order.billingPostalCode || '',
          country: order.shippingCountryCode || 'TR',
          phone: order.phoneNumber || '',
          email: order.email || '',
          shippingMethod: order.cargoCompany || ''
        });
        
        // Extract price information
        const totalAmount = order.totalPrice?.amount || 0;
        const currency = order.totalPrice?.currency || 'TRY';
        
        // Create the order record
        const normalizedOrder = await Order.create({
          platformOrderId: order.packageNumber || order.id,
          platformId: this.connection.platformId,
          connectionId: this.connectionId,
          orderDate: new Date(order.orderDate),
          orderStatus: this.mapOrderStatus(order.status),
          totalAmount: totalAmount,
          currency: currency,
          shippingDetailId: shippingDetail.id,
          customerName: order.customerName || order.recipientName || '',
          customerEmail: order.email || '',
          customerPhone: order.phoneNumber || '',
          notes: '',
          rawData: JSON.stringify(order)
        });
        
        // Create order items
        if (order.items && Array.isArray(order.items)) {
          for (const item of order.items) {
            await OrderItem.create({
              orderId: normalizedOrder.id,
              platformProductId: item.lineItemId || '',
              sku: item.merchantSku || '',
              barcode: item.productBarcode || '',
              title: item.productName || '',
              quantity: parseInt(item.quantity) || 1,
              unitPrice: parseFloat(item.price?.amount) || 0,
              totalPrice: parseFloat(item.totalPrice?.amount) || 0,
              currency: item.price?.currency || 'TRY',
              variantInfo: item.properties ? JSON.stringify(item.properties) : null,
              weight: item.weight || 0,
              taxAmount: parseFloat(item.vat) || 0,
              taxRate: parseFloat(item.vatRate) || 0,
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

  /**
   * Process a direct order payload from Hepsiburada
   * Used when we receive direct API data or webhook payload
   * @param {Object} orderData - The raw order data from Hepsiburada
   * @returns {Object} - Processing result with the normalized order
   */
  async processDirectOrderPayload(orderData) {
    try {
      if (!this.connection) {
        await this.initialize();
      }
      
      let order = orderData;
      
      // If this is an order detail response (from getOrderDetails), use it directly
      if (orderData.orderId && orderData.orderNumber && orderData.items) {
        // This is already an order detail format
        order = orderData;
      } 
      // If this is a package format (from fetchOrders), transform it
      else if (orderData.id && orderData.packageNumber) {
        // Fetch full order details if we only have the package info
        const orderDetailsResponse = await this.getOrderDetails(orderData.packageNumber);
        
        if (orderDetailsResponse.success && orderDetailsResponse.data) {
          order = orderDetailsResponse.data;
        }
      }
      
      const items = order.items || [];
      
      // Extract shipping details based on data format
      let recipientName, address, city, town, postalCode, email, phoneNumber;
      
      if (order.deliveryAddress) {
        // Order detail format
        recipientName = order.deliveryAddress.name || '';
        address = order.deliveryAddress.address || '';
        city = order.deliveryAddress.city || '';
        town = order.deliveryAddress.town || '';
        postalCode = order.deliveryAddress.postalCode || '';
        email = order.deliveryAddress.email || '';
        phoneNumber = order.deliveryAddress.phoneNumber || '';
      } else {
        // Package format
        recipientName = order.recipientName || '';
        address = order.shippingAddressDetail || '';
        city = order.shippingCity || '';
        town = order.shippingTown || '';
        postalCode = order.billingPostalCode || '';
        email = order.email || '';
        phoneNumber = order.phoneNumber || '';
      }
      
      // Create shipping detail
      const shippingDetail = await ShippingDetail.create({
        recipientName,
        address,
        city,
        state: town,
        postalCode,
        country: 'TR',
        phone: phoneNumber,
        email,
        shippingMethod: items[0]?.cargoCompany || order.cargoCompany || ''
      });
      
      // Get customer name from appropriate location
      let customerName = '';
      if (order.customer && order.customer.name) {
        customerName = order.customer.name;
      } else {
        customerName = order.customerName || recipientName;
      }
      
      // Get order status from appropriate field
      let orderStatus;
      if (items[0] && items[0].status) {
        orderStatus = this.mapOrderStatus(items[0].status);
      } else if (order.status) {
        orderStatus = this.mapOrderStatus(order.status);
      } else if (order.paymentStatus) {
        orderStatus = this.mapPaymentStatus(order.paymentStatus);
      } else {
        orderStatus = 'new';
      }
      
      // Get order number
      const platformOrderId = order.orderNumber || order.packageNumber || '';
      
      // Calculate total from items if not directly available
      let totalAmount = 0;
      let currency = 'TRY';
      
      if (order.totalPrice) {
        totalAmount = parseFloat(order.totalPrice.amount) || 0;
        currency = order.totalPrice.currency || 'TRY';
      } else {
        // Calculate from items
        totalAmount = items.reduce((sum, item) => {
          const itemTotal = parseFloat(item.totalPrice?.amount || 0);
          return sum + itemTotal;
        }, 0);
        
        // Get currency from first item
        if (items[0] && items[0].totalPrice && items[0].totalPrice.currency) {
          currency = items[0].totalPrice.currency;
        }
      }
      
      // Create the order record
      const normalizedOrder = await Order.create({
        platformOrderId,
        platformId: this.connection.platformId,
        connectionId: this.connectionId,
        orderDate: new Date(order.orderDate),
        orderStatus,
        totalAmount,
        currency,
        shippingDetailId: shippingDetail.id,
        customerName,
        customerEmail: email,
        customerPhone: phoneNumber,
        notes: order.orderNote || '',
        rawData: JSON.stringify(order)
      });
      
      // Create order items
      for (const item of items) {
        // Get the right field names based on the format
        const sku = item.sku || item.merchantSKU || '';
        const name = item.name || item.productName || '';
        const barcode = item.productBarcode || '';
        const quantity = parseInt(item.quantity) || 1;
        
        // Get prices
        let unitPrice = 0;
        let totalPrice = 0;
        let taxAmount = 0;
        let taxRate = 0;
        
        if (item.unitPrice) {
          unitPrice = parseFloat(item.unitPrice.amount) || 0;
        } else if (item.price) {
          unitPrice = parseFloat(item.price.amount) || 0;
        }
        
        if (item.totalPrice) {
          totalPrice = parseFloat(item.totalPrice.amount) || 0;
        } else {
          totalPrice = unitPrice * quantity;
        }
        
        if (item.vat) {
          taxAmount = parseFloat(item.vat) || 0;
        }
        
        if (item.vatRate) {
          taxRate = parseFloat(item.vatRate) || 0;
        }
        
        await OrderItem.create({
          orderId: normalizedOrder.id,
          platformProductId: item.id || item.lineItemId || '',
          sku,
          barcode,
          title: name,
          quantity,
          unitPrice,
          totalPrice,
          currency: item.totalPrice?.currency || item.unitPrice?.currency || 'TRY',
          variantInfo: item.properties ? JSON.stringify(item.properties) : null,
          weight: item.weight || 0,
          taxAmount,
          taxRate,
          rawData: JSON.stringify(item)
        });
      }
      
      return {
        success: true,
        message: 'Order processed successfully',
        data: normalizedOrder
      };
    } catch (error) {
      logger.error(`Failed to process direct Hepsiburada order: ${error.message}`, { error, connectionId: this.connectionId });
      
      return {
        success: false,
        message: `Failed to process order: ${error.message}`,
        error: error.message
      };
    }
  }

  mapOrderStatus(hepsiburadaStatus) {
    const statusMap = {
      'Open': 'new',
      'Picking': 'processing',
      'Invoiced': 'processing',
      'Shipped': 'shipped',
      'Delivered': 'delivered',
      'Cancelled': 'cancelled',
      'Returned': 'returned'
    };
    
    return statusMap[hepsiburadaStatus] || 'new';
  }
  
  mapPaymentStatus(paymentStatus) {
    const statusMap = {
      'Received': 'new',
      'Pending': 'processing',
      'Completed': 'processing'
    };
    
    return statusMap[paymentStatus] || 'new';
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