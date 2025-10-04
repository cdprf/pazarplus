const express = require("express");
const router = express.Router();
const priceController = require("../controllers/priceController");
const { isAuthenticated } = require("../middleware/auth");
const { body } = require('express-validator');

// @route   POST /api/prices/update
// @desc    Simulate updating prices from a supplier
// @access  Private
router.post(
  "/update",
  isAuthenticated,
  [
    body('supplierId').isUUID().withMessage('A valid supplierId is required.'),
  ],
  priceController.updatePrices
);

module.exports = router;