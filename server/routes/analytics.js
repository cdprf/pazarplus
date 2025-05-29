const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics-controller");
const { auth } = require("../middleware/auth"); // Fixed: destructure auth from middleware
const rateLimit = require("express-rate-limit");

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
router.get("/dashboard", analyticsController.getDashboardAnalytics);

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
  analyticsController.getBusinessIntelligence
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
router.get("/revenue", analyticsController.getRevenueAnalytics);

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
router.get("/platform-performance", analyticsController.getPlatformPerformance);

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
router.get("/inventory-insights", analyticsController.getInventoryInsights);

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
router.get("/market-analysis", analyticsController.getMarketAnalysis);

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
router.get("/realtime", analyticsController.getRealtimeUpdates);

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
router.get("/export", analyticsController.exportAnalyticsData);

module.exports = router;
