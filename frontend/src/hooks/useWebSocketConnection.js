import { useEffect, useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import wsService from '../services/WebSocketService';

const useWebSocketConnection = () => {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Set up connection when token changes
  useEffect(() => {
    if (!token) return;
    
    wsService.connect(token);
    
    // Set up event listeners for connection status
    const onConnected = () => {
      setIsConnected(true);
      setConnectionError(null);
    };
    
    const onClosed = (data) => {
      setIsConnected(false);
      if (data?.reason) {
        setConnectionError(data.reason);
      }
    };
    
    const onError = (error) => {
      setConnectionError(error?.message || 'Connection error');
    };
    
    // Register event listeners
    const cleanupConnected = wsService.addEventListener('connection_established', onConnected);
    const cleanupClosed = wsService.addEventListener('connection_closed', onClosed);
    const cleanupError = wsService.addEventListener('connection_error', onError);
    
    // Clean up on unmount
    return () => {
      cleanupConnected();
      cleanupClosed();
      cleanupError();
    };
  }, [token]);

  const addEventListener = useCallback((eventType, callback) => {
    return wsService.addEventListener(eventType, callback);
  }, []);

  const setEventFilter = useCallback((eventType, filters) => {
    // Send subscription with filters
    wsService.send('subscribe', {
      events: [eventType],
      filters: { [eventType]: filters }
    });
  }, []);

  const removeEventFilter = useCallback((eventType) => {
    // Re-subscribe without filters
    wsService.send('subscribe', {
      events: [eventType]
    });
  }, []);

  return {
    isConnected,
    connectionError,
    addEventListener,
    setEventFilter,
    removeEventFilter
  };
};

export default useWebSocketConnection;