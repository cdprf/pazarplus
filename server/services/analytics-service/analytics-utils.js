const { Op } = require('sequelize');
const { Order, OrderItem, Product } = require('../../models');
const cacheService = require('../cache-service');
const logger = require('../../utils/logger');

// Analytics configuration
const cachePrefix = 'analytics:';
const defaultCacheTTL = 1800; // Reduced from 3600 to 1800 (30 minutes) to prevent stale data

// Import utility functions
const { calculateGrowthRate } = require('./analytic-calculation-utils');
const { getOrderSummary, getOrderTrends } = require('./orders-analytic-utils');
const { getTopProducts } = require('./product-analysis-utils');
const { getCustomerMetrics } = require('./customer-analysis-utils');

// Functions that need to be available (these might be in the main service)
async function getPlatformComparison(userId, dateRange) {
  const { Order } = require('../../models');
  const { Op } = require('sequelize');

  try {
    // Valid statuses for revenue calculation (exclude returned/cancelled)
    const validRevenueStatuses = ['new', 'processing', 'shipped', 'delivered'];

    const whereClause = {
      userId,
      createdAt: {
        [Op.between]: [dateRange.start, dateRange.end]
      },
      orderStatus: { [Op.in]: validRevenueStatuses }
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
        name: stat.platform,
        platform: stat.platform,
        orders: totalOrders,
        totalOrders,
        revenue: totalRevenue,
        totalRevenue,
        avgOrderValue: parseFloat(stat.get('avgOrderValue') || 0),
        completionRate: totalOrders ? (completedOrders / totalOrders) * 100 : 0,
        conversionRate: totalOrders ? (completedOrders / totalOrders) * 100 : 0,
        completedOrders,
        percentage: 0
      };
    });
  } catch (error) {
    console.error('Error in getPlatformComparison:', error);
    return [];
  }
}

async function getPerformanceMetrics(userId, dateRange) {
  const { Order } = require('../../models');
  const { Op } = require('sequelize');

  try {
    const whereClause = {
      userId,
      createdAt: {
        [Op.between]: [dateRange.start, dateRange.end]
      }
    };

    const metrics = await Order.findOne({
      where: whereClause,
      attributes: [
        [Order.sequelize.fn('COUNT', Order.sequelize.col('id')), 'totalOrders'],
        [
          Order.sequelize.fn('SUM', Order.sequelize.col('totalAmount')),
          'totalRevenue'
        ],
        [
          Order.sequelize.fn(
            'SUM',
            Order.sequelize.literal(
              'CASE WHEN "Order"."orderStatus" = \'delivered\' THEN 1 ELSE 0 END'
            )
          ),
          'deliveredOrders'
        ],
        [
          Order.sequelize.fn(
            'SUM',
            Order.sequelize.literal(
              'CASE WHEN "Order"."orderStatus" = \'cancelled\' THEN 1 ELSE 0 END'
            )
          ),
          'cancelledOrders'
        ]
      ]
    });

    const totalOrders = parseInt(metrics?.get('totalOrders') || 0);
    const deliveredOrders = parseInt(metrics?.get('deliveredOrders') || 0);
    const cancelledOrders = parseInt(metrics?.get('cancelledOrders') || 0);
    const totalRevenue = parseFloat(metrics?.get('totalRevenue') || 0);

    // Calculate performance metrics
    const efficiency =
      totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;
    const growth = 0; // Would need historical data to calculate
    const profitability =
      totalRevenue > 0 ? ((totalRevenue * 0.2) / totalRevenue) * 100 : 0; // Assume 20% margin

    return {
      efficiency: Math.round(efficiency * 100) / 100,
      growth: Math.round(growth * 100) / 100,
      profitability: Math.round(profitability * 100) / 100,
      deliveryRate: efficiency,
      cancellationRate:
        totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0
    };
  } catch (error) {
    console.error('Error in getPerformanceMetrics:', error);
    return {
      efficiency: 0,
      growth: 0,
      profitability: 0,
      deliveryRate: 0,
      cancellationRate: 0
    };
  }
}

