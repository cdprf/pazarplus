/**
 * QNB Finans Invoice Controller
 * Handles e-invoice and e-archive generation using QNB Finans e-solutions API
 */

const { Order, User, Settings } = require("../models");
const qnbFinansService = require("../services/qnbFinansService");
const logger = require("../utils/logger");

class QNBFinansInvoiceController {
  /**
   * Generate e-invoice for an order
   */
  async generateEInvoice(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      // Get order
      const order = await Order.findOne({
        where: { id: orderId, userId },
        include: [{ model: require("../models").OrderItem, as: "items" }],
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Get QNB Finans configuration
      const qnbConfig = await this.getQNBFinansConfig(userId);
      if (!qnbConfig) {
        return res.status(400).json({
          success: false,
          message:
            "QNB Finans configuration not found. Please configure your QNB Finans settings first.",
        });
      }

      // Generate e-invoice
      const result = await qnbFinansService.generateEInvoice(order, qnbConfig);

      if (result.success) {
        // Update order with invoice information
        await order.update({
          invoicePrinted: true,
          invoicePrintedAt: new Date(),
          invoiceNumber: result.data.invoiceNumber,
          invoiceProvider: "qnb_finans",
          invoiceMetadata: JSON.stringify(result.data),
        });

        logger.info(`E-invoice generated successfully for order ${orderId}`, {
          orderId,
          invoiceNumber: result.data.invoiceNumber,
          userId,
        });
      }

      res.json(result);
    } catch (error) {
      logger.error("Error generating QNB Finans e-invoice:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate e-invoice",
        error: error.message,
      });
    }
  }

  /**
   * Generate e-archive for an order
   */
  async generateEArchive(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      // Get order
      const order = await Order.findOne({
        where: { id: orderId, userId },
        include: [{ model: require("../models").OrderItem, as: "items" }],
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Get QNB Finans configuration
      const qnbConfig = await this.getQNBFinansConfig(userId);
      if (!qnbConfig) {
        return res.status(400).json({
          success: false,
          message:
            "QNB Finans configuration not found. Please configure your QNB Finans settings first.",
        });
      }

      // Generate e-archive
      const result = await qnbFinansService.generateEArchive(order, qnbConfig);

      if (result.success) {
        // Update order with archive information
        await order.update({
          invoicePrinted: true,
          invoicePrintedAt: new Date(),
          invoiceNumber: result.data.archiveNumber,
          invoiceProvider: "qnb_finans_archive",
          invoiceMetadata: JSON.stringify(result.data),
        });

        logger.info(`E-archive generated successfully for order ${orderId}`, {
          orderId,
          archiveNumber: result.data.archiveNumber,
          userId,
        });
      }

      res.json(result);
    } catch (error) {
      logger.error("Error generating QNB Finans e-archive:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate e-archive",
        error: error.message,
      });
    }
  }

  /**
   * Get invoice status
   */
  async getInvoiceStatus(req, res) {
    try {
      const { invoiceId } = req.params;
      const userId = req.user.id;

      // Get QNB Finans configuration
      const qnbConfig = await this.getQNBFinansConfig(userId);
      if (!qnbConfig) {
        return res.status(400).json({
          success: false,
          message: "QNB Finans configuration not found",
        });
      }

      const result = await qnbFinansService.getInvoiceStatus(
        invoiceId,
        qnbConfig
      );
      res.json(result);
    } catch (error) {
      logger.error("Error getting QNB Finans invoice status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get invoice status",
        error: error.message,
      });
    }
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(req, res) {
    try {
      const { invoiceId } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      // Get QNB Finans configuration
      const qnbConfig = await this.getQNBFinansConfig(userId);
      if (!qnbConfig) {
        return res.status(400).json({
          success: false,
          message: "QNB Finans configuration not found",
        });
      }

      const result = await qnbFinansService.cancelInvoice(
        invoiceId,
        qnbConfig,
        reason
      );
      res.json(result);
    } catch (error) {
      logger.error("Error cancelling QNB Finans invoice:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cancel invoice",
        error: error.message,
      });
    }
  }

  /**
   * Test QNB Finans connection
   */
  async testConnection(req, res) {
    try {
      const userId = req.user.id;

      // Get QNB Finans configuration
      const qnbConfig = await this.getQNBFinansConfig(userId);
      if (!qnbConfig) {
        return res.status(400).json({
          success: false,
          message: "QNB Finans configuration not found",
        });
      }

      const result = await qnbFinansService.testConnection(qnbConfig);
      res.json(result);
    } catch (error) {
      logger.error("Error testing QNB Finans connection:", error);
      res.status(500).json({
        success: false,
        message: "Failed to test connection",
        error: error.message,
      });
    }
  }

  /**
   * Get QNB Finans configuration for a user
   * @param {number} userId - User ID
   * @returns {Object|null} QNB Finans configuration
   */
  async getQNBFinansConfig(userId) {
    try {
      // Get QNB Finans settings
      const qnbSettings = await Settings.findOne({
        where: {
          userId,
          category: "qnb_finans",
        },
      });

      // Get company settings
      const companySettings = await Settings.findOne({
        where: {
          userId,
          category: "company",
        },
      });

      if (!qnbSettings) {
        return null;
      }

      const qnbConfig = qnbSettings.value ? JSON.parse(qnbSettings.value) : {};
      const companyInfo = companySettings
        ? {
            companyName: companySettings.name,
            address: companySettings.address,
            phone: companySettings.phone,
            email: companySettings.email,
            taxNumber: companySettings.taxNumber,
            taxOffice: companySettings.taxOffice,
            city: companySettings.city,
            postalCode: companySettings.postalCode,
          }
        : {};

      return {
        ...qnbConfig,
        companyInfo,
      };
    } catch (error) {
      logger.error("Error getting QNB Finans config:", error);
      return null;
    }
  }
}

module.exports = new QNBFinansInvoiceController();
