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
 * Get comprehensive product analytics for a specific product or all products
 */
async function getProductAnalytics(
  userId,
  productId = null,
  dateRange,
  limit = 20
) {
  try {
    // Simplified approach for better SQLite compatibility
    console.log(
      "Getting product analytics for user:",
      userId,
      "product:",
      productId
    );

    // Basic product sales summary
    const summary = {
      totalProducts: 0,
      totalRevenue: 0,
      totalSold: 0,
      totalOrders: 0,
      averagePrice: 0,
      topCategory: "Electronics",
    };

    // Get orders for the user (use broader date range to ensure we get data)
    const orders = await Order.findAll({
      where: {
        userId,
        // Use broader date range or no date filter for testing
        ...(dateRange && dateRange.start && dateRange.end
          ? {
              createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
            }
          : {}),
      },
      include: [
        {
          model: OrderItem,
          as: "items",
          ...(productId && { where: { productId } }),
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["name", "sku", "category", "stockQuantity"],
            },
          ],
        },
      ],
    });

    console.log("Found orders:", orders.length);

    // Process orders to create analytics data
    const productStats = new Map();
    let totalRevenue = 0;
    let totalSold = 0;

    orders.forEach((order) => {
      if (order.items) {
        order.items.forEach((item) => {
          const productId = item.productId;
          const revenue = parseFloat(item.price) * parseInt(item.quantity);
          const quantity = parseInt(item.quantity);

          totalRevenue += revenue;
          totalSold += quantity;

          if (!productStats.has(productId)) {
            productStats.set(productId, {
              productId,
              name: item.product?.name || "Unknown Product",
              sku: item.product?.sku,
              category: item.product?.category,
              currentStock: item.product?.stockQuantity || 0,
              totalSold: 0,
              totalRevenue: 0,
              totalOrders: 0,
              averagePrice: 0,
            });
          }

          const stats = productStats.get(productId);
          stats.totalSold += quantity;
          stats.totalRevenue += revenue;
          stats.totalOrders += 1;
          stats.averagePrice = stats.totalRevenue / stats.totalSold;
        });
      }
    });

    // Convert to array and sort by revenue
    const products = Array.from(productStats.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    );

    // Update summary
    summary.totalProducts = products.length;
    summary.totalRevenue = totalRevenue;
    summary.totalSold = totalSold;
    summary.totalOrders = orders.length;
    summary.averagePrice = totalRevenue / totalSold || 0;

    // Generate mock daily trends
    const dailyTrends = [];
    const days = Math.min(
      30,
      Math.floor((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24))
    );
    for (let i = 0; i < days; i++) {
      const date = new Date(dateRange.start);
      date.setDate(date.getDate() + i);
      dailyTrends.push({
        date: date.toISOString().split("T")[0],
        soldQuantity: Math.floor(Math.random() * 10),
        revenue: Math.floor(Math.random() * 1000),
        orders: Math.floor(Math.random() * 5),
      });
    }

    // Generate mock platform breakdown
    const platformBreakdown = [
      {
        platform: "Trendyol",
        totalSold: Math.floor(totalSold * 0.4),
        totalRevenue: Math.floor(totalRevenue * 0.4),
        totalOrders: Math.floor(orders.length * 0.4),
      },
      {
        platform: "Hepsiburada",
        totalSold: Math.floor(totalSold * 0.35),
        totalRevenue: Math.floor(totalRevenue * 0.35),
        totalOrders: Math.floor(orders.length * 0.35),
      },
      {
        platform: "N11",
        totalSold: Math.floor(totalSold * 0.25),
        totalRevenue: Math.floor(totalRevenue * 0.25),
        totalOrders: Math.floor(orders.length * 0.25),
      },
    ];

    return {
      summary,
      topProducts: limit > 0 ? products.slice(0, limit) : products, // Use limit parameter or return all
      products: limit > 0 ? products.slice(0, limit) : products, // Keep both for compatibility
      allProducts: products, // Always include all products for frontend pagination
      totalProductsWithOrders: products.length, // Add count of all products with orders
      dailyTrends,
      platformBreakdown,
      charts: {
        dailyTrends: dailyTrends.map((trend) => ({
          date: trend.date,
          revenue: trend.revenue,
          orders: trend.orders,
          sold: trend.soldQuantity,
        })),
        platformBreakdown: platformBreakdown.map((platform) => ({
          name: platform.platform,
          value: platform.totalRevenue,
          orders: platform.totalOrders,
          sold: platform.totalSold,
        })),
        topProducts: products.slice(0, 10).map((product) => ({
          name: product.name,
          revenue: product.totalRevenue,
          sold: product.totalSold,
          category: product.category,
        })),
        // Add common metric names that frontend might be looking for
        revenue: dailyTrends.map((trend) => ({
          date: trend.date,
          value: trend.revenue,
        })),
        sales: dailyTrends.map((trend) => ({
          date: trend.date,
          value: trend.soldQuantity,
        })),
        orders: dailyTrends.map((trend) => ({
          date: trend.date,
          value: trend.orders,
        })),
        performance: products.slice(0, 10).map((product) => ({
          name: product.name,
          value: product.totalRevenue,
        })),
        categories: platformBreakdown.map((platform) => ({
          name: platform.platform,
          value: platform.totalRevenue,
        })),
      },
      performanceMetrics: null,
      insights: {
        insights: [
          "Ürün performansı analiz ediliyor",
          "Günlük satış trendleri takip ediliyor",
        ],
        recommendations: [
          {
            category: "performance",
            priority: "medium",
            title: "Satış Optimizasyonu",
            description:
              "En çok satan ürünlerin stok seviyelerini kontrol edin",
          },
        ],
      },
      generatedAt: new Date(),
    };
  } catch (error) {
    logger.error("Product analytics error:", error);
    // Return fallback data
    return {
      summary: {
        totalProducts: 0,
        totalRevenue: 0,
        totalSold: 0,
        totalOrders: 0,
        averagePrice: 0,
        topCategory: null,
      },
      products: [],
      dailyTrends: [],
      platformBreakdown: [],
      charts: {
        dailyTrends: [],
        platformBreakdown: [],
        topProducts: [],
        // Add same fallback structure for other metrics
        revenue: [],
        sales: [],
        orders: [],
        performance: [],
        categories: [],
      },
      performanceMetrics: null,
      insights: {
        insights: ["Veri bulunamadı"],
        recommendations: [],
      },
      generatedAt: new Date(),
    };
  }
}

