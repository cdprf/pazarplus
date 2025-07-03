const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const platformProductController = require("../controllers/platform-product-controller");
const { auth } = require("../middleware/auth");

// Development middleware that adds a fallback user if none exists
const devAuth = (req, res, next) => {
  if (req.user) {
    // User already authenticated, continue
    return next();
  }

  // Add development user for testing
  req.user = {
    id: "38d86fd2-bf87-4271-b49d-f1a7645ee4ef",
    email: "dev@example.com",
  };

  next();
};

// Use auth for production, devAuth as fallback
router.use(process.env.NODE_ENV === "production" ? auth : devAuth);

/**
 * @swagger
 * /api/platform-products/{platformId}/products:
 *   post:
 *     summary: Create a single product on a specific platform
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platformId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [trendyol, hepsiburada, n11]
 *         description: Platform identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productData:
 *                 type: object
 *                 description: Product data specific to the platform
 *     responses:
 *       200:
 *         description: Product created successfully
 *       400:
 *         description: Bad request or validation error
 *       500:
 *         description: Internal server error
 */
router.post(
  "/:platformId/products",
  [
    param("platformId")
      .isIn(["trendyol", "hepsiburada", "n11"])
      .withMessage("Platform must be one of: trendyol, hepsiburada, n11"),
    body("productData")
      .isObject()
      .withMessage("Product data must be an object"),
  ],
  platformProductController.createProduct.bind(platformProductController)
);

/**
 * @swagger
 * /api/platform-products/{platformId}/products/bulk:
 *   post:
 *     summary: Create multiple products on a specific platform
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platformId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [trendyol, hepsiburada, n11]
 *         description: Platform identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productsData:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Array of product data
 *     responses:
 *       200:
 *         description: Products created successfully
 *       400:
 *         description: Bad request or validation error
 *       500:
 *         description: Internal server error
 */
router.post(
  "/:platformId/products/bulk",
  [
    param("platformId")
      .isIn(["trendyol", "hepsiburada", "n11"])
      .withMessage("Platform must be one of: trendyol, hepsiburada, n11"),
    body("productsData")
      .isArray({ min: 1 })
      .withMessage("Products data must be a non-empty array"),
  ],
  platformProductController.createProductsBulk.bind(platformProductController)
);

