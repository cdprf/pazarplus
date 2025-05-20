// src/services/platforms/trendyol/trendyol-service.js

const { Order, OrderItem, ShippingDetail, PlatformConnection, sequelize } = require('../../../models');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');
const BasePlatformService = require('../base/BasePlatformService');

// Constants for Trendyol API endpoints and configurations
const TRENDYOL_API = {
  BASE_URL: 'https://api.trendyol.com/sapigw',
  INTEGRATION_URL: 'https://api.trendyol.com/sapigw/integration',
  SUPPLIERS_URL: 'https://api.trendyol.com/sapigw/suppliers',
  MOCK_URL: 'https://api.trendyol.com/mockapi',
  ENDPOINTS: {
    ORDERS: '/suppliers/{supplierId}/orders',
    ORDER_BY_ID: '/suppliers/{supplierId}/orders/{orderNumber}',
    ORDER_SHIPMENT_PACKAGES: '/suppliers/{supplierId}/orders/{orderNumber}/shipment-packages',
    ORDER_STATUS_UPDATE: '/suppliers/{supplierId}/orders/{orderNumber}/status',
    PRODUCTS: '/integration/product/sellers/{sellerId}/products',
    CLAIMS: '/suppliers/{supplierId}/claims',
    SETTLEMENT: '/suppliers/{supplierId}/settlements',
    BATCH_REQUEST: '/suppliers/{supplierId}/batch-requests',
    SHIPPING_PROVIDERS: '/shipment-providers'
  }
};

/**
 * Trendyol Service
 * Handles integration with Trendyol marketplace
 * @see https://developer.trendyol.com/docs
 */
class TrendyolService extends BasePlatformService {
  constructor(connectionId, directCredentials = null) {
    super(connectionId);
    this.directCredentials = directCredentials;
    this.apiUrl = 'https://api.trendyol.com/sapigw';
  }

  /**
   * Get the platform type
   * @returns {string} Platform type identifier
   */
  getPlatformType() {
    return 'trendyol';
  }

  /**
   * Find connection in database or use direct credentials
   * Override to handle direct credentials case
   * @returns {Promise<Object>} Connection object
   */
  async findConnection() {
    if (this.directCredentials) {
      // Skip finding the connection in the database for testing
      return { credentials: JSON.stringify(this.directCredentials) };
    } else {
      // Use parent implementation for regular case
      return await super.findConnection();
    }
  }

  /**
   * Setup Axios instance with appropriate headers and config
   * Implementation of abstract method from BasePlatformService
   */
  async setupAxiosInstance() {
    const credentials = this.decryptCredentials(this.connection.credentials);
    const { apiKey, apiSecret, sellerId } = credentials;
    
    // Validate required credentials
    if (!apiKey || !apiSecret || !sellerId) {
      throw new Error('Missing required Trendyol credentials. API key, API secret, and seller ID are all required.');
    }
    
    // Format the auth credentials according to Trendyol's requirements
    const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    
    const axios = require('axios');
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
  }

  /**
   * Override decryptCredentials for Trendyol-specific format
   * @param {string|object} encryptedCredentials 
   * @returns {object} Decrypted credentials
   */
  decryptCredentials(encryptedCredentials) {
    try {
      // Use the parent implementation for basic parsing
      const credentials = super.decryptCredentials(encryptedCredentials);
      
      return {
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        sellerId: credentials.sellerId
      };
    } catch (error) {
      logger.error(`Failed to decrypt Trendyol credentials: ${error.message}`, { error });
      throw new Error('Failed to decrypt credentials');
    }
  }

  /**
   * Test connection to Trendyol - override to implement Trendyol-specific test
   * @returns {Promise<Object>} Test result
   */
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
      const skippedOrders = [];
      const updatedOrders = [];
      
      // Get a default userId for system operations
      const defaultUserId = process.env.DEFAULT_USER_ID || '1';
      
      // Add detailed logging to debug
      logger.debug(`Normalizing ${trendyolOrders.length} Trendyol orders with connection ID: ${this.connectionId}`);
      
