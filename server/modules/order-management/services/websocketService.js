const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../../../utils/logger');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map client connections to user IDs
    this.heartbeatInterval = 30000; // 30 seconds
    this.clientStates = new Map(); // Track client subscription states
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
    const url = new URL(req.url, 'ws://localhost');
    const token = url.searchParams.get('token');

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      // Store client connection with timestamp and subscription state
      this.clients.set(ws, {
        userId,
        lastPing: Date.now()
      });

      this.clientStates.set(ws, {
        subscriptions: new Set(),
        filters: new Map()
      });

      // Handle incoming messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          switch (data.type) {
            case 'ping':
              this.handlePing(ws);
              break;
            case 'subscribe':
              this.handleSubscribe(ws, data.events, data.filters);
              break;
            case 'unsubscribe':
              this.handleUnsubscribe(ws, data.events);
              break;
            default:
              logger.warn(`Unknown message type received: ${data.type}`);
          }
        } catch (error) {
          logger.error('Error handling WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.cleanupClient(ws);
        logger.info(`Client disconnected: ${userId}`);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket client error:', error);
        this.cleanupClient(ws);
        
        try {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Internal server error',
            timestamp: Date.now()
          }));
        } catch (sendError) {
          logger.error('Error sending error message to client:', sendError);
        }
        
        ws.terminate();
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
      this.sendMessage(ws, 'pong');
    }
  }

  handleSubscribe(ws, events, filters = {}) {
    const state = this.clientStates.get(ws);
    if (state) {
      events.forEach(event => {
        state.subscriptions.add(event);
        if (filters[event]) {
          state.filters.set(event, filters[event]);
        }
      });
      this.sendMessage(ws, 'subscription_confirmed', { events });
    }
  }

  handleUnsubscribe(ws, events) {
    const state = this.clientStates.get(ws);
    if (state) {
      events.forEach(event => {
        state.subscriptions.delete(event);
        state.filters.delete(event);
      });
      this.sendMessage(ws, 'unsubscription_confirmed', { events });
    }
  }

  checkConnections() {
    const now = Date.now();
    this.wss?.clients.forEach((ws) => {
      const client = this.clients.get(ws);
      if (client && now - client.lastPing > this.heartbeatInterval * 2) {
        logger.warn(`Client ${client.userId} timed out, terminating connection`);
        this.cleanupClient(ws);
        ws.terminate();
      }
    });
  }

  cleanupClient(ws) {
    this.clients.delete(ws);
    this.clientStates.delete(ws);
  }

  sendMessage(ws, type, data = null) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type,
          data,
          timestamp: Date.now()
        }));
      } catch (error) {
        logger.error('Error sending message:', error);
        this.cleanupClient(ws);
        ws.terminate();
      }
    }
  }

  sendError(ws, message) {
    this.sendMessage(ws, 'error', { message });
  }

  broadcastToUser(userId, eventType, data) {
    this.wss?.clients.forEach((ws) => {
      const client = this.clients.get(ws);
      const state = this.clientStates.get(ws);
      
      if (client?.userId === userId && 
          ws.readyState === WebSocket.OPEN &&
          state?.subscriptions.has(eventType)) {
        
        // Apply filters if they exist
        const filters = state.filters.get(eventType);
        if (filters && !this.matchesFilters(data, filters)) {
          return;
        }

        this.sendMessage(ws, eventType, data);
      }
    });
  }

  broadcastToAll(eventType, data) {
    this.wss?.clients.forEach((ws) => {
      const state = this.clientStates.get(ws);
      
      if (ws.readyState === WebSocket.OPEN &&
          state?.subscriptions.has(eventType)) {
        
        // Apply filters if they exist
        const filters = state.filters.get(eventType);
        if (filters && !this.matchesFilters(data, filters)) {
          return;
        }

        this.sendMessage(ws, eventType, data);
      }
    });
  }

  matchesFilters(data, filters) {
    return Object.entries(filters).every(([key, value]) => {
      const path = key.split('.');
      let current = data;
      
      // Traverse nested object path
      for (const segment of path) {
        if (current === undefined || current === null) {
          return false;
        }
        current = current[segment];
      }
      
      // Handle array values
      if (Array.isArray(value)) {
        return value.includes(current);
      }
      
      return current === value;
    });
  }

  notifyOrderUpdate(order) {
    this.broadcastToAll('ORDER_UPDATED', { 
      order,
      updateType: 'status',
      timestamp: new Date().toISOString()
    });
  }

  notifyNewOrder(order) {
    this.broadcastToAll('ORDER_CREATED', { 
      order,
      timestamp: new Date().toISOString()
    });
  }

  notifyOrderCancellation(order) {
    this.broadcastToAll('ORDER_CANCELLED', { 
      order,
      timestamp: new Date().toISOString(),
      reason: order.cancellationReason
    });
  }

  notifyPlatformStatusChange(platform) {
    this.broadcastToAll('PLATFORM_STATUS_CHANGED', {
      platform,
      timestamp: new Date().toISOString(),
      previousStatus: platform.previous('status'),
      newStatus: platform.status
    });
  }

  notifyOrderSync(result) {
    this.broadcastToAll('ORDER_SYNC_COMPLETED', {
      result,
      timestamp: new Date().toISOString()
    });
  }

  shutdown() {
    if (this.wss) {
      this.wss.clients.forEach((ws) => {
        this.cleanupClient(ws);
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