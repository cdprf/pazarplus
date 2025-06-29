const axios = require("axios");
const {
  Order,
  OrderItem,
  User,
  PlatformConnection,
  ShippingDetail,
  HepsiburadaOrder,
  HepsiburadaProduct,
} = require("../../../../../models");
const { Op } = require("sequelize");
const sequelize = require("../../../../../config/database");
const logger = require("../../../../../utils/logger");
const BasePlatformService = require("../BasePlatformService"); // Fixed import path
const ProductOrderLinkingService = require("../../../../../services/product-order-linking-service");
const { mapOrderStatus } = require("../../../../../utils/enum-validators");

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
    this.logger.info("🔍 Hepsiburada service initialization started", {
      connectionId: this.connectionId,
      hasDirectCredentials: !!this.directCredentials,
      timestamp: new Date().toISOString(),
    });

    try {
      const credentials = this.decryptCredentials(this.connection.credentials);
      const { username, merchantId, apiKey, environment } = credentials;

      // Enhanced validation with detailed logging
      const missingFields = [];
      if (!username) missingFields.push("username");
      if (!apiKey) missingFields.push("apiKey");
      if (!merchantId) missingFields.push("merchantId");

      if (missingFields.length > 0) {
        this.logger.error("Missing required Hepsiburada credentials", {
          missingFields,
          connectionId: this.connectionId,
          hasUsername: !!username,
          hasApiKey: !!apiKey,
          hasMerchantId: !!merchantId,
          environment: environment || "not specified",
        });
        throw new Error(
          `Missing required Hepsiburada credentials: ${missingFields.join(
            ", "
          )}. Username, Merchant ID, and API Key are required.`
        );
      }

      this.logger.info("✅ Hepsiburada credentials validated successfully", {
        connectionId: this.connectionId,
        username: username ? `${username.substring(0, 3)}***` : "missing",
        merchantId: merchantId ? `${merchantId.substring(0, 3)}***` : "missing",
        apiKeyLength: apiKey ? apiKey.length : 0,
        environment: environment || "test (default)",
      });

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
      this.authString = Buffer.from(`${merchantId}:${apiKey}`).toString(
        "base64"
      );

      // Set up default axios instance for orders API
      this.axiosInstance = axios.create({
        baseURL: this.ordersApiUrl,
        headers: {
          Authorization: `Basic ${this.authString}`,
          "User-Agent": username,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000,
      });

      this.logger.info("✅ Hepsiburada Axios instance created successfully", {
        connectionId: this.connectionId,
        baseURL: this.ordersApiUrl,
        timeout: 30000,
        userAgent: username ? `${username.substring(0, 5)}***` : "missing",
      });

      // Test the connection with a simple request
      try {
        this.logger.debug("🧪 Testing Hepsiburada API connectivity", {
          connectionId: this.connectionId,
        });

        // We'll test with a simple endpoint call later, for now just validate the setup
        this.merchantId = merchantId;

        this.logger.info(
          "🎉 Hepsiburada service initialization completed successfully",
          {
            connectionId: this.connectionId,
            merchantId: merchantId
              ? `${merchantId.substring(0, 3)}***`
              : "missing",
            environment: this.isTestEnvironment ? "test" : "production",
          }
        );

        return true;
      } catch (connectionTestError) {
        this.logger.warn(
          "⚠️ Hepsiburada API connectivity test failed (setup completed but connection untested)",
          {
            connectionId: this.connectionId,
            error: connectionTestError.message,
            statusCode: connectionTestError.response?.status,
            baseURL: this.ordersApiUrl,
          }
        );

        // Still return true as the setup is complete, connection will be tested on first actual request
        this.merchantId = merchantId;
        return true;
      }
    } catch (setupError) {
      this.logger.error("Hepsiburada service initialization failed", {
        connectionId: this.connectionId,
        error: setupError.message,
        stack: setupError.stack,
        errorType: setupError.constructor.name,
      });
      throw setupError;
    }
  }

  /**
   * Override decryptCredentials for Hepsiburada-specific format
   * @param {string|object} encryptedCredentials
   * @returns {object} Decrypted credentials
   */
  decryptCredentials(encryptedCredentials) {
    this.logger.info("🔐 Starting Hepsiburada credentials decryption", {
      connectionId: this.connectionId,
      credentialsType: typeof encryptedCredentials,
      credentialsExists: !!encryptedCredentials,
      isString: typeof encryptedCredentials === "string",
      isObject: typeof encryptedCredentials === "object",
      timestamp: new Date().toISOString(),
    });

    try {
      // Use the parent implementation for basic parsing
      const credentials = super.decryptCredentials(encryptedCredentials);

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

        this.logger.error("Hepsiburada credentials validation failed", {
          connectionId: this.connectionId,
          missingFields: missing,
          receivedCredentials: credentials
            ? {
                hasUsername: !!credentials.username,
                hasMerchantId: !!credentials.merchantId,
                hasApiKey: !!credentials.apiKey,
                keys: Object.keys(credentials),
              }
            : null,
          originalCredentialsType: typeof encryptedCredentials,
        });

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
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          connectionId: this.connectionId,
          credentialsType: typeof encryptedCredentials,
          credentialsExists: !!encryptedCredentials,
          isEncryptionError: error.message.includes("decrypt"),
          isValidationError:
            error.message.includes("validation") ||
            error.message.includes("Missing"),
          isParsingError:
            error.message.includes("parse") || error.message.includes("JSON"),
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

      // Build API parameters - MINIMAL approach based on official documentation
      const apiParams = {
        limit: queryParams.limit,
        offset: queryParams.offset,
      };

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, {
          params: apiParams,
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

      // Build API parameters - MINIMAL approach (this endpoint may not support date filtering)
      const apiParams = {
        limit: queryParams.limit,
        offset: queryParams.offset,
      };

      // Skip date filtering for this endpoint as it's not clearly documented as supported

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, {
          params: apiParams,
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
      let url = `/packages/merchantid/${this.merchantId}`;

      // Build query parameters - MINIMAL approach based on official documentation
      const apiParams = {
        limit: queryParams.limit,
        offset: queryParams.offset,
      };

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, {
          params: apiParams,
        })
      );

      // Handle response - check if it's an array directly or has items property
      let responseData = response.data;
      if (Array.isArray(response.data)) {
        responseData = response.data;
      } else if (response.data.items && Array.isArray(response.data.items)) {
        responseData = response.data.items;
      } else {
        responseData = [];
      }

      if (responseData.length === 0) {
        return {
          success: true, // Changed to true - no orders in date range is valid
          message: `No package data found for Hepsiburada merchant ID ${this.merchantId}`,
          data: [],
        };
      }

      this.logger.info(
        `Successfully fetched ${responseData.length} packages from Hepsiburada`
      );

      return {
        success: true,
        message: `Successfully fetched ${responseData.length} packages from Hepsiburada`,
        data: responseData,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: responseData.length,
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
   * Fetch shipped orders (Teslim Edilen Siparişler)
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

      // Build API parameters - MINIMAL approach based on official documentation
      const apiParams = {
        limit: queryParams.limit,
        offset: queryParams.offset,
      };

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, {
          params: apiParams,
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

      // Build API parameters - MINIMAL approach based on official documentation
      const apiParams = {
        limit: queryParams.limit,
        offset: queryParams.offset,
      };

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, {
          params: apiParams,
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

      // Build API parameters - MINIMAL approach based on official documentation
      const apiParams = {
        limit: queryParams.limit,
        offset: queryParams.offset,
      };

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, {
          params: apiParams,
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

      // Build API parameters - MINIMAL approach based on official documentation
      const apiParams = {
        limit: queryParams.limit,
        offset: queryParams.offset,
      };

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url, {
          params: apiParams,
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
   * Main method to fetch orders from all Hepsiburada API endpoints
   * Implementation of abstract method from BasePlatformService
   */
  async fetchOrders(params = {}) {
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

      this.logger.info(`Fetching Hepsiburada orders from all endpoints`, {
        connectionId: this.connectionId,
      });

      // Fetch from all relevant endpoints and combine results
      const fetchFunctions = [
        this.fetchDeliveredOrders(queryParams),
        this.fetchPendingPaymentOrders(queryParams),
        this.fetchPackages(queryParams),
        this.fetchShippedOrders(queryParams),
        this.fetchUnpackedOrders(queryParams),
        this.fetchUndeliveredOrders(queryParams),
        this.fetchCancelledOrders(queryParams),
      ];

      // Run all fetches in parallel for better performance
      const results = await Promise.all(fetchFunctions);

      // Check if any endpoint failed and log the failures
      const failedResults = results.filter((r) => !r || !r.success);
      if (failedResults.length > 0) {
        this.logger.error(
          `${failedResults.length} out of ${results.length} order endpoints failed`,
          {
            connectionId: this.connectionId,
            failedCount: failedResults.length,
            totalCount: results.length,
            failures: failedResults.map((r) => ({
              message: r?.message || "Unknown error",
              error: r?.error || "No error details",
            })),
          }
        );

        // If any endpoints failed, throw error instead of continuing
        throw new Error(
          `Order fetching failed: ${failedResults.length}/${results.length} endpoints failed`
        );
      }

      // Combine all data arrays from successful fetches
      const allOrders = results.flatMap((r) => r.data);

      // Remove duplicates by orderNumber or id
      const seen = new Set();
      const uniqueOrders = allOrders.filter((order) => {
        const key = order.orderNumber || order.OrderNumber || order.id;
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
              // Log failure but do not continue processing
              throw new Error(
                `Order details enrichment failed: ${bulkDetailsResult.message}`
              );
            }
          } catch (error) {
            logger.error(
              `Error enriching orders with details: ${error.message}`,
              {
                error,
                connectionId: this.connectionId,
                orderCount: orderNumbers.length,
              }
            );
            // Log failure and re-throw error instead of fallback
            throw error;
          }
        }
      }

      this.logger.info(
        `Successfully fetched ${allOrders.length} total orders (${uniqueOrders.length} unique) from all Hepsiburada endpoints`,
        {
          connectionId: this.connectionId,
          totalOrders: allOrders.length,
          uniqueOrders: uniqueOrders.length,
          duplicatesRemoved: allOrders.length - uniqueOrders.length,
        }
      );

      // Normalize orders into our database format
      const normalizedResults = await this.normalizeOrders(enrichedOrders);

      return {
        success: true,
        message: `Successfully fetched ${uniqueOrders.length} orders from all Hepsiburada endpoints`,
        data: normalizedResults.data,
        stats: {
          ...normalizedResults.stats,
          totalFetched: allOrders.length,
          uniqueOrders: uniqueOrders.length,
          duplicatesRemoved: allOrders.length - uniqueOrders.length,
          endpointsUsed: results.length, // All endpoints were successful if we reach here
        },
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: uniqueOrders.length,
        },
      };
    } catch (error) {
      this.logger.error(
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
          logger.error(`Batch ${batchIndex + 1} failed: ${error.message}`, {
            error,
            connectionId: this.connectionId,
            batchIndex: batchIndex + 1,
            batchSize: batch.length,
          });

          if (continueOnError) {
            // Log failure but do not add fallback results - re-throw error
            throw new Error(
              `Batch processing failed at batch ${batchIndex + 1}: ${
                error.message
              }`
            );
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
      const orderNumbers = hepsiburadaOrders
        .map(
          (order) =>
            order.orderNumber ||
            order.OrderNumber ||
            (order.items && order.items[0]?.orderNumber)
        )
        .filter(Boolean); // Remove undefined/null/empty values

      // If no valid order numbers found, return early
      if (orderNumbers.length === 0) {
        return {
          success: true,
          normalizedOrders: [],
          summary: {
            successCount: 0,
            skippedCount: hepsiburadaOrders.length,
            updatedCount: 0,
          },
        };
      }

      // First query - fetch all orders matching our criteria
      const existingOrders = await Order.findAll({
        where: {
          connectionId: this.connectionId,
          externalOrderId: {
            [Op.in]: orderNumbers,
          },
        },
        attributes: [
          "id",
          "externalOrderId",
          "orderNumber",
          "orderStatus",
          "cargoTrackingLink",
          "cargoTrackingNumber",
          "cargoCompany",
          "orderDate",
          "customerName",
          "customerEmail",
          "customerPhone",
        ], // Limit fields fetched

        include: [
          {
            model: ShippingDetail,
            as: "shippingDetail",
            attributes: ["id", "recipientName", "address", "city"], // Limit fields fetched
          },
          {
            model: OrderItem,
            as: "items",
            attributes: ["id", "title", "sku", "quantity", "price"], // Limit fields fetched
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
          const orderNumber =
            order.orderNumber ||
            order.OrderNumber ||
            (order.items && order.items[0]?.orderNumber);

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
              // Extract product names and sku from items
              const productNames = order.items
                ? order.items.map((item) => item.name || "")
                : [];
              const skus = order.items
                ? order.items.map((item) => item.merchantSKU || item.SKU || "")
                : [];
              await existingOrder.update({
                status: this.mapOrderStatus(
                  order.details.items[0].status || (order.items && order.items[0]?.status)
                ),
                cargoTrackingLink:
                  order.details.items[0].cargoCompanyModel.trackingUrl || "",
                cargoTrackingNumber: order.Barcode || "",
                cargoCompany: order.details.items[0].cargoCompany || "",
                orderDate: order.details?.createdDate
                  ? new Date(order.details.createdDate)
                  : null,
                customerName: order.details.deliveryAddress.name || "",
                customerEmail: order.details?.deliveryAddress?.email || "",
                customerPhone: order.details.deliveryAddress.phoneNumber,

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
                  error: {
                    message: updateError.message,
                    stack: updateError.stack,
                    name: updateError.name,
                    code: updateError.code,
                  },
                  orderNumber: orderNumber,
                  connectionId: this.connectionId,
                  orderData: {
                    hasStatus: !!(
                      order.status ||
                      (order.items && order.items[0]?.status)
                    ),
                    hasItems: !!order.items,
                    orderStructure: Object.keys(order || {}),
                  },
                  isDatabaseError: updateError.name?.includes("Sequelize"),
                  isConstraintError:
                    updateError.name === "SequelizeUniqueConstraintError",
                  isConnectionError:
                    updateError.message?.includes("connection") ||
                    updateError.code === "ECONNREFUSED",
                }
              );
              // Re-throw error instead of continuing with fallback
              throw updateError;
            }
          }

          // Order doesn't exist - create a new one

          try {
            this.logger.info(`Creating new order for ${orderNumber}`, {
              connectionId: this.connectionId,
              orderNumber,
              orderStructure: Object.keys(order || {}),
              hasDetails: !!order.details,
              hasItems: !!order.items,
              detailsStructure: order.details ? Object.keys(order.details) : [],
              itemsCount: order.items ? order.items.length : 0,
            });

            const result = await sequelize.transaction(async (t) => {
              // Extract data from rawData structure (details.customer, details.items, etc.)
              const customerName =
                order.details?.customer?.name ||
                order.details?.items?.[0]?.customerName ||
                order.customerName ||
                order.recipientName ||
                "";

              const customerEmail =
                order.details?.invoice?.address?.email ||
                order.details?.deliveryAddress?.email ||
                order.details?.items?.[0]?.shippingAddress?.email ||
                order.email ||
                "";

              // Extract phone number from order data
              const phoneNumber = this.extractPhoneNumber(order);

              // Calculate total amount from items in details
              let totalAmount = 0;
              if (order.details?.items) {
                totalAmount = order.details.items.reduce((sum, item) => {
                  return sum + (item.totalPrice?.amount || 0);
                }, 0);
              }
              // Fallback to order level total
              if (totalAmount === 0) {
                totalAmount = order.totalPrice?.amount || 0;
              }

              // Extract order status from items
              const orderStatus =
                order.details?.items?.[0]?.status || order.status || "new";

              // Extract cargo tracking info
              const cargoTrackingNumber =
                order.details?.items?.[0]?.packageNumber ||
                order.details?.items?.[0]?.barcode ||
                order.PackageNumber ||
                order.Barcode ||
                null;

              // Extract order date
              const orderDate = order.details?.orderDate
                ? new Date(order.details.orderDate)
                : order.details?.createdDate
                ? new Date(order.details.createdDate)
                : order.orderDate
                ? new Date(order.orderDate)
                : new Date();

              // Create the main order record with findOrCreate for atomicity
              const [normalizedOrder, created] = await Order.findOrCreate({
                where: {
                  externalOrderId: orderNumber,
                  connectionId: this.connectionId,
                },
                defaults: {
                  externalOrderId: orderNumber,
                  orderNumber: orderNumber,
                  platformOrderId:
                    order.Id ||
                    order.id ||
                    order.orderId ||
                    (order.details && order.details.orderId) ||
                    (order.details && order.details.Id) ||
                    (order.items && order.items[0] && order.items[0].orderId) ||
                    (order.items && order.items[0] && order.items[0].Id),
                  platformId: "hepsiburada",
                  connectionId: this.connectionId,
                  userId: this.connection.userId,
                  customerName: customerName,
                  customerEmail: customerEmail,
                  customerPhone: phoneNumber || "",
                  cargoTrackingNumber: cargoTrackingNumber,

                  // Required JSON fields for database
                  customerInfo: this.safeJsonStringify({
                    firstName: customerName.split(" ")[0] || "",
                    lastName: customerName.split(" ").slice(1).join(" ") || "",
                    email: customerEmail,
                    phone: phoneNumber || "",
                    fullName: customerName,
                    customerId: order.details?.customer?.customerId || null,
                  }),
                  shippingAddress: this.safeJsonStringify(
                    order.details?.deliveryAddress ||
                      order.details?.items?.[0]?.shippingAddress ||
                      order.shippingAddressDetail ||
                      {}
                  ),

                  orderDate: orderDate,
                  orderStatus: this.mapOrderStatus(orderStatus),
                  totalAmount: totalAmount.toString(),
                  currency:
                    order.details?.items?.[0]?.totalPrice?.currency || "TRY",
                  notes: "",
                  paymentStatus: order.details?.paymentStatus
                    ? this.mapPaymentStatus(order.details.paymentStatus)
                    : "pending",
                  platformStatus: orderStatus,
                  platform: "hepsiburada",
                  rawData: JSON.stringify(order),
                  lastSyncedAt: new Date(),
                },
                transaction: t,
              });

              if (created) {
                this.logger.debug(`Created new order for ${orderNumber}`);
              } else {
                this.logger.debug(
                  `Found existing order for ${orderNumber}, updating if needed`
                );
              }

              // Create shipping detail with orderId - extract from rawData
              const shippingAddress =
                order.details?.deliveryAddress ||
                order.details?.items?.[0]?.shippingAddress ||
                {};

              const shippingDetail = await ShippingDetail.create(
                {
                  orderId: normalizedOrder.id,
                  recipientName: customerName,
                  address:
                    shippingAddress.fullAddress ||
                    shippingAddress.address ||
                    order.shippingAddressDetail ||
                    order.billingAddress ||
                    "",
                  city:
                    shippingAddress.city ||
                    order.shippingCity ||
                    order.billingCity ||
                    "",
                  state:
                    shippingAddress.district ||
                    order.shippingDistrict ||
                    order.billingDistrict ||
                    "",
                  postalCode:
                    shippingAddress.postalCode ||
                    order.shippingPostalCode ||
                    order.billingPostalCode ||
                    "",
                  country:
                    shippingAddress.countryCode ||
                    order.shippingCountryCode ||
                    order.billingCountryCode ||
                    "TR",
                  phone: phoneNumber || "",
                  email: customerEmail,
                },
                { transaction: t }
              );

              // Update order with shipping detail ID
              await normalizedOrder.update(
                { shippingDetailId: shippingDetail.id },
                { transaction: t }
              );

              // Create Hepsiburada-specific order record
              await this.createHepsiburadaOrderRecord(
                normalizedOrder.id,
                order,
                t
              );

              // Create order items if available - use details.items structure
              let orderItemsData = [];

              if (order.details?.items && Array.isArray(order.details.items)) {
                // Prepare order items data from details.items (primary structure)
                orderItemsData = order.details.items.map((item) => {
                  const unitPrice =
                    item.unitPrice?.amount || item.totalPrice?.amount || 0;
                  const quantity = item.quantity || 1;
                  const totalItemPrice =
                    item.totalPrice?.amount || unitPrice * quantity;

                  return {
                    orderId: normalizedOrder.id,
                    platformProductId:
                      item.productBarcode || item.sku || item.merchantSKU || "",
                    productId: null, // Will be set by product linking
                    title:
                      item.name ||
                      item.productName ||
                      item.title ||
                      "Unknown Product",
                    sku: item.merchantSKU || item.sku || "",
                    quantity: quantity,
                    price: unitPrice,
                    totalPrice: totalItemPrice, // Required NOT NULL field
                    discount:
                      item.merchantDiscount?.amount ||
                      item.hbDiscount?.amount ||
                      0,
                    platformDiscount: item.hbDiscount?.amount || 0,
                    merchantDiscount: item.merchantDiscount?.amount || 0,
                    invoiceTotal: totalItemPrice,
                    currency:
                      item.totalPrice?.currency ||
                      item.unitPrice?.currency ||
                      "TRY",
                    barcode: item.productBarcode || item.barcode || "",
                    lineItemStatus: item.status || "new",
                    vatBaseAmount: item.vat || 0,
                    variantInfo: item.properties
                      ? JSON.stringify(item.properties)
                      : null,
                    rawData: JSON.stringify(item),
                  };
                });
              } else if (order.items && Array.isArray(order.items)) {
                // Fallback to order.items structure
                orderItemsData = order.items.map((item) => {
                  const unitPrice = item.price?.amount || 0;
                  const quantity = item.quantity || 1;
                  const totalPrice = unitPrice * quantity;

                  return {
                    orderId: normalizedOrder.id,
                    platformProductId:
                      item.productBarcode || item.merchantSku || "",
                    productId: null, // Will be set by product linking
                    title: item.productName || item.title || "Unknown Product",
                    sku: item.merchantSku || item.sku || "",
                    quantity: quantity,
                    price: unitPrice,
                    totalPrice: totalPrice, // Required NOT NULL field
                    discount:
                      item.totalMerchantDiscount?.amount ||
                      item.totalHBDiscount?.amount ||
                      0,
                    invoiceTotal: item.totalPrice?.amount || totalPrice,
                    currency: item.totalPrice?.currency || "TRY",
                    barcode: item.productBarcode || "",
                    variantInfo: item.properties
                      ? JSON.stringify(item.properties)
                      : null,
                    rawData: JSON.stringify(item),
                  };
                });
              }

              // Process order items if we have any
              if (orderItemsData.length > 0) {
                try {
                  // Initialize product linking service
                  const linkingService = new ProductOrderLinkingService();

                  // Create order items with product linking - pass userId from connection
                  const linkingResult =
                    await linkingService.linkProductsToOrderItems(
                      orderItemsData,
                      this.connection.userId, // Pass the userId from the platform connection
                      { transaction: t }
                    );

                  if (linkingResult.success) {
                    this.logger.info(
                      `Product linking completed for order ${orderNumber}: ${linkingResult.stats.linked}/${linkingResult.stats.total} items linked`,
                      {
                        orderNumber,
                        connectionId: this.connectionId,
                        linkingStats: linkingResult.stats,
                      }
                    );
                  } else {
                    this.logger.error(
                      `Product linking failed for order ${orderNumber}: ${linkingResult.message}`,
                      {
                        orderNumber,
                        connectionId: this.connectionId,
                        error: linkingResult.error,
                      }
                    );

                    // Re-throw error instead of fallback
                    throw new Error(
                      `Product linking failed: ${linkingResult.message}`
                    );
                  }
                } catch (linkingError) {
                  this.logger.error(
                    `Product linking service failed for order ${orderNumber}: ${linkingError.message}`,
                    {
                      error: linkingError,
                      orderNumber,
                      connectionId: this.connectionId,
                    }
                  );

                  // Re-throw error instead of fallback
                  throw linkingError;
                }
              }

              return normalizedOrder;
            });

            // Add the result to our normalized orders
            normalizedOrders.push(result);
            successCount++;

            this.logger.debug(
              `Successfully created new order for ${
                order.orderNumber || order.OrderNumber || "unknown"
              }`
            );
          } catch (error) {
            this.logger.error(
              `Failed to create new order for ${
                order.orderNumber || order.OrderNumber || "unknown"
              }: ${error.message}`,
              {
                error,
                orderNumber:
                  order.orderNumber || order.OrderNumber || "unknown",
                connectionId: this.connectionId,
              }
            );
            // Re-throw error instead of continuing
            throw error;
          }
        } catch (error) {
          // Log unique constraint violations and other errors, then re-throw
          if (error.name === "SequelizeUniqueConstraintError") {
            this.logger.error(
              `Unique constraint violation for order ${order.orderNumber}, cannot continue`,
              {
                orderNumber: order.orderNumber || "unknown",
                connectionId: this.connectionId,
                errorName: error.name,
                constraintCode: error.original?.code,
                errno: error.original?.errno,
              }
            );
          } else {
            this.logger.error(
              `Failed to process order ${
                order.orderNumber || order.OrderNumber || "unknown"
              }: ${error.message}`,
              {
                error,
                orderNumber:
                  order.orderNumber || order.OrderNumber || "unknown",
                connectionId: this.connectionId,
              }
            );
          }

          // Re-throw error instead of continuing with fallback
          throw error;
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
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code,
        },
        connectionId: this.connectionId,
        orderProcessingStats: {
          totalOrders: hepsiburadaOrders?.length || 0,
          successCount,
          updatedCount,
          skippedCount,
        },
        errorContext: {
          isDatabaseError: error.name?.includes("Sequelize"),
          isConstraintError: error.name === "SequelizeUniqueConstraintError",
          isConnectionError:
            error.message?.includes("connection") ||
            error.code === "ECONNREFUSED",
          isTimeoutError:
            error.code === "ETIMEDOUT" || error.message?.includes("timeout"),
          isValidationError: error.name === "SequelizeValidationError",
          isTransactionError: error.message?.includes("transaction"),
        },
        lastProcessedOrder:
          normalizedOrders[normalizedOrders.length - 1]?.orderNumber || "none",
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
          customerId: hepsiburadaOrderData.customerId,
          orderNumber:
            hepsiburadaOrderData.orderNumber ||
            (hepsiburadaOrderData.items &&
              hepsiburadaOrderData.items[0]?.orderNumber),
          referenceNumber: hepsiburadaOrderData.referenceNumber,
          cargoCompany: hepsiburadaOrderData.cargoCompany,
          cargoTrackingNumber: hepsiburadaOrderData.cargoTrackingNumber,
          cargoTrackingUrl: hepsiburadaOrderData.cargoTrackingUrl,
          paymentType: hepsiburadaOrderData.paymentType,
          platformStatus:
            hepsiburadaOrderData.status || hepsiburadaOrderData.packageStatus,
          paymentStatus: hepsiburadaOrderData.paymentStatus,
          shippingAddressJson: {
            recipientName: hepsiburadaOrderData.recipientName,
            address: hepsiburadaOrderData.shippingAddressDetail,
            city: hepsiburadaOrderData.shippingCity,
            district: hepsiburadaOrderData.shippingDistrict,
            town: hepsiburadaOrderData.shippingTown,
            countryCode: hepsiburadaOrderData.shippingCountryCode,
            postalCode: hepsiburadaOrderData.shippingPostalCode,
          },
          billingAddressJson: {
            companyName: hepsiburadaOrderData.companyName,
            address: hepsiburadaOrderData.billingAddress,
            city: hepsiburadaOrderData.billingCity,
            district: hepsiburadaOrderData.billingDistrict,
            town: hepsiburadaOrderData.billingTown,
            countryCode: hepsiburadaOrderData.billingCountryCode,
            postalCode: hepsiburadaOrderData.billingPostalCode,
            taxOffice: hepsiburadaOrderData.taxOffice,
            taxNumber: hepsiburadaOrderData.taxNumber,
            identityNo: hepsiburadaOrderData.identityNo,
          },
          deliveryAddressJson: hepsiburadaOrderData.deliveryAddress,
          invoiceDetailsJson:
            hepsiburadaOrderData.invoiceDetails || hepsiburadaOrderData.invoice,
          customerJson: {
            name: hepsiburadaOrderData.customerName,
            email: hepsiburadaOrderData.email,
            phone: hepsiburadaOrderData.phoneNumber,
          },
          createdDate: hepsiburadaOrderData.createdDate
            ? new Date(hepsiburadaOrderData.createdDate)
            : null,
          orderDate: hepsiburadaOrderData.orderDate
            ? new Date(hepsiburadaOrderData.orderDate)
            : null,

          // New fields from HepsiBurada API responses
          hepsiburadaOrderId: hepsiburadaOrderData.id,
          status: hepsiburadaOrderData.status,
          dueDate: hepsiburadaOrderData.dueDate
            ? new Date(hepsiburadaOrderData.dueDate)
            : null,
          barcode: hepsiburadaOrderData.barcode,
          shippingAddressDetail: hepsiburadaOrderData.shippingAddressDetail,
          recipientName: hepsiburadaOrderData.recipientName,
          shippingCountryCode: hepsiburadaOrderData.shippingCountryCode,
          shippingDistrict: hepsiburadaOrderData.shippingDistrict,
          shippingTown: hepsiburadaOrderData.shippingTown,
          shippingCity: hepsiburadaOrderData.shippingCity,
          email: hepsiburadaOrderData.email,
          phoneNumber: hepsiburadaOrderData.phoneNumber,
          companyName: hepsiburadaOrderData.companyName,
          billingAddress: hepsiburadaOrderData.billingAddress,
          billingCity: hepsiburadaOrderData.billingCity,
          billingTown: hepsiburadaOrderData.billingTown,
          billingDistrict: hepsiburadaOrderData.billingDistrict,
          billingPostalCode: hepsiburadaOrderData.billingPostalCode,
          billingCountryCode: hepsiburadaOrderData.billingCountryCode,
          taxOffice: hepsiburadaOrderData.taxOffice,
          taxNumber: hepsiburadaOrderData.taxNumber,
          identityNo: hepsiburadaOrderData.identityNo,
          shippingTotalPrice: hepsiburadaOrderData.shippingTotalPrice,
          customsTotalPrice: hepsiburadaOrderData.customsTotalPrice,
          totalPrice: hepsiburadaOrderData.totalPrice,
          items: hepsiburadaOrderData.items,
          isCargoChangable: hepsiburadaOrderData.isCargoChangable,
          customerName: hepsiburadaOrderData.customerName,
          estimatedArrivalDate: hepsiburadaOrderData.estimatedArrivalDate
            ? new Date(hepsiburadaOrderData.estimatedArrivalDate)
            : null,
          customer: hepsiburadaOrderData.customer,
          invoice: hepsiburadaOrderData.invoice,
          deliveryAddress: hepsiburadaOrderData.deliveryAddress,
          orderNote: hepsiburadaOrderData.orderNote,
          rawData: hepsiburadaOrderData,
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
    // Check direct phone number field first (from fetchPackages response)
    if (order.phoneNumber) {
      return order.phoneNumber;
    }

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
    // Use the shared utility with Hepsiburada-specific mappings
    return mapOrderStatus(hepsiburadaStatus, "hepsiburada");
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

    const credentials = this.decryptCredentials(this.connection.credentials);
    const { username } = credentials;

    return axios.create({
      baseURL: this.productsApiUrl,
      headers: {
        Authorization: `Basic ${this.authString}`,
        "User-Agent": username,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
    });
  }

  /**
   * Update order status on Hepsiburada platform
   * @param {string} orderId - Internal order ID
   * @param {string} newStatus - New status to set
   * @returns {Object} - Result of the status update operation
   */
  async updateOrderStatus(orderId, newStatus) {
    try {
      await this.initialize();

      const order = await Order.findByPk(orderId, {
        include: [
          {
            model: OrderItem,
            as: "items",
            attributes: ["id", "externalItemId", "productSku", "quantity"],
          },
        ],
      });

      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }

      const hepsiburadaStatus = this.mapToPlatformStatus(newStatus);

      if (!hepsiburadaStatus) {
        throw new Error(
          `Cannot map status '${newStatus}' to Hepsiburada status`
        );
      }

      this.logger.info(`Hepsiburada order status update requested`, {
        orderId,
        internalStatus: newStatus,
        mappedStatus: hepsiburadaStatus,
        externalOrderId: order.externalOrderId,
        hasItems: order.items?.length > 0,
      });

      // For Hepsiburada, acceptance typically means creating a package
      // This moves the order from "unpacked" status to "packaged" status
      if (newStatus === "processing" && order.items?.length > 0) {
        try {
          // Try to create a package for order acceptance
          const packageResult = await this.createPackageForOrder(order);

          if (packageResult.success) {
            this.logger.info(`Package created for order acceptance`, {
              orderId,
              packageData: packageResult.data,
            });
          } else {
            this.logger.warn(
              `Package creation failed, updating local status only`,
              {
                orderId,
                error: packageResult.message,
              }
            );
          }
        } catch (packageError) {
          this.logger.warn(
            `Package creation error, continuing with local update`,
            {
              orderId,
              error: packageError.message,
            }
          );
        }
      }

      // Update local order status
      await order.update({
        orderStatus: newStatus,
        lastSyncedAt: new Date(),
      });

      return {
        success: true,
        message: `Order status updated to ${newStatus}`,
        data: order,
        platformNote:
          "Hepsiburada status updates are handled through package operations when applicable",
      };
    } catch (error) {
      this.logger.error(
        `Failed to update order status on Hepsiburada: ${error.message}`,
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
   * Accept an order on Hepsiburada platform
   * This involves creating a package which effectively accepts/confirms the order
   * @param {string} externalOrderId - External order ID
   * @returns {Object} - Result of the acceptance operation
   */
  async acceptOrder(externalOrderId) {
    try {
      await this.initialize();

      this.logger.info(`Hepsiburada order acceptance requested`, {
        externalOrderId,
        connectionId: this.connectionId,
      });

      // Find the order by external ID
      const order = await Order.findOne({
        where: {
          externalOrderId: externalOrderId,
          connectionId: this.connectionId,
        },
        include: [
          {
            model: OrderItem,
            as: "items",
            attributes: ["id", "externalItemId", "productSku", "quantity"],
          },
        ],
      });

      if (!order) {
        throw new Error(`Order with external ID ${externalOrderId} not found`);
      }

      // For Hepsiburada, acceptance is done by creating a package
      const packageResult = await this.createPackageForOrder(order);

      if (packageResult.success) {
        return {
          success: true,
          message: "Order accepted successfully through package creation",
          data: {
            externalOrderId,
            packageInfo: packageResult.data,
            status: "processing",
          },
        };
      } else {
        // If package creation fails, still mark as accepted locally
        return {
          success: true,
          message: "Order accepted locally (package creation pending)",
          data: {
            externalOrderId,
            status: "processing",
            note: `Package creation deferred: ${packageResult.message}`,
          },
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to accept order on Hepsiburada: ${error.message}`,
        { error, externalOrderId, connectionId: this.connectionId }
      );

      return {
        success: false,
        message: `Failed to accept order: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Create a package for order acceptance
   * This is Hepsiburada's way of confirming/accepting orders
   * @param {Object} order - Order object with items
   * @returns {Object} - Package creation result
   */
  async createPackageForOrder(order) {
    try {
      if (!order.items || order.items.length === 0) {
        throw new Error("Order has no items to package");
      }

      // Get order item IDs for package creation
      const orderItemIds = order.items
        .filter((item) => item.externalItemId)
        .map((item) => item.externalItemId);

      if (orderItemIds.length === 0) {
        throw new Error("No valid external item IDs found for packaging");
      }

      // Default shipping info for acceptance
      const shippingInfo = {
        cargoCompany: order.cargoCompany || "MNG", // Default cargo company
        desi: 1, // Default weight
        packageNumber: `PKG-${order.id}-${Date.now()}`, // Generate package number
      };

      this.logger.info(`Creating package for order acceptance`, {
        orderId: order.id,
        itemCount: orderItemIds.length,
        shippingInfo,
      });

      // Use existing createPackage method
      return await this.createPackage(orderItemIds, shippingInfo);
    } catch (error) {
      this.logger.error(
        `Failed to create package for order: ${error.message}`,
        {
          orderId: order.id,
          error,
        }
      );

      return {
        success: false,
        message: `Package creation failed: ${error.message}`,
        error: error.message,
      };
    }
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

  /**
   * Sync products from HepsiBurada to our database
   * @param {Object} params - Query parameters for product fetching
   * @returns {Promise<Object>} Result of the sync operation
   */
  async syncProducts(params = {}) {
    try {
      const { Product } = require("../../../../../models");
      const defaultUserId = process.env.DEFAULT_USER_ID || "1";

      // Fetch products from HepsiBurada
      const result = await this.fetchProducts(params);

      if (!result.success) {
        return {
          success: false,
          message: `Failed to fetch products from HepsiBurada: ${result.message}`,
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
      for (const hepsiburadaProduct of products) {
        try {
          // Check if product exists (by merchantSku)
          const existingHepsiburadaProduct = await HepsiburadaProduct.findOne({
            where: {
              merchantSku: hepsiburadaProduct.merchantSku,
            },
            include: [
              {
                model: Product,
                as: "Product",
              },
            ],
          });

          if (existingHepsiburadaProduct) {
            // Update existing product
            await this.updateExistingProduct(
              existingHepsiburadaProduct,
              hepsiburadaProduct
            );
            stats.updated++;
          } else {
            // Create new product
            await this.createNewProduct(hepsiburadaProduct, defaultUserId);
            stats.new++;
          }
        } catch (productError) {
          this.logger.error(
            `Failed to process product ${hepsiburadaProduct.merchantSku}: ${productError.message}`,
            {
              error: productError,
              product: {
                merchantSku: hepsiburadaProduct.merchantSku,
                productName: hepsiburadaProduct.productName,
              },
            }
          );
          stats.failed++;
        }
      }

      return {
        success: true,
        message: `Synced ${stats.total} products from HepsiBurada: ${stats.new} new, ${stats.updated} updated, ${stats.failed} failed`,
        data: stats,
      };
    } catch (error) {
      this.logger.error(
        `Failed to sync products from HepsiBurada: ${error.message}`,
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
   * Update an existing product with data from HepsiBurada
   * @param {Object} existingHepsiburadaProduct - Existing HepsiburadaProduct record
   * @param {Object} hepsiburadaProductData - Product data from HepsiBurada API
   * @returns {Promise<Object>} Updated product
   */
  async updateExistingProduct(
    existingHepsiburadaProduct,
    hepsiburadaProductData
  ) {
    try {
      const { Product } = require("../../../../../models");
      const mainProduct = existingHepsiburadaProduct.Product;

      // Extract stock quantity from baseAttributes
      const stockAttribute = hepsiburadaProductData.baseAttributes?.find(
        (attr) => attr.name === "stock"
      );
      const stockQuantity = stockAttribute?.value
        ? parseInt(stockAttribute.value, 10)
        : 0;

      // Extract guarantee period from baseAttributes
      const guaranteeAttribute = hepsiburadaProductData.baseAttributes?.find(
        (attr) => attr.name === "GarantiSuresi"
      );
      const guaranteeMonths = guaranteeAttribute?.value
        ? parseInt(guaranteeAttribute.value, 10)
        : null;

      // Extract weight from baseAttributes
      const weightAttribute = hepsiburadaProductData.baseAttributes?.find(
        (attr) => attr.name === "kg"
      );
      const weight = weightAttribute?.value
        ? parseFloat(weightAttribute.value)
        : null;

      // Transaction to ensure both records are updated together
      await sequelize.transaction(async (t) => {
        // Update main product record with latest data
        if (mainProduct) {
          await mainProduct.update(
            {
              name: hepsiburadaProductData.productName,
              description: hepsiburadaProductData.description,
              price: hepsiburadaProductData.price
                ? parseFloat(hepsiburadaProductData.price)
                : 0,
              currency: "TRY",
              barcode: hepsiburadaProductData.barcode,
              mainImageUrl:
                hepsiburadaProductData.images &&
                hepsiburadaProductData.images.length > 0
                  ? hepsiburadaProductData.images[0]
                  : null,
              additionalImages:
                hepsiburadaProductData.images &&
                hepsiburadaProductData.images.length > 1
                  ? hepsiburadaProductData.images.slice(1)
                  : null,
              attributes: hepsiburadaProductData.productAttributes,
              hasVariants: false, // HepsiBurada doesn't seem to have variants in this API
              metadata: {
                source: "hepsiburada",
                hbSku: hepsiburadaProductData.hbSku,
                categoryId: hepsiburadaProductData.categoryId,
                categoryName: hepsiburadaProductData.categoryName,
                qualityScore: hepsiburadaProductData.qualityScore,
                qualityStatus: hepsiburadaProductData.qualityStatus,
              },
            },
            { transaction: t }
          );
        }

        // Update HepsiBurada-specific product data
        await existingHepsiburadaProduct.update(
          {
            barcode: hepsiburadaProductData.barcode,
            title: hepsiburadaProductData.productName,
            brand: hepsiburadaProductData.brand,
            categoryId: hepsiburadaProductData.categoryId?.toString(),
            description: hepsiburadaProductData.description,
            attributes: hepsiburadaProductData.productAttributes || [],
            images: hepsiburadaProductData.images || [],
            price: hepsiburadaProductData.price
              ? parseFloat(hepsiburadaProductData.price)
              : 0,
            stock: stockQuantity,
            vatRate: hepsiburadaProductData.tax
              ? parseInt(hepsiburadaProductData.tax, 10)
              : 18,
            status: hepsiburadaProductData.status || "pending",
            lastSyncedAt: new Date(),
            // New fields from API response
            hbSku: hepsiburadaProductData.hbSku,
            variantGroupId: hepsiburadaProductData.variantGroupId,
            productName: hepsiburadaProductData.productName,
            categoryName: hepsiburadaProductData.categoryName,
            tax: hepsiburadaProductData.tax,
            baseAttributes: hepsiburadaProductData.baseAttributes || [],
            variantTypeAttributes:
              hepsiburadaProductData.variantTypeAttributes || [],
            productAttributes: hepsiburadaProductData.productAttributes || [],
            validationResults: hepsiburadaProductData.validationResults || [],
            rejectReasons: hepsiburadaProductData.rejectReasons || [],
            qualityScore: hepsiburadaProductData.qualityScore,
            qualityStatus: hepsiburadaProductData.qualityStatus,
            ccValidationResults: hepsiburadaProductData.ccValidationResults,
            platformStatus: hepsiburadaProductData.status,
            weight: weight,
            guaranteeMonths: guaranteeMonths,
            rawData: hepsiburadaProductData,
          },
          { transaction: t }
        );
      });

      this.logger.debug(
        `Updated product ${existingHepsiburadaProduct.merchantSku} in database`
      );
      return existingHepsiburadaProduct;
    } catch (error) {
      this.logger.error(`Failed to update product: ${error.message}`, {
        error,
        merchantSku: existingHepsiburadaProduct.merchantSku,
      });
      throw error;
    }
  }

  /**
   * Create a new product from HepsiBurada data
   * @param {Object} hepsiburadaProductData - Product data from HepsiBurada API
   * @param {string} userId - User ID to associate with the product
   * @returns {Promise<Object>} Created product
   */
  async createNewProduct(hepsiburadaProductData, userId) {
    try {
      const { Product } = require("../../../../../models");

      // Extract stock quantity from baseAttributes
      const stockAttribute = hepsiburadaProductData.baseAttributes?.find(
        (attr) => attr.name === "stock"
      );
      const stockQuantity = stockAttribute?.value
        ? parseInt(stockAttribute.value, 10)
        : 0;

      // Extract guarantee period from baseAttributes
      const guaranteeAttribute = hepsiburadaProductData.baseAttributes?.find(
        (attr) => attr.name === "GarantiSuresi"
      );
      const guaranteeMonths = guaranteeAttribute?.value
        ? parseInt(guaranteeAttribute.value, 10)
        : null;

      // Extract weight from baseAttributes
      const weightAttribute = hepsiburadaProductData.baseAttributes?.find(
        (attr) => attr.name === "kg"
      );
      const weight = weightAttribute?.value
        ? parseFloat(weightAttribute.value)
        : null;

      // Transaction to ensure both records are created together
      const result = await sequelize.transaction(async (t) => {
        // Create main product record
        const mainProduct = await Product.create(
          {
            userId: userId,
            sku: hepsiburadaProductData.merchantSku,
            name: hepsiburadaProductData.productName,
            description: hepsiburadaProductData.description,
            price: hepsiburadaProductData.price
              ? parseFloat(hepsiburadaProductData.price)
              : 0,
            currency: "TRY",
            barcode: hepsiburadaProductData.barcode,
            sourcePlatform: "hepsiburada",
            mainImageUrl:
              hepsiburadaProductData.images &&
              hepsiburadaProductData.images.length > 0
                ? hepsiburadaProductData.images[0]
                : null,
            additionalImages:
              hepsiburadaProductData.images &&
              hepsiburadaProductData.images.length > 1
                ? hepsiburadaProductData.images.slice(1)
                : null,
            attributes: hepsiburadaProductData.productAttributes,
            hasVariants: false, // HepsiBurada doesn't seem to have variants in this API
            metadata: {
              source: "hepsiburada",
              hbSku: hepsiburadaProductData.hbSku,
              categoryId: hepsiburadaProductData.categoryId,
              categoryName: hepsiburadaProductData.categoryName,
              qualityScore: hepsiburadaProductData.qualityScore,
              qualityStatus: hepsiburadaProductData.qualityStatus,
            },
          },
          { transaction: t }
        );

        // Create HepsiBurada-specific product record
        const hepsiburadaProduct = await HepsiburadaProduct.create(
          {
            productId: mainProduct.id,
            merchantSku: hepsiburadaProductData.merchantSku,
            barcode: hepsiburadaProductData.barcode,
            title: hepsiburadaProductData.productName,
            brand: hepsiburadaProductData.brand,
            categoryId: hepsiburadaProductData.categoryId?.toString(),
            description: hepsiburadaProductData.description,
            attributes: hepsiburadaProductData.productAttributes || [],
            images: hepsiburadaProductData.images || [],
            price: hepsiburadaProductData.price
              ? parseFloat(hepsiburadaProductData.price)
              : 0,
            stock: stockQuantity,
            vatRate: hepsiburadaProductData.tax
              ? parseInt(hepsiburadaProductData.tax, 10)
              : 18,
            status: hepsiburadaProductData.status || "pending",
            lastSyncedAt: new Date(),
            // New fields from API response
            hbSku: hepsiburadaProductData.hbSku,
            variantGroupId: hepsiburadaProductData.variantGroupId,
            productName: hepsiburadaProductData.productName,
            categoryName: hepsiburadaProductData.categoryName,
            tax: hepsiburadaProductData.tax,
            baseAttributes: hepsiburadaProductData.baseAttributes || [],
            variantTypeAttributes:
              hepsiburadaProductData.variantTypeAttributes || [],
            productAttributes: hepsiburadaProductData.productAttributes || [],
            validationResults: hepsiburadaProductData.validationResults || [],
            rejectReasons: hepsiburadaProductData.rejectReasons || [],
            qualityScore: hepsiburadaProductData.qualityScore,
            qualityStatus: hepsiburadaProductData.qualityStatus,
            ccValidationResults: hepsiburadaProductData.ccValidationResults,
            platformStatus: hepsiburadaProductData.status,
            weight: weight,
            guaranteeMonths: guaranteeMonths,
            rawData: hepsiburadaProductData,
          },
          { transaction: t }
        );

        return { mainProduct, hepsiburadaProduct };
      });

      this.logger.debug(
        `Created new product ${result.hepsiburadaProduct.merchantSku} in database`
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to create product: ${error.message}`, {
        error,
        productData: {
          productName: hepsiburadaProductData.productName,
          merchantSku: hepsiburadaProductData.merchantSku,
          hbSku: hepsiburadaProductData.hbSku,
        },
      });
      throw error;
    }
  }

  /**
   * Create a HepsiBurada-specific product record
   * @param {string} productId - The main Product record ID
   * @param {Object} hepsiburadaProductData - Raw product data from HepsiBurada API
   * @param {Object} transaction - Sequelize transaction object (optional)
   * @returns {Promise<Object>} Created HepsiburadaProduct record
   */
  async createHepsiburadaProductRecord(
    productId,
    hepsiburadaProductData,
    transaction = null
  ) {
    try {
      // Extract stock quantity from baseAttributes
      const stockAttribute = hepsiburadaProductData.baseAttributes?.find(
        (attr) => attr.name === "stock"
      );
      const stockQuantity = stockAttribute?.value
        ? parseInt(stockAttribute.value, 10)
        : 0;

      // Extract guarantee period from baseAttributes
      const guaranteeAttribute = hepsiburadaProductData.baseAttributes?.find(
        (attr) => attr.name === "GarantiSuresi"
      );
      const guaranteeMonths = guaranteeAttribute?.value
        ? parseInt(guaranteeAttribute.value, 10)
        : null;

      // Extract weight from baseAttributes
      const weightAttribute = hepsiburadaProductData.baseAttributes?.find(
        (attr) => attr.name === "kg"
      );
      const weight = weightAttribute?.value
        ? parseFloat(weightAttribute.value)
        : null;

      // Create with or without transaction
      if (transaction) {
        return await HepsiburadaProduct.create(
          {
            productId: productId,
            merchantSku: hepsiburadaProductData.merchantSku,
            barcode: hepsiburadaProductData.barcode,
            title: hepsiburadaProductData.productName,
            brand: hepsiburadaProductData.brand,
            categoryId: hepsiburadaProductData.categoryId?.toString(),
            description: hepsiburadaProductData.description,
            attributes: hepsiburadaProductData.productAttributes || [],
            images: hepsiburadaProductData.images || [],
            price: hepsiburadaProductData.price
              ? parseFloat(hepsiburadaProductData.price)
              : 0,
            stock: stockQuantity,
            vatRate: hepsiburadaProductData.tax
              ? parseInt(hepsiburadaProductData.tax, 10)
              : 18,
            status: hepsiburadaProductData.status || "pending",
            lastSyncedAt: new Date(),
            // New fields from API response
            hbSku: hepsiburadaProductData.hbSku,
            variantGroupId: hepsiburadaProductData.variantGroupId,
            productName: hepsiburadaProductData.productName,
            categoryName: hepsiburadaProductData.categoryName,
            tax: hepsiburadaProductData.tax,
            baseAttributes: hepsiburadaProductData.baseAttributes || [],
            variantTypeAttributes:
              hepsiburadaProductData.variantTypeAttributes || [],
            productAttributes: hepsiburadaProductData.productAttributes || [],
            validationResults: hepsiburadaProductData.validationResults || [],
            rejectReasons: hepsiburadaProductData.rejectReasons || [],
            qualityScore: hepsiburadaProductData.qualityScore,
            qualityStatus: hepsiburadaProductData.qualityStatus,
            ccValidationResults: hepsiburadaProductData.ccValidationResults,
            platformStatus: hepsiburadaProductData.status,
            weight: weight,
            guaranteeMonths: guaranteeMonths,
            rawData: hepsiburadaProductData,
          },
          { transaction }
        );
      } else {
        return await HepsiburadaProduct.create({
          productId: productId,
          merchantSku: hepsiburadaProductData.merchantSku,
          barcode: hepsiburadaProductData.barcode,
          title: hepsiburadaProductData.productName,
          brand: hepsiburadaProductData.brand,
          categoryId: hepsiburadaProductData.categoryId?.toString(),
          description: hepsiburadaProductData.description,
          attributes: hepsiburadaProductData.productAttributes || [],
          images: hepsiburadaProductData.images || [],
          price: hepsiburadaProductData.price
            ? parseFloat(hepsiburadaProductData.price)
            : 0,
          stock: stockQuantity,
          vatRate: hepsiburadaProductData.tax
            ? parseInt(hepsiburadaProductData.tax, 10)
            : 18,
          status: hepsiburadaProductData.status || "pending",
          lastSyncedAt: new Date(),
          // New fields from API response
          hbSku: hepsiburadaProductData.hbSku,
          variantGroupId: hepsiburadaProductData.variantGroupId,
          productName: hepsiburadaProductData.productName,
          categoryName: hepsiburadaProductData.categoryName,
          tax: hepsiburadaProductData.tax,
          baseAttributes: hepsiburadaProductData.baseAttributes || [],
          variantTypeAttributes:
            hepsiburadaProductData.variantTypeAttributes || [],
          productAttributes: hepsiburadaProductData.productAttributes || [],
          validationResults: hepsiburadaProductData.validationResults || [],
          rejectReasons: hepsiburadaProductData.rejectReasons || [],
          qualityScore: hepsiburadaProductData.qualityScore,
          qualityStatus: hepsiburadaProductData.qualityStatus,
          ccValidationResults: hepsiburadaProductData.ccValidationResults,
          platformStatus: hepsiburadaProductData.status,
          weight: weight,
          guaranteeMonths: guaranteeMonths,
          rawData: hepsiburadaProductData,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to create HepsiburadaProduct record: ${error.message}`,
        {
          error,
          productId,
          merchantSku: hepsiburadaProductData.merchantSku,
        }
      );
      throw error;
    }
  }

  /**
   * Create a single product on Hepsiburada MPOP platform
   * @param {Object} productData - Product data in Hepsiburada format
   * @returns {Promise<Object>} - Result of product creation
   */
  async createProduct(productData) {
    try {
      await this.initialize();
      const productsAxios = this.createProductsAxiosInstance();

      // Validate required fields for Hepsiburada
      const requiredFields = [
        "merchantSku",
        "barcode",
        "title",
        "brand",
        "categoryId",
        "description",
        "price",
        "tax",
        "stock",
        "images",
      ];

      for (const field of requiredFields) {
        if (productData[field] === undefined || productData[field] === null) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate images array
      if (
        !Array.isArray(productData.images) ||
        productData.images.length === 0
      ) {
        throw new Error(
          "Images array is required and must contain at least one image"
        );
      }

      // Format the product data according to Hepsiburada API requirements
      const hepsiburadaProductData = {
        merchantSku: productData.merchantSku,
        barcode: productData.barcode,
        productName: productData.title,
        brand: productData.brand,
        categoryId: productData.categoryId.toString(),
        description: productData.description,
        price: parseFloat(productData.price),
        tax: parseInt(productData.tax, 10),
        baseAttributes: [
          {
            name: "stock",
            value: productData.stock.toString(),
          },
        ],
        images: Array.isArray(productData.images)
          ? productData.images
          : [productData.images],
        productAttributes: productData.attributes || [],
        variantGroupId: productData.variantGroupId || null,
        status: productData.status || "pending",
      };

      // Add optional fields if provided
      if (productData.weight) {
        hepsiburadaProductData.baseAttributes.push({
          name: "kg",
          value: productData.weight.toString(),
        });
      }

      if (productData.guaranteeMonths) {
        hepsiburadaProductData.baseAttributes.push({
          name: "GarantiSuresi",
          value: productData.guaranteeMonths.toString(),
        });
      }

      this.logger.info(`Creating product on Hepsiburada`, {
        merchantSku: productData.merchantSku,
        barcode: productData.barcode,
        title: productData.title,
      });

      // Note: This endpoint needs to be verified with official Hepsiburada MPOP documentation
      // Current implementation is based on reverse engineering from existing product fetching code
      const endpoint = "/products"; // This may need to be adjusted based on official docs

      const response = await productsAxios.post(
        endpoint,
        hepsiburadaProductData
      );

      this.logger.info(`Product created successfully on Hepsiburada`, {
        merchantSku: productData.merchantSku,
        response: response.data,
      });

      return {
        success: true,
        message: "Product created successfully on Hepsiburada",
        data: response.data,
        platformProductId: response.data?.id || response.data?.merchantSku,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create product on Hepsiburada: ${error.message}`,
        {
          error,
          merchantSku: productData?.merchantSku,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to create product on Hepsiburada: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Create multiple products on Hepsiburada (bulk creation)
   * @param {Array} productsData - Array of product data in Hepsiburada format
   * @returns {Promise<Object>} - Result of bulk product creation
   */
  async createProductsBulk(productsData) {
    try {
      await this.initialize();

      if (!Array.isArray(productsData) || productsData.length === 0) {
        throw new Error("Products data must be a non-empty array");
      }

      this.logger.info(
        `Creating ${productsData.length} products on Hepsiburada`,
        {
          productCount: productsData.length,
        }
      );

      const results = [];
      const errors = [];

      // Process products sequentially to avoid rate limiting
      for (let i = 0; i < productsData.length; i++) {
        const productData = productsData[i];

        try {
          const result = await this.createProduct(productData);
          results.push({
            index: i,
            merchantSku: productData.merchantSku,
            result: result,
          });

          // Add a small delay between requests to be respectful to the API
          if (i < productsData.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (error) {
          errors.push({
            index: i,
            merchantSku: productData.merchantSku,
            error: error.message,
          });
        }
      }

      const successCount = results.filter((r) => r.result.success).length;
      const failureCount =
        errors.length + results.filter((r) => !r.result.success).length;

      this.logger.info(`Bulk product creation completed on Hepsiburada`, {
        total: productsData.length,
        success: successCount,
        failed: failureCount,
      });

      return {
        success: successCount > 0,
        message: `Bulk creation completed: ${successCount} successful, ${failureCount} failed`,
        data: {
          results,
          errors,
          summary: {
            total: productsData.length,
            successful: successCount,
            failed: failureCount,
          },
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to create products bulk on Hepsiburada: ${error.message}`,
        {
          error,
          productCount: productsData?.length,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to create products bulk: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Update product information on Hepsiburada
   * @param {string} merchantSku - Merchant SKU of the product to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Update result
   */
  async updateProduct(merchantSku, updateData) {
    try {
      await this.initialize();
      const productsAxios = this.createProductsAxiosInstance();

      if (!merchantSku) {
        throw new Error("Merchant SKU is required for product update");
      }

      // Format update data according to Hepsiburada requirements
      const hepsiburadaUpdateData = {};

      if (updateData.price !== undefined) {
        hepsiburadaUpdateData.price = parseFloat(updateData.price);
      }

      if (updateData.stock !== undefined) {
        hepsiburadaUpdateData.baseAttributes =
          hepsiburadaUpdateData.baseAttributes || [];
        hepsiburadaUpdateData.baseAttributes.push({
          name: "stock",
          value: updateData.stock.toString(),
        });
      }

      if (updateData.title) {
        hepsiburadaUpdateData.productName = updateData.title;
      }

      if (updateData.description) {
        hepsiburadaUpdateData.description = updateData.description;
      }

      if (updateData.status) {
        hepsiburadaUpdateData.status = updateData.status;
      }

      this.logger.info(`Updating product on Hepsiburada`, {
        merchantSku,
        updateFields: Object.keys(updateData),
      });

      // Note: This endpoint needs to be verified with official documentation
      const endpoint = `/products/${merchantSku}`;

      const response = await productsAxios.put(endpoint, hepsiburadaUpdateData);

      this.logger.info(`Product updated successfully on Hepsiburada`, {
        merchantSku,
        response: response.data,
      });

      return {
        success: true,
        message: "Product updated successfully on Hepsiburada",
        data: response.data,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update product on Hepsiburada: ${error.message}`,
        {
          error,
          merchantSku,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to update product: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Helper method to validate Hepsiburada product data structure
   * @param {Object} productData - Product data to validate
   * @returns {Object} - Validation result
   */
  validateProductData(productData) {
    const errors = [];
    const warnings = [];

    // Required field validation for Hepsiburada
    const requiredFields = {
      merchantSku: { type: "string", maxLength: 100 },
      barcode: { type: "string", maxLength: 50 },
      title: { type: "string", maxLength: 200 },
      brand: { type: "string", maxLength: 100 },
      categoryId: { type: ["string", "number"] },
      description: { type: "string", maxLength: 5000 },
      price: { type: "number", min: 0 },
      tax: { type: "number", values: [0, 1, 8, 18, 20] },
      stock: { type: "number", min: 0 },
    };

    // Validate required fields
    for (const [field, rules] of Object.entries(requiredFields)) {
      if (productData[field] === undefined || productData[field] === null) {
        errors.push(`Missing required field: ${field}`);
        continue;
      }

      const value = productData[field];

      // Type validation
      if (Array.isArray(rules.type)) {
        if (!rules.type.some((type) => typeof value === type)) {
          errors.push(
            `Field ${field} must be one of types: ${rules.type.join(", ")}`
          );
        }
      } else if (rules.type === "string" && typeof value !== "string") {
        errors.push(`Field ${field} must be a string`);
      } else if (rules.type === "number" && typeof value !== "number") {
        errors.push(`Field ${field} must be a number`);
      }

      // Length validation
      if (
        rules.maxLength &&
        typeof value === "string" &&
        value.length > rules.maxLength
      ) {
        errors.push(
          `Field ${field} exceeds maximum length of ${rules.maxLength}`
        );
      }

      // Min value validation
      if (
        rules.min !== undefined &&
        typeof value === "number" &&
        value < rules.min
      ) {
        errors.push(`Field ${field} must be at least ${rules.min}`);
      }

      // Allowed values validation
      if (rules.values && !rules.values.includes(value)) {
        errors.push(
          `Field ${field} must be one of: ${rules.values.join(", ")}`
        );
      }
    }

    // Images validation
    if (!productData.images || !Array.isArray(productData.images)) {
      errors.push("Images field is required and must be an array");
    } else {
      if (productData.images.length === 0) {
        errors.push("At least one image is required");
      }

      productData.images.forEach((imageUrl, index) => {
        if (!imageUrl || typeof imageUrl !== "string") {
          errors.push(
            `Image ${index + 1}: URL is required and must be a string`
          );
        } else if (
          !imageUrl.startsWith("http://") &&
          !imageUrl.startsWith("https://")
        ) {
          warnings.push(
            `Image ${index + 1}: HTTPS URLs are recommended for better security`
          );
        }
      });
    }

    // Business logic validations
    if (
      productData.merchantSku &&
      !/^[a-zA-Z0-9._-]+$/.test(productData.merchantSku)
    ) {
      warnings.push(
        "Merchant SKU should only contain alphanumeric characters, dots, underscores, and hyphens"
      );
    }

    if (productData.barcode && productData.barcode.length < 8) {
      warnings.push("Barcode should be at least 8 characters long");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * NOTE: The following methods require official Hepsiburada MPOP API documentation
   * Current implementation is based on assumptions from existing code structure
   * Please verify endpoints and request/response formats with official documentation
   */

  /**
   * Get product status from Hepsiburada
   * @param {string} merchantSku - Merchant SKU of the product
   * @returns {Promise<Object>} - Product status information
   */
  async getProductStatus(merchantSku) {
    try {
      await this.initialize();
      const productsAxios = this.createProductsAxiosInstance();

      if (!merchantSku) {
        throw new Error("Merchant SKU is required");
      }

      // Note: Endpoint needs verification with official documentation
      const endpoint = `/products/${merchantSku}/status`;

      const response = await productsAxios.get(endpoint);

      return {
        success: true,
        data: response.data,
        message: "Product status retrieved successfully",
      };
    } catch (error) {
      this.logger.error(`Failed to get product status: ${error.message}`, {
        error,
        merchantSku,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Failed to get product status: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Get Hepsiburada categories
   */
  async getCategories() {
    try {
      await this.initialize();
      // Return sample categories for now
      return [
        {
          categoryId: "elektronik",
          categoryName: "Elektronik",
          parentCategoryId: null,
        },
        { categoryId: "giyim", categoryName: "Giyim", parentCategoryId: null },
        {
          categoryId: "ev-yasam",
          categoryName: "Ev & Yaşam",
          parentCategoryId: null,
        },
      ];
    } catch (error) {
      this.logger.error("Failed to fetch Hepsiburada categories", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get category attributes for Hepsiburada
   */
  async getCategoryAttributes(categoryId) {
    try {
      await this.initialize();
      // Return sample attributes for now
      return [
        {
          attributeId: "renk",
          attributeName: "Renk",
          attributeType: "TEXT",
          required: true,
        },
        {
          attributeId: "beden",
          attributeName: "Beden",
          attributeType: "TEXT",
          required: false,
        },
      ];
    } catch (error) {
      this.logger.error("Failed to fetch Hepsiburada category attributes", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get Hepsiburada-specific product fields
   */
  async getProductFields(categoryId = null) {
    const attributes = categoryId
      ? await this.getCategoryAttributes(categoryId)
      : [];

    return {
      platform: "hepsiburada",
      requiredFields: [
        {
          name: "productName",
          label: "Product Name",
          type: "text",
          required: true,
        },
        { name: "barcode", label: "Barcode", type: "text", required: true },
        {
          name: "categoryId",
          label: "Category",
          type: "select",
          required: true,
        },
        { name: "price", label: "Price", type: "number", required: true },
      ],
      optionalFields: [
        { name: "productDescription", label: "Description", type: "textarea" },
      ],
      categoryAttributes: attributes,
    };
  }
}

module.exports = HepsiburadaService;
