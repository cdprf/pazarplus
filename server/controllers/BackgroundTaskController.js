const BackgroundTaskService = require("../services/BackgroundTaskService");
const logger = require("../utils/logger");
const { validationResult } = require("express-validator");

class BackgroundTaskController {
  /**
   * Get tasks with pagination and filtering
   * GET /api/background-tasks
   */
  static async getTasks(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        taskType,
        priority,
        platformConnectionId,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
        dateFrom,
        dateTo,
      } = req.query;

      // Filter by user if not admin
      const userId = req.user.role === "admin" ? null : req.user.id;

      const result = await BackgroundTaskService.getTasks({
        page: parseInt(page),
        limit: parseInt(limit),
        userId,
        status,
        taskType,
        priority,
        platformConnectionId,
        search,
        sortBy,
        sortOrder,
        dateFrom,
        dateTo,
      });

      res.json({
        success: true,
        data: result.tasks,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error("Error fetching background tasks:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch background tasks",
        error: error.message,
      });
    }
  }

  /**
   * Get task by ID
   * GET /api/background-tasks/:id
   */
  static async getTaskById(req, res) {
    try {
      const { id } = req.params;
      const { includeChildren = false } = req.query;

      const task = await BackgroundTaskService.getTaskById(id, {
        includeUser: true,
        includePlatform: true,
        includeChildren: includeChildren === "true",
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Check if user has access to this task
      if (req.user.role !== "admin" && task.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      logger.error("Error fetching background task:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch background task",
        error: error.message,
      });
    }
  }

  /**
   * Create new background task
   * POST /api/background-tasks
   */
  static async createTask(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const {
        taskType,
        priority = "normal",
        config = {},
        scheduledFor,
        platformConnectionId,
        maxRetries = 3,
        parentTaskId,
        dependsOnTaskIds = [],
        metadata = {},
      } = req.body;

      const task = await BackgroundTaskService.createTask({
        userId: req.user.id,
        taskType,
        priority,
        config,
        scheduledFor,
        platformConnectionId,
        maxRetries,
        parentTaskId,
        dependsOnTaskIds,
        metadata,
      });

      res.status(201).json({
        success: true,
        message: "Background task created successfully",
        data: task,
      });
    } catch (error) {
      logger.error("Error creating background task:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create background task",
        error: error.message,
      });
    }
  }

  /**
   * Update task progress
   * PATCH /api/background-tasks/:id/progress
   */
  static async updateProgress(req, res) {
    try {
      const { id } = req.params;
      const { current, total, message = "", phase = "" } = req.body;

      // Validate input
      if (typeof current !== "number" || typeof total !== "number") {
        return res.status(400).json({
          success: false,
          message: "Current and total must be numbers",
        });
      }

      const task = await BackgroundTaskService.updateProgress(
        id,
        current,
        total,
        message,
        phase
      );

      res.json({
        success: true,
        message: "Task progress updated",
        data: {
          id: task.id,
          progress: task.progress,
        },
      });
    } catch (error) {
      logger.error("Error updating task progress:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update task progress",
        error: error.message,
      });
    }
  }

  /**
   * Add log entry to task
   * POST /api/background-tasks/:id/logs
   */
  static async addLog(req, res) {
    try {
      const { id } = req.params;
      const { level, message, data = null } = req.body;

      // Validate input
      const validLevels = ["info", "warn", "error", "debug"];
      if (!validLevels.includes(level)) {
        return res.status(400).json({
          success: false,
          message: "Invalid log level",
        });
      }

      const task = await BackgroundTaskService.addLog(id, level, message, data);

      res.json({
        success: true,
        message: "Log entry added",
        data: {
          id: task.id,
          logs: task.logs,
        },
      });
    } catch (error) {
      logger.error("Error adding task log:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add task log",
        error: error.message,
      });
    }
  }

  /**
   * Start task execution
   * POST /api/background-tasks/:id/start
   */
  static async startTask(req, res) {
    try {
      const { id } = req.params;

      const task = await BackgroundTaskService.startTask(id);

      res.json({
        success: true,
        message: "Task started successfully",
        data: task,
      });
    } catch (error) {
      logger.error("Error starting task:", error);
      res.status(500).json({
        success: false,
        message: "Failed to start task",
        error: error.message,
      });
    }
  }

  /**
   * Complete task
   * POST /api/background-tasks/:id/complete
   */
  static async completeTask(req, res) {
    try {
      const { id } = req.params;
      const { result = null } = req.body;

      const task = await BackgroundTaskService.completeTask(id, result);

      res.json({
        success: true,
        message: "Task completed successfully",
        data: task,
      });
    } catch (error) {
      logger.error("Error completing task:", error);
      res.status(500).json({
        success: false,
        message: "Failed to complete task",
        error: error.message,
      });
    }
  }

  /**
   * Fail task
   * POST /api/background-tasks/:id/fail
   */
  static async failTask(req, res) {
    try {
      const { id } = req.params;
      const { error: errorMessage } = req.body;

      const task = await BackgroundTaskService.failTask(id, errorMessage);

      res.json({
        success: true,
        message: "Task marked as failed",
        data: task,
      });
    } catch (error) {
      logger.error("Error failing task:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark task as failed",
        error: error.message,
      });
    }
  }

  /**
   * Cancel task
   * POST /api/background-tasks/:id/cancel
   */
  static async cancelTask(req, res) {
    try {
      const { id } = req.params;
      const { reason = "" } = req.body;

      const task = await BackgroundTaskService.cancelTask(id, reason);

      res.json({
        success: true,
        message: "Task cancelled successfully",
        data: task,
      });
    } catch (error) {
      logger.error("Error cancelling task:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cancel task",
        error: error.message,
      });
    }
  }

  /**
   * Retry failed task
   * POST /api/background-tasks/:id/retry
   */
  static async retryTask(req, res) {
    try {
      const { id } = req.params;

      const task = await BackgroundTaskService.retryTask(id);

      res.json({
        success: true,
        message: "Task retry initiated",
        data: task,
      });
    } catch (error) {
      logger.error("Error retrying task:", error);

      // Provide more specific error responses
      if (error.message === "Task not found") {
        return res.status(404).json({
          success: false,
          message: "Task not found",
          error: error.message,
        });
      }

      if (error.message === "Task cannot be retried") {
        return res.status(400).json({
          success: false,
          message:
            "Task cannot be retried. The task may have already completed successfully or exceeded maximum retry attempts.",
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to retry task",
        error: error.message,
      });
    }
  }

  /**
   * Pause running task
   * POST /api/background-tasks/:id/pause
   */
  static async pauseTask(req, res) {
    try {
      const { id } = req.params;

      const task = await BackgroundTaskService.pauseTask(id);

      res.json({
        success: true,
        message: "Task paused successfully",
        data: task,
      });
    } catch (error) {
      logger.error("Error pausing task:", error);
      res.status(500).json({
        success: false,
        message: "Failed to pause task",
        error: error.message,
      });
    }
  }

  /**
   * Resume paused task
   * POST /api/background-tasks/:id/resume
   */
  static async resumeTask(req, res) {
    try {
      const { id } = req.params;

      const task = await BackgroundTaskService.resumeTask(id);

      res.json({
        success: true,
        message: "Task resumed successfully",
        data: task,
      });
    } catch (error) {
      logger.error("Error resuming task:", error);
      res.status(500).json({
        success: false,
        message: "Failed to resume task",
        error: error.message,
      });
    }
  }

  /**
   * Get task statistics with enhanced metrics
   * GET /api/background-tasks/stats
   */
  static async getStats(req, res) {
    console.log("🔍 BackgroundTaskController.getStats called");
    console.log(
      "User:",
      req.user ? `${req.user.id} (${req.user.email})` : "No user"
    );

    try {
      // Check if user is authenticated
      if (!req.user) {
        console.log("❌ No user authenticated for stats");
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      console.log("✅ User authenticated for stats, proceeding...");

      const { timeframe = "24h" } = req.query;

      // Filter by user if not admin
      const userId = req.user.role === "admin" ? null : req.user.id;

      // Get basic task stats
      const stats = await BackgroundTaskService.getTaskStats(userId, timeframe);

      // Get enhanced TaskQueueManager metrics (admin only or if user has running tasks)
      let queueMetrics = null;
      if (req.user.role === "admin") {
        const { taskQueueManager } = require("../services/TaskQueueManager");
        queueMetrics = taskQueueManager.getMetrics();

        // Add queue status
        queueMetrics.status = taskQueueManager.getStatus();
      }

      const response = {
        success: true,
        data: {
          ...stats,
          queueMetrics,
          timestamp: new Date().toISOString(),
          timeframe,
        },
      };

      res.json(response);
    } catch (error) {
      logger.error("Error fetching task stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch task statistics",
        error: error.message,
      });
    }
  }

  /**
   * Get queued tasks (admin only)
   * GET /api/background-tasks/queue
   */
  static async getQueue(req, res) {
    try {
      // Admin only
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin access required",
        });
      }

      const {
        limit = 50,
        taskType,
        priority,
        platformConnectionId,
      } = req.query;

      const tasks = await BackgroundTaskService.getQueuedTasks({
        limit: parseInt(limit),
        taskType,
        priority,
        platformConnectionId,
      });

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      logger.error("Error fetching queued tasks:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch queued tasks",
        error: error.message,
      });
    }
  }

  /**
   * Bulk operations on tasks
   * POST /api/background-tasks/bulk
   */
  static async bulkOperation(req, res) {
    try {
      // Admin only
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin access required",
        });
      }

      const { taskIds, operation, options = {} } = req.body;

      // Validate input
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Task IDs array is required",
        });
      }

      const validOperations = ["cancel", "retry", "delete"];
      if (!validOperations.includes(operation)) {
        return res.status(400).json({
          success: false,
          message: "Invalid operation",
        });
      }

      const results = await BackgroundTaskService.bulkOperation(
        taskIds,
        operation,
        options
      );

      res.json({
        success: true,
        message: `Bulk ${operation} operation completed`,
        data: results,
      });
    } catch (error) {
      logger.error("Error performing bulk operation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to perform bulk operation",
        error: error.message,
      });
    }
  }

  /**
   * Clean up old tasks (admin only)
   * DELETE /api/background-tasks/cleanup
   */
  static async cleanupTasks(req, res) {
    try {
      // Admin only
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin access required",
        });
      }

      const { daysOld = 30 } = req.query;

      const deletedCount = await BackgroundTaskService.cleanupOldTasks(
        parseInt(daysOld)
      );

      res.json({
        success: true,
        message: "Cleanup completed",
        data: {
          deletedCount,
          daysOld: parseInt(daysOld),
        },
      });
    } catch (error) {
      logger.error("Error cleaning up tasks:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cleanup tasks",
        error: error.message,
      });
    }
  }

  /**
   * Handle task timeouts (admin only)
   * POST /api/background-tasks/handle-timeouts
   */
  static async handleTimeouts(req, res) {
    try {
      // Admin only
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin access required",
        });
      }

      const timeoutTasks = await BackgroundTaskService.handleTimeouts();

      res.json({
        success: true,
        message: "Timeout handling completed",
        data: {
          handledCount: timeoutTasks.length,
          tasks: timeoutTasks,
        },
      });
    } catch (error) {
      logger.error("Error handling timeouts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to handle timeouts",
        error: error.message,
      });
    }
  }

  /**
   * Delete task (admin only)
   * DELETE /api/background-tasks/:id
   */
  static async deleteTask(req, res) {
    try {
      // Admin only
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin access required",
        });
      }

      const { id } = req.params;

      const result = await BackgroundTaskService.bulkOperation([id], "delete");

      if (result.failed.length > 0) {
        return res.status(400).json({
          success: false,
          message: result.failed[0].error,
        });
      }

      res.json({
        success: true,
        message: "Task deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting task:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete task",
        error: error.message,
      });
    }
  }
}

module.exports = BackgroundTaskController;
