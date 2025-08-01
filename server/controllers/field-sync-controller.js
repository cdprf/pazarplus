/**
 * Field-Level Product Sync Controller
 * Provides real-time feedback for individual field updates
 */

const { Product, MainProduct } = require("../models");
const PlatformSyncService = require("../services/platform-sync-service");
const logger = require("../utils/logger");

class FieldSyncController {
  /**
   * Update a specific field and sync to platforms with real-time feedback
   * POST /api/products/:id/sync-field
   */
  static async syncField(req, res) {
    try {
      const { id: productId } = req.params;
      const { field, value, platform, platforms } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      if (!field || value === undefined) {
        return res.status(400).json({
          success: false,
          error: "Field name and value are required",
          details: {
            field: field ? "provided" : "missing",
            value: value !== undefined ? "provided" : "missing",
          },
        });
      }

      logger.info(`Field sync request for product ${productId}`, {
        productId,
        field,
        value,
        platform,
        platforms,
        userId,
      });

      // Find the product in either MainProduct or Product table
      let product = await MainProduct.findOne({
        where: { id: productId, userId },
      });

      let isLegacyProduct = false;
      if (!product) {
        product = await Product.findOne({
          where: { id: productId, userId },
        });
        isLegacyProduct = true;
      }

      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      // Update the field locally
      const oldValue = product[field];
      product[field] = value;
      await product.save();

      logger.info(`Updated product field locally`, {
        productId,
        field,
        oldValue,
        newValue: value,
        isLegacyProduct,
      });

      // Use platform sync service singleton
      const platformSyncService = PlatformSyncService;

      // Create changes object for sync
      const changes = { [field]: value };

      // If specific platform is requested, sync to that platform only
      if (platform) {
        try {
          const result = await platformSyncService.syncToSinglePlatform(
            productId,
            platform,
            changes,
            { userId, operation: "update" }
          );

          // Check if this platform requires polling (like N11)
          const requiresPolling =
            platform.toLowerCase() === "n11" && result.taskId;

          return res.json({
            success: true,
            message: "Field sync initiated",
            syncResult: {
              platforms: [
                {
                  platform: platform.toLowerCase(),
                  status: result.status,
                  requiresPolling,
                  taskId: result.taskId,
                  message: result.message,
                },
              ],
            },
            field,
            value,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          logger.error(`Platform sync failed for ${platform}`, {
            error: error.message,
            productId,
            field,
            value,
          });

          return res.status(500).json({
            success: false,
            error: `Sync to ${platform} failed: ${error.message}`,
            syncResult: {
              platforms: [
                {
                  platform: platform.toLowerCase(),
                  status: "error",
                  error: error.message,
                  requiresPolling: false,
                },
              ],
            },
          });
        }
      }

      // Check if this is a local-only update (no platform sync required)
      const isLocalOnly = !platform && (!platforms || platforms.length === 0);

      if (isLocalOnly) {
        logger.info(`Local-only field update completed`, {
          productId,
          field,
          oldValue,
          newValue: value,
          isLegacyProduct,
        });

        return res.json({
          success: true,
          message: "Field updated locally (no platform sync)",
          syncResult: {
            localUpdate: true,
            platforms: [],
          },
          field,
          value,
          timestamp: new Date().toISOString(),
        });
      }

      // Sync to all connected platforms
      try {
        const result = await platformSyncService.syncProductToAllPlatforms(
          userId,
          product,
          "update",
          changes
        );

        // Check which platforms require polling
        const platformsWithPolling =
          result.syncResults?.filter((r) => r.platform === "n11" && r.taskId) ||
          [];

        return res.json({
          success: true,
          message: "Field sync initiated for all platforms",
          syncResult: result,
          field,
          value,
          timestamp: new Date().toISOString(),
          platformsRequiringPolling: platformsWithPolling,
        });
      } catch (error) {
        logger.error(`Multi-platform sync failed`, {
          error: error.message,
          productId,
          field,
          value,
        });

        return res.status(500).json({
          success: false,
          error: `Multi-platform sync failed: ${error.message}`,
        });
      }
    } catch (error) {
      logger.error("Field sync controller error:", {
        error: error.message,
        stack: error.stack,
      });

      return res.status(500).json({
        success: false,
        error: "Internal server error during field sync",
      });
    }
  }

  /**
   * Get task status for field sync operations (especially for N11 polling)
   * GET /api/products/:id/sync-field/:taskId/status
   */
  static async getTaskStatus(req, res) {
    try {
      const { id: productId, taskId } = req.params;
      const { platform } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      if (!platform) {
        return res.status(400).json({
          success: false,
          error: "Platform parameter is required",
        });
      }

      logger.info(`Task status check for ${platform}`, {
        productId,
        taskId,
        platform,
        userId,
      });

      // For N11 platform, check task status through the service
      if (platform.toLowerCase() === "n11") {
        try {
          const platformSyncService = new PlatformSyncService();
          const n11Service =
            platformSyncService.platformServiceManager.getService("n11");

          if (!n11Service || !n11Service.pollTaskStatus) {
            return res.json({
              success: false,
              error:
                "N11 service not available or does not support task polling",
              completed: true,
              failed: true,
            });
          }

          // Poll the task status
          const taskStatus = await n11Service.pollTaskStatus(taskId);

          logger.info(`N11 task status result`, {
            taskId,
            taskStatus,
            productId,
          });

          return res.json({
            success: true,
            taskId,
            platform,
            completed: taskStatus.completed || false,
            failed: taskStatus.failed || false,
            result: taskStatus.result,
            error: taskStatus.error,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          logger.error(`Failed to check N11 task status`, {
            error: error.message,
            taskId,
            productId,
          });

          return res.json({
            success: false,
            error: error.message,
            completed: true,
            failed: true,
            taskId,
            platform,
          });
        }
      }

      // For other platforms, return completed immediately
      return res.json({
        success: true,
        taskId,
        platform,
        completed: true,
        failed: false,
        message: `${platform} sync completed`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Task status controller error:", {
        error: error.message,
        stack: error.stack,
      });

      return res.status(500).json({
        success: false,
        error: "Internal server error while checking task status",
        completed: true,
        failed: true,
      });
    }
  }
}

module.exports = FieldSyncController;
