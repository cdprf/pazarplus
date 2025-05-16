const express = require('express');
const exportController = require('../controllers/export-controller');

const router = express.Router();

// Map controller routes to router
router.use('/', exportController.router);

module.exports = router;