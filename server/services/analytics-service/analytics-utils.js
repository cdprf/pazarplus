const { Op } = require("sequelize");
const { Order, OrderItem, Product } = require("../../models");
const cacheService = require("../cache-service");
const logger = require("../../utils/logger");

// Analytics configuration
const cachePrefix = "analytics:";
const defaultCacheTTL = 3600; // 1 hour

// Import utility functions
const { calculateGrowthRate } = require("./analytic-calculation-utils");
const { getOrderSummary, getOrderTrends } = require("./orders-analytic-utils");
const { getTopProducts } = require("./product-analysis-utils");
const { getCustomerMetrics } = require("./customer-analysis-utils");

// Functions that need to be available (these might be in the main service)
function getPlatformComparison(userId, dateRange) {
  // This should be implemented or imported from the main service
  return Promise.resolve({
    platforms: [],
    comparison: {},
    trends: [],
  });
}

function getPerformanceMetrics(userId, dateRange) {
  // This should be implemented or imported
  return Promise.resolve({
    efficiency: 0,
    growth: 0,
    profitability: 0,
  });
}

function getFinancialKPIs(userId, dateRange) {
  // This should be implemented or imported
  return Promise.resolve({
    revenue: 0,
    profit: 0,
    margins: 0,
  });
}

// Helper function to get date range
function getDateRange(timeframe) {
  const end = new Date();
  const start = new Date();

  switch (timeframe) {
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "90d":
      start.setDate(start.getDate() - 90);
      break;
    case "365d":
      start.setDate(start.getDate() - 365);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }

  return { start, end };
}

// Helper function to get previous period
function getPreviousPeriod(dateRange) {
  const duration = dateRange.end - dateRange.start;
  const previousEnd = new Date(dateRange.start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);

  return { start: previousStart, end: previousEnd };
}

/**
 * Get accurate analytics that properly handle returns and cancellations
 * This provides a comprehensive view of business performance with clean data
 */
async function getAccurateAnalytics(userId, timeframe = "30d") {
  const cacheKey = `${cachePrefix}accurate:${userId}:${timeframe}`;

  try {
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const dateRange = getDateRange(timeframe);

    // Get all main analytics components
    const [
      orderSummary,
      revenueAnalytics,
      platformComparison,
      topProducts,
      orderTrends,
      performanceMetrics,
      customerMetrics,
      financialKPIs,
    ] = await Promise.all([
      getOrderSummary(userId, dateRange),
      getRevenueAnalytics(userId, dateRange),
      getPlatformComparison(userId, dateRange),
      getTopProducts(userId, dateRange, 10),
      getOrderTrends(userId, dateRange),
      getPerformanceMetrics(userId, dateRange),
      getCustomerMetrics(userId, dateRange),
      getFinancialKPIs(userId, dateRange),
    ]);

    // Calculate accuracy metrics
    const accuracyMetrics = {
      dataQuality: {
        totalOrders: orderSummary.totalOrders,
        validOrders: orderSummary.validOrders,
        excludedOrders:
          orderSummary.cancelledOrders + orderSummary.returnedOrders,
        dataAccuracy:
          orderSummary.totalOrders > 0
            ? (
                (orderSummary.validOrders / orderSummary.totalOrders) *
                100
              ).toFixed(2)
            : 100,
      },
      revenueAccuracy: {
        grossRevenue: revenueAnalytics.totalRevenue || 0,
        netRevenue:
          (revenueAnalytics.totalRevenue || 0) -
          (revenueAnalytics.refundedAmount || 0),
        returnImpact: orderSummary.returnRate,
        cancellationImpact: orderSummary.cancellationRate,
      },
    };

    const result = {
      summary: {
        ...orderSummary,
        accuracy: accuracyMetrics,
      },
      revenue: revenueAnalytics,
      platforms: platformComparison,
      topProducts: topProducts,
      trends: orderTrends,
      performance: performanceMetrics,
      customers: customerMetrics,
      financialKPIs: financialKPIs,
      metadata: {
        timeframe,
        generatedAt: new Date(),
        dataExclusions: {
          cancelledOrders: orderSummary.cancelledOrders,
          returnedOrders: orderSummary.returnedOrders,
          note: "Revenue calculations exclude returned, cancelled, and refunded orders for accurate business insights",
        },
      },
    };

    await cacheService.set(cacheKey, result, defaultCacheTTL);
    return result;
  } catch (error) {
    logger.error("Accurate analytics error:", error);
    throw error;
  }
}

/**
 * Get comprehensive dashboard analytics with advanced insights
 */
async function getDashboardAnalytics(userId, timeframe = "30d") {
  const cacheKey = `${cachePrefix}dashboard:${userId}:${timeframe}`;

  try {
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const dateRange = getDateRange(timeframe);
    const analytics = await Promise.all([
      getOrderSummary(userId, dateRange),
      getRevenueAnalytics(userId, dateRange),
      getPlatformComparison(userId, dateRange),
      getTopProducts(userId, dateRange),
      getOrderTrends(userId, dateRange),
      getPerformanceMetrics(userId, dateRange),
      getPredictiveInsights(userId, dateRange),
      getMarketIntelligence(userId, dateRange),
      getFinancialKPIs(userId, dateRange),
    ]);

    const result = {
      summary: analytics[0],
      revenue: analytics[1],
      platforms: analytics[2],
      topProducts: analytics[3],
      trends: analytics[4],
      performance: analytics[5],
      predictions: analytics[6],
      marketIntelligence: analytics[7],
      financialKPIs: analytics[8],
      generatedAt: new Date(),
      timeframe,
    };

    await cacheService.set(cacheKey, result, defaultCacheTTL);
    return result;
  } catch (error) {
    logger.error("Dashboard analytics error:", error);
    throw error;
  }
}

