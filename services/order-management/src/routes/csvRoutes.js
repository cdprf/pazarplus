const express = require('express');
const router = express.Router();
const csvController = require('../controllers/csv-controller');

// Use the controller router directly
router.use('/', csvController);

module.exports = router;