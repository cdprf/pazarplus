const express = require('express');
const router = express.Router();
const platformTemplatesController = require('../controllers/platform-templates-controller');

// Use the controller router directly
router.use('/', platformTemplatesController);

module.exports = router;