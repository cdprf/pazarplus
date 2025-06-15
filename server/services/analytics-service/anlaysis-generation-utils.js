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
 * Generate market recommendations
 */
function generateMarketRecommendations(marketIntelligence) {
  const recommendations = [];

  try {
    if (
      marketIntelligence.categoryPerformance &&
      marketIntelligence.categoryPerformance.length > 0
    ) {
      const topCategory = marketIntelligence.categoryPerformance[0];
      recommendations.push({
        type: "success",
        title: "Top Performing Category",
        description: `${topCategory.category} is your best performing category`,
        action: "Consider expanding your product range in this category",
      });
    }

    recommendations.push({
      type: "info",
      title: "Market Analysis",
      description: "Regular market analysis helps identify new opportunities",
      action: "Monitor competitor pricing and market trends weekly",
    });
  } catch (error) {
    logger.error("Error generating market recommendations:", error);
  }

  return recommendations;
}

/**
 * Generate pricing recommendations
 */
function generatePricingRecommendations(
  averageVariation,
  highVariationProducts
) {
  const recommendations = [];

  if (averageVariation > 15) {
    recommendations.push({
      type: "warning",
      title: "Yüksek Fiyat Değişkenliği",
      description:
        "Ürünlerinizde platform arası yüksek fiyat farklılıkları tespit edildi. Fiyat optimizasyonu yaparak geliri artırabilirsiniz.",
    });
  }

  if (highVariationProducts.length > 0) {
    recommendations.push({
      type: "info",
      title: "Fiyat Uyumsuzluğu",
      description: `${highVariationProducts.length} ürününde platformlar arası %20'den fazla fiyat farkı var. Bu ürünleri gözden geçirmeyi düşünün.`,
    });
  }

  if (averageVariation < 5) {
    recommendations.push({
      type: "success",
      title: "Tutarlı Fiyatlandırma",
      description:
        "Platformlar arası fiyat tutarlılığınız iyi durumda. Bu stratejiyi sürdürün.",
    });
  }

  return recommendations;
}
/**
 * Generate AI-powered recommendations
 */
function generateRecommendations(salesData, trends, insights) {
  const recommendations = [];

  try {
    // Sales performance recommendations
    if (salesData && salesData.length > 0) {
      const avgRevenue =
        salesData.reduce(
          (sum, item) => sum + (parseFloat(item.revenue) || 0),
          0
        ) / salesData.length;
      const recentRevenue =
        salesData
          .slice(-7)
          .reduce((sum, item) => sum + (parseFloat(item.revenue) || 0), 0) / 7;

      if (recentRevenue < avgRevenue * 0.8) {
        recommendations.push({
          type: "warning",
          category: "sales",
          title: "Satış Performansı Düşüşü",
          description:
            "Son hafta satışlarınız ortalamadan %20 düşük. Pazarlama stratejilerinizi gözden geçirin.",
          priority: "high",
          action:
            "Ürün tanıtımlarını artırın ve fiyat stratejilerinizi optimize edin.",
        });
      } else if (recentRevenue > avgRevenue * 1.2) {
        recommendations.push({
          type: "success",
          category: "sales",
          title: "Güçlü Satış Performansı",
          description:
            "Son hafta satışlarınız ortalamadan %20 yüksek. Bu momentum devam ettirin.",
          priority: "medium",
          action: "Başarılı stratejilerinizi diğer ürünlere de uygulayın.",
        });
      }
    }

    // Trend-based recommendations
    if (trends && trends.length > 0) {
      const growthTrend = calculateGrowthTrend(trends);

      if (growthTrend > 0.1) {
        recommendations.push({
          type: "info",
          category: "growth",
          title: "Büyüme Fırsatı",
          description:
            "Pozitif büyüme trendi tespit edildi. Stoklarınızı artırmayı düşünün.",
          priority: "medium",
          action: "Popüler ürünlerin stok seviyelerini artırın.",
        });
      } else if (growthTrend < -0.1) {
        recommendations.push({
          type: "warning",
          category: "growth",
          title: "Büyüme Yavaşlaması",
          description:
            "Negatif büyüme trendi tespit edildi. Yeni pazarlama stratejileri geliştirin.",
          priority: "high",
          action:
            "Müşteri geri bildirimlerini toplayın ve ürün gamınızı çeşitlendirin.",
        });
      }
    }

    // General recommendations
    recommendations.push({
      type: "info",
      category: "general",
      title: "Veri Analizi",
      description:
        "Düzenli veri analizi yaparak işletmenizin performansını takip edin.",
      priority: "low",
      action:
        "Haftalık analiz raporlarını inceleyin ve stratejilerinizi güncelleyin.",
    });
  } catch (error) {
    logger.error("Recommendation generation error:", error);
    // Return default recommendations on error
    recommendations.push({
      type: "info",
      category: "system",
      title: "Sistem Bilgisi",
      description: "Önerileri oluşturmak için daha fazla veri gerekiyor.",
      priority: "low",
      action: "Daha fazla satış verisi topladıktan sonra tekrar kontrol edin.",
    });
  }

  return recommendations;
}
/**
 * Generate custom analytics reports
 */
