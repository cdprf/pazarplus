const express = require('express');
const router = express.Router();
const exportController = require('../controllers/export-controller');
const { protect, authorize } = require('../middleware/auth');
const { body } = require('express-validator');

// Apply authentication middleware to all export routes
router.use(protect);

// Export routes
router.post('/orders/csv', exportController.exportOrdersToCSV);
router.post('/orders/excel', exportController.exportOrdersToExcel);
router.post('/order-items/csv', exportController.exportOrderItemsToCSV);
router.get('/files', exportController.getExportFiles);
router.delete('/files/:filename', exportController.deleteExportFile);

module.exports = router;