/**
 * N11 Platform Service
 * Implements the N11 REST API for order management
 * Updated with all REST API endpoints from N11 documentation
 */

const axios = require("axios");
const {
  Order,
  OrderItem,
  User,
  PlatformConnection,
} = require("../../../../../models");
const logger = require("../../../../../utils/logger");
const ProductOrderLinkingService = require("../../../../../services/product-order-linking-service");
const { mapOrderStatus } = require("../../../../../utils/enum-validators");

const BasePlatformService = require("../BasePlatformService");

// N11 API Constants
const N11_API = {
  BASE_URL: "https://api.n11.com",
  ENDPOINTS: {
    // Order Management
    ORDERS: "/rest/delivery/v1/shipmentPackages",
    ORDER_DETAIL: "/rest/delivery/v1/shipmentPackages/{id}",
    UPDATE_ORDER: "/rest/delivery/v1/shipmentPackages/{id}",
    UPDATE_ORDER_STATUS: "/rest/order/v1/update", // Official N11 order status update endpoint
    ACCEPT_ORDER: "/rest/delivery/v1/shipmentPackages/{id}/accept",
    REJECT_ORDER: "/rest/delivery/v1/shipmentPackages/{id}/reject",
    SHIP_ORDER: "/rest/delivery/v1/shipmentPackages/{id}/ship",
    DELIVER_ORDER: "/rest/delivery/v1/shipmentPackages/{id}/delivery",
    SPLIT_PACKAGE:
      "/rest/delivery/v1/shipmentPackages/{id}/splitCombinePackage",
    LABOR_COST: "/rest/delivery/v1/shipmentPackages/{id}/laborCost",

    // Product Management
    PRODUCTS: "/ms/product-query",
    PRODUCT_DETAIL: "/product/v1/detail",
    PRODUCT_QUERY: "/product/v1/getProductQuery",

    // Category Management
    CATEGORIES: "/cdn/categories",
    CATEGORY_ATTRIBUTES: "/cdn/category/{categoryId}/attribute",

    // Catalog Service
    CATALOG_SEARCH: "/catalog/v1/search",
    CATALOG_UPLOAD: "/catalog/v1/upload",

    // Return Management
    RETURNS: "/return/v1/list",
    RETURN_APPROVE: "/return/v1/approve",
    RETURN_REJECT: "/return/v1/reject",
    RETURN_POSTPONE: "/return/v1/postpone",

    // Delivery Management
    SHIPMENT_PACKAGES: "/delivery/v1/shipmentPackages",
    ONLINE_DELIVERY_UPDATE: "/delivery/v1/onlineDeliveryUpdate",
  },
};

