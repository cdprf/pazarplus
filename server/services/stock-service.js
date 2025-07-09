/**
 * Stock Management Service
 * Handles shared stock across main products and platform variants
 * Consolidated from enhanced-stock-service.js
 */

const logger = require("../utils/logger");
const {
  MainProduct,
  PlatformVariant,
  InventoryMovement,
  StockReservation,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");

class StockService {
  /**
   * Get current stock status for a main product
   */
  async getStockStatus(mainProductId) {
    try {
      const mainProduct = await MainProduct.findByPk(mainProductId, {
        include: [
          {
            model: PlatformVariant,
            as: "platformVariants",
            where: { status: "active" },
            required: false,
          },
          {
            model: StockReservation,
            as: "stockReservations",
            where: { status: "active" },
            required: false,
          },
        ],
      });

      if (!mainProduct) {
        throw new Error("Main product not found");
      }

      const totalReserved = await this.calculateReservedStock(mainProductId);
      const availableStock = mainProduct.stockQuantity - totalReserved;

      return {
        mainProductId,
        totalStock: mainProduct.stockQuantity,
        reservedStock: totalReserved,
        availableStock,
        minStockLevel: mainProduct.minStockLevel,
        isLowStock: availableStock <= mainProduct.minStockLevel,
        platformVariants: mainProduct.platformVariants.map((variant) => ({
          id: variant.id,
          platform: variant.platform,
          platformSku: variant.platformSku,
          isPublished: variant.isPublished,
          syncStatus: variant.syncStatus,
        })),
        lastStockUpdate: mainProduct.lastStockUpdate,
      };
    } catch (error) {
      logger.error("Error getting stock status:", error);
      throw error;
    }
  }

  /**
   * Calculate total reserved stock for a main product
   */
  async calculateReservedStock(mainProductId) {
    try {
      const result = await StockReservation.sum("quantity", {
        where: {
          mainProductId,
          status: "active",
          expiresAt: { [Op.gt]: new Date() },
        },
      });

      return result || 0;
    } catch (error) {
      logger.error("Error calculating reserved stock:", error);
      return 0;
    }
  }

  /**
   * Update stock for a main product
   */
  async updateStock(
    mainProductId,
    newQuantity,
    reason = "Manual update",
    userId = null,
    metadata = {}
  ) {
    const transaction = await sequelize.transaction();

    try {
      const mainProduct = await MainProduct.findByPk(mainProductId, {
        transaction,
      });

      if (!mainProduct) {
        throw new Error("Main product not found");
      }

      const oldQuantity = mainProduct.stockQuantity;
      const quantityChange = newQuantity - oldQuantity;

      // Update main product stock
      await mainProduct.update(
        {
          stockQuantity: newQuantity,
          lastStockUpdate: new Date(),
        },
        { transaction }
      );

      // Record inventory movement
      await InventoryMovement.create(
        {
          mainProductId,
          changeType: quantityChange > 0 ? "increase" : "decrease",
          quantity: Math.abs(quantityChange),
          reason,
          userId,
          metadata,
          previousStock: oldQuantity,
          newStock: newQuantity,
        },
        { transaction }
      );

      // Update platform variants sync status
      await PlatformVariant.update(
        { syncStatus: "pending" },
        {
          where: { mainProductId },
          transaction,
        }
      );

      await transaction.commit();

      logger.info(
        `Stock updated for product ${mainProductId}: ${oldQuantity} → ${newQuantity}`
      );

      return {
        success: true,
        oldQuantity,
        newQuantity,
        quantityChange,
        reason,
        timestamp: new Date(),
      };
    } catch (error) {
      await transaction.rollback();
      logger.error("Error updating stock:", error);
      throw error;
    }
  }

  /**
   * Adjust stock by a relative amount
   */
  async adjustStock(
    mainProductId,
    adjustment,
    reason = "Stock adjustment",
    userId = null,
    metadata = {}
  ) {
    try {
      const mainProduct = await MainProduct.findByPk(mainProductId);

      if (!mainProduct) {
        throw new Error("Main product not found");
      }

      const newQuantity = Math.max(0, mainProduct.stockQuantity + adjustment);

      return await this.updateStock(
        mainProductId,
        newQuantity,
        reason,
        userId,
        metadata
      );
    } catch (error) {
      logger.error("Error adjusting stock:", error);
      throw error;
    }
  }

  /**
   * Reserve stock for an order
   */
  async reserveStock(
    mainProductId,
    quantity,
    orderId,
    platform,
    userId = null,
    expirationMinutes = 30
  ) {
    const transaction = await sequelize.transaction();

    try {
      // Check available stock
      const stockStatus = await this.getStockStatus(mainProductId);

      if (stockStatus.availableStock < quantity) {
        throw new Error(
          `Insufficient stock. Available: ${stockStatus.availableStock}, Requested: ${quantity}`
        );
      }

      // Create reservation
      const reservation = await StockReservation.create(
        {
          mainProductId,
          quantity,
          orderId,
          platform,
          userId,
          status: "active",
          expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000),
        },
        { transaction }
      );

      // Record inventory movement
      await InventoryMovement.create(
        {
          mainProductId,
          changeType: "reservation",
          quantity,
          reason: `Stock reserved for order ${orderId}`,
          userId,
          metadata: { orderId, platform, reservationId: reservation.id },
          previousStock: stockStatus.totalStock,
          newStock: stockStatus.totalStock, // Stock quantity doesn't change, just reserved
        },
        { transaction }
      );

      await transaction.commit();

      logger.info(
        `Reserved ${quantity} units for order ${orderId} on ${platform}`
      );

      return {
        success: true,
        reservationId: reservation.id,
        quantity,
        expiresAt: reservation.expiresAt,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error("Error reserving stock:", error);
      throw error;
    }
  }

  /**
   * Release stock reservation
   */
  async releaseReservation(reservationId, reason = "Manual release") {
    const transaction = await sequelize.transaction();

    try {
      const reservation = await StockReservation.findByPk(reservationId, {
        transaction,
      });

      if (!reservation) {
        throw new Error("Reservation not found");
      }

      if (reservation.status !== "active") {
        throw new Error("Reservation is not active");
      }

      // Update reservation status
      await reservation.update(
        {
          status: "released",
          releasedAt: new Date(),
          releaseReason: reason,
        },
        { transaction }
      );

      // Record inventory movement
      await InventoryMovement.create(
        {
          mainProductId: reservation.mainProductId,
          changeType: "release",
          quantity: reservation.quantity,
          reason: `Stock reservation released: ${reason}`,
          userId: reservation.userId,
          metadata: { reservationId, orderId: reservation.orderId },
        },
        { transaction }
      );

      await transaction.commit();

      logger.info(
        `Released reservation ${reservationId} for ${reservation.quantity} units`
      );

      return {
        success: true,
        reservationId,
        quantity: reservation.quantity,
        reason,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error("Error releasing reservation:", error);
      throw error;
    }
  }

  /**
   * Confirm stock reservation (convert to actual stock reduction)
   */
  async confirmReservation(reservationId, reason = "Order confirmed") {
    const transaction = await sequelize.transaction();

    try {
      const reservation = await StockReservation.findByPk(reservationId, {
        transaction,
      });

      if (!reservation) {
        throw new Error("Reservation not found");
      }

      if (reservation.status !== "active") {
        throw new Error("Reservation is not active");
      }

      // Get current stock
      const mainProduct = await MainProduct.findByPk(
        reservation.mainProductId,
        { transaction }
      );

      if (!mainProduct) {
        throw new Error("Main product not found");
      }

      const newQuantity = Math.max(
        0,
        mainProduct.stockQuantity - reservation.quantity
      );

      // Update main product stock
      await mainProduct.update(
        {
          stockQuantity: newQuantity,
          lastStockUpdate: new Date(),
        },
        { transaction }
      );

      // Update reservation status
      await reservation.update(
        {
          status: "confirmed",
          confirmedAt: new Date(),
          confirmReason: reason,
        },
        { transaction }
      );

      // Record inventory movement
      await InventoryMovement.create(
        {
          mainProductId: reservation.mainProductId,
          changeType: "decrease",
          quantity: reservation.quantity,
          reason: `Stock confirmed for order ${reservation.orderId}`,
          userId: reservation.userId,
          metadata: { reservationId, orderId: reservation.orderId },
          previousStock: mainProduct.stockQuantity + reservation.quantity,
          newStock: newQuantity,
        },
        { transaction }
      );

      // Update platform variants sync status
      await PlatformVariant.update(
        { syncStatus: "pending" },
        {
          where: { mainProductId: reservation.mainProductId },
          transaction,
        }
      );

      await transaction.commit();

      logger.info(
        `Confirmed reservation ${reservationId} for ${reservation.quantity} units`
      );

      return {
        success: true,
        reservationId,
        quantity: reservation.quantity,
        newStockLevel: newQuantity,
        reason,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error("Error confirming reservation:", error);
      throw error;
    }
  }

  /**
   * Get stock movement history
   */
  async getStockHistory(mainProductId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        startDate = null,
        endDate = null,
        changeType = null,
      } = options;

      const where = { mainProductId };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }

      if (changeType) {
        where.changeType = changeType;
      }

      const movements = await InventoryMovement.findAll({
        where,
        order: [["createdAt", "DESC"]],
        limit,
        offset,
      });

      return {
        success: true,
        movements,
        total: movements.length,
      };
    } catch (error) {
      logger.error("Error getting stock history:", error);
      throw error;
    }
  }

  /**
   * Get active reservations for a main product
   */
  async getActiveReservations(mainProductId) {
    try {
      const reservations = await StockReservation.findAll({
        where: {
          mainProductId,
          status: "active",
          expiresAt: { [Op.gt]: new Date() },
        },
        order: [["createdAt", "DESC"]],
      });

      return {
        success: true,
        reservations,
        totalReserved: reservations.reduce((sum, r) => sum + r.quantity, 0),
      };
    } catch (error) {
      logger.error("Error getting active reservations:", error);
      throw error;
    }
  }

  /**
   * Check for low stock products
   */
  async getLowStockProducts(userId = null) {
    try {
      const where = {};
      if (userId) where.userId = userId;

      const products = await MainProduct.findAll({
        where: {
          ...where,
          [Op.and]: [
            sequelize.where(
              sequelize.col("stockQuantity"),
              Op.lte,
              sequelize.col("minStockLevel")
            ),
          ],
        },
        order: [["stockQuantity", "ASC"]],
      });

      return {
        success: true,
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          baseSku: p.baseSku,
          stockQuantity: p.stockQuantity,
          minStockLevel: p.minStockLevel,
          urgency: p.stockQuantity === 0 ? "critical" : "low",
        })),
        count: products.length,
      };
    } catch (error) {
      logger.error("Error getting low stock products:", error);
      throw error;
    }
  }

  /**
   * Bulk update stock for multiple products
   */
  async bulkUpdateStock(updates, userId = null) {
    const transaction = await sequelize.transaction();
    const results = [];

    try {
      for (const update of updates) {
        try {
          const result = await this.updateStock(
            update.mainProductId,
            update.quantity,
            update.reason || "Bulk update",
            userId,
            update.metadata || {}
          );

          results.push({
            ...result,
            mainProductId: update.mainProductId,
          });
        } catch (error) {
          logger.error(
            `Error updating stock for ${update.mainProductId}:`,
            error
          );
          results.push({
            success: false,
            mainProductId: update.mainProductId,
            error: error.message,
          });
        }
      }

      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      logger.error("Error in bulk stock update:", error);
      throw error;
    }
  }

  /**
   * Clean up expired reservations
   */
  async cleanupExpiredReservations() {
    try {
      const expiredReservations = await StockReservation.findAll({
        where: {
          status: "active",
          expiresAt: { [Op.lt]: new Date() },
        },
      });

      for (const reservation of expiredReservations) {
        await this.releaseReservation(
          reservation.id,
          "Automatic cleanup - expired"
        );
      }

      logger.info(
        `Cleaned up ${expiredReservations.length} expired reservations`
      );
      return expiredReservations.length;
    } catch (error) {
      logger.error("Error cleaning up expired reservations:", error);
      return 0;
    }
  }

  /**
   * Get bulk stock status for multiple products
   */
  async getBulkStockStatus(mainProductIds) {
    try {
      const results = await Promise.all(
        mainProductIds.map((id) =>
          this.getStockStatus(id).catch((error) => ({
            id,
            error: error.message,
          }))
        )
      );

      return results;
    } catch (error) {
      logger.error("Error getting bulk stock status:", error);
      throw error;
    }
  }
}

module.exports = new StockService();