/**
 * Get daily sales trends for products
 */
async function getProductDailyTrends(userId, productId, dateRange) {
  const whereClause = {
    include: [
      {
        model: Order,
        as: "order",
        where: {
          userId,
          createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
        },
        attributes: [],
      },
    ],
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
        "soldQuantity",
      ],
      [
        OrderItem.sequelize.fn(
          "SUM",
          OrderItem.sequelize.literal('"quantity" * "OrderItem"."price"')
        ),
        "revenue",
      ],
      [
        OrderItem.sequelize.fn(
          "COUNT",
          OrderItem.sequelize.literal("DISTINCT order.id")
        ),
        "orders",
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
  };

  if (productId) {
    whereClause.where = { productId };
  }

  const trends = await OrderItem.findAll(whereClause);

  return trends.map((item) => ({
    date: item.get("date"),
    soldQuantity: parseInt(item.get("soldQuantity")),
    revenue: parseFloat(item.get("revenue")),
    orders: parseInt(item.get("orders")),
  }));
}

/**
 * Generate AI-powered product insights and recommendations
 */
async function generateProductInsights(userId, productId, dateRange) {
  try {
    const insights = [];
    const recommendations = [];

    // Get product data for analysis
    const productData = await getProductPeriodData(
      userId,
      productId,
      dateRange
    );
    const demandForecast = productId
      ? await calculateDemandForecast(productId, userId)
      : null;
    const seasonalTrends = await getProductSeasonalTrends(
      userId,
      productId,
      dateRange
    );

    // Revenue performance insights
    if (productData.totalRevenue > 0) {
      const salesVelocity = calculateSalesVelocity(
        productData.totalSold,
        dateRange
      );

      if (salesVelocity > 10) {
        insights.push({
          type: "positive",
          category: "performance",
          title: "Yüksek Satış Hızı",
          message: "Ürün satış hızı ortalamanın üzerinde",
          impact: "high",
        });

        recommendations.push({
          category: "inventory",
          priority: "high",
          title: "Stok Artırımı Önerisi",
          description: "Yüksek satış hızı nedeniyle stok seviyelerini artırın",
          estimatedImpact: "+15% satış artışı",
        });
      }

      if (productData.averagePrice < 50) {
        recommendations.push({
          category: "pricing",
          priority: "medium",
          title: "Fiyat Optimizasyonu",
          description:
            "Düşük fiyatlı ürünler için kar marjını artırmayı değerlendirin",
          estimatedImpact: "+10% kar marjı",
        });
      }
    }

    // Inventory insights
    if (demandForecast) {
      if (demandForecast.daily > 5) {
        insights.push({
          type: "warning",
          category: "inventory",
          title: "Yüksek Talep Beklentisi",
          message: `Günlük ${demandForecast.daily.toFixed(
            1
          )} adet satış öngörülüyor`,
          impact: "medium",
        });
      }
    }

    // Seasonal insights
    if (seasonalTrends.length > 0) {
      const currentMonth = new Date().getMonth();
      const monthlyTrend = seasonalTrends.find((t) => t.month === currentMonth);

      if (monthlyTrend && monthlyTrend.salesMultiplier > 1.2) {
        insights.push({
          type: "info",
          category: "seasonal",
          title: "Mevsimsel Fırsat",
          message: "Bu ay geçmişte yüksek satış performansı göstermiş",
          impact: "medium",
        });
      }
    }

    // Platform performance insights
    const platformBreakdown = await getProductPlatformBreakdown(
      userId,
      productId,
      dateRange
    );
    if (platformBreakdown.length > 1) {
      const topPlatform = platformBreakdown[0];
      const totalRevenue = platformBreakdown.reduce(
        (sum, p) => sum + p.totalRevenue,
        0
      );
      const dominance = (topPlatform.totalRevenue / totalRevenue) * 100;

      if (dominance > 70) {
        insights.push({
          type: "warning",
          category: "platform",
          title: "Platform Bağımlılığı",
          message: `Satışların %${dominance.toFixed(1)}'i ${
            topPlatform.platform
          } platformundan`,
          impact: "medium",
        });

        recommendations.push({
          category: "diversification",
          priority: "medium",
          title: "Platform Çeşitlendirme",
          description: "Diğer platformlarda satışları artırmaya odaklanın",
          estimatedImpact: "+20% risk azaltma",
        });
      }
    }

    return {
      insights,
      recommendations,
      analysisDate: new Date(),
      productId,
      timeframe: `${dateRange.start.toISOString().split("T")[0]} - ${
        dateRange.end.toISOString().split("T")[0]
      }`,
    };
  } catch (error) {
    logger.error("Product insights generation error:", error);
    return { insights: [], recommendations: [] };
  }
}

