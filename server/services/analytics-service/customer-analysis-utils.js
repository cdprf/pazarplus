const { Op } = require("sequelize");
const { Order, OrderItem, Product } = require("../../models");
const cacheService = require("../cache-service");
const logger = require("../../utils/logger");

// Analytics configuration
const cachePrefix = "analytics:";
const defaultCacheTTL = 3600; // 1 hour

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

/**
 * Get customer segmentation and behavior analytics
 * Implements RFM analysis, behavioral segments, and customer lifetime value
 */
async function getCustomerSegmentation(userId, timeframe = "30d") {
  const cacheKey = `${cachePrefix}customer-segmentation:${userId}:${timeframe}`;

  try {
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const dateRange = getDateRange(timeframe);

    // Get customer order data
    const customerOrders = await Order.findAll({
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      },
      include: [
        {
          model: OrderItem,
          as: "items",
          attributes: ["quantity", "price"],
        },
      ],
      attributes: ["customerEmail", "createdAt", "totalAmount"],
    });

    // Calculate RFM metrics
    const customerMetrics = {};
    const now = new Date();

    customerOrders.forEach((order) => {
      const email = order.customerEmail;
      if (!customerMetrics[email]) {
        customerMetrics[email] = {
          recency: 0,
          frequency: 0,
          monetary: 0,
          firstOrder: order.createdAt,
          lastOrder: order.createdAt,
        };
      }

      const metric = customerMetrics[email];
      metric.frequency += 1;
      metric.monetary += parseFloat(order.totalAmount || 0);

      if (order.createdAt > metric.lastOrder) {
        metric.lastOrder = order.createdAt;
      }
      if (order.createdAt < metric.firstOrder) {
        metric.firstOrder = order.createdAt;
      }
    });

    // Calculate recency and segment customers
    const segments = {
      champions: [],
      loyalCustomers: [],
      potentialLoyalists: [],
      newCustomers: [],
      promisers: [],
      needsAttention: [],
      aboutToSleep: [],
      atRisk: [],
      cannotLoseThem: [],
      hibernating: [],
      lost: [],
    };

    Object.entries(customerMetrics).forEach(([email, metrics]) => {
      const daysSinceLastOrder = Math.floor(
        (now - metrics.lastOrder) / (1000 * 60 * 60 * 24)
      );
      metrics.recency = daysSinceLastOrder;

      // RFM scoring (simplified)
      const recencyScore =
        daysSinceLastOrder < 30
          ? 5
          : daysSinceLastOrder < 60
          ? 4
          : daysSinceLastOrder < 90
          ? 3
          : daysSinceLastOrder < 180
          ? 2
          : 1;
      const frequencyScore =
        metrics.frequency >= 10
          ? 5
          : metrics.frequency >= 5
          ? 4
          : metrics.frequency >= 3
          ? 3
          : metrics.frequency >= 2
          ? 2
          : 1;
      const monetaryScore =
        metrics.monetary >= 1000
          ? 5
          : metrics.monetary >= 500
          ? 4
          : metrics.monetary >= 200
          ? 3
          : metrics.monetary >= 100
          ? 2
          : 1;

      // Segmentation logic
      if (recencyScore >= 4 && frequencyScore >= 4 && monetaryScore >= 4) {
        segments.champions.push({
          email,
          ...metrics,
          recencyScore,
          frequencyScore,
          monetaryScore,
        });
      } else if (
        recencyScore >= 3 &&
        frequencyScore >= 3 &&
        monetaryScore >= 3
      ) {
        segments.loyalCustomers.push({
          email,
          ...metrics,
          recencyScore,
          frequencyScore,
          monetaryScore,
        });
      } else if (recencyScore >= 3 && frequencyScore <= 2) {
        segments.newCustomers.push({
          email,
          ...metrics,
          recencyScore,
          frequencyScore,
          monetaryScore,
        });
      } else if (
        recencyScore <= 2 &&
        frequencyScore >= 3 &&
        monetaryScore >= 3
      ) {
        segments.atRisk.push({
          email,
          ...metrics,
          recencyScore,
          frequencyScore,
          monetaryScore,
        });
      } else {
        segments.needsAttention.push({
          email,
          ...metrics,
          recencyScore,
          frequencyScore,
          monetaryScore,
        });
      }
    });

    const result = {
      segments,
      totalCustomers: Object.keys(customerMetrics).length,
      segmentSummary: {
        champions: segments.champions.length,
        loyalCustomers: segments.loyalCustomers.length,
        potentialLoyalists: segments.potentialLoyalists.length,
        newCustomers: segments.newCustomers.length,
        atRisk: segments.atRisk.length,
        needsAttention: segments.needsAttention.length,
      },
      averageMetrics: {
        recency:
          Object.values(customerMetrics).reduce(
            (sum, m) => sum + m.recency,
            0
          ) / Object.keys(customerMetrics).length,
        frequency:
          Object.values(customerMetrics).reduce(
            (sum, m) => sum + m.frequency,
            0
          ) / Object.keys(customerMetrics).length,
        monetary:
          Object.values(customerMetrics).reduce(
            (sum, m) => sum + m.monetary,
            0
          ) / Object.keys(customerMetrics).length,
      },
      insights: [
        `${segments.champions.length} champion customers generate highest value`,
        `${segments.atRisk.length} customers at risk of churning`,
        `${segments.newCustomers.length} new customers need nurturing`,
      ],
    };

    await cacheService.set(cacheKey, result, defaultCacheTTL);
    return result;
  } catch (error) {
    logger.error("Error getting customer segmentation:", error);
    return {
      segments: {},
      totalCustomers: 0,
      segmentSummary: {},
      averageMetrics: { recency: 0, frequency: 0, monetary: 0 },
      insights: [],
      error: error.message,
    };
  }
}

