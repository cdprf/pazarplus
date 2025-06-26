/**
 * Enhanced Product Management Routes
 * API endpoints for the enhanced product management system
 */

const express = require("express");
const { body, param, query } = require("express-validator");
const router = express.Router();
const { auth } = require("../middleware/auth");
const EnhancedProductController = require("../controllers/enhanced-product-controller");
const MediaUploadService = require("../services/media-upload-service");

// Create media upload service instance
const mediaUploadService = new MediaUploadService();

// Apply auth middleware to all routes
router.use(auth);

// Main Product Routes
router.get(
  "/main-products",
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
  "/main-products/:id",
  [param("id").isUUID().withMessage("Invalid product ID")],
  EnhancedProductController.getMainProduct
);

router.post(
  "/main-products",
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
  "/main-products/:id",
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
  "/main-products/:id",
  [param("id").isUUID().withMessage("Invalid product ID")],
  EnhancedProductController.deleteMainProduct
);

// Platform Variant Routes
router.post(
  "/main-products/:mainProductId/variants",
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
  "/main-products/:id/stock",
  [param("id").isUUID().withMessage("Invalid product ID")],
  EnhancedProductController.getStockStatus
);

router.put(
  "/main-products/:id/stock",
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
  "/main-products/:id/stock/reserve",
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
  "/main-products/:id/stock/history",
  [
    param("id").isUUID().withMessage("Invalid product ID"),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  EnhancedProductController.getStockHistory
);

// Platform Publishing Routes
router.post(
  "/main-products/:id/publish",
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

// Media Upload Routes
router.post(
  "/main-products/:mainProductId/media",
  [param("mainProductId").isUUID().withMessage("Invalid main product ID")],
  mediaUploadService.getUploadMiddleware(),
  EnhancedProductController.uploadMainProductMedia
);

router.post(
  "/main-products/:mainProductId/variants/:variantId/media",
  [
    param("mainProductId").isUUID().withMessage("Invalid main product ID"),
    param("variantId").isUUID().withMessage("Invalid variant ID"),
  ],
  mediaUploadService.getUploadMiddleware(),
  EnhancedProductController.uploadVariantMedia
);

router.delete(
  "/media/:mediaId",
  [param("mediaId").isString().withMessage("Invalid media ID")],
  EnhancedProductController.deleteMedia
);

router.put(
  "/media/:mediaId",
  [
    param("mediaId").isString().withMessage("Invalid media ID"),
    body("altText").optional().isString(),
    body("isPrimary").optional().isBoolean(),
    body("sortOrder").optional().isInt({ min: 0 }),
  ],
  EnhancedProductController.updateMediaMetadata
);

// Auto-match Products Route
router.post("/auto-match", EnhancedProductController.autoMatchProducts);

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

router.post(
  "/bulk/publish",
  [
    body("mainProductIds")
      .isArray()
      .withMessage("Product IDs array is required"),
    body("platforms").isArray().withMessage("Platforms array is required"),
    body("publishingSettings").optional().isObject(),
  ],
  EnhancedProductController.bulkPublishVariants
);

router.post(
  "/bulk/update-prices",
  [
    body("updates").isArray().withMessage("Updates array is required"),
    body("updates.*.variantId").isUUID().withMessage("Invalid variant ID"),
    body("updates.*.price").isFloat({ min: 0 }).withMessage("Invalid price"),
  ],
  EnhancedProductController.bulkUpdatePrices
);

router.post(
  "/bulk/update-stock",
  [
    body("updates").isArray().withMessage("Updates array is required"),
    body("updates.*.mainProductId")
      .isUUID()
      .withMessage("Invalid main product ID"),
    body("updates.*.quantity")
      .isInt({ min: 0 })
      .withMessage("Invalid quantity"),
  ],
  EnhancedProductController.bulkUpdateStock
);

router.post(
  "/bulk/mark-as-main",
  [
    body("productIds")
      .isArray({ min: 1 })
      .withMessage("At least one product ID is required"),
    body("productIds.*").isUUID().withMessage("Invalid product ID format"),
  ],
  EnhancedProductController.bulkMarkAsMainProducts
);

router.post(
  "/bulk/create-variants",
  [
    body("mainProductId").isUUID().withMessage("Invalid main product ID"),
    body("variants")
      .isArray({ min: 1 })
      .withMessage("At least one variant is required"),
    body("variants.*.name").notEmpty().withMessage("Variant name is required"),
    body("variants.*.price")
      .isFloat({ min: 0 })
      .withMessage("Valid price is required"),
  ],
  EnhancedProductController.bulkCreateVariants
);

// Platform Integration Routes
router.post(
  "/scrape-platform",
  [
    body("url").isURL().withMessage("Valid URL is required"),
    body("platform").optional().isString(),
  ],
  EnhancedProductController.scrapePlatformData
);

router.post(
  "/import-from-platform",
  [
    body("platformData").optional().isObject(),
    body("url").optional().isURL(),
    body("fieldMapping").optional().isObject(),
    body("targetPlatform").optional().isString(),
  ],
  EnhancedProductController.importFromPlatform
);

router.post(
  "/scrape-and-import",
  [
    body("url").isURL().withMessage("Valid URL is required"),
    body("platform").optional().isString(),
    body("fieldMapping").optional().isObject(),
  ],
  EnhancedProductController.scrapeAndImportFromPlatform
);

// Field Mapping Routes
router.get(
  "/field-mappings",
  [
    query("sourcePlatform").optional().isString(),
    query("targetPlatform").optional().isString(),
  ],
  EnhancedProductController.getFieldMappings
);

router.post(
  "/field-mappings",
  [
    body("name").notEmpty().withMessage("Mapping name is required"),
    body("sourcePlatform")
      .notEmpty()
      .withMessage("Source platform is required"),
    body("targetPlatform")
      .notEmpty()
      .withMessage("Target platform is required"),
    body("fieldMapping").isObject().withMessage("Field mapping is required"),
  ],
  EnhancedProductController.saveFieldMapping
);

// Bulk Import Routes
router.post(
  "/import/csv",
  [
    body("csvData").isArray().withMessage("CSV data must be an array"),
    body("fieldMapping").isObject().withMessage("Field mapping is required"),
  ],
  EnhancedProductController.importFromCSV
);

router.post(
  "/import/json",
  [
    body("jsonData").isArray().withMessage("JSON data must be an array"),
    body("fieldMapping").isObject().withMessage("Field mapping is required"),
  ],
  EnhancedProductController.importFromJSON
);

// Mark product as main product
router.post(
  "/mark-as-main/:id",
  [param("id").isUUID().withMessage("Invalid product ID")],
  EnhancedProductController.markAsMainProduct
);

module.exports = router;
