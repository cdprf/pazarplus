const { Op } = require('sequelize');
const { BackgroundTask, User, PlatformConnection } = require('../models');
const logger = require('../utils/logger');

class BackgroundTaskService {
  /**
   * Create a new background task
   * @param {Object} taskData - Task configuration
   * @returns {Promise<BackgroundTask>}
   */
  static async createTask(taskData) {
    try {
      const {
        userId,
        taskType,
        priority = 'normal',
        config = {},
        scheduledFor = null,
        platformConnectionId = null,
        maxRetries = 3,
        parentTaskId = null,
        dependsOnTaskIds = [],
        metadata = {}
      } = taskData;

      // Validate required fields
      if (!userId || !taskType) {
        throw new Error('UserId and taskType are required');
      }

      logger.info(`Creating background task`, {
        userId,
        taskType,
        priority,
        platformConnectionId,
        config,
        metadata
      });

      // Validate dependencies exist
      if (dependsOnTaskIds.length > 0) {
        const existingTasks = await BackgroundTask.count({
          where: { id: { [Op.in]: dependsOnTaskIds } }
        });
        if (existingTasks !== dependsOnTaskIds.length) {
          throw new Error('One or more dependency tasks do not exist');
        }
        logger.info(`Task has ${dependsOnTaskIds.length} dependencies`, {
          dependsOnTaskIds
        });
      }

      const task = await BackgroundTask.create({
        userId,
        taskType,
        priority,
        config,
        scheduledFor,
        platformConnectionId,
        maxRetries,
        parentTaskId,
        dependsOnTaskIds,
        metadata,
        progress: {
          current: 0,
          total: 0,
          percentage: 0,
          phase: 'created',
          message: 'Task created successfully'
        }
      });

      logger.info(`Background task created successfully`, {
        taskId: task.id,
        userId,
        taskType,
        priority,
        status: task.status,
        scheduledFor: task.scheduledFor,
        timeoutAt: task.timeoutAt
      });

      // Log platform connection details if available
      if (platformConnectionId) {
        logger.info(`Task associated with platform connection`, {
          taskId: task.id,
          platformConnectionId
        });
      }

      return task;
    } catch (error) {
      logger.error('Error creating background task:', {
        error: error.message,
        stack: error.stack,
        taskData
      });
      throw error;
    }
  }

  /**
   * Get task by ID with associations
   * @param {string} taskId - Task UUID
   * @param {Object} options - Query options
   * @returns {Promise<BackgroundTask|null>}
   */
  static async getTaskById(taskId, options = {}) {
    const {
      includeUser = true,
      includePlatform = true,
      includeChildren = false
    } = options;

    const include = [];
    if (includeUser) {
      include.push({ model: User, as: 'user' });
    }
    if (includePlatform) {
      include.push({ model: PlatformConnection, as: 'platformConnection' });
    }
    if (includeChildren) {
      include.push({ model: BackgroundTask, as: 'childTasks' });
      include.push({ model: BackgroundTask, as: 'parentTask' });
    }

    return BackgroundTask.findByPk(taskId, { include });
  }

  /**
   * Get tasks with pagination and filtering
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>}
   */
  static async getTasks(params = {}) {
    const {
      page = 1,
      limit = 20,
      userId = null,
      status = null,
      taskType = null,
      priority = null,
      platformConnectionId = null,
      search = null,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom = null,
      dateTo = null
    } = params;

    // Build where clause
    const where = {};

    if (userId) {where.userId = userId;}
    if (status && status !== 'all') {where.status = status;}
    if (taskType && taskType !== 'all') {where.taskType = taskType;}
    if (priority && priority !== 'all') {where.priority = priority;}
    if (platformConnectionId) {where.platformConnectionId = platformConnectionId;}

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {where.createdAt[Op.gte] = new Date(dateFrom);}
      if (dateTo) {where.createdAt[Op.lte] = new Date(dateTo);}
    }

