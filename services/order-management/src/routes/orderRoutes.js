const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order-controller');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management endpoints
 */

/**
 * @swagger
 * /api/orders/trends:
 *   get:
 *     summary: Get order trends data for charts
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *         description: Time period for trends data
 *       - in: query
 *         name: compareWithPrevious
 *         schema:
 *           type: boolean
 *         description: Whether to include comparison with previous period
 *     responses:
 *       200:
 *         description: Order trends data retrieved successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.get('/trends', orderController.getOrderTrends);

/**
 * @swagger
 * /api/orders/stats:
 *   get:
 *     summary: Get order statistics
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order statistics data retrieved successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.get('/stats', orderController.getOrderStats);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders with pagination and filtering
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by order status
 *     responses:
 *       200:
 *         description: Order list retrieved successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.get('/', orderController.getAllOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get an order by ID
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
 *         description: Order details retrieved successfully
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.get('/:id', orderController.getOrderById);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update the status of an order
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
 *       - in: body
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *         description: New status of the order
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.put('/:id/status', orderController.updateOrderStatus);

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
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
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.delete('/:id', orderController.cancelOrder);

/**
 * @swagger
 * /api/orders/sync:
 *   post:
 *     summary: Sync orders with external systems
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orders synced successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.post('/sync', orderController.syncOrders);

/**
 * @swagger
 * /api/orders/sync/{id}:
 *   post:
 *     summary: Sync orders from a specific platform
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Platform Connection ID
 *     responses:
 *       200:
 *         description: Orders synced successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Platform connection not found
 *       500:
 *         description: Server error
 */
router.post('/sync/:id', orderController.syncOrdersByPlatform);

/**
 * @swagger
 * /api/orders/import/hepsiburada:
 *   post:
 *     summary: Import orders from Hepsiburada
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orders imported successfully
 *       400:
 *         description: Bad request - Invalid order data
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       409:
 *         description: Conflict - Order already exists (constraint violation)
 *       500:
 *         description: Server error
 */
router.post('/import/hepsiburada', orderController.importHepsiburadaOrder);

/**
 * @swagger
 * /api/orders/{id}/platform-details:
 *   get:
 *     summary: Get order details with platform-specific data
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
 *         description: Order details with platform-specific data retrieved successfully
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.get('/:id/platform-details', orderController.getOrderWithPlatformDetails);

module.exports = router;