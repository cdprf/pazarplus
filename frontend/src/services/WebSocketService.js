class WebSocketService {
  constructor() {
    this.socket = null;
    this.eventListeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.baseReconnectDelay = 1000;
    this.pingInterval = null;
    this.pongTimeout = null;
    this.connectionTimeout = null;
    this.isConnecting = false;
    this.isAuthenticated = false;
  }

  connect(token = localStorage.getItem('token')) {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket connection already exists');
      return;
    }

    if (this.isConnecting) {
      console.log('Connection already in progress');
      return;
    }

    this.isConnecting = true;

    // Clear any existing timeouts and intervals
    this.clearTimers();

    // Determine the WebSocket URL based on environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NODE_ENV === 'development' 
      ? 'localhost:3001' 
      : window.location.host;
    const wsUrl = `${protocol}//${host}/ws?token=${token}`;
    
    // Set connection timeout - abort if connection takes too long
    this.connectionTimeout = setTimeout(() => {
      if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
        console.log('WebSocket connection timeout');
        this.socket.close();
        this.notifyEvent('connection_error', { message: 'Connection timeout' });
      }
    }, 10000);
    
    try {
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.isAuthenticated = true;
        clearTimeout(this.connectionTimeout);
        
        // Start ping-pong to keep connection alive
        this.startPingPong();
        
        // Notify listeners of connection
        this.notifyEvent('connection_established');
      };
      
      this.socket.onclose = (event) => {
        console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
        this.isConnecting = false;
        this.isAuthenticated = false;
        
        this.clearTimers();
        
        // Notify listeners that connection was closed
        this.notifyEvent('connection_closed', { code: event.code, reason: event.reason });
        
        // Attempt to reconnect unless it was a clean authentication failure
        if (event.code !== 4000 && event.code !== 4001) {
          this.attemptReconnect();
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        
        // Notify listeners of the error
        this.notifyEvent('connection_error', error);
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle pong messages to keep connection alive
          if (data.type === 'pong') {
            clearTimeout(this.pongTimeout);
            return;
          }
          
          // Handle other message types
          if (data.type) {
            this.notifyEvent(data.type, data.payload);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.isConnecting = false;
      this.notifyEvent('connection_error', error);
      this.attemptReconnect();
    }
  }

  disconnect() {
    this.clearTimers();
    
    if (this.socket) {
      this.socket.close(1000, 'Client disconnected');
      this.socket = null;
    }
  }

  clearTimers() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  startPingPong() {
    // Send a ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
        
        // Set a timeout to detect if server doesn't respond with pong
        this.pongTimeout = setTimeout(() => {
          console.log('Pong not received, reconnecting...');
          this.socket.close();
          this.connect();
        }, 5000);
      }
    }, 30000);
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    
    // Calculate exponential backoff delay
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => this.connect(), delay);
  }

  addEventListener(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    
    const listeners = this.eventListeners.get(eventType);
    listeners.add(callback);
    
    // Return a function to remove this specific listener
    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType);
      }
    };
  }

  notifyEvent(eventType, payload) {
    const listeners = this.eventListeners.get(eventType);
    
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in ${eventType} event listener:`, error);
        }
      });
    }
  }

  send(type, payload) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type,
        payload
      }));
      return true;
    } else {
      console.error('Cannot send message, WebSocket is not connected');
      return false;
    }
  }
}

// Create a singleton instance
const wsService = new WebSocketService();

export default wsService;