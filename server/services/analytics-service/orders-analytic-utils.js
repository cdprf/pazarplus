const { Op } = require('sequelize');
const { Order, OrderItem, Product } = require('../../models');
const cacheService = require('../cache-service');
const logger = require('../../utils/logger');

// Analytics configuration
const cachePrefix = 'analytics:';
const defaultCacheTTL = 3600; // 1 hour

/**
 * Get order summary statistics - now properly handling returned/cancelled orders
 */
async function getOrderSummary(userId, dateRange) {
  const whereClause = {
    userId,
    createdAt: {
      [Op.between]: [dateRange.start, dateRange.end]
    }
  };

  // Valid statuses for revenue calculation (exclude returned/cancelled)
  const validRevenueStatuses = [
    'new',
    'processing',
    'shipped',
    'delivered',
    'completed'
  ];

  const [
    totalOrders,
    validOrders,
    cancelledOrders,
    returnedOrders,
    totalRevenue,
    avgOrderValue,
    ordersByStatus,
    totalCustomers
  ] = await Promise.all([
    // Total orders (all statuses)
    Order.count({ where: whereClause }),

    // Valid orders for revenue calculation
    Order.count({
      where: {
        ...whereClause,
        orderStatus: { [Op.in]: validRevenueStatuses }
      }
    }),

    // Cancelled orders
    Order.count({
      where: {
        ...whereClause,
        orderStatus: 'cancelled'
      }
    }),

    // Returned orders
    Order.count({
      where: {
        ...whereClause,
        orderStatus: 'returned'
      }
    }),

    // Revenue only from valid orders using OrderItems (excludes returns/cancellations)
    OrderItem.sum(
      Order.sequelize.literal(
        'CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)'
      ),
      {
        include: [
          {
            model: Order,
            as: 'order',
            where: {
              ...whereClause,
              orderStatus: { [Op.in]: validRevenueStatuses }
            },
            attributes: []
          }
        ]
      }
    ).catch(() => 0),

    // Average order value from valid orders using OrderItems
    OrderItem.findOne({
      include: [
        {
          model: Order,
          as: 'order',
          where: {
            ...whereClause,
            orderStatus: { [Op.in]: validRevenueStatuses }
          },
          attributes: []
        }
      ],
      attributes: [
        [
          Order.sequelize.fn(
            'AVG',
            Order.sequelize.literal(
              'CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)'
            )
          ),
          'avg'
        ]
      ]
    }),

    // Orders breakdown by status using OrderItem-based revenue
    OrderItem.findAll({
      include: [
        {
          model: Order,
          as: 'order',
          where: whereClause,
          attributes: ['orderStatus']
        }
      ],
      attributes: [
        [OrderItem.sequelize.col('order.orderStatus'), 'orderStatus'],
        [
          OrderItem.sequelize.fn(
            'COUNT',
            OrderItem.sequelize.fn(
              'DISTINCT',
              OrderItem.sequelize.col('order.id')
            )
          ),
          'count'
        ],
        [
          OrderItem.sequelize.fn(
            'SUM',
            OrderItem.sequelize.literal(
              'CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)'
            )
          ),
          'totalAmount'
        ]
      ],
      group: [OrderItem.sequelize.col('order.orderStatus')]
    }),

    // Customer count from valid orders only
    Order.count({
      where: {
        ...whereClause,
        orderStatus: { [Op.in]: validRevenueStatuses }
      },
      distinct: true,
      col: 'customerEmail'
    }).catch(() => 0)
  ]);

  return {
    totalOrders,
    validOrders, // Orders contributing to revenue
    cancelledOrders,
    returnedOrders,
    totalRevenue: totalRevenue || 0,
    avgOrderValue: parseFloat(avgOrderValue?.get('avg') || 0),
    totalCustomers: totalCustomers || 0,
    ordersByStatus: ordersByStatus.map((item) => ({
      status: item.get('orderStatus'),
      count: parseInt(item.get('count')),
      totalAmount: parseFloat(item.get('totalAmount') || 0)
    })),
    // Calculate return and cancellation rates
    returnRate: totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0,
    cancellationRate:
      totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0
  };
}

/**
 * Get order trends and forecasting using OrderItem-based calculations
 */
async function getOrderTrends(userId, dateRange) {
  const dailyOrders = await OrderItem.findAll({
    include: [
      {
        model: Order,
        as: 'order',
        where: {
          userId,
          createdAt: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
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
          'COUNT',
          OrderItem.sequelize.fn(
            'DISTINCT',
            OrderItem.sequelize.col('order.id')
          )
        ),
        'orders'
      ],
      [
        OrderItem.sequelize.fn(
          'SUM',
          OrderItem.sequelize.literal(
            'CAST("OrderItem"."price" AS DECIMAL) * CAST("OrderItem"."quantity" AS INTEGER)'
          )
        ),
        'revenue'
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

  const trends = dailyOrders.map((item) => ({
    date: item.get('date'),
    orders: parseInt(item.get('orders')),
    revenue: parseFloat(item.get('revenue') || 0)
  }));

  // Simple moving average for trend analysis
  const movingAverage = calculateMovingAverage(trends, 7);
  const forecast = generateSimpleForecast(trends, 7);

  return {
    daily: trends,
    movingAverage,
    forecast,
    insights: generateInsights(trends)
  };
}

module.exports = {
  getOrderSummary,
  getOrderTrends
};
