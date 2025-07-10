// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/services/platforms/trendyol/trendyol-service-generic.js
/**
 * Trendyol marketplace integration service using the generic platform data model
 *
 * This service handles all interactions with the Trendyol API and stores data
 * using the platform-agnostic data models instead of platform-specific tables.
 *
 * @date May 20, 2025
 */

const axios = require('axios');
const logger = require('../../../../../utils/logger'); // Fixed path: 6 levels up to reach server/utils
const { sequelize } = require('../../../../../config/database');
const { getStatusMapping } = require('./status-mapping');

class TrendyolServiceGeneric {
  constructor(connectionData) {
    this.connectionId = connectionData.id;
    this.userId = connectionData.userId;
    this.credentials = connectionData.credentials;
    this.settings = connectionData.settings || {};
    this.platformType = 'trendyol';

    // Configure API client
    this.apiClient = axios.create({
      baseURL: this.settings.apiBaseUrl || 'https://api.trendyol.com/sapigw',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Pazar+ Order Management v1.0'
      },
      auth: {
        username: this.credentials.apiKey,
        password: this.credentials.apiSecret
      }
    });

    // Configure request interceptor to log API calls
    this.apiClient.interceptors.request.use((config) => {
      logger.debug(
        `Trendyol API Request: ${config.method.toUpperCase()} ${config.url}`,
        {
          connectionId: this.connectionId
        }
      );
      return config;
    });

    // Configure response interceptor to handle errors
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        const errorDetails = {
          message: error.message,
          code: error.response?.status,
          data: error.response?.data,
          connectionId: this.connectionId
        };

        logger.error(`Trendyol API Error: ${error.message}`, errorDetails);

