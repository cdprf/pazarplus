const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware");
const enhancedPlatformService = require("../services/enhanced-platform-service");
const inventoryManagementService = require("../services/inventory-management-service");
const notificationService = require("../services/notification-service");
const logger = require("../utils/logger");

/**
 * Enhanced Platform Integration Routes
 * Provides endpoints for advanced platform synchronization, conflict resolution, and inventory management
 */

// Middleware for all platform routes
router.use(authenticate);

/**
 * @swagger
 * /api/v1/enhanced-platforms/sync:
 *   post:
 *     summary: Trigger enhanced platform synchronization with conflict resolution
 *     tags: [Enhanced Platforms]
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
 *                 description: Specific platforms to sync (optional)
 *               options:
 *                 type: object
 *                 properties:
 *                   forceSync:
 *                     type: boolean
 *                   startDate:
 *                     type: string
 *                     format: date-time
 *                   endDate:
 *                     type: string
 *                     format: date-time
 *     responses:
 *       200:
 *         description: Sync completed successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Sync failed
 */
router.post("/sync", authorize(["admin", "manager"]), async (req, res) => {
  try {
    const { platforms = [], options = {} } = req.body;

    logger.info("Enhanced platform sync triggered by user:", {
      userId: req.user.id,
      platforms,
      options,
    });

    const syncResult =
      await enhancedPlatformService.syncOrdersWithConflictResolution(platforms);

    res.json({
      success: true,
      message: "Platform synchronization completed",
      data: syncResult,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Enhanced platform sync failed:", error);
    res.status(500).json({
      success: false,
      message: "Platform synchronization failed",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/enhanced-platforms/conflicts:
 *   get:
 *     summary: Get pending manual reviews and conflicts
 *     tags: [Enhanced Platforms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending conflicts retrieved successfully
 */
router.get("/conflicts", authorize(["admin", "manager"]), async (req, res) => {
  try {
    const pendingReviews =
      await enhancedPlatformService.getPendingManualReviews();

    res.json({
      success: true,
      data: {
        pendingReviews,
        count: pendingReviews.length,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Failed to get pending conflicts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve conflicts",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/enhanced-platforms/conflicts/{conflictId}/resolve:
 *   post:
 *     summary: Resolve a manual review conflict
 *     tags: [Enhanced Platforms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conflictId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolution:
 *                 type: object
 *                 properties:
 *                   action:
 *                     type: string
 *                     enum: [accept_new, keep_existing, manual_merge]
 *                   notes:
 *                     type: string
 *                   resolvedBy:
 *                     type: string
 *     responses:
 *       200:
 *         description: Conflict resolved successfully
 */
router.post(
  "/conflicts/:conflictId/resolve",
  authorize(["admin", "manager"]),
  async (req, res) => {
    try {
      const { conflictId } = req.params;
      const { resolution } = req.body;

      resolution.resolvedBy = req.user.id;
      resolution.resolvedAt = new Date();

      const result = await enhancedPlatformService.resolveManualReview(
        conflictId,
        resolution
      );

      res.json({
        success: true,
        message: "Conflict resolved successfully",
        data: result,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Failed to resolve conflict:", error);
      res.status(500).json({
        success: false,
        message: "Failed to resolve conflict",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/enhanced-platforms/inventory/{sku}:
 *   get:
 *     summary: Get real-time inventory for a product across all platforms
 *     tags: [Enhanced Platforms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inventory data retrieved successfully
 */
router.get("/inventory/:sku", async (req, res) => {
  try {
    const { sku } = req.params;

    const inventory = await inventoryManagementService.getProductInventory(sku);

    res.json({
      success: true,
      data: inventory,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Failed to get inventory:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve inventory",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/enhanced-platforms/inventory/{sku}/update:
 *   post:
 *     summary: Update inventory across all platforms
 *     tags: [Enhanced Platforms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: number
 *                 minimum: 0
 *               originPlatform:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Inventory updated successfully
 */
router.post(
  "/inventory/:sku/update",
  authorize(["admin", "manager"]),
  async (req, res) => {
    try {
      const { sku } = req.params;
      const { quantity, originPlatform, reason } = req.body;

      if (quantity < 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity cannot be negative",
        });
      }

      const result =
        await inventoryManagementService.updateInventoryAcrossPlatforms(
          sku,
          quantity,
          originPlatform,
          { reason, updatedBy: req.user.id }
        );

      res.json({
        success: true,
        message: "Inventory updated across platforms",
        data: result,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Failed to update inventory:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update inventory",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/enhanced-platforms/inventory/{sku}/reserve:
 *   post:
 *     summary: Reserve stock for an order
 *     tags: [Enhanced Platforms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: number
 *                 minimum: 1
 *               orderNumber:
 *                 type: string
 *               duration:
 *                 type: number
 *                 description: Reservation duration in milliseconds
 *     responses:
 *       200:
 *         description: Stock reserved successfully
 */
router.post("/inventory/:sku/reserve", async (req, res) => {
  try {
    const { sku } = req.params;
    const { quantity, orderNumber, duration } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: "Order number is required",
      });
    }

    const result = await inventoryManagementService.reserveStock(
      sku,
      quantity,
      orderNumber,
      duration
    );

    res.json({
      success: true,
      message: "Stock reserved successfully",
      data: result,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Failed to reserve stock:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reserve stock",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/enhanced-platforms/inventory/reservations/{reservationId}/confirm:
 *   post:
 *     summary: Confirm stock reservation (order fulfilled)
 *     tags: [Enhanced Platforms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reservationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation confirmed successfully
 */
router.post(
  "/inventory/reservations/:reservationId/confirm",
  async (req, res) => {
    try {
      const { reservationId } = req.params;

      const result = await inventoryManagementService.confirmStockReservation(
        reservationId
      );

      res.json({
        success: true,
        message: "Stock reservation confirmed",
        data: result,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Failed to confirm reservation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to confirm reservation",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/enhanced-platforms/inventory/reservations/{reservationId}/release:
 *   post:
 *     summary: Release stock reservation
 *     tags: [Enhanced Platforms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reservationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation released successfully
 */
router.post(
  "/inventory/reservations/:reservationId/release",
  async (req, res) => {
    try {
      const { reservationId } = req.params;

      const result = await inventoryManagementService.releaseStockReservation(
        reservationId
      );

      res.json({
        success: true,
        message: "Stock reservation released",
        data: result,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Failed to release reservation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to release reservation",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/enhanced-platforms/inventory/analytics:
 *   get:
 *     summary: Get inventory analytics and insights
 *     tags: [Enhanced Platforms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: platforms
 *         schema:
 *           type: string
 *           description: Comma-separated platform names
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 */
router.get(
  "/inventory/analytics",
  authorize(["admin", "manager"]),
  async (req, res) => {
    try {
      const { startDate, endDate, platforms } = req.query;

      const options = {};
      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);
      if (platforms) options.platforms = platforms.split(",");

      const analytics = await inventoryManagementService.getInventoryAnalytics(
        options
      );

      res.json({
        success: true,
        data: analytics,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Failed to get inventory analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve analytics",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/enhanced-platforms/inventory/bulk-update:
 *   post:
 *     summary: Bulk update inventory for multiple products
 *     tags: [Enhanced Platforms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     sku:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     originPlatform:
 *                       type: string
 *                     options:
 *                       type: object
 *     responses:
 *       200:
 *         description: Bulk update completed
 */
router.post(
  "/inventory/bulk-update",
  authorize(["admin", "manager"]),
  async (req, res) => {
    try {
      const { updates } = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Updates array is required and cannot be empty",
        });
      }

      // Add user context to options
      const updatesWithUser = updates.map((update) => ({
        ...update,
        options: {
          ...update.options,
          updatedBy: req.user.id,
        },
      }));

      const results = await inventoryManagementService.bulkUpdateInventory(
        updatesWithUser
      );

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      res.json({
        success: true,
        message: `Bulk update completed: ${successCount} successful, ${failureCount} failed`,
        data: {
          results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: failureCount,
          },
        },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Failed to perform bulk inventory update:", error);
      res.status(500).json({
        success: false,
        message: "Failed to perform bulk update",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/enhanced-platforms/inventory/reservations:
 *   get:
 *     summary: Get all active stock reservations
 *     tags: [Enhanced Platforms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reservations retrieved successfully
 */
router.get(
  "/inventory/reservations",
  authorize(["admin", "manager"]),
  async (req, res) => {
    try {
      const reservations = inventoryManagementService.getAllReservations();

      res.json({
        success: true,
        data: {
          reservations,
          count: reservations.length,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Failed to get reservations:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve reservations",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/enhanced-platforms/inventory/status:
 *   get:
 *     summary: Get inventory management system status
 *     tags: [Enhanced Platforms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 */
router.get(
  "/inventory/status",
  authorize(["admin", "manager"]),
  async (req, res) => {
    try {
      const status = inventoryManagementService.getInventoryStatus();

      res.json({
        success: true,
        data: status,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Failed to get inventory status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve status",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/enhanced-platforms/notifications/stats:
 *   get:
 *     summary: Get WebSocket connection statistics
 *     tags: [Enhanced Platforms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get(
  "/notifications/stats",
  authorize(["admin", "manager"]),
  async (req, res) => {
    try {
      const stats = notificationService.getConnectionStats();

      res.json({
        success: true,
        data: stats,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Failed to get notification stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve notification statistics",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/enhanced-platforms/notifications/recent:
 *   get:
 *     summary: Get recent notifications
 *     tags: [Enhanced Platforms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *     responses:
 *       200:
 *         description: Recent notifications retrieved successfully
 */
router.get("/notifications/recent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const notifications = await notificationService.getRecentNotifications(
      limit
    );

    res.json({
      success: true,
      data: {
        notifications,
        count: notifications.length,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Failed to get recent notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve notifications",
      error: error.message,
    });
  }
});

// Error handling middleware for this router
router.use((error, req, res, next) => {
  logger.error("Enhanced platform route error:", {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  res.status(500).json({
    success: false,
    message: "Internal server error in enhanced platform service",
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message,
  });
});

module.exports = router;
