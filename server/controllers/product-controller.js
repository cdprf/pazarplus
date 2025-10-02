const {
  Product,
  PlatformConnection,
  PlatformData,
  MainProduct,
  PlatformVariant,
  PlatformTemplate,
  CustomerQuestion,
  User,
  sequelize,
} = require("../models");
const logger = require("../utils/logger");
const ProductMergeService = require("../services/product-merge-service");
const PlatformServiceFactory = require("../modules/order-management/services/platforms/platformServiceFactory");
const { validationResult } = require("express-validator");
const { Op } = require("sequelize");
const AdvancedInventoryService = require("../services/advanced-inventory-service");
const ProductManagementService = require("../services/product-management-service");
const StockService = require("../services/stock-service");
const MediaUploadService = require("../services/media-upload-service");
const PlatformScrapingService = require("../services/platform-scraping-service");
const VariantDetector = require("../services/variant-detector");
const backgroundVariantDetectionService = require("../services/background-variant-detection-service");
const PlatformSyncService = require("../services/platform-sync-service");
// const SKUSystemManager = require("../../sku-system-manager"); // TEMPORARILY COMMENTED OUT - MODULE MISSING
const multer = require("multer");
const XLSX = require("xlsx");
const csv = require("csv-parser");
const {
  ProductVariant,
  InventoryMovement,
  StockReservation,
} = require("../models");
const { sanitizePlatformType } = require("../utils/enum-validators");

class ProductController {
  constructor() {
    // this.skuManager = new SKUSystemManager(); // TEMPORARILY COMMENTED OUT - MODULE MISSING
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
        minQuestions,
        maxQuestions,
        hasQuestions,
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
        const searchConditions = [
          { name: { [Op.iLike]: `%${search}%` } },
          { sku: { [Op.iLike]: `%${search}%` } },
          { category: { [Op.iLike]: `%${search}%` } },
        ];

        // Add nullable fields with proper null checks
        searchConditions.push(
          {
            [Op.and]: [
              { barcode: { [Op.ne]: null } },
              { barcode: { [Op.iLike]: `%${search}%` } },
            ],
          },
          {
            [Op.and]: [
              { description: { [Op.ne]: null } },
              { description: { [Op.iLike]: `%${search}%` } },
            ],
          }
        );

        whereClause[Op.or] = searchConditions;
      }

      // Add category filter
      if (category && category.trim() !== "") {
        whereClause.category = { [Op.iLike]: `%${category}%` };
      }

      // Add sourcing filter
      if (req.query.sourcing && req.query.sourcing.trim() !== "") {
        whereClause.sourcing = req.query.sourcing;
      }

