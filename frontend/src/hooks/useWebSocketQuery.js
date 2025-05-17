import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocketConnection } from './useWebSocketConnection';

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
export const useWebSocketQuery = (queryKey, eventTypes = [], options = {}) => {
  // These are defined but currently unused - will be implemented in future features
  // const { exact = false, filter } = options;
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocketConnection();
  
  useEffect(() => {
    if (!isConnected || !eventTypes.length) return;
    
    // Import WebSocketService inside the effect to avoid circular dependencies
    const wsService = require('../services/WebSocketService').default;
    
    // Create a handler that invalidates the specified query key
    const handleEvent = (data) => {
      console.log(`WebSocket event received, invalidating query: ${queryKey.join('.')}`);
      queryClient.invalidateQueries({ queryKey });
    };
    
    // Register handlers for each event type
    const cleanupFunctions = eventTypes.map(eventType => 
      wsService.addEventListener(eventType, handleEvent)
    );
    
    // Cleanup function to remove all event listeners
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [queryClient, queryKey, eventTypes, isConnected]);
  
  // This hook doesn't return anything, it just sets up the listeners
  return null;
};