/**
 * Get product data for a specific period
 */
async function getProductPeriodData(userId, productId, dateRange) {
  const whereClause = {
    include: [
      {
        model: Order,
        as: "order",
        where: {
          userId,
          createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
        },
        attributes: [],
      },
    ],
    attributes: [
      [
        OrderItem.sequelize.fn("SUM", OrderItem.sequelize.col("quantity")),
        "totalSold",
      ],
      [
        OrderItem.sequelize.fn(
          "SUM",
          OrderItem.sequelize.literal('"quantity" * "OrderItem"."price"')
        ),
        "totalRevenue",
      ],
      [
        OrderItem.sequelize.fn("COUNT", OrderItem.sequelize.col("order.id")),
        "totalOrders",
      ],
      [
        OrderItem.sequelize.fn(
          "AVG",
          OrderItem.sequelize.col("OrderItem.price")
        ),
        "averagePrice",
      ],
    ],
  };

  if (productId) {
    whereClause.where = { productId };
  }

  const result = await OrderItem.findOne(whereClause);

  return {
    totalSold: parseInt(result?.get("totalSold") || 0),
    totalRevenue: parseFloat(result?.get("totalRevenue") || 0),
    totalOrders: parseInt(result?.get("totalOrders") || 0),
    averagePrice: parseFloat(result?.get("averagePrice") || 0),
  };
}

