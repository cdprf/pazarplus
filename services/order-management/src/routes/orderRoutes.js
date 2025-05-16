// routes/orderRoutes.js

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');

/**
 * Order Routes
 * Handles routes related to order management
 */

// Apply authentication middleware to all order routes
router.use(authMiddleware.authenticate);

/**
 * @route   GET /api/orders
 * @desc    Get all orders with optional filtering and pagination
 * @access  Private
 */
router.get('/', orderController.getAllOrders);

/**
 * @route   GET /api/orders/:id
 * @desc    Get specific order details
 * @access  Private
 */
router.get('/:id', orderController.getOrderById);

/**
 * @route   PUT /api/orders/:id
 * @desc    Update order status
 * @access  Private
 */
router.put('/:id', orderController.updateOrderStatus);

/**
 * @route   DELETE /api/orders/:id
 * @desc    Cancel/delete an order (soft delete)
 * @access  Private
 */
router.delete('/:id', orderController.cancelOrder);

/**
 * @route   POST /api/orders/sync
 * @desc    Synchronize orders from connected platforms
 * @access  Private
 */
router.post('/sync', orderController.syncOrders);

module.exports = router;