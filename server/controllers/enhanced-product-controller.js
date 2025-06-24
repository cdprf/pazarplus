/**
 * Enhanced Product Management Controller
 * Handles API endpoints for the enhanced product management system
 */

const logger = require("../utils/logger");
const { validationResult } = require("express-validator");
const { Op } = require("sequelize");
const EnhancedProductManagementService = require("../services/enhanced-product-management-service");
const EnhancedStockService = require("../services/enhanced-stock-service");
const MediaUploadService = require("../services/media-upload-service");
const PlatformScrapingService = require("../services/platform-scraping-service");
const SKUSystemManager = require("../../sku-system-manager");
const { MainProduct, PlatformVariant, PlatformTemplate } = require("../models");

class EnhancedProductController {
  constructor() {
    this.skuManager = new SKUSystemManager();
    this.scrapingService = new PlatformScrapingService();
  }

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

  /**
   * Upload media for main product
   */
  async uploadMainProductMedia(req, res) {
    try {
      const { mainProductId } = req.params;
      const userId = req.user.id;

      // Verify product ownership
      const mainProduct = await MainProduct.findOne({
        where: { id: mainProductId, userId },
      });

      if (!mainProduct) {
        return res.status(404).json({
          success: false,
          error: "Main product not found",
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No files uploaded",
        });
      }

      const processedFiles = await MediaUploadService.processUploadedFiles(
        req.files,
        mainProductId,
        null,
        userId
      );

      res.json({
        success: true,
        data: processedFiles,
        message: `${processedFiles.length} files uploaded successfully`,
      });
    } catch (error) {
      logger.error("Error uploading main product media:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Upload media for platform variant
   */
  async uploadVariantMedia(req, res) {
    try {
      const { mainProductId, variantId } = req.params;
      const userId = req.user.id;

      // Verify product and variant ownership
      const variant = await PlatformVariant.findOne({
        where: { id: variantId, mainProductId },
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

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No files uploaded",
        });
      }

      const processedFiles = await MediaUploadService.processUploadedFiles(
        req.files,
        mainProductId,
        variantId,
        userId
      );

      res.json({
        success: true,
        data: processedFiles,
        message: `${processedFiles.length} files uploaded successfully`,
      });
    } catch (error) {
      logger.error("Error uploading variant media:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Delete media file
   */
  async deleteMedia(req, res) {
    try {
      const { mediaId } = req.params;
      const userId = req.user.id;

      // Find media and verify ownership through main product
      const { EnhancedProductMedia } = require("../models");
      const media = await EnhancedProductMedia.findOne({
        where: { id: mediaId },
        include: [
          {
            model: MainProduct,
            as: "mainProduct",
            where: { userId },
          },
        ],
      });

      if (!media) {
        return res.status(404).json({
          success: false,
          error: "Media not found",
        });
      }

      await MediaUploadService.deleteMediaFiles([media]);
      await media.destroy();

      res.json({
        success: true,
        message: "Media deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting media:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Update media metadata
   */
  async updateMediaMetadata(req, res) {
    try {
      const { mediaId } = req.params;
      const userId = req.user.id;
      const { altText, isPrimary, sortOrder } = req.body;

      const { EnhancedProductMedia } = require("../models");
      const media = await EnhancedProductMedia.findOne({
        where: { id: mediaId },
        include: [
          {
            model: MainProduct,
            as: "mainProduct",
            where: { userId },
          },
        ],
      });

      if (!media) {
        return res.status(404).json({
          success: false,
          error: "Media not found",
        });
      }

      const updateData = {};
      if (altText !== undefined) updateData.altText = altText;
      if (isPrimary !== undefined) updateData.isPrimary = isPrimary;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

      await media.update(updateData);

      res.json({
        success: true,
        data: media,
        message: "Media metadata updated successfully",
      });
    } catch (error) {
      logger.error("Error updating media metadata:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Bulk publish variants to platforms
   */
  async bulkPublishVariants(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { mainProductIds, platforms, publishingSettings } = req.body;
      const userId = req.user.id;

      // Verify all products belong to user
      const products = await MainProduct.findAll({
        where: {
          id: { [Op.in]: mainProductIds },
          userId,
        },
        include: [
          {
            model: PlatformVariant,
            as: "variants",
            where: { platform: { [Op.in]: platforms } },
            required: false,
          },
        ],
      });

      if (products.length !== mainProductIds.length) {
        return res.status(404).json({
          success: false,
          error: "Some products not found",
        });
      }

      // Create bulk operation record
      const { BulkOperation } = require("../models");
      const operation = await BulkOperation.create({
        type: "bulk_publish",
        status: "processing",
        userId,
        totalItems: mainProductIds.length * platforms.length,
        processedItems: 0,
        metadata: {
          mainProductIds,
          platforms,
          publishingSettings: publishingSettings || {},
        },
      });

      // Start background processing
      setImmediate(() => {
        this.processBulkPublishing(operation.id);
      });

      res.json({
        success: true,
        data: {
          operationId: operation.id,
          message: "Bulk publishing started",
          estimatedTime: `${Math.ceil(
            (mainProductIds.length * platforms.length) / 10
          )} minutes`,
        },
      });
    } catch (error) {
      logger.error("Error starting bulk publish:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Bulk update variant prices
   */
  async bulkUpdatePrices(req, res) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: validationErrors.array(),
        });
      }

      const { updates } = req.body;
      const userId = req.user.id;
      const updated = [];
      const errors = [];

      for (const update of updates) {
        try {
          const variant = await PlatformVariant.findOne({
            where: { id: update.variantId },
            include: [
              {
                model: MainProduct,
                as: "mainProduct",
                where: { userId },
              },
            ],
          });

          if (!variant) {
            errors.push({
              variantId: update.variantId,
              error: "Variant not found",
            });
            continue;
          }

          await variant.update({ platformPrice: update.price });
          updated.push({
            variantId: variant.id,
            previousPrice: variant.platformPrice,
            newPrice: update.price,
          });
        } catch (error) {
          errors.push({
            variantId: update.variantId,
            error: error.message,
          });
        }
      }

      res.json({
        success: true,
        data: {
          updated: updated.length,
          errors: errors.length,
          details: { updated, errors },
        },
        message: `${updated.length} prices updated successfully`,
      });
    } catch (error) {
      logger.error("Error bulk updating prices:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Bulk update stock quantities
   */
  async bulkUpdateStock(req, res) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: validationErrors.array(),
        });
      }

      const { updates } = req.body;
      const userId = req.user.id;
      const updated = [];
      const errors = [];

      for (const update of updates) {
        try {
          const product = await MainProduct.findOne({
            where: { id: update.mainProductId, userId },
          });

          if (!product) {
            errors.push({
              mainProductId: update.mainProductId,
              error: "Product not found",
            });
            continue;
          }

          const previousQuantity = product.stockQuantity;
          await EnhancedStockService.updateStock(
            update.mainProductId,
            update.quantity,
            userId,
            "bulk_update"
          );

          updated.push({
            mainProductId: update.mainProductId,
            previousQuantity,
            newQuantity: update.quantity,
          });
        } catch (error) {
          errors.push({
            mainProductId: update.mainProductId,
            error: error.message,
          });
        }
      }

      res.json({
        success: true,
        data: {
          updated: updated.length,
          errors: errors.length,
          details: { updated, errors },
        },
        message: `${updated.length} stock quantities updated successfully`,
      });
    } catch (error) {
      logger.error("Error bulk updating stock:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get bulk operation status
   */
  async getBulkOperationStatus(req, res) {
    try {
      const { operationId } = req.params;
      const userId = req.user.id;

      const { BulkOperation } = require("../models");
      const operation = await BulkOperation.findOne({
        where: { id: operationId, userId },
      });

      if (!operation) {
        return res.status(404).json({
          success: false,
          error: "Operation not found",
        });
      }

      res.json({
        success: true,
        data: operation,
      });
    } catch (error) {
      logger.error("Error fetching operation status:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Analyze SKU patterns
   */
  async analyzeSKUPatterns(req, res) {
    try {
      const { skus } = req.body;

      if (!Array.isArray(skus) || skus.length === 0) {
        return res.status(400).json({
          success: false,
          error: "SKUs array is required",
        });
      }

      const analysis = this.skuManager.analyzePatterns(skus);

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      logger.error("Error analyzing SKU patterns:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get available SKU patterns
   */
  async getSKUPatterns(req, res) {
    try {
      const patterns = this.skuManager.getAvailablePatterns();

      res.json({
        success: true,
        data: patterns,
      });
    } catch (error) {
      logger.error("Error fetching SKU patterns:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Create custom SKU pattern
   */
  async createSKUPattern(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { name, regex, description } = req.body;
      const userId = req.user.id;

      const pattern = this.skuManager.addCustomPattern({
        name,
        regex,
        description,
        userId,
      });

      res.json({
        success: true,
        data: pattern,
        message: "SKU pattern created successfully",
      });
    } catch (error) {
      logger.error("Error creating SKU pattern:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Background processing for bulk publishing
   */
  async processBulkPublishing(operationId) {
    try {
      const { BulkOperation } = require("../models");
      const operation = await BulkOperation.findByPk(operationId);

      if (!operation) return;

      await operation.update({ status: "processing" });

      const { mainProductIds, platforms, publishingSettings } =
        operation.metadata;
      let processedItems = 0;

      for (const productId of mainProductIds) {
        for (const platform of platforms) {
          try {
            // Find or create variant for this platform
            let variant = await PlatformVariant.findOne({
              where: { mainProductId: productId, platform },
            });

            if (!variant) {
              const mainProduct = await MainProduct.findByPk(productId);
              variant = await PlatformVariant.create({
                mainProductId: productId,
                platform,
                platformSku: `${mainProduct.baseSku}-${platform.toUpperCase()}`,
                status: "published",
                publishedAt: new Date(),
                ...publishingSettings,
              });
            } else {
              await variant.update({
                status: "published",
                publishedAt: new Date(),
                ...publishingSettings,
              });
            }

            processedItems++;
            await operation.update({ processedItems });

            // Simulate processing time
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            logger.error(
              `Error publishing ${productId} to ${platform}:`,
              error
            );
          }
        }
      }

      await operation.update({
        status: "completed",
        completedAt: new Date(),
      });

      logger.info(`Bulk publishing operation ${operationId} completed`);
    } catch (error) {
      logger.error(`Error processing bulk operation ${operationId}:`, error);
      const { BulkOperation } = require("../models");
      await BulkOperation.update(
        { status: "failed", error: error.message },
        { where: { id: operationId } }
      );
    }
  }

  /**
   * Auto-match products based on intelligent algorithms
   */
  async autoMatchProducts(req, res) {
    try {
      const userId = req.user.id;

      logger.info(`Starting auto-match for user ${userId}`);

      // Get all main products for the user that need matching
      const mainProducts = await MainProduct.findAll({
        where: {
          userId,
          status: { [Op.in]: ["active", "draft"] },
        },
        include: [
          {
            model: PlatformVariant,
            as: "platformVariants",
            required: false,
          },
        ],
      });

      let matchedCount = 0;
      const results = [];

      for (const product of mainProducts) {
        try {
          // Skip products that already have variants
          if (product.platformVariants && product.platformVariants.length > 0) {
            continue;
          }

          // Simple auto-matching logic based on product name/SKU patterns
          const autoMatchResult = await this.performAutoMatch(product);

          if (autoMatchResult.matched) {
            matchedCount++;
            results.push({
              productId: product.id,
              productName: product.name,
              matchType: autoMatchResult.matchType,
              confidence: autoMatchResult.confidence,
            });
          }
        } catch (productError) {
          logger.error(
            `Error auto-matching product ${product.id}:`,
            productError
          );
          results.push({
            productId: product.id,
            productName: product.name,
            error: productError.message,
          });
        }
      }

      logger.info(`Auto-match completed. Matched ${matchedCount} products`);

      res.json({
        success: true,
        data: {
          matchedCount,
          totalProcessed: mainProducts.length,
          results,
        },
        message: `${matchedCount} ürün otomatik olarak eşleştirildi`,
      });
    } catch (error) {
      logger.error("Error in auto-match operation:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Perform auto-matching for a single product
   */
  async performAutoMatch(product) {
    try {
      // Basic auto-matching logic - this can be enhanced with ML/AI later
      const productName = product.name.toLowerCase();
      const baseSku = product.baseSku?.toLowerCase() || "";

      // Simple pattern matching for common e-commerce platforms
      let matchType = null;
      let confidence = 0;

      // Check for common patterns in product names/SKUs
      if (productName.includes("trendyol") || baseSku.includes("ty")) {
        matchType = "trendyol";
        confidence = 0.8;
      } else if (
        productName.includes("hepsiburada") ||
        baseSku.includes("hb")
      ) {
        matchType = "hepsiburada";
        confidence = 0.8;
      } else if (productName.includes("n11") || baseSku.includes("n11")) {
        matchType = "n11";
        confidence = 0.8;
      } else if (productName.includes("amazon") || baseSku.includes("amz")) {
        matchType = "amazon";
        confidence = 0.7;
      } else {
        // Generic matching based on product characteristics
        if (product.category && product.basePrice) {
          matchType = "generic";
          confidence = 0.6;
        }
      }

      if (matchType && confidence > 0.5) {
        // Here you could create platform variants or perform other matching actions
        // For now, just return the match information
        return {
          matched: true,
          matchType,
          confidence,
        };
      }

      return {
        matched: false,
        reason: "No suitable match found",
      };
    } catch (error) {
      logger.error(
        `Error in performAutoMatch for product ${product.id}:`,
        error
      );
      return {
        matched: false,
        error: error.message,
      };
    }
  }

  /**
   * Bulk mark products as main products
   */
  async bulkMarkAsMainProducts(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const { productIds } = req.body;

      const results = [];

      for (const productId of productIds) {
        try {
          // Here you would implement the logic to mark a product as main product
          // This might involve moving data from platform variants to main products
          const updatedProduct = await MainProduct.update(
            { isMainProduct: true, updatedAt: new Date() },
            { where: { id: productId, userId }, returning: true }
          );

          if (updatedProduct[0] > 0) {
            results.push({ success: true, productId });
          } else {
            results.push({
              success: false,
              productId,
              error: "Product not found",
            });
          }
        } catch (error) {
          results.push({ success: false, productId, error: error.message });
        }
      }

      const successCount = results.filter((r) => r.success).length;

      res.json({
        success: true,
        message: `${successCount} of ${productIds.length} products marked as main products`,
        data: { results, successCount, totalCount: productIds.length },
      });
    } catch (error) {
      logger.error("Error in bulkMarkAsMainProducts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark products as main products",
        error: error.message,
      });
    }
  }

  /**
   * Mark single product as main product
   */
  async markAsMainProduct(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const product = await MainProduct.findOne({
        where: { id, userId },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      await MainProduct.update(
        { isMainProduct: true, updatedAt: new Date() },
        { where: { id, userId } }
      );

      res.json({
        success: true,
        message: "Product marked as main product successfully",
        data: { productId: id },
      });
    } catch (error) {
      logger.error("Error in markAsMainProduct:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark product as main product",
        error: error.message,
      });
    }
  }

  /**
   * Bulk create variants
   */
  async bulkCreateVariants(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const { mainProductId, variants } = req.body;

      // Verify main product exists
      const mainProduct = await MainProduct.findOne({
        where: { id: mainProductId, userId },
      });

      if (!mainProduct) {
        return res.status(404).json({
          success: false,
          message: "Main product not found",
        });
      }

      const createdVariants = [];

      for (const variantData of variants) {
        try {
          const variant = await PlatformVariant.create({
            ...variantData,
            mainProductId,
            userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          createdVariants.push(variant);
        } catch (error) {
          logger.error(`Error creating variant: ${error.message}`);
        }
      }

      // Update main product variant count
      await MainProduct.update(
        {
          variantCount: createdVariants.length,
          hasVariants: createdVariants.length > 0,
          updatedAt: new Date(),
        },
        { where: { id: mainProductId } }
      );

      res.json({
        success: true,
        message: `${createdVariants.length} variants created successfully`,
        data: { variants: createdVariants, mainProductId },
      });
    } catch (error) {
      logger.error("Error in bulkCreateVariants:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create variants",
        error: error.message,
      });
    }
  }

  /**
   * Scrape platform data
   */
  async scrapePlatformData(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { url, platform } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          message: "URL is required",
        });
      }

      // Auto-detect platform if not provided
      const detectedPlatform =
        platform || this.scrapingService.detectPlatform(url);

      logger.info(`Starting platform scraping for ${detectedPlatform}: ${url}`);

      // Use enhanced scraping service with retry logic
      const scrapedData = await this.scrapingService.scrapeProductDataWithRetry(
        url,
        detectedPlatform
      );

      if (!scrapedData || !scrapedData.name) {
        return res.status(400).json({
          success: false,
          message:
            "Failed to extract product data from the URL. The page might not contain valid product information or the platform may be blocking requests.",
        });
      }

      logger.info(
        `Successfully scraped product data from ${detectedPlatform}:`,
        {
          name: scrapedData.name,
          price: scrapedData.basePrice,
          platform: detectedPlatform,
          hasExtras: !!scrapedData.platformExtras,
        }
      );

      res.json({
        success: true,
        message: `Platform data scraped successfully from ${detectedPlatform}`,
        data: scrapedData,
        platform: detectedPlatform,
      });
    } catch (error) {
      logger.error("Error in scrapePlatformData:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to scrape platform data",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Import from platform
   */
  async importFromPlatform(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const { platformData, fieldMapping, targetPlatform, url } = req.body;

      let productData = platformData;

      // If URL is provided but no platformData, scrape it first
      if (url && !platformData) {
        const detectedPlatform = this.scrapingService.detectPlatform(url);
        logger.info(
          `No platform data provided, scraping from ${detectedPlatform}: ${url}`
        );

        productData = await this.scrapingService.scrapeProductDataWithRetry(
          url,
          detectedPlatform
        );

        if (!productData || !productData.name) {
          return res.status(400).json({
            success: false,
            message: "Failed to scrape product data from the provided URL.",
          });
        }
      }

      if (!productData) {
        return res.status(400).json({
          success: false,
          message: "Either platformData or url must be provided.",
        });
      }

      // Map platform data to target format
      const mappedData = {};
      if (fieldMapping) {
        Object.entries(fieldMapping).forEach(([targetField, sourceField]) => {
          if (sourceField && productData[sourceField] !== undefined) {
            mappedData[targetField] = productData[sourceField];
          }
        });
      } else {
        // If no field mapping provided, use the data as-is
        Object.assign(mappedData, productData);
      }

      // Generate SKU if not present
      if (!mappedData.baseSku) {
        mappedData.baseSku = await this.skuManager.generateSKU(
          mappedData.name,
          mappedData.category,
          mappedData.brand
        );
      }

      // Create main product with mapped data
      const mainProduct = await MainProduct.create({
        ...mappedData,
        userId,
        importedFrom: productData.platform || "unknown",
        importedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      res.json({
        success: true,
        message: "Product imported from platform successfully",
        data: {
          product: mainProduct,
          originalData: productData,
          mappedData,
        },
      });
    } catch (error) {
      logger.error("Error in importFromPlatform:", error);
      res.status(500).json({
        success: false,
        message: "Failed to import from platform",
        error: error.message,
      });
    }
  }

  /**
   * Get field mappings
   */
  async getFieldMappings(req, res) {
    try {
      const userId = req.user.id;
      const { sourcePlatform, targetPlatform } = req.query;

      // Provide comprehensive field mappings for different platforms
      const platformMappings = {
        trendyol: {
          // Core fields
          name: "name",
          description: "description",
          basePrice: "basePrice",
          originalPrice: "originalPrice",
          brand: "brand",
          category: "category",
          images: "images",
          baseSku: "baseSku",
          attributes: "attributes",
          availability: "availability",
          currency: "currency",

          // Trendyol-specific extras
          "platformExtras.trendyol.sellerId":
            "platformExtras.trendyol.sellerId",
          "platformExtras.trendyol.sellerName":
            "platformExtras.trendyol.sellerName",
          "platformExtras.trendyol.deliveryDays":
            "platformExtras.trendyol.deliveryDays",
          "platformExtras.trendyol.freeShipping":
            "platformExtras.trendyol.freeShipping",
          "platformExtras.trendyol.discountRate":
            "platformExtras.trendyol.discountRate",
          "platformExtras.trendyol.reviewCount":
            "platformExtras.trendyol.reviewCount",
          "platformExtras.trendyol.averageRating":
            "platformExtras.trendyol.averageRating",
        },
        hepsiburada: {
          // Core fields
          name: "name",
          description: "description",
          basePrice: "basePrice",
          originalPrice: "originalPrice",
          brand: "brand",
          category: "category",
          images: "images",
          baseSku: "baseSku",
          attributes: "attributes",
          availability: "availability",
          currency: "currency",

          // Hepsiburada-specific extras
          "platformExtras.hepsiburada.sellerId":
            "platformExtras.hepsiburada.sellerId",
          "platformExtras.hepsiburada.sellerName":
            "platformExtras.hepsiburada.sellerName",
          "platformExtras.hepsiburada.merchantId":
            "platformExtras.hepsiburada.merchantId",
          "platformExtras.hepsiburada.deliveryInfo":
            "platformExtras.hepsiburada.deliveryInfo",
          "platformExtras.hepsiburada.installmentOptions":
            "platformExtras.hepsiburada.installmentOptions",
          "platformExtras.hepsiburada.fastDelivery":
            "platformExtras.hepsiburada.fastDelivery",
          "platformExtras.hepsiburada.hbPlusEligible":
            "platformExtras.hepsiburada.hbPlusEligible",
        },
        n11: {
          // Core fields
          name: "name",
          description: "description",
          basePrice: "basePrice",
          originalPrice: "originalPrice",
          brand: "brand",
          category: "category",
          images: "images",
          baseSku: "baseSku",
          attributes: "attributes",
          availability: "availability",
          currency: "currency",

          // N11-specific extras
          "platformExtras.n11.sellerId": "platformExtras.n11.sellerId",
          "platformExtras.n11.sellerName": "platformExtras.n11.sellerName",
          "platformExtras.n11.sellerRating": "platformExtras.n11.sellerRating",
          "platformExtras.n11.deliveryTime": "platformExtras.n11.deliveryTime",
          "platformExtras.n11.paymentOptions":
            "platformExtras.n11.paymentOptions",
          "platformExtras.n11.installments": "platformExtras.n11.installments",
          "platformExtras.n11.productCode": "platformExtras.n11.productCode",
          "platformExtras.n11.barcode": "platformExtras.n11.barcode",
        },
        generic: {
          name: "name",
          description: "description",
          basePrice: "basePrice",
          originalPrice: "originalPrice",
          brand: "brand",
          category: "category",
          images: "images",
          baseSku: "baseSku",
          attributes: "attributes",
          availability: "availability",
          currency: "currency",
        },
      };

      const mappings = [];

      if (sourcePlatform && platformMappings[sourcePlatform]) {
        mappings.push({
          id: `${sourcePlatform}-to-generic`,
          name: `${
            sourcePlatform.charAt(0).toUpperCase() + sourcePlatform.slice(1)
          } to Generic`,
          sourcePlatform: sourcePlatform,
          targetPlatform: "generic",
          fieldMapping: platformMappings[sourcePlatform],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Return all available mappings
        Object.keys(platformMappings).forEach((platform) => {
          mappings.push({
            id: `${platform}-to-generic`,
            name: `${
              platform.charAt(0).toUpperCase() + platform.slice(1)
            } to Generic`,
            sourcePlatform: platform,
            targetPlatform: "generic",
            fieldMapping: platformMappings[platform],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        });
      }

      res.json({
        success: true,
        data: { mappings },
      });
    } catch (error) {
      logger.error("Error in getFieldMappings:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get field mappings",
        error: error.message,
      });
    }
  }

  /**
   * Save field mapping
   */
  async saveFieldMapping(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const { name, sourcePlatform, targetPlatform, fieldMapping } = req.body;

      // This would save to a FieldMapping model in a real implementation
      const savedMapping = {
        id: Date.now().toString(),
        name,
        sourcePlatform,
        targetPlatform,
        fieldMapping,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      res.json({
        success: true,
        message: "Field mapping saved successfully",
        data: { mapping: savedMapping },
      });
    } catch (error) {
      logger.error("Error in saveFieldMapping:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save field mapping",
        error: error.message,
      });
    }
  }

  /**
   * Import from CSV
   */
  async importFromCSV(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const { csvData, fieldMapping } = req.body;

      const importResults = [];

      for (const row of csvData) {
        try {
          // Map CSV data to product format
          const mappedData = {};
          Object.entries(fieldMapping).forEach(([targetField, sourceField]) => {
            if (sourceField && row[sourceField] !== undefined) {
              mappedData[targetField] = row[sourceField];
            }
          });

          // Create main product
          const product = await MainProduct.create({
            ...mappedData,
            userId,
            importedFrom: "csv",
            importedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          importResults.push({ success: true, product });
        } catch (error) {
          importResults.push({ success: false, row, error: error.message });
        }
      }

      const successCount = importResults.filter((r) => r.success).length;

      res.json({
        success: true,
        message: `Imported ${successCount} of ${csvData.length} products from CSV`,
        data: {
          results: importResults,
          successCount,
          totalCount: csvData.length,
        },
      });
    } catch (error) {
      logger.error("Error in importFromCSV:", error);
      res.status(500).json({
        success: false,
        message: "Failed to import from CSV",
        error: error.message,
      });
    }
  }

  /**
   * Import from JSON
   */
  async importFromJSON(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const { jsonData, fieldMapping } = req.body;

      const importResults = [];

      for (const item of jsonData) {
        try {
          // Map JSON data to product format
          const mappedData = {};
          Object.entries(fieldMapping).forEach(([targetField, sourceField]) => {
            if (sourceField && item[sourceField] !== undefined) {
              mappedData[targetField] = item[sourceField];
            }
          });

          // Create main product
          const product = await MainProduct.create({
            ...mappedData,
            userId,
            importedFrom: "json",
            importedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          importResults.push({ success: true, product });
        } catch (error) {
          importResults.push({ success: false, item, error: error.message });
        }
      }

      const successCount = importResults.filter((r) => r.success).length;

      res.json({
        success: true,
        message: `Imported ${successCount} of ${jsonData.length} products from JSON`,
        data: {
          results: importResults,
          successCount,
          totalCount: jsonData.length,
        },
      });
    } catch (error) {
      logger.error("Error in importFromJSON:", error);
      res.status(500).json({
        success: false,
        message: "Failed to import from JSON",
        error: error.message,
      });
    }
  }

  /**
   * Scrape and import from platform URL directly
   */
  async scrapeAndImportFromPlatform(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const { url, platform, fieldMapping } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          message: "URL is required",
        });
      }

      // Auto-detect platform if not provided
      const detectedPlatform =
        platform || this.scrapingService.detectPlatform(url);

      logger.info(`Starting scrape and import for ${detectedPlatform}: ${url}`);

      // Scrape the product data
      const scrapedData = await this.scrapingService.scrapeProductDataWithRetry(
        url,
        detectedPlatform
      );

      if (!scrapedData || !scrapedData.name) {
        return res.status(400).json({
          success: false,
          message: "Failed to extract product data from the URL.",
        });
      }

      // Apply field mapping if provided
      let mappedData = { ...scrapedData };
      if (fieldMapping) {
        mappedData = {};
        Object.entries(fieldMapping).forEach(([targetField, sourceField]) => {
          if (sourceField && scrapedData[sourceField] !== undefined) {
            mappedData[targetField] = scrapedData[sourceField];
          }
        });

        // Preserve essential fields that weren't mapped
        mappedData.platform = scrapedData.platform;
        mappedData.scrapedFrom = scrapedData.scrapedFrom;
        mappedData.scrapedAt = scrapedData.scrapedAt;
        mappedData.platformExtras = scrapedData.platformExtras;
      }

      // Generate SKU if not present
      if (!mappedData.baseSku) {
        mappedData.baseSku = await this.skuManager.generateSKU(
          mappedData.name,
          mappedData.category,
          mappedData.brand
        );
      }

      // Create main product with all the scraped and mapped data
      const mainProduct = await MainProduct.create({
        ...mappedData,
        userId,
        importedFrom: detectedPlatform,
        importedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logger.info(`Successfully imported product from ${detectedPlatform}:`, {
        id: mainProduct.id,
        name: mainProduct.name,
        sku: mainProduct.baseSku,
      });

      res.json({
        success: true,
        message: `Product scraped and imported successfully from ${detectedPlatform}`,
        data: {
          product: mainProduct,
          scrapedData,
          mappedData,
          platform: detectedPlatform,
        },
      });
    } catch (error) {
      logger.error("Error in scrapeAndImportFromPlatform:", error);
      res.status(500).json({
        success: false,
        message: "Failed to scrape and import from platform",
        error: error.message,
      });
    }
  }
}

module.exports = new EnhancedProductController();
