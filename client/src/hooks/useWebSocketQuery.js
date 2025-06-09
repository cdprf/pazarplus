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
    const wsUrl = options.url || "ws://localhost:5001";
    let ws = null;
    let reconnectTimer = null;
    let isComponentMounted = true;

    const connect = () => {
      if (!isComponentMounted) return;

      try {
        setLoading(true);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("WebSocket connected for query:", queryKeyRef.current);
          setLoading(false);
          setError(null);

          // Send initial query
          if (queryKeyRef.current) {
            ws.send(
              JSON.stringify({
                type: "subscribe",
                queryKey: queryKeyRef.current,
                events: eventsRef.current,
              })
            );
          }
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
  }, []); // Empty dependency array is now safe with refs

  return { data, loading, error };
};

export default useWebSocketQuery;
