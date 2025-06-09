const { Order, OrderItem, Product } = require("../../../models");
const { Op } = require("sequelize");
const logger = require("../../../utils/logger");
const ProductOrderLinkingService = require("../../../services/product-order-linking-service");

/**
 * Get unlinked order items statistics and list
 */
const getUnlinkedItems = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      platform,
      startDate,
      endDate,
      search,
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { productId: null };

    // Add platform filter if specified
    if (platform) {
      where["$order.platform$"] = platform;
    }

    // Add date range filter if specified
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter[Op.gte] = new Date(startDate);
      if (endDate) dateFilter[Op.lte] = new Date(endDate);
      where["$order.orderDate$"] = dateFilter;
    }

    // Add search filter if specified
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
        { barcode: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: unlinkedItems } = await OrderItem.findAndCountAll({
      where,
      include: [
        {
          model: Order,
          as: "order",
          attributes: [
            "id",
            "orderNumber",
            "platform",
            "orderDate",
            "orderStatus",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    // Get platform breakdown
    const platformBreakdown = await OrderItem.findAll({
      where: { productId: null },
      attributes: [
        "$order.platform$",
        [
          require("sequelize").fn(
            "COUNT",
            require("sequelize").col("OrderItem.id")
          ),
          "count",
        ],
      ],
      include: [
        {
          model: Order,
          as: "order",
          attributes: [],
        },
      ],
      group: ["order.platform"],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        total: count,
        items: unlinkedItems,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
        platformBreakdown,
      },
    });
  } catch (error) {
    logger.error("Get unlinked items error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get unlinked items",
    });
  }
};

/**
 * Get linking statistics and reports
 */
const getLinkingStats = async (req, res) => {
  try {
    const { startDate, endDate, platform } = req.query;

    // Build base query filters
    const orderWhere = {};
    if (platform) orderWhere.platform = platform;
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter[Op.gte] = new Date(startDate);
      if (endDate) dateFilter[Op.lte] = new Date(endDate);
      orderWhere.orderDate = dateFilter;
    }

    // Get total order items
    const totalOrderItems = await OrderItem.count({
      include: [
        {
          model: Order,
          as: "order",
          where: orderWhere,
        },
      ],
    });

    // Get linked order items
    const linkedOrderItems = await OrderItem.count({
      where: { productId: { [Op.not]: null } },
      include: [
        {
          model: Order,
          as: "order",
          where: orderWhere,
        },
      ],
    });

    // Get unlinked order items
    const unlinkedOrderItems = totalOrderItems - linkedOrderItems;

    // Get linking rate by platform
    const linkingByPlatform = await OrderItem.findAll({
      attributes: [
        "$order.platform$",
        [
          require("sequelize").fn(
            "COUNT",
            require("sequelize").col("OrderItem.id")
          ),
          "total",
        ],
        [
          require("sequelize").fn(
            "COUNT",
            require("sequelize").literal(
              'CASE WHEN "OrderItem"."productId" IS NOT NULL THEN 1 END'
            )
          ),
          "linked",
        ],
      ],
      include: [
        {
          model: Order,
          as: "order",
          where: orderWhere,
          attributes: [],
        },
      ],
      group: ["order.platform"],
      raw: true,
    });

    // Calculate linking percentages
    const platformStats = linkingByPlatform.map((item) => ({
      platform: item.platform,
      total: parseInt(item.total),
      linked: parseInt(item.linked),
      unlinked: parseInt(item.total) - parseInt(item.linked),
      linkingRate: (
        (parseInt(item.linked) / parseInt(item.total)) *
        100
      ).toFixed(2),
    }));

    // Get recent linking activity (orders created in last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentActivity = await OrderItem.findAll({
      where: {
        createdAt: { [Op.gte]: weekAgo },
      },
      attributes: [
        [
          require("sequelize").fn(
            "DATE",
            require("sequelize").col("OrderItem.createdAt")
          ),
          "date",
        ],
        [
          require("sequelize").fn(
            "COUNT",
            require("sequelize").col("OrderItem.id")
          ),
          "total",
        ],
        [
          require("sequelize").fn(
            "COUNT",
            require("sequelize").literal(
              'CASE WHEN "OrderItem"."productId" IS NOT NULL THEN 1 END'
            )
          ),
          "linked",
        ],
      ],
      include: [
        {
          model: Order,
          as: "order",
          where: orderWhere,
          attributes: [],
        },
      ],
      group: [
        require("sequelize").fn(
          "DATE",
          require("sequelize").col("OrderItem.createdAt")
        ),
      ],
      order: [
        [
          require("sequelize").fn(
            "DATE",
            require("sequelize").col("OrderItem.createdAt")
          ),
          "ASC",
        ],
      ],
      raw: true,
    });

    const overallLinkingRate =
      totalOrderItems > 0
        ? ((linkedOrderItems / totalOrderItems) * 100).toFixed(2)
        : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalOrderItems,
          linkedOrderItems,
          unlinkedOrderItems,
          linkingRate: overallLinkingRate,
        },
        platformStats,
        recentActivity,
      },
    });
  } catch (error) {
    logger.error("Get linking stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get linking statistics",
    });
  }
};

/**
 * Run retroactive product linking on existing orders
 */
