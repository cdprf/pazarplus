import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import useWebSocketConnection from './useWebSocketConnection';

/**
 * Custom hook that listens for specified WebSocket events and invalidates
 * the related React Query cache. This enables automatic refetching
 * when real-time updates are received through WebSockets.
 * 
 * @param {Array|string} queryKey - React Query key to be invalidated
 * @param {Array} eventTypes - Array of WebSocket event types to listen for
 * @param {Object} options - Additional options
 * @param {boolean} options.exact - If true, requires exact match of queryKey (default: false)
 * @param {Function} options.filter - Optional function to filter events (receives event object)
 * @returns {Object} WebSocket connection state
 */
const useWebSocketQuery = (queryKey, events, filters = {}) => {
  const queryClient = useQueryClient();
  const { addEventListener, setEventFilter, removeEventFilter } = useWebSocketConnection();

  useEffect(() => {
    // Set up event listeners for each event type
    const cleanupFunctions = events.map(eventType => {
      // Set any filters for this event type
      if (filters[eventType]) {
        setEventFilter(eventType, filters[eventType]);
      }

      // Add event listener
      return addEventListener(eventType, () => {
        // If queryKey is an array of keys, invalidate each one
        if (Array.isArray(queryKey)) {
          queryKey.forEach(key => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        } else {
          queryClient.invalidateQueries({ queryKey });
        }
      });
    });

    // Cleanup function to remove all event listeners and filters
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
      events.forEach(eventType => {
        if (filters[eventType]) {
          removeEventFilter(eventType);
        }
      });
    };
  }, [queryKey, events, filters, addEventListener, setEventFilter, removeEventFilter, queryClient]);
};

export default useWebSocketQuery;