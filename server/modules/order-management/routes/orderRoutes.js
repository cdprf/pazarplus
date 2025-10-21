const express = require("express");
const logger = require("../../../utils/logger");
const router = express.Router();
const orderController = require("../controllers/order-controller");
const { auth } = require("../../../middleware/auth");
const optionalAuth = require("../../../middleware/optionalAuth");
const { Order, OrderItem } = require("../../../models");

/**
 * @swagger
 * /api/order-management/orders:
 *   post:
 *     summary: Create a new order (for both guests and authenticated users)
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
 *               customerInfo:
 *                 type: object
 *                 description: Required for guest orders.
 *               shippingAddress:
 *                 type: object
 *                 description: Required for guest orders.
 *               items:
 *                 type: array
 *                 description: Required for guest orders.
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Bad request (e.g., empty cart, missing guest info)
 */
router.post("/", optionalAuth, orderController.createOrder);


// Special route for sample data (no auth required)
router.get("/sample", async (req, res) => {
  try {
    // Get actual orders from database for sample data
    const sampleOrders = await Order.findAll({
      limit: 3,
      include: [
        {
          model: OrderItem,
          as: "items",
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // If no orders exist, return empty response
    if (!sampleOrders || sampleOrders.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          orders: [],
          pagination: {
            total: 0,
            currentPage: 1,
            totalPages: 0,
            limit: 0,
            hasNext: false,
            hasPrev: false,
          },
        },
        message: "No sample orders available. Create some orders first.",
      });
    }

    // Transform database orders to sample format
    const transformedOrders = sampleOrders.map((order) => ({
      id: order.id,
      platformOrderId: order.platformOrderId || `SAMPLE-${order.id}`,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate || order.createdAt,
      orderStatus: order.orderStatus || "pending",
      customerName: order.customerName || "Sample Customer",
      customerEmail: order.customerEmail || "sample@example.com",
      customerPhone: order.customerPhone || "+90 555 123 4567",
      totalAmount: parseFloat(order.totalAmount || 0),
      currency: order.currency || "TRY",
      shippingAddress: order.shippingAddress || {
        name: order.customerName || "Sample Customer",
        address: "Sample Address",
        city: "İstanbul",
        district: "Kadıköy",
        postalCode: "34710",
        country: "Turkey",
      },
      items:
        order.items?.map((item) => ({
          id: item.id,
          productName: item.productName || "Sample Product",
          sku: item.productSku || `SAMPLE-SKU-${item.id}`,
          quantity: item.quantity || 1,
          unitPrice: parseFloat(item.unitPrice || 0),
          totalPrice: parseFloat(item.totalPrice || 0),
        })) || [],
      platform: order.platform || "sample",
      platformName: order.platformName || "Sample Platform",
    }));

    return res.status(200).json({
      success: true,
      data: {
        orders: transformedOrders,
        pagination: {
          total: transformedOrders.length,
          currentPage: 1,
          totalPages: 1,
          limit: transformedOrders.length,
          hasNext: false,
          hasPrev: false,
        },
      },
    });
  } catch (error) {
    logger.error("Sample data generation error:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating sample data",
      error: error.message,
    });
  }
});

// Use authentication middleware for all other routes
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
 * /api/order-management/orders/date-range/{platformConnectionId}:
 *   get:
 *     summary: Get the oldest order date for a platform connection
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platformConnectionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Platform connection ID
 *     responses:
 *       200:
 *         description: Oldest order date retrieved successfully
 *       404:
 *         description: Platform connection not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/date-range/:platformConnectionId",
  orderController.getOldestOrderDate
);

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

/**
 * @swagger
 * /api/order-management/orders/{id}/accept:
 *   put:
 *     summary: Accept an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order accepted successfully
 *       400:
 *         description: Invalid order status for acceptance
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put("/:id/accept", orderController.acceptOrder);

/**
 * @swagger
 * /api/order-management/orders/{id}/cancel:
 *   post:
 *     summary: Cancel an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Cancellation reason
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/:id/cancel", orderController.cancelOrder);

// Add the missing endpoints that the frontend expects
router.delete("/bulk-delete", orderController.bulkDeleteOrders);
router.post("/bulk-einvoice", orderController.bulkEInvoice);
router.delete("/:id", orderController.deleteOrder);
router.post("/:id/einvoice", orderController.generateEInvoice);
router.post("/sync", orderController.syncOrders);

module.exports = router;
