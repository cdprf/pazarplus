/**
 * Network Status Service
 * Implements circuit breaker pattern to handle server connectivity gracefully
 */
class NetworkStatusService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isServerReachable = true;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.circuitBreakerState = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    this.listeners = new Set();

    // Circuit breaker configuration
    this.config = {
      failureThreshold: 10, // Number of failures before opening circuit (increased from 3)
      recoveryTimeout: 15000, // 15 seconds before attempting recovery (reduced from 30)
      retryTimeout: 5000, // 5 seconds between retries when circuit is open
      healthCheckInterval: 30000, // 30 seconds between health checks (reduced from 60)
      maxRetryDelay: 30000, // Maximum retry delay (reduced from 60)
    };

    this.retryDelay = 1000; // Start with 1 second delay
    this.healthCheckTimer = null;
    this.retryTimer = null;

    this.init();
  }

  init() {
    // Listen for browser online/offline events
    window.addEventListener("online", this.handleOnline.bind(this));
    window.addEventListener("offline", this.handleOffline.bind(this));

    // Debug: Log initialization
    if (process.env.NODE_ENV === "development") {
      console.log("🌐 NetworkStatusService initialized", {
        isOnline: this.isOnline,
        isServerReachable: this.isServerReachable,
        circuitBreakerState: this.circuitBreakerState,
      });
    }

    // Start health check monitoring
    this.startHealthCheckMonitoring();
  }

  /**
   * Subscribe to network status changes
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of status change
   */
  notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        console.error("Error in network status listener:", error);
      }
    });
  }

  /**
   * Get current network status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      isServerReachable: this.isServerReachable,
      circuitBreakerState: this.circuitBreakerState,
      failureCount: this.failureCount,
      canMakeRequest: this.canMakeRequest(),
      retryDelay: this.retryDelay,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Check if requests should be allowed
   */
  canMakeRequest() {
    if (!this.isOnline) return false;

    switch (this.circuitBreakerState) {
      case "CLOSED":
        return true;
      case "OPEN":
        // Check if enough time has passed to attempt recovery
        const timeSinceFailure = Date.now() - this.lastFailureTime;
        if (timeSinceFailure > this.config.recoveryTimeout) {
          this.circuitBreakerState = "HALF_OPEN";
          this.notifyListeners();
          return true;
        }
        return false;
      case "HALF_OPEN":
        return true;
      default:
        return false;
    }
  }

  /**
   * Check if circuit breaker is open (blocking requests)
   */
  isCircuitOpen() {
    return !this.canMakeRequest();
  }

  /**
   * Manually reset the circuit breaker
   */
  resetCircuitBreaker() {
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 Manually resetting circuit breaker");
    }

    this.circuitBreakerState = "CLOSED";
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.isServerReachable = true;
    this.retryDelay = 1000;

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    this.notifyListeners();
  }

  /**
   * Record a successful request
   */
  recordSuccess() {
    if (process.env.NODE_ENV === "development") {
      console.log("✅ NetworkStatusService.recordSuccess() called");
    }

    if (this.circuitBreakerState === "HALF_OPEN") {
      // Recovery successful, close the circuit
      this.circuitBreakerState = "CLOSED";
      this.failureCount = 0;
      this.retryDelay = 1000; // Reset delay
      this.isServerReachable = true;
      console.log("🟢 Server connectivity restored - circuit breaker CLOSED");
      this.notifyListeners();
    } else if (
      this.circuitBreakerState === "CLOSED" &&
      !this.isServerReachable
    ) {
      // Server is back online
      this.isServerReachable = true;
      this.failureCount = 0;
      this.retryDelay = 1000;
      console.log("🟢 Server connectivity restored");
      this.notifyListeners();
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(error) {
    if (process.env.NODE_ENV === "development") {
      console.log("❌ NetworkStatusService.recordFailure() called", {
        error: error.message,
        code: error.code,
        status: error.response?.status,
        currentFailureCount: this.failureCount,
        currentState: this.circuitBreakerState,
        hasRequest: !!error.request,
        hasResponse: !!error.response,
        stack: error.stack?.split("\n")[0], // First line of stack trace
      });
    }

    // Check if this is a server connectivity issue
    const isServerError = this.isServerConnectivityError(error);

    if (!isServerError) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          "🔍 Not a server connectivity error, ignoring for circuit breaker",
          {
            code: error.code,
            status: error.response?.status,
            message: error.message,
          }
        );
      }
      return; // Don't count non-connectivity errors for circuit breaker
    }

    if (process.env.NODE_ENV === "development") {
      console.log("🚨 COUNTING as connectivity failure for circuit breaker", {
        code: error.code,
        status: error.response?.status,
        message: error.message,
        newFailureCount: this.failureCount + 1,
      });
    }

    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (isServerError) {
      this.isServerReachable = false;

      if (
        this.circuitBreakerState === "CLOSED" &&
        this.failureCount >= this.config.failureThreshold
      ) {
        // Open the circuit breaker
        this.circuitBreakerState = "OPEN";
        console.warn(
          `🔴 Circuit breaker OPENED after ${this.failureCount} failures`
        );
        this.scheduleRetry();
      } else if (this.circuitBreakerState === "HALF_OPEN") {
        // Failed during recovery attempt, open circuit again
        this.circuitBreakerState = "OPEN";
        console.warn("🔴 Circuit breaker OPENED - recovery attempt failed");
        this.scheduleRetry();
      }

      // Implement exponential backoff
      this.retryDelay = Math.min(
        this.retryDelay * 2,
        this.config.maxRetryDelay
      );

      this.notifyListeners();
    }
  }

  /**
   * Check if error indicates server connectivity issues
   */
  isServerConnectivityError(error) {
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 Checking if error is server connectivity issue:", {
        code: error.code,
        message: error.message,
        hasRequest: !!error.request,
        hasResponse: !!error.response,
        status: error.response?.status,
        url: error.config?.url,
      });
    }

    // Network errors - these indicate the server is unreachable
    if (
      error.code === "NETWORK_ERROR" ||
      error.message?.includes("Network Error")
    ) {
      console.log("🔍 ✅ Detected NETWORK_ERROR - IS connectivity issue");
      return true;
    }

    // Connection refused, timeout, etc. - server is unreachable
    if (
      error.code === "ECONNREFUSED" ||
      error.code === "ENOTFOUND" ||
      error.code === "ETIMEDOUT"
    ) {
      console.log(
        "🔍 ✅ Detected connection error:",
        error.code,
        "- IS connectivity issue"
      );
      return true;
    }

    // Axios network errors - request was made but no response received
    if (error.request && !error.response) {
      console.log(
        "🔍 ✅ Detected Axios network error (no response) - IS connectivity issue"
      );
      return true;
    }

    // DON'T count 5xx server errors as connectivity issues
    // 5xx means server is reachable but has internal issues
    if (error.response?.status >= 500) {
      console.log(
        "🔍 ❌ 5xx server error - server reachable but has issues, NOT a connectivity issue"
      );
      return false; // Changed from true to false
    }

    // DON'T count 4xx client errors (including auth errors) as connectivity issues
    if (error.response?.status >= 400 && error.response?.status < 500) {
      console.log(
        "🔍 ❌ 4xx client error (auth, etc.) - server reachable, NOT a connectivity issue"
      );
      return false;
    }

    // CORS errors (often indicate server is down)
    if (
      error.message?.includes("CORS") ||
      error.message?.includes("blocked by CORS policy")
    ) {
      console.log("🔍 ✅ Detected CORS error - IS connectivity issue");
      return true;
    }

    console.log(
      "🔍 ❌ Unknown error type - NOT counting as connectivity issue"
    );
    return false;
  }

  /**
   * Schedule a retry attempt
   */
  scheduleRetry() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    this.retryTimer = setTimeout(() => {
      if (this.circuitBreakerState === "OPEN") {
        this.attemptHealthCheck();
      }
    }, this.config.retryTimeout);
  }

  /**
   * Attempt a health check to see if server is back
   */
  async attemptHealthCheck() {
    try {
      console.log("🔍 Attempting server health check...");

      // Use a lightweight endpoint for health check
      const response = await fetch("/api/health", {
        method: "HEAD",
        timeout: 5000,
        cache: "no-cache",
      });

      if (response.ok) {
        console.log("✅ Health check successful");
        this.recordSuccess();
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      console.log("❌ Health check failed:", error.message);
      this.scheduleRetry();
    }
  }

  /**
   * Start periodic health check monitoring
   */
  startHealthCheckMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      // Only do periodic health checks if we think server is unreachable
      if (!this.isServerReachable && this.circuitBreakerState === "OPEN") {
        this.attemptHealthCheck();
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Handle browser online event
   */
  handleOnline() {
    console.log("🌐 Browser back online");
    this.isOnline = true;
    this.notifyListeners();

    // Attempt to check server connectivity
    setTimeout(() => this.attemptHealthCheck(), 1000);
  }

  /**
   * Handle browser offline event
   */
  handleOffline() {
    console.log("🌐 Browser went offline");
    this.isOnline = false;
    this.isServerReachable = false;
    this.notifyListeners();
  }

  /**
   * Force reset the circuit breaker (for manual recovery)
   */
  reset() {
    console.log("🔄 Manually resetting circuit breaker");
    this.circuitBreakerState = "CLOSED";
    this.failureCount = 0;
    this.retryDelay = 1000;
    this.isServerReachable = true;
    this.lastFailureTime = null;

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    this.notifyListeners();
  }

  /**
   * Cleanup timers and event listeners
   */
  destroy() {
    window.removeEventListener("online", this.handleOnline.bind(this));
    window.removeEventListener("offline", this.handleOffline.bind(this));

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    this.listeners.clear();
  }
}

// Create singleton instance
const networkStatusService = new NetworkStatusService();

// Expose to window for debugging in development
if (process.env.NODE_ENV === "development") {
  window.networkStatusService = networkStatusService;
  console.log(
    "🔧 NetworkStatusService exposed to window.networkStatusService for debugging"
  );
}

export default networkStatusService;
