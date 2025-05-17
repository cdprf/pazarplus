const express = require('express');
const router = express.Router();
const exportController = require('../controllers/export-controller');

// Use the controller router directly
router.use('/', exportController);

module.exports = router;