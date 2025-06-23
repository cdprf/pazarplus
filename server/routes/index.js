const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");

// Import centralized route modules
const authRoutes = require("./auth");
const platformRoutes = require("./platformRoutes");
const productRoutes = require("./productRoutes");
const settingsRoutes = require("./settingsRoutes");
const complianceRoutes = require("./complianceRoutes");
const paymentRoutes = require("./paymentRoutes");
const customerRoutes = require("./customerRoutes");
const importExportRoutes = require("./importExportRoutes");
const orderManagementRoutes = require("../modules/order-management/routes");

// Import enhanced platform integration routes
const enhancedPlatformRoutes = require("./enhanced-platforms");

// Analytics & Business Intelligence routes
const analyticsRoutes = require("./analytics");

// Subscription & Multi-tenant routes
const subscriptionRoutes = require("./subscription");

// Import rate limiting management routes
const rateLimitRoutes = require("./rate-limits");

// Import shipping templates routes
const shippingTemplatesRoutes = require("./shipping-templates");

// Import database transaction management routes
const databaseRoutes = require("./database");

// Import shipping related routes
const shippingRoutes = require("./shipping");

// Import enhanced SKU system routes
const skuRoutes = require("./sku-enhanced");

// Import font management routes
const fontRoutes = require("./fonts");

// Import platform operations routes
const platformOperationsRoutes = require("./platform-operations");

// Health check endpoint - should be accessible at /api/health
router.get("/health", (req, res) => {
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
      sku: "/api/sku",
      customers: "/api/customers",
      settings: "/api/settings",
      compliance: "/api/compliance",
      orderManagement: "/api/order-management",
      analytics: "/api/analytics", // Month 5 Phase 1
      subscription: "/api/subscription", // Month 5 Phase 2 - NEW
      rateLimits: "/api/admin", // Rate limiting management
      database: "/api/database", // Database transaction management
      platformOperations: "/api/platform-operations", // Background tasks and platform operations
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
router.use("/sku", skuRoutes);
router.use("/customers", customerRoutes);
router.use("/settings", settingsRoutes);
router.use("/compliance", complianceRoutes);
router.use("/payments", paymentRoutes);

// Import/Export routes - mount at specific path to avoid conflicts
router.use("/import-export", importExportRoutes);

// Compatibility route for legacy /api/orders endpoint
// Forward requests to the order management module
router.use("/orders", orderManagementRoutes);

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

// Main shipping routes - direct mounting to match client API calls
router.use("/shipping", shippingRoutes);

// Main shipping routes (DEPRECATED - using new modular shipping API in order-management)
// router.use("/shipping", shippingRoutes);

// Database transaction management routes
router.use("/database", databaseRoutes);

// Platform operations routes
router.use("/platform-operations", platformOperationsRoutes);

// Enhanced SKU system routes
router.use("/enhanced-sku", skuRoutes);

// Font management routes
router.use("/fonts", fontRoutes);

// Unified Product Intelligence routes
const unifiedIntelligenceRoutes = require("./unified-product-intelligence");
router.use("/product-intelligence", unifiedIntelligenceRoutes);

// Enhanced Product Management routes
const enhancedProductRoutes = require("./enhanced-products");
router.use("/enhanced-products", enhancedProductRoutes);

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
      "/api/sku",
      "/api/enhanced-sku", // Enhanced SKU system
      "/api/product-intelligence", // Unified Product Intelligence System
      "/api/enhanced-products", // Enhanced Product Management System
      "/api/settings",
      "/api/compliance",
      "/api/order-management",
      "/api/analytics", // Month 5 Phase 1
      "/api/subscription", // Month 5 Phase 2 - NEW
      "/api/database", // Database transaction management
      "/api/fonts", // Font management and validation
      "/api/order-management/orders/:orderId/items-with-products", // Product linking
      "/api/order-management/products/search", // Product search for linking
      "/api/order-management/order-items/:itemId/link-product", // Link order item to product
      "/api/order-management/order-items/:itemId/unlink-product", // Unlink order item from product
    ],
  });
});

module.exports = router;
