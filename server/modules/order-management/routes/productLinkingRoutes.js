const express = require("express");
const router = express.Router();
const productLinkingController = require("../controllers/product-linking-controller");
const { auth, adminAuth } = require("../../../middleware/auth");

// All product linking routes require admin authentication
router.use(adminAuth);

// Get unlinked order items with filtering and pagination
router.get("/unlinked-items", productLinkingController.getUnlinkedItems);

// Get linking statistics and reports
router.get("/stats", productLinkingController.getLinkingStats);

// Run retroactive linking on existing orders
router.post("/run-retroactive", productLinkingController.runRetroactiveLinking);

// Get product suggestions for a specific order item
router.get("/suggestions/:id", productLinkingController.getProductSuggestions);

// Manual operations on specific order items
router.post("/link/:id", productLinkingController.manualLinkItem);
router.delete("/unlink/:id", productLinkingController.unlinkItem);

module.exports = router;
