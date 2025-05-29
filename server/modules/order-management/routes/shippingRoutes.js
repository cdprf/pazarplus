// src/routes/shippingRoutes.js
const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const shippingController = require("../controllers/shipping-controller");
const mainShippingController = require("../../../controllers/shipping-controller");
const { auth, adminAuth } = require("../../../middleware/auth");

// Apply authentication middleware
router.use(auth);

// Order-specific shipping operations
router.post(
  "/labels/generate",
  body("orderId").notEmpty().withMessage("Order ID is required"),
  body("carrier").optional().isString(),
  shippingController.generateShippingLabel
);

router.post(
  "/labels/bulk",
  body("orderIds").isArray().withMessage("Order IDs must be an array"),
  body("carrier").optional().isString(),
  shippingController.generateBulkShippingLabels
);

router.get(
  "/labels/:id",
  param("id").isNumeric().withMessage("Order ID must be numeric"),
  shippingController.getShippingLabel
);

router.post(
  "/mark-shipped",
  body("orderIds").isArray().withMessage("Order IDs must be an array"),
  body("trackingNumber").notEmpty().withMessage("Tracking number is required"),
  body("carrier").notEmpty().withMessage("Carrier is required"),
  body("shippingDate").optional().isISO8601(),
  shippingController.markAsShipped
);

// Modern shipping API endpoints (delegated to main controller)
router.get("/carriers", shippingController.getSupportedCarriers);

router.get(
  "/carriers/:carrier/services",
  param("carrier").notEmpty().withMessage("Carrier is required"),
  mainShippingController.getCarrierServices
);

router.post(
  "/rates",
  body("packageInfo").isObject().withMessage("Package info must be an object"),
  body("fromAddress").isObject().withMessage("From address must be an object"),
  body("toAddress").isObject().withMessage("To address must be an object"),
  mainShippingController.getShippingRates
);

router.post(
  "/labels/create",
  body("shipmentData")
    .isObject()
    .withMessage("Shipment data must be an object"),
  body("carrier").notEmpty().withMessage("Carrier is required"),
  mainShippingController.createShippingLabel
);

router.get(
  "/track/:carrier/:trackingNumber",
  param("trackingNumber").notEmpty().withMessage("Tracking number is required"),
  param("carrier").notEmpty().withMessage("Carrier is required"),
  mainShippingController.trackPackage
);

router.post(
  "/availability",
  body("address").isObject().withMessage("Address must be an object"),
  mainShippingController.checkDeliveryAvailability
);

router.post(
  "/credentials/validate",
  body("carrier").notEmpty().withMessage("Carrier is required"),
  body("credentials").isObject().withMessage("Credentials must be an object"),
  mainShippingController.validateCredentials
);

// Admin-only endpoints
router.get("/cache/stats", adminAuth, mainShippingController.getCacheStats);
router.delete("/cache/:carrier?", adminAuth, mainShippingController.clearCache);

module.exports = router;
