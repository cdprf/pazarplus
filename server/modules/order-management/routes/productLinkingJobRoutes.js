const express = require("express");
const router = express.Router();
const ProductLinkingJobService = require("../../../services/product-linking-job-service");
const ProductOrderLinkingService = require("../../../services/product-order-linking-service");
const {
  auth: authenticateToken,
  adminAuth,
} = require("../../../middleware/auth");
const logger = require("../../../utils/logger");
const OrderItem = require("../../../models/OrderItem");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const { Op } = require("sequelize");

// Get a reference to the global job service instance
// This will be set when the server starts
let jobService = null;

// Middleware to ensure job service is available
const ensureJobService = (req, res, next) => {
  if (!jobService) {
    // Get from app locals or create new instance
    jobService =
      req.app.locals.productLinkingJobs || new ProductLinkingJobService();
    req.app.locals.productLinkingJobs = jobService;
  }
  req.jobService = jobService;
  next();
};

/**
 * Get job status and statistics
 */
router.get("/status", authenticateToken, ensureJobService, async (req, res) => {
  try {
    const status = req.jobService.getStatus();
    const report = await req.jobService.generateLinkingReport();

    res.json({
      success: true,
      data: {
        ...status,
        dailyReport: report,
      },
    });
  } catch (error) {
    logger.error("Error getting job status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get job status",
    });
  }
});

/**
 * Manually trigger auto linking job
 */
router.post("/trigger-auto", adminAuth, ensureJobService, async (req, res) => {
  try {
    // Run the job in the background
    req.jobService.triggerAutoLinking().catch((error) => {
      logger.error("Auto linking job failed:", error);
    });

    res.json({
      success: true,
      message: "Auto linking job triggered successfully",
    });
  } catch (error) {
    logger.error("Error triggering auto linking job:", error);
    res.status(500).json({
      success: false,
      message: "Failed to trigger auto linking job",
    });
  }
});

/**
 * Enable or disable a specific job
 */
router.post(
  "/toggle/:jobName",
  adminAuth,
  ensureJobService,
  async (req, res) => {
    try {
      const { jobName } = req.params;
      const { enabled } = req.body;

      if (typeof enabled !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "enabled field must be a boolean",
        });
      }

      const success = req.jobService.toggleJob(jobName, enabled);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: `Job '${jobName}' not found`,
        });
      }

      res.json({
        success: true,
        message: `Job '${jobName}' ${
          enabled ? "enabled" : "disabled"
        } successfully`,
      });
    } catch (error) {
      logger.error("Error toggling job:", error);
      res.status(500).json({
        success: false,
        message: "Failed to toggle job",
      });
    }
  }
);

/**
 * Get linking statistics for a custom period
 */
router.get("/report", authenticateToken, ensureJobService, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let since = null;
    if (startDate) {
      since = new Date(startDate);
      if (isNaN(since.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid startDate format",
        });
      }
    }

    const report = await req.jobService.generateLinkingReport(since);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error("Error generating linking report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate linking report",
    });
  }
});

/**
 * Get available jobs list
 */
router.get("/jobs", authenticateToken, ensureJobService, async (req, res) => {
  try {
    const status = req.jobService.getStatus();

    const jobs = [
      {
        name: "auto-linking",
        description:
          "Automatic linking of recent order items (every 30 minutes)",
        schedule: "*/30 * * * *",
        enabled:
          status.schedules.find((s) => s.name === "auto-linking")?.enabled ||
          false,
      },
      {
        name: "daily-linking",
        description: "Comprehensive daily linking (daily at 2 AM)",
        schedule: "0 2 * * *",
        enabled:
          status.schedules.find((s) => s.name === "daily-linking")?.enabled ||
          false,
      },
      {
        name: "weekly-optimization",
        description: "Weekly optimization and cleanup (Sunday at 3 AM)",
        schedule: "0 3 * * 0",
        enabled:
          status.schedules.find((s) => s.name === "weekly-optimization")
            ?.enabled || false,
      },
    ];

    res.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    logger.error("Error getting jobs list:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get jobs list",
    });
  }
});

/**
 * Get dashboard statistics
 */
router.get("/stats", authenticateToken, ensureJobService, async (req, res) => {
  try {
    const { platform, startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    // Build platform filter
    const platformFilter = platform ? { platform } : {};

    // Get total order items
    const totalItems = await OrderItem.count({
      where: { ...dateFilter },
      include: [
        {
          model: require("../../../models/Order"),
          as: "order",
          where: platformFilter,
          required: true,
        },
      ],
    });

    // Get linked items
    const linkedItems = await OrderItem.count({
      where: {
        ...dateFilter,
        productId: { [Op.not]: null },
      },
      include: [
        {
          model: require("../../../models/Order"),
          as: "order",
          where: platformFilter,
          required: true,
        },
      ],
    });

    // Get unlinked items
    const unlinkedItems = await OrderItem.count({
      where: {
        ...dateFilter,
        productId: null,
      },
      include: [
        {
          model: require("../../../models/Order"),
          as: "order",
          where: platformFilter,
          required: true,
        },
      ],
    });

    // Calculate linking rate
    const linkingRate =
      totalItems > 0 ? ((linkedItems / totalItems) * 100).toFixed(2) : 0;

    // Get recent linking activity (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentlyLinked = await OrderItem.count({
      where: {
        productId: { [Op.not]: null },
        updatedAt: { [Op.gte]: yesterday },
      },
      include: [
        {
          model: require("../../../models/Order"),
          as: "order",
          where: platformFilter,
          required: true,
        },
      ],
    });

    res.json({
      success: true,
      data: {
        totalItems,
        linkedItems,
        unlinkedItems,
        linkingRate: parseFloat(linkingRate),
        recentlyLinked,
      },
    });
  } catch (error) {
    logger.error("Error getting dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard statistics",
    });
  }
});