      // Track counts for reporting
      let successCount = 0;
      let skippedCount = 0;
      let updatedCount = 0;
      
      // Get the platform connection to retrieve platform type
      const platformConnection = await PlatformConnection.findByPk(this.connectionId);
      if (!platformConnection) {
        throw new Error(`Platform connection with ID ${this.connectionId} not found`);
      }
      
      const platformType = platformConnection.platformType || 'trendyol';
      logger.debug(`Using platform type: ${platformType} for connection: ${this.connectionId}`);
      
      // Fetch orders from this batch directly from the database with a single query
      // This is more efficient than checking each order individually
      const orderNumbers = trendyolOrders.map(order => order.orderNumber);
      
      // Debug duplicate detection
      logger.debug(`Checking for existing orders with connectionId=${this.connectionId} and externalOrderIds: ${JSON.stringify(orderNumbers.slice(0, 3))}... (${orderNumbers.length} total)`);
      
      // First query - fetch all orders matching our criteria
      const existingOrders = await Order.findAll({
        where: {
          connectionId: this.connectionId,
          externalOrderId: {
            [Op.in]: orderNumbers // Use Op.in for efficient querying
          }
        },
        include: [
          { model: ShippingDetail }
        ]
      });
      
      logger.debug(`Found ${existingOrders.length} existing orders out of ${trendyolOrders.length} orders in this batch`);
      
      // Map for fast lookups
      const existingOrdersMap = {};
      existingOrders.forEach(order => {
        existingOrdersMap[order.externalOrderId] = order;
      });
      
      // Debug the duplicate map
      const duplicateIds = Object.keys(existingOrdersMap);
      if (duplicateIds.length > 0) {
        logger.debug(`Existing order IDs: ${JSON.stringify(duplicateIds.slice(0, 3))}... (${duplicateIds.length} total)`);
      }
      
