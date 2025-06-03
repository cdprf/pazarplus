const axios = require("axios");
const {
  Order,
  OrderItem,
  User,
  PlatformConnection,
  ShippingDetail,
  HepsiburadaOrder,
} = require("../../../../../models");
const { Op } = require("sequelize");
const sequelize = require("../../../../../config/database");
const logger = require("../../../../../utils/logger");
const BasePlatformService = require("../BasePlatformService"); // Fixed import path

class HepsiburadaService extends BasePlatformService {
  constructor(connectionId) {
    super(connectionId);
    // Default to test environment, will be updated based on environment setting
    this.apiUrl = "https://oms-external.hepsiburada.com"; // Removed -sit from default
    this.merchantId = null;
    this.isTestEnvironment = true;
  }

  /**
   * Get the platform type
   * @returns {string} Platform type identifier
   */
  getPlatformType() {
    return "hepsiburada";
  }

  /**
   * Setup Axios instance with appropriate headers and config
   * Implementation of abstract method from BasePlatformService
   */
  async setupAxiosInstance() {
    const credentials = this.decryptCredentials(this.connection.credentials);
    const { username, merchantId, apiKey, environment } = credentials;

    if (!username || !apiKey || !merchantId) {
      throw new Error(
        "Missing required Hepsiburada credentials. Username, Merchant ID, and API Key are required."
      );
    }

    // Set the correct API URL based on environment
    this.isTestEnvironment =
      environment === "test" || environment === "sandbox" || !environment;
    this.apiUrl = this.isTestEnvironment
      ? "https://oms-external-sit.hepsiburada.com"
      : "https://oms-external.hepsiburada.com";

    // Create Basic auth header with merchantId:apiKey (not username:apiKey)
    const authString = Buffer.from(`${merchantId}:${apiKey}`).toString(
      "base64"
    );

    this.axiosInstance = await this.createAxiosInstance({
      baseURL: this.apiUrl,
      headers: {
        Authorization: `Basic ${authString}`,
        "User-Agent": "sentosyazilim_dev",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
    });

    this.merchantId = merchantId;
    return true;
  }

  /**
   * Create an Axios instance - helper method for setupAxiosInstance
   * @param {Object} config - Axios configuration
   * @returns {Object} Axios instance
   */
  async createAxiosInstance(config) {
    return axios.create(config);
  }

  /**
   * Override decryptCredentials for Hepsiburada-specific format
   * @param {string|object} encryptedCredentials
   * @returns {object} Decrypted credentials
   */
  decryptCredentials(encryptedCredentials) {
    try {
      // Use the parent implementation for basic parsing
      const credentials = super.decryptCredentials(encryptedCredentials);

      // Debug logging to see what we received
      logger.info("Decrypting Hepsiburada credentials", {
        credentialsType: typeof credentials,
        credentialsKeys: credentials ? Object.keys(credentials) : "null",
        hasUsername: !!credentials?.username,
        hasMerchantId: !!credentials?.merchantId,
        hasApiKey: !!credentials?.apiKey,
        connectionId: this.connectionId,
      });

      // Make sure we have the required fields
      if (
        !credentials ||
        !credentials.username ||
        !credentials.merchantId ||
        !credentials.apiKey
      ) {
        const missing = [];
        if (!credentials) missing.push("credentials object is null/undefined");
        if (!credentials?.username) missing.push("username");
        if (!credentials?.merchantId) missing.push("merchantId");
        if (!credentials?.apiKey) missing.push("apiKey");

        throw new Error(`Missing required credentials: ${missing.join(", ")}`);
      }

      return {
        username: credentials.username,
        merchantId: credentials.merchantId,
        apiKey: credentials.apiKey,
        environment: credentials.environment || "test",
      };
    } catch (error) {
      logger.error(
        `Failed to decrypt Hepsiburada credentials: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
          credentialsType: typeof encryptedCredentials,
        }
      );
      throw new Error(`Failed to decrypt credentials: ${error.message}`);
    }
  }

  /**
   * Fetch completed orders (Ödemesi Tamamlanmış Siparişler)
   * These are orders ready to be packaged
   */
  async fetchCompletedOrders(params = {}) {
    try {
      await this.initialize();

      const defaultParams = {
        offset: 0,
        limit: 100, // Updated to match API documentation
      };

      const queryParams = { ...defaultParams, ...params };

      // Ensure limit doesn't exceed maximum
      if (queryParams.limit > 100) {
        queryParams.limit = 100;
      }

      // Use the correct API endpoint for getting orders
      const url = `/packages/merchantid/${this.merchantId}`;

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, { params: queryParams })
      );

      // Handle empty responses as successful connections (for testing purposes)
      if (
        !response.data ||
        (Array.isArray(response.data) && response.data.length === 0)
      ) {
        return {
          success: true,
          message:
            "Successfully connected to Hepsiburada API - no packages found (account may be empty)",
          data: [],
        };
      }

      if (!Array.isArray(response.data)) {
        return {
          success: false,
          message: "Invalid response format from Hepsiburada API",
          data: [],
        };
      }

      return {
        success: true,
        message: `Successfully fetched ${response.data.length} completed orders from Hepsiburada`,
        data: response.data,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.length,
        },
      };
    } catch (error) {
      logger.error(
        `Failed to fetch completed orders from Hepsiburada: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to fetch completed orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
      };
    }
  }

  /**
   * Fetch pending payment orders (Ödemesi Beklenen Siparişler)
   * These are orders waiting for payment confirmation
   */
  async fetchPendingPaymentOrders(params = {}) {
    try {
      await this.initialize();

      const defaultParams = {
        offset: 0,
        limit: 100, // Updated to match API documentation
      };

      const queryParams = { ...defaultParams, ...params };

      if (queryParams.limit > 100) {
        queryParams.limit = 100;
      }

      // Use the correct API endpoint pattern
      const url = `/packages/merchantid/${this.merchantId}/notpaid`;

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, { params: queryParams })
      );

      // Handle empty responses as successful connections (for testing purposes)
      if (
        !response.data ||
        (Array.isArray(response.data) && response.data.length === 0)
      ) {
        return {
          success: true,
          message:
            "Successfully connected to Hepsiburada API - no pending payment orders found",
          data: [],
        };
      }

      if (!Array.isArray(response.data)) {
        return {
          success: false,
          message: "Invalid response format from Hepsiburada API",
          data: [],
        };
      }

      return {
        success: true,
        message: `Successfully fetched ${response.data.length} pending payment orders from Hepsiburada`,
        data: response.data,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.length,
        },
      };
    } catch (error) {
      logger.error(
        `Failed to fetch pending payment orders from Hepsiburada: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to fetch pending payment orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
      };
    }
  }

  /**
   * Fetch packages (Paket Bilgileri)
   * These are packaged orders ready to ship
   */
  async fetchPackages(params = {}) {
    try {
      await this.initialize();

      const defaultParams = {
        offset: 0,
        limit: 50,
      };

      const queryParams = { ...defaultParams, ...params };

      if (queryParams.limit > 50) {
        queryParams.limit = 50;
      }

      // Support both date range and offset/limit pagination
      let url = `/packages/merchantid/${this.merchantId}`;

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, {
          params: {
            limit: queryParams.limit,
            offset: queryParams.offset,
            begindate: queryParams.startDate,
            enddate: queryParams.endDate,
          },
        })
      );

      if (!response.data || !Array.isArray(response.data)) {
        return {
          success: false,
          message: "No package data returned from Hepsiburada",
          data: [],
        };
      }

      return {
        success: true,
        message: `Successfully fetched ${response.data.length} packages from Hepsiburada`,
        data: response.data,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.length,
        },
      };
    } catch (error) {
      logger.error(
        `Failed to fetch packages from Hepsiburada: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to fetch packages: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
      };
    }
  }

  /**
   * Fetch delivered orders (Teslim Edilen Siparişler)
   * Only last 1 month of data is available
   */
  async fetchDeliveredOrders(params = {}) {
    try {
      await this.initialize();

      const defaultParams = {
        offset: 0,
        limit: 100, // Updated to match API documentation
      };

      const queryParams = { ...defaultParams, ...params };

      if (queryParams.limit > 100) {
        queryParams.limit = 100;
      }

      // Use the correct API endpoint pattern
      const url = `/packages/merchantid/${this.merchantId}/delivered`;

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, { params: queryParams })
      );

      // Handle empty responses as successful connections (for testing purposes)
      if (
        !response.data ||
        (Array.isArray(response.data) && response.data.length === 0)
      ) {
        return {
          success: true,
          message:
            "Successfully connected to Hepsiburada API - no delivered orders found",
          data: [],
        };
      }

      if (!Array.isArray(response.data)) {
        return {
          success: false,
          message: "Invalid response format from Hepsiburada API",
          data: [],
        };
      }

      return {
        success: true,
        message: `Successfully fetched ${response.data.length} delivered orders from Hepsiburada`,
        data: response.data,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.length,
        },
      };
    } catch (error) {
      logger.error(
        `Failed to fetch delivered orders from Hepsiburada: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to fetch delivered orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
      };
    }
  }

  /**
   * Fetch cancelled orders (İptal Sipariş Bilgileri)
   * Only last 1 month of data is available
   */
  async fetchCancelledOrders(params = {}) {
    try {
      await this.initialize();

      const defaultParams = {
        offset: 0,
        limit: 100, // Updated to match API documentation
      };

      const queryParams = { ...defaultParams, ...params };

      if (queryParams.limit > 100) {
        queryParams.limit = 100;
      }

      // Use the correct API endpoint pattern
      const url = `/packages/merchantid/${this.merchantId}/cancelled`;

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, { params: queryParams })
      );

      // Handle empty responses as successful connections (for testing purposes)
      if (
        !response.data ||
        (Array.isArray(response.data) && response.data.length === 0)
      ) {
        return {
          success: true,
          message:
            "Successfully connected to Hepsiburada API - no cancelled orders found",
          data: [],
        };
      }

      if (!Array.isArray(response.data)) {
        return {
          success: false,
          message: "Invalid response format from Hepsiburada API",
          data: [],
        };
      }

      return {
        success: true,
        message: `Successfully fetched ${response.data.length} cancelled orders from Hepsiburada`,
        data: response.data,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.length,
        },
      };
    } catch (error) {
      logger.error(
        `Failed to fetch cancelled orders from Hepsiburada: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to fetch cancelled orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
      };
    }
  }

  /**
   * Main method to fetch orders - now uses the appropriate endpoint based on status
   * Implementation of abstract method from BasePlatformService
   */
  async fetchOrders(params = {}) {
    try {
      await this.initialize();

      // If no specific status is requested, fetch packages (most common use case)
      const status = params.status || "packages";

      switch (status) {
        case "pending_payment":
          return await this.fetchPendingPaymentOrders(params);
        case "packages":
          return await this.fetchPackages(params);
        case "delivered":
          return await this.fetchDeliveredOrders(params);
        case "cancelled":
          return await this.fetchCancelledOrders(params);
        case "completed":
        default:
          return await this.fetchCompletedOrders(params);
      }
    } catch (error) {
      logger.error(
        `Failed to fetch orders from Hepsiburada: ${error.message}`,
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
   * Get detailed information for a specific order by its order number
   * @param {string} orderNumber - The Hepsiburada order number
   * @returns {Object} - Order details or error
   */
  async getOrderDetails(orderNumber) {
    try {
      await this.initialize();

      // Use the correct API endpoint pattern
      const url = `/packages/merchantid/${this.merchantId}/ordernumber/${orderNumber}`;

      logger.info(`Fetching order details from Hepsiburada: ${orderNumber}`);

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url)
      );

      if (!response.data || !response.data.orderId) {
        return {
          success: false,
          message: "Invalid order data returned from Hepsiburada",
          data: null,
        };
      }

      return {
        success: true,
        message: "Successfully fetched order details",
        data: response.data,
      };
    } catch (error) {
      logger.error(
        `Failed to fetch order details from Hepsiburada: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
          orderNumber,
        }
      );

      return {
        success: false,
        message: `Failed to fetch order details: ${error.message}`,
        error: error.response?.data || error.message,
        data: null,
      };
    }
  }

  /**
   * Create a package for shipping (Paket Oluşturma)
   * @param {Array} orderItemIds - Array of order item IDs to package together
   * @param {Object} shippingInfo - Shipping information
   * @returns {Object} - Result of package creation
   */
  async createPackage(orderItemIds, shippingInfo = {}) {
    try {
      await this.initialize();

      const url = `/packages/merchantid/${this.merchantId}`;

      const packageData = {
        items: orderItemIds.map((itemId) => ({ id: itemId })),
        cargoCompany: shippingInfo.cargoCompany || "",
        desi: shippingInfo.desi || 1,
        packageNumber: shippingInfo.packageNumber || "",
        ...shippingInfo,
      };

      const response = await this.retryRequest(() =>
        this.axiosInstance.post(url, packageData)
      );

      return {
        success: true,
        message: "Package created successfully",
        data: response.data,
      };
    } catch (error) {
      logger.error(
        `Failed to create package on Hepsiburada: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
          orderItemIds,
        }
      );

      return {
        success: false,
        message: `Failed to create package: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Update package shipping information (Paket Kargo Bilgisi Güncelleme)
   * @param {string} packageNumber - Package number
   * @param {Object} shippingUpdate - Updated shipping information
   * @returns {Object} - Result of shipping update
   */
  async updatePackageShipping(packageNumber, shippingUpdate) {
    try {
      await this.initialize();

      const url = `/packages/merchantid/${this.merchantId}/packagenumber/${packageNumber}/cargo`;

      const response = await this.retryRequest(() =>
        this.axiosInstance.put(url, shippingUpdate)
      );

      return {
        success: true,
        message: "Package shipping information updated successfully",
        data: response.data,
      };
    } catch (error) {
      logger.error(
        `Failed to update package shipping on Hepsiburada: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
          packageNumber,
        }
      );

      return {
        success: false,
        message: `Failed to update package shipping: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Cancel an order (İptal Bilgisi Gönderme)
   * Daily limit: 100 cancellations
   * @param {string} orderItemId - Order item ID to cancel
   * @param {string} reason - Cancellation reason
   * @returns {Object} - Result of cancellation
   */
  async cancelOrder(orderItemId, reason = "MerchantCancel") {
    try {
      await this.initialize();

      // Use the correct API endpoint pattern
      const url = `/packages/merchantid/${this.merchantId}/items/${orderItemId}/cancel`;

      const cancellationData = {
        reason: reason,
      };

      const response = await this.retryRequest(() =>
        this.axiosInstance.put(url, cancellationData)
      );

      return {
        success: true,
        message: "Order cancelled successfully",
        data: response.data,
      };
    } catch (error) {
      logger.error(`Failed to cancel order on Hepsiburada: ${error.message}`, {
        error,
        connectionId: this.connectionId,
        orderItemId,
        reason,
      });

      return {
        success: false,
        message: `Failed to cancel order: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Generate shipping barcode (Ortak Barkod Oluşturma)
   * Supports HepsiJet and Aras cargo companies
   * @param {string} packageNumber - Package number
   * @param {string} format - Output format (zpl, base64zpl, pdf, png, jpg)
   * @returns {Object} - Barcode data
   */
  async generateShippingBarcode(packageNumber, format = "pdf") {
    try {
      await this.initialize();

      const url = `/packages/merchantid/${this.merchantId}/packagenumber/${packageNumber}/barcode`;

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, {
          params: { format },
          responseType: format === "pdf" ? "arraybuffer" : "json",
        })
      );

      return {
        success: true,
        message: "Barcode generated successfully",
        data: response.data,
        format: format,
      };
    } catch (error) {
      logger.error(
        `Failed to generate barcode on Hepsiburada: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
          packageNumber,
          format,
        }
      );

      return {
        success: false,
        message: `Failed to generate barcode: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Create test order (Test İçin Sipariş Oluşturma)
   * Only available in test environment
   * @param {Object} testOrderData - Test order data
   * @returns {Object} - Created test order
   */
  async createTestOrder(testOrderData) {
    try {
      if (!this.isTestEnvironment) {
        throw new Error(
          "Test order creation is only available in test environment"
        );
      }

      await this.initialize();

      // Use the correct API endpoint pattern
      const url = `/packages/merchantid/${this.merchantId}/test`;

      const response = await this.retryRequest(() =>
        this.axiosInstance.post(url, testOrderData)
      );

      return {
        success: true,
        message: "Test order created successfully",
        data: response.data,
      };
    } catch (error) {
      logger.error(
        `Failed to create test order on Hepsiburada: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
          testOrderData,
        }
      );

      return {
        success: false,
        message: `Failed to create test order: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Normalize Hepsiburada orders and save them to database
   * @param {Array} hepsiburadaOrders - Raw order data from Hepsiburada API
   * @returns {Promise<Object>} Normalized orders result
   */
  async normalizeOrders(hepsiburadaOrders) {
    const normalizedOrders = [];
    let successCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    try {
      // Get array of order numbers for efficient querying
      const orderNumbers = hepsiburadaOrders
        .map((order) => order.orderNumber || order.id || order.packageNumber)
        .filter(Boolean); // Remove undefined/null values

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
      for (const order of hepsiburadaOrders) {
        try {
          // Validate and extract order identifier with fallbacks
          const orderNumber =
            order.orderNumber || order.id || order.packageNumber;

          // Skip orders without valid identifier
          if (!orderNumber) {
            this.logger.warn(`Skipping order without valid identifier`, {
              order: JSON.stringify(order),
              connectionId: this.connectionId,
            });
            skippedCount++;
            continue;
          }

          // Check if order already exists using our lookup map
          const existingOrder = existingOrdersMap[orderNumber];

          if (existingOrder) {
            // Order exists - update it with the latest data
            try {
              await existingOrder.update({
                status: this.mapOrderStatus(
                  order.status || order.packageStatus
                ),
                rawData: JSON.stringify(order),
                lastSyncedAt: new Date(),
              });

              updatedCount++;
              normalizedOrders.push(existingOrder);
              continue;
            } catch (updateError) {
              this.logger.error(
                `Failed to update existing order ${orderNumber}: ${updateError.message}`,
                {
                  error: updateError,
                  orderNumber: orderNumber,
                  connectionId: this.connectionId,
                }
              );
              skippedCount++;
              continue;
            }
          }

          // Order doesn't exist - create a new one
          try {
            this.logger.debug(`Creating new order for ${orderNumber}`);

            const result = await sequelize.transaction(async (t) => {
              // Extract phone number from order data
              const phoneNumber = this.extractPhoneNumber(order);

              // Create shipping detail first
              const shippingDetail = await ShippingDetail.create(
                {
                  recipientName:
                    order.deliveryAddress?.fullName ||
                    order.customer?.name ||
                    "",
                  address1:
                    order.deliveryAddress?.address ||
                    order.shippingAddress?.address ||
                    "",
                  address2: order.deliveryAddress?.district || "",
                  city:
                    order.deliveryAddress?.city ||
                    order.shippingAddress?.city ||
                    "",
                  state:
                    order.deliveryAddress?.district ||
                    order.shippingAddress?.district ||
                    "",
                  postalCode:
                    order.deliveryAddress?.postalCode ||
                    order.shippingAddress?.postalCode ||
                    "",
                  country: order.deliveryAddress?.country || "TR",
                  phone: phoneNumber || "",
                  email: order.customer?.email || "",
                },
                { transaction: t }
              );

              // Create the main order record
              const normalizedOrder = await Order.create(
                {
                  externalOrderId: orderNumber,
                  platformOrderId: orderNumber,
                  platformId: "hepsiburada",
                  connectionId: this.connectionId,
                  userId: this.connection.userId,
                  customerName:
                    order.customer?.name ||
                    order.deliveryAddress?.fullName ||
                    "",
                  customerEmail: order.customer?.email || "",
                  customerPhone: phoneNumber || "",
                  orderDate: order.orderDate
                    ? new Date(order.orderDate)
                    : new Date(),
                  status: this.mapOrderStatus(
                    order.status || order.packageStatus
                  ),
                  totalAmount: order.totalPrice || order.price || 0,
                  currency: "TRY",
                  shippingDetailId: shippingDetail.id,
                  notes: order.note || "",
                  paymentStatus: this.mapPaymentStatus(order.paymentStatus),
                  rawData: JSON.stringify(order),
                  lastSyncedAt: new Date(),
                },
                { transaction: t }
              );

              // Create Hepsiburada-specific order record
              await this.createHepsiburadaOrderRecord(
                normalizedOrder.id,
                order,
                t
              );

              // Create order items if available
              if (order.items && Array.isArray(order.items)) {
                for (const item of order.items) {
                  await OrderItem.create(
                    {
                      orderId: normalizedOrder.id,
                      platformProductId:
                        item.productId || item.hepsiburadaSku || "",
                      title:
                        item.productName || item.title || "Unknown Product",
                      sku: item.sku || item.merchantSku || "",
                      quantity: item.quantity || 1,
                      price: item.price || item.unitPrice || 0,
                      currency: "TRY",
                      barcode: item.barcode || "",
                      variantInfo: item.variant
                        ? JSON.stringify(item.variant)
                        : null,
                      rawData: JSON.stringify(item),
                    },
                    { transaction: t }
                  );
                }
              }

              return normalizedOrder;
            });

            // Add the result to our normalized orders
            normalizedOrders.push(result);
            successCount++;

            this.logger.debug(
              `Successfully created new order for ${orderNumber}`
            );
          } catch (error) {
            if (error.name === "SequelizeUniqueConstraintError") {
              this.logger.warn(
                `Unique constraint violation for ${orderNumber}, skipping`,
                {
                  orderNumber: orderNumber,
                  connectionId: this.connectionId,
                }
              );
              skippedCount++;
            } else {
              throw error;
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to process order ${orderNumber}: ${error.message}`,
            {
              error,
              orderNumber: orderNumber,
              connectionId: this.connectionId,
            }
          );
          skippedCount++;
        }
      }

      return {
        success: true,
        message: `Successfully processed ${successCount} orders (${updatedCount} updated, ${skippedCount} skipped)`,
        data: normalizedOrders,
        stats: {
          total: hepsiburadaOrders.length,
          success: successCount,
          updated: updatedCount,
          skipped: skippedCount,
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
   * Create a Hepsiburada-specific order record
   * @param {string} orderId - The main Order record ID
   * @param {Object} hepsiburadaOrderData - Raw order data from Hepsiburada API
   * @param {Object} transaction - Sequelize transaction object
   * @returns {Promise<Object>} Created HepsiburadaOrder record
   */
  async createHepsiburadaOrderRecord(
    orderId,
    hepsiburadaOrderData,
    transaction
  ) {
    try {
      // Extract Hepsiburada-specific fields from the order data
      return await HepsiburadaOrder.create(
        {
          orderId: orderId,
          packageNumber:
            hepsiburadaOrderData.packageNumber || hepsiburadaOrderData.id,
          merchantId: this.merchantId,
          customerId:
            hepsiburadaOrderData.customerId ||
            hepsiburadaOrderData.customer?.id,
          orderNumber:
            hepsiburadaOrderData.orderNumber || hepsiburadaOrderData.id,
          referenceNumber: hepsiburadaOrderData.referenceNumber,
          cargoCompany:
            hepsiburadaOrderData.cargoCompany ||
            hepsiburadaOrderData.cargo?.company,
          cargoTrackingNumber:
            hepsiburadaOrderData.cargoTrackingNumber ||
            hepsiburadaOrderData.cargo?.trackingNumber,
          cargoTrackingUrl:
            hepsiburadaOrderData.cargoTrackingUrl ||
            hepsiburadaOrderData.cargo?.trackingUrl,
          paymentType:
            hepsiburadaOrderData.paymentType ||
            hepsiburadaOrderData.payment?.type,
          platformStatus:
            hepsiburadaOrderData.status || hepsiburadaOrderData.packageStatus,
          paymentStatus:
            hepsiburadaOrderData.paymentStatus ||
            hepsiburadaOrderData.payment?.status,
          shippingAddressJson: hepsiburadaOrderData.shippingAddress,
          billingAddressJson: hepsiburadaOrderData.billingAddress,
          deliveryAddressJson: hepsiburadaOrderData.deliveryAddress,
          invoiceDetailsJson:
            hepsiburadaOrderData.invoiceDetails || hepsiburadaOrderData.invoice,
          customerJson: hepsiburadaOrderData.customer,
          createdDate: hepsiburadaOrderData.createdDate
            ? new Date(hepsiburadaOrderData.createdDate)
            : null,
          orderDate: hepsiburadaOrderData.orderDate
            ? new Date(hepsiburadaOrderData.orderDate)
            : null,
        },
        { transaction }
      );
    } catch (error) {
      this.logger.error(
        `Failed to create HepsiburadaOrder record: ${error.message}`,
        {
          error,
          orderId,
          orderNumber:
            hepsiburadaOrderData.orderNumber || hepsiburadaOrderData.id,
        }
      );
      throw error;
    }
  }

  /**
   * Map Hepsiburada payment status to internal payment status
   * @param {string} hepsiburadaPaymentStatus - Platform payment status
   * @returns {string} Internal payment status
   */
  mapPaymentStatus(hepsiburadaPaymentStatus) {
    const paymentStatusMap = {
      Paid: "paid",
      UnPaid: "pending",
      Pending: "pending",
      Failed: "failed",
      Refunded: "refunded",
      PartiallyRefunded: "partially_refunded",
    };

    return paymentStatusMap[hepsiburadaPaymentStatus] || "pending";
  }

  /**
   * Extract phone number from Hepsiburada order data
   * @param {Object} order - The order object from Hepsiburada API
   * @returns {string} The extracted phone number or empty string
   */
  extractPhoneNumber(order) {
    // Check various locations where phone might be available
    if (order.deliveryAddress && order.deliveryAddress.phone) {
      return order.deliveryAddress.phone;
    }

    if (order.shippingAddress && order.shippingAddress.phone) {
      return order.shippingAddress.phone;
    }

    if (order.customer && order.customer.phone) {
      return order.customer.phone;
    }

    if (order.billingAddress && order.billingAddress.phone) {
      return order.billingAddress.phone;
    }

    // Use parent implementation for regex-based extraction
    return super.extractPhoneNumber(order);
  }

  /**
   * Map Hepsiburada order status to internal status
   * @param {String} hepsiburadaStatus - Hepsiburada-specific status
   * @returns {String} Internal status
   */
  mapOrderStatus(hepsiburadaStatus) {
    const statusMap = {
      WaitingForPayment: "pending",
      PaymentCompleted: "processing",
      Packaged: "shipped",
      Shipped: "shipped",
      Delivered: "delivered",
      Cancelled: "cancelled",
      Returned: "returned",
      ReadyToShip: "processing",
      InTransit: "shipped",
    };

    const mappedStatus = statusMap[hepsiburadaStatus];

    // Log unknown statuses for investigation
    if (!mappedStatus && hepsiburadaStatus) {
      this.logger.warn(
        `Unknown Hepsiburada order status encountered: ${hepsiburadaStatus}`,
        {
          platformType: "hepsiburada",
          connectionId: this.connectionId,
          unmappedStatus: hepsiburadaStatus,
        }
      );

      // Fall back to a reasonable default based on context
      if (hepsiburadaStatus.toLowerCase().includes("cancel")) {
        return "cancelled";
      } else if (hepsiburadaStatus.toLowerCase().includes("ship")) {
        return "shipped";
      } else if (hepsiburadaStatus.toLowerCase().includes("deliver")) {
        return "delivered";
      } else if (hepsiburadaStatus.toLowerCase().includes("return")) {
        return "returned";
      } else if (hepsiburadaStatus.toLowerCase().includes("payment")) {
        return "pending";
      }

      return "unknown";
    }

    return mappedStatus || "unknown";
  }

  /**
   * Test connection to Hepsiburada - override to implement Hepsiburada-specific test
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);

      // Check if merchantId exists in the credentials
      if (!credentials.merchantId) {
        return {
          success: false,
          message: "Connection failed: Merchant ID is missing from credentials",
          error: "Missing required parameter: merchantId",
        };
      }

      this.logger.debug(
        `Testing Hepsiburada connection for merchantId: ${credentials.merchantId}`
      );

      try {
        // Test the connection by fetching a small number of orders
        const response = await this.axiosInstance.get(
          `/packages/merchantid/${credentials.merchantId}`,
          {
            params: {
              offset: 0,
              limit: 1,
            },
            timeout: 10000,
          }
        );

        this.logger.debug(`Connection test successful`);

        return {
          success: true,
          message: "Connection successful",
          data: {
            platform: "hepsiburada",
            connectionId: this.connectionId,
            status: "active",
            merchantId: credentials.merchantId,
            environment: this.isTestEnvironment ? "test" : "production",
          },
        };
      } catch (requestError) {
        this.logger.error("Hepsiburada API request failed", {
          error: requestError.message,
          status: requestError.response?.status,
          data: requestError.response?.data,
        });

        let errorMessage = requestError.message;
        const errorData = requestError.response?.data;

        if (errorData) {
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error_description) {
            errorMessage = errorData.error_description;
          } else if (typeof errorData === "string") {
            errorMessage = errorData;
          }
        }

        // Map common HTTP status codes to user-friendly messages
        if (requestError.response?.status === 401) {
          errorMessage =
            "Authentication failed - please check your API credentials";
        } else if (requestError.response?.status === 403) {
          errorMessage =
            "Access denied - your account may not have the required permissions";
        } else if (requestError.response?.status === 404) {
          errorMessage =
            "API endpoint not found - please verify your merchant ID";
        } else if (requestError.response?.status >= 500) {
          errorMessage = "Hepsiburada server error - please try again later";
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      this.logger.error(
        `Hepsiburada connection test failed: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Fetch products from Hepsiburada - Standardized method for consistency across platforms
   * @param {Object} params - Query parameters for product fetching
   * @returns {Promise<Object>} Products data
   */
  async fetchProducts(params = {}) {
    try {
      await this.initialize();

      const defaultParams = {
        offset:
          params.offset ||
          (params.page || 0) * (params.size || params.limit || 50),
        limit: params.size || params.limit || 50,
      };

      const queryParams = { ...defaultParams, ...params };

      // Ensure limit doesn't exceed maximum
      if (queryParams.limit > 100) {
        queryParams.limit = 100;
      }

      this.logger.debug(
        `Fetching Hepsiburada products with params: ${JSON.stringify(
          queryParams
        )}`
      );

      // Use a products endpoint if available, otherwise try to get products from listings
      // Note: Hepsiburada may require specific endpoints for product listing
      let url = `/listings/merchantid/${this.merchantId}`;

      // Try the products endpoint first, if it exists
      try {
        const response = await this.retryRequest(() =>
          this.axiosInstance.get(url, { params: queryParams })
        );

        // Handle empty responses
        if (
          !response.data ||
          (Array.isArray(response.data) && response.data.length === 0)
        ) {
          return {
            success: true,
            message: "No products found in Hepsiburada account",
            data: [],
            pagination: {
              offset: queryParams.offset,
              limit: queryParams.limit,
              total: 0,
            },
          };
        }

        if (!Array.isArray(response.data)) {
          return {
            success: false,
            message: "Invalid response format from Hepsiburada API",
            data: [],
          };
        }

        this.logger.info(
          `Successfully fetched ${response.data.length} products from Hepsiburada`
        );

        return {
          success: true,
          message: `Successfully fetched ${response.data.length} products from Hepsiburada`,
          data: response.data,
          pagination: {
            offset: queryParams.offset,
            limit: queryParams.limit,
            total: response.data.length, // Hepsiburada may not provide total count
            page: Math.floor(queryParams.offset / queryParams.limit),
            size: queryParams.limit,
          },
        };
      } catch (endpointError) {
        // If the listings endpoint doesn't work, try alternative approaches
        this.logger.warn(
          `Listings endpoint failed: ${endpointError.message}. Trying alternative approach.`
        );

        // For now, return a message indicating that product fetching may not be available
        // This can be enhanced once we know the exact Hepsiburada API structure for products
        return {
          success: false,
          message:
            "Product fetching is not yet fully supported for Hepsiburada. Please check API documentation for the correct endpoint.",
          error: "Endpoint not implemented",
          data: [],
          note: "This feature requires specific Hepsiburada API endpoints that may not be available in the current integration.",
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch products from Hepsiburada: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to fetch products: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
      };
    }
  }
}

module.exports = HepsiburadaService;