async function generateCustomReport(userId, config) {
  const { metrics, dimensions, filters, timeframe } = config;
  const cacheKey = `${cachePrefix}custom-report:${userId}:${JSON.stringify(
    config
  )}`;

  try {
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const dateRange = getDateRange(timeframe);

    // Build query based on requested metrics and dimensions
    let query = {
      where: {
        userId,
        createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      },
      include: [],
      attributes: [],
      group: [],
    };

    // Apply filters
    if (filters) {
      if (filters.platform) {
        query.where.platform = filters.platform;
      }
      if (filters.status) {
        query.where.status = filters.status;
      }
      if (filters.minAmount) {
        query.where.totalAmount = { [Op.gte]: filters.minAmount };
      }
    }

    // Add dimensions to group by
    if (dimensions && dimensions.length > 0) {
      dimensions.forEach((dimension) => {
        switch (dimension) {
          case "platform":
            query.attributes.push("platform");
            query.group.push("platform");
            break;
          case "date":
            query.attributes.push([
              Order.sequelize.fn("DATE", Order.sequelize.col("createdAt")),
              "date",
            ]);
            query.group.push([
              Order.sequelize.fn("DATE", Order.sequelize.col("createdAt")),
            ]);
            break;
          case "status":
            query.attributes.push("status");
            query.group.push("status");
            break;
        }
      });
    }

    // Add requested metrics
    metrics.forEach((metric) => {
      switch (metric) {
        case "orderCount":
          query.attributes.push([
            Order.sequelize.fn("COUNT", Order.sequelize.col("id")),
            "orderCount",
          ]);
          break;
        case "totalRevenue":
          query.attributes.push([
            Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")),
            "totalRevenue",
          ]);
          break;
        case "averageOrderValue":
          query.attributes.push([
            Order.sequelize.fn("AVG", Order.sequelize.col("totalAmount")),
            "averageOrderValue",
          ]);
          break;
        case "customerCount":
          query.attributes.push([
            Order.sequelize.fn(
              "COUNT",
              Order.sequelize.fn(
                "DISTINCT",
                Order.sequelize.col("customerEmail")
              )
            ),
            "customerCount",
          ]);
          break;
      }
    });

    // Execute query
    const reportData = await Order.findAll(query);

    // Process results
    const processedData = reportData.map((item) => {
      const result = {};
      const values = item.dataValues;

      // Add dimensions
      if (dimensions) {
        dimensions.forEach((dimension) => {
          result[dimension] = values[dimension];
        });
      }

      // Add metrics
      metrics.forEach((metric) => {
        result[metric] =
          parseFloat(values[metric]) || parseInt(values[metric]) || 0;
      });

      return result;
    });

    const result = {
      data: processedData,
      config,
      summary: {
        totalRows: processedData.length,
        dateRange: {
          start: dateRange.start,
          end: dateRange.end,
        },
        metrics: metrics,
        dimensions: dimensions,
        filters: filters,
      },
      generatedAt: new Date().toISOString(),
    };

    await cacheService.set(cacheKey, result, defaultCacheTTL);
    return result;
  } catch (error) {
    logger.error("Error generating custom report:", error);
    return {
      data: [],
      config,
      summary: {},
      generatedAt: new Date().toISOString(),
      error: error.message,
    };
  }
}