      // Add platform filter
      if (platform && platform !== "all" && platform.trim() !== "") {
        const sanitizedPlatform = sanitizePlatformType(platform);
        if (sanitizedPlatform) {
          whereClause.sourcePlatform = sanitizedPlatform;
        }
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
      const platformDataWhere = {
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

      // Don't include CustomerQuestion directly since the association is complex
      // Instead, we'll add questions count in post-processing

      // Check if we need question-based filtering, which requires different pagination approach
      const hasQuestionFiltering =
        minQuestions ||
        maxQuestions ||
        hasQuestions ||
        sortBy === "questionsCount";

      let products, totalFilteredItems;

      if (hasQuestionFiltering) {
        // For question-based filtering/sorting, we need to get all products first,
        // then filter and paginate in memory (less efficient but necessary for complex queries)
        const { rows: allProducts } = await Product.findAndCountAll({
          where: whereClause,
          include: includeClause,
          order:
            sortBy !== "questionsCount"
              ? [[sortBy, sortOrder]]
              : [["updatedAt", "DESC"]],
          distinct: true,
        });

        // Get questions count for all products
        const allProductIds = allProducts.map((p) => `'${p.id}'`).join(",");
        let questionsCountMap = {};

        if (allProductIds) {
          try {
            const questionsCounts = await sequelize.query(
              `
              SELECT 
                pd."entityId" as product_id,
                COUNT(cq.id)::int as questions_count
              FROM platform_data pd
              LEFT JOIN customer_questions cq ON (
                pd.data#>>'{source,stockCode}' = cq.product_main_id OR
                pd.data#>>'{source,sku}' = cq.product_main_id
              )
              WHERE pd."entityId" IN (${allProductIds})
              GROUP BY pd."entityId"
            `,
              {
                type: sequelize.QueryTypes.SELECT,
              }
            );

            questionsCountMap = questionsCounts.reduce((map, item) => {
              map[item.product_id] = item.questions_count;
              return map;
            }, {});
          } catch (error) {
            logger.warn("Failed to get questions counts:", error.message);
          }
        }

        // Add questions count to each product
        allProducts.forEach((product) => {
          product.dataValues.questionsCount =
            questionsCountMap[product.id] || 0;
        });

        // Apply question-based filtering
        let filteredProducts = allProducts;
        if (minQuestions || maxQuestions || hasQuestions) {
          filteredProducts = allProducts.filter((product) => {
            const questionsCount = product.dataValues.questionsCount || 0;

            if (minQuestions && questionsCount < parseInt(minQuestions)) {
              return false;
            }
            if (maxQuestions && questionsCount > parseInt(maxQuestions)) {
              return false;
            }
            if (hasQuestions === "true" && questionsCount === 0) {
              return false;
            }
            if (hasQuestions === "false" && questionsCount > 0) {
              return false;
            }
            return true;
          });
        }

        // Sort by questions count if requested
        if (sortBy === "questionsCount") {
          filteredProducts.sort((a, b) => {
            const aCount = a.dataValues.questionsCount || 0;
            const bCount = b.dataValues.questionsCount || 0;
            return sortOrder === "ASC" ? aCount - bCount : bCount - aCount;
          });
        }

        // Apply pagination in memory
        totalFilteredItems = filteredProducts.length;
        const startIndex = offset;
        const endIndex = startIndex + parseInt(limit);
        products = filteredProducts.slice(startIndex, endIndex);
      } else {
        // For regular filtering, use efficient database pagination
        const { count, rows: dbProducts } = await Product.findAndCountAll({
          where: whereClause,
          include: includeClause,
          limit: parseInt(limit),
          offset: offset,
          order: [[sortBy, sortOrder]],
          distinct: true,
        });

        products = dbProducts;
        totalFilteredItems = count;

        // Still get questions count for display purposes
        const productIds = products.map((p) => `'${p.id}'`).join(",");
        let questionsCountMap = {};

        if (productIds) {
          try {
            const questionsCounts = await sequelize.query(
              `
              SELECT 
                pd."entityId" as product_id,
                COUNT(cq.id)::int as questions_count
              FROM platform_data pd
              LEFT JOIN customer_questions cq ON (
                pd.data#>>'{source,stockCode}' = cq.product_main_id OR
                pd.data#>>'{source,sku}' = cq.product_main_id
              )
              WHERE pd."entityId" IN (${productIds})
              GROUP BY pd."entityId"
            `,
              {
                type: sequelize.QueryTypes.SELECT,
              }
            );

            questionsCountMap = questionsCounts.reduce((map, item) => {
              map[item.product_id] = item.questions_count;
              return map;
            }, {});
          } catch (error) {
            logger.warn("Failed to get questions counts:", error.message);
          }
        }

        // Add questions count to each product
        products.forEach((product) => {
          product.dataValues.questionsCount =
            questionsCountMap[product.id] || 0;
        });
      }

      // Calculate pagination info (using 1-indexed page numbers for frontend)
      const currentPageNumber = parseInt(page);
      const totalPages = Math.ceil(totalFilteredItems / parseInt(limit));
      const hasNextPage = currentPageNumber < totalPages;
      const hasPrevPage = currentPageNumber > 1;

      res.json({
        success: true,
        data: {
          products: products,
          pagination: {
            currentPage: currentPageNumber,
            totalPages,
            totalItems: totalFilteredItems,
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
          logger.info(`Filtering by platforms: ${validPlatforms.join(", ")}`);
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
          logger.info(`Filtering by single platform: ${sanitizedPlatform}`);
        }
      } else {
        logger.info(
          "No platform filtering applied - syncing from all active platforms"
        );
      }

      const connections = await PlatformConnection.findAll({
        where: whereClause,
      });

      logger.info(
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

      // Use Product model to match the table where products actually exist
      const product = await Product.findOne({
        where: { id, userId },
        include: [
          {
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
          },
        ],
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      await product.update(updates);

      // Get the updated product with fresh data including platform variants
      const updatedProduct = await product.reload({
        include: [
          {
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
          },
        ],
      });

      // Sync changes to all connected platforms (asynchronously)
      const platformSyncPromise = PlatformSyncService.syncProductToAllPlatforms(
        userId,
        updatedProduct,
        "update",
        updates
      ).catch((error) => {
        logger.error("Platform sync failed for product update:", {
          productId: product.id,
          error: error.message,
        });
      });

      // Don't wait for platform sync to complete - respond immediately but include platform info
      platformSyncPromise.then((syncResult) => {
        if (syncResult) {
          logger.info("✅ Platform sync completed for product:", {
            productId: product.id,
            platforms: syncResult.platforms || [],
            syncStrategy: syncResult.syncStrategy,
            totalPlatforms: syncResult.totalPlatforms,
          });
        }
      });

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

      // Include platform information in response
      const platformInfo = {
        platforms:
          updatedProduct.platformVariants?.map((pv) => ({
            platform: pv.platform,
            isPublished: pv.isPublished,
            syncStatus: pv.syncStatus,
            externalId: pv.externalId,
            platformSku: pv.platformSku,
          })) || [],
        totalPlatforms: updatedProduct.platformVariants?.length || 0,
        hasMultiplePlatforms:
          (updatedProduct.platformVariants?.length || 0) > 1,
      };

      res.json({
        success: true,
        message: "Product updated successfully",
        data: updatedProduct,
        platformInfo,
        syncInProgress: true, // Indicate that platform sync is happening
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
        sourcing, // Add sourcing field
        // New fields for main/variant classification
        isMainProduct = false,
        isVariant = false,
        hasVariants = false,
        parentProductId = null,
        variantType = null,
        variantValue = null,
        variantGroupId = null,
      } = req.body;

      const userId = req.user.id;

      // Validation: Cannot be both main and variant
      if (isMainProduct && isVariant) {
        return res.status(400).json({
          success: false,
          message: "Product cannot be both main product and variant",
        });
      }

      // Validation: If variant, must have parent or group
      if (isVariant && !parentProductId && !variantGroupId) {
        return res.status(400).json({
          success: false,
          message:
            "Variant products must have a parent product or variant group",
        });
      }

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
        sourcing, // Add sourcing field
        // Main/variant classification
        isMainProduct,
        isVariant,
        hasVariants,
        parentProductId,
        variantType,
        variantValue,
        variantGroupId,
        // Mark as user-created
        creationSource: "user",
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
          {
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
          },
        ],
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Get related customer questions via platform data
      const relatedQuestions = await sequelize.query(
        `
        SELECT cq.*
        FROM customer_questions cq
        INNER JOIN platform_data pd ON (
          pd.data#>>'{source,stockCode}' = cq.product_main_id OR
          pd.data#>>'{source,sku}' = cq.product_main_id
        )
        WHERE pd."entityId" = :productId
        ORDER BY cq.creation_date DESC
      `,
        {
          replacements: { productId: product.id },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      // Add questions to product data
      product.dataValues.customerQuestions = relatedQuestions;
      product.dataValues.questionsCount = relatedQuestions.length;

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
   * Get import options and configuration
   */
  async getImportOptions(req, res) {
    try {
      const importOptions = {
        platforms: [
          { id: "trendyol", name: "Trendyol", enabled: true },
          { id: "hepsiburada", name: "Hepsiburada", enabled: true },
          { id: "n11", name: "N11", enabled: true },
        ],
        fileTypes: ["csv", "xlsx", "xls"],
        maxFileSize: 10485760, // 10MB
        supportedFields: [
          { id: "name", label: "Ürün Adı", required: true, type: "text" },
          {
            id: "description",
            label: "Açıklama",
            required: false,
            type: "text",
          },
          { id: "price", label: "Fiyat", required: true, type: "number" },
          {
            id: "costPrice",
            label: "Maliyet Fiyatı",
            required: false,
            type: "number",
          },
          {
            id: "discountedPrice",
            label: "İndirimli Fiyat",
            required: false,
            type: "number",
          },
          {
            id: "stockQuantity",
            label: "Stok Miktarı",
            required: false,
            type: "number",
          },
          {
            id: "minStockLevel",
            label: "Minimum Stok Seviyesi",
            required: false,
            type: "number",
          },
          { id: "category", label: "Kategori", required: false, type: "text" },
          {
            id: "subCategory",
            label: "Alt Kategori",
            required: false,
            type: "text",
          },
          { id: "brand", label: "Marka", required: false, type: "text" },
          { id: "model", label: "Model", required: false, type: "text" },
          { id: "sku", label: "SKU", required: false, type: "text" },
          { id: "barcode", label: "Barkod", required: false, type: "text" },
          { id: "mpn", label: "MPN", required: false, type: "text" },
          { id: "gtin", label: "GTIN", required: false, type: "text" },
          {
            id: "weight",
            label: "Ağırlık (kg)",
            required: false,
            type: "number",
          },
          {
            id: "length",
            label: "Uzunluk (cm)",
            required: false,
            type: "number",
          },
          {
            id: "width",
            label: "Genişlik (cm)",
            required: false,
            type: "number",
          },
          {
            id: "height",
            label: "Yükseklik (cm)",
            required: false,
            type: "number",
          },
          {
            id: "volume",
            label: "Hacim (cm³)",
            required: false,
            type: "number",
          },
          { id: "material", label: "Malzeme", required: false, type: "text" },
          { id: "color", label: "Renk", required: false, type: "text" },
          { id: "size", label: "Beden/Boyut", required: false, type: "text" },
          { id: "warranty", label: "Garanti", required: false, type: "text" },
          { id: "origin", label: "Menşei", required: false, type: "text" },
          { id: "tags", label: "Etiketler", required: false, type: "text" },
          { id: "status", label: "Durum", required: false, type: "text" },
          {
            id: "vatRate",
            label: "KDV Oranı",
            required: false,
            type: "number",
          },
          {
            id: "cargoCompany",
            label: "Kargo Firması",
            required: false,
            type: "text",
          },
          { id: "image1", label: "Ana Görsel", required: false, type: "url" },
          { id: "image2", label: "Görsel 2", required: false, type: "url" },
          { id: "image3", label: "Görsel 3", required: false, type: "url" },
          { id: "image4", label: "Görsel 4", required: false, type: "url" },
          { id: "image5", label: "Görsel 5", required: false, type: "url" },
          { id: "image6", label: "Görsel 6", required: false, type: "url" },
          { id: "image7", label: "Görsel 7", required: false, type: "url" },
          { id: "image8", label: "Görsel 8", required: false, type: "url" },
          { id: "image9", label: "Görsel 9", required: false, type: "url" },
          { id: "image10", label: "Görsel 10", required: false, type: "url" },
          {
            id: "thumbnailImage",
            label: "Küçük Görsel",
            required: false,
            type: "url",
          },
          {
            id: "mainImage",
            label: "Ana Kapak Görseli",
            required: false,
            type: "url",
          },
        ],
        validationRules: {
          required: ["name", "price"],
          numeric: [
            "price",
            "costPrice",
            "discountedPrice",
            "stockQuantity",
            "minStockLevel",
            "weight",
            "length",
            "width",
            "height",
            "volume",
            "vatRate",
          ],
          text: [
            "name",
            "description",
            "category",
            "subCategory",
            "brand",
            "model",
            "sku",
            "barcode",
            "mpn",
            "gtin",
            "material",
            "color",
            "size",
            "warranty",
            "origin",
            "tags",
            "status",
            "cargoCompany",
          ],
          url: [
            "image1",
            "image2",
            "image3",
            "image4",
            "image5",
            "image6",
            "image7",
            "image8",
            "image9",
            "image10",
            "thumbnailImage",
            "mainImage",
          ],
        },
        templates: [
          {
            id: "basic",
            name: "Temel Ürün Şablonu",
            description:
              "Temel ürün bilgileri ve 4 görsel ile hızlı içe aktarma",
            fields: [
              "name",
              "description",
              "price",
              "stockQuantity",
              "category",
              "brand",
              "sku",
              "image1",
              "image2",
              "image3",
              "image4",
            ],
          },
          {
            id: "advanced",
            name: "Gelişmiş Ürün Şablonu",
            description:
              "Tüm ürün bilgileri, boyutlar, malzeme bilgileri ve 8+ görsel desteği",
            fields: [
              "name",
              "description",
              "price",
              "costPrice",
              "discountedPrice",
              "stockQuantity",
              "minStockLevel",
              "category",
              "subCategory",
              "brand",
              "model",
              "sku",
              "barcode",
              "mpn",
              "gtin",
              "weight",
              "length",
              "width",
              "height",
              "volume",
              "material",
              "color",
              "size",
              "warranty",
              "origin",
              "tags",
              "status",
              "vatRate",
              "cargoCompany",
              "image1",
              "image2",
              "image3",
              "image4",
              "image5",
              "image6",
              "image7",
              "image8",
              "image9",
              "image10",
              "thumbnailImage",
              "mainImage",
            ],
          },
          {
            id: "e-commerce",
            name: "E-Ticaret Özel Şablonu",
            description:
              "E-ticaret platformları için optimized şablon - Kapsamlı görsel ve detay desteği",
            fields: [
              "name",
              "description",
              "price",
              "discountedPrice",
              "stockQuantity",
              "category",
              "brand",
              "model",
              "sku",
              "barcode",
              "color",
              "size",
              "warranty",
              "tags",
              "image1",
              "image2",
              "image3",
              "image4",
              "image5",
              "image6",
              "image7",
              "image8",
              "mainImage",
              "thumbnailImage",
            ],
          },
          {
            id: "marketplace",
            name: "Marketplace Şablonu",
            description:
              "Trendyol, Hepsiburada, N11 gibi marketplace platformları için özel şablon",
            fields: [
              "name",
              "description",
              "price",
              "costPrice",
              "stockQuantity",
              "category",
              "brand",
              "sku",
              "barcode",
              "weight",
              "length",
              "width",
              "height",
              "image1",
              "image2",
              "image3",
              "image4",
              "image5",
              "image6",
              "image7",
              "image8",
              "image9",
              "image10",
            ],
          },
        ],
      };

      res.json({
        success: true,
        data: importOptions,
      });
    } catch (error) {
      logger.error("Error getting import options:", error);
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to get import options",
          details: error.message,
        },
      });
    }
  }

  /**
   * Preview uploaded import file and suggest field mappings
   */
  async previewImportFile(req, res) {
    console.log("🔍 CONTROLLER DEBUG: previewImportFile called", {
      hasFile: !!req.file,
      fileDetails: req.file
        ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            fieldname: req.file.fieldname,
          }
        : "NO FILE",
      bodyKeys: Object.keys(req.body || {}),
      headers: {
        contentType: req.headers["content-type"],
        contentLength: req.headers["content-length"],
      },
    });
    try {
      logger.info("🔍 Import preview attempt started", {
        userId: req.user?.id,
        hasFile: !!req.file,
        headers: Object.keys(req.headers),
        contentType: req.headers["content-type"],
      });

      const userId = req.user.id;

      if (!req.file) {
        logger.warn("❌ No file uploaded in preview request", { userId });
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const file = req.file;
      logger.info("📁 File received", {
        userId,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        bufferLength: file.buffer?.length,
      });

      const fileExtension = file.originalname.split(".").pop().toLowerCase();
      logger.info("🔧 Processing file extension", { userId, fileExtension });

      let previewData = [];
      let headers = [];

      // Parse file based on extension
      logger.info("📊 Starting file parsing", { userId, fileExtension });

      if (fileExtension === "csv") {
        logger.info("🗂️ Processing CSV file", { userId });
        try {
          const csvData = file.buffer.toString("utf8");
          logger.info("📄 CSV data extracted", {
            userId,
            csvLength: csvData.length,
            firstChars: csvData.substring(0, 100),
          });

          const lines = csvData.split("\n").filter((line) => line.trim());
          logger.info("📋 CSV lines processed", {
            userId,
            lineCount: lines.length,
          });

          if (lines.length > 0) {
            headers = lines[0]
              .split(",")
              .map((h) => h.trim().replace(/"/g, ""));
            logger.info("📝 CSV headers extracted", { userId, headers });

            previewData = lines
              .slice(1, Math.min(6, lines.length))
              .map((line) => {
                const values = line
                  .split(",")
                  .map((v) => v.trim().replace(/"/g, ""));
                return headers.reduce((obj, header, index) => {
                  obj[header] = values[index] || "";
                  return obj;
                }, {});
              });
            logger.info("🔍 CSV preview data created", {
              userId,
              previewRowCount: previewData.length,
            });
          }
        } catch (csvError) {
          logger.error("❌ CSV parsing error", {
            userId,
            error: csvError.message,
            stack: csvError.stack,
          });
          throw csvError;
        }
      } else if (["xlsx", "xls"].includes(fileExtension)) {
        logger.info("📊 Processing Excel file", { userId, fileExtension });
        try {
          const workbook = XLSX.read(file.buffer, { type: "buffer" });
          logger.info("📈 Excel workbook loaded", {
            userId,
            sheetNames: workbook.SheetNames,
            sheetCount: workbook.SheetNames.length,
          });

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          logger.info("📋 Excel worksheet selected", { userId, sheetName });

          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          logger.info("🔄 Excel data converted to JSON", {
            userId,
            rowCount: jsonData.length,
          });

          if (jsonData.length > 0) {
            headers = jsonData[0].map((h) => String(h || "").trim());
            logger.info("📝 Excel headers extracted", { userId, headers });

            previewData = jsonData
              .slice(1, Math.min(6, jsonData.length))
              .map((row) => {
                return headers.reduce((obj, header, index) => {
                  obj[header] = String(row[index] || "").trim();
                  return obj;
                }, {});
              });
            logger.info("🔍 Excel preview data created", {
              userId,
              previewRowCount: previewData.length,
            });
          }
        } catch (excelError) {
          logger.error("❌ Excel parsing error", {
            userId,
            error: excelError.message,
            stack: excelError.stack,
          });
          throw excelError;
        }
      } else {
        logger.warn("❌ Unsupported file format", { userId, fileExtension });
        return res.status(400).json({
          success: false,
          message: "Unsupported file format. Please use CSV or Excel files.",
        });
      }

      // Get supported fields from import options
      const importOptions = {
        supportedFields: [
          { id: "name", label: "Ürün Adı", required: true, type: "text" },
          {
            id: "description",
            label: "Açıklama",
            required: false,
            type: "text",
          },
          { id: "price", label: "Fiyat", required: true, type: "number" },
          {
            id: "costPrice",
            label: "Maliyet Fiyatı",
            required: false,
            type: "number",
          },
          {
            id: "discountedPrice",
            label: "İndirimli Fiyat",
            required: false,
            type: "number",
          },
          {
            id: "stockQuantity",
            label: "Stok Miktarı",
            required: false,
            type: "number",
          },
          {
            id: "minStockLevel",
            label: "Minimum Stok Seviyesi",
            required: false,
            type: "number",
          },
          { id: "category", label: "Kategori", required: false, type: "text" },
          {
            id: "subCategory",
            label: "Alt Kategori",
            required: false,
            type: "text",
          },
          { id: "brand", label: "Marka", required: false, type: "text" },
          { id: "model", label: "Model", required: false, type: "text" },
          { id: "sku", label: "SKU", required: false, type: "text" },
          { id: "barcode", label: "Barkod", required: false, type: "text" },
          { id: "mpn", label: "MPN", required: false, type: "text" },
          { id: "gtin", label: "GTIN", required: false, type: "text" },
          {
            id: "weight",
            label: "Ağırlık (kg)",
            required: false,
            type: "number",
          },
          {
            id: "length",
            label: "Uzunluk (cm)",
            required: false,
            type: "number",
          },
          {
            id: "width",
            label: "Genişlik (cm)",
            required: false,
            type: "number",
          },
          {
            id: "height",
            label: "Yükseklik (cm)",
            required: false,
            type: "number",
          },
          {
            id: "volume",
            label: "Hacim (cm³)",
            required: false,
            type: "number",
          },
          { id: "material", label: "Malzeme", required: false, type: "text" },
          { id: "color", label: "Renk", required: false, type: "text" },
          { id: "size", label: "Beden/Boyut", required: false, type: "text" },
          { id: "warranty", label: "Garanti", required: false, type: "text" },
          { id: "origin", label: "Menşei", required: false, type: "text" },
          { id: "tags", label: "Etiketler", required: false, type: "text" },
          { id: "status", label: "Durum", required: false, type: "text" },
          {
            id: "vatRate",
            label: "KDV Oranı",
            required: false,
            type: "number",
          },
          {
            id: "cargoCompany",
            label: "Kargo Firması",
            required: false,
            type: "text",
          },
          { id: "image1", label: "Ana Görsel", required: false, type: "url" },
          { id: "image2", label: "Görsel 2", required: false, type: "url" },
          { id: "image3", label: "Görsel 3", required: false, type: "url" },
          { id: "image4", label: "Görsel 4", required: false, type: "url" },
          { id: "image5", label: "Görsel 5", required: false, type: "url" },
          { id: "image6", label: "Görsel 6", required: false, type: "url" },
          { id: "image7", label: "Görsel 7", required: false, type: "url" },
          { id: "image8", label: "Görsel 8", required: false, type: "url" },
          { id: "image9", label: "Görsel 9", required: false, type: "url" },
          { id: "image10", label: "Görsel 10", required: false, type: "url" },
          {
            id: "thumbnailImage",
            label: "Küçük Görsel",
            required: false,
            type: "url",
          },
          {
            id: "mainImage",
            label: "Ana Kapak Görseli",
            required: false,
            type: "url",
          },
        ],
      };

      // Generate field mapping suggestions
      logger.info("🎯 Generating field mapping suggestions", {
        userId,
        headersCount: headers.length,
      });
      let mappingSuggestions;
      try {
        mappingSuggestions = generateFieldMappingSuggestions(
          headers,
          importOptions.supportedFields
        );
        logger.info("✅ Field mapping suggestions generated", {
          userId,
          suggestionsCount: Object.keys(mappingSuggestions).length,
          suggestions: mappingSuggestions,
        });
      } catch (mappingError) {
        logger.error("❌ Field mapping error", {
          userId,
          error: mappingError.message,
          stack: mappingError.stack,
        });
        throw mappingError;
      }

      // Calculate total rows in original file (approximation)
      let totalRows = 0;
      if (fileExtension === "csv") {
        const csvData = file.buffer.toString("utf8");
        totalRows =
          csvData.split("\n").filter((line) => line.trim()).length - 1; // Subtract header row
      } else if (["xlsx", "xls"].includes(fileExtension)) {
        const workbook = XLSX.read(file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        totalRows = jsonData.length - 1; // Subtract header row
      }

      logger.info(
        `File preview generated for user ${userId}: ${file.originalname}, ${totalRows} rows`
      );

      res.json({
        success: true,
        data: {
          fileName: file.originalname,
          fileSize: file.size,
          fileType: fileExtension,
          headers: headers,
          preview: {
            rows: previewData,
            totalRows: Math.max(0, totalRows),
            previewRows: previewData.length,
          },
          mappingSuggestions: {
            mappings: mappingSuggestions,
            supportedFields: importOptions.supportedFields,
          },
        },
      });
    } catch (error) {
      logger.error("Error previewing import file:", error);
      res.status(500).json({
        success: false,
        message: "Failed to preview import file",
        error: error.message,
      });
    }
  }

  /**
   * Import products from uploaded file
   */
  async importProducts(req, res) {
    try {
      const userId = req.user.id;

      // For now, return a mock successful response
      // In a real implementation, you would:
      // 1. Parse the uploaded file (CSV/Excel)
      // 2. Validate the data
      // 3. Create products in the database
      // 4. Return import results

      logger.info(`Product import requested by user ${userId}`);

      // Mock response simulating successful import
      const importResults = {
        total: 0,
        successful: 0,
        failed: 0,
        errors: [],
        created: 0,
        updated: 0,
      };

      res.json({
        success: true,
        data: importResults,
        message:
          "Import functionality is ready - file processing not yet implemented",
      });
    } catch (error) {
      logger.error("Error importing products:", error);
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to import products",
          details: error.message,
        },
      });
    }
  }

  /**
   * Download import template file
   */
  async downloadImportTemplate(req, res) {
    try {
      const { platform = "generic", format = "csv" } = req.query;

      // Define comprehensive template headers and examples based on platform with extended fields
      const templateData = {
        generic: {
          headers: [
            "name",
            "description",
            "price",
            "costPrice",
            "discountedPrice",
            "stockQuantity",
            "minStockLevel",
            "category",
            "subCategory",
            "brand",
            "model",
            "sku",
            "barcode",
            "mpn",
            "gtin",
            "weight",
            "length",
            "width",
            "height",
            "volume",
            "material",
            "color",
            "size",
            "warranty",
            "origin",
            "tags",
            "status",
            "vatRate",
            "cargoCompany",
            "image1",
            "image2",
            "image3",
            "image4",
            "image5",
            "image6",
            "image7",
            "image8",
            "image9",
            "image10",
            "thumbnailImage",
            "mainImage",
          ],
          example: [
            "Premium Bluetooth Kulaklık",
            "Kablosuz Bluetooth 5.0 teknolojisi ile yüksek kaliteli ses deneyimi",
            "299.99",
            "150.00",
            "249.99",
            "100",
            "10",
            "Elektronik",
            "Ses & Görüntü",
            "TechBrand",
            "TB-BT500",
            "SKU123456",
            "1234567890123",
            "MPN789",
            "GTIN012",
            "0.25",
            "18",
            "15",
            "6",
            "1620",
            "ABS Plastik",
            "Siyah",
            "Standart",
            "24 Ay",
            "Türkiye",
            "bluetooth,kulaklık,kablosuz,müzik",
            "active",
            "18",
            "Yurtiçi Kargo",
            "https://example.com/images/product1-main.jpg",
            "https://example.com/images/product1-side.jpg",
            "https://example.com/images/product1-back.jpg",
            "https://example.com/images/product1-box.jpg",
            "https://example.com/images/product1-details.jpg",
            "https://example.com/images/product1-usage.jpg",
            "https://example.com/images/product1-colors.jpg",
            "https://example.com/images/product1-accessories.jpg",
            "https://example.com/images/product1-lifestyle.jpg",
            "https://example.com/images/product1-comparison.jpg",
            "https://example.com/images/product1-thumb.jpg",
            "https://example.com/images/product1-main.jpg",
          ],
          description:
            "Kapsamlı genel ürün içe aktarma şablonu - Tüm platform desteği ile",
        },
        trendyol: {
          headers: [
            "name",
            "description",
            "price",
            "costPrice",
            "discountedPrice",
            "stockQuantity",
            "minStockLevel",
            "category",
            "subCategory",
            "brand",
            "model",
            "sku",
            "barcode",
            "mpn",
            "gtin",
            "weight",
            "length",
            "width",
            "height",
            "volume",
            "material",
            "color",
            "size",
            "warranty",
            "origin",
            "tags",
            "status",
            "vatRate",
            "cargoCompany",
            "image1",
            "image2",
            "image3",
            "image4",
            "image5",
            "image6",
            "image7",
            "image8",
            "image9",
            "image10",
            "thumbnailImage",
            "mainImage",
            "productMainId",
            "trendyolCategory",
            "shipmentTemplate",
            "deliveryDuration",
          ],
          example: [
            "iPhone 14 Pro Max Kılıf Şeffaf",
            "Darbe emici köşeli tasarım ile iPhone 14 Pro Max için şeffaf koruyucu kılıf",
            "89.99",
            "35.00",
            "69.99",
            "250",
            "25",
            "Cep Telefonu & Aksesuar",
            "Telefon Kılıfı",
            "CaseMaster",
            "CM-IP14PM-CLR",
            "TY-CM789",
            "8681234567890",
            "CM789IP14",
            "GTIN8681234567890",
            "0.05",
            "16",
            "8",
            "1",
            "128",
            "TPU Silikon",
            "Şeffaf",
            "iPhone 14 Pro Max",
            "12 Ay",
            "Türkiye",
            "iphone,kılıf,şeffaf,koruma,silikon",
            "active",
            "18",
            "Trendyol Express",
            "https://cdn.trendyol.com/product/main1.jpg",
            "https://cdn.trendyol.com/product/angle1.jpg",
            "https://cdn.trendyol.com/product/back1.jpg",
            "https://cdn.trendyol.com/product/side1.jpg",
            "https://cdn.trendyol.com/product/detail1.jpg",
            "https://cdn.trendyol.com/product/usage1.jpg",
            "https://cdn.trendyol.com/product/colors1.jpg",
            "https://cdn.trendyol.com/product/pack1.jpg",
            "https://cdn.trendyol.com/product/lifestyle1.jpg",
            "https://cdn.trendyol.com/product/size1.jpg",
            "https://cdn.trendyol.com/product/thumb1.jpg",
            "https://cdn.trendyol.com/product/main1.jpg",
            "TYMAIN123456",
            "1190",
            "standard-shipment",
            "1-3",
          ],
          description:
            "Trendyol platformu için kapsamlı ürün içe aktarma şablonu - Tüm alanlar dahil",
        },
        hepsiburada: {
          headers: [
            "name",
            "description",
            "price",
            "costPrice",
            "discountedPrice",
            "stockQuantity",
            "minStockLevel",
            "category",
            "subCategory",
            "brand",
            "model",
            "sku",
            "barcode",
            "mpn",
            "gtin",
            "weight",
            "length",
            "width",
            "height",
            "volume",
            "material",
            "color",
            "size",
            "warranty",
            "origin",
            "tags",
            "status",
            "vatRate",
            "cargoCompany",
            "image1",
            "image2",
            "image3",
            "image4",
            "image5",
            "image6",
            "image7",
            "image8",
            "image9",
            "image10",
            "thumbnailImage",
            "mainImage",
            "merchantSku",
            "hepsiburadaCategory",
            "packageWidth",
            "packageHeight",
            "packageLength",
          ],
          example: [
            "Samsung Galaxy S23 Ultra Wireless Şarj Cihazı",
            "Hızlı kablosuz şarj özellikli 15W güçlü şarj istasyonu",
            "399.99",
            "180.00",
            "349.99",
            "150",
            "15",
            "Elektronik",
            "Şarj Cihazları",
            "Samsung",
            "EP-P4300",
            "HB-SAM-WC15",
            "8806094123456",
            "EP4300SAM",
            "GTIN8806094123456",
            "0.45",
            "10",
            "10",
            "2",
            "200",
            "Alüminyum",
            "Beyaz",
            "Universal",
            "24 Ay",
            "Güney Kore",
            "samsung,kablosuz,şarj,wireless,15w",
            "active",
            "18",
            "Hepsijet",
            "https://productimages.hepsiburada.net/main1.jpg",
            "https://productimages.hepsiburada.net/side1.jpg",
            "https://productimages.hepsiburada.net/back1.jpg",
            "https://productimages.hepsiburada.net/top1.jpg",
            "https://productimages.hepsiburada.net/detail1.jpg",
            "https://productimages.hepsiburada.net/usage1.jpg",
            "https://productimages.hepsiburada.net/led1.jpg",
            "https://productimages.hepsiburada.net/package1.jpg",
            "https://productimages.hepsiburada.net/lifestyle1.jpg",
            "https://productimages.hepsiburada.net/tech1.jpg",
            "https://productimages.hepsiburada.net/thumb1.jpg",
            "https://productimages.hepsiburada.net/main1.jpg",
            "MERCHANT-SAM-WC789",
            "18002000",
            "12",
            "12",
            "3",
          ],
          description:
            "Hepsiburada platformu için kapsamlı ürün içe aktarma şablonu - Detaylı alan desteği",
        },
        n11: {
          headers: [
            "name",
            "description",
            "price",
            "costPrice",
            "discountedPrice",
            "stockQuantity",
            "minStockLevel",
            "category",
            "subCategory",
            "brand",
            "model",
            "sku",
            "barcode",
            "mpn",
            "gtin",
            "weight",
            "length",
            "width",
            "height",
            "volume",
            "material",
            "color",
            "size",
            "warranty",
            "origin",
            "tags",
            "status",
            "vatRate",
            "cargoCompany",
            "image1",
            "image2",
            "image3",
            "image4",
            "image5",
            "image6",
            "image7",
            "image8",
            "image9",
            "image10",
            "thumbnailImage",
            "mainImage",
            "productSellerCode",
            "n11Category",
            "preparationDays",
            "shipmentTemplate",
            "returnable",
          ],
          example: [
            "Xiaomi Mi Band 7 Akıllı Bileklik",
            "AMOLED ekran ve 14 gün pil ömrü ile gelişmiş fitness takibi",
            "249.99",
            "120.00",
            "199.99",
            "180",
            "20",
            "Teknoloji",
            "Giyilebilir Teknoloji",
            "Xiaomi",
            "Mi Band 7",
            "N11-XM-MB7",
            "6934177123456",
            "MIBAND7XM",
            "GTIN6934177123456",
            "0.025",
            "4.65",
            "2.09",
            "1.28",
            "12.5",
            "Plastik",
            "Siyah",
            "Universal",
            "12 Ay",
            "Çin",
            "xiaomi,akıllı,bileklik,fitness,spor",
            "active",
            "18",
            "N11 Express",
            "https://n11scdn.akamaized.net/product1-main.jpg",
            "https://n11scdn.akamaized.net/product1-side.jpg",
            "https://n11scdn.akamaized.net/product1-back.jpg",
            "https://n11scdn.akamaized.net/product1-screen.jpg",
            "https://n11scdn.akamaized.net/product1-band.jpg",
            "https://n11scdn.akamaized.net/product1-features.jpg",
            "https://n11scdn.akamaized.net/product1-sports.jpg",
            "https://n11scdn.akamaized.net/product1-package.jpg",
            "https://n11scdn.akamaized.net/product1-lifestyle.jpg",
            "https://n11scdn.akamaized.net/product1-comparison.jpg",
            "https://n11scdn.akamaized.net/product1-thumb.jpg",
            "https://n11scdn.akamaized.net/product1-main.jpg",
            "SELLER-XM-MB7-001",
            "1002002",
            "1",
            "fast-delivery",
            "true",
          ],
          description:
            "N11 platformu için kapsamlı ürün içe aktarma şablonu - Geniş alan desteği",
        },
      };

      const template = templateData[platform] || templateData.generic;
      const { headers, example, description } = template;

      if (format === "csv") {
        // Generate CSV template with headers and example row
        let csvContent = headers.join(",") + "\n";
        csvContent += example.join(",") + "\n";
        csvContent += "# " + description + "\n";
        csvContent +=
          "# İlk satır sütun başlıkları, ikinci satır örnek veri içerir\n";
        csvContent +=
          "# Bu satırları silip kendi verilerinizi ekleyebilirsiniz\n";

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="import-template-${platform}.csv"`
        );
        res.send("\ufeff" + csvContent); // Add BOM for proper UTF-8 encoding
      } else if (format === "xlsx") {
        // Generate Excel template using xlsx library
        const XLSX = require("xlsx");

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();

        // Create data array with headers and example
        const wsData = [
          headers,
          example,
          [], // Empty row
          ["# " + description],
          ["# İlk satır sütun başlıkları, ikinci satır örnek veri içerir"],
          ["# Bu satırları silip kendi verilerinizi ekleyebilirsiniz"],
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Set column widths for better readability
        const colWidths = headers.map(() => ({ wch: 15 }));
        ws["!cols"] = colWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, "Import Template");

        // Generate buffer
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="import-template-${platform}.xlsx"`
        );
        res.send(buffer);
      } else {
        return res.status(400).json({
          success: false,
          message: "Unsupported format. Use csv or xlsx.",
        });
      }
    } catch (error) {
      logger.error("Error generating import template:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate import template",
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

      const whereClause = { userId };

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

      if (!operation) {
        return;
      }

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

      if (category && category !== "") {
        where.category = category;
      }
      if (normalizedStatus) {
        where.status = normalizedStatus;
      }

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
              StockService &&
              typeof StockService.getStockStatus === "function"
            ) {
              stockStatus = await StockService.getStockStatus(product.id);
            }
          } catch (error) {
            logger.info("Enhanced stock service not available", error.message);
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
      const productData = req.body;

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
        sourcing: productData.sourcing, // Add sourcing field
        userId,
        sourcePlatform: "manual", // Mark as manually created
        creationSource: "user", // Mark as user-created
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
      if (updateData.name) {
        standardUpdateData.name = updateData.name;
      }
      if (updateData.description) {
        standardUpdateData.description = updateData.description;
      }
      if (updateData.baseSku) {
        standardUpdateData.sku = updateData.baseSku;
      }
      if (updateData.basePrice) {
        standardUpdateData.price = parseFloat(updateData.basePrice);
      }
      if (updateData.baseCostPrice) {
        standardUpdateData.originalPrice = parseFloat(updateData.baseCostPrice);
      }
      if (updateData.stockQuantity) {
        standardUpdateData.stock = parseInt(updateData.stockQuantity);
      }
      if (updateData.category) {
        standardUpdateData.category = updateData.category;
      }
      if (updateData.brand) {
        standardUpdateData.brand = updateData.brand;
      }
      if (updateData.weight) {
        standardUpdateData.weight = parseFloat(updateData.weight);
      }
      if (updateData.status) {
        standardUpdateData.status = updateData.status;
      }
      if (updateData.attributes) {
        standardUpdateData.attributes = updateData.attributes;
      }
      if (updateData.tags) {
        standardUpdateData.tags = updateData.tags;
      }
      if (updateData.media) {
        standardUpdateData.media = updateData.media;
      }

      await product.update(standardUpdateData);

      // Get the updated product with fresh data
      const updatedProduct = await product.reload();

      // Sync changes to all connected platforms (asynchronously)
      const platformSyncPromise = PlatformSyncService.syncProductToAllPlatforms(
        userId,
        updatedProduct,
        "update",
        standardUpdateData
      ).catch((error) => {
        logger.error("Platform sync failed for main product update:", {
          productId: product.id,
          error: error.message,
        });
      });

      // Don't wait for platform sync to complete - respond immediately
      platformSyncPromise.then((syncResult) => {
        if (syncResult) {
          logger.info("✅ Platform sync completed for main product:", {
            productId: product.id,
            synced: syncResult.synced,
            total: syncResult.total,
          });
        }
      });

      res.json({
        success: true,
        data: {
          ...updatedProduct.toJSON(),
          baseSku: updatedProduct.sku,
          basePrice: updatedProduct.price,
          stockQuantity: updatedProduct.stock,
        },
        message: "Main product updated successfully",
        syncInProgress: true, // Indicate that platform sync is happening
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
          ProductManagementService &&
          typeof ProductManagementService.getProductWithVariants === "function"
        ) {
          product = await ProductManagementService.getProductWithVariants(
            id,
            userId
          );
        }
      } catch (error) {
        logger.info(
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
          ProductManagementService &&
          typeof ProductManagementService.createPlatformVariant === "function"
        ) {
          variant = await ProductManagementService.createPlatformVariant(
            mainProductId,
            variantData,
            userId
          );
        }
      } catch (error) {
        logger.info(
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

      // Get the updated variant with fresh data
      const updatedVariant = await variant.reload({
        include: [
          {
            model: MainProduct,
            as: "mainProduct",
          },
        ],
      });

      // Sync changes to the specific platform (asynchronously)
      const platformSyncPromise = PlatformSyncService.syncProductToAllPlatforms(
        userId,
        updatedVariant,
        "update",
        updateData
      ).catch((error) => {
        logger.error("Platform sync failed for variant update:", {
          variantId: variant.id,
          error: error.message,
        });
      });

      // Don't wait for platform sync to complete - respond immediately
      platformSyncPromise.then((syncResult) => {
        if (syncResult) {
          logger.info("✅ Platform sync completed for variant:", {
            variantId: variant.id,
            synced: syncResult.synced,
            total: syncResult.total,
          });
        }
      });

      res.json({
        success: true,
        data: updatedVariant,
        message: "Platform variant updated successfully",
        syncInProgress: true, // Indicate that platform sync is happening
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
        if (StockService && typeof StockService.getStockStatus === "function") {
          stockStatus = await StockService.getStockStatus(id);
        }
      } catch (error) {
        logger.info("Enhanced stock service not available", error.message);

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
        if (StockService && typeof StockService.updateStock === "function") {
          stockStatus = await StockService.updateStock(
            id,
            quantity,
            reason,
            userId
          );
        }
      } catch (error) {
        logger.info(
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
          ProductManagementService &&
          typeof ProductManagementService.publishToPlatforms === "function"
        ) {
          results = await ProductManagementService.publishToPlatforms(
            id,
            platforms
          );
        }
      } catch (error) {
        logger.info(
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
        // TEMPORARY FALLBACK SKU GENERATION - REPLACE WHEN SKU SYSTEM IS AVAILABLE
        const timestamp = Date.now().toString().slice(-6);
        const nameSlug = (mappedData.name || "PRODUCT")
          .substring(0, 3)
          .toUpperCase();
        mappedData.sku = `${nameSlug}-${timestamp}`;
        mappedData.baseSku = mappedData.sku;
      }

      // Create main product with mapped data
      const ProductModel = MainProduct || Product;
      const mainProduct = await ProductModel.create({
        ...mappedData,
        userId,
        creationSource: "platform_sync", // Set as platform-sourced
        importedFrom: productData.sourcePlatform || "unknown",
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
      const result = await VariantDetector.classifyProductVariantStatus(
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
      const result = await VariantDetector.updateProductVariantStatus(
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
      const result = await VariantDetector.removeVariantStatus(id);

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
      if (category) {
        whereClause.category = category;
      }
      if (status) {
        whereClause.status = status;
      }

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
      const result = await VariantDetector.runBatchVariantDetection(products);

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
   * Get background variant detection service configuration
   */
  async getBackgroundVariantDetectionConfig(req, res) {
    try {
      const config = backgroundVariantDetectionService.getConfig();
      res.json({
        success: true,
        data: config,
        message: "Background variant detection service configuration retrieved",
      });
    } catch (error) {
      logger.error("Error getting background variant detection config:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get service configuration",
        error: error.message,
      });
    }
  }

  /**
   * Start background variant detection service
   */
  async startBackgroundVariantDetection(req, res) {
    try {
      // Apply any configuration from the request body before starting
      const config = req.body;
      if (config && Object.keys(config).length > 0) {
        backgroundVariantDetectionService.updateConfig(config);
        logger.info("Configuration updated before starting service", config);
      }

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

  /**
   * Analyze existing products to suggest variant detection patterns
   */
  async analyzePatterns(req, res) {
    try {
      const userId = req.user.id;
      const {
        patternType,
        sampleSize = 50,
        includeNames = true,
        includeSKUs = true,
        includeDescriptions = false,
      } = req.body;

      logger.info("🔍 Analyzing products for pattern suggestions", {
        userId,
        patternType,
        sampleSize,
        includeNames,
        includeSKUs,
        includeDescriptions,
      });

      // Get recent products for the user
      const products = await Product.findAll({
        where: { userId },
        limit: sampleSize,
        order: [["createdAt", "DESC"]],
        attributes: ["id", "name", "sku", "description"],
      });

      if (products.length === 0) {
        return res.json({
          success: true,
          data: {
            recordCount: 0,
            error: "No products found in database",
            examples: [],
            suggestedPattern: null,
            commonPatterns: [],
          },
        });
      }

      // Collect text data from products
      const textData = [];
      products.forEach((product) => {
        if (includeNames && product.name) {
          textData.push(product.name);
        }
        if (includeSKUs && product.sku) {
          textData.push(product.sku);
        }
        if (includeDescriptions && product.description) {
          textData.push(product.description);
        }
      });

      // Analyze patterns based on type
      let suggestedPattern = null;
      let commonPatterns = [];
      let examples = textData.slice(0, 10); // First 10 examples for testing

      if (patternType === "color") {
        // Look for color patterns
        const colorKeywords = [
          "color",
          "colour",
          "renk",
          "black",
          "white",
          "red",
          "blue",
          "green",
          "yellow",
          "pink",
          "purple",
          "orange",
          "gray",
          "grey",
          "brown",
          "siyah",
          "beyaz",
          "kırmızı",
          "mavi",
          "yeşil",
          "sarı",
        ];
        const colorMatches = textData.filter((text) =>
          colorKeywords.some((keyword) =>
            text.toLowerCase().includes(keyword.toLowerCase())
          )
        );

        if (colorMatches.length > 0) {
          suggestedPattern =
            "(?:color|colour|renk):\\s*([^,;\\s]+)|(?:^|\\s)(black|white|red|blue|green|yellow|pink|purple|orange|gray|grey|brown|siyah|beyaz|kırmızı|mavi|yeşil|sarı)(?:\\s|$)";
          examples = colorMatches.slice(0, 10);
        }
      } else if (patternType === "size") {
        // Look for size patterns
        const sizeKeywords = [
          "size",
          "beden",
          "xs",
          "s",
          "m",
          "l",
          "xl",
          "xxl",
          "xxxl",
        ];
        const sizeRegex = /\b(xs|s|m|l|xl|xxl|xxxl|\d{1,3})\b/gi;
        const sizeMatches = textData.filter(
          (text) =>
            sizeKeywords.some((keyword) =>
              text.toLowerCase().includes(keyword.toLowerCase())
            ) || sizeRegex.test(text)
        );

        if (sizeMatches.length > 0) {
          suggestedPattern =
            "(?:size|beden):\\s*([^,;\\s]+)|(?:^|\\s)(xs|s|m|l|xl|xxl|xxxl|\\d{1,3})(?:\\s|$)";
          examples = sizeMatches.slice(0, 10);
        }
      } else if (patternType === "model") {
        // Look for model patterns
        const modelKeywords = [
          "model",
          "tip",
          "type",
          "pro",
          "plus",
          "max",
          "mini",
        ];
        const modelMatches = textData.filter((text) =>
          modelKeywords.some((keyword) =>
            text.toLowerCase().includes(keyword.toLowerCase())
          )
        );

        if (modelMatches.length > 0) {
          suggestedPattern =
            "(?:model|tip|type):\\s*([^,;\\s]+)|(?:^|\\s)(pro|plus|max|mini|\\w+\\d+)(?:\\s|$)";
          examples = modelMatches.slice(0, 10);
        }
      } else if (patternType === "structured") {
        // Analyze structured patterns
        const structuredMatches = textData.filter(
          (text) =>
            text.includes(":") || text.includes("-") || /\w+\d+/.test(text)
        );

        if (structuredMatches.length > 0) {
          // Try to detect common structures
          const patterns = structuredMatches.map((text) => {
            // Replace alphanumeric sequences with placeholders
            return text.replace(/[A-Za-z]{2,}/g, "TEXT").replace(/\d+/g, "NUM");
          });

          // Count pattern frequencies
          const patternCounts = {};
          patterns.forEach((pattern) => {
            patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
          });

          // Sort by frequency
          commonPatterns = Object.entries(patternCounts)
            .map(([pattern, count]) => ({ pattern, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

          examples = structuredMatches.slice(0, 10);
        }
      }

      // Find common patterns in all cases
      if (commonPatterns.length === 0 && textData.length > 0) {
        // Basic pattern analysis - find repeating structures
        const basicPatterns = textData.map((text) => {
          return text
            .replace(/[A-Za-z]+/g, "WORD")
            .replace(/\d+/g, "NUM")
            .replace(/[^A-Za-z0-9]/g, "SEP");
        });

        const patternCounts = {};
        basicPatterns.forEach((pattern) => {
          patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
        });

        commonPatterns = Object.entries(patternCounts)
          .map(([pattern, count]) => ({ pattern, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
      }

      res.json({
        success: true,
        data: {
          recordCount: products.length,
          textDataCount: textData.length,
          suggestedPattern,
          commonPatterns,
          examples,
          patternType,
        },
      });
    } catch (error) {
      logger.error("❌ Error analyzing patterns:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Failed to analyze patterns",
        error: error.message,
      });
    }
  }

  /**
   * Search products by regex pattern
   */
  async searchByPattern(req, res) {
    try {
      const userId = req.user.id;
      const {
        pattern,
        searchFields = { name: true, sku: true, description: false },
        maxResults = 50,
      } = req.body;

      if (!pattern) {
        return res.status(400).json({
          success: false,
          message: "Pattern is required",
        });
      }

      logger.info("🔍 Searching products by pattern", {
        userId,
        pattern,
        searchFields,
        maxResults,
      });

      // First, get the total count of products for this user
      const totalProductCount = await Product.count({
        where: { userId },
      });

      if (totalProductCount === 0) {
        return res.json({
          success: true,
          data: {
            matches: [],
            matchCount: 0,
            totalProducts: 0,
            totalSearched: 0,
            pattern,
            searchFields,
          },
        });
      }

      // Create regex from pattern
      let regex;
      try {
        regex = new RegExp(pattern, "gi");
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid regex pattern: " + error.message,
        });
      }

      // Use database-level search with SQL REGEXP for better performance
      const { Op } = require("sequelize");
      const sequelize = Product.sequelize;

      // Build the where conditions for database-level regex search
      const whereConditions = [];

      if (searchFields.name) {
        // For PostgreSQL, use ~ operator for regex, for MySQL use REGEXP
        whereConditions.push(
          sequelize.where(
            sequelize.fn("LOWER", sequelize.col("name")),
            Op.regexp,
            pattern.toLowerCase()
          )
        );
      }

      if (searchFields.sku) {
        whereConditions.push(
          sequelize.where(
            sequelize.fn("LOWER", sequelize.col("sku")),
            Op.regexp,
            pattern.toLowerCase()
          )
        );
      }

      if (searchFields.description) {
        whereConditions.push(
          sequelize.where(
            sequelize.fn("LOWER", sequelize.col("description")),
            Op.regexp,
            pattern.toLowerCase()
          )
        );
      }

      // If no search fields selected, search all fields
      if (whereConditions.length === 0) {
        whereConditions.push(
          sequelize.where(
            sequelize.fn("LOWER", sequelize.col("name")),
            Op.regexp,
            pattern.toLowerCase()
          )
        );
      }

      // Search all products that match the pattern
      const matchingProducts = await Product.findAll({
        where: {
          userId,
          [Op.or]: whereConditions,
        },
        attributes: ["id", "name", "sku", "description"],
        limit: maxResults * 3, // Get more than needed to have variety in results
      });

      const matches = [];
      let totalMatches = 0;

      // Process the matching products to extract specific matches
      for (const product of matchingProducts) {
        // Search in product name
        if (searchFields.name && product.name) {
          const nameMatches = product.name.match(regex);
          if (nameMatches) {
            nameMatches.forEach((match) => {
              if (matches.length < maxResults) {
                matches.push({
                  productId: product.id,
                  productName: product.name,
                  field: "name",
                  matchedText: match.trim(),
                  fullText: product.name,
                });
              }
              totalMatches++;
            });
          }
        }

        // Search in SKU
        if (searchFields.sku && product.sku) {
          const skuMatches = product.sku.match(regex);
          if (skuMatches) {
            skuMatches.forEach((match) => {
              if (matches.length < maxResults) {
                matches.push({
                  productId: product.id,
                  productName: product.name,
                  field: "sku",
                  matchedText: match.trim(),
                  fullText: product.sku,
                });
              }
              totalMatches++;
            });
          }
        }

        // Search in description
        if (searchFields.description && product.description) {
          const descMatches = product.description.match(regex);
          if (descMatches) {
            descMatches.forEach((match) => {
              if (matches.length < maxResults) {
                matches.push({
                  productId: product.id,
                  productName: product.name,
                  field: "description",
                  matchedText: match.trim(),
                  fullText:
                    product.description.substring(0, 100) +
                    (product.description.length > 100 ? "..." : ""),
                });
              }
              totalMatches++;
            });
          }
        }

        // Stop collecting matches if we have enough for display
        if (matches.length >= maxResults) {
          break;
        }
      }

      // Get count of all products that would match (not just the limited results)
      const totalMatchingCount = await Product.count({
        where: {
          userId,
          [Op.or]: whereConditions,
        },
      });

      res.json({
        success: true,
        data: {
          matches: matches,
          matchCount: totalMatches,
          totalProducts: totalProductCount,
          totalMatching: totalMatchingCount,
          totalSearched: totalProductCount, // We searched through all products at DB level
          pattern,
          searchFields,
          limitReached: matches.length >= maxResults,
          hasMoreMatches: totalMatchingCount > matches.length,
        },
      });
    } catch (error) {
      logger.error("❌ Error searching by pattern:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
      });

      // Fallback to the original method if database regex fails
      logger.warn(
        "Database regex search failed, falling back to JavaScript regex"
      );
      return this.searchByPatternFallback(req, res);
    }
  }

  /**
   * Fallback method for pattern search using JavaScript regex when database regex fails
   */
  async searchByPatternFallback(req, res) {
    try {
      const userId = req.user.id;
      const {
        pattern,
        searchFields = { name: true, sku: true, description: false },
        maxResults = 50,
      } = req.body;

      logger.info("🔍 Using fallback pattern search", { userId, pattern });

      // Get ALL products for the user (no limit)
      const totalProductCount = await Product.count({ where: { userId } });

      // Process products in batches to avoid memory issues
      const batchSize = 1000;
      const matches = [];
      let totalMatches = 0;
      let totalProcessed = 0;

      // Create regex from pattern
      const regex = new RegExp(pattern, "gi");

      for (let offset = 0; offset < totalProductCount; offset += batchSize) {
        const products = await Product.findAll({
          where: { userId },
          attributes: ["id", "name", "sku", "description"],
          offset: offset,
          limit: batchSize,
        });

        for (const product of products) {
          totalProcessed++;

          // Search in product name
          if (searchFields.name && product.name) {
            const nameMatches = product.name.match(regex);
            if (nameMatches) {
              nameMatches.forEach((match) => {
                if (matches.length < maxResults) {
                  matches.push({
                    productId: product.id,
                    productName: product.name,
                    field: "name",
                    matchedText: match.trim(),
                    fullText: product.name,
                  });
                }
                totalMatches++;
              });
            }
          }

          // Search in SKU
          if (searchFields.sku && product.sku) {
            const skuMatches = product.sku.match(regex);
            if (skuMatches) {
              skuMatches.forEach((match) => {
                if (matches.length < maxResults) {
                  matches.push({
                    productId: product.id,
                    productName: product.name,
                    field: "sku",
                    matchedText: match.trim(),
                    fullText: product.sku,
                  });
                }
                totalMatches++;
              });
            }
          }

          // Search in description
          if (searchFields.description && product.description) {
            const descMatches = product.description.match(regex);
            if (descMatches) {
              descMatches.forEach((match) => {
                if (matches.length < maxResults) {
                  matches.push({
                    productId: product.id,
                    productName: product.name,
                    field: "description",
                    matchedText: match.trim(),
                    fullText:
                      product.description.substring(0, 100) +
                      (product.description.length > 100 ? "..." : ""),
                  });
                }
                totalMatches++;
              });
            }
          }
        }

        // Log progress for large datasets
        if (totalProcessed % 5000 === 0) {
          logger.info(
            `Pattern search progress: ${totalProcessed}/${totalProductCount} products processed`
          );
        }
      }

      res.json({
        success: true,
        data: {
          matches: matches,
          matchCount: totalMatches,
          totalProducts: totalProductCount,
          totalSearched: totalProcessed,
          pattern,
          searchFields,
          limitReached: matches.length >= maxResults,
          hasMoreMatches: totalMatches > matches.length,
          usedFallback: true,
        },
      });
    } catch (error) {
      logger.error("❌ Error in fallback pattern search:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Failed to search by pattern",
        error: error.message,
      });
    }
  }

  /**
   * Import products from CSV/Excel file
   */
  async importProductsFromCSV(req, res) {
    try {
      const userId = req.user.id;
      const ProductImportService = require("../services/product-import-service");

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      // Check if file format is supported
      if (!ProductImportService.isFormatSupported(req.file.originalname)) {
        return res.status(400).json({
          success: false,
          message: "Unsupported file format. Please upload CSV or Excel files.",
          supportedFormats: ProductImportService.getSupportedFormats(),
        });
      }

      logger.info(`Starting product import for user ${userId}`, {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });

      // Parse the uploaded file
      const parsedData = await ProductImportService.parseFile(req.file);

      // Suggest field mappings
      const mappingSuggestions =
        ProductImportService.suggestFieldMappings(parsedData);

      // If this is just a preview request, return the parsed data and suggestions
      if (req.body.preview === "true") {
        return res.json({
          success: true,
          data: {
            preview: {
              headers: parsedData.headers,
              sampleRows: parsedData.rows.slice(0, 5),
              totalRows: parsedData.totalRows,
              format: parsedData.format,
            },
            mappingSuggestions,
          },
          message:
            "File parsed successfully. Review and confirm field mappings.",
        });
      }

      // Get field mappings and import options from request
      const fieldMappings =
        req.body.fieldMappings || mappingSuggestions.mappings;
      const importOptions = {
        classificationMode: req.body.classificationMode || "manual",
        mainProductMapping: req.body.mainProductMapping || {},
        variantGrouping: req.body.variantGrouping || "name",
        createMissing: req.body.createMissing !== false,
        updateExisting: req.body.updateExisting === true,
        dryRun: req.body.dryRun === true,
      };

      // Validate the import data
      const validationResult = ProductImportService.validateImportData(
        parsedData,
        fieldMappings
      );

      if (validationResult.hasErrors && !req.body.ignoreErrors) {
        return res.status(400).json({
          success: false,
          message: "Validation errors found in import data",
          validationResult,
          errors: validationResult.invalidData.slice(0, 10), // Return first 10 errors
        });
      }

      // Perform the import
      const importResult = await ProductImportService.importProducts(
        validationResult,
        importOptions,
        userId
      );

      logger.info(`Product import completed for user ${userId}`, importResult);

      res.json({
        success: true,
        data: {
          importResult,
          validationResult: {
            totalRows: validationResult.totalRows,
            validRows: validationResult.validRows,
            invalidRows: validationResult.invalidRows,
          },
        },
        message: `Import completed. Created ${importResult.created} products, skipped ${importResult.skipped}, errors: ${importResult.errors}`,
      });
    } catch (error) {
      logger.error("Error importing products from CSV/Excel:", error);
      res.status(500).json({
        success: false,
        message: "Failed to import products",
        error: error.message,
      });
    }
  }

  /**
   * Get CSV template for product import
   */
  async getCSVTemplate(req, res) {
    try {
      const ProductImportService = require("../services/product-import-service");

      const csvTemplate = ProductImportService.generateCSVTemplate();

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="product_import_template.csv"'
      );
      res.send(csvTemplate);
    } catch (error) {
      logger.error("Error getting CSV template:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate CSV template",
        error: error.message,
      });
    }
  }

  /**
   * Preview import file before actual import
   */
  async previewImportFile(req, res) {
    try {
      const ProductImportService = require("../services/product-import-service");

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      logger.info("Previewing import file:", {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });

      // Parse the file
      const parsedData = await ProductImportService.parseFile(req.file);

      // Suggest field mappings
      const mappingSuggestions =
        ProductImportService.suggestFieldMappings(parsedData);

      // Get sample data for preview
      const preview = {
        headers: parsedData.headers,
        sampleRows: parsedData.rows.slice(0, 10), // First 10 rows
        totalRows: parsedData.totalRows,
        format: parsedData.format,
      };

      res.json({
        success: true,
        data: {
          preview,
          mappingSuggestions,
          supportedFields: [
            { key: "name", label: "Product Name", required: true },
            { key: "description", label: "Description", required: false },
            { key: "sku", label: "SKU", required: false },
            { key: "barcode", label: "Barcode", required: false },
            { key: "category", label: "Category", required: false },
            { key: "brand", label: "Brand", required: false },
            { key: "price", label: "Price", required: false },
            { key: "costPrice", label: "Cost Price", required: false },
            { key: "stock", label: "Stock Quantity", required: false },
            { key: "weight", label: "Weight", required: false },
            { key: "status", label: "Status", required: false },
            { key: "platform", label: "Platform", required: false },
            { key: "size", label: "Size", required: false },
            { key: "color", label: "Color", required: false },
            { key: "material", label: "Material", required: false },
          ],
        },
        message: "File preview generated successfully",
      });
    } catch (error) {
      logger.error("Error previewing import file:", error);
      res.status(500).json({
        success: false,
        message: "Failed to preview import file",
        error: error.message,
      });
    }
  }

  /**
   * Validate import data with field mappings
   */
  async validateImportData(req, res) {
    try {
      const ProductImportService = require("../services/product-import-service");
      const { parsedData, fieldMappings } = req.body;

      if (!parsedData || !fieldMappings) {
        return res.status(400).json({
          success: false,
          message: "Parsed data and field mappings are required",
        });
      }

      const validationResult = ProductImportService.validateImportData(
        parsedData,
        fieldMappings
      );

      res.json({
        success: true,
        data: validationResult,
        message: `Validation completed. ${validationResult.validRows} valid rows, ${validationResult.invalidRows} invalid rows`,
      });
    } catch (error) {
      logger.error("Error validating import data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to validate import data",
        error: error.message,
      });
    }
  }

  /**
   * Get import configuration options
   */
  async getImportOptions(req, res) {
    try {
      const userId = req.user.id;

      // Get existing main products for variant mapping
      const mainProducts = await MainProduct.findAll({
        where: { userId },
        attributes: ["id", "name", "baseSku", "category"],
        order: [["name", "ASC"]],
        limit: 100,
      });

      const importOptions = {
        classificationModes: [
          {
            value: "manual",
            label: "Manual Classification",
            description: "Manually specify which products are main or variants",
          },
          {
            value: "auto",
            label: "Auto Detection",
            description:
              "Automatically detect variants based on naming patterns",
          },
          {
            value: "all_main",
            label: "All Main Products",
            description: "Import all items as main products",
          },
          {
            value: "all_variants",
            label: "All Variants",
            description: "Import all items as variants of existing products",
          },
        ],
        groupingOptions: [
          {
            value: "name",
            label: "Group by Name",
            description: "Group variants by product name",
          },
          {
            value: "sku",
            label: "Group by SKU",
            description: "Group variants by SKU pattern",
          },
          {
            value: "category",
            label: "Group by Category",
            description: "Group variants by category",
          },
        ],
        availableMainProducts: mainProducts.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.baseSku,
          category: product.category,
        })),
      };

      res.json({
        success: true,
        data: importOptions,
        message: "Import options retrieved successfully",
      });
    } catch (error) {
      logger.error("Error getting import options:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get import options",
        error: error.message,
      });
    }
  }

  // Additional methods for enhanced-products.js route compatibility
  async releaseReservation(req, res) {
    return this.releaseStockReservation(req, res);
  }

  async getStockHistory(req, res) {
    return this.getInventoryMovements(req, res);
  }

  async uploadMainProductMedia(req, res) {
    return this.uploadProductMedia(req, res);
  }

  async uploadVariantMedia(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: "Variant media upload functionality not yet implemented",
      });
    } catch (error) {
      logger.error("Error uploading variant media:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload variant media",
        error: error.message,
      });
    }
  }

  async deleteMedia(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: "Media deletion functionality not yet implemented",
      });
    } catch (error) {
      logger.error("Error deleting media:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete media",
        error: error.message,
      });
    }
  }

  async updateMediaMetadata(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: "Media metadata update functionality not yet implemented",
      });
    } catch (error) {
      logger.error("Error updating media metadata:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update media metadata",
        error: error.message,
      });
    }
  }