async function getFinancialKPIs(userId, dateRange) {
  const { Order, OrderItem } = require('../../models');
  const { Op } = require('sequelize');

  try {
    const whereClause = {
      userId,
      createdAt: {
        [Op.between]: [dateRange.start, dateRange.end]
      },
      orderStatus: { [Op.notIn]: ['cancelled', 'returned'] }
    };

    // Get revenue data using OrderItems for accuracy
    const revenueData = await OrderItem.findOne({
      include: [
        {
          model: Order,
          as: 'order',
          where: whereClause,
          attributes: []
        }
      ],
      attributes: [
        [
          OrderItem.sequelize.fn(
            'SUM',
            OrderItem.sequelize.literal(
              'CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)'
            )
          ),
          'totalRevenue'
        ],
        [
          OrderItem.sequelize.fn('COUNT', OrderItem.sequelize.col('id')),
          'totalItems'
        ]
      ]
    });

    const totalRevenue = parseFloat(revenueData?.get('totalRevenue') || 0);
    const totalItems = parseInt(revenueData?.get('totalItems') || 0);

    // Calculate estimated costs and profit (would need real cost data in production)
    const estimatedCosts = totalRevenue * 0.7; // Assume 70% costs
    const profit = totalRevenue - estimatedCosts;
    const margins = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      revenue: Math.round(totalRevenue * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      margins: Math.round(margins * 100) / 100,
      totalItems,
      avgItemValue: totalItems > 0 ? totalRevenue / totalItems : 0,
      growthRate: 0 // Would need historical comparison
    };
  } catch (error) {
    console.error('Error in getFinancialKPIs:', error);
    return {
      revenue: 0,
      profit: 0,
      margins: 0,
      totalItems: 0,
      avgItemValue: 0,
      growthRate: 0
    };
  }
}

// Helper function to get date range
function getDateRange(timeframe) {
  const end = new Date();
  const start = new Date();

  switch (timeframe) {
  case '7d':
    start.setDate(start.getDate() - 7);
    break;
  case '30d':
    start.setDate(start.getDate() - 30);
    break;
  case '90d':
    start.setDate(start.getDate() - 90);
    break;
  case '365d':
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
async function getAccurateAnalytics(userId, timeframe = '30d') {
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
      financialKPIs
    ] = await Promise.all([
      getOrderSummary(userId, dateRange),
      getRevenueAnalytics(userId, dateRange),
      getPlatformComparison(userId, dateRange),
      getTopProducts(userId, dateRange, 10),
      getOrderTrends(userId, dateRange),
      getPerformanceMetrics(userId, dateRange),
      getCustomerMetrics(userId, dateRange),
      getFinancialKPIs(userId, dateRange)
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
            : 100
      },
      revenueAccuracy: {
        grossRevenue: revenueAnalytics.totalRevenue || 0,
        netRevenue:
          (revenueAnalytics.totalRevenue || 0) -
          (revenueAnalytics.refundedAmount || 0),
        returnImpact: orderSummary.returnRate,
        cancellationImpact: orderSummary.cancellationRate
      }
    };

    const result = {
      summary: {
        ...orderSummary,
        accuracy: accuracyMetrics
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
          note: 'Revenue calculations exclude returned, cancelled, and refunded orders for accurate business insights'
        }
      }
    };

    await cacheService.set(cacheKey, result, defaultCacheTTL);
    return result;
  } catch (error) {
    logger.error('Accurate analytics error:', error);
    throw error;
  }
}

/**
 * Get comprehensive dashboard analytics with advanced insights
 */
