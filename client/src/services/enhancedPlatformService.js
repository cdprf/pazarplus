import logger from "../utils/logger";
import io from "socket.io-client";
import apiClient from "./api";

/**
 * Enhanced Platform Integration Service
 * Provides client-side integration for Week 5-6 enhanced platform features
 * including real-time notifications, conflict resolution, and inventory management
 */
class EnhancedPlatformService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventListeners = new Map();
    this.notificationQueue = [];
    this.maxQueueSize = 100;

    // Auto-connect when service is instantiated
    this.connect();
  }

  /**
   * Get the correct server URL for WebSocket connection
   */
  getServerUrl() {
    if (process.env.NODE_ENV === "development") {
      const hostname = window.location.hostname;

      // If hostname is an IP address (mobile access), use the same IP for WebSocket
      if (hostname !== "localhost" && hostname !== "127.0.0.1") {
        return `http://${hostname}:5001`;
      }

      // Default to localhost for desktop development
      return process.env.REACT_APP_SERVER_URL || "http://localhost:5001";
    }
    return process.env.REACT_APP_SERVER_URL || "https://pazarplus.onrender.com";
  }

  /**
   * Establish WebSocket connection for real-time notifications
   */
  connect() {
    try {
      const serverUrl = this.getServerUrl();

      this.socket = io(serverUrl, {
        transports: ["websocket", "polling"],
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.setupSocketListeners();

      logger.info(
        "Enhanced Platform Service: Connecting to WebSocket server..."
      );
    } catch (error) {
      logger.error(
        "Enhanced Platform Service: Failed to connect to WebSocket:",
        error
      );
    }
  }

  /**
   * Setup WebSocket event listeners
   */
  setupSocketListeners() {
    this.socket.on("connect", () => {
      logger.info("Enhanced Platform Service: WebSocket connected");
      this.isConnected = true;
      this.emit("connectionStatusChanged", { connected: true });
    });

    this.socket.on("disconnect", () => {
      logger.info("Enhanced Platform Service: WebSocket disconnected");
      this.isConnected = false;
      this.emit("connectionStatusChanged", { connected: false });
    });

    this.socket.on("connect_error", (error) => {
      logger.error("Enhanced Platform Service: Connection error:", error);
      this.emit("connectionError", { error });
    });

    // Platform sync notifications
    this.socket.on("platform:syncCompleted", (data) => {
      this.handleNotification("syncCompleted", data);
    });

    this.socket.on("platform:syncStarted", (data) => {
      this.handleNotification("syncStarted", data);
    });

    this.socket.on("platform:syncProgress", (data) => {
      this.handleNotification("syncProgress", data);
    });

    // Conflict resolution notifications
    this.socket.on("platform:orderConflict", (data) => {
      this.handleNotification("orderConflict", data);
    });

    this.socket.on("platform:manualReviewRequired", (data) => {
      this.handleNotification("manualReviewRequired", data);
    });

    this.socket.on("platform:conflictResolved", (data) => {
      this.handleNotification("conflictResolved", data);
    });

    // Inventory notifications
    this.socket.on("inventory:updated", (data) => {
      this.handleNotification("inventoryUpdated", data);
    });

    this.socket.on("inventory:lowStock", (data) => {
      this.handleNotification("lowStock", data);
    });

    this.socket.on("inventory:healthIssues", (data) => {
      this.handleNotification("inventoryHealthIssues", data);
    });

    this.socket.on("inventory:reservationExpired", (data) => {
      this.handleNotification("reservationExpired", data);
    });

    // System notifications
    this.socket.on("system:notification", (data) => {
      this.handleNotification("systemNotification", data);
    });
  }

  /**
   * Handle incoming notifications
   */
  handleNotification(type, data) {
    const notification = {
      id: Date.now() + Math.random(),
      type,
      data,
      timestamp: new Date(),
      read: false,
    };

    // Add to queue
    this.notificationQueue.unshift(notification);

    // Maintain queue size
    if (this.notificationQueue.length > this.maxQueueSize) {
      this.notificationQueue = this.notificationQueue.slice(
        0,
        this.maxQueueSize
      );
    }

    // Emit to subscribers
    this.emit("notification", notification);
    this.emit(`notification:${type}`, notification);

    logger.info(
      `Enhanced Platform Service: Received ${type} notification:`,
      data
    );
  }

  /**
   * Subscribe to events
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Unsubscribe from events
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit events to subscribers
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          logger.error(
            `Enhanced Platform Service: Error in event listener for ${event}:`,
            error
          );
        }
      });
    }
  }

  /**
   * Get recent notifications
   */
  getNotifications(limit = 20) {
    return this.notificationQueue.slice(0, limit);
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId) {
    const notification = this.notificationQueue.find(
      (n) => n.id === notificationId
    );
    if (notification) {
      notification.read = true;
    }
  }

  /**
   * Clear all notifications
   */
  clearNotifications() {
    this.notificationQueue = [];
  }

  /**
   * Get unread notification count
   */
  getUnreadCount() {
    return this.notificationQueue.filter((n) => !n.read).length;
  }

  /**
   * Enhanced Platform Synchronization API
   */
  async triggerSync(platforms = [], options = {}) {
    try {
      const response = await apiClient.post("/v1/enhanced-platforms/sync", {
        platforms,
        options,
      });
      return response.data;
    } catch (error) {
      logger.error("Enhanced Platform Service: Sync failed:", error);
      throw error;
    }
  }

  /**
   * Get pending conflicts for manual review
   */
  async getPendingConflicts() {
    try {
      const response = await apiClient.get("/v1/enhanced-platforms/conflicts");
      return response.data;
    } catch (error) {
      logger.error(
        "Enhanced Platform Service: Failed to get conflicts:",
        error
      );
      throw error;
    }
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(conflictId, resolution) {
    try {
      const response = await apiClient.post(
        `/v1/enhanced-platforms/conflicts/${conflictId}/resolve`,
        { resolution }
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Enhanced Platform Service: Failed to resolve conflict:",
        error
      );
      throw error;
    }
  }

  /**
   * Inventory Management API
   */
  async getProductInventory(sku) {
    try {
      const response = await apiClient.get(
        `/v1/enhanced-platforms/inventory/${sku}`
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Enhanced Platform Service: Failed to get inventory:",
        error
      );
      throw error;
    }
  }

  async updateInventory(sku, quantity, originPlatform, reason = "") {
    try {
      const response = await apiClient.post(
        `/v1/enhanced-platforms/inventory/${sku}/update`,
        { quantity, originPlatform, reason }
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Enhanced Platform Service: Failed to update inventory:",
        error
      );
      throw error;
    }
  }

  async reserveStock(sku, quantity, orderNumber, duration) {
    try {
      const response = await apiClient.post(
        `/v1/enhanced-platforms/inventory/${sku}/reserve`,
        { quantity, orderNumber, duration }
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Enhanced Platform Service: Failed to reserve stock:",
        error
      );
      throw error;
    }
  }

  async confirmReservation(reservationId) {
    try {
      const response = await apiClient.post(
        `/v1/enhanced-platforms/inventory/reservations/${reservationId}/confirm`
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Enhanced Platform Service: Failed to confirm reservation:",
        error
      );
      throw error;
    }
  }

  async releaseReservation(reservationId) {
    try {
      const response = await apiClient.post(
        `/v1/enhanced-platforms/inventory/reservations/${reservationId}/release`
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Enhanced Platform Service: Failed to release reservation:",
        error
      );
      throw error;
    }
  }

  async getInventoryAnalytics(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.startDate)
        params.append("startDate", options.startDate.toISOString());
      if (options.endDate)
        params.append("endDate", options.endDate.toISOString());
      if (options.platforms)
        params.append("platforms", options.platforms.join(","));

      const response = await apiClient.get(
        `/v1/enhanced-platforms/inventory/analytics?${params}`
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Enhanced Platform Service: Failed to get analytics:",
        error
      );
      throw error;
    }
  }

  async bulkUpdateInventory(updates) {
    try {
      const response = await apiClient.post(
        "/v1/enhanced-platforms/inventory/bulk-update",
        { updates }
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Enhanced Platform Service: Failed to bulk update inventory:",
        error
      );
      throw error;
    }
  }

  async getActiveReservations() {
    try {
      const response = await apiClient.get(
        "/v1/enhanced-platforms/inventory/reservations"
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Enhanced Platform Service: Failed to get reservations:",
        error
      );
      throw error;
    }
  }

  async getInventoryStatus() {
    try {
      const response = await apiClient.get(
        "/v1/enhanced-platforms/inventory/status"
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Enhanced Platform Service: Failed to get inventory status:",
        error
      );
      throw error;
    }
  }

  /**
   * Notification API
   */
  async getRecentNotifications(limit = 50) {
    try {
      const response = await apiClient.get(
        `/v1/enhanced-platforms/notifications/recent?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Enhanced Platform Service: Failed to get recent notifications:",
        error
      );
      throw error;
    }
  }

  async getNotificationStats() {
    try {
      const response = await apiClient.get(
        "/v1/enhanced-platforms/notifications/stats"
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Enhanced Platform Service: Failed to get notification stats:",
        error
      );
      throw error;
    }
  }

  /**
   * Utility methods
   */
  isConnectedToWebSocket() {
    return this.isConnected;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  reconnect() {
    this.disconnect();
    this.connect();
  }

  /**
   * Format notification for display
   */
  formatNotification(notification) {
    const formatters = {
      syncCompleted: (data) => ({
        title: "Platform Sync Completed",
        message: `Processed ${data.totalProcessed} orders in ${data.duration}ms`,
        type: "success",
        icon: "✅",
      }),
      syncStarted: (data) => ({
        title: "Platform Sync Started",
        message: `Synchronizing ${
          data.platforms?.join(", ") || "all platforms"
        }`,
        type: "info",
        icon: "🔄",
      }),
      orderConflict: (data) => ({
        title: "Order Conflict Detected",
        message: `Order ${data.orderNumber} has conflicts requiring review`,
        type: "warning",
        icon: "⚠️",
      }),
      manualReviewRequired: (data) => ({
        title: "Manual Review Required",
        message: `${data.conflictType} conflict needs manual resolution`,
        type: "warning",
        icon: "👨‍💼",
      }),
      inventoryUpdated: (data) => ({
        title: "Inventory Updated",
        message: `${data.sku}: ${data.newQuantity} units across platforms`,
        type: "info",
        icon: "📦",
      }),
      lowStock: (data) => ({
        title: "Low Stock Alert",
        message: `${data.sku}: Only ${data.quantity} units remaining`,
        type: "warning",
        icon: "⚠️",
      }),
      systemNotification: (data) => ({
        title: data.title || "System Notification",
        message: data.message,
        type: data.type || "info",
        icon: data.icon || "ℹ️",
      }),
    };

    const formatter = formatters[notification.type];
    if (formatter) {
      return {
        ...formatter(notification.data),
        id: notification.id,
        timestamp: notification.timestamp,
        read: notification.read,
      };
    }

    // Default formatter
    return {
      title: notification.type,
      message: JSON.stringify(notification.data),
      type: "info",
      icon: "ℹ️",
      id: notification.id,
      timestamp: notification.timestamp,
      read: notification.read,
    };
  }
}

// Create singleton instance
const enhancedPlatformService = new EnhancedPlatformService();

export default enhancedPlatformService;
