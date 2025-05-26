/**
 * Shipping Routes
 * API routes for Turkish shipping carrier services
 */

const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shipping-controller');
const auth = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { body, param } = require('express-validator');

// Validation rules for shipping requests
const shippingRatesValidation = [
  body('packageInfo').isObject().withMessage('Package info must be an object'),
  body('packageInfo.weight').optional().isNumeric().withMessage('Weight must be a number'),
  body('packageInfo.dimensions').optional().isObject().withMessage('Dimensions must be an object'),
  body('fromAddress').isObject().withMessage('From address must be an object'),
  body('fromAddress.city').notEmpty().withMessage('From city is required'),
  body('fromAddress.postalCode').notEmpty().withMessage('From postal code is required'),
  body('toAddress').isObject().withMessage('To address must be an object'),
  body('toAddress.city').notEmpty().withMessage('To city is required'),
  body('toAddress.postalCode').notEmpty().withMessage('To postal code is required'),
  body('carriers').optional().isArray().withMessage('Carriers must be an array')
];

const shippingLabelValidation = [
  body('shipmentData').isObject().withMessage('Shipment data must be an object'),
  body('shipmentData.packageInfo').isObject().withMessage('Package info is required'),
  body('shipmentData.fromAddress').isObject().withMessage('From address is required'),
  body('shipmentData.toAddress').isObject().withMessage('To address is required'),
  body('carrier').notEmpty().withMessage('Carrier is required')
];

const trackingValidation = [
  param('trackingNumber').notEmpty().withMessage('Tracking number is required'),
  param('carrier').notEmpty().withMessage('Carrier is required')
];

const credentialsValidation = [
  body('carrier').notEmpty().withMessage('Carrier is required'),
  body('credentials').isObject().withMessage('Credentials must be an object')
];

const deliveryAvailabilityValidation = [
  body('address').isObject().withMessage('Address must be an object'),
  body('address.city').notEmpty().withMessage('City is required'),
  body('address.postalCode').notEmpty().withMessage('Postal code is required')
];

// Public routes (no authentication required)
router.get('/carriers', shippingController.getSupportedCarriers);
router.get('/carriers/:carrier/services', 
  param('carrier').notEmpty().withMessage('Carrier is required'),
  validate,
  shippingController.getCarrierServices
);

// Protected routes (authentication required)
router.use(auth); // Apply authentication middleware to all routes below

// Rate comparison
router.post('/rates', 
  shippingRatesValidation,
  validate,
  shippingController.getShippingRates
);

// Label creation
router.post('/labels', 
  shippingLabelValidation,
  validate,
  shippingController.createShippingLabel
);

// Package tracking
router.get('/track/:carrier/:trackingNumber', 
  trackingValidation,
  validate,
  shippingController.trackPackage
);

// Shipment cancellation
router.delete('/shipments/:carrier/:trackingNumber', 
  trackingValidation,
  validate,
  shippingController.cancelShipment
);

// Delivery availability check
router.post('/availability', 
  deliveryAvailabilityValidation,
  validate,
  shippingController.checkDeliveryAvailability
);

// Credential validation
router.post('/credentials/validate', 
  credentialsValidation,
  validate,
  shippingController.validateCredentials
);

// Cache management (admin only)
router.get('/cache/stats', shippingController.getCacheStats);
router.delete('/cache/:carrier?', 
  param('carrier').optional().isString(),
  validate,
  shippingController.clearCache
);

module.exports = router;