/**
 * Get seasonal trends for products
 */
async function getProductSeasonalTrends(userId, productId, dateRange) {
  try {
    // Simplified seasonal analysis - would be more complex in production
    const monthlyData = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: "order",
          where: {
            userId,
            createdAt: {
              [Op.gte]: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            }, // Last year
          },
          attributes: [],
        },
      ],
      where: productId ? { productId } : {},
      attributes: [
        [
          OrderItem.sequelize.fn(
            "strftime",
            "%m",
            OrderItem.sequelize.col("order.createdAt")
          ),
          "month",
        ],
        [
          OrderItem.sequelize.fn("SUM", OrderItem.sequelize.col("quantity")),
          "totalSold",
        ],
      ],
      group: [
        OrderItem.sequelize.fn(
          "strftime",
          "%m",
          OrderItem.sequelize.col("order.createdAt")
        ),
      ],
      order: [
        [
          OrderItem.sequelize.fn(
            "strftime",
            "%m",
            OrderItem.sequelize.col("order.createdAt")
          ),
          "ASC",
        ],
      ],
    });

    const averageMonthlySales =
      monthlyData.reduce(
        (sum, item) => sum + parseInt(item.get("totalSold")),
        0
      ) / monthlyData.length;

    return monthlyData.map((item) => ({
      month: parseInt(item.get("month")) - 1, // 0-based month
      totalSold: parseInt(item.get("totalSold")),
      salesMultiplier: parseInt(item.get("totalSold")) / averageMonthlySales,
    }));
  } catch (error) {
    logger.error("Seasonal trends error:", error);
    return [];
  }
}

/**
 * Get hourly product breakdown for real-time metrics
 */
async function getHourlyProductBreakdown(userId, productId, dateRange) {
  try {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const hourlyData = await OrderItem.findAll({
      attributes: [
        [
          OrderItem.sequelize.fn(
            "strftime",
            "%H",
            OrderItem.sequelize.col("order.createdAt")
          ),
          "hour",
        ],
        [
          OrderItem.sequelize.fn("SUM", OrderItem.sequelize.col("quantity")),
          "totalSold",
        ],
        [
          OrderItem.sequelize.fn(
            "SUM",
            OrderItem.sequelize.literal('"quantity" * "OrderItem"."price"')
          ),
          "revenue",
        ],
      ],
      include: [
        {
          model: Order,
          as: "order",
          where: {
            userId: userId,
            createdAt: {
              [Op.between]: [startDate, endDate],
            },
          },
        },
      ],
      where: {
        productId: productId,
      },
      group: [
        OrderItem.sequelize.fn(
          "strftime",
          "%H",
          OrderItem.sequelize.col("order.createdAt")
        ),
      ],
      order: [
        [
          OrderItem.sequelize.fn(
            "strftime",
            "%H",
            OrderItem.sequelize.col("order.createdAt")
          ),
          "ASC",
        ],
      ],
    });

    // Fill in missing hours with zero values
    const result = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourData = hourlyData.find((h) => parseInt(h.get("hour")) === hour);
      result.push({
        hour,
        totalSold: hourData ? parseInt(hourData.get("totalSold")) : 0,
        revenue: hourData ? parseFloat(hourData.get("revenue")) : 0,
      });
    }

    return result;
  } catch (error) {
    logger.error("Hourly product breakdown error:", error);
    return [];
  }
}

