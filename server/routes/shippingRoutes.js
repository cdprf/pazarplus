/**
 * DEPRECATED: Main Shipping Routes
 *
 * This file has been deprecated in favor of the unified shipping API
 * located at: /modules/order-management/routes/shippingRoutes.js
 *
 * The new unified API provides both order-specific shipping operations
 * and modern carrier integration features.
 *
 * TODO: Remove this file after ensuring all references have been updated
 */

const express = require("express");
const router = express.Router();
const shippingController = require("../controllers/shipping-controller");
const { auth } = require("../middleware/auth");

// Apply authentication middleware
router.use(auth);

/**
 * @swagger
 * /api/shipping/carriers:
 *   get:
 *     summary: Get all supported shipping carriers
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Carriers retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/carriers", shippingController.getSupportedCarriers);

/**
 * @swagger
 * /api/shipping/carriers/{carrier}/services:
 *   get:
 *     summary: Get services for a specific carrier
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: carrier
 *         required: true
 *         schema:
 *           type: string
 *         description: Carrier code
 *     responses:
 *       200:
 *         description: Services retrieved successfully
 *       400:
 *         description: Invalid carrier
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/carriers/:carrier/services",
  shippingController.getCarrierServices
);

/**
 * @swagger
 * /api/shipping/rates:
 *   post:
 *     summary: Get shipping rates from carriers
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - packageInfo
 *               - fromAddress
 *               - toAddress
 *             properties:
 *               packageInfo:
 *                 type: object
 *               fromAddress:
 *                 type: object
 *               toAddress:
 *                 type: object
 *               carriers:
 *                 type: array
 *     responses:
 *       200:
 *         description: Rates calculated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/rates", shippingController.getShippingRates);

/**
 * @swagger
 * /api/shipping/labels:
 *   post:
 *     summary: Create shipping label
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipmentData
 *               - carrier
 *             properties:
 *               shipmentData:
 *                 type: object
 *               carrier:
 *                 type: string
 *     responses:
 *       200:
 *         description: Label created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/labels", shippingController.createShippingLabel);

/**
 * @swagger
 * /api/shipping/track/{carrier}/{trackingNumber}:
 *   get:
 *     summary: Track a package
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: carrier
 *         required: true
 *         schema:
 *           type: string
 *         description: Carrier code
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Tracking number
 *     responses:
 *       200:
 *         description: Tracking info retrieved successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/track/:carrier/:trackingNumber", shippingController.trackPackage);

/**
 * @swagger
 * /api/shipping/shipments:
 *   get:
 *     summary: Get all shipments with filtering
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for shipments
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by shipment status
 *       - in: query
 *         name: carrier
 *         schema:
 *           type: string
 *         description: Filter by carrier
 *     responses:
 *       200:
 *         description: Shipments retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/shipments", shippingController.getShipments);

/**
 * @swagger
 * /api/shipping/shipments:
 *   post:
 *     summary: Create a new shipment
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderIds
 *               - carrier
 *             properties:
 *               orderIds:
 *                 type: array
 *               carrier:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shipment created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/shipments", shippingController.createShipment);

module.exports = router;
