const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map client connections to user IDs
    this.heartbeatInterval = 30000; // 30 seconds
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Start heartbeat interval
    setInterval(() => {
      this.checkConnections();
    }, this.heartbeatInterval);

    logger.info('WebSocket server initialized');
  }

  handleConnection(ws, req) {
    // Extract token from query string
    const url = new URL(req.url, 'ws://localhost');
    const token = url.searchParams.get('token');

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      // Store client connection with timestamp
      this.clients.set(ws, {
        userId,
        lastPing: Date.now()
      });

      // Handle incoming messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'ping') {
            this.handlePing(ws);
          }
        } catch (error) {
          logger.error('Error handling WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        logger.info(`Client disconnected: ${userId}`);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket client error:', error);
        this.clients.delete(ws);
      });

      // Send initial connection success message
      ws.send(JSON.stringify({
        type: 'connection_established',
        timestamp: Date.now()
      }));

    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      ws.terminate();
    }
  }

  handlePing(ws) {
    const client = this.clients.get(ws);
    if (client) {
      client.lastPing = Date.now();
      ws.send(JSON.stringify({ type: 'pong' }));
    }
  }

  checkConnections() {
    const now = Date.now();
    this.wss?.clients.forEach((ws) => {
      const client = this.clients.get(ws);
      if (client && now - client.lastPing > this.heartbeatInterval * 2) {
        logger.warn(`Client ${client.userId} timed out, terminating connection`);
        ws.terminate();
        this.clients.delete(ws);
      }
    });
  }

  broadcastToUser(userId, eventType, data) {
    this.wss?.clients.forEach((ws) => {
      const client = this.clients.get(ws);
      if (client?.userId === userId && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({
            type: eventType,
            data,
            timestamp: Date.now()
          }));
        } catch (error) {
          logger.error(`Error sending message to user ${userId}:`, error);
        }
      }
    });
  }

  broadcastToAll(eventType, data) {
    this.wss?.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({
            type: eventType,
            data,
            timestamp: Date.now()
          }));
        } catch (error) {
          logger.error('Error broadcasting message:', error);
          // Remove client if sending fails
          this.clients.delete(ws);
          ws.terminate();
        }
      }
    });
  }

  notifyOrderUpdate(order) {
    this.broadcastToAll('ORDER_UPDATED', { order });
  }

  notifyNewOrder(order) {
    this.broadcastToAll('ORDER_CREATED', { order });
  }

  notifyOrderCancellation(order) {
    this.broadcastToAll('ORDER_CANCELLED', { order });
  }

  notifyPlatformStatusChange(platform) {
    this.broadcastToAll('PLATFORM_STATUS_CHANGED', { platform });
  }

  shutdown() {
    if (this.wss) {
      this.wss.clients.forEach((ws) => {
        ws.terminate();
      });
      this.wss.close(() => {
        logger.info('WebSocket server shut down');
      });
    }
  }
}

// Create a singleton instance
const wsService = new WebSocketService();

module.exports = wsService;