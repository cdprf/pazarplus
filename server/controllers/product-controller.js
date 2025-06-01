const { Product, PlatformConnection, PlatformData } = require("../models");
const logger = require("../utils/logger");
const ProductMergeService = require("../services/product-merge-service");
const PlatformServiceFactory = require("../modules/order-management/services/platforms/platformServiceFactory");
const { validationResult } = require("express-validator");
const { Op } = require("sequelize");
const AdvancedInventoryService = require("../services/advanced-inventory-service");
const {
  ProductVariant,
  InventoryMovement,
  StockReservation,
} = require("../models");

class ProductController {
  /**
   * Get all products for a user with optional filtering and pagination
   */
  async getProducts(req, res) {
    try {
      const {
        page = 0,
        limit = 50,
        search,
        category,
        platform,
        status = "active",
        sortBy = "updatedAt",
        sortOrder = "DESC",
      } = req.query;

      const offset = parseInt(page) * parseInt(limit);
      const whereClause = {
        userId: req.user.id,
        status: status,
      };

      // Add search filter
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { sku: { [Op.iLike]: `%${search}%` } },
          { barcode: { [Op.iLike]: `%${search}%` } },
        ];
      }

      // Add category filter
      if (category) {
        whereClause.category = { [Op.iLike]: `%${category}%` };
      }

      // Build include clause for platform filtering
      const includeClause = [];

      // Add PlatformData include with proper model reference
      if (platform) {
        includeClause.push({
          model: PlatformData,
          as: "platformData",
          required: false,
          where: {
            platformType: platform,
            entityType: "product",
          },
        });
      } else {
        includeClause.push({
          model: PlatformData,
          as: "platformData",
          required: false,
          where: {
            entityType: "product",
          },
        });
      }

      const { count, rows: products } = await Product.findAndCountAll({
        where: whereClause,
        include: includeClause,
        limit: parseInt(limit),
        offset: offset,
        order: [[sortBy, sortOrder]],
        distinct: true,
      });

      // Calculate pagination info
      const totalPages = Math.ceil(count / parseInt(limit));
      const hasNextPage = parseInt(page) < totalPages - 1;
      const hasPrevPage = parseInt(page) > 0;

