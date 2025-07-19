const { Op } = require("sequelize");
const { Order, OrderItem, Product } = require("../../models");
const cacheService = require("../cache-service");
const logger = require("../../utils/logger");

// Analytics configuration
const cachePrefix = "analytics:";
const defaultCacheTTL = 3600; // 1 hour

/**
 * Get order summary statistics - simplified and reliable version
 */
async function getOrderSummary(userId, dateRange) {
  const whereClause = {
    userId,
    createdAt: {
      [Op.between]: [dateRange.start, dateRange.end],
    },
  };

  // Valid statuses for revenue calculation (exclude returned/cancelled)
  // Using actual database enum values
  const validRevenueStatuses = [
    "new",
    "processing",
    "shipped",
    "in_transit",
    "delivered",
    "claim_created", // Include claim_created as it's still a valid order
  ];

  try {
    // Get basic order counts
    const [totalOrders, validOrders, cancelledOrders, returnedOrders] =
      await Promise.all([
        Order.count({ where: whereClause }),
        Order.count({
          where: {
            ...whereClause,
            orderStatus: { [Op.in]: validRevenueStatuses },
          },
        }),
        Order.count({
          where: {
            ...whereClause,
            orderStatus: "cancelled",
          },
        }),
        Order.count({
          where: {
            ...whereClause,
            orderStatus: "returned",
          },
        }),
      ]);

    // Get revenue data from valid orders only
    const revenueData = await Order.findOne({
      where: {
        ...whereClause,
        orderStatus: { [Op.in]: validRevenueStatuses },
      },
      attributes: [
        [
          Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")),
          "totalRevenue",
        ],
        [
          Order.sequelize.fn("AVG", Order.sequelize.col("totalAmount")),
          "avgOrderValue",
        ],
        [
          Order.sequelize.fn("COUNT", Order.sequelize.col("id")),
          "revenueOrderCount",
        ],
      ],
      raw: true,
    });

    // Get orders by status with their revenue
    const ordersByStatus = await Order.findAll({
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
      raw: true,
    });

    // Get unique customer count
    const totalCustomers = await Order.count({
      where: {
        ...whereClause,
        orderStatus: { [Op.in]: validRevenueStatuses },
      },
      distinct: true,
      col: "customerEmail",
    });

    const totalRevenue = parseFloat(revenueData?.totalRevenue || 0);
    const avgOrderValue = parseFloat(revenueData?.avgOrderValue || 0);

    return {
      totalOrders: totalOrders || 0,
      validOrders: validOrders || 0,
      cancelledOrders: cancelledOrders || 0,
      returnedOrders: returnedOrders || 0,
      totalRevenue,
      averageOrderValue: avgOrderValue, // Fixed: use expected field name
      avgOrderValue, // Keep both for compatibility
      totalCustomers: totalCustomers || 0,
      // Add expected fields for compatibility
      completedOrders: validOrders || 0, // Map to completed orders
      pendingOrders: Math.max(
        0,
        (totalOrders || 0) -
          (validOrders || 0) -
          (cancelledOrders || 0) -
          (returnedOrders || 0)
      ),
      newCustomers: totalCustomers || 0, // Can be enhanced later
      returningCustomers: 0, // Can be enhanced later
      growthRate: 0, // Can be enhanced later
      completionRate:
        totalOrders > 0 ? ((validOrders || 0) / totalOrders) * 100 : 0,
      ordersByStatus: ordersByStatus.map((item) => ({
        status: item.orderStatus,
        count: parseInt(item.count || 0),
        totalAmount: parseFloat(item.totalAmount || 0),
      })),
      // Calculate rates
      returnRate: totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0,
      cancellationRate:
        totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0,
    };
  } catch (error) {
    logger.error("Error in getOrderSummary:", error);
    return {
      totalOrders: 0,
      validOrders: 0,
      cancelledOrders: 0,
      returnedOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      totalCustomers: 0,
      ordersByStatus: [],
      returnRate: 0,
      cancellationRate: 0,
    };
  }
}

