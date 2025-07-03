const { DataTypes, Op } = require("sequelize");

module.exports = (sequelize) => {
  const BackgroundTask = sequelize.define(
    "BackgroundTask",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        validate: {
          notEmpty: {
            msg: "User ID is required",
          },
          isUUID: {
            args: 4,
            msg: "User ID must be a valid UUID",
          },
        },
      },
      platformConnectionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "platform_connections",
          key: "id",
        },
        validate: {
          isInt: {
            msg: "Platform connection ID must be an integer",
          },
        },
      },
      taskType: {
        type: DataTypes.ENUM(
          "order_fetching",
          "product_sync",
          "inventory_sync",
          "bulk_operation",
          "analytics_update",
          "customer_sync",
          "shipping_label_generation",
          "report_generation",
          "data_export",
          "data_import"
        ),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Task type is required",
          },
        },
      },
      priority: {
        type: DataTypes.ENUM("low", "normal", "high", "urgent"),
        defaultValue: "normal",
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "queued",
          "running",
          "paused",
          "completed",
          "failed",
          "cancelled",
          "timeout"
        ),
        defaultValue: "pending",
        allowNull: false,
      },
      config: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Task configuration parameters",
        validate: {
          isValidConfig(value) {
            if (value && typeof value !== "object") {
              throw new Error("Config must be a valid JSON object");
            }
          },
        },
      },
      progress: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Task progress information (current/total, percentage, etc.)",
        defaultValue: {
          current: 0,
          total: 0,
          percentage: 0,
          phase: "initializing",
          message: "",
        },
      },
      result: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Task execution results and statistics",
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Error message and stack trace if task failed",
      },
      logs: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Task execution logs and events",
        defaultValue: [],
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Additional task metadata (platform info, batch info, etc.)",
      },
      estimatedDuration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Estimated task duration in seconds",
      },
      actualDuration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Actual task duration in seconds",
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      pausedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      scheduledFor: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When the task is scheduled to run",
        validate: {
          isDate: {
            msg: "Scheduled time must be a valid date",
          },
        },
      },
      timeoutAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When the task should timeout",
      },
      retryCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      maxRetries: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
        allowNull: false,
        validate: {
          min: 0,
          max: 10,
        },
      },
      parentTaskId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "background_tasks",
          key: "id",
        },
        comment: "Reference to parent task for subtasks",
      },
      dependsOnTaskIds: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Array of task IDs this task depends on",
        defaultValue: [],
      },
    },
    {
      tableName: "background_tasks",
      timestamps: true,
      paranoid: true, // Soft delete support
      indexes: [
        {
          fields: ["userId"],
          name: "background_tasks_user_id_idx",
        },
        {
          fields: ["status"],
          name: "background_tasks_status_idx",
        },
        {
          fields: ["taskType"],
          name: "background_tasks_task_type_idx",
        },
        {
          fields: ["priority"],
          name: "background_tasks_priority_idx",
        },
        {
          fields: ["platformConnectionId"],
          name: "background_tasks_platform_connection_idx",
        },
        {
          fields: ["createdAt"],
          name: "background_tasks_created_at_idx",
        },
        {
          fields: ["scheduledFor"],
          name: "background_tasks_scheduled_for_idx",
        },
        {
          fields: ["parentTaskId"],
          name: "background_tasks_parent_task_idx",
        },
        {
          fields: ["status", "priority", "createdAt"],
          name: "background_tasks_queue_idx",
        },
        {
          fields: ["userId", "taskType", "status"],
          name: "background_tasks_user_type_status_idx",
        },
      ],
      hooks: {
        beforeCreate: (task) => {
          try {
            // Set timeout if not specified
            if (!task.timeoutAt && task.taskType) {
              const timeoutMinutes = getDefaultTimeout(task.taskType);
              task.timeoutAt = new Date(
                Date.now() + timeoutMinutes * 60 * 1000
              );
            }

            // Initialize logs array
            if (!task.logs) {
              task.logs = [];
            }

            // Add detailed creation log
            task.logs.push({
              timestamp: new Date(),
              level: "info",
              message: `Task created: ${task.taskType}`,
              phase: "created",
              data: {
                taskType: task.taskType,
                priority: task.priority,
                userId: task.userId,
                platformConnectionId: task.platformConnectionId,
                config: task.config,
                maxRetries: task.maxRetries,
                timeoutAt: task.timeoutAt,
              },
            });

            console.log(
              `[BACKGROUND_TASK] Task created - ID: ${
                task.id || "pending"
              }, Type: ${task.taskType}, User: ${task.userId}`
            );
          } catch (error) {
            console.warn(
              "BackgroundTask beforeCreate hook error:",
              error.message
            );
          }
        },
        afterCreate: (task) => {
          try {
            console.log(
              `[BACKGROUND_TASK] Task saved to database - ID: ${task.id}, Status: ${task.status}`
            );
            if (!task.logs) task.logs = [];
            task.logs.push({
              timestamp: new Date(),
              level: "info",
              message: "Task created and saved to database",
              phase: "persisted",
              data: {
                taskId: task.id,
                status: task.status,
                createdAt: task.createdAt,
              },
            });
            // Don't call save() here to avoid infinite loop
          } catch (error) {
            console.warn(
              "BackgroundTask afterCreate hook error:",
              error.message
            );
          }
        },
        beforeUpdate: (task) => {
          try {
            // Update duration when task completes
            if (
              task.status === "completed" &&
              task.startedAt &&
              !task.actualDuration
            ) {
              task.actualDuration = Math.floor(
                (new Date() - new Date(task.startedAt)) / 1000
              );
            }

            // Set completion timestamp
            if (task.status === "completed" && !task.completedAt) {
              task.completedAt = new Date();
            }

            // Set cancellation timestamp
            if (task.status === "cancelled" && !task.cancelledAt) {
              task.cancelledAt = new Date();
            }

            // Add detailed status change log
            if (task.changed && task.changed("status")) {
              const previousStatus = task._previousDataValues?.status;
              if (!task.logs) task.logs = [];

              task.logs.push({
                timestamp: new Date(),
                level: "info",
                message: `Status changed from '${previousStatus}' to '${task.status}'`,
                phase: task.status,
                data: {
                  previousStatus,
                  newStatus: task.status,
                  taskId: task.id,
                  taskType: task.taskType,
                  retryCount: task.retryCount,
                  duration: task.actualDuration,
                },
              });

              console.log(
                `[BACKGROUND_TASK] Status change - ID: ${task.id}, ${previousStatus} -> ${task.status}`
              );
            }

            // Log progress updates
            if (task.changed && task.changed("progress")) {
              const progress = task.progress;
              if (progress && typeof progress === "object") {
                if (!task.logs) task.logs = [];
                task.logs.push({
                  timestamp: new Date(),
                  level: "debug",
                  message: `Progress updated: ${progress.percentage}% (${progress.current}/${progress.total}) - ${progress.message}`,
                  phase: progress.phase || task.status,
                  data: progress,
                });
              }
            }

            // Log error details
            if (task.changed && task.changed("error") && task.error) {
              if (!task.logs) task.logs = [];
              task.logs.push({
                timestamp: new Date(),
                level: "error",
                message: `Task error: ${task.error}`,
                phase: "error",
                data: {
                  error: task.error,
                  taskId: task.id,
                  taskType: task.taskType,
                  retryCount: task.retryCount,
                },
              });

              console.error(
                `[BACKGROUND_TASK] Task error - ID: ${task.id}, Error: ${task.error}`
              );
            }
          } catch (error) {
            console.warn(
              "BackgroundTask beforeUpdate hook error:",
              error.message
            );
          }
        },
        afterUpdate: (task) => {
          try {
            // Log completed tasks with detailed results
            if (task.status === "completed" && task.result) {
              console.log(
                `[BACKGROUND_TASK] Task completed - ID: ${task.id}, Duration: ${task.actualDuration}s`
              );
            }

            // Log failed tasks
            if (task.status === "failed") {
              console.error(
                `[BACKGROUND_TASK] Task failed - ID: ${task.id}, Error: ${task.error}`
              );
            }

            // Log cancelled tasks
            if (task.status === "cancelled") {
              console.log(`[BACKGROUND_TASK] Task cancelled - ID: ${task.id}`);
            }
          } catch (error) {
            console.warn(
              "BackgroundTask afterUpdate hook error:",
              error.message
            );
          }
        },
      },
      scopes: {
        active: {
          where: {
            status: {
              [Op.notIn]: ["completed", "failed", "cancelled"],
            },
          },
        },
        pending: {
          where: {
            status: "pending",
          },
        },
        running: {
          where: {
            status: "running",
          },
        },
        failed: {
          where: {
            status: "failed",
          },
        },
        completed: {
          where: {
            status: "completed",
          },
        },
        byPriority: (priority) => ({
          where: {
            priority,
          },
        }),
        byType: (taskType) => ({
          where: {
            taskType,
          },
        }),
        byUser: (userId) => ({
          where: {
            userId,
          },
        }),
        scheduled: {
          where: {
            scheduledFor: {
              [Op.lte]: new Date(),
            },
            status: "pending",
          },
        },
        overdue: {
          where: {
            timeoutAt: {
              [Op.lt]: new Date(),
            },
            status: {
              [Op.in]: ["running", "queued"],
            },
          },
        },
      },
    }
  );

  // Helper function for default timeouts
  function getDefaultTimeout(taskType) {
    const timeouts = {
      order_fetching: 30, // 30 minutes
      product_sync: 60, // 1 hour
      inventory_sync: 45, // 45 minutes
      bulk_operation: 120, // 2 hours
      analytics_update: 30, // 30 minutes
      customer_sync: 20, // 20 minutes
      shipping_label_generation: 10, // 10 minutes
      report_generation: 60, // 1 hour
      data_export: 90, // 1.5 hours
      data_import: 120, // 2 hours
    };
    return timeouts[taskType] || 60; // Default 1 hour
  }

  // Instance methods
  BackgroundTask.prototype.updateProgress = function (
    current,
    total,
    message = "",
    phase = ""
  ) {
    const percentage = total > 0 ? Math.floor((current / total) * 100) : 0;
    this.progress = {
      current,
      total,
      percentage,
      phase: phase || this.progress?.phase || "processing",
      message,
      updatedAt: new Date(),
    };

    // Log progress updates to console for immediate visibility
    console.log(
      `[BACKGROUND_TASK:${this.id}] Progress: ${percentage}% (${current}/${total}) - ${message}`
    );

    return this.save();
  };

  BackgroundTask.prototype.addLog = async function (
    level,
    message,
    data = null
  ) {
    try {
      // Initialize logs array if not exists
      if (!this.logs) this.logs = [];

      // Validate log level
      const validLevels = ["info", "error", "warn", "debug"];
      const logLevel = validLevels.includes(level) ? level : "info";

      // Create log entry with consistent structure
      const logEntry = {
        timestamp: new Date(),
        level: logLevel,
        message: message || "Log entry (no message)",
        data: data || null,
        phase: this.progress?.phase || this.status,
        taskId: this.id,
        taskType: this.taskType,
      };

      // Add to logs array
      this.logs.push(logEntry);

      // Implement log rotation to prevent memory issues
      const MAX_LOGS = parseInt(process.env.MAX_TASK_LOGS || "500", 10);
      if (this.logs.length > MAX_LOGS) {
        // Keep important logs (errors and warnings) and recent logs
        const importantLogs = this.logs
          .filter((log) => log.level === "error" || log.level === "warn")
          .slice(-100); // Keep last 100 important logs

        const recentLogs = this.logs.slice(-200); // Keep last 200 logs overall

        // Combine and deduplicate
        const logsToKeep = new Map();
        [...importantLogs, ...recentLogs].forEach((log) => {
          const key = `${log.timestamp.getTime()}_${
            log.level
          }_${log.message.substring(0, 50)}`;
          logsToKeep.set(key, log);
        });

        this.logs = Array.from(logsToKeep.values()).sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );

        // Add a log rotation notice
        if (this.logs.length < MAX_LOGS * 0.8) {
          this.logs.push({
            timestamp: new Date(),
            level: "info",
            message: `Log rotation performed - kept ${this.logs.length} important/recent entries`,
            data: {
              rotatedAt: new Date(),
              keptLogs: this.logs.length,
              maxLogs: MAX_LOGS,
            },
            phase: this.progress?.phase || this.status,
            taskId: this.id,
            taskType: this.taskType,
          });
        }
      }

      // Also log to console for immediate visibility with better formatting
      const consoleLogLevel =
        logLevel === "error"
          ? "error"
          : logLevel === "warn"
          ? "warn"
          : logLevel === "debug"
          ? "debug"
          : "log";

      const contextInfo = data
        ? ` | Context: ${JSON.stringify(data).substring(0, 100)}`
        : "";
      console[consoleLogLevel](
        `[TASK:${this.id}] [${
          this.taskType
        }] [${logLevel.toUpperCase()}] ${message}${contextInfo}`
      );

      // Use a more robust save approach that retries on failure
      try {
        await this.save();
      } catch (saveError) {
        console.warn(
          `BackgroundTask save error on addLog: ${saveError.message}`
        );
        // Try one more time after a short delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        await this.save();
      }

      return this;
    } catch (error) {
      console.warn("BackgroundTask addLog error:", error.message, error.stack);
      // Don't swallow errors completely - return the instance but don't hide the error
      return this;
    }
  };

  BackgroundTask.prototype.markAsStarted = function () {
    this.status = "running";
    this.startedAt = new Date();

    // Add log entry for task start
    if (!this.logs) this.logs = [];
    this.logs.push({
      timestamp: new Date(),
      level: "info",
      message: "Task execution started",
      phase: "running",
      data: {
        startedAt: this.startedAt,
        taskId: this.id,
        taskType: this.taskType,
      },
    });

    console.log(`[BACKGROUND_TASK:${this.id}] Task execution started`);
    return this.save();
  };

  BackgroundTask.prototype.markAsCompleted = function (result = null) {
    this.status = "completed";
    this.completedAt = new Date();
    if (result) this.result = result;
    if (this.startedAt) {
      this.actualDuration = Math.floor(
        (new Date() - new Date(this.startedAt)) / 1000
      );
    }
    return this.save();
  };

  BackgroundTask.prototype.markAsFailed = function (error) {
    this.status = "failed";
    this.error =
      typeof error === "string" ? error : error.message || "Unknown error";
    if (this.startedAt && !this.actualDuration) {
      this.actualDuration = Math.floor(
        (new Date() - new Date(this.startedAt)) / 1000
      );
    }
    return this.save();
  };

  BackgroundTask.prototype.markAsCancelled = function (reason = "") {
    try {
      this.status = "cancelled";
      this.cancelledAt = new Date();
      if (reason) {
        this.addLog("info", `Task cancelled: ${reason}`);
      }
      return this.save();
    } catch (error) {
      console.warn("BackgroundTask markAsCancelled error:", error.message);
      return Promise.resolve(this);
    }
  };

  BackgroundTask.prototype.canRetry = function () {
    return (
      this.retryCount < this.maxRetries &&
      ["failed", "timeout", "cancelled"].includes(this.status)
    );
  };

  BackgroundTask.prototype.retry = function () {
    try {
      if (!this.canRetry()) {
        throw new Error("Task cannot be retried");
      }
      this.retryCount += 1;
      this.status = "pending";
      this.error = null;
      this.startedAt = null;
      this.completedAt = null;
      this.addLog(
        "info",
        `Retrying task (attempt ${this.retryCount}/${this.maxRetries})`
      );
      return this.save();
    } catch (error) {
      console.warn("BackgroundTask retry error:", error.message);
      return Promise.reject(error);
    }
  };

  BackgroundTask.prototype.pause = function () {
    if (this.status !== "running") {
      throw new Error("Only running tasks can be paused");
    }
    this.status = "paused";
    this.pausedAt = new Date();
    return this.save();
  };

  BackgroundTask.prototype.resume = function () {
    if (this.status !== "paused") {
      throw new Error("Only paused tasks can be resumed");
    }
    this.status = "running";
    this.pausedAt = null;
    return this.save();
  };

  BackgroundTask.prototype.isExpired = function () {
    return this.timeoutAt && new Date() > new Date(this.timeoutAt);
  };

  BackgroundTask.prototype.getRemainingTime = function () {
    if (!this.timeoutAt) return null;
    const remaining = new Date(this.timeoutAt) - new Date();
    return Math.max(0, Math.floor(remaining / 1000)); // seconds
  };

  BackgroundTask.prototype.getFormattedDuration = function () {
    const duration = this.actualDuration || 0;
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Class methods
  BackgroundTask.getQueuedTasks = function (options = {}) {
    const { limit = 10, taskType, priority, platformConnectionId } = options;

    const where = {
      status: "pending",
      [Op.or]: [
        { scheduledFor: null },
        { scheduledFor: { [Op.lte]: new Date() } },
      ],
    };

    if (taskType) where.taskType = taskType;
    if (priority) where.priority = priority;
    if (platformConnectionId) where.platformConnectionId = platformConnectionId;

    return this.findAll({
      where,
      order: [
        ["priority", "DESC"], // urgent, high, normal, low
        ["createdAt", "ASC"], // FIFO within same priority
      ],
      limit,
      // Note: Associations will be handled by the service layer to avoid circular dependencies
    });
  };

  BackgroundTask.getTaskStats = function (userId = null, timeframe = "24h") {
    const timeframes = {
      "1h": 1,
      "24h": 24,
      "7d": 24 * 7,
      "30d": 24 * 30,
    };

    const hours = timeframes[timeframe] || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const where = {
      createdAt: { [Op.gte]: since },
    };

    if (userId) where.userId = userId;

    return this.findAll({
      where,
      attributes: [
        "status",
        "taskType",
        [sequelize.fn("COUNT", "*"), "count"],
        [sequelize.fn("AVG", sequelize.col("actualDuration")), "avgDuration"],
      ],
      group: ["status", "taskType"],
      raw: true,
    });
  };

  BackgroundTask.cleanupOldTasks = function (daysOld = 30) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    return this.destroy({
      where: {
        status: { [Op.in]: ["completed", "failed", "cancelled"] },
        updatedAt: { [Op.lt]: cutoffDate },
      },
      force: true, // Hard delete
    });
  };

  return BackgroundTask;
};
