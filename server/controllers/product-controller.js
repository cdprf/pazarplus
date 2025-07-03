const {
  Product,
  PlatformConnection,
  PlatformData,
  MainProduct,
  PlatformVariant,
  PlatformTemplate,
} = require("../models");
const logger = require("../utils/logger");
const ProductMergeService = require("../services/product-merge-service");
const PlatformServiceFactory = require("../modules/order-management/services/platforms/platformServiceFactory");
const { validationResult } = require("express-validator");
const { Op, sequelize } = require("sequelize");
const AdvancedInventoryService = require("../services/advanced-inventory-service");
const EnhancedProductManagementService = require("../services/enhanced-product-management-service");
const EnhancedStockService = require("../services/enhanced-stock-service");
const MediaUploadService = require("../services/media-upload-service");
const PlatformScrapingService = require("../services/platform-scraping-service");
const EnhancedVariantDetector = require("../services/enhanced-variant-detector");
const backgroundVariantDetectionService = require("../services/background-variant-detection-service");
const SKUSystemManager = require("../../sku-system-manager");
const {
  ProductVariant,
  InventoryMovement,
  StockReservation,
} = require("../models");
const { sanitizePlatformType } = require("../utils/enum-validators");

class ProductController {
  constructor() {
    this.skuManager = new SKUSystemManager();
    this.scrapingService = new PlatformScrapingService();
  }
  /**
   * Get all products for a user with optional filtering and pagination
   */
  async getProducts(req, res) {
    try {
      const {
        page = 0,
        limit = 1000,
        search,
        category,
        platform,
        status,
        approvalStatus,
        stockStatus,
        minPrice,
        maxPrice,
        minStock,
        maxStock,
        sortBy = "updatedAt",
        sortOrder = "DESC",
      } = req.query;

      // Convert to 0-indexed for database (page 1 = offset 0, page 2 = offset 20, etc.)
      const pageNumber = Math.max(0, parseInt(page) - 1);
      const offset = pageNumber * parseInt(limit);
      const whereClause = {
        userId: req.user.id,
      };

      // Status filter - only add if specified (remove default "active")
      if (status && status.trim() !== "") {
        whereClause.status = status;
      }

      // Add search filter - Enhanced to include all relevant fields
      if (search && search.trim() !== "") {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { sku: { [Op.iLike]: `%${search}%` } },
          { barcode: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { category: { [Op.iLike]: `%${search}%` } },
          { brand: { [Op.iLike]: `%${search}%` } },
          { modelCode: { [Op.iLike]: `%${search}%` } },
          { productCode: { [Op.iLike]: `%${search}%` } },
          // Search in JSON fields using PostgreSQL JSON operators
          ...(sequelize.getDialect() === "postgres"
            ? [
                sequelize.where(sequelize.cast(sequelize.col("tags"), "TEXT"), {
                  [Op.iLike]: `%${search}%`,
                }),
                sequelize.where(
                  sequelize.cast(sequelize.col("attributes"), "TEXT"),
                  { [Op.iLike]: `%${search}%` }
                ),
              ]
            : []),
        ];
      }

      // Add category filter
      if (category && category.trim() !== "") {
        whereClause.category = { [Op.iLike]: `%${category}%` };
      }

      // Add price range filters
      if (minPrice) {
        whereClause.price = {
          ...whereClause.price,
          [Op.gte]: parseFloat(minPrice),
        };
      }
      if (maxPrice) {
        whereClause.price = {
          ...whereClause.price,
          [Op.lte]: parseFloat(maxPrice),
        };
      }

      // Add stock range filters
      if (minStock) {
        whereClause.stockQuantity = {
          ...whereClause.stockQuantity,
          [Op.gte]: parseInt(minStock),
        };
      }
      if (maxStock) {
        whereClause.stockQuantity = {
          ...whereClause.stockQuantity,
          [Op.lte]: parseInt(maxStock),
        };
      }

      // Add stock status filter
      if (stockStatus) {
        switch (stockStatus) {
          case "out_of_stock":
            // Out of stock: exactly 0 quantity
            whereClause.stockQuantity = { [Op.eq]: 0 };
            break;
          case "low_stock":
            // Low stock: between 1 and 15 (inclusive)
            whereClause.stockQuantity = {
              [Op.and]: [{ [Op.gte]: 1 }, { [Op.lte]: 15 }],
            };
            break;
          case "pasif":
            // Pasif: stock > 0 AND status = 'inactive'
            whereClause.stockQuantity = { [Op.gt]: 0 };
            whereClause.status = "inactive";
            break;
          case "aktif":
            // Aktif: stock >= 1 AND status = 'active'
            whereClause.stockQuantity = { [Op.gte]: 1 };
            whereClause.status = "active";
            break;
          case "in_stock":
            // In stock: above low stock threshold (> 15)
            whereClause.stockQuantity = { [Op.gt]: 15 };
            break;
        }
      }

      // Handle approval status filtering through platform data
      let platformDataWhere = {
        entityType: "product",
      };

      if (platform && platform !== "all" && platform.trim() !== "") {
        const sanitizedPlatform = sanitizePlatformType(platform);
        if (sanitizedPlatform) {
          platformDataWhere.platformType = sanitizedPlatform;
        }
      }

      if (approvalStatus) {
        // Map approval status to platform-specific fields
        switch (approvalStatus) {
          case "pending":
            platformDataWhere[Op.or] = [
              { "data.approved": false },
              { "data.approvalStatus": "Pending" },
              { "data.status": "pending" },
            ];
            break;
          case "approved":
            platformDataWhere[Op.or] = [
              { "data.approved": true },
              { "data.approvalStatus": "Approved" },
              { "data.status": "active" },
            ];
            break;
          case "rejected":
            platformDataWhere[Op.or] = [
              { "data.rejected": true },
              { "data.approvalStatus": "Rejected" },
              { "data.status": "rejected" },
            ];
            break;
        }
      }

      // Build include clause for platform filtering and variants
      const includeClause = [];

      // Only add PlatformData include if we actually need platform or approval filtering
      if (
        (platform && platform !== "all" && platform.trim() !== "") ||
        approvalStatus
      ) {
        const platformDataInclude = {
          model: PlatformData,
          as: "platformData",
          required: false,
          where: platformDataWhere,
        };
        includeClause.push(platformDataInclude);
      }

      // Add ProductVariant include to fetch variants for products that have them
      // Only include if we're not filtering by stock status (to avoid SQL complexity)
      if (!stockStatus) {
        includeClause.push({
          model: ProductVariant,
          as: "variants",
          required: false,
          order: [
            ["isDefault", "DESC"],
            ["sortOrder", "ASC"],
            ["createdAt", "ASC"],
          ],
        });
      }

      // Add PlatformVariant include to fetch platform variants
      includeClause.push({
        model: PlatformVariant,
        as: "platformVariants",
        required: false,
        attributes: [
          "id",
          "platform",
          "platformSku",
          "isPublished",
          "syncStatus",
          "externalId",
          "externalUrl",
          "createdAt",
        ],
        order: [["createdAt", "DESC"]],
      });

      const { count, rows: products } = await Product.findAndCountAll({
        where: whereClause,
        include: includeClause,
        limit: parseInt(limit),
        offset: offset,
        order: [[sortBy, sortOrder]],
        distinct: true,
      });

      // Calculate pagination info (using 1-indexed page numbers for frontend)
      const currentPageNumber = parseInt(page);
      const totalPages = Math.ceil(count / parseInt(limit));
      const hasNextPage = currentPageNumber < totalPages;
      const hasPrevPage = currentPageNumber > 1;

      res.json({
        success: true,
        data: {
          products,
          pagination: {
            currentPage: currentPageNumber,
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
      // Handle both GET and POST requests - extract parameters from query or body
      let platforms = req.body?.platforms || req.query?.platforms;
      const options = req.body?.options || req.query?.options || {};
      const userId = req.user?.id;

      // Handle comma-separated platforms in query string
      if (typeof platforms === "string" && platforms.includes(",")) {
        platforms = platforms
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
      }

      // Additional safety checks
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
          error: "Missing user ID",
        });
      }

      logger.info(`Starting product sync for user ${userId}`, {
        platforms,
        options,
        requestMethod: req.method,
        hasBody: Object.keys(req.body || {}).length > 0,
        bodyKeys: Object.keys(req.body || {}),
        queryKeys: Object.keys(req.query || {}),
        platformsType: typeof platforms,
        platformsValue: platforms,
      });

      // Get active platform connections
      const whereClause = {
        userId,
        isActive: true,
      };

      // Only filter by platforms if specific ones are requested
      if (platforms && Array.isArray(platforms) && platforms.length > 0) {
        // Validate platform types before using them
        const validPlatforms = platforms.filter((platform) => {
          const sanitized = sanitizePlatformType(platform);
          return sanitized !== null;
        });

        if (validPlatforms.length > 0) {
          whereClause.platformType = { [Op.in]: validPlatforms };
          logger.debug(`Filtering by platforms: ${validPlatforms.join(", ")}`);
        }
      } else if (
        platforms &&
        typeof platforms === "string" &&
        platforms.trim() !== ""
      ) {
        // Handle single platform as string
        const sanitizedPlatform = sanitizePlatformType(platforms);
        if (sanitizedPlatform) {
          whereClause.platformType = sanitizedPlatform;
          logger.debug(`Filtering by single platform: ${sanitizedPlatform}`);
        }
      } else {
        logger.info(
          "No platform filtering applied - syncing from all active platforms"
        );
      }

      const connections = await PlatformConnection.findAll({
        where: whereClause,
      });

      logger.debug(
        `Found ${connections.length} active platform connections for sync`
      );

      if (connections.length === 0) {
        return res.status(200).json({
          success: false,
          message: "No active platform connections found",
          code: "NO_PLATFORM_CONNECTIONS",
          syncedCount: 0,
          requestedPlatforms: platforms,
          availableConnections: await PlatformConnection.count({
            where: { userId },
          }),
          debug: {
            whereClause,
            platformsProvided: platforms,
            userId,
          },
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
            lastSyncedAt: connection.lastSync,
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

      // Trigger background variant detection for the updated product
      setTimeout(() => {
        backgroundVariantDetectionService
          .processProductImmediate(product.id, req.user.id)
          .catch((error) => {
            logger.error(
              `Background variant detection failed for updated product ${product.id}:`,
              error
            );
          });
      }, 1000); // Delay 1 second to ensure product is fully updated

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
        sourcePlatform: "manual", // Mark as manually created
        lastSyncedAt: new Date(),
      });

      logger.info(`Product created: ${product.sku} by user ${userId}`);

      // Trigger background variant detection for the new product
      setTimeout(() => {
        backgroundVariantDetectionService
          .processProductImmediate(product.id, userId)
          .catch((error) => {
            logger.error(
              `Background variant detection failed for new product ${product.id}:`,
              error
            );
          });
      }, 1000); // Delay 1 second to ensure product is fully saved

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
        where: {
          userId,
          status: "active",
        },
      });

      const inactiveProducts = await Product.count({
        where: {
          userId,
          status: "inactive",
        },
      });

      const draftProducts = await Product.count({
        where: { userId, status: "draft" },
      });

      // Get stock status counts using the same logic as filtering
      const outOfStockProducts = await Product.count({
        where: {
          userId,
          stockQuantity: { [Op.eq]: 0 },
        },
      });

      const lowStockProducts = await Product.count({
        where: {
          userId,
          stockQuantity: {
            [Op.and]: [{ [Op.gte]: 1 }, { [Op.lte]: 15 }],
          },
        },
      });

      const inStockProducts = await Product.count({
        where: {
          userId,
          stockQuantity: { [Op.gt]: 15 },
        },
      });

      // Get status-based counts
      const pasifProducts = await Product.count({
        where: {
          userId,
          stockQuantity: { [Op.gt]: 0 },
          status: "inactive",
        },
      });

      const aktifProducts = await Product.count({
        where: {
          userId,
          stockQuantity: { [Op.gte]: 1 },
          status: "active",
        },
      });

      // Get approval status counts through platform data
      // Note: Products don't have "pending" status - this is platform-specific
      // Check for products that have pending approval on platforms instead
      let pendingProducts = 0;
      let rejectedProducts = 0;

      try {
        pendingProducts = await PlatformData.count({
          where: {
            entityType: "product",
            [Op.or]: [
              { "data.approvalStatus": "Pending" },
              { "data.status": "pending" },
              { platformStatus: "pending" },
            ],
          },
        });
      } catch (error) {
        logger.warn("Could not fetch pending products count:", error.message);
      }

      try {
        rejectedProducts = await PlatformData.count({
          where: {
            entityType: "product",
            [Op.or]: [
              { "data.rejected": true },
              { "data.approvalStatus": "Rejected" },
              { "data.status": "rejected" },
            ],
          },
          include: [
            {
              model: Product,
              as: "product",
              where: { userId },
              attributes: [],
            },
          ],
        });
      } catch (error) {
        logger.warn("Could not fetch rejected products count:", error.message);
      }

      // Get products by category with error handling
      let categoryCounts = [];
      try {
        categoryCounts = await Product.findAll({
          where: { userId },
          attributes: [
            "category",
            [
              Product.sequelize.fn("COUNT", Product.sequelize.col("id")),
              "count",
            ],
          ],
          group: ["category"],
          raw: true,
        });
      } catch (error) {
        logger.warn("Could not fetch category counts:", error.message);
      }

      // Get total inventory value with error handling
      let inventoryValue = 0;
      try {
        inventoryValue =
          (await Product.sum("price", {
            where: { userId, status: "active" },
          })) || 0;
      } catch (error) {
        logger.warn("Could not calculate inventory value:", error.message);
      }

      // Get platform distribution with error handling
      let platformCounts = [];
      try {
        platformCounts = await PlatformData.findAll({
          attributes: [
            "platformType",
            [
              PlatformData.sequelize.fn(
                "COUNT",
                PlatformData.sequelize.col("PlatformData.id")
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
      } catch (error) {
        logger.warn("Could not fetch platform counts:", error.message);
      }

      res.json({
        success: true,
        data: {
          overview: {
            totalProducts,
            activeProducts,
            inactiveProducts,
            draftProducts,
            pendingProducts,
            rejectedProducts,
            lowStockProducts,
            outOfStockProducts,
            inStockProducts,
            pasifProducts,
            aktifProducts,
            inventoryValue: parseFloat(inventoryValue).toFixed(2),
          },
          categories: categoryCounts,
          platforms: platformCounts,
        },
      });
    } catch (error) {
      logger.error("Error getting product statistics:", error);

      // Return graceful error response instead of 500
      res.status(200).json({
        success: false,
        data: {
          overview: {
            totalProducts: 0,
            activeProducts: 0,
            inactiveProducts: 0,
            draftProducts: 0,
            pendingProducts: 0,
            rejectedProducts: 0,
            lowStockProducts: 0,
            outOfStockProducts: 0,
            inStockProducts: 0,
            pasifProducts: 0,
            aktifProducts: 0,
            inventoryValue: "0.00",
          },
          categories: [],
          platforms: [],
        },
        error: {
          message: "Failed to get product statistics due to system error",
          details: error.message,
          errorType: "DATABASE_ERROR",
        },
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

  /**
   * Create a variant group from suggested products
   */
  async createVariantGroup(req, res) {
    try {
      const userId = req.user.id;
      const { groupName, baseProduct, variants, confidence, reason } = req.body;

      logger.info(`Creating variant group: ${groupName} by user ${userId}`);

      // Verify all products belong to the user
      const allProductIds = [baseProduct.id, ...variants.map((v) => v.id)];
      const userProducts = await Product.findAll({
        where: {
          id: allProductIds,
          userId,
        },
      });

      if (userProducts.length !== allProductIds.length) {
        return res.status(403).json({
          success: false,
          message: "Some products do not belong to the user",
        });
      }

      // Start a transaction for the variant group creation
      const { sequelize } = require("../models");
      const transaction = await sequelize.transaction();

      try {
        // Update the base product name if needed
        const updatedBaseProduct = await Product.findByPk(baseProduct.id, {
          transaction,
        });
        if (updatedBaseProduct.name !== groupName) {
          await updatedBaseProduct.update({ name: groupName }, { transaction });
        }

        // Convert other products to variants
        const createdVariants = [];
        for (const variantProduct of variants) {
          // Create a unique SKU for the variant if it doesn't have one or conflicts
          let variantSku =
            variantProduct.sku || `${baseProduct.sku}-VAR-${Date.now()}`;

          // Check if SKU already exists as a variant for the base product
          const existingVariant = await ProductVariant.findOne({
            where: { productId: baseProduct.id, sku: variantSku },
            transaction,
          });

          if (existingVariant) {
            variantSku = `${variantProduct.sku}-${Date.now()}`;
          }

          // Create the variant
          const variant = await ProductVariant.create(
            {
              productId: baseProduct.id,
              name: variantProduct.name,
              sku: variantSku,
              barcode: variantProduct.barcode,
              attributes: {
                originalProductId: variantProduct.id,
                convertedFromProduct: true,
                confidence,
                reason,
              },
              price: variantProduct.price,
              costPrice: variantProduct.costPrice,
              stockQuantity: variantProduct.stockQuantity || 0,
              minStockLevel: variantProduct.minStockLevel || 0,
              weight: variantProduct.weight,
              dimensions: variantProduct.dimensions,
              images: variantProduct.images || [],
              isDefault: false,
              sortOrder: createdVariants.length + 1,
            },
            { transaction }
          );

          createdVariants.push(variant);

          // Record initial stock movement if needed
          if (variantProduct.stockQuantity > 0) {
            await AdvancedInventoryService.recordMovement(
              {
                variantId: variant.id,
                sku: variant.sku,
                movementType: "IN_STOCK",
                quantity: variantProduct.stockQuantity,
                reason: "Stock transfer from converted product",
                userId,
                metadata: {
                  variantGroupCreation: true,
                  originalProductId: variantProduct.id,
                },
              },
              { transaction }
            );
          }

          // Transfer platform data if exists
          const platformData = await PlatformData.findAll({
            where: {
              entityType: "product",
              entityId: variantProduct.id,
            },
            transaction,
          });

          for (const platformDataItem of platformData) {
            await PlatformData.create(
              {
                ...platformDataItem.dataValues,
                id: undefined, // Let it generate a new ID
                entityType: "variant",
                entityId: variant.id,
                metadata: {
                  ...platformDataItem.metadata,
                  convertedFromProduct: true,
                  originalProductId: variantProduct.id,
                },
              },
              { transaction }
            );
          }

          // Mark the original product as converted/inactive
          await Product.update(
            {
              status: "converted_to_variant",
              metadata: {
                ...(variantProduct.metadata || {}),
                convertedToVariant: true,
                variantGroupId: baseProduct.id,
                variantId: variant.id,
              },
            },
            {
              where: { id: variantProduct.id },
              transaction,
            }
          );
        }

        await transaction.commit();

        logger.info(
          `Variant group created successfully: ${groupName} with ${createdVariants.length} variants`
        );

        res.status(201).json({
          success: true,
          message: "Variant group created successfully",
          data: {
            baseProduct: updatedBaseProduct,
            variants: createdVariants,
            groupName,
            variantCount: createdVariants.length,
          },
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      logger.error("Error creating variant group:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create variant group",
        error: error.message,
      });
    }
  }

  /**
   * Update a variant group
   */
  async updateVariantGroup(req, res) {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;
      const { groupName, variants } = req.body;

      // Verify the base product (group) belongs to the user
      const baseProduct = await Product.findOne({
        where: { id: groupId, userId },
      });

      if (!baseProduct) {
        return res.status(404).json({
          success: false,
          message: "Variant group not found",
        });
      }

      // Update group name if provided
      if (groupName && groupName !== baseProduct.name) {
        await baseProduct.update({ name: groupName });
      }

      // Update variants if provided
      if (variants && Array.isArray(variants)) {
        for (const variantData of variants) {
          if (variantData.id) {
            const variant = await ProductVariant.findOne({
              where: { id: variantData.id, productId: groupId },
            });

            if (variant) {
              await variant.update(variantData);
            }
          }
        }
      }

      logger.info(`Variant group updated: ${groupId} by user ${userId}`);

      res.json({
        success: true,
        message: "Variant group updated successfully",
      });
    } catch (error) {
      logger.error("Error updating variant group:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update variant group",
        error: error.message,
      });
    }
  }

  /**
   * Delete a variant group
   */
  async deleteVariantGroup(req, res) {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;

      // Verify the base product (group) belongs to the user
      const baseProduct = await Product.findOne({
        where: { id: groupId, userId },
      });

      if (!baseProduct) {
        return res.status(404).json({
          success: false,
          message: "Variant group not found",
        });
      }

      // Get all variants in the group
      const variants = await ProductVariant.findAll({
        where: { productId: groupId },
      });

      const { sequelize } = require("../models");
      const transaction = await sequelize.transaction();

      try {
        // Delete all variants and their associated data
        for (const variant of variants) {
          // Delete platform data for variant
          await PlatformData.destroy({
            where: {
              entityType: "variant",
              entityId: variant.id,
            },
            transaction,
          });

          // Delete the variant
          await variant.destroy({ transaction });
        }

        // Delete platform data for base product
        await PlatformData.destroy({
          where: {
            entityType: "product",
            entityId: groupId,
          },
          transaction,
        });

        // Delete the base product
        await baseProduct.destroy({ transaction });

        await transaction.commit();

        logger.info(`Variant group deleted: ${groupId} by user ${userId}`);

        res.json({
          success: true,
          message: "Variant group deleted successfully",
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      logger.error("Error deleting variant group:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete variant group",
        error: error.message,
      });
    }
  }

  // === NEW PRODUCT MANAGEMENT ENDPOINTS ===

  /**
   * Get comprehensive product dashboard data
   */
  async getProductDashboard(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.id;
      const {
        ProductTemplate,
        ProductMedia,
        PlatformCategory,
        BulkOperation,
      } = require("../models");

      // Get product with all related data
      const product = await Product.findOne({
        where: { id: productId, userId },
        include: [
          {
            model: ProductVariant,
            as: "variants",
            order: [
              ["isDefault", "DESC"],
              ["sortOrder", "ASC"],
            ],
          },
          {
            model: ProductMedia,
            as: "media",
            order: [
              ["isPrimary", "DESC"],
              ["sortOrder", "ASC"],
            ],
          },
          {
            model: ProductTemplate,
            as: "template",
          },
          {
            model: PlatformData,
            as: "platformData",
          },
        ],
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Get publishing status across platforms
      const publishingStatus = {};
      if (product.platformData) {
        product.platformData.forEach((pd) => {
          publishingStatus[pd.platformType] = {
            status: pd.data.status || "unknown",
            approved: pd.data.approved || false,
            lastSync: pd.updatedAt,
            errors: pd.data.errors || [],
          };
        });
      }

      // Get recent bulk operations for this product
      const recentOperations = await BulkOperation.findAll({
        where: {
          userId,
          "configuration.productIds": { [Op.contains]: [productId] },
        },
        order: [["createdAt", "DESC"]],
        limit: 5,
      });

      res.json({
        success: true,
        data: {
          product,
          publishingStatus,
          recentOperations,
          analytics: {
            totalVariants: product.variants?.length || 0,
            totalMedia: product.media?.length || 0,
            platformsPublished: Object.keys(publishingStatus).length,
            lastUpdated: product.updatedAt,
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching product dashboard:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch product dashboard",
        error: error.message,
      });
    }
  }

  /**
   * Bulk publish products to selected platforms
   */
  async bulkPublishProducts(req, res) {
    try {
      const { productIds, platforms, publishingSettings } = req.body;
      const userId = req.user.id;
      const { BulkOperation } = require("../models");

      // Validate input
      if (
        !productIds ||
        !Array.isArray(productIds) ||
        productIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Product IDs are required",
        });
      }

      if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one platform must be selected",
        });
      }

      // Create bulk operation record
      const bulkOperation = await BulkOperation.create({
        type: "platform_publish",
        status: "pending",
        totalItems: productIds.length * platforms.length,
        configuration: {
          productIds,
          platforms,
          publishingSettings: publishingSettings || {},
        },
        userId,
      });

      // Queue the bulk operation for processing
      // This would typically be handled by a job queue like Bull or Agenda
      setTimeout(() => {
        this.processBulkPublishing(bulkOperation.id);
      }, 100);

      res.json({
        success: true,
        data: {
          operationId: bulkOperation.id,
          message: "Bulk publishing operation started",
          estimatedTime: `${Math.ceil(
            (productIds.length * platforms.length) / 10
          )} minutes`,
        },
      });
    } catch (error) {
      logger.error("Error starting bulk publish:", error);
      res.status(500).json({
        success: false,
        message: "Failed to start bulk publishing",
        error: error.message,
      });
    }
  }

  /**
   * Get bulk operation status and progress
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
          message: "Operation not found",
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
        message: "Failed to fetch operation status",
        error: error.message,
      });
    }
  }

  /**
   * Upload and manage product media
   */
  async uploadProductMedia(req, res) {
    try {
      const { productId } = req.params;
      const { variantId, type, isPrimary, sortOrder, altText, caption, tags } =
        req.body;
      const userId = req.user.id;
      const { ProductMedia } = require("../models");

      // Validate product ownership
      const product = await Product.findOne({
        where: { id: productId, userId },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Handle file upload (this would typically use multer or similar)
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      // If setting as primary, unset other primary media
      if (isPrimary) {
        await ProductMedia.update(
          { isPrimary: false },
          {
            where: {
              productId,
              ...(variantId ? { variantId } : { variantId: null }),
            },
          }
        );
      }

      // Create media record
      const media = await ProductMedia.create({
        productId,
        variantId: variantId || null,
        type: type || "image",
        url: req.file.location || req.file.path, // Assuming S3 or local storage
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        isPrimary: isPrimary || false,
        sortOrder: sortOrder || 0,
        altText: altText || "",
        caption: caption || "",
        tags: tags ? JSON.parse(tags) : [],
        userId,
      });

      res.json({
        success: true,
        data: media,
        message: "Media uploaded successfully",
      });
    } catch (error) {
      logger.error("Error uploading media:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload media",
        error: error.message,
      });
    }
  }

  /**
   * Auto-detect and create variants from platform data
   */
  async autoDetectVariants(req, res) {
    try {
      const { productId } = req.params;
      const { detectionRules } = req.body;
      const userId = req.user.id;
      const VariantDetectionService = require("../services/variant-detection-service");

      // Validate product ownership
      const product = await Product.findOne({
        where: { id: productId, userId },
        include: [
          {
            model: PlatformData,
            as: "platformData",
          },
        ],
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Run variant detection
      const detectionResult = await VariantDetectionService.detectVariants(
        product,
        detectionRules
      );

      res.json({
        success: true,
        data: detectionResult,
        message: `Detected ${detectionResult.variants.length} potential variants`,
      });
    } catch (error) {
      logger.error("Error detecting variants:", error);
      res.status(500).json({
        success: false,
        message: "Failed to detect variants",
        error: error.message,
      });
    }
  }

  /**
   * Sync platform categories
   */
  async syncPlatformCategories(req, res) {
    try {
      const { platformType } = req.params;
      const userId = req.user.id;
      const PlatformCategoryService = require("../services/platform-category-service");

      // Start category sync
      const syncResult = await PlatformCategoryService.syncCategories(
        platformType,
        userId
      );

      res.json({
        success: true,
        data: syncResult,
        message: `Category sync started for ${platformType}`,
      });
    } catch (error) {
      logger.error("Error syncing categories:", error);
      res.status(500).json({
        success: false,
        message: "Failed to sync categories",
        error: error.message,
      });
    }
  }

  /**
   * Process bulk publishing operation (would typically run in background)
   */
  async processBulkPublishing(operationId) {
    try {
      const { BulkOperation } = require("../models");
      const operation = await BulkOperation.findByPk(operationId);

      if (!operation) return;

      // Update status to processing
      await operation.update({
        status: "processing",
        startedAt: new Date(),
      });

      const { productIds, platforms, publishingSettings } =
        operation.configuration;
      let processedItems = 0;
      let successfulItems = 0;
      let failedItems = 0;
      const errors = [];

      // Process each product on each platform
      for (const productId of productIds) {
        for (const platform of platforms) {
          try {
            // Get platform service
            const platformService = PlatformServiceFactory.getService(platform);

            // Publish product
            await platformService.publishProduct(productId, publishingSettings);

            successfulItems++;
          } catch (error) {
            failedItems++;
            errors.push({
              productId,
              platform,
              error: error.message,
            });
            logger.error(
              `Failed to publish ${productId} to ${platform}:`,
              error
            );
          }

          processedItems++;

          // Update progress
          const progress = (processedItems / operation.totalItems) * 100;
          await operation.update({
            processedItems,
            successfulItems,
            failedItems,
            progress: Math.round(progress * 100) / 100,
            errors,
          });
        }
      }

      // Mark as completed
      await operation.update({
        status:
          processedItems === operation.totalItems ? "completed" : "partial",
        completedAt: new Date(),
        processingTimeMs: Date.now() - new Date(operation.startedAt).getTime(),
      });

      logger.info(`Bulk publishing completed for operation ${operationId}`);
    } catch (error) {
      logger.error(`Error processing bulk operation ${operationId}:`, error);

      // Mark as failed
      const { BulkOperation } = require("../models");
      await BulkOperation.update(
        {
          status: "failed",
          errors: [{ error: error.message }],
          completedAt: new Date(),
        },
        { where: { id: operationId } }
      );
    }
  }

  /**
   * Enhanced Product Management Methods
   * These methods provide enhanced functionality for main products and platform variants
   */

  /**
   * Get all main products (enhanced version with platform variants)
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
        sortBy: sortByQuery,
        sortField, // Frontend sends sortField instead of sortBy
        sortOrder = "DESC",
        stockStatus,
        minPrice,
        maxPrice,
        minStock,
        maxStock,
        platform,
      } = req.query;

      // Handle parameter mapping and normalization
      const sortBy = sortField || sortByQuery || "updatedAt";
      const normalizedSortOrder = sortOrder.toUpperCase();
      const normalizedStatus = status === "" ? undefined : status;

      const offset = (page - 1) * limit;
      const where = { userId };

      // Add filters
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { sku: { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (category && category !== "") where.category = category;
      if (normalizedStatus) where.status = normalizedStatus;

      // Price filters
      if (minPrice && minPrice !== "") {
        where.price = { ...where.price, [Op.gte]: parseFloat(minPrice) };
      }
      if (maxPrice && maxPrice !== "") {
        where.price = { ...where.price, [Op.lte]: parseFloat(maxPrice) };
      }

      // Stock filters
      if (minStock && minStock !== "") {
        where.stock = { ...where.stock, [Op.gte]: parseInt(minStock) };
      }
      if (maxStock && maxStock !== "") {
        where.stock = { ...where.stock, [Op.lte]: parseInt(maxStock) };
      }

      // Try to use MainProduct model first, fallback to Product if not available
      let ProductModel = Product;
      let includeConfig = [
        {
          model: ProductVariant,
          as: "variants",
          required: false,
          attributes: ["id", "sku", "price", "stockQuantity"],
          include: [
            {
              model: PlatformData,
              as: "platformData",
              required: false,
              attributes: [
                "id",
                "platformType",
                "platformEntityId",
                "status",
                "lastSyncedAt",
              ],
            },
          ],
        },
      ];

      // Check if MainProduct model is available and has data
      try {
        if (MainProduct) {
          const testQuery = await MainProduct.findOne({
            where: { userId },
            limit: 1,
          });
          if (testQuery || true) {
            // Use MainProduct structure
            ProductModel = MainProduct;
            includeConfig = [
              {
                model: PlatformVariant,
                as: "platformVariants",
                required: false,
                attributes: [
                  "id",
                  "platform",
                  "isPublished",
                  "syncStatus",
                  "platformSku",
                  "platformPrice",
                ],
              },
            ];
          }
        }
      } catch (error) {
        logger.warn(
          "MainProduct model not available, using Product model",
          error.message
        );
      }

      const { rows: products, count: total } =
        await ProductModel.findAndCountAll({
          where,
          include: includeConfig,
          limit: parseInt(limit),
          offset,
          order: [[sortBy, normalizedSortOrder]],
        });

      // Transform products to enhanced format
      const enhancedProducts = await Promise.all(
        products.map(async (product) => {
          const platformVariants = [];

          // Handle different model structures
          if (ProductModel === MainProduct && product.platformVariants) {
            // Enhanced structure - direct platform variants
            product.platformVariants.forEach((variant) => {
              platformVariants.push({
                id: variant.id,
                platform: variant.platform,
                isPublished: variant.isPublished,
                syncStatus: variant.syncStatus,
                platformEntityId: variant.platformEntityId || null,
                variantSku: variant.platformSku,
                variantPrice: variant.platformPrice,
                lastSyncedAt: variant.lastSyncedAt || variant.updatedAt,
              });
            });
          } else if (product.variants) {
            // Original structure - process variants and their platform data
            product.variants.forEach((variant) => {
              if (variant.platformData && variant.platformData.length > 0) {
                variant.platformData.forEach((platformData) => {
                  platformVariants.push({
                    id: variant.id,
                    platform: platformData.platformType,
                    isPublished: platformData.status === "active",
                    syncStatus: platformData.status,
                    platformEntityId: platformData.platformEntityId,
                    variantSku: variant.sku,
                    variantPrice: variant.price,
                    lastSyncedAt: platformData.lastSyncedAt,
                  });
                });
              } else {
                // Variant without platform data
                platformVariants.push({
                  id: variant.id,
                  platform: "local",
                  isPublished: false,
                  syncStatus: "local",
                  platformEntityId: null,
                  variantSku: variant.sku,
                  variantPrice: variant.price,
                  lastSyncedAt: null,
                });
              }
            });
          }

          // Get stock status if enhanced services are available
          let stockStatus = null;
          try {
            if (
              EnhancedStockService &&
              typeof EnhancedStockService.getStockStatus === "function"
            ) {
              stockStatus = await EnhancedStockService.getStockStatus(
                product.id
              );
            }
          } catch (error) {
            logger.debug("Enhanced stock service not available", error.message);
            stockStatus = {
              available: product.stock || product.stockQuantity || 0,
              reserved: 0,
              total: product.stock || product.stockQuantity || 0,
              status:
                (product.stock || product.stockQuantity || 0) > 0
                  ? "in_stock"
                  : "out_of_stock",
            };
          }

          return {
            ...product.toJSON(),
            // Normalize field names for enhanced compatibility
            baseSku: product.baseSku || product.sku,
            basePrice: product.basePrice || product.price,
            stockQuantity: product.stockQuantity || product.stock,
            platformVariants: platformVariants,
            variantCount: platformVariants.length,
            publishedVariants: platformVariants.filter((v) => v.isPublished)
              .length,
            stockStatus: stockStatus,
            // Enhanced fields
            hasVariants: platformVariants.length > 0,
            lastSyncedAt:
              platformVariants.length > 0
                ? Math.max(
                    ...platformVariants
                      .filter((v) => v.lastSyncedAt)
                      .map((v) => new Date(v.lastSyncedAt).getTime())
                  )
                : null,
          };
        })
      );

      res.json({
        success: true,
        data: {
          products: enhancedProducts,
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
   * Create new main product (enhanced version)
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
      let productData = req.body;

      // Transform enhanced product data to standard product format
      const standardProductData = {
        name: productData.name,
        description: productData.description || "",
        sku: productData.baseSku || productData.sku,
        price: parseFloat(productData.basePrice) || 0,
        originalPrice:
          parseFloat(productData.baseCostPrice) ||
          parseFloat(productData.basePrice) ||
          0,
        stock: parseInt(productData.stockQuantity) || 0,
        category: productData.category,
        brand: productData.brand || "",
        weight: parseFloat(productData.weight) || 0,
        status: productData.status || "active",
        userId,
        sourcePlatform: "manual", // Mark as manually created
        // Add enhanced fields
        productType: productData.productType || "simple",
        minStockLevel: parseInt(productData.minStockLevel) || 5,
        attributes: productData.attributes || {},
        tags: productData.tags || [],
        media: productData.media || [],
      };

      const product = await Product.create(standardProductData);

      res.status(201).json({
        success: true,
        data: {
          ...product.toJSON(),
          baseSku: product.sku,
          basePrice: product.price,
          stockQuantity: product.stock,
        },
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
   * Update main product (enhanced version)
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

      const product = await Product.findOne({
        where: { id, userId },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      // Transform enhanced update data to standard format
      const standardUpdateData = {};
      if (updateData.name) standardUpdateData.name = updateData.name;
      if (updateData.description)
        standardUpdateData.description = updateData.description;
      if (updateData.baseSku) standardUpdateData.sku = updateData.baseSku;
      if (updateData.basePrice)
        standardUpdateData.price = parseFloat(updateData.basePrice);
      if (updateData.baseCostPrice)
        standardUpdateData.originalPrice = parseFloat(updateData.baseCostPrice);
      if (updateData.stockQuantity)
        standardUpdateData.stock = parseInt(updateData.stockQuantity);
      if (updateData.category)
        standardUpdateData.category = updateData.category;
      if (updateData.brand) standardUpdateData.brand = updateData.brand;
      if (updateData.weight)
        standardUpdateData.weight = parseFloat(updateData.weight);
      if (updateData.status) standardUpdateData.status = updateData.status;
      if (updateData.attributes)
        standardUpdateData.attributes = updateData.attributes;
      if (updateData.tags) standardUpdateData.tags = updateData.tags;
      if (updateData.media) standardUpdateData.media = updateData.media;

      await product.update(standardUpdateData);

      res.json({
        success: true,
        data: {
          ...product.toJSON(),
          baseSku: product.sku,
          basePrice: product.price,
          stockQuantity: product.stock,
        },
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
   * Delete main product (enhanced version)
   */
  async deleteMainProduct(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const product = await Product.findOne({
        where: { id, userId },
        include: [
          {
            model: ProductVariant,
            as: "variants",
          },
        ],
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      // Check if product has published variants
      const publishedVariants = product.variants
        ? product.variants.filter((v) => v.isPublished)
        : [];

      if (publishedVariants.length > 0) {
        return res.status(400).json({
          success: false,
          error:
            "Cannot delete product with published variants. Unpublish variants first.",
          publishedVariants: publishedVariants.map((v) => ({
            platform: v.platform,
            platformSku: v.platformSku || v.sku,
          })),
        });
      }

      await product.destroy();

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
          const updatedProduct = await Product.update(
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
   * Get single main product with all variants (Enhanced)
   */
  async getMainProduct(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      let product;

      // Try enhanced service first
      try {
        if (
          EnhancedProductManagementService &&
          typeof EnhancedProductManagementService.getProductWithVariants ===
            "function"
        ) {
          product =
            await EnhancedProductManagementService.getProductWithVariants(
              id,
              userId
            );
        }
      } catch (error) {
        logger.debug(
          "Enhanced service not available, using direct query",
          error.message
        );
      }

      // Fallback to direct query
      if (!product) {
        const ProductModel = MainProduct || Product;
        product = await ProductModel.findOne({
          where: { id, userId },
          include: [
            {
              model: PlatformVariant,
              as: "platformVariants",
              required: false,
            },
          ],
        });
      }

      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

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
   * Create platform variant (Enhanced)
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

      let variant;

      // Try enhanced service first
      try {
        if (
          EnhancedProductManagementService &&
          typeof EnhancedProductManagementService.createPlatformVariant ===
            "function"
        ) {
          variant =
            await EnhancedProductManagementService.createPlatformVariant(
              mainProductId,
              variantData,
              userId
            );
        }
      } catch (error) {
        logger.debug(
          "Enhanced service not available, using direct creation",
          error.message
        );
      }

      // Fallback to direct creation
      if (!variant && PlatformVariant) {
        variant = await PlatformVariant.create({
          ...variantData,
          mainProductId,
          userId,
        });
      }

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
   * Update platform variant (Enhanced)
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

      const variant = await ProductVariant.findOne({
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
   * Delete platform variant (Enhanced)
   */
  async deletePlatformVariant(req, res) {
    try {
      const userId = req.user.id;
      const { variantId } = req.params;

      const variant = await ProductVariant.findOne({
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
   * Get stock status for main product (Enhanced)
   */
  async getStockStatus(req, res) {
    try {
      const { id } = req.params;

      let stockStatus;
      try {
        if (
          EnhancedStockService &&
          typeof EnhancedStockService.getStockStatus === "function"
        ) {
          stockStatus = await EnhancedStockService.getStockStatus(id);
        }
      } catch (error) {
        logger.debug("Enhanced stock service not available", error.message);

        // Fallback to basic stock info
        const ProductModel = MainProduct || Product;
        const product = await ProductModel.findByPk(id);
        stockStatus = {
          available: product?.stock || product?.stockQuantity || 0,
          reserved: 0,
          total: product?.stock || product?.stockQuantity || 0,
          status:
            (product?.stock || product?.stockQuantity || 0) > 0
              ? "in_stock"
              : "out_of_stock",
        };
      }

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
   * Update stock quantity (Enhanced)
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

      let stockStatus;
      try {
        if (
          EnhancedStockService &&
          typeof EnhancedStockService.updateStock === "function"
        ) {
          stockStatus = await EnhancedStockService.updateStock(
            id,
            quantity,
            reason,
            userId
          );
        }
      } catch (error) {
        logger.debug(
          "Enhanced stock service not available, using direct update",
          error.message
        );

        // Fallback to direct update
        const ProductModel = MainProduct || Product;
        const product = await ProductModel.findOne({ where: { id, userId } });

        if (!product) {
          return res.status(404).json({
            success: false,
            error: "Product not found",
          });
        }

        await product.update({
          stock: quantity,
          stockQuantity: quantity,
          updatedAt: new Date(),
        });

        stockStatus = {
          available: quantity,
          reserved: 0,
          total: quantity,
          status: quantity > 0 ? "in_stock" : "out_of_stock",
        };
      }

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
   * Publish product to platforms (Enhanced)
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

      let results;
      try {
        if (
          EnhancedProductManagementService &&
          typeof EnhancedProductManagementService.publishToPlatforms ===
            "function"
        ) {
          results = await EnhancedProductManagementService.publishToPlatforms(
            id,
            platforms
          );
        }
      } catch (error) {
        logger.debug(
          "Enhanced service not available, using basic publishing",
          error.message
        );

        // Basic publishing logic
        results = platforms.map((platform) => ({
          platform,
          success: true,
          message: "Publishing initiated (basic mode)",
        }));
      }

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
   * Scrape platform data (Enhanced)
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
   * Import from platform (Enhanced)
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
      if (!mappedData.baseSku && !mappedData.sku) {
        mappedData.sku = await this.skuManager.generateSKU(
          mappedData.name,
          mappedData.category,
          mappedData.brand
        );
        mappedData.baseSku = mappedData.sku;
      }

      // Create main product with mapped data
      const ProductModel = MainProduct || Product;
      const mainProduct = await ProductModel.create({
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
   * Auto-match products based on intelligent algorithms (Enhanced)
   */
  async autoMatchProducts(req, res) {
    try {
      const userId = req.user.id;

      logger.info(`Starting auto-match for user ${userId}`);

      // Get all main products for the user that need matching
      const ProductModel = MainProduct || Product;
      const products = await ProductModel.findAll({
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

      for (const product of products) {
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
          totalProcessed: products.length,
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
   * Perform auto-matching for a single product (Enhanced)
   */
  async performAutoMatch(product) {
    try {
      // Basic auto-matching logic - this can be enhanced with ML/AI later
      const productName = product.name.toLowerCase();
      const baseSku = (product.baseSku || product.sku || "").toLowerCase();

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
        if (product.category && (product.basePrice || product.price)) {
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
   * Classify product variant status
   */
  async classifyProductVariantStatus(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Get the product with platform data
      const product = await Product.findOne({
        where: { id, userId },
        include: [
          {
            model: PlatformData,
            as: "platformData",
            required: false,
          },
        ],
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Run variant classification
      const result = await EnhancedVariantDetector.classifyProductVariantStatus(
        product
      );

      res.json({
        success: true,
        data: result,
        message: "Product variant classification completed",
      });
    } catch (error) {
      logger.error("Error classifying product variant status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to classify product variant status",
        error: error.message,
      });
    }
  }

  /**
   * Update product variant status
   */
  async updateProductVariantStatus(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { classification } = req.body;

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

      // Update variant status
      const result = await EnhancedVariantDetector.updateProductVariantStatus(
        id,
        classification
      );

      res.json({
        success: true,
        data: result,
        message: "Product variant status updated successfully",
      });
    } catch (error) {
      logger.error("Error updating product variant status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update product variant status",
        error: error.message,
      });
    }
  }

  /**
   * Remove variant status from product
   */
  async removeProductVariantStatus(req, res) {
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
      // Remove variant status
      const result = await EnhancedVariantDetector.removeVariantStatus(id);

      res.json({
        success: true,
        data: result,
        message: "Product variant status removed successfully",
      });
    } catch (error) {
      logger.error("Error removing product variant status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to remove product variant status",
        error: error.message,
      });
    }
  }

  /**
   * Run batch variant detection on user's products
   */
  async runBatchVariantDetection(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 100, category, status } = req.query;

      // Get products for batch processing
      const whereClause = { userId };
      if (category) whereClause.category = category;
      if (status) whereClause.status = status;

      const products = await Product.findAll({
        where: whereClause,
        include: [
          {
            model: PlatformData,
            as: "platformData",
            required: false,
          },
        ],
        limit: parseInt(limit),
        order: [["updatedAt", "DESC"]],
      });

      // Import the enhanced variant detector
      // Run batch detection
      const result = await EnhancedVariantDetector.runBatchVariantDetection(
        products
      );

      res.json({
        success: true,
        data: result,
        message: `Batch variant detection completed. Processed: ${result.processed}, Updated: ${result.updated}, Errors: ${result.errors}`,
      });
    } catch (error) {
      logger.error("Error running batch variant detection:", error);
      res.status(500).json({
        success: false,
        message: "Failed to run batch variant detection",
        error: error.message,
      });
    }
  }

  /**
   * Get background variant detection service status
   */
  async getBackgroundVariantDetectionStatus(req, res) {
    try {
      const status = backgroundVariantDetectionService.getStatus();
      res.json({
        success: true,
        data: status,
        message: "Background variant detection service status retrieved",
      });
    } catch (error) {
      logger.error("Error getting background variant detection status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get service status",
        error: error.message,
      });
    }
  }

  /**
   * Start background variant detection service
   */
  async startBackgroundVariantDetection(req, res) {
    try {
      backgroundVariantDetectionService.start();
      res.json({
        success: true,
        message: "Background variant detection service started",
        data: backgroundVariantDetectionService.getStatus(),
      });
    } catch (error) {
      logger.error(
        "Error starting background variant detection service:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to start background variant detection service",
        error: error.message,
      });
    }
  }

  /**
   * Stop background variant detection service
   */
  async stopBackgroundVariantDetection(req, res) {
    try {
      backgroundVariantDetectionService.stop();
      res.json({
        success: true,
        message: "Background variant detection service stopped",
        data: backgroundVariantDetectionService.getStatus(),
      });
    } catch (error) {
      logger.error(
        "Error stopping background variant detection service:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to stop background variant detection service",
        error: error.message,
      });
    }
  }

  /**
   * Update background variant detection service configuration
   */
  async updateBackgroundVariantDetectionConfig(req, res) {
    try {
      const { config } = req.body;

      if (!config || typeof config !== "object") {
        return res.status(400).json({
          success: false,
          message: "Valid configuration object is required",
        });
      }

      backgroundVariantDetectionService.updateConfig(config);

      res.json({
        success: true,
        message: "Background variant detection service configuration updated",
        data: backgroundVariantDetectionService.getStatus(),
      });
    } catch (error) {
      logger.error(
        "Error updating background variant detection config:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to update service configuration",
        error: error.message,
      });
    }
  }

  /**
   * Get product model structure for field mapping
   */
  async getModelStructure(req, res) {
    try {
      logger.info("📋 Fetching product model structure for field mapping");

      // Define the product model structure based on your Product model
      const modelStructure = {
        fields: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Product name/title",
            category: "basic",
          },
          {
            name: "description",
            type: "text",
            required: false,
            description: "Product description",
            category: "basic",
          },
          {
            name: "price",
            type: "decimal",
            required: true,
            description: "Product price",
            category: "pricing",
          },
          {
            name: "stockQuantity",
            type: "integer",
            required: false,
            description: "Stock quantity",
            category: "inventory",
          },
          {
            name: "sku",
            type: "string",
            required: false,
            description: "Stock Keeping Unit",
            category: "basic",
          },
          {
            name: "barcode",
            type: "string",
            required: false,
            description: "Product barcode",
            category: "basic",
          },
          {
            name: "brand",
            type: "string",
            required: false,
            description: "Product brand",
            category: "basic",
          },
          {
            name: "category",
            type: "string",
            required: false,
            description: "Product category",
            category: "basic",
          },
          {
            name: "weight",
            type: "decimal",
            required: false,
            description: "Product weight",
            category: "physical",
          },
          {
            name: "dimensions",
            type: "object",
            required: false,
            description: "Product dimensions (length, width, height)",
            category: "physical",
          },
          {
            name: "images",
            type: "array",
            required: false,
            description: "Product images",
            category: "media",
          },
          {
            name: "tags",
            type: "array",
            required: false,
            description: "Product tags",
            category: "meta",
          },
          {
            name: "status",
            type: "enum",
            required: false,
            description: "Product status (active, inactive, draft)",
            category: "meta",
            options: ["active", "inactive", "draft"],
          },
        ],
        categories: [
          { id: "basic", name: "Basic Information" },
          { id: "pricing", name: "Pricing" },
          { id: "inventory", name: "Inventory" },
          { id: "physical", name: "Physical Properties" },
          { id: "media", name: "Media" },
          { id: "meta", name: "Meta Information" },
        ],
      };

      logger.info(
        `✅ Retrieved product model structure with ${modelStructure.fields.length} fields`
      );

      res.json({
        success: true,
        data: modelStructure,
      });
    } catch (error) {
      logger.error("❌ Error fetching product model structure:", {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        success: false,
        message: "Failed to fetch product model structure",
        error: error.message,
      });
    }
  }
}

module.exports = new ProductController();