/**
 * @swagger
 * /api/platform-products/{platformId}/products/{productId}:
 *   put:
 *     summary: Update a product on a specific platform
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platformId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [trendyol, hepsiburada, n11]
 *         description: Platform identifier
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID or SKU
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updateData:
 *                 type: object
 *                 description: Product update data
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Bad request or validation error
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:platformId/products/:productId",
  [
    param("platformId")
      .isIn(["trendyol", "hepsiburada", "n11"])
      .withMessage("Platform must be one of: trendyol, hepsiburada, n11"),
    param("productId").notEmpty().withMessage("Product ID is required"),
    body("updateData").isObject().withMessage("Update data must be an object"),
  ],
  platformProductController.updateProduct.bind(platformProductController)
);

/**
 * @swagger
 * /api/platform-products/{platformId}/batch/{batchId}:
 *   get:
 *     summary: Get batch request result (Trendyol only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platformId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [trendyol]
 *         description: Platform identifier (only trendyol supported)
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch request ID
 *     responses:
 *       200:
 *         description: Batch result retrieved successfully
 *       400:
 *         description: Bad request or unsupported platform
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:platformId/batch/:batchId",
  [
    param("platformId")
      .equals("trendyol")
      .withMessage("Batch request tracking is only supported for Trendyol"),
    param("batchId").notEmpty().withMessage("Batch ID is required"),
  ],
  platformProductController.getBatchRequestResult.bind(
    platformProductController
  )
);

/**
 * @swagger
 * /api/platform-products/{platformId}/products/{productId}/status:
 *   get:
 *     summary: Get product status from a specific platform
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platformId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [trendyol, hepsiburada, n11]
 *         description: Platform identifier
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID or SKU
 *     responses:
 *       200:
 *         description: Product status retrieved successfully
 *       400:
 *         description: Bad request or feature not supported
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:platformId/products/:productId/status",
  [
    param("platformId")
      .isIn(["trendyol", "hepsiburada", "n11"])
      .withMessage("Platform must be one of: trendyol, hepsiburada, n11"),
    param("productId").notEmpty().withMessage("Product ID is required"),
  ],
  platformProductController.getProductStatus.bind(platformProductController)
);

/**
 * @swagger
 * /api/platform-products/{platformId}/validate:
 *   post:
 *     summary: Validate product data for a specific platform
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platformId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [trendyol, hepsiburada, n11]
 *         description: Platform identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productData:
 *                 type: object
 *                 description: Product data to validate
 *     responses:
 *       200:
 *         description: Validation completed
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post(
  "/:platformId/validate",
  [
    param("platformId")
      .isIn(["trendyol", "hepsiburada", "n11"])
      .withMessage("Platform must be one of: trendyol, hepsiburada, n11"),
    body("productData")
      .isObject()
      .withMessage("Product data must be an object"),
  ],
  platformProductController.validateProductData.bind(platformProductController)
);

/**
 * @swagger
 * /api/platform-products/templates/{platformId}:
 *   get:
 *     summary: Get product data template for a specific platform
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platformId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [trendyol, hepsiburada, n11]
 *         description: Platform identifier
 *     responses:
 *       200:
 *         description: Product template retrieved successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get(
  "/templates/:platformId",
  [
    param("platformId")
      .isIn(["trendyol", "hepsiburada", "n11"])
      .withMessage("Platform must be one of: trendyol, hepsiburada, n11"),
  ],
  async (req, res) => {
    try {
      const { platformId } = req.params;

      // Product data templates for each platform
      const templates = {
        trendyol: {
          barcode: "string (40 chars max) - Required",
          title: "string (100 chars max) - Required",
          productMainId: "string (40 chars max) - Required for variants",
          brandId: "integer - Required (from Trendyol Brand API)",
          categoryId: "integer - Required (from Trendyol Category API)",
          quantity: "integer - Required (stock amount)",
          stockCode: "string (100 chars max) - Required (unique internal SKU)",
          dimensionalWeight: "number - Required (desi amount)",
          description: "string (30000 chars max) - Required (HTML allowed)",
          currencyType: "string - Required ('TRY')",
          listPrice: "number - Required (original price)",
          salePrice: "number - Required (selling price)",
          vatRate: "integer - Required (0,1,10,18,20)",
          cargoCompanyId: "integer - Required (from Trendyol Cargo API)",
          deliveryDuration: "integer - Optional (shipping duration)",
          deliveryOption: {
            deliveryDuration: "integer",
            fastDeliveryType: "string - SAME_DAY_SHIPPING|FAST_DELIVERY",
          },
          images: [
            {
              url: "string - Required (HTTPS, 1200x1800, 96dpi, max 8 images)",
            },
          ],
          attributes: [
            {
              attributeId: "integer - Required",
              attributeValueId: "integer - Required (OR customAttributeValue)",
              customAttributeValue:
                "string - Optional alternative to attributeValueId",
            },
          ],
          shipmentAddressId: "integer - Optional (warehouse address)",
          returningAddressId: "integer - Optional (return address)",
        },
        hepsiburada: {
          merchantSku: "string (100 chars max) - Required",
          barcode: "string (50 chars max) - Required",
          title: "string (200 chars max) - Required",
          brand: "string (100 chars max) - Required",
          categoryId: "string|number - Required",
          description: "string (5000 chars max) - Required",
          price: "number - Required (selling price)",
          tax: "integer - Required (0,1,8,18,20)",
          stock: "integer - Required (stock quantity)",
          images: ["string - Required (image URLs)"],
          attributes: "object - Optional (category-specific)",
          variantGroupId: "string - Optional (for variants)",
          weight: "number - Optional (product weight)",
          guaranteeMonths: "integer - Optional (warranty period)",
          status: "string - Optional (product status)",
        },
        n11: {
          productName: "string (150 chars max) - Required",
          category: {
            id: "integer - Required",
            categoryId: "integer - Alternative to id",
          },
          price: "number - Required (selling price)",
          stockItems: {
            stockItem: {
              quantity: "integer - Required (stock amount)",
              sellerStockCode: "string - Required (internal SKU)",
              attributes: "object - Optional",
            },
          },
          images: ["string - Required (HTTP/HTTPS URLs)"],
          description: "string (5000 chars max) - Required",
          shipmentTemplate: "string - Optional (default: 'default')",
          preparingDay: "integer - Optional (1-30 days, default: 1)",
          discount: "object - Optional",
          currencyType: "string - Optional (default: 'TL')",
          approvalStatus: "boolean - Optional (default: false)",
          brand: "string - Optional",
          mpn: "string - Optional (manufacturer part number)",
          gtin: "string - Optional (global trade item number)",
          vendorCode: "string - Optional",
        },
      };

      const template = templates[platformId];
      if (!template) {
        return res.status(400).json({
          success: false,
          message: `Template not available for platform: ${platformId}`,
        });
      }

      res.json({
        success: true,
        message: `Product template for ${platformId}`,
        platform: platformId,
        template: template,
        documentation: {
          trendyol:
            "https://developers.trendyol.com/docs/marketplace/urun-entegrasyonu/urun-aktarma-v2",
          hepsiburada:
            "Contact Hepsiburada Partner Support for MPOP API documentation",
          n11: "Contact N11 Technical Support for complete API documentation",
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error while getting template",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/platform-products/{platformId}/categories:
 *   get:
 *     summary: Get platform categories
 *     parameters:
 *       - in: path
 *         name: platformId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [trendyol, hepsiburada, n11]
 *       - in: query
 *         name: connectionId
 *         schema:
 *           type: integer
 *         description: Platform connection ID
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get(
  "/:platformId/categories",
  [
    param("platformId")
      .isIn(["trendyol", "hepsiburada", "n11"])
      .withMessage("Platform must be one of: trendyol, hepsiburada, n11"),
  ],
  platformProductController.getCategories.bind(platformProductController)
);

/**
 * @swagger
 * /api/platform-products/{platformId}/categories/{categoryId}/attributes:
 *   get:
 *     summary: Get category attributes
 *     parameters:
 *       - in: path
 *         name: platformId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [trendyol, hepsiburada, n11]
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: connectionId
 *         schema:
 *           type: integer
 *         description: Platform connection ID
 *     responses:
 *       200:
 *         description: Category attributes retrieved successfully
 */