/**
 * Get unlinked items with pagination
 */
router.get("/unlinked-items", authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      platform,
      search,
      startDate,
      endDate,
    } = req.query;

    const offset = (page - 1) * limit;

    // Build filters
    const whereClause = { productId: null };
    const orderWhere = {};

    if (platform) {
      orderWhere.platform = platform;
    }

    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
        { barcode: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows: items, count: total } = await OrderItem.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: require("../../../models/Order"),
          as: "order",
          where: Object.keys(orderWhere).length > 0 ? orderWhere : undefined,
          required: true,
          attributes: ["id", "orderNumber", "platform", "createdAt"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    logger.error("Error getting unlinked items:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get unlinked items",
    });
  }
});

/**
 * Run retroactive linking
 */
router.post(
  "/run-retroactive",
  adminAuth,
  ensureJobService,
  async (req, res) => {
    try {
      const {
        platform,
        startDate,
        endDate,
        batchSize = 100,
        dryRun = false,
      } = req.body;

      // Build filters for retroactive processing
      const filters = {};
      if (platform) filters.platform = platform;
      if (startDate && endDate) {
        filters.dateRange = { start: startDate, end: endDate };
      }

      // Get the linking service
      const linkingService = new ProductOrderLinkingService();

      // Get unlinked items matching criteria
      const whereClause = { productId: null };
      const orderWhere = {};

      if (platform) {
        orderWhere.platform = platform;
      }

      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      const unlinkedItems = await OrderItem.findAll({
        where: whereClause,
        include: [
          {
            model: require("../../../models/Order"),
            as: "order",
            where: Object.keys(orderWhere).length > 0 ? orderWhere : undefined,
            required: true,
          },
        ],
        limit: parseInt(batchSize),
      });

      if (dryRun) {
        return res.json({
          success: true,
          data: {
            processedItems: unlinkedItems.length,
            linkedItems: 0,
            dryRun: true,
            message: `Would process ${unlinkedItems.length} items`,
          },
        });
      }

      // Get user's products for matching
      const userProducts = await Product.findAll({
        include: [
          {
            model: ProductVariant,
            as: "variants",
          },
        ],
      });

      // Process items
      let linkedCount = 0;
      for (const item of unlinkedItems) {
        try {
          const result = await linkingService.linkOrderItem(item, userProducts);
          if (result.success && result.linkedProduct) {
            linkedCount++;
          }
        } catch (error) {
          logger.error(`Error linking item ${item.id}:`, error);
        }
      }

      res.json({
        success: true,
        data: {
          processedItems: unlinkedItems.length,
          linkedItems: linkedCount,
          dryRun: false,
        },
      });
    } catch (error) {
      logger.error("Error running retroactive linking:", error);
      res.status(500).json({
        success: false,
        message: "Failed to run retroactive linking",
      });
    }
  }
);

/**
 * Get product suggestions for manual linking
 */
router.get("/suggestions/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    // Get the order item
    const orderItem = await OrderItem.findByPk(id, {
      include: [
        {
          model: require("../../../models/Order"),
          as: "order",
        },
      ],
    });

    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: "Order item not found",
      });
    }

    // Get the linking service
    const linkingService = new ProductOrderLinkingService();

    // Get user's products
    const userProducts = await Product.findAll({
      include: [
        {
          model: ProductVariant,
          as: "variants",
        },
      ],
    });

    // Find potential matches using the linking service
    const suggestions = await linkingService.findPotentialMatches(
      orderItem,
      userProducts
    );

    // Limit results
    const limitedSuggestions = suggestions.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        orderItem,
        suggestions: limitedSuggestions,
      },
    });
  } catch (error) {
    logger.error("Error getting product suggestions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get product suggestions",
    });
  }
});

/**
 * Manually link order item to product
 */
router.post("/link/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { productId, variantId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Get the order item
    const orderItem = await OrderItem.findByPk(id);
    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: "Order item not found",
      });
    }

    // Verify product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // If variant specified, verify it exists and belongs to product
    if (variantId) {
      const variant = await ProductVariant.findOne({
        where: {
          id: variantId,
          productId: productId,
        },
      });
      if (!variant) {
        return res.status(404).json({
          success: false,
          message:
            "Product variant not found or doesn't belong to specified product",
        });
      }
    }

    // Update the order item
    await orderItem.update({
      productId: productId,
      variantId: variantId || null,
      linkedAt: new Date(),
      linkingMethod: "manual",
    });

    res.json({
      success: true,
      message: "Order item linked successfully",
      data: {
        orderItem: await OrderItem.findByPk(id, {
          include: [
            { model: Product, as: "product" },
            { model: ProductVariant, as: "variant" },
          ],
        }),
      },
    });
  } catch (error) {
    logger.error("Error linking order item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to link order item",
    });
  }
});

/**
 * Unlink order item from product
 */
router.delete("/unlink/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get the order item
    const orderItem = await OrderItem.findByPk(id);
    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: "Order item not found",
      });
    }

    if (!orderItem.productId) {
      return res.status(400).json({
        success: false,
        message: "Order item is not linked to any product",
      });
    }

    // Unlink the order item
    await orderItem.update({
      productId: null,
      variantId: null,
      linkedAt: null,
      linkingMethod: null,
    });

    res.json({
      success: true,
      message: "Order item unlinked successfully",
      data: { orderItem },
    });
  } catch (error) {
    logger.error("Error unlinking order item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unlink order item",
    });
  }
});

// Export function to set job service instance
const setJobService = (instance) => {
  jobService = instance;
};

// Export the router as default, but also provide named exports
module.exports = router;
module.exports.setJobService = setJobService;
