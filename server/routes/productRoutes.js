const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const ProductController = require("../controllers/product-controller");
const FieldSyncController = require("../controllers/field-sync-controller");
const { body, param, query } = require("express-validator");
const validationMiddleware = require("../middleware/validation-middleware");

// Apply authentication to all routes
router.use(auth);

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
    param("id").isString().notEmpty().withMessage("Product ID is required"),
    param("taskId").isString().notEmpty().withMessage("Task ID is required"),
    query("platform").isString().notEmpty().withMessage("Platform is required"),
    validationMiddleware,
  ],
  FieldSyncController.getTaskStatus
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
 *         description: Product statistics retrieved successfully
 */
router.get("/stats", ProductController.getProductStats);

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
 *               - price
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               sku:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               barcode:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               price:
 *                 type: number
 *                 minimum: 0
 *               costPrice:
 *                 type: number
 *                 minimum: 0
 *               stockQuantity:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               minStockLevel:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               weight:
 *                 type: number
 *                 minimum: 0
 *               dimensions:
 *                 type: object
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, draft]
 *                 default: active
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: SKU already exists for this user
 */
router.post(
  "/",
  [
    body("name")
      .notEmpty()
      .isLength({ min: 1, max: 255 })
      .withMessage("Name is required and must be 1-255 characters"),
    body("sku")
      .notEmpty()
      .isLength({ min: 1, max: 100 })
      .withMessage("SKU is required and must be 1-100 characters"),
    body("barcode")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Barcode must not exceed 100 characters"),
    body("description").optional().isString(),
    body("category").notEmpty().withMessage("Category is required"),
    body("price")
      .isNumeric()
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
    body("costPrice")
      .optional()
      .isNumeric()
      .isFloat({ min: 0 })
      .withMessage("Cost price must be a positive number"),
    body("stockQuantity")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Stock quantity must be a non-negative integer"),
    body("minStockLevel")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Minimum stock level must be a non-negative integer"),
    body("weight")
      .optional()
      .isNumeric()
      .isFloat({ min: 0 })
      .withMessage("Weight must be a positive number"),
    body("dimensions").optional().isObject(),
    body("images").optional().isArray(),
    body("images.*")
      .optional()
      .isURL()
      .withMessage("Each image must be a valid URL"),
    body("status")
      .optional()
      .isIn(["active", "inactive", "draft"])
      .withMessage("Status must be active, inactive, or draft"),
    body("tags").optional().isArray(),
    body("tags.*").optional().isString(),
    validationMiddleware,
  ],
  ProductController.createProduct
);

/**
 * @swagger
 * /api/products/main-products:
 *   get:
 *     summary: Get all main products with enhanced features
 *     tags: [Products]
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
      .custom((value) => {
        // Allow empty string or valid status values
        if (value === "" || value === null || value === undefined) {
          return true;
        }
        if (["active", "inactive", "draft", "archived"].includes(value)) {
          return true;
        }
        throw new Error(
          "Status must be one of: active, inactive, draft, archived"
        );
      }),
    query("hasVariants").optional().isBoolean(),
    query("sortBy")
      .optional()
      .isIn([
        "name",
        "sku",
        "category",
        "price",
        "stock",
        "createdAt",
        "updatedAt",
      ]),
    query("sortField")
      .optional()
      .isIn([
        "name",
        "sku",
        "category",
        "price",
        "stock",
        "createdAt",
        "updatedAt",
      ]),
    query("sortOrder")
      .optional()
      .custom((value) => {
        // Allow empty string or valid sort order values (case insensitive)
        if (value === "" || value === null || value === undefined) {
          return true;
        }
        if (["ASC", "DESC", "asc", "desc"].includes(value)) {
          return true;
        }
        throw new Error("Sort order must be ASC or DESC");
      }),
    query("stockStatus").optional().isString(),
    query("minPrice")
      .optional()
      .custom((value) => {
        if (value === "" || value === null || value === undefined) {
          return true;
        }
        return !isNaN(parseFloat(value)) && isFinite(value);
      }),
    query("maxPrice")
      .optional()
      .custom((value) => {
        if (value === "" || value === null || value === undefined) {
          return true;
        }
        return !isNaN(parseFloat(value)) && isFinite(value);
      }),
    query("minStock")
      .optional()
      .custom((value) => {
        if (value === "" || value === null || value === undefined) {
          return true;
        }
        return Number.isInteger(Number(value)) && Number(value) >= 0;
      }),
    query("maxStock")
      .optional()
      .custom((value) => {
        if (value === "" || value === null || value === undefined) {
          return true;
        }
        return Number.isInteger(Number(value)) && Number(value) >= 0;
      }),
    query("platform").optional().isString(),
    validationMiddleware,
  ],
  ProductController.getMainProducts
);

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
 *         description: Product retrieved successfully
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
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 */
router.delete(
  "/:id",
  [
    param("id").isUUID().withMessage("Product ID must be a valid UUID"),
    validationMiddleware,
  ],
  ProductController.deleteProduct
);

