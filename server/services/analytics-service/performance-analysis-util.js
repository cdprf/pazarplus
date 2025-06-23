const { Op } = require("sequelize");
const { Order, OrderItem, Product } = require("../../models");
const logger = require("../../utils/logger");

/**
 * Get product performance breakdown by platform
 */
async function getProductPlatformBreakdown(userId, productId, dateRange) {
  const whereClause = {
    include: [
      {
        model: Order,
        as: "order",
        where: {
          userId,
          createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
        },
        attributes: ["platform"],
      },
    ],
    attributes: [
      [OrderItem.sequelize.col("order.platform"), "platform"],
      [
        OrderItem.sequelize.fn("SUM", OrderItem.sequelize.col("quantity")),
        "totalSold",
      ],
      [
        OrderItem.sequelize.fn(
          "SUM",
          OrderItem.sequelize.literal('"quantity" * "OrderItem"."price"')
        ),
        "totalRevenue",
      ],
      [
        OrderItem.sequelize.fn("COUNT", OrderItem.sequelize.col("order.id")),
        "totalOrders",
      ],
    ],
    group: ["order.platform"],
    order: [
      [
        OrderItem.sequelize.fn(
          "SUM",
          OrderItem.sequelize.literal('"quantity" * "OrderItem"."price"')
        ),
        "DESC",
      ],
    ],
  };

  if (productId) {
    whereClause.where = { productId };
  }

  const breakdown = await OrderItem.findAll(whereClause);

  return breakdown.map((item) => ({
    platform: item.get("platform"),
    totalSold: parseInt(item.get("totalSold")),
    totalRevenue: parseFloat(item.get("totalRevenue")),
    totalOrders: parseInt(item.get("totalOrders")),
    averageOrderValue:
      parseFloat(item.get("totalRevenue")) / parseInt(item.get("totalOrders")),
  }));
}

/**
 * Get comprehensive product performance metrics
 */
async function getProductPerformanceMetrics(userId, productId, dateRange) {
  try {
    // Get current period data
    const currentPeriodData = await getProductPeriodData(
      userId,
      productId,
      dateRange
    );

    // Get previous period for comparison
    const previousPeriod = getPreviousPeriod(dateRange);
    const previousPeriodData = await getProductPeriodData(
      userId,
      productId,
      previousPeriod
    );

    // Calculate performance metrics
    const metrics = {
      salesGrowth: calculateGrowthRate(
        currentPeriodData.totalRevenue,
        previousPeriodData.totalRevenue
      ),
      quantityGrowth: calculateGrowthRate(
        currentPeriodData.totalSold,
        previousPeriodData.totalSold
      ),
      orderGrowth: calculateGrowthRate(
        currentPeriodData.totalOrders,
        previousPeriodData.totalOrders
      ),
      priceChange: calculateGrowthRate(
        currentPeriodData.averagePrice,
        previousPeriodData.averagePrice
      ),
      conversionRate: calculateConversionRate(currentPeriodData),
      inventoryTurnover: await calculateInventoryTurnover(
        userId,
        productId,
        dateRange
      ),
      profitMargin: await calculateProductProfitMargin(
        userId,
        productId,
        dateRange
      ),
      customerSegmentation: await getProductCustomerSegmentation(
        userId,
        productId,
        dateRange
      ),
    };

    return {
      current: currentPeriodData,
      previous: previousPeriodData,
      metrics,
    };
  } catch (error) {
    logger.error("Product performance metrics error:", error);
    return null;
  }
}

/**
 * Analyze category performance
 */
async function getCategoryPerformance(userId, dateRange) {
  const categoryData = await OrderItem.findAll({
    include: [
      {
        model: Order,
        as: "order",
        where: {
          userId,
          createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
        },
        attributes: [],
      },
      {
        model: Product,
        as: "product",
        attributes: ["category"],
      },
    ],
    attributes: [
      [OrderItem.sequelize.col("product.category"), "category"],
      [
        OrderItem.sequelize.fn("SUM", OrderItem.sequelize.col("quantity")),
        "totalSold",
      ],
      [
        OrderItem.sequelize.fn(
          "SUM",
          OrderItem.sequelize.literal(
            '"OrderItem"."quantity" * "OrderItem"."price"'
          )
        ),
        "revenue",
      ],
      [
        OrderItem.sequelize.fn(
          "COUNT",
          OrderItem.sequelize.literal('DISTINCT "OrderItem"."productId"')
        ),
        "productCount",
      ],
    ],
    group: ["product.category", "product.id"],
    order: [[OrderItem.sequelize.literal("revenue"), "DESC"]],
  });

  return categoryData.map((item) => ({
    category: item.get("category") || "Uncategorized",
    totalSold: parseInt(item.get("totalSold")),
    revenue: parseFloat(item.get("revenue")),
    productCount: parseInt(item.get("productCount")),
    avgRevenuePerProduct:
      parseFloat(item.get("revenue")) / parseInt(item.get("productCount")),
  }));
}

/**
 * Get performance metrics
 */
async function getPerformanceMetrics(userId, dateRange) {
  const whereClause = {
    userId,
    createdAt: {
      [Op.between]: [dateRange.start, dateRange.end],
    },
  };

  // Order fulfillment times - simplified since shippedAt column doesn't exist
  const fulfillmentTimes = await Order.findAll({
    where: {
      ...whereClause,
      orderStatus: "delivered",
    },
    attributes: [
      [
        Order.sequelize.literal(
          "AVG(JULIANDAY(updatedAt) - JULIANDAY(createdAt))"
        ),
        "avgFulfillmentDays",
      ],
    ],
  });

  // Return rate
  const returnRate = await calculateReturnRate(userId, dateRange);

  // Customer satisfaction metrics
  const satisfactionMetrics = await calculateSatisfactionMetrics(
    userId,
    dateRange
  );

  // Get customer metrics
  const customerMetrics = await getCustomerMetrics(userId, dateRange);

  return {
    avgFulfillmentTime: parseFloat(
      fulfillmentTimes[0]?.get("avgFulfillmentDays") || 0
    ),
    returnRate,
    satisfaction: satisfactionMetrics,
    ...customerMetrics, // Spread customer metrics into performance
    updatedAt: new Date(),
  };
}

// Helper function to get previous period
function getPreviousPeriod(dateRange) {
  const duration = dateRange.end - dateRange.start;
  const previousEnd = new Date(dateRange.start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  return { start: previousStart, end: previousEnd };
}

module.exports = {
  getPerformanceMetrics,
  getCategoryPerformance,
  getProductPerformanceMetrics,
  getProductPlatformBreakdown,
};
