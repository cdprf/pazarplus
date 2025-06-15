const { Op } = require("sequelize");
const { Order, OrderItem, Product } = require("../../models");
const logger = require("../../utils/logger");
const { detectSeasonality } = require("./detection-utils");

// Helper methods for product analytics

/**
 * Calculate product summary statistics
 */
function calculateProductSummary(productSales) {
  if (!productSales.length) {
    return {
      totalProducts: 0,
      totalRevenue: 0,
      totalSold: 0,
      totalOrders: 0,
      averagePrice: 0,
      topCategory: null,
    };
  }

  const totalRevenue = productSales.reduce(
    (sum, item) => sum + parseFloat(item.get("totalRevenue")),
    0
  );
  const totalSold = productSales.reduce(
    (sum, item) => sum + parseInt(item.get("totalSold")),
    0
  );
  const totalOrders = productSales.reduce(
    (sum, item) => sum + parseInt(item.get("totalOrders")),
    0
  );

  // Find top category
  const categoryStats = {};
  productSales.forEach((item) => {
    const category = item.product?.category || "Uncategorized";
    if (!categoryStats[category]) {
      categoryStats[category] = { revenue: 0, count: 0 };
    }
    categoryStats[category].revenue += parseFloat(item.get("totalRevenue"));
    categoryStats[category].count += 1;
  });

  const topCategory = Object.entries(categoryStats).sort(
    ([, a], [, b]) => b.revenue - a.revenue
  )[0]?.[0];

  return {
    totalProducts: productSales.length,
    totalRevenue,
    totalSold,
    totalOrders,
    averagePrice: totalRevenue / totalSold || 0,
    topCategory,
  };
}

/**
 * Calculate sales velocity (units per day)
 */
function calculateSalesVelocity(totalSold, dateRange) {
  const days = Math.ceil(
    (dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24)
  );
  return totalSold / days;
}

/**
 * Calculate profit margins for orders
 */
async function calculateProfitMargins(orders) {
  if (!orders || orders.length === 0) {
    return { gross: 0, net: 0, operating: 0 };
  }

  try {
    const totalRevenue = orders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount || 0),
      0
    );

    // Estimate costs (in a real scenario, you'd have actual cost data)
    const estimatedCosts = {
      cogs: totalRevenue * 0.6, // 60% Cost of Goods Sold
      shipping: totalRevenue * 0.05, // 5% shipping costs
      platform: totalRevenue * 0.08, // 8% platform fees
      marketing: totalRevenue * 0.03, // 3% marketing costs
      operational: totalRevenue * 0.04, // 4% operational costs
    };

    const totalCOGS = estimatedCosts.cogs;
    const totalOperatingExpenses =
      estimatedCosts.shipping +
      estimatedCosts.platform +
      estimatedCosts.marketing +
      estimatedCosts.operational;

    const grossProfit = totalRevenue - totalCOGS;
    const operatingProfit = grossProfit - totalOperatingExpenses;
    const netProfit = operatingProfit; // Assuming no taxes/interest for simplicity

    return {
      gross: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      operating: totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0,
      net: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      breakdown: {
        revenue: totalRevenue,
        grossProfit,
        operatingProfit,
        netProfit,
        costs: estimatedCosts,
      },
    };
  } catch (error) {
    logger.error("Error calculating profit margins:", error);
    return { gross: 0, net: 0, operating: 0 };
  }
}

/**
 * Calculate overall confidence score for predictions
 */
