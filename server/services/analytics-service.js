const { Op } = require("sequelize");
const { Order, OrderItem, Product } = require("../models");
const cacheService = require("./cache-service");
const logger = require("../utils/logger");

class AnalyticsService {
  constructor() {
    this.cachePrefix = "analytics:";
    this.defaultCacheTTL = 3600; // 1 hour
    this.predictiveCacheTTL = 86400; // 24 hours for predictive analytics
  }

  /**
   * Get comprehensive dashboard analytics with advanced insights
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
        this.getPredictiveInsights(userId, dateRange),
        this.getMarketIntelligence(userId, dateRange),
        this.getFinancialKPIs(userId, dateRange),
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
   * Get predictive analytics and forecasting
   */
  async getPredictiveInsights(userId, dateRange) {
    try {
      const [salesForecast, inventoryPredictions, seasonalTrends] =
        await Promise.all([
          this.getSalesForecast(userId, dateRange),
          this.getInventoryPredictions(userId, dateRange),
          this.getSeasonalTrends(userId, dateRange),
        ]);

      return {
        salesForecast,
        inventoryPredictions,
        seasonalTrends,
        recommendations: this.generateRecommendations(
          salesForecast,
          inventoryPredictions
        ),
      };
    } catch (error) {
      logger.error("Predictive insights error:", error);
      return null;
    }
  }

