/**
 * Unified WebSocket Server
 * Handles all WebSocket connections with path-based routing
 * Fixes RSV1 frame errors and multiple server conflicts
 */
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const notificationService = require("./notification-service");
const databaseStatusWebSocket = require("./database-status-websocket");

class UnifiedWebSocketServer {
  constructor() {
    this.wss = null;
    this.isInitialized = false;
  }

  /**
   * Initialize unified WebSocket server
   */
  initialize(server) {
    try {
      // Create single WebSocket server without path restriction
      this.wss = new WebSocket.Server({
        server,
        // Don't specify path here - we'll handle routing manually
        verifyClient: (info) => {
          // Allow connections to specific WebSocket paths only
          const url = new URL(info.req.url, "ws://localhost");
          const pathname = url.pathname;
          const validPaths = ["/ws/notifications", "/ws/database-status"];

          if (!validPaths.includes(pathname)) {
            return false;
          }

          // For database status endpoint, require authentication
          if (pathname === "/ws/database-status") {
            const token = url.searchParams.get("token");
            if (!token) {
              return false; // Reject connection if no token
            }

            try {
              jwt.verify(token, process.env.JWT_SECRET);
              return true; // Token is valid
            } catch (error) {
              return false; // Invalid token
            }
          }

          return true; // Allow notifications endpoint without pre-auth
        },
      });

      this.wss.on("connection", (ws, req) => {
        this.handleConnection(ws, req);
      });

      this.wss.on("error", (error) => {
        logger.error("Unified WebSocket Server error:", error);
      });

      this.isInitialized = true;
      logger.info("Unified WebSocket server initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize unified WebSocket server:", error);
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection with path-based routing
   */
  handleConnection(ws, req) {
    try {
      const url = new URL(req.url, "ws://localhost");
      const pathname = url.pathname;

      logger.info(`WebSocket connection attempt to: ${pathname}`);

      // Route to appropriate handler based on path
      switch (pathname) {
        case "/ws/notifications":
          this.handleNotificationConnection(ws, req);
          break;
        case "/ws/database-status":
          this.handleDatabaseStatusConnection(ws, req);
          break;
        default:
          logger.warn(`Unknown WebSocket path: ${pathname}`);
          ws.close(1008, "Unknown path");
      }
    } catch (error) {
      logger.error("Error handling WebSocket connection:", error);
      ws.close(1011, "Internal server error");
    }
  }

  /**
   * Handle notification WebSocket connections
   */
  handleNotificationConnection(ws, req) {
    // Use existing notification service connection handler
    notificationService.handleConnection(ws, req);
  }

  /**
   * Handle database status WebSocket connections
   */
  handleDatabaseStatusConnection(ws, req) {
    // Use existing database status service connection handler
    databaseStatusWebSocket.handleConnection(ws, req);
  }

  /**
   * Send message to WebSocket client
   */
  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        logger.error("Failed to send WebSocket message:", error);
        return false;
      }
    }
    return false;
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown() {
    if (this.wss) {
      logger.info("Shutting down unified WebSocket server...");

      this.wss.clients.forEach((ws) => {
        try {
          ws.close();
        } catch (error) {
          // Ignore close errors
        }
      });

      this.wss.close();
      this.isInitialized = false;
      logger.info("Unified WebSocket server shutdown complete");
    }
  }
}

module.exports = new UnifiedWebSocketServer();
