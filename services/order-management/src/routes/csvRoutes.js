const express = require('express');
const csvController = require('../controllers/csv-controller');

const router = express.Router();

// Map controller routes to router
router.use('/', csvController.router);

module.exports = router;