      res.json({
        success: true,
        data: {
          products,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: count,
            itemsPerPage: parseInt(limit),
            hasNextPage,
            hasPrevPage,
          },
        },
      });
    } catch (error) {
      logger.error("Failed to fetch products:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch products",
        error: error.message,
      });
    }
  }

  /**
   * Sync products from all connected platforms
   */
  async syncProducts(req, res) {
    try {
      const { platforms, options = {} } = req.body;
      const userId = req.user.id;

      logger.info(`Starting product sync for user ${userId}`);

      // Get active platform connections
      const whereClause = {
        userId,
        isActive: true,
      };

      if (platforms && platforms.length > 0) {
        whereClause.platformType = { [Op.in]: platforms };
      }

      const connections = await PlatformConnection.findAll({
        where: whereClause,
      });

      if (connections.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No active platform connections found",
        });
      }

      // Fetch products from all platforms
      const result = await ProductMergeService.fetchAllProducts(
        userId,
        options
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to fetch products from platforms",
          error: result.error,
        });
      }

      // Merge duplicate products
      const mergedProducts = await ProductMergeService.mergeProducts(
        result.data
      );

      // Save merged products to database
      const savedProducts = await ProductMergeService.saveMergedProducts(
        mergedProducts,
        userId
      );

      logger.info(
        `Product sync completed for user ${userId}. Processed ${result.data.length} products, merged into ${mergedProducts.length}, saved ${savedProducts.length}`
      );

      res.json({
        success: true,
        message: `Successfully synced ${savedProducts.length} products from ${
          result.platformResults.filter((p) => p.success).length
        } platforms`,
        data: {
          totalFetched: result.data.length,
          totalMerged: mergedProducts.length,
          totalSaved: savedProducts.length,
          platformResults: result.platformResults,
          products: savedProducts,
        },
      });
    } catch (error) {
      logger.error("Product sync failed:", error);
      res.status(500).json({
        success: false,
        message: "Product sync failed",
        error: error.message,
      });
    }
  }

  /**
   * Test product fetching from specific platform
   */
  async testPlatformProducts(req, res) {
    try {
      const { platformType, connectionId } = req.params;
      const { page = 0, size = 10 } = req.query;

      // Verify connection belongs to user
      const connection = await PlatformConnection.findOne({
        where: {
          id: connectionId,
          userId: req.user.id,
          platformType,
          isActive: true,
        },
      });

      if (!connection) {
        return res.status(404).json({
          success: false,
          message: "Platform connection not found or inactive",
        });
      }

      // Create platform service
      const platformService = PlatformServiceFactory.createService(
        platformType,
        connectionId
      );

      // Initialize and test connection
      await platformService.initialize();

      // Test connection first
      const connectionTest = await platformService.testConnection();
      if (!connectionTest.success) {
        return res.status(400).json({
          success: false,
          message: "Platform connection test failed",
          error: connectionTest.error,
        });
      }

      // Fetch products
      const result = await platformService.fetchProducts({
        page: parseInt(page),
        size: parseInt(size),
      });

      res.json({
        success: true,
        message: `Successfully tested product fetching from ${platformType}`,
        data: {
          platform: platformType,
          connectionId,
          connectionTest: connectionTest.data,
          products: result.data,
          pagination: result.pagination,
          productCount: result.data ? result.data.length : 0,
        },
      });
    } catch (error) {
      logger.error(
        `Failed to test product fetching from ${platformType}:`,
        error
      );
      res.status(500).json({
        success: false,
        message: `Failed to test product fetching from ${platformType}`,
        error: error.message,
      });
    }
  }

  /**
   * Get platform-specific product data
   */
  async getPlatformProducts(req, res) {
    try {
      const { platformType } = req.params;
      const { page = 0, limit = 50 } = req.query;
      const userId = req.user.id;

      // Get products that have data from this platform
      const products = await Product.findAndCountAll({
        where: { userId },
        include: [
          {
            model: PlatformData,
            as: "platformData",
            where: {
              platformType,
              entityType: "product",
            },
            required: true,
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(page) * parseInt(limit),
        order: [["updatedAt", "DESC"]],
      });

      res.json({
        success: true,
        data: {
          products: products.rows,
          pagination: {
            currentPage: parseInt(page),
            totalItems: products.count,
            itemsPerPage: parseInt(limit),
            totalPages: Math.ceil(products.count / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      logger.error(`Failed to fetch ${platformType} products:`, error);
      res.status(500).json({
        success: false,
        message: `Failed to fetch ${platformType} products`,
        error: error.message,
      });
    }
  }

  /**
   * Get product synchronization status
   */
  async getSyncStatus(req, res) {
    try {
      const userId = req.user.id;

      // Get platform connections
      const connections = await PlatformConnection.findAll({
        where: { userId, isActive: true },
      });

      // Get product counts per platform
      const platformStats = await Promise.all(
        connections.map(async (connection) => {
          const productCount = await PlatformData.count({
            where: {
              platformType: connection.platformType,
              entityType: "product",
            },
            include: [
              {
                model: Product,
                as: "product",
                where: { userId },
              },
            ],
          });

          return {
            platformType: connection.platformType,
            connectionId: connection.id,
            connectionName: connection.name,
            productCount,
            lastSyncedAt: connection.lastSyncAt,
          };
        })
      );

      // Get total product count
      const totalProducts = await Product.count({
        where: { userId },
      });

      res.json({
        success: true,
        data: {
          totalProducts,
          platformStats,
          lastSyncAt: Math.max(
            ...platformStats.map((p) => new Date(p.lastSyncedAt || 0).getTime())
          ),
        },
      });
    } catch (error) {
      logger.error("Failed to get sync status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sync status",
        error: error.message,
      });
    }
  }

  /**
   * Update product information
   */
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user.id;

      const product = await Product.findOne({
        where: { id, userId },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      await product.update(updates);

      res.json({
        success: true,
        message: "Product updated successfully",
        data: product,
      });
    } catch (error) {
      logger.error("Failed to update product:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update product",
        error: error.message,
      });
    }
  }

  /**
   * Create a new product
   */
  async createProduct(req, res) {
    try {
      const {
        name,
        sku,
        barcode,
        description,
        category,
        price,
        costPrice,
        stockQuantity = 0,
        minStockLevel = 0,
        weight,
        dimensions,
        images = [],
        status = "active",
        tags = [],
      } = req.body;

      const userId = req.user.id;

      // Check if SKU already exists for this user
      const existingProduct = await Product.findOne({
        where: {
          userId,
          sku,
        },
      });

      if (existingProduct) {
        return res.status(409).json({
          success: false,
          message: "A product with this SKU already exists",
        });
      }

      // Create the product
      const product = await Product.create({
        userId,
        name,
        sku,
        barcode,
        description,
        category,
        price: parseFloat(price),
        costPrice: costPrice ? parseFloat(costPrice) : null,
        stockQuantity: parseInt(stockQuantity),
        minStockLevel: parseInt(minStockLevel),
        weight: weight ? parseFloat(weight) : null,
        dimensions,
        images,
        status,
        tags,
        lastSyncedAt: new Date(),
      });

      logger.info(`Product created: ${product.sku} by user ${userId}`);

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
      });
    } catch (error) {
      logger.error("Error creating product:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create product",
        error: error.message,
      });
    }
  }

  /**
   * Get a single product by ID
   */
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const product = await Product.findOne({
        where: {
          id,
          userId,
        },
        include: [
          {
            model: PlatformData,
            as: "platformData",
            required: false,
            include: [
              {
                model: PlatformConnection,
                as: "connection",
                attributes: ["id", "platformType", "name"],
              },
            ],
          },
        ],
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      logger.error("Error getting product:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get product",
        error: error.message,
      });
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const product = await Product.findOne({
        where: {
          id,
          userId,
        },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Delete associated platform data first
      await PlatformData.destroy({
        where: {
          entityType: "product",
          entityId: id,
        },
      });

      // Delete the product
      await product.destroy();

      logger.info(`Product deleted: ${product.sku} by user ${userId}`);

      res.json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting product:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete product",
        error: error.message,
      });
    }
  }

  /**
   * Bulk delete products
   */
  async bulkDeleteProducts(req, res) {
    try {
      const { productIds } = req.body;
      const userId = req.user.id;

      // Verify all products belong to the user
      const products = await Product.findAll({
        where: {
          id: { [Op.in]: productIds },
          userId,
        },
      });

      if (products.length !== productIds.length) {
        return res.status(400).json({
          success: false,
          message: "Some products not found or don't belong to you",
        });
      }

      // Delete associated platform data first
      await PlatformData.destroy({
        where: {
          entityType: "product",
          entityId: { [Op.in]: productIds },
        },
      });

      // Delete the products
      const deletedCount = await Product.destroy({
        where: {
          id: { [Op.in]: productIds },
          userId,
        },
      });

      logger.info(`Bulk deleted ${deletedCount} products by user ${userId}`);

      res.json({
        success: true,
        message: `Successfully deleted ${deletedCount} products`,
        data: {
          deletedCount,
          deletedIds: productIds,
        },
      });
    } catch (error) {
      logger.error("Error bulk deleting products:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete products",
        error: error.message,
      });
    }
  }

  /**
   * Bulk update product status
   */
  async bulkUpdateStatus(req, res) {
    try {
      const { productIds, status } = req.body;
      const userId = req.user.id;

      // Verify all products belong to the user
      const products = await Product.findAll({
        where: {
          id: { [Op.in]: productIds },
          userId,
        },
      });

      if (products.length !== productIds.length) {
        return res.status(400).json({
          success: false,
          message: "Some products not found or don't belong to you",
        });
      }

      // Update the status
      const [updatedCount] = await Product.update(
        { status, lastSyncedAt: new Date() },
        {
          where: {
            id: { [Op.in]: productIds },
            userId,
          },
        }
      );

      logger.info(
        `Bulk updated status for ${updatedCount} products to ${status} by user ${userId}`
      );

      res.json({
        success: true,
        message: `Successfully updated status for ${updatedCount} products`,
        data: {
          updatedCount,
          status,
          updatedIds: productIds,
        },
      });
    } catch (error) {
      logger.error("Error bulk updating product status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update product status",
        error: error.message,
      });
    }
  }

  /**
   * Bulk update product stock
   */
  async bulkUpdateStock(req, res) {
    try {
      const { updates } = req.body;
      const userId = req.user.id;
      const productIds = updates.map((u) => u.productId);

      // Verify all products belong to the user
      const products = await Product.findAll({
        where: {
          id: { [Op.in]: productIds },
          userId,
        },
      });

      if (products.length !== productIds.length) {
        return res.status(400).json({
          success: false,
          message: "Some products not found or don't belong to you",
        });
      }

      // Perform bulk updates
      const updatePromises = updates.map((update) =>
        Product.update(
          {
            stockQuantity: update.stockQuantity,
            lastSyncedAt: new Date(),
          },
          {
            where: {
              id: update.productId,
              userId,
            },
          }
        )
      );

      await Promise.all(updatePromises);

      logger.info(
        `Bulk updated stock for ${updates.length} products by user ${userId}`
      );

      res.json({
        success: true,
        message: `Successfully updated stock for ${updates.length} products`,
        data: {
          updatedCount: updates.length,
          updates,
        },
      });
    } catch (error) {
      logger.error("Error bulk updating product stock:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update product stock",
        error: error.message,
      });
    }
  }

  /**
   * Get product statistics
   */
  async getProductStats(req, res) {
    try {
      const userId = req.user.id;

      // Get basic counts
      const totalProducts = await Product.count({
        where: { userId },
      });

      const activeProducts = await Product.count({
        where: { userId, status: "active" },
      });

      const inactiveProducts = await Product.count({
        where: { userId, status: "inactive" },
      });

      const draftProducts = await Product.count({
        where: { userId, status: "draft" },
      });

      // Get low stock products count
      const lowStockProducts = await Product.count({
        where: {
          userId,
          stockQuantity: {
            [Op.lte]: Product.sequelize.col("minStockLevel"),
          },
        },
      });

      // Get products by category
      const categoryCounts = await Product.findAll({
        where: { userId },
        attributes: [
          "category",
          [Product.sequelize.fn("COUNT", Product.sequelize.col("id")), "count"],
        ],
        group: ["category"],
        raw: true,
      });

      // Get total inventory value
      const inventoryValue =
        (await Product.sum("price", {
          where: { userId, status: "active" },
        })) || 0;

      // Get platform distribution
      const platformCounts = await PlatformData.findAll({
        attributes: [
          "platformType",
          [
            PlatformData.sequelize.fn(
              "COUNT",
              PlatformData.sequelize.col("id")
            ),
            "count",
          ],
        ],
        include: [
          {
            model: Product,
            as: "product",
            where: { userId },
            attributes: [],
          },
        ],
        where: { entityType: "product" },
        group: ["platformType"],
        raw: true,
      });

      res.json({
        success: true,
        data: {
          overview: {
            totalProducts,
            activeProducts,
            inactiveProducts,
            draftProducts,
            lowStockProducts,
            inventoryValue: parseFloat(inventoryValue).toFixed(2),
          },
          categories: categoryCounts,
          platforms: platformCounts,
        },
      });
    } catch (error) {
      logger.error("Error getting product statistics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get product statistics",
        error: error.message,
      });
    }
  }

  /**
   * Get products with low stock
   */
  async getLowStockProducts(req, res) {
    try {
      const userId = req.user.id;
      const threshold = parseInt(req.query.threshold) || 10;

      const lowStockProducts = await Product.findAll({
        where: {
          userId,
          status: "active",
          [Op.or]: [
            // Stock is below minimum level
            {
              stockQuantity: {
                [Op.lte]: Product.sequelize.col("minStockLevel"),
              },
            },
            // Stock is below threshold if no minimum level set
            {
              minStockLevel: { [Op.or]: [null, 0] },
              stockQuantity: { [Op.lte]: threshold },
            },
          ],
        },
        order: [["stockQuantity", "ASC"]],
      });

      res.json({
        success: true,
        data: lowStockProducts,
        meta: {
          threshold,
          count: lowStockProducts.length,
        },
      });
    } catch (error) {
      logger.error("Error getting low stock products:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get low stock products",
        error: error.message,
      });
    }
  }

  /**
   * Get all variants for a product
   */
  async getProductVariants(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verify product belongs to user
      const product = await Product.findOne({
        where: { id, userId },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const variants = await ProductVariant.findAll({
        where: { productId: id },
        order: [
          ["sortOrder", "ASC"],
          ["isDefault", "DESC"],
          ["createdAt", "ASC"],
        ],
        include: [
          {
            model: PlatformData,
            as: "platformData",
            required: false,
          },
        ],
      });

      res.json({
        success: true,
        data: variants,
        meta: {
          productId: id,
          totalVariants: variants.length,
        },
      });
    } catch (error) {
      logger.error("Error getting product variants:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get product variants",
        error: error.message,
      });
    }
  }

  /**
   * Create a new product variant
   */
  async createProductVariant(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const {
        name,
        sku,
        barcode,
        attributes,
        price,
        costPrice,
        stockQuantity = 0,
        minStockLevel = 0,
        weight,
        dimensions,
        images = [],
        isDefault = false,
        sortOrder = 0,
      } = req.body;

      // Verify product belongs to user
      const product = await Product.findOne({
        where: { id, userId },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Check if variant SKU already exists for this product
      const existingVariant = await ProductVariant.findOne({
        where: { productId: id, sku },
      });

      if (existingVariant) {
        return res.status(409).json({
          success: false,
          message: "A variant with this SKU already exists for this product",
        });
      }

      // Create the variant
      const variant = await ProductVariant.create({
        productId: id,
        name,
        sku,
        barcode,
        attributes,
        price: price ? parseFloat(price) : null,
        costPrice: costPrice ? parseFloat(costPrice) : null,
        stockQuantity: parseInt(stockQuantity),
        minStockLevel: parseInt(minStockLevel),
        weight: weight ? parseFloat(weight) : null,
        dimensions,
        images,
        isDefault,
        sortOrder: parseInt(sortOrder),
      });

      // Record initial stock movement if stock quantity > 0
      if (stockQuantity > 0) {
        await AdvancedInventoryService.recordMovement({
          variantId: variant.id,
          sku: variant.sku,
          movementType: "IN_STOCK",
          quantity: stockQuantity,
          reason: "Initial stock for new variant",
          userId,
          metadata: { variantCreation: true },
        });
      }

      logger.info(
        `Product variant created: ${variant.sku} for product ${id} by user ${userId}`
      );

      res.status(201).json({
        success: true,
        message: "Product variant created successfully",
        data: variant,
      });
    } catch (error) {
      logger.error("Error creating product variant:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create product variant",
        error: error.message,
      });
    }
  }

  /**
   * Update a product variant
   */
  async updateProductVariant(req, res) {
    try {
      const { variantId } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      // Find variant and verify ownership through product
      const variant = await ProductVariant.findOne({
        where: { id: variantId },
        include: [
          {
            model: Product,
            as: "product",
            where: { userId },
          },
        ],
      });

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Product variant not found",
        });
      }

      const oldStockQuantity = variant.stockQuantity;

      // Update the variant
      await variant.update(updateData);

      // Record stock movement if stock quantity changed
      if (
        updateData.stockQuantity !== undefined &&
        updateData.stockQuantity !== oldStockQuantity
      ) {
        const adjustment = updateData.stockQuantity - oldStockQuantity;
        await AdvancedInventoryService.recordMovement({
          variantId: variant.id,
          sku: variant.sku,
          movementType: "ADJUSTMENT",
          quantity: adjustment,
          reason: "Manual stock adjustment via variant update",
          userId,
          metadata: {
            variantUpdate: true,
            oldQuantity: oldStockQuantity,
            newQuantity: updateData.stockQuantity,
          },
        });
      }

      logger.info(`Product variant updated: ${variant.sku} by user ${userId}`);

      res.json({
        success: true,
        message: "Product variant updated successfully",
        data: variant,
      });
    } catch (error) {
      logger.error("Error updating product variant:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update product variant",
        error: error.message,
      });
    }
  }

  /**
   * Delete a product variant
   */
  async deleteProductVariant(req, res) {
    try {
      const { variantId } = req.params;
      const userId = req.user.id;

      // Find variant and verify ownership
      const variant = await ProductVariant.findOne({
        where: { id: variantId },
        include: [
          {
            model: Product,
            as: "product",
            where: { userId },
          },
        ],
      });

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Product variant not found",
        });
      }

      // Check if there are active reservations
      const activeReservations = await StockReservation.count({
        where: {
          variantId: variant.id,
          status: "active",
        },
      });

      if (activeReservations > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete variant with active stock reservations",
        });
      }

      // Delete associated data first
      await PlatformData.destroy({
        where: {
          entityType: "variant",
          entityId: variantId,
        },
      });

      // Delete the variant
      await variant.destroy();

      logger.info(`Product variant deleted: ${variant.sku} by user ${userId}`);

      res.json({
        success: true,
        message: "Product variant deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting product variant:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete product variant",
        error: error.message,
      });
    }
  }

  /**
   * Get inventory movements
   */
  async getInventoryMovements(req, res) {
    try {
      const userId = req.user.id;
      const {
        productId,
        variantId,
        movementType,
        page = 0,
        limit = 50,
        startDate,
        endDate,
      } = req.query;

      // Verify ownership if productId is provided
      if (productId) {
        const product = await Product.findOne({
          where: { id: productId, userId },
        });
        if (!product) {
          return res.status(404).json({
            success: false,
            message: "Product not found",
          });
        }
      }

      // Verify ownership if variantId is provided
      if (variantId) {
        const variant = await ProductVariant.findOne({
          where: { id: variantId },
          include: [
            {
              model: Product,
              as: "product",
              where: { userId },
            },
          ],
        });
        if (!variant) {
          return res.status(404).json({
            success: false,
            message: "Product variant not found",
          });
        }
      }

      const result = await AdvancedInventoryService.getInventoryHistory(
        productId,
        variantId,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          movementType,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        }
      );

      res.json(result);
    } catch (error) {
      logger.error("Error getting inventory movements:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get inventory movements",
        error: error.message,
      });
    }
  }

  /**
   * Manually adjust inventory
   */
  async adjustStock(req, res) {
    try {
      const userId = req.user.id;
      const { productId, variantId, sku, adjustment, reason } = req.body;

      // Verify ownership
      if (productId) {
        const product = await Product.findOne({
          where: { id: productId, userId },
        });
        if (!product) {
          return res.status(404).json({
            success: false,
            message: "Product not found",
          });
        }
      }

      if (variantId) {
        const variant = await ProductVariant.findOne({
          where: { id: variantId },
          include: [
            {
              model: Product,
              as: "product",
              where: { userId },
            },
          ],
        });
        if (!variant) {
          return res.status(404).json({
            success: false,
            message: "Product variant not found",
          });
        }
      }

      const result = await AdvancedInventoryService.adjustStock({
        productId,
        variantId,
        sku,
        adjustment: parseInt(adjustment),
        reason,
        userId,
      });

      logger.info(
        `Inventory adjusted: ${sku} by ${adjustment} - ${reason} by user ${userId}`
      );

      res.json({
        success: true,
        message: "Inventory adjusted successfully",
        data: result,
      });
    } catch (error) {
      logger.error("Error adjusting inventory:", error);
      res.status(500).json({
        success: false,
        message: "Failed to adjust inventory",
        error: error.message,
      });
    }
  }

  /**
   * Reserve stock for an order
   */
  async reserveStock(req, res) {
    try {
      const userId = req.user.id;
      const {
        productId,
        variantId,
        sku,
        quantity,
        orderNumber,
        orderId,
        platformType,
        expiresAt,
        reason = "Order stock reservation",
      } = req.body;

      // Verify ownership
      if (productId) {
        const product = await Product.findOne({
          where: { id: productId, userId },
        });
        if (!product) {
          return res.status(404).json({
            success: false,
            message: "Product not found",
          });
        }
      }

      if (variantId) {
        const variant = await ProductVariant.findOne({
          where: { id: variantId },
          include: [
            {
              model: Product,
              as: "product",
              where: { userId },
            },
          ],
        });
        if (!variant) {
          return res.status(404).json({
            success: false,
            message: "Product variant not found",
          });
        }
      }

      const result = await AdvancedInventoryService.reserveStock({
        productId,
        variantId,
        sku,
        quantity: parseInt(quantity),
        orderNumber,
        orderId,
        platformType,
        userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        reason,
      });

      logger.info(
        `Stock reserved: ${sku} quantity ${quantity} for order ${orderNumber} by user ${userId}`
      );

      res.status(201).json({
        success: true,
        message: "Stock reserved successfully",
        data: result,
      });
    } catch (error) {
      logger.error("Error reserving stock:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reserve stock",
        error: error.message,
      });
    }
  }

  /**
   * Confirm a stock reservation (convert to sale)
   */
  async confirmStockReservation(req, res) {
    try {
      const { reservationId } = req.params;
      const { reason = "Order confirmed" } = req.body;
      const userId = req.user.id;

      // Verify ownership of reservation
      const reservation = await StockReservation.findOne({
        where: { id: reservationId, userId },
      });

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: "Stock reservation not found",
        });
      }

      const result = await AdvancedInventoryService.confirmReservation(
        reservationId,
        reason
      );

      logger.info(
        `Stock reservation confirmed: ${reservationId} by user ${userId}`
      );

      res.json({
        success: true,
        message: "Stock reservation confirmed successfully",
        data: result,
      });
    } catch (error) {
      logger.error("Error confirming stock reservation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to confirm stock reservation",
        error: error.message,
      });
    }
  }

  /**
   * Get available stock for a product or variant
   */
  async getAvailableStock(req, res) {
    try {
      const { productId } = req.params;
      const { variantId } = req.query;
      const userId = req.user.id;

      // Verify ownership
      if (variantId) {
        const variant = await ProductVariant.findOne({
          where: { id: variantId },
          include: [
            {
              model: Product,
              as: "product",
              where: { userId },
            },
          ],
        });
        if (!variant) {
          return res.status(404).json({
            success: false,
            message: "Product variant not found",
          });
        }
      } else {
        const product = await Product.findOne({
          where: { id: productId, userId },
        });
        if (!product) {
          return res.status(404).json({
            success: false,
            message: "Product not found",
          });
        }
      }

      const availableStock = await AdvancedInventoryService.getAvailableStock(
        productId,
        variantId
      );

      res.json({
        success: true,
        data: {
          productId,
          variantId,
          availableStock,
        },
      });
    } catch (error) {
      logger.error("Error getting available stock:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get available stock",
        error: error.message,
      });
    }
  }

  /**
   * Get stock reservations
   */
  async getStockReservations(req, res) {
    try {
      const userId = req.user.id;
      const { status, productId, variantId, page = 0, limit = 50 } = req.query;

      let whereClause = { userId };

      if (status) {
        whereClause.status = status;
      }

      if (productId) {
        whereClause.productId = productId;
      }

      if (variantId) {
        whereClause.variantId = variantId;
      }

      const result = await AdvancedInventoryService.getReservations(userId, {
        status,
        productId,
        variantId,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json(result);
    } catch (error) {
      logger.error("Error getting stock reservations:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get stock reservations",
        error: error.message,
      });
    }
  }

  /**
   * Release a stock reservation
   */
  async releaseStockReservation(req, res) {
    try {
      const { reservationId } = req.params;
      const { reason = "Manual release" } = req.body;
      const userId = req.user.id;

      // Verify ownership of reservation
      const reservation = await StockReservation.findOne({
        where: { id: reservationId, userId },
      });

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: "Stock reservation not found",
        });
      }

      const result = await AdvancedInventoryService.releaseReservation(
        reservationId,
        reason
      );

      logger.info(
        `Stock reservation released: ${reservationId} by user ${userId}`
      );

      res.json({
        success: true,
        message: "Stock reservation released successfully",
        data: result,
      });
    } catch (error) {
      logger.error("Error releasing stock reservation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to release stock reservation",
        error: error.message,
      });
    }
  }
}

module.exports = new ProductController();