      // Process orders one by one
      for (const order of trendyolOrders) {
        let phoneNumber;
        try {
          // Get phone number from shipment address
          phoneNumber = this.extractPhoneNumber(order);
          
          // Check if order already exists using our lookup map
          const existingOrder = existingOrdersMap[order.orderNumber];
          
          if (existingOrder) {
            // Order exists - update it with the latest data
            try {
              await sequelize.transaction(async (t) => {
                // Update order data with the latest values from Trendyol
                logger.debug(`Updating existing order ${order.orderNumber} (ID: ${existingOrder.id})`);
                await existingOrder.update({
                  status: this.mapOrderStatus(order.status),
                  totalAmount: order.totalPrice || existingOrder.totalAmount,
                  rawData: JSON.stringify(order),
                  lastSyncedAt: new Date()
                }, { transaction: t });
                
                // Update shipping details if they exist
                if (existingOrder.ShippingDetail) {
                  await existingOrder.ShippingDetail.update({
                    recipientName: `${order.shipmentAddress.firstName} ${order.shipmentAddress.lastName}`,
                    address1: order.shipmentAddress.address1 || existingOrder.ShippingDetail.address1,
                    city: order.shipmentAddress.city,
                    state: order.shipmentAddress.district,
                    postalCode: order.shipmentAddress.postalCode,
                    phone: phoneNumber || existingOrder.ShippingDetail.phone,
                    shippingMethod: order.cargoProviderName || existingOrder.ShippingDetail.shippingMethod
                  }, { transaction: t });
                }
              });
              
              // Add to updated orders list
              updatedOrders.push(existingOrder);
              updatedCount++;
              
              logger.debug(`Successfully updated existing order ${order.orderNumber}`);
            } catch (updateError) {
              logger.error(`Failed to update existing order ${order.orderNumber}: ${updateError.message}`, {
                error: updateError,
                orderNumber: order.orderNumber,
                connectionId: this.connectionId
              });
              
              skippedOrders.push({
                externalOrderId: order.orderNumber,
                reason: `Update failed: ${updateError.message}`
              });
              skippedCount++;
            }
            continue;
          }
          
          // Order doesn't exist - create a new one
          try {
            logger.debug(`Creating new order for ${order.orderNumber}`);
            
            const result = await sequelize.transaction(async (t) => {
              // Create the order record
              const normalizedOrder = await Order.create({
                externalOrderId: order.orderNumber,
                platformType: platformType,
                connectionId: this.connectionId,
                userId: defaultUserId,
                orderDate: order.orderDate ? new Date(parseInt(order.orderDate)) : new Date(),
                status: this.mapOrderStatus(order.status),
                totalAmount: order.totalPrice,
                currency: 'TRY',
                customerName: `${order.customerFirstName} ${order.customerLastName}`,
                customerEmail: order.customerEmail,
                customerPhone: phoneNumber,
                notes: order.note || '',
                paymentStatus: 'pending',
                rawData: JSON.stringify(order),
                lastSyncedAt: new Date()
              }, { transaction: t });
              
              // Create Trendyol-specific order data
              await this.createTrendyolOrderRecord(normalizedOrder.id, order, t);
              
              // Now create shipping detail with the order ID
              const shippingDetail = await ShippingDetail.create({
                orderId: normalizedOrder.id,
                recipientName: `${order.shipmentAddress.firstName} ${order.shipmentAddress.lastName}`,
                address1: order.shipmentAddress.address1 || '',
                address2: '',
                city: order.shipmentAddress.city,
                state: order.shipmentAddress.district,
                postalCode: order.shipmentAddress.postalCode,
                country: 'Turkey',
                phone: phoneNumber,
                email: order.customerEmail || '',
                shippingMethod: order.cargoProviderName
              }, { transaction: t });
              
              // Update the order with the shipping detail ID
              await normalizedOrder.update({
                shippingDetailId: shippingDetail.id
              }, { transaction: t });
              
              // Create order items
              for (const item of order.lines) {
                await OrderItem.create({
                  orderId: normalizedOrder.id,
                  externalProductId: item.productId ? item.productId.toString() : item.productCode.toString(),
                  name: item.productName,
                  sku: item.merchantSku,
                  quantity: item.quantity,
                  unitPrice: item.price,
                  totalPrice: item.price * item.quantity,
                  discount: item.discount || 0.00,
                  options: item.variantFeatures ? {
                    variants: item.variantFeatures,
                    size: item.productSize,
                    barcode: item.barcode
                  } : null,
                  metadata: {
                    platformData: item
                  }
                }, { transaction: t });
              }
              
              return normalizedOrder;
            });
            
            // Add the result to our normalized orders
            normalizedOrders.push(result);
            
            // Update our lookup map to prevent duplicate processing in this batch
            existingOrdersMap[order.orderNumber] = result;
            
            successCount++;
            logger.debug(`Successfully created new order for ${order.orderNumber}`);
          } catch (orderError) {
            // Check if it's a unique constraint error
            if (orderError.name === 'SequelizeUniqueConstraintError') {
              logger.warn(`Unique constraint violation for ${order.orderNumber}, attempting to handle`, {
                orderNumber: order.orderNumber,
                connectionId: this.connectionId
              });

              // Simple approach: First check if the order count is > 0
              const orderCount = await Order.count();
              if (orderCount === 0) {
                // The database is empty, but we got a constraint error.
                // This is likely a phantom record or database corruption issue.
                logger.info(`Database has ${orderCount} orders but still got constraint violation. Cleaning up...`);

                // Force cleanup any potential phantom records
                await sequelize.query(
                  `DELETE FROM Orders WHERE externalOrderId = ? AND connectionId = ?`,
                  {
                    replacements: [order.orderNumber, this.connectionId],
                    type: sequelize.QueryTypes.DELETE
                  }
                );

                // Try once more with a simple create
                try {
                  const newOrder = await this.manualCreateOrder(order, platformType, defaultUserId, phoneNumber);
                  if (newOrder.success) {
                    normalizedOrders.push(newOrder.order);
                    successCount++;
                    logger.info(`Successfully created order ${order.orderNumber} after cleanup`);
                  } else {
                    throw new Error(newOrder.message);
                  }
                } catch (retryError) {
                  logger.error(`Failed to create order ${order.orderNumber} after cleanup: ${retryError.message}`);
                  skippedOrders.push({
                    externalOrderId: order.orderNumber,
                    reason: 'Failed after cleanup: ' + retryError.message
                  });
                  skippedCount++;
                }
              } else {
                // The database has orders, so let's try to find this one directly, and update if found
                try {
                  const existingOrder = await Order.findOne({
                    where: {
                      externalOrderId: order.orderNumber,
                      connectionId: this.connectionId
                    }
                  });

                  if (existingOrder) {
                    // Simple update
                    await existingOrder.update({
                      status: this.mapOrderStatus(order.status),
                      rawData: JSON.stringify(order),
                      lastSyncedAt: new Date()
                    });
                    
                    updatedOrders.push(existingOrder);
                    updatedCount++;
                    logger.info(`Found and updated order ${order.orderNumber} after constraint violation`);
                  } else {
                    // Strange situation - constraint violation but can't find the order
                    // This might be due to a race condition, let's just skip it
                    logger.warn(`Order ${order.orderNumber} not found despite constraint violation, skipping`);
                    skippedOrders.push({
                      externalOrderId: order.orderNumber,
                      reason: 'Constraint violation but order not found'
                    });
                    skippedCount++;
                  }
                } catch (findError) {
                  logger.error(`Error finding order ${order.orderNumber} after constraint violation: ${findError.message}`);
                  skippedOrders.push({
                    externalOrderId: order.orderNumber,
                    reason: 'Error after constraint violation: ' + findError.message
                  });
                  skippedCount++;
                }
              }
            } else {
              // Handle other individual order errors
              logger.error(`Failed to normalize Trendyol order ${order.orderNumber}: ${orderError.message}`, { 
                error: orderError, 
                orderNumber: order.orderNumber,
                connectionId: this.connectionId 
              });
              
              skippedOrders.push({
                externalOrderId: order.orderNumber,
                reason: orderError.message
              });
              skippedCount++;
            }
          }
        } catch (processingError) {
          logger.error(`Error processing order ${order.orderNumber}: ${processingError.message}`, {
            error: processingError,
            orderNumber: order.orderNumber
          });
          
          skippedOrders.push({
            externalOrderId: order.orderNumber,
            reason: 'Processing error: ' + processingError.message
          });
          skippedCount++;
        }
      }
      
