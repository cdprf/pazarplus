const WebSocket = require('ws');
const EventEmitter = require('events');
const logger = require('../utils/logger');
const cacheService = require('./cache-service');

/**
 * Real-time Notification Service
 * Provides WebSocket-based real-time notifications for platform events
 */
class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.wss = null;
    this.clients = new Map();
    this.notificationQueue = [];
    this.isInitialized = false;
  }

  /**
   * Initialize notification service (without creating WebSocket server)
   * The unified WebSocket server will route connections to this service
   */
  initialize() {
    try {
      // No longer create WebSocket server here - handled by unified server
      this.isInitialized = true;
      logger.info('Real-time notification service initialized');

      // Process any queued notifications
      this.processQueuedNotifications();
    } catch (error) {
      logger.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  /**
   * Setup real-time notification handlers
   */
  setupRealTimeNotifications() {
    // This method sets up event listeners for real-time notifications
    // It's called after WebSocket server initialization

    // Listen for platform events and broadcast notifications
    this.on('order_updated', (orderData) => {
      this.notifyOrderStatusChange(orderData);
    });

    this.on('new_order', (orderData) => {
      this.notifyNewOrder(orderData);
    });

    this.on('inventory_low', (inventoryData) => {
      this.notifyLowInventory(inventoryData);
    });

    this.on('sync_completed', (syncData) => {
      this.notifySyncCompleted(syncData);
    });

    this.on('platform_error', (errorData) => {
      this.notifyPlatformError(errorData);
    });

    logger.info('Real-time notification handlers setup complete');
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, request) {
    const clientId = this.generateClientId();
    const userAgent = request.headers['user-agent'] || 'Unknown';
    const ip = request.socket.remoteAddress;

    logger.info(`New WebSocket connection: ${clientId}`, {
      userAgent,
      ip,
      timestamp: new Date()
    });

    // Store client information
    this.clients.set(clientId, {
      ws,
      connectedAt: new Date(),
      userAgent,
      ip,
      subscriptions: new Set(['all']), // Default subscription
      lastActivity: new Date()
    });

    // Setup message handlers
    ws.on('message', (message) => {
      this.handleMessage(clientId, message);
    });

    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket error for client ${clientId}:`, error);
      this.clients.delete(clientId);
    });

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connection_established',
      clientId,
      timestamp: new Date(),
      message: 'Connected to Pazar+ real-time notifications'
    });

    // Send recent notifications
    this.sendRecentNotifications(clientId);
  }

  /**
   * Handle incoming messages from clients
   */
  handleMessage(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {return;}

      client.lastActivity = new Date();

      const data = JSON.parse(message.toString());

      switch (data.type) {
      case 'subscribe':
        this.handleSubscription(clientId, data.channels || []);
        break;

      case 'unsubscribe':
        this.handleUnsubscription(clientId, data.channels || []);
        break;

      case 'ping':
        this.sendToClient(clientId, {
          type: 'pong',
          timestamp: new Date()
        });
        break;

      case 'get_notifications':
        this.sendRecentNotifications(clientId, data.limit || 10);
        break;

      default:
        logger.warn(
          `Unknown message type from client ${clientId}:`,
          data.type
        );
      }
    } catch (error) {
      logger.error(`Failed to handle message from client ${clientId}:`, error);
    }
  }

  /**
   * Handle client subscription to notification channels
   */
  handleSubscription(clientId, channels) {
    const client = this.clients.get(clientId);
    if (!client) {return;}

    const validChannels = [
      'all',
      'orders',
      'inventory',
      'sync',
      'conflicts',
      'platform_errors',
      'shipping',
      'payments'
    ];

    channels.forEach((channel) => {
      if (validChannels.includes(channel)) {
        client.subscriptions.add(channel);
      }
    });

    this.sendToClient(clientId, {
      type: 'subscription_updated',
      subscriptions: Array.from(client.subscriptions),
      timestamp: new Date()
    });

    logger.debug(`Client ${clientId} subscribed to channels:`, channels);
  }

  /**
   * Handle client unsubscription
   */
  handleUnsubscription(clientId, channels) {
    const client = this.clients.get(clientId);
    if (!client) {return;}

    channels.forEach((channel) => {
      client.subscriptions.delete(channel);
    });

    // Ensure 'all' subscription remains if no specific channels
    if (client.subscriptions.size === 0) {
      client.subscriptions.add('all');
    }

    this.sendToClient(clientId, {
      type: 'subscription_updated',
      subscriptions: Array.from(client.subscriptions),
      timestamp: new Date()
    });

    logger.debug(`Client ${clientId} unsubscribed from channels:`, channels);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      const duration = Date.now() - client.connectedAt.getTime();
      logger.info(`Client ${clientId} disconnected after ${duration}ms`);
      this.clients.delete(clientId);
    }
  }

  /**
   * Send notification to specific client
   */
  sendToClient(clientId, notification) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(notification));
      return true;
    } catch (error) {
      logger.error(`Failed to send notification to client ${clientId}:`, error);
      this.clients.delete(clientId);
      return false;
    }
  }

  /**
   * Helper method to safely serialize data and prevent circular references
   */
  safeSerialize(data) {
    try {
      // If data is a Sequelize instance, convert to plain object
      if (data && typeof data.get === 'function') {
        data = data.get({ plain: true });
      }

      // If data is an array, process each item
      if (Array.isArray(data)) {
        return data.map((item) => this.safeSerialize(item));
      }

      // If data is an object, process recursively
      if (data && typeof data === 'object') {
        const serialized = {};
        for (const [key, value] of Object.entries(data)) {
          // Skip circular reference properties and sensitive data
          if (
            key === 'user' ||
            key === 'User' ||
            key === 'dataValues' ||
            key === '_previousDataValues' ||
            key === 'password' ||
            key === 'token'
          ) {
            continue;
          }

          if (value && typeof value === 'object') {
            if (typeof value.get === 'function') {
              // Sequelize instance
              serialized[key] = value.get({ plain: true });
            } else if (Array.isArray(value)) {
              // Array of potentially Sequelize instances
              serialized[key] = value.map((item) =>
                item && typeof item.get === 'function'
                  ? item.get({ plain: true })
                  : item
              );
            } else {
              // Regular object - recursively serialize but limit depth
              serialized[key] = this.safeSerialize(value);
            }
          } else {
            serialized[key] = value;
          }
        }
        return serialized;
      }

      return data;
    } catch (error) {
      logger.error('Error serializing data for notification:', error);
      return { error: 'Failed to serialize data', type: typeof data };
    }
  }

  /**
   * Broadcast notification to all subscribed clients
   */
  broadcast(notification) {
    if (!this.isInitialized) {
      // Queue notification if service not initialized
      this.notificationQueue.push(notification);
      return;
    }

    // Safely serialize the notification data
    const safeNotification = {
      ...notification,
      data: this.safeSerialize(notification.data),
      timestamp: notification.timestamp || new Date()
    };

    const sentCount = { success: 0, failed: 0 };
    const channel = notification.channel || 'all';

    for (const [clientId, client] of this.clients) {
      // Check if client is subscribed to this channel
      if (
        client.subscriptions.has('all') ||
        client.subscriptions.has(channel)
      ) {
        const sent = this.sendToClient(clientId, safeNotification);

        if (sent) {
          sentCount.success++;
        } else {
          sentCount.failed++;
        }
      }
    }

    // Store notification for later retrieval
    this.storeNotification(safeNotification);

    logger.debug(
      `Broadcast notification sent to ${sentCount.success} clients, ${sentCount.failed} failed`
    );

    return sentCount;
  }

  /**
   * Send recent notifications to a client
   */
  async sendRecentNotifications(clientId, limit = 10) {
    try {
      const notifications = await this.getRecentNotifications(limit);

      this.sendToClient(clientId, {
        type: 'recent_notifications',
        notifications,
        count: notifications.length,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error(
        `Failed to send recent notifications to client ${clientId}:`,
        error
      );
    }
  }

  /**
   * Store notification for later retrieval
   */
  async storeNotification(notification) {
    try {
      const key = `notification:${Date.now()}:${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      await cacheService.set(key, notification, 24 * 60 * 60); // 24 hours TTL
    } catch (error) {
      logger.error('Failed to store notification:', error);
    }
  }

  /**
   * Get recent notifications from cache
   */
  async getRecentNotifications(limit = 50) {
    try {
      const keys = await cacheService.getKeys('notification:*');
      const notifications = [];

      // Sort keys by timestamp (newest first)
      const sortedKeys = keys.sort().reverse().slice(0, limit);

      for (const key of sortedKeys) {
        const notification = await cacheService.get(key);
        if (notification) {
          notifications.push({
            id: key,
            ...notification
          });
        }
      }

      return notifications;
    } catch (error) {
      logger.error('Failed to get recent notifications:', error);
      return [];
    }
  }

  /**
   * Process queued notifications
   */
  processQueuedNotifications() {
    if (this.notificationQueue.length === 0) {return;}

    logger.info(
      `Processing ${this.notificationQueue.length} queued notifications`
    );

    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      this.broadcast(notification);
    }
  }

  /**
   * Platform-specific notification methods
   */

  // Order notifications
  notifyOrderStatusChange(orderData) {
    this.broadcast({
      type: 'order_status_change',
      channel: 'orders',
      data: {
        orderNumber: orderData.orderNumber,
        platform: orderData.platform,
        oldStatus: orderData.oldStatus,
        newStatus: orderData.newStatus,
        customerName: orderData.customerName,
        totalAmount: orderData.totalAmount
      },
      priority: 'normal',
      requiresAction: false
    });
  }

  notifyNewOrder(orderData) {
    this.broadcast({
      type: 'new_order',
      channel: 'orders',
      data: {
        orderNumber: orderData.orderNumber,
        platform: orderData.platform,
        customerName: orderData.customerName,
        totalAmount: orderData.totalAmount,
        status: orderData.status
      },
      priority: 'high',
      requiresAction: true
    });
  }

  // Inventory notifications
  notifyLowInventory(inventoryData) {
    this.broadcast({
      type: 'low_inventory',
      channel: 'inventory',
      data: {
        sku: inventoryData.sku,
        productName: inventoryData.productName,
        currentQuantity: inventoryData.quantity,
        threshold: inventoryData.threshold,
        platforms: inventoryData.platforms
      },
      priority: 'high',
      requiresAction: true
    });
  }

  notifyInventorySync(syncData) {
    this.broadcast({
      type: 'inventory_synced',
      channel: 'inventory',
      data: {
        sku: syncData.sku,
        newQuantity: syncData.newQuantity,
        originPlatform: syncData.originPlatform,
        syncResults: syncData.syncResults
      },
      priority: 'normal',
      requiresAction: false
    });
  }

  // Sync notifications
  notifySyncCompleted(syncData) {
    this.broadcast({
      type: 'sync_completed',
      channel: 'sync',
      data: {
        totalProcessed: syncData.totalProcessed,
        duration: syncData.duration,
        conflicts: syncData.conflicts,
        platforms: syncData.platforms
      },
      priority: 'normal',
      requiresAction: false
    });
  }

  notifySyncError(errorData) {
    this.broadcast({
      type: 'sync_error',
      channel: 'sync',
      data: {
        platform: errorData.platform,
        error: errorData.error,
        connectionId: errorData.connectionId
      },
      priority: 'high',
      requiresAction: true
    });
  }

  // Conflict notifications
  notifyOrderConflict(conflictData) {
    this.broadcast({
      type: 'order_conflict',
      channel: 'conflicts',
      data: {
        orderNumber: conflictData.orderNumber,
        platforms: conflictData.platforms,
        conflictType: conflictData.conflictType,
        requiresAttention: conflictData.requiresAttention
      },
      priority: 'high',
      requiresAction: conflictData.requiresAttention
    });
  }

  notifyManualReviewRequired(reviewData) {
    this.broadcast({
      type: 'manual_review_required',
      channel: 'conflicts',
      data: {
        conflictId: reviewData.conflictId,
        orderNumber: reviewData.orderNumber,
        platforms: reviewData.platforms,
        conflictDetails: reviewData.conflict
      },
      priority: 'urgent',
      requiresAction: true
    });
  }

  // Platform error notifications
  notifyPlatformError(errorData) {
    this.broadcast({
      type: 'platform_error',
      channel: 'platform_errors',
      data: {
        platform: errorData.platform,
        connectionId: errorData.connectionId,
        error: errorData.error,
        apiEndpoint: errorData.endpoint,
        retryable: errorData.retryable
      },
      priority: 'high',
      requiresAction: !errorData.retryable
    });
  }

  // Shipping notifications
  notifyShippingUpdate(shippingData) {
    this.broadcast({
      type: 'shipping_update',
      channel: 'shipping',
      data: {
        orderNumber: shippingData.orderNumber,
        trackingNumber: shippingData.trackingNumber,
        carrier: shippingData.carrier,
        status: shippingData.status,
        location: shippingData.location
      },
      priority: 'normal',
      requiresAction: false
    });
  }

  // Payment notifications
  notifyPaymentUpdate(paymentData) {
    this.broadcast({
      type: 'payment_update',
      channel: 'payments',
      data: {
        orderNumber: paymentData.orderNumber,
        platform: paymentData.platform,
        paymentStatus: paymentData.status,
        amount: paymentData.amount,
        method: paymentData.method
      },
      priority: 'normal',
      requiresAction: paymentData.status === 'failed'
    });
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    const stats = {
      totalConnections: this.clients.size,
      connectionsBySubscription: {},
      averageUptime: 0,
      activeConnections: 0
    };

    let totalUptime = 0;
    const now = Date.now();

    for (const [clientId, client] of this.clients) {
      // Calculate uptime
      const uptime = now - client.connectedAt.getTime();
      totalUptime += uptime;

      // Count active connections (activity within last 5 minutes)
      const lastActivity = now - client.lastActivity.getTime();
      if (lastActivity < 5 * 60 * 1000) {
        stats.activeConnections++;
      }

      // Count subscriptions
      for (const subscription of client.subscriptions) {
        stats.connectionsBySubscription[subscription] =
          (stats.connectionsBySubscription[subscription] || 0) + 1;
      }
    }

    if (this.clients.size > 0) {
      stats.averageUptime = totalUptime / this.clients.size;
    }

    return stats;
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup inactive connections
   */
  cleanupInactiveConnections() {
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
    let cleanedCount = 0;

    for (const [clientId, client] of this.clients) {
      const lastActivity = now - client.lastActivity.getTime();

      if (lastActivity > inactiveThreshold) {
        try {
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.close();
          }
        } catch (error) {
          // Ignore close errors
        }

        this.clients.delete(clientId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} inactive WebSocket connections`);
    }
  }

  /**
   * Start periodic cleanup
   */
  startPeriodicCleanup() {
    // Cleanup every 10 minutes
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 10 * 60 * 1000);

    logger.info('WebSocket cleanup scheduler started');
  }

  /**
   * Shutdown notification service
   */
  shutdown() {
    logger.info('Shutting down notification service...');

    // Close all client connections
    for (const [clientId, client] of this.clients) {
      try {
        client.ws.close();
      } catch (error) {
        // Ignore close errors
      }
    }

    this.clients.clear();
    // No longer need to close WebSocket server - handled by unified server
    this.isInitialized = false;

    logger.info('Notification service shutdown complete');
  }
}

module.exports = new NotificationService();
