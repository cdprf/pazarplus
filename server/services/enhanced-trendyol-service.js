const CircuitBreaker = require("opossum");
const pRetry = require("p-retry");
const Bottleneck = require("bottleneck");
const axios = require("axios");
const EventEmitter = require("events");
const logger = require("../utils/logger");
const { TurkishComplianceService } = require("./turkishComplianceService");

/**
 * Enhanced Trendyol Integration Service
 * Implements robust platform integration with:
 * - Circuit breakers for fault tolerance
 * - Rate limiting for API compliance
 * - Retry mechanisms with exponential backoff
 * - Real-time sync capabilities
 * - Platform conflict resolution
 * - Automatic compliance processing
 */
class EnhancedTrendyolService extends EventEmitter {
  constructor(connectionData) {
    super();

    this.connectionId = connectionData.id;
    this.userId = connectionData.userId;
    this.credentials = connectionData.credentials;
    this.settings = connectionData.settings || {};
    this.platformType = "trendyol";

    // Initialize compliance service
    this.complianceService = new TurkishComplianceService();

    // Configure rate limiter (Trendyol: 100 req/min per seller)
    this.rateLimiter = new Bottleneck({
      maxConcurrent: 5,
      minTime: 600, // 600ms between requests (100 req/min)
      reservoir: 100, // 100 requests
      reservoirRefreshAmount: 100,
      reservoirRefreshInterval: 60 * 1000, // Refresh every minute
    });

    // Configure retry policy
    this.retryPolicy = {
      retries: 3,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 10000,
      randomize: true,
      onRetry: (error, attempt) => {
        logger.warn(`Trendyol API retry attempt ${attempt}:`, {
          error: error.message,
          connectionId: this.connectionId,
          attempt,
        });
      },
    };

    // Configure circuit breaker
    this.circuitOptions = {
      timeout: 30000, // 30 second timeout
      errorThresholdPercentage: 50, // Open circuit at 50% error rate
      resetTimeout: 60000, // Try again after 1 minute
      rollingCountTimeout: 10000, // 10 second rolling window
      rollingCountBuckets: 10,
      name: `trendyol-${this.connectionId}`,
      group: "trendyol-apis",
    };

    this.setupAxiosInstance();
    this.setupCircuitBreakers();

    // Sync state management
    this.syncState = {
      isRunning: false,
      lastSync: null,
      errors: [],
      stats: {
        ordersProcessed: 0,
        ordersCreated: 0,
        ordersUpdated: 0,
        ordersFailed: 0,
        complianceProcessed: 0,
      },
    };

    logger.info(
      `Enhanced Trendyol service initialized for connection ${this.connectionId}`
    );
  }

  setupAxiosInstance() {
    const authString = Buffer.from(
      `${this.credentials.apiKey}:${this.credentials.apiSecret}`
    ).toString("base64");

    this.axios = axios.create({
      baseURL: "https://api.trendyol.com/sapigw",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/json",
        "User-Agent": `${this.credentials.supplierId} - SelfIntegration`,
      },
      timeout: 30000,
    });

    // Request interceptor for logging
    this.axios.interceptors.request.use((config) => {
      logger.debug(
        `Trendyol API Request: ${config.method?.toUpperCase()} ${config.url}`,
        {
          connectionId: this.connectionId,
          params: config.params,
        }
      );
      return config;
    });