/**
 * Get order trends and forecasting - simplified to use Order.totalAmount
 */
async function getOrderTrends(userId, dateRange) {
  const whereClause = {
    userId,
    createdAt: {
      [Op.between]: [dateRange.start, dateRange.end],
    },
    // Only include orders that contribute to revenue
    orderStatus: {
      [Op.in]: [
        "new",
        "processing",
        "shipped",
        "in_transit",
        "delivered",
        "claim_created",
      ],
    },
  };

  try {
    const dailyOrders = await Order.findAll({
      where: whereClause,
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
      raw: true,
    });

    const trends = dailyOrders.map((item) => ({
      date: item.date,
      orders: parseInt(item.orders || 0),
      revenue: parseFloat(item.revenue || 0),
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
  } catch (error) {
    logger.error("Error in getOrderTrends:", error);
    return {
      daily: [],
      movingAverage: [],
      forecast: [],
      insights: [],
    };
  }
}

/**
 * Get product performance analytics - simplified and reliable version
 */
async function getProductPerformance(userId, dateRange, limit = 10) {
  const whereClause = {
    userId,
    createdAt: {
      [Op.between]: [dateRange.start, dateRange.end],
    },
    // Only include orders that contribute to revenue
    orderStatus: {
      [Op.in]: [
        "new",
        "processing",
        "shipped",
        "in_transit",
        "delivered",
        "claim_created",
      ],
    },
  };

  try {
    // Top performing products by revenue
    const topProducts = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: "order",
          where: whereClause,
          attributes: [],
        },
        {
          model: Product,
          as: "product",
          attributes: ["title", "imageUrl", "platform"],
        },
      ],
      attributes: [
        "productId",
        [
          OrderItem.sequelize.fn("SUM", OrderItem.sequelize.col("quantity")),
          "totalQuantity",
        ],
        [
          OrderItem.sequelize.fn(
            "SUM",
            OrderItem.sequelize.literal(
              'CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)'
            )
          ),
          "totalRevenue",
        ],
        [
          OrderItem.sequelize.fn(
            "COUNT",
            OrderItem.sequelize.fn(
              "DISTINCT",
              OrderItem.sequelize.col("order.id")
            )
          ),
          "orderCount",
        ],
      ],
      group: ["OrderItem.productId", "product.id"],
      order: [[OrderItem.sequelize.literal("totalRevenue"), "DESC"]],
      limit,
      raw: false,
    });

    // Category performance
    const categoryPerformance = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: "order",
          where: whereClause,
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
          "totalQuantity",
        ],
        [
          OrderItem.sequelize.fn(
            "SUM",
            OrderItem.sequelize.literal(
              'CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)'
            )
          ),
          "totalRevenue",
        ],
        [
          OrderItem.sequelize.fn(
            "COUNT",
            OrderItem.sequelize.fn(
              "DISTINCT",
              OrderItem.sequelize.col("order.id")
            )
          ),
          "orderCount",
        ],
      ],
      group: [OrderItem.sequelize.col("product.category")],
      order: [[OrderItem.sequelize.literal("totalRevenue"), "DESC"]],
      raw: true,
    });

    // Platform performance
    const platformPerformance = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: "order",
          where: whereClause,
          attributes: [],
        },
        {
          model: Product,
          as: "product",
          attributes: ["platform"],
        },
      ],
      attributes: [
        [OrderItem.sequelize.col("product.platform"), "platform"],
        [
          OrderItem.sequelize.fn("SUM", OrderItem.sequelize.col("quantity")),
          "totalQuantity",
        ],
        [
          OrderItem.sequelize.fn(
            "SUM",
            OrderItem.sequelize.literal(
              'CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)'
            )
          ),
          "totalRevenue",
        ],
        [
          OrderItem.sequelize.fn(
            "COUNT",
            OrderItem.sequelize.fn(
              "DISTINCT",
              OrderItem.sequelize.col("order.id")
            )
          ),
          "orderCount",
        ],
      ],
      group: [OrderItem.sequelize.col("product.platform")],
      order: [[OrderItem.sequelize.literal("totalRevenue"), "DESC"]],
      raw: true,
    });

    return {
      topProducts: topProducts.map((item) => ({
        productId: item.productId,
        title: item.product?.title || "Unknown Product",
        imageUrl: item.product?.imageUrl,
        platform: item.product?.platform,
        totalQuantity: parseInt(item.get("totalQuantity") || 0),
        totalRevenue: parseFloat(item.get("totalRevenue") || 0),
        orderCount: parseInt(item.get("orderCount") || 0),
      })),
      categoryPerformance: categoryPerformance.map((item) => ({
        category: item.category || "Unknown Category",
        totalQuantity: parseInt(item.totalQuantity || 0),
        totalRevenue: parseFloat(item.totalRevenue || 0),
        orderCount: parseInt(item.orderCount || 0),
      })),
      platformPerformance: platformPerformance.map((item) => ({
        platform: item.platform || "Unknown Platform",
        totalQuantity: parseInt(item.totalQuantity || 0),
        totalRevenue: parseFloat(item.totalRevenue || 0),
        orderCount: parseInt(item.orderCount || 0),
      })),
    };
  } catch (error) {
    logger.error("Error in getProductPerformance:", error);
    return {
      topProducts: [],
      categoryPerformance: [],
      platformPerformance: [],
    };
  }
}

