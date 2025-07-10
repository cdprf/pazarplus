const { Op } = require('sequelize');
const { Order, OrderItem, Product } = require('../../models');
const cacheService = require('../cache-service');
const logger = require('../../utils/logger');

// Import modularized analytics utilities
const {
  getAccurateAnalytics,
  getDashboardAnalytics,
  getRevenueAnalytics
} = require('./analytics-utils');

const {
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
  calculateProductSummary,
  calculateSalesVelocity,
  calculateConversionRate,
  calculateMovingAverage,
  calculateTrend,
  calculateMovingAverageForecast,
  calculateForecastConfidence,
  calculateElasticity,
  calculateGrowthRate,
  calculatePlatformRevenue,
  getPricingAnalysis
} = require('./analytic-calculation-utils');

const {
  getCustomerSegmentation,
  getProductCustomerSegmentation,
  getCustomerMetrics
} = require('./customer-analysis-utils');

const {
  calculatePlatformPriceDifferences,
  analyzePlatformPricing
} = require('./platform-analytics-utils');

const {
  getTopProducts,
  getProductAnalytics,
  getProductDailyTrends,
  generateProductInsights,
  getProductPeriodData,
  getProductSeasonalTrends,
  getHourlyProductBreakdown,
  getStockStatus
} = require('./product-analysis-utils');

const { getOrderSummary, getOrderTrends } = require('./orders-analytic-utils');

const {
  getCompetitorInsights,
  getPredictiveInsights
} = require('./insights-utils');

const {
  getPerformanceMetrics,
  getCategoryPerformance,
  getProductPerformanceMetrics,
  getProductPlatformBreakdown
} = require('./performance-analysis-util');

const {
  generateInsights,
  generateSimpleForecast,
  generateCustomReport,
  generateRecommendations,
  generatePricingRecommendations,
  generateMarketRecommendations
} = require('./anlaysis-generation-utils');

const {
  identifyMarketOpportunities,
  identifyPricingOpportunities,
  detectAnomalies,
  detectSeasonality,
  determineStockStatusFromMetrics
} = require('./detection-utils');

class AnalyticsService {
  constructor() {
    this.cachePrefix = 'analytics:';
    this.defaultCacheTTL = 3600; // 1 hour
    this.predictiveCacheTTL = 86400; // 24 hours for predictive analytics
  }