  /**
   * Generate sales forecast using moving averages and trend analysis
   */
  async getSalesForecast(userId, dateRange) {
    try {
      // Get historical sales data
      const historicalData = await Order.findAll({
        where: {
          userId,
          createdAt: {
            [Op.between]: [
              new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days back
              dateRange.end,
            ],
          },
          status: { [Op.notIn]: ["cancelled", "returned"] },
        },
        attributes: [
          [
            Order.sequelize.fn("DATE", Order.sequelize.col("createdAt")),
            "date",
          ],
          [
            Order.sequelize.fn("COUNT", Order.sequelize.col("id")),
            "orderCount",
          ],
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

      // Apply moving average and trend analysis
      const forecast = this.calculateMovingAverageForecast(historicalData, 30); // 30-day forecast

      return {
        nextMonth: forecast.slice(0, 30),
        trend: this.calculateTrend(historicalData),
        confidence: this.calculateForecastConfidence(historicalData),
        seasonality: this.detectSeasonality(historicalData),
      };
    } catch (error) {
      logger.error("Sales forecast error:", error);
      return null;
    }
  }

  /**
   * Get inventory predictions and stock optimization insights
   */
  async getInventoryPredictions(userId, dateRange) {
    try {
      const topProducts = await this.getTopProducts(userId, dateRange, 50);
      const predictions = [];

      for (const product of topProducts) {
        const demandForecast = await this.calculateDemandForecast(
          product.productId,
          userId
        );
        const stockStatus = await this.getStockStatus(product.productId);

        predictions.push({
          productId: product.productId,
          name: product.name,
          currentStock: stockStatus.current,
          predictedDemand: demandForecast.nextMonth,
          daysUntilStockout: this.calculateStockoutDays(
            stockStatus.current,
            demandForecast.daily
          ),
          reorderPoint: demandForecast.daily * 7, // 7-day safety stock
          status: this.getStockStatus(
            stockStatus.current,
            demandForecast.daily
          ),
        });
      }

      return {
        products: predictions,
        lowStockItems: predictions.filter((p) => p.daysUntilStockout < 14),
        overstockItems: predictions.filter((p) => p.daysUntilStockout > 90),
        reorderSuggestions: predictions.filter(
          (p) => p.currentStock <= p.reorderPoint
        ),
      };
    } catch (error) {
      logger.error("Inventory predictions error:", error);
      return null;
    }
  }

  /**
   * Detect seasonal trends and patterns
   */
  async getSeasonalTrends(userId, dateRange) {
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
            Order.sequelize.fn("MONTH", Order.sequelize.col("createdAt")),
            "month",
          ],
          [
            Order.sequelize.fn("COUNT", Order.sequelize.col("id")),
            "orderCount",
          ],
          [
            Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")),
            "revenue",
          ],
        ],
        group: [Order.sequelize.fn("MONTH", Order.sequelize.col("createdAt"))],
        order: [
          [
            Order.sequelize.fn("MONTH", Order.sequelize.col("createdAt")),
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
        peakMonths: this.identifyPeakMonths(monthlyTrends),
        lowSeasons: this.identifyLowSeasons(monthlyTrends),
        seasonalityIndex: this.calculateSeasonalityIndex(monthlyTrends),
      };
    } catch (error) {
      logger.error("Seasonal trends error:", error);
      return null;
    }
  }

  /**
   * Get market intelligence and competitive analysis
   */
  async getMarketIntelligence(userId, dateRange) {
    try {
      const [categoryPerformance, pricingAnalysis, competitorInsights] =
        await Promise.all([
          this.getCategoryPerformance(userId, dateRange),
          this.getPricingAnalysis(userId, dateRange),
          this.getCompetitorInsights(userId, dateRange),
        ]);

      return {
        categoryPerformance,
        pricingAnalysis,
        competitorInsights,
        marketOpportunities: this.identifyMarketOpportunities(
          categoryPerformance,
          pricingAnalysis
        ),
      };
    } catch (error) {
      logger.error("Market intelligence error:", error);
      return null;
    }
  }

  /**
   * Analyze category performance
   */
  async getCategoryPerformance(userId, dateRange) {
    const categoryData = await OrderItem.findAll({
      include: [
        {
          model: Order,
          where: {
            userId,
            createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
          },
          attributes: [],
        },
        {
          model: Product,
          attributes: ["category"],
        },
      ],
      attributes: [
        [Product.sequelize.col("Product.category"), "category"],
        [
          OrderItem.sequelize.fn("SUM", OrderItem.sequelize.col("quantity")),
          "totalSold",
        ],
        [
          OrderItem.sequelize.fn(
            "SUM",
            OrderItem.sequelize.literal("quantity * price")
          ),
          "revenue",
        ],
        [
          OrderItem.sequelize.fn(
            "COUNT",
            OrderItem.sequelize.literal("DISTINCT OrderItem.productId")
          ),
          "productCount",
        ],
      ],
      group: ["Product.category"],
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
   * Analyze pricing strategies and optimization
   */
  async getPricingAnalysis(userId, dateRange) {
    const pricingData = await OrderItem.findAll({
      include: [
        {
          model: Order,
          where: {
            userId,
            createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
          },
          attributes: ["platform"],
        },
        {
          model: Product,
          attributes: ["name", "category"],
        },
      ],
      attributes: [
        "productId",
        "price",
        [
          OrderItem.sequelize.fn("AVG", OrderItem.sequelize.col("price")),
          "avgPrice",
        ],
        [
          OrderItem.sequelize.fn("MIN", OrderItem.sequelize.col("price")),
          "minPrice",
        ],
        [
          OrderItem.sequelize.fn("MAX", OrderItem.sequelize.col("price")),
          "maxPrice",
        ],
        [
          OrderItem.sequelize.fn("SUM", OrderItem.sequelize.col("quantity")),
          "totalSold",
        ],
      ],
      group: ["productId", "Product.id", "Order.platform"],
    });

    return {
      priceVariation: this.analyzePriceVariation(pricingData),
      platformPricing: this.analyzePlatformPricing(pricingData),
      elasticity: this.calculatePriceElasticity(pricingData),
      optimizationOpportunities: this.identifyPricingOpportunities(pricingData),
    };
  }

  /**
   * Get competitive insights (placeholder for future API integration)
   */
  async getCompetitorInsights(userId, dateRange) {
    // This would integrate with market data APIs in a real implementation
    return {
      marketShare: {
        estimated: "N/A",
        trend: "stable",
      },
      competitorPricing: {
        average: "N/A",
        recommendation: "Monitor competitor pricing regularly",
      },
      marketTrends: {
        growth: "N/A",
        opportunities: [
          "Expand to new platforms",
          "Diversify product portfolio",
        ],
      },
    };
  }

  /**
   * Get comprehensive financial KPIs
   */
  async getFinancialKPIs(userId, dateRange) {
    try {
      const orders = await Order.findAll({
        where: {
          userId,
          createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
          status: { [Op.notIn]: ["cancelled", "returned"] },
        },
        include: [{ model: OrderItem, as: "items" }],
      });

      const revenue = orders.reduce(
        (sum, order) => sum + parseFloat(order.totalAmount),
        0
      );
      const orderCount = orders.length;
      const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;

      // Calculate advanced metrics
      const platformBreakdown = this.calculatePlatformRevenue(orders);
      const profitMargins = await this.calculateProfitMargins(orders);
      const growthRates = await this.calculateGrowthRates(userId, dateRange);

      return {
        revenue,
        orderCount,
        avgOrderValue,
        platformBreakdown,
        profitMargins,
        growthRates,
        cashFlow: await this.calculateCashFlow(userId, dateRange),
        taxLiability: await this.calculateTaxLiability(userId, dateRange),
        customerLifetimeValue: await this.calculateCustomerLTV(
          userId,
          dateRange
        ),
        customerAcquisitionCost: await this.calculateCAC(userId, dateRange),
      };
    } catch (error) {
      logger.error("Financial KPIs error:", error);
      return null;
    }
  }

  // Utility methods for calculations

  /**
   * Calculate date range based on timeframe
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

  /**
   * Get previous period for comparison
   */
  getPreviousPeriod(dateRange) {
    const duration = dateRange.end.getTime() - dateRange.start.getTime();
    return {
      start: new Date(dateRange.start.getTime() - duration),
      end: new Date(dateRange.start.getTime()),
    };
  }

  /**
   * Calculate moving average
   */
  calculateMovingAverage(data, window) {
    if (data.length < window) return [];

    const result = [];
    for (let i = window - 1; i < data.length; i++) {
      const slice = data.slice(i - window + 1, i + 1);
      const avg = slice.reduce((sum, item) => sum + item.revenue, 0) / window;
      result.push({
        date: data[i].date,
        movingAverage: avg,
      });
    }
    return result;
  }

  /**
   * Generate simple forecast
   */
  generateSimpleForecast(data, days) {
    if (data.length < 7) return [];

    const recent = data.slice(-7);
    const avgRevenue =
      recent.reduce((sum, item) => sum + item.revenue, 0) / recent.length;
    const avgOrders =
      recent.reduce((sum, item) => sum + item.orders, 0) / recent.length;

    const forecast = [];
    const lastDate = new Date(data[data.length - 1].date);

    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(lastDate.getDate() + i);

      forecast.push({
        date: forecastDate.toISOString().split("T")[0],
        predictedRevenue: avgRevenue,
        predictedOrders: Math.round(avgOrders),
      });
    }

    return forecast;
  }

  /**
   * Generate insights from trends
   */
  generateInsights(trends) {
    if (trends.length < 7) return [];

    const insights = [];
    const recent = trends.slice(-7);
    const previous = trends.slice(-14, -7);

    if (recent.length && previous.length) {
      const recentAvg =
        recent.reduce((sum, item) => sum + item.revenue, 0) / recent.length;
      const previousAvg =
        previous.reduce((sum, item) => sum + item.revenue, 0) / previous.length;
      const growth = ((recentAvg - previousAvg) / previousAvg) * 100;

      if (growth > 10) {
        insights.push({
          type: "positive",
          message: `Revenue increased by ${growth.toFixed(
            1
          )}% in the last week`,
          impact: "high",
        });
      } else if (growth < -10) {
        insights.push({
          type: "warning",
          message: `Revenue decreased by ${Math.abs(growth).toFixed(
            1
          )}% in the last week`,
          impact: "high",
        });
      }
    }

    return insights;
  }

  /**
   * Calculate return rate
   */
  async calculateReturnRate(userId, dateRange) {
    const totalOrders = await Order.count({
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      },
    });

    const returnedOrders = await Order.count({
      where: {
        userId,
        status: "returned",
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      },
    });

    return totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;
  }

  /**
   * Calculate customer satisfaction metrics
   */
  async calculateSatisfactionMetrics(userId, dateRange) {
    // Placeholder - would integrate with review/rating systems
    return {
      averageRating: 4.2,
      reviewCount: 0,
      satisfactionScore: 85,
    };
  }

  /**
   * Calculate forecast confidence
   */
  calculateForecastConfidence(historicalData) {
    if (!historicalData || historicalData.length < 7) return "low";

    const revenues = historicalData.map((d) =>
      parseFloat(d.get("revenue") || 0)
    );
    const mean = revenues.reduce((sum, val) => sum + val, 0) / revenues.length;
    const variance =
      revenues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      revenues.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;

    if (coefficientOfVariation < 0.3) return "high";
    if (coefficientOfVariation < 0.6) return "medium";
    return "low";
  }

  /**
   * Calculate moving average forecast
   */
  calculateMovingAverageForecast(historicalData, days) {
    if (!historicalData || historicalData.length < 7) return [];

    const windowSize = Math.min(7, historicalData.length);
    const recentData = historicalData.slice(-windowSize);
    const avgRevenue =
      recentData.reduce(
        (sum, day) => sum + parseFloat(day.get("revenue") || 0),
        0
      ) / windowSize;
    const avgOrders =
      recentData.reduce(
        (sum, day) => sum + parseInt(day.get("orderCount") || 0),
        0
      ) / windowSize;

    const trend = this.calculateSimpleTrend(recentData);
    const forecast = [];

    for (let i = 1; i <= days; i++) {
      const trendAdjustment = trend * i;
      forecast.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        predictedRevenue: Math.max(0, avgRevenue + trendAdjustment),
        predictedOrders: Math.max(
          0,
          Math.round(avgOrders + (trendAdjustment / avgRevenue) * avgOrders)
        ),
      });
    }

    return forecast;
  }