/**
 * Generate insights from trend data
 */
function generateInsights(trends) {
  if (!trends || trends.length === 0) {
    return ["No data available for analysis"];
  }

  const insights = [];
  const totalOrders = trends.reduce((sum, t) => sum + (t.orders || 0), 0);
  const avgOrders = totalOrders / trends.length;

  // Growth insights
  if (trends.length >= 7) {
    const recentWeek = trends.slice(-7);
    const previousWeek = trends.slice(-14, -7);

    if (previousWeek.length > 0) {
      const recentAvg =
        recentWeek.reduce((sum, t) => sum + (t.orders || 0), 0) /
        recentWeek.length;
      const previousAvg =
        previousWeek.reduce((sum, t) => sum + (t.orders || 0), 0) /
        previousWeek.length;

      if (recentAvg > previousAvg * 1.1) {
        insights.push(
          "📈 Strong growth trend detected - orders increased by more than 10%"
        );
      } else if (recentAvg < previousAvg * 0.9) {
        insights.push(
          "📉 Declining trend detected - orders decreased by more than 10%"
        );
      } else {
        insights.push("📊 Stable performance - orders remained consistent");
      }
    }
  }

  // Peak days analysis
  const maxOrders = Math.max(...trends.map((t) => t.orders || 0));
  const peakDays = trends.filter((t) => (t.orders || 0) > avgOrders * 1.5);

  if (peakDays.length > 0) {
    insights.push(`🔥 ${peakDays.length} high-performance days identified`);
  }

  // Low performance warning
  const lowDays = trends.filter((t) => (t.orders || 0) < avgOrders * 0.5);
  if (lowDays.length > trends.length * 0.3) {
    insights.push(
      "⚠️ Multiple low-performance days detected - consider promotional activities"
    );
  }

  // Revenue insights
  const totalRevenue = trends.reduce((sum, t) => sum + (t.revenue || 0), 0);
  const avgRevenue = totalRevenue / trends.length;
  const avgOrderValue = totalRevenue / Math.max(1, totalOrders);

  if (avgOrderValue > 100) {
    insights.push(
      "💰 High average order value indicates premium customer base"
    );
  } else if (avgOrderValue < 25) {
    insights.push("📦 Low average order value - consider upselling strategies");
  }

  return insights.length > 0
    ? insights
    : ["📊 Data analysis complete - monitor trends for opportunities"];
}

/**
 * Generate simple forecast based on historical trends
 */
function generateSimpleForecast(data, days = 7) {
  if (!data || data.length === 0) {
    return [];
  }

  // Calculate the trend from the last few data points
  const recentData = data.slice(-Math.min(14, data.length));
  const trend = calculateTrend(recentData);

  const lastDataPoint = data[data.length - 1];
  const forecast = [];

  for (let i = 1; i <= days; i++) {
    const futureDate = new Date(lastDataPoint.date);
    futureDate.setDate(futureDate.getDate() + i);

    const forecastValue = Math.max(0, (lastDataPoint.orders || 0) + trend * i);
    const forecastRevenue =
      forecastValue *
      (lastDataPoint.revenue / Math.max(1, lastDataPoint.orders));

    forecast.push({
      date: futureDate.toISOString().split("T")[0],
      orders: Math.round(forecastValue),
      revenue: Math.round(forecastRevenue * 100) / 100,
      isForecast: true,
    });
  }

  return forecast;
}

module.exports = {
  generateInsights,
  generateSimpleForecast,
  generateCustomReport,
  generateRecommendations,
  generatePricingRecommendations,
  generateMarketRecommendations,
};
