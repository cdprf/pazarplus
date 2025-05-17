// src/routes/shippingRoutes.js
const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shipping-controller');
const { authenticateToken } = require('../middleware/auth-middleware');

router.use(authenticateToken);

router.post('/labels/generate', shippingController.generateShippingLabel);
router.post('/labels/bulk', shippingController.generateBulkShippingLabels);
router.get('/labels/:id', shippingController.getShippingLabel);
router.post('/mark-shipped', shippingController.markAsShipped);
router.get('/carriers', shippingController.getSupportedCarriers);

module.exports = router;