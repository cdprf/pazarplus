/**
 * Enhanced Product Management Routes
 * API endpoints for the enhanced product management system
 */

const express = require("express");
const { body, param, query } = require("express-validator");
const router = express.Router();
const { auth } = require("../middleware/auth");
const EnhancedProductController = require("../controllers/enhanced-product-controller");

// Apply auth middleware to all routes
router.use(auth);

// Main Product Routes
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("search").optional().isString(),
    query("category").optional().isString(),
    query("status")
      .optional()
      .isIn(["active", "inactive", "draft", "archived"]),
    query("hasVariants").optional().isBoolean(),
    query("sortBy")
      .optional()
      .isIn([
        "name",
        "baseSku",
        "category",
        "basePrice",
        "stockQuantity",
        "createdAt",
        "updatedAt",
      ]),
    query("sortOrder").optional().isIn(["ASC", "DESC"]),
  ],
  EnhancedProductController.getMainProducts
);

router.get(
  "/:id",
  [param("id").isUUID().withMessage("Invalid product ID")],
  EnhancedProductController.getMainProduct
);

router.post(
  "/",
  [
    body("name")
      .notEmpty()
      .isLength({ min: 1, max: 255 })
      .withMessage("Name is required and must be 1-255 characters"),
    body("baseSku").optional().isString().isLength({ min: 1, max: 100 }),
    body("description").optional().isString(),
    body("category").notEmpty().withMessage("Category is required"),
    body("brand").optional().isString(),
    body("productType").optional().isString(),
    body("basePrice")
      .isFloat({ min: 0 })
      .withMessage("Base price must be a positive number"),
    body("baseCostPrice").optional().isFloat({ min: 0 }),
    body("stockQuantity").optional().isInt({ min: 0 }),
    body("minStockLevel").optional().isInt({ min: 0 }),
    body("weight").optional().isFloat({ min: 0 }),
    body("dimensions").optional().isObject(),
    body("media").optional().isArray(),
    body("attributes").optional().isObject(),
    body("tags").optional().isArray(),
    body("status").optional().isIn(["active", "inactive", "draft", "archived"]),
  ],
  EnhancedProductController.createMainProduct
);

router.put(
  "/:id",
  [
    param("id").isUUID().withMessage("Invalid product ID"),
    body("name").optional().isLength({ min: 1, max: 255 }),
    body("description").optional().isString(),
    body("category").optional().notEmpty(),
    body("brand").optional().isString(),
    body("productType").optional().isString(),
    body("basePrice").optional().isFloat({ min: 0 }),
    body("baseCostPrice").optional().isFloat({ min: 0 }),
    body("minStockLevel").optional().isInt({ min: 0 }),
    body("weight").optional().isFloat({ min: 0 }),
    body("dimensions").optional().isObject(),
    body("media").optional().isArray(),
    body("attributes").optional().isObject(),
    body("tags").optional().isArray(),
    body("status").optional().isIn(["active", "inactive", "draft", "archived"]),
  ],
  EnhancedProductController.updateMainProduct
);

router.delete(
  "/:id",
  [param("id").isUUID().withMessage("Invalid product ID")],
  EnhancedProductController.deleteMainProduct
);

// Platform Variant Routes
router.post(
  "/:mainProductId/variants",
  [
    param("mainProductId").isUUID().withMessage("Invalid main product ID"),
    body("platform")
      .isIn([
        "trendyol",
        "hepsiburada",
        "n11",
        "amazon",
        "gittigidiyor",
        "custom",
      ])
      .withMessage("Invalid platform"),
    body("platformSku").optional().isString().isLength({ min: 1, max: 100 }),
    body("platformBarcode").optional().isString().isLength({ max: 100 }),
    body("variantSuffix").optional().isString().isLength({ max: 20 }),
    body("useMainPrice").optional().isBoolean(),
    body("platformPrice").optional().isFloat({ min: 0 }),
    body("platformCostPrice").optional().isFloat({ min: 0 }),
    body("priceMarkup").optional().isFloat(),
    body("platformAttributes").optional().isObject(),
    body("platformCategory").optional().isString(),
    body("platformTitle").optional().isString().isLength({ max: 500 }),
    body("platformDescription").optional().isString(),
    body("useMainMedia").optional().isBoolean(),
    body("platformMedia").optional().isArray(),
    body("templateId").optional().isUUID(),
    body("templateFields").optional().isObject(),
    body("status").optional().isIn(["active", "inactive", "draft", "error"]),
  ],
  EnhancedProductController.createPlatformVariant
);

router.put(
  "/variants/:variantId",
  [
    param("variantId").isUUID().withMessage("Invalid variant ID"),
    body("platformSku").optional().isString().isLength({ min: 1, max: 100 }),
    body("platformBarcode").optional().isString().isLength({ max: 100 }),
    body("variantSuffix").optional().isString().isLength({ max: 20 }),
    body("useMainPrice").optional().isBoolean(),
    body("platformPrice").optional().isFloat({ min: 0 }),
    body("platformCostPrice").optional().isFloat({ min: 0 }),
    body("priceMarkup").optional().isFloat(),
    body("platformAttributes").optional().isObject(),
    body("platformCategory").optional().isString(),
    body("platformTitle").optional().isString().isLength({ max: 500 }),
    body("platformDescription").optional().isString(),
    body("useMainMedia").optional().isBoolean(),
    body("platformMedia").optional().isArray(),
    body("templateId").optional().isUUID(),
    body("templateFields").optional().isObject(),
    body("status").optional().isIn(["active", "inactive", "draft", "error"]),
  ],
  EnhancedProductController.updatePlatformVariant
);