/**
 * @swagger
 * /api/products/bulk/delete:
 *   post:
 *     summary: Bulk delete products
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
 *               - productIds
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 100
 *     responses:
 *       200:
 *         description: Products deleted successfully
 */
router.post(
  "/bulk/delete",
  [
    body("productIds")
      .isArray({ min: 1, max: 100 })
      .withMessage("Product IDs must be an array with 1-100 items"),
    body("productIds.*")
      .isUUID()
      .withMessage("Each product ID must be a valid UUID"),
    validationMiddleware,
  ],
  ProductController.bulkDeleteProducts
);

/**
 * @swagger
 * /api/products/bulk/status:
 *   put:
 *     summary: Bulk update product status
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
 *               - productIds
 *               - status
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 100
 *               status:
 *                 type: string
 *                 enum: [active, inactive, draft]
 *     responses:
 *       200:
 *         description: Product statuses updated successfully
 */
router.put(
  "/bulk/status",
  [
    body("productIds")
      .isArray({ min: 1, max: 100 })
      .withMessage("Product IDs must be an array with 1-100 items"),
    body("productIds.*")
      .isUUID()
      .withMessage("Each product ID must be a valid UUID"),
    body("status")
      .isIn(["active", "inactive", "draft"])
      .withMessage("Status must be active, inactive, or draft"),
    validationMiddleware,
  ],
  ProductController.bulkUpdateStatus
);

/**
 * @swagger
 * /api/products/bulk/stock:
 *   put:
 *     summary: Bulk update product stock
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
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - stockQuantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     stockQuantity:
 *                       type: integer
 *                       minimum: 0
 *                 minItems: 1
 *                 maxItems: 100
 *     responses:
 *       200:
 *         description: Product stock updated successfully
 */
router.put(
  "/bulk/stock",
  [
    body("updates")
      .isArray({ min: 1, max: 100 })
      .withMessage("Updates must be an array with 1-100 items"),
    body("updates.*.productId")
      .isUUID()
      .withMessage("Each product ID must be a valid UUID"),
    body("updates.*.stockQuantity")
      .isInt({ min: 0 })
      .withMessage("Stock quantity must be a non-negative integer"),
    validationMiddleware,
  ],
  ProductController.bulkUpdateStock
);

/**
 * @swagger
 * /api/products/low-stock:
 *   get:
 *     summary: Get products with low stock
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Stock threshold for low stock alert
 *     responses:
 *       200:
 *         description: Low stock products retrieved successfully
 */
router.get(
  "/low-stock",
  [
    query("threshold")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Threshold must be a non-negative integer"),
    validationMiddleware,
  ],
  ProductController.getLowStockProducts
);

/**
 * @swagger
 * /api/products/{id}/variants:
 *   get:
 *     summary: Get all variants for a product
 *     tags: [Products, Variants]
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
 *         description: Product variants retrieved successfully
 */
router.get(
  "/:id/variants",
  [
    param("id").isUUID().withMessage("Product ID must be a valid UUID"),
    validationMiddleware,
  ],
  ProductController.getProductVariants
);

/**
 * @swagger
 * /api/products/{id}/variants:
 *   post:
 *     summary: Create a new product variant
 *     tags: [Products, Variants]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - sku
 *               - attributes
 *             properties:
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               barcode:
 *                 type: string
 *               attributes:
 *                 type: object
 *               price:
 *                 type: number
 *               costPrice:
 *                 type: number
 *               stockQuantity:
 *                 type: integer
 *               minStockLevel:
 *                 type: integer
 *               weight:
 *                 type: number
 *               dimensions:
 *                 type: object
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, discontinued]
 *     responses:
 *       201:
 *         description: Variant created successfully
 */
