const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order-controller');
const auth = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// Debug middleware
router.use((req, res, next) => {
  console.log(`📦 Order Route: ${req.method} /api/orders${req.url}`);
  next();
});

// Order routes - these match what the frontend expects
router.get('/', orderController.getOrders);
router.get('/stats', orderController.getOrderStats);
router.get('/trends', orderController.getOrderTrends);
router.get('/:id', orderController.getOrderById);

router.post('/', orderController.createOrder);
router.post('/sync', orderController.syncOrders);
router.post('/:id/einvoice', orderController.generateEInvoice);

router.put('/bulk', orderController.bulkUpdateOrders);
router.put('/:id', orderController.updateOrder);
router.put('/:id/status', orderController.updateOrderStatus);

router.delete('/:id', orderController.deleteOrder);
router.delete('/bulk', orderController.bulkDeleteOrders);

module.exports = router;