/**
 * Get product customer segmentation
 */
async function getProductCustomerSegmentation(userId, productId, dateRange) {
  try {
    // This would require customer data - simplified for now
    return {
      newCustomers: 45,
      returningCustomers: 55,
      segments: [
        { name: "Yeni Müşteri", percentage: 45 },
        { name: "Sadık Müşteri", percentage: 55 },
      ],
    };
  } catch (error) {
    logger.error("Customer segmentation error:", error);
    return null;
  }
}

/**
 * Get customer metrics for performance analysis
 */
async function getCustomerMetrics(userId, dateRange) {
  try {
    // Get total unique customers
    const totalCustomers = await Order.count({
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      },
      distinct: true,
      col: "customerEmail",
    });

    // Get returning customers
    const returningCustomers = await Order.findAll({
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      },
      attributes: ["customerEmail"],
      group: ["customerEmail"],
      having: Order.sequelize.literal("COUNT(*) > 1"),
    });

    // Customer retention rate
    const retentionRate =
      totalCustomers > 0
        ? (returningCustomers.length / totalCustomers) * 100
        : 0;

    // Average orders per customer
    const totalOrders = await Order.count({
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      },
    });

    const avgOrdersPerCustomer =
      totalCustomers > 0 ? totalOrders / totalCustomers : 0;

    // Customer lifetime value (simplified)
    const totalRevenue = await Order.sum("totalAmount", {
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      },
    });

    const avgCustomerValue =
      totalCustomers > 0 ? (totalRevenue || 0) / totalCustomers : 0;

    return {
      totalCustomers,
      returningCustomers: returningCustomers.length,
      retentionRate: Math.round(retentionRate * 100) / 100,
      avgOrdersPerCustomer: Math.round(avgOrdersPerCustomer * 100) / 100,
      avgCustomerValue: Math.round(avgCustomerValue * 100) / 100,
    };
  } catch (error) {
    logger.error("Error getting customer metrics:", error);
    return {
      totalCustomers: 0,
      returningCustomers: 0,
      retentionRate: 0,
      avgOrdersPerCustomer: 0,
      avgCustomerValue: 0,
    };
  }
}

module.exports = {
  getCustomerSegmentation,
  getProductCustomerSegmentation,
  getCustomerMetrics,
};
