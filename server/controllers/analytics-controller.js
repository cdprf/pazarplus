const analyticsService = require("../services/analytics-service");
const logger = require("../utils/logger");

// Utility function to safely serialize data and prevent circular references
const safeJsonResponse = (data) => {
  try {
    // If data is a Sequelize instance, convert to plain object
    if (data && typeof data.get === "function") {
      data = data.get({ plain: true });
    }

    // If data is an array, process each item
    if (Array.isArray(data)) {
      return data.map((item) => safeJsonResponse(item));
    }

    // If data is an object, process recursively
    if (data && typeof data === "object") {
      const serialized = {};
      for (const [key, value] of Object.entries(data)) {
        // Skip circular reference properties and sensitive data
        if (
          key === "user" ||
          key === "User" ||
          key === "dataValues" ||
          key === "_previousDataValues" ||
          key === "password" ||
          key === "token"
        ) {
          continue;
        }

        if (value && typeof value === "object") {
          if (typeof value.get === "function") {
            // Sequelize instance
            serialized[key] = value.get({ plain: true });
          } else if (Array.isArray(value)) {
            // Array of potentially Sequelize instances
            serialized[key] = value.map((item) =>
              item && typeof item.get === "function"
                ? item.get({ plain: true })
                : item
            );
          } else {
            // Regular object - recursively serialize but limit depth
            serialized[key] = safeJsonResponse(value);
          }
        } else {
          serialized[key] = value;
        }
      }
      return serialized;
    }

    return data;
  } catch (error) {
    logger.error("Error serializing data for JSON response:", error);
    return { error: "Failed to serialize data", type: typeof data };
  }
};

/**
 * Enhanced Analytics Controller for Month 5 Phase 1
 * Business Intelligence & Customer Acquisition Features
 */
