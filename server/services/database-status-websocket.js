/**
 * Database Status WebSocket Service
 * Provides real-time updates about database transaction status
 */
let WebSocket;
let websocketEnabled = true;

try {
  WebSocket = require("ws");
} catch (error) {
  console.warn("WebSocket dependencies not available:", error.message);
  websocketEnabled = false;

  // Create fallback WebSocket implementation
  WebSocket = {
    Server: class {
      constructor() {}
      on() {}
      close() {}
    },
  };
}

const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const dbTransactionManager = require("./database-transaction-manager");

class DatabaseStatusWebSocketService {
  constructor() {
    if (!websocketEnabled) {
      logger.warn("WebSocket service disabled - dependencies not available");
      this.clients = new Set();
      return;
    }

    this.clients = new Set();
    this.setupTransactionManagerListeners();
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    try {
      logger.info("Initializing Database Status WebSocket server...");

      if (!server) {
        logger.warn(
          "No HTTP server provided, Database Status WebSocket will be initialized later"
        );
        return;
      }

      this.wss = new WebSocket.Server({
        server,
        path: "/ws/database-status",
      });

      this.wss.on("connection", (ws, req) => {
        logger.info(
          "Database Status WebSocket: New connection attempt received"
        );
        this.handleConnection(ws, req);
      });

      this.wss.on("error", (error) => {
        logger.error("Database Status WebSocket Server error:", error);
      });

      logger.info("Database Status WebSocket service initialized successfully");
    } catch (error) {
      logger.error(
        "Failed to initialize Database Status WebSocket server:",
        error
      );
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    try {
      // Extract token from query parameters
      const url = new URL(req.url, "ws://localhost");
      const token = url.searchParams.get("token");

      logger.info("Database status WebSocket connection attempt:", {
        url: req.url,
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        jwtSecret: !!process.env.JWT_SECRET,
      });

      if (!token) {
        logger.warn(
          "Database status WebSocket connection rejected: No token provided"
        );
        ws.close(1008, "Authentication required");
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      logger.info(
        `New database status WebSocket connection from user ${userId}`
      );

      // Store client information
      ws.userId = userId;
      ws.connectedAt = new Date();

      // Add client to set
      this.clients.add(ws);

      // Send initial status
      this.sendToClient(ws, {
        type: "initial_status",
        data: dbTransactionManager.getStatus(),
      });

      // Handle messages from client
      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          logger.error("Error parsing WebSocket message:", error);
          this.sendToClient(ws, {
            type: "error",
            message: "Invalid message format",
          });
        }
      });

      // Handle client disconnect
      ws.on("close", () => {
        this.clients.delete(ws);
        logger.info(
          `Database status WebSocket client disconnected: user ${userId}`
        );
      });

      // Handle errors
      ws.on("error", (error) => {
        logger.error("Database status WebSocket error:", error);
        this.clients.delete(ws);
      });
    } catch (error) {
      logger.error("Database status WebSocket authentication failed:", error);
      ws.close(1008, "Authentication failed");
    }
  }

  /**
   * Handle messages from client
   */
  handleClientMessage(ws, data) {
    switch (data.type) {
      case "subscribe_operation":
        this.subscribeToOperation(ws, data.operationId);
        break;
      case "unsubscribe_operation":
        this.unsubscribeFromOperation(ws, data.operationId);
        break;
      case "get_status":
        this.sendToClient(ws, {
          type: "status_update",
          data: dbTransactionManager.getStatus(),
        });
        break;
      default:
        logger.warn("Unknown WebSocket message type:", data.type);
    }
  }

  /**
   * Subscribe client to specific operation updates
   */
  subscribeToOperation(ws, operationId) {
    if (!ws.subscriptions) {
      ws.subscriptions = new Set();
    }
    ws.subscriptions.add(operationId);

    logger.info(`Client subscribed to operation: ${operationId}`);
  }

  /**
   * Unsubscribe client from operation updates
   */
  unsubscribeFromOperation(ws, operationId) {
    if (ws.subscriptions) {
      ws.subscriptions.delete(operationId);
    }

    logger.info(`Client unsubscribed from operation: ${operationId}`);
  }

  /**
   * Setup listeners for transaction manager events
   */
  setupTransactionManagerListeners() {
    // Transaction events
    dbTransactionManager.on("transactionRegistered", (transaction) => {
      this.broadcast({
        type: "transaction_registered",
        data: transaction,
      });
    });

    dbTransactionManager.on("transactionStarted", (transaction) => {
      this.broadcast(
        {
          type: "transaction_started",
          data: transaction,
        },
        transaction.id
      );
    });

    dbTransactionManager.on("transactionCompleted", (transaction) => {
      this.broadcast(
        {
          type: "transaction_completed",
          data: transaction,
        },
        transaction.id
      );
    });

    dbTransactionManager.on(
      "transactionError",
      ({ operationId, error, transaction }) => {
        this.broadcast(
          {
            type: "transaction_error",
            data: { operationId, error: error.message, transaction },
          },
          operationId
        );
      }
    );

    dbTransactionManager.on("transactionInterrupted", (transaction) => {
      this.broadcast(
        {
          type: "transaction_interrupted",
          data: transaction,
        },
        transaction.id
      );
    });

    // Database busy events
    dbTransactionManager.on("databaseBusy", (data) => {
      this.broadcast({
        type: "database_busy",
        data,
      });
    });

    dbTransactionManager.on("databaseRecovered", () => {
      this.broadcast({
        type: "database_recovered",
        data: { timestamp: Date.now() },
      });
    });

    // User interaction events
    dbTransactionManager.on("databaseBusyUserInput", (data) => {
      this.broadcast({
        type: "database_busy_user_input",
        data,
      });
    });

    dbTransactionManager.on("userDecision", (decision) => {
      this.broadcast({
        type: "user_decision_made",
        data: decision,
      });
    });

    // Operation events
    dbTransactionManager.on("operationQueued", (data) => {
      this.broadcast(
        {
          type: "operation_queued",
          data,
        },
        data.operationId
      );
    });

    dbTransactionManager.on("operationPaused", (data) => {
      this.broadcast(
        {
          type: "operation_paused",
          data,
        },
        data.operationId
      );
    });

    dbTransactionManager.on("operationResumed", (data) => {
      this.broadcast(
        {
          type: "operation_resumed",
          data,
        },
        data.operationId
      );
    });

    dbTransactionManager.on("operationCancelled", (data) => {
      this.broadcast(
        {
          type: "operation_cancelled",
          data,
        },
        data.operationId
      );
    });

    // Periodic status updates
    setInterval(() => {
      this.broadcast({
        type: "status_update",
        data: dbTransactionManager.getStatus(),
      });
    }, 5000); // Every 5 seconds
  }

  /**
   * Send message to specific client
   */
  sendToClient(client, message) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(
          JSON.stringify({
            ...message,
            timestamp: Date.now(),
          })
        );
      } catch (error) {
        logger.error("Error sending WebSocket message to client:", error);
        this.clients.delete(client);
      }
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message, operationId = null) {
    for (const client of this.clients) {
      // If operationId is specified, only send to subscribed clients
      if (
        operationId &&
        client.subscriptions &&
        !client.subscriptions.has(operationId)
      ) {
        continue;
      }

      this.sendToClient(client, message);
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      connectedClients: this.clients.size,
      totalSubscriptions: Array.from(this.clients).reduce((total, client) => {
        return total + (client.subscriptions ? client.subscriptions.size : 0);
      }, 0),
    };
  }

  /**
   * Close all connections
   */
  close() {
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }

    logger.info("Database Status WebSocket service closed");
  }
}

module.exports = new DatabaseStatusWebSocketService();
