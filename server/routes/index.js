const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");

logger.info("Testing route loading...");
try {
  // Test loading the main routes
  logger.info("Loading main routes index...");

  // Import centralized route modules
  const authRoutes = require("./auth");
  const platformRoutes = require("./platformRoutes");
  const productRoutes = require("./products");
  const settingsRoutes = require("./settingsRoutes");
  const complianceRoutes = require("./complianceRoutes");
  const paymentRoutes = require("./paymentRoutes");
  const customerRoutes = require("./customerRoutes");
  const customerQuestionRoutes = require("./customerQuestions");
  const importExportRoutes = require("./importExportRoutes");
  const orderManagementRoutes = require("../modules/order-management/routes");

  // Image proxy middleware for handling external images with SSL issues
  const imageProxyRoutes = require("../middleware/image-proxy");

  // Image proxy routes for SSL certificate issues
  const imageProxyApiRoutes = require("./image-proxy");

  // Network configuration routes
  const networkRoutes = require("./network");

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

  // Import SKU system routes
  const skuRoutes = require("./sku");

  // Import font management routes
  const fontRoutes = require("./fonts");

  // Import platform operations routes
  const platformOperationsRoutes = require("./platform-operations");

  // Import platform variants routes
  const platformVariantsRoutes = require("./platform-variants");

  // Import platform products routes
  const platformProductsRoutes = require("./platform-products");

  // Import placeholder image routes
  const placeholderRoutes = require("./placeholder");

  // Import background tasks routes
  const backgroundTasksRoutes = require("./backgroundTasks");

  // Unified Product Intelligence routes
  const unifiedIntelligenceRoutes = require("./unified-product-intelligence");

  // Spare Parts routes
  const vehicleRoutes = require("./vehicles");
  const chatRoutes = require("./chat");

  // Cart routes
  const cartRoutes = require("./cart");

  // Price routes
  const priceRoutes = require("./prices");

  // Marketplace routes
  const marketplaceRoutes = require("./marketplaces");

  // WhatsApp routes
  const whatsappRoutes = require("./whatsapp");

  // Mount centralized routes
  logger.info("Mounting auth routes at /auth...");
  router.use("/auth", authRoutes);
  logger.info("✅ Auth routes mounted successfully");

  router.use("/platforms", platformRoutes);
  router.use("/v1/enhanced-platforms", platformRoutes); // Enhanced platform routes compatibility
  router.use("/products", productRoutes);
  router.use("/sku", skuRoutes);
  router.use("/customers", customerRoutes);
  router.use("/customer-questions", customerQuestionRoutes);
  router.use("/settings", settingsRoutes);
  router.use("/compliance", complianceRoutes);
  router.use("/payments", paymentRoutes);

  // Import/Export routes - mount at specific path to avoid conflicts
  router.use("/import-export", importExportRoutes);

  // Compatibility route for legacy /api/orders endpoint
  // Forward requests to the order management module
  router.use("/orders", orderManagementRoutes);

  // Module-specific routes
  router.use(
    "/order-management",
    (req, res, next) => {
      logger.info(
        `Main routes - Order Management: ${req.method} ${req.originalUrl}`
      );
      next();
    },
    orderManagementRoutes
  );

  // Image proxy for handling external images with SSL issues
  router.use("/", imageProxyRoutes);

  // Network configuration routes
  router.use("/network", networkRoutes);

  // Month 5 Phase 1: Advanced Analytics & Business Intelligence routes
  router.use("/analytics", analyticsRoutes);

  // Image proxy routes for handling SSL certificate issues
  router.use("/image", imageProxyApiRoutes);

  // Placeholder image routes
  router.use("/placeholder", placeholderRoutes);

  // Month 5 Phase 2: Subscription Management & Multi-tenant SaaS routes
  router.use("/subscription", subscriptionRoutes);

  // Admin routes (including rate limiting management)
  router.use("/admin", rateLimitRoutes);

  // Shipping templates routes
  router.use("/shipping/templates", shippingTemplatesRoutes);

  // Main shipping routes - direct mounting to match client API calls
  router.use("/shipping", shippingRoutes);

  // Database transaction management routes
  router.use("/database", databaseRoutes);

  // Platform operations routes
  router.use("/platform-operations", platformOperationsRoutes);

  // Platform variants routes
  router.use("/platform-variants", platformVariantsRoutes);

  // Platform products routes
  router.use("/platform-products", platformProductsRoutes);

  // Background tasks routes
  router.use("/background-tasks", backgroundTasksRoutes);

  // Font management routes
  router.use("/fonts", fontRoutes);

  // Import translation routes
  const translationRoutes = require("./translationRoutes");

  // Translation management routes (for super admin)
  router.use("/translations", translationRoutes);

  // Unified Product Intelligence routes
  router.use("/product-intelligence", unifiedIntelligenceRoutes);

  // Spare Parts routes
  router.use("/vehicles", vehicleRoutes);
  router.use("/chat", chatRoutes);

  // Cart routes
  router.use("/cart", cartRoutes);

  // Price routes
  router.use("/prices", priceRoutes);

  // Marketplace routes
  router.use("/marketplaces", marketplaceRoutes);

  // WhatsApp routes
  router.use("/whatsapp", whatsappRoutes);

  logger.info("✅ Main routes loaded");
} catch (error) {
  logger.error("❌ Error loading routes:", error.message);
  logger.error("Stack:", error.stack);
}

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
      enhancedPlatforms: "/api/v1/enhanced-platforms", // Enhanced platform routes compatibility
      products: "/api/products",
      sku: "/api/sku",
      customers: "/api/customers",
      customerQuestions: "/api/customer-questions",
      settings: "/api/settings", // Includes shipping templates at /api/settings/shipping/templates
      compliance: "/api/compliance",
      shipping: "/api/shipping", // Coming Soon - Q3 2025
      payments: "/api/payments", // Coming Soon - Q4 2025
      orderManagement: "/api/order-management",
      analytics: "/api/analytics", // Month 5 Phase 1
      subscription: "/api/subscription", // Month 5 Phase 2 - NEW
      rateLimits: "/api/admin", // Rate limiting management
      database: "/api/database", // Database transaction management
      platformOperations: "/api/platform-operations", // Background tasks and platform operations
      platformProducts: "/api/platform-products", // Platform product creation and management
      backgroundTasks: "/api/background-tasks", // Background task management
    },
    comingSoon: {
      shipping: {
        status: "development",
        expectedRelease: "Q3 2025",
        note: "PDF Template Designer moved to /api/settings/shipping/templates",
      },
      payments: {
        status: "development",
        expectedRelease: "Q4 2025",
        note: "Turkish payment gateway integration",
      },
    },
  });
});

