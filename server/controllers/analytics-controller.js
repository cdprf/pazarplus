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
 * Helper function to generate inventory optimization suggestions
 * This is outside the class to avoid context binding issues
 */
function generateInventoryOptimization(predictions, topProducts) {
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

      logger.info("Dashboard analytics request", { userId, timeframe });

      const analytics = await analyticsService.getDashboardAnalytics(
        userId,
        timeframe
      );

      // Debug logging
      logger.info("Dashboard analytics response", {
        userId,
        timeframe,
        orderSummaryTotal: analytics?.orderSummary?.total || 0,
        revenueTotal: analytics?.revenue?.total || 0,
        revenueTrendsCount: analytics?.revenue?.trends?.length || 0,
        topProductsCount: analytics?.topProducts?.length || 0,
        hasRevenueData: !!analytics?.revenue,
        hasTrendsData: !!(
          analytics?.revenue?.trends && analytics.revenue.trends.length > 0
        ),
      });

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
        insights: {
          predictiveInsights: insights[0],
          marketIntelligence: insights[1],
          financialKPIs: insights[2],
        },
        predictions: insights[0], // Main predictions data
        predictiveInsights: insights[0], // Keep backward compatibility
        marketIntelligence: insights[1], // Keep backward compatibility
        financialKPIs: insights[2], // Keep backward compatibility
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

      // Calculate total revenue for percentage calculation
      const totalRevenue = platformComparison.reduce(
        (sum, p) => sum + (p.totalRevenue || p.revenue || 0),
        0
      );

      // Add performance scores, recommendations, and calculated percentages
      const enhancedPlatforms = platformComparison.map((platform) => ({
        ...platform,
        percentage:
          totalRevenue > 0
            ? ((platform.totalRevenue || platform.revenue || 0) /
                totalRevenue) *
              100
            : 0,
        performanceScore: this.calculatePerformanceScore(platform),
        recommendations: this.generatePlatformRecommendations(platform),
      }));

      res.json({
        success: true,
        message: "Platform performance analysis retrieved successfully",
        data: {
          platforms: safeJsonResponse(enhancedPlatforms),
          comparison: safeJsonResponse(enhancedPlatforms), // Add comparison key
          recommendations: enhancedPlatforms
            .map((p) => p.recommendations)
            .flat(), // Add recommendations key
          summary: {
            bestPerforming: enhancedPlatforms.reduce((best, current) =>
              current.performanceScore > best.performanceScore ? current : best
            ),
            totalRevenue: enhancedPlatforms.reduce(
              (sum, p) => sum + (p.totalRevenue || p.revenue || 0),
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
    const self = this; // Create a reference to maintain context
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
        optimization: generateInventoryOptimization(
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
      const updates = await analyticsService.getRealTimeMetrics(userId);

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
      const {
        timeframe = "30d",
        format = "json",
        type = "dashboard",
      } = req.query;
      const userId = req.user.id;

      const data = await analyticsService.exportAnalyticsData(
        userId,
        type,
        format,
        timeframe
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

  /**
   * Get comprehensive product analytics
   */
  async getProductAnalytics(req, res) {
    try {
      const { timeframe = "30d", productId = null } = req.query;
      const userId = req.user.id;
      const dateRange = analyticsService.getDateRange(timeframe);

      const productAnalytics = await analyticsService.getProductAnalytics(
        userId,
        productId,
        dateRange
      );

      res.json({
        success: true,
        message: "Product analytics retrieved successfully",
        data: safeJsonResponse(productAnalytics),
        timeframe,
        productId,
        generatedAt: new Date(),
      });
    } catch (error) {
      logger.error("Product analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve product analytics",
        error: error.message,
      });
    }
  }

  /**
   * Get product performance comparison
   */
  async getProductPerformanceComparison(req, res) {
    try {
      const { timeframe = "30d", limit = 20 } = req.query;
      const userId = req.user.id;
      const dateRange = analyticsService.getDateRange(timeframe);

      const topProducts = await analyticsService.getTopProducts(
        userId,
        dateRange,
        parseInt(limit)
      );

      // Enhanced with additional metrics
      const enhancedProducts = await Promise.all(
        topProducts.map(async (product) => {
          const demandForecast = await analyticsService.calculateDemandForecast(
            product.productId,
            userId
          );
          const stockStatus = await analyticsService.getStockStatus(
            product.productId
          );

          return {
            ...product,
            demandForecast,
            stockStatus,
            salesVelocity: analyticsService.calculateSalesVelocity(
              product.totalSold,
              dateRange
            ),
            performanceScore: this.calculateProductPerformanceScore(product),
          };
        })
      );

      res.json({
        success: true,
        message: "Product performance comparison retrieved successfully",
        data: {
          products: safeJsonResponse(enhancedProducts),
          summary: {
            totalProducts: enhancedProducts.length,
            topPerformer: enhancedProducts[0],
            averageRevenue:
              enhancedProducts.reduce((sum, p) => sum + p.totalRevenue, 0) /
              enhancedProducts.length,
            totalRevenue: enhancedProducts.reduce(
              (sum, p) => sum + p.totalRevenue,
              0
            ),
          },
        },
        timeframe,
        generatedAt: new Date(),
      });
    } catch (error) {
      logger.error("Product performance comparison error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve product performance comparison",
        error: error.message,
      });
    }
  }

  /**
   * Get product insights and recommendations
   */
  async getProductInsights(req, res) {
    try {
      const { timeframe = "30d", productId = null } = req.query;
      const userId = req.user.id;
      const dateRange = analyticsService.getDateRange(timeframe);

      const insights = await analyticsService.generateProductInsights(
        userId,
        productId,
        dateRange
      );

      // Add competitive analysis and market intelligence
      const marketIntelligence = await analyticsService.getMarketIntelligence(
        userId,
        dateRange
      );

      const enhancedInsights = {
        ...insights,
        marketContext: {
          categoryPerformance: marketIntelligence?.categoryPerformance || [],
          seasonalTrends: marketIntelligence?.seasonalTrends || [],
          competitivePosition: "متوسط", // Would be calculated based on market data
        },
        actionableRecommendations: this.generateProductActionables(insights),
      };

      res.json({
        success: true,
        message: "Product insights retrieved successfully",
        data: safeJsonResponse(enhancedInsights),
        timeframe,
        productId,
        generatedAt: new Date(),
      });
    } catch (error) {
      logger.error("Product insights error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve product insights",
        error: error.message,
      });
    }
  }

  /**
   * Get real-time product metrics
   */
  async getRealtimeProductMetrics(req, res) {
    try {
      const { productId = null } = req.query;
      const userId = req.user.id;

      // Get today's data
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const dateRange = { start: startOfDay, end: new Date() };

      const realtimeData = await analyticsService.getProductAnalytics(
        userId,
        productId,
        dateRange
      );

      // Get hourly breakdown for today
      const hourlyBreakdown = await analyticsService.getHourlyProductBreakdown(
        userId,
        productId,
        dateRange
      );

      // Get live inventory status
      const inventoryAlerts = await analyticsService.getLiveInventoryAlerts(
        userId
      );

      res.json({
        success: true,
        message: "Real-time product metrics retrieved successfully",
        data: {
          todaySummary: realtimeData.summary,
          hourlyTrends: hourlyBreakdown,
          inventoryAlerts,
          lastUpdated: new Date(),
          refreshInterval: 60000, // 1 minute
        },
        productId,
      });
    } catch (error) {
      logger.error("Real-time product metrics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve real-time product metrics",
        error: error.message,
      });
    }
  }

  /**
   * Get trends analysis
   */
  async getTrends(req, res) {
    try {
      const { timeframe = "30d" } = req.query;
      const userId = req.user.id;
      const dateRange = analyticsService.getDateRange(timeframe);

      const trends = await analyticsService.getOrderTrends(userId, dateRange);

      res.json({
        success: true,
        message: "Trends data retrieved successfully",
        data: trends.daily || trends, // Return daily trends array
        timeframe,
        generatedAt: new Date(),
      });
    } catch (error) {
      logger.error("Trends error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve trends data",
        error: error.message,
      });
    }
  }

  /**
   * Get accurate analytics that properly handle returns and cancellations
   */
  async getAccurateAnalytics(req, res) {
    try {
      const { timeframe = "30d" } = req.query;
      const userId = req.user.id;

      const analytics = await analyticsService.getAccurateAnalytics(
        userId,
        timeframe
      );

      res.json({
        success: true,
        message: "Accurate analytics retrieved successfully",
        data: safeJsonResponse(analytics),
        timeframe,
        note: "Revenue calculations exclude returned, cancelled, and refunded orders",
        generatedAt: new Date(),
      });
    } catch (error) {
      logger.error("Accurate analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve accurate analytics",
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

  /**
   * Calculate product performance score
   */
  calculateProductPerformanceScore(product) {
    const revenueWeight = 0.4;
    const salesWeight = 0.3;
    const velocityWeight = 0.3;

    // Normalize scores (simplified scoring system)
    const revenueScore = Math.min(product.totalRevenue / 1000, 100);
    const salesScore = Math.min(product.totalSold / 50, 100);
    const velocityScore = Math.min((product.totalSold / 30) * 10, 100); // Assuming 30-day period

    const score =
      revenueWeight * revenueScore +
      salesWeight * salesScore +
      velocityWeight * velocityScore;

    return {
      overall: Math.round(score),
      breakdown: {
        revenue: Math.round(revenueScore),
        sales: Math.round(salesScore),
        velocity: Math.round(velocityScore),
      },
    };
  }

  /**
   * Generate actionable recommendations from insights
   */
  generateProductActionables(insights) {
    const actionables = [];

    insights.recommendations?.forEach((rec) => {
      const actionable = {
        ...rec,
        actions: this.generateSpecificActions(rec),
        timeline: this.getRecommendationTimeline(rec.priority),
        resources: this.getRequiredResources(rec.category),
      };
      actionables.push(actionable);
    });

    return actionables;
  }

  /**
   * Generate specific actions for recommendations
   */
  generateSpecificActions(recommendation) {
    const actionMap = {
      inventory: [
        "Mevcut stok seviyelerini gözden geçirin",
        "Tedarikçilerle iletişime geçin",
        "Otomatik sipariş noktaları belirleyin",
        "Güvenlik stoku hesaplayın",
      ],
      pricing: [
        "Rakip fiyatlarını analiz edin",
        "A/B test için farklı fiyatlar deneyin",
        "Dinamik fiyatlandırma stratejisi uygulayın",
        "Kar marjı hedeflerini belirleyin",
      ],
      marketing: [
        "Hedefli reklam kampanyaları oluşturun",
        "Sosyal medya stratejisi geliştirin",
        "E-posta pazarlama kampanyaları başlatın",
        "İçerik pazarlama planı yapın",
      ],
      platform: [
        "Platform performansını karşılaştırın",
        "Düşük performanslı platformları optimize edin",
        "Yeni platform entegrasyonları değerlendirin",
        "Platform özel stratejiler geliştirin",
      ],
    };

    return (
      actionMap[recommendation.category] || [
        "Detaylı analiz yapın",
        "Stratejik plan oluşturun",
        "Uygulama takvimine alın",
        "Sonuçları takip edin",
      ]
    );
  }

  /**
   * Get recommendation timeline based on priority
   */
  getRecommendationTimeline(priority) {
    const timelineMap = {
      high: "1-2 hafta",
      medium: "2-4 hafta",
      low: "1-3 ay",
    };
    return timelineMap[priority] || "Belirsiz";
  }

  /**
   * Get required resources for recommendation category
   */
  getRequiredResources(category) {
    const resourceMap = {
      inventory: ["Satın alma ekibi", "Depo yönetimi", "Tedarikçi ilişkileri"],
      pricing: ["Fiyatlandırma ekibi", "Pazar araştırması", "Analitik araçlar"],
      marketing: ["Pazarlama ekibi", "Kreatif ekip", "Reklam bütçesi"],
      platform: ["E-ticaret ekibi", "Teknik destek", "Platform yöneticileri"],
    };
    return resourceMap[category] || ["Genel ekip desteği"];
  }

  /**
   * Get hourly product breakdown for today
   */
  async getHourlyProductBreakdown(userId, productId) {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));

      const whereClause = {
        include: [
          {
            model: Order,
            as: "order",
            where: {
              userId,
              createdAt: { [Op.gte]: startOfDay },
            },
            attributes: [],
          },
        ],
        attributes: [
          [
            OrderItem.sequelize.fn(
              "HOUR",
              OrderItem.sequelize.col("order.createdAt")
            ),
            "hour",
          ],
          [
            OrderItem.sequelize.fn("SUM", OrderItem.sequelize.col("quantity")),
            "soldQuantity",
          ],
          [
            OrderItem.sequelize.fn(
              "SUM",
              OrderItem.sequelize.literal("quantity * price")
            ),
            "revenue",
          ],
        ],
        group: [
          OrderItem.sequelize.fn(
            "HOUR",
            OrderItem.sequelize.col("order.createdAt")
          ),
        ],
        order: [
          [
            OrderItem.sequelize.fn(
              "HOUR",
              OrderItem.sequelize.col("order.createdAt")
            ),
            "ASC",
          ],
        ],
      };

      if (productId) {
        whereClause.where = { productId };
      }

      const hourlyData = await OrderItem.findAll(whereClause);

      // Fill in missing hours with zero values
      const hourlyBreakdown = Array.from({ length: 24 }, (_, hour) => {
        const data = hourlyData.find(
          (item) => parseInt(item.get("hour")) === hour
        );
        return {
          hour,
          soldQuantity: data ? parseInt(data.get("soldQuantity")) : 0,
          revenue: data ? parseFloat(data.get("revenue")) : 0,
        };
      });

      return hourlyBreakdown;
    } catch (error) {
      logger.error("Hourly breakdown error:", error);
      return Array.from({ length: 24 }, (_, hour) => ({
        hour,
        soldQuantity: 0,
        revenue: 0,
      }));
    }
  }

  /**
   * Get live inventory alerts
   */
  async getLiveInventoryAlerts(userId, productId) {
    try {
      const alerts = [];

      if (productId) {
        // Get specific product alerts
        const product = await Product.findOne({
          where: { id: productId, userId },
        });

        if (product) {
          const demandForecast = await analyticsService.calculateDemandForecast(
            productId,
            userId
          );
          const daysUntilStockout = analyticsService.calculateStockoutDays(
            product.stockQuantity,
            demandForecast.daily
          );

          if (daysUntilStockout < 7) {
            alerts.push({
              type: "stockout_warning",
              severity: daysUntilStockout < 3 ? "high" : "medium",
              productId,
              productName: product.name,
              message: `${daysUntilStockout} gün içinde stok tükenmesi bekleniyor`,
              recommendedAction: "Acil stok siparişi verin",
            });
          }

          if (product.stockQuantity === 0) {
            alerts.push({
              type: "out_of_stock",
              severity: "high",
              productId,
              productName: product.name,
              message: "Ürün stokta yok",
              recommendedAction: "Acil stok temini gerekli",
            });
          }
        }
      } else {
        // Get all product alerts
        const lowStockProducts = await Product.findAll({
          where: {
            userId,
            stockQuantity: { [Op.lt]: 10 }, // Assuming 10 is low stock threshold
          },
          limit: 10,
        });

        lowStockProducts.forEach((product) => {
          alerts.push({
            type: "low_stock",
            severity: "medium",
            productId: product.id,
            productName: product.name,
            currentStock: product.stockQuantity,
            message: `Düşük stok seviyesi: ${product.stockQuantity} adet`,
            recommendedAction: "Stok sipariş etmeyi değerlendirin",
          });
        });
      }

      return alerts;
    } catch (error) {
      logger.error("Live inventory alerts error:", error);
      return [];
    }
  }

  /**
   * Get advanced customer segmentation and behavior analytics
   * Modern standard: RFM analysis, behavioral segments, customer lifetime value
   */
  async getCustomerAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const { timeframe = "30d" } = req.query;

      logger.info(
        `Getting customer analytics for user ${userId}, timeframe: ${timeframe}`
      );

      const customerAnalytics = await analyticsService.getCustomerSegmentation(
        userId,
        timeframe
      );

      res.json({
        success: true,
        data: safeJsonResponse(customerAnalytics),
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting customer analytics:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get customer analytics",
        details: error.message,
      });
    }
  }

  /**
   * Get customer cohort analysis for retention insights
   * Modern standard: Monthly cohorts, retention rates, churn analysis
   */
  async getCohortAnalysis(req, res) {
    try {
      const userId = req.user.id;
      const { timeframe = "90d" } = req.query;

      logger.info(
        `Getting cohort analysis for user ${userId}, timeframe: ${timeframe}`
      );

      const cohortData = await analyticsService.getCohortAnalysis(
        userId,
        timeframe
      );

      res.json({
        success: true,
        data: safeJsonResponse(cohortData),
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting cohort analysis:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get cohort analysis",
        details: error.message,
      });
    }
  }

  /**
   * Get competitive analysis and market positioning
   * Modern standard: Price comparison, market share analysis, competitive intelligence
   */
  async getCompetitiveAnalysis(req, res) {
    try {
      const userId = req.user.id;
      const { timeframe = "30d" } = req.query;

      logger.info(
        `Getting competitive analysis for user ${userId}, timeframe: ${timeframe}`
      );

      const competitiveData = await analyticsService.getCompetitiveAnalysis(
        userId,
        timeframe
      );

      res.json({
        success: true,
        data: safeJsonResponse(competitiveData),
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting competitive analysis:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get competitive analysis",
        details: error.message,
      });
    }
  }

  /**
   * Get conversion funnel analysis
   * Modern standard: Multi-step funnel tracking, conversion optimization insights
   */
  async getFunnelAnalysis(req, res) {
    try {
      const userId = req.user.id;
      const { timeframe = "30d" } = req.query;

      logger.info(
        `Getting funnel analysis for user ${userId}, timeframe: ${timeframe}`
      );

      const funnelData = await analyticsService.getFunnelAnalysis(
        userId,
        timeframe
      );

      res.json({
        success: true,
        data: safeJsonResponse(funnelData),
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting funnel analysis:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get funnel analysis",
        details: error.message,
      });
    }
  }

  /**
   * Get real-time analytics dashboard
   * Modern standard: Live metrics, instant updates, real-time KPIs
   */
  async getRealTimeAnalytics(req, res) {
    try {
      const userId = req.user.id;

      logger.info(`Getting real-time analytics for user ${userId}`);

      const realTimeData = await analyticsService.getRealTimeMetrics(userId);

      res.json({
        success: true,
        data: safeJsonResponse(realTimeData),
        generatedAt: new Date().toISOString(),
        isRealTime: true,
      });
    } catch (error) {
      logger.error("Error getting real-time analytics:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get real-time analytics",
        details: error.message,
      });
    }
  }

  /**
   * Get marketing attribution analysis
   * Modern standard: Multi-touch attribution, channel performance, ROI analysis
   */
  async getAttributionAnalysis(req, res) {
    try {
      const userId = req.user.id;
      const { timeframe = "30d" } = req.query;

      logger.info(
        `Getting attribution analysis for user ${userId}, timeframe: ${timeframe}`
      );

      const attributionData = await analyticsService.getAttributionAnalysis(
        userId,
        timeframe
      );

      res.json({
        success: true,
        data: safeJsonResponse(attributionData),
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting attribution analysis:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get attribution analysis",
        details: error.message,
      });
    }
  }

  /**
   * Get anomaly detection insights
   * Modern standard: Statistical anomalies, trend breaks, automated alerts
   */
  async getAnomalyDetection(req, res) {
    try {
      const userId = req.user.id;
      const { timeframe = "30d" } = req.query;

      logger.info(
        `Getting anomaly detection for user ${userId}, timeframe: ${timeframe}`
      );

      const anomalies = await analyticsService.detectAnomalies(
        userId,
        timeframe
      );

      res.json({
        success: true,
        data: safeJsonResponse(anomalies),
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting anomaly detection:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get anomaly detection",
        details: error.message,
      });
    }
  }

  /**
   * Generate custom analytics reports
   * Modern standard: Flexible reporting, custom dimensions and metrics
   */
  async generateCustomReport(req, res) {
    try {
      const userId = req.user.id;
      const { metrics, dimensions, filters, timeframe = "30d" } = req.body;

      if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Metrics array is required and cannot be empty",
        });
      }

      logger.info(`Generating custom report for user ${userId}`, {
        metrics,
        dimensions,
        filters,
        timeframe,
      });

      const customReport = await analyticsService.generateCustomReport(userId, {
        metrics,
        dimensions,
        filters,
        timeframe,
      });

      res.json({
        success: true,
        data: safeJsonResponse(customReport),
        generatedAt: new Date().toISOString(),
        reportConfig: { metrics, dimensions, filters, timeframe },
      });
    } catch (error) {
      logger.error("Error generating custom report:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate custom report",
        details: error.message,
      });
    }
  }
}

module.exports = new AnalyticsController();
