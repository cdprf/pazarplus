import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import wsService from '../services/WebSocketService';

/**
 * Custom hook to manage WebSocket connection with automatic reconnection and auth integration
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoConnect - Whether to automatically connect on mount (default: true)
 * @param {number} options.reconnectDelay - Base delay in ms between reconnect attempts (default: 2000)
 * @param {number} options.maxReconnectAttempts - Max number of reconnect attempts (default: 5)
 * @returns {Object} Connection state and control functions
 */
export const useWebSocketConnection = (options = {}) => {
  const { 
    autoConnect = true,
    reconnectDelay = 2000,
    maxReconnectAttempts = 5 
  } = options;
  
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempt: 0
  });
  
  const { token, isAuthenticated } = useAuth();
  
  // Establish connection to the WebSocket server
  const connect = useCallback(() => {
    if (!isAuthenticated || !token) {
      setConnectionState(prev => ({
        ...prev,
        error: new Error('Authentication required'),
        isConnecting: false
      }));
      return;
    }
    
    setConnectionState(prev => ({
      ...prev,
      isConnecting: true,
      error: null
    }));
    
    wsService.connect(token);
  }, [token, isAuthenticated]);
  
  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    wsService.disconnect();
    
    setConnectionState({
      isConnected: false,
      isConnecting: false,
      error: null,
      reconnectAttempt: 0
    });
  }, []);
  
  // Wrapper for sending messages through WebSocket
  const send = useCallback((type, payload) => {
    if (!connectionState.isConnected) {
      console.warn('Attempted to send message while disconnected');
      return false;
    }
    
    return wsService.send(type, payload);
  }, [connectionState.isConnected]);
  
  // Effect to handle connection events
  useEffect(() => {
    // Handler for connection established
    const handleConnectionEstablished = () => {
      setConnectionState({
        isConnected: true,
        isConnecting: false,
        error: null,
        reconnectAttempt: 0
      });
    };
    
    // Handler for connection closed
    const handleConnectionClosed = ({ code, reason }) => {
      setConnectionState(prev => ({
        isConnected: false,
        isConnecting: false,
        error: new Error(`Connection closed: ${code} ${reason}`),
        reconnectAttempt: prev.reconnectAttempt
      }));
    };
    
    // Handler for connection error
    const handleConnectionError = (error) => {
      setConnectionState(prev => ({
        isConnected: false,
        isConnecting: false,
        error: error instanceof Error ? error : new Error('Connection error'),
        reconnectAttempt: prev.reconnectAttempt + 1
      }));
    };
    
    // Register event listeners
    const cleanupFunctions = [
      wsService.addEventListener('connection_established', handleConnectionEstablished),
      wsService.addEventListener('connection_closed', handleConnectionClosed),
      wsService.addEventListener('connection_error', handleConnectionError)
    ];
    
    // Auto-connect if enabled and authenticated
    if (autoConnect && isAuthenticated && token) {
      connect();
    }
    
    // Cleanup function to remove all event listeners
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [autoConnect, connect, isAuthenticated, token]);
  
  // Effect to handle reconnection attempts
  useEffect(() => {
    let reconnectTimer = null;
    
    if (
      connectionState.error && 
      !connectionState.isConnected && 
      !connectionState.isConnecting && 
      connectionState.reconnectAttempt <= maxReconnectAttempts &&
      isAuthenticated
    ) {
      // Calculate delay with exponential backoff
      const delay = Math.min(
        reconnectDelay * Math.pow(2, connectionState.reconnectAttempt - 1),
        30000 // Max 30 seconds
      );
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${connectionState.reconnectAttempt})`);
      
      reconnectTimer = setTimeout(() => {
        if (isAuthenticated) {
          connect();
        }
      }, delay);
    }
    
    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [
    connectionState.error, 
    connectionState.isConnected, 
    connectionState.isConnecting,
    connectionState.reconnectAttempt,
    reconnectDelay,
    maxReconnectAttempts,
    connect,
    isAuthenticated
  ]);
  
  // Effect to handle authentication changes
  useEffect(() => {
    // If auth state changes, manage connection accordingly
    if (isAuthenticated && token) {
      // Connect if authenticated and we have a token
      if (!connectionState.isConnected && !connectionState.isConnecting) {
        connect();
      }
    } else {
      // Disconnect if no longer authenticated
      if (connectionState.isConnected) {
        disconnect();
      }
    }
  }, [isAuthenticated, token, connect, disconnect, connectionState.isConnected, connectionState.isConnecting]);

  return {
    ...connectionState,
    connect,
    disconnect,
    send
  };
};