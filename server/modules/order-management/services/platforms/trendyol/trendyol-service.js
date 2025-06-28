// src/services/platforms/trendyol/trendyol-service.js

const axios = require("axios");
const BasePlatformService = require("../BasePlatformService");
const {
  Order,
  OrderItem,
  User,
  PlatformConnection,
  ShippingDetail,
} = require("../../../../../models");
const { Op } = require("sequelize");
const sequelize = require("../../../../../config/database");
const logger = require("../../../../../utils/logger");
const { mapOrderStatus } = require("../../../../../utils/enum-validators");

// Constants for Trendyol API endpoints and configurations
const TRENDYOL_API = {
  BASE_URL: "https://api.trendyol.com/sapigw",
  INTEGRATION_URL: "https://api.trendyol.com/sapigw/integration",
  SUPPLIERS_URL: "https://api.trendyol.com/sapigw/suppliers",
  // New recommended API endpoints from documentation
  NEW_BASE_URL: "https://apigw.trendyol.com",
  ENDPOINTS: {
    // Old endpoints (deprecated but still functional)
    ORDERS: "/suppliers/{supplierId}/orders",
    ORDER_BY_ID: "/suppliers/{supplierId}/orders/{orderNumber}",
    ORDER_SHIPMENT_PACKAGES:
      "/suppliers/{supplierId}/orders/{orderNumber}/shipment-packages",
    ORDER_STATUS_UPDATE: "/suppliers/{supplierId}/orders/{orderNumber}/status",

    // New recommended endpoints from documentation
    NEW_ORDERS: "/integration/order/sellers/{sellerId}/orders",
    NEW_ORDER_BY_ID:
      "/integration/order/sellers/{sellerId}/orders/{orderNumber}",

    // Package status update endpoints - Official Trendyol API
    UPDATE_PACKAGE:
      "/integration/order/sellers/{sellerId}/shipment-packages/{packageId}",

    PRODUCTS: "/suppliers/{supplierId}/products",
    CLAIMS: "/suppliers/{supplierId}/claims",
    SETTLEMENT: "/suppliers/{supplierId}/settlements",
    BATCH_REQUEST: "/suppliers/{supplierId}/batch-requests",
    SHIPPING_PROVIDERS: "/shipment-providers",
  },
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
    this.apiUrl = "https://api.trendyol.com/sapigw";
    // Access logger through the base class
    this.logger = this.getLogger();
  }

  /**
   * Get the platform type
   * @returns {string} Platform type identifier
   */
  getPlatformType() {
    return "trendyol";
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
   * Setup Axios instance with appropriate headers and config
   * Implementation of abstract method from BasePlatformService
   */
  async setupAxiosInstance() {
    try {
      const credentials = this.decryptCredentials(this.connection.credentials);
      const { apiKey, apiSecret, supplierId } = credentials;

      // Validate required credentials
      if (!apiKey || !apiSecret || !supplierId) {
        const missingFields = [];
        if (!apiKey) missingFields.push('apiKey');
        if (!apiSecret) missingFields.push('apiSecret');
        if (!supplierId) missingFields.push('supplierId');
        
        this.logger.error('Missing required Trendyol credentials', {
          missingFields,
          connectionId: this.connectionId
        });
        
        throw new Error(
          `Missing required Trendyol credentials. API key, API secret, and supplier ID are all required. Missing: ${missingFields.join(', ')}`
        );
      }

      // Format the auth credentials according to Trendyol's requirements
      const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

      const axios = require("axios");
      this.axiosInstance = axios.create({
        baseURL: TRENDYOL_API.BASE_URL,
        headers: {
          Authorization: `Basic ${authString}`,
          "Content-Type": "application/json",
          "User-Agent": `${supplierId} - SelfIntegration`, // Fixed: Required format by Trendyol API docs
        },
        timeout: 30000,
      });

      this.logger.info('Trendyol Axios instance setup completed successfully', {
        baseURL: TRENDYOL_API.BASE_URL,
        timeout: 30000,
        supplierId: supplierId ? `${supplierId}`.substring(0, 4) + '****' : 'N/A',
        userAgent: `${supplierId} - SelfIntegration`
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to setup Trendyol Axios instance', {
        error: error.message,
        stack: error.stack,
        connectionId: this.connectionId
      });
      throw error;
    }
  }

  /**
   * Override decryptCredentials for Trendyol-specific format
   * @param {string|object} encryptedCredentials
   * @returns {object} Decrypted credentials
   */
  decryptCredentials(encryptedCredentials) {
    this.logger.debug('Decrypting Trendyol credentials', {
      credentialsType: typeof encryptedCredentials,
      connectionId: this.connectionId
    });

    try {
      const credentials = super.decryptCredentials(encryptedCredentials);

      const decryptedCredentials = {
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        supplierId: credentials.supplierId, // Changed from sellerId to supplierId
        // Support legacy sellerId field for backward compatibility
        sellerId: credentials.sellerId || credentials.supplierId,
      };

      return decryptedCredentials;
    } catch (error) {
      this.logger.error(
        `Failed to decrypt Trendyol credentials: ${error.message}`,
        { 
          error: error.message,
          stack: error.stack,
          connectionId: this.connectionId,
          credentialsType: typeof encryptedCredentials
        }
      );
      throw new Error("Failed to decrypt credentials");
    }
  }

  /**
   * Test connection to Trendyol - override to implement Trendyol-specific test
   * @returns {Promise<Object>}} Test result
   */
  async testConnection() {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);

      // Check if supplierId exists in the credentials
      if (!credentials.supplierId && !credentials.sellerId) {
        return {
          success: false,
          message: "Connection failed: Supplier ID is missing from credentials",
          error: "Missing required parameter: supplierId",
        };
      }

      const supplierId = credentials.supplierId || credentials.sellerId;
      this.logger.debug(
        `Testing Trendyol connection for supplierId: ${supplierId}`
      );

      try {
        // Use timestamp format (milliseconds since epoch) as required by Trendyol API
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const now = new Date();

        // Convert to timestamp format (milliseconds since epoch)
        const startDate = yesterday.getTime();
        const endDate = now.getTime();

        this.logger.debug(`Using timestamp range: ${startDate} to ${endDate}`);

        // Test the connection with timestamp formatting
        const response = await this.axiosInstance.get(
          `/suppliers/${supplierId}/orders`,
          {
            params: {
              startDate,
              endDate,
              page: 0,
              size: 1,
            },
          }
        );

        this.logger.debug(`Connection test successful`);

        return {
          success: true,
          message: "Connection successful",
          data: {
            platform: "trendyol",
            connectionId: this.connectionId,
            status: "active",
            supplierId: supplierId,
          },
        };
      } catch (requestError) {
        this.logger.error("Trendyol API request failed", {
          error: requestError.message,
          status: requestError.response?.status,
          data: requestError.response?.data,
        });

        let errorMessage = requestError.message;
        const errorData = requestError.response?.data;

        if (errorData) {
          if (typeof errorData === "object" && errorData.errors) {
            errorMessage = errorData.errors.join(", ");
          } else if (typeof errorData === "object" && errorData.message) {
            errorMessage = errorData.message;
          } else if (typeof errorData === "string") {
            errorMessage = errorData;
          }
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      this.logger.error(`Trendyol connection test failed: ${error.message}`, {
        error,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  async fetchOrders(params = {}) {
    try {
      await this.initialize();

      // Check if this is a request for all orders (no specific page requested)
      const fetchAllPages = true;

      if (fetchAllPages) {
        return await this.fetchAllOrdersInternal(params);
      }

      // Single page fetch
      return await this.fetchSinglePage(params);
    } catch (error) {
      this.logger.error(
        `Failed to fetch orders from Trendyol: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to fetch orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
      };
    }
  }

  /**
   * Fetch a single page of orders from Trendyol
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing order data for single page
   */
  async fetchSinglePage(params = {}) {
    const credentials = this.decryptCredentials(this.connection.credentials);
    const supplierId = credentials.supplierId || credentials.sellerId;

    // Use timestamp format for Trendyol API (GMT +3 as specified in documentation)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 7); // Default to 1 week as per documentation

    // Convert to timestamp format (milliseconds since epoch) - GMT +3
    const startDate = params.startDate
      ? new Date(params.startDate).getTime()
      : defaultStartDate.getTime();

    const endDate = params.endDate
      ? new Date(params.endDate).getTime()
      : defaultEndDate.getTime();

    // Default parameters as per Trendyol API documentation
    const defaultParams = {
      startDate: startDate,
      endDate: endDate,
      page: params.page || 0,
      size: Math.min(params.size || 50, 200), // Max 200 as per documentation
      orderByField: "PackageLastModifiedDate", // Required by documentation
      orderByDirection: "DESC", // Recommended by documentation
    };

    const queryParams = { ...defaultParams, ...params };

    // Add status filter if provided (official status values only)
    if (params.status) {
      const validStatuses = [
        "Created",
        "Picking",
        "Invoiced",
        "Shipped",
        "Cancelled",
        "Delivered",
        "UnDelivered",
        "Returned",
        "AtCollectionPoint",
        "UnPacked",
        "UnSupplied",
        "Awaiting",
      ];
      if (validStatuses.includes(params.status)) {
        queryParams.status = params.status;
      }
    }

    this.logger.debug(
      `Fetching Trendyol orders (single page) with params: ${JSON.stringify(
        queryParams
      )}`
    );

    const response = await this.retryRequest(() =>
      this.axiosInstance.get(`/suppliers/${supplierId}/orders`, {
        params: queryParams,
      })
    );

    // Handle response format
    let orders = [];
    if (response.data) {
      if (Array.isArray(response.data)) {
        orders = response.data;
      } else if (
        response.data.content &&
        Array.isArray(response.data.content)
      ) {
        orders = response.data.content;
      } else {
        return {
          success: false,
          message: "Unexpected response format from Trendyol API",
          error: "Invalid response format",
          data: [],
        };
      }
    }

    const pagination = {
      page:
        response.data.page !== undefined
          ? response.data.page
          : queryParams.page,
      size: response.data.size || queryParams.size,
      totalPages: response.data.totalPages || 1,
      totalElements: response.data.totalElements || orders.length,
    };

    this.logger.info(
      `Retrieved ${orders.length} orders from Trendyol (page ${
        pagination.page + 1
      }/${pagination.totalPages})`
    );

    const normalizeResult = await this.normalizeOrders(orders);

    return {
      success: true,
      message: `Successfully fetched ${normalizeResult.data.length} orders from Trendyol`,
      data: normalizeResult.data,
      stats: normalizeResult.stats,
      pagination,
    };
  }

  /**
   * Fetch all orders from Trendyol by looping through all pages (internal method)
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing all order data
   */
  async fetchAllOrdersInternal(params = {}) {
    const allOrders = [];
    let allStats = {
      total: 0,
      success: 0,
      updated: 0,
      skipped: 0,
    };

    let currentPage = 0;
    let totalPages = 1;
    let hasMorePages = true;

    this.logger.info("Starting to fetch all orders from Trendyol...");

    while (hasMorePages) {
      const pageParams = {
        //...params,
        page: currentPage,
        size: params.size || 200,
      };

      this.logger.debug(`Fetching Trendyol orders page ${currentPage + 1}...`);

      const result = await this.fetchSinglePage(pageParams);

      if (!result.success) {
        this.logger.error(
          `Failed to fetch page ${currentPage + 1}: ${result.message}`
        );
        break;
      }

      // Add orders from this page
      allOrders.push(...result.data);

      // Update stats
      if (result.stats) {
        allStats.total += result.stats.total || 0;
        allStats.success += result.stats.success || 0;
        allStats.updated += result.stats.updated || 0;
        allStats.skipped += result.stats.skipped || 0;
      }

      // Update pagination info
      if (result.pagination) {
        totalPages = result.pagination.totalPages;
        currentPage = result.pagination.page + 1;
        hasMorePages = currentPage < totalPages;

        this.logger.info(
          `Completed page ${
            result.pagination.page + 1
          }/${totalPages}, retrieved ${result.data.length} orders`
        );
      } else {
        // No pagination info, assume this is the only page
        hasMorePages = false;
      }

      // Safety check to prevent infinite loops
      if (currentPage > 1000) {
        this.logger.warn("Reached maximum page limit (1000), stopping");
        break;
      }
    }

    this.logger.info(
      `Completed fetching all orders from Trendyol: ${allOrders.length} total orders across ${currentPage} pages`
    );

    return {
      success: true,
      message: `Successfully fetched ${allOrders.length} orders from Trendyol across ${currentPage} pages`,
      data: allOrders,
      stats: allStats,
      pagination: {
        totalPages: currentPage,
        totalOrders: allOrders.length,
        fetchedAllPages: true,
      },
    };
  }

  async normalizeOrders(trendyolOrders) {
    const normalizedOrders = [];
    let successCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    try {
      // Get array of order numbers for efficient querying
      const orderNumbers = trendyolOrders.map((order) => order.orderNumber);

      // First query - fetch all orders matching our criteria
      const existingOrders = await Order.findAll({
        where: {
          connectionId: this.connectionId,
          externalOrderId: {
            [Op.in]: orderNumbers,
          },
        },
        include: [{ model: ShippingDetail, as: "shippingDetail" }],
      });

      // Map for fast lookups
      const existingOrdersMap = {};
      existingOrders.forEach((order) => {
        existingOrdersMap[order.externalOrderId] = order;
      });

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
              await existingOrder.update({
                orderStatus: this.mapOrderStatus(
                  order.status || order.shipmentPackageStatus
                ), // Fixed: prioritize main order status over package status

                // Update enhanced fields from Trendyol API
                isCommercial: order.commercial || false,
                isMicroExport: order.micro || false,
                fastDeliveryType: order.fastDeliveryType || null,
                deliveryType: order.deliveryType || "normal",
                deliveryAddressType: order.deliveryAddressType || "Shipment",
                isGiftBoxRequested: order.giftBoxRequested || false,
                etgbNo: order.etgbNo || null,
                etgbDate: order.etgbDate ? new Date(order.etgbDate) : null,
                is3pByTrendyol: order["3pByTrendyol"] || false,
                containsDangerousProduct:
                  order.containsDangerousProduct || false,
                identityNumber: order.identityNumber || null,

                // Update cargo information
                cargoTrackingNumber:
                  this.preserveCargoTrackingNumber(order.cargoTrackingNumber) ||
                  existingOrder.cargoTrackingNumber,
                cargoCompany:
                  order.cargoProviderName || existingOrder.cargoCompany,
                cargoTrackingUrl:
                  order.cargoTrackingLink || existingOrder.cargoTrackingUrl,

                rawData: JSON.stringify(order),
                lastSyncedAt: new Date(),
              });

              updatedCount++;
              successCount++; // Count updated orders as successful too
              normalizedOrders.push(existingOrder);
              continue;
            } catch (updateError) {
              this.logger.error(
                `Failed to update existing order ${order.orderNumber}: ${updateError.message}`,
                {
                  error: updateError.message,
                  stack: updateError.stack,
                  orderNumber: order.orderNumber,
                  connectionId: this.connectionId,
                }
              );

              skippedCount++;
              continue;
            }
          }

          // Order doesn't exist - create a new one
          try {
            this.logger.debug(`Creating new Trendyol order for ${order.orderNumber}`, {
              customerName: order.shipmentAddress?.fullName || 'Unknown',
              status: order.status,
              connectionId: this.connectionId
            });

            // Use findOrCreate for atomic upsert behavior
            const [normalizedOrder, created] = await Order.findOrCreate({
              where: {
                externalOrderId: order.orderNumber,
                connectionId: this.connectionId,
              },
              defaults: {
                externalOrderId: order.orderNumber,
                orderNumber: order.orderNumber,
                connectionId: this.connectionId,
                userId: this.connection.userId,
                customerName:
                  order.shipmentAddress?.fullName ||
                  `${order.customerFirstName || ""} ${
                    order.customerLastName || ""
                  }`.trim() ||
                  "Unknown Customer",
                customerEmail: order.customerEmail || "",
                customerPhone: phoneNumber || "",

                // Required JSON fields for database
                customerInfo: this.safeJsonStringify({
                  firstName: order.customerFirstName || "",
                  lastName: order.customerLastName || "",
                  email: order.customerEmail || "",
                  phone: phoneNumber || "",
                  fullName:
                    order.shipmentAddress?.fullName ||
                    `${order.customerFirstName || ""} ${
                      order.customerLastName || ""
                    }`.trim() ||
                    "Unknown Customer",
                }),
                shippingAddress: this.safeJsonStringify(
                  order.shipmentAddress || {}
                ),

                platform: this.getPlatformType(),
                platformType: this.getPlatformType(),
                platformOrderId: order.id, // shipmentPackageId from API
                platformId: this.connectionId,
                invoiceStatus: this.mapInvoiceStatus(order.status || "pending"),
                orderDate: new Date(order.orderDate), // GMT +3 timestamp
                orderStatus: this.mapOrderStatus(
                  order.status || order.shipmentPackageStatus
                ), // Fixed: prioritize main order status
                cargoTrackingNumber:
                  this.preserveCargoTrackingNumber(order.cargoTrackingNumber) ||
                  "",
                cargoCompany: order.cargoProviderName || "",
                cargoTrackingUrl: order.cargoTrackingLink || "",
                invoiceTotal: parseFloat(order.totalPrice) || 0,
                totalAmount: parseFloat(
                  order.totalPrice || order.grossAmount || 0
                ),
                currency: order.currencyCode || "TRY",
                notes: order.note || "",

                // Additional fields from Trendyol API documentation
                isCommercial: order.commercial || false, // Corporate order flag
                isMicroExport: order.micro || false, // Micro export order flag
                fastDeliveryType: order.fastDeliveryType || null, // Fast delivery type
                deliveryType: order.deliveryType || "normal", // Delivery type
                deliveryAddressType: order.deliveryAddressType || "Shipment", // Shipment or CollectionPoint
                isGiftBoxRequested: order.giftBoxRequested || false, // Gift box request
                etgbNo: order.etgbNo || null, // ETGB number for micro export
                etgbDate: order.etgbDate ? new Date(order.etgbDate) : null, // ETGB date
                is3pByTrendyol: order["3pByTrendyol"] || false, // 3P by Trendyol flag
                containsDangerousProduct:
                  order.containsDangerousProduct || false, // Dangerous product flag
                identityNumber: order.identityNumber || null, // TCKN for high-value orders

                rawData: JSON.stringify(order),
                lastSyncedAt: new Date(),
              },
            });

            if (created) {
              this.logger.info(`Successfully created new Trendyol order`, {
                orderNumber: order.orderNumber,
                orderId: normalizedOrder.id,
                connectionId: this.connectionId
              });
            } else {
              this.logger.debug(
                `Found existing order for ${order.orderNumber}, skipping creation but updating order items`
              );
            }

            // Create shipping detail and order items in a transaction
            await sequelize.transaction(async (t) => {
              // Create shipping detail with orderId
              const shippingDetail = await ShippingDetail.create(
                {
                  orderId: normalizedOrder.id,
                  recipientName:
                    order.shipmentAddress?.fullName ||
                    order.customerFirstName + " " + order.customerLastName ||
                    "",
                  address: order.shipmentAddress?.address1 || "",
                  city: order.shipmentAddress?.city || "",
                  state: order.shipmentAddress?.district || "",
                  postalCode: order.shipmentAddress?.postalCode || "",
                  country: order.shipmentAddress?.countryCode || "TR",
                  phone: phoneNumber || "",
                  email: order.customerEmail || "",
                },
                { transaction: t }
              );

              // Update the order with the shipping detail ID
              await normalizedOrder.update(
                { shippingDetailId: shippingDetail.id },
                { transaction: t }
              );

              // Create order items with enhanced product information
              // Handle order items - only create if this is a new order or if items don't exist
              if (order.lines && Array.isArray(order.lines)) {
                // Check if order items already exist for this order
                const existingItemsCount = await OrderItem.count({
                  where: { orderId: normalizedOrder.id },
                  transaction: t,
                });

                // Only create order items if they don't exist
                if (existingItemsCount === 0) {
                  // Prepare order items data with comprehensive field mapping
                  const orderItemsData = order.lines.map((item) => {
                    const unitPrice = parseFloat(item.price) || 0;
                    const quantity = parseInt(item.quantity) || 1;
                    const totalPrice = unitPrice * quantity;

                    return {
                      orderId: normalizedOrder.id,
                      productId: null, // Will be set by linking service
                      platformProductId: item.productCode || "",
                      title: item.productName || "Unknown Product",
                      sku:
                        item.merchantSku || item.sku || item.productCode || "",
                      quantity: quantity,
                      price: unitPrice,
                      totalPrice: totalPrice, // Required NOT NULL field
                      currency:
                        item.currencyCode || order.currencyCode || "TRY",
                      barcode: item.barcode || "",

                      // Enhanced discount calculation including Trendyol discounts
                      discount:
                        parseFloat(item.discount || 0) +
                        parseFloat(item.tyDiscount || 0),
                      platformDiscount: parseFloat(item.tyDiscount || 0), // Trendyol platform discount
                      merchantDiscount: parseFloat(item.discount || 0), // Merchant discount

                      invoiceTotal: parseFloat(item.amount) || totalPrice,

                      // Product attributes from API
                      productSize: item.productSize || null,
                      productColor: item.productColor || null,
                      productCategoryId: item.productCategoryId || null,
                      productOrigin: item.productOrigin || null, // Important for micro export orders
                      salesCampaignId: item.salesCampaignId || null,

                      // Order line status
                      lineItemStatus: item.orderLineItemStatusName || null,

                      // VAT information
                      vatBaseAmount: parseFloat(item.vatBaseAmount || 0),
                      laborCost: parseFloat(item.laborCost || 0),

                      // Fast delivery options
                      fastDeliveryOptions: item.fastDeliveryOptions
                        ? JSON.stringify(item.fastDeliveryOptions)
                        : null,

                      // Discount details breakdown
                      discountDetails: item.discountDetails
                        ? JSON.stringify(item.discountDetails)
                        : null,

                      variantInfo: item.variantFeatures
                        ? JSON.stringify(item.variantFeatures)
                        : null,
                      rawData: JSON.stringify(item),
                    };
                  });

                  // Try to link products before creating order items
                  try {
                    const ProductOrderLinkingService = require("../../../../../services/product-order-linking-service");
                    const linkingService = new ProductOrderLinkingService();
                    const linkedItemsData =
                      await linkingService.linkIncomingOrderItems(
                        orderItemsData,
                        this.connection?.userId
                      );

                    // Create order items with potential product links
                    for (const itemData of linkedItemsData) {
                      await OrderItem.create(itemData, { transaction: t });
                    }

                    // Log linking results
                    const linkedCount = linkedItemsData.filter(
                      (item) => item.productId
                    ).length;
                    if (linkedCount > 0) {
                      this.logger.info(
                        `Linked ${linkedCount}/${linkedItemsData.length} order items to products for order ${order.orderNumber}`
                      );
                    }
                  } catch (linkingError) {
                    // If linking fails, create order items without product links
                    this.logger.warn(
                      `Product linking failed for order ${order.orderNumber}: ${linkingError.message}`
                    );
                    for (const itemData of orderItemsData) {
                      await OrderItem.create(itemData, { transaction: t });
                    }
                  }
                } else {
                  this.logger.debug(
                    `Order items already exist for order ${order.orderNumber}, skipping creation`
                  );
                }
              }

              // Create platform-specific Trendyol order record if the method exists
              try {
                await this.createTrendyolOrderRecord(
                  normalizedOrder.id,
                  order,
                  t
                );
              } catch (trendyolRecordError) {
                // Log but don't fail the transaction if TrendyolOrder creation fails
                this.logger.warn(
                  `Failed to create TrendyolOrder record: ${trendyolRecordError.message}`,
                  { orderNumber: order.orderNumber }
                );
              }
            });

            // Add the normalized order to our results
            normalizedOrders.push(normalizedOrder);
            successCount++;

            this.logger.debug(
              `Successfully created new order for ${order.orderNumber}`
            );
          } catch (error) {
            this.logger.error(
              `Failed to process order ${order.orderNumber}: ${error.original.message}`,
              { orderId: order.orderNumber, error: error }
            );
            failedCount++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to normalize order ${order.orderNumber}: ${error.original.message}`,
            { orderId: order.orderNumber, error: error }
          );
          skippedCount++;
        }
      }

      return {
        success: true,
        message: `Successfully processed ${successCount} orders (${
          successCount - updatedCount
        } new, ${updatedCount} updated, ${skippedCount} skipped)`,
        data: normalizedOrders,
        stats: {
          total: trendyolOrders.length,
          success: successCount,
          updated: updatedCount,
          skipped: skippedCount,
          new: successCount - updatedCount,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to normalize orders: ${error.message}`, {
        error,
        connectionId: this.connectionId,
      });
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
        phoneNumber = this.extractPhoneNumber(order) || "";

        // Add extra defensive check to ensure phoneNumber is a string
        if (phoneNumber === undefined || phoneNumber === null) {
          phoneNumber = "";
        }
      }

      // First, ensure the order doesn't already exist
      const existingOrder = await Order.findOne({
        where: {
          connectionId: this.connectionId,
          externalOrderId: order.orderNumber,
        },
      });

      if (existingOrder) {
        // Update it instead
        await existingOrder.update({
          orderStatus: this.mapOrderStatus(
            order.status || order.shipmentPackageStatus
          ), // Fixed: prioritize main order status

          // Update enhanced fields from Trendyol API
          isCommercial: order.commercial || false,
          isMicroExport: order.micro || false,
          fastDeliveryType: order.fastDeliveryType || null,
          deliveryType: order.deliveryType || "normal",
          deliveryAddressType: order.deliveryAddressType || "Shipment",
          isGiftBoxRequested: order.giftBoxRequested || false,
          etgbNo: order.etgbNo || null,
          etgbDate: order.etgbDate ? new Date(order.etgbDate) : null,
          is3pByTrendyol: order["3pByTrendyol"] || false,
          containsDangerousProduct: order.containsDangerousProduct || false,
          identityNumber: order.identityNumber || null,

          rawData: JSON.stringify(order),
          lastSyncedAt: new Date(),
        });

        return {
          success: true,
          message: "Order updated in manual create method",
          order: existingOrder,
        };
      }

      // Create the order with correct field names
      const newOrder = await Order.create({
        externalOrderId: order.orderNumber,
        orderNumber: order.orderNumber, // Add orderNumber field
        connectionId: this.connectionId,
        userId: userId,
        orderDate: order.orderDate
          ? new Date(parseInt(order.orderDate))
          : new Date(),
        orderStatus: this.mapOrderStatus(
          order.status || order.shipmentPackageStatus
        ), // Fixed: prioritize main order status
        totalAmount: order.totalPrice,
        currency: order.currencyCode || "TRY",
        customerName: `${order.customerFirstName} ${order.customerLastName}`,
        customerEmail: order.customerEmail,
        customerPhone: phoneNumber,

        // Required JSON fields for database
        customerInfo: this.safeJsonStringify({
          firstName: order.customerFirstName || "",
          lastName: order.customerLastName || "",
          email: order.customerEmail || "",
          phone: phoneNumber || "",
          fullName: `${order.customerFirstName} ${order.customerLastName}`,
        }),
        shippingAddress: this.safeJsonStringify(order.shipmentAddress || {}),

        cargoCompany: order.cargoProviderName || "",
        cargoTrackingNumber: this.preserveCargoTrackingNumber(
          order.cargoTrackingNumber
        ),
        cargoTrackingUrl: order.cargoTrackingLink || "",
        platform: this.getPlatformType(),
        platformType: platformType,
        platformOrderId: order.id || order.orderNumber, // Use shipmentPackageId if available
        platformId: this.connectionId,
        invoiceStatus: this.mapInvoiceStatus(order.status || "pending"),

        // Enhanced fields from Trendyol API documentation
        isCommercial: order.commercial || false,
        isMicroExport: order.micro || false,
        fastDeliveryType: order.fastDeliveryType || null,
        deliveryType: order.deliveryType || "normal",
        deliveryAddressType: order.deliveryAddressType || "Shipment",
        isGiftBoxRequested: order.giftBoxRequested || false,
        etgbNo: order.etgbNo || null,
        etgbDate: order.etgbDate ? new Date(order.etgbDate) : null,
        is3pByTrendyol: order["3pByTrendyol"] || false,
        containsDangerousProduct: order.containsDangerousProduct || false,
        identityNumber: order.identityNumber || null,

        notes: order.note || "",
        rawData: JSON.stringify(order),
        lastSyncedAt: new Date(),
      });

      // Create shipping detail with orderId
      const shippingDetail = await ShippingDetail.create({
        orderId: newOrder.id,
        recipientName: `${order.shipmentAddress.firstName} ${order.shipmentAddress.lastName}`,
        address: order.shipmentAddress.address1 || "",
        city: order.shipmentAddress.city,
        state: order.shipmentAddress.district,
        postalCode: order.shipmentAddress.postalCode,
        country: "Turkey",
        phone: phoneNumber,
        email: order.customerEmail || "",
        shippingMethod: order.cargoProviderName,
      });

      // Update order with shipping detail ID
      await newOrder.update({
        shippingDetailId: shippingDetail.id,
      });

      // Create platform-specific order data
      await this.createTrendyolOrderRecord(newOrder.id, order);

      // Create order items with product linking and all enhanced fields
      const orderItemsData = order.lines.map((item) => {
        const unitPrice = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        const totalPrice = unitPrice * quantity;

        return {
          orderId: newOrder.id,
          productId: null, // Will be set by linking service
          platformProductId: item.productCode || "",
          title: item.productName || "Unknown Product",
          sku: item.merchantSku || item.sku || item.productCode || "",
          quantity: quantity,
          price: unitPrice,
          totalPrice: totalPrice, // Required NOT NULL field
          currency: item.currencyCode || order.currencyCode || "TRY",
          barcode: item.barcode || "",

          // Enhanced discount calculation including Trendyol discounts
          discount:
            parseFloat(item.discount || 0) + parseFloat(item.tyDiscount || 0),
          platformDiscount: parseFloat(item.tyDiscount || 0), // Trendyol platform discount
          merchantDiscount: parseFloat(item.discount || 0), // Merchant discount

          invoiceTotal: parseFloat(item.amount) || totalPrice,

          // Product attributes from API
          productSize: item.productSize || null,
          productColor: item.productColor || null,
          productCategoryId: item.productCategoryId || null,
          productOrigin: item.productOrigin || null, // Important for micro export orders
          salesCampaignId: item.salesCampaignId || null,

          // Order line status
          lineItemStatus: item.orderLineItemStatusName || null,

          // VAT information
          vatBaseAmount: parseFloat(item.vatBaseAmount || 0),
          laborCost: parseFloat(item.laborCost || 0),

          // Fast delivery options
          fastDeliveryOptions: item.fastDeliveryOptions
            ? JSON.stringify(item.fastDeliveryOptions)
            : null,

          // Discount details breakdown
          discountDetails: item.discountDetails
            ? JSON.stringify(item.discountDetails)
            : null,

          variantInfo: item.variantFeatures
            ? JSON.stringify(item.variantFeatures)
            : null,
          rawData: JSON.stringify(item),
        };
      });

      // Try to link products before creating order items
      try {
        const ProductOrderLinkingService = require("../../../../../services/product-order-linking-service");
        const linkingService = new ProductOrderLinkingService();
        const linkedItemsData = await linkingService.linkIncomingOrderItems(
          orderItemsData,
          this.connection?.userId
        );

        // Create order items with potential product links
        for (const itemData of linkedItemsData) {
          await OrderItem.create(itemData);
        }

        // Log linking results
        const linkedCount = linkedItemsData.filter(
          (item) => item.productId
        ).length;
        if (linkedCount > 0) {
          this.logger.info(
            `Linked ${linkedCount}/${linkedItemsData.length} order items to products for order ${order.orderNumber}`
          );
        }
      } catch (linkingError) {
        // If linking fails, create order items without product links
        this.logger.warn(
          `Product linking failed for order ${order.orderNumber}: ${linkingError.message}`
        );
        for (const itemData of orderItemsData) {
          await OrderItem.create(itemData);
        }
      }

      return {
        success: true,
        message: "Order created successfully in manual create method",
        order: newOrder,
      };
    } catch (error) {
      // Handle known DB errors by returning existing order without error log
      if (
        error.name === "SequelizeUniqueConstraintError" ||
        error.name === "SequelizeValidationError"
      ) {
        const existed = await Order.findOne({
          where: {
            connectionId: this.connectionId,
            externalOrderId: order.orderNumber,
          },
        });
        if (existed) {
          return {
            success: true,
            message: "Order already exists, skipped creation",
            order: existed,
          };
        }
      }
      // Unexpected error - log and return failure
      this.logger.error(
        `Failed in manual creation attempt for ${order.orderNumber}: ${error.message}`,
        { error, orderNumber: order.orderNumber }
      );
      return {
        success: false,
        message: `Failed in manual create: ${error.message}`,
        error,
      };
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

  // Preserve cargo tracking number as string to avoid scientific notation
  preserveCargoTrackingNumber(cargoTrackingNumber) {
    if (!cargoTrackingNumber) return null;

    // If it's already a string, return as-is
    if (typeof cargoTrackingNumber === "string") {
      return cargoTrackingNumber;
    }

    // If it's a number, check if it's in scientific notation
    if (typeof cargoTrackingNumber === "number") {
      // Convert to string using toFixed to avoid scientific notation
      if (cargoTrackingNumber > 1e15 || cargoTrackingNumber < -1e15) {
        return cargoTrackingNumber.toFixed(0);
      }
      return String(cargoTrackingNumber);
    }

    // Fallback to string conversion
    return String(cargoTrackingNumber);
  }

  /**
   * Map Trendyol order status to internal status
   * @param {String} trendyolStatus - Trendyol-specific status
   * @returns {String} Internal status
   */
  mapOrderStatus(trendyolStatus) {
    // Debug logging for status mapping
    if (process.env.NODE_ENV === "development") {
      this.logger.info(
        `Mapping Trendyol status: "${trendyolStatus}" (type: ${typeof trendyolStatus})`
      );
    }

    const statusMap = {
      // Official Trendyol Order Statuses from API documentation
      Awaiting: "pending", // Waiting for payment confirmation - do not process yet
      Created: "new", // New order created
      ReadyToShip: "new", // Ready to ship - new order awaiting acceptance
      Picking: "processing", // Being prepared/picked
      Invoiced: "processing", // Invoice created
      Shipped: "shipped", // In transit
      AtCollectionPoint: "shipped", // At pickup point (PUDO)
      Delivered: "delivered", // Successfully delivered
      Cancelled: "cancelled", // Cancelled orders
      UnDelivered: "failed", // Failed delivery
      Returned: "returned", // Returned to seller
      UnPacked: "processing", // Split package (being reprocessed)
      UnSupplied: "cancelled", // Unable to supply - cancelled

      // Legacy statuses (keep for backward compatibility)
      Created: "new",
      ReadyToShip: "new", // Fixed: ReadyToShip means new order awaiting acceptance
      Picking: "processing",
      Invoiced: "processing",
      Shipped: "shipped",
      InTransit: "in_transit",
      AtCollectionPoint: "shipped",
      Delivered: "delivered",
      Cancelled: "cancelled",
      UnDelivered: "failed",
      Returned: "returned",
      Refunded: "refunded",

      // Shipment Package Statuses (more granular)
      ReturnAccepted: "returned",
      InTransit: "in_transit",
      Processing: "processing",
      InProcess: "processing",
      ReadyForShipping: "processing",
      OnTheWay: "in_transit",
      DeliveredToCustomer: "delivered",

      // Turkish statuses that might come from API responses
      Hazırlanıyor: "new", // Being prepared - should show as "Yeni" (new)
      "Kargoya Verildi": "shipped",
      Kargoda: "in_transit",
      "Teslim Edildi": "delivered",
      "İptal Edildi": "cancelled",
      "İade Edildi": "returned",
      Beklemede: "pending",
      Onaylandı: "confirmed",
      Oluşturuldu: "new",
    };

    const mappedStatus = statusMap[trendyolStatus];

    // Log unknown statuses for investigation
    if (!mappedStatus && trendyolStatus) {
      this.logger.warn(
        `Unknown Trendyol order status encountered: ${trendyolStatus}`,
        {
          platformType: "trendyol",
          connectionId: this.connectionId,
          unmappedStatus: trendyolStatus,
        }
      );

      // Fall back to a reasonable default based on context
      if (trendyolStatus.toLowerCase().includes("cancel")) {
        return "cancelled";
      } else if (trendyolStatus.toLowerCase().includes("ship")) {
        return "shipped";
      } else if (trendyolStatus.toLowerCase().includes("deliver")) {
        return "delivered";
      } else if (trendyolStatus.toLowerCase().includes("return")) {
        return "returned";
      }

      return "unknown";
    }

    const finalStatus = mappedStatus || "unknown";

    // Debug logging for final result
    if (process.env.NODE_ENV === "development") {
      this.logger.info(
        `Trendyol status mapping result: "${trendyolStatus}" -> "${finalStatus}"`
      );
    }

    return finalStatus;
  }

  /**
   * Map internal status to Trendyol status
   * @param {string} internalStatus - Internal status
   * @returns {string} Trendyol status
   */
  mapToPlatformStatus(internalStatus) {
    const reverseStatusMap = {
      new: "Created",
      processing: "Picking",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
      returned: "Returned",
      failed: "UnDelivered",
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
        this.axiosInstance.put(
          `/suppliers/${sellerId}/orders/${order.externalOrderId}/status`,
          {
            status: trendyolStatus,
          }
        )
      );

      // Update local order status - Fixed: use orderStatus field
      await order.update({
        orderStatus: newStatus,
        lastSyncedAt: new Date(),
      });

      return {
        success: true,
        message: `Order status updated to ${newStatus}`,
        data: order,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update order status on Trendyol: ${error.message}`,
        { error, orderId, connectionId: this.connectionId }
      );

      return {
        success: false,
        message: `Failed to update order status: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Accept an order on Trendyol platform using the official package update API
   * Uses PUT /integration/order/sellers/{sellerId}/shipment-packages/{packageId} with status "Picking"
   * @param {string} externalOrderId - External order ID or package ID
   * @returns {Object} - Result of the acceptance operation
   */
  async acceptOrder(externalOrderId) {
    try {
      await this.initialize();
      const { sellerId } = this.decryptCredentials(this.connection.credentials);

      if (!externalOrderId) {
        throw new Error(
          "External order ID is required for Trendyol order acceptance"
        );
      }

      this.logger.info(`Trendyol order acceptance requested`, {
        externalOrderId,
        sellerId,
        connectionId: this.connectionId,
      });

      // Get order details to extract line items and package info
      const orderDetails = await this.getOrderDetailsForAcceptance(
        externalOrderId
      );

      if (
        !orderDetails ||
        !orderDetails.lines ||
        orderDetails.lines.length === 0
      ) {
        throw new Error("Order not found or has no line items");
      }

      // Extract line items in the format required by Trendyol
      const lines = orderDetails.lines.map((line) => ({
        lineId: line.id,
        quantity: line.quantity || 1,
      }));

      // Use the official Trendyol package update endpoint
      const packageId = orderDetails.id || externalOrderId;
      const endpoint = TRENDYOL_API.ENDPOINTS.UPDATE_PACKAGE.replace(
        "{sellerId}",
        sellerId
      ).replace("{packageId}", packageId);

      const requestData = {
        lines: lines,
        params: {},
        status: "Picking", // Official Trendyol status for order acceptance
      };

      // Use the new API base URL for the package update with proper authentication
      const response = await this.retryRequest(() =>
        this.axiosInstance.put(
          `${TRENDYOL_API.NEW_BASE_URL}${endpoint}`,
          requestData
        )
      );

      return {
        success: true,
        message: "Order accepted successfully on Trendyol (status: Picking)",
        data: response.data,
        externalOrderId,
        packageId,
        linesProcessed: lines.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to accept order on Trendyol: ${error.message}`,
        {
          error,
          externalOrderId,
          connectionId: this.connectionId,
          response: error.response?.data,
        }
      );

      return {
        success: false,
        message: `Failed to accept order: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Get order details needed for acceptance (line items and package info)
   * @param {string} externalOrderId - External order ID
   * @returns {Object} - Order details with line items
   */
  async getOrderDetailsForAcceptance(externalOrderId) {
    try {
      // First try to get details from the API
      const orderDetails = await this.getOrderById(externalOrderId);

      if (orderDetails && orderDetails.lines) {
        return {
          packageId: orderDetails.packageId || externalOrderId,
          lines: orderDetails.lines,
        };
      }

      // Fallback: get from local database
      const localOrder = await Order.findOne({
        where: {
          externalOrderId: externalOrderId.toString(),
          platform: "trendyol",
        },
        include: [
          {
            model: require("../../../../../models").OrderItem,
            as: "items",
          },
        ],
      });

      if (localOrder && localOrder.rawData) {
        const rawData = JSON.parse(localOrder.rawData);
        this.logger.info(
          `Using cached order data for Trendyol order ${externalOrderId}`
        );

        return {
          packageId: rawData.packageId || externalOrderId,
          lines:
            rawData.lines ||
            (localOrder.items || []).map((item) => ({
              lineId: item.platformProductId || item.id,
              quantity: item.quantity || 1,
            })),
        };
      }

      throw new Error("Could not retrieve order details for acceptance");
    } catch (error) {
      this.logger.error(
        `Failed to get order details for acceptance: ${error.message}`,
        {
          error,
          externalOrderId,
        }
      );
      throw error;
    }
  }

  /**
   * Fetch products from Trendyol
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing product data
   */
  async fetchProducts(params = {}) {
    // If a specific page is requested, fetch only that page
    if (params.page !== undefined && params.page !== null) {
      return this.fetchSingleProductPage(params);
    }

    // Otherwise, fetch all products across all pages
    return this.fetchAllProductsInternal(params);
  }

  /**
   * Fetch all products from Trendyol by looping through all pages (internal method)
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing all product data
   */
  async fetchAllProductsInternal(params = {}) {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);
      const supplierId = credentials.supplierId || credentials.sellerId;

      if (!supplierId) {
        this.logger.error(
          "Product fetch failed: Missing supplierId in credentials"
        );
        return {
          success: false,
          message:
            "Product fetch failed: Supplier ID is missing from credentials",
          error: "Missing required parameter: supplierId",
          data: [],
        };
      }

      const allProducts = [];
      let currentPage = 0;
      let totalPages = 1;
      let hasMorePages = true;

      this.logger.info("Starting to fetch all products from Trendyol...");

      while (hasMorePages) {
        const pageParams = {
          ...params,
          page: currentPage,
          size: params.size || 1000,
        };

        this.logger.debug(
          `Fetching Trendyol products page ${currentPage + 1}...`
        );

        const result = await this.fetchSingleProductPage(pageParams);

        if (!result.success) {
          this.logger.error(
            `Failed to fetch page ${currentPage + 1}: ${result.message}`
          );
          break;
        }

        // Add products from this page
        allProducts.push(...result.data);

        // Update pagination info
        if (result.pagination) {
          totalPages = result.pagination.totalPages;
          currentPage = result.pagination.page + 1;
          hasMorePages = currentPage < totalPages;

          this.logger.info(
            `Completed page ${
              result.pagination.page + 1
            }/${totalPages}, retrieved ${result.data.length} products`
          );
        } else {
          // No pagination info, assume this is the only page
          hasMorePages = false;
        }

        // Safety check to prevent infinite loops
        if (currentPage > 1000) {
          this.logger.warn("Reached maximum page limit (1000), stopping");
          break;
        }
      }

      this.logger.info(
        `Completed fetching all products from Trendyol: ${allProducts.length} total products across ${currentPage} pages`
      );

      return {
        success: true,
        message: `Successfully fetched ${allProducts.length} products from Trendyol across ${currentPage} pages`,
        data: allProducts,
        pagination: {
          totalPages: currentPage,
          totalProducts: allProducts.length,
          fetchedAllPages: true,
        },
      };
    } catch (error) {
      const statusCode = error.response?.status;
      const apiError = error.response?.data;

      this.logger.error(
        `Failed to fetch all products from Trendyol: ${error.message}`,
        {
          error,
          statusCode,
          apiError,
          connectionId: this.connectionId,
        }
      );

      if (statusCode === 401 || statusCode === 403) {
        return {
          success: false,
          message: "Authentication failed. Please check your API credentials.",
          error: apiError || error.message,
          data: [],
        };
      }

      return {
        success: false,
        message: `Failed to fetch all products: ${error.message}`,
        error: apiError || error.message,
        data: [],
      };
    }
  }

  /**
   * Fetch a single page of products from Trendyol
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing product data for single page
   */
  async fetchSingleProductPage(params = {}) {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);
      const supplierId = credentials.supplierId || credentials.sellerId;

      if (!supplierId) {
        this.logger.error(
          "Product fetch failed: Missing supplierId in credentials"
        );
        return {
          success: false,
          message:
            "Product fetch failed: Supplier ID is missing from credentials",
          error: "Missing required parameter: supplierId",
          data: [],
        };
      }

      const defaultParams = {
        size: 1000,
        page: 0,
      };

      const queryParams = { ...defaultParams, ...params };

      this.logger.debug(
        `Fetching Trendyol products (single page) with params: ${JSON.stringify(
          queryParams
        )}`
      );

      // Use correct endpoint for products
      const response = await this.retryRequest(() =>
        this.axiosInstance.get(`/suppliers/${supplierId}/products`, {
          params: queryParams,
        })
      );

      if (!response.data) {
        return {
          success: false,
          message: "No product data returned from Trendyol",
          data: [],
        };
      }

      const content = response.data.content || response.data;

      this.logger.info(
        `Successfully fetched ${content.length} products from Trendyol (page ${
          queryParams.page + 1
        }/${response.data.totalPages || "unknown"})`
      );

      return {
        success: true,
        message: `Successfully fetched ${content.length} products from Trendyol`,
        data: content,
        pagination: response.data.totalPages
          ? {
              page: response.data.number || queryParams.page,
              size: response.data.size || queryParams.size,
              totalPages: response.data.totalPages || 1,
              totalElements: response.data.totalElements || content.length,
              isFirst: response.data.number === 0,
              isLast: response.data.last || false,
              hasNext: !response.data.last,
              hasPrevious: response.data.number > 0,
            }
          : undefined,
      };
    } catch (error) {
      const statusCode = error.response?.status;
      const apiError = error.response?.data;

      this.logger.error(
        `Failed to fetch products from Trendyol: ${error.message}`,
        {
          error,
          statusCode,
          apiError,
          connectionId: this.connectionId,
        }
      );

      if (statusCode === 401 || statusCode === 403) {
        return {
          success: false,
          message: "Authentication failed. Please check your API credentials.",
          error: apiError || error.message,
          data: [],
        };
      }

      return {
        success: false,
        message: `Failed to fetch products: ${error.message}`,
        error: apiError || error.message,
        data: [],
      };
    }
  }

  /**
   * Sync products from Trendyol to our database
   * @param {Object} params - Query parameters for product fetching
   * @returns {Promise<Object>} Result of the sync operation
   */
  async syncProducts(params = {}) {
    try {
      const { Product, TrendyolProduct } = require("../../../../../models");
      const defaultUserId = process.env.DEFAULT_USER_ID || "1";

      // Fetch products from Trendyol
      const result = await this.fetchProducts(params);

      if (!result.success) {
        return {
          success: false,
          message: `Failed to fetch products from Trendyol: ${result.message}`,
          error: result.error,
        };
      }

      const products = result.data;

      // Statistics for reporting
      const stats = {
        total: products.length,
        new: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      };

      // Process each product
      for (const trendyolProduct of products) {
        try {
          // Check if product already exists in our system
          const externalProductId =
            trendyolProduct.productCode || trendyolProduct.id.toString();

          // Find existing Trendyol product details
          const existingTrendyolProduct = await TrendyolProduct.findOne({
            where: { externalProductId },
            include: [{ model: Product }],
          });

          if (existingTrendyolProduct) {
            // Update existing product
            await this.updateExistingProduct(
              existingTrendyolProduct,
              trendyolProduct
            );
            stats.updated++;
          } else {
            // Create new product record
            await this.createNewProduct(trendyolProduct, defaultUserId);
            stats.new++;
          }
        } catch (productError) {
          this.logger.error(
            `Error processing Trendyol product: ${productError.message}`,
            {
              error: productError,
              productId: trendyolProduct.productCode || trendyolProduct.id,
              connectionId: this.connectionId,
            }
          );
          stats.failed++;
        }
      }

      return {
        success: true,
        message: `Synced ${stats.total} products from Trendyol: ${stats.new} new, ${stats.updated} updated, ${stats.failed} failed`,
        data: stats,
      };
    } catch (error) {
      this.logger.error(
        `Failed to sync products from Trendyol: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to sync products: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Update an existing product with data from Trendyol
   * @param {Object} existingTrendyolProduct - Existing TrendyolProduct record
   * @param {Object} trendyolProductData - Product data from Trendyol API
   * @returns {Promise<Object>} Updated product
   */
  async updateExistingProduct(existingTrendyolProduct, trendyolProductData) {
    try {
      const mainProduct = existingTrendyolProduct.Product;

      // Transaction to ensure both records are updated together
      await sequelize.transaction(async (t) => {
        // Update main product record with latest data
        if (mainProduct) {
          await mainProduct.update(
            {
              name: trendyolProductData.title || mainProduct.name,
              description:
                trendyolProductData.description || mainProduct.description,
              price: trendyolProductData.listPrice || mainProduct.price,
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
                  : mainProduct.additionalImages,
            },
            { transaction: t }
          );
        }

        // Update Trendyol-specific product data
        await existingTrendyolProduct.update(
          {
            trendyolProductId: trendyolProductData.id.toString(),
            externalProductId:
              trendyolProductData.productCode ||
              trendyolProductData.id.toString(),
            barcode: trendyolProductData.barcode,
            stockCode: trendyolProductData.stockCode,
            title: trendyolProductData.title,
            brand: trendyolProductData.brand,
            brandId: trendyolProductData.brandId,
            categoryId: trendyolProductData.pimCategoryId,
            categoryName: trendyolProductData.categoryName,
            productCode: trendyolProductData.productCode,
            productContentId: trendyolProductData.productContentId,
            productMainId: trendyolProductData.productMainId,
            pimCategoryId: trendyolProductData.pimCategoryId,
            supplierId: trendyolProductData.supplierId,
            platformListingId: trendyolProductData.platformListingId,
            quantity: trendyolProductData.quantity || 0,
            listPrice: trendyolProductData.listPrice,
            salePrice: trendyolProductData.salePrice,
            vatRate: trendyolProductData.vatRate,
            dimensionalWeight: trendyolProductData.dimensionalWeight,
            description: trendyolProductData.description,
            stockUnitType: trendyolProductData.stockUnitType,
            productUrl: trendyolProductData.productUrl,
            createDateTime: trendyolProductData.createDateTime,
            lastUpdateDate: trendyolProductData.lastUpdateDate,
            images: trendyolProductData.images || [],
            attributes: trendyolProductData.attributes || [],
            approved: trendyolProductData.approved || false,
            rejected: trendyolProductData.rejected || false,
            archived: trendyolProductData.archived || false,
            blacklisted: trendyolProductData.blacklisted || false,
            locked: trendyolProductData.locked || false,
            onSale: trendyolProductData.onSale || false,
            hasHtmlContent: trendyolProductData.hasHtmlContent || false,
            hasActiveCampaign: trendyolProductData.hasActiveCampaign || false,
            rejectReasonDetails: trendyolProductData.rejectReasonDetails || [],
            status: trendyolProductData.approved ? "approved" : "pending",
            lastSyncedAt: new Date(),
            rawData: trendyolProductData,
          },
          { transaction: t }
        );
      });

      this.logger.debug(
        `Updated product ${existingTrendyolProduct.externalProductId} in database`
      );
      return existingTrendyolProduct;
    } catch (error) {
      this.logger.error(`Failed to update product: ${error.message}`, {
        error,
        productId: existingTrendyolProduct.externalProductId,
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
    try {
      const { Product, TrendyolProduct } = require("../../../../../models");

      // Transaction to ensure both records are created together
      const result = await sequelize.transaction(async (t) => {
        // Create main product record
        const mainProduct = await Product.create(
          {
            userId: userId,
            sku: trendyolProductData.stockCode || trendyolProductData.barcode,
            name: trendyolProductData.title,
            description: trendyolProductData.description,
            price: trendyolProductData.listPrice || 0,
            currency: "TRY",
            barcode: trendyolProductData.barcode,
            sourcePlatform: "trendyol",
            mainImageUrl:
              trendyolProductData.images &&
              trendyolProductData.images.length > 0
                ? trendyolProductData.images[0]
                : null,
            additionalImages:
              trendyolProductData.images &&
              trendyolProductData.images.length > 1
                ? trendyolProductData.images.slice(1)
                : null,
            attributes: trendyolProductData.attributes,
            hasVariants:
              trendyolProductData.variants &&
              trendyolProductData.variants.length > 0,
            metadata: {
              source: "trendyol",
              externalProductId:
                trendyolProductData.productCode || trendyolProductData.id,
            },
          },
          { transaction: t }
        );

        // Create Trendyol-specific product record
        const trendyolProduct = await TrendyolProduct.create(
          {
            productId: mainProduct.id,
            trendyolProductId: trendyolProductData.id.toString(),
            externalProductId:
              trendyolProductData.productCode ||
              trendyolProductData.id.toString(),
            barcode: trendyolProductData.barcode,
            stockCode: trendyolProductData.stockCode,
            title: trendyolProductData.title,
            brand: trendyolProductData.brand,
            brandId: trendyolProductData.brandId,
            categoryId: trendyolProductData.pimCategoryId,
            categoryName: trendyolProductData.categoryName,
            productCode: trendyolProductData.productCode,
            productContentId: trendyolProductData.productContentId,
            productMainId: trendyolProductData.productMainId,
            pimCategoryId: trendyolProductData.pimCategoryId,
            supplierId: trendyolProductData.supplierId,
            platformListingId: trendyolProductData.platformListingId,
            quantity: trendyolProductData.quantity || 0,
            listPrice: trendyolProductData.listPrice,
            salePrice: trendyolProductData.salePrice,
            vatRate: trendyolProductData.vatRate,
            dimensionalWeight: trendyolProductData.dimensionalWeight,
            description: trendyolProductData.description,
            stockUnitType: trendyolProductData.stockUnitType,
            productUrl: trendyolProductData.productUrl,
            createDateTime: trendyolProductData.createDateTime,
            lastUpdateDate: trendyolProductData.lastUpdateDate,
            images: trendyolProductData.images || [],
            attributes: trendyolProductData.attributes || [],
            approved: trendyolProductData.approved || false,
            rejected: trendyolProductData.rejected || false,
            archived: trendyolProductData.archived || false,
            blacklisted: trendyolProductData.blacklisted || false,
            locked: trendyolProductData.locked || false,
            onSale: trendyolProductData.onSale || false,
            hasHtmlContent: trendyolProductData.hasHtmlContent || false,
            hasActiveCampaign: trendyolProductData.hasActiveCampaign || false,
            rejectReasonDetails: trendyolProductData.rejectReasonDetails || [],
            status: trendyolProductData.approved ? "approved" : "pending",
            lastSyncedAt: new Date(),
            rawData: trendyolProductData,
          },
          { transaction: t }
        );

        return { mainProduct, trendyolProduct };
      });

      this.logger.debug(
        `Created new product ${result.trendyolProduct.externalProductId} in database`
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to create product: ${error.message}`, {
        error,
        productData: {
          title: trendyolProductData.title,
          productCode: trendyolProductData.productCode,
          id: trendyolProductData.id,
        },
      });
      throw error;
    }
  }

  /**
   * Create product(s) on Trendyol marketplace
   * @param {Object|Array} productData - Product data or array of products
   * @returns {Promise<Object>} Creation result with batchRequestId
   */
  async createProduct(productData) {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);
      const { supplierId } = credentials;

      // Ensure productData is in array format for Trendyol API
      const items = Array.isArray(productData) ? productData : [productData];

      // Validate maximum items limit
      if (items.length > 1000) {
        throw new Error("Maximum 1000 items allowed per request");
      }

      const endpoint = `/integration/product/sellers/${supplierId}/products`;
      const response = await this.axiosInstance.post(endpoint, { items });

      this.logger.info("Trendyol product creation initiated", {
        supplierId,
        itemCount: items.length,
        batchRequestId: response.data.batchRequestId,
      });

      return {
        success: true,
        batchRequestId: response.data.batchRequestId,
        message: `Product creation initiated for ${items.length} item(s)`,
        itemCount: items.length,
      };
    } catch (error) {
      this.logger.error(`Trendyol product creation failed: ${error.message}`, {
        error,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Product creation failed: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Get batch request result for tracking product creation status
   * @param {string} batchRequestId - Batch request ID from createProduct
   * @returns {Promise<Object>} Batch processing status and results
   */
  async getBatchRequestResult(batchRequestId) {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);
      const { supplierId } = credentials;

      const endpoint = `/integration/batch/sellers/${supplierId}/batch-requests/${batchRequestId}`;
      const response = await this.axiosInstance.get(endpoint);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get batch request result: ${error.message}`,
        {
          error,
          batchRequestId,
        }
      );

      return {
        success: false,
        message: `Failed to get batch request status: ${error.message}`,
        error: error.response?.data || error.message,
      };
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
        phoneNumber = this.extractPhoneNumber(order) || "";

        // Add extra defensive check to ensure phoneNumber is a string
        if (phoneNumber === undefined || phoneNumber === null) {
          phoneNumber = "";
        }
      }

      // First, ensure the order doesn't already exist
      const existingOrder = await Order.findOne({
        where: {
          connectionId: this.connectionId,
          externalOrderId: order.orderNumber,
        },
      });

      if (existingOrder) {
        // Update it instead
        await existingOrder.update({
          orderStatus: this.mapOrderStatus(
            order.status || order.shipmentPackageStatus
          ), // Fixed: prioritize main order status

          // Update enhanced fields from Trendyol API
          isCommercial: order.commercial || false,
          isMicroExport: order.micro || false,
          fastDeliveryType: order.fastDeliveryType || null,
          deliveryType: order.deliveryType || "normal",
          deliveryAddressType: order.deliveryAddressType || "Shipment",
          isGiftBoxRequested: order.giftBoxRequested || false,
          etgbNo: order.etgbNo || null,
          etgbDate: order.etgbDate ? new Date(order.etgbDate) : null,
          is3pByTrendyol: order["3pByTrendyol"] || false,
          containsDangerousProduct: order.containsDangerousProduct || false,
          identityNumber: order.identityNumber || null,

          rawData: JSON.stringify(order),
          lastSyncedAt: new Date(),
        });

        return {
          success: true,
          message: "Order updated in manual create method",
          order: existingOrder,
        };
      }

      // Create the order with correct field names
      const newOrder = await Order.create({
        externalOrderId: order.orderNumber,
        orderNumber: order.orderNumber, // Add orderNumber field
        connectionId: this.connectionId,
        userId: userId,
        orderDate: order.orderDate
          ? new Date(parseInt(order.orderDate))
          : new Date(),
        orderStatus: this.mapOrderStatus(
          order.status || order.shipmentPackageStatus
        ), // Fixed: prioritize main order status
        totalAmount: order.totalPrice,
        currency: order.currencyCode || "TRY",
        customerName: `${order.customerFirstName} ${order.customerLastName}`,
        customerEmail: order.customerEmail,
        customerPhone: phoneNumber,

        // Required JSON fields for database
        customerInfo: this.safeJsonStringify({
          firstName: order.customerFirstName || "",
          lastName: order.customerLastName || "",
          email: order.customerEmail || "",
          phone: phoneNumber || "",
          fullName: `${order.customerFirstName} ${order.customerLastName}`,
        }),
        shippingAddress: this.safeJsonStringify(order.shipmentAddress || {}),

        cargoCompany: order.cargoProviderName || "",
        cargoTrackingNumber: this.preserveCargoTrackingNumber(
          order.cargoTrackingNumber
        ),
        cargoTrackingUrl: order.cargoTrackingLink || "",
        platform: this.getPlatformType(),
        platformType: platformType,
        platformOrderId: order.id || order.orderNumber, // Use shipmentPackageId if available
        platformId: this.connectionId,
        invoiceStatus: this.mapInvoiceStatus(order.status || "pending"),

        // Enhanced fields from Trendyol API documentation
        isCommercial: order.commercial || false,
        isMicroExport: order.micro || false,
        fastDeliveryType: order.fastDeliveryType || null,
        deliveryType: order.deliveryType || "normal",
        deliveryAddressType: order.deliveryAddressType || "Shipment",
        isGiftBoxRequested: order.giftBoxRequested || false,
        etgbNo: order.etgbNo || null,
        etgbDate: order.etgbDate ? new Date(order.etgbDate) : null,
        is3pByTrendyol: order["3pByTrendyol"] || false,
        containsDangerousProduct: order.containsDangerousProduct || false,
        identityNumber: order.identityNumber || null,

        notes: order.note || "",
        rawData: JSON.stringify(order),
        lastSyncedAt: new Date(),
      });

      // Create shipping detail with orderId
      const shippingDetail = await ShippingDetail.create({
        orderId: newOrder.id,
        recipientName: `${order.shipmentAddress.firstName} ${order.shipmentAddress.lastName}`,
        address: order.shipmentAddress.address1 || "",
        city: order.shipmentAddress.city,
        state: order.shipmentAddress.district,
        postalCode: order.shipmentAddress.postalCode,
        country: "Turkey",
        phone: phoneNumber,
        email: order.customerEmail || "",
        shippingMethod: order.cargoProviderName,
      });

      // Update order with shipping detail ID
      await newOrder.update({
        shippingDetailId: shippingDetail.id,
      });

      // Create platform-specific order data
      await this.createTrendyolOrderRecord(newOrder.id, order);

      // Create order items with product linking and all enhanced fields
      const orderItemsData = order.lines.map((item) => {
        const unitPrice = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        const totalPrice = unitPrice * quantity;

        return {
          orderId: newOrder.id,
          productId: null, // Will be set by linking service
          platformProductId: item.productCode || "",
          title: item.productName || "Unknown Product",
          sku: item.merchantSku || item.sku || item.productCode || "",
          quantity: quantity,
          price: unitPrice,
          totalPrice: totalPrice, // Required NOT NULL field
          currency: item.currencyCode || order.currencyCode || "TRY",
          barcode: item.barcode || "",

          // Enhanced discount calculation including Trendyol discounts
          discount:
            parseFloat(item.discount || 0) + parseFloat(item.tyDiscount || 0),
          platformDiscount: parseFloat(item.tyDiscount || 0), // Trendyol platform discount
          merchantDiscount: parseFloat(item.discount || 0), // Merchant discount

          invoiceTotal: parseFloat(item.amount) || totalPrice,

          // Product attributes from API
          productSize: item.productSize || null,
          productColor: item.productColor || null,
          productCategoryId: item.productCategoryId || null,
          productOrigin: item.productOrigin || null, // Important for micro export orders
          salesCampaignId: item.salesCampaignId || null,

          // Order line status
          lineItemStatus: item.orderLineItemStatusName || null,

          // VAT information
          vatBaseAmount: parseFloat(item.vatBaseAmount || 0),
          laborCost: parseFloat(item.laborCost || 0),

          // Fast delivery options
          fastDeliveryOptions: item.fastDeliveryOptions
            ? JSON.stringify(item.fastDeliveryOptions)
            : null,

          // Discount details breakdown
          discountDetails: item.discountDetails
            ? JSON.stringify(item.discountDetails)
            : null,

          variantInfo: item.variantFeatures
            ? JSON.stringify(item.variantFeatures)
            : null,
          rawData: JSON.stringify(item),
        };
      });

      // Try to link products before creating order items
      try {
        const ProductOrderLinkingService = require("../../../../../services/product-order-linking-service");
        const linkingService = new ProductOrderLinkingService();
        const linkedItemsData = await linkingService.linkIncomingOrderItems(
          orderItemsData,
          this.connection?.userId
        );

        // Create order items with potential product links
        for (const itemData of linkedItemsData) {
          await OrderItem.create(itemData);
        }

        // Log linking results
        const linkedCount = linkedItemsData.filter(
          (item) => item.productId
        ).length;
        if (linkedCount > 0) {
          this.logger.info(
            `Linked ${linkedCount}/${linkedItemsData.length} order items to products for order ${order.orderNumber}`
          );
        }
      } catch (linkingError) {
        // If linking fails, create order items without product links
        this.logger.warn(
          `Product linking failed for order ${order.orderNumber}: ${linkingError.message}`
        );
        for (const itemData of orderItemsData) {
          await OrderItem.create(itemData);
        }
      }

      return {
        success: true,
        message: "Order created successfully in manual create method",
        order: newOrder,
      };
    } catch (error) {
      // Handle known DB errors by returning existing order without error log
      if (
        error.name === "SequelizeUniqueConstraintError" ||
        error.name === "SequelizeValidationError"
      ) {
        const existed = await Order.findOne({
          where: {
            connectionId: this.connectionId,
            externalOrderId: order.orderNumber,
          },
        });
        if (existed) {
          return {
            success: true,
            message: "Order already exists, skipped creation",
            order: existed,
          };
        }
      }
      // Unexpected error - log and return failure
      this.logger.error(
        `Failed in manual creation attempt for ${order.orderNumber}: ${error.message}`,
        { error, orderNumber: order.orderNumber }
      );
      return {
        success: false,
        message: `Failed in manual create: ${error.message}`,
        error,
      };
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

  // Preserve cargo tracking number as string to avoid scientific notation
  preserveCargoTrackingNumber(cargoTrackingNumber) {
    if (!cargoTrackingNumber) return null;

    // If it's already a string, return as-is
    if (typeof cargoTrackingNumber === "string") {
      return cargoTrackingNumber;
    }

    // If it's a number, check if it's in scientific notation
    if (typeof cargoTrackingNumber === "number") {
      // Convert to string using toFixed to avoid scientific notation
      if (cargoTrackingNumber > 1e15 || cargoTrackingNumber < -1e15) {
        return cargoTrackingNumber.toFixed(0);
      }
      return String(cargoTrackingNumber);
    }

    // Fallback to string conversion
    return String(cargoTrackingNumber);
  }

  /**
   * Map Trendyol order status to internal status
   * @param {String} trendyolStatus - Trendyol-specific status
   * @returns {String} Internal status
   */
  mapOrderStatus(trendyolStatus) {
    // Debug logging for status mapping
    if (process.env.NODE_ENV === "development") {
      this.logger.info(
        `Mapping Trendyol status: "${trendyolStatus}" (type: ${typeof trendyolStatus})`
      );
    }

    const statusMap = {
      // Official Trendyol Order Statuses from API documentation
      Awaiting: "pending", // Waiting for payment confirmation - do not process yet
      Created: "new", // New order created
      ReadyToShip: "new", // Ready to ship - new order awaiting acceptance
      Picking: "processing", // Being prepared/picked
      Invoiced: "processing", // Invoice created
      Shipped: "shipped", // In transit
      AtCollectionPoint: "shipped", // At pickup point (PUDO)
      Delivered: "delivered", // Successfully delivered
      Cancelled: "cancelled", // Cancelled orders
      UnDelivered: "failed", // Failed delivery
      Returned: "returned", // Returned to seller
      UnPacked: "processing", // Split package (being reprocessed)
      UnSupplied: "cancelled", // Unable to supply - cancelled

      // Legacy statuses (keep for backward compatibility)
      Created: "new",
      ReadyToShip: "new", // Fixed: ReadyToShip means new order awaiting acceptance
      Picking: "processing",
      Invoiced: "processing",
      Shipped: "shipped",
      InTransit: "in_transit",
      AtCollectionPoint: "shipped",
      Delivered: "delivered",
      Cancelled: "cancelled",
      UnDelivered: "failed",
      Returned: "returned",
      Refunded: "refunded",

      // Shipment Package Statuses (more granular)
      ReturnAccepted: "returned",
      InTransit: "in_transit",
      Processing: "processing",
      InProcess: "processing",
      ReadyForShipping: "processing",
      OnTheWay: "in_transit",
      DeliveredToCustomer: "delivered",

      // Turkish statuses that might come from API responses
      Hazırlanıyor: "new", // Being prepared - should show as "Yeni" (new)
      "Kargoya Verildi": "shipped",
      Kargoda: "in_transit",
      "Teslim Edildi": "delivered",
      "İptal Edildi": "cancelled",
      "İade Edildi": "returned",
      Beklemede: "pending",
      Onaylandı: "confirmed",
      Oluşturuldu: "new",
    };

    const mappedStatus = statusMap[trendyolStatus];

    // Log unknown statuses for investigation
    if (!mappedStatus && trendyolStatus) {
      this.logger.warn(
        `Unknown Trendyol order status encountered: ${trendyolStatus}`,
        {
          platformType: "trendyol",
          connectionId: this.connectionId,
          unmappedStatus: trendyolStatus,
        }
      );

      // Fall back to a reasonable default based on context
      if (trendyolStatus.toLowerCase().includes("cancel")) {
        return "cancelled";
      } else if (trendyolStatus.toLowerCase().includes("ship")) {
        return "shipped";
      } else if (trendyolStatus.toLowerCase().includes("deliver")) {
        return "delivered";
      } else if (trendyolStatus.toLowerCase().includes("return")) {
        return "returned";
      }

      return "unknown";
    }

    const finalStatus = mappedStatus || "unknown";

    // Debug logging for final result
    if (process.env.NODE_ENV === "development") {
      this.logger.info(
        `Trendyol status mapping result: "${trendyolStatus}" -> "${finalStatus}"`
      );
    }

    return finalStatus;
  }

  /**
   * Map internal status to Trendyol status
   * @param {string} internalStatus - Internal status
   * @returns {string} Trendyol status
   */
  mapToPlatformStatus(internalStatus) {
    const reverseStatusMap = {
      new: "Created",
      processing: "Picking",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
      returned: "Returned",
      failed: "UnDelivered",
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
        this.axiosInstance.put(
          `/suppliers/${sellerId}/orders/${order.externalOrderId}/status`,
          {
            status: trendyolStatus,
          }
        )
      );

      // Update local order status - Fixed: use orderStatus field
      await order.update({
        orderStatus: newStatus,
        lastSyncedAt: new Date(),
      });

      return {
        success: true,
        message: `Order status updated to ${newStatus}`,
        data: order,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update order status on Trendyol: ${error.message}`,
        { error, orderId, connectionId: this.connectionId }
      );

      return {
        success: false,
        message: `Failed to update order status: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Accept an order on Trendyol platform using the official package update API
   * Uses PUT /integration/order/sellers/{sellerId}/shipment-packages/{packageId} with status "Picking"
   * @param {string} externalOrderId - External order ID or package ID
   * @returns {Object} - Result of the acceptance operation
   */
  async acceptOrder(externalOrderId) {
    try {
      await this.initialize();
      const { sellerId } = this.decryptCredentials(this.connection.credentials);

      if (!externalOrderId) {
        throw new Error(
          "External order ID is required for Trendyol order acceptance"
        );
      }

      this.logger.info(`Trendyol order acceptance requested`, {
        externalOrderId,
        sellerId,
        connectionId: this.connectionId,
      });

      // Get order details to extract line items and package info
      const orderDetails = await this.getOrderDetailsForAcceptance(
        externalOrderId
      );

      if (
        !orderDetails ||
        !orderDetails.lines ||
        orderDetails.lines.length === 0
      ) {
        throw new Error("Order not found or has no line items");
      }

      // Extract line items in the format required by Trendyol
      const lines = orderDetails.lines.map((line) => ({
        lineId: line.id,
        quantity: line.quantity || 1,
      }));

      // Use the official Trendyol package update endpoint
      const packageId = orderDetails.id || externalOrderId;
      const endpoint = TRENDYOL_API.ENDPOINTS.UPDATE_PACKAGE.replace(
        "{sellerId}",
        sellerId
      ).replace("{packageId}", packageId);

      const requestData = {
        lines: lines,
        params: {},
        status: "Picking", // Official Trendyol status for order acceptance
      };

      // Use the new API base URL for the package update with proper authentication
      const response = await this.retryRequest(() =>
        this.axiosInstance.put(
          `${TRENDYOL_API.NEW_BASE_URL}${endpoint}`,
          requestData
        )
      );

      return {
        success: true,
        message: "Order accepted successfully on Trendyol (status: Picking)",
        data: response.data,
        externalOrderId,
        packageId,
        linesProcessed: lines.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to accept order on Trendyol: ${error.message}`,
        {
          error,
          externalOrderId,
          connectionId: this.connectionId,
          response: error.response?.data,
        }
      );

      return {
        success: false,
        message: `Failed to accept order: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Get order details needed for acceptance (line items and package info)
   * @param {string} externalOrderId - External order ID
   * @returns {Object} - Order details with line items
   */
  async getOrderDetailsForAcceptance(externalOrderId) {
    try {
      // First try to get details from the API
      const orderDetails = await this.getOrderById(externalOrderId);

      if (orderDetails && orderDetails.lines) {
        return {
          packageId: orderDetails.packageId || externalOrderId,
          lines: orderDetails.lines,
        };
      }

      // Fallback: get from local database
      const localOrder = await Order.findOne({
        where: {
          externalOrderId: externalOrderId.toString(),
          platform: "trendyol",
        },
        include: [
          {
            model: require("../../../../../models").OrderItem,
            as: "items",
          },
        ],
      });

      if (localOrder && localOrder.rawData) {
        const rawData = JSON.parse(localOrder.rawData);
        this.logger.info(
          `Using cached order data for Trendyol order ${externalOrderId}`
        );

        return {
          packageId: rawData.packageId || externalOrderId,
          lines:
            rawData.lines ||
            (localOrder.items || []).map((item) => ({
              lineId: item.platformProductId || item.id,
              quantity: item.quantity || 1,
            })),
        };
      }

      throw new Error("Could not retrieve order details for acceptance");
    } catch (error) {
      this.logger.error(
        `Failed to get order details for acceptance: ${error.message}`,
        {
          error,
          externalOrderId,
        }
      );
      throw error;
    }
  }

  /**
   * Fetch products from Trendyol
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing product data
   */
  async fetchProducts(params = {}) {
    // If a specific page is requested, fetch only that page
    if (params.page !== undefined && params.page !== null) {
      return this.fetchSingleProductPage(params);
    }

    // Otherwise, fetch all products across all pages
    return this.fetchAllProductsInternal(params);
  }

  /**
   * Fetch all products from Trendyol by looping through all pages (internal method)
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing all product data
   */
  async fetchAllProductsInternal(params = {}) {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);
      const supplierId = credentials.supplierId || credentials.sellerId;

      if (!supplierId) {
        this.logger.error(
          "Product fetch failed: Missing supplierId in credentials"
        );
        return {
          success: false,
          message:
            "Product fetch failed: Supplier ID is missing from credentials",
          error: "Missing required parameter: supplierId",
          data: [],
        };
      }

      const allProducts = [];
      let currentPage = 0;
      let totalPages = 1;
      let hasMorePages = true;

      this.logger.info("Starting to fetch all products from Trendyol...");

      while (hasMorePages) {
        const pageParams = {
          ...params,
          page: currentPage,
          size: params.size || 1000,
        };

        this.logger.debug(
          `Fetching Trendyol products page ${currentPage + 1}...`
        );

        const result = await this.fetchSingleProductPage(pageParams);

        if (!result.success) {
          this.logger.error(
            `Failed to fetch page ${currentPage + 1}: ${result.message}`
          );
          break;
        }

        // Add products from this page
        allProducts.push(...result.data);

        // Update pagination info
        if (result.pagination) {
          totalPages = result.pagination.totalPages;
          currentPage = result.pagination.page + 1;
          hasMorePages = currentPage < totalPages;

          this.logger.info(
            `Completed page ${
              result.pagination.page + 1
            }/${totalPages}, retrieved ${result.data.length} products`
          );
        } else {
          // No pagination info, assume this is the only page
          hasMorePages = false;
        }

        // Safety check to prevent infinite loops
        if (currentPage > 1000) {
          this.logger.warn("Reached maximum page limit (1000), stopping");
          break;
        }
      }

      this.logger.info(
        `Completed fetching all products from Trendyol: ${allProducts.length} total products across ${currentPage} pages`
      );

      return {
        success: true,
        message: `Successfully fetched ${allProducts.length} products from Trendyol across ${currentPage} pages`,
        data: allProducts,
        pagination: {
          totalPages: currentPage,
          totalProducts: allProducts.length,
          fetchedAllPages: true,
        },
      };
    } catch (error) {
      const statusCode = error.response?.status;
      const apiError = error.response?.data;

      this.logger.error(
        `Failed to fetch all products from Trendyol: ${error.message}`,
        {
          error,
          statusCode,
          apiError,
          connectionId: this.connectionId,
        }
      );

      if (statusCode === 401 || statusCode === 403) {
        return {
          success: false,
          message: "Authentication failed. Please check your API credentials.",
          error: apiError || error.message,
          data: [],
        };
      }

      return {
        success: false,
        message: `Failed to fetch all products: ${error.message}`,
        error: apiError || error.message,
        data: [],
      };
    }
  }

  /**
   * Fetch a single page of products from Trendyol
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing product data for single page
   */
  async fetchSingleProductPage(params = {}) {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);
      const supplierId = credentials.supplierId || credentials.sellerId;

      if (!supplierId) {
        this.logger.error(
          "Product fetch failed: Missing supplierId in credentials"
        );
        return {
          success: false,
          message:
            "Product fetch failed: Supplier ID is missing from credentials",
          error: "Missing required parameter: supplierId",
          data: [],
        };
      }

      const defaultParams = {
        size: 1000,
        page: 0,
      };

      const queryParams = { ...defaultParams, ...params };

      this.logger.debug(
        `Fetching Trendyol products (single page) with params: ${JSON.stringify(
          queryParams
        )}`
      );

      // Use correct endpoint for products
      const response = await this.retryRequest(() =>
        this.axiosInstance.get(`/suppliers/${supplierId}/products`, {
          params: queryParams,
        })
      );

      if (!response.data) {
        return {
          success: false,
          message: "No product data returned from Trendyol",
          data: [],
        };
      }

      const content = response.data.content || response.data;

      this.logger.info(
        `Successfully fetched ${content.length} products from Trendyol (page ${
          queryParams.page + 1
        }/${response.data.totalPages || "unknown"})`
      );

      return {
        success: true,
        message: `Successfully fetched ${content.length} products from Trendyol`,
        data: content,
        pagination: response.data.totalPages
          ? {
              page: response.data.number || queryParams.page,
              size: response.data.size || queryParams.size,
              totalPages: response.data.totalPages || 1,
              totalElements: response.data.totalElements || content.length,
              isFirst: response.data.number === 0,
              isLast: response.data.last || false,
              hasNext: !response.data.last,
              hasPrevious: response.data.number > 0,
            }
          : undefined,
      };
    } catch (error) {
      const statusCode = error.response?.status;
      const apiError = error.response?.data;

      this.logger.error(
        `Failed to fetch products from Trendyol: ${error.message}`,
        {
          error,
          statusCode,
          apiError,
          connectionId: this.connectionId,
        }
      );

      if (statusCode === 401 || statusCode === 403) {
        return {
          success: false,
          message: "Authentication failed. Please check your API credentials.",
          error: apiError || error.message,
          data: [],
        };
      }

      return {
        success: false,
        message: `Failed to fetch products: ${error.message}`,
        error: apiError || error.message,
        data: [],
      };
    }
  }

  /**
   * Create product(s) on Trendyol marketplace
   * @param {Object|Array} productData - Product data or array of products
   * @returns {Promise<Object>} Creation result with batchRequestId
   */
  async createProduct(productData) {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);
      const { supplierId } = credentials;

      // Ensure productData is in array format for Trendyol API
      const items = Array.isArray(productData) ? productData : [productData];

      // Validate maximum items limit
      if (items.length > 1000) {
        throw new Error("Maximum 1000 items allowed per request");
      }

      const endpoint = `/integration/product/sellers/${supplierId}/products`;
      const response = await this.axiosInstance.post(endpoint, { items });

      this.logger.info("Trendyol product creation initiated", {
        supplierId,
        itemCount: items.length,
        batchRequestId: response.data.batchRequestId,
      });

      return {
        success: true,
        batchRequestId: response.data.batchRequestId,
        message: `Product creation initiated for ${items.length} item(s)`,
        itemCount: items.length,
      };
    } catch (error) {
      this.logger.error(`Trendyol product creation failed: ${error.message}`, {
        error,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Product creation failed: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Get batch request result for tracking product creation status
   * @param {string} batchRequestId - Batch request ID from createProduct
   * @returns {Promise<Object>} Batch processing status and results
   */
  async getBatchRequestResult(batchRequestId) {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);
      const { supplierId } = credentials;

      const endpoint = `/integration/batch/sellers/${supplierId}/batch-requests/${batchRequestId}`;
      const response = await this.axiosInstance.get(endpoint);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get batch request result: ${error.message}`,
        {
          error,
          batchRequestId,
        }
      );

      return {
        success: false,
        message: `Failed to get batch request status: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Create product(s) on Trendyol marketplace
   * @param {Object|Array} productData - Product data or array of products
   * @returns {Promise<Object>} Creation result with batchRequestId
   */
  async createProduct(productData) {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);
      const { supplierId } = credentials;

      // Ensure productData is in array format for Trendyol API
      const items = Array.isArray(productData) ? productData : [productData];

      // Validate maximum items limit
      if (items.length > 1000) {
        throw new Error("Maximum 1000 items allowed per request");
      }

      const endpoint = `/integration/product/sellers/${supplierId}/products`;
      const response = await this.axiosInstance.post(endpoint, { items });

      this.logger.info("Trendyol product creation initiated", {
        supplierId,
        itemCount: items.length,
        batchRequestId: response.data.batchRequestId,
      });

      return {
        success: true,
        batchRequestId: response.data.batchRequestId,
        message: `Product creation initiated for ${items.length} item(s)`,
        itemCount: items.length,
      };
    } catch (error) {
      this.logger.error(`Trendyol product creation failed: ${error.message}`, {
        error,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Product creation failed: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Get batch request result for tracking product creation status
   * @param {string} batchRequestId - Batch request ID from createProduct
   * @returns {Promise<Object>} Batch processing status and results
   */
  async getBatchRequestResult(batchRequestId) {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);
      const { supplierId } = credentials;

      const endpoint = `/integration/batch/sellers/${supplierId}/batch-requests/${batchRequestId}`;
      const response = await this.axiosInstance.get(endpoint);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get batch request result: ${error.message}`,
        {
          error,
          batchRequestId,
        }
      );

      return {
        success: false,
        message: `Failed to get batch request status: ${error.message}`,
        error: error.response?.data || error.message,
      };
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
        phoneNumber = this.extractPhoneNumber(order) || "";

        // Add extra defensive check to ensure phoneNumber is a string
        if (phoneNumber === undefined || phoneNumber === null) {
          phoneNumber = "";
        }
      }

      // First, ensure the order doesn't already exist
      const existingOrder = await Order.findOne({
        where: {
          connectionId: this.connectionId,
          externalOrderId: order.orderNumber,
        },
      });

      if (existingOrder) {
        // Update it instead
        await existingOrder.update({
          orderStatus: this.mapOrderStatus(
            order.status || order.shipmentPackageStatus
          ), // Fixed: prioritize main order status

          // Update enhanced fields from Trendyol API
          isCommercial: order.commercial || false,
          isMicroExport: order.micro || false,
          fastDeliveryType: order.fastDeliveryType || null,
          deliveryType: order.deliveryType || "normal",
          deliveryAddressType: order.deliveryAddressType || "Shipment",
          isGiftBoxRequested: order.giftBoxRequested || false,
          etgbNo: order.etgbNo || null,
          etgbDate: order.etgbDate ? new Date(order.etgbDate) : null,
          is3pByTrendyol: order["3pByTrendyol"] || false,
          containsDangerousProduct: order.containsDangerousProduct || false,
          identityNumber: order.identityNumber || null,

          rawData: JSON.stringify(order),
          lastSyncedAt: new Date(),
        });

        return {
          success: true,
          message: "Order updated in manual create method",
          order: existingOrder,
        };
      }

      // Create the order with correct field names
      const newOrder = await Order.create({
        externalOrderId: order.orderNumber,
        orderNumber: order.orderNumber, // Add orderNumber field
        connectionId: this.connectionId,
        userId: userId,
        orderDate: order.orderDate
          ? new Date(parseInt(order.orderDate))
          : new Date(),
        orderStatus: this.mapOrderStatus(
          order.status || order.shipmentPackageStatus
        ), // Fixed: prioritize main order status
        totalAmount: order.totalPrice,
        currency: order.currencyCode || "TRY",
        customerName: `${order.customerFirstName} ${order.customerLastName}`,
        customerEmail: order.customerEmail,
        customerPhone: phoneNumber,

        // Required JSON fields for database
        customerInfo: this.safeJsonStringify({
          firstName: order.customerFirstName || "",
          lastName: order.customerLastName || "",
          email: order.customerEmail || "",
          phone: phoneNumber || "",
          fullName: `${order.customerFirstName} ${order.customerLastName}`,
        }),
        shippingAddress: this.safeJsonStringify(order.shipmentAddress || {}),

        cargoCompany: order.cargoProviderName || "",
        cargoTrackingNumber: this.preserveCargoTrackingNumber(
          order.cargoTrackingNumber
        ),
        cargoTrackingUrl: order.cargoTrackingLink || "",
        platform: this.getPlatformType(),
        platformType: platformType,
        platformOrderId: order.id || order.orderNumber, // Use shipmentPackageId if available
        platformId: this.connectionId,
        invoiceStatus: this.mapInvoiceStatus(order.status || "pending"),

        // Enhanced fields from Trendyol API documentation
        isCommercial: order.commercial || false,
        isMicroExport: order.micro || false,
        fastDeliveryType: order.fastDeliveryType || null,
        deliveryType: order.deliveryType || "normal",
        deliveryAddressType: order.deliveryAddressType || "Shipment",
        isGiftBoxRequested: order.giftBoxRequested || false,
        etgbNo: order.etgbNo || null,
        etgbDate: order.etgbDate ? new Date(order.etgbDate) : null,
        is3pByTrendyol: order["3pByTrendyol"] || false,
        containsDangerousProduct: order.containsDangerousProduct || false,
        identityNumber: order.identityNumber || null,

        notes: order.note || "",
        rawData: JSON.stringify(order),
        lastSyncedAt: new Date(),
      });

      // Create shipping detail with orderId
      const shippingDetail = await ShippingDetail.create({
        orderId: newOrder.id,
        recipientName: `${order.shipmentAddress.firstName} ${order.shipmentAddress.lastName}`,
        address: order.shipmentAddress.address1 || "",
        city: order.shipmentAddress.city,
        state: order.shipmentAddress.district,
        postalCode: order.shipmentAddress.postalCode,
        country: "Turkey",
        phone: phoneNumber,
        email: order.customerEmail || "",
        shippingMethod: order.cargoProviderName,
      });

      // Update order with shipping detail ID
      await newOrder.update({
        shippingDetailId: shippingDetail.id,
      });

      // Create platform-specific order data
      await this.createTrendyolOrderRecord(newOrder.id, order);

      // Create order items with product linking and all enhanced fields
      const orderItemsData = order.lines.map((item) => {
        const unitPrice = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        const totalPrice = unitPrice * quantity;

        return {
          orderId: newOrder.id,
          productId: null, // Will be set by linking service
          platformProductId: item.productCode || "",
          title: item.productName || "Unknown Product",
          sku: item.merchantSku || item.sku || item.productCode || "",
          quantity: quantity,
          price: unitPrice,
          totalPrice: totalPrice, // Required NOT NULL field
          currency: item.currencyCode || order.currencyCode || "TRY",
          barcode: item.barcode || "",

          // Enhanced discount calculation including Trendyol discounts
          discount:
            parseFloat(item.discount || 0) + parseFloat(item.tyDiscount || 0),
          platformDiscount: parseFloat(item.tyDiscount || 0), // Trendyol platform discount
          merchantDiscount: parseFloat(item.discount || 0), // Merchant discount

          invoiceTotal: parseFloat(item.amount) || totalPrice,

          // Product attributes from API
          productSize: item.productSize || null,
          productColor: item.productColor || null,
          productCategoryId: item.productCategoryId || null,
          productOrigin: item.productOrigin || null, // Important for micro export orders
          salesCampaignId: item.salesCampaignId || null,

          // Order line status
          lineItemStatus: item.orderLineItemStatusName || null,

          // VAT information
          vatBaseAmount: parseFloat(item.vatBaseAmount || 0),
          laborCost: parseFloat(item.laborCost || 0),

          // Fast delivery options
          fastDeliveryOptions: item.fastDeliveryOptions
            ? JSON.stringify(item.fastDeliveryOptions)
            : null,

          // Discount details breakdown
          discountDetails: item.discountDetails
            ? JSON.stringify(item.discountDetails)
            : null,

          variantInfo: item.variantFeatures
            ? JSON.stringify(item.variantFeatures)
            : null,
          rawData: JSON.stringify(item),
        };
      });

      // Try to link products before creating order items
      try {
        const ProductOrderLinkingService = require("../../../../../services/product-order-linking-service");
        const linkingService = new ProductOrderLinkingService();
        const linkedItemsData = await linkingService.linkIncomingOrderItems(
          orderItemsData,
          this.connection?.userId
        );

        // Create order items with potential product links
        for (const itemData of linkedItemsData) {
          await OrderItem.create(itemData);
        }

        // Log linking results
        const linkedCount = linkedItemsData.filter(
          (item) => item.productId
        ).length;
        if (linkedCount > 0) {
          this.logger.info(
            `Linked ${linkedCount}/${linkedItemsData.length} order items to products for order ${order.orderNumber}`
          );
        }
      } catch (linkingError) {
        // If linking fails, create order items without product links
        this.logger.warn(
          `Product linking failed for order ${order.orderNumber}: ${linkingError.message}`
        );
        for (const itemData of orderItemsData) {
          await OrderItem.create(itemData);
        }
      }

      return {
        success: true,
        message: "Order created successfully in manual create method",
        order: newOrder,
      };
    } catch (error) {
      // Handle known DB errors by returning existing order without error log
      if (
        error.name === "SequelizeUniqueConstraintError" ||
        error.name === "SequelizeValidationError"
      ) {
        const existed = await Order.findOne({
          where: {
            connectionId: this.connectionId,
            externalOrderId: order.orderNumber,
          },
        });
        if (existed) {
          return {
            success: true,
            message: "Order already exists, skipped creation",
            order: existed,
          };
        }
      }
      // Unexpected error - log and return failure
      this.logger.error(
        `Failed in manual creation attempt for ${order.orderNumber}: ${error.message}`,
        { error, orderNumber: order.orderNumber }
      );
      return {
        success: false,
        message: `Failed in manual create: ${error.message}`,
        error,
      };
    }
  }

  /**
   * Map Trendyol invoice status to our database enum values
   * @param {string} trendyolInvoiceStatus - The invoice status from Trendyol API
   * @returns {string} - Mapped invoice status for our database enum
   */
  mapInvoiceStatus(trendyolInvoiceStatus) {
    const invoiceStatusMap = {
      // Trendyol invoice statuses mapped to our enum values
      Created: "issued",
      Delivered: "issued",
      Shipped: "issued",
      Invoiced: "issued",
      Pending: "pending",
      Cancelled: "cancelled",
      Canceled: "cancelled",
      Draft: "pending",
      Processing: "pending",
      // Default fallback
      Unknown: "pending",
    };

    const mapped = invoiceStatusMap[trendyolInvoiceStatus] || "pending";

    if (process.env.NODE_ENV === "development") {
      this.logger.info(
        `Mapping Trendyol invoice status: "${trendyolInvoiceStatus}" -> "${mapped}"`
      );
    }

    return mapped;
  }

  /**
   * Safe JSON stringify that never returns null
   * @param {any} data - Data to stringify
   * @param {any} fallback - Fallback value if stringify fails
   * @returns {string} - JSON string, never null
   */
  safeJsonStringify(data, fallback = {}) {
    try {
      const result = JSON.stringify(data || fallback);
      return result === "null" || result === null
        ? JSON.stringify(fallback)
        : result;
    } catch (error) {
      this.logger.warn(
        `JSON stringify failed, using fallback: ${error.message}`
      );
      return JSON.stringify(fallback);
    }
  }
}

module.exports = TrendyolService;