    if (search) {
      where[Op.or] = [
        { id: { [Op.iLike]: `%${search}%` } },
        { '$user.firstName$': { [Op.iLike]: `%${search}%` } },
        { '$user.lastName$': { [Op.iLike]: `%${search}%` } },
        { '$user.email$': { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Build order clause
    const order = [];
    const validSortFields = [
      'createdAt',
      'updatedAt',
      'priority',
      'status',
      'taskType'
    ];
    if (validSortFields.includes(sortBy)) {
      order.push([sortBy, sortOrder.toUpperCase()]);
    } else {
      order.push(['createdAt', 'DESC']);
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await BackgroundTask.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user' },
        { model: PlatformConnection, as: 'platformConnection' }
      ],
      order,
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    return {
      tasks: rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalRecords: count,
        hasNextPage: page < Math.ceil(count / limit),
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Get next queued tasks for execution
   * @param {Object} options - Queue options
   * @returns {Promise<BackgroundTask[]>}
   */
  static async getQueuedTasks(options = {}) {
    logger.debug('Getting queued tasks', { options });

    try {
      const tasks = await BackgroundTask.getQueuedTasks(options);

      logger.info('Retrieved queued tasks', {
        count: tasks.length,
        taskIds: tasks.map((t) => t.id),
        taskTypes: tasks.map((t) => t.taskType),
        priorities: tasks.map((t) => t.priority)
      });

      return tasks;
    } catch (error) {
      // Handle specific database errors gracefully
      if (
        error.name === 'SequelizeDatabaseError' &&
        error.original?.code === '42P01'
      ) {
        logger.warn(
          'Background tasks table not yet created, returning empty task list'
        );
        return [];
      }

      logger.error('Error getting queued tasks:', error);
      return [];
    }
  }

  /**
   * Update task progress
   * @param {string} taskId - Task UUID
   * @param {number} current - Current progress
   * @param {number} total - Total items
   * @param {string} message - Progress message
   * @param {string} phase - Current phase
   * @returns {Promise<BackgroundTask>}
   */
  static async updateProgress(
    taskId,
    current,
    total,
    message = '',
    phase = ''
  ) {
    const task = await BackgroundTask.findByPk(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    await task.updateProgress(current, total, message, phase);

    logger.debug(`Task progress updated: ${taskId}`, {
      taskId,
      current,
      total,
      percentage: total > 0 ? Math.floor((current / total) * 100) : 0,
      phase
    });

    return task;
  }

  /**
   * Add log entry to task
   * @param {string} taskId - Task UUID
   * @param {string} level - Log level (info, warn, error, debug)
   * @param {string} message - Log message
   * @param {Object} data - Additional log data
   * @returns {Promise<BackgroundTask>}
   */
  static async addLog(taskId, level, message, data = null) {
    try {
      // Validate inputs to prevent errors
      if (!taskId) {
        logger.warn('Cannot add log: Missing taskId');
        return null;
      }

      if (!message) {
        message = 'Log entry (no message provided)';
      }

      // Standardize log level
      const validLevels = ['info', 'warn', 'error', 'debug'];
      const normalizedLevel = validLevels.includes(level) ? level : 'info';

      // Attempt to find the task with retry logic
      let task = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!task && attempts < maxAttempts) {
        attempts++;
        try {
          task = await BackgroundTask.findByPk(taskId);
          if (!task && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (findError) {
          logger.warn(
            `Error finding task for logging (attempt ${attempts}): ${findError.message}`,
            {
              taskId,
              error: findError.message
            }
          );
          if (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }
      }

      if (!task) {
        logger.error(
          `Failed to add log: Task not found after ${maxAttempts} attempts`,
          {
            taskId,
            level: normalizedLevel,
            message: message.substring(0, 50)
          }
        );
        return null;
      }

      // Add the log to the task
      await task.addLog(normalizedLevel, message, data);
      return task;
    } catch (error) {
      logger.error(`Error in BackgroundTaskService.addLog`, {
        taskId,
        error: error.message,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * Start task execution
   * @param {string} taskId - Task UUID
   * @returns {Promise<BackgroundTask>}
   */
  static async startTask(taskId) {
    logger.info(`Starting background task`, { taskId });

    const task = await BackgroundTask.findByPk(taskId, {
      include: [
        { model: User, as: 'user' },
        { model: PlatformConnection, as: 'platformConnection' }
      ]
    });

    if (!task) {
      logger.error(`Task not found for start operation`, { taskId });
      throw new Error('Task not found');
    }

    if (task.status !== 'pending') {
      logger.warn(`Task cannot be started - invalid status`, {
        taskId,
        currentStatus: task.status,
        taskType: task.taskType
      });
      throw new Error(`Task cannot be started. Current status: ${task.status}`);
    }

    // Log platform connection details if available
    if (task.platformConnection) {
      logger.info(`Task starting with platform connection`, {
        taskId,
        platformType: task.platformConnection.platformType,
        platformConnectionId: task.platformConnectionId
      });
    }

    await task.markAsStarted();

    logger.info(`Background task started successfully`, {
      taskId,
      taskType: task.taskType,
      userId: task.userId,
      startedAt: task.startedAt,
      timeoutAt: task.timeoutAt,
      priority: task.priority
    });

    return task;
  }

  /**
   * Complete task with results
   * @param {string} taskId - Task UUID
   * @param {Object} result - Task execution results
   * @returns {Promise<BackgroundTask>}
   */
  static async completeTask(taskId, result = null) {
    logger.info(`Completing background task`, {
      taskId,
      result: result ? Object.keys(result) : null
    });

    const task = await BackgroundTask.findByPk(taskId);
    if (!task) {
      logger.error(`Task not found for completion`, { taskId });
      throw new Error('Task not found');
    }

    const startTime = task.startedAt ? new Date(task.startedAt) : null;
    const duration = startTime
      ? Math.floor((new Date() - startTime) / 1000)
      : null;

    await task.markAsCompleted(result);

    logger.info(`Background task completed successfully`, {
      taskId,
      taskType: task.taskType,
      userId: task.userId,
      duration: task.actualDuration || duration,
      completedAt: task.completedAt,
      result: result
        ? {
          keys: Object.keys(result),
          summary:
              typeof result === 'object'
                ? JSON.stringify(result).substring(0, 200)
                : result
        }
        : null,
      progress: task.progress
    });

    return task;
  }

  /**
   * Fail task with error
   * @param {string} taskId - Task UUID
   * @param {string|Error} error - Error message or object
   * @returns {Promise<BackgroundTask>}
   */
  static async failTask(taskId, error) {
    logger.error(`Failing background task`, {
      taskId,
      error: typeof error === 'string' ? error : error.message,
      stack: error.stack
    });

    const task = await BackgroundTask.findByPk(taskId);
    if (!task) {
      logger.error(`Task not found for failure`, { taskId });
      throw new Error('Task not found');
    }

    await task.markAsFailed(error);

    const canRetry = task.retryCount < task.maxRetries;

    logger.error(`Background task failed`, {
      taskId,
      taskType: task.taskType,
      userId: task.userId,
      error: typeof error === 'string' ? error : error.message,
      retryCount: task.retryCount,
      maxRetries: task.maxRetries,
      canRetry,
      duration: task.actualDuration,
      progress: task.progress
    });

    if (canRetry) {
      logger.info(`Task can be retried`, {
        taskId,
        remainingRetries: task.maxRetries - task.retryCount
      });
    }

    return task;
  }

  /**
   * Cancel task
   * @param {string} taskId - Task UUID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<BackgroundTask>}
   */
  static async cancelTask(taskId, reason = '') {
    const task = await BackgroundTask.findByPk(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (['completed', 'failed', 'cancelled'].includes(task.status)) {
      throw new Error(
        `Task cannot be cancelled. Current status: ${task.status}`
      );
    }

    await task.markAsCancelled(reason);

    logger.info(`Background task cancelled: ${taskId}`, {
      taskId,
      taskType: task.taskType,
      reason
    });

    return task;
  }

  /**
   * Retry failed task
   * @param {string} taskId - Task UUID
   * @returns {Promise<BackgroundTask>}
   */
  static async retryTask(taskId) {
    const task = await BackgroundTask.findByPk(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (!task.canRetry()) {
      throw new Error('Task cannot be retried');
    }

    await task.retry();

    logger.info(`Background task retry initiated: ${taskId}`, {
      taskId,
      taskType: task.taskType,
      retryCount: task.retryCount,
      maxRetries: task.maxRetries
    });

    return task;
  }

  /**
   * Pause running task
   * @param {string} taskId - Task UUID
   * @returns {Promise<BackgroundTask>}
   */
  static async pauseTask(taskId) {
    const task = await BackgroundTask.findByPk(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    await task.pause();

    logger.info(`Background task paused: ${taskId}`, {
      taskId,
      taskType: task.taskType
    });

    return task;
  }

  /**
   * Resume paused task
   * @param {string} taskId - Task UUID
   * @returns {Promise<BackgroundTask>}
   */
  static async resumeTask(taskId) {
    const task = await BackgroundTask.findByPk(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    await task.resume();

    logger.info(`Background task resumed: ${taskId}`, {
      taskId,
      taskType: task.taskType
    });

    return task;
  }

  /**
   * Get task statistics
   * @param {string} userId - User ID (optional)
   * @param {string} timeframe - Time frame (1h, 24h, 7d, 30d)
   * @returns {Promise<Object>}
   */
  static async getTaskStats(userId = null, timeframe = '24h') {
    const stats = await BackgroundTask.getTaskStats(userId, timeframe);

    // Process stats into a more useful format
    const processed = {
      total: 0,
      byStatus: {},
      byType: {},
      avgDuration: 0,
      totalDuration: 0
    };

    stats.forEach((stat) => {
      const count = parseInt(stat.count);
      const avgDuration = parseFloat(stat.avgDuration) || 0;

      processed.total += count;
      processed.byStatus[stat.status] =
        (processed.byStatus[stat.status] || 0) + count;
      processed.byType[stat.taskType] =
        (processed.byType[stat.taskType] || 0) + count;
      processed.totalDuration += avgDuration * count;
    });

    processed.avgDuration =
      processed.total > 0 ? processed.totalDuration / processed.total : 0;

    return processed;
  }

  /**
   * Bulk operations on tasks
   * @param {string[]} taskIds - Array of task IDs
   * @param {string} operation - Operation (cancel, retry, delete)
   * @param {Object} options - Operation options
   * @returns {Promise<Object>}
   */
  static async bulkOperation(taskIds, operation, options = {}) {
    const results = {
      success: [],
      failed: [],
      total: taskIds.length
    };

    for (const taskId of taskIds) {
      try {
        let result;
        switch (operation) {
        case 'cancel':
          result = await this.cancelTask(taskId, options.reason);
          break;
        case 'retry':
          result = await this.retryTask(taskId);
          break;
        case 'delete':
          result = await BackgroundTask.destroy({
            where: { id: taskId },
            force: true
          });
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
        }
        results.success.push({ taskId, result });
      } catch (error) {
        results.failed.push({ taskId, error: error.message });
      }
    }

    logger.info(`Bulk operation completed: ${operation}`, {
      operation,
      total: results.total,
      success: results.success.length,
      failed: results.failed.length
    });

    return results;
  }

  /**
   * Cleanup old completed/failed tasks
   * @param {number} daysOld - Days old threshold
   * @returns {Promise<number>}
   */
  static async cleanupOldTasks(daysOld = 30) {
    const deletedCount = await BackgroundTask.cleanupOldTasks(daysOld);

    logger.info(`Cleaned up old background tasks`, {
      deletedCount,
      daysOld
    });

    return deletedCount;
  }

  /**
   * Handle timed out tasks
   * @returns {Promise<BackgroundTask[]>}
   */
  static async handleTimeouts() {
    const timeoutTasks = await BackgroundTask.scope('overdue').findAll();

    const results = [];
    for (const task of timeoutTasks) {
      try {
        task.status = 'timeout';
        await task.save();
        await task.addLog('error', 'Task timed out');
        results.push(task);
      } catch (error) {
        logger.error(`Error handling timeout for task ${task.id}:`, error);
      }
    }

    if (results.length > 0) {
      logger.warn(`Handled ${results.length} timed out tasks`);
    }

    return results;
  }
}

module.exports = BackgroundTaskService;