router.post(
  "/:id/variants",
  [
    param("id").isUUID().withMessage("Product ID must be a valid UUID"),
    body("name").notEmpty().withMessage("Variant name is required"),
    body("sku").notEmpty().withMessage("Variant SKU is required"),
    body("attributes").isObject().withMessage("Attributes must be an object"),
    body("price").optional().isNumeric().withMessage("Price must be a number"),
    body("costPrice")
      .optional()
      .isNumeric()
      .withMessage("Cost price must be a number"),
    body("stockQuantity")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Stock quantity must be a non-negative integer"),
    body("minStockLevel")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Minimum stock level must be a non-negative integer"),
    body("weight")
      .optional()
      .isNumeric()
      .withMessage("Weight must be a number"),
    body("dimensions").optional().isObject(),
    body("images").optional().isArray(),
    body("status").optional().isIn(["active", "inactive", "discontinued"]),
    validationMiddleware,
  ],
  ProductController.createProductVariant
);

/**
 * @swagger
 * /api/products/{id}/variants/{variantId}:
 *   put:
 *     summary: Update a product variant
 *     tags: [Products, Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Variant updated successfully
 */
router.put(
  "/:id/variants/:variantId",
  [
    param("id").isUUID().withMessage("Product ID must be a valid UUID"),
    param("variantId").isUUID().withMessage("Variant ID must be a valid UUID"),
    validationMiddleware,
  ],
  ProductController.updateProductVariant
);

/**
 * @swagger
 * /api/products/{id}/variants/{variantId}:
 *   delete:
 *     summary: Delete a product variant
 *     tags: [Products, Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Variant deleted successfully
 */
router.delete(
  "/:id/variants/:variantId",
  [
    param("id").isUUID().withMessage("Product ID must be a valid UUID"),
    param("variantId").isUUID().withMessage("Variant ID must be a valid UUID"),
    validationMiddleware,
  ],
  ProductController.deleteProductVariant
);

/**
 * @swagger
 * /api/products/variants/groups:
 *   post:
 *     summary: Create a new variant group
 *     tags: [Products, Variants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupName
 *               - baseProduct
 *               - variants
 *             properties:
 *               groupName:
 *                 type: string
 *                 description: Name for the variant group
 *               baseProduct:
 *                 type: object
 *                 description: The base product for the group
 *               variants:
 *                 type: array
 *                 description: Array of products to be converted to variants
 *               confidence:
 *                 type: number
 *                 description: Confidence score of the grouping suggestion
 *               reason:
 *                 type: string
 *                 description: Reason for the grouping
 *     responses:
 *       201:
 *         description: Variant group created successfully
 */
router.post(
  "/variants/groups",
  [
    body("groupName").notEmpty().withMessage("Group name is required"),
    body("baseProduct").isObject().withMessage("Base product is required"),
    body("variants").isArray().withMessage("Variants must be an array"),
    validationMiddleware,
  ],
  ProductController.createVariantGroup
);

/**
 * @swagger
 * /api/products/variants/groups/{groupId}:
 *   put:
 *     summary: Update a variant group
 *     tags: [Products, Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Variant group ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               groupName:
 *                 type: string
 *               variants:
 *                 type: array
 *     responses:
 *       200:
 *         description: Variant group updated successfully
 */
router.put(
  "/variants/groups/:groupId",
  [
    param("groupId").isUUID().withMessage("Group ID must be a valid UUID"),
    validationMiddleware,
  ],
  ProductController.updateVariantGroup
);

/**
 * @swagger
 * /api/products/variants/groups/{groupId}:
 *   delete:
 *     summary: Delete a variant group
 *     tags: [Products, Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Variant group ID
 *     responses:
 *       200:
 *         description: Variant group deleted successfully
 */
router.delete(
  "/variants/groups/:groupId",
  [
    param("groupId").isUUID().withMessage("Group ID must be a valid UUID"),
    validationMiddleware,
  ],
  ProductController.deleteVariantGroup
);