function calculateOverallConfidence(salesForecast, trends, patterns) {
  try {
    let confidence = 50; // Base confidence

    // Adjust based on data quality
    if (
      salesForecast &&
      salesForecast.nextMonth &&
      salesForecast.nextMonth.length > 20
    ) {
      confidence += 20; // Good historical data
    } else if (
      salesForecast &&
      salesForecast.nextMonth &&
      salesForecast.nextMonth.length > 10
    ) {
      confidence += 10; // Moderate historical data
    }

    // Adjust based on trend consistency
    if (trends && trends.length > 0) {
      const consistentTrends = trends.filter(
        (t) => Math.abs(t.change || 0) < 0.3
      ).length;
      const trendConsistency = consistentTrends / trends.length;
      confidence += Math.floor(trendConsistency * 20);
    }

    // Adjust based on seasonal patterns
    if (patterns && patterns.seasonalityIndex) {
      if (patterns.seasonalityIndex > 20 && patterns.seasonalityIndex < 40) {
        confidence += 10; // Good seasonality predictability
      } else if (patterns.seasonalityIndex > 40) {
        confidence -= 5; // High volatility reduces confidence
      }
    }

    // Ensure confidence is within bounds
    return Math.max(30, Math.min(95, confidence));
  } catch (error) {
    logger.error("Error calculating overall confidence:", error);
    return 50; // Default confidence
  }
}

/**
 * Calculate growth rates for various metrics
 */
async function calculateGrowthRates(userId, dateRange) {
  try {
    // Calculate current period metrics
    const currentPeriodOrders = await Order.findAll({
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
        orderStatus: { [Op.notIn]: ["cancelled", "returned"] },
      },
    });

    // Calculate previous period (same duration)
    const periodDuration = dateRange.end - dateRange.start;
    const previousStart = new Date(dateRange.start.getTime() - periodDuration);
    const previousEnd = dateRange.start;

    const previousPeriodOrders = await Order.findAll({
      where: {
        userId,
        createdAt: { [Op.between]: [previousStart, previousEnd] },
        orderStatus: { [Op.notIn]: ["cancelled", "returned"] },
      },
    });

    // Calculate metrics
    const currentRevenue = currentPeriodOrders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount),
      0
    );
    const previousRevenue = previousPeriodOrders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount),
      0
    );

    const currentOrderCount = currentPeriodOrders.length;
    const previousOrderCount = previousPeriodOrders.length;

    // Calculate unique customers
    const currentCustomers = new Set(
      currentPeriodOrders.map((order) => order.userId)
    ).size;
    const previousCustomers = new Set(
      previousPeriodOrders.map((order) => order.userId)
    ).size;

    // Calculate growth rates
    const revenueGrowth =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : currentRevenue > 0
        ? 100
        : 0;

    const orderGrowth =
      previousOrderCount > 0
        ? ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100
        : currentOrderCount > 0
        ? 100
        : 0;

    const customerGrowth =
      previousCustomers > 0
        ? ((currentCustomers - previousCustomers) / previousCustomers) * 100
        : currentCustomers > 0
        ? 100
        : 0;

    return {
      revenue: revenueGrowth,
      orders: orderGrowth,
      customers: customerGrowth,
      period: {
        current: {
          start: dateRange.start,
          end: dateRange.end,
          revenue: currentRevenue,
          orders: currentOrderCount,
          customers: currentCustomers,
        },
        previous: {
          start: previousStart,
          end: previousEnd,
          revenue: previousRevenue,
          orders: previousOrderCount,
          customers: previousCustomers,
        },
      },
    };
  } catch (error) {
    logger.error("Error calculating growth rates:", error);
    return {
      revenue: 0,
      orders: 0,
      customers: 0,
      period: null,
    };
  }
}

/**
 * Calculate price elasticity for products
 */
function calculatePriceElasticity(pricingData) {
  try {
    const elasticityAnalysis = {};

    pricingData.forEach((item) => {
      const productId = item.productId;
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.totalSold) || 0;

      if (!elasticityAnalysis[productId]) {
        elasticityAnalysis[productId] = {
          productId,
          productName: item.product?.name || "Unknown Product",
          pricePoints: [],
          avgElasticity: 0,
        };
      }

      elasticityAnalysis[productId].pricePoints.push({
        price,
        quantity,
        revenue: price * quantity,
      });
    });

    // Calculate elasticity for each product
    Object.values(elasticityAnalysis).forEach((product) => {
      if (product.pricePoints.length >= 2) {
        // Simple elasticity calculation using average method
        const sortedPoints = product.pricePoints.sort(
          (a, b) => a.price - b.price
        );
        const priceChange =
          sortedPoints[sortedPoints.length - 1].price - sortedPoints[0].price;
        const quantityChange =
          sortedPoints[sortedPoints.length - 1].quantity -
          sortedPoints[0].quantity;

        if (
          priceChange !== 0 &&
          sortedPoints[0].price !== 0 &&
          sortedPoints[0].quantity !== 0
        ) {
          product.avgElasticity =
            quantityChange /
            sortedPoints[0].quantity /
            (priceChange / sortedPoints[0].price);
        }
      }
    });

    return Object.values(elasticityAnalysis);
  } catch (error) {
    logger.error("Error calculating price elasticity:", error);
    return [];
  }
}

