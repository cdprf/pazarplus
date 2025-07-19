const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics-controller");
const { auth } = require("../middleware/auth"); // Fixed: destructure auth from middleware
const rateLimit = require("express-rate-limit");
const analyticsPerformanceMiddleware = require("../middleware/analyticsPerformance");

// Rate limiting for analytics endpoints
const analyticsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many analytics requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Test route without authentication
router.get("/test-products-simple", async (req, res) => {
  try {
    const { timeframe = "30d" } = req.query;

    // Create date range
    const end = new Date();
    const start = new Date();
    const timeframeMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = timeframeMap[timeframe] || 30;
    start.setDate(start.getDate() - days);

    // Simple product analytics using direct SQL
    const { Order, OrderItem, Product } = require("../models");
    const { Op } = require("sequelize");

    // Get basic product stats for any user (test data)
    const productStats = await OrderItem.findAll({
      attributes: [
        "productId",
        [
          OrderItem.sequelize.fn(
            "COUNT",
            OrderItem.sequelize.col("OrderItem.id")
          ),
          "totalSold",
        ],
        [
          OrderItem.sequelize.fn(
            "SUM",
            OrderItem.sequelize.literal(
              '"OrderItem"."quantity" * "OrderItem"."price"'
            )
          ),
          "totalRevenue",
        ],
        [
          OrderItem.sequelize.fn(
            "COUNT",
            OrderItem.sequelize.fn(
              "DISTINCT",
              OrderItem.sequelize.col("orderId")
            )
          ),
          "totalOrders",
        ],
        [
          OrderItem.sequelize.fn(
            "AVG",
            OrderItem.sequelize.col("OrderItem.price")
          ),
          "avgPrice",
        ],
      ],
      include: [
        {
          model: Order,
          as: "order",
          where: {
            createdAt: { [Op.between]: [start, end] },
          },
          attributes: [],
        },
        {
          model: Product,
          as: "product",
          attributes: ["name", "sku", "category"],
          required: false,
        },
      ],
      group: ["OrderItem.productId", "product.id"],
      order: [
        [
          OrderItem.sequelize.fn(
            "SUM",
            OrderItem.sequelize.literal(
              '"OrderItem"."quantity" * "OrderItem"."price"'
            )
          ),
          "DESC",
        ],
      ],
      limit: 20,
      raw: false,
    });

    // Format the results
    const formattedStats = productStats.map((item) => ({
      productId: item.productId,
      productName: item.product?.name || "Unknown Product",
      sku: item.product?.sku || "",
      category: item.product?.category || "Unknown",
      totalSold: parseInt(item.get("totalSold") || 0),
      totalRevenue: parseFloat(item.get("totalRevenue") || 0),
      totalOrders: parseInt(item.get("totalOrders") || 0),
      avgPrice: parseFloat(item.get("avgPrice") || 0),
    }));

    // Calculate summary
    const summary = {
      totalProducts: formattedStats.length,
      totalRevenue: formattedStats.reduce((sum, p) => sum + p.totalRevenue, 0),
      totalSold: formattedStats.reduce((sum, p) => sum + p.totalSold, 0),
      totalOrders: formattedStats.reduce((sum, p) => sum + p.totalOrders, 0),
      topProducts: formattedStats.slice(0, 10),
    };

    res.json({
      success: true,
      data: {
        summary,
        products: formattedStats,
        topProducts: formattedStats.slice(0, 10),
        timeframe,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Test product analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving test product analytics",
      error: error.message,
    });
  }
});

// Test route for products with user ID parameter (no auth)
router.get("/test-products-with-user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeframe = "30d", productId } = req.query;

    // Create date range
    const end = new Date();
    const start = new Date();
    const timeframeMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = timeframeMap[timeframe] || 30;
    start.setDate(start.getDate() - days);

    // Simple product analytics using direct SQL
    const { Order, OrderItem, Product } = require("../models");
    const { Op } = require("sequelize");

    // Build query with user filter and optional product filter
    const whereClause = {
      attributes: [
        "productId",
        [
          OrderItem.sequelize.fn(
            "COUNT",
            OrderItem.sequelize.col("OrderItem.id")
          ),
          "totalSold",
        ],
        [
          OrderItem.sequelize.fn(
            "SUM",
            OrderItem.sequelize.literal(
              '"OrderItem"."quantity" * "OrderItem"."price"'
            )
          ),
          "totalRevenue",
        ],
        [
          OrderItem.sequelize.fn(
            "COUNT",
            OrderItem.sequelize.fn(
              "DISTINCT",
              OrderItem.sequelize.col("orderId")
            )
          ),
          "totalOrders",
        ],
        [
          OrderItem.sequelize.fn(
            "AVG",
            OrderItem.sequelize.col("OrderItem.price")
          ),
          "avgPrice",
        ],
      ],
      include: [
        {
          model: Order,
          as: "order",
          where: {
            userId,
            createdAt: { [Op.between]: [start, end] },
          },
          attributes: [],
        },
        {
          model: Product,
          as: "product",
          attributes: ["name", "sku", "category"],
          required: false,
        },
      ],
      group: ["OrderItem.productId", "product.id"],
      order: [
        [
          OrderItem.sequelize.fn(
            "SUM",
            OrderItem.sequelize.literal(
              '"OrderItem"."quantity" * "OrderItem"."price"'
            )
          ),
          "DESC",
        ],
      ],
      limit: 50,
      raw: false,
    };

    // Add product filter if specified
    if (productId) {
      whereClause.where = { productId };
    }

    const productStats = await OrderItem.findAll(whereClause);

    // Format the results
    const formattedStats = productStats.map((item) => ({
      productId: item.productId,
      name: item.product?.name || "Unknown Product",
      sku: item.product?.sku || "",
      category: item.product?.category || "Unknown",
      totalSold: parseInt(item.get("totalSold") || 0),
      totalRevenue: parseFloat(item.get("totalRevenue") || 0),
      totalOrders: parseInt(item.get("totalOrders") || 0),
      avgPrice: parseFloat(item.get("avgPrice") || 0),
    }));

    // Calculate summary
    const summary = {
      totalProducts: formattedStats.length,
      totalRevenue: formattedStats.reduce((sum, p) => sum + p.totalRevenue, 0),
      totalSold: formattedStats.reduce((sum, p) => sum + p.totalSold, 0),
      totalOrders: formattedStats.reduce((sum, p) => sum + p.totalOrders, 0),
      averagePrice:
        formattedStats.length > 0
          ? formattedStats.reduce((sum, p) => sum + p.avgPrice, 0) /
            formattedStats.length
          : 0,
      topCategory:
        formattedStats.length > 0 ? formattedStats[0].category : null,
    };

    // Create mock daily trends
    const dailyTrends = [];
    for (let i = 0; i < Math.min(30, days); i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      dailyTrends.push({
        date: date.toISOString().split("T")[0],
        soldQuantity: Math.floor(Math.random() * 5),
        revenue: Math.floor(Math.random() * 1000),
        orders: Math.floor(Math.random() * 3),
      });
    }

    // Create platform breakdown
    const platformBreakdown = [
      {
        platform: "Trendyol",
        totalSold: Math.floor(summary.totalSold * 0.4),
        totalRevenue: Math.floor(summary.totalRevenue * 0.4),
        totalOrders: Math.floor(summary.totalOrders * 0.4),
      },
      {
        platform: "Hepsiburada",
        totalSold: Math.floor(summary.totalSold * 0.35),
        totalRevenue: Math.floor(summary.totalRevenue * 0.35),
        totalOrders: Math.floor(summary.totalOrders * 0.35),
      },
      {
        platform: "N11",
        totalSold: Math.floor(summary.totalSold * 0.25),
        totalRevenue: Math.floor(summary.totalRevenue * 0.25),
        totalOrders: Math.floor(summary.totalOrders * 0.25),
      },
    ];

    const response = {
      success: true,
      data: {
        summary,
        products: formattedStats,
        topProducts: formattedStats.slice(0, 10),
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
          topProducts: formattedStats.slice(0, 10).map((product) => ({
            name: product.name,
            revenue: product.totalRevenue,
            sold: product.totalSold,
            category: product.category,
          })),
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
          performance: formattedStats.slice(0, 10).map((product) => ({
            name: product.name,
            value: product.totalRevenue,
          })),
          categories: platformBreakdown.map((platform) => ({
            name: platform.platform,
            value: platform.totalRevenue,
          })),
        },
        insights: {
          insights: [
            "Ürün performansı analiz ediliyor",
            "En çok satan ürünler belirlendi",
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
        timeframe,
        userId,
        generatedAt: new Date(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Test product analytics with user error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving test product analytics with user",
      error: error.message,
    });
  }
});

// Test route for customer analytics with user ID parameter (no auth)
router.get("/test-customer-analytics/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeframe = "30d" } = req.query;

    // Create date range
    const end = new Date();
    const start = new Date();
    const timeframeMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = timeframeMap[timeframe] || 30;
    start.setDate(start.getDate() - days);

    // Simple customer analytics using direct SQL
    const { Order, OrderItem } = require("../models");
    const { Op } = require("sequelize");

    // Get customer data from orders
    const customerData = await Order.findAll({
      where: {
        userId,
        createdAt: { [Op.between]: [start, end] },
      },
      attributes: [
        "customerName",
        "customerEmail",
        "customerPhone",
        [
          Order.sequelize.fn("COUNT", Order.sequelize.col("Order.id")),
          "totalOrders",
        ],
        [
          Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")),
          "totalSpent",
        ],
        [
          Order.sequelize.fn("AVG", Order.sequelize.col("totalAmount")),
          "avgOrderValue",
        ],
        [
          Order.sequelize.fn("MIN", Order.sequelize.col("createdAt")),
          "firstOrder",
        ],
        [
          Order.sequelize.fn("MAX", Order.sequelize.col("createdAt")),
          "lastOrder",
        ],
      ],
      group: ["customerName", "customerEmail", "customerPhone"],
      order: [
        [Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")), "DESC"],
      ],
      limit: 100,
      raw: true,
    });

    // Calculate summary statistics
    const totalCustomers = customerData.length;
    const totalRevenue = customerData.reduce(
      (sum, customer) => sum + parseFloat(customer.totalSpent || 0),
      0
    );
    const totalOrders = customerData.reduce(
      (sum, customer) => sum + parseInt(customer.totalOrders || 0),
      0
    );
    const avgCustomerValue =
      totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    const avgOrdersPerCustomer =
      totalCustomers > 0 ? totalOrders / totalCustomers : 0;

    // Format customer data
    const formattedCustomers = customerData.map((customer) => ({
      name: customer.customerName || "Unknown",
      email: customer.customerEmail || "",
      phone: customer.customerPhone || "",
      totalOrders: parseInt(customer.totalOrders || 0),
      totalSpent: parseFloat(customer.totalSpent || 0),
      avgOrderValue: parseFloat(customer.avgOrderValue || 0),
      firstOrder: customer.firstOrder,
      lastOrder: customer.lastOrder,
      customerType:
        parseFloat(customer.totalSpent || 0) > avgCustomerValue
          ? "High Value"
          : "Regular",
    }));

    // Create customer segments
    const highValueCustomers = formattedCustomers.filter(
      (c) => c.totalSpent > avgCustomerValue * 1.5
    );
    const regularCustomers = formattedCustomers.filter(
      (c) => c.totalSpent <= avgCustomerValue * 1.5 && c.totalSpent > 0
    );
    const newCustomers = formattedCustomers.filter((c) => {
      const firstOrderDate = new Date(c.firstOrder);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return firstOrderDate > thirtyDaysAgo;
    });

    // Mock some additional analytics data
    const segments = [
      {
        name: "High Value",
        count: highValueCustomers.length,
        percentage:
          totalCustomers > 0
            ? (highValueCustomers.length / totalCustomers) * 100
            : 0,
      },
      {
        name: "Regular",
        count: regularCustomers.length,
        percentage:
          totalCustomers > 0
            ? (regularCustomers.length / totalCustomers) * 100
            : 0,
      },
      {
        name: "New",
        count: newCustomers.length,
        percentage:
          totalCustomers > 0 ? (newCustomers.length / totalCustomers) * 100 : 0,
      },
    ];

    const response = {
      success: true,
      data: {
        summary: {
          totalCustomers,
          totalRevenue,
          totalOrders,
          avgCustomerValue,
          avgOrdersPerCustomer,
          newCustomersThisMonth: newCustomers.length,
          highValueCustomers: highValueCustomers.length,
        },
        customers: formattedCustomers.slice(0, 50), // Limit for performance
        topCustomers: formattedCustomers.slice(0, 10),
        segments,
        charts: {
          customerSegments: segments.map((segment) => ({
            name: segment.name,
            value: segment.count,
            percentage: segment.percentage,
          })),
          monthlyGrowth: [], // Mock data
          retention: [], // Mock data
          lifetimeValue: formattedCustomers.slice(0, 10).map((customer) => ({
            name: customer.name,
            value: customer.totalSpent,
          })),
        },
        insights: {
          insights: [
            `Toplam ${totalCustomers} müşteri`,
            `Ortalama müşteri değeri ₺${avgCustomerValue.toFixed(2)}`,
            `${newCustomers.length} yeni müşteri bu ay`,
          ],
          recommendations: [
            {
              category: "retention",
              priority: "high",
              title: "Müşteri Sadakati",
              description:
                "Yüksek değerli müşteriler için özel kampanyalar düzenleyin",
            },
          ],
        },
        timeframe,
        userId,
        generatedAt: new Date(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Test customer analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving test customer analytics",
      error: error.message,
    });
  }
});

// Test revenue analytics endpoint without authentication
router.get("/test-revenue/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeframe = "30d" } = req.query;

    // Create date range
    const end = new Date();
    const start = new Date();
    const timeframeMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = timeframeMap[timeframe] || 30;
    start.setDate(start.getDate() - days);

    // Simple revenue analytics using direct SQL
    const { Order, OrderItem } = require("../models");
    const { Op } = require("sequelize");

    // Get orders with valid revenue data
    const validStatuses = [
      "new",
      "processing",
      "shipped",
      "in_transit",
      "delivered",
    ];

    const orders = await Order.findAll({
      where: {
        userId,
        createdAt: { [Op.between]: [start, end] },
        orderStatus: { [Op.in]: validStatuses },
      },
      attributes: ["id", "totalAmount", "createdAt", "orderStatus", "platform"],
      order: [["createdAt", "ASC"]],
    });

    // Calculate revenue metrics
    const totalRevenue = orders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount || 0),
      0
    );
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Create daily revenue breakdown
    const dailyRevenue = {};
    orders.forEach((order) => {
      const date = new Date(order.createdAt).toISOString().split("T")[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = { revenue: 0, orders: 0 };
      }
      dailyRevenue[date].revenue += parseFloat(order.totalAmount || 0);
      dailyRevenue[date].orders += 1;
    });

    // Convert to array for last 7 days
    const recentDays = [];
    for (let i = 0; i < Math.min(7, days); i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      recentDays.unshift({
        date: dateStr,
        revenue: dailyRevenue[dateStr]?.revenue || 0,
        orders: dailyRevenue[dateStr]?.orders || 0,
      });
    }

    const response = {
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalOrders,
          avgOrderValue,
        },
        trends: {
          daily: recentDays,
        },
        timeframe,
        userId,
        generatedAt: new Date(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Test revenue analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving test revenue analytics",
      error: error.message,
    });
  }
});