  /**
   * Calculate simple trend
   */
  calculateSimpleTrend(data) {
    if (data.length < 2) return 0;

    const first = parseFloat(data[0].get("revenue") || 0);
    const last = parseFloat(data[data.length - 1].get("revenue") || 0);

    return (last - first) / data.length;
  }

  /**
   * Generate business recommendations
   */
  generateRecommendations(salesForecast, inventoryPredictions) {
    const recommendations = [];

    if (salesForecast && salesForecast.trend === "declining") {
      recommendations.push({
        type: "warning",
        category: "sales",
        title: "Declining Sales Trend",
        message:
          "Sales are trending downward. Consider promotional campaigns or product diversification.",
        priority: "high",
        actions: [
          "Create promotional campaign",
          "Analyze competitor pricing",
          "Review product portfolio",
        ],
      });
    }

    if (
      inventoryPredictions &&
      inventoryPredictions.lowStockItems?.length > 0
    ) {
      recommendations.push({
        type: "info",
        category: "inventory",
        title: "Low Stock Alert",
        message: `${inventoryPredictions.lowStockItems.length} products predicted to be low in stock soon.`,
        priority: "medium",
        actions: [
          "Review reorder points",
          "Contact suppliers",
          "Adjust safety stock levels",
        ],
      });
    }

    return recommendations;
  }

