/**
 * N11 Platform Service
 * Implements the N11 REST API for order management
 */

const axios = require('axios');
const BasePlatformService = require('../base/BasePlatformService');
const logger = require('../../../utils/logger');

class N11Service extends BasePlatformService {
  constructor(connectionId, credentials) {
    super(connectionId);
    
    if (credentials) {
      this.credentials = credentials;
      this.appKey = credentials.appKey;
      this.appSecret = credentials.appSecret;
      this.endpointUrl = credentials.endpointUrl || 'https://api.n11.com/rest';
    }
  }
  
  /**
   * Get the platform type
   * @returns {string} Platform type
   */
  getPlatformType() {
    return 'n11';
  }
  
  /**
   * Setup Axios instance with N11-specific headers and config
   */
  async setupAxiosInstance() {
    try {
      // If credentials aren't provided directly, try to find them from the connection
      if (!this.appKey || !this.appSecret) {
        if (!this.connection) {
          await this.initialize();
        }
        
        const credentials = this.decryptCredentials(this.connection.credentials);
        this.appKey = credentials.appKey;
        this.appSecret = credentials.appSecret;
        this.endpointUrl = credentials.endpointUrl || 'https://api.n11.com/rest';
      }
      
      // Create axios instance with N11-specific configuration
      this.axiosInstance = axios.create({
        baseURL: this.endpointUrl,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      // Add request interceptor to include authentication headers
      this.axiosInstance.interceptors.request.use((config) => {
        // N11 API requires appKey and appSecret in headers
        config.headers['appKey'] = this.appKey;
        config.headers['appSecret'] = this.appSecret;
        return config;
      });
      
      // Add response interceptor for error handling
      this.axiosInstance.interceptors.response.use(
        (response) => response,
        (error) => {
          logger.error(`N11 API error: ${error.message}`, {
            error,
            status: error.response?.status,
            data: error.response?.data
          });
          return Promise.reject(error);
        }
      );
    } catch (error) {
      logger.error(`Failed to setup Axios instance for N11: ${error.message}`, {
        error,
        connectionId: this.connectionId
      });
      throw error;
    }
  }

  /**
   * Test the connection to N11
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      // Make sure we have a configured axios instance
      if (!this.axiosInstance) {
        await this.setupAxiosInstance();
      }
      
      // Call the shipment packages endpoint to test the connection
      const response = await this.axiosInstance.get('/delivery/v1/shipmentPackages', {
        params: {
          size: 1,
          status: 'Created' // Just use one status to test the connection
        }
      });
      
      // Check if the response has the expected structure based on the example response
      // The API returns { pageCount, totalPages, page, size, content }
      if (response.data && ('content' in response.data)) {
        return {
          success: true,
          message: 'Successfully connected to N11 API'
        };
      } else {
        return {
          success: false,
          message: `Failed to connect to N11 API: Unexpected response format - ${JSON.stringify(response.data)}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to N11 API: ${error.message}`
      };
    }
  }

  /**
   * Get orders from N11 using the shipment packages endpoint
   * @param {Object} options - Options for fetching orders
   * @returns {Promise<Array>} List of orders
   */
  async getOrders(options) {
    try {
      if (!this.axiosInstance) {
        await this.setupAxiosInstance();
      }

      // Default status parameters for shipment packages
      const status = options.status || 'Created';
      const size = options.size || 200;
      
      // Build query parameters
      const params = {
        size,
        status
      };
      
      // Add date range parameters if provided
      if (options.startDate) {
        params.startDate = options.startDate;
      }
      if (options.endDate) {
        params.endDate = options.endDate;
      }
      
      // Get shipment packages from N11 using the provided example endpoint
      const response = await this.axiosInstance.get('/delivery/v1/shipmentPackages', { params });
      
      // Handle the response format based on the example response:
      // { pageCount, totalPages, page, size, content }
      if (!response.data || !('content' in response.data)) {
        throw new Error(`Failed to get shipment packages: Unexpected response format`);
      }
      
      // Process and format shipment packages to match our internal order format
      const shipmentPackages = response.data.content || [];
      return this.processShipmentPackages(shipmentPackages);
    } catch (error) {
      logger.error(`Failed to get orders from N11: ${error.message}`, {
        error,
        connectionId: this.connectionId
      });
      throw error;
    }
  }

  /**
   * Process and format N11 shipment packages to match our internal order format
   * @param {Array} shipmentPackages - N11 shipment packages
   * @returns {Array} Processed orders
   */
  processShipmentPackages(shipmentPackages) {
    if (!shipmentPackages || !shipmentPackages.length) {
      return [];
    }

    // Group items by order ID to consolidate into orders
    const orderMap = new Map();
    
    shipmentPackages.forEach(pkg => {
      const orderId = pkg.orderNumber.toString();
      
      if (!orderMap.has(orderId)) {
        // Create new order entry
        orderMap.set(orderId, {
          platformOrderId: orderId,
          orderNumber: pkg.orderNumber,
          customerId: pkg.buyer?.id?.toString() || null,
          customerName: pkg.buyer?.fullName || 'Unknown',
          orderDate: pkg.orderDate,
          totalAmount: 0, // Will be calculated from items
          status: this.mapShipmentStatus(pkg.status),
          items: [],
          platformDetails: {
            orderNumber: pkg.orderNumber,
            platformStatus: pkg.status,
            recipient: pkg.recipient,
            address: pkg.shippingAddress,
            shipmentCompany: pkg.shipmentCompany || null,
            trackingNumber: pkg.trackingNumber || null,
            shipmentMethod: pkg.shipmentMethod || null
          }
        });
      }
      
      // Get the order we're building
      const order = orderMap.get(orderId);
      
      // Add items from this package
      if (pkg.items && pkg.items.item) {
        const items = Array.isArray(pkg.items.item) ? pkg.items.item : [pkg.items.item];
        
        items.forEach(item => {
          const lineItem = {
            platformItemId: item.id.toString(),
            productId: item.productId?.toString() || null,
            sku: item.sku || null,
            name: item.name || 'Unknown Item',
            quantity: parseInt(item.quantity || 1, 10),
            unitPrice: parseFloat(item.price || 0),
            totalPrice: parseFloat(item.price * (item.quantity || 1) || 0),
            status: this.mapItemStatus(item.status || pkg.status),
            platformDetails: {
              lineId: item.id,
              productId: item.productId,
              status: item.status || pkg.status,
            }
          };
          
          // Add item to order
          order.items.push(lineItem);
          
          // Update order total
          order.totalAmount += lineItem.totalPrice;
        });
      }
    });
    
    // Convert map to array
    return Array.from(orderMap.values());
  }

  /**
   * Map N11 shipment status to internal status
   * @param {string} status - N11 shipment status
   * @returns {string} Internal order status
   */
  mapShipmentStatus(status) {
    switch (status) {
      case 'Created':
        return 'new';
      case 'Picking':
        return 'processing';
      case 'Shipped':
        return 'shipped';
      case 'Delivered':
        return 'delivered';
      case 'Cancelled':
        return 'cancelled';
      case 'Unpacked':
      case 'UnSupplied':
        return 'other';
      default:
        return 'other';
    }
  }

  /**
   * Process and format N11 order items
   * @param {Array} items - N11 order items
   * @returns {Array} Processed order items
   */
  processOrderItems(items) {
    if (!items || !items.length) {
      return [];
    }

    return items.map(item => ({
      platformItemId: item.id.toString(),
      productId: item.productId?.toString() || null,
      sku: item.sku || null,
      name: item.title || 'Unknown Item',
      quantity: parseInt(item.quantity || 1, 10),
      unitPrice: parseFloat(item.price || 0),
      totalPrice: parseFloat(item.dueAmount || 0),
      status: this.mapItemStatus(item.status),
      platformDetails: {
        // Store N11-specific item fields here
        lineId: item.id,
        productId: item.productId,
        status: item.status,
      }
    }));
  }

  /**
   * Map N11 order status to internal status
   * @param {string} status - N11 order status
   * @returns {string} Internal order status
   */
  mapOrderStatus(status) {
    switch (status) {
      case 'NEW':
        return 'new';
      case 'PICKING':
      case 'ACCEPTED':
        return 'processing';
      case 'SHIPPED':
        return 'shipped';
      case 'DELIVERED':
        return 'delivered';
      case 'CANCELLED':
        return 'cancelled';
      case 'REJECTED':
        return 'rejected';
      default:
        return 'other';
    }
  }

  /**
   * Map N11 item status to internal status
   * @param {string} status - N11 item status
   * @returns {string} Internal item status
   */
  mapItemStatus(status) {
    switch (status) {
      case 'NEW':
        return 'new';
      case 'PICKING':
      case 'ACCEPTED':
        return 'processing';
      case 'SHIPPED':
        return 'shipped';
      case 'DELIVERED':
        return 'delivered';
      case 'CANCELLED':
        return 'cancelled';
      case 'REJECTED':
        return 'rejected';
      default:
        return 'other';
    }
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

      // N11 API currently only supports "Picking" status for updates
      if (status !== 'processing' && status !== 'Picking') {
        logger.warn(`N11 API only supports 'Picking' status updates, attempted: ${status}`);
        return {
          success: false,
          message: `N11 API only supports 'Picking' status updates, attempted: ${status}`
        };
      }

      // Ensure we have line IDs to update
      if (!lineIds || !lineIds.length) {
        return {
          success: false,
          message: 'No line IDs provided for update'
        };
      }

      // Format the request according to N11 API
      const requestData = {
        lines: lineIds.map(lineId => ({ lineId })),
        status: 'Picking' // N11 API requires 'Picking' as the status value
      };

      // Make the API request to update order status
      const response = await this.axiosInstance.put('/order/v1/update', requestData);

      // Check the response
      if (response.data && response.data.content) {
        const results = response.data.content;
        const successItems = results.filter(item => item.status === 'SUCCESS');
        const failedItems = results.filter(item => item.status !== 'SUCCESS');

        if (failedItems.length > 0) {
          logger.warn(`Some items failed to update in N11`, { failedItems });
        }

        return {
          success: successItems.length > 0,
          successCount: successItems.length,
          failedCount: failedItems.length,
          message: successItems.length > 0 
            ? `Successfully updated ${successItems.length} items in N11` 
            : 'Failed to update items in N11',
          details: results
        };
      } else {
        return {
          success: false,
          message: `Failed to update order status: ${response.data?.errorMessage || 'Unknown error'}`
        };
      }
    } catch (error) {
      logger.error(`Failed to update order status in N11: ${error.message}`, {
        error,
        connectionId: this.connectionId,
        orderId
      });
      
      return {
        success: false,
        message: `Failed to update order status: ${error.message}`
      };
    }
  }
}

module.exports = N11Service;