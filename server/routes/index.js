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

// Import enhanced platform integration routes
const enhancedPlatformRoutes = require("./enhanced-platforms");

// Import Month 5 Phase 1: Analytics & Business Intelligence routes
const analyticsRoutes = require("./analytics");

// Import Month 5 Phase 2: Subscription & Multi-tenant routes
const subscriptionRoutes = require("./subscription");

// Import rate limiting management routes
const rateLimitRoutes = require("./rate-limits");

// Import shipping templates routes
const shippingTemplatesRoutes = require("./shipping-templates");

// Import main shipping routes
const shippingRoutes = require("./shippingRoutes");

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
      analytics: "/api/analytics", // Month 5 Phase 1
      subscription: "/api/subscription", // Month 5 Phase 2 - NEW
      rateLimits: "/api/admin", // Rate limiting management
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

// Module-specific routes
router.use("/order-management", orderManagementRoutes);

// Enhanced platform integration routes (Week 5-6 features)
router.use("/v1/enhanced-platforms", enhancedPlatformRoutes);

// Month 5 Phase 1: Advanced Analytics & Business Intelligence routes
router.use("/analytics", analyticsRoutes);

// Month 5 Phase 2: Subscription Management & Multi-tenant SaaS routes
router.use("/subscription", subscriptionRoutes);

// Admin routes (including rate limiting management)
router.use("/admin", rateLimitRoutes);

// Shipping templates routes
router.use("/shipping/templates", shippingTemplatesRoutes);

// Main shipping routes
router.use("/shipping", shippingRoutes);

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
      "/api/order-management",
      "/api/analytics", // Month 5 Phase 1
      "/api/subscription", // Month 5 Phase 2 - NEW
    ],
  });
});

module.exports = router;
