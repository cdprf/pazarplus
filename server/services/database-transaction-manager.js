/**
 * Database Transaction Manager
 * Handles SQLite database transaction monitoring, queueing, and user control
 */
const EventEmitter = require("events");
const logger = require("../utils/logger");
const { sequelize } = require("../models");

class DatabaseTransactionManager extends EventEmitter {
  constructor() {
    super();
    this.activeTransactions = new Map();
    this.transactionQueue = [];
    this.isDatabaseBusy = false;
    this.maxConcurrentTransactions = 3;
    this.busyTimeout = 30000; // 30 seconds
    this.userInteractions = new Map();
    this.pausedOperations = new Map();
  }

  /**
   * Register a new transaction operation
   */
  async registerTransaction(operationId, metadata = {}) {
    const transaction = {
      id: operationId,
      startTime: Date.now(),
      status: "pending",
      metadata,
      retryCount: 0,
      maxRetries: 3,
    };

    this.activeTransactions.set(operationId, transaction);

    // Emit transaction registered event
    this.emit("transactionRegistered", transaction);

    logger.info(`Transaction registered: ${operationId}`, metadata);
    return transaction;
  }

  /**
   * Execute a database operation with transaction management
   */
  async executeWithTransactionControl(operationId, operationFn, options = {}) {
    const transaction = this.activeTransactions.get(operationId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${operationId}`);
    }

    const { userControlled = true, pausable = true } = options;

    try {
      // Check if database is busy before starting
      if (this.isDatabaseBusy && userControlled) {
        return await this.handleDatabaseBusy(operationId, operationFn, options);
      }

      // Check if operation is paused
      if (this.pausedOperations.has(operationId)) {
        return await this.waitForResume(operationId, operationFn, options);
      }

      // Check concurrent transaction limit
      const activeCount = Array.from(this.activeTransactions.values()).filter(
        (t) => t.status === "running"
      ).length;

      if (activeCount >= this.maxConcurrentTransactions) {
        return await this.queueOperation(operationId, operationFn, options);
      }

      // Mark transaction as running
      transaction.status = "running";
      transaction.startTime = Date.now();
      this.emit("transactionStarted", transaction);

      // Execute the operation
      const result = await this.executeOperation(operationId, operationFn);

      // Mark as completed
      transaction.status = "completed";
      transaction.endTime = Date.now();
      transaction.duration = transaction.endTime - transaction.startTime;
      this.emit("transactionCompleted", transaction);

      return result;
    } catch (error) {
      return await this.handleTransactionError(
        operationId,
        error,
        operationFn,
        options
      );
    } finally {
      // Clean up completed transaction after a delay
      setTimeout(() => {
        this.activeTransactions.delete(operationId);
        this.emit("transactionCleaned", { id: operationId });
      }, 5000);
    }
  }

  /**
   * Handle database busy state with user interaction
   */
  async handleDatabaseBusy(operationId, operationFn, options) {
    const transaction = this.activeTransactions.get(operationId);
    transaction.status = "waiting_for_user";

    // Check if user interaction already exists for this operation type
    const operationType = transaction.metadata.operationType || "unknown";
    const existingInteraction = this.userInteractions.get(operationType);

    if (existingInteraction) {
      // Wait for existing user decision
      return await this.waitForUserDecision(operationId, existingInteraction);
    }

    // Create new user interaction
    const userInteraction = {
      id: `ui_${Date.now()}`,
      operationType,
      operationId,
      status: "pending_user_input",
      busyTransactions: this.getBusyTransactions(),
      options: {
        canWait: true,
        canForceClose: true,
        canQueue: true,
      },
      createdAt: Date.now(),
    };

    this.userInteractions.set(operationType, userInteraction);

    // Emit event for frontend to show modal
    this.emit("databaseBusyUserInput", {
      interaction: userInteraction,
      transaction,
      busyDetails: this.getDatabaseBusyDetails(),
    });

    // Wait for user decision with timeout
    return await this.waitForUserDecision(operationId, userInteraction);
  }

  /**
   * Wait for user decision on database busy state
   */
  async waitForUserDecision(operationId, userInteraction) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Default action after timeout - queue the operation
        this.handleUserDecision(userInteraction.id, "queue");
        resolve(this.queueOperation(operationId));
      }, this.busyTimeout);

      // Listen for user decision
      const handleDecision = (decision) => {
        if (decision.interactionId === userInteraction.id) {
          clearTimeout(timeout);
          this.removeListener("userDecision", handleDecision);

          switch (decision.action) {
            case "wait":
              resolve(this.waitAndRetry(operationId));
              break;
            case "force_close":
              resolve(this.forceCloseAndExecute(operationId));
              break;
            case "queue":
              resolve(this.queueOperation(operationId));
              break;
            case "cancel":
              this.activeTransactions.get(operationId).status = "cancelled";
              reject(new Error("Operation cancelled by user"));
              break;
            default:
              reject(new Error(`Unknown user decision: ${decision.action}`));
          }
        }
      };

      this.on("userDecision", handleDecision);
    });
  }

  /**
   * Handle user decision from frontend
   */
  handleUserDecision(interactionId, action, options = {}) {
    const interaction = Array.from(this.userInteractions.values()).find(
      (ui) => ui.id === interactionId
    );

    if (!interaction) {
      logger.warn(`User interaction not found: ${interactionId}`);
      return;
    }

    interaction.status = "decided";
    interaction.decision = action;
    interaction.decidedAt = Date.now();

    // Emit decision event
    this.emit("userDecision", {
      interactionId,
      action,
      options,
      interaction,
    });

    // Clean up interaction
    setTimeout(() => {
      this.userInteractions.delete(interaction.operationType);
    }, 1000);

    logger.info(
      `User decision received for ${interactionId}: ${action}`,
      options
    );
  }

  /**
   * Execute operation with SQLite busy detection
   */
  async executeOperation(operationId, operationFn) {
    const transaction = this.activeTransactions.get(operationId);

    try {
      const result = await operationFn();
      return result;
    } catch (error) {
      // Check if it's a SQLite busy error
      if (this.isSQLiteBusyError(error)) {
        this.isDatabaseBusy = true;
        transaction.busyCount = (transaction.busyCount || 0) + 1;

        // Emit database busy event
        this.emit("databaseBusy", {
          operationId,
          error: error.message,
          transaction,
          busyCount: transaction.busyCount,
        });

        // Auto-recovery after a short delay if no user interaction needed
        setTimeout(() => {
          this.isDatabaseBusy = false;
          this.emit("databaseRecovered");
        }, 5000);
      }

      throw error;
    }
  }

  /**
   * Check if error is SQLite busy error
   */
  isSQLiteBusyError(error) {
    const busyIndicators = [
      "database is locked",
      "SQLITE_BUSY",
      "SQLITE_LOCKED",
      "database busy",
      "cannot start a transaction within a transaction",
    ];

    return busyIndicators.some((indicator) =>
      error.message.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Force close existing transactions and execute
   */
  async forceCloseAndExecute(operationId) {
    logger.warn(
      `Force closing database transactions for operation: ${operationId}`
    );

    try {
      // Close all active Sequelize transactions
      const activeConnections =
        sequelize.connectionManager.pool._allObjects || [];

      for (const connection of activeConnections) {
        try {
          if (connection.inTransaction) {
            await connection.rollback();
            logger.info("Rolled back active transaction");
          }
        } catch (rollbackError) {
          logger.warn("Error rolling back transaction:", rollbackError.message);
        }
      }

      // Mark other transactions as interrupted
      for (const [id, transaction] of this.activeTransactions) {
        if (id !== operationId && transaction.status === "running") {
          transaction.status = "interrupted";
          this.emit("transactionInterrupted", transaction);
        }
      }

      // Reset busy state
      this.isDatabaseBusy = false;

      // Retry the operation
      return await this.retryOperation(operationId);
    } catch (error) {
      logger.error("Error during force close:", error);
      throw error;
    }
  }

  /**
   * Wait and retry operation
   */
  async waitAndRetry(operationId) {
    const transaction = this.activeTransactions.get(operationId);
    transaction.status = "waiting";

    // Wait for database to become available
    return new Promise((resolve, reject) => {
      const checkAvailability = async () => {
        if (!this.isDatabaseBusy) {
          try {
            const result = await this.retryOperation(operationId);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        } else {
          // Check again in 2 seconds
          setTimeout(checkAvailability, 2000);
        }
      };

      setTimeout(checkAvailability, 1000);
    });
  }

  /**
   * Queue operation for later execution
   */
  async queueOperation(operationId, operationFn, options) {
    const transaction = this.activeTransactions.get(operationId);
    transaction.status = "queued";

    this.transactionQueue.push({
      operationId,
      operationFn,
      options,
      queuedAt: Date.now(),
    });

    this.emit("operationQueued", {
      operationId,
      queuePosition: this.transactionQueue.length,
    });

    // Process queue when database becomes available
    this.processQueueWhenAvailable();

    return { queued: true, position: this.transactionQueue.length };
  }

  /**
   * Process queued operations when database becomes available
   */
  async processQueueWhenAvailable() {
    if (this.isDatabaseBusy || this.transactionQueue.length === 0) {
      return;
    }

    const queuedOperation = this.transactionQueue.shift();
    if (queuedOperation) {
      try {
        await this.executeWithTransactionControl(
          queuedOperation.operationId,
          queuedOperation.operationFn,
          queuedOperation.options
        );
      } catch (error) {
        logger.error(
          `Queued operation failed: ${queuedOperation.operationId}`,
          error
        );
      }

      // Process next in queue
      setTimeout(() => this.processQueueWhenAvailable(), 100);
    }
  }

  /**
   * Retry operation
   */
  async retryOperation(operationId) {
    const transaction = this.activeTransactions.get(operationId);

    if (transaction.retryCount >= transaction.maxRetries) {
      transaction.status = "failed";
      throw new Error(
        `Operation failed after ${transaction.maxRetries} retries`
      );
    }

    transaction.retryCount++;
    transaction.status = "retrying";

    // Exponential backoff
    const delay = Math.pow(2, transaction.retryCount) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Execute operation again
    return await this.executeOperation(operationId, transaction.operationFn);
  }

  /**
   * Pause operation
   */
  pauseOperation(operationId) {
    const transaction = this.activeTransactions.get(operationId);
    if (transaction) {
      transaction.status = "paused";
      this.pausedOperations.set(operationId, Date.now());
      this.emit("operationPaused", { operationId });
    }
  }

  /**
   * Resume operation
   */
  resumeOperation(operationId) {
    if (this.pausedOperations.has(operationId)) {
      this.pausedOperations.delete(operationId);
      const transaction = this.activeTransactions.get(operationId);
      if (transaction) {
        transaction.status = "pending";
        this.emit("operationResumed", { operationId });
      }
    }
  }

  /**
   * Wait for operation to be resumed
   */
  async waitForResume(operationId, operationFn, options) {
    return new Promise((resolve) => {
      const checkResume = () => {
        if (!this.pausedOperations.has(operationId)) {
          resolve(
            this.executeWithTransactionControl(
              operationId,
              operationFn,
              options
            )
          );
        } else {
          setTimeout(checkResume, 1000);
        }
      };
      checkResume();
    });
  }

  /**
   * Handle transaction error
   */
  async handleTransactionError(operationId, error, operationFn, options) {
    const transaction = this.activeTransactions.get(operationId);

    if (this.isSQLiteBusyError(error)) {
      transaction.status = "busy_error";
      transaction.lastError = error.message;

      // Handle busy error based on user preference
      if (options.userControlled !== false) {
        return await this.handleDatabaseBusy(operationId, operationFn, options);
      } else {
        // Auto-retry with backoff
        return await this.retryOperation(operationId);
      }
    } else {
      transaction.status = "error";
      transaction.lastError = error.message;
      this.emit("transactionError", { operationId, error, transaction });
      throw error;
    }
  }

  /**
   * Get busy transactions
   */
  getBusyTransactions() {
    return Array.from(this.activeTransactions.values()).filter(
      (t) => t.status === "running" || t.status === "busy_error"
    );
  }

  /**
   * Get database busy details
   */
  getDatabaseBusyDetails() {
    return {
      isDatabaseBusy: this.isDatabaseBusy,
      activeTransactionCount: this.activeTransactions.size,
      queuedOperationCount: this.transactionQueue.length,
      busyTransactions: this.getBusyTransactions(),
      longestRunningTransaction: this.getLongestRunningTransaction(),
    };
  }

  /**
   * Get longest running transaction
   */
  getLongestRunningTransaction() {
    const runningTransactions = Array.from(
      this.activeTransactions.values()
    ).filter((t) => t.status === "running");

    if (runningTransactions.length === 0) return null;

    return runningTransactions.reduce((longest, current) =>
      current.startTime < longest.startTime ? current : longest
    );
  }

  /**
   * Get status for frontend
   */
  getStatus() {
    return {
      isDatabaseBusy: this.isDatabaseBusy,
      activeTransactions: Array.from(this.activeTransactions.values()),
      queuedOperations: this.transactionQueue.length,
      pausedOperations: this.pausedOperations.size,
      userInteractions: Array.from(this.userInteractions.values()),
    };
  }

  /**
   * Cancel operation
   */
  cancelOperation(operationId) {
    const transaction = this.activeTransactions.get(operationId);
    if (transaction) {
      transaction.status = "cancelled";
      this.activeTransactions.delete(operationId);
      this.emit("operationCancelled", { operationId });
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.activeTransactions.clear();
    this.transactionQueue.length = 0;
    this.pausedOperations.clear();
    this.userInteractions.clear();
    this.removeAllListeners();
  }
}

module.exports = new DatabaseTransactionManager();
