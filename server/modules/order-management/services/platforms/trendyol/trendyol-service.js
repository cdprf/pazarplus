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

// Constants for Trendyol API endpoints and configurations
const TRENDYOL_API = {
  BASE_URL: "https://api.trendyol.com/sapigw",
  INTEGRATION_URL: "https://api.trendyol.com/sapigw/integration",
  SUPPLIERS_URL: "https://api.trendyol.com/sapigw/suppliers",
  ENDPOINTS: {
    ORDERS: "/suppliers/{supplierId}/orders",
    ORDER_BY_ID: "/suppliers/{supplierId}/orders/{orderNumber}",
    ORDER_SHIPMENT_PACKAGES:
      "/suppliers/{supplierId}/orders/{orderNumber}/shipment-packages",
    ORDER_STATUS_UPDATE: "/suppliers/{supplierId}/orders/{orderNumber}/status",
    PRODUCTS: "/suppliers/{supplierId}/products", // Fixed: should be suppliers, not integration
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
    const credentials = this.decryptCredentials(this.connection.credentials);
    const { apiKey, apiSecret, supplierId } = credentials;

    // Validate required credentials
    if (!apiKey || !apiSecret || !supplierId) {
      throw new Error(
        "Missing required Trendyol credentials. API key, API secret, and supplier ID are all required."
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

    return true;
  }

  /**
   * Override decryptCredentials for Trendyol-specific format
   * @param {string|object} encryptedCredentials
   * @returns {object} Decrypted credentials
   */
  decryptCredentials(encryptedCredentials) {
    try {
      const credentials = super.decryptCredentials(encryptedCredentials);

      return {
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        supplierId: credentials.supplierId, // Changed from sellerId to supplierId
        // Support legacy sellerId field for backward compatibility
        sellerId: credentials.sellerId || credentials.supplierId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to decrypt Trendyol credentials: ${error.message}`,
        { error }
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

    // Use timestamp format for Trendyol API
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    // Convert to timestamp format (milliseconds since epoch)
    const startDate = params.startDate
      ? new Date(params.startDate).getTime()
      : defaultStartDate.getTime();

    const endDate = params.endDate
      ? new Date(params.endDate).getTime()
      : defaultEndDate.getTime();

    const defaultParams = {
      //startDate,
      //endDate,
      page: params.page || 0,
      size: params.size || 50,
      orderByField: "PackageLastModifiedDate",
      orderByDirection: "DESC",
    };

    const queryParams = { ...defaultParams, ...params };
    //queryParams.startDate = startDate;
    //queryParams.endDate = endDate;

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
                orderStatus: this.mapOrderStatus(order.status), // Fixed: use orderStatus
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
                  error: updateError,
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
            this.logger.debug(`Creating new order for ${order.orderNumber}`);

            const result = await sequelize.transaction(async (t) => {
              // Create shipping detail first
              const shippingDetail = await ShippingDetail.create(
                {
                  recipientName:
                    order.shipmentAddress?.fullName ||
                    order.customerFirstName + " " + order.customerLastName ||
                    "",
                  address1: order.shipmentAddress?.address1 || "",
                  address2: order.shipmentAddress?.address2 || "",
                  city: order.shipmentAddress?.city || "",
                  state: order.shipmentAddress?.district || "",
                  postalCode: order.shipmentAddress?.postalCode || "",
                  country: order.shipmentAddress?.countryCode || "TR",
                  phone: phoneNumber || "",
                  email: order.customerEmail || "",
                },
                { transaction: t }
              );

              // Create the order record with correct fields
              const normalizedOrder = await Order.create(
                {
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
                  platform: this.getPlatformType(),
                  platformType: this.getPlatformType(),
                  platformOrderId: order.id, // Add platformOrderId field
                  platformId: this.connectionId, // Add platformId field
                  shippingAddress: order.shipmentAddress.fullAddress || {},
                  shippingDetailId: shippingDetail.id,
                  invoiceStatus: order.status || "pending", // Use eInvoiceStatus
                  orderDate: new Date(order.orderDate),
                  orderStatus: this.mapOrderStatus(order.status),
                  totalAmount: parseFloat(
                    order.totalPrice || order.grossAmount || 0
                  ),
                  currency: order.currency || "TRY",
                  notes: order.note || "",
                  rawData: JSON.stringify(order),
                  lastSyncedAt: new Date(),
                },
                { transaction: t }
              );

              // Create order items with product linking
              if (order.lines && Array.isArray(order.lines)) {
                // Prepare order items data
                const orderItemsData = order.lines.map((item) => ({
                  orderId: normalizedOrder.id,
                  productId: null, // Will be set by linking service
                  platformProductId: item.productCode || "",
                  title: item.productName || "Unknown Product",
                  sku: item.merchantSku || item.productCode || "",
                  quantity: parseInt(item.quantity) || 1,
                  price: parseFloat(item.price) || 0,
                  currency: "TRY",
                  barcode: item.barcode || "",
                  discount: parseFloat(item.discount) + (item.tyDiscount || 0),
                  invoiceTotal: parseFloat(order.totalPrice) || 0,
                  variantInfo: item.variantFeatures
                    ? JSON.stringify(item.variantFeatures)
                    : null,
                  rawData: JSON.stringify(item),
                }));

                // Try to link products before creating order items
                try {
                  const ProductOrderLinkingService = require("../../../../../services/product-order-linking-service");
                  const linkingService = new ProductOrderLinkingService();
                  const linkedItemsData =
                    await linkingService.linkIncomingOrderItems(
                      orderItemsData,
                      this.userId
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

              return normalizedOrder;
            });

            // Add the result to our normalized orders
            normalizedOrders.push(result);
            successCount++;

            this.logger.debug(
              `Successfully created new order for ${order.orderNumber}`
            );
          } catch (error) {
            if (error.name === "SequelizeUniqueConstraintError") {
              this.logger.warn(
                `Unique constraint violation for ${order.orderNumber}, attempting to find existing order`,
                {
                  orderNumber: order.orderNumber,
                  connectionId: this.connectionId,
                }
              );

              // Try to find the existing order and add it to results
              const existingOrder = await Order.findOne({
                where: {
                  externalOrderId: order.orderNumber,
                  connectionId: this.connectionId,
                },
              });

              if (existingOrder) {
                normalizedOrders.push(existingOrder);
                skippedCount++;
              } else {
                this.logger.error(
                  `Unique constraint error but order not found: ${order.orderNumber}`,
                  { orderNumber: order.orderNumber }
                );
                skippedCount++;
              }
            } else {
              this.logger.error(
                `Failed to create order ${order.orderNumber}: ${error.message}`,
                {
                  error,
                  orderNumber: order.orderNumber,
                  connectionId: this.connectionId,
                }
              );
              skippedCount++;
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to process order ${order.orderNumber}: ${error.message}`,
            {
              error,
              orderNumber: order.orderNumber,
              connectionId: this.connectionId,
            }
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
          orderStatus: this.mapOrderStatus(order.status), // Use orderStatus instead of status
          rawData: JSON.stringify(order),
          lastSyncedAt: new Date(),
        });

        return {
          success: true,
          message: "Order updated in manual create method",
          order: existingOrder,
        };
      }

      // Shipping detail must be created before the order
      const shippingDetail = await ShippingDetail.create({
        recipientName: `${order.shipmentAddress.firstName} ${order.shipmentAddress.lastName}`,
        address1: order.shipmentAddress.address1 || "",
        address2: "",
        city: order.shipmentAddress.city,
        state: order.shipmentAddress.district,
        postalCode: order.shipmentAddress.postalCode,
        country: "Turkey",
        phone: phoneNumber,
        email: order.customerEmail || "",
        shippingMethod: order.cargoProviderName,
      });

      // Create the order with correct field names
      const newOrder = await Order.create({
        externalOrderId: order.orderNumber,
        orderNumber: order.orderNumber, // Add orderNumber field
        connectionId: this.connectionId,
        userId: userId,
        orderDate: order.orderDate
          ? new Date(parseInt(order.orderDate))
          : new Date(),
        orderStatus: this.mapOrderStatus(order.status), // Use orderStatus instead of status
        totalAmount: order.totalPrice,
        currency: "TRY",
        customerName: `${order.customerFirstName} ${order.customerLastName}`,
        customerEmail: order.customerEmail,
        customerPhone: phoneNumber,
        platform: this.getPlatformType(),
        platformType: platformType,
        platformOrderId: order.orderNumber, // Add platformOrderId field
        platformId: this.connectionId, // Add platformId field
        shippingAddress: order.shipmentAddress,
        shippingDetailId: shippingDetail.id,
        invoiceStatus: order.eInvoiceStatus || "pending", // Use eInvoiceStatus
        notes: order.note || "",
        rawData: JSON.stringify(order),
        lastSyncedAt: new Date(),
        // Remove deprecated fields: platformType, platformOrderId, platformId, paymentStatus
      });

      // Update order with shipping detail ID
      await newOrder.update({
        shippingDetailId: shippingDetail.id,
      });

      // Create platform-specific order data
      await this.createTrendyolOrderRecord(newOrder.id, order);

      // Create order items with product linking
      const orderItemsData = order.lines.map((item) => ({
        orderId: newOrder.id,
        productId: null, // Will be set by linking service
        platformProductId: item.productId
          ? item.productId.toString()
          : item.productCode.toString(),
        title: item.productName || "Unknown Product",
        sku: item.merchantSku,
        barcode: item.barcode || "",
        quantity: item.quantity,
        price: item.price,
        discount: item.discount || 0,
        invoiceTotal: item.invoiceTotal || item.price,
        currency: "TRY",
        variantInfo: item.variantFeatures
          ? JSON.stringify(item.variantFeatures)
          : null,
        rawData: JSON.stringify(item),
      }));

      // Try to link products before creating order items
      try {
        const ProductOrderLinkingService = require("../../../../../services/product-order-linking-service");
        const linkingService = new ProductOrderLinkingService();
        const linkedItemsData = await linkingService.linkIncomingOrderItems(
          orderItemsData,
          userId
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

  /**
   * Map Trendyol order status to internal status
   * @param {String} trendyolStatus - Trendyol-specific status
   * @returns {String} Internal status
   */
  mapOrderStatus(trendyolStatus) {
    const statusMap = {
      Created: "new",
      Picking: "processing",
      Invoiced: "processing",
      Shipped: "shipped",
      AtCollectionPoint: "shipped", // Package is available for pickup at collection point
      Delivered: "delivered",
      Cancelled: "cancelled",
      UnDelivered: "failed",
      Returned: "returned",
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

    return mappedStatus || "unknown";
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

      // Update local order status
      await order.update({
        status: newStatus,
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
            barcode: trendyolProductData.barcode,
            stockCode: trendyolProductData.stockCode,
            title: trendyolProductData.title,
            categoryId: trendyolProductData.categoryId,
            categoryName: trendyolProductData.categoryName,
            brandId: trendyolProductData.brandId,
            brandName: trendyolProductData.brandName,
            vatRate: trendyolProductData.vatRate,
            dimensionalWeight: trendyolProductData.dimensionalWeight,
            description: trendyolProductData.description,
            stockUnitType: trendyolProductData.stockUnitType,
            images: trendyolProductData.images,
            attributes: trendyolProductData.attributes,
            variants: trendyolProductData.variants,
            approved: trendyolProductData.approved,
            hasError: trendyolProductData.hasError || false,
            errorMessage: trendyolProductData.errorMessage,
            platformListingPrice: trendyolProductData.listPrice,
            platformSalePrice: trendyolProductData.salePrice,
            platformStockQuantity: trendyolProductData.quantity,
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
            externalProductId:
              trendyolProductData.productCode ||
              trendyolProductData.id.toString(),
            barcode: trendyolProductData.barcode,
            stockCode: trendyolProductData.stockCode,
            title: trendyolProductData.title,
            categoryId: trendyolProductData.categoryId,
            categoryName: trendyolProductData.categoryName,
            brandId: trendyolProductData.brandId,
            brandName: trendyolProductData.brandName,
            vatRate: trendyolProductData.vatRate,
            dimensionalWeight: trendyolProductData.dimensionalWeight,
            description: trendyolProductData.description,
            stockUnitType: trendyolProductData.stockUnitType,
            images: trendyolProductData.images,
            attributes: trendyolProductData.attributes,
            variants: trendyolProductData.variants,
            approved: trendyolProductData.approved,
            hasError: trendyolProductData.hasError || false,
            errorMessage: trendyolProductData.errorMessage,
            platformListingPrice: trendyolProductData.listPrice,
            platformSalePrice: trendyolProductData.salePrice,
            platformStockQuantity: trendyolProductData.quantity,
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
   * Track order status change in history
   * @param {Object} order - Order record
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @param {string} source - Source of the change (user, system, platform)
   * @param {string} [userId=null] - User ID who made the change (null for system changes)
   * @param {Object} [metadata=null] - Additional metadata about the change
   * @returns {Promise<Object>} Created history record
   */
  async trackOrderStatusChange(
    order,
    oldStatus,
    newStatus,
    source,
    userId = null,
    metadata = null
  ) {
    try {
      const { OrderHistory } = require("../../../../../models");

      const historyEntry = await OrderHistory.create({
        orderId: order.id,
        userId: userId,
        changeType: "status",
        fieldName: "status",
        oldValue: oldStatus,
        newValue: newStatus,
        source: source,
        notes: `Order status changed from ${oldStatus} to ${newStatus}`,
        metadata: metadata,
      });

      this.logger.debug(
        `Recorded status change history for order ${order.id}: ${oldStatus} -> ${newStatus}`
      );
      return historyEntry;
    } catch (error) {
      this.logger.error(`Failed to record order history: ${error.message}`, {
        error,
        orderId: order.id,
        oldStatus,
        newStatus,
      });

      // Don't throw the error - just log it
      // This is a non-critical operation
      return null;
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
      const credentials = this.decryptCredentials(this.connection.credentials);

      // Validate order number
      if (!orderNumber) {
        this.logger.error("Order fetch failed: Missing order number", {
          connectionId: this.connectionId,
        });
        return {
          success: false,
          message: "Order fetch failed: Order number is required",
          error: "Missing required parameter: orderNumber",
          data: null,
        };
      }

      this.logger.debug(
        `Fetching Trendyol order details for order: ${orderNumber}`
      );

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(
          `/suppliers/${credentials.sellerId}/orders/${orderNumber}`
        )
      );

      // Validate response
      if (!response.data) {
        this.logger.warn(
          `Empty response received from Trendyol for order ${orderNumber}`
        );
        return {
          success: false,
          message: `No order data returned for order number ${orderNumber}`,
          data: null,
        };
      }

      this.logger.info(
        `Successfully fetched details for order ${orderNumber}`,
        {
          orderNumber,
          connectionId: this.connectionId,
        }
      );

      return {
        success: true,
        message: `Successfully fetched order ${orderNumber}`,
        data: response.data,
        // Include raw response for debugging if needed
        _rawResponse:
          process.env.NODE_ENV === "development" ? response : undefined,
      };
    } catch (error) {
      // Extract specific API error information when available
      const statusCode = error.response?.status;
      const apiError = error.response?.data;

      this.logger.error(
        `Failed to fetch order details from Trendyol: ${error.message}`,
        {
          error,
          statusCode,
          apiError,
          orderNumber,
          connectionId: this.connectionId,
        }
      );

      // Handle specific API error scenarios
      if (statusCode === 404) {
        return {
          success: false,
          message: `Order ${orderNumber} not found on Trendyol.`,
          error: apiError || error.message,
          data: null,
        };
      } else if (statusCode === 401 || 403) {
        return {
          success: false,
          message: "Authentication failed. Please check your API credentials.",
          error: apiError || error.message,
          data: null,
        };
      }

      return {
        success: false,
        message: `Failed to fetch order details: ${error.message}`,
        error: apiError || error.message,
        data: null,
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
      const credentials = this.decryptCredentials(this.connection.credentials);

      // Validate order number
      if (!orderNumber) {
        this.logger.error(
          "Shipment package fetch failed: Missing order number",
          { connectionId: this.connectionId }
        );
        return {
          success: false,
          message: "Shipment package fetch failed: Order number is required",
          error: "Missing required parameter: orderNumber",
          data: [],
        };
      }

      this.logger.debug(
        `Fetching Trendyol shipment packages for order: ${orderNumber}`
      );

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(
          `/suppliers/${credentials.sellerId}/orders/${orderNumber}/shipment-packages`
        )
      );

      // Validate response
      if (!response.data) {
        this.logger.warn(
          `Empty response received from Trendyol for order ${orderNumber} shipment packages`
        );
        return {
          success: false,
          message: `No shipment package data returned for order number ${orderNumber}`,
          data: [],
        };
      }

      this.logger.info(
        `Successfully fetched shipment packages for order ${orderNumber}`,
        {
          orderNumber,
          connectionId: this.connectionId,
        }
      );

      return {
        success: true,
        message: `Successfully fetched shipment packages for order ${orderNumber}`,
        data: response.data,
        // Include raw response for debugging if needed
        _rawResponse:
          process.env.NODE_ENV === "development" ? response.data : undefined,
      };
    } catch (error) {
      // Extract specific API error information when available
      const statusCode = error.response?.status;
      const apiError = error.response?.data;

      this.logger.error(
        `Failed to fetch shipment packages from Trendyol: ${error.message}`,
        {
          error,
          statusCode,
          apiError,
          orderNumber,
          connectionId: this.connectionId,
        }
      );

      // Handle specific API error scenarios
      if (statusCode === 404) {
        return {
          success: false,
          message: `Order ${orderNumber} not found on Trendyol.`,
          error: apiError || error.message,
          data: [],
        };
      } else if (statusCode === 401 || 403) {
        return {
          success: false,
          message: "Authentication failed. Please check your API credentials.",
          error: apiError || error.message,
          data: [],
        };
      }

      return {
        success: false,
        message: `Failed to fetch shipment packages: ${error.message}`,
        error: apiError || error.message,
        data: [],
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
      const startDateTs = params.startDate
        ? new Date(params.startDate).getTime()
        : defaultStartDate.getTime();
      const endDateTs = params.endDate
        ? new Date(params.endDate).getTime()
        : defaultEndDate.getTime();

      const defaultParams = {
        startDate: startDateTs,
        endDate: endDateTs,
        page: 0,
        size: 50,
      };

      const queryParams = { ...defaultParams, ...params };

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(`/suppliers/${sellerId}/claims`, {
          params: queryParams,
        })
      );

      if (!response.data || !response.data.content) {
        return {
          success: false,
          message: "No claims data returned from Trendyol",
          data: [],
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
          totalElements:
            response.data.totalElements || response.data.content.length,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch claims from Trendyol: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to fetch claims: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
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
        this.axiosInstance.get("/shipment-providers")
      );

      if (!response.data) {
        return {
          success: false,
          message: "No shipping provider data returned from Trendyol",
          data: [],
        };
      }

      return {
        success: true,
        message: "Successfully fetched shipping providers from Trendyol",
        data: response.data,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch shipping providers from Trendyol: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to fetch shipping providers: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
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
      if (
        !packageDetails ||
        !Array.isArray(packageDetails.lines) ||
        packageDetails.lines.length === 0
      ) {
        return {
          success: false,
          message: "Invalid package details. Must include line items.",
          error: "Invalid package details",
        };
      }

      // Make request to create shipment package
      const response = await this.retryRequest(() =>
        this.axiosInstance.post(
          `/suppliers/${sellerId}/orders/${orderNumber}/shipment-packages`,
          packageDetails
        )
      );

      // Update local order status if successful
      const order = await Order.findOne({
        where: {
          connectionId: this.connectionId,
          externalOrderId: orderNumber,
        },
      });

      if (order) {
        await order.update({
          status: "shipped",
          lastSyncedAt: new Date(),
        });
      }

      return {
        success: true,
        message: `Successfully created shipment package for order ${orderNumber}`,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create shipment package for order ${orderNumber}: ${error.message}`,
        {
          error,
          orderNumber,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to create shipment package: ${error.message}`,
        error: error.response?.data || error.message,
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
      const startDateTs = params.startDate
        ? new Date(params.startDate).getTime()
        : defaultStartDate.getTime();
      const endDateTs = params.endDate
        ? new Date(params.endDate).getTime()
        : defaultEndDate.getTime();

      const defaultParams = {
        startDate: startDateTs,
        endDate: endDateTs,
        page: 0,
        size: 50,
      };

      const queryParams = { ...defaultParams, ...params };

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(`/suppliers/${sellerId}/settlements`, {
          params: queryParams,
        })
      );

      if (!response.data || !response.data.content) {
        return {
          success: false,
          message: "No settlement data returned from Trendyol",
          data: [],
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
          totalElements:
            response.data.totalElements || response.data.content.length,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch settlements from Trendyol: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to fetch settlements: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
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
          message:
            "Invalid batch request data. Must include type and items array.",
          error: "Invalid batch request data",
        };
      }

      // Supported batch types
      const supportedTypes = ["PRICE_UPDATE", "STOCK_UPDATE", "PRODUCT_UPDATE"];
      if (!supportedTypes.includes(type)) {
        return {
          success: false,
          message: `Unsupported batch request type: ${type}. Supported types: ${supportedTypes.join(
            ", "
          )}.`,
          error: "Unsupported batch type",
        };
      }

      // Format batch request data
      const batchRequestData = {
        batchRequestType: type,
        items: items,
      };

      // Make request to create batch request
      const response = await this.retryRequest(() =>
        this.axiosInstance.post(
          `/suppliers/${sellerId}/batch-requests`,
          batchRequestData
        )
      );

      return {
        success: true,
        message: `Successfully created ${type} batch request with ${items.length} items`,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`Failed to create batch request: ${error.message}`, {
        error,
        batchType: type,
        itemCount: items?.length,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Failed to create batch request: ${error.message}`,
        error: error.response?.data || error.message,
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
          message: "Batch request ID is required",
          error: "Missing batchRequestId",
        };
      }

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(
          `/suppliers/${sellerId}/batch-requests/${batchRequestId}`
        )
      );

      return {
        success: true,
        message: `Successfully fetched status for batch request ${batchRequestId}`,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get batch request status: ${error.message}`,
        {
          error,
          batchRequestId,
          connectionId: this.connectionId,
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
   * Create a Trendyol-specific order record
   * @param {string} orderId - The main Order record ID
   * @param {Object} trendyolOrderData - Raw order data from Trendyol API
   * @param {Object} transaction - Sequelize transaction object (optional)
   * @returns {Promise<Object>} Created TrendyolOrder record
   */
  async createTrendyolOrderRecord(
    orderId,
    trendyolOrderData,
    transaction = null
  ) {
    try {
      const { TrendyolOrder } = require("../../../../../models");

      // Extract Trendyol-specific fields from the order data
      const trendyolOrderRecord = {
        orderId: orderId,
        trendyolOrderId: trendyolOrderData.orderNumber,
        orderNumber: trendyolOrderData.orderNumber,
        supplierId: trendyolOrderData.supplierId,
        customerId: trendyolOrderData.customerId,
        orderStatus: trendyolOrderData.status || "Created",
        paymentType: trendyolOrderData.paymentType,
        paymentStatus: trendyolOrderData.paymentStatus,
        cargoProviderName: trendyolOrderData.cargoProviderName,
        cargoTrackingNumber:
          trendyolOrderData.cargoTrackingNumber ||
          trendyolOrderData.cargoTrackingCode,
        cargoTrackingLink:
          trendyolOrderData.cargoTrackingUrl ||
          trendyolOrderData.cargoTrackingLink,
        estimatedDeliveryStartDate: trendyolOrderData.estimatedDeliveryStartDate
          ? new Date(trendyolOrderData.estimatedDeliveryStartDate)
          : null,
        estimatedDeliveryEndDate: trendyolOrderData.estimatedDeliveryEndDate
          ? new Date(trendyolOrderData.estimatedDeliveryEndDate)
          : null,
        shipmentAddress: trendyolOrderData.shipmentAddress,
        invoiceAddress: trendyolOrderData.invoiceAddress,
        customerInfo: {
          firstName: trendyolOrderData.customerFirstName,
          lastName: trendyolOrderData.customerLastName,
          email: trendyolOrderData.customerEmail,
          tcId: trendyolOrderData.tcId,
        },
        invoiceData: trendyolOrderData.invoiceData,
        trendyolOrderDate: trendyolOrderData.orderDate
          ? new Date(trendyolOrderData.orderDate)
          : null,
        lastModifiedDate: trendyolOrderData.lastModifiedDate
          ? new Date(trendyolOrderData.lastModifiedDate)
          : null,
        lastSyncAt: new Date(),
        commercialInvoiceNumber: trendyolOrderData.commercialInvoiceNumber,
        grossAmount:
          trendyolOrderData.grossAmount || trendyolOrderData.totalPrice,
        totalDiscount: trendyolOrderData.totalDiscount || 0,
        taxNumber: trendyolOrderData.taxNumber,
        deliveryType: trendyolOrderData.deliveryType,
        timeSlotId: trendyolOrderData.timeSlotId,
        fastDelivery: trendyolOrderData.fastDelivery || false,
        scheduledDelivery: trendyolOrderData.scheduledDelivery || false,
        agreedDeliveryDate: trendyolOrderData.agreedDeliveryDate
          ? new Date(trendyolOrderData.agreedDeliveryDate)
          : null,
        packingListId: trendyolOrderData.packingListId,
        shipmentPackageStatus: trendyolOrderData.shipmentPackageStatus,
        currency: trendyolOrderData.currency || "TRY",
        platformOrderData: trendyolOrderData,
      };

      // Create with or without transaction
      if (transaction) {
        return await TrendyolOrder.create(trendyolOrderRecord, { transaction });
      } else {
        return await TrendyolOrder.create(trendyolOrderRecord);
      }
    } catch (error) {
      this.logger.error(
        `Failed to create TrendyolOrder record: ${error.message}`,
        {
          error,
          orderId,
          orderNumber: trendyolOrderData.orderNumber,
        }
      );
      throw error;
    }
  }
}

module.exports = TrendyolService;