/**
 * Calculate cash flow metrics
 */
async function calculateCashFlow(userId, dateRange) {
  try {
    const orders = await Order.findAll({
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      },
      include: [{ model: OrderItem, as: "items" }],
    });

    let inflow = 0;
    let outflow = 0;
    let pendingRevenue = 0;

    orders.forEach((order) => {
      const amount = parseFloat(order.totalAmount) || 0;

      switch (order.orderStatus) {
        case "completed":
        case "delivered":
          inflow += amount;
          break;
        case "cancelled":
        case "returned":
        case "refunded":
          outflow += amount;
          break;
        case "pending":
        case "processing":
        case "shipped":
          pendingRevenue += amount;
          break;
        default:
          // Include other statuses as potential inflow
          inflow += amount;
      }
    });

    const netCashFlow = inflow - outflow;

    return {
      inflow,
      outflow,
      net: netCashFlow,
      pendingRevenue,
      cashFlowRatio: inflow > 0 ? (netCashFlow / inflow) * 100 : 0,
      period: {
        start: dateRange.start,
        end: dateRange.end,
      },
      breakdown: {
        completedOrders: orders.filter((o) =>
          ["completed", "delivered"].includes(o.orderStatus)
        ).length,
        cancelledOrders: orders.filter((o) =>
          ["cancelled", "returned", "refunded"].includes(o.orderStatus)
        ).length,
        pendingOrders: orders.filter((o) =>
          ["pending", "processing", "shipped"].includes(o.orderStatus)
        ).length,
      },
    };
  } catch (error) {
    logger.error("Error calculating cash flow:", error);
    return {
      inflow: 0,
      outflow: 0,
      net: 0,
      pendingRevenue: 0,
      cashFlowRatio: 0,
      period: { start: dateRange.start, end: dateRange.end },
      breakdown: { completedOrders: 0, cancelledOrders: 0, pendingOrders: 0 },
    };
  }
}

/**
 * Calculate Customer Acquisition Cost
 */
async function calculateCAC(userId, dateRange) {
  try {
    // Simple estimate: marketing spend / new customers
    const marketingCost = 1000; // Placeholder - should come from actual marketing data
    const newCustomers = await Order.count({
      distinct: true,
      col: "customerEmail",
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      },
    });

    return newCustomers > 0 ? marketingCost / newCustomers : 0;
  } catch (error) {
    logger.error("Error calculating CAC:", error);
    return 0;
  }
}

/**
 * Calculate churn rate
 */
async function calculateChurnRate(userId, dateRange) {
  try {
    const totalCustomers = await Order.count({
      distinct: true,
      col: "customerEmail",
      where: {
        userId,
        createdAt: { [Op.lte]: dateRange.end },
      },
    });

    const activeCustomers = await Order.count({
      distinct: true,
      col: "customerEmail",
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      },
    });

    return totalCustomers > 0
      ? ((totalCustomers - activeCustomers) / totalCustomers) * 100
      : 0;
  } catch (error) {
    logger.error("Error calculating churn rate:", error);
    return 0;
  }
}

/**
 * Calculate customer lifetime value
 */
