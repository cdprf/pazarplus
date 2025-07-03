const { validationResult } = require("express-validator");
const {
  PlatformVariant,
  MainProduct,
  PlatformCategory,
  Product,
} = require("../models");
const PlatformFieldService = require("../services/platform-field-service");
const logger = require("../utils/logger");

class PlatformVariantController {
  /**
   * Get platform field definitions
   */
  static async getPlatformFields(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { platform } = req.params;
      const { categoryId } = req.query;

      const fields = PlatformFieldService.getPlatformFields(
        platform,
        categoryId
      );

      res.json({
        success: true,
        data: {
          platform,
          categoryId,
          fields: fields.all,
          baseFields: fields.base,
          platformFields: fields.platform,
        },
      });
    } catch (error) {
      logger.error("Get platform fields error:", error);
      res.status(500).json({
        success: false,
        message: "Platform alanları getirilemedi",
        error: error.message,
      });
    }
  }

  /**
   * Get platform categories
   */
  static async getPlatformCategories(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { platform } = req.params;

      // Get categories from database (platform-wide, not user-specific)
      const categories = await PlatformCategory.findAll({
        where: {
          platformType: platform,
          isActive: true,
        },
        order: [["name", "ASC"]],
        attributes: ["id", "platformCategoryId", "name", "path", "isLeaf"],
      });

      res.json({
        success: true,
        data: {
          platform,
          categories: categories.map((cat) => ({
            id: cat.platformCategoryId,
            name: cat.name,
            path: cat.path,
            hasChildren: !cat.isLeaf, // Convert isLeaf to hasChildren
          })),
        },
      });
    } catch (error) {
      logger.error("Get platform categories error:", error);
      res.status(500).json({
        success: false,
        message: "Platform kategorileri getirilemedi",
        error: error.message,
      });
    }
  }

  /**
   * Get product variants
   */
  static async getProductVariants(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { productId } = req.params;
      const userId = req.user.id;

      // First try to find the product in MainProduct table
      let product = await MainProduct.findOne({
        where: { id: productId, userId },
      });

      // If not found in MainProduct, check in Product table (for backwards compatibility)
      if (!product) {
        const regularProduct = await Product.findOne({
          where: { id: productId, userId, isMainProduct: true },
        });

        if (!regularProduct) {
          return res.status(404).json({
            success: false,
            message: "Ürün bulunamadı",
          });
        }

        // For products in the Product table, we'll still look for variants using the same ID
        product = regularProduct;
      }

      // Get all variants for this product
      const variants = await PlatformVariant.findAll({
        where: { mainProductId: productId },
        order: [["createdAt", "DESC"]],
      });

      res.json({
        success: true,
        data: {
          productId,
          variants: variants.map((variant) => ({
            id: variant.id,
            platform: variant.platform,
            platformSku: variant.platformSku,
            platformTitle: variant.platformTitle,
            platformPrice: variant.platformPrice,
            isPublished: variant.isPublished,
            publishedAt: variant.publishedAt,
            syncStatus: variant.syncStatus,
            syncError: variant.syncError,
            lastSyncAt: variant.lastSyncAt,
            externalId: variant.externalId,
            externalUrl: variant.externalUrl,
            platformAttributes: variant.platformAttributes,
            createdAt: variant.createdAt,
            updatedAt: variant.updatedAt,
          })),
        },
      });
    } catch (error) {
      logger.error("Get product variants error:", error);
      res.status(500).json({
        success: false,
        message: "Ürün varyantları getirilemedi",
        error: error.message,
      });
    }
  }

  /**
   * Create platform variant
   */
  static async createPlatformVariant(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { productId } = req.params;
      const {
        platform,
        platformSku,
        platformFields,
        autoPublish = false,
      } = req.body;
      const userId = req.user.id;

      // Verify product belongs to user
      const product = await MainProduct.findOne({
        where: { id: productId, userId },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Ürün bulunamadı",
        });
      }

      // Check if variant with same platform and SKU already exists
      const existingVariant = await PlatformVariant.findOne({
        where: {
          mainProductId: productId,
          platform,
          platformSku,
        },
      });

      if (existingVariant) {
        return res.status(400).json({
          success: false,
          message: "Bu platform ve SKU ile zaten bir varyant mevcut",
        });
      }

      // Validate platform fields
      const validation = PlatformFieldService.validateFieldValues(
        platform,
        platformFields,
        platformFields.categoryId
      );

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Platform alanları geçersiz",
          errors: validation.errors,
        });
      }

      // Create variant
      const variant = await PlatformVariant.create({
        mainProductId: productId,
        platform,
        platformSku,
        platformTitle: platformFields.platformTitle || product.name,
        platformDescription:
          platformFields.platformDescription || product.description,
        platformPrice: platformFields.platformPrice || product.price,
        platformCategory: platformFields.categoryId,
        platformAttributes: platformFields,
        useMainPrice: !platformFields.platformPrice,
        useMainMedia: true,
        isPublished: false,
        syncStatus: "pending",
      });

      // Auto-publish if requested
      if (autoPublish) {
        // TODO: Implement platform publishing logic
        logger.info(`Auto-publishing variant ${variant.id} to ${platform}`);
      }

      res.status(201).json({
        success: true,
        message: "Platform varyantı başarıyla oluşturuldu",
        data: {
          id: variant.id,
          platform: variant.platform,
          platformSku: variant.platformSku,
          platformTitle: variant.platformTitle,
          platformPrice: variant.platformPrice,
          isPublished: variant.isPublished,
          syncStatus: variant.syncStatus,
          createdAt: variant.createdAt,
        },
      });
    } catch (error) {
      logger.error("Create platform variant error:", error);
      res.status(500).json({
        success: false,
        message: "Platform varyantı oluşturulamadı",
        error: error.message,
      });
    }
  }

  /**
   * Update platform variant
   */
  static async updatePlatformVariant(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { variantId } = req.params;
      const { platformFields, isPublished } = req.body;
      const userId = req.user.id;

      // Find variant and verify ownership
      const variant = await PlatformVariant.findOne({
        where: { id: variantId },
        include: [
          {
            model: MainProduct,
            where: { userId },
            attributes: ["id", "userId"],
          },
        ],
      });

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Varyant bulunamadı",
        });
      }

      const updateData = {};

      // Update platform fields if provided
      if (platformFields) {
        const validation = PlatformFieldService.validateFieldValues(
          variant.platform,
          platformFields,
          platformFields.categoryId
        );

        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: "Platform alanları geçersiz",
            errors: validation.errors,
          });
        }

        updateData.platformAttributes = platformFields;
        updateData.platformTitle = platformFields.platformTitle;
        updateData.platformDescription = platformFields.platformDescription;
        updateData.platformPrice = platformFields.platformPrice;
        updateData.platformCategory = platformFields.categoryId;
      }

      // Update publish status if provided
      if (typeof isPublished === "boolean") {
        updateData.isPublished = isPublished;
        if (isPublished && !variant.publishedAt) {
          updateData.publishedAt = new Date();
        }
      }

      await variant.update(updateData);

      res.json({
        success: true,
        message: "Platform varyantı başarıyla güncellendi",
        data: {
          id: variant.id,
          platform: variant.platform,
          platformSku: variant.platformSku,
          platformTitle: variant.platformTitle,
          platformPrice: variant.platformPrice,
          isPublished: variant.isPublished,
          syncStatus: variant.syncStatus,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error("Update platform variant error:", error);
      res.status(500).json({
        success: false,
        message: "Platform varyantı güncellenemedi",
        error: error.message,
      });
    }
  }

  /**
   * Delete platform variant
   */
  static async deletePlatformVariant(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { variantId } = req.params;
      const userId = req.user.id;

      // Find variant and verify ownership
      const variant = await PlatformVariant.findOne({
        where: { id: variantId },
        include: [
          {
            model: MainProduct,
            where: { userId },
            attributes: ["id", "userId"],
          },
        ],
      });

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Varyant bulunamadı",
        });
      }

      await variant.destroy();

      res.json({
        success: true,
        message: "Platform varyantı başarıyla silindi",
      });
    } catch (error) {
      logger.error("Delete platform variant error:", error);
      res.status(500).json({
        success: false,
        message: "Platform varyantı silinemedi",
        error: error.message,
      });
    }
  }

  /**
   * Publish variant to platform
   */
  static async publishVariant(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { variantId } = req.params;
      const userId = req.user.id;

      // Find variant and verify ownership
      const variant = await PlatformVariant.findOne({
        where: { id: variantId },
        include: [
          {
            model: MainProduct,
            where: { userId },
            attributes: ["id", "userId"],
          },
        ],
      });

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Varyant bulunamadı",
        });
      }

      // TODO: Implement actual platform publishing logic
      await variant.update({
        syncStatus: "syncing",
        lastSyncAt: new Date(),
      });

      // Simulate publishing process
      setTimeout(async () => {
        try {
          await variant.update({
            isPublished: true,
            publishedAt: new Date(),
            syncStatus: "success",
            externalId: `${variant.platform}_${Date.now()}`,
            externalUrl: `https://${variant.platform}.com/product/${variant.platformSku}`,
          });
        } catch (error) {
          logger.error("Publish variant update error:", error);
          await variant.update({
            syncStatus: "error",
            syncError: error.message,
          });
        }
      }, 2000);

      res.json({
        success: true,
        message: "Varyant yayınlanıyor...",
        data: {
          id: variant.id,
          syncStatus: "syncing",
        },
      });
    } catch (error) {
      logger.error("Publish variant error:", error);
      res.status(500).json({
        success: false,
        message: "Varyant yayınlanamadı",
        error: error.message,
      });
    }
  }

  /**
   * Sync variant with platform
   */
  static async syncVariant(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { variantId } = req.params;
      const userId = req.user.id;

      // Find variant and verify ownership
      const variant = await PlatformVariant.findOne({
        where: { id: variantId },
        include: [
          {
            model: MainProduct,
            where: { userId },
            attributes: ["id", "userId"],
          },
        ],
      });

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Varyant bulunamadı",
        });
      }

      if (!variant.isPublished) {
        return res.status(400).json({
          success: false,
          message: "Yayınlanmamış varyant senkronize edilemez",
        });
      }

      // TODO: Implement actual platform sync logic
      await variant.update({
        syncStatus: "syncing",
        lastSyncAt: new Date(),
      });

      res.json({
        success: true,
        message: "Varyant senkronize ediliyor...",
        data: {
          id: variant.id,
          syncStatus: "syncing",
        },
      });
    } catch (error) {
      logger.error("Sync variant error:", error);
      res.status(500).json({
        success: false,
        message: "Varyant senkronize edilemedi",
        error: error.message,
      });
    }
  }

  /**
   * Bulk publish variants
   */
  static async bulkPublishVariants(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { variantIds } = req.body;
      const userId = req.user.id;

      // Find variants and verify ownership
      const variants = await PlatformVariant.findAll({
        where: { id: variantIds },
        include: [
          {
            model: MainProduct,
            where: { userId },
            attributes: ["id", "userId"],
          },
        ],
      });

      if (variants.length !== variantIds.length) {
        return res.status(400).json({
          success: false,
          message: "Bazı varyantlar bulunamadı veya erişim yetkiniz yok",
        });
      }

      // Update all variants to syncing status
      await PlatformVariant.update(
        {
          syncStatus: "syncing",
          lastSyncAt: new Date(),
        },
        {
          where: { id: variantIds },
        }
      );

      res.json({
        success: true,
        message: `${variants.length} varyant toplu olarak yayınlanıyor...`,
        data: {
          variantCount: variants.length,
          variantIds,
        },
      });
    } catch (error) {
      logger.error("Bulk publish variants error:", error);
      res.status(500).json({
        success: false,
        message: "Varyantlar toplu olarak yayınlanamadı",
        error: error.message,
      });
    }
  }

  /**
   * Bulk sync variants
   */
  static async bulkSyncVariants(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { variantIds } = req.body;
      const userId = req.user.id;

      // Find variants and verify ownership
      const variants = await PlatformVariant.findAll({
        where: {
          id: variantIds,
          isPublished: true,
        },
        include: [
          {
            model: MainProduct,
            where: { userId },
            attributes: ["id", "userId"],
          },
        ],
      });

      if (variants.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Senkronize edilebilecek yayınlı varyant bulunamadı",
        });
      }

      // Update all variants to syncing status
      await PlatformVariant.update(
        {
          syncStatus: "syncing",
          lastSyncAt: new Date(),
        },
        {
          where: { id: variants.map((v) => v.id) },
        }
      );

      res.json({
        success: true,
        message: `${variants.length} varyant toplu olarak senkronize ediliyor...`,
        data: {
          variantCount: variants.length,
          variantIds: variants.map((v) => v.id),
        },
      });
    } catch (error) {
      logger.error("Bulk sync variants error:", error);
      res.status(500).json({
        success: false,
        message: "Varyantlar toplu olarak senkronize edilemedi",
        error: error.message,
      });
    }
  }
}

module.exports = PlatformVariantController;
