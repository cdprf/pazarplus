const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const platformController = require('../controllers/platform-controller');
// Import new auth middleware
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Direct platform routes - adding these to fix 404 errors
router.get('/', platformController.getPlatformConnections);
router.post('/', platformController.createPlatformConnection);
router.put('/:id', platformController.updatePlatformStatus);
router.delete('/:id', platformController.deletePlatformConnection);

// Platform routes with validation
router.get('/connections', platformController.getConnections);
router.get('/connections/:id', platformController.getConnection);

router.post('/connections', [
  body('platformType').notEmpty().trim().withMessage('Platform type is required'),
  body('name').notEmpty().trim().withMessage('Connection name is required'),
  body('credentials').notEmpty().withMessage('Credentials are required'),
], platformController.createConnection);

router.put('/connections/:id', [
  body('name').optional().trim(),
  body('credentials').optional(),
], platformController.updateConnection);

router.delete('/connections/:id', platformController.deleteConnection);
router.post('/connections/:id/test', platformController.testConnection);
router.post('/connections/test', platformController.testNewConnection);
router.get('/connections/:id/products', platformController.getProductsByConnection);

// Trendyol-specific endpoints
router.get('/connections/:id/order/:orderNumber', platformController.getOrderById);
router.get('/connections/:id/order/:orderNumber/shipment-packages', platformController.getOrderShipmentPackages);
router.post('/connections/:id/order/:orderNumber/shipment-packages', platformController.createShipmentPackage);
router.get('/connections/:id/claims', platformController.getClaims);
router.get('/connections/:id/shipping-providers', platformController.getShippingProviders);
router.get('/connections/:id/settlements', platformController.getSettlements);
router.post('/connections/:id/batch-requests', platformController.createBatchRequest);
router.get('/connections/:id/batch-requests/:batchRequestId', platformController.getBatchRequestStatus);

router.get('/types', platformController.getPlatformTypes);

module.exports = router;