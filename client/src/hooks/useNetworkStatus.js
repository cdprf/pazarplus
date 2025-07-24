import logger from "../utils/logger";
import { useState, useEffect, useCallback } from "react";
import networkStatusService from "../services/networkStatusService";

/**
 * Hook to monitor network and server connectivity status
 * @returns {Object} Network status and control functions
 */
export const useNetworkStatus = () => {
  const [status, setStatus] = useState(() => networkStatusService.getStatus());

  useEffect(() => {
    // Subscribe to network status changes
    const unsubscribe = networkStatusService.subscribe(setStatus);

    // Get initial status
    setStatus(networkStatusService.getStatus());

    return unsubscribe;
  }, []);

  const reset = useCallback(() => {
    networkStatusService.reset();
  }, []);

  const recordSuccess = useCallback(() => {
    networkStatusService.recordSuccess();
  }, []);

  const recordFailure = useCallback((error) => {
    networkStatusService.recordFailure(error);
  }, []);

  return {
    ...status,
    reset,
    recordSuccess,
    recordFailure,
  };
};

/**
 * Hook to conditionally execute functions based on network status
 * @param {Function} fn - Function to execute
 * @param {Object} options - Options for execution
 * @returns {Function} Wrapped function that respects network status
 */
export const useNetworkAwareFunction = (fn, options = {}) => {
  const { canMakeRequest, recordSuccess, recordFailure } = useNetworkStatus();
  const {
    fallback = () => logger.warn("Request blocked due to network status"),
    silent = false,
  } = options;

  return useCallback(
    async (...args) => {
      if (!canMakeRequest) {
        if (!silent) {
          logger.warn(
            "🚫 Request blocked - server unreachable (circuit breaker active)"
          );
        }
        return fallback(...args);
      }

      try {
        const result = await fn(...args);
        recordSuccess();
        return result;
      } catch (error) {
        recordFailure(error);
        throw error;
      }
    },
    [fn, canMakeRequest, recordSuccess, recordFailure, fallback, silent]
  );
};

/**
 * Hook to manage interval-based requests with network awareness
 * @param {Function} callback - Function to call on interval
 * @param {number} delay - Delay in milliseconds
 * @param {Object} options - Options for the interval
 */
export const useNetworkAwareInterval = (callback, delay, options = {}) => {
  const { canMakeRequest } = useNetworkStatus();
  const {
    pauseOnNetworkError = true,
    runImmediately = false,
    dependencies = [],
  } = options;

  useEffect(() => {
    if (!callback || delay === null) return;

    // Run immediately if requested and network allows
    if (runImmediately && (!pauseOnNetworkError || canMakeRequest)) {
      callback();
    }

    const intervalId = setInterval(() => {
      // Only run if network status allows it
      if (!pauseOnNetworkError || canMakeRequest) {
        callback();
      } else {
        logger.info("⏸️  Skipping interval callback - server unreachable");
      }
    }, delay);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    callback,
    delay,
    canMakeRequest,
    pauseOnNetworkError,
    runImmediately,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...dependencies,
  ]);
};

/**
 * Hook to wrap async operations with network-aware error handling
 * @param {Function} asyncFn - Async function to wrap
 * @param {Object} options - Options
 * @returns {Object} Enhanced async function with loading/error states
 */
export const useNetworkAwareAsync = (asyncFn, options = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { canMakeRequest, recordSuccess, recordFailure } = useNetworkStatus();

  const {
    onError = () => {},
    onSuccess = () => {},
    onNetworkBlocked = () => {},
  } = options;

  const execute = useCallback(
    async (...args) => {
      if (!canMakeRequest) {
        const networkError = new Error("Request blocked - server unreachable");
        networkError.type = "NETWORK_BLOCKED";
        setError(networkError);
        onNetworkBlocked(networkError);
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await asyncFn(...args);
        recordSuccess();
        onSuccess(result);
        return result;
      } catch (err) {
        recordFailure(err);
        setError(err);
        onError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [
      asyncFn,
      canMakeRequest,
      recordSuccess,
      recordFailure,
      onError,
      onSuccess,
      onNetworkBlocked,
    ]
  );

  return {
    execute,
    loading,
    error,
    canMakeRequest,
  };
};

export default useNetworkStatus;
