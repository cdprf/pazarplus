const express = require("express");
const router = express.Router();
const productController = require("../controllers/product-controller");
const auth = require("../middleware/auth");

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
router.delete("/bulk", auth, productController.bulkDelete);

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
router.post("/sync", auth, productController.syncProductsFromPlatforms);

/**
 * @swagger
 * /api/products/import/csv:
 *   post:
 *     summary: Import products from CSV file
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: Products imported successfully
 */
router.post("/import/csv", auth, productController.importProductsFromCSV);

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

module.exports = router;