  // Additional helper methods for advanced analytics

  async calculateDemandForecast(productId, userId) {
    // Simplified demand forecast based on recent sales
    const recentSales = await OrderItem.findAll({
      include: [
        {
          model: Order,
          where: { userId },
          attributes: [],
        },
      ],
      where: { productId },
      attributes: [
        [
          OrderItem.sequelize.fn("SUM", OrderItem.sequelize.col("quantity")),
          "totalSold",
        ],
      ],
    });

    const totalSold = parseInt(recentSales[0]?.get("totalSold") || 0);
    return {
      daily: totalSold / 30, // Average daily demand
      nextMonth: totalSold,
    };
  }

  async getStockStatus(productId) {
    // Placeholder - would integrate with inventory management system
    return {
      current: Math.floor(Math.random() * 100) + 50, // Mock current stock
    };
  }

  calculateStockoutDays(currentStock, dailyDemand) {
    if (dailyDemand <= 0) return 999;
    return Math.floor(currentStock / dailyDemand);
  }

  getStockStatus(currentStock, dailyDemand) {
    const daysUntilStockout = this.calculateStockoutDays(
      currentStock,
      dailyDemand
    );

    if (daysUntilStockout < 7) return "critical";
    if (daysUntilStockout < 14) return "low";
    if (daysUntilStockout > 90) return "overstock";
    return "normal";
  }

