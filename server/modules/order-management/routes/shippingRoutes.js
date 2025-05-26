// src/routes/shippingRoutes.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const shippingController = require('../controllers/shipping-controller');
const { auth, adminAuth } = require('../../../middleware/auth'); // Fixed path: 3 levels up

// Replace old middleware usage
// router.use(authenticateToken);
router.use(auth); // Fixed: use 'auth' instead of 'protect'

router.post('/labels/generate', shippingController.generateShippingLabel);
router.post('/labels/bulk', shippingController.generateBulkShippingLabels);
router.get('/labels/:id', shippingController.getShippingLabel);
router.post('/mark-shipped', shippingController.markAsShipped);
router.get('/carriers', shippingController.getSupportedCarriers);

module.exports = router;