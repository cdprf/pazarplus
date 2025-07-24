const express = require("express");
const logger = require("../../../utils/logger");

// Initialize variables for route modules
let orderRoutes,
  adminRoutes,
  exportRoutes,
  csvRoutes,
  connections,
  settingsRoutes,
  platformTemplatesRoutes,
  qnbFinansRoutes,
  productLinkingRoutes,
  productLinkingJobRoutes;
let ProductLinkingService;

// Create the router
const router = express.Router();

// Import route modules with try/catch blocks
try {
  orderRoutes = require("./orderRoutes");
} catch (error) {
  logger.error("Failed to load orderRoutes", {
    operation: "route_loading",
    module: "orderRoutes",
    error: error.message,
  });
  // Create dummy router
  orderRoutes = express.Router();
  orderRoutes.use((req, res) => {
    res.status(500).json({ error: "Order routes unavailable" });
  });
}

try {
  adminRoutes = require("./adminRoutes");
} catch (error) {
  logger.error("Failed to load adminRoutes", {
    operation: "route_loading",
    module: "adminRoutes",
    error: error.message,
  });
  adminRoutes = express.Router();
}

try {
  exportRoutes = require("./exportRoutes");
} catch (error) {
  logger.error("Failed to load exportRoutes", {
    operation: "route_loading",
    module: "exportRoutes",
    error: error.message,
  });
  exportRoutes = express.Router();
}

try {
  csvRoutes = require("./csvRoutes");
} catch (error) {
  logger.error("Failed to load csvRoutes", {
    operation: "route_loading",
    module: "csvRoutes",
    error: error.message,
  });
  csvRoutes = express.Router();
}

try {
  connections = require("../../../routes/connections");
} catch (error) {
  logger.error("Failed to load connections", {
    operation: "route_loading",
    module: "connections",
    error: error.message,
  });
  connections = express.Router();
}

try {
  settingsRoutes = require("./settingsRoutes");
} catch (error) {
  logger.error("Failed to load settingsRoutes", {
    operation: "route_loading",
    module: "settingsRoutes",
    error: error.message,
  });
  settingsRoutes = express.Router();
}

try {
  platformTemplatesRoutes = require("./platform-templates-routes");
} catch (error) {
  logger.error("Failed to load platformTemplatesRoutes", {
    operation: "route_loading",
    module: "platformTemplatesRoutes",
    error: error.message,
  });
  platformTemplatesRoutes = express.Router();
}

try {
  qnbFinansRoutes = require("./qnbFinansRoutes");
} catch (error) {
  logger.error("Failed to load qnbFinansRoutes", {
    operation: "route_loading",
    module: "qnbFinansRoutes",
    error: error.message,
  });
  qnbFinansRoutes = express.Router();
}

try {
  productLinkingRoutes = require("./productLinkingRoutes");
} catch (error) {
  logger.error("Failed to load productLinkingRoutes", {
    operation: "route_loading",
    module: "productLinkingRoutes",
    error: error.message,
  });
  productLinkingRoutes = express.Router();
}

try {
  productLinkingJobRoutes = require("./productLinkingJobRoutes");
} catch (error) {
  logger.error("Failed to load productLinkingJobRoutes", {
    operation: "route_loading",
    module: "productLinkingJobRoutes",
    error: error.message,
  });
  productLinkingJobRoutes = express.Router();
}

// Import ProductLinkingService
try {
  ProductLinkingService = require("../../../services/ProductLinkingService");
} catch (error) {
  logger.error("Error loading ProductLinkingService", {
    operation: "service_loading",
    service: "ProductLinkingService",
    error: error.message,
  });
  // Create a fallback service
  ProductLinkingService = {
    getOrderItemsWithProducts: async () => [],
    searchProducts: async () => [],
    linkOrderItemWithProduct: async () => ({
      success: false,
      error: "Service unavailable",
    }),
  };
}

// Import authentication middleware
const { auth: authenticateToken } = require("../../../middleware/auth");

// Mount sub-routers with error handling
try {
  router.use("/orders", orderRoutes);
  router.use("/admin", adminRoutes);
  router.use("/export", exportRoutes);
  router.use("/csv", csvRoutes);
  router.use("/connections", connections);
  router.use("/settings", settingsRoutes);
  router.use("/templates", platformTemplatesRoutes);
  router.use("/qnb-finans", qnbFinansRoutes);
  router.use("/product-linking", productLinkingRoutes);
  router.use("/product-linking-jobs", productLinkingJobRoutes);
} catch (error) {
  logger.error("Error mounting order management routes", {
    operation: "route_mounting",
    error: error.message,
  });
}

// Enhanced Product Linking API - Direct endpoints with error handling
router.get(
  "/orders/:orderId/items-with-products",
  authenticateToken,
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const itemsWithProducts =
        await ProductLinkingService.getOrderItemsWithProducts(orderId);

      res.json({
        success: true,
        data: itemsWithProducts,
      });
    } catch (error) {
      logger.error("Error getting order items with products", {
        operation: "get_order_items_with_products",
        orderId,
        ip: req.ip,
        userId: req.user?.id,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: "Failed to get order items with products",
      });
    }
  }
);

// Search products for linking
router.get("/products/search", authenticateToken, async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    const products = await ProductLinkingService.searchProducts(query, limit);

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    logger.error("Error searching products", {
      operation: "search_products",
      query: req.query.query,
      ip: req.ip,
      userId: req.user?.id,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: "Failed to search products",
    });
  }
});

// Link order item with product
router.post(
  "/orders/:orderId/items/:itemId/link",
  authenticateToken,
  async (req, res) => {
    try {
      const { orderId, itemId } = req.params;
      const { productId } = req.body;

      const result = await ProductLinkingService.linkOrderItemWithProduct(
        itemId,
        productId,
        orderId
      );

      res.json(result);
    } catch (error) {
      logger.error("Error linking order item with product", {
        operation: "link_order_item_product",
        orderId,
        itemId,
        productId: req.body.productId,
        ip: req.ip,
        userId: req.user?.id,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: "Failed to link order item with product",
      });
    }
  }
);

module.exports = router;
