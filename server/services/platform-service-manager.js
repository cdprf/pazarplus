const EventEmitter = require('events');
const PlatformServiceFactory = require('../modules/order-management/services/platforms/platformServiceFactory');
const { mapOrderStatus } = require('../utils/enum-validators');
const logger = require('../utils/logger');
const cacheService = require('./cache-service');
const {
  Order,
  OrderItem,
  PlatformConnection,
  Product,
  ShippingDetail
} = require('../models');
const { Op } = require('sequelize');

class PlatformServiceManager extends EventEmitter {
  constructor() {
    super();
    // Don't create services in constructor, create them on demand
    this.serviceInstances = new Map();

    // Enhanced features from enhanced-platform-service
    this.syncQueue = [];
    this.isProcessing = false;
    this.conflictResolutionStrategies = new Map();
    this.inventoryCache = new Map();
    this.lastSyncTimes = new Map();

    // Initialize conflict resolution strategies
    this.initializeConflictResolution();

    // Start periodic sync scheduler
    this.startSyncScheduler();

    // Setup real-time notifications
    this.setupRealTimeNotifications();
  }

  // Enhanced method to get service by platform type
  getService(platformType, connectionId = null, directCredentials = null) {
    const serviceKey = `${platformType.toLowerCase()}-${
      connectionId || 'default'
    }`;

    if (!this.serviceInstances.has(serviceKey)) {
      const service = PlatformServiceFactory.createService(
        platformType,
        connectionId,
        directCredentials
      );
      this.serviceInstances.set(serviceKey, service);
    }

    return this.serviceInstances.get(serviceKey);
  }

  // Enhanced order fetching with better error handling and data normalization
  async fetchOrders(connection, options = {}) {
    try {
      const service = this.getService(connection.platformType, connection.id);

      // Validate connection credentials
      if (!this.validateConnection(connection)) {
        throw new Error(
          `Invalid connection configuration for ${connection.platformType}`
        );
      }

      // Set default options
      const fetchOptions = {
        startDate:
          options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate: options.endDate || new Date(),
        limit: options.limit || 200,
        offset: options.offset || 0,
        status: options.status || null,
        ...options
      };

      console.log(
        `Fetching orders from ${connection.platformType} with options:`,
        fetchOptions
      );

      // Fetch orders from the platform
      const platformOrders = await service.getOrders(connection, fetchOptions);

      // Normalize the orders to our standard format
      const normalizedOrders = await this.normalizeOrders(
        platformOrders,
        connection
      );

      return {
        success: true,
        data: normalizedOrders,
        total: platformOrders.length,
        platform: connection.platformType,
        connectionId: connection.id
      };
    } catch (error) {
      console.error(
        `Error fetching orders from ${connection.platformType}:`,
        error
      );

      return {
        success: false,
        error: error.message,
        data: [],
        total: 0,
        platform: connection.platformType,
        connectionId: connection.id
      };
    }
  }

  // Enhanced order normalization with comprehensive field mapping
  async normalizeOrders(platformOrders, connection) {
    const normalizedOrders = [];

    for (const order of platformOrders) {
      try {
        const normalizedOrder = await this.normalizeOrder(order, connection);
        if (normalizedOrder) {
          normalizedOrders.push(normalizedOrder);
        }
      } catch (error) {
        console.warn(
          `Failed to normalize order ${order.id || order.orderNumber}:`,
          error
        );
        // Continue with other orders instead of failing completely
      }
    }

    return normalizedOrders;
  }

  // Enhanced single order normalization
  async normalizeOrder(order, connection) {
    const platformType = connection.platformType.toLowerCase();

    const normalized = {
      // Standard fields that should exist for all platforms
      platformOrderId: this.extractPlatformOrderId(order, platformType),
      orderNumber: this.extractOrderNumber(order, platformType),
      orderDate: this.extractOrderDate(order, platformType),
      orderStatus: this.normalizeStatus(
        this.extractStatus(order, platformType),
        platformType
      ),

      // Customer information
      customerId: this.extractCustomerId(order, platformType),
      customerName: this.extractCustomerName(order, platformType),
      customerEmail: this.extractCustomerEmail(order, platformType),
      customerPhone: this.extractCustomerPhone(order, platformType),

      // Financial information
      totalAmount: this.extractTotalAmount(order, platformType),
      currency: this.extractCurrency(order, platformType) || 'TRY',
      taxAmount: this.extractTaxAmount(order, platformType) || 0,
      discountAmount: this.extractDiscountAmount(order, platformType) || 0,
      shippingAmount: this.extractShippingAmount(order, platformType) || 0,

      // Platform and connection info
      platform: platformType,
      connectionId: connection.id,

      // Additional metadata
      metadata: {
        originalData: order,
        syncedAt: new Date(),
        platformSpecific: this.extractPlatformSpecific(order, platformType)
      }
    };

    // Extract shipping address
    const shippingAddress = this.extractShippingAddress(order, platformType);
    if (shippingAddress) {
      normalized.shippingAddress = shippingAddress;
    }

    // Extract billing address
    const billingAddress = this.extractBillingAddress(order, platformType);
    if (billingAddress) {
      normalized.billingAddress = billingAddress;
    }

    // Extract order items
    const items = this.extractOrderItems(order, platformType);
    if (items && items.length > 0) {
      normalized.items = items;
    }

    // Extract tracking information if available
    const trackingInfo = this.extractTrackingInfo(order, platformType);
    if (trackingInfo) {
      normalized.trackingInfo = trackingInfo;
    }

    return normalized;
  }