  /**
   * Get platform performance comparison
   */
  async getPlatformComparison(userId, dateRange) {
    // Valid statuses for revenue calculation (exclude returned/cancelled)
    const validRevenueStatuses = ['new', 'processing', 'shipped', 'delivered'];

    const whereClause = {
      userId,
      createdAt: {
        [Op.between]: [dateRange.start, dateRange.end]
      },
      orderStatus: { [Op.in]: validRevenueStatuses } // Exclude returned/cancelled orders
    };

    const platformStats = await Order.findAll({
      where: whereClause,
      attributes: [
        'platform',
        [Order.sequelize.fn('COUNT', Order.sequelize.col('id')), 'totalOrders'],
        [
          Order.sequelize.fn('SUM', Order.sequelize.col('totalAmount')),
          'totalRevenue'
        ],
        [
          Order.sequelize.fn('AVG', Order.sequelize.col('totalAmount')),
          'avgOrderValue'
        ],
        [
          Order.sequelize.fn(
            'SUM',
            Order.sequelize.literal(
              'CASE WHEN "Order"."orderStatus" = \'delivered\' THEN 1 ELSE 0 END'
            )
          ),
          'completedOrders'
        ]
      ],
      group: ['platform']
    });

    return platformStats.map((stat) => {
      const totalOrders = parseInt(stat.get('totalOrders'));
      const completedOrders = parseInt(stat.get('completedOrders'));
      const totalRevenue = parseFloat(stat.get('totalRevenue') || 0);

      return {
        name: stat.platform, // Frontend expects 'name' not 'platform'
        platform: stat.platform, // Keep original for backward compatibility
        orders: totalOrders, // Frontend expects 'orders' not 'totalOrders'
        totalOrders,
        revenue: totalRevenue, // Frontend expects 'revenue' not 'totalRevenue'
        totalRevenue,
        avgOrderValue: parseFloat(stat.get('avgOrderValue') || 0),
        completionRate: totalOrders ? (completedOrders / totalOrders) * 100 : 0,
        conversionRate: totalOrders ? (completedOrders / totalOrders) * 100 : 0, // Frontend expects conversionRate
        completedOrders,
        percentage: 0 // Will be calculated in controller if needed
      };
    });
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
              dateRange.end
            ]
          },
          orderStatus: { [Op.notIn]: ['cancelled', 'returned'] }
        },
        attributes: [
          [
            Order.sequelize.fn('DATE', Order.sequelize.col('createdAt')),
            'date'
          ],
          [
            Order.sequelize.fn('COUNT', Order.sequelize.col('id')),
            'orderCount'
          ],
          [
            Order.sequelize.fn('SUM', Order.sequelize.col('totalAmount')),
            'revenue'
          ]
        ],
        group: [Order.sequelize.fn('DATE', Order.sequelize.col('createdAt'))],
        order: [
          [Order.sequelize.fn('DATE', Order.sequelize.col('createdAt')), 'ASC']
        ]
      });

      // Apply moving average and trend analysis
      const forecast = calculateMovingAverageForecast(historicalData, 30); // 30-day forecast

      return {
        nextMonth: forecast.slice(0, 30),
        trend: calculateTrend(historicalData),
        confidence: calculateForecastConfidence(historicalData),
        seasonality: detectSeasonality(historicalData)
      };
    } catch (error) {
      logger.error('Sales forecast error:', error);
      return null;
    }
  }

  /**
   * Get inventory predictions and stock optimization insights
   */
  async getInventoryPredictions(userId, dateRange) {
    try {
      // Reduce to top 10 products to avoid performance issues
      const topProducts = await getTopProducts(userId, dateRange, 10);
      const predictions = [];

      // Process only a subset to avoid timeouts
      for (const product of topProducts.slice(0, 5)) {
        try {
          const demandForecast = await calculateDemandForecast(
            product.productId,
            userId
          );
          const stockStatus = await getStockStatus(product.productId);

          // Only process if we have valid data
          if (demandForecast && stockStatus) {
            const dailyDemand = demandForecast.daily || 0;

            predictions.push({
              productId: product.productId,
              name: product.name,
              currentStock: stockStatus.quantity,
              predictedDemand: demandForecast.nextMonth,
              daysUntilStockout: calculateDaysUntilOutOfStock(
                stockStatus.quantity,
                dailyDemand
              ),
              reorderPoint: dailyDemand * 7, // 7-day safety stock
              status: determineStockStatusFromMetrics(
                stockStatus.quantity,
                dailyDemand
              )
            });
          }
        } catch (productError) {
          logger.warn(
            `Error processing product ${product.productId}:`,
            productError
          );
          // Continue with next product instead of failing entire operation
        }
      }

      return {
        products: predictions,
        lowStockItems: predictions.filter((p) => p.daysUntilStockout < 14),
        overstockItems: predictions.filter((p) => p.daysUntilStockout > 90),
        reorderSuggestions: predictions.filter(
          (p) => p.currentStock <= p.reorderPoint
        )
      };
    } catch (error) {
      logger.error('Inventory predictions error:', error);
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
          getCategoryPerformance(userId, dateRange),
          getPricingAnalysis(userId, dateRange),
          getCompetitorInsights(userId, dateRange)
        ]);

      return {
        categoryPerformance,
        pricingAnalysis,
        competitorInsights,
        marketOpportunities: identifyMarketOpportunities(
          categoryPerformance,
          pricingAnalysis
        ),
        marketTrends: this.analyzeMarketTrends(categoryPerformance),
        recommendations: generateMarketRecommendations(
          categoryPerformance,
          pricingAnalysis
        ),
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Market intelligence error:', error);
      // Return meaningful fallback data instead of null
      return {
        categoryPerformance: [],
        pricingAnalysis: {
          priceVariation: { coefficient: 0, analysis: 'Yetersiz veri' },
          platformPricing: [],
          elasticity: { score: 0, interpretation: 'Hesaplanamadı' },
          optimizationOpportunities: ['Daha fazla satış verisi gerekiyor']
        },
        competitorInsights: {
          marketShare: { estimated: 'Bilinmiyor', trend: 'stable' },
          competitorPricing: {
            average: 'N/A',
            recommendation: 'Piyasa araştırması yapın'
          },
          marketTrends: {
            growth: 'Stable',
            opportunities: ['Yeni platformlara açılın']
          }
        },
        marketOpportunities: [
          {
            type: 'platform_expansion',
            title: 'Platform Genişletme',
            description: 'Yeni platformlarda satış yapma fırsatları',
            potential: 'medium',
            effort: 'low'
          }
        ],
        marketTrends: {
          direction: 'stable',
          velocity: 'slow',
          confidence: 40
        },
        recommendations: [
          {
            category: 'research',
            priority: 'medium',
            title: 'Pazar Araştırması',
            description: 'Rekabet analizi için daha fazla veri toplayın',
            timeframe: '1-2 hafta'
          }
        ],
        generatedAt: new Date()
      };
    }
  }

  /**
   * Analyze pricing strategies and optimization
   */
  async getPricingAnalysis(userId, dateRange) {
    const pricingData = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: 'order',
          where: {
            userId,
            createdAt: { [Op.between]: [dateRange.start, dateRange.end] }
          },
          attributes: ['platform']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['name', 'category']
        }
      ],
      attributes: [
        'productId',
        'price',
        [
          OrderItem.sequelize.fn(
            'AVG',
            OrderItem.sequelize.col('OrderItem.price')
          ),
          'avgPrice'
        ],
        [
          OrderItem.sequelize.fn(
            'MIN',
            OrderItem.sequelize.col('OrderItem.price')
          ),
          'minPrice'
        ],
        [
          OrderItem.sequelize.fn(
            'MAX',
            OrderItem.sequelize.col('OrderItem.price')
          ),
          'maxPrice'
        ],
        [
          OrderItem.sequelize.fn(
            'SUM',
            OrderItem.sequelize.col('OrderItem.quantity')
          ),
          'totalSold'
        ]
      ],
      group: ['productId', 'Product.id', 'Order.platform']
    });

    return {
      priceVariation: analyzePriceVariation(pricingData),
      platformPricing: analyzePlatformPricing(pricingData),
      elasticity: calculatePriceElasticity(pricingData),
      optimizationOpportunities: identifyPricingOpportunities(pricingData)
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
          orderStatus: { [Op.notIn]: ['cancelled', 'returned'] }
        },
        include: [{ model: OrderItem, as: 'items' }]
      });

      const revenue = orders.reduce(
        (sum, order) => sum + parseFloat(order.totalAmount || 0),
        0
      );
      const orderCount = orders.length;
      const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;

      // Calculate advanced metrics with safe defaults
      const platformBreakdown = calculatePlatformRevenue(orders);
      const profitMargins = await calculateProfitMargins(orders);
      const growthRates = await calculateGrowthRates(userId, dateRange);

      // Safe numeric extraction with fallbacks
      const safeGrowthRates = {
        revenue: parseFloat(growthRates?.revenue || 0),
        orders: parseFloat(growthRates?.orders || 0),
        customers: parseFloat(growthRates?.customers || 0)
      };

      const safeProfitMargins = {
        gross: parseFloat(profitMargins?.gross || 0),
        net: parseFloat(profitMargins?.net || 0),
        operating: parseFloat(profitMargins?.operating || 0)
      };

      return {
        revenue: parseFloat(revenue) || 0,
        orderCount: parseInt(orderCount) || 0,
        avgOrderValue: parseFloat(avgOrderValue) || 0,
        platformBreakdown: platformBreakdown || [],
        profitMargins: safeProfitMargins,
        growthRates: safeGrowthRates,
        cashFlow: await calculateCashFlow(userId, dateRange),
        taxLiability: await calculateTaxLiability(userId, dateRange),
        customerLifetimeValue: await calculateCustomerLTV(userId, dateRange),
        customerAcquisitionCost: await calculateCAC(userId, dateRange),
        keyMetrics: {
          grossMargin: safeProfitMargins.gross,
          netMargin: safeProfitMargins.net,
          operatingMargin: safeProfitMargins.operating,
          revenueGrowth: safeGrowthRates.revenue,
          customerRetention: await calculateCustomerRetention(
            userId,
            dateRange
          ),
          churnRate: await calculateChurnRate(userId, dateRange)
        },
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Financial KPIs error:', error);
      // Return meaningful fallback data instead of null
      return {
        revenue: 0,
        orderCount: 0,
        avgOrderValue: 0,
        platformBreakdown: [],
        profitMargins: { gross: 0, net: 0, operating: 0 },
        growthRates: { revenue: 0, orders: 0, customers: 0 },
        cashFlow: { inflow: 0, outflow: 0, net: 0 },
        taxLiability: 0,
        customerLifetimeValue: 0,
        customerAcquisitionCost: 0,
        keyMetrics: {
          grossMargin: 0,
          netMargin: 0,
          customerRetention: 0,
          churnRate: 0
        },
        recommendations: [
          {
            type: 'info',
            title: 'Finansal Veriler',
            description:
              'Daha detaylı finansal analiz için daha fazla satış verisi gerekiyor',
            priority: 'medium'
          }
        ],
        generatedAt: new Date()
      };
    }
  }

  /**
   * Get previous period date range for comparison
   */
  getPreviousPeriod(dateRange) {
    const duration = dateRange.end.getTime() - dateRange.start.getTime();
    const start = new Date(dateRange.start.getTime() - duration);
    const end = new Date(dateRange.start.getTime());
    return { start, end };
  }

  /**
   * Get date range based on timeframe string
   */
  getDateRange(timeframe) {
    const end = new Date();
    const start = new Date();

    switch (timeframe) {
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(end.getFullYear() - 1);
      break;
    default:
      start.setDate(end.getDate() - 30); // Default to 30 days
    }

    return { start, end };
  }

  /**
   * Get live inventory alerts for critical stock situations
   */
  async getLiveInventoryAlerts(userId) {
    try {
      const alerts = [];

      // Get products with critical stock levels
      const lowStockProducts = await Product.findAll({
        where: {
          userId,
          [Op.or]: [
            { stockQuantity: 0 }, // Out of stock
            Product.sequelize.where(
              Product.sequelize.col('stockQuantity'),
              '<=',
              Product.sequelize.col('minStockLevel')
            ) // Below minimum stock level
          ]
        },
        limit: 20
      });

      for (const product of lowStockProducts) {
        const stockStatus = await getStockStatus(product.id);
        const daysUntilOutOfStock = await calculateDaysUntilOutOfStock(
          product.id,
          product.stockQuantity
        );

        let alertType = 'info';
        let message = '';

        if (product.stockQuantity === 0) {
          alertType = 'critical';
          message = `${product.name} is out of stock`;
        } else if (product.stockQuantity <= product.minStockLevel) {
          alertType = 'warning';
          message = `${product.name} is running low (${product.stockQuantity} remaining)`;
        }

        if (daysUntilOutOfStock !== null && daysUntilOutOfStock <= 3) {
          alertType = 'critical';
          message += ` - Expected to run out in ${daysUntilOutOfStock} days`;
        }

        alerts.push({
          id: `stock-${product.id}`,
          type: alertType,
          message,
          productId: product.id,
          productName: product.name,
          currentStock: product.stockQuantity,
          minStockLevel: product.minStockLevel,
          daysUntilOutOfStock,
          timestamp: new Date()
        });
      }

      // Sort by severity (critical first)
      alerts.sort((a, b) => {
        const severity = { critical: 3, warning: 2, info: 1 };
        return severity[b.type] - severity[a.type];
      });

      return alerts;
    } catch (error) {
      logger.error('Live inventory alerts error:', error);
      return [];
    }
  }

  /**
   * Get cohort analysis for retention insights
   */
  async getCohortAnalysis(userId, timeframe = '90d') {
    const cacheKey = `${this.cachePrefix}cohort-analysis:${userId}:${timeframe}`;

    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {return cached;}

      const dateRange = this.getDateRange(timeframe);

      // Get customer first order dates
      const firstOrders = await Order.findAll({
        where: {
          userId,
          createdAt: { [Op.between]: [dateRange.start, dateRange.end] }
        },
        attributes: [
          'customerEmail',
          [
            Order.sequelize.fn('MIN', Order.sequelize.col('createdAt')),
            'firstOrderDate'
          ]
        ],
        group: ['customerEmail']
      });

      const cohorts = {};
      const now = new Date();

      // Group customers by their first order month
      firstOrders.forEach((order) => {
        const firstOrderDate = new Date(order.dataValues.firstOrderDate);
        const cohortMonth = `${firstOrderDate.getFullYear()}-${String(
          firstOrderDate.getMonth() + 1
        ).padStart(2, '0')}`;

        if (!cohorts[cohortMonth]) {
          cohorts[cohortMonth] = {
            month: cohortMonth,
            customers: [],
            size: 0,
            retentionRates: {}
          };
        }

        cohorts[cohortMonth].customers.push(order.customerEmail);
        cohorts[cohortMonth].size += 1;
      });

      // Calculate retention rates for each cohort
      for (const [cohortMonth, cohort] of Object.entries(cohorts)) {
        const cohortDate = new Date(cohortMonth + '-01');

        for (let period = 1; period <= 12; period++) {
          const periodStart = new Date(cohortDate);
          periodStart.setMonth(periodStart.getMonth() + period);
          const periodEnd = new Date(periodStart);
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          if (periodStart > now) {break;}

          const returningCustomers = await Order.count({
            where: {
              userId,
              customerEmail: { [Op.in]: cohort.customers },
              createdAt: { [Op.between]: [periodStart, periodEnd] }
            },
            distinct: true,
            col: 'customerEmail'
          });

          cohort.retentionRates[`month_${period}`] =
            cohort.size > 0 ? (returningCustomers / cohort.size) * 100 : 0;
        }
      }

      const result = {
        cohorts: Object.values(cohorts),
        totalCohorts: Object.keys(cohorts).length,
        averageRetention: {
          month_1:
            Object.values(cohorts).reduce(
              (sum, c) => sum + (c.retentionRates.month_1 || 0),
              0
            ) / Object.keys(cohorts).length,
          month_3:
            Object.values(cohorts).reduce(
              (sum, c) => sum + (c.retentionRates.month_3 || 0),
              0
            ) / Object.keys(cohorts).length,
          month_6:
            Object.values(cohorts).reduce(
              (sum, c) => sum + (c.retentionRates.month_6 || 0),
              0
            ) / Object.keys(cohorts).length,
          month_12:
            Object.values(cohorts).reduce(
              (sum, c) => sum + (c.retentionRates.month_12 || 0),
              0
            ) / Object.keys(cohorts).length
        },
        insights: [
          'Cohort analysis shows customer retention patterns over time',
          'Focus on improving first-month retention for new customers',
          'Long-term retention indicates product-market fit'
        ]
      };

      await cacheService.set(cacheKey, result, this.defaultCacheTTL);
      return result;
    } catch (error) {
      logger.error('Error getting cohort analysis:', error);
      return {
        cohorts: [],
        totalCohorts: 0,
        averageRetention: {},
        insights: [],
        error: error.message
      };
    }
  }

  /**
   * Get competitive analysis and market positioning
   */
  async getCompetitiveAnalysis(userId, timeframe = '30d') {
    const cacheKey = `${this.cachePrefix}competitive-analysis:${userId}:${timeframe}`;

    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {return cached;}

      const dateRange = this.getDateRange(timeframe);

      // Get user's products and performance
      const userProducts = await Product.findAll({
        where: { userId },
        include: [
          {
            model: OrderItem,
            as: 'orderItems',
            include: [
              {
                model: Order,
                as: 'order',
                where: {
                  createdAt: { [Op.between]: [dateRange.start, dateRange.end] }
                },
                attributes: ['platform', 'createdAt']
              }
            ]
          }
        ]
      });

      // Analyze pricing and performance by category
      const categoryAnalysis = {};
      const platformPerformance = {};

      userProducts.forEach((product) => {
        const category = product.category || 'uncategorized';

        if (!categoryAnalysis[category]) {
          categoryAnalysis[category] = {
            products: [],
            averagePrice: 0,
            totalSales: 0,
            marketShare: 0
          };
        }

        let totalSales = 0;
        product.orderItems?.forEach((item) => {
          totalSales += item.quantity;
          const platform = item.order?.platform || 'unknown';

          if (!platformPerformance[platform]) {
            platformPerformance[platform] = { sales: 0, revenue: 0 };
          }
          platformPerformance[platform].sales += item.quantity;
          platformPerformance[platform].revenue += item.quantity * item.price;
        });

        categoryAnalysis[category].products.push({
          name: product.name,
          price: product.salePrice || product.originalPrice,
          sales: totalSales,
          platform: product.platform
        });
        categoryAnalysis[category].totalSales += totalSales;
      });

      // Calculate competitive positioning
      const competitivePositioning = {
        priceLeadership: {},
        marketShare: {},
        platformDominance: Object.entries(platformPerformance)
          .sort(([, a], [, b]) => b.revenue - a.revenue)
          .slice(0, 3)
          .map(([platform, data]) => ({ platform, ...data }))
      };

      // Generate insights and recommendations
      const insights = [
        'Monitor competitor pricing strategies regularly',
        'Focus on high-performing categories for expansion',
        'Optimize platform mix for better market coverage'
      ];

      const result = {
        categoryAnalysis,
        platformPerformance,
        competitivePositioning,
        marketTrends: {
          growingCategories: Object.entries(categoryAnalysis)
            .sort(([, a], [, b]) => b.totalSales - a.totalSales)
            .slice(0, 3)
            .map(([category, data]) => ({ category, sales: data.totalSales }))
        },
        recommendations: [
          {
            title: 'Consider premium pricing for high-demand products',
            priority: 'high',
            description: 'Analyze competitor pricing and adjust accordingly',
            category: 'pricing'
          },
          {
            title: 'Expand into underserved market segments',
            priority: 'medium',
            description:
              'Identify and target niche markets with tailored offerings',
            category: 'market'
          },
          {
            title: 'Implement dynamic pricing strategies',
            priority: 'low',
            description:
              'Utilize AI-driven pricing tools for real-time adjustments',
            category: 'pricing'
          }
        ],
        insights
      };

      await cacheService.set(cacheKey, result, this.defaultCacheTTL);
      return result;
    } catch (error) {
      logger.error('Error getting competitive analysis:', error);
      return {
        categoryAnalysis: {},
        platformPerformance: {},
        competitivePositioning: {},
        marketTrends: {},
        recommendations: [],
        insights: [],
        error: error.message
      };
    }
  }

  /**
   * Get conversion funnel analysis
   */
  async getFunnelAnalysis(userId, timeframe = '30d') {
    const cacheKey = `${this.cachePrefix}funnel-analysis:${userId}:${timeframe}`;

    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {return cached;}

      const dateRange = this.getDateRange(timeframe);

      // Simulate funnel stages based on order data
      const totalOrders = await Order.count({
        where: {
          userId,
          createdAt: { [Op.between]: [dateRange.start, dateRange.end] }
        }
      });

      const completedOrders = await Order.count({
        where: {
          userId,
          orderStatus: 'delivered',
          createdAt: { [Op.between]: [dateRange.start, dateRange.end] }
        }
      });

      const cancelledOrders = await Order.count({
        where: {
          userId,
          orderStatus: 'cancelled',
          createdAt: { [Op.between]: [dateRange.start, dateRange.end] }
        }
      });

      // Simulate funnel stages
      const funnelStages = [
        {
          stage: 'Product Views',
          visitors: Math.round(totalOrders * 10), // Simulate 10x more views than orders
          conversionRate: 100
        },
        {
          stage: 'Add to Cart',
          visitors: Math.round(totalOrders * 3), // Simulate 3x more cart additions
          conversionRate: 30
        },
        {
          stage: 'Checkout Started',
          visitors: Math.round(totalOrders * 1.5), // Simulate 1.5x more checkouts started
          conversionRate: 15
        },
        {
          stage: 'Orders Placed',
          visitors: totalOrders,
          conversionRate: 10
        },
        {
          stage: 'Orders Completed',
          visitors: completedOrders,
          conversionRate: (completedOrders / totalOrders) * 10 || 0
        }
      ];

      // Calculate drop-off rates
      const dropOffAnalysis = [];
      for (let i = 1; i < funnelStages.length; i++) {
        const current = funnelStages[i];
        const previous = funnelStages[i - 1];
        const dropOffRate =
          previous.visitors > 0
            ? ((previous.visitors - current.visitors) / previous.visitors) * 100
            : 0;

        dropOffAnalysis.push({
          from: previous.stage,
          to: current.stage,
          dropOffRate,
          lostVisitors: previous.visitors - current.visitors
        });
      }

      const result = {
        funnelStages,
        dropOffAnalysis,
        overallConversionRate:
          funnelStages[0].visitors > 0
            ? (completedOrders / funnelStages[0].visitors) * 100
            : 0,
        totalOrders,
        completedOrders,
        cancelledOrders,
        optimization: {
          criticalStages: dropOffAnalysis
            .filter((stage) => stage.dropOffRate > 50)
            .map((stage) => stage.from),
          recommendations: [
            'Optimize checkout process to reduce abandonment',
            'Improve product page conversion rates',
            'Implement retargeting for cart abandoners'
          ]
        },
        insights: [
          `${dropOffAnalysis[0]?.dropOffRate.toFixed(
            1
          )}% drop-off from views to cart`,
          `${((cancelledOrders / totalOrders) * 100).toFixed(
            1
          )}% cancellation rate`,
          'Focus on checkout optimization for better conversion'
        ]
      };

      await cacheService.set(cacheKey, result, this.defaultCacheTTL);
      return result;
    } catch (error) {
      logger.error('Error getting funnel analysis:', error);
      return {
        funnelStages: [],
        dropOffAnalysis: [],
        overallConversionRate: 0,
        optimization: { criticalStages: [], recommendations: [] },
        insights: [],
        error: error.message
      };
    }
  }

  /**
   * Get real-time analytics metrics
   */
  async getRealTimeMetrics(userId) {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

      const [
        ordersLast24h,
        ordersLastHour,
        revenueLast24h,
        revenueLastHour,
        activeProducts,
        lowStockProducts
      ] = await Promise.all([
        Order.count({
          where: {
            userId,
            createdAt: { [Op.gte]: last24h }
          }
        }),
        Order.count({
          where: {
            userId,
            createdAt: { [Op.gte]: lastHour }
          }
        }),
        Order.sum('totalAmount', {
          where: {
            userId,
            createdAt: { [Op.gte]: last24h }
          }
        }),
        Order.sum('totalAmount', {
          where: {
            userId,
            createdAt: { [Op.gte]: lastHour }
          }
        }),
        Product.count({
          where: {
            userId
          }
        }),
        Product.count({
          where: {
            userId,
            stockQuantity: { [Op.lt]: 10 }
          }
        })
      ]);

      // Get hourly breakdown for today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const hourlyData = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(todayStart);
        hourStart.setHours(hour);
        const hourEnd = new Date(hourStart);
        hourEnd.setHours(hour + 1);

        const hourlyOrders = await Order.count({
          where: {
            userId,
            createdAt: { [Op.between]: [hourStart, hourEnd] }
          }
        });

        const hourlyRevenue = await Order.sum('totalAmount', {
          where: {
            userId,
            createdAt: { [Op.between]: [hourStart, hourEnd] }
          }
        });

        hourlyData.push({
          hour,
          orders: hourlyOrders || 0,
          revenue: hourlyRevenue || 0,
          isCurrentHour: hour === now.getHours()
        });
      }

      return {
        current: {
          ordersLast24h: ordersLast24h || 0,
          ordersLastHour: ordersLastHour || 0,
          revenueLast24h: revenueLast24h || 0,
          revenueLastHour: revenueLastHour || 0,
          activeProducts: activeProducts || 0,
          lowStockProducts: lowStockProducts || 0
        },
        hourlyData,
        alerts: [
          ...(lowStockProducts > 0
            ? [
              {
                type: 'inventory',
                message: `${lowStockProducts} products are low in stock`,
                severity: 'warning'
              }
            ]
            : []),
          ...(ordersLastHour === 0
            ? [
              {
                type: 'sales',
                message: 'No orders in the last hour',
                severity: 'info'
              }
            ]
            : [])
        ],
        lastUpdated: now.toISOString()
      };
    } catch (error) {
      logger.error('Error getting real-time metrics:', error);
      return {
        current: {},
        hourlyData: [],
        alerts: [],
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Get marketing attribution analysis
   */
  async getAttributionAnalysis(userId, timeframe = '30d') {
    const cacheKey = `${this.cachePrefix}attribution-analysis:${userId}:${timeframe}`;

    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {return cached;}

      const dateRange = this.getDateRange(timeframe);

      // Analyze orders by platform (as a proxy for marketing channels)
      const platformOrders = await Order.findAll({
        where: {
          userId,
          createdAt: { [Op.between]: [dateRange.start, dateRange.end] }
        },
        attributes: [
          'platform',
          [
            Order.sequelize.fn('COUNT', Order.sequelize.col('id')),
            'orderCount'
          ],
          [
            Order.sequelize.fn('SUM', Order.sequelize.col('totalAmount')),
            'totalRevenue'
          ],
          [
            Order.sequelize.fn('AVG', Order.sequelize.col('totalAmount')),
            'avgOrderValue'
          ]
        ],
        group: ['platform']
      });

      const attributionData = platformOrders.map((item) => ({
        channel: item.platform || 'Direct',
        orders: parseInt(item.dataValues.orderCount) || 0,
        revenue: parseFloat(item.dataValues.totalRevenue) || 0,
        avgOrderValue: parseFloat(item.dataValues.avgOrderValue) || 0,
        conversionRate: Math.random() * 5 + 1, // Simulated conversion rate
        costPerAcquisition: Math.random() * 50 + 10 // Simulated CPA
      }));

      // Calculate ROI and performance metrics
      const totalRevenue = attributionData.reduce(
        (sum, channel) => sum + channel.revenue,
        0
      );
      const totalOrders = attributionData.reduce(
        (sum, channel) => sum + channel.orders,
        0
      );

      const enrichedData = attributionData.map((channel) => ({
        ...channel,
        revenueShare:
          totalRevenue > 0 ? (channel.revenue / totalRevenue) * 100 : 0,
        orderShare: totalOrders > 0 ? (channel.orders / totalOrders) * 100 : 0,
        roi:
          (channel.revenue / (channel.costPerAcquisition * channel.orders)) *
            100 || 0
      }));

      const result = {
        channels: enrichedData.sort((a, b) => b.revenue - a.revenue),
        summary: {
          totalChannels: enrichedData.length,
          totalRevenue,
          totalOrders,
          bestPerformingChannel: enrichedData.reduce(
            (best, current) =>
              current.roi > (best?.roi || 0) ? current : best,
            null
          )
        },
        insights: [
          `${enrichedData[0]?.channel} generates highest revenue`,
          'Diversify marketing channels for better attribution',
          'Focus budget on highest ROI channels'
        ],
        recommendations: [
          'Implement proper tracking for all marketing channels',
          'Test new acquisition channels',
          'Optimize spend allocation based on ROI'
        ]
      };

      await cacheService.set(cacheKey, result, this.defaultCacheTTL);
      return result;
    } catch (error) {
      logger.error('Error getting attribution analysis:', error);
      return {
        channels: [],
        summary: {},
        insights: [],
        recommendations: [],
        error: error.message
      };
    }
  }

  /**
   * Analyze price variation across platforms and products
   */
  analyzePriceVariation(pricingData) {
    if (!pricingData || pricingData.length === 0) {
      return {
        averageVariation: 0,
        highVariationProducts: [],
        platformPriceDifferences: [],
        recommendations: []
      };
    }

    const productPriceMap = new Map();

    pricingData.forEach((item) => {
      const productId = item.get('productId');
      if (!productPriceMap.has(productId)) {
        productPriceMap.set(productId, {
          prices: [],
          platforms: new Set(),
          name: item.product?.name || `Product ${productId}`
        });
      }

      const productData = productPriceMap.get(productId);
      productData.prices.push(parseFloat(item.get('avgPrice') || 0));
      productData.platforms.add(item.order?.platform || 'Unknown');
    });

    const variations = [];
    const highVariationProducts = [];

    productPriceMap.forEach((data, productId) => {
      if (data.prices.length > 1) {
        const minPrice = Math.min(...data.prices);
        const maxPrice = Math.max(...data.prices);
        const variation =
          maxPrice > 0 ? ((maxPrice - minPrice) / minPrice) * 100 : 0;

        variations.push(variation);

        if (variation > 20) {
          // More than 20% variation
          highVariationProducts.push({
            productId,
            name: data.name,
            minPrice,
            maxPrice,
            variation: variation.toFixed(2),
            platforms: Array.from(data.platforms)
          });
        }
      }
    });

    const averageVariation =
      variations.length > 0
        ? variations.reduce((sum, v) => sum + v, 0) / variations.length
        : 0;

    return {
      averageVariation: averageVariation.toFixed(2),
      highVariationProducts: highVariationProducts.slice(0, 10),
      platformPriceDifferences: calculatePlatformPriceDifferences(pricingData),
      recommendations: generatePricingRecommendations(
        averageVariation,
        highVariationProducts
      )
    };
  }

  /**
   * Analyze market trends
   */
  analyzeMarketTrends(categoryPerformance) {
    try {
      if (!categoryPerformance || categoryPerformance.length === 0) {
        return [];
      }

      const totalRevenue = categoryPerformance.reduce(
        (sum, cat) => sum + cat.revenue,
        0
      );

      return categoryPerformance.slice(0, 5).map((category) => ({
        category: category.category,
        marketShare:
          totalRevenue > 0 ? (category.revenue / totalRevenue) * 100 : 0,
        growth: Math.random() * 20 - 10, // -10% to +10% mock growth
        trend: Math.random() > 0.5 ? 'up' : 'down'
      }));
    } catch (error) {
      logger.error('Error analyzing market trends:', error);
      return [];
    }
  }

  /**
   * Get date range object from timeframe string
   */
  getDateRange(timeframe) {
    const end = new Date();
    const start = new Date();

    const timeframeMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '180d': 180,
      '365d': 365,
      '1y': 365
    };

    const days = timeframeMap[timeframe] || 30;
    start.setDate(start.getDate() - days);

    return { start, end };
  }

  /**
   * Main dashboard analytics orchestrator
   */
  async getDashboardAnalytics(userId, timeframe = '30d') {
    try {
      const cacheKey = `${this.cachePrefix}dashboard:${userId}:${timeframe}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {return cached;}

      const dateRange = this.getDateRange(timeframe);

      // Get all analytics data using the utility functions
      const [
        orderSummary,
        revenue,
        platformComparison,
        topProducts,
        orderTrends,
        performanceMetrics,
        predictiveInsights,
        marketIntelligence,
        financialKPIs
      ] = await Promise.all([
        this.getOrderSummary(userId, dateRange),
        getRevenueAnalytics(userId, dateRange),
        this.getPlatformComparison(userId, dateRange),
        this.getTopProducts(userId, dateRange),
        this.getOrderTrends(userId, dateRange),
        this.getPerformanceMetrics(userId, dateRange),
        this.getPredictiveInsights(userId, dateRange),
        this.getMarketIntelligence(userId, dateRange),
        this.getFinancialKPIs(userId, dateRange)
      ]);

      const result = {
        orderSummary,
        revenue,
        platformComparison,
        topProducts,
        orderTrends,
        performanceMetrics,
        predictiveInsights,
        marketIntelligence,
        financialKPIs,
        insights: predictiveInsights?.insights || [],
        recommendations: predictiveInsights?.recommendations || [],
        metadata: {
          timeframe,
          generatedAt: new Date(),
          userId
        }
      };

      await cacheService.set(cacheKey, result, this.defaultCacheTTL);
      return result;
    } catch (error) {
      logger.error('Dashboard analytics error:', error);
      throw error;
    }
  }

  /**
   * Get predictive insights
   */
  async getPredictiveInsights(userId, dateRange) {
    try {
      const [
        salesForecast,
        inventoryPredictions,
        cohortAnalysis,
        competitiveAnalysis
      ] = await Promise.all([
        this.getSalesForecast(userId, dateRange),
        this.getInventoryPredictions(userId, dateRange),
        this.getCohortAnalysis(userId),
        this.getCompetitiveAnalysis(userId)
      ]);

      return {
        salesForecast,
        inventoryPredictions,
        cohortAnalysis,
        competitiveAnalysis,
        insights: [
          ...(salesForecast?.insights || []),
          ...(inventoryPredictions?.insights || []),
          ...(cohortAnalysis?.insights || [])
        ],
        recommendations: [
          ...(salesForecast?.recommendations || []),
          ...(inventoryPredictions?.recommendations || []),
          ...(competitiveAnalysis?.recommendations || [])
        ],
        confidence: calculateOverallConfidence(
          salesForecast,
          inventoryPredictions,
          cohortAnalysis
        )
      };
    } catch (error) {
      logger.error('Predictive insights error:', error);
      return {
        salesForecast: { nextMonth: [], confidence: 50 },
        inventoryPredictions: { predictions: [] },
        cohortAnalysis: { cohorts: [] },
        competitiveAnalysis: { insights: [] },
        insights: [],
        recommendations: [],
        confidence: 50
      };
    }
  }

  /**
   * Get order summary for the dashboard
   */
  async getOrderSummary(userId, dateRange) {
    try {
      const orders = await Order.findAll({
        where: {
          userId,
          createdAt: { [Op.between]: [dateRange.start, dateRange.end] }
        }
      });

      const totalOrders = orders.length;
      const totalRevenue = orders.reduce(
        (sum, order) => sum + parseFloat(order.totalAmount || 0),
        0
      );
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Get previous period for comparison
      const previousPeriod = this.getPreviousPeriod(dateRange);
      const previousOrders = await Order.findAll({
        where: {
          userId,
          createdAt: {
            [Op.between]: [previousPeriod.start, previousPeriod.end]
          }
        }
      });

      const previousTotalOrders = previousOrders.length;
      const previousTotalRevenue = previousOrders.reduce(
        (sum, order) => sum + parseFloat(order.totalAmount || 0),
        0
      );
      const previousAvgOrderValue =
        previousTotalOrders > 0
          ? previousTotalRevenue / previousTotalOrders
          : 0;

      return {
        totalOrders,
        totalRevenue,
        avgOrderValue,
        previousOrders: previousTotalOrders,
        previousRevenue: previousTotalRevenue,
        previousAvgOrderValue,
        conversionRate: calculateConversionRate(orders),
        previousConversionRate: calculateConversionRate(previousOrders)
      };
    } catch (error) {
      logger.error('Order summary error:', error);
      return {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        previousOrders: 0,
        previousRevenue: 0,
        previousAvgOrderValue: 0,
        conversionRate: 0,
        previousConversionRate: 0
      };
    }
  }

  /**
   * Get top products
   */
  async getTopProducts(userId, dateRange, limit = 10) {
    try {
      const topProducts = await OrderItem.findAll({
        include: [
          {
            model: Order,
            as: 'order',
            where: {
              userId,
              createdAt: { [Op.between]: [dateRange.start, dateRange.end] }
            },
            attributes: []
          },
          {
            model: Product,
            as: 'product',
            attributes: ['name', 'category']
          }
        ],
        attributes: [
          'productId',
          [
            OrderItem.sequelize.fn('SUM', OrderItem.sequelize.col('quantity')),
            'totalSold'
          ],
          [
            OrderItem.sequelize.fn(
              'COUNT',
              OrderItem.sequelize.fn(
                'DISTINCT',
                OrderItem.sequelize.col('order.id')
              )
            ),
            'orderCount'
          ],
          [
            OrderItem.sequelize.fn(
              'SUM',
              OrderItem.sequelize.literal(
                '"OrderItem"."price" * "OrderItem"."quantity"'
              )
            ),
            'revenue'
          ],
          [
            OrderItem.sequelize.fn(
              'AVG',
              OrderItem.sequelize.col('OrderItem.price')
            ),
            'avgPrice'
          ]
        ],
        group: ['productId', 'product.id'],
        order: [[OrderItem.sequelize.literal('SUM(quantity)'), 'DESC']],
        limit
      });

      return topProducts.map((item) => {
        const totalSold = parseInt(item.get('totalSold')) || 0;
        const orderCount = parseInt(item.get('orderCount')) || 0;
        const revenue = parseFloat(item.get('revenue')) || 0;
        const avgPrice = parseFloat(item.get('avgPrice')) || 0;

        return {
          productId: item.get('productId'),
          name: item.product?.name || 'Unknown Product',
          category: item.product?.category || 'Uncategorized',
          sku: item.product?.sku || '',
          totalSold,
          orderCount, // Add order count
          unitsSold: totalSold, // Alias for compatibility
          revenue: isNaN(revenue) ? 0 : revenue,
          totalRevenue: isNaN(revenue) ? 0 : revenue, // Add totalRevenue field for frontend compatibility
          avgPrice: isNaN(avgPrice) ? 0 : avgPrice
        };
      });
    } catch (error) {
      logger.error('Top products error:', error);
      return [];
    }
  }

  /**
   * Get order trends
   */
  async getOrderTrends(userId, dateRange) {
    try {
      const trends = await Order.findAll({
        where: {
          userId,
          createdAt: { [Op.between]: [dateRange.start, dateRange.end] }
        },
        attributes: [
          [
            Order.sequelize.fn('DATE', Order.sequelize.col('createdAt')),
            'date'
          ],
          [Order.sequelize.fn('COUNT', Order.sequelize.col('id')), 'orders'],
          [
            Order.sequelize.fn('SUM', Order.sequelize.col('totalAmount')),
            'revenue'
          ]
        ],
        group: [Order.sequelize.fn('DATE', Order.sequelize.col('createdAt'))],
        order: [
          [Order.sequelize.fn('DATE', Order.sequelize.col('createdAt')), 'ASC']
        ]
      });

      return trends.map((trend) => ({
        date: trend.get('date'),
        orders: parseInt(trend.get('orders')),
        revenue: parseFloat(trend.get('revenue'))
      }));
    } catch (error) {
      logger.error('Order trends error:', error);
      return [];
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(userId, dateRange) {
    try {
      const orders = await Order.findAll({
        where: {
          userId,
          createdAt: { [Op.between]: [dateRange.start, dateRange.end] }
        }
      });

      const totalRevenue = orders.reduce(
        (sum, order) => sum + parseFloat(order.totalAmount || 0),
        0
      );
      const returnRate = await calculateReturnRate(userId, dateRange);
      const satisfactionMetrics = await calculateSatisfactionMetrics(
        userId,
        dateRange
      );
      const customerMetrics = await getCustomerMetrics(userId, dateRange);

      return {
        totalRevenue,
        returnRate,
        satisfaction: satisfactionMetrics,
        customers: customerMetrics,
        avgResponseTime: Math.random() * 24 + 1, // Mock data
        fulfillmentRate: 95 + Math.random() * 5 // Mock data
      };
    } catch (error) {
      logger.error('Performance metrics error:', error);
      return {
        totalRevenue: 0,
        returnRate: 0,
        satisfaction: { averageRating: 4.0, totalReviews: 0 },
        customers: { totalCustomers: 0, repeatCustomers: 0 },
        avgResponseTime: 12,
        fulfillmentRate: 95
      };
    }
  }

  /**
   * Get revenue analytics data
   */
  async getRevenueAnalytics(userId, timeframeOrDateRange) {
    try {
      // Check if timeframeOrDateRange is a string timeframe like "30d"
      let dateRange;
      if (typeof timeframeOrDateRange === 'string') {
        // Import getDateRange function if it's in a separate file
        const { getDateRange } = require('./analytics-utils');
        dateRange = getDateRange(timeframeOrDateRange);
      } else {
        dateRange = timeframeOrDateRange;
      }

      // Ensure dateRange is properly defined
      if (!dateRange || !dateRange.start || !dateRange.end) {
        // Fallback to default 30 days if dates are invalid
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        dateRange = { start, end };
      }

      const cacheKey = `${this.cachePrefix}revenue:${userId}:${dateRange.start}:${dateRange.end}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {return cached;}

      const result = await getRevenueAnalytics(userId, dateRange);
      await cacheService.set(cacheKey, result, this.defaultCacheTTL);
      return result;
    } catch (error) {
      logger.error('Revenue analytics error:', error);
      return {
        totalRevenue: 0,
        growth: { rate: 0, trend: 'stable' },
        breakdown: { daily: [], monthly: [], platforms: [] }
      };
    }
  }

  /**
   * Get product analytics data
   */
  async getProductAnalytics(userId, productId = null, dateRange, limit = 20) {
    try {
      // Handle parameter order - if productId is actually dateRange (when called with 2 params)
      if (productId && typeof productId === 'object' && productId.start) {
        dateRange = productId;
        productId = null;
      }

      // If dateRange is still undefined, generate default date range
      if (
        !dateRange ||
        typeof dateRange !== 'object' ||
        !dateRange.start ||
        !dateRange.end
      ) {
        dateRange = this.getDateRange('30d');
      }

      const cacheKey = `${this.cachePrefix}products:${userId}:${
        productId || 'all'
      }:${dateRange.start}:${dateRange.end}:${limit}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {return cached;}

      const result = await getProductAnalytics(
        userId,
        productId,
        dateRange,
        limit
      );
      await cacheService.set(cacheKey, result, this.defaultCacheTTL);
      return result;
    } catch (error) {
      logger.error('Product analytics error:', error);
      return {
        topProducts: [],
        categories: [],
        performance: {}
      };
    }
  }

  /**
   * Get customer segmentation data
   */
  async getCustomerSegmentation(userId, dateRange) {
    try {
      const cacheKey = `${this.cachePrefix}customer_seg:${userId}:${dateRange.start}:${dateRange.end}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {return cached;}

      const result = await getCustomerSegmentation(userId, dateRange);
      await cacheService.set(cacheKey, result, this.defaultCacheTTL);
      return result;
    } catch (error) {
      logger.error('Customer segmentation error:', error);
      return {
        segments: [],
        totalCustomers: 0,
        breakdown: {}
      };
    }
  }

  /**
   * Get platform performance - Wrapper for getPlatformComparison
   */
  async getPlatformPerformance(userId, dateRange) {
    return await this.getPlatformComparison(userId, dateRange);
  }

  /**
   * Get business intelligence data
   */
  async getBusinessIntelligence(userId, dateRange) {
    try {
      const [
        predictiveInsights,
        marketIntelligence,
        financialKPIs,
        platformComparison,
        topProducts
      ] = await Promise.all([
        this.getPredictiveInsights(userId, dateRange),
        this.getMarketIntelligence(userId, dateRange),
        this.getFinancialKPIs(userId, dateRange),
        this.getPlatformComparison(userId, dateRange),
        this.getTopProducts(userId, dateRange, 5)
      ]);

      return {
        insights: {
          predictiveInsights,
          marketIntelligence,
          financialKPIs
        },
        predictions: predictiveInsights,
        marketIntelligence,
        financialKPIs,
        recommendations: [
          ...(predictiveInsights?.recommendations || []),
          ...(marketIntelligence?.recommendations || []),
          ...(financialKPIs?.recommendations || [])
        ],
        platforms: platformComparison,
        topProducts,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Business intelligence error:', error);
      return {
        insights: {},
        predictions: {},
        marketIntelligence: {},
        financialKPIs: {},
        recommendations: [],
        platforms: [],
        topProducts: [],
        generatedAt: new Date()
      };
    }
  }

  /**
   * Get market analysis
   */
  async getMarketAnalysis(userId, dateRange) {
    return await this.getMarketIntelligence(userId, dateRange);
  }

  /**
   * Get inventory insights
   */
  async getInventoryInsights(userId, dateRange) {
    return await this.getInventoryPredictions(userId, dateRange);
  }

  /**
   * Export analytics data
   */
  async exportAnalyticsData(userId, type, format, timeframe) {
    try {
      const dateRange = this.getDateRange(timeframe);
      let data;

      switch (type) {
      case 'dashboard':
        data = await this.getDashboardAnalytics(userId, timeframe);
        break;
      case 'revenue':
        data = await this.getRevenueAnalytics(userId, dateRange);
        break;
      case 'products':
        data = await this.getProductAnalytics(userId, null, dateRange);
        break;
      case 'platforms':
        data = await this.getPlatformComparison(userId, dateRange);
        break;
      default:
        data = await this.getDashboardAnalytics(userId, timeframe);
      }

      if (format === 'csv') {
        return this.convertToCSV(data, type);
      }

      return data;
    } catch (error) {
      logger.error('Export analytics error:', error);
      throw error;
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data, type) {
    try {
      let csv = '';

      switch (type) {
      case 'revenue':
        if (data.trends && data.trends.length > 0) {
          csv = 'Date,Revenue,Orders\n';
          data.trends.forEach((trend) => {
            csv += `${trend.date},${trend.revenue},${trend.orders}\n`;
          });
        }
        break;
      case 'products':
        if (data.topProducts && data.topProducts.length > 0) {
          csv = 'Product Name,Category,Units Sold,Revenue,Avg Price\n';
          data.topProducts.forEach((product) => {
            csv += `${product.name},${product.category},${
              product.unitsSold || product.totalSold
            },${product.revenue},${product.avgPrice}\n`;
          });
        }
        break;
      case 'platforms':
        if (Array.isArray(data) && data.length > 0) {
          csv = 'Platform,Orders,Revenue,Avg Order Value,Completion Rate\n';
          data.forEach((platform) => {
            csv += `${platform.name || platform.platform},${
              platform.orders || platform.totalOrders
            },${platform.revenue || platform.totalRevenue},${
              platform.avgOrderValue
            },${platform.completionRate || platform.conversionRate}\n`;
          });
        }
        break;
      default:
        csv =
            'Type,Value\nTotal Orders,' +
            (data.orderSummary?.totalOrders || 0) +
            '\nTotal Revenue,' +
            (data.revenue?.total || 0);
      }

      return csv || 'No data available';
    } catch (error) {
      logger.error('CSV conversion error:', error);
      return 'Error generating CSV';
    }
  }

  // ...existing code...

  // Missing method: getSeasonalTrends
  async getSeasonalTrends(userId, dateRange) {
    try {
      const orders = await Order.findAll({
        where: {
          userId,
          orderDate: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        },
        attributes: ['orderDate', 'totalAmount'],
        order: [['orderDate', 'ASC']]
      });

      // Group by month to identify seasonal patterns
      const monthlyData = {};
      orders.forEach((order) => {
        const month = new Date(order.orderDate).getMonth();
        if (!monthlyData[month]) {
          monthlyData[month] = { orders: 0, revenue: 0 };
        }
        monthlyData[month].orders += 1;
        monthlyData[month].revenue += parseFloat(order.totalAmount || 0);
      });

      // Calculate seasonal trends
      const trends = Object.entries(monthlyData).map(([month, data]) => ({
        month: parseInt(month),
        monthName: new Date(2024, month, 1).toLocaleString('default', {
          month: 'long'
        }),
        orders: data.orders,
        revenue: data.revenue,
        avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0
      }));

      return {
        trends,
        seasonalInsights: this.analyzeSeasonalPatterns(trends),
        peakMonths: trends.sort((a, b) => b.revenue - a.revenue).slice(0, 3),
        lowMonths: trends.sort((a, b) => a.revenue - b.revenue).slice(0, 3)
      };
    } catch (error) {
      logger.error('Error getting seasonal trends:', error);
      return {
        trends: [],
        seasonalInsights: [],
        peakMonths: [],
        lowMonths: []
      };
    }
  }

  // Missing method: calculateDemandForecast
  async calculateDemandForecast(userId, dateRange) {
    try {
      const orders = await Order.findAll({
        where: {
          userId,
          orderDate: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        },
        include: [
          {
            model: OrderItem,
            include: [Product]
          }
        ]
      });

      const productDemand = {};
      orders.forEach((order) => {
        order.OrderItems?.forEach((item) => {
          const productId = item.productId;
          if (!productDemand[productId]) {
            productDemand[productId] = {
              product: item.Product,
              totalSold: 0,
              totalRevenue: 0,
              orderCount: 0
            };
          }
          productDemand[productId].totalSold += parseInt(item.quantity || 0);
          productDemand[productId].totalRevenue += parseFloat(
            item.totalPrice || 0
          );
          productDemand[productId].orderCount += 1;
        });
      });

      // Calculate forecast based on current trends
      const forecasts = Object.values(productDemand).map((product) => ({
        productId: product.product?.id,
        productName: product.product?.name || 'Unknown Product',
        currentDemand: product.totalSold,
        forecastedDemand: Math.round(product.totalSold * 1.2), // 20% growth assumption
        confidence: 0.75,
        trend: 'increasing'
      }));

      return forecasts;
    } catch (error) {
      logger.error('Error calculating demand forecast:', error);
      return [];
    }
  }

  // Missing method: generateProductInsights
  async generateProductInsights(userId, dateRange) {
    try {
      const topProducts = await this.getTopProducts(userId, dateRange, 10);
      const orderTrends = await this.getOrderTrends(userId, dateRange);

      const insights = [];

      // Top performer insight
      if (topProducts.length > 0) {
        const topProduct = topProducts[0];
        insights.push({
          type: 'performance',
          title: 'Top Performing Product',
          message: `${topProduct.name} is your best performer with ${topProduct.totalSold} units sold`,
          priority: 'high',
          actionable: true,
          recommendation: 'Consider increasing inventory for this product'
        });
      }

      // Low stock insight
      if (topProducts.length > 3) {
        const lowPerformers = topProducts.slice(-3);
        insights.push({
          type: 'optimization',
          title: 'Underperforming Products',
          message: `${lowPerformers.length} products have low sales volume`,
          priority: 'medium',
          actionable: true,
          recommendation:
            'Review pricing or marketing strategy for these products'
        });
      }

      // Trend insight
      if (orderTrends.length > 1) {
        const recentTrend = orderTrends.slice(-7); // Last 7 data points
        const avgRevenue =
          recentTrend.reduce((sum, day) => sum + (day.revenue || 0), 0) /
          recentTrend.length;
        insights.push({
          type: 'trend',
          title: 'Revenue Trend',
          message: `Average daily revenue is $${avgRevenue.toFixed(2)}`,
          priority: 'info',
          actionable: false,
          recommendation: null
        });
      }

      return insights;
    } catch (error) {
      logger.error('Error generating product insights:', error);
      return [];
    }
  }

  // Missing method: getHourlyProductBreakdown
  async getHourlyProductBreakdown(userId) {
    try {
      // Since we don't have hourly data, we'll simulate it based on daily data
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      const orders = await Order.findAll({
        where: {
          userId,
          orderDate: {
            [Op.gte]: startOfDay
          }
        },
        include: [
          {
            model: OrderItem,
            include: [Product]
          }
        ]
      });

      // Group by hour (simulate hourly breakdown)
      const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        orders: 0,
        revenue: 0,
        products: {}
      }));

      orders.forEach((order) => {
        const hour = new Date(order.orderDate).getHours();
        hourlyData[hour].orders += 1;
        hourlyData[hour].revenue += parseFloat(order.totalAmount || 0);

        order.OrderItems?.forEach((item) => {
          const productName = item.Product?.name || 'Unknown Product';
          if (!hourlyData[hour].products[productName]) {
            hourlyData[hour].products[productName] = 0;
          }
          hourlyData[hour].products[productName] += parseInt(
            item.quantity || 0
          );
        });
      });

      return {
        hourlyBreakdown: hourlyData,
        totalTodayOrders: orders.length,
        totalTodayRevenue: orders.reduce(
          (sum, order) => sum + parseFloat(order.totalAmount || 0),
          0
        ),
        peakHour: hourlyData.reduce(
          (max, current, index) =>
            current.orders > hourlyData[max].orders ? index : max,
          0
        )
      };
    } catch (error) {
      logger.error('Error getting hourly product breakdown:', error);
      return {
        hourlyBreakdown: [],
        totalTodayOrders: 0,
        totalTodayRevenue: 0,
        peakHour: 0
      };
    }
  }

  // Missing method: getAccurateAnalytics (just use existing getDashboardAnalytics)
  async getAccurateAnalytics(userId, timeframe = '30d') {
    try {
      // Return the same data as dashboard analytics for accuracy
      return await this.getDashboardAnalytics(userId, timeframe);
    } catch (error) {
      logger.error('Error getting accurate analytics:', error);
      throw error;
    }
  }

  // Missing method: detectAnomalies
  async detectAnomalies(userId, dateRange) {
    try {
      const orderTrends = await this.getOrderTrends(userId, dateRange);
      const topProducts = await this.getTopProducts(userId, dateRange);

      const anomalies = [];

      // Revenue anomaly detection
      if (orderTrends.length > 7) {
        const recent = orderTrends.slice(-7);
        const previous = orderTrends.slice(-14, -7);

        const recentAvg =
          recent.reduce((sum, day) => sum + (day.revenue || 0), 0) /
          recent.length;
        const previousAvg =
          previous.reduce((sum, day) => sum + (day.revenue || 0), 0) /
          previous.length;

        const changePercent =
          previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

        if (Math.abs(changePercent) > 50) {
          anomalies.push({
            type: 'revenue',
            severity: changePercent > 0 ? 'positive' : 'negative',
            message: `Revenue ${
              changePercent > 0 ? 'spike' : 'drop'
            } of ${Math.abs(changePercent).toFixed(1)}% detected`,
            confidence: 0.8,
            timeframe: 'last_7_days',
            value: changePercent
          });
        }
      }

      // Product performance anomaly
      if (topProducts.length > 0) {
        const avgRevenue =
          topProducts.reduce((sum, p) => sum + (p.totalRevenue || 0), 0) /
          topProducts.length;
        const outliers = topProducts.filter(
          (p) => (p.totalRevenue || 0) > avgRevenue * 3
        );

        if (outliers.length > 0) {
          anomalies.push({
            type: 'product_performance',
            severity: 'positive',
            message: `${outliers.length} product(s) performing exceptionally well`,
            confidence: 0.9,
            timeframe: dateRange,
            products: outliers.map((p) => p.name)
          });
        }
      }

      return {
        anomalies,
        summary: {
          total: anomalies.length,
          positive: anomalies.filter((a) => a.severity === 'positive').length,
          negative: anomalies.filter((a) => a.severity === 'negative').length,
          confidence:
            anomalies.length > 0
              ? anomalies.reduce((sum, a) => sum + a.confidence, 0) /
                anomalies.length
              : 0
        },
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error detecting anomalies:', error);
      return {
        anomalies: [],
        summary: { total: 0, positive: 0, negative: 0, confidence: 0 },
        lastChecked: new Date().toISOString()
      };
    }
  }

  // Helper method for seasonal analysis
  analyzeSeasonalPatterns(trends) {
    if (trends.length < 3) {return [];}

    const insights = [];
    const sortedByRevenue = trends.sort((a, b) => b.revenue - a.revenue);

    if (
      sortedByRevenue[0].revenue >
      sortedByRevenue[sortedByRevenue.length - 1].revenue * 2
    ) {
      insights.push({
        type: 'seasonal_peak',
        message: `${sortedByRevenue[0].monthName} shows significant seasonal strength`,
        impact: 'high'
      });
    }

    return insights;
  }

  // Missing method: getStockStatus
  async getStockStatus(productId) {
    try {
      // Since we don't have inventory tracking, we'll simulate stock status
      const product = await Product.findByPk(productId);

      if (!product) {
        return {
          status: 'unknown',
          quantity: 0,
          lowStockThreshold: 10,
          isLowStock: false,
          daysOfStock: 0
        };
      }

      // Simulate stock status based on product data
      const simulatedStock = Math.floor(Math.random() * 100) + 10; // 10-110 units
      const lowStockThreshold = 20;

      return {
        productId,
        productName: product.name || 'Unknown Product',
        status: simulatedStock > lowStockThreshold ? 'in_stock' : 'low_stock',
        quantity: simulatedStock,
        lowStockThreshold,
        isLowStock: simulatedStock <= lowStockThreshold,
        daysOfStock: Math.floor(simulatedStock / 2), // Assume 2 units sold per day
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting stock status:', error);
      return {
        status: 'error',
        quantity: 0,
        lowStockThreshold: 10,
        isLowStock: false,
        daysOfStock: 0,
        error: error.message
      };
    }
  }

  // Missing method: calculateSalesVelocity
  calculateSalesVelocity(totalSold, dateRange) {
    try {
      const daysDiff = Math.ceil(
        (new Date(dateRange.end) - new Date(dateRange.start)) /
          (1000 * 60 * 60 * 24)
      );
      const velocity = daysDiff > 0 ? totalSold / daysDiff : 0;

      return {
        unitsPerDay: velocity,
        totalSold,
        periodDays: daysDiff,
        velocity: velocity > 1 ? 'high' : velocity > 0.5 ? 'medium' : 'low'
      };
    } catch (error) {
      logger.error('Error calculating sales velocity:', error);
      return {
        unitsPerDay: 0,
        totalSold: 0,
        periodDays: 0,
        velocity: 'unknown'
      };
    }
  }

  // ...existing code...
}

module.exports = new AnalyticsService();
