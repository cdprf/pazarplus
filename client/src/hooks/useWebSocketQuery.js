import { useState, useEffect, useRef } from "react";

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
      : options.url || "ws://localhost:5001/ws/notifications"; // Production server

    let ws = null;
    let reconnectTimer = null;
    let isComponentMounted = true;

    const connect = () => {
      if (!isComponentMounted) return;

      try {
        setLoading(true);
        console.log(`Attempting WebSocket connection to: ${wsUrl}`);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("WebSocket connected for query:", queryKeyRef.current);
          setLoading(false);
          setError(null);

          // Ensure WebSocket is fully ready before sending messages
          setTimeout(() => {
            if (ws && ws.readyState === WebSocket.OPEN && queryKeyRef.current) {
              try {
                ws.send(
                  JSON.stringify({
                    type: "subscribe",
                    channels: ["all"], // Subscribe to all notifications
                    queryKey: queryKeyRef.current,
                    events: eventsRef.current,
                  })
                );
                console.log("Subscription message sent successfully");
              } catch (error) {
                console.error("Failed to send subscription message:", error);
              }
            }
          }, 100); // Small delay to ensure connection is fully established
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log("WebSocket message received:", message);
            setData(message);
          } catch (err) {
            console.error("Failed to parse WebSocket message:", err);
          }
        };

        ws.onclose = (event) => {
          console.log("WebSocket closed:", event.code, event.reason);
          if (isComponentMounted && event.code !== 1000) {
            // Reconnect after 3 seconds if not a normal closure
            reconnectTimer = setTimeout(connect, 3000);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setError("WebSocket connection failed");
          setLoading(false);
        };
      } catch (err) {
        console.error("Failed to create WebSocket connection:", err);
        setError("Failed to establish WebSocket connection");
        setLoading(false);
      }
    };

    // Start connection
    connect();

    // Cleanup function
    return () => {
      isComponentMounted = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "Component unmounting");
      }
    };
  }, [options.url]); // Include options.url in dependency array

  return { data, loading, error };
};

export default useWebSocketQuery;
