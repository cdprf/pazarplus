const logger = require("../../utils/logger");

/**
 * Identify market opportunities
 */
function identifyMarketOpportunities(categoryPerformance, pricingAnalysis) {
  try {
    const opportunities = [];

    if (categoryPerformance && categoryPerformance.length > 0) {
      // Find underperforming categories
      const totalRevenue = categoryPerformance.reduce(
        (sum, cat) => sum + cat.revenue,
        0
      );
      const avgRevenue = totalRevenue / categoryPerformance.length;

      const underperforming = categoryPerformance.filter(
        (cat) => cat.revenue < avgRevenue * 0.5
      );

      underperforming.forEach((category) => {
        opportunities.push({
          type: "growth",
          category: category.category,
          opportunity: "Category expansion",
          potential: "High",
          description: `${category.category} has growth potential`,
        });
      });
    }

    return opportunities.slice(0, 3); // Return top 3 opportunities
  } catch (error) {
    logger.error("Error identifying market opportunities:", error);
    return [];
  }
}

/**
 * Identify pricing opportunities
 */
function identifyPricingOpportunities(pricingData) {
  try {
    const opportunities = [];

    if (!pricingData || pricingData.length === 0) {
      return opportunities;
    }

    pricingData.forEach((item) => {
      const avgPrice = parseFloat(item.get("avgPrice")) || 0;
      const minPrice = parseFloat(item.get("minPrice")) || 0;
      const maxPrice = parseFloat(item.get("maxPrice")) || 0;

      const priceVariation = maxPrice - minPrice;

      if (priceVariation > avgPrice * 0.2) {
        // >20% price variation
        opportunities.push({
          productId: item.get("productId"),
          type: "price_optimization",
          description: "High price variation detected",
          recommendation: "Consider price standardization",
          potential_impact: "Medium",
        });
      }
    });

    return opportunities.slice(0, 5); // Return top 5 opportunities
  } catch (error) {
    logger.error("Error identifying pricing opportunities:", error);
    return [];
  }
}

/**
 * Identify peak sales months from monthly trends
 */
