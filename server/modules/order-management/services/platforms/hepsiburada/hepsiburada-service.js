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
  constructor(connectionId, directCredentials = null, options = {}) {
    super(connectionId, directCredentials);

    // Support different base URLs for different API types
    this.ordersApiUrl =
      options.ordersApiUrl || "https://oms-external.hepsiburada.com";
    this.productsApiUrl =
      options.productsApiUrl || "https://mpop.hepsiburada.com";

    // Default API URL for general operations (orders)
    this.apiUrl = options.apiUrl || this.ordersApiUrl;

    this.merchantId = null;
    this.isTestEnvironment = options.environment === "test" || true;
    this.logger = this.getLogger();

    // Store auth string for reuse across different API calls
    this.authString = null;
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

    // Set the correct API URLs based on environment
    this.isTestEnvironment =
      environment === "test" || environment === "sandbox" || !environment;

    if (this.isTestEnvironment) {
      this.ordersApiUrl = "https://oms-external-sit.hepsiburada.com";
      this.productsApiUrl = "https://mpop-sit.hepsiburada.com"; // Assuming test URL pattern
    } else {
      this.ordersApiUrl = "https://oms-external.hepsiburada.com";
      this.productsApiUrl = "https://mpop.hepsiburada.com";
    }

    // Create Basic auth header with merchantId:apiKey (not username:apiKey)
    this.authString = Buffer.from(`${merchantId}:${apiKey}`).toString("base64");

    // Set up default axios instance for orders API
    this.axiosInstance = axios.create({
      baseURL: this.ordersApiUrl,
      headers: {
        Authorization: `Basic ${this.authString}`,
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
   * Fetch delivered orders (Teslim Edilen Siparişler)
   * These are orders ready to be packaged
   */
  async fetchDeliveredOrders(params = {}) {
    try {
      await this.initialize();

      const defaultParams = {
        offset: 0,
        limit: 50, // Updated to match API documentation
      };

      const queryParams = { ...defaultParams, ...params };

      // Ensure limit doesn't exceed maximum
      if (queryParams.limit > 50) {
        queryParams.limit = 50;
      }

      // Use the correct API endpoint for getting orders
      const url = `/packages/merchantid/${this.merchantId}/delivered`;

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, {
          params: {
            limit: queryParams.limit,
            offset: queryParams.offset,
          },
        })
      );

      // Handle empty responses as successful connections (for testing purposes)
      if (
        Array.isArray(response.data.items) &&
        response.data.items.length === 0
      ) {
        return {
          success: true,
          message:
            "Successfully connected to Hepsiburada API - no delivered orders found",
          data: [],
        };
      }

      if (!Array.isArray(response.data.items)) {
        return {
          success: false,
          message: "Invalid response format from Hepsiburada API",
          data: [],
        };
      }

      return {
        success: true,
        message: `Successfully fetched ${response.data.items.length} delivered orders from Hepsiburada`,
        data: response.data.items,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.items.length,
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
      const url = `/orders/merchantid/${this.merchantId}/paymentawaiting`;

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, {
          params: {
            limit: queryParams.limit,
            offset: queryParams.offset,
          },
        })
      );

      // Handle empty responses as successful connections (for testing purposes)
      if (
        (Array.isArray(response.data.items) &&
          response.data.items.length === 0) ||
        !response.data.items
      ) {
        return {
          success: true,
          message:
            "Successfully connected to Hepsiburada API - no pending payment orders found",
          data: [],
        };
      }

      if (!Array.isArray(response.data.items)) {
        return {
          success: false,
          message: "Invalid response format from Hepsiburada API",
          data: [],
        };
      }

      return {
        success: true,
        message: `Successfully fetched ${response.data.items.length} pending payment orders from Hepsiburada`,
        data: response.data.items,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.items.length,
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
      let url = `/orders/merchantid/${this.merchantId}`;

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, {
          params: {
            limit: queryParams.limit,
            offset: queryParams.offset,
          },
        })
      );

      if (
        Array.isArray(response.data.items) &&
        response.data.items.length === 0
      ) {
        return {
          success: false,
          message: "No package data returned from Hepsiburada",
          data: [],
        };
      }

      return {
        success: true,
        message: `Successfully fetched ${response.data.items.length} packages from Hepsiburada`,
        data: response.data.items,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.items.length,
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
  async fetchShippedOrders(params = {}) {
    try {
      await this.initialize();

      const defaultParams = {
        offset: 0,
        limit: 50, // Updated to match API documentation
      };

      const queryParams = { ...defaultParams, ...params };

      if (queryParams.limit > 50) {
        queryParams.limit = 50;
      }

      // Use the correct API endpoint pattern
      const url = `/packages/merchantid/${this.merchantId}/shipped`;

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, {
          params: {
            limit: queryParams.limit,
            offset: queryParams.offset,
          },
        })
      );

      // Handle empty responses as successful connections (for testing purposes)
      if (
        (Array.isArray(response.data.items) &&
          response.data.items.length === 0) ||
        !response.data.items
      ) {
        return {
          success: true,
          message:
            "Successfully connected to Hepsiburada API - no shipped orders found",
          data: [],
        };
      }

      if (!Array.isArray(response.data.items)) {
        return {
          success: false,
          message: "Invalid response format from Hepsiburada API",
          data: [],
        };
      }

      return {
        success: true,
        message: `Successfully fetched ${response.data.items.length} shipped orders from Hepsiburada`,
        data: response.data.items,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.items.length,
        },
      };
    } catch (error) {
      logger.error(
        `Failed to fetch shipped orders from Hepsiburada: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to fetch shipped orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
      };
    }
  }

  /**
   * Fetch unpacked orders (Paketlenmemiş Siparişler)
   * Only last 1 month of data is available
   */
  async fetchUnpackedOrders(params = {}) {
    try {
      await this.initialize();

      const defaultParams = {
        offset: 0,
        limit: 50, // Updated to match API documentation
      };

      const queryParams = { ...defaultParams, ...params };

      if (queryParams.limit > 50) {
        queryParams.limit = 50;
      }

      // Use the correct API endpoint pattern
      const url = `/packages/merchantid/${this.merchantId}/status/unpacked`;

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, {
          params: {
            limit: queryParams.limit,
            offset: queryParams.offset,
          },
        })
      );

      // Handle empty responses as successful connections (for testing purposes)
      if (
        Array.isArray(response.data.items) &&
        response.data.items.length === 0
      ) {
        return {
          success: true,
          message:
            "Successfully connected to Hepsiburada API - no unpacked orders found",
          data: [],
        };
      }

      if (!Array.isArray(response.data.items)) {
        return {
          success: false,
          message: "Invalid response format from Hepsiburada API",
          data: [],
        };
      }

      return {
        success: true,
        message: `Successfully fetched ${response.data.items.length} unpacked orders from Hepsiburada`,
        data: response.data.items,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.items.length,
        },
      };
    } catch (error) {
      logger.error(
        `Failed to fetch unpacked orders from Hepsiburada: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to fetch unpacked orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
      };
    }
  }

  /**
   * Fetch undelivered orders (Teslim Edilmeyen Siparişler)
   * Only last 1 month of data is available
   */
  async fetchUndeliveredOrders(params = {}) {
    try {
      await this.initialize();

      const defaultParams = {
        offset: 0,
        limit: 50, // Updated to match API documentation
      };

      const queryParams = { ...defaultParams, ...params };

      if (queryParams.limit > 50) {
        queryParams.limit = 50;
      }

      // Use the correct API endpoint pattern
      const url = `/packages/merchantid/${this.merchantId}/undelivered`;

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, {
          params: {
            limit: queryParams.limit,
            offset: queryParams.offset,
          },
        })
      );

      // Handle empty responses as successful connections (for testing purposes)
      if (
        (Array.isArray(response.data.items) &&
          response.data.items.length === 0) ||
        !response.data.items
      ) {
        return {
          success: true,
          message:
            "Successfully connected to Hepsiburada API - no undelivered orders found",
          data: [],
        };
      }

      if (!Array.isArray(response.data.items)) {
        return {
          success: false,
          message: "Invalid response format from Hepsiburada API",
          data: [],
        };
      }

      return {
        success: true,
        message: `Successfully fetched ${response.data.items.length} undelivered orders from Hepsiburada`,
        data: response.data.items,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.items.length,
        },
      };
    } catch (error) {
      logger.error(
        `Failed to fetch undelivered orders from Hepsiburada: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to fetch undelivered orders: ${error.message}`,
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
        limit: 50, // Updated to match API documentation
      };

      const queryParams = { ...defaultParams, ...params };

      if (queryParams.limit > 50) {
        queryParams.limit = 50;
      }

      // Use the correct API endpoint pattern
      const url = `/orders/merchantid/${this.merchantId}/cancelled`;

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, {
          params: {
            limit: queryParams.limit,
            offset: queryParams.offset,
          },
        })
      );

      // Handle empty responses as successful connections (for testing purposes)
      if (
        Array.isArray(response.data.items) &&
        response.data.items.length === 0
      ) {
        return {
          success: true,
          message:
            "Successfully connected to Hepsiburada API - no cancelled orders found",
          data: [],
        };
      }

      if (!Array.isArray(response.data.items)) {
        return {
          success: false,
          message: "Invalid response format from Hepsiburada API",
          data: [],
        };
      }

      return {
        success: true,
        message: `Successfully fetched ${response.data.items.length} cancelled orders from Hepsiburada`,
        data: response.data.items,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.items.length,
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

      // Fetch from all relevant endpoints and combine results
      const fetchFuncs = [
        this.fetchDeliveredOrders(params),
        this.fetchPendingPaymentOrders(params),
        this.fetchPackages(params),
        this.fetchShippedOrders(params),
        this.fetchUnpackedOrders(params),
        this.fetchUndeliveredOrders(params),
        this.fetchCancelledOrders(params),
      ];

      // Run all fetches in parallel
      const results = await Promise.all(fetchFuncs);

      // Combine all data arrays, filter out failed fetches
      const allOrders = results
        .filter((r) => r && r.success && Array.isArray(r.data))
        .flatMap((r) => r.data);

      // Remove duplicates by orderNumber
      const seen = new Set();
      const uniqueOrders = allOrders.filter((order) => {
        const key = order.orderNumber || order.OrderNumber;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Optionally fetch detailed information for each order
      let enrichedOrders = uniqueOrders;
      if (uniqueOrders.length > 0) {
        logger.info(
          `Fetching detailed information for ${uniqueOrders.length} orders`
        );

        // Extract order numbers for bulk fetching
        const orderNumbers = uniqueOrders
          .map((order) => order.orderNumber || order.OrderNumber)
          .filter(Boolean);

        if (orderNumbers.length > 0) {
          try {
            // Use bulk fetching for better performance
            const bulkDetailsResult = await this.getOrderDetailsBulk(
              orderNumbers,
              {
                batchSize: params.detailsBatchSize || 5,
                delayBetweenBatches: params.detailsDelay || 1000,
                continueOnError: true,
              }
            );

            if (bulkDetailsResult.success) {
              // Create a map of order details for quick lookup
              const detailsMap = new Map();
              bulkDetailsResult.data.forEach((result) => {
                if (result.success) {
                  detailsMap.set(
                    result.orderNumber || result.OrderNumber,
                    result.data
                  );
                }
              });

              // Enrich orders with detailed information
              enrichedOrders = uniqueOrders.map((order) => {
                const orderNumber = order.orderNumber || order.OrderNumber;
                const details = detailsMap.get(orderNumber);

                return {
                  ...order,
                  details: details || null,
                  detailsFetched: !!details,
                };
              });

              const enrichedCount = enrichedOrders.filter(
                (o) => o.detailsFetched
              ).length;
              logger.info(
                `Successfully enriched ${enrichedCount}/${uniqueOrders.length} orders with detailed information`
              );
            } else {
              logger.warn(
                `Bulk details fetch failed: ${bulkDetailsResult.message}`
              );
              // Add detailsFetched: false to all orders
              enrichedOrders = uniqueOrders.map((order) => ({
                ...order,
                detailsFetched: false,
              }));
            }
          } catch (error) {
            logger.error(
              `Error enriching orders with details: ${error.message}`
            );
            // Fall back to original orders with detailsFetched: false
            enrichedOrders = uniqueOrders.map((order) => ({
              ...order,
              detailsFetched: false,
            }));
          }
        }
      }

      // Normalize orders into our database format
      const normalizedResults = await this.normalizeOrders(enrichedOrders);

      return {
        success: true,
        message: `Fetched ${
          enrichedOrders.length
        } unique orders from Hepsiburada (combined from all endpoints)${
          params.includeDetails ? " with detailed information" : ""
        }`,
        data: normalizedResults,
        stats: {
          totalFetched: allOrders.length,
          unique: uniqueOrders.length,
          enriched: params.includeDetails
            ? enrichedOrders.filter((o) => o.detailsFetched).length
            : 0,
          endpoints: results.length,
        },
        endpointResults: results,
      };
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
   * @param {Object} options - Additional options for fetching details
   * @returns {Object} - Order details or error
   */
  async getOrderDetails(orderNumber, options = {}) {
    try {
      await this.initialize();

      if (!orderNumber) {
        return {
          success: false,
          message: "Order number is required",
          data: null,
        };
      }

      // Use the correct API endpoint pattern
      const url = `/orders/merchantid/${this.merchantId}/ordernumber/${orderNumber}`;

      logger.info(`Fetching order details from Hepsiburada: ${orderNumber}`, {
        connectionId: this.connectionId,
        options,
      });

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url)
      );

      // Handle different response formats
      if (!response.data) {
        return {
          success: false,
          message: "No data returned from Hepsiburada API",
          data: null,
        };
      }

      // Check if we have valid order data
      const hasValidOrderData =
        response.data.orderId ||
        response.data.orderNumber ||
        response.data.id ||
        (Array.isArray(response.data.items) && response.data.items.length > 0);

      if (!hasValidOrderData) {
        return {
          success: false,
          message: "Invalid or empty order data returned from Hepsiburada",
          data: response.data,
        };
      }

      return {
        success: true,
        message: "Successfully fetched order details",
        data: response.data,
        orderNumber: orderNumber,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      // Handle specific HTTP errors
      if (error.response?.status === 404) {
        logger.warn(`Order not found: ${orderNumber}`, {
          connectionId: this.connectionId,
          orderNumber,
        });

        return {
          success: false,
          message: `Order not found: ${orderNumber}`,
          error: "ORDER_NOT_FOUND",
          data: null,
        };
      }

      if (error.response?.status === 403) {
        logger.warn(`Access denied for order: ${orderNumber}`, {
          connectionId: this.connectionId,
          orderNumber,
        });

        return {
          success: false,
          message: `Access denied for order: ${orderNumber}`,
          error: "ACCESS_DENIED",
          data: null,
        };
      }

      logger.error(
        `Failed to fetch order details from Hepsiburada: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
          orderNumber,
          statusCode: error.response?.status,
          responseData: error.response?.data,
        }
      );

      return {
        success: false,
        message: `Failed to fetch order details: ${error.message}`,
        error: error.response?.data || error.message,
        data: null,
        orderNumber: orderNumber,
      };
    }
  }

  /**
   * Fetch order details for multiple orders in parallel with rate limiting
   * @param {Array} orderNumbers - Array of order numbers to fetch details for
   * @param {Object} options - Options for bulk fetching
   * @returns {Object} - Results of bulk order details fetching
   */
  async getOrderDetailsBulk(orderNumbers, options = {}) {
    try {
      await this.initialize();

      if (!Array.isArray(orderNumbers) || orderNumbers.length === 0) {
        return {
          success: false,
          message: "Order numbers array is required and cannot be empty",
          data: [],
        };
      }

      const {
        batchSize = 10, // Process orders in batches to avoid overwhelming the API
        delayBetweenBatches = 1000, // 1 second delay between batches
        continueOnError = true, // Continue processing even if some orders fail
      } = options;

      logger.info(
        `Fetching details for ${orderNumbers.length} orders in batches of ${batchSize}`,
        {
          connectionId: this.connectionId,
          totalOrders: orderNumbers.length,
          batchSize,
        }
      );

      const results = [];
      const batches = [];

      // Split order numbers into batches
      for (let i = 0; i < orderNumbers.length; i += batchSize) {
        batches.push(orderNumbers.slice(i, i + batchSize));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        logger.info(
          `Processing batch ${batchIndex + 1}/${batches.length} with ${
            batch.length
          } orders`
        );

        // Process current batch in parallel
        const batchPromises = batch.map((orderNumber) =>
          this.getOrderDetails(orderNumber, { bulkFetch: true })
        );

        try {
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
        } catch (error) {
          if (continueOnError) {
            logger.warn(
              `Batch ${batchIndex + 1} failed, continuing with next batch: ${
                error.message
              }`
            );
            // Add failed results for this batch
            const failedResults = batch.map((orderNumber) => ({
              success: false,
              message: `Batch processing failed: ${error.message}`,
              data: null,
              orderNumber,
            }));
            results.push(...failedResults);
          } else {
            throw error;
          }
        }

        // Add delay between batches (except for the last batch)
        if (batchIndex < batches.length - 1 && delayBetweenBatches > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, delayBetweenBatches)
          );
        }
      }

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      return {
        success: true,
        message: `Bulk fetch completed: ${successful.length} successful, ${failed.length} failed`,
        data: results,
        stats: {
          total: orderNumbers.length,
          successful: successful.length,
          failed: failed.length,
          batches: batches.length,
          batchSize,
        },
      };
    } catch (error) {
      logger.error(`Bulk order details fetch failed: ${error.message}`, {
        error,
        connectionId: this.connectionId,
        orderCount: orderNumbers?.length,
      });

      return {
        success: false,
        message: `Bulk order details fetch failed: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
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
      const orderNumbers = hepsiburadaOrders.map(
        (order) => order.orderNumber || order.OrderNumber
      );

      // First query - fetch all orders matching our criteria
      const existingOrders = await Order.findAll({
        where: {
          connectionId: this.connectionId,
          externalOrderId: {
            [Op.in]: orderNumbers,
          },
        },
        attributes: ["id", "externalOrderId", "orderNumber", "orderStatus"], // Limit fields fetched
        include: [
          {
            model: ShippingDetail,
            as: "shippingDetail",
            attributes: ["id", "recipientName", "address", "city"], // Limit fields fetched
          },
        ],
      });

      // Map for fast lookups
      const existingOrdersMap = {};
      existingOrders.forEach((order) => {
        existingOrdersMap[order.orderNumber] = order;
      });

      // Process orders one by one
      for (const order of hepsiburadaOrders) {
        try {
          // Validate and extract order identifier with fallbacks
          const orderNumber = order.orderNumber || order.OrderNumber;

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
                status: this.mapOrderStatus(order.details.items[0].status),
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
            this.logger.info(`Creating new order for ${orderNumber}`);

            const result = await sequelize.transaction(async (t) => {
              // Extract phone number from order data
              const phoneNumber = this.extractPhoneNumber(order);

              // Create shipping detail first
              const shippingDetail = await ShippingDetail.create(
                {
                  recipientName:
                    order.details.deliveryAddress?.name ||
                    order.details.customer?.name ||
                    "",
                  address1:
                    order.details.deliveryAddress?.address ||
                    order.details.invoice?.address ||
                    "",
                  address2: "",
                  city:
                    order.details.deliveryAddress?.city ||
                    order.details.invoice.address.city ||
                    "",
                  state:
                    order.details.deliveryAddress?.district ||
                    order.details.invoice.address.district ||
                    "",
                  postalCode:
                    order.details.deliveryAddress?.postalCode ||
                    order.details.invoice.address.postalCode ||
                    "",
                  country: order.details.deliveryAddress?.country || "TR",
                  phone: phoneNumber || "",
                  email: order.details.deliveryAddress?.email || "",
                },
                { transaction: t }
              );

              // Create the main order record
              const normalizedOrder = await Order.create(
                {
                  externalOrderId: orderNumber,
                  orderNumber: orderNumber,
                  platformOrderId: order.Id,
                  platformId: "hepsiburada",
                  connectionId: this.connectionId,
                  userId: this.connection.userId,
                  customerName:
                    order.details.deliveryAddress?.name ||
                    order.details.customer?.name,
                  customerEmail: order.details.deliveryAddress?.email || "",
                  customerPhone: phoneNumber || "",
                  orderDate: order.details.orderDate
                    ? new Date(order.details.orderDate)
                    : new Date(),
                  orderStatus: this.mapOrderStatus(
                    order.details.items[0]?.status
                  ),
                  totalAmount: order.details.items[0]?.totalPrice.amount || 0,
                  currency: "TRY",
                  shippingDetailId: shippingDetail.id,
                  shippingAddress: order.details.deliveryAddress?.address || {},
                  notes: "",
                  paymentStatus: this.mapPaymentStatus(
                    order.details.paymentStatus
                  ),
                  platformStatus: order.details.items[0]?.status || "new",
                  platform: "hepsiburada",
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
              if (order.items && Array.isArray(order.details.items)) {
                for (const item of order.details.items) {
                  await OrderItem.create(
                    {
                      orderId: normalizedOrder.id,
                      platformProductId:
                        item.productBarcode || item.merchantSku || "",
                      productId: item.productBarcode,
                      title: item.name || item.title || "Unknown Product",
                      sku: item.merchantSku || item.sku || "",
                      quantity: item.quantity || 1,
                      price: item.unitPrice.amount || 0,
                      discount:
                        item.merchantDiscount.totalPrice.amount ||
                        item.hbDiscount.totalPrice.amount,
                      invoiceTotal: item.totalPrice.amount || 0,
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
            `Failed to process order ${order.orderNumber}: ${error.message}`,
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
      Open: "pending",
      PaymentCompleted: "processing",
      Packaged: "shipped",
      InTransit: "shipped",
      Delivered: "delivered",
      CancelledByMerchant: "cancelled",
      CancelledByCustomer: "cancelled",
      CancelledBySap: "cancelled",
      ReadyToShip: "processing",
      ClaimCreated: "claim_created",
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
        page: params.page || 0,
        size: params.size || params.limit || 1000,
      };

      const queryParams = { ...defaultParams, ...params };

      // If no specific page is requested, fetch all products by looping through pages
      if (queryParams.page === 0 && !params.page) {
        return this.fetchAllProductsInternal(params);
      }

      this.logger.debug(
        `Fetching Hepsiburada products with params: ${JSON.stringify(
          queryParams
        )}`
      );

      // Use the working products endpoint from our testing
      let url = `/product/api/products/all-products-of-merchant/${this.merchantId}`;

      this.logger.debug(`Attempting to fetch products from: ${url}`);

      // Try the products endpoint that we verified works
      try {
        // Create products-specific axios instance
        const productsAxios = this.createProductsAxiosInstance();

        const response = await this.retryRequest(() =>
          productsAxios.get(url, { params: queryParams })
        );

        // Log response details for debugging
        this.logger.debug(`Hepsiburada products API response:`, {
          status: response.status,
          dataType: typeof response.data,
          responseStructure: {
            hasData: !!response.data?.data,
            hasSuccess: !!response.data?.success,
            hasCode: response.data?.code !== undefined,
            hasPagination: !!(
              response.data?.totalElements || response.data?.totalPages
            ),
          },
          dataArrayLength: Array.isArray(response.data?.data)
            ? response.data.data.length
            : "N/A",
        });

        // Check if response indicates success
        if (response.data?.code !== 0 && !response.data?.success) {
          this.logger.warn("Hepsiburada API returned unsuccessful response:", {
            code: response.data?.code,
            success: response.data?.success,
            message: response.data?.message,
          });
          return {
            success: false,
            message:
              response.data?.message || "API returned unsuccessful response",
            data: [],
          };
        }

        // Extract the actual products array from nested response structure
        const productsData = response.data?.data || response.data;

        // Handle empty responses
        if (
          !productsData ||
          (Array.isArray(productsData) && productsData.length === 0)
        ) {
          return {
            success: true,
            message: "No products found in Hepsiburada account",
            data: [],
            pagination: {
              page: queryParams.page,
              limit: queryParams.size,
              total: response.data?.totalElements || 0,
              totalPages: response.data?.totalPages || 0,
              isFirst: response.data?.first || true,
              isLast: response.data?.last || true,
            },
          };
        }

        if (!Array.isArray(productsData)) {
          this.logger.warn(
            `Expected array but got ${typeof productsData}:`,
            productsData
          );
          return {
            success: false,
            message:
              "Invalid response format from Hepsiburada API - expected array of products",
            data: [],
          };
        }

        this.logger.info(
          `Successfully fetched ${
            productsData.length
          } products from Hepsiburada (page ${queryParams.page + 1}/${
            response.data?.totalPages || "unknown"
          })`
        );

        return {
          success: true,
          message: `Successfully fetched ${productsData.length} products from Hepsiburada`,
          data: productsData,
          pagination: {
            page: response.data?.number || queryParams.page,
            limit: queryParams.size,
            total: response.data?.totalElements || productsData.length,
            totalPages: response.data?.totalPages || 1,
            numberOfElements:
              response.data?.numberOfElements || productsData.length,
            isFirst: response.data?.first || queryParams.page === 0,
            isLast: response.data?.last || false,
            hasNext: !response.data?.last,
            hasPrevious: !response.data?.first,
          },
        };
      } catch (endpointError) {
        this.logger.error(
          `Products endpoint failed: ${endpointError.message}`,
          {
            error: endpointError,
            url,
            status: endpointError.response?.status,
            responseData: endpointError.response?.data,
          }
        );

        // Return the error details for debugging
        return {
          success: false,
          message: `Failed to fetch products from Hepsiburada: ${endpointError.message}`,
          error: endpointError.response?.data || endpointError.message,
          data: [],
          debugInfo: {
            endpoint: url,
            status: endpointError.response?.status,
            method: "GET",
            baseURL: this.apiUrl,
          },
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

  /**
   * Fetch all products from Hepsiburada by looping through all pages
   * @param {Object} params - Query parameters for product fetching
   * @returns {Promise<Object>} All products data
   */
  async fetchAllProductsInternal(params = {}) {
    try {
      await this.initialize();

      const allProducts = [];
      let currentPage = 0;
      let totalPages = 1;
      let hasMorePages = true;

      const defaultParams = {
        size: params.size || params.limit || 1000,
      };

      this.logger.info("Starting to fetch all products from Hepsiburada...");

      while (hasMorePages) {
        const pageParams = {
          ...defaultParams,
          ...params,
          page: currentPage,
        };

        this.logger.debug(
          `Fetching Hepsiburada products page ${currentPage + 1}...`
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
          hasMorePages = currentPage < totalPages && !result.pagination.isLast;

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

        // If this page had no products or was marked as last, stop
        if (result.data.length === 0 || result.pagination?.isLast) {
          hasMorePages = false;
        }
      }

      this.logger.info(
        `Completed fetching all products from Hepsiburada: ${allProducts.length} total products across ${currentPage} pages`
      );

      return {
        success: true,
        message: `Successfully fetched ${allProducts.length} products from Hepsiburada across ${currentPage} pages`,
        data: allProducts,
        pagination: {
          totalPages: currentPage,
          totalProducts: allProducts.length,
          pagesProcessed: currentPage,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch all products from Hepsiburada: ${error.message}`,
        {
          error,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to fetch all products: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
      };
    }
  }

  /**
   * Fetch a single page of products from Hepsiburada
   * @param {Object} params - Query parameters for product fetching
   * @returns {Promise<Object>} Products data for a single page
   */
  async fetchSingleProductPage(params = {}) {
    // This is the original fetchProducts logic, now extracted for single page fetching
    try {
      await this.initialize();

      const defaultParams = {
        page: params.page || 0,
        size: params.size || params.limit || 1000,
      };

      const queryParams = { ...defaultParams, ...params };

      this.logger.debug(
        `Fetching Hepsiburada products with params: ${JSON.stringify(
          queryParams
        )}`
      );

      // Use the working products endpoint from our testing
      let url = `/product/api/products/all-products-of-merchant/${this.merchantId}`;

      this.logger.debug(`Attempting to fetch products from: ${url}`);

      // Try the products endpoint that we verified works
      try {
        // Create products-specific axios instance
        const productsAxios = this.createProductsAxiosInstance();

        const response = await this.retryRequest(() =>
          productsAxios.get(url, { params: queryParams })
        );

        // Log response details for debugging
        this.logger.debug(`Hepsiburada products API response:`, {
          status: response.status,
          dataType: typeof response.data,
          responseStructure: {
            hasData: !!response.data?.data,
            hasSuccess: !!response.data?.success,
            hasCode: response.data?.code !== undefined,
            hasPagination: !!(
              response.data?.totalElements || response.data?.totalPages
            ),
          },
          dataArrayLength: Array.isArray(response.data?.data)
            ? response.data.data.length
            : "N/A",
        });

        // Check if response indicates success
        if (response.data?.code !== 0 && !response.data?.success) {
          this.logger.warn("Hepsiburada API returned unsuccessful response:", {
            code: response.data?.code,
            success: response.data?.success,
            message: response.data?.message,
          });
          return {
            success: false,
            message:
              response.data?.message || "API returned unsuccessful response",
            data: [],
          };
        }

        // Extract the actual products array from nested response structure
        const productsData = response.data?.data || response.data;

        // Handle empty responses
        if (
          !productsData ||
          (Array.isArray(productsData) && productsData.length === 0)
        ) {
          return {
            success: true,
            message: "No products found in Hepsiburada account",
            data: [],
            pagination: {
              page: queryParams.page,
              limit: queryParams.size,
              total: response.data?.totalElements || 0,
              totalPages: response.data?.totalPages || 0,
              isFirst: response.data?.first || true,
              isLast: response.data?.last || true,
            },
          };
        }

        if (!Array.isArray(productsData)) {
          this.logger.warn(
            `Expected array but got ${typeof productsData}:`,
            productsData
          );
          return {
            success: false,
            message:
              "Invalid response format from Hepsiburada API - expected array of products",
            data: [],
          };
        }

        this.logger.info(
          `Successfully fetched ${
            productsData.length
          } products from Hepsiburada (page ${queryParams.page + 1}/${
            response.data?.totalPages || "unknown"
          })`
        );

        return {
          success: true,
          message: `Successfully fetched ${productsData.length} products from Hepsiburada`,
          data: productsData,
          pagination: {
            page: response.data?.number || queryParams.page,
            limit: queryParams.size,
            total: response.data?.totalElements || productsData.length,
            totalPages: response.data?.totalPages || 1,
            numberOfElements:
              response.data?.numberOfElements || productsData.length,
            isFirst: response.data?.first || queryParams.page === 0,
            isLast: response.data?.last || false,
            hasNext: !response.data?.last,
            hasPrevious: !response.data?.first,
          },
        };
      } catch (endpointError) {
        this.logger.error(
          `Products endpoint failed: ${endpointError.message}`,
          {
            error: endpointError,
            url,
            status: endpointError.response?.status,
            responseData: endpointError.response?.data,
          }
        );

        // Return the error details for debugging
        return {
          success: false,
          message: `Failed to fetch products from Hepsiburada: ${endpointError.message}`,
          error: endpointError.response?.data || endpointError.message,
          data: [],
          debugInfo: {
            endpoint: url,
            status: endpointError.response?.status,
            method: "GET",
            baseURL: this.apiUrl,
          },
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

  /**
   * Create axios instance for products API with different base URL
   * @returns {Object} Axios instance configured for products API
   */
  createProductsAxiosInstance() {
    if (!this.authString) {
      throw new Error(
        "Authentication not initialized. Call setupAxiosInstance first."
      );
    }

    return axios.create({
      baseURL: this.productsApiUrl,
      headers: {
        Authorization: `Basic ${this.authString}`,
        "User-Agent": "sentosyazilim_dev",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
    });
  }
}

module.exports = HepsiburadaService;
