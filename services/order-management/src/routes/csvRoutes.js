const express = require('express');
const router = express.Router();
const csvController = require('../controllers/csv-controller');
const { protect } = require('../middleware/auth');
const { param } = require('express-validator');

// Apply authentication middleware to all routes
router.use(protect);

// CSV file upload and processing routes
router.post('/validate', 
  csvController.upload.single('file'), 
  csvController.validateCSV
);

router.post('/import/:connectionId', [
  param('connectionId').isNumeric().withMessage('Connection ID must be a number'),
  csvController.upload.single('file')
], csvController.importCSV);

router.get('/templates', csvController.getTemplates);

module.exports = router;