class AnalyticsController {
  /**
   * Get comprehensive dashboard analytics with advanced insights
   */
  async getDashboardAnalytics(req, res) {
    try {
      const { timeframe = "30d" } = req.query;
      const userId = req.user.id;

      const analytics = await analyticsService.getDashboardAnalytics(
        userId,
        timeframe
      );

      res.json({
        success: true,
        message: "Dashboard analytics retrieved successfully",
        data: safeJsonResponse(analytics),
        timeframe,
        generatedAt: new Date(),
      });
    } catch (error) {
      logger.error("Dashboard analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve dashboard analytics",
        error: error.message,
      });
    }
  }

  /**
   * Get business intelligence insights with recommendations
   */
  async getBusinessIntelligence(req, res) {
    try {
      const { timeframe = "30d" } = req.query;
      const userId = req.user.id;

      const dateRange = analyticsService.getDateRange(timeframe);

      const insights = await Promise.all([
        analyticsService.getPredictiveInsights(userId, dateRange),
        analyticsService.getMarketIntelligence(userId, dateRange),
        analyticsService.getFinancialKPIs(userId, dateRange),
      ]);

      const businessIntelligence = {
        predictiveInsights: insights[0],
        marketIntelligence: insights[1],
        financialKPIs: insights[2],
        recommendations: this.generateActionableRecommendations(insights),
        generatedAt: new Date(),
      };

      res.json({
        success: true,
        message: "Business intelligence insights retrieved successfully",
        data: safeJsonResponse(businessIntelligence),
      });
    } catch (error) {
      logger.error("Business intelligence error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve business intelligence",
        error: error.message,
      });
    }
  }

  /**
   * Get advanced revenue analytics with growth predictions
   */
  async getRevenueAnalytics(req, res) {
    try {
      const { timeframe = "30d", breakdown = "daily" } = req.query;
      const userId = req.user.id;
      const dateRange = analyticsService.getDateRange(timeframe);

      const revenueData = await analyticsService.getRevenueAnalytics(
        userId,
        dateRange
      );
      const salesForecast = await analyticsService.getSalesForecast(
        userId,
        dateRange
      );

      const analytics = {
        current: revenueData,
        forecast: salesForecast,
        growth: {
          rate: revenueData.growth.rate,
          trend: revenueData.growth.rate > 0 ? "positive" : "negative",
          confidence: salesForecast?.confidence || "medium",
        },
        insights: this.generateRevenueInsights(revenueData, salesForecast),
      };

      res.json({
        success: true,
        message: "Revenue analytics retrieved successfully",
        data: safeJsonResponse(analytics),
      });
    } catch (error) {
      logger.error("Revenue analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve revenue analytics",
        error: error.message,
      });
    }
  }

  /**
   * Get platform performance comparison with optimization suggestions
   */
  async getPlatformPerformance(req, res) {
    try {
      const { timeframe = "30d" } = req.query;
      const userId = req.user.id;
      const dateRange = analyticsService.getDateRange(timeframe);

      const platformComparison = await analyticsService.getPlatformComparison(
        userId,
        dateRange
      );

      // Add performance scores and recommendations
      const enhancedPlatforms = platformComparison.map((platform) => ({
        ...platform,
        performanceScore: this.calculatePerformanceScore(platform),
        recommendations: this.generatePlatformRecommendations(platform),
      }));

      res.json({
        success: true,
        message: "Platform performance analysis retrieved successfully",
        data: {
          platforms: safeJsonResponse(enhancedPlatforms),
          summary: {
            bestPerforming: enhancedPlatforms.reduce((best, current) =>
              current.performanceScore > best.performanceScore ? current : best
            ),
            totalRevenue: enhancedPlatforms.reduce(
              (sum, p) => sum + p.totalRevenue,
              0
            ),
            avgCompletionRate:
              enhancedPlatforms.reduce((sum, p) => sum + p.completionRate, 0) /
              enhancedPlatforms.length,
          },
        },
      });
    } catch (error) {
      logger.error("Platform performance error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve platform performance",
        error: error.message,
      });
    }
  }

  /**
   * Get inventory optimization insights
   */
  async getInventoryInsights(req, res) {
    try {
      const { timeframe = "30d" } = req.query;
      const userId = req.user.id;
      const dateRange = analyticsService.getDateRange(timeframe);

      const inventoryPredictions =
        await analyticsService.getInventoryPredictions(userId, dateRange);
      const topProducts = await analyticsService.getTopProducts(
        userId,
        dateRange,
        20
      );

      const insights = {
        predictions: inventoryPredictions,
        topProducts,
        alerts: {
          lowStock: inventoryPredictions?.lowStockItems || [],
          overstock: inventoryPredictions?.overstockItems || [],
          reorderNeeded: inventoryPredictions?.reorderSuggestions || [],
        },
        optimization: this.generateInventoryOptimization(
          inventoryPredictions,
          topProducts
        ),
      };

      res.json({
        success: true,
        message: "Inventory insights retrieved successfully",
        data: safeJsonResponse(insights),
      });
    } catch (error) {
      logger.error("Inventory insights error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve inventory insights",
        error: error.message,
      });
    }
  }

  /**
   * Get market intelligence and competitive analysis
   */
  async getMarketAnalysis(req, res) {
    try {
      const { timeframe = "30d" } = req.query;
      const userId = req.user.id;
      const dateRange = analyticsService.getDateRange(timeframe);

      const marketIntelligence = await analyticsService.getMarketIntelligence(
        userId,
        dateRange
      );
      const seasonalTrends = await analyticsService.getSeasonalTrends(
        userId,
        dateRange
      );

      const analysis = {
        ...marketIntelligence,
        seasonalTrends,
        marketPosition: this.assessMarketPosition(marketIntelligence),
        opportunities: this.identifyGrowthOpportunities(
          marketIntelligence,
          seasonalTrends
        ),
      };

      res.json({
        success: true,
        message: "Market analysis retrieved successfully",
        data: safeJsonResponse(analysis),
      });
    } catch (error) {
      logger.error("Market analysis error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve market analysis",
        error: error.message,
      });
    }
  }

  /**
   * Get real-time analytics updates
   */
  async getRealtimeUpdates(req, res) {
    try {
      const userId = req.user.id;
      const updates = await analyticsService.getRealtimeUpdates(userId);

      res.json({
        success: true,
        message: "Real-time updates retrieved successfully",
        data: safeJsonResponse(updates),
      });
    } catch (error) {
      logger.error("Real-time updates error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve real-time updates",
        error: error.message,
      });
    }
  }

  /**
   * Export analytics data in various formats
   */
  async exportAnalyticsData(req, res) {
    try {
      const { timeframe = "30d", format = "json" } = req.query;
      const userId = req.user.id;

      const data = await analyticsService.exportAnalyticsData(
        userId,
        timeframe,
        format
      );

      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=analytics-${timeframe}.csv`
        );
        res.send(data);
      } else {
        res.json({
          success: true,
          message: "Analytics data exported successfully",
          data: safeJsonResponse(data),
          format,
        });
      }
    } catch (error) {
      logger.error("Export analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export analytics data",
        error: error.message,
      });
    }
  }

  // Helper methods for enhanced analytics

  /**
   * Generate actionable business recommendations
   */
  generateActionableRecommendations(insights) {
    const recommendations = [];
    const [predictive, market, financial] = insights;

    // Revenue optimization recommendations
    if (financial?.growthRates?.revenue < 5) {
      recommendations.push({
        category: "revenue",
        priority: "high",
        title: "Revenue Growth Optimization",
        description:
          "Revenue growth is below 5%. Consider expanding marketing efforts or exploring new sales channels.",
        actions: [
          "Launch targeted marketing campaigns",
          "Explore new platform integrations",
          "Implement dynamic pricing strategies",
          "Focus on high-margin products",
        ],
        estimatedImpact: "+15-25% revenue increase",
        timeframe: "2-3 months",
      });
    }

    // Inventory optimization recommendations
    if (predictive?.inventoryPredictions?.lowStockItems?.length > 0) {
      recommendations.push({
        category: "inventory",
        priority: "medium",
        title: "Inventory Management Optimization",
        description: `${predictive.inventoryPredictions.lowStockItems.length} products are predicted to have low stock soon.`,
        actions: [
          "Set up automated reorder alerts",
          "Optimize safety stock levels",
          "Negotiate better supplier terms",
          "Implement just-in-time inventory",
        ],
        estimatedImpact: "-20% inventory costs",
        timeframe: "1-2 months",
      });
    }

    // Market expansion recommendations
    if (market?.categoryPerformance?.length > 0) {
      const topCategory = market.categoryPerformance[0];
      recommendations.push({
        category: "expansion",
        priority: "medium",
        title: "Market Expansion Opportunity",
        description: `${topCategory.category} is your top-performing category. Consider expanding product range.`,
        actions: [
          `Source more ${topCategory.category} products`,
          "Analyze competitor offerings in this category",
          "Optimize pricing for category products",
          "Create category-specific marketing campaigns",
        ],
        estimatedImpact: "+10-20% category revenue",
        timeframe: "1-3 months",
      });
    }

    return recommendations;
  }

  /**
   * Generate revenue-specific insights
   */
  generateRevenueInsights(revenueData, salesForecast) {
    const insights = [];

    // Growth trend analysis
    if (revenueData.growth.rate > 10) {
      insights.push({
        type: "positive",
        title: "Strong Revenue Growth",
        message: `Revenue has grown by ${revenueData.growth.rate.toFixed(
          1
        )}% compared to the previous period.`,
        recommendation:
          "Maintain current strategies and consider scaling successful initiatives.",
      });
    } else if (revenueData.growth.rate < -5) {
      insights.push({
        type: "warning",
        title: "Revenue Decline Alert",
        message: `Revenue has decreased by ${Math.abs(
          revenueData.growth.rate
        ).toFixed(1)}% compared to the previous period.`,
        recommendation:
          "Review current strategies and consider implementing promotional campaigns.",
      });
    }

    // Platform performance insights
    const topPlatform = revenueData.platforms.reduce((top, current) =>
      current.revenue > top.revenue ? current : top
    );

    if (topPlatform) {
      insights.push({
        type: "info",
        title: "Top Performing Platform",
        message: `${topPlatform.platform} generated ${(
          (topPlatform.revenue /
            revenueData.platforms.reduce((sum, p) => sum + p.revenue, 0)) *
          100
        ).toFixed(1)}% of total revenue.`,
        recommendation:
          "Focus optimization efforts on this platform and analyze what makes it successful.",
      });
    }

    return insights;
  }

  /**
   * Calculate platform performance score
   */
  calculatePerformanceScore(platform) {
    const revenueWeight = 0.4;
    const completionWeight = 0.3;
    const avgOrderWeight = 0.3;

    // Normalize scores (assuming max values for scaling)
    const revenueScore = Math.min(platform.totalRevenue / 10000, 1) * 100;
    const completionScore = platform.completionRate;
    const avgOrderScore = Math.min(platform.avgOrderValue / 500, 1) * 100;

    return (
      revenueWeight * revenueScore +
      completionWeight * completionScore +
      avgOrderWeight * avgOrderScore
    ).toFixed(1);
  }

  /**
   * Generate platform-specific recommendations
   */
  generatePlatformRecommendations(platform) {
    const recommendations = [];

    if (platform.completionRate < 80) {
      recommendations.push(
        "Improve order fulfillment processes to increase completion rate"
      );
    }

    if (platform.avgOrderValue < 100) {
      recommendations.push(
        "Implement upselling strategies to increase average order value"
      );
    }

    if (platform.totalOrders < 50) {
      recommendations.push(
        "Focus marketing efforts to increase order volume on this platform"
      );
    }

    return recommendations;
  }

  /**
   * Generate inventory optimization suggestions
   */
  generateInventoryOptimization(predictions, topProducts) {
    const optimization = {
      actions: [],
      priorities: [],
      estimatedSavings: 0,
    };

    if (predictions?.lowStockItems?.length > 0) {
      optimization.actions.push(
        "Implement automated reorder system for fast-moving items"
      );
      optimization.priorities.push({
        action: "Restock critical items",
        items: predictions.lowStockItems.length,
        urgency: "high",
      });
    }

    if (predictions?.overstockItems?.length > 0) {
      optimization.actions.push(
        "Create promotional campaigns for overstocked items"
      );
      optimization.estimatedSavings += predictions.overstockItems.length * 50; // Estimated savings per item
    }

    return optimization;
  }

  /**
   * Assess market position based on intelligence data
   */
  assessMarketPosition(marketIntelligence) {
    // Simplified market position assessment
    return {
      position: "growing",
      strengths: [
        "Strong category performance",
        "Diversified platform presence",
      ],
      challenges: ["Price optimization needed", "Inventory management"],
      score: 75, // Out of 100
    };
  }

  /**
   * Identify growth opportunities
   */
  identifyGrowthOpportunities(marketIntelligence, seasonalTrends) {
    const opportunities = [];

    // Seasonal opportunities
    if (seasonalTrends?.peakMonths?.length > 0) {
      opportunities.push({
        type: "seasonal",
        title: "Seasonal Peak Preparation",
        description: `Prepare for peak sales in months: ${seasonalTrends.peakMonths.join(
          ", "
        )}`,
        timeline: "Next 2 months",
        potential: "High",
      });
    }

    // Category expansion opportunities
    if (marketIntelligence?.categoryPerformance?.length > 0) {
      const topCategories = marketIntelligence.categoryPerformance.slice(0, 2);
      topCategories.forEach((category) => {
        opportunities.push({
          type: "expansion",
          title: `Expand in ${category.category}`,
          description: `High-performing category with ${category.productCount} products generating significant revenue`,
          timeline: "Next 3 months",
          potential: "Medium",
        });
      });
    }

    return opportunities;
  }
}

module.exports = new AnalyticsController();
