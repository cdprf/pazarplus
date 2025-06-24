const express = require("express");
const router = express.Router();
const shippingTemplatesController = require("../controllers/shipping-templates-controller");
const { auth } = require("../middleware/auth");
const { body, param } = require("express-validator");

// Apply authentication middleware
router.use(auth);

/**
 * @swagger
 * /api/shipping/templates/default:
 *   get:
 *     summary: Get default shipping template settings
 *     tags: [Shipping Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default template settings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/default", (req, res) =>
  shippingTemplatesController.getDefaultTemplate(req, res)
);

/**
 * @swagger
 * /api/shipping/templates/default:
 *   post:
 *     summary: Set default shipping template
 *     tags: [Shipping Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               templateId:
 *                 type: string
 *                 description: Template ID to set as default (null to clear)
 *     responses:
 *       200:
 *         description: Default template set successfully
 *       404:
 *         description: Template not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/default", body("templateId").optional().isString(), (req, res) =>
  shippingTemplatesController.setDefaultTemplate(req, res)
);

/**
 * @swagger
 * /api/shipping/templates/generate-slip:
 *   post:
 *     summary: Generate shipping slip for an order using template
 *     tags: [Shipping Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *               templateId:
 *                 type: string
 *                 description: Template ID (uses default if not specified)
 *     responses:
 *       200:
 *         description: Shipping slip generated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Order or template not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  "/generate-slip",
  body("orderId").isInt().withMessage("Order ID must be an integer"),
  body("templateId").optional().isString(),
  (req, res) => shippingTemplatesController.generatePDF(req, res)
);

/**
 * @swagger
 * /api/shipping/templates/generate-pdf:
 *   post:
 *     summary: Generate PDF using template and order data
 *     tags: [Shipping Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *               templateId:
 *                 type: string
 *                 description: Template ID (uses default if not specified)
 *     responses:
 *       200:
 *         description: PDF generated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Order or template not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  "/generate-pdf",
  body("orderId").notEmpty().withMessage("Order ID is required"),
  body("templateId").optional().isString(),
  (req, res) => {
    return shippingTemplatesController.generatePDF(req, res);
  }
);

/**
 * @swagger
 * /api/shipping/templates:
 *   get:
 *     summary: Get all shipping templates for the authenticated user
 *     tags: [Shipping Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", (req, res) =>
  shippingTemplatesController.getTemplates(req, res)
);

/**
 * @swagger
 * /api/shipping/templates/{id}:
 *   get:
 *     summary: Get a specific shipping template by ID
 *     tags: [Shipping Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template retrieved successfully
 *       404:
 *         description: Template not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/:id",
  param("id").notEmpty().withMessage("Template ID is required"),
  (req, res) => shippingTemplatesController.getTemplate(req, res)
);

/**
 * @swagger
 * /api/shipping/templates:
 *   post:
 *     summary: Create or update a shipping template
 *     tags: [Shipping Templates]
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
 *             properties:
 *               id:
 *                 type: string
 *                 description: Template ID (auto-generated if not provided)
 *               name:
 *                 type: string
 *                 description: Template name
 *               description:
 *                 type: string
 *                 description: Template description
 *               elements:
 *                 type: array
 *                 description: Template elements
 *               config:
 *                 type: object
 *                 description: Template configuration
 *               paperSize:
 *                 type: string
 *                 description: Paper size (A4, A5, etc.)
 *               orientation:
 *                 type: string
 *                 description: Paper orientation (portrait, landscape)
 *     responses:
 *       200:
 *         description: Template saved successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  body("name").notEmpty().withMessage("Template name is required"),
  body("elements")
    .optional()
    .isArray()
    .withMessage("Elements must be an array"),
  body("config").optional().isObject().withMessage("Config must be an object"),
  (req, res) => shippingTemplatesController.saveTemplate(req, res)
);

/**
 * @swagger
 * /api/shipping/templates/{id}:
 *   put:
 *     summary: Update a shipping template
 *     tags: [Shipping Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Template name
 *               description:
 *                 type: string
 *                 description: Template description
 *               elements:
 *                 type: array
 *                 description: Template elements
 *               config:
 *                 type: object
 *                 description: Template configuration
 *     responses:
 *       200:
 *         description: Template updated successfully
 *       404:
 *         description: Template not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  param("id").notEmpty().withMessage("Template ID is required"),
  body("name")
    .optional()
    .notEmpty()
    .withMessage("Template name cannot be empty"),
  body("elements")
    .optional()
    .isArray()
    .withMessage("Elements must be an array"),
  body("config").optional().isObject().withMessage("Config must be an object"),
  (req, res) => {
    // For PUT requests, add the ID from params to the body
    req.body.id = req.params.id;
    shippingTemplatesController.saveTemplate(req, res);
  }
);

/**
 * @swagger
 * /api/shipping/templates/{id}:
 *   delete:
 *     summary: Delete a shipping template
 *     tags: [Shipping Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *       404:
 *         description: Template not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id",
  param("id").notEmpty().withMessage("Template ID is required"),
  (req, res) => shippingTemplatesController.deleteTemplate(req, res)
);

/**
 * @swagger
 * /api/shipping/templates/link-order:
 *   post:
 *     summary: Link an order to a shipping template
 *     tags: [Shipping Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - templateId
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Order ID to link
 *               templateId:
 *                 type: string
 *                 description: Template ID to link to the order
 *               autoMap:
 *                 type: boolean
 *                 description: Whether to automatically map order data to template
 *     responses:
 *       200:
 *         description: Order linked to template successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Order or template not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  "/link-order",
  body("orderId").notEmpty().withMessage("Order ID is required"),
  body("templateId").notEmpty().withMessage("Template ID is required"),
  body("autoMap").optional().isBoolean(),
  (req, res) => shippingTemplatesController.linkOrderTemplate(req, res)
);

module.exports = router;
