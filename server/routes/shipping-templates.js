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
router.get("/default", shippingTemplatesController.getDefaultTemplate);

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
router.post(
  "/default",
  body("templateId").optional().isString(),
  shippingTemplatesController.setDefaultTemplate
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
  shippingTemplatesController.generateShippingSlip
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
router.get("/", shippingTemplatesController.getTemplates);

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
  shippingTemplatesController.getTemplate
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
  shippingTemplatesController.saveTemplate
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
  shippingTemplatesController.deleteTemplate
);

module.exports = router;