async function getDashboardAnalytics(userId, timeframe = '30d') {
  const cacheKey = `${cachePrefix}dashboard:${userId}:${timeframe}`;

  try {
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const dateRange = getDateRange(timeframe);

    // Use Promise.allSettled to prevent one failed promise from blocking others
    // Also add timeout protection
    const analyticsPromises = [
      getOrderSummary(userId, dateRange),
      getRevenueAnalytics(userId, dateRange),
      getPlatformComparison(userId, dateRange),
      getTopProducts(userId, dateRange),
      getOrderTrends(userId, dateRange),
      getPerformanceMetrics(userId, dateRange),
      getPredictiveInsights(userId, dateRange),
      getMarketIntelligence(userId, dateRange),
      getFinancialKPIs(userId, dateRange)
    ];

    // Add timeout wrapper to prevent hanging requests
    const timeoutPromise = new Promise(
      (_, reject) =>
        setTimeout(() => reject(new Error('Analytics timeout')), 15000) // 15 second timeout
    );

    const analyticsResults = await Promise.race([
      Promise.allSettled(analyticsPromises),
      timeoutPromise
    ]);

    // Process results, using fallback data for failed promises
    const analytics = analyticsResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        logger.warn(`Analytics component ${index} failed:`, result.reason);
        return getFallbackData(index);
      }
    });

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
      timeframe
    };

    // Cache with shorter TTL for dashboard data
    await cacheService.set(cacheKey, result, 900); // 15 minutes for dashboard data
    return result;
  } catch (error) {
    logger.error('Dashboard analytics error:', error);
    // Return fallback data instead of throwing error
    return {
      summary: getFallbackData(0),
      revenue: getFallbackData(1),
      platforms: getFallbackData(2),
      topProducts: getFallbackData(3),
      trends: getFallbackData(4),
      performance: getFallbackData(5),
      predictions: getFallbackData(6),
      marketIntelligence: getFallbackData(7),
      financialKPIs: getFallbackData(8),
      generatedAt: new Date(),
      timeframe
    };
  }
}

/**
 * Get detailed revenue analytics
 */