  async bulkOperation(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: "Bulk operation functionality not yet implemented",
      });
    } catch (error) {
      logger.error("Error performing bulk operation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to perform bulk operation",
        error: error.message,
      });
    }
  }

  async bulkPublishVariants(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: "Bulk publish variants functionality not yet implemented",
      });
    } catch (error) {
      logger.error("Error bulk publishing variants:", error);
      res.status(500).json({
        success: false,
        message: "Failed to bulk publish variants",
        error: error.message,
      });
    }
  }

  async bulkUpdatePrices(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: "Bulk update prices functionality not yet implemented",
      });
    } catch (error) {
      logger.error("Error bulk updating prices:", error);
      res.status(500).json({
        success: false,
        message: "Failed to bulk update prices",
        error: error.message,
      });
    }
  }

  async bulkCreateVariants(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: "Bulk create variants functionality not yet implemented",
      });
    } catch (error) {
      logger.error("Error bulk creating variants:", error);
      res.status(500).json({
        success: false,
        message: "Failed to bulk create variants",
        error: error.message,
      });
    }
  }

  async scrapeAndImportFromPlatform(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: "Scrape and import functionality not yet implemented",
      });
    } catch (error) {
      logger.error("Error scraping and importing from platform:", error);
      res.status(500).json({
        success: false,
        message: "Failed to scrape and import from platform",
        error: error.message,
      });
    }
  }

  async getFieldMappings(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: "Field mappings functionality not yet implemented",
      });
    } catch (error) {
      logger.error("Error getting field mappings:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get field mappings",
        error: error.message,
      });
    }
  }

  async saveFieldMapping(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: "Field mapping save functionality not yet implemented",
      });
    } catch (error) {
      logger.error("Error saving field mapping:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save field mapping",
        error: error.message,
      });
    }
  }

  async importFromJSON(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: "JSON import functionality not yet implemented",
      });
    } catch (error) {
      logger.error("Error importing from JSON:", error);
      res.status(500).json({
        success: false,
        message: "Failed to import from JSON",
        error: error.message,
      });
    }
  }

  async markAsMainProduct(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: "Mark as main product functionality not yet implemented",
      });
    } catch (error) {
      logger.error("Error marking as main product:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark as main product",
        error: error.message,
      });
    }
  }

  /**
   * Export products to CSV or JSON format
   */
  async exportProducts(req, res) {
    try {
      const {
        category,
        status,
        stockStatus,
        minPrice,
        maxPrice,
        minStock,
        maxStock,
        platform = "all",
        format = "csv",
        productIds,
        columns,
        exportType = "all",
      } = req.query;

      const userId = req.user.id;

      // Build filter conditions
      const whereConditions = { userId };

      // Handle productIds filter if provided
      if (productIds) {
        try {
          // Handle both string and array formats
          let parsedIds;
          if (typeof productIds === "string") {
            // Try to parse as JSON array if it's a string
            try {
              parsedIds = JSON.parse(productIds);
            } catch (e) {
              // If not valid JSON, split by comma
              parsedIds = productIds.split(",");
            }
          } else {
            parsedIds = productIds;
          }

          if (Array.isArray(parsedIds) && parsedIds.length > 0) {
            whereConditions.id = { [Op.in]: parsedIds };
          }
        } catch (error) {
          logger.warn("Error parsing productIds for export", {
            error: error.message,
          });
          // Continue without the productIds filter if parsing fails
        }
      }

      // Apply filters - strict checking to avoid empty strings
      if (category && category.trim() !== "") {
        whereConditions.category = category.trim();
      }

      if (status && status.trim() !== "") {
        whereConditions.status = status.trim();
      }

      // Handle price filters
      if (
        (minPrice && minPrice.trim() !== "") ||
        (maxPrice && maxPrice.trim() !== "")
      ) {
        whereConditions.price = {};
        if (minPrice && minPrice.trim() !== "") {
          whereConditions.price[Op.gte] = parseFloat(minPrice);
        }
        if (maxPrice && maxPrice.trim() !== "") {
          whereConditions.price[Op.lte] = parseFloat(maxPrice);
        }
      }

      // Handle stock filters
      if (
        (minStock && minStock.trim() !== "") ||
        (maxStock && maxStock.trim() !== "")
      ) {
        whereConditions.stockQuantity = {};
        if (minStock && minStock.trim() !== "") {
          whereConditions.stockQuantity[Op.gte] = parseInt(minStock);
        }
        if (maxStock && maxStock.trim() !== "") {
          whereConditions.stockQuantity[Op.lte] = parseInt(maxStock);
        }
      }

      // Handle stock status filter
      if (stockStatus && stockStatus.trim() !== "") {
        switch (stockStatus) {
          case "in_stock":
            whereConditions.stockQuantity = { [Op.gt]: 0 };
            break;
          case "out_of_stock":
            whereConditions.stockQuantity = { [Op.eq]: 0 };
            break;
          case "low_stock":
            // Use minStockLevel for low stock comparison
            whereConditions[Op.and] = [
              { stockQuantity: { [Op.gt]: 0 } },
              sequelize.where(sequelize.col("stockQuantity"), {
                [Op.lte]: sequelize.col("minStockLevel"),
              }),
            ];
            break;
        }
      }

      // Handle platform filter (special handling for JSON platforms field)
      if (platform && platform.trim() !== "" && platform !== "all") {
        // Need to check if the platform exists in the JSON platforms field
        whereConditions.platforms = sequelize.literal(
          `platforms->>'${platform}' IS NOT NULL AND platforms->'${platform}'->>'enabled' = 'true'`
        );
      }

      // Fetch products
      const products = await Product.findAll({
        where: whereConditions,
        order: [["createdAt", "DESC"]],
      });

      if (products.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No products found matching the criteria",
        });
      }

      // Transform products for export
      const allProductData = products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode || "",
        description: product.description || "",
        category: product.category || "",
        price: product.price,
        costPrice: product.costPrice || "",
        currency: "TRY", // Default currency
        stockQuantity: product.stockQuantity,
        minStockLevel: product.minStockLevel,
        status: product.status,
        platforms: JSON.stringify(product.platforms || {}),
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      }));

      // Filter data based on selected columns
      let exportData = allProductData;
      if (columns && columns.trim()) {
        const selectedColumns = columns.split(",").map((col) => col.trim());
        exportData = allProductData.map((product) => {
          const filteredProduct = {};
          selectedColumns.forEach((col) => {
            if (product.hasOwnProperty(col)) {
              filteredProduct[col] = product[col];
            }
          });
          return filteredProduct;
        });
      }

      // All available field definitions
      const allFields = [
        { label: "ID", value: "id" },
        { label: "Name", value: "name" },
        { label: "SKU", value: "sku" },
        { label: "Barcode", value: "barcode" },
        { label: "Description", value: "description" },
        { label: "Category", value: "category" },
        { label: "Price", value: "price" },
        { label: "Cost Price", value: "costPrice" },
        { label: "Currency", value: "currency" },
        { label: "Stock Quantity", value: "stockQuantity" },
        { label: "Min Stock Level", value: "minStockLevel" },
        { label: "Status", value: "status" },
        { label: "Platforms", value: "platforms" },
        { label: "Created At", value: "createdAt" },
        { label: "Updated At", value: "updatedAt" },
      ];

      // Filter fields based on selected columns
      let fields = allFields;
      if (columns && columns.trim()) {
        const selectedColumns = columns.split(",").map((col) => col.trim());
        fields = allFields.filter((field) =>
          selectedColumns.includes(field.value)
        );
      }

      // Handle different export formats
      if (format === "csv") {
        const { Parser } = require("json2csv");
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(exportData);

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=products-${
            new Date().toISOString().split("T")[0]
          }.csv`
        );
        res.send(csv);
      } else if (format === "xlsx") {
        // Handle Excel export
        const ExcelJS = require("exceljs");
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Products");

        // Add headers
        const headers = fields.map((field) => field.label);
        worksheet.addRow(headers);

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE6E6FA" },
        };

        // Add data rows
        exportData.forEach((product) => {
          const row = fields.map((field) => {
            const value = product[field.value];
            // Format dates
            if (field.value.includes("At") && value) {
              return new Date(value).toLocaleDateString();
            }
            return value;
          });
          worksheet.addRow(row);
        });

        // Auto-fit columns
        worksheet.columns.forEach((column) => {
          column.width = Math.max(column.width || 0, 15);
        });

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=products-${
            new Date().toISOString().split("T")[0]
          }.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
      } else if (format === "json") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=products-${
            new Date().toISOString().split("T")[0]
          }.json`
        );
        res.json({
          success: true,
          message: `Successfully exported ${exportData.length} products`,
          data: exportData,
          exported_at: new Date().toISOString(),
          columns: columns
            ? columns.split(",")
            : Object.keys(allProductData[0] || {}),
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid export format. Supported formats: csv, xlsx, json",
        });
      }
    } catch (error) {
      logger.error("Error exporting products:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export products",
        error: error.message,
      });
    }
  }

  async importFromCSV(req, res) {
    return this.importProductsFromCSV(req, res);
  }

  /**
   * Manually sync product to platforms
   */
  async syncProductToPlatforms(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { platforms, operation = "update" } = req.body;

      // Find the product using the Product model (consistent with other controller methods)
      let product = await Product.findOne({
        where: { id, userId },
        include: [
          {
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
          },
        ],
      });

      // If not found in Product table, check MainProduct table as fallback
      if (!product) {
        product = await MainProduct.findOne({
          where: { id, userId },
          include: [
            {
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
            },
          ],
        });
      }

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Sync to all platforms or specific platforms using the intelligent sync system
      const syncResult = await PlatformSyncService.syncProductToAllPlatforms(
        userId,
        product,
        operation,
        req.body.changes || {}
      );

      // Include platform information in response
      const platformInfo = {
        platforms:
          product.platformVariants?.map((pv) => ({
            platform: pv.platform,
            isPublished: pv.isPublished,
            syncStatus: pv.syncStatus,
            externalId: pv.externalId,
            platformSku: pv.platformSku,
          })) || [],
        totalPlatforms: product.platformVariants?.length || 0,
        hasMultiplePlatforms: (product.platformVariants?.length || 0) > 1,
      };

      res.json({
        success: true,
        message: "Platform sync completed successfully",
        data: syncResult,
        platformInfo,
        productInfo: {
          id: product.id,
          name: product.name,
          creationSource: product.creationSource,
          syncStrategy: syncResult.syncStrategy,
        },
      });
    } catch (error) {
      logger.error("Manual platform sync failed:", {
        error: error.message,
        productId: req.params.id,
        userId: req.user.id,
        operation: req.body.operation,
        errorStack: error.stack,
      });

      res.status(500).json({
        success: false,
        message: "Platform sync failed",
        error: error.message,
        details:
          error.name === "SequelizeConnectionError"
            ? "Database connection issue. Please try again."
            : "Platform sync service error.",
      });
    }
  }

  /**
   * Get sync status for a product
   */
  async getProductSyncStatus(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // First verify the product exists and belongs to the user
      const product =
        (await Product.findOne({
          where: { id, userId },
        })) ||
        (await MainProduct.findOne({
          where: { id, userId },
        }));

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const syncStatus = await PlatformSyncService.getSyncStatus(id);

      res.json({
        success: true,
        data: syncStatus,
        productInfo: {
          id: product.id,
          name: product.name,
          creationSource: product.creationSource,
        },
      });
    } catch (error) {
      logger.error("Failed to get sync status:", {
        error: error.message,
        productId: req.params.id,
        userId: req.user.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to get sync status",
        error: error.message,
      });
    }
  }

  /**
   * Sync specific fields to platforms
   */
  async syncSpecificFields(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { fields } = req.body;

      if (!fields || !Array.isArray(fields) || fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Fields array is required",
        });
      }

      // Find the product using consistent model approach
      let product = await Product.findOne({
        where: { id, userId },
        include: [
          {
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
          },
        ],
      });

      // Fallback to MainProduct if not found in Product table
      if (!product) {
        product = await MainProduct.findOne({
          where: { id, userId },
          include: [
            {
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
            },
          ],
        });
      }

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const syncResult = await PlatformSyncService.syncSpecificFields(
        userId,
        product,
        fields
      );

      res.json({
        success: true,
        message: "Field sync completed",
        data: syncResult,
      });
    } catch (error) {
      logger.error("Field sync failed:", error);
      res.status(500).json({
        success: false,
        message: "Field sync failed",
        error: error.message,
      });
    }
  }

  /**
   * Get product by OEM code
   */
  async getProductByOem(req, res) {
    try {
      const { oem } = req.params;
      const userId = req.user.id;

      const product = await Product.findOne({
        where: {
          oemCode: { [Op.iLike]: oem },
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
          message: "Product with specified OEM code not found",
        });
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      logger.error("Error getting product by OEM:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get product by OEM",
        error: error.message,
      });
    }
  }

  /**
   * Get compatible vehicles for a product
   */
  async getProductCompatibility(req, res) {
    try {
      const { id } = req.params;
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

      // This assumes the association is correctly set up in the models
      const compatibleVehicles = await product.getCompatibleVehicles();

      res.json({
        success: true,
        data: compatibleVehicles,
      });
    } catch (error) {
      logger.error("Error getting product compatibility:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get product compatibility",
        error: error.message,
      });
    }
  }
}