/**
 * Get revenue analytics using our working approach with correct enum values
 */
async function getSimpleRevenueAnalytics(userId, dateRange) {
  const whereClause = {
    userId,
    createdAt: {
      [Op.between]: [dateRange.start, dateRange.end],
    },
    // Use correct enum values
    orderStatus: {
      [Op.in]: [
        "new",
        "processing",
        "shipped",
        "in_transit",
        "delivered",
        "claim_created",
      ],
    },
  };

  try {
    // Get basic revenue data
    const revenueData = await Order.findOne({
      attributes: [
        [
          Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")),
          "totalRevenue",
        ],
        [Order.sequelize.fn("COUNT", Order.sequelize.col("id")), "totalOrders"],
        [
          Order.sequelize.fn("AVG", Order.sequelize.col("totalAmount")),
          "avgOrderValue",
        ],
      ],
      where: whereClause,
      raw: true,
    });

    const totalRevenue = parseFloat(revenueData.totalRevenue) || 0;
    const totalOrders = parseInt(revenueData.totalOrders) || 0;

    // Get daily trends
    const dailyTrends = await Order.findAll({
      attributes: [
        [Order.sequelize.fn("DATE", Order.sequelize.col("createdAt")), "date"],
        [
          Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")),
          "revenue",
        ],
        [Order.sequelize.fn("COUNT", Order.sequelize.col("id")), "orders"],
      ],
      where: whereClause,
      group: [Order.sequelize.fn("DATE", Order.sequelize.col("createdAt"))],
      order: [
        [Order.sequelize.fn("DATE", Order.sequelize.col("createdAt")), "ASC"],
      ],
      raw: true,
    });

    return {
      total: totalRevenue,
      totalRevenue: totalRevenue,
      totalOrders: totalOrders,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      trends: dailyTrends.map((trend) => ({
        date: trend.date,
        revenue: parseFloat(trend.revenue) || 0,
        orders: parseInt(trend.orders) || 0,
      })),
      dailyData: dailyTrends,
      weeklyData: [], // Can be expanded later
      monthlyData: [], // Can be expanded later
      growth: {
        percentage: 0, // Can calculate if needed
        direction: "stable",
        trend:
          totalRevenue > 0 ? "Revenue available" : "No revenue data available",
      },
      platformBreakdown: [], // Can be expanded later
      forecast: {
        nextWeek: 0, // Can be expanded later
        nextMonth: 0, // Can be expanded later
        confidence: 0,
      },
      message:
        totalRevenue > 0
          ? "Revenue data available"
          : "No revenue data available for this period",
    };
  } catch (error) {
    logger.error("Error in getSimpleRevenueAnalytics:", error);
    return {
      total: 0,
      totalRevenue: 0,
      trends: [],
      dailyData: [],
      weeklyData: [],
      monthlyData: [],
      growth: {
        percentage: 0,
        direction: "stable",
        trend: "Error fetching revenue data",
      },
      platformBreakdown: [],
      forecast: { nextWeek: 0, nextMonth: 0, confidence: 0 },
      message: "Error fetching revenue data",
    };
  }
}

