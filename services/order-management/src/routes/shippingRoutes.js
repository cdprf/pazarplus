// src/routes/shippingRoutes.js
const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shipping-controller');
// Remove old auth middleware
// const { authenticateToken } = require('../middleware/auth-middleware');
// Import new auth middleware
const { protect, authorize } = require('../middleware/auth');

// Replace old middleware usage
// router.use(authenticateToken);
router.use(protect);

router.post('/labels/generate', shippingController.generateShippingLabel);
router.post('/labels/bulk', shippingController.generateBulkShippingLabels);
router.get('/labels/:id', shippingController.getShippingLabel);
router.post('/mark-shipped', shippingController.markAsShipped);
router.get('/carriers', shippingController.getSupportedCarriers);

module.exports = router;