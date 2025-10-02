const express = require("express");
const { body, param, query } = require("express-validator");
const router = express.Router();
const productController = require("../controllers/product-controller");
const FieldSyncController = require("../controllers/field-sync-controller");
const { auth } = require("../middleware/auth");
const validationMiddleware = require("../middleware/validation-middleware");

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of products
 */
router.get("/", auth, productController.getProducts);

/**
 * @swagger
 * /api/products/stats:
 *   get:
 *     summary: Get product statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product statistics
 */
router.get("/stats", auth, productController.getProductStats);

/**
 * @swagger
 * /api/products/import/options:
 *   get:
 *     summary: Get import options and configuration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Import options retrieved successfully
 */
router.get("/import/options", auth, productController.getImportOptions);

/**
 * @swagger
 * /api/products/import:
 *   post:
 *     summary: Import products from file
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               options:
 *                 type: string
 *                 description: JSON string with import options
 *     responses:
 *       200:
 *         description: Products imported successfully
 */
router.post("/import", auth, productController.importProducts);

// Background Variant Detection Routes
/**
 * @swagger
 * /api/products/background-variant-detection/status:
 *   get:
 *     summary: Get background variant detection service status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service status retrieved successfully
 */
router.get(
  "/background-variant-detection/status",
  auth,
  productController.getBackgroundVariantDetectionStatus
);

/**
 * @swagger
 * /api/products/background-variant-detection/start:
 *   post:
 *     summary: Start background variant detection service
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service started successfully
 */
router.post(
  "/background-variant-detection/start",
  auth,
  productController.startBackgroundVariantDetection
);

/**
 * @swagger
 * /api/products/background-variant-detection/stop:
 *   post:
 *     summary: Stop background variant detection service
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service stopped successfully
 */
router.post(
  "/background-variant-detection/stop",
  auth,
  productController.stopBackgroundVariantDetection
);

/**
 * @swagger
 * /api/products/background-variant-detection/config:
 *   put:
 *     summary: Update background variant detection configuration
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
router.put(
  "/background-variant-detection/config",
  auth,
  productController.updateBackgroundVariantDetectionConfig
);

/**
 * @swagger
 * /api/products/batch-variant-detection:
 *   post:
 *     summary: Run batch variant detection on user's products
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
  auth,
  productController.runBatchVariantDetection
);

/**
 * @swagger
 * /api/products/main-products:
 *   get:
 *     summary: Get all main products with enhanced features
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Product category
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, draft, archived]
 *         description: Product status
 *     responses:
 *       200:
 *         description: List of main products with pagination
 */
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
  auth,
  productController.getMainProducts
);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a single product by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A single product
 *       404:
 *         description: Product not found
 */
router.get("/:id", auth, productController.getProductById);

/**
 * @swagger
 * /api/products/by-oem/{oem}:
 *   get:
 *     summary: Get a single product by OEM code
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: oem
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A single product
 *       404:
 *         description: Product not found
 */
router.get("/by-oem/:oem", auth, productController.getProductByOem);

/**
 * @swagger
 * /api/products/{id}/compatibility:
 *   get:
 *     summary: Get compatible vehicles for a product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of compatible vehicles
 *       404:
 *         description: Product not found
 */
router.get("/:id/compatibility", auth, productController.getProductCompatibility);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
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
 *             properties:
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Invalid data
 */
