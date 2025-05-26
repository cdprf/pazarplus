const express = require('express');
const router = express.Router();
const csvController = require('../controllers/csv-controller');
const { auth } = require('../../../middleware/auth'); // Fixed: correct path

// Apply authentication middleware
router.use(auth);

// CSV file upload and processing routes
router.post('/validate', 
  csvController.upload.single('file'), 
  csvController.validateCSV
);

router.post('/import/:connectionId', csvController.upload.single('file'), csvController.importCSV);

router.get('/templates', csvController.getTemplates);

module.exports = router;