// Helper function for field mapping suggestions
function generateFieldMappingSuggestions(fileHeaders, supportedFields) {
  const mappings = {};

  // Create a lookup for easier matching
  const fieldLookup = supportedFields.reduce((acc, field) => {
    acc[field.id.toLowerCase()] = field.id;
    acc[field.label.toLowerCase()] = field.id;
    return acc;
  }, {});

  // Common field name variations
  const fieldVariations = {
    name: [
      "name",
      "ürün adı",
      "urun adi",
      "product name",
      "title",
      "başlık",
      "baslik",
    ],
    description: [
      "description",
      "açıklama",
      "aciklama",
      "desc",
      "detail",
      "detay",
    ],
    price: ["price", "fiyat", "amount", "miktar", "tutar"],
    costPrice: [
      "cost price",
      "maliyet",
      "cost",
      "maliyet fiyatı",
      "maliyet fiyati",
    ],
    discountedPrice: [
      "discounted price",
      "indirimli fiyat",
      "indirimli",
      "discount",
    ],
    stockQuantity: [
      "stock",
      "stok",
      "quantity",
      "miktar",
      "adet",
      "stock quantity",
    ],
    category: ["category", "kategori", "cat"],
    brand: ["brand", "marka"],
    sku: ["sku", "stock code", "stok kodu"],
    barcode: ["barcode", "barkod"],
    weight: ["weight", "ağırlık", "agirlik"],
    image1: [
      "image",
      "görsel",
      "gorsel",
      "resim",
      "photo",
      "main image",
      "ana görsel",
    ],
    image2: ["image2", "görsel2", "gorsel2", "resim2", "photo2"],
    image3: ["image3", "görsel3", "gorsel3", "resim3", "photo3"],
    image4: ["image4", "görsel4", "gorsel4", "resim4", "photo4"],
    image5: ["image5", "görsel5", "gorsel5", "resim5", "photo5"],
    image6: ["image6", "görsel6", "gorsel6", "resim6", "photo6"],
    image7: ["image7", "görsel7", "gorsel7", "resim7", "photo7"],
    image8: ["image8", "görsel8", "gorsel8", "resim8", "photo8"],
    color: ["color", "renk"],
    size: ["size", "beden", "boyut"],
    material: ["material", "malzeme"],
  };

  // Try to match file headers to supported fields
  fileHeaders.forEach((header) => {
    const cleanHeader = header.toLowerCase().trim();

    // Direct match first
    if (fieldLookup[cleanHeader]) {
      mappings[fieldLookup[cleanHeader]] = header;
      return;
    }

    // Try variation matching
    for (const [fieldId, variations] of Object.entries(fieldVariations)) {
      if (
        variations.some((variation) =>
          cleanHeader.includes(variation.toLowerCase())
        )
      ) {
        mappings[fieldId] = header;
        break;
      }
    }
  });

  return mappings;
}

module.exports = new ProductController();