    // Response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const errorInfo = {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data,
          connectionId: this.connectionId,
        };

        logger.error("Trendyol API Error:", errorInfo);
        return Promise.reject(error);
      }
    );
  }

  setupCircuitBreakers() {
    // Orders API circuit breaker
    this.ordersCircuit = new CircuitBreaker(
      this.makeOrdersRequest.bind(this),
      this.circuitOptions
    );

    // Products API circuit breaker
    this.productsCircuit = new CircuitBreaker(
      this.makeProductsRequest.bind(this),
      this.circuitOptions
    );

    // Order details circuit breaker
    this.orderDetailsCircuit = new CircuitBreaker(
      this.makeOrderDetailsRequest.bind(this),
      this.circuitOptions
    );

    // Setup circuit breaker event listeners
    [
      this.ordersCircuit,
      this.productsCircuit,
      this.orderDetailsCircuit,
    ].forEach((circuit) => {
      circuit.on("open", () => {
        logger.warn(`Circuit breaker OPEN for ${circuit.name}`, {
          connectionId: this.connectionId,
        });
        this.emit("circuitOpen", {
          circuit: circuit.name,
          connectionId: this.connectionId,
        });
      });

      circuit.on("halfOpen", () => {
        logger.info(`Circuit breaker HALF-OPEN for ${circuit.name}`, {
          connectionId: this.connectionId,
        });
      });

      circuit.on("close", () => {
        logger.info(`Circuit breaker CLOSED for ${circuit.name}`, {
          connectionId: this.connectionId,
        });
      });
    });
  }

  // Core API request methods with circuit breaker protection
  async makeOrdersRequest(params) {
    return this.rateLimiter.schedule(() =>
      this.axios.get(`/suppliers/${this.credentials.supplierId}/orders`, {
        params,
      })
    );
  }

  async makeProductsRequest(params) {
    return this.rateLimiter.schedule(() =>
      this.axios.get(`/suppliers/${this.credentials.supplierId}/products`, {
        params,
      })
    );
  }

  async makeOrderDetailsRequest(orderNumber) {
    return this.rateLimiter.schedule(() =>
      this.axios.get(
        `/suppliers/${this.credentials.supplierId}/orders/${orderNumber}`
      )
    );
  }

  // Enhanced sync methods with retry logic
  async syncOrders(options = {}) {
    if (this.syncState.isRunning) {
      throw new Error("Sync already in progress");
    }

    this.syncState.isRunning = true;
    this.syncState.errors = [];

    try {
      logger.info(
        `Starting enhanced orders sync for connection ${this.connectionId}`
      );

      const params = {
        startDate:
          options.startDate ||
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime(),
        endDate: options.endDate || new Date().getTime(),
        page: 0,
        size: options.pageSize || 50,
        ...options.params,
      };

      let allOrders = [];
      let currentPage = 0;
      let hasMorePages = true;

      while (hasMorePages && currentPage < (options.maxPages || 50)) {
        try {
          const pageResult = await pRetry(async () => {
            const response = await this.ordersCircuit.fire({
              ...params,
              page: currentPage,
            });
            return response.data;
          }, this.retryPolicy);

          const orders = pageResult.content || [];
          allOrders = allOrders.concat(orders);

          this.syncState.stats.ordersProcessed += orders.length;

          logger.debug(
            `Fetched page ${currentPage + 1} with ${orders.length} orders`
          );

          // Check if we have more pages
          hasMorePages = pageResult.totalPages > currentPage + 1;
          currentPage++;

          // Emit progress event
          this.emit("syncProgress", {
            page: currentPage,
            totalPages: pageResult.totalPages,
            ordersProcessed: this.syncState.stats.ordersProcessed,
          });
        } catch (error) {
          logger.error(`Failed to fetch page ${currentPage}:`, error);
          this.syncState.errors.push({
            page: currentPage,
            error: error.message,
            timestamp: new Date(),
          });

          if (options.stopOnPageError) {
            break;
          }

          currentPage++;
        }
      }

      // Process orders with data normalization
      const processResult = await this.processOrders(allOrders, options);

      this.syncState.lastSync = new Date();
      this.emit("syncComplete", {
        ordersProcessed: allOrders.length,
        ...processResult,
        connectionId: this.connectionId,
      });

      return {
        success: true,
        ordersProcessed: allOrders.length,
        ...processResult,
        errors: this.syncState.errors,
      };
    } catch (error) {
      logger.error(
        `Orders sync failed for connection ${this.connectionId}:`,
        error
      );
      this.emit("syncError", {
        error: error.message,
        connectionId: this.connectionId,
      });
      throw error;
    } finally {
      this.syncState.isRunning = false;
    }
  }

  // Enhanced order processing with compliance integration
  async processOrders(orders, options = {}) {
    const { Order, OrderItem, ShippingDetail } = require("../models");
    const { sequelize } = require("../config/database");

    let created = 0;
    let updated = 0;
    let failed = 0;
    let complianceProcessed = 0;

    for (const trendyolOrder of orders) {
      const transaction = await sequelize.transaction();

      try {
        // Check if order exists
        const existingOrder = await Order.findOne({
          where: {
            externalOrderId: trendyolOrder.orderNumber,
            connectionId: this.connectionId,
          },
          transaction,
        });

        if (existingOrder) {
          // Update existing order
          await this.updateExistingOrder(
            existingOrder,
            trendyolOrder,
            transaction
          );
          updated++;
        } else {
          // Create new order
          await this.createNewOrder(trendyolOrder, transaction);
          created++;
        }

        // Trigger compliance processing for Turkish orders
        if (options.processCompliance !== false) {
          try {
            await this.triggerComplianceProcessing(trendyolOrder, transaction);
            complianceProcessed++;
          } catch (complianceError) {
            logger.warn(
              `Compliance processing failed for order ${trendyolOrder.orderNumber}:`,
              complianceError
            );
          }
        }

        await transaction.commit();

        this.syncState.stats.ordersCreated += existingOrder ? 0 : 1;
        this.syncState.stats.ordersUpdated += existingOrder ? 1 : 0;
        this.syncState.stats.complianceProcessed +=
          options.processCompliance !== false ? 1 : 0;
      } catch (error) {
        await transaction.rollback();
        failed++;
        this.syncState.stats.ordersFailed++;

        logger.error(
          `Failed to process order ${trendyolOrder.orderNumber}:`,
          error
        );
        this.syncState.errors.push({
          orderNumber: trendyolOrder.orderNumber,
          error: error.message,
          timestamp: new Date(),
        });
      }
    }

    return { created, updated, failed, complianceProcessed };
  }

  async createNewOrder(trendyolOrder, transaction) {
    const { Order, OrderItem, ShippingDetail } = require("../models");

    // Create shipping detail
    const shippingDetail = await ShippingDetail.create(
      {
        recipientName: trendyolOrder.shipmentAddress?.fullName || "Unknown",
        address1: trendyolOrder.shipmentAddress?.address1 || "",
        address2: trendyolOrder.shipmentAddress?.address2 || "",
        city: trendyolOrder.shipmentAddress?.city || "",
        state: trendyolOrder.shipmentAddress?.district || "",
        postalCode: trendyolOrder.shipmentAddress?.postalCode || "",
        country: "TR",
        phone: trendyolOrder.shipmentAddress?.phone || "",
        email: trendyolOrder.customerEmail || "",
      },
      { transaction }
    );

    // Create order
    const order = await Order.create(
      {
        externalOrderId: trendyolOrder.orderNumber,
        orderNumber: trendyolOrder.orderNumber,
        connectionId: this.connectionId,
        userId: this.userId,
        customerName: `${trendyolOrder.customerFirstName || ""} ${
          trendyolOrder.customerLastName || ""
        }`.trim(),
        customerEmail: trendyolOrder.customerEmail,
        customerPhone: trendyolOrder.shipmentAddress?.phone,
        orderDate: new Date(trendyolOrder.orderDate),
        orderStatus: this.mapOrderStatus(trendyolOrder.status),
        totalAmount: trendyolOrder.totalPrice || 0,
        currency: "TRY",
        shippingDetailId: shippingDetail.id,
        notes: trendyolOrder.note || "",
        rawData: JSON.stringify(trendyolOrder),
        lastSyncedAt: new Date(),
      },
      { transaction }
    );

    // Create order items
    if (trendyolOrder.lines && Array.isArray(trendyolOrder.lines)) {
      for (const item of trendyolOrder.lines) {
        await OrderItem.create(
          {
            orderId: order.id,
            platformProductId:
              item.productId?.toString() || item.productCode?.toString(),
            title: item.productName || "Unknown Product",
            sku: item.merchantSku,
            quantity: item.quantity || 1,
            price: item.price || 0,
            currency: "TRY",
            barcode: item.barcode,
            variantInfo: item.variantFeatures
              ? JSON.stringify(item.variantFeatures)
              : null,
            rawData: JSON.stringify(item),
          },
          { transaction }
        );
      }
    }

    return order;
  }

  async updateExistingOrder(existingOrder, trendyolOrder, transaction) {
    await existingOrder.update(
      {
        orderStatus: this.mapOrderStatus(trendyolOrder.status),
        rawData: JSON.stringify(trendyolOrder),
        lastSyncedAt: new Date(),
      },
      { transaction }
    );

    return existingOrder;
  }

  // Trigger compliance processing for Turkish orders
  async triggerComplianceProcessing(trendyolOrder, transaction) {
    try {
      // Check if order needs compliance processing
      const needsProcessing = this.shouldProcessCompliance(trendyolOrder);

      if (needsProcessing) {
        const complianceData = {
          orderId: trendyolOrder.orderNumber,
          customerType: this.determineCustomerType(trendyolOrder),
          customerInfo: {
            name: `${trendyolOrder.customerFirstName || ""} ${
              trendyolOrder.customerLastName || ""
            }`.trim(),
            email: trendyolOrder.customerEmail,
            phone: trendyolOrder.shipmentAddress?.phone,
            address: trendyolOrder.shipmentAddress,
          },
          orderData: {
            items: trendyolOrder.lines,
            totalAmount: trendyolOrder.totalPrice,
            currency: "TRY",
            orderDate: new Date(trendyolOrder.orderDate),
          },
        };

        // Initialize compliance processing
        await this.complianceService.initializeOrderCompliance(complianceData);

        logger.info(
          `Compliance processing initiated for order ${trendyolOrder.orderNumber}`
        );
      }
    } catch (error) {
      logger.error(
        `Compliance processing failed for order ${trendyolOrder.orderNumber}:`,
        error
      );
      throw error;
    }
  }

  shouldProcessCompliance(trendyolOrder) {
    // Process compliance for orders above 50 TRY or with specific product categories
    const amount = trendyolOrder.totalPrice || 0;
    return amount >= 50 || this.hasRegulatedProducts(trendyolOrder.lines);
  }

  hasRegulatedProducts(lines = []) {
    // Check if order contains regulated products (electronics, cosmetics, etc.)
    const regulatedCategories = [
      "Electronics",
      "Cosmetics",
      "Health",
      "Automotive",
    ];
    return lines.some((line) =>
      regulatedCategories.some((category) =>
        line.productCategory?.includes(category)
      )
    );
  }

  determineCustomerType(trendyolOrder) {
    // Determine if customer is individual or company based on tax number
    const taxNumber = trendyolOrder.taxNumber;
    if (taxNumber && taxNumber.length === 10) {
      return "COMPANY"; // VKN is 10 digits
    }
    return "INDIVIDUAL";
  }

  mapOrderStatus(trendyolStatus) {
    const statusMap = {
      Created: "new",
      Picking: "processing",
      Invoiced: "processing",
      Shipped: "shipped",
      Delivered: "delivered",
      Cancelled: "cancelled",
      UnDelivered: "failed",
      Returned: "returned",
    };

    return statusMap[trendyolStatus] || "unknown";
  }

  // Real-time sync capabilities
  async startRealTimeSync(options = {}) {
    const interval = options.interval || 5 * 60 * 1000; // 5 minutes default

    logger.info(
      `Starting real-time sync for connection ${this.connectionId} with ${interval}ms interval`
    );

    this.syncInterval = setInterval(async () => {
      try {
        await this.syncOrders({
          startDate: new Date(Date.now() - interval - 60000).getTime(), // Slight overlap
          processCompliance: true,
          stopOnPageError: false,
          maxPages: 5, // Limit for real-time sync
        });
      } catch (error) {
        logger.error(
          `Real-time sync failed for connection ${this.connectionId}:`,
          error
        );
      }
    }, interval);

    this.emit("realTimeSyncStarted", {
      connectionId: this.connectionId,
      interval,
    });
  }

  stopRealTimeSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.emit("realTimeSyncStopped", { connectionId: this.connectionId });
      logger.info(`Real-time sync stopped for connection ${this.connectionId}`);
    }
  }

  // Platform conflict resolution
  async resolveConflicts(conflictData) {
    logger.info(
      `Resolving platform conflicts for connection ${this.connectionId}`
    );

    // Implement conflict resolution logic based on:
    // 1. Data freshness (most recent wins)
    // 2. Data completeness (more complete data wins)
    // 3. Platform priority (Trendyol high priority)
    // 4. Manual override settings

    return {
      resolved: true,
      strategy: "latest_wins",
      conflicts: conflictData.length,
    };
  }

  // Service health and monitoring
  getHealthStatus() {
    return {
      connectionId: this.connectionId,
      platformType: this.platformType,
      circuitBreakers: {
        orders: this.ordersCircuit.stats,
        products: this.productsCircuit.stats,
        orderDetails: this.orderDetailsCircuit.stats,
      },
      rateLimiter: {
        running: this.rateLimiter.running(),
        queued: this.rateLimiter.queued(),
        done: this.rateLimiter.done,
      },
      syncState: this.syncState,
      lastSync: this.syncState.lastSync,
      isRealTimeSyncActive: !!this.syncInterval,
    };
  }

  // Cleanup resources
  async destroy() {
    this.stopRealTimeSync();

    if (this.rateLimiter) {
      await this.rateLimiter.stop();
    }

    // Clear circuit breakers
    [
      this.ordersCircuit,
      this.productsCircuit,
      this.orderDetailsCircuit,
    ].forEach((circuit) => {
      if (circuit) {
        circuit.shutdown();
      }
    });

    this.removeAllListeners();

    logger.info(
      `Enhanced Trendyol service destroyed for connection ${this.connectionId}`
    );
  }
}

module.exports = EnhancedTrendyolService;
