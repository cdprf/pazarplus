// routes/shippingRoutes.js

const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shippingController');
const authMiddleware = require('../middleware/auth');

/**
 * Shipping Routes
 * Handles routes related to shipping management
 */

// Apply authentication middleware to all shipping routes
router.use(authMiddleware.authenticate);

/**
 * @route   POST /api/shipping
 * @desc    Create shipping label
 * @access  Private
 */
router.post('/', shippingController.createShippingLabel);

/**
 * @route   GET /api/shipping/:id
 * @desc    Get shipping details by ID
 * @access  Private
 */
router.get('/:id', shippingController.getShippingDetails);

/**
 * @route   PUT /api/shipping/:id
 * @desc    Update shipping status
 * @access  Private
 */
router.put('/:id', shippingController.updateShippingStatus);

/**
 * @route   POST /api/shipping/batch
 * @desc    Batch process multiple shipments
 * @access  Private
 */
router.post('/batch', shippingController.batchProcessShipments);

module.exports = router;