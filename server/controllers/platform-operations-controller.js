const logger = require("../utils/logger");
const { PlatformConnection, BackgroundTask, Order } = require("../models");
const PlatformServiceFactory = require("../modules/order-management/services/platforms/platformServiceFactory");
const { Op, literal } = require("sequelize");
const cron = require("node-cron");

/**
 * Platform Operations Controller
 * Handles background tasks for order fetching and platform operations
 */
class PlatformOperationsController {
  constructor() {
    this.activeTasks = new Map(); // Track active background tasks
    this.schedules = new Map(); // Track scheduled tasks
  }

  /**
   * Get all background tasks
   */
  async getTasks(req, res) {
    try {
      const { id: userId } = req.user;
      const { status, platform, limit = 50, offset = 0 } = req.query;

      const whereClause = { userId };
      if (status) whereClause.status = status;
      if (platform) whereClause.platform = platform;

      const tasks = await BackgroundTask.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: PlatformConnection,
            as: "platformConnection",
            attributes: ["id", "name", "platformType", "isActive"],
          },
        ],
      });

      res.json({
        success: true,
        data: {
          tasks: tasks.rows,
          total: tasks.count,
          activeTasks: Array.from(this.activeTasks.keys()),
        },
      });
    } catch (error) {
      logger.error("Error getting background tasks:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get background tasks",
        error: error.message,
      });
    }
  }

  /**
   * Start background order fetching task
   */
  async startOrderFetching(req, res) {
    try {
      const { id: userId } = req.user;
      const {
        platformConnectionId,
        mode = "auto", // 'auto' or 'duration'
        duration = 30, // days for duration mode
        stopAtFirst = true, // stop when reaching first orders on platform
      } = req.body;

      // Validate platform connection
      const connection = await PlatformConnection.findOne({
        where: { id: platformConnectionId, userId, isActive: true },
      });

      if (!connection) {
        return res.status(404).json({
          success: false,
          message: "Platform connection not found or inactive",
        });
      }

      // Check if task is already running for this connection
      const existingTask = await BackgroundTask.findOne({
        where: {
          userId,
          platformConnectionId,
          status: "running",
          taskType: "order_fetching",
        },
      });

      if (existingTask) {
        return res.status(400).json({
          success: false,
          message: "Order fetching task is already running for this platform",
        });
      }

      // Create background task record
      const task = await BackgroundTask.create({
        userId,
        platformConnectionId,
        taskType: "order_fetching",
        status: "running",
        config: {
          mode,
          duration,
          stopAtFirst,
          startDate: new Date(),
        },
        progress: {
          currentMonth: 0,
          totalMonths: mode === "auto" ? "unknown" : Math.ceil(duration / 30),
          ordersProcessed: 0,
          errors: [],
        },
      });

      // Start the background task
      this.executeOrderFetchingTask(task.id, connection);

      res.json({
        success: true,
        message: "Background order fetching task started",
        data: { taskId: task.id },
      });
    } catch (error) {
      logger.error("Error starting background order fetching:", error);
      res.status(500).json({
        success: false,
        message: "Failed to start background order fetching",
        error: error.message,
      });
    }
  }

  /**
   * Stop background task
   */
  async stopTask(req, res) {
    try {
      const { taskId } = req.params;
      const { id: userId } = req.user;

      const task = await BackgroundTask.findOne({
        where: { id: taskId, userId },
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Update task status
      await task.update({
        status: "stopped",
        stoppedAt: new Date(),
      });

      // Stop the active task
      if (this.activeTasks.has(taskId)) {
        const taskController = this.activeTasks.get(taskId);
        taskController.stop = true;
        this.activeTasks.delete(taskId);
      }

      // Clear schedule if exists
      if (this.schedules.has(taskId)) {
        this.schedules.get(taskId).destroy();
        this.schedules.delete(taskId);
      }

      res.json({
        success: true,
        message: "Background task stopped",
      });
    } catch (error) {
      logger.error("Error stopping background task:", error);
      res.status(500).json({
        success: false,
        message: "Failed to stop background task",
        error: error.message,
      });
    }
  }

  /**
   * Get platform connections for user
   */
  async getPlatformConnections(req, res) {
    try {
      const { id: userId } = req.user;

      const connections = await PlatformConnection.findAll({
        where: { userId, isActive: true },
        attributes: ["id", "name", "platformType", "isActive", "createdAt"],
      });

      res.json({
        success: true,
        data: connections,
      });
    } catch (error) {
      logger.error("Error getting platform connections:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get platform connections",
        error: error.message,
      });
    }
  }

  /**
   * Get order fetching statistics
   */
  async getOrderStats(req, res) {
    try {
      const { id: userId } = req.user;
      const { platformConnectionId } = req.query;

      const whereClause = { userId };
      if (platformConnectionId)
        whereClause.platformConnectionId = platformConnectionId;

      // Get oldest and newest orders
      const orderStats = await Order.findAll({
        where: whereClause,
        attributes: [
          [literal("MIN(orderDate)"), "oldestOrder"],
          [literal("MAX(orderDate)"), "newestOrder"],
          [literal("COUNT(*)"), "totalOrders"],
        ],
        include: [
          {
            model: PlatformConnection,
            as: "platformConnection",
            attributes: ["platformType"],
          },
        ],
        group: ["platformConnection.platformType"],
        raw: true,
      });

      res.json({
        success: true,
        data: orderStats,
      });
    } catch (error) {
      logger.error("Error getting order statistics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get order statistics",
        error: error.message,
      });
    }
  }

  /**
   * Execute order fetching task
   */
  async executeOrderFetchingTask(taskId, connection) {
    const taskController = { stop: false };
    this.activeTasks.set(taskId, taskController);

    try {
      const task = await BackgroundTask.findByPk(taskId);
      if (!task) {
        logger.error(`Task ${taskId} not found`);
        return;
      }

      logger.info(
        `Starting order fetching task for ${connection.platformType}`,
        {
          taskId,
          connectionId: connection.id,
        }
      );

      const platformService = PlatformServiceFactory.createService(
        connection.platformType,
        connection.id
      );

      await platformService.initialize();

      const config = task.config;
      let currentDate = new Date();
      let monthsProcessed = 0;
      let totalOrdersProcessed = 0;
      let hasReachedFirstOrders = false;

      while (!taskController.stop && !hasReachedFirstOrders) {
        // Calculate date range for current month
        const endDate = new Date(currentDate);
        const startDate = new Date(currentDate);
        startDate.setMonth(startDate.getMonth() - 1);

        logger.info(
          `Fetching orders for month: ${startDate.toISOString()} to ${endDate.toISOString()}`
        );

        try {
          // Fetch orders for this month
          const result = await platformService.fetchOrders({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            limit: 100,
          });

          if (result.success && result.data && result.data.length > 0) {
            // Normalize and save orders
            const normalizedResult = await platformService.normalizeOrders(
              result.data
            );

            if (normalizedResult.success) {
              totalOrdersProcessed += normalizedResult.data.length;

              // Update progress
              await task.update({
                progress: {
                  ...task.progress,
                  currentMonth: monthsProcessed + 1,
                  ordersProcessed: totalOrdersProcessed,
                  lastProcessedDate: startDate.toISOString(),
                },
                updatedAt: new Date(),
              });

              logger.info(
                `Processed ${normalizedResult.data.length} orders for month ${
                  monthsProcessed + 1
                }`
              );
            }
          } else {
            // No orders found for this month
            if (config.stopAtFirst && monthsProcessed > 0) {
              hasReachedFirstOrders = true;
              logger.info(`Reached first orders on platform, stopping task`);
              break;
            }
          }

          monthsProcessed++;

          // Check if we should stop based on mode
          if (config.mode === "duration") {
            const maxMonths = Math.ceil(config.duration / 30);
            if (monthsProcessed >= maxMonths) {
              break;
            }
          }

          // Move to previous month
          currentDate.setMonth(currentDate.getMonth() - 1);

          // Add delay between requests to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (monthError) {
          logger.error(
            `Error processing month ${monthsProcessed + 1}:`,
            monthError
          );

          // Update error in progress
          const updatedProgress = { ...task.progress };
          updatedProgress.errors.push({
            month: monthsProcessed + 1,
            date: startDate.toISOString(),
            error: monthError.message,
            timestamp: new Date(),
          });

          await task.update({
            progress: updatedProgress,
          });
        }
      }

      // Mark task as completed
      await task.update({
        status: taskController.stop ? "stopped" : "completed",
        completedAt: new Date(),
        progress: {
          ...task.progress,
          totalMonths: monthsProcessed,
          ordersProcessed: totalOrdersProcessed,
        },
      });

      logger.info(`Order fetching task completed`, {
        taskId,
        monthsProcessed,
        totalOrdersProcessed,
      });
    } catch (error) {
      logger.error(`Error in order fetching task ${taskId}:`, error);

      // Mark task as failed
      await BackgroundTask.update(
        {
          status: "failed",
          error: error.message,
          completedAt: new Date(),
        },
        { where: { id: taskId } }
      );
    } finally {
      this.activeTasks.delete(taskId);
    }
  }
}

module.exports = new PlatformOperationsController();
