const EventEmitter = require("events");
const logger = require("../utils/logger");
const cacheService = require("./cache-service");
const {
  Order,
  OrderItem,
  PlatformConnection,
  Product,
  ShippingDetail,
} = require("../models");
const { Op } = require("sequelize");

/**
 * Enhanced Platform Integration Service
 * Provides advanced order synchronization, conflict resolution, and real-time notifications
 */
class EnhancedPlatformService extends EventEmitter {
  constructor() {
    super();
    this.syncQueue = [];
    this.isProcessing = false;
    this.conflictResolutionStrategies = new Map();
    this.inventoryCache = new Map();
    this.lastSyncTimes = new Map();

    // Initialize conflict resolution strategies
    this.initializeConflictResolution();

    // Start periodic sync scheduler
    this.startSyncScheduler();
  }

  /**
   * Initialize conflict resolution strategies
   */
  initializeConflictResolution() {
    // Platform priority order for conflict resolution
    this.platformPriority = {
      trendyol: 1,
      hepsiburada: 2,
      n11: 3,
    };

    // Conflict resolution strategies
    this.conflictResolutionStrategies.set("ORDER_STATUS_CONFLICT", {
      strategy: "PLATFORM_PRIORITY",
      fallback: "LATEST_TIMESTAMP",
    });

    this.conflictResolutionStrategies.set("PRICE_CONFLICT", {
      strategy: "MANUAL_REVIEW",
      fallback: "PLATFORM_PRIORITY",
    });

    this.conflictResolutionStrategies.set("INVENTORY_CONFLICT", {
      strategy: "CONSERVATIVE_MINIMUM",
      fallback: "REAL_TIME_SYNC",
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
        totalProcessed: 0,
      };

      // If no specific connections provided, get all active connections
      if (platformConnections.length === 0) {
        platformConnections = await PlatformConnection.findAll({
          where: { isActive: true },
        });
      }

      // If no active connections, return early
      if (platformConnections.length === 0) {
        logger.debug("No active platform connections found for sync");
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
              conflicts: 0, // Simplified for now
            });

            // Update last sync time
            this.updateLastSyncTime(connection.id);
          } else {
            results.failed.push({
              platform: connection.platformType,
              connectionId: connection.id,
              error: orderResult?.message || "Unknown sync error",
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
            error: error.message,
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
            conflicts: r.conflicts,
          })),
          failed: results.failed.map((f) => ({
            platform: f.platform,
            connectionId: f.connectionId,
            error: f.error,
          })),
          totalProcessed: results.totalProcessed,
          syncDuration: results.syncDuration,
        };

        this.emit("syncCompleted", {
          timestamp: new Date(),
          results: safeResults,
          performance: {
            duration: syncDuration,
            ordersPerSecond:
              results.totalProcessed > 0
                ? results.totalProcessed / (syncDuration / 1000)
                : 0,
          },
        });

        logger.info("Enhanced platform sync completed", {
          totalProcessed: results.totalProcessed,
          successful: results.successful.length,
          failed: results.failed.length,
          duration: syncDuration,
        });
      }

      return results;
    } catch (error) {
      logger.error("Enhanced platform sync failed:", error);
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
              { orderNumber: orderData.orderNumber },
            ],
          },
          include: [
            { model: PlatformConnection, as: "platformConnection" }, // Fixed: use correct alias
            { model: OrderItem, as: "items" },
          ],
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
            processed: conflict.resolved,
          });

          // Emit conflict event for real-time notifications
          this.emit("orderConflict", {
            orderNumber: orderData.orderNumber,
            platforms: existingOrders.map(
              (o) => o.platformConnection.platformType
            ),
            conflictType: conflict.type,
            resolution: conflict.resolution,
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
            orderId: processedOrder?.id || null,
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
          error: error.message,
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
          type: "ORDER_STATUS_CONFLICT",
          newValue: this.mapOrderStatus(newOrderData.status),
          existingValue: existingOrder.orderStatus,
          platform: connection.platformType,
          existingPlatform: existingOrder.platformConnection.platformType,
        });
      }

      // Price conflict
      if (
        Math.abs(newOrderData.totalPrice - existingOrder.totalAmount) > 0.01
      ) {
        conflicts.push({
          type: "PRICE_CONFLICT",
          newValue: newOrderData.totalPrice,
          existingValue: existingOrder.totalAmount,
          platform: connection.platformType,
          existingPlatform: existingOrder.platformConnection.platformType,
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
              type: "INVENTORY_CONFLICT",
              newValue: newItem.quantity,
              existingValue: existingItem.quantity,
              sku: newItem.merchantSku,
              platform: connection.platformType,
              existingPlatform: existingOrder.platformConnection.platformType,
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
      resolved: resolutions.every((r) => r.status === "resolved"),
      type: conflicts.map((c) => c.type).join(", "),
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
        case "PLATFORM_PRIORITY":
          resolution = await this.resolvByPlatformPriority(
            conflict,
            newOrderData,
            existingOrders,
            connection
          );
          break;

        case "LATEST_TIMESTAMP":
          resolution = await this.resolveByLatestTimestamp(
            conflict,
            newOrderData,
            existingOrders
          );
          break;

        case "CONSERVATIVE_MINIMUM":
          resolution = await this.resolveByConservativeMinimum(
            conflict,
            newOrderData,
            existingOrders
          );
          break;

        case "MANUAL_REVIEW":
          resolution = await this.flagForManualReview(
            conflict,
            newOrderData,
            existingOrders
          );
          break;

        default:
          resolution = {
            status: "unresolved",
            reason: "No strategy configured",
          };
      }

      resolutions.push({
        conflict,
        resolution,
        strategy: strategy.strategy,
        timestamp: new Date(),
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
        status: "resolved",
        action: "updated_existing",
        reason: `${connection.platformType} has higher priority than ${conflict.existingPlatform}`,
        updatedOrderId: targetOrder.id,
      };
    } else {
      // Existing platform has higher priority, ignore new data
      return {
        status: "resolved",
        action: "ignored_new",
        reason: `${conflict.existingPlatform} has higher priority than ${connection.platformType}`,
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
        status: "resolved",
        action: "updated_with_latest",
        reason: "New data has more recent timestamp",
      };
    } else {
      return {
        status: "resolved",
        action: "kept_existing",
        reason: "Existing data has more recent timestamp",
      };
    }
  }

  /**
   * Resolve inventory conflict by taking conservative minimum
   */
  async resolveByConservativeMinimum(conflict, newOrderData, existingOrders) {
    if (conflict.type === "INVENTORY_CONFLICT") {
      const minQuantity = Math.min(conflict.newValue, conflict.existingValue);

      // Update all orders to use minimum quantity
      for (const order of existingOrders) {
        const item = order.items.find((i) => i.sku === conflict.sku);
        if (item && item.quantity !== minQuantity) {
          await item.update({ quantity: minQuantity });
        }
      }

      return {
        status: "resolved",
        action: "set_minimum_quantity",
        reason: `Set quantity to conservative minimum: ${minQuantity}`,
        resolvedValue: minQuantity,
      };
    }

    return { status: "unresolved", reason: "Not an inventory conflict" };
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
        status: "pending_review",
      },
      24 * 60 * 60
    ); // 24 hours TTL

    // Emit event for notification system
    this.emit("manualReviewRequired", {
      conflictId,
      conflict,
      orderNumber: newOrderData.orderNumber,
      platforms: existingOrders.map((o) => o.platformConnection.platformType),
    });

    return {
      status: "flagged_for_review",
      action: "manual_review_required",
      conflictId,
      reason: "Conflict requires manual intervention",
    };
  }

  /**
   * Update existing order with new data
   */
  async updateOrderWithNewData(existingOrder, newOrderData, conflict) {
    const updateData = {};

    switch (conflict.type) {
      case "ORDER_STATUS_CONFLICT":
        updateData.orderStatus = this.mapOrderStatus(newOrderData.status);
        break;
      case "PRICE_CONFLICT":
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
        if (connection.platformType === originPlatform) continue; // Skip origin platform

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
              message: result.message,
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
            error: error.message,
          });
        }
      }

      // Update local inventory cache
      this.inventoryCache.set(sku, {
        quantity: newQuantity,
        lastUpdated: new Date(),
        originPlatform,
      });

      // Emit inventory sync event
      this.emit("inventorySynced", {
        sku,
        newQuantity,
        originPlatform,
        syncResults,
        timestamp: new Date(),
      });

      return syncResults;
    } catch (error) {
      logger.error("Inventory sync failed:", error);
      throw error;
    }
  }

  /**
   * Real-time notification system for platform events
   */
  setupRealTimeNotifications() {
    // Order status changes
    this.on("orderStatusChanged", (data) => {
      this.broadcastNotification("order_status_change", {
        orderNumber: data.orderNumber,
        platform: data.platform,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        timestamp: data.timestamp,
      });
    });

    // Inventory alerts
    this.on("lowInventoryAlert", (data) => {
      this.broadcastNotification("low_inventory", {
        sku: data.sku,
        currentQuantity: data.quantity,
        threshold: data.threshold,
        platforms: data.platforms,
      });
    });

    // Sync completion notifications
    this.on("syncCompleted", (data) => {
      this.broadcastNotification("sync_completed", {
        totalProcessed: data.results.totalProcessed,
        duration: data.performance.duration,
        conflicts: data.results.conflicts.length,
        timestamp: data.timestamp,
      });
    });

    // Conflict notifications
    this.on("orderConflict", (data) => {
      this.broadcastNotification("order_conflict", {
        orderNumber: data.orderNumber,
        platforms: data.platforms,
        conflictType: data.conflictType,
        requiresAttention: data.resolution === "manual_review",
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
        timestamp: new Date(),
      },
      24 * 60 * 60
    ); // 24 hours TTL
  }

  /**
   * Get platform service instance
   */
  getPlatformService(platformType, connectionId) {
    switch (platformType.toLowerCase()) {
      case "trendyol":
        const TrendyolService = require("../modules/order-management/services/platforms/trendyol/trendyol-service");
        return new TrendyolService(connectionId);
      case "hepsiburada":
        const HepsiburadaService = require("../modules/order-management/services/platforms/hepsiburada/hepsiburada-service");
        return new HepsiburadaService(connectionId);
      case "n11":
        const N11Service = require("../modules/order-management/services/platforms/n11/n11-service");
        return new N11Service(connectionId);
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
      Created: "new",
      Picking: "processing",
      Invoiced: "processing",
      Shipped: "shipped",
      AtCollectionPoint: "shipped",
      Delivered: "delivered",
      Cancelled: "cancelled",
      UnDelivered: "failed",
      Returned: "returned",
      
      // Hepsiburada mappings (consistent with HepsiburadaService)
      Open: "pending",
      PaymentCompleted: "processing",
      Packaged: "shipped",
      InTransit: "shipped",
      CancelledByMerchant: "cancelled",
      CancelledByCustomer: "cancelled",
      CancelledBySap: "cancelled",
      ReadyToShip: "processing",
      ClaimCreated: "claim_created",
      
      // N11 mappings (consistent with N11Service)
      Approved: "pending",
      New: "new",
    };

    return statusMap[platformStatus] || "unknown";
  }

  /**
   * Get product platform connections
   */
  async getProductPlatformConnections(sku) {
    // This would query for products across platforms with the given SKU
    // Simplified implementation for now
    return await PlatformConnection.findAll({
      where: { isActive: true },
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
          logger.debug("Sync already in progress, skipping scheduled sync");
          return;
        }

        this.isProcessing = true;
        logger.debug("Starting scheduled platform sync");

        // Use a shorter sync window for periodic syncs
        const results = await this.syncOrdersWithConflictResolution();

        logger.debug("Scheduled sync completed successfully", {
          totalProcessed: results.totalProcessed,
          duration: results.syncDuration,
        });
      } catch (error) {
        logger.error("Scheduled sync failed:", error);
      } finally {
        this.isProcessing = false;
      }
    }, 10 * 60 * 1000); // 10 minutes

    logger.info(
      "Enhanced platform sync scheduler started (10 minute intervals)"
    );
  }

  /**
   * Get pending manual reviews
   */
  async getPendingManualReviews() {
    const keys = await cacheService.getKeys("manual_review:*");
    const reviews = [];

    for (const key of keys) {
      const review = await cacheService.get(key);
      if (review && review.status === "pending_review") {
        reviews.push({
          id: key.replace("manual_review:", ""),
          ...review,
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
      throw new Error("Manual review not found");
    }

    // Apply resolution
    review.status = "resolved";
    review.resolution = resolution;
    review.resolvedAt = new Date();

    await cacheService.set(`manual_review:${conflictId}`, review, 24 * 60 * 60);

    this.emit("manualReviewResolved", {
      conflictId,
      resolution,
      timestamp: new Date(),
    });

    return review;
  }
}

module.exports = new EnhancedPlatformService();