  identifyPeakMonths(monthlyTrends) {
    const avgRevenue =
      monthlyTrends.reduce((sum, m) => sum + m.revenue, 0) /
      monthlyTrends.length;
    return monthlyTrends
      .filter((m) => m.revenue > avgRevenue * 1.2)
      .map((m) => m.month);
  }

  identifyLowSeasons(monthlyTrends) {
    const avgRevenue =
      monthlyTrends.reduce((sum, m) => sum + m.revenue, 0) /
      monthlyTrends.length;
    return monthlyTrends
      .filter((m) => m.revenue < avgRevenue * 0.8)
      .map((m) => m.month);
  }

  calculateSeasonalityIndex(monthlyTrends) {
    const avgRevenue =
      monthlyTrends.reduce((sum, m) => sum + m.revenue, 0) /
      monthlyTrends.length;
    const variance =
      monthlyTrends.reduce(
        (sum, m) => sum + Math.pow(m.revenue - avgRevenue, 2),
        0
      ) / monthlyTrends.length;
    return Math.sqrt(variance) / avgRevenue;
  }

  calculatePlatformRevenue(orders) {
    const platformData = {};

    orders.forEach((order) => {
      const platform = order.platform || "unknown";
      if (!platformData[platform]) {
        platformData[platform] = { revenue: 0, orders: 0 };
      }
      platformData[platform].revenue += parseFloat(order.totalAmount);
      platformData[platform].orders += 1;
    });

    return Object.entries(platformData).map(([platform, data]) => ({
      platform,
      revenue: data.revenue,
      orders: data.orders,
      avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0,
    }));
  }

