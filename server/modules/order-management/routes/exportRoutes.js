const express = require('express');
const router = express.Router();
const exportController = require('../controllers/export-controller');
const { auth, adminAuth } = require('../../../middleware/auth'); // Fixed: import correct middleware
const { body } = require('express-validator');

// Apply authentication middleware to all export routes
router.use(auth); // Fixed: use 'auth' instead of 'protect'

// Export routes
router.post('/orders/csv', exportController.exportOrdersToCSV);
router.post('/orders/excel', exportController.exportOrdersToExcel);
router.post('/order-items/csv', exportController.exportOrderItemsToCSV);
router.get('/files', exportController.getExportFiles);
router.delete('/files/:filename', exportController.deleteExportFile);

module.exports = router;