/**
 * Helper functions for trend analysis
 */
function calculateMovingAverage(data, windowSize) {
  if (!data || data.length === 0) return [];

  const result = [];
  for (let i = windowSize - 1; i < data.length; i++) {
    const window = data.slice(i - windowSize + 1, i + 1);
    const avgOrders =
      window.reduce((sum, item) => sum + item.orders, 0) / windowSize;
    const avgRevenue =
      window.reduce((sum, item) => sum + item.revenue, 0) / windowSize;

    result.push({
      date: data[i].date,
      avgOrders: Math.round(avgOrders),
      avgRevenue: Math.round(avgRevenue * 100) / 100,
    });
  }
  return result;
}

function generateSimpleForecast(data, days) {
  if (!data || data.length < 3) return [];

  // Simple linear regression for next few days
  const recentData = data.slice(-14); // Use last 14 days for forecasting
  const forecast = [];

  for (let i = 1; i <= days; i++) {
    const lastDay = data[data.length - 1];
    const avgOrders =
      recentData.reduce((sum, item) => sum + item.orders, 0) /
      recentData.length;
    const avgRevenue =
      recentData.reduce((sum, item) => sum + item.revenue, 0) /
      recentData.length;

    const forecastDate = new Date(lastDay.date);
    forecastDate.setDate(forecastDate.getDate() + i);

    forecast.push({
      date: forecastDate.toISOString().split("T")[0],
      predictedOrders: Math.round(avgOrders),
      predictedRevenue: Math.round(avgRevenue * 100) / 100,
      confidence: Math.max(0.5, 1 - i * 0.1), // Decreasing confidence
    });
  }

  return forecast;
}

function generateInsights(data) {
  if (!data || data.length === 0) return [];

  const insights = [];
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalOrders = data.reduce((sum, item) => sum + item.orders, 0);
  const avgDailyRevenue = totalRevenue / data.length;
  const avgDailyOrders = totalOrders / data.length;

  if (totalRevenue > 0) {
    insights.push({
      type: "revenue",
      message: `Average daily revenue: $${avgDailyRevenue.toFixed(2)}`,
      value: avgDailyRevenue,
    });
  }

  if (totalOrders > 0) {
    insights.push({
      type: "orders",
      message: `Average daily orders: ${avgDailyOrders.toFixed(1)}`,
      value: avgDailyOrders,
    });
  }

  // Trend analysis
  if (data.length >= 7) {
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstHalfAvg =
      firstHalf.reduce((sum, item) => sum + item.revenue, 0) / firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((sum, item) => sum + item.revenue, 0) /
      secondHalf.length;

    const growthRate = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    if (Math.abs(growthRate) > 5) {
      insights.push({
        type: "trend",
        message: `Revenue ${
          growthRate > 0 ? "increased" : "decreased"
        } by ${Math.abs(growthRate).toFixed(1)}% in recent period`,
        value: growthRate,
      });
    }
  }

  return insights;
}

module.exports = {
  getOrderSummary,
  getOrderTrends,
  getProductPerformance,
  getSimpleRevenueAnalytics,
};