  async calculateProfitMargins(orders) {
    // Simplified profit calculation - would integrate with cost data
    const totalRevenue = orders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount),
      0
    );
    const estimatedCosts = totalRevenue * 0.7; // Assume 70% cost ratio

    return {
      grossProfit: totalRevenue - estimatedCosts,
      grossMargin:
        totalRevenue > 0
          ? ((totalRevenue - estimatedCosts) / totalRevenue) * 100
          : 0,
      netProfit: (totalRevenue - estimatedCosts) * 0.85, // Assume 15% additional expenses
      netMargin:
        totalRevenue > 0
          ? (((totalRevenue - estimatedCosts) * 0.85) / totalRevenue) * 100
          : 0,
    };
  }

  async calculateGrowthRates(userId, dateRange) {
    const previousPeriod = this.getPreviousPeriod(dateRange);

    const [currentRevenue, previousRevenue] = await Promise.all([
      Order.sum("totalAmount", {
        where: {
          userId,
          createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
        },
      }),
      Order.sum("totalAmount", {
        where: {
          userId,
          createdAt: {
            [Op.between]: [previousPeriod.start, previousPeriod.end],
          },
        },
      }),
    ]);

    const revenueGrowth =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    return {
      revenue: revenueGrowth,
      orders: 0, // Would calculate similar to revenue
      customers: 0, // Would calculate based on unique customers
    };
  }

  async calculateCashFlow(userId, dateRange) {
    // Simplified cash flow - would integrate with payment and expense data
    const revenue = await Order.sum("totalAmount", {
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
        status: "completed",
      },
    });

    return {
      inflow: revenue || 0,
      outflow: (revenue || 0) * 0.7, // Estimated expenses
      net: (revenue || 0) * 0.3,
    };
  }

  async calculateTaxLiability(userId, dateRange) {
    const revenue = await Order.sum("totalAmount", {
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      },
    });

    return {
      estimatedTax: (revenue || 0) * 0.18, // Turkish VAT rate
      taxableIncome: revenue || 0,
    };
  }

  async calculateCustomerLTV(userId, dateRange) {
    // Simplified LTV calculation
    const avgOrderValue = await Order.findOne({
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      },
      attributes: [
        [Order.sequelize.fn("AVG", Order.sequelize.col("totalAmount")), "avg"],
      ],
    });

    const avg = parseFloat(avgOrderValue?.get("avg") || 0);
    return avg * 12; // Estimate annual value
  }

  async calculateCAC(userId, dateRange) {
    // Placeholder - would integrate with marketing spend data
    return {
      cost: 0,
      newCustomers: 0,
      cac: 0,
    };
  }

  analyzePriceVariation(pricingData) {
    return pricingData.map((item) => ({
      productId: item.productId,
      variation:
        parseFloat(item.get("maxPrice")) - parseFloat(item.get("minPrice")),
      coefficient:
        parseFloat(item.get("maxPrice")) > 0
          ? (parseFloat(item.get("maxPrice")) -
              parseFloat(item.get("minPrice"))) /
            parseFloat(item.get("maxPrice"))
          : 0,
    }));
  }

  analyzePlatformPricing(pricingData) {
    const platformPrices = {};
    pricingData.forEach((item) => {
      const platform = item.Order.platform;
      if (!platformPrices[platform]) {
        platformPrices[platform] = [];
      }
      platformPrices[platform].push(parseFloat(item.get("avgPrice")));
    });

    return Object.entries(platformPrices).map(([platform, prices]) => ({
      platform,
      avgPrice: prices.reduce((sum, p) => sum + p, 0) / prices.length,
      productCount: prices.length,
    }));
  }

  calculatePriceElasticity(pricingData) {
    // Simplified elasticity calculation
    return pricingData.map((item) => ({
      productId: item.productId,
      elasticity: -1.5, // Mock elasticity value
      recommendation: "Monitor price sensitivity",
    }));
  }

  identifyPricingOpportunities(pricingData) {
    return pricingData
      .filter((item) => parseFloat(item.get("totalSold")) > 10)
      .map((item) => ({
        productId: item.productId,
        currentPrice: parseFloat(item.get("avgPrice")),
        recommendedPrice: parseFloat(item.get("avgPrice")) * 1.05,
        potentialIncrease: "5%",
      }));
  }

  identifyMarketOpportunities(categoryPerformance, pricingAnalysis) {
    const opportunities = [];

    // High-performing categories
    const topCategories = categoryPerformance
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    topCategories.forEach((category) => {
      opportunities.push({
        type: "expansion",
        category: category.category,
        description: `Expand product range in ${category.category} - high revenue generator`,
        priority: "high",
      });
    });

    return opportunities;
  }

  /**
   * Export analytics data for reporting
   */
  async exportAnalyticsData(userId, timeframe, format = "json") {
    try {
      const analytics = await this.getDashboardAnalytics(userId, timeframe);

      if (format === "csv") {
        return this.convertToCSV(analytics);
      }

      return analytics;
    } catch (error) {
      logger.error("Export analytics error:", error);
      throw error;
    }
  }

  /**
   * Convert analytics data to CSV format
   */
  convertToCSV(analytics) {
    // Simplified CSV conversion - would be more comprehensive in production
    const csvData = [];

    // Add revenue data
    if (analytics.revenue && analytics.revenue.daily) {
      analytics.revenue.daily.forEach((day) => {
        csvData.push(["daily_revenue", day.date, day.revenue, day.orders]);
      });
    }

    return csvData.map((row) => row.join(",")).join("\n");
  }

  /**
   * Get real-time analytics updates
   */
  async getRealtimeUpdates(userId) {
    const cacheKey = `${this.cachePrefix}realtime:${userId}`;

    try {
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      const [todayOrders, todayRevenue, pendingOrders] = await Promise.all([
        Order.count({
          where: {
            userId,
            createdAt: { [Op.gte]: startOfDay },
          },
        }),
        Order.sum("totalAmount", {
          where: {
            userId,
            createdAt: { [Op.gte]: startOfDay },
          },
        }),
        Order.count({
          where: {
            userId,
            status: "pending",
          },
        }),
      ]);

      const updates = {
        todayOrders,
        todayRevenue: todayRevenue || 0,
        pendingOrders,
        lastUpdated: new Date(),
      };

      await cacheService.set(cacheKey, updates, 300); // 5-minute cache
      return updates;
    } catch (error) {
      logger.error("Realtime updates error:", error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();