      logger.info(`Trendyol orders: ${successCount} new, ${updatedCount} updated, ${skippedCount} skipped`);
      
      // Return both new and updated orders
      return [...normalizedOrders, ...updatedOrders];
    } catch (error) {
      logger.error(`Failed to normalize Trendyol orders: ${error.message}`, { error, connectionId: this.connectionId });
      throw error;
    }
  }

  /**
   * Manual order creation with extra caution for constraint violations
   * This method tries to create an order with a sequential approach
   * and handles failures gracefully
   */
  async manualCreateOrder(order, platformType, userId, incomingPhoneNumber) {
    // initialize local phoneNumber variable
    let phoneNumber = incomingPhoneNumber;
    try {
      // Make sure phoneNumber is defined
      if (phoneNumber === undefined || phoneNumber === null) {
        // Extract phone number again to be safe
        phoneNumber = this.extractPhoneNumber(order) || '';
        
        // Add extra defensive check to ensure phoneNumber is a string
        if (phoneNumber === undefined || phoneNumber === null) {
          phoneNumber = '';
        }
      }
      
      // First, ensure the order doesn't already exist
      const existingOrder = await Order.findOne({
        where: {
          connectionId: this.connectionId,
          externalOrderId: order.orderNumber
        }
      });
      
      if (existingOrder) {
        // Update it instead
        await existingOrder.update({
          status: this.mapOrderStatus(order.status),
          rawData: JSON.stringify(order),
          lastSyncedAt: new Date()
        });
        
        return {
          success: true,
          message: 'Order updated in manual create method',
          order: existingOrder
        };
      }
      
      // Create the order
      const newOrder = await Order.create({
        externalOrderId: order.orderNumber,
        platformType: platformType,
        connectionId: this.connectionId,
        userId: userId,
        orderDate: order.orderDate ? new Date(parseInt(order.orderDate)) : new Date(),
        status: this.mapOrderStatus(order.status),
        totalAmount: order.totalPrice,
        currency: 'TRY',
        customerName: `${order.customerFirstName} ${order.customerLastName}`,
        customerEmail: order.customerEmail,
        customerPhone: phoneNumber,
        notes: order.note || '',
        paymentStatus: 'pending',
        rawData: JSON.stringify(order),
        lastSyncedAt: new Date()
      });
      
      // Create shipping detail
      const shippingDetail = await ShippingDetail.create({
        orderId: newOrder.id,
        recipientName: `${order.shipmentAddress.firstName} ${order.shipmentAddress.lastName}`,
        address1: order.shipmentAddress.address1 || '',
        address2: '',
        city: order.shipmentAddress.city,
        state: order.shipmentAddress.district,
        postalCode: order.shipmentAddress.postalCode,
        country: 'Turkey',
        phone: phoneNumber,
        email: order.customerEmail || '',
        shippingMethod: order.cargoProviderName
      });
      
      // Update order with shipping detail ID
      await newOrder.update({
        shippingDetailId: shippingDetail.id
      });
      
      // Create platform-specific order data
      await this.createTrendyolOrderRecord(newOrder.id, order);
      
      // Create order items
      for (const item of order.lines) {
        await OrderItem.create({
          orderId: newOrder.id,
          externalProductId: item.productId ? item.productId.toString() : item.productCode.toString(),
          name: item.productName,
          sku: item.merchantSku,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
          discount: item.discount || 0.00,
          options: item.variantFeatures ? {
            variants: item.variantFeatures,
            size: item.productSize,
            barcode: item.barcode
          } : null,
          metadata: {
            platformData: item
          }
        });
      }
      
      return {
        success: true,
        message: 'Order created successfully in manual create method',
        order: newOrder
      };
    } catch (error) {
      // Handle known DB errors by returning existing order without error log
      if (error.name === 'SequelizeUniqueConstraintError' || error.name === 'SequelizeValidationError') {
        const existed = await Order.findOne({ where: { connectionId: this.connectionId, externalOrderId: order.orderNumber } });
        if (existed) {
          return { success: true, message: 'Order already exists, skipped creation', order: existed };
        }
      }
      // Unexpected error - log and return failure
      logger.error(`Failed in manual creation attempt for ${order.orderNumber}: ${error.message}`, { error, orderNumber: order.orderNumber });
      return { success: false, message: `Failed in manual create: ${error.message}`, error };
    }
  }

  /**
   * Extract phone number from order data - override parent method
   * for Trendyol-specific format
   * @param {Object} order - The order object from Trendyol API
   * @returns {string} The extracted phone number or empty string if not available
   */
  extractPhoneNumber(order) {
    // Check various locations where phone might be available
    // First check the shipmentAddress phone field
    if (order.shipmentAddress && order.shipmentAddress.phone) {
      return order.shipmentAddress.phone;
    }
    
    // If direct field doesn't work, use the parent implementation
    // which handles the general regex patterns
    return super.extractPhoneNumber(order);
  }

  /**
   * Map Trendyol order status to internal system status
   * @param {string} trendyolStatus - Platform-specific status
   * @returns {string} Internal status
   */
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

  /**
   * Map internal status to Trendyol status
   * @param {string} internalStatus - Internal status
   * @returns {string} Trendyol status
   */
  mapToPlatformStatus(internalStatus) {
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

  /**
   * Alias for backward compatibility
   */
  mapToTrendyolStatus(internalStatus) {
    return this.mapToPlatformStatus(internalStatus);
  }

  /**
   * Update order status on Trendyol platform
   * @param {string} orderId - Internal order ID
   * @param {string} newStatus - New status to set
   * @returns {Object} - Result of the status update operation
   */
  async updateOrderStatus(orderId, newStatus) {
    try {
      await this.initialize();
      const { sellerId } = this.decryptCredentials(this.connection.credentials);
      
      const order = await Order.findByPk(orderId);
      
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      
      const trendyolStatus = this.mapToPlatformStatus(newStatus);
      
      if (!trendyolStatus) {
        throw new Error(`Cannot map status '${newStatus}' to Trendyol status`);
      }
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.put(`/suppliers/${sellerId}/orders/${order.externalOrderId}/status`, {
          status: trendyolStatus
        })
      );
      
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
    } catch (error) {
      logger.error(`Failed to update order status on Trendyol: ${error.message}`, { error, orderId, connectionId: this.connectionId });
      
      return {
        success: false,
        message: `Failed to update order status: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
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

  /**
   * Get order details by ID
   * @param {string} orderNumber - The Trendyol order number
   * @returns {Promise<Object>} Order details
   */
  async getOrderById(orderNumber) {
    try {
      await this.initialize();
      const { sellerId } = this.decryptCredentials(this.connection.credentials);
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(`/suppliers/${sellerId}/orders/${orderNumber}`)
      );
      
      if (!response.data) {
        return {
          success: false,
          message: `No order data returned for order number ${orderNumber}`,
          data: null
        };
      }
      
      return {
        success: true,
        message: `Successfully fetched order ${orderNumber}`,
        data: response.data
      };
    } catch (error) {
      logger.error(`Failed to fetch order details from Trendyol: ${error.message}`, {
        error,
        orderNumber,
        connectionId: this.connectionId
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
   * Get shipment packages for an order
   * @param {string} orderNumber - The Trendyol order number
   * @returns {Promise<Object>} Shipment package details
   */
  async getOrderShipmentPackages(orderNumber) {
    try {
      await this.initialize();
      const { sellerId } = this.decryptCredentials(this.connection.credentials);
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(`/suppliers/${sellerId}/orders/${orderNumber}/shipment-packages`)
      );
      
      if (!response.data) {
        return {
          success: false,
          message: `No shipment package data returned for order number ${orderNumber}`,
          data: []
        };
      }
      
      return {
        success: true,
        message: `Successfully fetched shipment packages for order ${orderNumber}`,
        data: response.data
      };
    } catch (error) {
      logger.error(`Failed to fetch shipment packages from Trendyol: ${error.message}`, {
        error,
        orderNumber,
        connectionId: this.connectionId
      });
      
      return {
        success: false,
        message: `Failed to fetch shipment packages: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }

  /**
   * Get claim details for a seller
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Claims data
   */
  async getClaims(params = {}) {
    try {
      await this.initialize();
      const { sellerId } = this.decryptCredentials(this.connection.credentials);
      
      // Format dates as timestamps (epoch time in milliseconds)
      const defaultEndDate = new Date();
      const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      
      // Convert to timestamp format (milliseconds since epoch)
      const startDateTs = params.startDate ? new Date(params.startDate).getTime() : defaultStartDate.getTime();
      const endDateTs = params.endDate ? new Date(params.endDate).getTime() : defaultEndDate.getTime();
      
      const defaultParams = {
        startDate: startDateTs,
        endDate: endDateTs,
        page: 0,
        size: 50
      };
      
      const queryParams = { ...defaultParams, ...params };
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(`/suppliers/${sellerId}/claims`, { params: queryParams })
      );
      
      if (!response.data || !response.data.content) {
        return {
          success: false,
          message: 'No claims data returned from Trendyol',
          data: []
        };
      }
      
      return {
        success: true,
        message: `Successfully fetched ${response.data.content.length} claims from Trendyol`,
        data: response.data.content,
        pagination: {
          page: response.data.number || 0,
          size: response.data.size || queryParams.size,
          totalPages: response.data.totalPages || 1,
          totalElements: response.data.totalElements || response.data.content.length
        }
      };
    } catch (error) {
      logger.error(`Failed to fetch claims from Trendyol: ${error.message}`, {
        error,
        connectionId: this.connectionId
      });
      
      return {
        success: false,
        message: `Failed to fetch claims: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }

  /**
   * Get shipping providers supported by Trendyol
   * @returns {Promise<Object>} Shipping providers data
   */
  async getShippingProviders() {
    try {
      await this.initialize();
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get('/shipment-providers')
      );
      
      if (!response.data) {
        return {
          success: false,
          message: 'No shipping provider data returned from Trendyol',
          data: []
        };
      }
      
      return {
        success: true,
        message: 'Successfully fetched shipping providers from Trendyol',
        data: response.data
      };
    } catch (error) {
      logger.error(`Failed to fetch shipping providers from Trendyol: ${error.message}`, {
        error,
        connectionId: this.connectionId
      });
      
      return {
        success: false,
        message: `Failed to fetch shipping providers: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }

  /**
   * Create shipment package for an order
   * @param {string} orderNumber - The Trendyol order number
   * @param {Array} packageDetails - Array of package details including line items and tracking info
   * @returns {Promise<Object>} Result of the shipment creation
   */
  async createShipmentPackage(orderNumber, packageDetails) {
    try {
      await this.initialize();
      const { sellerId } = this.decryptCredentials(this.connection.credentials);
      
      // Validate package details
      if (!packageDetails || !Array.isArray(packageDetails.lines) || packageDetails.lines.length === 0) {
        return {
          success: false,
          message: 'Invalid package details. Must include line items.',
          error: 'Invalid package details'
        };
      }
      
      // Make request to create shipment package
      const response = await this.retryRequest(() => 
        this.axiosInstance.post(`/suppliers/${sellerId}/orders/${orderNumber}/shipment-packages`, packageDetails)
      );
      
      // Update local order status if successful
      const order = await Order.findOne({
        where: {
          connectionId: this.connectionId,
          externalOrderId: orderNumber
        }
      });
      
      if (order) {
        await order.update({
          status: 'shipped',
          lastSyncedAt: new Date()
        });
      }
      
      return {
        success: true,
        message: `Successfully created shipment package for order ${orderNumber}`,
        data: response.data
      };
    } catch (error) {
      logger.error(`Failed to create shipment package for order ${orderNumber}: ${error.message}`, {
        error,
        orderNumber,
        connectionId: this.connectionId
      });
      
      return {
        success: false,
        message: `Failed to create shipment package: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Get settlement details for the seller
   * @param {Object} params - Query parameters including date ranges
   * @returns {Promise<Object>} Settlement data
   */
  async getSettlements(params = {}) {
    try {
      await this.initialize();
      const { sellerId } = this.decryptCredentials(this.connection.credentials);
      
      // Format dates as timestamps (epoch time in milliseconds)
      const defaultEndDate = new Date();
      const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      
      // Convert to timestamp format (milliseconds since epoch)
      const startDateTs = params.startDate ? new Date(params.startDate).getTime() : defaultStartDate.getTime();
      const endDateTs = params.endDate ? new Date(params.endDate).getTime() : defaultEndDate.getTime();
      
      const defaultParams = {
        startDate: startDateTs,
        endDate: endDateTs,
        page: 0,
        size: 50
      };
      
      const queryParams = { ...defaultParams, ...params };
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(`/suppliers/${sellerId}/settlements`, { params: queryParams })
      );
      
      if (!response.data || !response.data.content) {
        return {
          success: false,
          message: 'No settlement data returned from Trendyol',
          data: []
        };
      }
      
      return {
        success: true,
        message: `Successfully fetched ${response.data.content.length} settlements from Trendyol`,
        data: response.data.content,
        pagination: {
          page: response.data.number || 0,
          size: response.data.size || queryParams.size,
          totalPages: response.data.totalPages || 1,
          totalElements: response.data.totalElements || response.data.content.length
        }
      };
    } catch (error) {
      logger.error(`Failed to fetch settlements from Trendyol: ${error.message}`, {
        error,
        connectionId: this.connectionId
      });
      
      return {
        success: false,
        message: `Failed to fetch settlements: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }

  /**
   * Create a batch request for bulk operations
   * @param {string} type - Type of batch operation (e.g., "PRICE_UPDATE", "STOCK_UPDATE")
   * @param {Array} items - Array of items to include in the batch
   * @returns {Promise<Object>} Result of the batch request creation
   */
  async createBatchRequest(type, items) {
    try {
      await this.initialize();
      const { sellerId } = this.decryptCredentials(this.connection.credentials);
      
      // Validate batch request data
      if (!type || !items || !Array.isArray(items) || items.length === 0) {
        return {
          success: false,
          message: 'Invalid batch request data. Must include type and items array.',
          error: 'Invalid batch request data'
        };
      }
      
      // Supported batch types
      const supportedTypes = ['PRICE_UPDATE', 'STOCK_UPDATE', 'PRODUCT_UPDATE'];
      if (!supportedTypes.includes(type)) {
        return {
          success: false,
          message: `Unsupported batch request type: ${type}. Supported types: ${supportedTypes.join(', ')}.`,
          error: 'Unsupported batch type'
        };
      }
      
      // Format batch request data
      const batchRequestData = {
        batchRequestType: type,
        items: items
      };
      
      // Make request to create batch request
      const response = await this.retryRequest(() => 
        this.axiosInstance.post(`/suppliers/${sellerId}/batch-requests`, batchRequestData)
      );
      
      return {
        success: true,
        message: `Successfully created ${type} batch request with ${items.length} items`,
        data: response.data
      };
    } catch (error) {
      logger.error(`Failed to create batch request: ${error.message}`, {
        error,
        batchType: type,
        itemCount: items?.length,
        connectionId: this.connectionId
      });
      
      return {
        success: false,
        message: `Failed to create batch request: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Get batch request status
   * @param {string} batchRequestId - The ID of the batch request to check
   * @returns {Promise<Object>} Batch request status
   */
  async getBatchRequestStatus(batchRequestId) {
    try {
      await this.initialize();
      const { sellerId } = this.decryptCredentials(this.connection.credentials);
      
      if (!batchRequestId) {
        return {
          success: false,
          message: 'Batch request ID is required',
          error: 'Missing batchRequestId'
        };
      }
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(`/suppliers/${sellerId}/batch-requests/${batchRequestId}`)
      );
      
      return {
        success: true,
        message: `Successfully fetched status for batch request ${batchRequestId}`,
        data: response.data
      };
    } catch (error) {
      logger.error(`Failed to get batch request status: ${error.message}`, {
        error,
        batchRequestId,
        connectionId: this.connectionId
      });
      
      return {
        success: false,
        message: `Failed to get batch request status: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Create a Trendyol-specific order record
   * @param {string} orderId - The main Order record ID
   * @param {Object} trendyolOrderData - Raw order data from Trendyol API
   * @param {Object} transaction - Sequelize transaction object
   * @returns {Promise<Object>} Created TrendyolOrder record
   */
  async createTrendyolOrderRecord(orderId, trendyolOrderData, transaction) {
    try {
      const { TrendyolOrder } = require('../../../models');

      // Extract Trendyol-specific fields from the order data
      return await TrendyolOrder.create({
        orderId: orderId,
        orderNumber: trendyolOrderData.orderNumber,
        cargoProviderName: trendyolOrderData.cargoProviderName,
        cargoTrackingNumber: trendyolOrderData.cargoTrackingNumber || trendyolOrderData.cargoTrackingCode,
        cargoTrackingUrl: trendyolOrderData.cargoTrackingUrl,
        customerFirstName: trendyolOrderData.customerFirstName,
        customerLastName: trendyolOrderData.customerLastName,
        customerEmail: trendyolOrderData.customerEmail,
        shipmentAddressJson: trendyolOrderData.shipmentAddress,
        invoiceAddressJson: trendyolOrderData.invoiceAddress,
        deliveryAddressJson: trendyolOrderData.deliveryAddress,
        note: trendyolOrderData.note,
        platformStatus: trendyolOrderData.status
      }, { transaction });
    } catch (error) {
      logger.error(`Failed to create TrendyolOrder record: ${error.message}`, { 
        error, 
        orderId,
        orderNumber: trendyolOrderData.orderNumber 
      });
      throw error;
    }
  }
}

module.exports = TrendyolService;