router.get(
  "/:platformId/categories/:categoryId/attributes",
  [
    param("platformId")
      .isIn(["trendyol", "hepsiburada", "n11"])
      .withMessage("Platform must be one of: trendyol, hepsiburada, n11"),
    param("categoryId").notEmpty().withMessage("Category ID is required"),
  ],
  platformProductController.getCategoryAttributes.bind(
    platformProductController
  )
);

/**
 * @swagger
 * /api/platform-products/{platformId}/fields:
 *   get:
 *     summary: Get platform-specific product fields
 *     parameters:
 *       - in: path
 *         name: platformId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [trendyol, hepsiburada, n11]
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Category ID for category-specific fields
 *       - in: query
 *         name: connectionId
 *         schema:
 *           type: integer
 *         description: Platform connection ID
 *     responses:
 *       200:
 *         description: Product fields retrieved successfully
 */
router.get(
  "/:platformId/fields",
  [
    param("platformId")
      .isIn(["trendyol", "hepsiburada", "n11"])
      .withMessage("Platform must be one of: trendyol, hepsiburada, n11"),
  ],
  platformProductController.getProductFields.bind(platformProductController)
);

/**
 * @swagger
 * /api/platform-products/{platformId}/categories/sync:
 *   post:
 *     summary: Sync categories for a specific platform
 *     parameters:
 *       - in: path
 *         name: platformId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [trendyol, hepsiburada, n11]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               connectionId:
 *                 type: string
 *                 description: Platform connection ID
 *               forceRefresh:
 *                 type: boolean
 *                 description: Force refresh even if recently synced
 *     responses:
 *       200:
 *         description: Categories synced successfully
 */
router.post(
  "/:platformId/categories/sync",
  [
    param("platformId")
      .isIn(["trendyol", "hepsiburada", "n11"])
      .withMessage("Platform must be one of: trendyol, hepsiburada, n11"),
    body("connectionId").notEmpty().withMessage("Connection ID is required"),
  ],
  platformProductController.syncCategories.bind(platformProductController)
);

/**
 * @swagger
 * /api/platform-products/categories/sync-status:
 *   get:
 *     summary: Get category sync status for all platforms
 *     responses:
 *       200:
 *         description: Sync status retrieved successfully
 */
router.get(
  "/categories/sync-status",
  platformProductController.getCategorySyncStatus.bind(
    platformProductController
  )
);

/**
 * @swagger
 * /api/platform-products/categories/sync-all:
 *   post:
 *     summary: Sync categories for all connected platforms
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               connections:
 *                 type: object
 *                 description: "Platform connections { platform: connectionId }"
 *               forceRefresh:
 *                 type: boolean
 *                 description: Force refresh all platforms
 *     responses:
 *       200:
 *         description: Categories synced for all platforms
 */
router.post(
  "/categories/sync-all",
  [
    body("connections")
      .isObject()
      .withMessage("Connections object is required"),
  ],
  platformProductController.syncAllCategories.bind(platformProductController)
);

/**
 * @swagger
 * /api/platform-products/{platformId}/categories/available:
 *   get:
 *     summary: Get available categories from platform without importing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platformId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [trendyol, hepsiburada, n11]
 *         description: Platform identifier
 *     responses:
 *       200:
 *         description: Available categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Bad request or validation error
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:platformId/categories/available",
  [
    param("platformId")
      .isIn(["trendyol", "hepsiburada", "n11"])
      .withMessage("Platform must be one of: trendyol, hepsiburada, n11"),
  ],
  platformProductController.getAvailableCategories.bind(
    platformProductController
  )
);

/**
 * @swagger
 * /api/platform-products/categories/import:
 *   post:
 *     summary: Import selected categories with field mappings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categories:
 *                 type: array
 *                 items:
 *                   type: object
 *               fieldMappings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Categories imported successfully
 *       400:
 *         description: Bad request or validation error
 *       500:
 *         description: Internal server error
 */
router.post(
  "/categories/import",
  [
    body("categories").isArray().withMessage("Categories array is required"),
    body("fieldMappings")
      .optional()
      .isObject()
      .withMessage("Field mappings must be an object"),
  ],
  platformProductController.importCategories.bind(platformProductController)
);

module.exports = router;