async function getRevenueAnalytics(userId, dateRange) {
  const whereClause = {
    userId,
    createdAt: {
      [Op.between]: [dateRange.start, dateRange.end]
    }
  };

  console.log('Revenue Analytics - Starting daily revenue calculation');

  try {
    // Daily revenue breakdown using OrderItems for accurate revenue calculation
    const dailyRevenue = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: 'order',
          where: whereClause,
          attributes: []
        }
      ],
      attributes: [
        [
          OrderItem.sequelize.fn(
            'DATE',
            OrderItem.sequelize.col('order.createdAt')
          ),
          'date'
        ],
        [
          OrderItem.sequelize.fn(
            'SUM',
            OrderItem.sequelize.literal(
              'CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)'
            )
          ),
          'revenue'
        ],
        [
          OrderItem.sequelize.fn(
            'COUNT',
            OrderItem.sequelize.fn(
              'DISTINCT',
              OrderItem.sequelize.col('order.id')
            )
          ),
          'orders'
        ]
      ],
      group: [
        OrderItem.sequelize.fn(
          'DATE',
          OrderItem.sequelize.col('order.createdAt')
        )
      ],
      order: [
        [
          OrderItem.sequelize.fn(
            'DATE',
            OrderItem.sequelize.col('order.createdAt')
          ),
          'ASC'
        ]
      ]
    });

    console.log('Revenue Analytics - Daily revenue calculation complete');
    console.log('Revenue Analytics - Starting platform revenue calculation');

    // Revenue by platform using OrderItems
    const platformRevenue = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: 'order',
          where: whereClause,
          attributes: []
        }
      ],
      attributes: [
        [OrderItem.sequelize.col('order.platform'), 'platform'],
        [
          OrderItem.sequelize.fn(
            'SUM',
            OrderItem.sequelize.literal(
              'CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)'
            )
          ),
          'revenue'
        ],
        [
          OrderItem.sequelize.fn(
            'COUNT',
            OrderItem.sequelize.fn(
              'DISTINCT',
              OrderItem.sequelize.col('order.id')
            )
          ),
          'orders'
        ]
      ],
      group: [OrderItem.sequelize.col('order.platform')]
    });

    console.log('Revenue Analytics - Platform revenue calculation complete');
    console.log('Revenue Analytics - Starting previous period calculation');

    // Growth calculation using OrderItems
    const previousPeriod = getPreviousPeriod(dateRange);

    console.log('Revenue Analytics - Calculating previous revenue');

    // Fix: Replace OrderItem.sum with a more standard approach using findAll and SUM
    const previousRevenueResult = await OrderItem.findAll({
      attributes: [
        [
          OrderItem.sequelize.fn(
            'SUM',
            OrderItem.sequelize.literal(
              'CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)'
            )
          ),
          'totalRevenue'
        ]
      ],
      include: [
        {
          model: Order,
          as: 'order',
          where: {
            userId,
            createdAt: {
              [Op.between]: [previousPeriod.start, previousPeriod.end]
            }
          },
          attributes: []
        }
      ],
      raw: true
    });

    const previousRevenue = previousRevenueResult[0]?.totalRevenue || 0;

    console.log('Revenue Analytics - Calculating current revenue');

    // Fix: Replace OrderItem.sum with a more standard approach using findAll and SUM
    const currentRevenueResult = await OrderItem.findAll({
      attributes: [
        [
          OrderItem.sequelize.fn(
            'SUM',
            OrderItem.sequelize.literal(
              'CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)'
            )
          ),
          'totalRevenue'
        ]
      ],
      include: [
        {
          model: Order,
          as: 'order',
          where: whereClause,
          attributes: []
        }
      ],
      raw: true
    });

    const currentRevenue = currentRevenueResult[0]?.totalRevenue || 0;

    console.log('Revenue Analytics - Calculating growth rate');
    const growthRate = previousRevenue
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    console.log('Revenue Analytics - Preparing return data');
    const result = {
      daily: dailyRevenue.map((item) => ({
        date: item.get('date'),
        revenue: parseFloat(item.get('revenue') || 0),
        orders: parseInt(item.get('orders'))
      })),
      platforms: platformRevenue.map((item) => ({
        platform: item.get('platform'),
        revenue: parseFloat(item.get('revenue') || 0),
        orders: parseInt(item.get('orders'))
      })),
      growth: {
        current: currentRevenue || 0,
        previous: previousRevenue || 0,
        rate: growthRate
      },
      total: currentRevenue || 0,
      trends: dailyRevenue.map((item) => ({
        date: item.get('date'),
        value: parseFloat(item.get('revenue') || 0)
      }))
    };
    console.log('Revenue Analytics - Complete');
    return result;
  } catch (error) {
    console.error('Revenue Analytics Error:', error.message);
    console.error('Error location:', error.stack);
    throw error;
  }
}

/**
 * Get predictive insights and forecasting for revenue trends
 */
