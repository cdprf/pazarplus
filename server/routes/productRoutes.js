const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDelete,
  bulkUpdateStatus,
  getProductStats,
} = require("../controllers/product-controller");

// Apply authentication to all routes
router.use(auth);

// Product routes
router.get("/", getProducts);
router.get("/stats", getProductStats);
router.get("/:id", getProductById);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

// Bulk operations
router.delete("/bulk", bulkDelete);
router.put("/bulk/status", bulkUpdateStatus);

module.exports = router;