function identifyPeakMonths(monthlyTrends) {
  if (!monthlyTrends || monthlyTrends.length === 0) return [];

  const avgRevenue =
    monthlyTrends.reduce((sum, month) => sum + month.revenue, 0) /
    monthlyTrends.length;

  return monthlyTrends
    .filter((month) => month.revenue > avgRevenue * 1.2) // 20% above average
    .map((month) => ({
      month: month.month,
      revenue: month.revenue,
      orders: month.orders,
      percentageAboveAverage: ((month.revenue - avgRevenue) / avgRevenue) * 100,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Identify low season months from monthly trends
 */
function identifyLowSeasons(monthlyTrends) {
  if (!monthlyTrends || monthlyTrends.length === 0) return [];

  const avgRevenue =
    monthlyTrends.reduce((sum, month) => sum + month.revenue, 0) /
    monthlyTrends.length;

  return monthlyTrends
    .filter((month) => month.revenue < avgRevenue * 0.8) // 20% below average
    .map((month) => ({
      month: month.month,
      revenue: month.revenue,
      orders: month.orders,
      percentageBelowAverage: ((avgRevenue - month.revenue) / avgRevenue) * 100,
    }))
    .sort((a, b) => a.revenue - b.revenue);
}

/**
 * Determine stock status based on current stock and demand metrics
 */
function determineStockStatusFromMetrics(currentStock, dailyDemand) {
  if (currentStock <= 0) {
    return "out_of_stock";
  }

  if (dailyDemand > 0) {
    const daysRemaining = currentStock / dailyDemand;
    if (daysRemaining <= 3) {
      return "critical";
    } else if (daysRemaining <= 7) {
      return "low_stock";
    } else if (daysRemaining <= 14) {
      return "moderate";
    }
  }

  return "in_stock";
}
/**
 * Detect anomalies in analytics data
 */
async function detectAnomalies(userId, timeframe = "30d") {
  const cacheKey = `${cachePrefix}anomaly-detection:${userId}:${timeframe}`;

  try {
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const dateRange = getDateRange(timeframe);

    // Get daily order data for anomaly detection
    const dailyOrders = await Order.findAll({
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      },
      attributes: [
        [Order.sequelize.fn("DATE", Order.sequelize.col("createdAt")), "date"],
        [Order.sequelize.fn("COUNT", Order.sequelize.col("id")), "orderCount"],
        [
          Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")),
          "totalRevenue",
        ],
      ],
      group: [Order.sequelize.fn("DATE", Order.sequelize.col("createdAt"))],
      order: [
        [Order.sequelize.fn("DATE", Order.sequelize.col("createdAt")), "ASC"],
      ],
    });

    const orderData = dailyOrders.map((item) => ({
      date: item.dataValues.date,
      orders: parseInt(item.dataValues.orderCount) || 0,
      revenue: parseFloat(item.dataValues.totalRevenue) || 0,
    }));

    // Simple anomaly detection using standard deviation
    const orderValues = orderData.map((d) => d.orders);
    const revenueValues = orderData.map((d) => d.revenue);

    const orderMean =
      orderValues.reduce((sum, val) => sum + val, 0) / orderValues.length;
    const revenueMean =
      revenueValues.reduce((sum, val) => sum + val, 0) / revenueValues.length;

    const orderStdDev = Math.sqrt(
      orderValues.reduce((sum, val) => sum + Math.pow(val - orderMean, 2), 0) /
        orderValues.length
    );
    const revenueStdDev = Math.sqrt(
      revenueValues.reduce(
        (sum, val) => sum + Math.pow(val - revenueMean, 2),
        0
      ) / revenueValues.length
    );

    const anomalies = [];
    const threshold = 2; // 2 standard deviations

    orderData.forEach((day) => {
      const orderZScore = Math.abs((day.orders - orderMean) / orderStdDev);
      const revenueZScore = Math.abs(
        (day.revenue - revenueMean) / revenueStdDev
      );

      if (orderZScore > threshold) {
        anomalies.push({
          date: day.date,
          type: "orders",
          value: day.orders,
          expected: orderMean,
          deviation: orderZScore,
          severity: orderZScore > 3 ? "high" : "medium",
          description:
            day.orders > orderMean
              ? "Unusually high order volume"
              : "Unusually low order volume",
        });
      }

      if (revenueZScore > threshold) {
        anomalies.push({
          date: day.date,
          type: "revenue",
          value: day.revenue,
          expected: revenueMean,
          deviation: revenueZScore,
          severity: revenueZScore > 3 ? "high" : "medium",
          description:
            day.revenue > revenueMean
              ? "Unusually high revenue"
              : "Unusually low revenue",
        });
      }
    });

    const result = {
      anomalies: anomalies.sort((a, b) => b.deviation - a.deviation),
      summary: {
        totalAnomalies: anomalies.length,
        highSeverity: anomalies.filter((a) => a.severity === "high").length,
        mediumSeverity: anomalies.filter((a) => a.severity === "medium").length,
        orderBaseline: { mean: orderMean, stdDev: orderStdDev },
        revenueBaseline: { mean: revenueMean, stdDev: revenueStdDev },
      },
      insights: [
        `${anomalies.length} anomalies detected in ${timeframe} period`,
        "Monitor patterns that deviate significantly from normal",
        "Set up alerts for real-time anomaly detection",
      ],
      recommendations: [
        "Investigate high-deviation days for insights",
        "Implement automated anomaly alerts",
        "Track external factors that might cause anomalies",
      ],
    };

    await cacheService.set(cacheKey, result, defaultCacheTTL);
    return result;
  } catch (error) {
    logger.error("Error detecting anomalies:", error);
    return {
      anomalies: [],
      summary: {},
      insights: [],
      recommendations: [],
      error: error.message,
    };
  }
}

/**
 * Detect seasonal trends and patterns
 */
async function getSeasonalTrends(userId, dateRange) {
  try {
    const yearlyData = await Order.findAll({
      where: {
        userId,
        createdAt: {
          [Op.between]: [
            new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year back
            new Date(),
          ],
        },
      },
      attributes: [
        [
          Order.sequelize.fn(
            "strftime",
            "%m",
            Order.sequelize.col("createdAt")
          ),
          "month",
        ],
        [Order.sequelize.fn("COUNT", Order.sequelize.col("id")), "orderCount"],
        [
          Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")),
          "revenue",
        ],
      ],
      group: [
        Order.sequelize.fn("strftime", "%m", Order.sequelize.col("createdAt")),
      ],
      order: [
        [
          Order.sequelize.fn(
            "strftime",
            "%m",
            Order.sequelize.col("createdAt")
          ),
          "ASC",
        ],
      ],
    });

    const monthlyTrends = yearlyData.map((item) => ({
      month: parseInt(item.get("month")),
      orders: parseInt(item.get("orderCount")),
      revenue: parseFloat(item.get("revenue") || 0),
    }));

    return {
      monthlyTrends,
      peakMonths: identifyPeakMonths(monthlyTrends),
      lowSeasons: identifyLowSeasons(monthlyTrends),
      seasonalityIndex: calculateSeasonalityIndex(monthlyTrends),
    };
  } catch (error) {
    logger.error("Seasonal trends error:", error);
    return null;
  }
}
/**
 * Detect seasonality patterns in historical data
 */
function detectSeasonality(historicalData) {
  if (!historicalData || historicalData.length < 7) {
    return {
      hasSeasonality: false,
      pattern: "insufficient_data",
      peakDays: [],
      lowDays: [],
    };
  }

  // Group by day of week
  const dayGroups = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  }; // Sunday = 0, Monday = 1, etc.

  historicalData.forEach((item) => {
    const dayOfWeek = new Date(item.date).getDay();
    dayGroups[dayOfWeek].push(item.orders || 0);
  });

  // Calculate average for each day
  const dayAverages = {};
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  Object.keys(dayGroups).forEach((day) => {
    const orders = dayGroups[day];
    dayAverages[day] =
      orders.length > 0
        ? orders.reduce((sum, val) => sum + val, 0) / orders.length
        : 0;
  });

  // Find overall average
  const overallAverage =
    Object.values(dayAverages).reduce((sum, val) => sum + val, 0) / 7;

  // Identify peak and low days (±20% from average)
  const peakDays = [];
  const lowDays = [];

  Object.keys(dayAverages).forEach((day) => {
    const avg = dayAverages[day];
    if (avg > overallAverage * 1.2) {
      peakDays.push(dayNames[day]);
    } else if (avg < overallAverage * 0.8) {
      lowDays.push(dayNames[day]);
    }
  });

  return {
    hasSeasonality: peakDays.length > 0 || lowDays.length > 0,
    pattern: peakDays.length > 0 ? "weekly_peaks" : "stable",
    peakDays,
    lowDays,
    dayAverages: Object.keys(dayAverages).reduce((result, day) => {
      result[dayNames[day]] = Math.round(dayAverages[day]);
      return result;
    }, {}),
  };
}

module.exports = {
  identifyMarketOpportunities,
  identifyPricingOpportunities,
  detectAnomalies,
  detectSeasonality,
};
