const { Op } = require("sequelize");
const { Order, OrderItem, Product } = require("../models");
const cacheService = require("./cache-service");
const logger = require("../utils/logger");

class AnalyticsService {
  constructor() {
    this.cachePrefix = "analytics:";
    this.defaultCacheTTL = 3600; // 1 hour
  }

  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(userId, timeframe = "30d") {
    const cacheKey = `${this.cachePrefix}dashboard:${userId}:${timeframe}`;

    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const dateRange = this.getDateRange(timeframe);
      const analytics = await Promise.all([
        this.getOrderSummary(userId, dateRange),
        this.getRevenueAnalytics(userId, dateRange),
        this.getPlatformComparison(userId, dateRange),
        this.getTopProducts(userId, dateRange),
        this.getOrderTrends(userId, dateRange),
        this.getPerformanceMetrics(userId, dateRange),
      ]);

      const result = {
        summary: analytics[0],
        revenue: analytics[1],
        platforms: analytics[2],
        topProducts: analytics[3],
        trends: analytics[4],
        performance: analytics[5],
        generatedAt: new Date(),
        timeframe,
      };

      await cacheService.set(cacheKey, result, this.defaultCacheTTL);
      return result;
    } catch (error) {
      logger.error("Dashboard analytics error:", error);
      throw error;
    }
  }

  /**
   * Get order summary statistics
   */
  async getOrderSummary(userId, dateRange) {
    const whereClause = {
      userId,
      createdAt: {
        [Op.between]: [dateRange.start, dateRange.end],
      },
    };

    const [totalOrders, totalRevenue, avgOrderValue, ordersByStatus] =
      await Promise.all([
        Order.count({ where: whereClause }),
        Order.sum("totalAmount", { where: whereClause }),
        Order.findOne({
          where: whereClause,
          attributes: [
            [
              Order.sequelize.fn("AVG", Order.sequelize.col("totalAmount")),
              "avg",
            ],
          ],
        }),
        Order.findAll({
          where: whereClause,
          attributes: [
            "status",
            [Order.sequelize.fn("COUNT", Order.sequelize.col("id")), "count"],
          ],
          group: ["status"],
        }),
      ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue || 0,
      avgOrderValue: parseFloat(avgOrderValue?.get("avg") || 0),
      ordersByStatus: ordersByStatus.map((item) => ({
        status: item.status,
        count: parseInt(item.get("count")),
      })),
    };
  }

  /**
   * Get detailed revenue analytics
   */
  async getRevenueAnalytics(userId, dateRange) {
    const whereClause = {
      userId,
      createdAt: {
        [Op.between]: [dateRange.start, dateRange.end],
      },
    };

    // Daily revenue breakdown
    const dailyRevenue = await Order.findAll({
      where: whereClause,
      attributes: [
        [Order.sequelize.fn("DATE", Order.sequelize.col("createdAt")), "date"],
        [
          Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")),
          "revenue",
        ],
        [Order.sequelize.fn("COUNT", Order.sequelize.col("id")), "orders"],
      ],
      group: [Order.sequelize.fn("DATE", Order.sequelize.col("createdAt"))],
      order: [
        [Order.sequelize.fn("DATE", Order.sequelize.col("createdAt")), "ASC"],
      ],
    });

    // Revenue by platform
    const platformRevenue = await Order.findAll({
      where: whereClause,
      attributes: [
        "platform",
        [
          Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")),
          "revenue",
        ],
        [Order.sequelize.fn("COUNT", Order.sequelize.col("id")), "orders"],
      ],
      group: ["platform"],
    });

    // Growth calculation
    const previousPeriod = this.getPreviousPeriod(dateRange);
    const previousRevenue = await Order.sum("totalAmount", {
      where: {
        userId,
        createdAt: {
          [Op.between]: [previousPeriod.start, previousPeriod.end],
        },
      },
    });

    const currentRevenue = await Order.sum("totalAmount", {
      where: whereClause,
    });
    const growthRate = previousRevenue
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    return {
      daily: dailyRevenue.map((item) => ({
        date: item.get("date"),
        revenue: parseFloat(item.get("revenue") || 0),
        orders: parseInt(item.get("orders")),
      })),
      platforms: platformRevenue.map((item) => ({
        platform: item.platform,
        revenue: parseFloat(item.get("revenue") || 0),
        orders: parseInt(item.get("orders")),
      })),
      growth: {
        current: currentRevenue || 0,
        previous: previousRevenue || 0,
        rate: growthRate,
      },
    };
  }

  /**
   * Get platform performance comparison
   */
  async getPlatformComparison(userId, dateRange) {
    const whereClause = {
      userId,
      createdAt: {
        [Op.between]: [dateRange.start, dateRange.end],
      },
    };

    const platformStats = await Order.findAll({
      where: whereClause,
      attributes: [
        "platform",
        [Order.sequelize.fn("COUNT", Order.sequelize.col("id")), "totalOrders"],
        [
          Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")),
          "totalRevenue",
        ],
        [
          Order.sequelize.fn("AVG", Order.sequelize.col("totalAmount")),
          "avgOrderValue",
        ],
        [
          Order.sequelize.fn(
            "SUM",
            Order.sequelize.literal(
              "CASE WHEN status = 'completed' THEN 1 ELSE 0 END"
            )
          ),
          "completedOrders",
        ],
      ],
      group: ["platform"],
    });

    return platformStats.map((stat) => {
      const totalOrders = parseInt(stat.get("totalOrders"));
      const completedOrders = parseInt(stat.get("completedOrders"));

      return {
        platform: stat.platform,
        totalOrders,
        totalRevenue: parseFloat(stat.get("totalRevenue") || 0),
        avgOrderValue: parseFloat(stat.get("avgOrderValue") || 0),
        completionRate: totalOrders ? (completedOrders / totalOrders) * 100 : 0,
        completedOrders,
      };
    });
  }

  /**
   * Get top performing products
   */
  async getTopProducts(userId, dateRange, limit = 10) {
    const topProducts = await OrderItem.findAll({
      include: [
        {
          model: Order,
          where: {
            userId,
            createdAt: {
              [Op.between]: [dateRange.start, dateRange.end],
            },
          },
          attributes: [],
        },
        {
          model: Product,
          attributes: ["name", "sku", "category"],
        },
      ],
      attributes: [
        "productId",
        [
          OrderItem.sequelize.fn("SUM", OrderItem.sequelize.col("quantity")),
          "totalSold",
        ],
        [
          OrderItem.sequelize.fn(
            "SUM",
            OrderItem.sequelize.literal("quantity * price")
          ),
          "totalRevenue",
        ],
      ],
      group: ["productId", "Product.id"],
      order: [[OrderItem.sequelize.literal("totalRevenue"), "DESC"]],
      limit,
    });

    return topProducts.map((item) => ({
      productId: item.productId,
      name: item.Product?.name || "Unknown Product",
      sku: item.Product?.sku,
      category: item.Product?.category,
      totalSold: parseInt(item.get("totalSold")),
      totalRevenue: parseFloat(item.get("totalRevenue")),
    }));
  }

  /**
   * Get order trends and forecasting
   */
  async getOrderTrends(userId, dateRange) {
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
    const movingAverage = this.calculateMovingAverage(trends, 7);
    const forecast = this.generateSimpleForecast(trends, 7);

    return {
      daily: trends,
      movingAverage,
      forecast,
      insights: this.generateInsights(trends),
    };
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(userId, dateRange) {
    const whereClause = {
      userId,
      createdAt: {
        [Op.between]: [dateRange.start, dateRange.end],
      },
    };

    // Order fulfillment times
    const fulfillmentTimes = await Order.findAll({
      where: {
        ...whereClause,
        status: "completed",
        shippedAt: { [Op.not]: null },
      },
      attributes: [
        [
          Order.sequelize.literal(
            "AVG(JULIANDAY(shippedAt) - JULIANDAY(createdAt))"
          ),
          "avgFulfillmentDays",
        ],
      ],
    });

    // Return rate
    const returnRate = await this.calculateReturnRate(userId, dateRange);

    // Customer satisfaction metrics
    const satisfactionMetrics = await this.calculateSatisfactionMetrics(
      userId,
      dateRange
    );

    return {
      avgFulfillmentTime: parseFloat(
        fulfillmentTimes[0]?.get("avgFulfillmentDays") || 0
      ),
      returnRate,
      satisfaction: satisfactionMetrics,
      updatedAt: new Date(),
    };
  }

  /**
   * Generate analytics report
   */
  async generateReport(userId, options = {}) {
    const {
      timeframe = "30d",
      format = "json",
      includeCharts = false,
    } = options;

    try {
      const analytics = await this.getDashboardAnalytics(userId, timeframe);

      if (format === "pdf") {
        return await this.generatePDFReport(analytics, includeCharts);
      }

      if (format === "csv") {
        return await this.generateCSVReport(analytics);
      }

      return analytics;
    } catch (error) {
      logger.error("Report generation error:", error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  getDateRange(timeframe) {
    const end = new Date();
    const start = new Date();

    switch (timeframe) {
      case "7d":
        start.setDate(end.getDate() - 7);
        break;
      case "30d":
        start.setDate(end.getDate() - 30);
        break;
      case "90d":
        start.setDate(end.getDate() - 90);
        break;
      case "1y":
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }

    return { start, end };
  }

  getPreviousPeriod(dateRange) {
    const duration = dateRange.end.getTime() - dateRange.start.getTime();
    return {
      start: new Date(dateRange.start.getTime() - duration),
      end: new Date(dateRange.end.getTime() - duration),
    };
  }

  calculateMovingAverage(data, window) {
    const result = [];
    for (let i = window - 1; i < data.length; i++) {
      const slice = data.slice(i - window + 1, i + 1);
      const avg = slice.reduce((sum, item) => sum + item.orders, 0) / window;
      result.push({
        date: data[i].date,
        orders: avg,
        revenue: slice.reduce((sum, item) => sum + item.revenue, 0) / window,
      });
    }
    return result;
  }

  generateSimpleForecast(data, days) {
    if (data.length < 7) return [];

    // Simple linear regression for forecasting
    const recent = data.slice(-14); // Last 14 days
    const avgGrowth =
      recent.length > 1
        ? (recent[recent.length - 1].orders - recent[0].orders) / recent.length
        : 0;

    const forecast = [];
    const lastDate = new Date(data[data.length - 1].date);
    const lastOrders = data[data.length - 1].orders;

    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(lastDate.getDate() + i);

      forecast.push({
        date: forecastDate.toISOString().split("T")[0],
        orders: Math.max(0, Math.round(lastOrders + avgGrowth * i)),
        confidence: Math.max(0.3, 1 - i * 0.1), // Decreasing confidence
      });
    }

    return forecast;
  }

  generateInsights(trends) {
    if (trends.length < 7) return [];

    const insights = [];
    const recent = trends.slice(-7);
    const avgRecent =
      recent.reduce((sum, t) => sum + t.orders, 0) / recent.length;
    const previous = trends.slice(-14, -7);
    const avgPrevious =
      previous.reduce((sum, t) => sum + t.orders, 0) / previous.length;

    if (avgRecent > avgPrevious * 1.1) {
      insights.push({
        type: "positive",
        message:
          "Order volume increased by " +
          Math.round(((avgRecent - avgPrevious) / avgPrevious) * 100) +
          "% this week",
        impact: "high",
      });
    } else if (avgRecent < avgPrevious * 0.9) {
      insights.push({
        type: "warning",
        message:
          "Order volume decreased by " +
          Math.round(((avgPrevious - avgRecent) / avgPrevious) * 100) +
          "% this week",
        impact: "medium",
      });
    }

    // Peak day analysis
    const peakDay = recent.reduce(
      (max, day) => (day.orders > max.orders ? day : max),
      recent[0]
    );
    insights.push({
      type: "info",
      message: `Peak order day was ${peakDay.date} with ${peakDay.orders} orders`,
      impact: "low",
    });

    return insights;
  }

  async calculateReturnRate(userId, dateRange) {
    const totalOrders = await Order.count({
      where: {
        userId,
        createdAt: {
          [Op.between]: [dateRange.start, dateRange.end],
        },
      },
    });

    const returnedOrders = await Order.count({
      where: {
        userId,
        status: "returned",
        createdAt: {
          [Op.between]: [dateRange.start, dateRange.end],
        },
      },
    });

    return totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;
  }

  async calculateSatisfactionMetrics(userId, dateRange) {
    // This would integrate with a rating/review system
    // For now, return mock data based on order completion rates
    const completedOrders = await Order.count({
      where: {
        userId,
        status: "completed",
        createdAt: {
          [Op.between]: [dateRange.start, dateRange.end],
        },
      },
    });

    const totalOrders = await Order.count({
      where: {
        userId,
        createdAt: {
          [Op.between]: [dateRange.start, dateRange.end],
        },
      },
    });

    const completionRate =
      totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    return {
      score: Math.min(5, (completionRate / 100) * 5), // Convert to 5-point scale
      completionRate,
      totalReviews: Math.floor(completedOrders * 0.3), // Estimated review rate
      avgRating: 4.2 + (completionRate / 100) * 0.8, // Mock rating based on completion
    };
  }

  async generatePDFReport(analytics, includeCharts = false) {
    // This would integrate with a PDF generation library like puppeteer or pdfkit
    throw new Error("PDF generation not implemented yet");
  }

  async generateCSVReport(analytics) {
    // Convert analytics data to CSV format
    const csv = [];
    csv.push(["Metric", "Value", "Date"]);

    // Add summary data
    csv.push([
      "Total Orders",
      analytics.summary.totalOrders,
      analytics.generatedAt,
    ]);
    csv.push([
      "Total Revenue",
      analytics.summary.totalRevenue,
      analytics.generatedAt,
    ]);
    csv.push([
      "Average Order Value",
      analytics.summary.avgOrderValue,
      analytics.generatedAt,
    ]);

    // Add daily trends
    analytics.trends.daily.forEach((day) => {
      csv.push(["Daily Orders", day.orders, day.date]);
      csv.push(["Daily Revenue", day.revenue, day.date]);
    });

    return csv.map((row) => row.join(",")).join("\n");
  }

  /**
   * Get real-time analytics
   */
  async getRealTimeAnalytics(userId) {
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const [todayOrders, todayRevenue, activeOrders] = await Promise.all([
      Order.count({
        where: {
          userId,
          createdAt: { [Op.gte]: todayStart },
        },
      }),
      Order.sum("totalAmount", {
        where: {
          userId,
          createdAt: { [Op.gte]: todayStart },
        },
      }),
      Order.count({
        where: {
          userId,
          status: { [Op.in]: ["pending", "processing", "shipped"] },
        },
      }),
    ]);

    return {
      today: {
        orders: todayOrders,
        revenue: todayRevenue || 0,
      },
      activeOrders,
      timestamp: new Date(),
    };
  }
}

module.exports = new AnalyticsService();
