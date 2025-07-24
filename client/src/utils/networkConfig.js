import logger from "../utils/logger";
/**
 * Automatic network configuration for development
 * This utility automatically detects the server IP when working on different networks
 */
import React from "react";

let cachedNetworkInfo = null;
let lastNetworkCheck = 0;
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Get network information from the server
 */
export const getNetworkInfo = async () => {
  const now = Date.now();

  // Return cached info if it's still fresh
  if (cachedNetworkInfo && now - lastNetworkCheck < CACHE_DURATION) {
    return cachedNetworkInfo;
  }

  try {
    // Try to get network info from the server
    // First try localhost (proxy will forward to correct IP)
    const response = await fetch("/api/network/network-info");

    if (response.ok) {
      const networkInfo = await response.json();
      cachedNetworkInfo = networkInfo.data;
      lastNetworkCheck = now;
      return cachedNetworkInfo;
    }
  } catch (error) {
    logger.info("Could not fetch network info from server:", error.message);
  }

  // Fallback: detect client-side
  const fallbackInfo = {
    primaryIP: window.location.hostname,
    serverPort: 5001,
    apiBaseUrl: `/api`, // Use relative URL for proxy
    hostname: window.location.hostname,
    timestamp: new Date().toISOString(),
  };

  cachedNetworkInfo = fallbackInfo;
  lastNetworkCheck = now;
  return cachedNetworkInfo;
};

/**
 * Get the current API base URL
 */
export const getApiBaseUrl = async () => {
  try {
    const networkInfo = await getNetworkInfo();

    // In development, use relative URLs so the proxy handles the routing
    if (process.env.NODE_ENV === "development") {
      return "/api";
    }

    // In production, use the full URL
    return networkInfo.apiBaseUrl || "/api";
  } catch (error) {
    logger.warn("Failed to get API base URL, using fallback:", error);
    return "/api";
  }
};

/**
 * Get the current server host (useful for WebSocket connections)
 */
export const getServerHost = async () => {
  try {
    const networkInfo = await getNetworkInfo();

    // For WebSocket connections, we need the actual IP in development
    if (process.env.NODE_ENV === "development") {
      return networkInfo.primaryIP || window.location.hostname;
    }

    return window.location.hostname;
  } catch (error) {
    logger.warn("Failed to get server host, using fallback:", error);
    return window.location.hostname;
  }
};

/**
 * Get the current server port
 */
export const getServerPort = async () => {
  try {
    const networkInfo = await getNetworkInfo();
    return networkInfo.serverPort || 5001;
  } catch (error) {
    logger.warn("Failed to get server port, using fallback:", error);
    return 5001;
  }
};

/**
 * Force refresh of network information
 */
export const refreshNetworkInfo = async () => {
  cachedNetworkInfo = null;
  lastNetworkCheck = 0;
  return await getNetworkInfo();
};

/**
 * Check if the server is reachable
 */
export const checkServerHealth = async () => {
  try {
    const response = await fetch("/api/network/network-health");
    return response.ok;
  } catch (error) {
    logger.warn("Server health check failed:", error);
    return false;
  }
};

/**
 * Monitor network changes and update configuration
 */
export const startNetworkMonitoring = (callback) => {
  let lastIP = null;

  const checkNetwork = async () => {
    try {
      const networkInfo = await refreshNetworkInfo();
      const currentIP = networkInfo.primaryIP;

      if (lastIP && lastIP !== currentIP) {
        logger.info(`Network change detected: ${lastIP} -> ${currentIP}`);
        if (callback) {
          callback(networkInfo);
        }
      }

      lastIP = currentIP;
    } catch (error) {
      logger.warn("Network monitoring check failed:", error);
    }
  };

  // Check immediately
  checkNetwork();

  // Check every minute
  const interval = setInterval(checkNetwork, 60000);

  // Return cleanup function
  return () => clearInterval(interval);
};

/**
 * React hook for automatic network configuration
 */
export const useNetworkConfig = () => {
  const [networkInfo, setNetworkInfo] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    const loadNetworkInfo = async () => {
      try {
        setIsLoading(true);
        const info = await getNetworkInfo();
        if (mounted) {
          setNetworkInfo(info);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadNetworkInfo();

    // Set up network monitoring
    const stopMonitoring = startNetworkMonitoring((newInfo) => {
      if (mounted) {
        setNetworkInfo(newInfo);
      }
    });

    return () => {
      mounted = false;
      stopMonitoring();
    };
  }, []);

  const refresh = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const info = await refreshNetworkInfo();
      setNetworkInfo(info);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    networkInfo,
    isLoading,
    error,
    refresh,
  };
};

const networkConfig = {
  getNetworkInfo,
  getApiBaseUrl,
  getServerHost,
  getServerPort,
  refreshNetworkInfo,
  checkServerHealth,
  startNetworkMonitoring,
  useNetworkConfig,
};

export default networkConfig;