  // Platform-specific field extraction methods
  extractPlatformOrderId(order, platform) {
    switch (platform) {
    case 'trendyol':
      return order.orderNumber || order.id;
    case 'hepsiburada':
      return order.orderNumber || order.id;
    case 'n11':
      return order.orderNumber || order.id;
    default:
      return order.id || order.orderNumber;
    }
  }

  extractOrderNumber(order, platform) {
    switch (platform) {
    case 'trendyol':
      return order.orderNumber || order.id?.toString();
    case 'hepsiburada':
      return order.orderNumber || order.id?.toString();
    case 'n11':
      return order.orderNumber || order.id?.toString();
    default:
      return order.orderNumber || order.id?.toString();
    }
  }

  extractOrderDate(order, platform) {
    let dateField;

    switch (platform) {
    case 'trendyol':
      dateField = order.orderDate || order.createdDate || order.createDate;
      break;
    case 'hepsiburada':
      dateField = order.orderDate || order.createdDate;
      break;
    case 'n11':
      dateField = order.orderDate || order.createDate;
      break;
    default:
      dateField = order.orderDate || order.createdDate || order.createDate;
    }

    if (!dateField) {return new Date();}

    // Handle different date formats
    if (typeof dateField === 'string') {
      return new Date(dateField);
    }

    if (typeof dateField === 'number') {
      // Assume timestamp
      return new Date(dateField);
    }

    return new Date(dateField);
  }

  extractStatus(order, platform) {
    switch (platform) {
    case 'trendyol':
      return order.orderStatus || order.orderStatus || order.state;
    case 'hepsiburada':
      return order.orderStatus || order.orderStatus;
    case 'n11':
      return order.orderStatus || order.orderStatus;
    default:
      return order.orderStatus || order.orderStatus;
    }
  }

  // Enhanced status normalization - delegates to platform services for consistency
  normalizeStatus(platformStatus, platform) {
    if (!platformStatus) {return 'pending';}

    // Use our centralized status mapping utility first
    const mappedStatus = mapOrderStatus(platformStatus, platform);
    if (mappedStatus && mappedStatus !== 'unknown') {
      return mappedStatus;
    }

    // Use platform-specific service mappings for consistency
    try {
      const service = this.getService(platform);
      if (service && typeof service.mapOrderStatus === 'function') {
        const serviceResult = service.mapOrderStatus(platformStatus);
        return mapOrderStatus(serviceResult, platform); // Ensure result is valid
      }
    } catch (error) {
      console.warn(
        `Could not get platform service for ${platform}:`,
        error.message
      );
    }

    // If all else fails, return unknown (which is a valid enum value)
    return 'unknown';
  }

  extractCustomerName(order, platform) {
    switch (platform) {
    case 'trendyol':
      if (order.customer) {
        return `${order.customer.firstName || ''} ${
          order.customer.lastName || ''
        }`.trim();
      }
      if (order.shippingAddress) {
        return `${order.shippingAddress.firstName || ''} ${
          order.shippingAddress.lastName || ''
        }`.trim();
      }
      return order.customerName || 'Unknown Customer';

    case 'hepsiburada':
      if (order.customer) {
        return `${order.customer.firstName || ''} ${
          order.customer.lastName || ''
        }`.trim();
      }
      return order.customerName || 'Unknown Customer';

    case 'n11':
      if (order.buyer) {
        return (
          order.buyer.fullName ||
            `${order.buyer.firstName || ''} ${
              order.buyer.lastName || ''
            }`.trim()
        );
      }
      return order.customerName || 'Unknown Customer';

    default:
      return order.customerName || 'Unknown Customer';
    }
  }

  extractCustomerEmail(order, platform) {
    switch (platform) {
    case 'trendyol':
      return order.customer?.email || order.customerEmail;
    case 'hepsiburada':
      return order.customer?.email || order.customerEmail;
    case 'n11':
      return order.buyer?.email || order.customerEmail;
    default:
      return order.customerEmail;
    }
  }

  extractCustomerPhone(order, platform) {
    switch (platform) {
    case 'trendyol':
      return (
        order.customer?.phone ||
          order.shippingAddress?.phone ||
          order.customerPhone
      );
    case 'hepsiburada':
      return order.customer?.phone || order.customerPhone;
    case 'n11':
      return order.buyer?.phone || order.customerPhone;
    default:
      return order.customerPhone;
    }
  }

  extractTotalAmount(order, platform) {
    let amount;

    switch (platform) {
    case 'trendyol':
      amount = order.totalPrice || order.totalAmount || order.amount;
      break;
    case 'hepsiburada':
      amount = order.totalAmount || order.totalPrice;
      break;
    case 'n11':
      amount = order.totalAmount || order.totalPrice;
      break;
    default:
      amount = order.totalAmount || order.totalPrice;
    }

    return parseFloat(amount) || 0;
  }

