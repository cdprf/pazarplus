const {
  Product,
  ProductVariant,
  InventoryMovement,
  StockReservation,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");

/**
 * Advanced Inventory Service
 * Handles complex inventory operations including movements, reservations, and stock tracking
 */
class AdvancedInventoryService {
  /**
   * Record an inventory movement
   */
  async recordMovement(
    {
      productId,
      variantId,
      sku,
      movementType,
      quantity,
      reason,
      userId,
      orderId = null,
      reference = null,
      metadata = {},
    },
    options = {}
  ) {
    const transaction = options.transaction || (await sequelize.transaction());
    const shouldCommitTransaction = !options.transaction;

    try {
      // Find the product/variant to update
      let targetEntity = null;
      let stockField = "stockQuantity";

      if (variantId) {
        targetEntity = await ProductVariant.findByPk(variantId, {
          transaction,
        });
        if (!targetEntity) {
          throw new Error(`Product variant not found: ${variantId}`);
        }
      } else if (productId) {
        targetEntity = await Product.findByPk(productId, { transaction });
        if (!targetEntity) {
          throw new Error(`Product not found: ${productId}`);
        }
      } else if (sku) {
        // Try to find by SKU - check variants first, then products
        targetEntity = await ProductVariant.findOne({
          where: { sku },
          transaction,
        });

        if (!targetEntity) {
          targetEntity = await Product.findOne({
            where: { sku },
            transaction,
          });
          if (targetEntity) {
            productId = targetEntity.id;
          }
        } else {
          variantId = targetEntity.id;
          productId = targetEntity.productId;
        }

        if (!targetEntity) {
          throw new Error(`No product or variant found with SKU: ${sku}`);
        }
      } else {
        throw new Error("Must provide productId, variantId, or sku");
      }

      const currentStock = targetEntity[stockField] || 0;
      const newStock = Math.max(0, currentStock + quantity);

      // Create the inventory movement record
      const movement = await InventoryMovement.create(
        {
          productId,
          variantId,
          sku: sku || targetEntity.sku,
          movementType,
          quantity,
          previousQuantity: currentStock,
          newQuantity: newStock,
          reason,
          userId,
          orderId,
          reference,
          metadata,
          occurredAt: new Date(),
        },
        { transaction }
      );

      // Update the stock quantity
      await targetEntity.update(
        {
          [stockField]: newStock,
          lastSyncedAt: new Date(),
        },
        { transaction }
      );

      if (shouldCommitTransaction) {
        await transaction.commit();
      }

      logger.info(
        `Inventory movement recorded: ${
          sku || targetEntity.sku
        } ${movementType} ${quantity} (${currentStock} → ${newStock})`
      );

      return {
        movement,
        previousStock: currentStock,
        newStock,
        entity: targetEntity,
      };
    } catch (error) {
      if (shouldCommitTransaction) {
        await transaction.rollback();
      }
      logger.error("Error recording inventory movement:", error);
      throw error;
    }
  }

  /**
   * Adjust stock manually
   */
  async adjustStock({ productId, variantId, sku, adjustment, reason, userId }) {
    return this.recordMovement({
      productId,
      variantId,
      sku,
      movementType: "ADJUSTMENT",
      quantity: adjustment,
      reason,
      userId,
      metadata: { manualAdjustment: true },
    });
  }

  /**
   * Reserve stock for an order
   */
  async reserveStock({
    productId,
    variantId,
    sku,
    quantity,
    orderId,
    userId,
    expiresAt = null,
    metadata = {},
  }) {
    const transaction = await sequelize.transaction();

    try {
      // Check available stock
      const availableStock = await this.getAvailableStock(
        productId,
        variantId,
        sku
      );

      if (availableStock < quantity) {
        throw new Error(
          `Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`
        );
      }

      // Create reservation
      const reservation = await StockReservation.create(
        {
          productId,
          variantId,
          sku: sku || (await this.getSkuForEntity(productId, variantId)),
          quantity,
          orderId,
          userId,
          status: "active",
          expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
          metadata,
        },
        { transaction }
      );

      // Record the reservation movement
      await this.recordMovement(
        {
          productId,
          variantId,
          sku,
          movementType: "RESERVATION",
          quantity: -quantity, // Negative because it's reserved
          reason: `Stock reserved for order ${orderId}`,
          userId,
          orderId,
          reference: reservation.id,
          metadata: { reservationId: reservation.id },
        },
        { transaction }
      );

      await transaction.commit();

      logger.info(
        `Stock reserved: ${quantity} units of ${sku} for order ${orderId}`
      );

      return reservation;
    } catch (error) {
      await transaction.rollback();
      logger.error("Error reserving stock:", error);
      throw error;
    }
  }

  /**
   * Release a stock reservation
   */
  async releaseReservation(reservationId, reason = "Reservation released") {
    const transaction = await sequelize.transaction();

    try {
      const reservation = await StockReservation.findByPk(reservationId, {
        transaction,
      });

      if (!reservation) {
        throw new Error(`Reservation not found: ${reservationId}`);
      }

      if (reservation.status !== "active") {
        throw new Error(`Reservation is not active: ${reservation.status}`);
      }

      // Update reservation status
      await reservation.update(
        {
          status: "released",
          releasedAt: new Date(),
        },
        { transaction }
      );

      // Record the release movement
      await this.recordMovement(
        {
          productId: reservation.productId,
          variantId: reservation.variantId,
          sku: reservation.sku,
          movementType: "RELEASE",
          quantity: reservation.quantity, // Positive because it's released back
          reason,
          userId: reservation.userId,
          orderId: reservation.orderId,
          reference: reservationId,
          metadata: { reservationId },
        },
        { transaction }
      );

      await transaction.commit();

      logger.info(`Stock reservation released: ${reservationId}`);

      return reservation;
    } catch (error) {
      await transaction.rollback();
      logger.error("Error releasing stock reservation:", error);
      throw error;
    }
  }

  /**
   * Confirm a stock reservation (convert to sale)
   */
  async confirmReservation(
    reservationId,
    reason = "Reservation confirmed - order completed"
  ) {
    const transaction = await sequelize.transaction();

    try {
      const reservation = await StockReservation.findByPk(reservationId, {
        transaction,
      });

      if (!reservation) {
        throw new Error(`Reservation not found: ${reservationId}`);
      }

      if (reservation.status !== "active") {
        throw new Error(`Reservation is not active: ${reservation.status}`);
      }

      // Update reservation status
      await reservation.update(
        {
          status: "confirmed",
          confirmedAt: new Date(),
        },
        { transaction }
      );

      // Record the sale movement (no stock change since it was already reserved)
      await this.recordMovement(
        {
          productId: reservation.productId,
          variantId: reservation.variantId,
          sku: reservation.sku,
          movementType: "SALE",
          quantity: 0, // No stock change since it was already reserved
          reason,
          userId: reservation.userId,
          orderId: reservation.orderId,
          reference: reservationId,
          metadata: {
            reservationId,
            confirmedReservation: true,
            originalQuantity: reservation.quantity,
          },
        },
        { transaction }
      );

      await transaction.commit();

      logger.info(`Stock reservation confirmed: ${reservationId}`);

      return reservation;
    } catch (error) {
      await transaction.rollback();
      logger.error("Error confirming stock reservation:", error);
      throw error;
    }
  }

  /**
   * Get available stock (total stock minus active reservations)
   */
  async getAvailableStock(productId, variantId, sku = null) {
    try {
      let targetEntity = null;
      let entityWhere = {};

      if (variantId) {
        targetEntity = await ProductVariant.findByPk(variantId);
        entityWhere.variantId = variantId;
      } else if (productId) {
        targetEntity = await Product.findByPk(productId);
        entityWhere.productId = productId;
      } else if (sku) {
        // Try variant first, then product
        targetEntity = await ProductVariant.findOne({ where: { sku } });
        if (targetEntity) {
          entityWhere.variantId = targetEntity.id;
        } else {
          targetEntity = await Product.findOne({ where: { sku } });
          if (targetEntity) {
            entityWhere.productId = targetEntity.id;
          }
        }
      }

      if (!targetEntity) {
        throw new Error("Product or variant not found");
      }

      const totalStock = targetEntity.stockQuantity || 0;

      // Calculate reserved stock
      const reservedStock =
        (await StockReservation.sum("quantity", {
          where: {
            ...entityWhere,
            status: "active",
          },
        })) || 0;

      return Math.max(0, totalStock - reservedStock);
    } catch (error) {
      logger.error("Error getting available stock:", error);
      throw error;
    }
  }

  /**
   * Get inventory movement history
   */
  async getInventoryHistory(productId, variantId, options = {}) {
    try {
      const {
        page = 0,
        limit = 50,
        movementType,
        startDate,
        endDate,
        includeMetadata = true,
      } = options;

      const whereClause = {};

      if (productId) whereClause.productId = productId;
      if (variantId) whereClause.variantId = variantId;
      if (movementType) whereClause.movementType = movementType;

      if (startDate || endDate) {
        whereClause.occurredAt = {};
        if (startDate) whereClause.occurredAt[Op.gte] = startDate;
        if (endDate) whereClause.occurredAt[Op.lte] = endDate;
      }

      const { count, rows: movements } =
        await InventoryMovement.findAndCountAll({
          where: whereClause,
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "sku"],
              required: false,
            },
            {
              model: ProductVariant,
              as: "variant",
              attributes: ["id", "name", "sku"],
              required: false,
            },
          ],
          order: [["occurredAt", "DESC"]],
          limit: parseInt(limit),
          offset: parseInt(page) * parseInt(limit),
          attributes: includeMetadata ? undefined : { exclude: ["metadata"] },
        });

      return {
        success: true,
        data: {
          movements,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit)),
            totalItems: count,
            itemsPerPage: parseInt(limit),
          },
        },
      };
    } catch (error) {
      logger.error("Error getting inventory history:", error);
      throw error;
    }
  }

  /**
   * Get stock reservations
   */
  async getReservations(userId, options = {}) {
    try {
      const {
        status,
        productId,
        variantId,
        page = 0,
        limit = 50,
        includeExpired = false,
      } = options;

      const whereClause = { userId };

      if (status) whereClause.status = status;
      if (productId) whereClause.productId = productId;
      if (variantId) whereClause.variantId = variantId;

      if (!includeExpired && !status) {
        whereClause[Op.or] = [
          { status: { [Op.ne]: "expired" } },
          { expiresAt: { [Op.gt]: new Date() } },
        ];
      }

      const { count, rows: reservations } =
        await StockReservation.findAndCountAll({
          where: whereClause,
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "sku"],
              required: false,
            },
            {
              model: ProductVariant,
              as: "variant",
              attributes: ["id", "name", "sku"],
              required: false,
            },
          ],
          order: [["createdAt", "DESC"]],
          limit: parseInt(limit),
          offset: parseInt(page) * parseInt(limit),
        });

      return {
        success: true,
        data: {
          reservations,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit)),
            totalItems: count,
            itemsPerPage: parseInt(limit),
          },
        },
      };
    } catch (error) {
      logger.error("Error getting stock reservations:", error);
      throw error;
    }
  }

  /**
   * Expire old reservations
   */
  async expireOldReservations() {
    const transaction = await sequelize.transaction();

    try {
      const expiredReservations = await StockReservation.findAll({
        where: {
          status: "active",
          expiresAt: { [Op.lt]: new Date() },
        },
        transaction,
      });

      for (const reservation of expiredReservations) {
        await reservation.update(
          {
            status: "expired",
          },
          { transaction }
        );

        // Release the reserved stock
        await this.recordMovement(
          {
            productId: reservation.productId,
            variantId: reservation.variantId,
            sku: reservation.sku,
            movementType: "RELEASE",
            quantity: reservation.quantity,
            reason: "Reservation expired automatically",
            userId: reservation.userId,
            orderId: reservation.orderId,
            reference: reservation.id,
            metadata: {
              reservationId: reservation.id,
              autoExpired: true,
            },
          },
          { transaction }
        );
      }

      await transaction.commit();

      if (expiredReservations.length > 0) {
        logger.info(
          `Expired ${expiredReservations.length} old stock reservations`
        );
      }

      return expiredReservations.length;
    } catch (error) {
      await transaction.rollback();
      logger.error("Error expiring old reservations:", error);
      throw error;
    }
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(userId, threshold = null) {
    try {
      const products = await Product.findAll({
        where: {
          userId,
          status: "active",
          [Op.or]: [
            // Stock below minimum level
            sequelize.where(
              sequelize.col("stockQuantity"),
              Op.lte,
              sequelize.col("minStockLevel")
            ),
            // Stock below threshold if no minimum level set
            threshold
              ? {
                  minStockLevel: { [Op.or]: [null, 0] },
                  stockQuantity: { [Op.lte]: threshold },
                }
              : {},
          ],
        },
        include: [
          {
            model: ProductVariant,
            as: "variants",
            where: {
              [Op.or]: [
                sequelize.where(
                  sequelize.col("variants.stockQuantity"),
                  Op.lte,
                  sequelize.col("variants.minStockLevel")
                ),
                threshold
                  ? {
                      minStockLevel: { [Op.or]: [null, 0] },
                      stockQuantity: { [Op.lte]: threshold },
                    }
                  : {},
              ],
            },
            required: false,
          },
        ],
      });

      return products;
    } catch (error) {
      logger.error("Error getting low stock alerts:", error);
      throw error;
    }
  }

  /**
   * Get SKU for entity (helper method)
   */
  async getSkuForEntity(productId, variantId) {
    if (variantId) {
      const variant = await ProductVariant.findByPk(variantId, {
        attributes: ["sku"],
      });
      return variant?.sku;
    }

    if (productId) {
      const product = await Product.findByPk(productId, {
        attributes: ["sku"],
      });
      return product?.sku;
    }

    return null;
  }

  /**
   * Get inventory summary for a user
   */
  async getInventorySummary(userId) {
    try {
      const summary = await sequelize.query(
        `
        SELECT 
          COUNT(DISTINCT p.id) as total_products,
          COUNT(DISTINCT pv.id) as total_variants,
          SUM(CASE WHEN p.stock_quantity <= p.min_stock_level THEN 1 ELSE 0 END) as low_stock_products,
          SUM(CASE WHEN pv.stock_quantity <= pv.min_stock_level THEN 1 ELSE 0 END) as low_stock_variants,
          SUM(p.stock_quantity * p.price) as total_inventory_value,
          SUM(sr.quantity) as total_reserved_stock
        FROM products p
        LEFT JOIN product_variants pv ON p.id = pv.product_id
        LEFT JOIN stock_reservations sr ON (p.id = sr.product_id OR pv.id = sr.variant_id) 
          AND sr.status = 'active'
        WHERE p.user_id = :userId AND p.status = 'active'
      `,
        {
          replacements: { userId },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      return summary[0];
    } catch (error) {
      logger.error("Error getting inventory summary:", error);
      throw error;
    }
  }
}

module.exports = new AdvancedInventoryService();