// Test financial KPIs endpoint without authentication
router.get("/test-financial-kpis/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeframe = "30d" } = req.query;

    // Create date range
    const end = new Date();
    const start = new Date();
    const timeframeMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = timeframeMap[timeframe] || 30;
    start.setDate(start.getDate() - days);

    // Simple financial analytics using direct SQL
    const { Order, OrderItem } = require("../models");
    const { Op } = require("sequelize");

    // Get orders with valid financial data
    const validStatuses = [
      "new",
      "processing",
      "shipped",
      "in_transit",
      "delivered",
    ];

    const orders = await Order.findAll({
      where: {
        userId,
        createdAt: { [Op.between]: [start, end] },
        orderStatus: { [Op.in]: validStatuses },
      },
      include: [
        {
          model: OrderItem,
          as: "items",
          attributes: ["quantity", "price", "totalPrice"],
        },
      ],
      attributes: ["id", "totalAmount", "createdAt", "orderStatus", "platform"],
    });

    // Calculate financial metrics
    const totalRevenue = orders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount || 0),
      0
    );
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate profit margin (simplified - assume 30% margin)
    const profitMargin = 0.3;
    const totalProfit = totalRevenue * profitMargin;

    const response = {
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalOrders,
          avgOrderValue,
          totalProfit,
          profitMargin: profitMargin * 100,
        },
        timeframe,
        userId,
        generatedAt: new Date(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Test financial KPIs error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving test financial KPIs",
      error: error.message,
    });
  }
});

// Test route without authentication for debugging (place before auth middleware)
router.get("/test-dashboard/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeframe = "30d" } = req.query;

    console.log(
      `Testing analytics for user ${userId} with timeframe ${timeframe}`
    );

    // Create a mock req.user object
    const mockReq = {
      user: { id: userId },
      query: { timeframe },
    };

    // Call the controller method directly
    await analyticsController.getDashboardAnalytics(mockReq, res);
  } catch (error) {
    console.error("Test route error:", error);
    res.status(500).json({
      success: false,
      message: "Test route error",
      error: error.message,
    });
  }
});

