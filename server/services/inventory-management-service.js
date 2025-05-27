const EventEmitter = require("events");
const logger = require("../utils/logger");
const cacheService = require("./cache-service");
const notificationService = require("./notification-service");
const {
  Product,
  OrderItem,
  PlatformConnection,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");

/**
 * Enhanced Inventory Management Service
 * Provides real-time inventory synchronization across Turkish marketplace platforms
 */
class InventoryManagementService extends EventEmitter {
  constructor() {
    super();
    this.inventoryCache = new Map();
    this.syncQueue = [];
    this.isProcessing = false;
    this.lowStockThresholds = new Map();
    this.reservedStock = new Map();
    this.lastSyncTimes = new Map();

    // Initialize default thresholds
    this.initializeDefaults();

    // Start inventory monitoring
    this.startInventoryMonitoring();
  }

  /**
   * Initialize default settings
   */
  initializeDefaults() {
    this.defaultLowStockThreshold = 5;
    this.syncInterval = 2 * 60 * 1000; // 2 minutes
    this.reservationTimeout = 30 * 60 * 1000; // 30 minutes

    // Platform-specific inventory update delays (to prevent race conditions)
    this.platformUpdateDelays = {
      trendyol: 0,
      hepsiburada: 1000,
      n11: 2000,
    };
  }

  /**
   * Get real-time inventory for a product across all platforms
   */
  async getProductInventory(sku) {
    try {
      // Check cache first
      const cacheKey = `inventory:${sku}`;
      let inventory = await cacheService.get(cacheKey);

      if (!inventory) {
        // Fetch from database and platforms
        inventory = await this.fetchProductInventoryFromPlatforms(sku);

        // Cache for 5 minutes
        await cacheService.set(cacheKey, inventory, 5 * 60);
      }

      // Add reserved stock information
      const reservedQuantity = this.getReservedStock(sku);
      inventory.availableQuantity = Math.max(
        0,
        inventory.totalQuantity - reservedQuantity
      );
      inventory.reservedQuantity = reservedQuantity;

      return inventory;
    } catch (error) {
      logger.error(`Failed to get inventory for SKU ${sku}:`, error);
      throw error;
    }
  }

  /**
   * Fetch inventory from all platforms
   */
  async fetchProductInventoryFromPlatforms(sku) {
    const platforms = await PlatformConnection.findAll({
      where: { isActive: true },
    });

    const inventoryData = {
      sku,
      totalQuantity: 0,
      platformQuantities: {},
      lastUpdated: new Date(),
      conflicts: [],
    };

    const inventoryPromises = platforms.map(async (connection) => {
      try {
        const platformService = this.getPlatformService(
          connection.platformType,
          connection.id
        );

        if (platformService.getProductStock) {
          const stockResult = await platformService.getProductStock(sku);

          if (stockResult.success) {
            inventoryData.platformQuantities[connection.platformType] = {
              quantity: stockResult.quantity,
              lastUpdated: stockResult.lastUpdated || new Date(),
              connectionId: connection.id,
            };
          }
        }
      } catch (error) {
        logger.error(
          `Failed to fetch inventory from ${connection.platformType}:`,
          error
        );
        inventoryData.platformQuantities[connection.platformType] = {
          quantity: 0,
          error: error.message,
          lastUpdated: new Date(),
        };
      }
    });

    await Promise.allSettled(inventoryPromises);

    // Detect inventory conflicts between platforms
    const quantities = Object.values(inventoryData.platformQuantities)
      .filter((p) => !p.error)
      .map((p) => p.quantity);

    if (quantities.length > 1) {
      const minQuantity = Math.min(...quantities);
      const maxQuantity = Math.max(...quantities);

      if (maxQuantity - minQuantity > 0) {
        inventoryData.conflicts.push({
          type: "QUANTITY_MISMATCH",
          minQuantity,
          maxQuantity,
          platforms: Object.keys(inventoryData.platformQuantities),
          severity: maxQuantity - minQuantity > 10 ? "high" : "low",
        });
      }
    }

    // Use the minimum quantity across platforms (conservative approach)
    inventoryData.totalQuantity =
      quantities.length > 0 ? Math.min(...quantities) : 0;

    return inventoryData;
  }

  /**
   * Update inventory across all platforms
   */
  async updateInventoryAcrossPlatforms(
    sku,
    newQuantity,
    originPlatform = null,
    options = {}
  ) {
    try {
      const updateId = `inv_update_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      logger.info(`Starting inventory update for SKU ${sku}:`, {
        newQuantity,
        originPlatform,
        updateId,
      });

      // Get all platform connections
      const platforms = await PlatformConnection.findAll({
        where: { isActive: true },
      });

      const updateResults = [];
      const updatePromises = [];

      for (const connection of platforms) {
        // Skip origin platform if specified
        if (originPlatform && connection.platformType === originPlatform) {
          continue;
        }

        const delay = this.platformUpdateDelays[connection.platformType] || 0;

        const updatePromise = new Promise(async (resolve) => {
          try {
            // Add delay to prevent race conditions
            if (delay > 0) {
              await new Promise((r) => setTimeout(r, delay));
            }

            const platformService = this.getPlatformService(
              connection.platformType,
              connection.id
            );

            if (platformService.updateProductStock) {
              const result = await platformService.updateProductStock(
                sku,
                newQuantity,
                {
                  ...options,
                  updateId,
                }
              );

              updateResults.push({
                platform: connection.platformType,
                connectionId: connection.id,
                success: result.success,
                message: result.message,
                previousQuantity: result.previousQuantity,
                newQuantity: result.newQuantity,
              });
            } else {
              updateResults.push({
                platform: connection.platformType,
                connectionId: connection.id,
                success: false,
                message: "Platform does not support inventory updates",
              });
            }
          } catch (error) {
            logger.error(
              `Inventory update failed for ${connection.platformType}:`,
              error
            );
            updateResults.push({
              platform: connection.platformType,
              connectionId: connection.id,
              success: false,
              error: error.message,
            });
          }

          resolve();
        });

        updatePromises.push(updatePromise);
      }

      // Wait for all updates to complete
      await Promise.allSettled(updatePromises);

      // Update local cache
      await this.updateInventoryCache(sku, newQuantity);

      // Check for low stock
      await this.checkLowStockAlert(sku, newQuantity);

      // Emit inventory update event
      this.emit("inventoryUpdated", {
        sku,
        newQuantity,
        originPlatform,
        updateResults,
        updateId,
        timestamp: new Date(),
      });

      // Send real-time notification
      notificationService.notifyInventorySync({
        sku,
        newQuantity,
        originPlatform,
        syncResults: updateResults,
      });

      logger.info(`Inventory update completed for SKU ${sku}:`, {
        updateId,
        successCount: updateResults.filter((r) => r.success).length,
        totalPlatforms: updateResults.length,
      });

      return {
        success: true,
        updateId,
        results: updateResults,
        totalPlatforms: updateResults.length,
        successCount: updateResults.filter((r) => r.success).length,
      };
    } catch (error) {
      logger.error(`Inventory update failed for SKU ${sku}:`, error);
      throw error;
    }
  }

  /**
   * Reserve stock for pending orders
   */
  async reserveStock(sku, quantity, orderNumber, duration = null) {
    try {
      duration = duration || this.reservationTimeout;

      const currentInventory = await this.getProductInventory(sku);

      if (currentInventory.availableQuantity < quantity) {
        throw new Error(
          `Insufficient inventory. Available: ${currentInventory.availableQuantity}, Requested: ${quantity}`
        );
      }

      const reservationId = `res_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const reservation = {
        sku,
        quantity,
        orderNumber,
        reservationId,
        expiresAt: new Date(Date.now() + duration),
        createdAt: new Date(),
      };

      // Store reservation
      if (!this.reservedStock.has(sku)) {
        this.reservedStock.set(sku, []);
      }
      this.reservedStock.get(sku).push(reservation);

      // Cache reservation
      await cacheService.set(
        `reservation:${reservationId}`,
        reservation,
        duration / 1000
      );

      // Auto-release reservation after duration
      setTimeout(() => {
        this.releaseStockReservation(reservationId);
      }, duration);

      logger.info(`Stock reserved for SKU ${sku}:`, {
        quantity,
        orderNumber,
        reservationId,
        expiresAt: reservation.expiresAt,
      });

      return {
        success: true,
        reservationId,
        expiresAt: reservation.expiresAt,
      };
    } catch (error) {
      logger.error(`Failed to reserve stock for SKU ${sku}:`, error);
      throw error;
    }
  }

  /**
   * Release stock reservation
   */
  async releaseStockReservation(reservationId) {
    try {
      const reservation = await cacheService.get(
        `reservation:${reservationId}`
      );

      if (!reservation) {
        return { success: false, message: "Reservation not found" };
      }

      const sku = reservation.sku;
      const reservations = this.reservedStock.get(sku) || [];

      // Remove reservation
      const updatedReservations = reservations.filter(
        (r) => r.reservationId !== reservationId
      );
      this.reservedStock.set(sku, updatedReservations);

      // Remove from cache
      await cacheService.delete(`reservation:${reservationId}`);

      logger.info(`Stock reservation released:`, {
        reservationId,
        sku,
        quantity: reservation.quantity,
      });

      return {
        success: true,
        reservationId,
        sku,
        quantity: reservation.quantity,
      };
    } catch (error) {
      logger.error(
        `Failed to release stock reservation ${reservationId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Confirm stock reservation (when order is fulfilled)
   */
  async confirmStockReservation(reservationId) {
    try {
      const reservation = await cacheService.get(
        `reservation:${reservationId}`
      );

      if (!reservation) {
        return { success: false, message: "Reservation not found" };
      }

      const sku = reservation.sku;
      const quantity = reservation.quantity;

      // Release the reservation
      await this.releaseStockReservation(reservationId);

      // Update inventory to reflect the confirmed sale
      const currentInventory = await this.getProductInventory(sku);
      const newQuantity = Math.max(
        0,
        currentInventory.totalQuantity - quantity
      );

      await this.updateInventoryAcrossPlatforms(sku, newQuantity, null, {
        reason: "order_confirmed",
        orderNumber: reservation.orderNumber,
        reservationId,
      });

      logger.info(`Stock reservation confirmed and inventory updated:`, {
        reservationId,
        sku,
        quantity,
        newQuantity,
      });

      return {
        success: true,
        reservationId,
        sku,
        quantity,
        newQuantity,
      };
    } catch (error) {
      logger.error(
        `Failed to confirm stock reservation ${reservationId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get reserved stock quantity for a SKU
   */
  getReservedStock(sku) {
    const reservations = this.reservedStock.get(sku) || [];
    const now = new Date();

    // Filter out expired reservations
    const activeReservations = reservations.filter((r) => r.expiresAt > now);

    // Update the stored reservations
    this.reservedStock.set(sku, activeReservations);

    // Return total reserved quantity
    return activeReservations.reduce((total, r) => total + r.quantity, 0);
  }

  /**
   * Update inventory cache
   */
  async updateInventoryCache(sku, quantity) {
    const cacheKey = `inventory:${sku}`;
    const existing = (await cacheService.get(cacheKey)) || {};

    const updated = {
      ...existing,
      sku,
      totalQuantity: quantity,
      lastUpdated: new Date(),
    };

    await cacheService.set(cacheKey, updated, 5 * 60); // 5 minutes TTL
    this.inventoryCache.set(sku, updated);
  }

  /**
   * Check and send low stock alerts
   */
  async checkLowStockAlert(sku, quantity) {
    const threshold =
      this.lowStockThresholds.get(sku) || this.defaultLowStockThreshold;
    const reservedQuantity = this.getReservedStock(sku);
    const availableQuantity = Math.max(0, quantity - reservedQuantity);

    if (availableQuantity <= threshold) {
      // Get product information
      const product = await Product.findOne({
        where: { sku },
      });

      const alertData = {
        sku,
        productName: product?.name || "Unknown Product",
        quantity: availableQuantity,
        threshold,
        totalQuantity: quantity,
        reservedQuantity,
        platforms: await this.getProductPlatforms(sku),
      };

      // Emit low inventory event
      this.emit("lowInventory", alertData);

      // Send real-time notification
      notificationService.notifyLowInventory(alertData);

      logger.warn(`Low inventory alert for SKU ${sku}:`, alertData);
    }
  }

  /**
   * Get platforms where product is listed
   */
  async getProductPlatforms(sku) {
    // This would be implemented based on your product-platform mapping
    // For now, return all active platforms
    const platforms = await PlatformConnection.findAll({
      where: { isActive: true },
      attributes: ["platformType"],
    });

    return platforms.map((p) => p.platformType);
  }

  /**
   * Set low stock threshold for a product
   */
  setLowStockThreshold(sku, threshold) {
    this.lowStockThresholds.set(sku, threshold);

    // Cache the threshold
    cacheService.set(`threshold:${sku}`, threshold, 24 * 60 * 60); // 24 hours

    logger.info(`Low stock threshold set for SKU ${sku}: ${threshold}`);
  }

  /**
   * Bulk inventory update
   */
  async bulkUpdateInventory(updates) {
    const results = [];

    for (const update of updates) {
      try {
        const result = await this.updateInventoryAcrossPlatforms(
          update.sku,
          update.quantity,
          update.originPlatform,
          update.options || {}
        );

        results.push({
          sku: update.sku,
          success: true,
          result,
        });
      } catch (error) {
        results.push({
          sku: update.sku,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get inventory analytics
   */
  async getInventoryAnalytics(options = {}) {
    try {
      const { startDate, endDate, platforms } = options;

      // Get inventory movements
      const movements = await this.getInventoryMovements(startDate, endDate);

      // Calculate analytics
      const analytics = {
        totalProducts: this.inventoryCache.size,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        totalValue: 0,
        movements: {
          inbound: 0,
          outbound: 0,
          adjustments: 0,
        },
        platformDistribution: {},
        topMovingProducts: [],
        alerts: {
          lowStock: [],
          conflicts: [],
        },
      };

      // Process inventory data
      for (const [sku, inventory] of this.inventoryCache) {
        const reservedQuantity = this.getReservedStock(sku);
        const availableQuantity = Math.max(
          0,
          inventory.totalQuantity - reservedQuantity
        );
        const threshold =
          this.lowStockThresholds.get(sku) || this.defaultLowStockThreshold;

        if (availableQuantity === 0) {
          analytics.outOfStockProducts++;
        } else if (availableQuantity <= threshold) {
          analytics.lowStockProducts++;
          analytics.alerts.lowStock.push({
            sku,
            quantity: availableQuantity,
            threshold,
          });
        }

        // Check for conflicts
        if (inventory.conflicts && inventory.conflicts.length > 0) {
          analytics.alerts.conflicts.push({
            sku,
            conflicts: inventory.conflicts,
          });
        }

        // Platform distribution
        if (inventory.platformQuantities) {
          for (const [platform, data] of Object.entries(
            inventory.platformQuantities
          )) {
            if (!analytics.platformDistribution[platform]) {
              analytics.platformDistribution[platform] = {
                totalProducts: 0,
                totalQuantity: 0,
              };
            }
            analytics.platformDistribution[platform].totalProducts++;
            analytics.platformDistribution[platform].totalQuantity +=
              data.quantity || 0;
          }
        }
      }

      return analytics;
    } catch (error) {
      logger.error("Failed to get inventory analytics:", error);
      throw error;
    }
  }

  /**
   * Get inventory movements (simplified implementation)
   */
  async getInventoryMovements(startDate, endDate) {
    // This would query actual inventory movement logs
    // For now, return empty array
    return [];
  }

  /**
   * Start inventory monitoring
   */
  startInventoryMonitoring() {
    // Monitor inventory every 2 minutes
    setInterval(async () => {
      try {
        await this.monitorInventoryHealth();
      } catch (error) {
        logger.error("Inventory monitoring failed:", error);
      }
    }, this.syncInterval);

    // Clean up expired reservations every 5 minutes
    setInterval(() => {
      this.cleanupExpiredReservations();
    }, 5 * 60 * 1000);

    logger.info("Inventory monitoring started");
  }

  /**
   * Monitor inventory health
   */
  async monitorInventoryHealth() {
    const issues = [];

    for (const [sku, inventory] of this.inventoryCache) {
      // Check for platform conflicts
      if (inventory.conflicts && inventory.conflicts.length > 0) {
        for (const conflict of inventory.conflicts) {
          if (conflict.severity === "high") {
            issues.push({
              type: "HIGH_SEVERITY_CONFLICT",
              sku,
              conflict,
            });
          }
        }
      }

      // Check for stale inventory data
      const lastUpdated = new Date(inventory.lastUpdated);
      const staleDuration = Date.now() - lastUpdated.getTime();

      if (staleDuration > 10 * 60 * 1000) {
        // 10 minutes
        issues.push({
          type: "STALE_INVENTORY_DATA",
          sku,
          lastUpdated,
          staleDuration,
        });
      }
    }

    if (issues.length > 0) {
      logger.warn(`Inventory health issues detected:`, {
        issueCount: issues.length,
        issues: issues.slice(0, 5), // Log first 5 issues
      });

      // Emit health issues event
      this.emit("inventoryHealthIssues", {
        issues,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Clean up expired reservations
   */
  cleanupExpiredReservations() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sku, reservations] of this.reservedStock) {
      const activeReservations = reservations.filter((r) => r.expiresAt > now);
      const expiredCount = reservations.length - activeReservations.length;

      if (expiredCount > 0) {
        this.reservedStock.set(sku, activeReservations);
        cleanedCount += expiredCount;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired stock reservations`);
    }
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
   * Get all active reservations
   */
  getAllReservations() {
    const allReservations = [];
    const now = new Date();

    for (const [sku, reservations] of this.reservedStock) {
      const activeReservations = reservations.filter((r) => r.expiresAt > now);
      allReservations.push(...activeReservations);
    }

    return allReservations;
  }

  /**
   * Get inventory status summary
   */
  getInventoryStatus() {
    const status = {
      totalProducts: this.inventoryCache.size,
      totalReservations: 0,
      totalReservedQuantity: 0,
      cacheSize: this.inventoryCache.size,
      lastMonitorRun: new Date(),
    };

    for (const [sku, reservations] of this.reservedStock) {
      const activeReservations = reservations.filter(
        (r) => r.expiresAt > new Date()
      );
      status.totalReservations += activeReservations.length;
      status.totalReservedQuantity += activeReservations.reduce(
        (sum, r) => sum + r.quantity,
        0
      );
    }

    return status;
  }
}

module.exports = new InventoryManagementService();