async function calculateCustomerLTV(userId, dateRange) {
  try {
    const avgOrderValue = await Order.findOne({
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      },
      attributes: [
        [
          Order.sequelize.fn("AVG", Order.sequelize.col("totalAmount")),
          "avgValue",
        ],
      ],
    });

    const avgValue = parseFloat(avgOrderValue?.get("avgValue")) || 0;
    const estimatedLifetimeMonths = 12; // 1 year average
    const avgOrdersPerMonth = 2; // Estimated

    return avgValue * avgOrdersPerMonth * estimatedLifetimeMonths;
  } catch (error) {
    logger.error("Error calculating customer LTV:", error);
    return 0;
  }
}

/**
 * Calculate customer retention rate
 */
async function calculateCustomerRetention(userId, dateRange) {
  try {
    const previousPeriod = getPreviousPeriod(dateRange);

    const previousCustomers = await Order.findAll({
      where: {
        userId,
        createdAt: {
          [Op.between]: [previousPeriod.start, previousPeriod.end],
        },
      },
      attributes: ["customerEmail"],
      group: ["customerEmail"],
    });

    const currentCustomers = await Order.findAll({
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      },
      attributes: ["customerEmail"],
      group: ["customerEmail"],
    });

    const previousEmails = new Set(
      previousCustomers.map((c) => c.customerEmail)
    );
    const currentEmails = new Set(currentCustomers.map((c) => c.customerEmail));

    const retainedCustomers = [...currentEmails].filter((email) =>
      previousEmails.has(email)
    );

    return previousEmails.size > 0
      ? (retainedCustomers.length / previousEmails.size) * 100
      : 0;
  } catch (error) {
    logger.error("Error calculating customer retention:", error);
    return 0;
  }
}

/**
 * Calculate days until out of stock
 */
function calculateDaysUntilOutOfStock(currentStock, dailySales) {
  if (!dailySales || dailySales <= 0) return 999; // Infinite if no sales
  return Math.floor(currentStock / dailySales);
}

/**
 * Calculate inventory turnover
 */
function calculateInventoryTurnover(soldQuantity, avgInventory) {
  return avgInventory > 0 ? soldQuantity / avgInventory : 0;
}

/**
 * Calculate tax liability
 */
async function calculateTaxLiability(userId, dateRange) {
  try {
    const totalRevenue = await Order.sum("totalAmount", {
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
        orderStatus: { [Op.notIn]: ["cancelled", "returned"] },
      },
    });

    // Simplified tax calculation (should use actual tax rates)
    const taxRate = 0.18; // 18% VAT in Turkey
    return (totalRevenue || 0) * taxRate;
  } catch (error) {
    logger.error("Error calculating tax liability:", error);
    return 0;
  }
}

/**
 * Calculate platform revenue breakdown
 */
function calculatePlatformRevenue(orders) {
  const platformBreakdown = {};

  orders.forEach((order) => {
    const platform = order.platform || "unknown";
    const revenue = parseFloat(order.totalAmount) || 0;

    if (!platformBreakdown[platform]) {
      platformBreakdown[platform] = {
        platform,
        revenue: 0,
        orderCount: 0,
        avgOrderValue: 0,
      };
    }

    platformBreakdown[platform].revenue += revenue;
    platformBreakdown[platform].orderCount += 1;
  });

  // Calculate average order values
  Object.values(platformBreakdown).forEach((breakdown) => {
    breakdown.avgOrderValue =
      breakdown.orderCount > 0 ? breakdown.revenue / breakdown.orderCount : 0;
  });

  return Object.values(platformBreakdown);
}

/**
 * Calculate growth trend from data points
 */
function calculateGrowthTrend(dataPoints) {
  if (!dataPoints || dataPoints.length < 2) return 0;

  const recent = dataPoints.slice(-5); // Last 5 data points
  const older = dataPoints.slice(-10, -5); // Previous 5 data points

  if (recent.length === 0 || older.length === 0) return 0;

  const recentAvg =
    recent.reduce((sum, point) => {
      return sum + (parseFloat(point.revenue) || parseFloat(point.value) || 0);
    }, 0) / recent.length;

  const olderAvg =
    older.reduce((sum, point) => {
      return sum + (parseFloat(point.revenue) || parseFloat(point.value) || 0);
    }, 0) / older.length;

  if (olderAvg === 0) return 0;

  return (recentAvg - olderAvg) / olderAvg;
}

