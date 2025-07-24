import logger from "../utils/logger";
/**
 * Order History - Undo/Redo system for order operations
 * Implements Command Pattern for order history management
 */

class OrderCommand {
  constructor(type, data, previousData = null) {
    this.type = type;
    this.data = data;
    this.previousData = previousData;
    this.timestamp = Date.now();
    this.id = `${type}_${this.timestamp}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  execute() {
    // Override in subclasses
  }

  undo() {
    // Override in subclasses
  }

  canUndo() {
    return this.previousData !== null;
  }

  canRedo() {
    return true;
  }
}

class CreateOrderCommand extends OrderCommand {
  constructor(orderData) {
    super("CREATE_ORDER", orderData);
  }

  execute() {
    return {
      type: "CREATE_ORDER",
      data: this.data,
    };
  }

  undo() {
    return {
      type: "DELETE_ORDER",
      data: { id: this.data.id },
    };
  }
}

class UpdateOrderCommand extends OrderCommand {
  constructor(orderId, newData, previousData) {
    super("UPDATE_ORDER", { id: orderId, ...newData }, previousData);
  }

  execute() {
    return {
      type: "UPDATE_ORDER",
      data: this.data,
    };
  }

  undo() {
    return {
      type: "UPDATE_ORDER",
      data: { id: this.data.id, ...this.previousData },
    };
  }
}

class DeleteOrderCommand extends OrderCommand {
  constructor(orderData) {
    super("DELETE_ORDER", { id: orderData.id }, orderData);
  }

  execute() {
    return {
      type: "DELETE_ORDER",
      data: this.data,
    };
  }

  undo() {
    return {
      type: "CREATE_ORDER",
      data: this.previousData,
    };
  }
}

class BulkUpdateCommand extends OrderCommand {
  constructor(orderIds, updateData, previousDataMap) {
    super("BULK_UPDATE", { orderIds, updateData }, previousDataMap);
  }

  execute() {
    return {
      type: "BULK_UPDATE",
      data: this.data,
    };
  }

  undo() {
    return {
      type: "BULK_RESTORE",
      data: {
        orderIds: this.data.orderIds,
        previousDataMap: this.previousData,
      },
    };
  }
}

export class OrderHistory {
  constructor(maxHistorySize = 50) {
    this.maxHistorySize = maxHistorySize;
    this.undoStack = [];
    this.redoStack = [];
    this.currentBatch = null;
    this.batchTimeout = null;
    this.listeners = new Set();
  }

  /**
   * Add a listener for history changes
   */
  addListener(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of history changes
   */
  notifyListeners() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  /**
   * Get current history state
   */
  getState() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      lastCommand: this.undoStack[this.undoStack.length - 1] || null,
    };
  }

  /**
   * Start a batch of commands that should be treated as one operation
   */
  startBatch(description = "Batch operation") {
    this.currentBatch = {
      commands: [],
      description,
      startTime: Date.now(),
    };
  }

  /**
   * End the current batch
   */
  endBatch() {
    if (this.currentBatch && this.currentBatch.commands.length > 0) {
      const batchCommand = new BatchCommand(
        this.currentBatch.commands,
        this.currentBatch.description
      );
      this.addToHistory(batchCommand);
    }
    this.currentBatch = null;
  }

  /**
   * Auto-batch commands that happen quickly in succession
   */
  autoBatch(command) {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    if (!this.currentBatch) {
      this.startBatch("Auto batch");
    }

    this.currentBatch.commands.push(command);

    this.batchTimeout = setTimeout(() => {
      this.endBatch();
      this.batchTimeout = null;
    }, 500); // 500ms batch window
  }

  /**
   * Execute a command and add it to history
   */
  executeCommand(command) {
    try {
      const result = command.execute();

      if (this.currentBatch) {
        this.currentBatch.commands.push(command);
      } else {
        // Auto-batch similar commands
        const lastCommand = this.undoStack[this.undoStack.length - 1];
        if (lastCommand && this.shouldAutoBatch(lastCommand, command)) {
          this.autoBatch(command);
        } else {
          this.addToHistory(command);
        }
      }

      this.notifyListeners();
      return result;
    } catch (error) {
      logger.error("Failed to execute command:", error);
      throw error;
    }
  }

  /**
   * Check if two commands should be auto-batched
   */
  shouldAutoBatch(lastCommand, newCommand) {
    // Batch similar consecutive operations
    if (lastCommand.type === newCommand.type) {
      const timeDiff = newCommand.timestamp - lastCommand.timestamp;
      return timeDiff < 2000; // 2 seconds
    }
    return false;
  }

  /**
   * Add command to history stack
   */
  addToHistory(command) {
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo stack when new command is added

    // Maintain max history size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  /**
   * Create and execute a create order command
   */
  createOrder(orderData) {
    const command = new CreateOrderCommand(orderData);
    return this.executeCommand(command);
  }

  /**
   * Create and execute an update order command
   */
  updateOrder(orderId, newData, previousData) {
    const command = new UpdateOrderCommand(orderId, newData, previousData);
    return this.executeCommand(command);
  }

  /**
   * Create and execute a delete order command
   */
  deleteOrder(orderData) {
    const command = new DeleteOrderCommand(orderData);
    return this.executeCommand(command);
  }

  /**
   * Create and execute a bulk update command
   */
  bulkUpdate(orderIds, updateData, previousDataMap) {
    const command = new BulkUpdateCommand(
      orderIds,
      updateData,
      previousDataMap
    );
    return this.executeCommand(command);
  }

  /**
   * Undo the last command
   */
  undo() {
    if (!this.canUndo()) {
      throw new Error("Nothing to undo");
    }

    const command = this.undoStack.pop();

    try {
      const result = command.undo();
      this.redoStack.push(command);
      this.notifyListeners();
      return result;
    } catch (error) {
      // Restore command to undo stack if undo fails
      this.undoStack.push(command);
      logger.error("Failed to undo command:", error);
      throw error;
    }
  }

  /**
   * Redo the last undone command
   */
  redo() {
    if (!this.canRedo()) {
      throw new Error("Nothing to redo");
    }

    const command = this.redoStack.pop();

    try {
      const result = command.execute();
      this.undoStack.push(command);
      this.notifyListeners();
      return result;
    } catch (error) {
      // Restore command to redo stack if redo fails
      this.redoStack.push(command);
      logger.error("Failed to redo command:", error);
      throw error;
    }
  }

  /**
   * Check if undo is possible
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is possible
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all history
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.currentBatch = null;
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.notifyListeners();
  }

  /**
   * Get history summary for debugging
   */
  getHistorySummary() {
    return {
      undoStack: this.undoStack.map((cmd) => ({
        type: cmd.type,
        timestamp: cmd.timestamp,
        id: cmd.id,
      })),
      redoStack: this.redoStack.map((cmd) => ({
        type: cmd.type,
        timestamp: cmd.timestamp,
        id: cmd.id,
      })),
      currentBatch: this.currentBatch
        ? {
            description: this.currentBatch.description,
            commandCount: this.currentBatch.commands.length,
            startTime: this.currentBatch.startTime,
          }
        : null,
    };
  }

  /**
   * Export history for persistence
   */
  exportHistory() {
    return {
      undoStack: this.undoStack.map((cmd) => ({
        type: cmd.type,
        data: cmd.data,
        previousData: cmd.previousData,
        timestamp: cmd.timestamp,
        id: cmd.id,
      })),
      redoStack: this.redoStack.map((cmd) => ({
        type: cmd.type,
        data: cmd.data,
        previousData: cmd.previousData,
        timestamp: cmd.timestamp,
        id: cmd.id,
      })),
    };
  }

  /**
   * Import history from persistence
   */
  importHistory(historyData) {
    try {
      this.clear();

      // Reconstruct commands from serialized data
      this.undoStack = historyData.undoStack.map((cmdData) =>
        this.reconstructCommand(cmdData)
      );

      this.redoStack = historyData.redoStack.map((cmdData) =>
        this.reconstructCommand(cmdData)
      );

      this.notifyListeners();
    } catch (error) {
      logger.error("Failed to import history:", error);
      this.clear();
    }
  }

  /**
   * Reconstruct command from serialized data
   */
  reconstructCommand(cmdData) {
    switch (cmdData.type) {
      case "CREATE_ORDER":
        return new CreateOrderCommand(cmdData.data);
      case "UPDATE_ORDER":
        return new UpdateOrderCommand(
          cmdData.data.id,
          cmdData.data,
          cmdData.previousData
        );
      case "DELETE_ORDER":
        return new DeleteOrderCommand(cmdData.previousData);
      case "BULK_UPDATE":
        return new BulkUpdateCommand(
          cmdData.data.orderIds,
          cmdData.data.updateData,
          cmdData.previousData
        );
      default:
        throw new Error(`Unknown command type: ${cmdData.type}`);
    }
  }
}

/**
 * Batch command for grouping multiple commands
 */
class BatchCommand extends OrderCommand {
  constructor(commands, description) {
    super("BATCH", { commands, description });
    this.commands = commands;
    this.description = description;
  }

  execute() {
    const results = [];
    for (const command of this.commands) {
      results.push(command.execute());
    }
    return {
      type: "BATCH",
      results,
      description: this.description,
    };
  }

  undo() {
    const results = [];
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      results.push(this.commands[i].undo());
    }
    return {
      type: "BATCH_UNDO",
      results,
      description: this.description,
    };
  }

  canUndo() {
    return this.commands.every((cmd) => cmd.canUndo());
  }
}

// Export command classes for external use
export {
  OrderCommand,
  CreateOrderCommand,
  UpdateOrderCommand,
  DeleteOrderCommand,
  BulkUpdateCommand,
  BatchCommand,
};