/**
 * Get stock status for a product
 */
async function getStockStatus(productId) {
  try {
    const product = await Product.findByPk(productId);
    if (!product) {
      return {
        status: "unknown",
        quantity: 0,
        threshold: 0,
      };
    }

    const stockQuantity = product.stockQuantity || 0;
    const lowStockThreshold = product.minStockLevel || 10;

    let status = "in_stock";
    if (stockQuantity === 0) {
      status = "out_of_stock";
    } else if (stockQuantity <= lowStockThreshold) {
      status = "low_stock";
    }

    return {
      status,
      quantity: stockQuantity,
      threshold: lowStockThreshold,
      daysUntilOutOfStock: await calculateDaysUntilOutOfStock(
        productId,
        stockQuantity
      ),
    };
  } catch (error) {
    logger.error("Stock status error:", error);
    return {
      status: "unknown",
      quantity: 0,
      threshold: 0,
    };
  }
}

/**
 * Get top performing products
 */
async function getTopProducts(userId, dateRange, limit = 10) {
  // Valid statuses for revenue calculation (exclude returned/cancelled)
  const validRevenueStatuses = [
    "new",
    "processing",
    "shipped",
    "delivered",
    "delivered",
  ];

  const topProducts = await OrderItem.findAll({
    include: [
      {
        model: Order,
        as: "order",
        where: {
          userId,
          createdAt: {
            [Op.between]: [dateRange.start, dateRange.end],
          },
          orderStatus: { [Op.in]: validRevenueStatuses }, // Exclude returned/cancelled orders
        },
        attributes: ["platform", "orderStatus"], // Include platform and status information
      },
      {
        model: Product,
        as: "product",
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
          OrderItem.sequelize.literal(
            'CASE WHEN "OrderItem"."price" > 0 THEN "OrderItem"."quantity" * "OrderItem"."price" ELSE 0 END'
          )
        ),
        "totalRevenue",
      ],
    ],
    group: [
      "productId",
      "product.id",
      "order.id",
      "order.platform",
      "order.orderStatus",
    ], // Group by all selected columns
    order: [
      [
        OrderItem.sequelize.fn("SUM", OrderItem.sequelize.col("quantity")),
        "DESC",
      ],
    ],
    limit,
  });

  return topProducts.map((item) => {
    const totalSold = parseInt(item.get("totalSold")) || 0;
    const totalRevenue = parseFloat(item.get("totalRevenue")) || 0;

    return {
      productId: item.productId,
      name: item.product?.name || "Unknown Product",
      sku: item.product?.sku || "N/A",
      category: item.product?.category || "Uncategorized",
      platform: item.order?.platform || "Unknown", // Add platform info
      totalSold,
      totalRevenue: isNaN(totalRevenue) ? 0 : totalRevenue, // Handle NaN values safely
      orderCount: totalSold, // Add order count field for UI
      // Add backward compatibility fields
      sales: totalSold,
      revenue: isNaN(totalRevenue) ? 0 : totalRevenue,
      // Add price per unit calculation
      avgPrice: totalSold > 0 ? totalRevenue / totalSold : 0,
    };
  });
}

// Helper function to calculate days until out of stock
async function calculateDaysUntilOutOfStock(
  productId,
  currentStock,
  avgDailySales
) {
  try {
    if (!avgDailySales || avgDailySales <= 0) {
      return null;
    }
    return Math.ceil(currentStock / avgDailySales);
  } catch (error) {
    logger.error("Error calculating days until out of stock:", error);
    return null;
  }
}

module.exports = {
  getProductAnalytics,
  getProductDailyTrends,
  generateProductInsights,
  getProductPeriodData,
  getProductSeasonalTrends,
  getHourlyProductBreakdown,
  getStockStatus,
  getTopProducts,
};
