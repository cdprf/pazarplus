const { Op } = require("sequelize");
const { Order, OrderItem, Product } = require("../../models");
const cacheService = require("../cache-service");
const logger = require("../../utils/logger");

// Analytics configuration
const cachePrefix = "analytics:";
const defaultCacheTTL = 3600; // 1 hour

/**
 * Get order summary statistics - now properly handling returned/cancelled orders
 */
async function getOrderSummary(userId, dateRange) {
  const whereClause = {
    userId,
    createdAt: {
      [Op.between]: [dateRange.start, dateRange.end],
    },
  };

  // Valid statuses for revenue calculation (exclude returned/cancelled)
  const validRevenueStatuses = [
    "new",
    "processing",
    "shipped",
    "delivered",
    "completed",
  ];

  const [
    totalOrders,
    validOrders,
    cancelledOrders,
    returnedOrders,
    totalRevenue,
    avgOrderValue,
    ordersByStatus,
    totalCustomers,
  ] = await Promise.all([
    // Total orders (all statuses)
    Order.count({ where: whereClause }),

    // Valid orders for revenue calculation
    Order.count({
      where: {
        ...whereClause,
        orderStatus: { [Op.in]: validRevenueStatuses },
      },
    }),

    // Cancelled orders
    Order.count({
      where: {
        ...whereClause,
        orderStatus: "cancelled",
      },
    }),

    // Returned orders
    Order.count({
      where: {
        ...whereClause,
        orderStatus: "returned",
      },
    }),

    // Revenue only from valid orders (excludes returns/cancellations)
    Order.sum("totalAmount", {
      where: {
        ...whereClause,
        orderStatus: { [Op.in]: validRevenueStatuses },
      },
    }),

    // Average order value from valid orders only
    Order.findOne({
      where: {
        ...whereClause,
        orderStatus: { [Op.in]: validRevenueStatuses },
      },
      attributes: [
        [Order.sequelize.fn("AVG", Order.sequelize.col("totalAmount")), "avg"],
      ],
    }),

    // Orders breakdown by status
    Order.findAll({
      where: whereClause,
      attributes: [
        "orderStatus",
        [Order.sequelize.fn("COUNT", Order.sequelize.col("id")), "count"],
        [
          Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")),
          "totalAmount",
        ],
      ],
      group: ["orderStatus"],
    }),

    // Customer count from valid orders only
    Order.count({
      where: {
        ...whereClause,
        orderStatus: { [Op.in]: validRevenueStatuses },
      },
      distinct: true,
      col: "customerEmail",
    }).catch(() => 0),
  ]);

  return {
    totalOrders,
    validOrders, // Orders contributing to revenue
    cancelledOrders,
    returnedOrders,
    totalRevenue: totalRevenue || 0,
    avgOrderValue: parseFloat(avgOrderValue?.get("avg") || 0),
    totalCustomers: totalCustomers || 0,
    ordersByStatus: ordersByStatus.map((item) => ({
      status: item.orderStatus,
      count: parseInt(item.get("count")),
      totalAmount: parseFloat(item.get("totalAmount") || 0),
    })),
    // Calculate return and cancellation rates
    returnRate: totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0,
    cancellationRate:
      totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0,
  };
}

/**
 * Get order trends and forecasting
 */
async function getOrderTrends(userId, dateRange) {
  const dailyOrders = await Order.findAll({
    where: {
      userId,
      createdAt: {
        [Op.between]: [dateRange.start, dateRange.end],
      },
    },
    attributes: [
      [Order.sequelize.fn("DATE", Order.sequelize.col("createdAt")), "date"],
      [Order.sequelize.fn("COUNT", Order.sequelize.col("id")), "orders"],
      [
        Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")),
        "revenue",
      ],
    ],
    group: [Order.sequelize.fn("DATE", Order.sequelize.col("createdAt"))],
    order: [
      [Order.sequelize.fn("DATE", Order.sequelize.col("createdAt")), "ASC"],
    ],
  });

  const trends = dailyOrders.map((item) => ({
    date: item.get("date"),
    orders: parseInt(item.get("orders")),
    revenue: parseFloat(item.get("revenue") || 0),
  }));

  // Simple moving average for trend analysis
  const movingAverage = calculateMovingAverage(trends, 7);
  const forecast = generateSimpleForecast(trends, 7);

  return {
    daily: trends,
    movingAverage,
    forecast,
    insights: generateInsights(trends),
  };
}

module.exports = {
  getOrderSummary,
  getOrderTrends,
};
