import { useEffect, useRef, useState } from "react";
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
  const maxReconnectAttempts = 5;

  const getWebSocketUrl = () => {
    // For development, use the dev server URL which will be proxied
    // For production, use the actual server URL
    const isDevelopment = process.env.NODE_ENV === "development";

    if (isDevelopment) {
      return `ws://localhost:3000/ws/notifications`; // Development server proxy
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;
      const port = window.location.port || (protocol === "wss:" ? "443" : "80");
      return `${protocol}//${host}:${port}/ws/notifications`;
    }
  };

  const connect = () => {
    try {
      const wsUrl = getWebSocketUrl();
      console.log("🔌 Connecting to notifications WebSocket:", wsUrl);

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
              addNotification({
                title: "Platform Sync Complete",
                message: `${message.data?.platform} sync finished - ${message.data?.itemsProcessed} items`,
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
            30000
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
          setConnectionError("Failed to reconnect to notification service");
          console.error("❌ Max reconnection attempts reached");
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("❌ WebSocket notification error:", error);
        setConnectionError("WebSocket connection failed");
      };
    } catch (error) {
      console.error("❌ Failed to create WebSocket connection:", error);
      setConnectionError("Failed to establish WebSocket connection");
    }
  };

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
  }, []);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    sendMessage,
  };
};
