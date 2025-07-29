import { useState, useEffect, useRef } from "react";
import logger from "../utils/logger.js";

export const useWebSocketQuery = (queryKey, events, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use refs to store the current values without triggering re-renders
  const queryKeyRef = useRef(queryKey);
  const eventsRef = useRef(events);

  // Update refs when values change
  queryKeyRef.current = queryKey;
  eventsRef.current = events;

  useEffect(() => {
    // Implement WebSocket connection
    // Use proxy in development, direct connection in production
    const isDevelopment = process.env.NODE_ENV === "development";

    let wsUrl;
    if (isDevelopment) {
      // In development, use the proxy setup by connecting to the dev server
      // The proxy will handle forwarding to the backend server
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host; // This will be localhost:3000 in dev
      wsUrl = `${protocol}//${host}/ws/notifications`;
    } else {
      // In production, connect directly to the backend
      const serverUrl =
        process.env.REACT_APP_SERVER_URL || process.env.REACT_APP_API_URL;
      if (serverUrl) {
        const baseUrl = serverUrl.replace("/api", ""); // Remove /api suffix if present
        const protocol = baseUrl.startsWith("https") ? "wss:" : "ws:";
        const host = baseUrl.replace(/^https?:\/\//, "");
        wsUrl = `${protocol}//${host}/ws/notifications`;
      } else {
        // Fallback: use current location
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        wsUrl = `${protocol}//${host}/ws/notifications`;
      }
    }

    let ws = null;
    let reconnectTimer = null;
    let isComponentMounted = true;
    let connectionAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      if (!isComponentMounted || connectionAttempts >= maxReconnectAttempts) {
        if (connectionAttempts >= maxReconnectAttempts) {
          logger.websocket.error("Max reconnection attempts reached", {
            attempts: connectionAttempts,
            maxAttempts: maxReconnectAttempts,
            queryKey: queryKeyRef.current,
          });
          setError(
            "Unable to establish WebSocket connection after multiple attempts"
          );
        }
        return;
      }

      try {
        connectionAttempts++;
        setLoading(true);
        logger.websocket.info("Attempting connection", {
          wsUrl,
          attempt: connectionAttempts,
          maxAttempts: maxReconnectAttempts,
          queryKey: queryKeyRef.current,
          events: eventsRef.current,
        });

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          logger.websocket.success("Connection established", {
            queryKey: queryKeyRef.current,
            events: eventsRef.current,
            readyState: ws.readyState,
            attempt: connectionAttempts,
          });
          setLoading(false);
          setError(null);
          connectionAttempts = 0; // Reset connection attempts on successful connection

          // Ensure WebSocket is fully ready before sending messages
          setTimeout(() => {
            if (ws && ws.readyState === WebSocket.OPEN && queryKeyRef.current) {
              try {
                const subscriptionMessage = {
                  type: "subscribe",
                  channels: ["all"], // Subscribe to all notifications
                  queryKey: queryKeyRef.current,
                  events: eventsRef.current,
                };

                ws.send(JSON.stringify(subscriptionMessage));
                logger.websocket.info("Subscription message sent", {
                  message: subscriptionMessage,
                });
              } catch (error) {
                logger.websocket.error("Failed to send subscription message", {
                  error: error.message,
                  stack: error.stack,
                  queryKey: queryKeyRef.current,
                });
              }
            } else {
              logger.websocket.warn(
                "Cannot send subscription - connection not ready",
                {
                  wsExists: !!ws,
                  readyState: ws?.readyState,
                  queryKey: queryKeyRef.current,
                }
              );
            }
          }, 100); // Small delay to ensure connection is fully established
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            logger.websocket.info("Message received", {
              message,
              queryKey: queryKeyRef.current,
              messageType: message.type,
            });
            setData(message);
          } catch (err) {
            logger.websocket.error("Failed to parse message", {
              error: err.message,
              rawData: event.data,
              queryKey: queryKeyRef.current,
            });
          }
        };

        ws.onclose = (event) => {
          logger.websocket.info("Connection closed", {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            queryKey: queryKeyRef.current,
            attempt: connectionAttempts,
          });

          if (
            isComponentMounted &&
            event.code !== 1000 &&
            connectionAttempts < maxReconnectAttempts
          ) {
            const backoffDelay = Math.min(
              1000 * Math.pow(2, connectionAttempts - 1),
              10000
            ); // Exponential backoff, max 10 seconds
            logger.websocket.info(
              `Attempting reconnection in ${backoffDelay}ms`,
              {
                code: event.code,
                reason: event.reason,
                queryKey: queryKeyRef.current,
                attempt: connectionAttempts,
                delay: backoffDelay,
              }
            );
            // Reconnect with exponential backoff
            reconnectTimer = setTimeout(connect, backoffDelay);
          } else if (connectionAttempts >= maxReconnectAttempts) {
            setError("Connection failed after multiple attempts");
            setLoading(false);
          }
        };

        ws.onerror = (error) => {
          logger.websocket.error("Connection error", {
            error,
            queryKey: queryKeyRef.current,
            wsUrl,
            readyState: ws?.readyState,
            attempt: connectionAttempts,
          });

          // Don't immediately set error - let the close handler manage reconnection
          if (connectionAttempts >= maxReconnectAttempts) {
            setError("WebSocket connection failed");
            setLoading(false);
          }
        };
      } catch (err) {
        logger.websocket.error("Failed to create connection", {
          error: err.message,
          stack: err.stack,
          wsUrl,
          queryKey: queryKeyRef.current,
        });
        setError("Failed to establish WebSocket connection");
        setLoading(false);
      }
    };

    // Start connection
    logger.websocket.info("Initializing connection", {
      queryKey: queryKeyRef.current,
      events: eventsRef.current,
      wsUrl,
    });
    connect();

    // Cleanup function
    return () => {
      logger.websocket.info("Cleaning up connection", {
        queryKey: queryKeyRef.current,
        hadConnection: !!ws,
        readyState: ws?.readyState,
      });

      isComponentMounted = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        logger.websocket.debug("Cancelled reconnection timer");
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        logger.websocket.info("Closing connection gracefully");
        ws.close(1000, "Component unmounting");
      }
    };
  }, [queryKey, events]); // Only reconnect when queryKey or events change

  return { data, loading, error };
};

export default useWebSocketQuery;