        return Promise.reject(error);
      }
    );
  }

  /**
   * Fetch orders from Trendyol API
   * @param {Object} params - Query parameters for order fetching
   * @returns {Promise<Object>} Result of the API call
   */
  async fetchOrders(params = {}) {
    try {
      const defaultParams = {
        size: 50,
        page: 0,
        orderByField: 'CreatedDate',
        orderByDirection: 'DESC'
      };

      const queryParams = { ...defaultParams, ...params };

      // Ensure dates are in ISO format if provided
      if (queryParams.startDate && typeof queryParams.startDate === 'object') {
        queryParams.startDate = queryParams.startDate.toISOString();
      }

      if (queryParams.endDate && typeof queryParams.endDate === 'object') {
        queryParams.endDate = queryParams.endDate.toISOString();
      }

      // Make API request to fetch orders
      const response = await this.apiClient.get('/suppliers/orders', {
        params: queryParams
      });

      return {
        success: true,
        data: response.data.content || [],
        pagination: {
          page: response.data.pageable?.pageNumber || 0,
          size: response.data.pageable?.pageSize || 0,
          totalElements: response.data.totalElements || 0,
          totalPages: response.data.totalPages || 0
        }
      };
    } catch (error) {
      logger.error(`Failed to fetch orders from Trendyol: ${error.message}`, {
        error,
        connectionId: this.connectionId
      });

      return {
        success: false,
        message: `Failed to fetch orders: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Fetch products from Trendyol API
   * @param {Object} params - Query parameters for product fetching
   * @returns {Promise<Object>} Result of the API call
   */
  async fetchProducts(params = {}) {
    try {
      const defaultParams = {
        size: 50,
        page: 0
      };

      const queryParams = { ...defaultParams, ...params };

      // Make API request to fetch products
      const response = await this.apiClient.get('/suppliers/products', {
        params: queryParams
      });

      return {
        success: true,
        data: response.data.content || [],
        pagination: {
          page: response.data.pageable?.pageNumber || 0,
          size: response.data.pageable?.pageSize || 0,
          totalElements: response.data.totalElements || 0,
          totalPages: response.data.totalPages || 0
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
        error: error.message
      };
    }
  }

  /**
   * Sync orders from Trendyol to our database using the generic platform data model
   * @param {Object} params - Query parameters for order fetching
   * @returns {Promise<Object>} Result of the sync operation
   */
  async syncOrders(params = {}) {
    try {
      const models = require('../../../models');
      const {
        Order,
        OrderItem,
        ShippingDetail,
        PlatformData,
        PlatformAttribute,
        OrderHistory
      } = models;

      // Fetch orders from Trendyol
      const result = await this.fetchOrders(params);

      if (!result.success) {
        return {
          success: false,
          message: `Failed to fetch orders from Trendyol: ${result.message}`,
          error: result.error
        };
      }

      const orders = result.data;

      // Statistics for reporting
      const stats = {
        total: orders.length,
        new: 0,
        updated: 0,
        skipped: 0,
        failed: 0
      };

      // Process each order
      for (const trendyolOrder of orders) {
        try {
          // Check if order already exists in our system
          const existingOrder = await Order.findOne({
            where: {
              externalOrderId: trendyolOrder.orderNumber,
              platformType: this.platformType,
              connectionId: this.connectionId
            }
          });

          if (existingOrder) {
            // Update existing order
            await this.updateExistingOrder(existingOrder, trendyolOrder);
            stats.updated++;
          } else {
            // Create new order record
            await this.createNewOrder(trendyolOrder);
            stats.new++;
          }
        } catch (orderError) {
          logger.error(
            `Error processing Trendyol order: ${orderError.message}`,
            {
              error: orderError,
              orderNumber: trendyolOrder.orderNumber,
              connectionId: this.connectionId
            }
          );
          stats.failed++;
        }
      }

      return {
        success: true,
        message: `Synced ${stats.total} orders from Trendyol: ${stats.new} new, ${stats.updated} updated, ${stats.failed} failed`,
        data: stats
      };
    } catch (error) {
      logger.error(`Failed to sync orders from Trendyol: ${error.message}`, {
        error,
        connectionId: this.connectionId
      });

      return {
        success: false,
        message: `Failed to sync orders: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Update an existing order with data from Trendyol
   * @param {Object} existingOrder - Existing Order record
   * @param {Object} trendyolOrderData - Order data from Trendyol API
   * @returns {Promise<Object>} Updated order
   */
  async updateExistingOrder(existingOrder, trendyolOrderData) {
    const { PlatformData, OrderHistory } = require('../../../models');
    const transaction = await sequelize.transaction();

    try {
      // Get current platform data for comparison
      const currentPlatformData = await PlatformData.findOne({
        where: {
          entityId: existingOrder.id,
          entityType: 'order',
          platformType: this.platformType
        }
      });

      // Map Trendyol status to our internal status
      const oldStatus = existingorder.orderStatus;
      const newStatus = this.mapOrderStatus(trendyolOrderData.status);
      const statusChanged = oldStatus !== newStatus;

      // Update the main order record
      await existingOrder.update(
        {
          status: newStatus,
          paymentStatus: this.mapPaymentStatus(trendyolOrderData.status),
          lastSyncedAt: new Date()
        },
        { transaction }
      );

      // Update or create the platform-specific data
      if (currentPlatformData) {
        await currentPlatformData.update(
          {
            data: trendyolOrderData,
            status: trendyolOrderData.status,
            lastSyncedAt: new Date()
          },
          { transaction }
        );
      } else {
        // If somehow platform data doesn't exist, create it
        await PlatformData.create(
          {
            entityId: existingOrder.id,
            entityType: 'order',
            platformType: this.platformType,
            platformEntityId: trendyolOrderData.orderNumber,
            data: trendyolOrderData,
            status: trendyolOrderData.status,
            lastSyncedAt: new Date()
          },
          { transaction }
        );
      }

      // Track order status change in history if status changed
      if (statusChanged) {
        await OrderHistory.create(
          {
            orderId: existingOrder.id,
            changeType: 'status',
            fieldName: 'status',
            oldValue: oldStatus,
            newValue: newStatus,
            source: 'trendyol',
            notes: `Order status changed from ${oldStatus} to ${newStatus}`,
            metadata: { trendyolStatus: trendyolOrderData.status }
          },
          { transaction }
        );
      }

      await transaction.commit();

      logger.debug(
        `Updated order ${existingOrder.externalOrderId} from Trendyol`
      );
      return existingOrder;
    } catch (error) {
      await transaction.rollback();

      logger.error(`Failed to update order: ${error.message}`, {
        error,
        orderId: existingOrder.id,
        externalOrderId: existingOrder.externalOrderId
      });

      throw error;
    }
  }

  /**
   * Create a new order from Trendyol data
   * @param {Object} trendyolOrderData - Order data from Trendyol API
   * @returns {Promise<Object>} Created order
   */
  async createNewOrder(trendyolOrderData) {
    const {
      Order,
      OrderItem,
      ShippingDetail,
      PlatformData,
      PlatformAttribute
    } = require('../../../models');
    const transaction = await sequelize.transaction();

    try {
      // Map Trendyol order data to our internal order structure
      const orderData = this.mapTrendyolOrderToInternal(trendyolOrderData);

      // Create main order record
      const order = await Order.create(
        {
          ...orderData,
          platformType: this.platformType,
          connectionId: this.connectionId,
          userId: this.userId,
          lastSyncedAt: new Date()
        },
        { transaction }
      );

      // Create order items
      if (trendyolOrderData.lines && Array.isArray(trendyolOrderData.lines)) {
        for (const line of trendyolOrderData.lines) {
          await OrderItem.create(
            {
              orderId: order.id,
              productId: null, // Will be linked to product later if found
              sku: line.merchantSku || line.barcode,
              name: line.productName,
              barcode: line.barcode,
              quantity: line.quantity,
              unitPrice: line.price,
              totalPrice: line.amount,
              currency: orderData.currency,
              metadata: {
                lineId: line.id,
                vatRate: line.vatRate,
                discount: line.discount,
                platformSpecific: line
              }
            },
            { transaction }
          );
        }
      }

      // Create shipping details if available
      if (trendyolOrderData.shipmentAddress) {
        await ShippingDetail.create(
          {
            orderId: order.id,
            recipientName: trendyolOrderData.shipmentAddress.fullName,
            phone:
              trendyolOrderData.shipmentAddress.phone ||
              orderData.customerPhone,
            addressLine1: trendyolOrderData.shipmentAddress.address,
            city: trendyolOrderData.shipmentAddress.city,
            state: trendyolOrderData.shipmentAddress.district,
            postalCode: trendyolOrderData.shipmentAddress.postalCode,
            country: trendyolOrderData.shipmentAddress.countryCode || 'TR',
            instructions: trendyolOrderData.shipmentAddress.address2 || '',
            carrierName: trendyolOrderData.cargoProviderName,
            trackingNumber: trendyolOrderData.cargoTrackingNumber,
            shippingMethod: trendyolOrderData.deliveryType || 'standard'
          },
          { transaction }
        );
      }

      // Create platform data record
      await PlatformData.create(
        {
          entityId: order.id,
          entityType: 'order',
          platformType: this.platformType,
          platformEntityId: trendyolOrderData.orderNumber,
          data: trendyolOrderData,
          status: trendyolOrderData.status,
          lastSyncedAt: new Date()
        },
        { transaction }
      );

      // Create searchable attributes for easier querying
      if (trendyolOrderData.cargoTrackingNumber) {
        await PlatformAttribute.create(
          {
            entityId: order.id,
            entityType: 'order',
            platformType: this.platformType,
            attributeKey: 'trackingNumber',
            stringValue: trendyolOrderData.cargoTrackingNumber,
            valueType: 'string'
          },
          { transaction }
        );
      }

      await transaction.commit();

      logger.debug(`Created new order ${order.externalOrderId} from Trendyol`);
      return order;
    } catch (error) {
      await transaction.rollback();

      logger.error(`Failed to create order: ${error.message}`, {
        error,
        orderNumber: trendyolOrderData.orderNumber
      });

      throw error;
    }
  }

  /**
   * Map Trendyol order data to our internal order structure
   * @param {Object} trendyolOrder - Order data from Trendyol API
   * @returns {Object} Mapped order data
   */
  mapTrendyolOrderToInternal(trendyolOrder) {
    // Extract customer information
    const customerName =
      trendyolOrder.customerFirstName && trendyolOrder.customerLastName
        ? `${trendyolOrder.customerFirstName} ${trendyolOrder.customerLastName}`
        : trendyolOrder.shipmentAddress?.fullName || 'Unknown Customer';

    // Calculate total amount
    const totalAmount =
      trendyolOrder.totalPrice ||
      trendyolOrder.lines?.reduce((sum, line) => sum + line.amount, 0) ||
      0;

    return {
      externalOrderId: trendyolOrder.orderNumber.toString(),
      customerName: customerName,
      customerEmail: trendyolOrder.customerEmail || null,
      customerPhone: trendyolOrder.shipmentAddress?.phone || null,
      orderDate: new Date(trendyolOrder.orderDate),
      totalAmount: totalAmount,
      currency: 'TRY', // Trendyol operates in Turkish Lira
      status: this.mapOrderStatus(trendyolorder.orderStatus),
      paymentMethod: trendyolOrder.paymentType || 'other',
      paymentStatus: this.mapPaymentStatus(trendyolorder.orderStatus),
      shippingMethod: trendyolOrder.deliveryType || 'standard',
      notes: trendyolOrder.note || ''
    };
  }

  /**
   * Map Trendyol order status to our internal status
   * @param {string} trendyolStatus - Status from Trendyol API
   * @returns {string} Internal status
   */
  mapOrderStatus(trendyolStatus) {
    // Use the status mapping utility
    return getStatusMapping('order', trendyolStatus);
  }

  /**
   * Map Trendyol order status to payment status
   * @param {string} trendyolStatus - Status from Trendyol API
   * @returns {string} Internal payment status
   */
  mapPaymentStatus(trendyolStatus) {
    // Payment is generally considered completed in Trendyol once order is created
    // unless it's canceled or returned
    const cancelledStatuses = [
      'Cancelled',
      'Returned',
      'UndeliveredAndReturned'
    ];

    if (cancelledStatuses.includes(trendyolStatus)) {
      return 'refunded';
    }

    return 'completed';
  }

  /**
   * Sync products from Trendyol to our database using the generic platform data model
   * @param {Object} params - Query parameters for product fetching
   * @returns {Promise<Object>} Result of the sync operation
   */
  async syncProducts(params = {}) {
    try {
      const {
        Product,
        PlatformData,
        PlatformAttribute
      } = require('../../../models');
      const defaultUserId = process.env.DEFAULT_USER_ID || this.userId;

      // Fetch products from Trendyol
      const result = await this.fetchProducts(params);

      if (!result.success) {
        return {
          success: false,
          message: `Failed to fetch products from Trendyol: ${result.message}`,
          error: result.error
        };
      }

      const products = result.data;

      // Statistics for reporting
      const stats = {
        total: products.length,
        new: 0,
        updated: 0,
        skipped: 0,
        failed: 0
      };

      // Process each product
      for (const trendyolProduct of products) {
        try {
          // Check if product already exists in our system by external ID
          const externalProductId =
            trendyolProduct.productCode || trendyolProduct.id.toString();

          // Find existing platform data for this product
          const existingPlatformData = await PlatformData.findOne({
            where: {
              platformType: this.platformType,
              entityType: 'product',
              platformEntityId: externalProductId
            },
            include: [
              {
                model: Product,
                as: 'Product'
              }
            ]
          });

          if (existingPlatformData) {
            // Update existing product
            await this.updateExistingProduct(
              existingPlatformData,
              trendyolProduct
            );
            stats.updated++;
          } else {
            // Create new product record
            await this.createNewProduct(trendyolProduct, defaultUserId);
            stats.new++;
          }
        } catch (productError) {
          logger.error(
            `Error processing Trendyol product: ${productError.message}`,
            {
              error: productError,
              productId: trendyolProduct.productCode || trendyolProduct.id,
              connectionId: this.connectionId
            }
          );
          stats.failed++;
        }
      }

      return {
        success: true,
        message: `Synced ${stats.total} products from Trendyol: ${stats.new} new, ${stats.updated} updated, ${stats.failed} failed`,
        data: stats
      };
    } catch (error) {
      logger.error(`Failed to sync products from Trendyol: ${error.message}`, {
        error,
        connectionId: this.connectionId
      });

      return {
        success: false,
        message: `Failed to sync products: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Update an existing product with data from Trendyol
   * @param {Object} existingPlatformData - Existing PlatformData record
   * @param {Object} trendyolProductData - Product data from Trendyol API
   * @returns {Promise<Object>} Updated product
   */
  async updateExistingProduct(existingPlatformData, trendyolProductData) {
    const {
      Product,
      PlatformData,
      PlatformAttribute,
      ProductPriceHistory
    } = require('../../../models');
    const transaction = await sequelize.transaction();

    try {
      const mainProduct = existingPlatformData.Product;

      if (mainProduct) {
        // Check if price has changed
        const currentPrice = parseFloat(mainProduct.price);
        const newPrice =
          parseFloat(trendyolProductData.listPrice) || currentPrice;
        const priceChanged = currentPrice !== newPrice;

        // Update main product record
        await mainProduct.update(
          {
            name: trendyolProductData.title || mainProduct.name,
            description:
              trendyolProductData.description || mainProduct.description,
            price: newPrice,
            barcode: trendyolProductData.barcode || mainProduct.barcode,
            mainImageUrl:
              trendyolProductData.images &&
              trendyolProductData.images.length > 0
                ? trendyolProductData.images[0]
                : mainProduct.mainImageUrl,
            additionalImages:
              trendyolProductData.images &&
              trendyolProductData.images.length > 1
                ? trendyolProductData.images.slice(1)
                : mainProduct.additionalImages
          },
          { transaction }
        );

        // Record price history if price changed
        if (priceChanged) {
          await ProductPriceHistory.create(
            {
              productId: mainProduct.id,
              platformType: this.platformType,
              changeSource: 'trendyol_sync',
              previousPrice: currentPrice,
              newPrice: newPrice,
              priceChange: newPrice - currentPrice,
              currency: 'TRY',
              priceType: 'regular',
              reason: 'Platform price update',
              effectiveDate: new Date()
            },
            { transaction }
          );
        }
      }

      // Update platform-specific data
      await existingPlatformData.update(
        {
          data: trendyolProductData,
          status: trendyolProductData.onSale ? 'active' : 'inactive',
          approvalStatus: trendyolProductData.approved ? 'approved' : 'pending',
          platformPrice: trendyolProductData.listPrice,
          platformQuantity: trendyolProductData.quantity,
          hasError: trendyolProductData.hasError || false,
          errorMessage: trendyolProductData.errorMessage,
          lastSyncedAt: new Date()
        },
        { transaction }
      );

      // Update searchable attributes
      await this.updateProductAttributes(
        existingPlatformData.entityId,
        trendyolProductData,
        transaction
      );

      await transaction.commit();

      logger.debug(
        `Updated product ${existingPlatformData.platformEntityId} from Trendyol`
      );
      return existingPlatformData;
    } catch (error) {
      await transaction.rollback();

      logger.error(`Failed to update product: ${error.message}`, {
        error,
        productId: existingPlatformData.platformEntityId
      });

      throw error;
    }
  }

  /**
   * Create a new product from Trendyol data
   * @param {Object} trendyolProductData - Product data from Trendyol API
   * @param {string} userId - User ID to associate with the product
   * @returns {Promise<Object>} Created product
   */
  async createNewProduct(trendyolProductData, userId) {
    const {
      Product,
      PlatformData,
      PlatformAttribute
    } = require('../../../models');
    const transaction = await sequelize.transaction();

    try {
      // Create main product record
      const product = await Product.create(
        {
          userId: userId,
          sku: trendyolProductData.stockCode || trendyolProductData.barcode,
          name: trendyolProductData.title,
          description: trendyolProductData.description,
          price: trendyolProductData.listPrice || 0,
          currency: 'TRY',
          barcode: trendyolProductData.barcode,
          sourcePlatform: 'trendyol',
          mainImageUrl:
            trendyolProductData.images && trendyolProductData.images.length > 0
              ? trendyolProductData.images[0]
              : null,
          additionalImages:
            trendyolProductData.images && trendyolProductData.images.length > 1
              ? trendyolProductData.images.slice(1)
              : null,
          attributes: trendyolProductData.attributes,
          hasVariants:
            trendyolProductData.variants &&
            trendyolProductData.variants.length > 0,
          metadata: {
            source: 'trendyol',
            externalProductId:
              trendyolProductData.productCode || trendyolProductData.id
          }
        },
        { transaction }
      );

      // Create platform data record
      const externalProductId =
        trendyolProductData.productCode || trendyolProductData.id.toString();
      const platformData = await PlatformData.create(
        {
          entityId: product.id,
          entityType: 'product',
          platformType: this.platformType,
          platformEntityId: externalProductId,
          data: trendyolProductData,
          status: trendyolProductData.onSale ? 'active' : 'inactive',
          approvalStatus: trendyolProductData.approved ? 'approved' : 'pending',
          platformPrice: trendyolProductData.listPrice,
          platformQuantity: trendyolProductData.quantity,
          hasError: trendyolProductData.hasError || false,
          errorMessage: trendyolProductData.errorMessage,
          lastSyncedAt: new Date()
        },
        { transaction }
      );

      // Create searchable attributes
      await this.createProductAttributes(
        product.id,
        trendyolProductData,
        transaction
      );

      await transaction.commit();

      logger.debug(
        `Created new product ${platformData.platformEntityId} from Trendyol`
      );
      return { product, platformData };
    } catch (error) {
      await transaction.rollback();

      logger.error(`Failed to create product: ${error.message}`, {
        error,
        productData: {
          title: trendyolProductData.title,
          productCode: trendyolProductData.productCode,
          id: trendyolProductData.id
        }
      });

      throw error;
    }
  }

  /**
   * Create searchable attributes for a product
   * @param {string} productId - Product ID
   * @param {Object} trendyolProductData - Product data from Trendyol API
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<void>}
   */
  async createProductAttributes(productId, trendyolProductData, transaction) {
    const { PlatformAttribute } = require('../../../models');
    const attributes = [];

    // Add important attributes for searching
    if (trendyolProductData.barcode) {
      attributes.push({
        attributeKey: 'barcode',
        stringValue: trendyolProductData.barcode,
        valueType: 'string'
      });
    }

    if (trendyolProductData.stockCode) {
      attributes.push({
        attributeKey: 'stockCode',
        stringValue: trendyolProductData.stockCode,
        valueType: 'string'
      });
    }

    if (trendyolProductData.categoryId) {
      attributes.push({
        attributeKey: 'categoryId',
        stringValue: String(trendyolProductData.categoryId),
        valueType: 'string'
      });
    }

    if (trendyolProductData.brandId) {
      attributes.push({
        attributeKey: 'brandId',
        stringValue: String(trendyolProductData.brandId),
        valueType: 'string'
      });
    }

    // Create each attribute
    for (const attr of attributes) {
      await PlatformAttribute.create(
        {
          entityId: productId,
          entityType: 'product',
          platformType: this.platformType,
          ...attr
        },
        { transaction }
      );
    }
  }

  /**
   * Update searchable attributes for a product
   * @param {string} productId - Product ID
   * @param {Object} trendyolProductData - Product data from Trendyol API
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<void>}
   */
  async updateProductAttributes(productId, trendyolProductData, transaction) {
    const { PlatformAttribute } = require('../../../models');

    // Delete existing attributes
    await PlatformAttribute.destroy({
      where: {
        entityId: productId,
        entityType: 'product',
        platformType: this.platformType
      },
      transaction
    });

    // Create new attributes
    await this.createProductAttributes(
      productId,
      trendyolProductData,
      transaction
    );
  }
}

module.exports = TrendyolServiceGeneric;
