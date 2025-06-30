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
router.get(
  "/dashboard",
  analyticsController.getDashboardAnalytics.bind(analyticsController)
);

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
router.get(
  "/revenue",
  analyticsController.getRevenueAnalytics.bind(analyticsController)
);

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
router.get(
  "/products",
  analyticsController.getProductAnalytics.bind(analyticsController)
);

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
router.get(
  "/customer-analytics",
  analyticsController.getCustomerAnalytics.bind(analyticsController)
);

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
router.get("/health", analyticsController.healthCheck.bind(analyticsController));

module.exports = router;
