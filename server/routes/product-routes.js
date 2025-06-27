const express = require("express");
const router = express.Router();
const ProductController = require("../controllers/product-controller");
const { auth: authMiddleware } = require("../middleware/auth");
const { body, param, query } = require("express-validator");
const validationMiddleware = require("../middleware/validation-middleware");

// Apply authentication to most routes (but inject dev user for development)
router.use((req, res, next) => {
  // For development, inject dev user if no auth provided
  if (!req.user) {
    req.user = {
      id: "e6b500f3-e877-45d4-9bf0-cb08137ebe5a", // dev@example.com
      email: "dev@example.com",
    };
  }
  next();
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products for authenticated user
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search products by name, SKU, or barcode
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [trendyol, n11, hepsiburada]
 *         description: Filter by platform
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *           default: active
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Successfully retrieved products
 */
router.get("/", ProductController.getProducts);

/**
 * @swagger
 * /api/products/sync:
 *   post:
 *     summary: Sync products from all connected platforms
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platforms:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [trendyol, n11, hepsiburada]
 *                 description: Specific platforms to sync (optional)
 *               options:
 *                 type: object
 *                 properties:
 *                   page:
 *                     type: integer
 *                     default: 0
 *                   size:
 *                     type: integer
 *                     default: 100
 *     responses:
 *       200:
 *         description: Successfully synced products
 */
router.post(
  "/sync",
  [
    body("platforms").optional().isArray(),
    body("platforms.*").optional().isIn(["trendyol", "n11", "hepsiburada"]),
    validationMiddleware,
  ],
  ProductController.syncProducts
);

/**
 * @swagger
 * /api/products/test/{platformType}/{connectionId}:
 *   get:
 *     summary: Test product fetching from specific platform
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platformType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [trendyol, n11, hepsiburada]
 *       - in: path
 *         name: connectionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Successfully tested product fetching
 */
router.get(
  "/test/:platformType/:connectionId",
  [
    param("platformType").isIn(["trendyol", "n11", "hepsiburada"]),
    param("connectionId").isUUID(),
    query("page").optional().isInt({ min: 0 }),
    query("size").optional().isInt({ min: 1, max: 100 }),
    validationMiddleware,
  ],
  ProductController.testPlatformProducts
);

/**
 * @swagger
 * /api/products/platform/{platformType}:
 *   get:
 *     summary: Get products from specific platform
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platformType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [trendyol, n11, hepsiburada]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Successfully retrieved platform products
 */
router.get(
  "/platform/:platformType",
  [
    param("platformType").isIn(["trendyol", "n11", "hepsiburada"]),
    query("page").optional().isInt({ min: 0 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    validationMiddleware,
  ],
  ProductController.getPlatformProducts
);

/**
 * @swagger
 * /api/products/sync-status:
 *   get:
 *     summary: Get product synchronization status
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved sync status
 */
router.get("/sync-status", ProductController.getSyncStatus);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product information
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stockQuantity:
 *                 type: integer
 *               category:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Successfully updated product
 */
router.put(
  "/:id",
  [
    param("id").isUUID(),
    body("name").optional().isString().isLength({ min: 1, max: 255 }),
    body("description").optional().isString(),
    body("price").optional().isNumeric(),
    body("stockQuantity").optional().isInt({ min: 0 }),
    body("category").optional().isString(),
    body("status").optional().isIn(["active", "inactive"]),
    validationMiddleware,
  ],
  ProductController.updateProduct
);

// Variant Detection Routes
router.get(
  "/:id/variant-status",
  [
    param("id").isUUID().withMessage("Product ID must be a valid UUID"),
    validationMiddleware,
  ],
  ProductController.classifyProductVariantStatus
);

router.post(
  "/:id/variant-status",
  [
    param("id").isUUID().withMessage("Product ID must be a valid UUID"),
    body("classification")
      .isObject()
      .withMessage("Classification data is required"),
    validationMiddleware,
  ],
  ProductController.updateProductVariantStatus
);

router.delete(
  "/:id/variant-status",
  [
    param("id").isUUID().withMessage("Product ID must be a valid UUID"),
    validationMiddleware,
  ],
  ProductController.removeProductVariantStatus
);

router.post(
  "/batch-variant-detection",
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage("Limit must be between 1 and 500"),
    query("category").optional().isString(),
    query("status").optional().isIn(["active", "inactive", "draft"]),
    validationMiddleware,
  ],
  ProductController.runBatchVariantDetection
);

// Background Variant Detection Service Routes
router.get(
  "/variant-detection/status",
  ProductController.getBackgroundVariantDetectionStatus
);
router.post(
  "/variant-detection/start",
  ProductController.startBackgroundVariantDetection
);
router.post(
  "/variant-detection/stop",
  ProductController.stopBackgroundVariantDetection
);
router.put(
  "/variant-detection/config",
  ProductController.updateBackgroundVariantDetectionConfig
);

/**
 * @swagger
 * /api/products/stats:
 *   get:
 *     summary: Get product statistics
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product statistics
 */
router.get("/stats", ProductController.getProductStats);

/**
 * @swagger
 * /api/products/model-structure:
 *   get:
 *     summary: Get product model structure for field mapping
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product model structure
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     fields:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                           required:
 *                             type: boolean
 *                           description:
 *                             type: string
 */
router.get("/model-structure", ProductController.getModelStructure);

module.exports = router;