const runRetroactiveLinking = async (req, res) => {
  try {
    const {
      platform,
      startDate,
      endDate,
      batchSize = 100,
      dryRun = false,
      strategies,
    } = req.body;

    // Build query filters
    const orderWhere = {};
    if (platform) orderWhere.platform = platform;
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter[Op.gte] = new Date(startDate);
      if (endDate) dateFilter[Op.lte] = new Date(endDate);
      orderWhere.orderDate = dateFilter;
    }

    // Get unlinked order items
    const unlinkedItems = await OrderItem.findAll({
      where: { productId: null },
      include: [
        {
          model: Order,
          as: "order",
          where: orderWhere,
          attributes: ["id", "platform", "orderNumber"],
        },
      ],
    });

    if (unlinkedItems.length === 0) {
      return res.json({
        success: true,
        message: "No unlinked items found",
        data: {
          processedItems: 0,
          linkedItems: 0,
          results: [],
        },
      });
    }

    logger.info(
      `Starting retroactive linking for ${unlinkedItems.length} items`,
      {
        platform,
        startDate,
        endDate,
        dryRun,
        strategies,
      }
    );

    // Initialize the linking service
    const linkingService = new ProductOrderLinkingService();

    // Configure strategies if provided
    if (strategies && Array.isArray(strategies)) {
      linkingService.setStrategies(strategies);
    }

    // Process items in batches
    const results = [];
    const totalBatches = Math.ceil(unlinkedItems.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const batchStart = i * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, unlinkedItems.length);
      const batch = unlinkedItems.slice(batchStart, batchEnd);

      logger.info(
        `Processing batch ${i + 1}/${totalBatches} (${batch.length} items)`
      );

      try {
        const batchResult = await linkingService.linkProductsToOrderItems(
          batch,
          { dryRun }
        );
        results.push(batchResult);

        // Send progress update for long-running operations
        if (req.app?.io) {
          req.app.io.emit("linking-progress", {
            batch: i + 1,
            totalBatches,
            processed: batchEnd,
            total: unlinkedItems.length,
            currentResult: batchResult,
          });
        }
      } catch (batchError) {
        logger.error(`Batch ${i + 1} failed:`, batchError);
        results.push({
          processedItems: batch.length,
          linkedItems: 0,
          errors: [batchError.message],
        });
      }
    }

    // Aggregate results
    const aggregatedResults = results.reduce(
      (acc, result) => {
        acc.processedItems += result.processedItems || 0;
        acc.linkedItems += result.linkedItems || 0;
        acc.errors = [...(acc.errors || []), ...(result.errors || [])];
        acc.strategyStats = {
          ...acc.strategyStats,
          ...result.strategyStats,
        };
        return acc;
      },
      {
        processedItems: 0,
        linkedItems: 0,
        errors: [],
        strategyStats: {},
      }
    );

    logger.info("Retroactive linking completed", aggregatedResults);

    res.json({
      success: true,
      message: `Processed ${aggregatedResults.processedItems} items, linked ${aggregatedResults.linkedItems}`,
      data: aggregatedResults,
    });
  } catch (error) {
    logger.error("Retroactive linking error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to run retroactive linking",
    });
  }
};

/**
 * Manually link a specific order item to a product
 */
const manualLinkItem = async (req, res) => {
  try {
    const { orderItemId } = req.params;
    const { productId } = req.body;

    // Validate order item exists
    const orderItem = await OrderItem.findByPk(orderItemId, {
      include: [{ model: Order, as: "order" }],
    });

    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: "Order item not found",
      });
    }

    // Validate product exists
    const product = await Product.findByPk(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Update the order item
    await orderItem.update({ productId });

    logger.info("Manual product linking completed", {
      orderItemId,
      productId,
      orderNumber: orderItem.order?.orderNumber,
    });

    res.json({
      success: true,
      message: "Order item linked to product successfully",
      data: {
        orderItem: await OrderItem.findByPk(orderItemId, {
          include: [
            { model: Order, as: "order" },
            { model: Product, as: "product" },
          ],
        }),
      },
    });
  } catch (error) {
    logger.error("Manual linking error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to link order item to product",
    });
  }
};

/**
 * Remove product link from an order item
 */
const unlinkItem = async (req, res) => {
  try {
    const { orderItemId } = req.params;

    const orderItem = await OrderItem.findByPk(orderItemId, {
      include: [{ model: Order, as: "order" }],
    });

    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: "Order item not found",
      });
    }

    await orderItem.update({ productId: null });

    logger.info("Product link removed", {
      orderItemId,
      orderNumber: orderItem.order?.orderNumber,
    });

    res.json({
      success: true,
      message: "Product link removed successfully",
    });
  } catch (error) {
    logger.error("Unlink item error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unlink order item",
    });
  }
};

/**
 * Get product suggestions for a specific order item
 */
const getProductSuggestions = async (req, res) => {
  try {
    const { orderItemId } = req.params;

    const orderItem = await OrderItem.findByPk(orderItemId);

    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: "Order item not found",
      });
    }

    const linkingService = new ProductOrderLinkingService();
    const suggestions = await linkingService.findProductMatches(orderItem);

    res.json({
      success: true,
      data: {
        orderItem,
        suggestions,
      },
    });
  } catch (error) {
    logger.error("Get product suggestions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get product suggestions",
    });
  }
};

module.exports = {
  getUnlinkedItems,
  getLinkingStats,
  runRetroactiveLinking,
  manualLinkItem,
  unlinkItem,
  getProductSuggestions,
};
