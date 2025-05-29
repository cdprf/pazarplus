/**
 * DEPRECATED: Main Shipping Routes
 *
 * This file has been deprecated in favor of the unified shipping API
 * located at: /modules/order-management/routes/shippingRoutes.js
 *
 * The new unified API provides both order-specific shipping operations
 * and modern carrier integration features.
 *
 * TODO: Remove this file after ensuring all references have been updated
 */

const express = require("express");
const router = express.Router();

// Redirect to the new unified shipping API
router.use("*", (req, res) => {
  res.status(301).json({
    success: false,
    message:
      "This shipping API endpoint has been moved to /api/order-management/shipping",
    redirectUrl: "/api/order-management/shipping",
    deprecated: true,
  });
});

module.exports = router;
