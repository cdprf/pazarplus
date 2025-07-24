const EventEmitter = require('events');
const BackgroundTaskService = require('../services/BackgroundTaskService');
const logger = require('../utils/logger');

class TaskQueueManager extends EventEmitter {
  constructor() {
    super();
    this.isProcessing = false;
    this.maxConcurrentTasks = parseInt(
      process.env.MAX_CONCURRENT_TASKS || '3',
      10
    ); // Reduced default
    this.runningTasks = new Map();
    this.processingInterval = null;
    this.timeoutCheckInterval = null;
    this.retryInterval = parseInt(
      process.env.TASK_RETRY_INTERVAL || '30000',
      10
    ); // 30 seconds
    this.timeoutCheckInterval = parseInt(
      process.env.TIMEOUT_CHECK_INTERVAL || '60000',
      10
    ); // 1 minute
    this.connectionMonitorInterval = null;

    // Enhanced metrics collection
    this.metrics = {
      tasksProcessed: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      tasksCancelled: 0,
      totalProcessingTime: 0,
      queueDepth: 0,
      averageProcessingTime: 0,
      peakConcurrentTasks: 0,
      startTime: Date.now(),
      lastMetricsReset: Date.now()
    };

    // Performance monitoring
    this.performanceMonitor = {
      queueProcessingTimes: [],
      taskExecutionTimes: new Map(),
      memoryUsage: [],
      connectionPoolStats: []
    };
  }