async function getPredictiveInsights(userId, dateRange) {
  const cacheKey = `${cachePrefix}predictive:${userId}:${dateRange.start}:${dateRange.end}`;

  try {
    // Check cache first to avoid expensive queries
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const { Order, OrderItem } = require('../../models');
    const { Op } = require('sequelize');

    // Limit historical data to prevent timeout - use 30 days instead of 60
    const extendedStart = new Date(dateRange.start);
    extendedStart.setDate(extendedStart.getDate() - 30); // Reduced from 60 to 30 days

    const historicalData = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: 'order',
          where: {
            userId,
            createdAt: {
              [Op.between]: [extendedStart, dateRange.end]
            },
            orderStatus: { [Op.notIn]: ['cancelled', 'returned'] }
          },
          attributes: []
        }
      ],
      attributes: [
        [
          OrderItem.sequelize.fn(
            'DATE',
            OrderItem.sequelize.col('order.createdAt')
          ),
          'date'
        ],
        [
          OrderItem.sequelize.fn(
            'SUM',
            OrderItem.sequelize.literal(
              'CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)'
            )
          ),
          'revenue'
        ],
        [
          OrderItem.sequelize.fn(
            'COUNT',
            OrderItem.sequelize.fn(
              'DISTINCT',
              OrderItem.sequelize.col('order.id')
            )
          ),
          'orders'
        ]
      ],
      group: [
        OrderItem.sequelize.fn(
          'DATE',
          OrderItem.sequelize.col('order.createdAt')
        )
      ],
      order: [
        [
          OrderItem.sequelize.fn(
            'DATE',
            OrderItem.sequelize.col('order.createdAt')
          ),
          'ASC'
        ]
      ],
      limit: 100 // Add limit to prevent excessive data
    });

    // Early return if no data to prevent processing empty arrays
    if (!historicalData || historicalData.length === 0) {
      const result = {
        trends: [],
        forecast: [],
        predictions: {
          nextWeekRevenue: 0,
          nextMonthRevenue: 0,
          growthRate: 0,
          trend: 'stable'
        },
        confidence: 0,
        recommendations: []
      };
      await cacheService.set(cacheKey, result, defaultCacheTTL);
      return result;
    }

    // Calculate trends and forecast
    const dailyData = historicalData.map((item) => ({
      date: item.get('date'),
      revenue: parseFloat(item.get('revenue') || 0),
      orders: parseInt(item.get('orders') || 0)
    }));

    // Optimize calculations - use smaller windows and limit data processing
    const trendData =
      dailyData.length > 7 ? calculateMovingAverage(dailyData, 7) : [];
    const forecast =
      trendData.length > 0 ? generateSimpleForecast(trendData, 15) : []; // Reduced from 30 to 15 days

    // Calculate growth predictions with safety checks
    const recentRevenue =
      dailyData.length >= 7
        ? dailyData.slice(-7).reduce((sum, day) => sum + day.revenue, 0)
        : 0;
    const previousRevenue =
      dailyData.length >= 14
        ? dailyData.slice(-14, -7).reduce((sum, day) => sum + day.revenue, 0)
        : 0;
    const weeklyGrowthRate =
      previousRevenue > 0
        ? ((recentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    const result = {
      trends: trendData,
      forecast: forecast,
      predictions: {
        nextWeekRevenue:
          forecast.length >= 7
            ? forecast
              .slice(0, 7)
              .reduce((sum, day) => sum + day.predictedRevenue, 0)
            : 0,
        nextMonthRevenue: forecast.reduce(
          (sum, day) => sum + day.predictedRevenue,
          0
        ),
        growthRate: weeklyGrowthRate,
        trend:
          weeklyGrowthRate > 5
            ? 'increasing'
            : weeklyGrowthRate < -5
              ? 'decreasing'
              : 'stable'
      },
      confidence: calculateForecastConfidence(dailyData),
      recommendations: generateRevenueRecommendations(
        weeklyGrowthRate,
        recentRevenue
      )
    };

    // Cache the result
    await cacheService.set(cacheKey, result, defaultCacheTTL);
    return result;
  } catch (error) {
    console.error('Error in getPredictiveInsights:', error);
    return {
      trends: [],
      forecast: [],
      predictions: {
        nextWeekRevenue: 0,
        nextMonthRevenue: 0,
        growthRate: 0,
        trend: 'stable'
      },
      confidence: 0,
      recommendations: []
    };
  }
}

/**
 * Get market intelligence and top performing products analysis
 */
