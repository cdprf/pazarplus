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
      // Support both naming conventions: apiKey/apiSecret and appKey/appSecret
      const apiKey = credentials.apiKey || credentials.appKey;
      const apiSecret = credentials.apiSecret || credentials.appSecret;

      // Validate required credentials with a more descriptive error message
      if (!apiKey || !apiSecret) {
        this.logger.error("Missing N11 credentials", {
          hasApiKey: !!apiKey,
          hasApiSecret: !!apiSecret,
          connectionId: this.connectionId,
          credentialKeys: Object.keys(credentials),
        });
        throw new Error("Missing required N11 credentials: apiKey, apiSecret");
      }

      this.axiosInstance = axios.create({
        baseURL: N11_API.BASE_URL,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          appkey: apiKey,
          appsecret: apiSecret, // Required for most N11 API endpoints including product-query
          // Note: Both appkey and appsecret are required for most N11 API endpoints
          // Only /cdn/ endpoints might work with just appkey
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

      this.logger.info(
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
      let hasMorePages = true;
      let failedPages = 0;
      let successfulPages = 0;
      let totalPagesEstimate = 1;

      this.logger.info("Starting to fetch all products from N11...");

      while (hasMorePages) {
        const pageParams = {
          ...params,
          page: currentPage,
          size: 250, // Default page size
        };

        this.logger.info(`Fetching N11 products page ${currentPage + 1}...`);

        try {
          const result = await this.fetchSingleProductPage(pageParams);

          if (result.success && result.data) {
            successfulPages++;
            const products = Array.isArray(result.data)
              ? result.data
              : [result.data];
            allProducts.push(...products);

            // Update pagination info based on the response
            if (result.pagination) {
              totalPagesEstimate = result.pagination.totalPages;
              hasMorePages = currentPage < totalPagesEstimate - 1;
            } else {
              // If no pagination info, stop if we got fewer items than requested
              hasMorePages = products.length >= 250; // Use default page size
            }
          } else {
            failedPages++;
            this.logger.warn(
              `Failed to fetch page ${currentPage + 1}: ${result.message}`,
              {
                error: result.error,
                page: currentPage + 1,
              }
            );
          }
        } catch (pageError) {
          failedPages++;
          this.logger.warn(
            `Error fetching page ${currentPage + 1}: ${pageError.message}`,
            {
              error: pageError,
              page: currentPage + 1,
              connectionId: this.connectionId,
            }
          );
        }

        currentPage++;

        // Safety check - don't loop indefinitely if we can't determine total pages
        if (currentPage > 100) {
          this.logger.warn("Stopping product fetch after 100 pages for safety");
          hasMorePages = false;
        }
      }

      // Consider the overall operation successful if we got any products
      const hasAnySuccess = successfulPages > 0;
      const message = hasAnySuccess
        ? `Successfully fetched ${allProducts.length} products from N11. ${successfulPages} pages succeeded, ${failedPages} failed.`
        : `Failed to fetch any products from N11 after trying ${currentPage} pages.`;

      return {
        success: hasAnySuccess,
        message,
        data: allProducts,
        pagination: {
          totalPages: currentPage,
          totalProducts: allProducts.length,
          successfulPages,
          failedPages,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch all products from N11: ${error.message}`,
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
   * Fetch a single page of products from N11
   * @param {Object} params - Query parameters for product fetching
   * @returns {Promise<Object>} Products data for a single page
   */
  async fetchSingleProductPage(params = {}) {
    try {
      await this.initialize();

      const defaultParams = {
        page: 0,
        size: 250,
      };

      const queryParams = { ...defaultParams, ...params };

      this.logger.info(
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
            response.data?.errorMessage ||
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
      const defaultUserId =
        process.env.DEFAULT_USER_ID || "8bd737ab-8a3f-4f50-ab2c-d310d43e867a";

      // Fetch products from N11
      const result = await this.fetchProducts(params);

      // Even if we got a partial failure, proceed with any products we did get
      const products = result.data || [];
      const hadFetchErrors =
        !result.success || result.pagination?.failedPages > 0;

      // Statistics for reporting
      const stats = {
        total: products.length,
        new: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        fetchErrors: hadFetchErrors,
        fetchErrorDetails: result.success ? undefined : result.error,
      };

      if (products.length === 0) {
        return {
          success: false,
          message: `No products to sync: ${result.message}`,
          error: result.error,
          stats,
        };
      }

      // Process each product
      for (const n11Product of products) {
        try {
          // Check if product exists (by merchantSku or other unique identifier)
          const externalProductId =
            n11Product.n11ProductId?.toString() ||
            n11Product.productId ||
            n11Product.id?.toString();

          if (!externalProductId) {
            this.logger.warn("Skipping product with no ID", {
              product: n11Product,
            });
            stats.skipped++;
            continue;
          }

          // Find existing N11 product details
          const existingN11Product = await N11Product.findOne({
            where: { n11ProductId: externalProductId },
            include: [{ model: Product, as: "product" }],
          });

          if (existingN11Product) {
            // Update existing product
            await this.updateExistingProduct(existingN11Product, n11Product);
            stats.updated++;
          } else {
            // Create new product
            await this.createNewProduct(n11Product, defaultUserId);
            stats.new++;
          }
        } catch (productError) {
          stats.failed++;
          this.logger.error(
            `Failed to process product ${n11Product.productId || "unknown"}: ${
              productError.message
            }`,
            {
              error: productError,
              connectionId: this.connectionId,
              product: {
                productId: n11Product.productId,
                name: n11Product.productName || n11Product.title,
              },
            }
          );
        }
      }

      // Consider sync successful even with some failures, as long as we processed some products
      const hasAnySuccess = stats.new > 0 || stats.updated > 0;
      const totalProcessed = stats.new + stats.updated;

      return {
        success: hasAnySuccess,
        message:
          `Processed ${totalProcessed} out of ${stats.total} products. ` +
          `Created: ${stats.new}, Updated: ${stats.updated}, ` +
          `Failed: ${stats.failed}, Skipped: ${stats.skipped}` +
          (hadFetchErrors ? " (with some fetch errors)" : ""),
        stats,
      };
    } catch (error) {
      this.logger.error(`Product sync failed: ${error.message}`, {
        error,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Product sync failed: ${error.message}`,
        error: error.response?.data || error.message,
        stats: {
          total: 0,
          new: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
          syncError: error.message,
        },
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
        const productSku = n11ProductData.stockCode || n11ProductData.sku;

        // Check if a product with this SKU already exists for this user
        let mainProduct = await Product.findOne({
          where: {
            userId: userId,
            sku: productSku,
          },
          transaction: t,
        });

        if (mainProduct) {
          // Product already exists, update it with latest data
          await mainProduct.update(
            {
              name: n11ProductData.title || n11ProductData.name,
              description: n11ProductData.description || "",
              category:
                n11ProductData.categoryId?.toString() || "uncategorized",
              price: parseFloat(
                n11ProductData.salePrice ||
                  n11ProductData.displayPrice ||
                  n11ProductData.price ||
                  0
              ),
              stockQuantity: parseInt(
                n11ProductData.quantity || n11ProductData.stockQuantity || 0,
                10
              ),
              barcode: n11ProductData.barcode,
              sourcePlatform: "n11",
              attributes: n11ProductData.attributes,
              lastSyncedAt: new Date(),
            },
            { transaction: t }
          );
        } else {
          // Create main product record
          mainProduct = await Product.create(
            {
              userId: userId,
              name: n11ProductData.title || n11ProductData.name,
              description: n11ProductData.description || "",
              category:
                n11ProductData.categoryId?.toString() || "uncategorized",
              price: parseFloat(
                n11ProductData.salePrice ||
                  n11ProductData.displayPrice ||
                  n11ProductData.price ||
                  0
              ),
              sku: productSku,
              stockQuantity: parseInt(
                n11ProductData.quantity || n11ProductData.stockQuantity || 0,
                10
              ),
              barcode: n11ProductData.barcode,
              sourcePlatform: "n11",
              attributes: n11ProductData.attributes,
              hasVariants: false,
            },
            { transaction: t }
          );
        }
        // Create N11 product record
        await N11Product.create(
          {
            productId: mainProduct.id,
            n11ProductId: n11ProductData.n11ProductId,
            sellerId: n11ProductData.sellerId,
            sellerNickname: n11ProductData.sellerNickname,
            stockCode: n11ProductData.stockCode,
            title: n11ProductData.title,
            description: n11ProductData.description || "",
            categoryId: n11ProductData.categoryId,
            productMainId: n11ProductData.productMainId,
            status: n11ProductData.status === "Active" ? "active" : "inactive",
            saleStatus: n11ProductData.saleStatus || "Active",
            preparingDay: n11ProductData.preparingDay,
            shipmentTemplate: n11ProductData.shipmentTemplate,
            maxPurchaseQuantity: n11ProductData.maxPurchaseQuantity,
            catalogId: n11ProductData.catalogId,
            barcode: n11ProductData.barcode,
            groupId: n11ProductData.groupId,
            currencyType: n11ProductData.currencyType || "TL",
            salePrice: n11ProductData.salePrice,
            listPrice: n11ProductData.listPrice,
            quantity: n11ProductData.quantity,
            attributes: n11ProductData.attributes,
            imageUrls: n11ProductData.imageUrls,
            vatRate: n11ProductData.vatRate,
            commissionRate: n11ProductData.commissionRate,
            lastSyncedAt: new Date(),
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
    // Ensure service is initialized before making API calls
    await this.initialize();

    // Default parameters for N11 shipment packages API (based on investigation)
    const defaultParams = {
      page: params.page || 0,
      size: params.size || 100,
    };

    // Only include valid API parameters for the delivery endpoint
    // Based on investigation, startDate/endDate are not supported
    const validApiParams = ["page", "size"];
    const filteredParams = {};

    validApiParams.forEach((key) => {
      if (params[key] !== undefined) {
        filteredParams[key] = params[key];
      }
    });

    const queryParams = { ...defaultParams, ...filteredParams };

    this.logger.info(
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
    const allStats = {
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

      this.logger.info(`Fetching N11 orders page ${currentPage + 1}...`);

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

      this.logger.info(
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
                trackingNumber: order.cargoTrackingNumber || null,
                trackingUrl: order.cargoTrackingLink || null,
                cargoCompany: order.cargoProviderName || null,
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
                customerInfo: {
                  fullName:
                    order.customerfullName ||
                    shippingAddress.fullName ||
                    billingAddress.fullName ||
                    "",
                  email: order.customerEmail || "",
                  phone:
                    phoneNumber ||
                    shippingAddress.gsm ||
                    billingAddress.gsm ||
                    "",
                  customerId: order.customerId?.toString() || "",
                  identityNumber:
                    order.tcIdentityNumber ||
                    shippingAddress.tcId ||
                    billingAddress.tcId ||
                    "",
                  taxId: order.taxId || billingAddress.taxId || null,
                  taxOffice: order.taxOffice || billingAddress.taxHouse || null,
                },
                orderDate: new Date(
                  order.packageHistories?.[0]?.createdDate ||
                    order.lastModifiedDate ||
                    Date.now()
                ),
                orderStatus: this.mapOrderStatus(order.shipmentPackageStatus),
                totalAmount: parseFloat(order.totalAmount || 0),
                currency: "TRY",
                shippingAddress: {
                  fullName: shippingAddress.fullName || "",
                  address: shippingAddress.address || "",
                  city: shippingAddress.city || "",
                  district: shippingAddress.district || "",
                  neighborhood: shippingAddress.neighborhood || "",
                  postalCode: shippingAddress.postalCode || "",
                  phone: shippingAddress.gsm || "",
                  tcId: shippingAddress.tcId || "",
                },
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
                // Note: totalDiscountAmount and agreedDeliveryDate are N11-specific fields
                // and should be stored in the N11Order model, not the unified Order model
                // Standard fields
                notes: order.note || "",
                invoiceStatus: "pending",
                rawData: JSON.stringify(order),
                lastSyncedAt: new Date(),
              },
              transaction: t,
            });

            if (created) {
              this.logger.info(`Created new order for ${order.id}`);
            } else {
              this.logger.info(
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
                const dueAmount = parseFloat(item.dueAmount || 0);
                const totalPrice = dueAmount || unitPrice * quantity;

                // Calculate total discount from multiple discount sources
                const sellerDiscount = parseFloat(item.sellerDiscount || 0);
                const mallDiscount = parseFloat(
                  item.totalMallDiscountPrice || 0
                );
                const sellerCouponDiscount = parseFloat(
                  item.sellerCouponDiscount || 0
                );
                const totalDiscount =
                  sellerDiscount + mallDiscount + sellerCouponDiscount;

                return {
                  orderId: normalizedOrder.id,
                  productId: null, // Will be set by linking service
                  platformProductId: item.productId?.toString(),
                  barcode: item.barcode || null,
                  title: item.productName || item.title || "",
                  sku: item.stockCode || "",
                  quantity: quantity,
                  price: unitPrice,
                  totalPrice: totalPrice,

                  // Enhanced discount information
                  discount: totalDiscount,
                  platformDiscount: mallDiscount,
                  merchantDiscount: sellerDiscount + sellerCouponDiscount,

                  // N11-specific pricing fields
                  invoiceTotal: parseFloat(
                    item.sellerInvoiceAmount || dueAmount || totalPrice
                  ),
                  currency: "TRY",

                  // Tax and commission information
                  vatRate: parseFloat(item.vatRate || 20),
                  commissionRate: parseFloat(item.commissionRate || 0),
                  taxDeductionRate: parseFloat(item.taxDeductionRate || 0),

                  // Labor and fees
                  laborCost: parseFloat(item.totalLaborCostExcludingVAT || 0),
                  netMarketingFeeRate: parseFloat(
                    item.netMarketingFeeRate || 0
                  ),
                  netMarketplaceFeeRate: parseFloat(
                    item.netMarketplaceFeeRate || 0
                  ),

                  // Installment charges
                  installmentChargeWithVAT: parseFloat(
                    item.installmentChargeWithVAT || 0
                  ),

                  // Individual discount components
                  sellerCouponDiscount: sellerCouponDiscount,

                  // Status information
                  lineItemStatus: item.orderItemLineItemStatusName || "Created",
                  orderLineId: item.orderLineId?.toString() || null,

                  // Variant information
                  variantInfo:
                    item.variantAttributes && item.variantAttributes.length > 0
                      ? JSON.stringify(item.variantAttributes)
                      : null,

                  // Custom text options if any
                  customTextOptions:
                    item.customTextOptionValues &&
                    item.customTextOptionValues.length > 0
                      ? JSON.stringify(item.customTextOptionValues)
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
          customerId: n11OrderData.customerId,
          customerEmail: n11OrderData.customerEmail,
          customerFullName:
            n11OrderData.customerfullName || n11OrderData.customerName,
          tcIdentityNumber:
            n11OrderData.tcIdentityNumber ||
            n11OrderData.billingAddress?.tcId ||
            n11OrderData.shippingAddress?.tcId,
          taxId: n11OrderData.taxId,
          taxOffice: n11OrderData.taxOffice,
          orderStatus: this.mapOrderStatus(n11OrderData.shipmentPackageStatus),
          cargoSenderNumber: n11OrderData.cargoSenderNumber,
          cargoTrackingNumber: n11OrderData.cargoTrackingNumber,
          cargoTrackingLink: n11OrderData.cargoTrackingLink,
          shipmentCompanyId: n11OrderData.shipmentCompanyId,
          cargoProviderName: n11OrderData.cargoProviderName,
          shipmentMethod: n11OrderData.shipmentMethod,
          installmentChargeWithVATprice:
            n11OrderData.installmentChargeWithVATprice || 0,
          cancellationReason: n11OrderData.cancellationReason || null,
          returnReason: n11OrderData.returnReason || null,
          lastModifiedDate: n11OrderData.lastModifiedDate,
          agreedDeliveryDate: n11OrderData.agreedDeliveryDate,
          totalAmount: n11OrderData.totalAmount,
          totalDiscountAmount: n11OrderData.totalDiscountAmount,
          packageHistories: n11OrderData.packageHistories,
          shipmentPackageStatus: n11OrderData.shipmentPackageStatus,
          lines: n11OrderData.lines,
          shippingAddress: n11OrderData.shippingAddress,
          billingAddress: n11OrderData.billingAddress,
          n11OrderDate: n11OrderData.lastModifiedDate
            ? new Date(n11OrderData.lastModifiedDate)
            : new Date(),
          lastSyncAt: new Date(),
          platformFees: this.calculatePlatformFees(n11OrderData),
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
   * Calculate platform fees from N11 order data
   * @param {Object} n11OrderData - Raw order data from N11 API
   * @returns {number} Total platform fees
   */
  calculatePlatformFees(n11OrderData) {
    // Check for explicit platform fees first
    if (n11OrderData.platformFees) {
      return parseFloat(n11OrderData.platformFees);
    }

    // Check for top-level commission
    if (n11OrderData.commission) {
      return parseFloat(n11OrderData.commission);
    }

    // Calculate from line items if available
    if (n11OrderData.lines && Array.isArray(n11OrderData.lines)) {
      const totalCommission = n11OrderData.lines.reduce((total, line) => {
        const lineTotal = parseFloat(line.dueAmount || line.price || 0);
        const commissionRate = parseFloat(line.commissionRate || 0) / 100; // Convert percentage to decimal
        const lineCommission = lineTotal * commissionRate;
        return total + lineCommission;
      }, 0);

      if (totalCommission > 0) {
        return totalCommission;
      }
    }

    // Check for installment charges as fallback
    if (
      n11OrderData.installmentChargeWithVATprice &&
      n11OrderData.installmentChargeWithVATprice > 0
    ) {
      return parseFloat(n11OrderData.installmentChargeWithVATprice);
    }

    return 0;
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
   * Map N11 API status to standard order status enum
   * @param {string} apiStatus - Status from N11 API
   * @returns {string} Standard order status compatible with n11_orders table enum
   */
  mapOrderStatus(apiStatus) {
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

      this.logger.info(`N11 order acceptance request data`, {
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

      this.logger.info(`Fetching N11 order details`, {
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

      this.logger.info(
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

      this.logger.info(
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

      this.logger.info(
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
      if (retries === 0) {
        throw error;
      }

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

    if (!phone) {
      return null;
    }

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
    if (!cargoTrackingNumber) {
      return null;
    }

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
   * Update product information on N11 using official API structure
   * @param {Object|Array} productData - Product data or array of products to update
   * @returns {Promise<Object>} - Update result
   */
  async updateProduct(productData) {
    try {
      await this.initialize();

      // Handle both single product and array of products
      const products = Array.isArray(productData) ? productData : [productData];

      if (products.length === 0) {
        throw new Error("At least one product is required for update");
      }

      // N11 has separate endpoints for price/stock vs product info updates
      // Group updates by type to optimize API calls
      const priceStockUpdates = [];
      const productInfoUpdates = [];

      for (const product of products) {
        const stockCode =
          product.stockCode || product.productId || product.id || product.sku;

        if (!stockCode) {
          throw new Error("Stock code is required for N11 product update");
        }

        // Check if this is a price/stock update
        const hasPriceUpdate =
          product.price !== undefined ||
          product.salePrice !== undefined ||
          product.listPrice !== undefined ||
          product.basePrice !== undefined;
        const hasStockUpdate =
          product.quantity !== undefined ||
          product.stock !== undefined ||
          product.stockQuantity !== undefined;

        if (hasPriceUpdate || hasStockUpdate) {
          const priceStockData = {
            stockCode: stockCode.toString(),
          };

          // Price fields - N11 requires both listPrice and salePrice together
          if (hasPriceUpdate) {
            const salePrice = parseFloat(
              product.price || product.salePrice || product.basePrice || 0
            );
            const listPrice = parseFloat(
              product.listPrice || product.basePrice || salePrice
            );

            // Ensure listPrice >= salePrice (N11 requirement)
            priceStockData.salePrice = parseFloat(salePrice.toFixed(2));
            priceStockData.listPrice = parseFloat(
              Math.max(listPrice, salePrice).toFixed(2)
            );
            priceStockData.currencyType = product.currencyType || "TL";
          }

          // Stock quantity
          if (hasStockUpdate) {
            priceStockData.quantity = parseInt(
              product.quantity || product.stock || product.stockQuantity || 0,
              10
            );
          }

          priceStockUpdates.push(priceStockData);
        }

        // Check if this is a product info update
        const hasProductInfoUpdate =
          product.status !== undefined ||
          product.preparingDay !== undefined ||
          product.description !== undefined ||
          product.productMainId !== undefined ||
          product.maxPurchaseQuantity !== undefined ||
          product.vatRate !== undefined ||
          product.shipmentTemplate !== undefined;

        if (hasProductInfoUpdate) {
          const productInfoData = {
            stockCode: stockCode.toString(),
          };

          // Product status
          if (product.status !== undefined) {
            productInfoData.status =
              product.status === "active" || product.status === "Active"
                ? "Active"
                : "Suspended";
          }

          // Preparing day (shipping preparation time)
          if (product.preparingDay !== undefined) {
            productInfoData.preparingDay = parseInt(product.preparingDay, 10);
          }

          // Shipment template
          if (product.shipmentTemplate !== undefined) {
            productInfoData.shipmentTemplate = product.shipmentTemplate;
          }

          // Product main ID
          if (product.productMainId !== undefined) {
            productInfoData.productMainId = product.productMainId.toString();
            productInfoData.deleteProductMainId = false;
          }

          // Max purchase quantity
          if (product.maxPurchaseQuantity !== undefined) {
            productInfoData.maxPurchaseQuantity = parseInt(
              product.maxPurchaseQuantity,
              10
            );
            productInfoData.deleteMaxPurchaseQuantity = false;
          }

          // Description
          if (product.description !== undefined) {
            productInfoData.description = product.description;
          }

          // VAT rate
          if (product.vatRate !== undefined) {
            productInfoData.vatRate = parseInt(product.vatRate, 10);
          }

          productInfoUpdates.push(productInfoData);
        }
      }

      const results = [];

      // Process price/stock updates if any
      if (priceStockUpdates.length > 0) {
        this.logger.info(
          `Processing ${priceStockUpdates.length} price/stock updates on N11`,
          {
            updateCount: priceStockUpdates.length,
            connectionId: this.connectionId,
          }
        );

        try {
          const priceStockRequestBody = {
            payload: {
              integrator: "Pazar-Plus-Integration",
              skus: priceStockUpdates,
            },
          };

          this.logger.info("N11 price/stock update request", {
            endpoint: "/ms/product/tasks/price-stock-update",
            requestBody: priceStockRequestBody,
          });

          const priceStockResponse = await this.axiosInstance.post(
            "/ms/product/tasks/price-stock-update",
            priceStockRequestBody,
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          this.logger.info("N11 price/stock update response", {
            taskId: priceStockResponse.data?.id,
            status: priceStockResponse.data?.status,
            type: priceStockResponse.data?.type,
            reasons: priceStockResponse.data?.reasons,
          });

          results.push({
            type: "PRICE_STOCK_UPDATE",
            success: true,
            taskId: priceStockResponse.data?.id,
            status: priceStockResponse.data?.status,
            itemCount: priceStockUpdates.length,
            apiResponse: priceStockResponse.data,
          });
        } catch (priceStockError) {
          this.logger.error("N11 price/stock update failed", {
            error: priceStockError.message,
            status: priceStockError.response?.status,
            apiError: priceStockError.response?.data,
            connectionId: this.connectionId,
          });

          results.push({
            type: "PRICE_STOCK_UPDATE",
            success: false,
            error: priceStockError.response?.data || priceStockError.message,
            itemCount: priceStockUpdates.length,
          });
        }
      }

      // Process product info updates if any
      if (productInfoUpdates.length > 0) {
        this.logger.info(
          `Processing ${productInfoUpdates.length} product info updates on N11`,
          {
            updateCount: productInfoUpdates.length,
            connectionId: this.connectionId,
          }
        );

        try {
          const productInfoRequestBody = {
            payload: {
              integrator: "Pazar-Plus-Integration",
              skus: productInfoUpdates,
            },
          };

          this.logger.info("N11 product info update request", {
            endpoint: "/ms/product/tasks/product-update",
            requestBody: productInfoRequestBody,
          });

          const productInfoResponse = await this.axiosInstance.post(
            "/ms/product/tasks/product-update",
            productInfoRequestBody,
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          this.logger.info("N11 product info update response", {
            taskId: productInfoResponse.data?.id,
            status: productInfoResponse.data?.status,
            type: productInfoResponse.data?.type,
            reasons: productInfoResponse.data?.reasons,
          });

          results.push({
            type: "PRODUCT_INFO_UPDATE",
            success: true,
            taskId: productInfoResponse.data?.id,
            status: productInfoResponse.data?.status,
            itemCount: productInfoUpdates.length,
            apiResponse: productInfoResponse.data,
          });
        } catch (productInfoError) {
          this.logger.error("N11 product info update failed", {
            error: productInfoError.message,
            status: productInfoError.response?.status,
            apiError: productInfoError.response?.data,
            connectionId: this.connectionId,
          });

          results.push({
            type: "PRODUCT_INFO_UPDATE",
            success: false,
            error: productInfoError.response?.data || productInfoError.message,
            itemCount: productInfoUpdates.length,
          });
        }
      }

      if (results.length === 0) {
        throw new Error(
          "No valid update fields provided for N11 product update"
        );
      }

      // Summarize results
      const successCount = results.filter((r) => r.success).length;
      const totalItems = results.reduce((sum, r) => sum + r.itemCount, 0);

      return {
        success: successCount > 0,
        message: `N11 product update completed: ${successCount}/${results.length} operations successful`,
        totalItems,
        operationsCount: results.length,
        successfulOperations: successCount,
        results,
        // Include task IDs for status tracking
        taskIds: results
          .filter((r) => r.success && r.taskId)
          .map((r) => ({
            type: r.type,
            taskId: r.taskId,
            status: r.status,
          })),
      };
    } catch (error) {
      this.logger.error(`Failed to update product on N11: ${error.message}`, {
        error: error.message,
        status: error.response?.status,
        apiError: error.response?.data,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Failed to update product on N11: ${error.message}`,
        error: error.response?.data || error.message,
        statusCode: error.response?.status,
      };
    }
  }

  /**
   * Check N11 task status using official task detail API
   * @param {number} taskId - Task ID returned from update operations
   * @returns {Promise<Object>} - Task status and details
   */
  async checkTaskStatus(taskId) {
    try {
      await this.initialize();

      if (!taskId) {
        throw new Error("Task ID is required to check status");
      }

      const requestBody = {
        taskId: parseInt(taskId, 10),
        pageable: {
          page: 0,
          size: 1000,
        },
      };

      this.logger.info("Checking N11 task status", {
        taskId,
        endpoint: "/ms/product/task-details/page-query",
      });

      const response = await this.axiosInstance.post(
        "/ms/product/task-details/page-query",
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const taskData = response.data;
      const skuResults = taskData?.skus?.content || [];

      this.logger.info("N11 task status retrieved", {
        taskId,
        status: taskData?.status,
        totalElements: taskData?.skus?.totalElements,
        processedItems: skuResults.length,
      });

      return {
        success: true,
        taskId,
        status: taskData?.status, // PROCESSED, IN_QUEUE, REJECT
        createdDate: taskData?.createdDate,
        modifiedDate: taskData?.modifiedDate,
        totalElements: taskData?.skus?.totalElements || 0,
        processedItems: skuResults.length,
        results: skuResults.map((sku) => ({
          id: sku.id,
          itemCode: sku.itemCode, // stock code
          status: sku.status, // SUCCESS, FAIL
          reasons: sku.reasons || [],
          sku: sku.sku || {},
        })),
        isCompleted: taskData?.status === "PROCESSED",
        isInProgress: taskData?.status === "IN_QUEUE",
        isRejected: taskData?.status === "REJECT",
      };
    } catch (error) {
      this.logger.error(`Failed to check N11 task status: ${error.message}`, {
        error: error.message,
        taskId,
        status: error.response?.status,
        apiError: error.response?.data,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Failed to check task status: ${error.message}`,
        error: error.response?.data || error.message,
        taskId,
      };
    }
  }

  /**
   * Legacy method for backwards compatibility - now uses official API structure
   * @param {Object} product - Product data (deprecated, use updateProduct instead)
   * @returns {Promise<Object>} - Update result
   * @deprecated Use updateProduct method instead
   */
  async updateExistingProductLegacy(product) {
    this.logger.warn(
      "Using deprecated updateExistingProductLegacy method, consider using updateProduct instead"
    );
    return this.updateProduct(product);
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
        categoriesCount: response.data?.categories?.length || 0,
        status: response.status,
      });

      // Transform the response based on official N11 API documentation
      // The API returns { categories: [...] } structure
      const categories = response.data?.categories || [];

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
   * Poll N11 task status by task ID
   * @param {number} taskId - The task ID returned by N11 API
   * @param {number} maxAttempts - Maximum polling attempts (default: 30)
   * @param {number} intervalMs - Polling interval in milliseconds (default: 5000)
   * @returns {Promise<Object>} - Task details and results
   */
  async pollTaskStatus(taskId, maxAttempts = 30, intervalMs = 5000) {
    try {
      await this.initialize();

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        this.logger.info(
          `Polling N11 task status (attempt ${attempt}/${maxAttempts})`,
          {
            taskId,
            connectionId: this.connectionId,
          }
        );

        try {
          const response = await this.axiosInstance.post(
            "/ms/product/task-details/page-query",
            {
              taskId: taskId,
              pageable: {
                page: 0,
                size: 1000,
              },
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          const taskData = response.data;

          this.logger.info("N11 task status response", {
            taskId,
            status: taskData.status,
            totalElements: taskData.totalElements,
            hasContent: !!taskData.content,
          });

          // Check if task is completed
          if (taskData.status === "PROCESSED") {
            this.logger.info("N11 task completed successfully", {
              taskId,
              totalElements: taskData.totalElements,
              results: taskData.content?.length || 0,
            });

            return {
              success: true,
              status: "PROCESSED",
              taskId,
              results: taskData.content || [],
              totalElements: taskData.totalElements || 0,
              completedAt: new Date().toISOString(),
              attempts: attempt,
            };
          } else if (taskData.status === "REJECT") {
            this.logger.warn("N11 task was rejected", {
              taskId,
              status: taskData.status,
              reason: taskData.reason || "Unknown reason",
            });

            return {
              success: false,
              status: "REJECT",
              taskId,
              error: taskData.reason || "Task was rejected by N11",
              completedAt: new Date().toISOString(),
              attempts: attempt,
            };
          } else if (taskData.status === "IN_QUEUE") {
            // Task is still processing, continue polling
            this.logger.debug("N11 task still in queue, continuing to poll", {
              taskId,
              attempt,
              nextAttemptIn: intervalMs / 1000 + " seconds",
            });

            if (attempt < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, intervalMs));
              continue;
            }
          }
        } catch (pollError) {
          this.logger.error("Error polling N11 task status", {
            taskId,
            attempt,
            error: pollError.message,
            status: pollError.response?.status,
            apiError: pollError.response?.data,
          });

          if (attempt === maxAttempts) {
            return {
              success: false,
              status: "POLL_ERROR",
              taskId,
              error: `Failed to poll task status after ${maxAttempts} attempts: ${pollError.message}`,
              attempts: attempt,
            };
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
      }

      // Max attempts reached without completion
      this.logger.warn("N11 task polling timeout", {
        taskId,
        maxAttempts,
        timeoutMinutes: (maxAttempts * intervalMs) / 60000,
      });

      return {
        success: false,
        status: "TIMEOUT",
        taskId,
        error: `Task polling timeout after ${maxAttempts} attempts (${
          (maxAttempts * intervalMs) / 60000
        } minutes)`,
        attempts: maxAttempts,
      };
    } catch (error) {
      this.logger.error("N11 task polling failed", {
        taskId,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        status: "ERROR",
        taskId,
        error: error.message,
        attempts: 0,
      };
    }
  }

  /**
   * Update product with enhanced feedback - returns task ID for polling
   * @param {Object} productData - Product data to update
   * @param {boolean} waitForCompletion - Whether to wait for task completion (default: false)
   * @returns {Promise<Object>} - Update result with task information
   */
  async updateProductWithTracking(productData, waitForCompletion = false) {
    try {
      // Use the existing updateProduct method to get task ID
      const updateResult = await this.updateProduct(productData);

      if (!updateResult || updateResult.length === 0) {
        return {
          success: false,
          error: "No update results returned",
          status: "ERROR",
        };
      }

      // Extract task IDs from results
      const taskIds = updateResult
        .filter((result) => result.success && result.taskId)
        .map((result) => result.taskId);

      if (taskIds.length === 0) {
        return {
          success: false,
          error: "No task IDs returned from update",
          status: "ERROR",
          updateResults: updateResult,
        };
      }

      const response = {
        success: true,
        status: "IN_QUEUE",
        taskIds: taskIds,
        updateResults: updateResult,
        message: `${taskIds.length} update task(s) queued successfully`,
      };

      // If waiting for completion, poll all tasks
      if (waitForCompletion) {
        const pollResults = [];

        for (const taskId of taskIds) {
          const pollResult = await this.pollTaskStatus(taskId);
          pollResults.push(pollResult);
        }

        response.status = pollResults.every((r) => r.success)
          ? "COMPLETED"
          : "PARTIAL_SUCCESS";
        response.pollResults = pollResults;
        response.completedTasks = pollResults.filter((r) => r.success).length;
        response.failedTasks = pollResults.filter((r) => !r.success).length;
      }

      return response;
    } catch (error) {
      this.logger.error("N11 product update with tracking failed", {
        error: error.message,
        productData: productData
          ? JSON.stringify(productData).substring(0, 200)
          : "null",
      });

      return {
        success: false,
        status: "ERROR",
        error: error.message,
      };
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

  /**
   * Publishes a list of products to N11.
   * This is a simulation and does not make real API calls.
   * @param {Array<Object>} products - An array of products to be published.
   * @returns {Promise<Object>} A summary of the publishing operation.
   */
  async publishProducts(products) {
    await this.initialize();
    const credentials = this.decryptCredentials(this.connection.credentials);
    const { appKey } = credentials;

    this.logger.info(`Simulating product publishing to N11 with appKey: ${appKey}.`);
    this.logger.info(`Received ${products.length} products to publish.`);

    let createdCount = 0;
    let updatedCount = 0;
    const failedProducts = [];

    for (const product of products) {
      // Simulate checking if the product exists on N11
      const productExists = Math.random() > 0.5;

      if (productExists) {
        this.logger.info(`Simulating update for product SKU: ${product.sku} on N11.`);
        updatedCount++;
      } else {
        this.logger.info(`Simulating creation for product SKU: ${product.sku} on N11.`);
        createdCount++;
      }
    }

    return {
      success: true,
      message: `Successfully simulated publishing for ${products.length} products to N11.`,
      data: {
        total: products.length,
        created: createdCount,
        updated: updatedCount,
        failed: failedProducts.length,
        failedProducts: failedProducts,
      },
    };
  }
}

module.exports = N11Service;
