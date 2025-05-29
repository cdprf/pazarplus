const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order-controller");
const { auth } = require("../../../middleware/auth"); // Fixed: destructure auth from middleware

// Use the middleware
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management endpoints
 */

/**
 * @swagger
 * /api/order-management/orders:
 *   get:
 *     summary: Get orders with filtering, sorting, and pagination
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of orders per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, shipped, delivered, cancelled]
 *         description: Filter by order status
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *         description: Filter by platform
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in order number, customer name, or email
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", orderController.getOrders);

/**
 * @swagger
 * /api/order-management/orders/stats:
 *   get:
 *     summary: Get order statistics
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           default: '30'
 *         description: Number of days for statistics period
 *     responses:
 *       200:
 *         description: Order statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/stats", orderController.getOrderStats);

/**
 * @swagger
 * /api/order-management/orders/trends:
 *   get:
 *     summary: Get order trends data for charts
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           default: '30d'
 *         description: Time range for trends (e.g., 7d, 30d, 90d)
 *     responses:
 *       200:
 *         description: Order trends retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/trends", orderController.getOrderTrends);

/**
 * @swagger
 * /api/order-management/orders/export:
 *   get:
 *     summary: Export orders to CSV or JSON
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *         description: Export format
 *     responses:
 *       200:
 *         description: Orders exported successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/export", orderController.exportOrders);

/**
 * @swagger
 * /api/order-management/orders/bulk-update:
 *   put:
 *     summary: Bulk update multiple orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               updates:
 *                 type: object
 *             required:
 *               - orderIds
 *               - updates
 *     responses:
 *       200:
 *         description: Orders updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put("/bulk-update", orderController.bulkUpdateOrders);

/**
 * @swagger
 * /api/order-management/orders/{id}:
 *   get:
 *     summary: Get single order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/:id", orderController.getOrderById);

/**
 * @swagger
 * /api/order-management/orders/{id}/status:
 *   put:
 *     summary: Update order status
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, shipped, delivered, cancelled]
 *               notes:
 *                 type: string
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put("/:id/status", orderController.updateOrderStatus);

// Add the missing endpoints that the frontend expects
router.delete("/bulk-delete", orderController.bulkDeleteOrders);
router.post("/bulk-einvoice", orderController.bulkEInvoice);
router.delete("/:id", orderController.deleteOrder);
router.post("/:id/einvoice", orderController.generateEInvoice);
router.post("/sync", orderController.syncOrders);

module.exports = router;
