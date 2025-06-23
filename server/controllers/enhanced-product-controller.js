/**
 * Enhanced Product Management Controller
 * Handles API endpoints for the enhanced product management system
 */

const logger = require("../utils/logger");
const { validationResult } = require("express-validator");
const { Op } = require("sequelize");
const EnhancedProductManagementService = require("../services/enhanced-product-management-service");
const EnhancedStockService = require("../services/enhanced-stock-service");
const { MainProduct, PlatformVariant, PlatformTemplate } = require("../models");

class EnhancedProductController {
  /**
   * Get all main products for user
   */
  async getMainProducts(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        search,
        category,
        status,
        hasVariants,
        sortBy = "updatedAt",
        sortOrder = "DESC",
      } = req.query;

      const offset = (page - 1) * limit;
      const where = { userId };

      // Add filters
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { baseSku: { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (category) where.category = category;
      if (status) where.status = status;
      if (hasVariants !== undefined) where.hasVariants = hasVariants === "true";

      const { rows: products, count: total } =
        await MainProduct.findAndCountAll({
          where,
          include: [
            {
              model: PlatformVariant,
              as: "platformVariants",
              required: false,
              attributes: ["id", "platform", "isPublished", "syncStatus"],
            },
          ],
          limit: parseInt(limit),
          offset,
          order: [[sortBy, sortOrder.toUpperCase()]],
        });

      // Add stock status for each product
      const productsWithStock = await Promise.all(
        products.map(async (product) => {
          const stockStatus = await EnhancedStockService.getStockStatus(
            product.id
          );
          return {
            ...product.toJSON(),
            stockStatus,
            variantCount: product.platformVariants.length,
            publishedVariants: product.platformVariants.filter(
              (v) => v.isPublished
            ).length,
          };
        })
      );

      res.json({
        success: true,
        data: {
          products: productsWithStock,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / limit),
            totalRecords: total,
            hasNext: offset + limit < total,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      logger.error("Error getting main products:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get single main product with all variants
   */
  async getMainProduct(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const product =
        await EnhancedProductManagementService.getProductWithVariants(
          id,
          userId
        );

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      logger.error("Error getting main product:", error);
      res.status(error.message.includes("not found") ? 404 : 500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Create new main product
   */
  async createMainProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const productData = req.body;

      const mainProduct =
        await EnhancedProductManagementService.createMainProduct(
          productData,
          userId
        );

      res.status(201).json({
        success: true,
        data: mainProduct,
        message: "Main product created successfully",
      });
    } catch (error) {
      logger.error("Error creating main product:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Update main product
   */
  async updateMainProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const { id } = req.params;
      const updateData = req.body;

      const mainProduct = await MainProduct.findOne({
        where: { id, userId },
      });

      if (!mainProduct) {
        return res.status(404).json({
          success: false,
          error: "Main product not found",
        });
      }

      await mainProduct.update(updateData);

      // Get updated product with variants
      const updatedProduct =
        await EnhancedProductManagementService.getProductWithVariants(
          id,
          userId
        );

      res.json({
        success: true,
        data: updatedProduct,
        message: "Main product updated successfully",
      });
    } catch (error) {
      logger.error("Error updating main product:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Delete main product
   */
  async deleteMainProduct(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const mainProduct = await MainProduct.findOne({
        where: { id, userId },
        include: [
          {
            model: PlatformVariant,
            as: "platformVariants",
          },
        ],
      });

      if (!mainProduct) {
        return res.status(404).json({
          success: false,
          error: "Main product not found",
        });
      }

      // Check if product has published variants
      const publishedVariants = mainProduct.platformVariants.filter(
        (v) => v.isPublished
      );
      if (publishedVariants.length > 0) {
        return res.status(400).json({
          success: false,
          error:
            "Cannot delete product with published variants. Unpublish variants first.",
          publishedVariants: publishedVariants.map((v) => ({
            platform: v.platform,
            platformSku: v.platformSku,
          })),
        });
      }

      await mainProduct.destroy();

      res.json({
        success: true,
        message: "Main product deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting main product:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Create platform variant
   */
  async createPlatformVariant(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const { mainProductId } = req.params;
      const variantData = req.body;

      const variant =
        await EnhancedProductManagementService.createPlatformVariant(
          mainProductId,
          variantData,
          userId
        );

      res.status(201).json({
        success: true,
        data: variant,
        message: "Platform variant created successfully",
      });
    } catch (error) {
      logger.error("Error creating platform variant:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Update platform variant
   */
  async updatePlatformVariant(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const { variantId } = req.params;
      const updateData = req.body;

      const variant = await PlatformVariant.findOne({
        where: { id: variantId },
        include: [
          {
            model: MainProduct,
            as: "mainProduct",
            where: { userId },
          },
        ],
      });

      if (!variant) {
        return res.status(404).json({
          success: false,
          error: "Platform variant not found",
        });
      }

      await variant.update(updateData);

      res.json({
        success: true,
        data: variant,
        message: "Platform variant updated successfully",
      });
    } catch (error) {
      logger.error("Error updating platform variant:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Delete platform variant
   */
  async deletePlatformVariant(req, res) {
    try {
      const userId = req.user.id;
      const { variantId } = req.params;

      const variant = await PlatformVariant.findOne({
        where: { id: variantId },
        include: [
          {
            model: MainProduct,
            as: "mainProduct",
            where: { userId },
          },
        ],
      });

      if (!variant) {
        return res.status(404).json({
          success: false,
          error: "Platform variant not found",
        });
      }

      if (variant.isPublished) {
        return res.status(400).json({
          success: false,
          error: "Cannot delete published variant. Unpublish first.",
        });
      }

      await variant.destroy();

      res.json({
        success: true,
        message: "Platform variant deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting platform variant:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get stock status for main product
   */
  async getStockStatus(req, res) {
    try {
      const { id } = req.params;
      const stockStatus = await EnhancedStockService.getStockStatus(id);

      res.json({
        success: true,
        data: stockStatus,
      });
    } catch (error) {
      logger.error("Error getting stock status:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Update stock quantity
   */
  async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { quantity, reason = "Manual update" } = req.body;
      const userId = req.user.id;

      if (typeof quantity !== "number" || quantity < 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid quantity provided",
        });
      }

      const stockStatus = await EnhancedStockService.updateStock(
        id,
        quantity,
        reason,
        userId
      );

      res.json({
        success: true,
        data: stockStatus,
        message: "Stock updated successfully",
      });
    } catch (error) {
      logger.error("Error updating stock:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Reserve stock
   */
  async reserveStock(req, res) {
    try {
      const { id } = req.params;
      const { quantity, reason = "Order reservation", expiresAt } = req.body;

      if (typeof quantity !== "number" || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid quantity provided",
        });
      }

      const reservation = await EnhancedStockService.reserveStock(
        id,
        quantity,
        reason,
        expiresAt ? new Date(expiresAt) : null
      );

      res.json({
        success: true,
        data: reservation,
        message: "Stock reserved successfully",
      });
    } catch (error) {
      logger.error("Error reserving stock:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Release stock reservation
   */
  async releaseReservation(req, res) {
    try {
      const { reservationId } = req.params;
      const { reason = "Manual release" } = req.body;

      const stockStatus = await EnhancedStockService.releaseReservation(
        reservationId,
        reason
      );

      res.json({
        success: true,
        data: stockStatus,
        message: "Reservation released successfully",
      });
    } catch (error) {
      logger.error("Error releasing reservation:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get stock history
   */
  async getStockHistory(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const offset = (page - 1) * limit;
      const history = await EnhancedStockService.getStockHistory(
        id,
        parseInt(limit),
        offset
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error("Error getting stock history:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Publish product to platforms
   */
  async publishToPlatforms(req, res) {
    try {
      const { id } = req.params;
      const { platforms } = req.body;

      if (!Array.isArray(platforms) || platforms.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Platforms array is required",
        });
      }

      const results = await EnhancedProductManagementService.publishToPlatforms(
        id,
        platforms
      );

      res.json({
        success: true,
        data: results,
        message: "Product publishing initiated",
      });
    } catch (error) {
      logger.error("Error publishing to platforms:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Bulk operations on multiple products
   */
  async bulkOperation(req, res) {
    try {
      const { operation, productIds, operationData } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Product IDs array is required",
        });
      }

      if (!["publish", "updatePrice", "updateStock"].includes(operation)) {
        return res.status(400).json({
          success: false,
          error: "Invalid operation",
        });
      }

      const results = await EnhancedProductManagementService.bulkOperation(
        operation,
        productIds,
        operationData,
        userId
      );

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;

      res.json({
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: failureCount,
          },
        },
        message: `Bulk operation completed: ${successCount} successful, ${failureCount} failed`,
      });
    } catch (error) {
      logger.error("Error in bulk operation:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Match synced product to existing products
   */
  async matchSyncedProduct(req, res) {
    try {
      const { syncedProduct } = req.body;
      const userId = req.user.id;

      if (!syncedProduct || !syncedProduct.sku) {
        return res.status(400).json({
          success: false,
          error: "Synced product with SKU is required",
        });
      }

      const matchResult =
        await EnhancedProductManagementService.matchSyncedProduct(
          syncedProduct,
          userId
        );

      res.json({
        success: true,
        data: matchResult,
      });
    } catch (error) {
      logger.error("Error matching synced product:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Create main product from synced data
   */
  async createFromSync(req, res) {
    try {
      const { syncedProduct, platformInfo } = req.body;
      const userId = req.user.id;

      if (!syncedProduct || !platformInfo) {
        return res.status(400).json({
          success: false,
          error: "Synced product and platform info are required",
        });
      }

      const result =
        await EnhancedProductManagementService.createMainProductFromSync(
          syncedProduct,
          userId,
          platformInfo
        );

      res.status(201).json({
        success: true,
        data: result,
        message: "Product created from sync successfully",
      });
    } catch (error) {
      logger.error("Error creating from sync:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get available platform templates
   */
  async getPlatformTemplates(req, res) {
    try {
      const userId = req.user.id;
      const { platform, category } = req.query;

      const where = { userId, isActive: true };
      if (platform) where.platform = platform;
      if (category) where.category = category;

      const templates = await PlatformTemplate.findAll({
        where,
        order: [
          ["successRate", "DESC"],
          ["usageCount", "DESC"],
        ],
      });

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      logger.error("Error getting platform templates:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Create or update platform template
   */
  async savePlatformTemplate(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const templateData = { ...req.body, userId };

      let template;
      if (templateData.id) {
        template = await PlatformTemplate.findOne({
          where: { id: templateData.id, userId },
        });

        if (!template) {
          return res.status(404).json({
            success: false,
            error: "Template not found",
          });
        }

        await template.update(templateData);
      } else {
        template = await PlatformTemplate.create(templateData);
      }

      res.json({
        success: true,
        data: template,
        message: templateData.id
          ? "Template updated successfully"
          : "Template created successfully",
      });
    } catch (error) {
      logger.error("Error saving platform template:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new EnhancedProductController();
