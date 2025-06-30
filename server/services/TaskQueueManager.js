const EventEmitter = require("events");
const BackgroundTaskService = require("../services/BackgroundTaskService");
const logger = require("../utils/logger");

class TaskQueueManager extends EventEmitter {
  constructor() {
    super();
    this.isProcessing = false;
    this.maxConcurrentTasks = process.env.MAX_CONCURRENT_TASKS || 5;
    this.runningTasks = new Map();
    this.processingInterval = null;
    this.timeoutCheckInterval = null;
    this.retryInterval = process.env.TASK_RETRY_INTERVAL || 30000; // 30 seconds
    this.timeoutCheckInterval = process.env.TIMEOUT_CHECK_INTERVAL || 60000; // 1 minute
  }

  /**
   * Start the task queue manager
   */
  start() {
    if (this.isProcessing) {
      logger.warn("Task queue manager is already running");
      return;
    }

    this.isProcessing = true;
    logger.info("Starting task queue manager...");

    // Start processing queue
    this.processingInterval = setInterval(() => {
      this.processQueue().catch((error) => {
        logger.error("Error in task queue processing:", error);
      });
    }, this.retryInterval);

    // Start timeout checker
    this.timeoutCheckInterval = setInterval(() => {
      this.checkTimeouts().catch((error) => {
        logger.error("Error checking timeouts:", error);
      });
    }, this.timeoutCheckInterval);

    // Process immediately
    this.processQueue().catch((error) => {
      logger.error("Error in initial queue processing:", error);
    });

    logger.info(
      `Task queue manager started with max ${this.maxConcurrentTasks} concurrent tasks`
    );
  }

  /**
   * Stop the task queue manager
   */
  stop() {
    if (!this.isProcessing) {
      logger.warn("Task queue manager is not running");
      return;
    }

    this.isProcessing = false;
    logger.info("Stopping task queue manager...");

    // Clear intervals
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.timeoutCheckInterval) {
      clearInterval(this.timeoutCheckInterval);
      this.timeoutCheckInterval = null;
    }

    // Cancel running tasks
    for (const [taskId, taskExecution] of this.runningTasks) {
      try {
        taskExecution.cancel();
        logger.info(`Cancelled running task: ${taskId}`);
      } catch (error) {
        logger.error(`Error cancelling task ${taskId}:`, error);
      }
    }

    this.runningTasks.clear();
    logger.info("Task queue manager stopped");
  }

  /**
   * Process the task queue
   */
  async processQueue() {
    try {
      // Check if we can process more tasks
      const availableSlots = this.maxConcurrentTasks - this.runningTasks.size;
      if (availableSlots <= 0) {
        return;
      }

      // Get queued tasks
      const queuedTasks = await BackgroundTaskService.getQueuedTasks({
        limit: availableSlots,
      });

      if (queuedTasks.length === 0) {
        return;
      }

      logger.debug(`Processing ${queuedTasks.length} queued tasks`);

      // Process each task
      for (const task of queuedTasks) {
        try {
          await this.executeTask(task);
        } catch (error) {
          logger.error(`Error starting task ${task.id}:`, error);
          await BackgroundTaskService.failTask(task.id, error);
        }
      }
    } catch (error) {
      logger.error("Error processing task queue:", error);
    }
  }

  /**
   * Execute a single task
   */
  async executeTask(task) {
    const taskId = task.id;

    try {
      // Mark task as started
      await BackgroundTaskService.startTask(taskId);

      // Create task execution
      const taskExecution = new TaskExecution(task);
      this.runningTasks.set(taskId, taskExecution);

      // Set up event listeners
      taskExecution.on("progress", (progress) => {
        this.emit("taskProgress", taskId, progress);
      });

      taskExecution.on("log", (log) => {
        this.emit("taskLog", taskId, log);
      });

      taskExecution.on("completed", async (result) => {
        try {
          await BackgroundTaskService.completeTask(taskId, result);
          this.runningTasks.delete(taskId);
          this.emit("taskCompleted", taskId, result);
          logger.info(`Task completed: ${taskId}`);
        } catch (error) {
          logger.error(`Error marking task as completed: ${taskId}`, error);
        }
      });

      taskExecution.on("failed", async (error) => {
        try {
          await BackgroundTaskService.failTask(taskId, error);
          this.runningTasks.delete(taskId);
          this.emit("taskFailed", taskId, error);
          logger.error(`Task failed: ${taskId}`, error);
        } catch (err) {
          logger.error(`Error marking task as failed: ${taskId}`, err);
        }
      });

      taskExecution.on("cancelled", async () => {
        try {
          await BackgroundTaskService.cancelTask(taskId, "Execution cancelled");
          this.runningTasks.delete(taskId);
          this.emit("taskCancelled", taskId);
          logger.info(`Task cancelled: ${taskId}`);
        } catch (error) {
          logger.error(`Error marking task as cancelled: ${taskId}`, error);
        }
      });

      // Start execution
      taskExecution.start();

      logger.info(`Task execution started: ${taskId} (${task.taskType})`);
    } catch (error) {
      this.runningTasks.delete(taskId);
      throw error;
    }
  }

  /**
   * Check for timed out tasks
   */
  async checkTimeouts() {
    try {
      const timeoutTasks = await BackgroundTaskService.handleTimeouts();

      for (const task of timeoutTasks) {
        const taskExecution = this.runningTasks.get(task.id);
        if (taskExecution) {
          taskExecution.cancel();
          this.runningTasks.delete(task.id);
        }
      }

      if (timeoutTasks.length > 0) {
        logger.warn(`Handled ${timeoutTasks.length} timed out tasks`);
      }
    } catch (error) {
      logger.error("Error checking timeouts:", error);
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      runningTasks: this.runningTasks.size,
      maxConcurrentTasks: this.maxConcurrentTasks,
      runningTaskIds: Array.from(this.runningTasks.keys()),
    };
  }

  /**
   * Pause task execution
   */
  async pauseTask(taskId) {
    const taskExecution = this.runningTasks.get(taskId);
    if (taskExecution) {
      taskExecution.pause();
      await BackgroundTaskService.pauseTask(taskId);
    }
  }

  /**
   * Resume task execution
   */
  async resumeTask(taskId) {
    const taskExecution = this.runningTasks.get(taskId);
    if (taskExecution) {
      taskExecution.resume();
      await BackgroundTaskService.resumeTask(taskId);
    }
  }

  /**
   * Cancel task execution
   */
  async cancelTask(taskId) {
    const taskExecution = this.runningTasks.get(taskId);
    if (taskExecution) {
      taskExecution.cancel();
    } else {
      await BackgroundTaskService.cancelTask(taskId, "Cancelled by user");
    }
  }
}