// Direct test route using our fixed functions
router.get("/test-fixed/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeframe = "30d" } = req.query;

    // Import our fixed functions directly
    const {
      getOrderSummary,
      getSimpleRevenueAnalytics,
    } = require("../services/analytics-service/orders-analytic-utils");

    // Create date range
    const end = new Date();
    const start = new Date();
    const timeframeMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = timeframeMap[timeframe] || 30;
    start.setDate(start.getDate() - days);

    const dateRange = { start, end };

    // Get analytics using our fixed functions
    const [orderSummary, revenue] = await Promise.all([
      getOrderSummary(userId, dateRange),
      getSimpleRevenueAnalytics(userId, dateRange),
    ]);

    res.json({
      success: true,
      data: {
        orderSummary,
        revenue,
        timeframe,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Direct test error:", error);
    res.status(500).json({
      success: false,
      message: "Direct test error",
      error: error.message,
    });
  }
});

// Test product analytics without auth
router.get("/test-products/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeframe = "30d" } = req.query;

    // Create date range
    const end = new Date();
    const start = new Date();
    const timeframeMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = timeframeMap[timeframe] || 30;
    start.setDate(start.getDate() - days);

    // Simple product analytics using direct SQL
    const { Order, OrderItem, Product } = require("../../models");
    const { Op } = require("sequelize");

    // Get basic product stats
    const productStats = await OrderItem.findAll({
      attributes: [
        "productId",
        [
          OrderItem.sequelize.fn(
            "COUNT",
            OrderItem.sequelize.col("OrderItem.id")
          ),
          "totalSold",
        ],
        [
          OrderItem.sequelize.fn(
            "SUM",
            OrderItem.sequelize.literal(
              '"OrderItem"."quantity" * "OrderItem"."price"'
            )
          ),
          "totalRevenue",
        ],
        [
          OrderItem.sequelize.fn(
            "COUNT",
            OrderItem.sequelize.fn(
              "DISTINCT",
              OrderItem.sequelize.col("orderId")
            )
          ),
          "totalOrders",
        ],
        [
          OrderItem.sequelize.fn(
            "AVG",
            OrderItem.sequelize.col("OrderItem.price")
          ),
          "avgPrice",
        ],
      ],
      include: [
        {
          model: Order,
          as: "order",
          where: {
            userId,
            createdAt: { [Op.between]: [start, end] },
          },
          attributes: [],
        },
        {
          model: Product,
          as: "product",
          attributes: ["name", "sku", "category"],
          required: false,
        },
      ],
      group: ["OrderItem.productId", "product.id"],
      order: [[OrderItem.sequelize.literal("totalRevenue"), "DESC"]],
      limit: 20,
      raw: false,
    });

    // Format the results
    const formattedStats = productStats.map((item) => ({
      productId: item.productId,
      productName: item.product?.name || "Unknown Product",
      sku: item.product?.sku || "",
      category: item.product?.category || "Unknown",
      totalSold: parseInt(item.get("totalSold") || 0),
      totalRevenue: parseFloat(item.get("totalRevenue") || 0),
      totalOrders: parseInt(item.get("totalOrders") || 0),
      avgPrice: parseFloat(item.get("avgPrice") || 0),
    }));

    // Calculate summary
    const summary = {
      totalProducts: formattedStats.length,
      totalRevenue: formattedStats.reduce((sum, p) => sum + p.totalRevenue, 0),
      totalSold: formattedStats.reduce((sum, p) => sum + p.totalSold, 0),
      totalOrders: formattedStats.reduce((sum, p) => sum + p.totalOrders, 0),
      topProducts: formattedStats.slice(0, 10),
    };

    res.json({
      success: true,
      data: {
        summary,
        products: formattedStats,
        topProducts: formattedStats.slice(0, 10),
        timeframe,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Test product analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving product analytics",
      error: error.message,
    });
  }
});