class N11Service extends BasePlatformService {
  constructor(connectionId, directCredentials = null) {
    // Handle both object format from platform controller and direct ID format
    if (connectionId && typeof connectionId === "object") {
      // If we're passed an object with a connection property, use that directly
      if (connectionId.connection) {
        super(connectionId.connection.id);
        this.connection = connectionId.connection; // Store the connection directly
      } else if (connectionId.id) {
        super(connectionId.id);
      } else {
        super(null); // Will be handled gracefully in initialize()
      }
    } else {
      super(connectionId);
    }

    this.directCredentials = directCredentials;
    this.apiUrl = N11_API.BASE_URL;
    this.logger = this.getLogger();

    // Enhanced logging for N11 service initialization
    this.logger.info("N11Service constructor called", {
      connectionId:
        typeof connectionId === "object"
          ? connectionId.id || connectionId.connection?.id
          : connectionId,
      hasDirectCredentials: !!directCredentials,
      apiUrl: this.apiUrl,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get the platform type
   * @returns {string} Platform type
   */
  getPlatformType() {
    return "n11";
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
   * Setup Axios instance with N11-specific headers and config
   * Implementation of abstract method from BasePlatformService
   */
  async setupAxiosInstance() {
    try {
      const credentials = this.decryptCredentials(this.connection.credentials);
      const { appKey, appSecret } = credentials;

      // Validate required credentials with a more descriptive error message
      if (!appKey || !appSecret) {
        this.logger.error("Missing N11 credentials", {
          hasAppKey: !!appKey,
          hasAppSecret: !!appSecret,
          connectionId: this.connectionId,
        });
        throw new Error("Missing required N11 credentials: appKey, appSecret");
      }

      this.axiosInstance = axios.create({
        baseURL: N11_API.BASE_URL,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          appkey: appKey,
          // Note: Based on official N11 documentation, only appkey is required for categories API
          // appsecret is not needed for /cdn/ endpoints
        },
        timeout: 30000,
      });
    } catch (error) {
      this.logger.error(
        `Failed to setup N11 Axios instance: ${error.message}`,
        {
          connectionId: this.connectionId,
        }
      );
      throw error;
    }
  }

  /**
   * Override decryptCredentials for N11-specific format
   * @param {string|object} encryptedCredentials
   * @returns {object} Decrypted credentials
   */
  decryptCredentials(encryptedCredentials) {
    try {
      // Handle null or undefined credentials
      if (!encryptedCredentials) {
        this.logger.warn("No credentials provided to decrypt");
        return { appKey: null, appSecret: null, endpointUrl: N11_API.BASE_URL };
      }

      // Use a try-catch here to handle any parsing errors
      let credentials;
      try {
        credentials = super.decryptCredentials(encryptedCredentials);
      } catch (parseError) {
        this.logger.warn(`Failed to parse credentials: ${parseError.message}`);
        return { appKey: null, appSecret: null, endpointUrl: N11_API.BASE_URL };
      }

      // Check if credentials has the required properties
      if (!credentials || typeof credentials !== "object") {
        this.logger.warn("Invalid credentials format, expected object");
        return { appKey: null, appSecret: null, endpointUrl: N11_API.BASE_URL };
      }

      // Map the credentials properties and provide fallbacks
      return {
        appKey: credentials.apiKey || null,
        appSecret: credentials.apiSecret || null,
        endpointUrl: credentials.endpointUrl || N11_API.BASE_URL,
      };
    } catch (error) {
      this.logger.error(`Failed to decrypt N11 credentials: ${error.message}`, {
        error: error.message,
        connectionId: this.connectionId,
      });
      // Return default values instead of throwing to make error handling more graceful
      return { appKey: null, appSecret: null, endpointUrl: N11_API.BASE_URL };
    }
  }

  /**
   * Test the connection to N11
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);

      if (!credentials.appKey || !credentials.appSecret) {
        return {
          success: false,
          message:
            "Connection failed: App key or app secret is missing from credentials",
          error: "Missing required parameters",
        };
      }

      this.logger.debug(
        `Testing N11 connection with appKey: ${credentials.appKey}`
      );

      try {
        // Test connection by fetching categories (lightweight operation)
        const response = await this.retryRequest(() =>
          this.axiosInstance.get(N11_API.ENDPOINTS.CATEGORIES)
        );

        if (
          response.data &&
          response.data.categories &&
          response.data.categories.length > 0
        ) {
          return {
            success: true,
            message: "Connection successful",
            data: {
              platform: "n11",
              connectionId: this.connectionId,
              status: "active",
            },
          };
        } else {
          throw new Error(
            response.data?.result?.errorMessage || "Connection test failed"
          );
        }
      } catch (requestError) {
        this.logger.error("N11 API request failed", {
          error: requestError.message,
          status: requestError.response?.status,
          data: requestError.response?.data,
        });

        let errorMessage = requestError.message;
        const errorData = requestError.response?.data;

        if (errorData && errorData.result && errorData.result.errorMessage) {
          errorMessage = errorData.result.errorMessage;
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      this.logger.error(`N11 connection test failed: ${error.message}`, {
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

  /**
   * Fetch products from N11 - Router method
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
   * Fetch all products from N11 by looping through all pages
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
        size: params.size || params.limit || 50,
      };

      this.logger.info("Starting to fetch all products from N11...");

      while (hasMorePages) {
        const pageParams = {
          ...defaultParams,
          ...params,
          page: currentPage,
        };

        this.logger.debug(`Fetching N11 products page ${currentPage + 1}...`);

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
        `Completed fetching all products from N11: ${allProducts.length} total products across ${currentPage} pages`
      );

      return {
        success: true,
        message: `Successfully fetched ${allProducts.length} products from N11 across ${currentPage} pages`,
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
        `Failed to fetch all products from N11: ${error.message}`,
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
   * Fetch a single page of products from N11
   * @param {Object} params - Query parameters for product fetching
   * @returns {Promise<Object>} Products data for a single page
   */
  async fetchSingleProductPage(params = {}) {
    try {
      await this.initialize();

      const defaultParams = {
        page: 0,
        size: 50,
      };

      const queryParams = { ...defaultParams, ...params };

      this.logger.debug(
        `Fetching N11 products (single page) with params: ${JSON.stringify(
          queryParams
        )}`
      );

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(N11_API.ENDPOINTS.PRODUCTS, {
          params: queryParams,
        })
      );

      if (!response.data || response.data.totalElements === 0) {
        return {
          success: false,
          message:
            response.data?.result?.errorMessage ||
            "No product data returned from N11",
          data: [],
        };
      }

      const products = response.data.content || [];

      this.logger.info(
        `Successfully fetched ${products.length} products from N11 (page ${
          queryParams.page + 1
        })`
      );

      return {
        success: true,
        message: `Successfully fetched ${products.length} products from N11`,
        data: products,
        pagination: response.data.pageable
          ? {
              page: response.data.pageable.pageNumber || queryParams.page,
              size: response.data.pageable.pageSize || queryParams.size,
              totalPages: Math.ceil(
                (response.data.totalElements || 0) /
                  (response.data.pageable.pageSize || 50)
              ),
              totalElements: response.data.totalElements || products.length,
              isFirst:
                (response.data.pageable.pageNumber || queryParams.page) === 0,
              isLast:
                (response.data.pageable.pageNumber || queryParams.page) >=
                Math.ceil(
                  (response.data.totalElements || 0) /
                    (response.data.pageable.pageSize || 50)
                ) -
                  1,
              hasNext:
                (response.data.pageable.pageNumber || queryParams.page) <
                Math.ceil(
                  (response.data.totalElements || 0) /
                    (response.data.pageable.pageSize || 50)
                ) -
                  1,
              hasPrevious:
                (response.data.pageable.pageNumber || queryParams.page) > 0,
            }
          : undefined,
      };
    } catch (error) {
      const statusCode = error.response?.status;
      const apiError = error.response?.data;

      this.logger.error(`Failed to fetch products from N11: ${error.message}`, {
        error,
        statusCode,
        apiError,
        connectionId: this.connectionId,
      });

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
   * Sync products from N11 to our database
   * @param {Object} params - Query parameters for product fetching
   * @returns {Promise<Object>} Result of the sync operation
   */
  async syncProducts(params = {}) {
    try {
      const { Product, N11Product } = require("../../../../../models");
      const defaultUserId = process.env.DEFAULT_USER_ID || "1";

      // Fetch products from N11
      const result = await this.fetchProducts(params);

      if (!result.success) {
        return {
          success: false,
          message: `Failed to fetch products from N11: ${result.message}`,
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
      for (const n11Product of products) {
        try {
          // Check if product already exists in our system
          const externalProductId =
            n11Product.productId || n11Product.id?.toString();

          // Find existing N11 product details
          const existingN11Product = await N11Product.findOne({
            where: { externalProductId },
            include: [{ model: Product }],
          });

          if (existingN11Product) {
            // Update existing product
            await this.updateExistingProduct(existingN11Product, n11Product);
            stats.updated++;
          } else {
            // Create new product record
            await this.createNewProduct(n11Product, defaultUserId);
            stats.new++;
          }
        } catch (productError) {
          this.logger.error(
            `Error processing N11 product: ${productError.message}`,
            {
              error: productError,
              productId: n11Product.productId || n11Product.id,
              connectionId: this.connectionId,
            }
          );
          stats.failed++;
        }
      }

      return {
        success: true,
        message: `Synced ${stats.total} products from N11: ${stats.new} new, ${stats.updated} updated, ${stats.failed} failed`,
        data: stats,
      };
    } catch (error) {
      this.logger.error(`Failed to sync products from N11: ${error.message}`, {
        error,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Failed to sync products: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Create a new product from N11 data
   * @param {Object} n11ProductData - Product data from N11 API
   * @param {string} userId - User ID to associate with the product
   * @returns {Promise<Object>} Created product
   */
  async createNewProduct(n11ProductData, userId) {
    try {
      const { Product, N11Product } = require("../../../../../models");
      const { sequelize } = require("../../../../../models");

      const result = await sequelize.transaction(async (t) => {
        // Create main product record
        const mainProduct = await Product.create(
          {
            userId: userId,
            name: n11ProductData.title || n11ProductData.name,
            description: n11ProductData.description || "",
            price: parseFloat(
              n11ProductData.displayPrice || n11ProductData.price || 0
            ),
            sku: n11ProductData.stockCode || n11ProductData.sku,
            stockQuantity: parseInt(n11ProductData.stockQuantity || 0, 10),
            currency: "TRY",
            barcode: n11ProductData.barcode,
            sourcePlatform: "n11",
            mainImageUrl:
              n11ProductData.images && n11ProductData.images.length > 0
                ? n11ProductData.images[0]
                : null,
            additionalImages:
              n11ProductData.images && n11ProductData.images.length > 1
                ? n11ProductData.images.slice(1)
                : null,
            attributes: n11ProductData.attributes,
            hasVariants:
              n11ProductData.variants && n11ProductData.variants.length > 0,
            metadata: {
              source: "n11",
              externalProductId: n11ProductData.productId || n11ProductData.id,
            },
          },
          { transaction: t }
        );
        // Create N11 product record
        await N11Product.create(
          {
            productId: mainProduct.id,
            externalProductId: n11ProductData.productId || n11ProductData.id,
          },
          { transaction: t }
        );
        return mainProduct;
        // Additional logic for handling variants and other attributes
      });
    } catch (error) {
      this.logger.error(`Failed to create new product: ${error.message}`, {
        error,
        connectionId: this.connectionId,
      });
      throw new Error(`Failed to create new product: ${error.message}`);
    }
  }

  /**
   * Fetch orders from N11
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing order data
   */
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
      this.logger.error(`Failed to fetch orders from N11: ${error.message}`, {
        error,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Failed to fetch orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
      };
    }
  }

  /**
   * Fetch a single page of orders from N11
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing order data for single page
   */
  async fetchSinglePage(params = {}) {
    // Default parameters for N11 order list API
    const defaultParams = {
      startDate: params.startDate || this.getDefaultStartDate(),
      endDate: params.endDate || this.getDefaultEndDate(),
      page: params.page || 0,
      size: params.size || 100,
    };

    // Only include valid API parameters to avoid sending extra data to N11
    const validApiParams = ["startDate", "endDate", "page", "size", "status"];
    const filteredParams = {};

    validApiParams.forEach((key) => {
      if (params[key] !== undefined) {
        filteredParams[key] = params[key];
      }
    });

    const queryParams = { ...defaultParams, ...filteredParams };

    this.logger.debug(
      `Fetching N11 orders (single page) with params: ${JSON.stringify(
        queryParams
      )}`
    );

    const response = await this.retryRequest(() =>
      this.axiosInstance.get(N11_API.ENDPOINTS.ORDERS, {
        params: queryParams,
      })
    );

    // Check if the response has the expected structure
    if (!response.data || !response.data.content) {
      return {
        success: false,
        message: "Invalid response structure from N11 API",
        data: [],
      };
    }

    const orders = response.data.content || [];
    const pagination = {
      page: response.data.page || 0,
      size: response.data.size || queryParams.size,
      totalPages: response.data.totalPages || 1,
      pageCount: response.data.pageCount || orders.length,
    };

    this.logger.info(
      `Retrieved ${orders.length} orders from N11 (page ${
        pagination.page + 1
      }/${pagination.totalPages})`
    );

    const normalizeResult = await this.normalizeOrders(orders);

    return {
      success: true,
      message: `Successfully fetched ${normalizeResult.data.length} orders from N11`,
      data: normalizeResult.data,
      stats: normalizeResult.stats,
      pagination,
    };
  }

  /**
   * Fetch all orders from N11 by looping through all pages (internal method)
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

    this.logger.info("Starting to fetch all orders from N11...");

    while (hasMorePages) {
      const pageParams = {
        ...params,
        page: currentPage,
        size: params.size || 100,
      };

      this.logger.debug(`Fetching N11 orders page ${currentPage + 1}...`);

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
      `Completed fetching all orders from N11: ${allOrders.length} total orders across ${currentPage} pages`
    );

    return {
      success: true,
      message: `Successfully fetched ${allOrders.length} orders from N11 across ${currentPage} pages`,
      data: allOrders,
      stats: allStats,
      pagination: {
        totalPages: currentPage,
        totalOrders: allOrders.length,
        fetchedAllPages: true,
      },
    };
  }

  /**
   * Update an existing product with data from N11
   * @param {Object} existingN11Product - Existing N11Product record
   * @param {Object} n11ProductData - Product data from N11 API
   * @returns {Promise<Object>} Updated product
   */
  async updateExistingProduct(existingN11Product, n11ProductData) {
    try {
      const mainProduct = existingN11Product.Product;
      const { sequelize } = require("../../../../../models");

      // Transaction to ensure both records are updated together
      await sequelize.transaction(async (t) => {
        // Update main product record with latest data
        if (mainProduct) {
          await mainProduct.update(
            {
              name: n11ProductData.title || mainProduct.name,
              description:
                n11ProductData.description || mainProduct.description,
              price: n11ProductData.displayPrice || mainProduct.price,
              stockQuantity:
                n11ProductData.stockQuantity || mainProduct.stockQuantity,
              barcode: n11ProductData.barcode || mainProduct.barcode,
              mainImageUrl:
                n11ProductData.images && n11ProductData.images.length > 0
                  ? n11ProductData.images[0]
                  : mainProduct.mainImageUrl,
              additionalImages:
                n11ProductData.images && n11ProductData.images.length > 1
                  ? n11ProductData.images.slice(1)
                  : mainProduct.additionalImages,
            },
            { transaction: t }
          );
        }

        // Update platform data record
        await existingPlatformData.update(
          {
            title: n11ProductData.title,
            stockCode: n11ProductData.stockCode,
            barcode: n11ProductData.barcode,
            category: n11ProductData.category,
            description: n11ProductData.description,
            images: n11ProductData.images,
            attributes: n11ProductData.attributes,
            variants: n11ProductData.variants,
            approved: n11ProductData.approved || false,
            hasError: n11ProductData.hasError || false,
            errorMessage: n11ProductData.errorMessage,
            platformListingPrice: n11ProductData.displayPrice,
            platformStockQuantity: n11ProductData.stockQuantity,
            lastSyncedAt: new Date(),
            rawData: n11ProductData,
          },
          { transaction: t }
        );
      });

      this.logger.debug(
        `Updated product ${existingPlatformData.platformEntityId} in database`
      );
      return existingPlatformData;
    } catch (error) {
      this.logger.error(`Failed to update product: ${error.message}`, {
        error,
        productId: existingPlatformData.platformEntityId,
      });
      throw error;
    }
  }

  /**
   * Normalize N11 orders to internal format
   * @param {Array} n11Orders - Orders from N11 API
   * @returns {Promise<Object>} Normalized orders with statistics
   */
  async normalizeOrders(n11Orders) {
    const normalizedOrders = [];
    let successCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    try {
      const { sequelize } = require("../../../../../models");
      const { Op } = require("sequelize");

      for (const order of n11Orders) {
        try {
          const phoneNumber = this.extractPhoneNumber(order);

          // Check if order already exists
          const existingOrder = await Order.findOne({
            where: {
              connectionId: this.connectionId,
              externalOrderId: order.id.toString(),
            },
          });

          if (existingOrder) {
            // Update existing order
            try {
              await existingOrder.update({
                orderStatus: this.mapOrderStatus(order.shipmentPackageStatus),
                rawData: JSON.stringify(order),
                lastSyncedAt: new Date(),
              });

              updatedCount++;
              normalizedOrders.push(existingOrder);
              continue;
            } catch (updateError) {
              this.logger.error(
                `Failed to update existing order ${order.id}: ${updateError.message}`,
                {
                  error: updateError,
                  orderId: order.id,
                  connectionId: this.connectionId,
                }
              );
              skippedCount++;
              continue;
            }
          }

          // Create new order
          const result = await sequelize.transaction(async (t) => {
            // Create the order record first with comprehensive N11 field mapping
            const { ShippingDetail } = require("../../../../../models");
            const shippingAddress = order.shippingAddress || {};
            const billingAddress = order.billingAddress || {};

            const [normalizedOrder, created] = await Order.findOrCreate({
              where: {
                externalOrderId: order.id.toString(),
                connectionId: this.connectionId,
              },
              defaults: {
                externalOrderId: order.id.toString(),
                connectionId: this.connectionId,
                userId: this.connection.userId,
                orderNumber: order.orderNumber || "",
                platform: "n11",
                platformType: "n11",
                platformId: "n11",
                platformOrderId: order.id.toString(),
                customerName:
                  order.customerfullName ||
                  shippingAddress.fullName ||
                  billingAddress.fullName ||
                  "",
                customerEmail: order.customerEmail || "",
                customerPhone:
                  phoneNumber ||
                  shippingAddress.gsm ||
                  billingAddress.gsm ||
                  "",
                orderDate: new Date(
                  order.packageHistories?.[0]?.createdDate ||
                    order.lastModifiedDate ||
                    Date.now()
                ),
                orderStatus: this.mapOrderStatus(order.shipmentPackageStatus),
                totalAmount: parseFloat(order.totalAmount || 0),
                currency: "TRY",
                shippingAddress: JSON.stringify(shippingAddress),
                // Cargo and tracking information
                cargoTrackingNumber: order.cargoTrackingNumber
                  ? this.preserveCargoTrackingNumber(order.cargoTrackingNumber)
                  : null,
                cargoTrackingLink: order.cargoTrackingLink || null,
                cargoTrackingUrl: order.cargoTrackingLink || null,
                cargoCompany: order.cargoProviderName || null,
                // Additional N11-specific fields
                identityNumber:
                  order.tcIdentityNumber ||
                  shippingAddress.tcId ||
                  billingAddress.tcId ||
                  "",
                invoiceTotal: parseFloat(order.totalAmount || 0),
                // Commercial transaction fields
                isCommercial: billingAddress.invoiceType === 2 ? 1 : 0,
                // Delivery information
                deliveryType: this.mapDeliveryType(order.shipmentMethod),
                // Discount information
                totalDiscountAmount: parseFloat(order.totalDiscountAmount || 0),
                // Timestamps
                agreedDeliveryDate: order.agreedDeliveryDate
                  ? new Date(order.agreedDeliveryDate)
                  : null,
                // Standard fields
                notes: order.note || "",
                invoiceStatus: "pending",
                rawData: JSON.stringify(order),
                lastSyncedAt: new Date(),
              },
              transaction: t,
            });

            if (created) {
              this.logger.debug(`Created new order for ${order.id}`);
            } else {
              this.logger.debug(
                `Found existing order for ${order.id}, updating if needed`
              );
            }

            // Create shipping detail with orderId
            const shippingDetail = await ShippingDetail.create(
              {
                orderId: normalizedOrder.id,
                recipientName:
                  shippingAddress.fullName ||
                  billingAddress.fullName ||
                  order.customerfullName ||
                  "",
                address:
                  shippingAddress.address || billingAddress.address || "",
                city: shippingAddress.city || billingAddress.city || "",
                state:
                  shippingAddress.district || billingAddress.district || "",
                postalCode:
                  shippingAddress.postalCode || billingAddress.postalCode || "",
                country: "Turkey",
                phone:
                  phoneNumber ||
                  shippingAddress.gsm ||
                  billingAddress.gsm ||
                  "",
                email: order.customerEmail || "",
                // Additional N11-specific fields
                carrierId: order.cargoProviderName || null,
              },
              { transaction: t }
            );

            // Update order with shipping detail ID
            await normalizedOrder.update(
              { shippingDetailId: shippingDetail.id },
              { transaction: t }
            );

            // Create order items with comprehensive N11 line item mapping
            if (order.lines && Array.isArray(order.lines)) {
              // Map order items data with all N11-specific fields
              const orderItemsData = order.lines.map((item) => {
                const unitPrice = parseFloat(item.price || 0);
                const quantity = parseInt(item.quantity || 1, 10);
                const totalPrice = unitPrice * quantity;

                return {
                  orderId: normalizedOrder.id,
                  productId: null, // Will be set by linking service
                  platformProductId: item.productId?.toString(),
                  barcode: item.barcode || null,
                  title: item.productName || item.title || "",
                  sku: item.stockCode || item.sellerStockCode || "",
                  quantity: quantity,
                  price: unitPrice,
                  totalPrice: totalPrice, // Required NOT NULL field
                  // Calculate total discount (seller + mall discounts)
                  discount: parseFloat(
                    (item.sellerDiscount || 0) + (item.mallDiscount || 0)
                  ),
                  platformDiscount: parseFloat(item.mallDiscount || 0),
                  merchantDiscount: parseFloat(item.sellerDiscount || 0),
                  invoiceTotal: parseFloat(item.sellerInvoiceAmount || 0),
                  currency: "TRY",
                  // N11-specific fields
                  vatBaseAmount: parseFloat(item.vatBaseAmount || 0),
                  laborCost: parseFloat(item.totalLaborCostExcludingVAT || 0),
                  lineItemStatus: item.orderItemLineItemStatusName || "Created",
                  // Additional pricing fields
                  vatRate: parseFloat(item.vatRate || 20),
                  commissionRate: parseFloat(item.commissionRate || 0),
                  taxDeductionRate: parseFloat(item.taxDeductionRate || 0),
                  // Marketing and marketplace fees
                  netMarketingFeeRate: parseFloat(
                    item.netMarketingFeeRate || 0
                  ),
                  netMarketplaceFeeRate: parseFloat(
                    item.netMarketplaceFeeRate || 0
                  ),
                  // Installment information
                  installmentChargeWithVAT: parseFloat(
                    item.installmentChargeWithVAT || 0
                  ),
                  // Coupon discounts
                  sellerCouponDiscount: parseFloat(
                    item.sellerCouponDiscount || 0
                  ),
                  // Variant information
                  variantInfo:
                    item.variantAttributes && item.variantAttributes.length > 0
                      ? JSON.stringify(item.variantAttributes)
                      : null,
                  // Store complete raw data for debugging
                  rawData: JSON.stringify(item),
                };
              });

              try {
                // Create OrderItem records first
                const createdOrderItems = [];
                for (const itemData of orderItemsData) {
                  const createdItem = await OrderItem.create(itemData, {
                    transaction: t,
                  });
                  createdOrderItems.push(createdItem);
                }

                this.logger.info(
                  `Created ${createdOrderItems.length} order items for N11 order ${order.orderNumber}`,
                  {
                    orderNumber: order.orderNumber,
                    connectionId: this.connectionId,
                    itemCount: createdOrderItems.length,
                  }
                );

                // Now try to link them with products
                const linkingService = new ProductOrderLinkingService();
                const linkingResult =
                  await linkingService.linkProductsToOrderItems(
                    createdOrderItems,
                    this.connection.userId,
                    { transaction: t }
                  );

                if (linkingResult.success) {
                  this.logger.info(
                    `Product linking completed for N11 order ${order.orderNumber}: ${linkingResult.stats.linked}/${linkingResult.stats.total} items linked`,
                    {
                      orderNumber: order.orderNumber,
                      connectionId: this.connectionId,
                      linkingStats: linkingResult.stats,
                    }
                  );
                } else {
                  this.logger.warn(
                    `Product linking had issues for N11 order ${order.orderNumber}: ${linkingResult.message}`,
                    {
                      orderNumber: order.orderNumber,
                      connectionId: this.connectionId,
                      error: linkingResult.error,
                    }
                  );
                }
              } catch (linkingError) {
                this.logger.error(
                  `Failed to create order items for N11 order ${order.orderNumber}: ${linkingError.message}`,
                  {
                    error: linkingError,
                    orderNumber: order.orderNumber,
                    connectionId: this.connectionId,
                  }
                );

                // Fallback: create order items without linking (if creation failed)
                if (linkingError.message.includes("create")) {
                  for (const itemData of orderItemsData) {
                    await OrderItem.create(itemData, { transaction: t });
                  }
                }
              }
            }

            // Create N11-specific order record
            await this.createN11OrderRecord(normalizedOrder.id, order, t);

            return normalizedOrder;
          });

          normalizedOrders.push(result);
          successCount++;
        } catch (error) {
          // Handle unique constraint violations gracefully (race condition during concurrent syncs)
          if (
            error.name === "SequelizeUniqueConstraintError" &&
            (error.original?.code === "SQLITE_CONSTRAINT" ||
              error.original?.errno === 19 ||
              (error.sql &&
                error.sql.includes("unique_external_order_per_connection")))
          ) {
            this.logger.warn(
              `Unique constraint error for order ${order.id}, attempting recovery`,
              {
                orderNumber: order.id,
                connectionId: this.connectionId,
                errorName: error.name,
                constraintCode: error.original?.code,
                errno: error.original?.errno,
              }
            );

            try {
              // Add small delay to handle transaction timing issues
              await new Promise((resolve) => setTimeout(resolve, 100));

              // Find the existing order that was created by another process
              const existingOrder = await Order.findOne({
                where: {
                  connectionId: this.connectionId,
                  externalOrderId: order.id.toString(),
                },
              });

              if (existingOrder) {
                // Update the existing order with latest data
                await existingOrder.update({
                  orderStatus: this.mapOrderStatus(order.shipmentPackageStatus),
                  rawData: JSON.stringify(order),
                  lastSyncedAt: new Date(),
                });

                normalizedOrders.push(existingOrder);
                updatedCount++;

                this.logger.info(
                  `Successfully recovered from race condition by updating existing order ${order.id}`,
                  {
                    orderNumber: order.id,
                    connectionId: this.connectionId,
                  }
                );
                continue;
              } else {
                this.logger.error(
                  `Unique constraint error but order not found: ${order.id}`,
                  {
                    orderNumber: order.id,
                    connectionId: this.connectionId,
                  }
                );
              }
            } catch (recoveryError) {
              this.logger.error(
                `Failed to recover from unique constraint error for order ${order.id}: ${recoveryError.message}`,
                {
                  error: recoveryError,
                  orderId: order.id,
                  connectionId: this.connectionId,
                }
              );
            }
          }

          this.logger.error(
            `Failed to process order ${order.id}: ${error.message}`,
            {
              error,
              orderId: order.id,
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
          total: n11Orders.length,
          success: successCount,
          updated: updatedCount,
          skipped: skippedCount,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to normalize N11 orders: ${error.message}`, {
        error: error.message,
        stack: error.stack,
        connectionId: this.connectionId,
        orderCount: n11Orders?.length || 0,
        processedCount: successCount + updatedCount + skippedCount,
      });
      throw error;
    }
  }

  /**
   * Create N11-specific order record
   * @param {string} orderId - The main Order record ID
   * @param {Object} n11OrderData - Raw order data from N11 API
   * @param {Object} transaction - Sequelize transaction object
   * @returns {Promise<Object>} Created N11Order record
   */
  async createN11OrderRecord(orderId, n11OrderData, transaction) {
    try {
      const { N11Order } = require("../../../../../models");

      return await N11Order.create(
        {
          orderId: orderId,
          n11OrderId: n11OrderData.id?.toString(),
          orderNumber: n11OrderData.orderNumber,
          sellerId: n11OrderData.sellerId,
          buyerId: n11OrderData.customerId?.toString(),
          orderStatus: this.mapOrderStatus(n11OrderData.shipmentPackageStatus),
          shippingCompany: n11OrderData.cargoProviderName,
          trackingNumber: n11OrderData.cargoTrackingNumber,
          trackingUrl: "According to shippingCompany",
          estimatedDeliveryDate: n11OrderData.agreedDeliveryDate
            ? new Date(n11OrderData.agreedDeliveryDate)
            : null,
          actualDeliveryDate: n11OrderData.agreedDeliveryDate
            ? new Date(n11OrderData.agreedDeliveryDate)
            : null,
          shippingAddress: n11OrderData.shippingAddress,
          billingAddress: n11OrderData.billingAddress,
          customerInfo: {
            fullName:
              n11OrderData.customerfullName || n11OrderData.customerName || "",
            email: n11OrderData.customerEmail || "",
            gsm:
              n11OrderData.billingAddress?.gsm ||
              n11OrderData.shippingAddress?.gsm ||
              "",
            citizenshipId: n11OrderData.tcIdentityNumber || "",
          },
          n11OrderDate: n11OrderData.lastModifiedDate
            ? new Date(n11OrderData.lastModifiedDate)
            : new Date(),
          lastSyncAt: new Date(),
          platformFees:
            n11OrderData.platformFees || n11OrderData.commission || 0,
          cancellationReason: n11OrderData.cancellationReason || null,
          returnReason: n11OrderData.returnReason || null,
          platformOrderData: n11OrderData,
        },
        { transaction }
      );
    } catch (error) {
      this.logger.error(`Failed to create N11 Order record: ${error.message}`, {
        error,
        orderId,
        orderNumber: n11OrderData.orderNumber,
      });
      throw error;
    }
  }

  /**
   * Map N11 shipment method to delivery type
   * @param {number} shipmentMethod - Shipment method from N11 API
   * @returns {string} Delivery type
   */
  mapDeliveryType(shipmentMethod) {
    const deliveryMap = {
      1: "normal", // Standard delivery
      2: "fast", // Fast delivery
      3: "express", // Express delivery
      4: "same_day", // Same day delivery
    };

    return deliveryMap[shipmentMethod] || "normal";
  }

  /**
   * Map N11 API status to internal order status enum
   * @param {string} apiStatus - Status from N11 API
   * @returns {string} Internal order status compatible with Order model ENUM
   */
  mapOrderStatus(apiStatus) {
    // Use the shared enum validator utility to ensure database compatibility
    return mapOrderStatus(apiStatus, "n11");
  }

  /**
   * Map internal status to N11 status
   * @param {string} internalStatus - Internal status
   * @returns {string} N11 status
   */
  mapToPlatformStatus(internalStatus) {
    const reverseStatusMap = {
      new: "New",
      pending: "Approved",
      processing: "Picking",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
      returned: "Returned",
      failed: "UnSupplied",
    };

    return reverseStatusMap[internalStatus];
  }

  /**
   * Update order status on N11 platform
   * @param {string} orderId - Internal order ID
   * @param {string} newStatus - New status to set
   * @returns {Object} - Result of the status update operation
   */
  async updateOrderStatus(orderId, newStatus) {
    try {
      await this.initialize();

      const order = await Order.findByPk(orderId);

      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }

      const n11Status = this.mapToPlatformStatus(newStatus);

      if (!n11Status) {
        throw new Error(`Cannot map status '${newStatus}' to N11 status`);
      }

      const packageId = order.externalOrderId || order.platformOrderId;

      if (!packageId) {
        throw new Error("External order ID not found for N11 order");
      }

      // Update order status using N11 API
      const response = await this.axiosInstance.put(
        N11_API.ENDPOINTS.UPDATE_ORDER.replace("{id}", packageId),
        {
          status: n11Status,
        }
      );

      // Update local order status
      await order.update({
        orderStatus: newStatus,
        lastSyncedAt: new Date(),
      });

      return {
        success: true,
        message: `Order status updated to ${newStatus}`,
        data: order,
        platformResponse: response.data,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update order status on N11: ${error.message}`,
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
   * Accept an order on N11 platform using the dedicated accept endpoint
   * @param {string} externalOrderId - External order ID (package ID)
   * @returns {Object} - Result of the acceptance operation
   */
  async acceptOrder(externalOrderId) {
    try {
      await this.initialize();

      if (!externalOrderId) {
        throw new Error(
          "External order ID is required for N11 order acceptance"
        );
      }

      this.logger.info(`N11 order acceptance requested`, {
        externalOrderId,
        connectionId: this.connectionId,
      });

      // Get order details from local database (avoid API call that causes socket hang up)
      const localOrder = await Order.findOne({
        where: {
          externalOrderId: externalOrderId.toString(),
          platform: "n11",
        },
      });

      if (!localOrder) {
        throw new Error("Order not found in local database");
      }

      // Parse the stored raw data to get line items
      let orderDetails;
      try {
        orderDetails = JSON.parse(localOrder.rawData || "{}");
      } catch (parseError) {
        throw new Error("Could not parse order data from database");
      }

      if (
        !orderDetails ||
        !orderDetails.lines ||
        orderDetails.lines.length === 0
      ) {
        throw new Error("Order not found or has no line items");
      }

      // Extract line IDs from the order details
      const lineIds = orderDetails.lines
        .filter((line) => line.orderLineId) // Only include lines with valid IDs
        .map((line) => ({ lineId: line.orderLineId }));

      if (lineIds.length === 0) {
        throw new Error("No valid line items found for order acceptance");
      }

      // Use the official N11 order update endpoint
      const requestData = {
        lines: lineIds,
        status: "Picking", // Official N11 status for order acceptance
      };

      this.logger.debug(`N11 order acceptance request data`, {
        externalOrderId,
        requestData,
        lineCount: lineIds.length,
      });

      // Make the API call using the absolute endpoint path
      let response;
      try {
        response = await this.axiosInstance.put(
          N11_API.ENDPOINTS.UPDATE_ORDER_STATUS,
          requestData,
          {
            timeout: 15000, // Increase timeout to 15 seconds
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      } catch (apiError) {
        this.logger.error(`N11 API call failed`, {
          externalOrderId,
          error: apiError.message,
          code: apiError.code,
          status: apiError.response?.status,
          endpoint: N11_API.ENDPOINTS.UPDATE_ORDER_STATUS,
        });

        // If it's a socket hang up or connection error, return a partial success
        if (
          apiError.code === "ECONNRESET" ||
          apiError.message.includes("socket hang up")
        ) {
          return {
            success: false,
            message: `N11 API connection failed: ${apiError.message}. Order may need to be accepted manually on N11 platform.`,
            error: "CONNECTION_ERROR",
            externalOrderId,
            requestData,
          };
        }

        throw apiError;
      }

      // Check if all line items were successfully updated
      const successCount =
        response.data.content?.filter((item) => item.status === "SUCCESS")
          .length || 0;
      const failedItems =
        response.data.content?.filter((item) => item.status !== "SUCCESS") ||
        [];

      if (failedItems.length > 0) {
        this.logger.warn(`Some line items failed to update`, {
          externalOrderId,
          failedItems,
          successCount,
        });
      }

      this.logger.info(`N11 order acceptance completed`, {
        externalOrderId,
        successCount,
        failedCount: failedItems.length,
        totalLines: lineIds.length,
      });

      return {
        success: successCount > 0,
        message: `Order acceptance completed. ${successCount}/${lineIds.length} line items updated successfully`,
        data: response.data,
        externalOrderId,
        successCount,
        failedCount: failedItems.length,
        failedItems,
      };
    } catch (error) {
      this.logger.error(`Failed to accept order on N11: ${error.message}`, {
        error,
        externalOrderId,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Failed to accept order: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Get detailed information about a specific order from N11
   * @param {string} externalOrderId - External order ID (package ID)
   * @returns {Object} - Order details including line items
   */
  async getOrderDetails(externalOrderId) {
    try {
      await this.initialize();

      if (!externalOrderId) {
        throw new Error("External order ID is required");
      }

      this.logger.debug(`Fetching N11 order details`, {
        externalOrderId,
        connectionId: this.connectionId,
      });

      // Use the order detail endpoint
      const response = await this.axiosInstance.get(
        N11_API.ENDPOINTS.ORDER_DETAIL.replace("{id}", externalOrderId)
      );

      if (!response.data) {
        throw new Error("No order data received from N11");
      }

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get N11 order details: ${error.message}`, {
        error,
        externalOrderId,
        connectionId: this.connectionId,
        response: error.response?.data,
      });

      // Try to get order details from local database as fallback
      try {
        const localOrder = await Order.findOne({
          where: {
            externalOrderId: externalOrderId.toString(),
            platform: "n11",
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
            `Using cached order data for N11 order ${externalOrderId}`
          );
          return rawData;
        }
      } catch (dbError) {
        this.logger.warn(
          `Could not retrieve cached order data: ${dbError.message}`
        );
      }

      throw error;
    }
  }

  /**
   * Reject an order on N11 platform using the dedicated reject endpoint
   * @param {string} externalOrderId - External order ID (package ID)
   * @param {string} reason - Rejection reason
   * @returns {Object} - Result of the rejection operation
   */
  async rejectOrder(externalOrderId, reason = "Merchant rejection") {
    try {
      await this.initialize();

      if (!externalOrderId) {
        throw new Error(
          "External order ID is required for N11 order rejection"
        );
      }

      this.logger.info(`N11 order rejection requested`, {
        externalOrderId,
        reason,
        connectionId: this.connectionId,
      });

      // Use N11's dedicated reject endpoint
      const response = await this.axiosInstance.post(
        N11_API.ENDPOINTS.REJECT_ORDER.replace("{id}", externalOrderId),
        {
          reason: reason,
        }
      );

      return {
        success: true,
        message: "Order rejected successfully on N11",
        data: response.data,
        externalOrderId,
        reason,
      };
    } catch (error) {
      this.logger.error(`Failed to reject order on N11: ${error.message}`, {
        error,
        externalOrderId,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Failed to reject order: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Fetch a list of categories from N11
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing category data
   */
  async fetchCategories(params = {}) {
    try {
      await this.initialize();

      const defaultParams = {
        // Default parameters for category fetching
        size: params.size || 100,
        page: params.page || 0,
      };

      const queryParams = { ...defaultParams, ...params };

      this.logger.debug(
        `Fetching N11 categories with params: ${JSON.stringify(queryParams)}`
      );

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(N11_API.ENDPOINTS.CATEGORIES, {
          params: queryParams,
        })
      );

      if (!response.data || response.data.totalElements === 0) {
        return {
          success: false,
          message: "No category data returned from N11",
          data: [],
        };
      }

      const categories = response.data.content || [];

      this.logger.info(
        `Successfully fetched ${categories.length} categories from N11`
      );

      return {
        success: true,
        message: `Successfully fetched ${categories.length} categories from N11`,
        data: categories,
        pagination: response.data.pageable
          ? {
              page: response.data.pageable.pageNumber || queryParams.page,
              size: response.data.pageable.pageSize || queryParams.size,
              totalPages: Math.ceil(
                (response.data.totalElements || 0) /
                  (response.data.pageable.pageSize || 50)
              ),
              totalElements: response.data.totalElements || categories.length,
              isFirst:
                (response.data.pageable.pageNumber || queryParams.page) === 0,
              isLast:
                (response.data.pageable.pageNumber || queryParams.page) >=
                Math.ceil(
                  (response.data.totalElements || 0) /
                    (response.data.pageable.pageSize || 50)
                ) -
                  1,
              hasNext:
                (response.data.pageable.pageNumber || queryParams.page) <
                Math.ceil(
                  (response.data.totalElements || 0) /
                    (response.data.pageable.pageSize || 50)
                ) -
                  1,
              hasPrevious:
                (response.data.pageable.pageNumber || queryParams.page) > 0,
            }
          : undefined,
      };
    } catch (error) {
      const statusCode = error.response?.status;
      const apiError = error.response?.data;

      this.logger.error(
        `Failed to fetch categories from N11: ${error.message}`,
        {
          error,
          statusCode,
          apiError,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to fetch categories: ${error.message}`,
        error: apiError || error.message,
        data: [],
      };
    }
  }

  /**
   * Fetch category attributes from N11
   * @param {string} categoryId - Category ID
   * @returns {Promise<Object>} Result containing category attributes
   */
  async fetchCategoryAttributes(categoryId) {
    try {
      await this.initialize();

      if (!categoryId) {
        throw new Error("Category ID is required to fetch attributes");
      }

      this.logger.debug(
        `Fetching N11 category attributes for ID: ${categoryId}`
      );

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(
          N11_API.ENDPOINTS.CATEGORY_ATTRIBUTES.replace(
            "{categoryId}",
            categoryId
          )
        )
      );

      if (!response.data || response.data.length === 0) {
        return {
          success: false,
          message: "No category attribute data returned from N11",
          data: [],
        };
      }

      const attributes = response.data || [];

      this.logger.info(
        `Successfully fetched ${attributes.length} attributes for category ${categoryId} from N11`
      );

      return {
        success: true,
        message: `Successfully fetched ${attributes.length} attributes for category ${categoryId} from N11`,
        data: attributes,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch category attributes from N11: ${error.message}`,
        {
          error,
          categoryId,
          connectionId: this.connectionId,
        }
      );

      return {
        success: false,
        message: `Failed to fetch category attributes: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
      };
    }
  }

  /**
   * Upload a product catalog to N11
   * @param {Object} catalogData - Catalog data to upload
   * @returns {Promise<Object>} Result of the upload operation
   */
  async uploadCatalog(catalogData) {
    try {
      await this.initialize();

      this.logger.info(`Uploading product catalog to N11...`);

      const response = await this.retryRequest(() =>
        this.axiosInstance.post(N11_API.ENDPOINTS.CATALOG_UPLOAD, catalogData)
      );

      this.logger.info(`Catalog uploaded successfully to N11`);

      return {
        success: true,
        message: "Catalog uploaded successfully to N11",
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`Failed to upload catalog to N11: ${error.message}`, {
        error,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Failed to upload catalog: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Search for products in the catalog
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async searchCatalog(searchParams) {
    try {
      await this.initialize();

      const defaultParams = {
        // Default search parameters
        size: searchParams.size || 100,
        page: searchParams.page || 0,
      };

      const queryParams = { ...defaultParams, ...searchParams };

      this.logger.debug(
        `Searching N11 catalog with params: ${JSON.stringify(queryParams)}`
      );

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(N11_API.ENDPOINTS.CATALOG_SEARCH, {
          params: queryParams,
        })
      );

      if (!response.data || response.data.totalElements === 0) {
        return {
          success: false,
          message: "No product data found in catalog",
          data: [],
        };
      }

      const products = response.data.content || [];

      this.logger.info(
        `Successfully found ${products.length} products in N11 catalog`
      );

      return {
        success: true,
        message: `Successfully found ${products.length} products in N11 catalog`,
        data: products,
        pagination: response.data.pageable
          ? {
              page: response.data.pageable.pageNumber || queryParams.page,
              size: response.data.pageable.pageSize || queryParams.size,
              totalPages: Math.ceil(
                (response.data.totalElements || 0) /
                  (response.data.pageable.pageSize || 50)
              ),
              totalElements: response.data.totalElements || products.length,
              isFirst:
                (response.data.pageable.pageNumber || queryParams.page) === 0,
              isLast:
                (response.data.pageable.pageNumber || queryParams.page) >=
                Math.ceil(
                  (response.data.totalElements || 0) /
                    (response.data.pageable.pageSize || 50)
                ) -
                  1,
              hasNext:
                (response.data.pageable.pageNumber || queryParams.page) <
                Math.ceil(
                  (response.data.totalElements || 0) /
                    (response.data.pageable.pageSize || 50)
                ) -
                  1,
              hasPrevious:
                (response.data.pageable.pageNumber || queryParams.page) > 0,
            }
          : undefined,
      };
    } catch (error) {
      const statusCode = error.response?.status;
      const apiError = error.response?.data;

      this.logger.error(`Failed to search catalog on N11: ${error.message}`, {
        error,
        statusCode,
        apiError,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Failed to search catalog: ${error.message}`,
        error: apiError || error.message,
        data: [],
      };
    }
  }

  /**
   * Retry a request with exponential backoff
   * @param {Function} requestFunction - The request function to retry
   * @param {number} [retries=3] - Number of retries
   * @param {number} [delay=1000] - Initial delay in ms
   * @returns {Promise<Object>} Result of the request
   */
  async retryRequest(requestFunction, retries = 3, delay = 1000) {
    try {
      return await requestFunction();
    } catch (error) {
      if (retries === 0) throw error;

      this.logger.warn(
        `Request failed, retrying in ${delay}ms... (${retries} retries left)`,
        { error: error.message, connectionId: this.connectionId }
      );

      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.retryRequest(requestFunction, retries - 1, delay * 2);
    }
  }

  /**
   * Extract phone number from N11 order data
   * @param {Object} order - N11 order object
   * @returns {string|null} Formatted phone number
   */
  extractPhoneNumber(order) {
    // Try to get phone number from various sources
    let phone =
      order.shippingAddress?.gsm ||
      order.billingAddress?.gsm ||
      order.customerPhone ||
      null;

    if (!phone) return null;

    // Clean and format phone number
    // Remove any non-digit characters except + at the beginning
    phone = phone.replace(/[^\d+]/g, "");

    // If phone starts with 90, add + to make it +90
    if (phone.startsWith("90") && phone.length === 12) {
      phone = "+" + phone;
    }

    // If phone starts with 5 and is 10 digits, add +90
    if (phone.startsWith("5") && phone.length === 10) {
      phone = "+90" + phone;
    }

    // If phone has 'X' characters (masked), keep the original
    if (
      order.shippingAddress?.gsm?.includes("X") ||
      order.billingAddress?.gsm?.includes("X")
    ) {
      return order.shippingAddress?.gsm || order.billingAddress?.gsm;
    }

    return phone;
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
   * Create a single product on N11 platform
   * @param {Object} productData - Product data in N11 format
   * @returns {Promise<Object>} - Result of product creation
   */
  async createProduct(productData) {
    try {
      await this.initialize();

      // Validate required fields for N11
      const requiredFields = [
        "productName",
        "category",
        "price",
        "stockItems",
        "images",
        "description",
      ];

      for (const field of requiredFields) {
        if (productData[field] === undefined || productData[field] === null) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate stock items structure
      if (!productData.stockItems || !productData.stockItems.stockItem) {
        throw new Error("Stock items structure is required");
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

      // Format the product data according to N11 API requirements
      const n11ProductData = {
        productName: productData.productName,
        category: productData.category,
        price: parseFloat(productData.price),
        stockItems: {
          stockItem: {
            quantity: parseInt(productData.stockItems.stockItem.quantity, 10),
            sellerStockCode: productData.stockItems.stockItem.sellerStockCode,
            attributes: productData.stockItems.stockItem.attributes || {},
          },
        },
        images: {
          image: Array.isArray(productData.images)
            ? productData.images
            : [productData.images],
        },
        description: productData.description,
        shipmentTemplate: productData.shipmentTemplate || "default",
        preparingDay: productData.preparingDay || 1,
        discount: productData.discount || null,
        currencyType: productData.currencyType || "TL",
        approvalStatus: productData.approvalStatus || false,
      };

      // Add optional fields if provided
      if (productData.brand) {
        n11ProductData.brand = productData.brand;
      }

      if (productData.mpn) {
        n11ProductData.mpn = productData.mpn;
      }

      if (productData.gtin) {
        n11ProductData.gtin = productData.gtin;
      }

      if (productData.vendorCode) {
        n11ProductData.vendorCode = productData.vendorCode;
      }

      this.logger.info(`Creating product on N11`, {
        productName: productData.productName,
        sellerStockCode: productData.stockItems.stockItem.sellerStockCode,
      });

      // Note: This endpoint needs to be verified with official N11 API documentation
      // Current implementation is based on reverse engineering from existing API patterns
      const endpoint = "/rest/product/v1/create"; // This may need adjustment based on official docs

      const response = await this.axiosInstance.post(endpoint, n11ProductData);

      this.logger.info(`Product created successfully on N11`, {
        productName: productData.productName,
        response: response.data,
      });

      return {
        success: true,
        message: "Product created successfully on N11",
        data: response.data,
        platformProductId: response.data?.productId || response.data?.id,
      };
    } catch (error) {
      this.logger.error(`Failed to create product on N11: ${error.message}`, {
        error: error.message,
        status: error.response?.status,
        productName: productData?.productName,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Failed to create product on N11: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Create multiple products on N11 (bulk creation)
   * @param {Array} productsData - Array of product data in N11 format
   * @returns {Promise<Object>} - Result of bulk product creation
   */
  async createProductsBulk(productsData) {
    try {
      await this.initialize();

      if (!Array.isArray(productsData) || productsData.length === 0) {
        throw new Error("Products data must be a non-empty array");
      }

      this.logger.info(`Creating ${productsData.length} products on N11`, {
        productCount: productsData.length,
      });

      const results = [];
      const errors = [];

      // Process products sequentially to avoid rate limiting
      for (let i = 0; i < productsData.length; i++) {
        const productData = productsData[i];

        try {
          const result = await this.createProduct(productData);
          results.push({
            index: i,
            productName: productData.productName,
            result: result,
          });

          // Add a small delay between requests to be respectful to the API
          if (i < productsData.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        } catch (error) {
          errors.push({
            index: i,
            productName: productData.productName,
            error: error.message,
          });
        }
      }

      const successCount = results.filter((r) => r.result.success).length;
      const failureCount =
        errors.length + results.filter((r) => !r.result.success).length;

      this.logger.info(`Bulk product creation completed on N11`, {
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
        `Failed to create products bulk on N11: ${error.message}`,
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
   * Update product information on N11
   * @param {string} productId - Product ID or seller stock code
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Update result
   */
  async updateProduct(productId, updateData) {
    try {
      await this.initialize();

      if (!productId) {
        throw new Error("Product ID is required for product update");
      }

      // Format update data according to N11 requirements
      const n11UpdateData = {};

      if (updateData.price !== undefined) {
        n11UpdateData.price = parseFloat(updateData.price);
      }

      if (updateData.stockQuantity !== undefined) {
        n11UpdateData.stockItems = {
          stockItem: {
            quantity: parseInt(updateData.stockQuantity, 10),
            sellerStockCode: productId,
          },
        };
      }

      if (updateData.productName) {
        n11UpdateData.productName = updateData.productName;
      }

      if (updateData.description) {
        n11UpdateData.description = updateData.description;
      }

      if (updateData.preparingDay !== undefined) {
        n11UpdateData.preparingDay = parseInt(updateData.preparingDay, 10);
      }

      this.logger.info(`Updating product on N11`, {
        productId,
        updateFields: Object.keys(updateData),
      });

      // Note: This endpoint needs to be verified with official documentation
      const endpoint = `/rest/product/v1/update/${productId}`;

      const response = await this.axiosInstance.put(endpoint, n11UpdateData);

      this.logger.info(`Product updated successfully on N11`, {
        productId,
        response: response.data,
      });

      return {
        success: true,
        message: "Product updated successfully on N11",
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`Failed to update product on N11: ${error.message}`, {
        error,
        productId,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Failed to update product: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Helper method to validate N11 product data structure
   * @param {Object} productData - Product data to validate
   * @returns {Object} - Validation result
   */
  validateProductData(productData) {
    const errors = [];
    const warnings = [];

    // Required field validation for N11
    const requiredFields = {
      productName: { type: "string", maxLength: 150 },
      category: { type: "object" },
      price: { type: "number", min: 0 },
      description: { type: "string", maxLength: 5000 },
    };

    // Validate required fields
    for (const [field, rules] of Object.entries(requiredFields)) {
      if (productData[field] === undefined || productData[field] === null) {
        errors.push(`Missing required field: ${field}`);
        continue;
      }

      const value = productData[field];

      // Type validation
      if (rules.type === "string" && typeof value !== "string") {
        errors.push(`Field ${field} must be a string`);
      } else if (rules.type === "number" && typeof value !== "number") {
        errors.push(`Field ${field} must be a number`);
      } else if (rules.type === "object" && typeof value !== "object") {
        errors.push(`Field ${field} must be an object`);
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
    }

    // Stock items validation
    if (!productData.stockItems || !productData.stockItems.stockItem) {
      errors.push("Stock items structure is required");
    } else {
      const stockItem = productData.stockItems.stockItem;

      if (!stockItem.quantity || typeof stockItem.quantity !== "number") {
        errors.push("Stock item quantity is required and must be a number");
      }

      if (
        !stockItem.sellerStockCode ||
        typeof stockItem.sellerStockCode !== "string"
      ) {
        errors.push(
          "Stock item seller stock code is required and must be a string"
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
          errors.push(`Image ${index + 1}: Must be a valid HTTP/HTTPS URL`);
        }
      });
    }

    // Category validation
    if (productData.category && typeof productData.category === "object") {
      if (!productData.category.id && !productData.category.categoryId) {
        errors.push("Category must have an id or categoryId field");
      }
    }

    // Business logic validations
    if (
      productData.preparingDay &&
      (productData.preparingDay < 1 || productData.preparingDay > 30)
    ) {
      warnings.push("Preparing day should be between 1 and 30 days");
    }

    if (productData.price && productData.price < 1) {
      warnings.push("Product price seems very low, please verify");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * NOTE: The following methods require official N11 API documentation
   * Current implementation is based on assumptions from existing API patterns
   * Please verify endpoints and request/response formats with official documentation
   */

  /**
   * Get product status from N11
   * @param {string} productId - Product ID or seller stock code
   * @returns {Promise<Object>} - Product status information
   */
  async getProductStatus(productId) {
    try {
      await this.initialize();

      if (!productId) {
        throw new Error("Product ID is required");
      }

      // Note: Endpoint needs verification with official documentation
      const endpoint = `/rest/product/v1/status/${productId}`;

      const response = await this.axiosInstance.get(endpoint);

      return {
        success: true,
        data: response.data,
        message: "Product status retrieved successfully",
      };
    } catch (error) {
      this.logger.error(`Failed to get product status: ${error.message}`, {
        error,
        productId,
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
   * Get N11 categories from real API
   */
  async getCategories() {
    try {
      await this.initialize();

      this.logger.info("Fetching N11 categories from API", {
        endpoint: N11_API.ENDPOINTS.CATEGORIES,
        baseUrl: this.apiUrl,
      });

      const response = await this.axiosInstance.get(
        N11_API.ENDPOINTS.CATEGORIES
      );

      this.logger.info("Successfully fetched N11 categories", {
        categoriesCount: response.data?.length || 0,
        status: response.status,
      });

      // Transform the response based on official N11 API documentation
      // The API returns a hierarchical category tree
      const categories = response.data || [];

      // Flatten the category tree for easier use
      const flattenCategories = (cats, level = 0, parentId = null) => {
        let result = [];
        cats.forEach((category) => {
          result.push({
            categoryId: category.id,
            categoryName: category.name,
            parentCategoryId: parentId,
            level: level,
            hasChildren:
              category.subCategories && category.subCategories.length > 0,
            fullPath: category.name,
            isLeaf:
              !category.subCategories || category.subCategories.length === 0,
          });

          // Recursively add subcategories
          if (category.subCategories && category.subCategories.length > 0) {
            result = result.concat(
              flattenCategories(category.subCategories, level + 1, category.id)
            );
          }
        });
        return result;
      };

      return flattenCategories(categories);
    } catch (error) {
      this.logger.error("Failed to fetch N11 categories from API", {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        endpoint: N11_API.ENDPOINTS.CATEGORIES,
      });

      // Fallback: Return basic categories if API fails
      this.logger.warn("Falling back to basic N11 categories due to API error");
      return [
        {
          categoryId: 1000001,
          categoryName: "Elektronik",
          parentCategoryId: null,
          level: 0,
          hasChildren: true,
          fullPath: "Elektronik",
        },
        {
          categoryId: 1000002,
          categoryName: "Giyim",
          parentCategoryId: null,
          level: 0,
          hasChildren: true,
          fullPath: "Giyim",
        },
        {
          categoryId: 1000003,
          categoryName: "Ev & Bahçe",
          parentCategoryId: null,
          level: 0,
          hasChildren: true,
          fullPath: "Ev & Bahçe",
        },
      ];
    }
  }

  /**
   * Get category attributes for N11 from real API
   */
  async getCategoryAttributes(categoryId) {
    try {
      await this.initialize();

      if (!categoryId) {
        throw new Error("Category ID is required for fetching attributes");
      }

      const endpoint = N11_API.ENDPOINTS.CATEGORY_ATTRIBUTES.replace(
        "{categoryId}",
        categoryId
      );

      this.logger.info("Fetching N11 category attributes from API", {
        categoryId,
        endpoint,
        baseUrl: this.apiUrl,
      });

      const response = await this.axiosInstance.get(endpoint);

      this.logger.info("Successfully fetched N11 category attributes", {
        categoryId,
        attributesCount: response.data?.categoryAttributes?.length || 0,
        status: response.status,
      });

      // Transform the response based on official N11 API documentation format
      const categoryData = response.data || {};
      const attributes = categoryData.categoryAttributes || [];

      return attributes.map((attr) => ({
        attributeId: attr.attributeId,
        categoryId: attr.categoryId,
        attributeName: attr.attributeName,
        attributeType: "TEXT", // N11 doesn't specify type in response, defaulting to TEXT
        required: attr.isMandatory || false,
        isVariant: attr.isVariant || false,
        isSlicer: attr.isSlicer || false,
        isCustomValue: attr.isCustomValue || false,
        isN11Grouping: attr.isN11Grouping || false,
        attributeOrder: attr.attributeOrder || 0,
        values: (attr.attributeValues || []).map((val) => ({
          id: val.id,
          value: val.value,
        })),
        description: `${attr.attributeName} - ${
          attr.isMandatory ? "Zorunlu" : "Opsiyonel"
        }`,
      }));
    } catch (error) {
      this.logger.error("Failed to fetch N11 category attributes from API", {
        categoryId,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });

      // Fallback: Return basic attributes if API fails
      this.logger.warn(
        "Falling back to basic N11 category attributes due to API error",
        {
          categoryId,
        }
      );
      return [
        {
          attributeId: "color",
          attributeName: "Renk",
          attributeType: "TEXT",
          required: true,
          multipleChoice: false,
          values: [],
          description: "Ürün rengi",
        },
        {
          attributeId: "size",
          attributeName: "Beden",
          attributeType: "TEXT",
          required: false,
          multipleChoice: false,
          values: [],
          description: "Ürün bedeni",
        },
        {
          attributeId: "brand",
          attributeName: "Marka",
          attributeType: "TEXT",
          required: true,
          multipleChoice: false,
          values: [],
          description: "Ürün markası",
        },
      ];
    }
  }

  /**
   * Get N11-specific product fields
   */
  async getProductFields(categoryId = null) {
    const attributes = categoryId
      ? await this.getCategoryAttributes(categoryId)
      : [];

    return {
      platform: "n11",
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
        {
          name: "salePrice",
          label: "Sale Price",
          type: "number",
          required: true,
        },
      ],
      optionalFields: [
        { name: "productDescription", label: "Description", type: "textarea" },
      ],
      categoryAttributes: attributes,
    };
  }
}

module.exports = N11Service;
