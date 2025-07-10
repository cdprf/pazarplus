/**
 * Shipping Detail Service
 * Handles safe operations on shipping details with proper constraint handling
 */

const { ShippingDetail, Order, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('./logger');

class ShippingDetailService {
  /**
   * Safely update a shipping detail, handling foreign key constraints
   * @param {number} shippingDetailId - ID of the shipping detail to update
   * @param {Object} updateData - Data to update
   * @param {Object} options - Additional options (transaction, etc.)
   * @returns {Promise<Object>} - Update result
   */
  async safeUpdate(shippingDetailId, updateData, options = {}) {
    try {
      const shippingDetail = await ShippingDetail.findByPk(
        shippingDetailId,
        options
      );

      if (!shippingDetail) {
        throw new Error(`ShippingDetail with ID ${shippingDetailId} not found`);
      }

      const result = await shippingDetail.update(updateData, options);

      logger.debug(`Successfully updated shipping detail ${shippingDetailId}`, {
        shippingDetailId,
        updateData: Object.keys(updateData)
      });

      return { success: true, data: result };
    } catch (error) {
      if (
        error.name === 'SequelizeForeignKeyConstraintError' &&
        error.parent?.constraint === 'orders_shippingDetailId_fkey'
      ) {
        logger.warn(
          `Foreign key constraint violation when updating shipping detail ${shippingDetailId}`,
          {
            error: error.message,
            shippingDetailId,
            constraint: error.parent.constraint
          }
        );

        return {
          success: false,
          error: 'FOREIGN_KEY_CONSTRAINT',
          message:
            'Cannot update shipping detail: it is referenced by orders that prevent the update'
        };
      }

      logger.error(
        `Error updating shipping detail ${shippingDetailId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Safely delete a shipping detail, handling foreign key constraints
   * @param {number} shippingDetailId - ID of the shipping detail to delete
   * @param {Object} options - Additional options (transaction, etc.)
   * @returns {Promise<Object>} - Delete result
   */
  async safeDelete(shippingDetailId, options = {}) {
    try {
      // Check if there are any orders referencing this shipping detail
      const referencingOrders = await Order.findAll({
        where: { shippingDetailId },
        attributes: ['id', 'orderNumber'],
        ...options
      });

      if (referencingOrders.length > 0) {
        logger.warn(
          `Cannot delete shipping detail ${shippingDetailId}: referenced by ${referencingOrders.length} orders`,
          {
            shippingDetailId,
            referencingOrders: referencingOrders.map((o) => ({
              id: o.id,
              orderNumber: o.orderNumber
            }))
          }
        );

        return {
          success: false,
          error: 'REFERENCED_BY_ORDERS',
          message: `Cannot delete shipping detail: it is referenced by ${referencingOrders.length} orders`,
          referencingOrders: referencingOrders.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber
          }))
        };
      }

      const deleteCount = await ShippingDetail.destroy({
        where: { id: shippingDetailId },
        ...options
      });

      if (deleteCount === 0) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: `ShippingDetail with ID ${shippingDetailId} not found`
        };
      }

      logger.info(`Successfully deleted shipping detail ${shippingDetailId}`);

      return { success: true, deletedCount: deleteCount };
    } catch (error) {
      if (
        error.name === 'SequelizeForeignKeyConstraintError' &&
        error.parent?.constraint === 'orders_shippingDetailId_fkey'
      ) {
        logger.warn(
          `Foreign key constraint violation when deleting shipping detail ${shippingDetailId}`,
          {
            error: error.message,
            shippingDetailId,
            constraint: error.parent.constraint
          }
        );

        return {
          success: false,
          error: 'FOREIGN_KEY_CONSTRAINT',
          message:
            'Cannot delete shipping detail: it is referenced by orders that prevent the deletion'
        };
      }

      logger.error(
        `Error deleting shipping detail ${shippingDetailId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Force delete a shipping detail by first nullifying references
   * @param {number} shippingDetailId - ID of the shipping detail to delete
   * @param {Object} options - Additional options (transaction, etc.)
   * @returns {Promise<Object>} - Delete result
   */
  async forceDelete(shippingDetailId, options = {}) {
    try {
      const transaction =
        options.transaction || (await sequelize.transaction());
      const shouldCommit = !options.transaction;

      try {
        // First, set shippingDetailId to null in all referencing orders
        const updateResult = await Order.update(
          { shippingDetailId: null },
          {
            where: { shippingDetailId },
            transaction,
            returning: true
          }
        );

        logger.info(
          `Nullified shippingDetailId in ${updateResult[0]} orders before deleting shipping detail ${shippingDetailId}`
        );

        // Now delete the shipping detail
        const deleteCount = await ShippingDetail.destroy({
          where: { id: shippingDetailId },
          transaction
        });

        if (shouldCommit) {
          await transaction.commit();
        }

        logger.info(
          `Force deleted shipping detail ${shippingDetailId}, updated ${updateResult[0]} orders`
        );

        return {
          success: true,
          deletedCount: deleteCount,
          updatedOrdersCount: updateResult[0]
        };
      } catch (error) {
        if (shouldCommit) {
          await transaction.rollback();
        }
        throw error;
      }
    } catch (error) {
      logger.error(
        `Error force deleting shipping detail ${shippingDetailId}:`,
        error
      );
      throw error;
    }
  }
}

module.exports = new ShippingDetailService();