/**
 * @swagger
 * /api/products/inventory/movements:
 *   get:
 *     summary: Get inventory movement history
 *     tags: [Products, Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: variantId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: movementType
 *         schema:
 *           type: string
 *           enum: [IN_STOCK, PURCHASE, SALE, ADJUSTMENT, RETURN, DAMAGE, TRANSFER, SYNC_UPDATE, RESERVATION, RELEASE]
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
 *         description: Inventory movements retrieved successfully
 */
router.get(
  "/inventory/movements",
  [
    query("productId").optional().isUUID(),
    query("variantId").optional().isUUID(),
    query("movementType")
      .optional()
      .isIn([
        "IN_STOCK",
        "PURCHASE",
        "SALE",
        "ADJUSTMENT",
        "RETURN",
        "DAMAGE",
        "TRANSFER",
        "SYNC_UPDATE",
        "RESERVATION",
        "RELEASE",
      ]),
    query("page").optional().isInt({ min: 0 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    validationMiddleware,
  ],
  ProductController.getInventoryMovements
);

/**
 * @swagger
 * /api/products/inventory/adjust:
 *   post:
 *     summary: Adjust product stock manually
 *     tags: [Products, Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *               - adjustment
 *               - reason
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               variantId:
 *                 type: string
 *                 format: uuid
 *               sku:
 *                 type: string
 *               adjustment:
 *                 type: integer
 *                 description: Positive for increase, negative for decrease
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock adjusted successfully
 */
router.post(
  "/inventory/adjust",
  [
    body("sku").notEmpty().withMessage("SKU is required"),
    body("adjustment").isInt().withMessage("Adjustment must be an integer"),
    body("reason").notEmpty().withMessage("Reason is required"),
    body("productId").optional().isUUID(),
    body("variantId").optional().isUUID(),
    validationMiddleware,
  ],
  ProductController.adjustStock
);

/**
 * @swagger
 * /api/products/inventory/reservations:
 *   get:
 *     summary: Get stock reservations
 *     tags: [Products, Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, confirmed, released, expired]
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: variantId
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Stock reservations retrieved successfully
 */
router.get(
  "/inventory/reservations",
  [
    query("status")
      .optional()
      .isIn(["active", "confirmed", "released", "expired"]),
    query("productId").optional().isUUID(),
    query("variantId").optional().isUUID(),
    query("page").optional().isInt({ min: 0 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    validationMiddleware,
  ],
  ProductController.getStockReservations
);

/**
 * @swagger
 * /api/products/inventory/reservations:
 *   post:
 *     summary: Reserve stock for an order
 *     tags: [Products, Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *               - quantity
 *               - orderNumber
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               variantId:
 *                 type: string
 *                 format: uuid
 *               sku:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               orderNumber:
 *                 type: string
 *               orderId:
 *                 type: string
 *                 format: uuid
 *               platformType:
 *                 type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Stock reserved successfully
 */
router.post(
  "/inventory/reservations",
  [
    body("sku").notEmpty().withMessage("SKU is required"),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be a positive integer"),
    body("orderNumber").notEmpty().withMessage("Order number is required"),
    body("productId").optional().isUUID(),
    body("variantId").optional().isUUID(),
    body("orderId").optional().isUUID(),
    body("platformType").optional().isString(),
    body("expiresAt").optional().isISO8601(),
    body("reason").optional().isString(),
    validationMiddleware,
  ],
  ProductController.reserveStock
);

/**
 * @swagger
 * /api/products/inventory/reservations/{reservationId}/release:
 *   post:
 *     summary: Release a stock reservation
 *     tags: [Products, Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reservationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Stock reservation released successfully
 */
router.post(
  "/inventory/reservations/:reservationId/release",
  [
    param("reservationId")
      .isUUID()
      .withMessage("Reservation ID must be a valid UUID"),
    validationMiddleware,
  ],
  ProductController.releaseStockReservation
);

/**
 * @swagger
 * /api/products/inventory/reservations/{reservationId}/confirm:
 *   post:
 *     summary: Confirm a stock reservation (convert to sale)
 *     tags: [Products, Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reservationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Stock reservation confirmed successfully
 */
router.post(
  "/inventory/reservations/:reservationId/confirm",
  [
    param("reservationId")
      .isUUID()
      .withMessage("Reservation ID must be a valid UUID"),
    validationMiddleware,
  ],
  ProductController.confirmStockReservation
);

module.exports = router;