  extractCurrency(order, platform) {
    switch (platform) {
    case 'trendyol':
      return order.currency || order.currencyCode || 'TRY';
    case 'hepsiburada':
      return order.currency || 'TRY';
    case 'n11':
      return order.currency || 'TRY';
    default:
      return order.currency || 'TRY';
    }
  }

  extractShippingAddress(order, platform) {
    let address;

    switch (platform) {
    case 'trendyol':
      address = order.shippingAddress || order.deliveryAddress;
      break;
    case 'hepsiburada':
      address = order.shippingAddress;
      break;
    case 'n11':
      address = order.shippingAddress || order.deliveryAddress;
      break;
    default:
      address = order.shippingAddress;
    }

    if (!address) {return null;}

    return {
      firstName: address.firstName || '',
      lastName: address.lastName || '',
      company: address.company || '',
      address1:
        address.address1 || address.street || address.addressLine1 || '',
      address2: address.address2 || address.addressLine2 || '',
      city: address.city || '',
      district: address.district || address.state || '',
      neighborhood: address.neighborhood || '',
      postalCode: address.postalCode || address.zipCode || '',
      country: address.country || address.countryCode || 'TR',
      phone: address.phone || '',
      fullName: `${address.firstName || ''} ${address.lastName || ''}`.trim()
    };
  }

  extractOrderItems(order, platform) {
    let items;

    switch (platform) {
    case 'trendyol':
      items = order.lines || order.orderLines || order.items;
      break;
    case 'hepsiburada':
      items = order.items || order.orderLines;
      break;
    case 'n11':
      items = order.items || order.orderItems;
      break;
    default:
      items = order.items || order.lines;
    }

    if (!items || !Array.isArray(items)) {return [];}

    return items.map((item) => this.normalizeOrderItem(item, platform));
  }

  normalizeOrderItem(item, platform) {
    const normalized = {
      id: item.id || item.orderLineId,
      productId: item.productId,
      productName: item.productName || item.name,
      sku: item.sku || item.merchantSku,
      barcode: item.barcode,
      quantity: parseInt(item.quantity) || 1,
      unitPrice: parseFloat(item.unitPrice || item.price) || 0,
      totalPrice: parseFloat(item.totalPrice || item.amount) || 0,
      currency: item.currency || item.currencyCode || 'TRY'
    };

    // Platform-specific item fields
    switch (platform) {
    case 'trendyol':
      normalized.merchantSku = item.merchantSku;
      normalized.productCode = item.productCode;
      normalized.productColor = item.productColor;
      normalized.productSize = item.productSize;
      normalized.discount = parseFloat(item.discount) || 0;
      normalized.status = item.orderLineItemStatusName;
      break;

    case 'hepsiburada':
      normalized.hepsiburadaSku = item.hepsiburadaSku;
      normalized.merchantSku = item.merchantSku;
      break;

    case 'n11':
      normalized.productSellerCode = item.productSellerCode;
      break;
    }

    return normalized;
  }

  extractTrackingInfo(order, platform) {
    switch (platform) {
    case 'trendyol':
      if (order.shipmentPackageStatus) {
        return {
          trackingNumber: order.shipmentPackageStatus.trackingNumber,
          trackingUrl: order.shipmentPackageStatus.trackingUrl,
          carrier: order.shipmentPackageStatus.carrier,
          status: order.shipmentPackageStatus.status
        };
      }
      break;

    case 'hepsiburada':
      if (order.tracking) {
        return {
          trackingNumber: order.tracking.trackingNumber,
          carrier: order.tracking.carrier
        };
      }
      break;

    case 'n11':
      if (order.shippingInfo) {
        return {
          trackingNumber: order.shippingInfo.trackingNumber,
          carrier: order.shippingInfo.shippingCompany
        };
      }
      break;
    }

    return null;
  }

  extractPlatformSpecific(order, platform) {
    // Store platform-specific data that doesn't fit our standard schema
    const specific = {};

    switch (platform) {
    case 'trendyol':
      specific.fastDelivery = order.fastDelivery;
      specific.scheduled = order.scheduled;
      specific.invoiceRequested = order.invoiceRequested;
      specific.giftMessage = order.giftMessage;
      break;

    case 'hepsiburada':
      specific.isFastDelivery = order.isFastDelivery;
      specific.isGift = order.isGift;
      break;

    case 'n11':
      specific.paymentType = order.paymentType;
      specific.installment = order.installment;
      break;
    }

    return specific;
  }

  // Enhanced connection validation
  validateConnection(connection) {
    if (!connection || !connection.platformType) {
      return false;
    }

    const platform = connection.platformType.toLowerCase();

    switch (platform) {
    case 'trendyol':
      return !!(
        connection.credentials?.apiKey &&
          connection.credentials?.apiSecret &&
          connection.credentials?.supplierId
      );

    case 'hepsiburada':
      return !!(
        connection.credentials?.username &&
          connection.credentials?.password &&
          connection.credentials?.merchantId
      );

    case 'n11':
      return !!(
        connection.credentials?.apiKey &&
          (connection.credentials?.secretKey ||
            connection.credentials?.apiSecret)
      );

    default:
      return false;
    }
  }