router.post("/", auth, productController.createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update an existing product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 */
router.put("/:id", auth, productController.updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 */
router.delete("/:id", auth, productController.deleteProduct);

/**
 * @swagger
 * /api/products/bulk:
 *   delete:
 *     summary: Bulk delete products
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productIds
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Products deleted successfully
 */
router.delete("/bulk", auth, productController.bulkDeleteProducts);

/**
 * @swagger
 * /api/products/bulk/status:
 *   put:
 *     summary: Bulk update product status
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productIds
 *               - status
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, draft]
 *     responses:
 *       200:
 *         description: Products status updated successfully
 */
router.put("/bulk/status", auth, productController.bulkUpdateStatus);

/**
 * @swagger
 * /api/products/sync:
 *   post:
 *     summary: Fetch and merge products from all integrations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Products synced successfully
 */
router.post("/sync", auth, productController.syncProducts);

/**
 * @swagger
 * /api/products/import/csv:
 *   post:
 *     summary: Import products from CSV/Excel file
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               preview:
 *                 type: string
 *                 description: Set to 'true' to only preview without importing
 *               fieldMappings:
 *                 type: object
 *                 description: Field mapping configuration
 *               classificationMode:
 *                 type: string
 *                 enum: [manual, auto, all_main, all_variants]
 *               variantGrouping:
 *                 type: string
 *                 enum: [name, sku, category]
 *               dryRun:
 *                 type: boolean
 *                 description: Test import without saving
 *     responses:
 *       200:
 *         description: Products imported successfully
 */
router.post(
  "/import/csv",
  auth,
  require("../middleware/upload").upload.single("file"),
  require("../middleware/upload").handleUploadErrors,
  productController.importProductsFromCSV
);

/**
 * @swagger
 * /api/products/import/preview:
 *   post:
 *     summary: Preview import file and get field mapping suggestions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File preview generated successfully
 */
router.post(
  "/import/preview",
  auth,
  (req, res, next) => {
    console.log("🔍 ROUTE DEBUG: Before multer", {
      method: req.method,
      url: req.url,
      contentType: req.headers["content-type"],
      contentLength: req.headers["content-length"],
      hasAuthHeader: !!req.headers.authorization,
    });
    next();
  },
  require("../middleware/upload").upload.single("file"),
  require("../middleware/upload").handleUploadErrors,
  productController.previewImportFile
);

/**
 * @swagger
 * /api/products/import/validate:
 *   post:
 *     summary: Validate import data with field mappings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parsedData
 *               - fieldMappings
 *             properties:
 *               parsedData:
 *                 type: object
 *               fieldMappings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Data validation completed
 */
router.post("/import/validate", auth, productController.validateImportData);

/**
 * @swagger
 * /api/products/import/options:
 *   get:
 *     summary: Get import configuration options
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Import options retrieved successfully
 */
router.get("/import/options", auth, productController.getImportOptions);

/**
 * @swagger
 * /api/products/import/template:
 *   get:
 *     summary: Get CSV template for product import
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV template
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get("/import/template", auth, productController.getCSVTemplate);

// === NEW PRODUCT MANAGEMENT ROUTES ===

/**
 * @swagger
 * /api/products/{id}/dashboard:
 *   get:
 *     summary: Get comprehensive product dashboard data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product dashboard data
 */
router.get("/:id/dashboard", auth, productController.getProductDashboard);

/**
 * @swagger
 * /api/products/bulk/publish:
 *   post:
 *     summary: Bulk publish products to selected platforms
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productIds
 *               - platforms
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               platforms:
 *                 type: array
 *                 items:
 *                   type: string
 *               publishingSettings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Bulk publishing operation started
 */
router.post("/bulk/publish", auth, productController.bulkPublishProducts);

/**
 * @swagger
 * /api/products/bulk/operations/{operationId}:
 *   get:
 *     summary: Get bulk operation status and progress
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: operationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bulk operation status
 */
router.get(
  "/bulk/operations/:operationId",
  auth,
  productController.getBulkOperationStatus
);

/**
 * @swagger
 * /api/products/{id}/media:
 *   post:
 *     summary: Upload and manage product media
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               variantId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [image, video, gif, document]
 *               isPrimary:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *               altText:
 *                 type: string
 *               caption:
 *                 type: string
 *               tags:
 *                 type: string
 *     responses:
 *       200:
 *         description: Media uploaded successfully
 */
router.post("/:id/media", auth, productController.uploadProductMedia);

/**
 * @swagger
 * /api/products/{id}/variants/detect:
 *   post:
 *     summary: Auto-detect and create variants from platform data
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
 *               detectionRules:
 *                 type: object
 *     responses:
 *       200:
 *         description: Variants detected successfully
 */
router.post("/:id/variants/detect", auth, productController.autoDetectVariants);

/**
 * @swagger
 * /api/products/{id}/sync-field:
 *   post:
 *     summary: Sync a specific field to platforms
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [field, value]
 *             properties:
 *               field:
 *                 type: string
 *                 description: Field name to update
 *                 example: "price"
 *               value:
 *                 description: New value for the field
 *                 example: 29.99
 *     responses:
 *       200:
 *         description: Field sync initiated successfully
 */
router.post(
  "/:id/sync-field",
  [
    auth,
    param("id").isString().notEmpty().withMessage("Product ID is required"),
    body("field").isString().notEmpty().withMessage("Field name is required"),
    body("value").exists().withMessage("Field value is required"),
    validationMiddleware,
  ],
  FieldSyncController.syncField
);

/**
 * @swagger
 * /api/products/{id}/sync-field/{taskId}/status:
 *   get:
 *     summary: Get field sync task status
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *       - in: query
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [trendyol, n11, hepsiburada]
 *         description: Platform name
 *     responses:
 *       200:
 *         description: Task status retrieved successfully
 */
router.get(
  "/:id/sync-field/:taskId/status",
  [
    auth,
    param("id").isString().notEmpty().withMessage("Product ID is required"),
    param("taskId").isString().notEmpty().withMessage("Task ID is required"),
    query("platform").isString().notEmpty().withMessage("Platform is required"),
    validationMiddleware,
  ],
  FieldSyncController.getTaskStatus
);

/**
 * @swagger
 * /api/products/categories/sync/{platformType}:
 *   post:
 *     summary: Sync platform categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platformType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [trendyol, hepsiburada, n11, pazarama, amazon]
 *     responses:
 *       200:
 *         description: Category sync started
 */
router.post(
  "/categories/sync/:platformType",
  auth,
  productController.syncPlatformCategories
);

// Enhanced Product Management Routes
// These routes provide enhanced functionality compatible with the frontend

/**
 * @swagger
 * /api/products/main-products:
 *   post:
 *     summary: Create a new main product
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
 *               - category
 *               - basePrice
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               baseSku:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               brand:
 *                 type: string
 *               basePrice:
 *                 type: number
 *                 minimum: 0
 *               baseCostPrice:
 *                 type: number
 *                 minimum: 0
 *               stockQuantity:
 *                 type: integer
 *                 minimum: 0
 *               minStockLevel:
 *                 type: integer
 *                 minimum: 0
 *               weight:
 *                 type: number
 *                 minimum: 0
 *               status:
 *                 type: string
 *                 enum: [active, inactive, draft, archived]
 *     responses:
 *       201:
 *         description: Main product created successfully
 *       400:
 *         description: Validation error
 */
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
      .custom((value) => {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) {
          throw new Error("Base price must be a positive number");
        }
        return true;
      })
      .withMessage("Base price must be a positive number"),
    body("baseCostPrice")
      .optional()
      .custom((value) => {
        if (value === "" || value === null || value === undefined) {
          return true;
        }
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) {
          throw new Error("Base cost price must be a positive number");
        }
        return true;
      }),
    body("stockQuantity")
      .optional()
      .custom((value) => {
        if (value === "" || value === null || value === undefined) {
          return true;
        }
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0) {
          throw new Error("Stock quantity must be a positive integer");
        }
        return true;
      }),
    body("minStockLevel")
      .optional()
      .custom((value) => {
        if (value === "" || value === null || value === undefined) {
          return true;
        }
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0) {
          throw new Error("Minimum stock level must be a positive integer");
        }
        return true;
      }),
    body("weight")
      .optional()
      .custom((value) => {
        if (value === "" || value === null || value === undefined) {
          return true;
        }
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) {
          throw new Error("Weight must be a positive number");
        }
        return true;
      }),
    body("attributes").optional().isObject(),
    body("tags").optional().isArray(),
    body("media").optional().isArray(),
    body("status").optional().isIn(["active", "inactive", "draft", "archived"]),
  ],
  auth,
  productController.createMainProduct
);