  /**
   * Start the task queue manager
   */
  start() {
    if (this.isProcessing) {
      logger.warn('Task queue manager is already running');
      return;
    }

    this.isProcessing = true;
    this.metrics.startTime = Date.now();

    logger.info('Starting task queue manager with enhanced monitoring...', {
      maxConcurrentTasks: this.maxConcurrentTasks,
      retryInterval: this.retryInterval,
      timeoutCheckInterval: this.timeoutCheckInterval,
      metricsEnabled: true,
      performanceMonitoringEnabled: true
    });

    // Start processing queue
    this.processingInterval = setInterval(() => {
      const queueStartTime = Date.now();
      this.processQueue()
        .catch((error) => {
          logger.error('Error in task queue processing:', {
            error: error.message,
            stack: error.stack
          });
        })
        .finally(() => {
          // Track queue processing time
          const processingTime = Date.now() - queueStartTime;
          this.performanceMonitor.queueProcessingTimes.push(processingTime);

          // Keep only last 100 measurements
          if (this.performanceMonitor.queueProcessingTimes.length > 100) {
            this.performanceMonitor.queueProcessingTimes.shift();
          }
        });
    }, this.retryInterval);

    // Start timeout checker
    this.timeoutCheckInterval = setInterval(() => {
      this.checkTimeouts().catch((error) => {
        logger.error('Error checking timeouts:', {
          error: error.message,
          stack: error.stack
        });
      });
    }, this.timeoutCheckInterval);

    // Start connection pool monitoring
    if (process.env.DEBUG_DB_POOL === 'true') {
      this.connectionMonitorInterval = setInterval(() => {
        this.monitorConnectionPool().catch((error) => {
          logger.error('Error monitoring connection pool:', {
            error: error.message,
            stack: error.stack
          });
        });
      }, 120000); // Every 2 minutes
    }

    // Process immediately
    this.processQueue().catch((error) => {
      logger.error('Error in initial queue processing:', {
        error: error.message,
        stack: error.stack
      });
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
      logger.warn('Task queue manager is not running');
      return;
    }

    this.isProcessing = false;
    logger.info('Stopping task queue manager...');

    // Clear intervals
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.timeoutCheckInterval) {
      clearInterval(this.timeoutCheckInterval);
      this.timeoutCheckInterval = null;
    }

    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
    }

    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
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
    logger.info('Task queue manager stopped');
  }

  /**
   * Process the task queue
   */
  async processQueue() {
    try {
      // Check if we can process more tasks
      const availableSlots = this.maxConcurrentTasks - this.runningTasks.size;
      if (availableSlots <= 0) {
        logger.info(`No available slots for new tasks`, {
          runningTasks: this.runningTasks.size,
          maxConcurrentTasks: this.maxConcurrentTasks
        });
        return;
      }

      logger.info(`Checking for queued tasks`, { availableSlots });

      // Get queued tasks
      const queuedTasks = await BackgroundTaskService.getQueuedTasks({
        limit: availableSlots
      });

      if (queuedTasks.length === 0) {
        logger.info('No queued tasks found');
        return;
      }

      logger.info(`Processing ${queuedTasks.length} queued tasks`, {
        taskIds: queuedTasks.map((t) => t.id),
        taskTypes: queuedTasks.map((t) => t.taskType),
        availableSlots
      });

      // Process each task
      for (const task of queuedTasks) {
        try {
          logger.info(`Starting task execution`, {
            taskId: task.id,
            taskType: task.taskType,
            priority: task.priority,
            userId: task.userId
          });
          await this.executeTask(task);
        } catch (error) {
          logger.error(`Error starting task ${task.id}:`, {
            taskId: task.id,
            taskType: task.taskType,
            error: error.message,
            stack: error.stack
          });
          await BackgroundTaskService.failTask(task.id, error);
        }
      }
    } catch (error) {
      logger.error('Error processing task queue:', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Execute a single task
   */
  async executeTask(task) {
    const taskId = task.id;

    try {
      logger.info(`Executing task: ${taskId}`, {
        taskId,
        taskType: task.taskType,
        priority: task.priority,
        config: task.config
      });

      // Mark task as started
      await BackgroundTaskService.startTask(taskId);

      // Load the complete task with all associations (especially platform connection)
      logger.info(`Loading task with associations`, {
        taskId,
        platformConnectionId: task.platformConnectionId
      });

      const completeTask = await BackgroundTaskService.getTaskById(taskId);
      if (!completeTask) {
        throw new Error(
          `Task ${taskId} not found when loading with associations`
        );
      }

      logger.info(`Task loaded with platform connection`, {
        taskId,
        platformType: completeTask.platformConnection?.platformType,
        platformConnectionId: completeTask.platformConnectionId,
        credentials: completeTask.platformConnection?.credentials
          ? 'Present'
          : 'Missing'
      });

      // Create task execution
      const taskExecution = new TaskExecution(completeTask);
      this.runningTasks.set(taskId, taskExecution);

      // Update metrics for task start
      this.updateTaskStartMetrics(taskId);

      logger.info(`Task execution created and stored`, {
        taskId,
        runningTasksCount: this.runningTasks.size,
        peakConcurrentTasks: this.metrics.peakConcurrentTasks,
        totalTasksProcessed: this.metrics.tasksProcessed
      });

      // Set up event listeners with metrics tracking
      taskExecution.on('progress', (progress) => {
        logger.info(`Task progress update`, { taskId, progress });
        this.emit('taskProgress', taskId, progress);
      });

      taskExecution.on('log', (log) => {
        logger.info(`Task log`, { taskId, log });
        this.emit('taskLog', taskId, log);
      });

      taskExecution.on('completed', async (result) => {
        try {
          logger.info(`Task execution completed`, { taskId, result });
          await BackgroundTaskService.completeTask(taskId, result);
          this.runningTasks.delete(taskId);

          // Update metrics for task completion
          this.updateTaskCompleteMetrics(taskId, 'completed');

          this.emit('taskCompleted', taskId, result);
          logger.info(`Task completed and cleaned up: ${taskId}`, {
            totalCompleted: this.metrics.tasksCompleted,
            averageProcessingTime: Math.round(
              this.metrics.averageProcessingTime
            )
          });
        } catch (error) {
          logger.error(`Error marking task as completed: ${taskId}`, {
            error: error.message,
            stack: error.stack
          });
        }
      });

      taskExecution.on('failed', async (error) => {
        try {
          logger.error(`Task execution failed`, {
            taskId,
            error: error.message
          });
          await BackgroundTaskService.failTask(taskId, error);
          this.runningTasks.delete(taskId);

          // Update metrics for task failure
          this.updateTaskCompleteMetrics(taskId, 'failed');

          this.emit('taskFailed', taskId, error);
          logger.error(`Task failed and cleaned up: ${taskId}`, {
            error: error.message,
            totalFailed: this.metrics.tasksFailed
          });
        } catch (err) {
          logger.error(`Error marking task as failed: ${taskId}`, {
            error: err.message,
            stack: err.stack
          });
        }
      });

      taskExecution.on('cancelled', async () => {
        try {
          logger.info(`Task execution cancelled`, { taskId });
          await BackgroundTaskService.cancelTask(taskId, 'Execution cancelled');
          this.runningTasks.delete(taskId);

          // Update metrics for task cancellation
          this.updateTaskCompleteMetrics(taskId, 'cancelled');

          this.emit('taskCancelled', taskId);
          logger.info(`Task cancelled and cleaned up: ${taskId}`, {
            totalCancelled: this.metrics.tasksCancelled
          });
        } catch (error) {
          logger.error(`Error marking task as cancelled: ${taskId}`, {
            error: error.message,
            stack: error.stack
          });
        }
      });

      taskExecution.on('progress', async (progressData) => {
        try {
          logger.info(`Task progress update`, { taskId, progressData });
          await BackgroundTaskService.updateProgress(
            taskId,
            progressData.current,
            progressData.total,
            progressData.message,
            progressData.phase
          );
          this.emit('taskProgress', taskId, progressData);
        } catch (error) {
          logger.error(`Error updating task progress: ${taskId}`, {
            error: error.message,
            stack: error.stack
          });
        }
      });

      taskExecution.on('log', async (logData) => {
        try {
          logger.info(`Task log entry`, { taskId, logData });
          await BackgroundTaskService.addLog(
            taskId,
            logData.level,
            logData.message,
            logData.data
          );
          this.emit('taskLog', taskId, logData);
        } catch (error) {
          logger.error(`Error adding task log: ${taskId}`, {
            error: error.message,
            stack: error.stack
          });
        }
      });

      // Add missing log event handler to persist logs to database
      taskExecution.on('log', async (logData) => {
        try {
          logger.info(`Task log entry`, { taskId, logData });
          await BackgroundTaskService.addLog(
            taskId,
            logData.level,
            logData.message,
            logData.data
          );
          this.emit('taskLog', taskId, logData);
        } catch (error) {
          logger.error(`Error adding task log: ${taskId}`, {
            error: error.message,
            stack: error.stack
          });
        }
      });

      // Start execution
      taskExecution.start();

      logger.info(`Task execution started: ${taskId} (${task.taskType})`);
    } catch (error) {
      logger.error(`Error in executeTask for ${taskId}`, {
        error: error.message,
        stack: error.stack
      });
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
      logger.error('Error checking timeouts:', error);
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
      runningTaskIds: Array.from(this.runningTasks.keys())
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
      await BackgroundTaskService.cancelTask(taskId, 'Cancelled by user');
    }
  }

  /**
   * Monitor database connection pool status
   */
  async monitorConnectionPool() {
    try {
      const sequelize = require('../config/database');
      const pool = sequelize.connectionManager.pool;

      if (pool) {
        const poolStats = {
          total: pool.size || 0,
          available: pool.available || 0,
          using: pool.using || 0,
          pending: pool.pending || 0,
          max: pool.max || 0,
          runningTasks: this.runningTasks.size
        };

        logger.info('Database connection pool status', poolStats);

        // Warning if pool usage is high
        if (poolStats.using / poolStats.max > 0.8) {
          logger.warn('High database connection pool usage', {
            usage: `${poolStats.using}/${poolStats.max}`,
            percentage: Math.round((poolStats.using / poolStats.max) * 100),
            runningTasks: poolStats.runningTasks
          });
        }

        // Error if pool is exhausted
        if (poolStats.using >= poolStats.max && poolStats.pending > 0) {
          logger.error('Database connection pool exhausted', {
            usage: `${poolStats.using}/${poolStats.max}`,
            pending: poolStats.pending,
            runningTasks: poolStats.runningTasks
          });
        }
      }
    } catch (error) {
      logger.error('Error monitoring connection pool:', error);
    }
  }

  /**
   * Update task metrics when task starts
   */
  updateTaskStartMetrics(taskId) {
    this.metrics.tasksProcessed++;
    this.performanceMonitor.taskExecutionTimes.set(taskId, Date.now());

    // Update peak concurrent tasks
    if (this.runningTasks.size > this.metrics.peakConcurrentTasks) {
      this.metrics.peakConcurrentTasks = this.runningTasks.size;
    }

    // Update queue depth
    this.updateQueueDepth();
  }

  /**
   * Update task metrics when task completes
   */
  updateTaskCompleteMetrics(taskId, status) {
    const startTime = this.performanceMonitor.taskExecutionTimes.get(taskId);
    if (startTime) {
      const executionTime = Date.now() - startTime;
      this.metrics.totalProcessingTime += executionTime;
      this.performanceMonitor.taskExecutionTimes.delete(taskId);
    }

    switch (status) {
    case 'completed':
      this.metrics.tasksCompleted++;
      break;
    case 'failed':
      this.metrics.tasksFailed++;
      break;
    case 'cancelled':
      this.metrics.tasksCancelled++;
      break;
    }

    // Update average processing time
    const completedTasks =
      this.metrics.tasksCompleted +
      this.metrics.tasksFailed +
      this.metrics.tasksCancelled;
    if (completedTasks > 0) {
      this.metrics.averageProcessingTime =
        this.metrics.totalProcessingTime / completedTasks;
    }
  }

  /**
   * Update queue depth metrics
   */
  async updateQueueDepth() {
    try {
      const queuedTasks = await BackgroundTaskService.getQueuedTasks({
        limit: 1000
      });
      this.metrics.queueDepth = queuedTasks.length;
    } catch (error) {
      logger.warn('Failed to update queue depth metrics:', error.message);
    }
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    const avgQueueProcessingTime =
      this.performanceMonitor.queueProcessingTimes.length > 0
        ? this.performanceMonitor.queueProcessingTimes.reduce(
          (a, b) => a + b,
          0
        ) / this.performanceMonitor.queueProcessingTimes.length
        : 0;

    return {
      ...this.metrics,
      uptime,
      currentConcurrentTasks: this.runningTasks.size,
      avgQueueProcessingTime: Math.round(avgQueueProcessingTime),
      performance: {
        queueProcessingTimes:
          this.performanceMonitor.queueProcessingTimes.slice(-10), // Last 10 measurements
        avgProcessingTime: Math.round(this.metrics.averageProcessingTime),
        tasksPerMinute:
          this.metrics.tasksProcessed > 0
            ? Math.round((this.metrics.tasksProcessed / uptime) * 60000)
            : 0
      }
    };
  }

  /**
   * Reset metrics (useful for periodic reporting)
   */
  resetMetrics() {
    const currentTime = Date.now();
    this.metrics = {
      tasksProcessed: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      tasksCancelled: 0,
      totalProcessingTime: 0,
      queueDepth: 0,
      averageProcessingTime: 0,
      peakConcurrentTasks: 0,
      startTime: currentTime,
      lastMetricsReset: currentTime
    };

    this.performanceMonitor.queueProcessingTimes = [];
    this.performanceMonitor.taskExecutionTimes.clear();

    logger.info('TaskQueueManager metrics reset', {
      resetAt: new Date(currentTime)
    });
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
      throw new Error('Task is already running');
    }

    this.isRunning = true;
    this.executionPromise = this.executeTask();

    try {
      await this.executionPromise;
    } catch (error) {
      if (!this.isCancelled) {
        this.emit('failed', error);
      }
    }
  }

  async executeTask() {
    try {
      logger.info(`Task execution starting`, {
        taskId: this.task.id,
        taskType: this.task.taskType,
        config: this.task.config
      });

      this.emit('log', {
        level: 'info',
        message: 'Task execution started',
        data: { taskId: this.task.id }
      });

      // Get the appropriate task executor
      const executorLoader = this.getTaskExecutor();
      const executor = executorLoader(this.task.taskType);

      if (!executor) {
        const error = `No executor found for task type: ${this.task.taskType}`;
        logger.error(error, {
          taskId: this.task.id,
          taskType: this.task.taskType
        });
        throw new Error(error);
      }

      logger.info(`Task executor found`, {
        taskId: this.task.id,
        taskType: this.task.taskType,
        executor: executor.constructor.name || 'Unknown'
      });

      // Execute the task with enhanced logging callbacks
      const result = await executor.execute(this.task, {
        onProgress: (current, total, message, phase) => {
          logger.info(`Task progress`, {
            taskId: this.task.id,
            current,
            total,
            percentage: total > 0 ? Math.floor((current / total) * 100) : 0,
            message,
            phase
          });
          this.emit('progress', { current, total, message, phase });
        },
        onLog: async (level, message, data) => {
          // Validate level
          const validLevels = ['info', 'error', 'warn', 'debug'];
          const logLevel = validLevels.includes(level) ? level : 'info';

          // Log to application logger
          logger[logLevel](`Task log [${logLevel}]: ${message}`, {
            taskId: this.task.id,
            data,
            source: this.task.metadata?.source || 'unknown'
          });

          try {
            // Ensure logs are saved to database reliably
            // We're awaiting here despite the performance impact, to ensure logs are saved
            await BackgroundTaskService.addLog(
              this.task.id,
              logLevel,
              message,
              data
            );

            // Emit log event after successful save
            this.emit('log', { level: logLevel, message, data });
          } catch (error) {
            logger.error(`Failed to save task log to database`, {
              taskId: this.task.id,
              error: error.message,
              logLevel,
              logMessage: message
            });

            // Try one more time with a simpler message
            try {
              await BackgroundTaskService.addLog(
                this.task.id,
                'error',
                `Failed to save log: ${message.substring(0, 50)}...`,
                null
              );
            } catch (retryError) {
              logger.error(`Failed to save log after retry`, {
                taskId: this.task.id,
                error: retryError.message
              });
            }
          }
        },
        checkCancellation: () => {
          if (this.isCancelled) {
            logger.info(`Task cancellation check - task is cancelled`, {
              taskId: this.task.id
            });
            throw new Error('Task was cancelled');
          }
        },
        waitForResume: async () => {
          if (this.isPaused) {
            logger.info(`Task is paused, waiting for resume`, {
              taskId: this.task.id
            });
          }
          while (this.isPaused && !this.isCancelled) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          if (this.isCancelled) {
            logger.info(`Task was cancelled while paused`, {
              taskId: this.task.id
            });
            throw new Error('Task was cancelled while paused');
          }
          if (this.isPaused === false) {
            logger.info(`Task resumed from pause`, { taskId: this.task.id });
          }
        }
      });

      logger.info(`Task execution completed successfully`, {
        taskId: this.task.id,
        taskType: this.task.taskType,
        result: result ? Object.keys(result) : null
      });

      this.emit('completed', result);
    } catch (error) {
      logger.error(`Task execution error`, {
        taskId: this.task.id,
        taskType: this.task.taskType,
        error: error.message,
        stack: error.stack,
        isCancelled: this.isCancelled
      });

      if (this.isCancelled) {
        this.emit('cancelled');
      } else {
        this.emit('failed', error);
      }
    } finally {
      this.isRunning = false;
      logger.info(`Task execution finished`, {
        taskId: this.task.id,
        isRunning: this.isRunning
      });
    }
  }

  getTaskExecutor() {
    // Dynamic import of task executors based on task type
    const executors = {
      order_fetching: require('../executors/OrderFetchingExecutor')
      // Note: Other executors can be added as they are implemented
    };

    return (taskType) => {
      const executor = executors[taskType];
      if (!executor) {
        throw new Error(`No executor found for task type: ${taskType}`);
      }
      return executor;
    };
  }

  pause() {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.emit('log', { level: 'info', message: 'Task execution paused' });
  }

  resume() {
    if (!this.isRunning || !this.isPaused) {
      return;
    }

    this.isPaused = false;
    this.emit('log', { level: 'info', message: 'Task execution resumed' });
  }

  cancel() {
    this.isCancelled = true;
    this.isPaused = false;
    this.emit('log', { level: 'info', message: 'Task execution cancelled' });
  }
}

// Create singleton instance
const taskQueueManager = new TaskQueueManager();

module.exports = {
  TaskQueueManager,
  taskQueueManager
};