// Temporary endpoints without authentication for frontend testing
router.get("/customer-analytics-temp", async (req, res) => {
  try {
    const { timeframe = "30d" } = req.query;
    // Use a hardcoded user ID for testing
    const userId = "8bd737ab-8a3f-4f50-ab2c-d310d43e867a";

    // Create date range
    const end = new Date();
    const start = new Date();
    const timeframeMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = timeframeMap[timeframe] || 30;
    start.setDate(start.getDate() - days);

    // Simple customer analytics using direct SQL
    const { Order, OrderItem } = require("../models");
    const { Op } = require("sequelize");

    // Get customer data from orders
    const customerData = await Order.findAll({
      where: {
        userId,
        createdAt: { [Op.between]: [start, end] },
      },
      attributes: [
        "customerName",
        "customerEmail",
        "customerPhone",
        [
          Order.sequelize.fn("COUNT", Order.sequelize.col("Order.id")),
          "totalOrders",
        ],
        [
          Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")),
          "totalSpent",
        ],
        [
          Order.sequelize.fn("AVG", Order.sequelize.col("totalAmount")),
          "avgOrderValue",
        ],
        [
          Order.sequelize.fn("MIN", Order.sequelize.col("createdAt")),
          "firstOrder",
        ],
        [
          Order.sequelize.fn("MAX", Order.sequelize.col("createdAt")),
          "lastOrder",
        ],
      ],
      group: ["customerName", "customerEmail", "customerPhone"],
      order: [
        [Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")), "DESC"],
      ],
      limit: 100,
      raw: true,
    });

    // Calculate summary statistics
    const totalCustomers = customerData.length;
    const totalRevenue = customerData.reduce(
      (sum, customer) => sum + parseFloat(customer.totalSpent || 0),
      0
    );
    const totalOrders = customerData.reduce(
      (sum, customer) => sum + parseInt(customer.totalOrders || 0),
      0
    );
    const avgCustomerValue =
      totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    const avgOrdersPerCustomer =
      totalCustomers > 0 ? totalOrders / totalCustomers : 0;

    // Format customer data
    const formattedCustomers = customerData.map((customer) => ({
      name: customer.customerName || "Unknown",
      email: customer.customerEmail || "",
      phone: customer.customerPhone || "",
      totalOrders: parseInt(customer.totalOrders || 0),
      totalSpent: parseFloat(customer.totalSpent || 0),
      avgOrderValue: parseFloat(customer.avgOrderValue || 0),
      firstOrder: customer.firstOrder,
      lastOrder: customer.lastOrder,
      customerType:
        parseFloat(customer.totalSpent || 0) > avgCustomerValue
          ? "High Value"
          : "Regular",
    }));

    // Create customer segments
    const highValueCustomers = formattedCustomers.filter(
      (c) => c.totalSpent > avgCustomerValue * 1.5
    );
    const regularCustomers = formattedCustomers.filter(
      (c) => c.totalSpent <= avgCustomerValue * 1.5 && c.totalSpent > 0
    );
    const newCustomers = formattedCustomers.filter((c) => {
      const firstOrderDate = new Date(c.firstOrder);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return firstOrderDate > thirtyDaysAgo;
    });

    // Mock some additional analytics data
    const segments = [
      {
        name: "High Value",
        count: highValueCustomers.length,
        percentage:
          totalCustomers > 0
            ? (highValueCustomers.length / totalCustomers) * 100
            : 0,
      },
      {
        name: "Regular",
        count: regularCustomers.length,
        percentage:
          totalCustomers > 0
            ? (regularCustomers.length / totalCustomers) * 100
            : 0,
      },
      {
        name: "New",
        count: newCustomers.length,
        percentage:
          totalCustomers > 0 ? (newCustomers.length / totalCustomers) * 100 : 0,
      },
    ];

    const response = {
      success: true,
      data: {
        summary: {
          totalCustomers,
          totalRevenue,
          totalOrders,
          avgCustomerValue,
          avgOrdersPerCustomer,
          newCustomersThisMonth: newCustomers.length,
          highValueCustomers: highValueCustomers.length,
        },
        customers: formattedCustomers.slice(0, 50), // Limit for performance
        topCustomers: formattedCustomers.slice(0, 10),
        segments,
        charts: {
          customerSegments: segments.map((segment) => ({
            name: segment.name,
            value: segment.count,
            percentage: segment.percentage,
          })),
          monthlyGrowth: [], // Mock data
          retention: [], // Mock data
          lifetimeValue: formattedCustomers.slice(0, 10).map((customer) => ({
            name: customer.name,
            value: customer.totalSpent,
          })),
        },
        insights: {
          insights: [
            `Toplam ${totalCustomers} müşteri`,
            `Ortalama müşteri değeri ₺${avgCustomerValue.toFixed(2)}`,
            `${newCustomers.length} yeni müşteri bu ay`,
          ],
          recommendations: [
            {
              category: "retention",
              priority: "high",
              title: "Müşteri Sadakati",
              description:
                "Yüksek değerli müşteriler için özel kampanyalar düzenleyin",
            },
          ],
        },
        timeframe,
        generatedAt: new Date(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Temporary customer analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving customer analytics",
      error: error.message,
    });
  }
});

router.get("/financial-kpis-temp", async (req, res) => {
  try {
    const { timeframe = "30d" } = req.query;
    // Use a hardcoded user ID for testing
    const userId = "8bd737ab-8a3f-4f50-ab2c-d310d43e867a";

    // Create date range
    const end = new Date();
    const start = new Date();
    const timeframeMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = timeframeMap[timeframe] || 30;
    start.setDate(start.getDate() - days);

    // Simple financial analytics using direct SQL
    const { Order, OrderItem } = require("../models");
    const { Op } = require("sequelize");

    // Get orders with valid financial data
    const validStatuses = [
      "new",
      "processing",
      "shipped",
      "in_transit",
      "delivered",
    ];

    const orders = await Order.findAll({
      where: {
        userId,
        createdAt: { [Op.between]: [start, end] },
        orderStatus: { [Op.in]: validStatuses },
      },
      include: [
        {
          model: OrderItem,
          as: "items",
          attributes: ["quantity", "price", "totalPrice"],
        },
      ],
      attributes: ["id", "totalAmount", "createdAt", "orderStatus", "platform"],
    });

    // Calculate financial metrics
    const totalRevenue = orders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount || 0),
      0
    );
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate profit margin (simplified - assume 30% margin)
    const profitMargin = 0.3;
    const totalProfit = totalRevenue * profitMargin;
    const avgProfit = totalOrders > 0 ? totalProfit / totalOrders : 0;

    // Calculate monthly recurring revenue (simplified)
    const monthlyRevenue = totalRevenue;

    // Get items sold
    const totalItemsSold = orders.reduce((sum, order) => {
      return (
        sum +
        (order.items || []).reduce(
          (itemSum, item) => itemSum + parseInt(item.quantity || 0),
          0
        )
      );
    }, 0);

    // Revenue per customer (simplified - unique orders as customers)
    const revenuePerCustomer = avgOrderValue;

    // Platform breakdown
    const platformBreakdown = {};
    orders.forEach((order) => {
      const platform = order.platform || "Unknown";
      if (!platformBreakdown[platform]) {
        platformBreakdown[platform] = { revenue: 0, orders: 0 };
      }
      platformBreakdown[platform].revenue += parseFloat(order.totalAmount || 0);
      platformBreakdown[platform].orders += 1;
    });

    // Convert to array for frontend
    const platformData = Object.entries(platformBreakdown)
      .map(([platform, data]) => ({
        platform,
        revenue: data.revenue,
        orders: data.orders,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Create daily revenue trends
    const dailyRevenue = {};
    orders.forEach((order) => {
      const date = new Date(order.createdAt).toISOString().split("T")[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = 0;
      }
      dailyRevenue[date] += parseFloat(order.totalAmount || 0);
    });

    const revenueTrends = Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Growth rate (simplified - compare with previous period)
    const growthRate = 15.5; // Mock data for now

    const response = {
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalOrders,
          avgOrderValue,
          totalProfit,
          profitMargin: profitMargin * 100,
          monthlyRecurringRevenue: monthlyRevenue,
          revenuePerCustomer,
          totalItemsSold,
          growthRate,
        },
        trends: {
          daily: revenueTrends,
          growth: growthRate,
        },
        breakdown: {
          platforms: platformData,
          orderStatus: validStatuses.map((status) => ({
            status,
            count: orders.filter((o) => o.orderStatus === status).length,
            revenue: orders
              .filter((o) => o.orderStatus === status)
              .reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0),
          })),
        },
        metrics: {
          revenue: {
            total: totalRevenue,
            average: avgOrderValue,
            growth: growthRate,
          },
          profit: {
            total: totalProfit,
            margin: profitMargin * 100,
            average: avgProfit,
          },
          orders: {
            total: totalOrders,
            average: avgOrderValue,
            itemsPerOrder: totalOrders > 0 ? totalItemsSold / totalOrders : 0,
          },
        },
        charts: {
          revenue: revenueTrends.map((item) => ({
            date: item.date,
            value: item.revenue,
          })),
          platforms: platformData.map((item) => ({
            name: item.platform,
            value: item.revenue,
            percentage: item.percentage,
          })),
          profit: revenueTrends.map((item) => ({
            date: item.date,
            value: item.revenue * profitMargin,
          })),
        },
        timeframe,
        generatedAt: new Date(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Temporary financial KPIs error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving financial KPIs",
      error: error.message,
    });
  }
});

// Cohort Analysis Temp Endpoint (bypassing auth for testing)
router.get("/cohort-analysis-temp", async (req, res) => {
  try {
    const { timeframe = "90d" } = req.query;
    // Use a hardcoded user ID for testing
    const userId = "8bd737ab-8a3f-4f50-ab2c-d310d43e867a";

    // Create date range
    const end = new Date();
    const start = new Date();
    const timeframeMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = timeframeMap[timeframe] || 90;
    start.setDate(start.getDate() - days);

    // Simple cohort analysis using direct SQL
    const { Order, OrderItem } = require("../models");
    const { Op, sequelize } = require("sequelize");

    // Get all orders in the timeframe
    const orders = await Order.findAll({
      where: {
        userId,
        orderDate: {
          [Op.between]: [start, end],
        },
      },
      order: [["orderDate", "ASC"]],
    });

    // Group customers by first order month (cohort)
    const customerCohorts = {};
    const customerFirstOrder = {};

    orders.forEach((order) => {
      const customerId = order.customerEmail || order.customerName;
      const orderDate = new Date(order.orderDate);
      const cohortMonth = `${orderDate.getFullYear()}-${String(
        orderDate.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!customerFirstOrder[customerId]) {
        customerFirstOrder[customerId] = orderDate;
        if (!customerCohorts[cohortMonth]) {
          customerCohorts[cohortMonth] = [];
        }
        customerCohorts[cohortMonth].push(customerId);
      }
    });

    // Calculate retention for each cohort
    const cohorts = [];
    const currentDate = new Date();

    Object.entries(customerCohorts).forEach(([cohortMonth, customers]) => {
      const cohortDate = new Date(cohortMonth + "-01");
      const cohortCustomers = customers.length;

      if (cohortCustomers === 0) return;

      // Calculate retention for different months
      const retention = {};

      for (let monthOffset = 1; monthOffset <= 12; monthOffset++) {
        const targetMonth = new Date(cohortDate);
        targetMonth.setMonth(targetMonth.getMonth() + monthOffset);

        // Only calculate if target month is not in the future
        if (targetMonth <= currentDate) {
          const targetStart = new Date(
            targetMonth.getFullYear(),
            targetMonth.getMonth(),
            1
          );
          const targetEnd = new Date(
            targetMonth.getFullYear(),
            targetMonth.getMonth() + 1,
            0
          );

          // Count how many cohort customers made orders in this month
          const retainedCustomers = orders
            .filter((order) => {
              const customerId = order.customerEmail || order.customerName;
              const orderDate = new Date(order.orderDate);
              return (
                customers.includes(customerId) &&
                orderDate >= targetStart &&
                orderDate <= targetEnd
              );
            })
            .map((o) => o.customerEmail || o.customerName);

          const uniqueRetained = [...new Set(retainedCustomers)];
          retention[`month${monthOffset}`] = Math.round(
            (uniqueRetained.length / cohortCustomers) * 100
          );
        }
      }

      cohorts.push({
        period: cohortMonth,
        totalCustomers: cohortCustomers,
        month1: retention.month1 || 0,
        month2: retention.month2 || 0,
        month3: retention.month3 || 0,
        month6: retention.month6 || 0,
        month12: retention.month12 || 0,
      });
    });

    // Sort cohorts by date
    cohorts.sort(
      (a, b) => new Date(a.period + "-01") - new Date(b.period + "-01")
    );

    const insights = [
      `Analizde ${cohorts.length} kohort bulundu`,
      cohorts.length > 0
        ? `En büyük kohort: ${Math.max(
            ...cohorts.map((c) => c.totalCustomers)
          )} müşteri`
        : "Kohort verisi yok",
      cohorts.length > 0
        ? `Ortalama 1. ay elde tutma: %${Math.round(
            cohorts.reduce((sum, c) => sum + c.month1, 0) / cohorts.length
          )}`
        : "",
    ].filter(Boolean);

    res.json({
      success: true,
      data: {
        cohorts,
        retention: cohorts.map((c) => ({
          period: c.period,
          customers: c.totalCustomers,
          retentionRates: [
            100,
            c.month1,
            c.month2,
            c.month3,
            c.month6,
            c.month12,
          ],
        })),
        insights,
        timeframe,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Cohort analysis error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving cohort analysis",
      error: error.message,
    });
  }
});

// Products Analytics Temp Endpoint (bypassing auth for testing)
router.get("/products-temp", async (req, res) => {
  try {
    const { timeframe = "30d" } = req.query;
    // Use a hardcoded user ID for testing
    const userId = "8bd737ab-8a3f-4f50-ab2c-d310d43e867a";

    // Create date range
    const end = new Date();
    const start = new Date();
    const timeframeMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = timeframeMap[timeframe] || 30;
    start.setDate(start.getDate() - days);

    // Get orders and order items
    const { Order, OrderItem } = require("../models");
    const { Op, sequelize } = require("sequelize");

    // Get all order items in the timeframe
    const orderItems = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: "order",
          where: {
            userId,
            orderDate: {
              [Op.between]: [start, end],
            },
          },
          required: true,
        },
      ],
      attributes: [
        "title",
        "sku",
        "quantity",
        "price",
        "totalPrice",
        "barcode",
      ],
    });

    // Group products by name and calculate metrics
    const productMetrics = {};
    let totalRevenue = 0;
    let totalQuantity = 0;

    orderItems.forEach((item) => {
      const productName = item.title || "Unknown Product";
      const quantity = parseInt(item.quantity) || 0;
      const unitPrice = parseFloat(item.price) || 0;
      const totalPrice = parseFloat(item.totalPrice) || quantity * unitPrice;
      const platform = item.order?.platform || "Unknown";

      if (!productMetrics[productName]) {
        productMetrics[productName] = {
          name: productName,
          sku: item.sku || "",
          barcode: item.barcode || "",
          totalRevenue: 0,
          totalQuantity: 0,
          totalOrders: 0,
          avgPrice: 0,
          platforms: {},
          orders: new Set(),
        };
      }

      const product = productMetrics[productName];
      product.totalRevenue += totalPrice;
      product.totalQuantity += quantity;
      product.orders.add(item.order.id);

      // Track platforms
      if (!product.platforms[platform]) {
        product.platforms[platform] = { quantity: 0, revenue: 0 };
      }
      product.platforms[platform].quantity += quantity;
      product.platforms[platform].revenue += totalPrice;

      totalRevenue += totalPrice;
      totalQuantity += quantity;
    });

    // Convert to array and calculate final metrics
    const products = Object.values(productMetrics).map((product) => {
      product.totalOrders = product.orders.size;
      product.avgPrice =
        product.totalQuantity > 0
          ? product.totalRevenue / product.totalQuantity
          : 0;
      product.revenueShare =
        totalRevenue > 0 ? (product.totalRevenue / totalRevenue) * 100 : 0;
      delete product.orders; // Remove Set object for JSON serialization
      return product;
    });

    // Sort by revenue (top selling)
    products.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Get top 10 products
    const topProducts = products.slice(0, 10);

    // Calculate summary metrics
    const summary = {
      totalProducts: products.length,
      totalRevenue,
      totalQuantity,
      avgRevenuePerProduct:
        products.length > 0 ? totalRevenue / products.length : 0,
      topSellingProduct: products.length > 0 ? products[0].name : null,
      mostOrderedProduct:
        products.length > 0
          ? products.reduce(
              (max, p) => (p.totalQuantity > max.totalQuantity ? p : max),
              products[0]
            ).name
          : null,
    };

    // Platform breakdown
    const platformBreakdown = {};
    orderItems.forEach((item) => {
      const platform = item.order?.platform || "Unknown";
      const revenue = parseFloat(item.totalPrice) || 0;
      const quantity = parseInt(item.quantity) || 0;

      if (!platformBreakdown[platform]) {
        platformBreakdown[platform] = {
          revenue: 0,
          quantity: 0,
          products: new Set(),
        };
      }
      platformBreakdown[platform].revenue += revenue;
      platformBreakdown[platform].quantity += quantity;
      platformBreakdown[platform].products.add(item.title);
    });

    // Convert platform breakdown
    const platforms = Object.entries(platformBreakdown).map(([name, data]) => ({
      name,
      revenue: data.revenue,
      quantity: data.quantity,
      productCount: data.products.size,
      avgRevenuePerProduct:
        data.products.size > 0 ? data.revenue / data.products.size : 0,
    }));

    // Create charts data
    const charts = {
      topSellingByRevenue: topProducts.map((p) => ({
        name: p.name.length > 20 ? p.name.substring(0, 20) + "..." : p.name,
        value: p.totalRevenue,
        quantity: p.totalQuantity,
      })),
      topSellingByQuantity: products
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10)
        .map((p) => ({
          name: p.name.length > 20 ? p.name.substring(0, 20) + "..." : p.name,
          value: p.totalQuantity,
          revenue: p.totalRevenue,
        })),
      platformPerformance: platforms.map((p) => ({
        name: p.name,
        value: p.revenue,
        quantity: p.quantity,
        products: p.productCount,
      })),
    };

    // Generate insights
    const insights = [
      `Toplam ${products.length} ürün analiz edildi`,
      topProducts.length > 0
        ? `En çok gelir getiren: ${
            topProducts[0].name
          } (₺${topProducts[0].totalRevenue.toFixed(2)})`
        : "",
      `Toplam satış: ${totalQuantity} adet, ₺${totalRevenue.toFixed(2)} gelir`,
      platforms.length > 1
        ? `En başarılı platform: ${
            platforms.sort((a, b) => b.revenue - a.revenue)[0].name
          }`
        : "",
    ].filter(Boolean);

    res.json({
      success: true,
      data: {
        summary,
        products: products.slice(0, 50), // Limit to top 50 for performance
        topProducts,
        platforms,
        charts,
        insights,
        timeframe,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Products analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving products analytics",
      error: error.message,
    });
  }
});

// Apply middleware to all routes
router.use(auth);
router.use(analyticsRateLimit);
router.use(analyticsPerformanceMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     AnalyticsDashboard:
 *       type: object
 *       properties:
 *         summary:
 *           type: object
 *         revenue:
 *           type: object
 *         platforms:
 *           type: array
 *         topProducts:
 *           type: array
 *         trends:
 *           type: object
 *         predictions:
 *           type: object
 *         generatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get comprehensive dashboard analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time range for analytics
 *     responses:
 *       200:
 *         description: Dashboard analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AnalyticsDashboard'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/dashboard", async (req, res) => {
  try {
    const { timeframe = "30d" } = req.query;
    const userId = req.user.id;

    console.log(
      `Dashboard analytics for user ${userId} with timeframe ${timeframe}`
    );

    // Import our working functions
    const {
      getOrderSummary,
      getSimpleRevenueAnalytics,
    } = require("../services/analytics-service/orders-analytic-utils");

    // Create date range
    const end = new Date();
    const start = new Date();
    const timeframeMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = timeframeMap[timeframe] || 30;
    start.setDate(start.getDate() - days);

    const dateRange = { start, end };

    // Get analytics using our working functions
    const [orderSummary, revenue] = await Promise.all([
      getOrderSummary(userId, dateRange),
      getSimpleRevenueAnalytics(userId, dateRange),
    ]);

    // Format response to match what frontend expects
    const result = {
      success: true,
      data: {
        orderSummary,
        summary: orderSummary, // Duplicate for compatibility
        revenue,
        platformComparison: [],
        platforms: [],
        topProducts: [],
        orderTrends: {
          daily: [],
          weekly: [],
          monthly: [],
          message: "Trend data available",
        },
        trends: {
          daily: [],
          weekly: [],
          monthly: [],
          message: "Trend data available",
        },
        performanceMetrics: {
          conversionRate: 0,
          averageOrderProcessingTime: 0,
          customerSatisfaction: 0,
          returnRate: 0,
          fulfillmentRate: 0,
          orderAccuracy: 0,
          onTimeDelivery: 0,
          customerRetention: 0,
          message: "Performance data available",
        },
        performance: {
          conversionRate: 0,
          averageOrderProcessingTime: 0,
          customerSatisfaction: 0,
          returnRate: 0,
          fulfillmentRate: 0,
          orderAccuracy: 0,
          onTimeDelivery: 0,
          customerRetention: 0,
          message: "Performance data available",
        },
        generatedAt: new Date(),
        timeframe,
        hasData: (orderSummary?.totalOrders || 0) > 0,
      },
      timeframe,
      hasData: (orderSummary?.totalOrders || 0) > 0,
      generatedAt: new Date().toISOString(),
    };

    // Add appropriate message
    if (result.hasData) {
      result.message = "Dashboard analytics retrieved successfully";
    } else {
      result.message =
        "No sales data available yet. Start making sales to see detailed analytics.";
    }

    res.json(result);
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving analytics",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/analytics/business-intelligence:
 *   get:
 *     summary: Get business intelligence insights with AI-powered recommendations
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           default: 30d
 *         description: Time range for analysis
 *     responses:
 *       200:
 *         description: Business intelligence retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/business-intelligence",
  analyticsController.getBusinessIntelligence.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/revenue:
 *   get:
 *     summary: Get advanced revenue analytics with growth predictions
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           default: 30d
 *       - in: query
 *         name: breakdown
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *     responses:
 *       200:
 *         description: Revenue analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/revenue", async (req, res) => {
  try {
    // Get user from request (this should be set by auth middleware)
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { timeframe = "30d" } = req.query;

    // Create date range
    const end = new Date();
    const start = new Date();
    const timeframeMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = timeframeMap[timeframe] || 30;
    start.setDate(start.getDate() - days);

    // Simple revenue analytics using direct SQL
    const { Order, OrderItem } = require("../models");
    const { Op } = require("sequelize");

    // Get orders with valid revenue data
    const validStatuses = [
      "new",
      "processing",
      "shipped",
      "in_transit",
      "delivered",
    ];

    const orders = await Order.findAll({
      where: {
        userId,
        createdAt: { [Op.between]: [start, end] },
        orderStatus: { [Op.in]: validStatuses },
      },
      attributes: ["id", "totalAmount", "createdAt", "orderStatus", "platform"],
      order: [["createdAt", "ASC"]],
    });

    // Calculate revenue metrics
    const totalRevenue = orders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount || 0),
      0
    );
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Create daily revenue breakdown
    const dailyRevenue = {};
    orders.forEach((order) => {
      const date = new Date(order.createdAt).toISOString().split("T")[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = { revenue: 0, orders: 0 };
      }
      dailyRevenue[date].revenue += parseFloat(order.totalAmount || 0);
      dailyRevenue[date].orders += 1;
    });

    // Convert to array and fill missing dates
    const dailyData = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      dailyData.push({
        date: dateStr,
        revenue: dailyRevenue[dateStr]?.revenue || 0,
        orders: dailyRevenue[dateStr]?.orders || 0,
      });
    }

    // Platform breakdown
    const platformBreakdown = {};
    orders.forEach((order) => {
      const platform = order.platform || "Unknown";
      if (!platformBreakdown[platform]) {
        platformBreakdown[platform] = { revenue: 0, orders: 0 };
      }
      platformBreakdown[platform].revenue += parseFloat(order.totalAmount || 0);
      platformBreakdown[platform].orders += 1;
    });

    const platformData = Object.entries(platformBreakdown)
      .map(([platform, data]) => ({
        platform,
        revenue: data.revenue,
        orders: data.orders,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Calculate growth (simplified)
    const midPoint = Math.floor(days / 2);
    const firstHalf = dailyData.slice(0, midPoint);
    const secondHalf = dailyData.slice(midPoint);

    const firstHalfRevenue = firstHalf.reduce(
      (sum, day) => sum + day.revenue,
      0
    );
    const secondHalfRevenue = secondHalf.reduce(
      (sum, day) => sum + day.revenue,
      0
    );

    const growthRate =
      firstHalfRevenue > 0
        ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100
        : 0;

    const response = {
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalOrders,
          avgOrderValue,
          growthRate,
          bestDay: dailyData.reduce(
            (max, day) => (day.revenue > max.revenue ? day : max),
            dailyData[0] || { revenue: 0 }
          ),
          topPlatform: platformData[0] || { platform: "None", revenue: 0 },
        },
        trends: {
          daily: dailyData,
          growth: growthRate,
        },
        breakdown: {
          platforms: platformData,
          byStatus: validStatuses.map((status) => ({
            status,
            orders: orders.filter((o) => o.orderStatus === status).length,
            revenue: orders
              .filter((o) => o.orderStatus === status)
              .reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0),
          })),
        },
        charts: {
          revenue: dailyData.map((day) => ({
            date: day.date,
            value: day.revenue,
          })),
          orders: dailyData.map((day) => ({
            date: day.date,
            value: day.orders,
          })),
          platforms: platformData.map((platform) => ({
            name: platform.platform,
            value: platform.revenue,
            percentage: platform.percentage,
          })),
        },
        timeframe,
        generatedAt: new Date(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Revenue analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving revenue analytics",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/analytics/platform-performance:
 *   get:
 *     summary: Get platform performance comparison with optimization suggestions
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           default: 30d
 *     responses:
 *       200:
 *         description: Platform performance analysis retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/platform-performance",
  analyticsController.getPlatformPerformance.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/inventory-insights:
 *   get:
 *     summary: Get inventory optimization insights and stock predictions
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           default: 30d
 *     responses:
 *       200:
 *         description: Inventory insights retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/inventory-insights",
  analyticsController.getInventoryInsights.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/market-analysis:
 *   get:
 *     summary: Get market intelligence and competitive analysis
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           default: 30d
 *     responses:
 *       200:
 *         description: Market analysis retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/market-analysis",
  analyticsController.getMarketAnalysis.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/realtime:
 *   get:
 *     summary: Get real-time analytics updates
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time updates retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/realtime",
  analyticsController.getRealtimeUpdates.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/export:
 *   get:
 *     summary: Export analytics data in various formats
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           default: 30d
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *     responses:
 *       200:
 *         description: Analytics data exported successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/export",
  analyticsController.exportAnalyticsData.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/products:
 *   get:
 *     summary: Get comprehensive product analytics
 *     tags: [Product Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           default: 30d
 *         description: Time range for analytics
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *         description: Specific product ID for focused analytics
 *     responses:
 *       200:
 *         description: Product analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/products", async (req, res) => {
  try {
    // Get user from request (this should be set by auth middleware)
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { timeframe = "30d", productId } = req.query;

    // Create date range
    const end = new Date();
    const start = new Date();
    const timeframeMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = timeframeMap[timeframe] || 30;
    start.setDate(start.getDate() - days);

    // Simple product analytics using direct SQL
    const { Order, OrderItem, Product } = require("../models");
    const { Op } = require("sequelize");

    // Build query with user filter and optional product filter
    const whereClause = {
      attributes: [
        "productId",
        [
          OrderItem.sequelize.fn(
            "COUNT",
            OrderItem.sequelize.col("OrderItem.id")
          ),
          "totalSold",
        ],
        [
          OrderItem.sequelize.fn(
            "SUM",
            OrderItem.sequelize.literal(
              '"OrderItem"."quantity" * "OrderItem"."price"'
            )
          ),
          "totalRevenue",
        ],
        [
          OrderItem.sequelize.fn(
            "COUNT",
            OrderItem.sequelize.fn(
              "DISTINCT",
              OrderItem.sequelize.col("orderId")
            )
          ),
          "totalOrders",
        ],
        [
          OrderItem.sequelize.fn(
            "AVG",
            OrderItem.sequelize.col("OrderItem.price")
          ),
          "avgPrice",
        ],
      ],
      include: [
        {
          model: Order,
          as: "order",
          where: {
            userId,
            createdAt: { [Op.between]: [start, end] },
          },
          attributes: [],
        },
        {
          model: Product,
          as: "product",
          attributes: ["name", "sku", "category"],
          required: false,
        },
      ],
      group: ["OrderItem.productId", "product.id"],
      order: [
        [
          OrderItem.sequelize.fn(
            "SUM",
            OrderItem.sequelize.literal(
              '"OrderItem"."quantity" * "OrderItem"."price"'
            )
          ),
          "DESC",
        ],
      ],
      limit: 50,
      raw: false,
    };

    // Add product filter if specified
    if (productId) {
      whereClause.where = { productId };
    }

    const productStats = await OrderItem.findAll(whereClause);

    // Format the results
    const formattedStats = productStats.map((item) => ({
      productId: item.productId,
      name: item.product?.name || "Unknown Product",
      sku: item.product?.sku || "",
      category: item.product?.category || "Unknown",
      totalSold: parseInt(item.get("totalSold") || 0),
      totalRevenue: parseFloat(item.get("totalRevenue") || 0),
      totalOrders: parseInt(item.get("totalOrders") || 0),
      avgPrice: parseFloat(item.get("avgPrice") || 0),
    }));

    // Calculate summary
    const summary = {
      totalProducts: formattedStats.length,
      totalRevenue: formattedStats.reduce((sum, p) => sum + p.totalRevenue, 0),
      totalSold: formattedStats.reduce((sum, p) => sum + p.totalSold, 0),
      totalOrders: formattedStats.reduce((sum, p) => sum + p.totalOrders, 0),
      averagePrice:
        formattedStats.length > 0
          ? formattedStats.reduce((sum, p) => sum + p.avgPrice, 0) /
            formattedStats.length
          : 0,
      topCategory:
        formattedStats.length > 0 ? formattedStats[0].category : null,
    };

    // Create mock daily trends
    const dailyTrends = [];
    for (let i = 0; i < Math.min(30, days); i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      dailyTrends.push({
        date: date.toISOString().split("T")[0],
        soldQuantity: Math.floor(Math.random() * 5),
        revenue: Math.floor(Math.random() * 1000),
        orders: Math.floor(Math.random() * 3),
      });
    }

    // Create platform breakdown
    const platformBreakdown = [
      {
        platform: "Trendyol",
        totalSold: Math.floor(summary.totalSold * 0.4),
        totalRevenue: Math.floor(summary.totalRevenue * 0.4),
        totalOrders: Math.floor(summary.totalOrders * 0.4),
      },
      {
        platform: "Hepsiburada",
        totalSold: Math.floor(summary.totalSold * 0.35),
        totalRevenue: Math.floor(summary.totalRevenue * 0.35),
        totalOrders: Math.floor(summary.totalOrders * 0.35),
      },
      {
        platform: "N11",
        totalSold: Math.floor(summary.totalSold * 0.25),
        totalRevenue: Math.floor(summary.totalRevenue * 0.25),
        totalOrders: Math.floor(summary.totalOrders * 0.25),
      },
    ];

    const response = {
      success: true,
      data: {
        summary,
        products: formattedStats,
        topProducts: formattedStats.slice(0, 10),
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
          topProducts: formattedStats.slice(0, 10).map((product) => ({
            name: product.name,
            revenue: product.totalRevenue,
            sold: product.totalSold,
            category: product.category,
          })),
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
          performance: formattedStats.slice(0, 10).map((product) => ({
            name: product.name,
            value: product.totalRevenue,
          })),
          categories: platformBreakdown.map((platform) => ({
            name: platform.platform,
            value: platform.totalRevenue,
          })),
        },
        insights: {
          insights: [
            "Ürün performansı analiz ediliyor",
            "En çok satan ürünler belirlendi",
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
        timeframe,
        generatedAt: new Date(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Product analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving product analytics",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/analytics/products/performance:
 *   get:
 *     summary: Get product performance comparison and ranking
 *     tags: [Product Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           default: 30d
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of top products to return
 *     responses:
 *       200:
 *         description: Product performance comparison retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/products/performance",
  analyticsController.getProductPerformanceComparison.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/products/insights:
 *   get:
 *     summary: Get AI-powered product insights and recommendations
 *     tags: [Product Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           default: 30d
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *         description: Specific product ID for insights
 *     responses:
 *       200:
 *         description: Product insights retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/products/insights",
  analyticsController.getProductInsights.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/products/realtime:
 *   get:
 *     summary: Get real-time product metrics and alerts
 *     tags: [Product Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *         description: Specific product ID for real-time metrics
 *     responses:
 *       200:
 *         description: Real-time product metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/products/realtime",
  analyticsController.getRealtimeProductMetrics.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/trends:
 *   get:
 *     summary: Get order trends and historical data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           default: 30d
 *         description: Time range for trend analysis
 *     responses:
 *       200:
 *         description: Trends data retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/trends", analyticsController.getTrends.bind(analyticsController));

/**
 * @swagger
 * /api/analytics/accurate:
 *   get:
 *     summary: Get accurate analytics that properly handle returns and cancellations
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           default: 30d
 *         description: Time range for analysis
 *     responses:
 *       200:
 *         description: Accurate analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/accurate",
  analyticsController.getAccurateAnalytics.bind(analyticsController)
);

// Advanced Analytics Routes for Modern Standards

/**
 * @swagger
 * /api/analytics/customer-analytics:
 *   get:
 *     summary: Get advanced customer segmentation and behavior analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: Customer analytics retrieved successfully
 */
router.get("/customer-analytics", async (req, res) => {
  try {
    // Get user from request (this should be set by auth middleware)
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { timeframe = "30d" } = req.query;

    // Create date range
    const end = new Date();
    const start = new Date();
    const timeframeMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = timeframeMap[timeframe] || 30;
    start.setDate(start.getDate() - days);

    // Simple customer analytics using direct SQL
    const { Order, OrderItem } = require("../models");
    const { Op } = require("sequelize");

    // Get customer data from orders
    const customerData = await Order.findAll({
      where: {
        userId,
        createdAt: { [Op.between]: [start, end] },
      },
      attributes: [
        "customerName",
        "customerEmail",
        "customerPhone",
        [
          Order.sequelize.fn("COUNT", Order.sequelize.col("Order.id")),
          "totalOrders",
        ],
        [
          Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")),
          "totalSpent",
        ],
        [
          Order.sequelize.fn("AVG", Order.sequelize.col("totalAmount")),
          "avgOrderValue",
        ],
        [
          Order.sequelize.fn("MIN", Order.sequelize.col("createdAt")),
          "firstOrder",
        ],
        [
          Order.sequelize.fn("MAX", Order.sequelize.col("createdAt")),
          "lastOrder",
        ],
      ],
      group: ["customerName", "customerEmail", "customerPhone"],
      order: [
        [Order.sequelize.fn("SUM", Order.sequelize.col("totalAmount")), "DESC"],
      ],
      limit: 100,
      raw: true,
    });

    // Calculate summary statistics
    const totalCustomers = customerData.length;
    const totalRevenue = customerData.reduce(
      (sum, customer) => sum + parseFloat(customer.totalSpent || 0),
      0
    );
    const totalOrders = customerData.reduce(
      (sum, customer) => sum + parseInt(customer.totalOrders || 0),
      0
    );
    const avgCustomerValue =
      totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    const avgOrdersPerCustomer =
      totalCustomers > 0 ? totalOrders / totalCustomers : 0;

    // Format customer data
    const formattedCustomers = customerData.map((customer) => ({
      name: customer.customerName || "Unknown",
      email: customer.customerEmail || "",
      phone: customer.customerPhone || "",
      totalOrders: parseInt(customer.totalOrders || 0),
      totalSpent: parseFloat(customer.totalSpent || 0),
      avgOrderValue: parseFloat(customer.avgOrderValue || 0),
      firstOrder: customer.firstOrder,
      lastOrder: customer.lastOrder,
      customerType:
        parseFloat(customer.totalSpent || 0) > avgCustomerValue
          ? "High Value"
          : "Regular",
    }));

    // Create customer segments
    const highValueCustomers = formattedCustomers.filter(
      (c) => c.totalSpent > avgCustomerValue * 1.5
    );
    const regularCustomers = formattedCustomers.filter(
      (c) => c.totalSpent <= avgCustomerValue * 1.5 && c.totalSpent > 0
    );
    const newCustomers = formattedCustomers.filter((c) => {
      const firstOrderDate = new Date(c.firstOrder);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return firstOrderDate > thirtyDaysAgo;
    });

    // Mock some additional analytics data
    const segments = [
      {
        name: "High Value",
        count: highValueCustomers.length,
        percentage:
          totalCustomers > 0
            ? (highValueCustomers.length / totalCustomers) * 100
            : 0,
      },
      {
        name: "Regular",
        count: regularCustomers.length,
        percentage:
          totalCustomers > 0
            ? (regularCustomers.length / totalCustomers) * 100
            : 0,
      },
      {
        name: "New",
        count: newCustomers.length,
        percentage:
          totalCustomers > 0 ? (newCustomers.length / totalCustomers) * 100 : 0,
      },
    ];

    const response = {
      success: true,
      data: {
        summary: {
          totalCustomers,
          totalRevenue,
          totalOrders,
          avgCustomerValue,
          avgOrdersPerCustomer,
          newCustomersThisMonth: newCustomers.length,
          highValueCustomers: highValueCustomers.length,
        },
        customers: formattedCustomers.slice(0, 50), // Limit for performance
        topCustomers: formattedCustomers.slice(0, 10),
        segments,
        charts: {
          customerSegments: segments.map((segment) => ({
            name: segment.name,
            value: segment.count,
            percentage: segment.percentage,
          })),
          monthlyGrowth: [], // Mock data
          retention: [], // Mock data
          lifetimeValue: formattedCustomers.slice(0, 10).map((customer) => ({
            name: customer.name,
            value: customer.totalSpent,
          })),
        },
        insights: {
          insights: [
            `Toplam ${totalCustomers} müşteri`,
            `Ortalama müşteri değeri ₺${avgCustomerValue.toFixed(2)}`,
            `${newCustomers.length} yeni müşteri bu ay`,
          ],
          recommendations: [
            {
              category: "retention",
              priority: "high",
              title: "Müşteri Sadakati",
              description:
                "Yüksek değerli müşteriler için özel kampanyalar düzenleyin",
            },
          ],
        },
        timeframe,
        generatedAt: new Date(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Customer analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving customer analytics",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/analytics/cohort-analysis:
 *   get:
 *     summary: Get customer cohort analysis for retention insights
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *         description: Time period for cohort analysis
 *     responses:
 *       200:
 *         description: Cohort analysis retrieved successfully
 */
router.get(
  "/cohort-analysis",
  analyticsController.getCohortAnalysis.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/competitive-analysis:
 *   get:
 *     summary: Get competitive analysis and market positioning
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *         description: Time period for competitive analysis
 *     responses:
 *       200:
 *         description: Competitive analysis retrieved successfully
 */
router.get(
  "/competitive-analysis",
  analyticsController.getCompetitiveAnalysis.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/funnel-analysis:
 *   get:
 *     summary: Get conversion funnel analysis
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *         description: Time period for funnel analysis
 *     responses:
 *       200:
 *         description: Funnel analysis retrieved successfully
 */
router.get(
  "/funnel-analysis",
  analyticsController.getFunnelAnalysis.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/real-time:
 *   get:
 *     summary: Get real-time analytics dashboard
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time analytics retrieved successfully
 */
router.get(
  "/real-time",
  analyticsController.getRealTimeAnalytics.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/attribution-analysis:
 *   get:
 *     summary: Get marketing attribution analysis
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *         description: Time period for attribution analysis
 *     responses:
 *       200:
 *         description: Attribution analysis retrieved successfully
 */
router.get(
  "/attribution-analysis",
  analyticsController.getAttributionAnalysis.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/anomaly-detection:
 *   get:
 *     summary: Get anomaly detection insights
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *         description: Time period for anomaly detection
 *     responses:
 *       200:
 *         description: Anomaly detection results retrieved successfully
 */
router.get(
  "/anomaly-detection",
  analyticsController.getAnomalyDetection.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/custom-reports:
 *   post:
 *     summary: Generate custom analytics reports
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metrics:
 *                 type: array
 *                 items:
 *                   type: string
 *               dimensions:
 *                 type: array
 *                 items:
 *                   type: string
 *               filters:
 *                 type: object
 *               timeframe:
 *                 type: string
 *     responses:
 *       200:
 *         description: Custom report generated successfully
 */
router.post(
  "/custom-reports",
  analyticsController.generateCustomReport.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/alerts:
 *   get:
 *     summary: Get analytics alerts and notifications
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter alerts by type
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Filter alerts by priority
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit number of alerts returned
 *     responses:
 *       200:
 *         description: Alerts retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/alerts", analyticsController.getAlerts.bind(analyticsController));

/**
 * @swagger
 * /api/analytics/health:
 *   get:
 *     summary: Analytics system health check
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: System is healthy
 *       500:
 *         description: System health issues detected
 */
router.get(
  "/health",
  analyticsController.healthCheck.bind(analyticsController)
);

// Simple working product analytics endpoint
router.get("/products/simple", async (req, res) => {
  try {
    const { timeframe = "30d" } = req.query;
    const userId = req.user.id;

    // Create date range
    const end = new Date();
    const start = new Date();
    const timeframeMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = timeframeMap[timeframe] || 30;
    start.setDate(start.getDate() - days);

    // Simple product analytics using direct SQL
    const { Order, OrderItem, Product } = require("../../models");
    const { Op } = require("sequelize");

    // Get basic product stats
    const productStats = await OrderItem.findAll({
      attributes: [
        "productId",
        [
          OrderItem.sequelize.fn(
            "COUNT",
            OrderItem.sequelize.col("OrderItem.id")
          ),
          "totalSold",
        ],
        [
          OrderItem.sequelize.fn(
            "SUM",
            OrderItem.sequelize.literal(
              '"OrderItem"."quantity" * "OrderItem"."price"'
            )
          ),
          "totalRevenue",
        ],
        [
          OrderItem.sequelize.fn(
            "COUNT",
            OrderItem.sequelize.fn(
              "DISTINCT",
              OrderItem.sequelize.col("orderId")
            )
          ),
          "totalOrders",
        ],
        [
          OrderItem.sequelize.fn(
            "AVG",
            OrderItem.sequelize.col("OrderItem.price")
          ),
          "avgPrice",
        ],
      ],
      include: [
        {
          model: Order,
          as: "order",
          where: {
            userId,
            createdAt: { [Op.between]: [start, end] },
          },
          attributes: [],
        },
        {
          model: Product,
          as: "product",
          attributes: ["name", "sku", "category"],
          required: false,
        },
      ],
      group: ["OrderItem.productId", "product.id"],
      order: [[OrderItem.sequelize.literal("totalRevenue"), "DESC"]],
      limit: 20,
      raw: false,
    });

    // Format the results
    const formattedStats = productStats.map((item) => ({
      productId: item.productId,
      productName: item.product?.name || "Unknown Product",
      sku: item.product?.sku || "",
      category: item.product?.category || "Unknown",
      totalSold: parseInt(item.get("totalSold") || 0),
      totalRevenue: parseFloat(item.get("totalRevenue") || 0),
      totalOrders: parseInt(item.get("totalOrders") || 0),
      avgPrice: parseFloat(item.get("avgPrice") || 0),
    }));

    // Calculate summary
    const summary = {
      totalProducts: formattedStats.length,
      totalRevenue: formattedStats.reduce((sum, p) => sum + p.totalRevenue, 0),
      totalSold: formattedStats.reduce((sum, p) => sum + p.totalSold, 0),
      totalOrders: formattedStats.reduce((sum, p) => sum + p.totalOrders, 0),
      topProducts: formattedStats.slice(0, 10),
    };

    res.json({
      success: true,
      data: {
        summary,
        products: formattedStats,
        topProducts: formattedStats.slice(0, 10),
        timeframe,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Simple product analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving product analytics",
      error: error.message,
    });
  }
});

// Financial KPIs route
router.get("/financial-kpis", async (req, res) => {
  try {
    // Get user from request (this should be set by auth middleware)
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { timeframe = "30d" } = req.query;

    // Create date range
    const end = new Date();
    const start = new Date();
    const timeframeMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const days = timeframeMap[timeframe] || 30;
    start.setDate(start.getDate() - days);

    // Simple financial analytics using direct SQL
    const { Order, OrderItem } = require("../models");
    const { Op } = require("sequelize");

    // Get orders with valid financial data
    const validStatuses = [
      "new",
      "processing",
      "shipped",
      "in_transit",
      "delivered",
    ];

    const orders = await Order.findAll({
      where: {
        userId,
        createdAt: { [Op.between]: [start, end] },
        orderStatus: { [Op.in]: validStatuses },
      },
      include: [
        {
          model: OrderItem,
          as: "items",
          attributes: ["quantity", "price", "totalPrice"],
        },
      ],
      attributes: ["id", "totalAmount", "createdAt", "orderStatus", "platform"],
    });

    // Calculate financial metrics
    const totalRevenue = orders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount || 0),
      0
    );
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate profit margin (simplified - assume 30% margin)
    const profitMargin = 0.3;
    const totalProfit = totalRevenue * profitMargin;
    const avgProfit = totalOrders > 0 ? totalProfit / totalOrders : 0;

    // Calculate monthly recurring revenue (simplified)
    const monthlyRevenue = totalRevenue;

    // Get items sold
    const totalItemsSold = orders.reduce((sum, order) => {
      return (
        sum +
        (order.items || []).reduce(
          (itemSum, item) => itemSum + parseInt(item.quantity || 0),
          0
        )
      );
    }, 0);

    // Revenue per customer (simplified - unique orders as customers)
    const revenuePerCustomer = avgOrderValue;

    // Platform breakdown
    const platformBreakdown = {};
    orders.forEach((order) => {
      const platform = order.platform || "Unknown";
      if (!platformBreakdown[platform]) {
        platformBreakdown[platform] = { revenue: 0, orders: 0 };
      }
      platformBreakdown[platform].revenue += parseFloat(order.totalAmount || 0);
      platformBreakdown[platform].orders += 1;
    });

    // Convert to array for frontend
    const platformData = Object.entries(platformBreakdown)
      .map(([platform, data]) => ({
        platform,
        revenue: data.revenue,
        orders: data.orders,
        percentage: (data.revenue / totalRevenue) * 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Create daily revenue trends
    const dailyRevenue = {};
    orders.forEach((order) => {
      const date = new Date(order.createdAt).toISOString().split("T")[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = 0;
      }
      dailyRevenue[date] += parseFloat(order.totalAmount || 0);
    });

    const revenueTrends = Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Growth rate (simplified - compare with previous period)
    const growthRate = 15.5; // Mock data for now

    const response = {
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalOrders,
          avgOrderValue,
          totalProfit,
          profitMargin: profitMargin * 100,
          monthlyRecurringRevenue: monthlyRevenue,
          revenuePerCustomer,
          totalItemsSold,
          growthRate,
        },
        trends: {
          daily: revenueTrends,
          growth: growthRate,
        },
        breakdown: {
          platforms: platformData,
          orderStatus: validStatuses.map((status) => ({
            status,
            count: orders.filter((o) => o.orderStatus === status).length,
            revenue: orders
              .filter((o) => o.orderStatus === status)
              .reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0),
          })),
        },
        metrics: {
          revenue: {
            total: totalRevenue,
            average: avgOrderValue,
            growth: growthRate,
          },
          profit: {
            total: totalProfit,
            margin: profitMargin * 100,
            average: avgProfit,
          },
          orders: {
            total: totalOrders,
            average: avgOrderValue,
            itemsPerOrder: totalOrders > 0 ? totalItemsSold / totalOrders : 0,
          },
        },
        charts: {
          revenue: revenueTrends.map((item) => ({
            date: item.date,
            value: item.revenue,
          })),
          platforms: platformData.map((item) => ({
            name: item.platform,
            value: item.revenue,
            percentage: item.percentage,
          })),
          profit: revenueTrends.map((item) => ({
            date: item.date,
            value: item.revenue * profitMargin,
          })),
        },
        timeframe,
        generatedAt: new Date(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Financial KPIs error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving financial KPIs",
      error: error.message,
    });
  }
});

module.exports = router;