router.delete(
  "/variants/:variantId",
  [param("variantId").isUUID().withMessage("Invalid variant ID")],
  EnhancedProductController.deletePlatformVariant
);

// Stock Management Routes
router.get(
  "/:id/stock",
  [param("id").isUUID().withMessage("Invalid product ID")],
  EnhancedProductController.getStockStatus
);

router.put(
  "/:id/stock",
  [
    param("id").isUUID().withMessage("Invalid product ID"),
    body("quantity")
      .isInt({ min: 0 })
      .withMessage("Quantity must be a non-negative integer"),
    body("reason").optional().isString(),
  ],
  EnhancedProductController.updateStock
);

router.post(
  "/:id/stock/reserve",
  [
    param("id").isUUID().withMessage("Invalid product ID"),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be a positive integer"),
    body("reason").optional().isString(),
    body("expiresAt").optional().isISO8601(),
  ],
  EnhancedProductController.reserveStock
);

router.delete(
  "/stock/reservations/:reservationId",
  [
    param("reservationId").isUUID().withMessage("Invalid reservation ID"),
    body("reason").optional().isString(),
  ],
  EnhancedProductController.releaseReservation
);

router.get(
  "/:id/stock/history",
  [
    param("id").isUUID().withMessage("Invalid product ID"),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  EnhancedProductController.getStockHistory
);

// Platform Publishing Routes
router.post(
  "/:id/publish",
  [
    param("id").isUUID().withMessage("Invalid product ID"),
    body("platforms")
      .isArray({ min: 1 })
      .withMessage("Platforms array is required"),
    body("platforms.*.platform").isIn([
      "trendyol",
      "hepsiburada",
      "n11",
      "amazon",
      "gittigidiyor",
      "custom",
    ]),
    body("platforms.*.platformCategory").optional().isString(),
    body("platforms.*.platformAttributes").optional().isObject(),
    body("platforms.*.templateId").optional().isUUID(),
  ],
  EnhancedProductController.publishToPlatforms
);

// Bulk Operations Routes
router.post(
  "/bulk",
  [
    body("operation")
      .isIn(["publish", "updatePrice", "updateStock"])
      .withMessage("Invalid operation"),
    body("productIds")
      .isArray({ min: 1 })
      .withMessage("Product IDs array is required"),
    body("productIds.*").isUUID().withMessage("Invalid product ID in array"),
    body("operationData").isObject().withMessage("Operation data is required"),
  ],
  EnhancedProductController.bulkOperation
);

// Sync and Matching Routes
router.post(
  "/match-sync",
  [
    body("syncedProduct")
      .isObject()
      .withMessage("Synced product data is required"),
    body("syncedProduct.sku")
      .notEmpty()
      .withMessage("SKU is required in synced product"),
  ],
  EnhancedProductController.matchSyncedProduct
);

router.post(
  "/create-from-sync",
  [
    body("syncedProduct")
      .isObject()
      .withMessage("Synced product data is required"),
    body("syncedProduct.sku").notEmpty().withMessage("SKU is required"),
    body("syncedProduct.name").notEmpty().withMessage("Name is required"),
    body("platformInfo").isObject().withMessage("Platform info is required"),
    body("platformInfo.platform")
      .isIn(["trendyol", "hepsiburada", "n11", "amazon", "gittigidiyor"])
      .withMessage("Invalid platform"),
  ],
  EnhancedProductController.createFromSync
);

// Template Management Routes
router.get(
  "/templates",
  [
    query("platform")
      .optional()
      .isIn([
        "trendyol",
        "hepsiburada",
        "n11",
        "amazon",
        "gittigidiyor",
        "custom",
      ]),
    query("category").optional().isString(),
  ],
  EnhancedProductController.getPlatformTemplates
);

router.post(
  "/templates",
  [
    body("name")
      .notEmpty()
      .isLength({ min: 1, max: 255 })
      .withMessage("Template name is required"),
    body("platform")
      .isIn([
        "trendyol",
        "hepsiburada",
        "n11",
        "amazon",
        "gittigidiyor",
        "custom",
      ])
      .withMessage("Invalid platform"),
    body("category").optional().isString(),
    body("requiredFields").optional().isArray(),
    body("optionalFields").optional().isArray(),
    body("fieldValidations").optional().isObject(),
    body("defaultValues").optional().isObject(),
    body("fieldMappings").optional().isObject(),
    body("mediaRequirements").optional().isObject(),
  ],
  EnhancedProductController.savePlatformTemplate
);

router.put(
  "/templates/:id",
  [
    param("id").isUUID().withMessage("Invalid template ID"),
    body("name").optional().isLength({ min: 1, max: 255 }),
    body("platform")
      .optional()
      .isIn([
        "trendyol",
        "hepsiburada",
        "n11",
        "amazon",
        "gittigidiyor",
        "custom",
      ]),
    body("category").optional().isString(),
    body("requiredFields").optional().isArray(),
    body("optionalFields").optional().isArray(),
    body("fieldValidations").optional().isObject(),
    body("defaultValues").optional().isObject(),
    body("fieldMappings").optional().isObject(),
    body("mediaRequirements").optional().isObject(),
  ],
  EnhancedProductController.savePlatformTemplate
);

module.exports = router;