/**
 * Calculate seasonality index
 */
function calculateSeasonalityIndex(monthlyTrends) {
  if (!monthlyTrends || monthlyTrends.length === 0) return 0;

  const revenues = monthlyTrends.map((m) => m.revenue);
  const avgRevenue =
    revenues.reduce((sum, rev) => sum + rev, 0) / revenues.length;

  // Calculate coefficient of variation
  const variance =
    revenues.reduce((sum, rev) => sum + Math.pow(rev - avgRevenue, 2), 0) /
    revenues.length;
  const stdDev = Math.sqrt(variance);

  return avgRevenue > 0 ? (stdDev / avgRevenue) * 100 : 0;
}

/**
 * Calculate return rate based on order statuses
 */
async function calculateReturnRate(userId, dateRange) {
  try {
    const whereClause = {
      userId,
      createdAt: {
        [Op.between]: [dateRange.start, dateRange.end],
      },
    };

    const [totalOrders, returnedOrders] = await Promise.all([
      Order.count({ where: whereClause }),
      Order.count({
        where: {
          ...whereClause,
          orderStatus: { [Op.in]: ["returned", "refunded"] },
        },
      }),
    ]);

    return totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;
  } catch (error) {
    logger.error("Error calculating return rate:", error);
    return 0;
  }
}

/**
 * Calculate customer satisfaction metrics
 */
async function calculateSatisfactionMetrics(userId, dateRange) {
  try {
    const whereClause = {
      userId,
      createdAt: {
        [Op.between]: [dateRange.start, dateRange.end],
      },
    };

    // Since we don't have a ratings table, we'll use order completion rate as a proxy
    const [totalOrders, completedOrders, cancelledOrders] = await Promise.all([
      Order.count({ where: whereClause }),
      Order.count({
        where: {
          ...whereClause,
          orderStatus: "completed",
        },
      }),
      Order.count({
        where: {
          ...whereClause,
          orderStatus: { [Op.in]: ["cancelled", "returned"] },
        },
      }),
    ]);

    const completionRate =
      totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    const cancellationRate =
      totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

    // Calculate satisfaction score (completion rate - cancellation rate, normalized)
    const satisfactionScore = Math.max(
      0,
      Math.min(100, completionRate - cancellationRate * 2)
    );

    return {
      score: satisfactionScore,
      completionRate,
      cancellationRate,
      totalOrders,
      completedOrders,
      cancelledOrders,
    };
  } catch (error) {
    logger.error("Error calculating satisfaction metrics:", error);
    return {
      score: 0,
      completionRate: 0,
      cancellationRate: 0,
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
    };
  }
}

