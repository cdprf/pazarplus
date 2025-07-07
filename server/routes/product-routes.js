const express = require("express");
const router = express.Router();
const ProductController = require("../controllers/product-controller");
const { auth: authMiddleware } = require("../middleware/auth");
const { body, param, query } = require("express-validator");
const validationMiddleware = require("../middleware/validation-middleware");

// Apply authentication middleware to all routes
router.use(authMiddleware);

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
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - sku
 *               - basePrice
 *             properties:
 *               name:
 *                 type: string
 *                 description: Product name
 *               sku:
 *                 type: string
 *                 description: Product SKU
 *               description:
 *                 type: string
 *                 description: Product description
 *               basePrice:
 *                 type: number
 *                 description: Base price
 *               currency:
 *                 type: string
 *                 default: TRY
 *                 description: Currency
 *               category:
 *                 type: string
 *                 description: Product category
 *               status:
 *                 type: string
 *                 enum: [active, inactive, draft]
 *                 default: active
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *                 description: Stock quantity
 *     responses:
 *       201:
 *         description: Successfully created product
 *       400:
 *         description: Invalid product data
 */
router.post(
  "/",
  [
    body("name").notEmpty().isString().isLength({ min: 1, max: 255 }),
    body("sku").notEmpty().isString().isLength({ min: 1, max: 100 }),
    body("description").optional().isString(),
    body("basePrice").isNumeric().isFloat({ min: 0 }),
    body("currency").optional().isString().isLength({ min: 3, max: 3 }),
    body("category").optional().isString(),
    body("status").optional().isIn(["active", "inactive", "draft"]),
    body("stock").optional().isInt({ min: 0 }),
    validationMiddleware,
  ],
  ProductController.createProduct
);

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

// Add GET route for easier testing
router.get("/sync", ProductController.syncProducts);

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

// Background Variant Detection Routes
/**
 * @swagger
 * /api/products/background-variant-detection/status:
 *   get:
 *     summary: Get background variant detection service status
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service status retrieved successfully
 */
router.get(
  "/background-variant-detection/status",
  ProductController.getBackgroundVariantDetectionStatus
);

/**
 * @swagger
 * /api/products/background-variant-detection/start:
 *   post:
 *     summary: Start background variant detection service
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service started successfully
 */
router.post(
  "/background-variant-detection/start",
  ProductController.startBackgroundVariantDetection
);

/**
 * @swagger
 * /api/products/background-variant-detection/stop:
 *   post:
 *     summary: Stop background variant detection service
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service stopped successfully
 */
router.post(
  "/background-variant-detection/stop",
  ProductController.stopBackgroundVariantDetection
);

/**
 * @swagger
 * /api/products/background-variant-detection/config:
 *   get:
 *     summary: Get background variant detection configuration
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *   put:
 *     summary: Update background variant detection configuration
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 */
router.get(
  "/background-variant-detection/config",
  ProductController.getBackgroundVariantDetectionConfig
);
router.put(
  "/background-variant-detection/config",
  ProductController.updateBackgroundVariantDetectionConfig
);

/**
 * @swagger
 * /api/products/batch-variant-detection:
 *   post:
 *     summary: Run batch variant detection on user's products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Batch detection completed
 */
router.post(
  "/batch-variant-detection",
  ProductController.runBatchVariantDetection
);

/**
 * @swagger
 * /api/products/analyze-patterns:
 *   post:
 *     summary: Analyze existing products to suggest variant detection patterns
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               patternType:
 *                 type: string
 *                 enum: [color, size, model, structured, custom]
 *               sampleSize:
 *                 type: integer
 *                 default: 50
 *               includeNames:
 *                 type: boolean
 *                 default: true
 *               includeSKUs:
 *                 type: boolean
 *                 default: true
 *               includeDescriptions:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Pattern analysis completed
 */
router.post("/analyze-patterns", ProductController.analyzePatterns);

/**
 * @swagger
 * /api/products/search-by-pattern:
 *   post:
 *     summary: Search products by regex pattern
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pattern:
 *                 type: string
 *                 description: Regex pattern to search for
 *               searchFields:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: boolean
 *                   sku:
 *                     type: boolean
 *                   description:
 *                     type: boolean
 *               limit:
 *                 type: integer
 *                 default: 50
 *     responses:
 *       200:
 *         description: Search results
 */
router.post("/search-by-pattern", ProductController.searchByPattern);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a single product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Successfully retrieved product
 *       404:
 *         description: Product not found
 */
router.get(
  "/:id",
  [
    param("id").isUUID().withMessage("Product ID must be a valid UUID"),
    validationMiddleware,
  ],
  ProductController.getProductById
);

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

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID to delete
 *     responses:
 *       200:
 *         description: Successfully deleted product
 *       404:
 *         description: Product not found
 *       403:
 *         description: Unauthorized to delete this product
 */
router.delete(
  "/:id",
  [
    param("id").isUUID().withMessage("Product ID must be a valid UUID"),
    validationMiddleware,
  ],
  ProductController.deleteProduct
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
router.get(
  "/variant-detection/config",
  ProductController.getBackgroundVariantDetectionConfig
);
router.put(
  "/variant-detection/config",
  ProductController.updateBackgroundVariantDetectionConfig
);

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
