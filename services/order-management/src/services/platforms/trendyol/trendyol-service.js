// src/services/platforms/trendyol/trendyol-service.js

const axios = require('axios');
const crypto = require('crypto');
// Fix model imports to use the centralized models index file
const { Order, OrderItem, ShippingDetail, PlatformConnection, sequelize } = require('../../../models');
const { Op } = require('sequelize'); // Import Op directly from sequelize
const logger = require('../../../utils/logger');

// Constants for Trendyol API endpoints and configurations
const TRENDYOL_API = {
  BASE_URL: 'https://api.trendyol.com/sapigw',
  INTEGRATION_URL: 'https://api.trendyol.com/sapigw/integration',
  // Alternative URL for Suppliers Integration
  SUPPLIERS_URL: 'https://api.trendyol.com/sapigw/suppliers',
  // URL for developers and testing
  MOCK_URL: 'https://api.trendyol.com/mockapi',
  // Specific integration endpoints
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
      
      // Log for debugging - use safe access to prevent errors if apiKey is undefined
      logger.debug(`Initializing Trendyol service with apiKey: ${apiKey ? apiKey.substring(0, 5) : 'undefined'}..., sellerId: ${sellerId || 'undefined'}`);
      
      // Validate required credentials
      if (!apiKey || !apiSecret || !sellerId) {
        throw new Error('Missing required Trendyol credentials. API key, API secret, and seller ID are all required.');
      }
      
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
        try {
          // Get phone number from shipment address
          const phoneNumber = this.extractPhoneNumber(order);
          
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
                
                // We're not updating order items as they typically don't change
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
          logger.debug(`Creating new order for ${order.orderNumber}`);
          
          // Double-check that we don't have a duplicate order before creating
          // This avoids race conditions when processing multiple orders in parallel
          const duplicateCheck = await Order.findOne({
            where: {
              connectionId: this.connectionId,
              externalOrderId: order.orderNumber
            }
          });
          
          if (duplicateCheck) {
            logger.warn(`Duplicate order detected at creation time for ${order.orderNumber}, skipping`);
            skippedOrders.push({
              externalOrderId: order.orderNumber,
              reason: 'Duplicate order found during final check'
            });
            skippedCount++;
            continue;
          }
          
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
                // If we have discount information, add it
                discount: item.discount || 0.00,
                // Store variant information in options if available
                options: item.variantFeatures ? {
                  variants: item.variantFeatures,
                  size: item.productSize,
                  barcode: item.barcode
                } : null,
                // Store full item data for reference
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
            logger.warn(`Unique constraint violation for ${order.orderNumber}, attempting to update instead`, {
              orderNumber: order.orderNumber,
              connectionId: this.connectionId
            });
            
            // Try to update it instead since it was just created by another process
            try {
              // Find the existing order
              const conflictOrder = await Order.findOne({
                where: {
                  connectionId: this.connectionId,
                  externalOrderId: order.orderNumber
                },
                include: [{ model: ShippingDetail }]
              });
              
              if (conflictOrder) {
                // Update the order that caused the conflict
                await sequelize.transaction(async (t) => {
                  await conflictOrder.update({
                    status: this.mapOrderStatus(order.status),
                    rawData: JSON.stringify(order),
                    lastSyncedAt: new Date()
                  }, { transaction: t });
                });
                
                updatedOrders.push(conflictOrder);
                updatedCount++;
                logger.debug(`Recovered from constraint error by updating order ${order.orderNumber}`);
              } else {
                // This shouldn't happen, but log it just in case
                logger.error(`Could not find order that caused constraint violation: ${order.orderNumber}`);
                skippedOrders.push({
                  externalOrderId: order.orderNumber,
                  reason: 'Unique constraint error, but order not found for update'
                });
                skippedCount++;
              }
            } catch (updateError) {
              logger.error(`Failed to recover from unique constraint error for ${order.orderNumber}: ${updateError.message}`);
              skippedOrders.push({
                externalOrderId: order.orderNumber,
                reason: 'Unique constraint error recovery failed'
              });
              skippedCount++;
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
   * Extract phone number from order data
   * Handles various formats and null cases in Trendyol API responses
   * @param {Object} order - The order object from Trendyol API
   * @returns {string} The extracted phone number or empty string if not available
   */
  extractPhoneNumber(order) {
    // Check various locations where phone might be available
    // First check the shipmentAddress phone field
    if (order.shipmentAddress && order.shipmentAddress.phone) {
      return order.shipmentAddress.phone;
    }
    
    // Some orders might have phone in fullAddress or other fields
    // Look for patterns like telephone numbers in various formats
    const fullAddress = order.shipmentAddress?.fullAddress || '';
    
    // Enhanced Turkish phone regex patterns
    const phonePatterns = [
      // Explicit markers with phone numbers
      /(?:tel|telefon|gsm|cep|phone)[:\s]*([+0-9\s()\-]{10,15})/i,
      // Turkish mobile format (05XX)
      /\b(05\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})\b/,
      // With country code (+90 or 0090)
      /\b(\+?90[\s-]?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})\b/,
      // Generic number pattern as fallback
      /\b(\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})\b/
    ];
    
    // Try each pattern
    for (const pattern of phonePatterns) {
      const match = fullAddress.match(pattern);
      if (match && match[1]) {
        // Clean up the matched number
        return match[1].replace(/[\s()-]/g, '').trim();
      }
    }
    
    // Try invoiceAddress as fallback
    if (order.invoiceAddress && order.invoiceAddress.phone) {
      return order.invoiceAddress.phone;
    }
    
    // If no phone found, return empty string
    return '';
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
        status: newStatus // Changed from orderStatus to status to match the model
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
        size: 100,
        orderByField: 'PackageLastModifiedDate',
        orderByDirection: 'DESC',
        status: 'Created,Picking,Invoiced,Shipped'
      };
      
      let hasMoreOrders = true;
      let totalOrders = 0;
      let totalSuccessCount = 0;
      
      while (hasMoreOrders) {
        // Fetch orders for this page
        const response = await this.retryRequest(() => 
          this.axiosInstance.get(`/suppliers/${sellerId}/orders`, { params })
        );
        
        if (!response.data || !response.data.content || response.data.content.length === 0) {
          hasMoreOrders = false;
          continue;
        }
        
        const ordersData = response.data.content;
        logger.debug(`Fetched ${ordersData.length} orders from Trendyol for page ${params.page}`);
        
        // Normalize the orders - this now returns an array of normalized orders
        const normalizedOrders = await this.normalizeOrders(ordersData);
        
        // Update counters
        totalOrders += ordersData.length;
        totalSuccessCount += normalizedOrders.length;
        
        // Move to the next page
        params.page += 1;
        
        // Check if we've reached the end
        if (params.page >= response.data.totalPages) {
          hasMoreOrders = false;
        }
      }
      
      return {
        success: true,
        message: `Successfully processed ${totalOrders} orders from Trendyol`,
        data: { 
          count: totalSuccessCount,
          skipped: totalOrders - totalSuccessCount,
          total: totalOrders
        }
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
}

module.exports = TrendyolService;