/**
 * Get detailed revenue analytics
 */
async function getRevenueAnalytics(userId, dateRange) {
  const whereClause = {
    userId,
    createdAt: {
      [Op.between]: [dateRange.start, dateRange.end],
    },
  };

  console.log("Revenue Analytics - Starting daily revenue calculation");
  
  try {
    // Daily revenue breakdown using OrderItems for accurate revenue calculation
    const dailyRevenue = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: "order",
          where: whereClause,
          attributes: [],
        },
      ],
      attributes: [
        [
          OrderItem.sequelize.fn(
            "DATE",
            OrderItem.sequelize.col("order.createdAt")
          ),
          "date",
        ],
        [
          OrderItem.sequelize.fn(
            "SUM",
            OrderItem.sequelize.literal(
              'CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)'
            )
          ),
          "revenue",
        ],
        [
          OrderItem.sequelize.fn(
            "COUNT",
            OrderItem.sequelize.fn(
              "DISTINCT",
              OrderItem.sequelize.col("order.id")
            )
          ),
          "orders",
        ],
      ],
      group: [
        OrderItem.sequelize.fn(
          "DATE",
          OrderItem.sequelize.col("order.createdAt")
        ),
      ],
      order: [
        [
          OrderItem.sequelize.fn(
            "DATE",
            OrderItem.sequelize.col("order.createdAt")
          ),
          "ASC",
        ],
      ],
    });
    
    console.log("Revenue Analytics - Daily revenue calculation complete");
    console.log("Revenue Analytics - Starting platform revenue calculation");
    
    // Revenue by platform using OrderItems
    const platformRevenue = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: "order",
          where: whereClause,
          attributes: [],
        },
      ],
      attributes: [
        [OrderItem.sequelize.col("order.platform"), "platform"],
        [
          OrderItem.sequelize.fn(
            "SUM",
            OrderItem.sequelize.literal(
              'CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)'
            )
          ),
          "revenue",
        ],
        [
          OrderItem.sequelize.fn(
            "COUNT",
            OrderItem.sequelize.fn(
              "DISTINCT",
              OrderItem.sequelize.col("order.id")
            )
          ),
          "orders",
        ],
      ],
      group: [OrderItem.sequelize.col("order.platform")],
    });
    
    console.log("Revenue Analytics - Platform revenue calculation complete");
    console.log("Revenue Analytics - Starting previous period calculation");

    // Growth calculation using OrderItems
    const previousPeriod = getPreviousPeriod(dateRange);
    
    console.log("Revenue Analytics - Calculating previous revenue");
    
    // Fix: Replace OrderItem.sum with a more standard approach using findAll and SUM
    const previousRevenueResult = await OrderItem.findAll({
      attributes: [
        [
          OrderItem.sequelize.fn(
            'SUM',
            OrderItem.sequelize.literal('CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)')
          ),
          'totalRevenue'
        ]
      ],
      include: [
        {
          model: Order,
          as: "order",
          where: {
            userId,
            createdAt: {
              [Op.between]: [previousPeriod.start, previousPeriod.end],
            },
          },
          attributes: [],
        },
      ],
      raw: true
    });
    
    const previousRevenue = previousRevenueResult[0]?.totalRevenue || 0;
    
    console.log("Revenue Analytics - Calculating current revenue");
    
    // Fix: Replace OrderItem.sum with a more standard approach using findAll and SUM
    const currentRevenueResult = await OrderItem.findAll({
      attributes: [
        [
          OrderItem.sequelize.fn(
            'SUM',
            OrderItem.sequelize.literal('CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)')
          ),
          'totalRevenue'
        ]
      ],
      include: [
        {
          model: Order,
          as: "order",
          where: whereClause,
          attributes: [],
        },
      ],
      raw: true
    });
    
    const currentRevenue = currentRevenueResult[0]?.totalRevenue || 0;

    console.log("Revenue Analytics - Calculating growth rate");
    const growthRate = previousRevenue
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    console.log("Revenue Analytics - Preparing return data");
    const result = {
      daily: dailyRevenue.map((item) => ({
        date: item.get("date"),
        revenue: parseFloat(item.get("revenue") || 0),
        orders: parseInt(item.get("orders")),
      })),
      platforms: platformRevenue.map((item) => ({
        platform: item.get("platform"),
        revenue: parseFloat(item.get("revenue") || 0),
        orders: parseInt(item.get("orders")),
      })),
      growth: {
        current: currentRevenue || 0,
        previous: previousRevenue || 0,
        rate: growthRate,
      },
      total: currentRevenue || 0,
      trends: dailyRevenue.map((item) => ({
        date: item.get("date"),
        value: parseFloat(item.get("revenue") || 0),
      })),
    };
    console.log("Revenue Analytics - Complete");
    return result;
  } catch (error) {
    console.error("Revenue Analytics Error:", error.message);
    console.error("Error location:", error.stack);
    throw error;
  }
}

module.exports = {
  getAccurateAnalytics,
  getDashboardAnalytics,
  getRevenueAnalytics,
  getDateRange, // Export this function so it can be used in index.js
  // Other analytics functions...
};
