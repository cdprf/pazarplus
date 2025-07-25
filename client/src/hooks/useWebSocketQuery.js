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
    // Connect directly to backend server in all environments
    const isDevelopment = process.env.NODE_ENV === "development";
    const wsUrl = isDevelopment
      ? `ws://localhost:5001/ws/notifications` // Connect directly to backend in development
      : (() => {
          const serverUrl =
            process.env.REACT_APP_SERVER_URL || "https://yarukai.com/api";
          const protocol = serverUrl.startsWith("https") ? "wss:" : "ws:";
          const host = serverUrl
            .replace(/^https?:\/\//, "")
            .replace(/:\d+$/, "");
          return `${protocol}//${host}/ws/notifications`;
        })(); // Production backend server

    let ws = null;
    let reconnectTimer = null;
    let isComponentMounted = true;

    const connect = () => {
      if (!isComponentMounted) return;

      try {
        setLoading(true);
        logger.websocket.info("Attempting connection", {
          wsUrl,
          queryKey: queryKeyRef.current,
          events: eventsRef.current,
        });
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          logger.websocket.success("Connection established", {
            queryKey: queryKeyRef.current,
            events: eventsRef.current,
            readyState: ws.readyState,
          });
          setLoading(false);
          setError(null);

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
          });

          if (isComponentMounted && event.code !== 1000) {
            logger.websocket.info("Attempting reconnection in 3 seconds", {
              code: event.code,
              reason: event.reason,
              queryKey: queryKeyRef.current,
            });
            // Reconnect after 3 seconds if not a normal closure
            reconnectTimer = setTimeout(connect, 3000);
          }
        };

        ws.onerror = (error) => {
          logger.websocket.error("Connection error", {
            error,
            queryKey: queryKeyRef.current,
            wsUrl,
            readyState: ws?.readyState,
          });
          setError("WebSocket connection failed");
          setLoading(false);
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
  }, [options.url]); // Include options.url in dependency array

  return { data, loading, error };
};

export default useWebSocketQuery;
