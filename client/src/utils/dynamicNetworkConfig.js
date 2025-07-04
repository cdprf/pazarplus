/**
 * Dynamic network configuration service
 * Automatically detects and uses the correct server configuration
 */

class DynamicNetworkConfig {
  constructor() {
    this.currentIP = null;
    this.serverPort = process.env.REACT_APP_SERVER_PORT || 5001;
    this.initialized = false;
  }

  /**
   * Initialize the network configuration
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // In development, try to get current network info from server
      if (process.env.NODE_ENV === "development") {
        await this.detectServerIP();
      }

      this.initialized = true;
      console.log("🌐 Dynamic network configuration initialized:", {
        currentIP: this.currentIP,
        serverPort: this.serverPort,
        environment: process.env.NODE_ENV,
      });
    } catch (error) {
      console.warn(
        "⚠️ Network detection failed, using fallback configuration:",
        error.message
      );
      this.initialized = true;
    }
  }

  /**
   * Detect server IP from environment or API
   */
  async detectServerIP() {
    // First check environment variable set by server
    if (process.env.REACT_APP_CURRENT_NETWORK_IP) {
      this.currentIP = process.env.REACT_APP_CURRENT_NETWORK_IP;
      console.log("🎯 Using server-provided network IP:", this.currentIP);
      return;
    }

    // Fallback: try to detect from API call
    try {
      const response = await fetch("/api/network/config", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const config = await response.json();
        this.currentIP = config.ip;
        console.log("🔍 Detected network IP from API:", this.currentIP);
      }
    } catch (error) {
      console.log("📡 Network API detection failed, using proxy configuration");
    }
  }

  /**
   * Get the appropriate API base URL
   */
  getApiBaseUrl() {
    // In development, always use relative URLs (proxy handles routing)
    if (process.env.NODE_ENV === "development") {
      return "/api";
    }

    // In production, use full URL with detected IP
    if (this.currentIP) {
      return `http://${this.currentIP}:${this.serverPort}/api`;
    }

    // Fallback to relative URL
    return "/api";
  }

  /**
   * Get the appropriate WebSocket URL
   */
  getWebSocketUrl(path = "/ws") {
    // In development, use localhost (proxy handles routing)
    if (process.env.NODE_ENV === "development") {
      return `ws://localhost:3000${path}`;
    }

    // In production, use detected IP
    if (this.currentIP) {
      return `ws://${this.currentIP}:${this.serverPort}${path}`;
    }

    // Fallback
    return `ws://localhost:5001${path}`;
  }

  /**
   * Get current server information
   */
  getServerInfo() {
    return {
      ip: this.currentIP,
      port: this.serverPort,
      apiBaseUrl: this.getApiBaseUrl(),
      webSocketUrl: this.getWebSocketUrl(),
      environment: process.env.NODE_ENV,
      initialized: this.initialized,
    };
  }

  /**
   * Check if network configuration has changed
   */
  async checkForUpdates() {
    if (process.env.NODE_ENV !== "development") return false;

    const previousIP = this.currentIP;
    await this.detectServerIP();

    if (previousIP !== this.currentIP) {
      console.log("🔄 Network IP changed:", {
        from: previousIP,
        to: this.currentIP,
      });
      return true;
    }

    return false;
  }

  /**
   * Start monitoring for network changes
   */
  startMonitoring(callback = null) {
    if (process.env.NODE_ENV !== "development") return;

    setInterval(async () => {
      const hasChanged = await this.checkForUpdates();
      if (hasChanged && callback) {
        callback(this.getServerInfo());
      }
    }, 30000); // Check every 30 seconds
  }
}

// Create singleton instance
const dynamicNetworkConfig = new DynamicNetworkConfig();

export default dynamicNetworkConfig;