/**
 * @swagger
 * /api/products/main-products/{id}:
 *   put:
 *     summary: Update a main product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               brand:
 *                 type: string
 *               basePrice:
 *                 type: number
 *                 minimum: 0
 *               status:
 *                 type: string
 *                 enum: [active, inactive, draft, archived]
 *     responses:
 *       200:
 *         description: Main product updated successfully
 *       404:
 *         description: Product not found
 */
router.put(
  "/main-products/:id",
  [
    param("id").isUUID().withMessage("Invalid product ID"),
    body("name").optional().isLength({ min: 1, max: 255 }),
    body("description").optional().isString(),
    body("category").optional().notEmpty(),
    body("brand").optional().isString(),
    body("basePrice").optional().isFloat({ min: 0 }),
    body("status").optional().isIn(["active", "inactive", "draft", "archived"]),
  ],
  auth,
  productController.updateMainProduct
);

/**
 * @swagger
 * /api/products/main-products/{id}:
 *   delete:
 *     summary: Delete a main product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Main product deleted successfully
 *       404:
 *         description: Product not found
 */
router.delete(
  "/main-products/:id",
  [param("id").isUUID().withMessage("Invalid product ID")],
  auth,
  productController.deleteMainProduct
);

/**
 * @swagger
 * /api/products/bulk/mark-as-main:
 *   post:
 *     summary: Bulk mark products as main products
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productIds
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *     responses:
 *       200:
 *         description: Products marked as main products successfully
 *       400:
 *         description: Validation error
 */
