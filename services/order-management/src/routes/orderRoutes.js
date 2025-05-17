// src/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order-controller');
const { authenticateToken } = require('../middleware/auth-middleware');

router.use(authenticateToken);

router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.put('/:id/status', orderController.updateOrderStatus);
router.delete('/:id', orderController.cancelOrder);
router.post('/sync', orderController.syncOrders);

module.exports = router;