// Global API middleware for debugging
router.use("*", (req, res, next) => {
  logger.info(`API Route accessed: ${req.method} /api${req.url}`);
  next();
});

// ========================================
// === ENHANCED PRODUCT MANAGEMENT ROUTES - DISABLED ===
// ========================================
// Enhanced product functionality has been merged into the main product routes
// at /api/products/main-products/* to avoid duplication and conflicts

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
      "/api/v1/enhanced-platforms", // Enhanced platform routes compatibility
      "/api/products",
      "/api/sku",
      "/api/customers",
      "/api/customer-questions",
      "/api/product-intelligence", // Unified Product Intelligence System
      "/api/settings",
      "/api/compliance",
      "/api/order-management",
      "/api/analytics", // Month 5 Phase 1
      "/api/subscription", // Month 5 Phase 2 - NEW
      "/api/database", // Database transaction management
      "/api/fonts", // Font management and validation
      "/api/translations", // Translation management (super admin)
      "/api/background-tasks", // Background task management
      "/api/order-management/orders/:orderId/items-with-products", // Product linking
      "/api/order-management/products/search", // Product search for linking
      "/api/order-management/order-items/:itemId/link-product", // Link order item to product
      "/api/order-management/order-items/:itemId/unlink-product", // Unlink order item from product
    ],
  });
});

logger.info("✅ All routes configured successfully");
module.exports = router;