  // Enhanced method to test platform connections
  async testConnection(connection) {
    try {
      const service = this.getService(connection.platformType);

      if (!this.validateConnection(connection)) {
        return {
          success: false,
          message: 'Invalid connection credentials'
        };
      }

      // Try to fetch a small number of orders to test the connection
      const result = await service.getOrders(connection, { limit: 1 });

      return {
        success: true,
        message: 'Connection successful',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  // Method to get all supported platforms
  getSupportedPlatforms() {
    return Object.keys(this.services);
  }

  // Enhanced method to sync orders with better progress tracking
  async syncOrdersForConnection(connection, options = {}) {
    const startTime = Date.now();

    try {
      console.log(
        `Starting order sync for ${connection.platformType} (${connection.name})`
      );

      const result = await this.fetchOrders(connection, options);

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        `Order sync completed for ${connection.platformType} in ${duration}ms`,
        {
          success: result.success,
          totalOrders: result.total,
          platform: result.platform
        }
      );

      return {
        ...result,
        syncDuration: duration,
        syncedAt: new Date(endTime)
      };
    } catch (error) {
      console.error(`Order sync failed for ${connection.platformType}:`, error);

      return {
        success: false,
        error: error.message,
        data: [],
        total: 0,
        platform: connection.platformType,
        connectionId: connection.id,
        syncDuration: Date.now() - startTime,
        syncedAt: new Date()
      };
    }
  }

  // Helper methods for extracting additional fields
  extractCustomerId(order, platform) {
    switch (platform) {
    case 'trendyol':
      return order.customer?.id || order.customerId;
    case 'hepsiburada':
      return order.customer?.id || order.customerId;
    case 'n11':
      return order.buyer?.id || order.customerId;
    default:
      return order.customerId;
    }
  }

  extractTaxAmount(order, platform) {
    switch (platform) {
    case 'trendyol':
      return parseFloat(order.taxAmount || order.tax) || 0;
    case 'hepsiburada':
      return parseFloat(order.taxAmount) || 0;
    case 'n11':
      return parseFloat(order.taxAmount) || 0;
    default:
      return parseFloat(order.taxAmount || order.tax) || 0;
    }
  }

  extractDiscountAmount(order, platform) {
    switch (platform) {
    case 'trendyol':
      return parseFloat(order.discountAmount || order.discount) || 0;
    case 'hepsiburada':
      return parseFloat(order.discountAmount) || 0;
    case 'n11':
      return parseFloat(order.discountAmount) || 0;
    default:
      return parseFloat(order.discountAmount || order.discount) || 0;
    }
  }

  extractShippingAmount(order, platform) {
    switch (platform) {
    case 'trendyol':
      return parseFloat(order.shippingAmount || order.cargoPrice) || 0;
    case 'hepsiburada':
      return parseFloat(order.shippingAmount) || 0;
    case 'n11':
      return parseFloat(order.shippingAmount) || 0;
    default:
      return parseFloat(order.shippingAmount) || 0;
    }
  }

  extractBillingAddress(order, platform) {
    let address;

    switch (platform) {
    case 'trendyol':
      address = order.billingAddress || order.invoiceAddress;
      break;
    case 'hepsiburada':
      address = order.billingAddress;
      break;
    case 'n11':
      address = order.billingAddress;
      break;
    default:
      address = order.billingAddress;
    }

    if (!address) {return null;}

    return {
      firstName: address.firstName || '',
      lastName: address.lastName || '',
      company: address.company || '',
      address1: address.address1 || address.street || '',
      address2: address.address2 || '',
      city: address.city || '',
      district: address.district || address.state || '',
      postalCode: address.postalCode || address.zipCode || '',
      country: address.country || address.countryCode || 'TR',
      phone: address.phone || '',
      taxNumber: address.taxNumber || '',
      taxOffice: address.taxOffice || ''
    };
  }

  /**
   * Enhanced features from enhanced-platform-service
   */

  /**
   * Initialize conflict resolution strategies
   */
  initializeConflictResolution() {
    // Platform priority order for conflict resolution
    this.platformPriority = {
      trendyol: 1,
      hepsiburada: 2,
      n11: 3
    };

    // Conflict resolution strategies
    this.conflictResolutionStrategies.set('ORDER_STATUS_CONFLICT', {
      strategy: 'PLATFORM_PRIORITY',
      fallback: 'LATEST_TIMESTAMP'
    });

    this.conflictResolutionStrategies.set('PRICE_CONFLICT', {
      strategy: 'MANUAL_REVIEW',
      fallback: 'PLATFORM_PRIORITY'
    });

    this.conflictResolutionStrategies.set('INVENTORY_CONFLICT', {
      strategy: 'CONSERVATIVE_MINIMUM',
      fallback: 'REAL_TIME_SYNC'
    });
  }

  /**
   * Enhanced order synchronization with conflict resolution
   */
  async syncOrdersWithConflictResolution(platformConnections = []) {
    try {
      const syncStartTime = Date.now();
      const results = {
        successful: [],
        failed: [],
        conflicts: [],
        totalProcessed: 0
      };

      // If no specific connections provided, get all active connections
      if (platformConnections.length === 0) {
        platformConnections = await PlatformConnection.findAll({
          where: { isActive: true }
        });
      }

      // If no active connections, return early
      if (platformConnections.length === 0) {
        logger.debug('No active platform connections found for sync');
        return results;
      }

      // Parallel sync from all platforms
      const syncPromises = platformConnections.map(async (connection) => {
        try {
          const platformService = this.getPlatformService(
            connection.platformType,
            connection.id
          );

          // Use syncOrdersFromDate instead of fetchOrders
          const startDate = this.getLastSyncTime(connection.id);
          const endDate = new Date();

          const orderResult = await platformService.syncOrdersFromDate(
            startDate,
            endDate
          );

          if (orderResult && orderResult.success) {
            // The result.data contains the count, we'll use a simplified approach for now
            const ordersProcessed = orderResult.data?.count || 0;

            results.successful.push({
              platform: connection.platformType,
              connectionId: connection.id,
              ordersProcessed: ordersProcessed,
              conflicts: 0 // Simplified for now
            });

            // Update last sync time
            this.updateLastSyncTime(connection.id);
          } else {
            results.failed.push({
              platform: connection.platformType,
              connectionId: connection.id,
              error: orderResult?.message || 'Unknown sync error'
            });
          }
        } catch (error) {
          logger.error(
            `Platform sync failed for ${connection.platformType}:`,
            error
          );
          results.failed.push({
            platform: connection.platformType,
            connectionId: connection.id,
            error: error.message
          });
        }
      });

      await Promise.allSettled(syncPromises);

      // Calculate performance metrics
      const syncDuration = Date.now() - syncStartTime;
      results.totalProcessed = results.successful.reduce(
        (sum, r) => sum + r.ordersProcessed,
        0
      );
      results.syncDuration = syncDuration;

      // Only emit sync completion event if there were orders processed
      if (results.totalProcessed > 0 || results.failed.length > 0) {
        // Safely serialize the results before emitting
        const safeResults = {
          successful: results.successful.map((r) => ({
            platform: r.platform,
            connectionId: r.connectionId,
            ordersProcessed: r.ordersProcessed,
            conflicts: r.conflicts
          })),
          failed: results.failed.map((f) => ({
            platform: f.platform,
            connectionId: f.connectionId,
            error: f.error
          })),
          totalProcessed: results.totalProcessed,
          syncDuration: results.syncDuration
        };

        this.emit('syncCompleted', {
          timestamp: new Date(),
          results: safeResults,
          performance: {
            duration: syncDuration,
            ordersPerSecond:
              results.totalProcessed > 0
                ? results.totalProcessed / (syncDuration / 1000)
                : 0
          }
        });

        logger.info('Enhanced platform sync completed', {
          totalProcessed: results.totalProcessed,
          successful: results.successful.length,
          failed: results.failed.length,
          duration: syncDuration
        });
      }

      return results;
    } catch (error) {
      logger.error('Enhanced platform sync failed:', error);
      throw error;
    }
  }

  /**
   * Process orders with conflict detection and resolution
   */
  async processOrdersWithConflictDetection(orders, connection) {
    const processedOrders = [];

    for (const orderData of orders) {
      try {
        // Check for existing order across all platforms
        const existingOrders = await Order.findAll({
          where: {
            [Op.or]: [
              { externalOrderId: orderData.orderNumber },
              { orderNumber: orderData.orderNumber }
            ]
          },
          include: [
            { model: PlatformConnection, as: 'platformConnection' },
            { model: OrderItem, as: 'items' }
          ]
        });

        if (existingOrders.length > 1) {
          // Potential conflict detected
          const conflict = await this.detectAndResolveConflict(
            orderData,
            existingOrders,
            connection
          );
          processedOrders.push({
            orderData,
            hasConflict: true,
            conflictResolution: conflict,
            processed: conflict.resolved
          });

          // Emit conflict event for real-time notifications
          this.emit('orderConflict', {
            orderNumber: orderData.orderNumber,
            platforms: existingOrders.map(
              (o) => o.platformConnection.platformType
            ),
            conflictType: conflict.type,
            resolution: conflict.resolution
          });
        } else {
          // No conflict, process normally
          const processedOrder = await this.processOrderNormally(
            orderData,
            connection
          );
          processedOrders.push({
            orderData,
            hasConflict: false,
            processed: true,
            orderId: processedOrder?.id || null
          });
        }
      } catch (error) {
        logger.error(
          `Failed to process order ${orderData.orderNumber}:`,
          error
        );
        processedOrders.push({
          orderData,
          hasConflict: false,
          processed: false,
          error: error.message
        });
      }
    }

    return processedOrders;
  }

  /**
   * Detect and resolve conflicts between platforms
   */
  async detectAndResolveConflict(newOrderData, existingOrders, connection) {
    const conflicts = [];

    // Detect different types of conflicts
    for (const existingOrder of existingOrders) {
      // Status conflict
      if (
        this.mapOrderStatus(newOrderData.status) !== existingOrder.orderStatus
      ) {
        conflicts.push({
          type: 'ORDER_STATUS_CONFLICT',
          newValue: this.mapOrderStatus(newOrderData.status),
          existingValue: existingOrder.orderStatus,
          platform: connection.platformType,
          existingPlatform: existingOrder.platformConnection.platformType
        });
      }

      // Price conflict
      if (
        Math.abs(newOrderData.totalPrice - existingOrder.totalAmount) > 0.01
      ) {
        conflicts.push({
          type: 'PRICE_CONFLICT',
          newValue: newOrderData.totalPrice,
          existingValue: existingOrder.totalAmount,
          platform: connection.platformType,
          existingPlatform: existingOrder.platformConnection.platformType
        });
      }

      // Item quantity conflicts
      if (newOrderData.lines && existingOrder.items) {
        for (const newItem of newOrderData.lines) {
          const existingItem = existingOrder.items.find(
            (item) =>
              item.sku === newItem.merchantSku ||
              item.platformProductId === newItem.productId?.toString()
          );

          if (existingItem && existingItem.quantity !== newItem.quantity) {
            conflicts.push({
              type: 'INVENTORY_CONFLICT',
              newValue: newItem.quantity,
              existingValue: existingItem.quantity,
              sku: newItem.merchantSku,
              platform: connection.platformType,
              existingPlatform: existingOrder.platformConnection.platformType
            });
          }
        }
      }
    }

    // Resolve conflicts based on strategies
    const resolutions = await this.resolveConflicts(
      conflicts,
      newOrderData,
      existingOrders,
      connection
    );

    return {
      conflicts,
      resolutions,
      resolved: resolutions.every((r) => r.status === 'resolved'),
      type: conflicts.map((c) => c.type).join(', ')
    };
  }

  /**
   * Resolve conflicts using configured strategies
   */
  async resolveConflicts(conflicts, newOrderData, existingOrders, connection) {
    const resolutions = [];

    for (const conflict of conflicts) {
      const strategy = this.conflictResolutionStrategies.get(conflict.type);
      let resolution;

      switch (strategy.strategy) {
      case 'PLATFORM_PRIORITY':
        resolution = await this.resolvByPlatformPriority(
          conflict,
          newOrderData,
          existingOrders,
          connection
        );
        break;

      case 'LATEST_TIMESTAMP':
        resolution = await this.resolveByLatestTimestamp(
          conflict,
          newOrderData,
          existingOrders
        );
        break;

      case 'CONSERVATIVE_MINIMUM':
        resolution = await this.resolveByConservativeMinimum(
          conflict,
          newOrderData,
          existingOrders
        );
        break;

      case 'MANUAL_REVIEW':
        resolution = await this.flagForManualReview(
          conflict,
          newOrderData,
          existingOrders
        );
        break;

      default:
        resolution = {
          status: 'unresolved',
          reason: 'No strategy configured'
        };
      }

      resolutions.push({
        conflict,
        resolution,
        strategy: strategy.strategy,
        timestamp: new Date()
      });
    }

    return resolutions;
  }

  /**
   * Resolve conflict by platform priority
   */
  async resolvByPlatformPriority(
    conflict,
    newOrderData,
    existingOrders,
    connection
  ) {
    const newPlatformPriority =
      this.platformPriority[connection.platformType] || 999;
    const existingPlatformPriority =
      this.platformPriority[conflict.existingPlatform] || 999;

    if (newPlatformPriority < existingPlatformPriority) {
      // New platform has higher priority, update existing order
      const targetOrder = existingOrders.find(
        (o) => o.platformConnection.platformType === conflict.existingPlatform
      );
      await this.updateOrderWithNewData(targetOrder, newOrderData, conflict);

      return {
        status: 'resolved',
        action: 'updated_existing',
        reason: `${connection.platformType} has higher priority than ${conflict.existingPlatform}`,
        updatedOrderId: targetOrder.id
      };
    } else {
      // Existing platform has higher priority, ignore new data
      return {
        status: 'resolved',
        action: 'ignored_new',
        reason: `${conflict.existingPlatform} has higher priority than ${connection.platformType}`
      };
    }
  }

  /**
   * Resolve conflict by latest timestamp
   */
  async resolveByLatestTimestamp(conflict, newOrderData, existingOrders) {
    const newTimestamp = new Date(
      newOrderData.orderDate || newOrderData.lastModifiedDate
    );

    let latestOrder = null;
    let latestTimestamp = new Date(0);

    for (const order of existingOrders) {
      const orderTimestamp = new Date(order.lastSyncedAt || order.orderDate);
      if (orderTimestamp > latestTimestamp) {
        latestTimestamp = orderTimestamp;
        latestOrder = order;
      }
    }

    if (newTimestamp > latestTimestamp) {
      // New data is more recent
      await this.updateOrderWithNewData(latestOrder, newOrderData, conflict);
      return {
        status: 'resolved',
        action: 'updated_with_latest',
        reason: 'New data has more recent timestamp'
      };
    } else {
      return {
        status: 'resolved',
        action: 'kept_existing',
        reason: 'Existing data has more recent timestamp'
      };
    }
  }

  /**
   * Resolve inventory conflict by taking conservative minimum
   */
  async resolveByConservativeMinimum(conflict, newOrderData, existingOrders) {
    if (conflict.type === 'INVENTORY_CONFLICT') {
      const minQuantity = Math.min(conflict.newValue, conflict.existingValue);

      // Update all orders to use minimum quantity
      for (const order of existingOrders) {
        const item = order.items.find((i) => i.sku === conflict.sku);
        if (item && item.quantity !== minQuantity) {
          await item.update({ quantity: minQuantity });
        }
      }

      return {
        status: 'resolved',
        action: 'set_minimum_quantity',
        reason: `Set quantity to conservative minimum: ${minQuantity}`,
        resolvedValue: minQuantity
      };
    }

    return { status: 'unresolved', reason: 'Not an inventory conflict' };
  }

  /**
   * Flag conflict for manual review
   */
  async flagForManualReview(conflict, newOrderData, existingOrders) {
    // Store conflict for manual review in cache
    const conflictId = `conflict_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    await cacheService.set(
      `manual_review:${conflictId}`,
      {
        conflict,
        newOrderData,
        existingOrderIds: existingOrders.map((o) => o.id),
        flaggedAt: new Date(),
        status: 'pending_review'
      },
      24 * 60 * 60
    ); // 24 hours TTL

    // Emit event for notification system
    this.emit('manualReviewRequired', {
      conflictId,
      conflict,
      orderNumber: newOrderData.orderNumber,
      platforms: existingOrders.map((o) => o.platformConnection.platformType)
    });

    return {
      status: 'flagged_for_review',
      action: 'manual_review_required',
      conflictId,
      reason: 'Conflict requires manual intervention'
    };
  }

  /**
   * Update existing order with new data
   */
  async updateOrderWithNewData(existingOrder, newOrderData, conflict) {
    const updateData = {};

    switch (conflict.type) {
    case 'ORDER_STATUS_CONFLICT':
      updateData.orderStatus = this.mapOrderStatus(newOrderData.status);
      break;
    case 'PRICE_CONFLICT':
      updateData.totalAmount = newOrderData.totalPrice;
      break;
    }

    updateData.lastSyncedAt = new Date();
    updateData.rawData = JSON.stringify(newOrderData);

    await existingOrder.update(updateData);
  }

  /**
   * Real-time inventory synchronization across platforms
   */
  async syncInventoryAcrossPlatforms(sku, newQuantity, originPlatform) {
    try {
      // Get all platform connections for products with this SKU
      const productConnections = await this.getProductPlatformConnections(sku);

      const syncResults = [];

      for (const connection of productConnections) {
        if (connection.platformType === originPlatform) {continue;} // Skip origin platform

        try {
          const platformService = this.getPlatformService(
            connection.platformType,
            connection.id
          );

          // Update inventory on platform
          if (platformService.updateProductStock) {
            const result = await platformService.updateProductStock(
              sku,
              newQuantity
            );
            syncResults.push({
              platform: connection.platformType,
              success: result.success,
              message: result.message
            });
          }
        } catch (error) {
          logger.error(
            `Failed to sync inventory to ${connection.platformType}:`,
            error
          );
          syncResults.push({
            platform: connection.platformType,
            success: false,
            error: error.message
          });
        }
      }

      // Update local inventory cache
      this.inventoryCache.set(sku, {
        quantity: newQuantity,
        lastUpdated: new Date(),
        originPlatform
      });

      // Emit inventory sync event
      this.emit('inventorySynced', {
        sku,
        newQuantity,
        originPlatform,
        syncResults,
        timestamp: new Date()
      });

      return syncResults;
    } catch (error) {
      logger.error('Inventory sync failed:', error);
      throw error;
    }
  }

  /**
   * Real-time notification system for platform events
   */
  setupRealTimeNotifications() {
    // Order status changes
    this.on('orderStatusChanged', (data) => {
      this.broadcastNotification('order_status_change', {
        orderNumber: data.orderNumber,
        platform: data.platform,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        timestamp: data.timestamp
      });
    });

    // Inventory alerts
    this.on('lowInventoryAlert', (data) => {
      this.broadcastNotification('low_inventory', {
        sku: data.sku,
        currentQuantity: data.quantity,
        threshold: data.threshold,
        platforms: data.platforms
      });
    });

    // Sync completion notifications
    this.on('syncCompleted', (data) => {
      this.broadcastNotification('sync_completed', {
        totalProcessed: data.results.totalProcessed,
        duration: data.performance.duration,
        conflicts: data.results.conflicts.length,
        timestamp: data.timestamp
      });
    });

    // Conflict notifications
    this.on('orderConflict', (data) => {
      this.broadcastNotification('order_conflict', {
        orderNumber: data.orderNumber,
        platforms: data.platforms,
        conflictType: data.conflictType,
        requiresAttention: data.resolution === 'manual_review'
      });
    });
  }

  /**
   * Broadcast notification to all connected clients
   */
  broadcastNotification(type, data) {
    // This will be implemented with WebSocket in the next step
    logger.info(`Notification: ${type}`, data);

    // Store notification for retrieval
    cacheService.set(
      `notification:${Date.now()}`,
      {
        type,
        data,
        timestamp: new Date()
      },
      24 * 60 * 60
    ); // 24 hours TTL
  }

  /**
   * Get platform service instance - enhanced version
   */
  getPlatformService(platformType, connectionId) {
    // Try to get from existing service instances first
    const serviceKey = `${platformType.toLowerCase()}-${
      connectionId || 'default'
    }`;

    if (this.serviceInstances.has(serviceKey)) {
      return this.serviceInstances.get(serviceKey);
    }

    // Create new service instance
    switch (platformType.toLowerCase()) {
    case 'trendyol':
      const TrendyolService = require('../modules/order-management/services/platforms/trendyol/trendyol-service');
      const trendyolService = new TrendyolService(connectionId);
      this.serviceInstances.set(serviceKey, trendyolService);
      return trendyolService;
    case 'hepsiburada':
      const HepsiburadaService = require('../modules/order-management/services/platforms/hepsiburada/hepsiburada-service');
      const hepsiburadaService = new HepsiburadaService(connectionId);
      this.serviceInstances.set(serviceKey, hepsiburadaService);
      return hepsiburadaService;
    case 'n11':
      const N11Service = require('../modules/order-management/services/platforms/n11/n11-service');
      const n11Service = new N11Service(connectionId);
      this.serviceInstances.set(serviceKey, n11Service);
      return n11Service;
    default:
      throw new Error(`Unsupported platform type: ${platformType}`);
    }
  }

  /**
   * Map platform-specific status to internal status
   * Uses consistent mappings with individual platform services
   */
  mapOrderStatus(platformStatus) {
    const statusMap = {
      // Trendyol mappings (consistent with TrendyolService)
      Created: 'new',
      Picking: 'processing',
      Invoiced: 'processing',
      Shipped: 'shipped',
      AtCollectionPoint: 'shipped',
      Delivered: 'delivered',
      Cancelled: 'cancelled',
      UnDelivered: 'failed',
      Returned: 'returned',

      // Hepsiburada mappings (consistent with HepsiburadaService)
      Open: 'pending',
      PaymentCompleted: 'processing',
      Packaged: 'shipped',
      InTransit: 'shipped',
      CancelledByMerchant: 'cancelled',
      CancelledByCustomer: 'cancelled',
      CancelledBySap: 'cancelled',
      ReadyToShip: 'processing',
      ClaimCreated: 'claim_created',

      // N11 mappings (consistent with N11Service)
      Approved: 'pending',
      New: 'new'
    };

    return statusMap[platformStatus] || 'unknown';
  }

  /**
   * Get product platform connections
   */
  async getProductPlatformConnections(sku) {
    // This would query for products across platforms with the given SKU
    // Simplified implementation for now
    return await PlatformConnection.findAll({
      where: { isActive: true }
    });
  }

  /**
   * Process order normally (no conflicts)
   */
  async processOrderNormally(orderData, connection) {
    const platformService = this.getPlatformService(
      connection.platformType,
      connection.id
    );
    return await platformService.normalizeOrders([orderData]);
  }

  /**
   * Get last sync time for a connection
   */
  getLastSyncTime(connectionId) {
    return (
      this.lastSyncTimes.get(connectionId) ||
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    ); // Default to 24 hours ago
  }

  /**
   * Update last sync time
   */
  updateLastSyncTime(connectionId) {
    this.lastSyncTimes.set(connectionId, new Date());
  }

  /**
   * Start periodic sync scheduler
   */
  startSyncScheduler() {
    // Sync every 10 minutes instead of 5 to reduce load
    setInterval(async () => {
      try {
        // Only run sync if not already processing
        if (this.isProcessing) {
          logger.debug('Sync already in progress, skipping scheduled sync');
          return;
        }

        this.isProcessing = true;
        logger.debug('Starting scheduled platform sync');

        // Use a shorter sync window for periodic syncs
        const results = await this.syncOrdersWithConflictResolution();

        logger.debug('Scheduled sync completed successfully', {
          totalProcessed: results.totalProcessed,
          duration: results.syncDuration
        });
      } catch (error) {
        logger.error('Scheduled sync failed:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 10 * 60 * 1000); // 10 minutes

    logger.info(
      'Enhanced platform sync scheduler started (10 minute intervals)'
    );
  }

  /**
   * Get pending manual reviews
   */
  async getPendingManualReviews() {
    const keys = await cacheService.getKeys('manual_review:*');
    const reviews = [];

    for (const key of keys) {
      const review = await cacheService.get(key);
      if (review && review.status === 'pending_review') {
        reviews.push({
          id: key.replace('manual_review:', ''),
          ...review
        });
      }
    }

    return reviews;
  }

  /**
   * Resolve manual review
   */
  async resolveManualReview(conflictId, resolution) {
    const review = await cacheService.get(`manual_review:${conflictId}`);

    if (!review) {
      throw new Error('Manual review not found');
    }

    // Apply resolution
    review.status = 'resolved';
    review.resolution = resolution;
    review.resolvedAt = new Date();

    await cacheService.set(`manual_review:${conflictId}`, review, 24 * 60 * 60);

    this.emit('manualReviewResolved', {
      conflictId,
      resolution,
      timestamp: new Date()
    });

    return review;
  }
}

module.exports = PlatformServiceManager;
