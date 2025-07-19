import { useEffect, useRef, useState, useCallback } from "react";
import { useNotification } from "../contexts/NotificationContext";

/**
 * WebSocket Notification Service Hook
 * Connects the frontend to the backend real-time notification system
 */
export const useWebSocketNotifications = () => {
  const { addNotification } = useNotification();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 2; // Reduce to 2 attempts to avoid spam

  const getWebSocketUrl = (attemptDirect = false) => {
    const isDevelopment = process.env.NODE_ENV === "development";

    if (isDevelopment && !attemptDirect) {
      // First try: Use the React dev server's proxy
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;
      const port = window.location.port || "3000";
      return `${protocol}//${host}:${port}/ws/notifications`;
    } else if (isDevelopment && attemptDirect) {
      // Fallback: Try direct connection to backend
      return `ws://localhost:5001/ws/notifications`;
    } else {
      // Production
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;
      const port = window.location.port || (protocol === "wss:" ? "443" : "80");
      return `${protocol}//${host}:${port}/ws/notifications`;
    }
  };

  const connect = useCallback(() => {
    // Skip connection attempts if we've already failed multiple times
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log(
        "⚠️ WebSocket connection disabled after multiple failures. Using offline mode."
      );
      setConnectionError("WebSocket unavailable - using offline mode");
      return;
    }

    try {
      // Try direct connection to backend (skip proxy issues)
      const isDevelopment = process.env.NODE_ENV === "development";
      const wsUrl = isDevelopment
        ? `ws://localhost:5001/ws/notifications` // Direct to backend
        : getWebSocketUrl(false); // Use original logic for production

      console.log(
        `🔌 Connecting to notifications WebSocket (attempt ${
          reconnectAttemptsRef.current + 1
        }/${maxReconnectAttempts}):`,
        wsUrl
      );

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("✅ WebSocket notification connection established");
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;

        // Subscribe to all notification channels with delay to ensure connection is ready
        setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
              wsRef.current.send(
                JSON.stringify({
                  type: "subscribe",
                  channels: [
                    "all",
                    "orders",
                    "inventory",
                    "sync",
                    "platform_errors",
                    "shipping",
                    "payments",
                  ],
                })
              );
              console.log("📤 Subscription message sent successfully");
            } catch (error) {
              console.error("Failed to send subscription message:", error);
            }
          }
        }, 100); // Small delay to ensure connection is ready
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("📨 Notification received:", message);

          // Handle different notification types
          switch (message.type) {
            case "connection_established":
              console.log(
                "🎉 Notification service connected:",
                message.clientId
              );
              break;

            case "order_status_change":
              addNotification({
                title: "Order Status Updated",
                message: `Order ${message.data?.orderNumber} is now ${message.data?.newStatus}`,
                type: "order",
                priority: "medium",
                icon: "ShoppingCartIcon",
                color: "text-blue-600 dark:text-blue-400",
                bgColor: "bg-blue-100 dark:bg-blue-900/30",
                data: message.data,
              });
              break;

            case "new_order":
              addNotification({
                title: "New Order Received",
                message: `Order ${message.data?.orderNumber} from ${message.data?.platform} - ${message.data?.totalAmount}`,
                type: "order",
                priority: "high",
                icon: "ShoppingCartIcon",
                color: "text-green-600 dark:text-green-400",
                bgColor: "bg-green-100 dark:bg-green-900/30",
                data: message.data,
              });
              break;

            case "inventory_low":
              addNotification({
                title: "Low Stock Alert",
                message:
                  message.data?.message ||
                  "Some products are running low on inventory",
                type: "inventory",
                priority: "high",
                icon: "CommandLineIcon",
                color: "text-amber-600 dark:text-amber-400",
                bgColor: "bg-amber-100 dark:bg-amber-900/30",
                data: message.data,
              });
              break;

            case "sync_completed":
              console.log("🔄 Sync completed message received:", message);
              const platform =
                message.data?.platform ||
                message.data?.source ||
                message.platform ||
                "Platform";
              const itemCount =
                message.data?.itemsProcessed ||
                message.data?.items ||
                message.data?.count ||
                message.data?.total ||
                message.itemsProcessed ||
                message.items ||
                0;

              console.log("🔍 Parsed sync data:", {
                platform,
                itemCount,
                rawData: message.data,
              });

              addNotification({
                title: "Platform Sync Complete",
                message: `${platform} sync finished - ${itemCount} items processed`,
                type: "sync",
                priority: "low",
                icon: "SparklesIcon",
                color: "text-purple-600 dark:text-purple-400",
                bgColor: "bg-purple-100 dark:bg-purple-900/30",
                data: message.data,
              });
              break;

            case "platform_error":
              addNotification({
                title: "Platform Error",
                message:
                  message.data?.message ||
                  "An error occurred with platform integration",
                type: "error",
                priority: "high",
                icon: "ExclamationTriangleIcon",
                color: "text-red-600 dark:text-red-400",
                bgColor: "bg-red-100 dark:bg-red-900/30",
                data: message.data,
              });
              break;

            case "shipping_update":
              addNotification({
                title: "Shipping Update",
                message: message.data?.message || "Shipping status updated",
                type: "shipping",
                priority: "medium",
                icon: "TruckIcon",
                color: "text-blue-600 dark:text-blue-400",
                bgColor: "bg-blue-100 dark:bg-blue-900/30",
                data: message.data,
              });
              break;

            case "subscription_updated":
              console.log("📋 Subscriptions updated:", message.subscriptions);
              break;

            case "recent_notifications":
              console.log("📜 Recent notifications:", message.notifications);
              // Could populate initial notifications here if needed
              break;

            default:
              console.log(
                "📨 Unknown notification type:",
                message.type,
                message
              );
          }
        } catch (error) {
          console.error("❌ Failed to parse notification message:", error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log(
          "🔌 WebSocket notification connection closed:",
          event.code,
          event.reason
        );
        setIsConnected(false);

        // Attempt to reconnect if not intentionally closed
        if (
          event.code !== 1000 &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            10000 // Reduce max delay to 10 seconds
          );
          console.log(
            `🔄 Attempting to reconnect in ${delay}ms (attempt ${
              reconnectAttemptsRef.current + 1
            }/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionError("WebSocket connection unavailable");
          console.warn(
            "⚠️ WebSocket connection failed. Notifications will work in offline mode."
          );
          // Don't reset attempts automatically - let the user refresh if they want to try again
        }
      };

      wsRef.current.onerror = (error) => {
        // Only log errors for the first few attempts to avoid spam
        if (reconnectAttemptsRef.current < 2) {
          console.error("❌ WebSocket notification error:", error);
        }
        setConnectionError("WebSocket connection failed");
      };
    } catch (error) {
      console.error("❌ Failed to create WebSocket connection:", error);
      setConnectionError("Failed to establish WebSocket connection");
    }
  }, [addNotification]);

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, "Component unmounting");
    }

    setIsConnected(false);
    setConnectionError(null);
    reconnectAttemptsRef.current = 0;
  };

  const retryConnection = () => {
    console.log("🔄 Manual retry requested");
    disconnect();
    reconnectAttemptsRef.current = 0;
    setConnectionError(null);
    setTimeout(() => {
      connect();
    }, 1000);
  };

  const sendMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  // Ping to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      sendMessage({ type: "ping" });
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [isConnected]);

  // Initialize connection
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect]);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    retryConnection,
    sendMessage,
  };
};