// Helper function to get previous period
function getPreviousPeriod(dateRange) {
  const duration = dateRange.end - dateRange.start;
  const previousEnd = new Date(dateRange.start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  return { start: previousStart, end: previousEnd };
}

// Helper function to calculate days until out of stock
async function calculateDaysUntilOutOfStock(
  productId,
  currentStock,
  avgDailySales
) {
  try {
    if (!avgDailySales || avgDailySales <= 0) return null;
    return Math.ceil(currentStock / avgDailySales);
  } catch (error) {
    logger.error("Error calculating days until out of stock:", error);
    return null;
  }
}

/**
 * Calculate growth rate between two values
 */
function calculateGrowthRate(current, previous) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Calculate conversion rate for products
 */
function calculateConversionRate(data) {
  // Simplified conversion rate calculation
  // In real implementation, this would include view/impression data
  if (data.totalOrders === 0) return 0;
  return (data.totalSold / data.totalOrders) * 100;
}

/**
 * Calculate inventory turnover ratio
 */
async function calculateInventoryTurnover(userId, productId, dateRange) {
  try {
    if (!productId) return null;

    const product = await Product.findOne({
      where: { id: productId, userId },
      attributes: ["stockQuantity", "costPrice"],
    });

    if (!product) return null;

    const soldData = await getProductPeriodData(userId, productId, dateRange);
    const averageInventory = product.stockQuantity + soldData.totalSold / 2;

    return averageInventory > 0 ? soldData.totalSold / averageInventory : 0;
  } catch (error) {
    logger.error("Inventory turnover calculation error:", error);
    return null;
  }
}

/**
 * Calculate product profit margin
 */
async function calculateProductProfitMargin(userId, productId, dateRange) {
  try {
    if (!productId) return null;

    const product = await Product.findOne({
      where: { id: productId, userId },
      attributes: ["costPrice"],
    });

    if (!product) return null;

    const periodData = await getProductPeriodData(userId, productId, dateRange);
    const costOfGoodsSold = product.costPrice * periodData.totalSold;
    const grossProfit = periodData.totalRevenue - costOfGoodsSold;

    return periodData.totalRevenue > 0
      ? (grossProfit / periodData.totalRevenue) * 100
      : 0;
  } catch (error) {
    logger.error("Profit margin calculation error:", error);
    return null;
  }
}

async function calculateDemandForecast(productId, userId) {
  try {
    // Get historical sales data for the product
    const historicalData = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: "order",
          where: {
            userId,
            orderStatus: { [Op.notIn]: ["cancelled", "returned"] },
          },
          attributes: [],
        },
      ],
      where: { productId },
      attributes: [
        [
          OrderItem.sequelize.fn(
            "DATE",
            OrderItem.sequelize.col("order.createdAt")
          ),
          "date",
        ],
        [
          OrderItem.sequelize.fn("SUM", OrderItem.sequelize.col("quantity")),
          "totalSold",
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
    const daily = await calculateMovingAverageForecast(historicalData, 30);
    const weekly = await calculateMovingAverageForecast(historicalData, 7);

    // Ensure daily is an array before using slice
    const dailyArray = Array.isArray(daily) ? daily : [];
    const weeklyArray = Array.isArray(weekly) ? weekly : [];

    return {
      nextMonth: dailyArray.slice(0, 30),
      daily: dailyArray.length > 0 ? dailyArray[dailyArray.length - 1] : 0,
      weekly: weeklyArray.length > 0 ? weeklyArray[weeklyArray.length - 1] : 0,
      trend: await calculateTrend(historicalData),
      confidence: await calculateForecastConfidence(historicalData),
      seasonality: await detectSeasonality(historicalData),
    };
  } catch (error) {
    logger.error("Demand forecast error:", error);
    return null;
  }
}

/**
 * Calculate moving average for trend analysis
 */
function calculateMovingAverage(data, period = 7) {
  if (!data || data.length < period) {
    return [];
  }

  const movingAverages = [];

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, item) => {
      return acc + (item.orders || 0);
    }, 0);
    const average = sum / period;

    movingAverages.push({
      date: data[i].date,
      value: average,
      orders: data[i].orders,
      revenue: data[i].revenue,
    });
  }

  return movingAverages;
}

/**
 * Calculate trend from data points
 */