router.post(
  "/bulk/mark-as-main",
  [
    body("productIds")
      .isArray({ min: 1 })
      .withMessage("At least one product ID is required"),
    body("productIds.*").isUUID().withMessage("Invalid product ID format"),
  ],
  auth,
  productController.bulkMarkAsMainProducts
);

// Enhanced Product Management Routes - merged from enhanced-products.js

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
  productController.getMainProducts
);

router.get(
  "/main-products/:id",
  [param("id").isUUID().withMessage("Invalid product ID")],
  productController.getMainProduct
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
  productController.createMainProduct
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
  productController.updateMainProduct
);

router.delete(
  "/main-products/:id",
  [param("id").isUUID().withMessage("Invalid product ID")],
  productController.deleteMainProduct
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
  productController.createPlatformVariant
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
  productController.updatePlatformVariant
);

router.delete(
  "/variants/:variantId",
  [param("variantId").isUUID().withMessage("Invalid variant ID")],
  productController.deletePlatformVariant
);

// Stock Management Routes
router.get(
  "/main-products/:id/stock",
  [param("id").isUUID().withMessage("Invalid product ID")],
  productController.getStockStatus
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
  productController.updateStock
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
  productController.reserveStock
);

router.delete(
  "/stock/reservations/:reservationId",
  [
    param("reservationId").isUUID().withMessage("Invalid reservation ID"),
    body("reason").optional().isString(),
  ],
  productController.releaseReservation
);