/**
 * Task execution wrapper
 */
class TaskExecution extends EventEmitter {
  constructor(task) {
    super();
    this.task = task;
    this.isRunning = false;
    this.isPaused = false;
    this.isCancelled = false;
    this.executionPromise = null;
  }

  async start() {
    if (this.isRunning) {
      throw new Error("Task is already running");
    }

    this.isRunning = true;
    this.executionPromise = this.executeTask();

    try {
      await this.executionPromise;
    } catch (error) {
      if (!this.isCancelled) {
        this.emit("failed", error);
      }
    }
  }

  async executeTask() {
    try {
      this.emit("log", { level: "info", message: "Task execution started" });

      // Get the appropriate task executor
      const executor = this.getTaskExecutor();

      if (!executor) {
        throw new Error(
          `No executor found for task type: ${this.task.taskType}`
        );
      }

      // Execute the task
      const result = await executor.execute(this.task, {
        onProgress: (current, total, message, phase) => {
          this.emit("progress", { current, total, message, phase });
        },
        onLog: (level, message, data) => {
          this.emit("log", { level, message, data });
        },
        checkCancellation: () => {
          if (this.isCancelled) {
            throw new Error("Task was cancelled");
          }
        },
        waitForResume: async () => {
          while (this.isPaused && !this.isCancelled) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          if (this.isCancelled) {
            throw new Error("Task was cancelled while paused");
          }
        },
      });

      this.emit("completed", result);
    } catch (error) {
      if (this.isCancelled) {
        this.emit("cancelled");
      } else {
        this.emit("failed", error);
      }
    } finally {
      this.isRunning = false;
    }
  }

  getTaskExecutor() {
    // Dynamic import of task executors based on task type
    const executors = {
      order_fetching: require("../executors/OrderFetchingExecutor"),
      product_sync: require("../executors/ProductSyncExecutor"),
      inventory_sync: require("../executors/InventorySyncExecutor"),
      bulk_operation: require("../executors/BulkOperationExecutor"),
      analytics_update: require("../executors/AnalyticsUpdateExecutor"),
      customer_sync: require("../executors/CustomerSyncExecutor"),
      shipping_label_generation: require("../executors/ShippingLabelExecutor"),
      report_generation: require("../executors/ReportGenerationExecutor"),
      data_export: require("../executors/DataExportExecutor"),
      data_import: require("../executors/DataImportExecutor"),
    };

    return executors[this.task.taskType];
  }

  pause() {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.emit("log", { level: "info", message: "Task execution paused" });
  }

  resume() {
    if (!this.isRunning || !this.isPaused) {
      return;
    }

    this.isPaused = false;
    this.emit("log", { level: "info", message: "Task execution resumed" });
  }

  cancel() {
    this.isCancelled = true;
    this.isPaused = false;
    this.emit("log", { level: "info", message: "Task execution cancelled" });
  }
}

// Create singleton instance
const taskQueueManager = new TaskQueueManager();

module.exports = {
  TaskQueueManager,
  taskQueueManager,
};