function calculateTrend(data) {
  if (!data || data.length < 2) {
    return 0;
  }

  // Simple linear trend calculation
  const n = data.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;

  data.forEach((point, index) => {
    const x = index;
    const y = point.orders || 0;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  return slope;
}

/**
 * Calculate moving average forecast
 */
function calculateMovingAverageForecast(historicalData, forecastDays = 30) {
  if (!historicalData || historicalData.length === 0) {
    return [];
  }

  // Calculate moving average for the last 7 days as baseline
  const period = Math.min(7, historicalData.length);
  const recent = historicalData.slice(-period);

  const averageOrders =
    recent.reduce((sum, item) => sum + (item.orders || 0), 0) / period;
  const averageRevenue =
    recent.reduce((sum, item) => sum + (item.revenue || 0), 0) / period;

  // Generate forecast for the specified number of days
  const forecast = [];
  const baseDate = new Date();

  for (let i = 1; i <= forecastDays; i++) {
    const forecastDate = new Date(baseDate);
    forecastDate.setDate(baseDate.getDate() + i);

    // Add some randomness and trend to make forecast realistic
    const trendFactor = calculateTrend(historicalData);
    const randomFactor = 0.9 + Math.random() * 0.2; // ±10% randomness

    forecast.push({
      date: forecastDate.toISOString().split("T")[0],
      orders: Math.max(
        0,
        Math.round(averageOrders * (1 + trendFactor * i) * randomFactor)
      ),
      revenue: Math.max(
        0,
        averageRevenue * (1 + trendFactor * i) * randomFactor
      ),
    });
  }

  return forecast;
}

/**
 * Calculate forecast confidence based on historical data variance
 */
function calculateForecastConfidence(historicalData) {
  if (!historicalData || historicalData.length < 2) {
    return 0.5; // Default confidence
  }

  // Calculate coefficient of variation for orders
  const orders = historicalData.map((item) => item.orders || 0);
  const mean = orders.reduce((sum, val) => sum + val, 0) / orders.length;

  if (mean === 0) return 0.3;

  const variance =
    orders.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    orders.length;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = standardDeviation / mean;

  // Convert coefficient of variation to confidence (lower variation = higher confidence)
  const confidence = Math.max(0.1, Math.min(0.95, 1 - coefficientOfVariation));

  return parseFloat(confidence.toFixed(2));
}

// Helper function for pricing analysis
async function getPricingAnalysis(userId, dateRange) {
  try {
    // Simple pricing analysis implementation
    const orders = await Order.findAll({
      where: {
        userId,
        createdAt: {
          [Op.between]: [dateRange.start, dateRange.end],
        },
      },
      include: [{ model: OrderItem, as: "items", include: [{ model: Product, as: "product" }] }],
    });

    let totalRevenue = 0;
    let totalItems = 0;
    const platformPrices = {};

    orders.forEach((order) => {
      order.OrderItems?.forEach((item) => {
        totalRevenue +=
          parseFloat(item.price || 0) * parseInt(item.quantity || 0);
        totalItems += parseInt(item.quantity || 0);

        const platform = order.platform || "unknown";
        if (!platformPrices[platform]) {
          platformPrices[platform] = { total: 0, count: 0 };
        }
        platformPrices[platform].total += parseFloat(item.price || 0);
        platformPrices[platform].count += 1;
      });
    });

    return {
      averagePrice: totalItems > 0 ? totalRevenue / totalItems : 0,
      platformPrices,
      totalRevenue,
      priceRange: {
        min: 0,
        max: 1000,
        average: totalItems > 0 ? totalRevenue / totalItems : 0,
      },
    };
  } catch (error) {
    logger.error("Error in pricing analysis:", error);
    return {
      averagePrice: 0,
      platformPrices: {},
      totalRevenue: 0,
      priceRange: { min: 0, max: 0, average: 0 },
    };
  }
}

module.exports = {
  calculateProfitMargins,
  calculateOverallConfidence,
  calculateGrowthRates,
  calculatePriceElasticity,
  calculateCashFlow,
  calculateCAC,
  calculateChurnRate,
  calculateCustomerLTV,
  calculateCustomerRetention,
  calculateDaysUntilOutOfStock,
  calculateInventoryTurnover,
  calculateTaxLiability,
  calculateProductProfitMargin,
  calculateDemandForecast,
  calculateGrowthTrend,
  calculateSeasonalityIndex,
  calculateReturnRate,
  calculateSatisfactionMetrics,
  calculateDaysUntilOutOfStock,
  calculateInventoryTurnover,
  calculateProductSummary,
  calculateSalesVelocity,
  calculateConversionRate,
  calculateMovingAverage,
  calculateTrend,
  calculateMovingAverageForecast,
  calculateForecastConfidence,
  calculateElasticity: calculatePriceElasticity, // Alias for backward compatibility
  calculateDaysUntilOutOfStock,
  calculateGrowthRate,
  calculateInventoryTurnover,
  calculatePlatformRevenue,
  getPricingAnalysis,
};