router.get(
  "/main-products/:id/stock/history",
  [
    param("id").isUUID().withMessage("Invalid product ID"),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  productController.getStockHistory
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
  productController.publishToPlatforms
);

// Enhanced Media Upload Routes
router.post(
  "/main-products/:mainProductId/media",
  [param("mainProductId").isUUID().withMessage("Invalid main product ID")],
  productController.uploadMainProductMedia
);

router.post(
  "/main-products/:mainProductId/variants/:variantId/media",
  [
    param("mainProductId").isUUID().withMessage("Invalid main product ID"),
    param("variantId").isUUID().withMessage("Invalid variant ID"),
  ],
  productController.uploadVariantMedia
);

router.delete(
  "/media/:mediaId",
  [param("mediaId").isString().withMessage("Invalid media ID")],
  productController.deleteMedia
);

router.put(
  "/media/:mediaId",
  [
    param("mediaId").isString().withMessage("Invalid media ID"),
    body("altText").optional().isString(),
    body("isPrimary").optional().isBoolean(),
    body("sortOrder").optional().isInt({ min: 0 }),
  ],
  productController.updateMediaMetadata
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
  productController.bulkOperation
);

router.post(
  "/bulk/publish-variants",
  [
    body("mainProductIds")
      .isArray()
      .withMessage("Product IDs array is required"),
    body("platforms").isArray().withMessage("Platforms array is required"),
    body("publishingSettings").optional().isObject(),
  ],
  productController.bulkPublishVariants
);

router.post(
  "/bulk/update-prices",
  [
    body("updates").isArray().withMessage("Updates array is required"),
    body("updates.*.variantId").isUUID().withMessage("Invalid variant ID"),
    body("updates.*.price").isFloat({ min: 0 }).withMessage("Invalid price"),
  ],
  productController.bulkUpdatePrices
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
  productController.bulkCreateVariants
);

// Platform Integration Routes
router.post(
  "/scrape-platform",
  [
    body("url").isURL().withMessage("Valid URL is required"),
    body("platform").optional().isString(),
  ],
  productController.scrapePlatformData
);

router.post(
  "/import-from-platform",
  [
    body("platformData").optional().isObject(),
    body("url").optional().isURL(),
    body("fieldMapping").optional().isObject(),
    body("targetPlatform").optional().isString(),
  ],
  productController.importFromPlatform
);

router.post(
  "/scrape-and-import",
  [
    body("url").isURL().withMessage("Valid URL is required"),
    body("platform").optional().isString(),
    body("fieldMapping").optional().isObject(),
  ],
  productController.scrapeAndImportFromPlatform
);

// Field Mapping Routes
router.get(
  "/field-mappings",
  [
    query("sourcePlatform").optional().isString(),
    query("targetPlatform").optional().isString(),
  ],
  productController.getFieldMappings
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
  productController.saveFieldMapping
);

// Enhanced Import Routes
router.post(
  "/import/json",
  [
    body("jsonData").isArray().withMessage("JSON data must be an array"),
    body("fieldMapping").isObject().withMessage("Field mapping is required"),
  ],
  productController.importFromJSON
);

// Mark product as main product
router.post(
  "/mark-as-main/:id",
  [param("id").isUUID().withMessage("Invalid product ID")],
  productController.markAsMainProduct
);

// Platform Sync Routes
/**
 * @swagger
 * /api/products/{id}/sync:
 *   post:
 *     summary: Manually sync product to all connected platforms
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               operation:
 *                 type: string
 *                 enum: [create, update, delete]
 *                 default: update
 *               platforms:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Sync completed successfully
 */
router.post(
  "/:id/sync",
  [
    param("id").isUUID().withMessage("Invalid product ID"),
    body("operation")
      .optional()
      .isIn(["create", "update", "delete"])
      .withMessage("Invalid operation"),
  ],
  auth,
  productController.syncProductToPlatforms
);

/**
 * @swagger
 * /api/products/{id}/sync/status:
 *   get:
 *     summary: Get sync status for a product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Sync status retrieved successfully
 */
router.get(
  "/:id/sync/status",
  [param("id").isUUID().withMessage("Invalid product ID")],
  auth,
  productController.getProductSyncStatus
);

/**
 * @swagger
 * /api/products/{id}/sync/fields:
 *   post:
 *     summary: Sync specific fields to platforms
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fields:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of field names to sync
 *             required:
 *               - fields
 *     responses:
 *       200:
 *         description: Field sync completed successfully
 */
router.post(
  "/:id/sync/fields",
  [
    param("id").isUUID().withMessage("Invalid product ID"),
    body("fields").isArray().withMessage("Fields must be an array"),
    body("fields.*").isString().withMessage("Each field must be a string"),
  ],
  auth,
  productController.syncSpecificFields
);

module.exports = router;
