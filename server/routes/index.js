const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");

// Import centralized route modules
const authRoutes = require("./auth");
const platformRoutes = require("./platformRoutes");
const productRoutes = require("./productRoutes");
const settingsRoutes = require("./settingsRoutes");
const complianceRoutes = require("./complianceRoutes");
const orderManagementRoutes = require("../modules/order-management/routes");
const orderRoutes = require("./orderRoutes"); // Fixed: now points to the correct file

// Import enhanced platform integration routes
const enhancedPlatformRoutes = require("./enhanced-platforms");

// Health check endpoint - should be accessible first
router.get("/api/health", (req, res) => {
  logger.info("Health check accessed");
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    routes: {
      auth: "/api/auth",
      platforms: "/api/platforms",
      enhancedPlatforms: "/api/v1/enhanced-platforms",
      products: "/api/products",
      settings: "/api/settings",
      compliance: "/api/compliance",
      orderManagement: "/api/order-management",
    },
  });
});

// Global API middleware for debugging
router.use("*", (req, res, next) => {
  logger.debug(`API Route accessed: ${req.method} /api${req.url}`);
  next();
});

// Mount centralized routes
router.use("/auth", authRoutes);
router.use("/platforms", platformRoutes);
router.use("/products", productRoutes);
router.use("/settings", settingsRoutes);
router.use("/compliance", complianceRoutes);

// Direct orders API for frontend compatibility
router.use("/orders", orderRoutes);

// Module-specific routes
router.use("/order-management", orderManagementRoutes);

// Enhanced platform integration routes (Week 5-6 features)
router.use("/v1/enhanced-platforms", enhancedPlatformRoutes);

// Catch-all for debugging
router.use("/*", (req, res) => {
  logger.warn(`Unmatched API route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      "/api/auth",
      "/api/platforms",
      "/api/v1/enhanced-platforms",
      "/api/products",
      "/api/settings",
      "/api/compliance",
      "/api/orders",
      "/api/order-management",
    ],
  });
});

module.exports = router;
