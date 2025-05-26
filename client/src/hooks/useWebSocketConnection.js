import { useState, useEffect } from 'react';

export const useWebSocketConnection = () => {
  const [isConnected, setIsConnected] = useState(true); // Start as connected
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const reconnect = () => {
    setReconnectAttempt(prev => prev + 1);
    // Simulate reconnection
    setTimeout(() => {
      setIsConnected(true);
      setReconnectAttempt(0);
    }, 1000);
  };

  useEffect(() => {
    // Placeholder implementation - assume connection is working
    setIsConnected(true);
  }, []);

  return { 
    isConnected, 
    reconnectAttempt, 
    reconnect 
  };
};

export default useWebSocketConnection;