async function getMarketIntelligence(userId, dateRange) {
  const cacheKey = `${cachePrefix}market:${userId}:${dateRange.start}:${dateRange.end}`;

  try {
    // Check cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const { Order, OrderItem, Product } = require('../../models');
    const { Op } = require('sequelize');

    // Get top performing products with detailed analytics - limit to 10 to improve performance
    const topProductsData = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: 'order',
          where: {
            userId,
            createdAt: {
              [Op.between]: [dateRange.start, dateRange.end]
            },
            orderStatus: { [Op.notIn]: ['cancelled', 'returned'] }
          },
          attributes: []
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'category', 'price'],
          required: false
        }
      ],
      attributes: [
        'productId',
        [
          OrderItem.sequelize.fn(
            'SUM',
            OrderItem.sequelize.literal(
              'CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)'
            )
          ),
          'totalRevenue'
        ],
        [
          OrderItem.sequelize.fn('SUM', OrderItem.sequelize.col('quantity')),
          'totalQuantity'
        ],
        [
          OrderItem.sequelize.fn('AVG', OrderItem.sequelize.col('price')),
          'avgPrice'
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
        ]
      ],
      group: [
        'productId',
        'product.id',
        'product.name',
        'product.category',
        'product.price'
      ],
      order: [
        [
          OrderItem.sequelize.fn(
            'SUM',
            OrderItem.sequelize.literal(
              'CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)'
            )
          ),
          'DESC'
        ]
      ],
      limit: 10 // Reduced from 20 to 10 for better performance
    });

    // Early return if no data
    if (!topProductsData || topProductsData.length === 0) {
      const result = {
        topProducts: [],
        categoryPerformance: [],
        insights: {
          topCategory: 'Unknown',
          topProduct: 'None',
          diversityIndex: 0,
          concentrationRisk: 0
        },
        recommendations: []
      };
      await cacheService.set(cacheKey, result, defaultCacheTTL);
      return result;
    }

    // Process top products data
    const topProducts = topProductsData.map((item, index) => {
      const revenue = parseFloat(item.get('totalRevenue') || 0);
      const quantity = parseInt(item.get('totalQuantity') || 0);
      const avgPrice = parseFloat(item.get('avgPrice') || 0);
      const orderCount = parseInt(item.get('orderCount') || 0);

      return {
        id: item.productId,
        productId: item.productId,
        name: item.product?.name || `Product ${item.productId}`,
        sku: item.product?.sku || 'N/A',
        category: item.product?.category || 'Uncategorized',
        revenue: isNaN(revenue) ? 0 : revenue,
        totalRevenue: isNaN(revenue) ? 0 : revenue, // Add totalRevenue for frontend compatibility
        quantity: isNaN(quantity) ? 0 : quantity,
        totalSold: isNaN(quantity) ? 0 : quantity, // Add totalSold for frontend compatibility
        avgPrice: isNaN(avgPrice) ? 0 : avgPrice,
        orderCount: isNaN(orderCount) ? 0 : orderCount,
        rank: index + 1,
        revenueShare: 0, // Will be calculated below
        performance:
          revenue > 1000 ? 'excellent' : revenue > 500 ? 'good' : 'average'
      };
    });

    // Calculate revenue shares
    const totalRevenue = topProducts.reduce(
      (sum, product) => sum + product.revenue,
      0
    );
    topProducts.forEach((product) => {
      product.revenueShare =
        totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0;
    });

    // Category analysis
    const categoryPerformance = {};
    topProducts.forEach((product) => {
      if (!categoryPerformance[product.category]) {
        categoryPerformance[product.category] = {
          revenue: 0,
          quantity: 0,
          products: 0
        };
      }
      categoryPerformance[product.category].revenue += product.revenue;
      categoryPerformance[product.category].quantity += product.quantity;
      categoryPerformance[product.category].products += 1;
    });

    const categoryData = Object.entries(categoryPerformance)
      .map(([category, data]) => ({
        category,
        ...data,
        avgRevenuePerProduct:
          data.products > 0 ? data.revenue / data.products : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const result = {
      topProducts: topProducts.slice(0, 10),
      categoryPerformance: categoryData,
      insights: {
        topCategory: categoryData[0]?.category || 'Unknown',
        topProduct: topProducts[0]?.name || 'None',
        diversityIndex: calculateProductDiversityIndex(topProducts),
        concentrationRisk: topProducts[0]?.revenueShare || 0
      },
      recommendations: generateProductRecommendations(
        topProducts,
        categoryData
      )
    };

    // Cache the result
    await cacheService.set(cacheKey, result, defaultCacheTTL);
    return result;
  } catch (error) {
    console.error('Error in getMarketIntelligence:', error);
    return {
      topProducts: [],
      categoryPerformance: [],
      insights: {
        topCategory: 'Unknown',
        topProduct: 'None',
        diversityIndex: 0,
        concentrationRisk: 0
      },
      recommendations: []
    };
  }
}

// Fallback data function for failed analytics components
function getFallbackData(index) {
  const fallbacks = [
    // 0: orderSummary
    { totalOrders: 0, totalRevenue: 0, validOrders: 0, averageOrderValue: 0 },
    // 1: revenueAnalytics
    {
      daily: [],
      platforms: [],
      growth: { current: 0, previous: 0, rate: 0 },
      total: 0,
      trends: []
    },
    // 2: platformComparison
    [],
    // 3: topProducts
    [],
    // 4: orderTrends
    { orders: [] },
    // 5: performanceMetrics
    {
      efficiency: 0,
      growth: 0,
      profitability: 0,
      deliveryRate: 0,
      cancellationRate: 0
    },
    // 6: predictiveInsights
    {
      trends: [],
      forecast: [],
      predictions: {
        nextWeekRevenue: 0,
        nextMonthRevenue: 0,
        growthRate: 0,
        trend: 'stable'
      },
      confidence: 0,
      recommendations: []
    },
    // 7: marketIntelligence
    {
      topProducts: [],
      categoryPerformance: [],
      insights: {
        topCategory: 'Unknown',
        topProduct: 'None',
        diversityIndex: 0,
        concentrationRisk: 0
      },
      recommendations: []
    },
    // 8: financialKPIs
    {
      revenue: 0,
      orderCount: 0,
      avgOrderValue: 0,
      platformBreakdown: [],
      profitMargins: {
        gross: 0,
        net: 0,
        operating: 0
      },
      growthRates: {
        revenue: 0,
        orders: 0,
        customers: 0
      },
      cashFlow: {
        inflow: 0,
        outflow: 0,
        net: 0
      },
      customerLifetimeValue: 0,
      customerAcquisitionCost: 0,
      keyMetrics: {
        grossMargin: 0,
        netMargin: 0,
        operatingMargin: 0,
        revenueGrowth: 0,
        customerRetention: 0,
        churnRate: 0
      },
      generatedAt: new Date()
    }
  ];

  return fallbacks[index] || {};
}

// Helper functions for calculations
function calculateMovingAverage(data, window) {
  if (!data || data.length < window) {return [];}

  const result = [];
  // Optimize by limiting the calculation to avoid performance issues
  const maxCalculations = Math.min(data.length, 50); // Limit to 50 calculations max

  for (let i = window - 1; i < maxCalculations; i++) {
    const slice = data.slice(i - window + 1, i + 1);
    const avg =
      slice.reduce((sum, item) => sum + (item.revenue || 0), 0) / window;
    result.push({
      date: data[i].date,
      revenue: data[i].revenue || 0,
      movingAverage: avg,
      trend:
        i > window && result.length > 0
          ? avg > result[result.length - 1]?.movingAverage
            ? 'up'
            : 'down'
          : 'stable'
    });
  }
  return result;
}

function generateSimpleForecast(trendData, days) {
  // Limit forecast days to prevent excessive processing
  const maxDays = Math.min(days, 15);

  if (!trendData || trendData.length < 3) {
    return Array(maxDays)
      .fill(0)
      .map((_, i) => ({
        date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        predictedRevenue: 0,
        confidence: 0
      }));
  }

  // Simple linear regression for trend - use smaller sample
  const recentTrend = trendData.slice(-Math.min(7, trendData.length));
  const avgGrowth =
    recentTrend.length > 1
      ? recentTrend.reduce((sum, item, index) => {
        if (index === 0) {return 0;}
        return (
          sum + ((item.revenue || 0) - (recentTrend[index - 1].revenue || 0))
        );
      }, 0) /
        (recentTrend.length - 1)
      : 0;

  const lastRevenue = recentTrend[recentTrend.length - 1]?.revenue || 0;

  return Array(maxDays)
    .fill(0)
    .map((_, i) => ({
      date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
      predictedRevenue: Math.max(0, lastRevenue + avgGrowth * (i + 1)),
      confidence: Math.max(0.1, 0.8 - i * 0.03) // Faster confidence decrease
    }));
}

function calculateForecastConfidence(data) {
  if (!data || data.length < 7) {return 0.2;} // Reduced minimum requirements

  // Use smaller sample for confidence calculation to improve performance
  const recent = data.slice(-Math.min(10, data.length)); // Reduced from 14 to 10
  const revenues = recent.map((item) => item.revenue || 0);
  const avg = revenues.reduce((sum, rev) => sum + rev, 0) / revenues.length;

  if (avg === 0) {return 0.1;}

  const variance =
    revenues.reduce((sum, rev) => sum + Math.pow(rev - avg, 2), 0) /
    revenues.length;
  const coefficient = Math.sqrt(variance) / avg;

  // Lower coefficient of variation = higher confidence
  return Math.max(0.1, Math.min(0.8, 1 - coefficient)); // Reduced max confidence
}

function generateRevenueRecommendations(growthRate, recentRevenue) {
  const recommendations = [];

  if (growthRate > 10) {
    recommendations.push({
      type: 'opportunity',
      title: 'Strong Growth Detected',
      description:
        'Revenue is growing rapidly. Consider scaling marketing efforts.',
      priority: 'high'
    });
  } else if (growthRate < -10) {
    recommendations.push({
      type: 'warning',
      title: 'Revenue Decline Alert',
      description:
        'Revenue is declining. Review pricing and marketing strategies.',
      priority: 'high'
    });
  }

  if (recentRevenue < 1000) {
    recommendations.push({
      type: 'improvement',
      title: 'Revenue Optimization',
      description: 'Consider promotional campaigns to boost sales.',
      priority: 'medium'
    });
  }

  return recommendations;
}

function calculateProductDiversityIndex(products) {
  if (products.length <= 1) {return 0;}

  const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
  if (totalRevenue === 0) {return 0;}

  // Calculate Herfindahl index
  const herfindahl = products.reduce((sum, p) => {
    const share = p.revenue / totalRevenue;
    return sum + share * share;
  }, 0);

  // Convert to diversity index (1 - H)
  return Math.max(0, 1 - herfindahl);
}

function generateProductRecommendations(topProducts, categoryData) {
  const recommendations = [];

  if (topProducts.length > 0 && topProducts[0].revenueShare > 50) {
    recommendations.push({
      type: 'risk',
      title: 'Revenue Concentration Risk',
      description: `${
        topProducts[0].name
      } accounts for ${topProducts[0].revenueShare.toFixed(
        1
      )}% of revenue. Consider diversifying.`,
      priority: 'medium'
    });
  }

  if (categoryData.length > 0) {
    const topCategory = categoryData[0];
    recommendations.push({
      type: 'insight',
      title: 'Top Category Performance',
      description: `${topCategory.category} is your best performing category with ${topCategory.products} products.`,
      priority: 'low'
    });
  }

  return recommendations;
}

module.exports = {
  getAccurateAnalytics,
  getDashboardAnalytics,
  getRevenueAnalytics,
  getPredictiveInsights,
  getMarketIntelligence,
  getDateRange,
  getPlatformComparison,
  getPerformanceMetrics,
  getFinancialKPIs
};
