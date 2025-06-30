import { useState, useCallback, useRef, useEffect, useMemo } from "react";

/**
 * Analytics Performance Hooks
 * Collection of hooks for optimizing analytics performance
 */

/**
 * Debounced state hook - delays state updates until user stops typing
 */
export const useDebouncedState = (initialValue, delay = 500) => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return [value, setValue, debouncedValue];
};

/**
 * Debounced analytics request hook
 */
export const useDebouncedAnalyticsRequest = (
  requestFunction,
  dependencies = [],
  delay = 500
) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  const debouncedRequest = useCallback(
    (...args) => {
      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      timeoutRef.current = setTimeout(async () => {
        try {
          setLoading(true);
          setError(null);

          // Create new abort controller
          abortControllerRef.current = new AbortController();

          const result = await requestFunction(...args, {
            signal: abortControllerRef.current.signal,
          });

          setData(result);
        } catch (err) {
          if (err.name !== "AbortError") {
            setError(err);
          }
        } finally {
          setLoading(false);
        }
      }, delay);
    },
    [requestFunction, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { data, loading, error, debouncedRequest };
};

/**
 * Analytics filters hook with debouncing
 */
export const useAnalyticsFilters = (
  initialFilters = {},
  onFiltersChange,
  delay = 300
) => {
  const [filters, setFilters] = useState(initialFilters);
  const [debouncedFilters, setDebouncedFilters] = useState(initialFilters);
  const timeoutRef = useRef(null);

  // Update individual filter
  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Update multiple filters at once
  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  // Debounce filter changes
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedFilters(filters);
      if (onFiltersChange) {
        onFiltersChange(filters);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [filters, onFiltersChange, delay]);

  return {
    filters,
    debouncedFilters,
    updateFilter,
    updateFilters,
    resetFilters,
    hasActiveFilters: Object.keys(filters).some(
      (key) =>
        filters[key] !== initialFilters[key] &&
        filters[key] !== "" &&
        filters[key] !== null &&
        filters[key] !== undefined
    ),
  };
};

/**
 * Virtual scrolling hook for large datasets
 */
export const useVirtualScrolling = (
  items = [],
  itemHeight = 50,
  containerHeight = 400,
  overscan = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItemsCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    startIndex + visibleItemsCount + overscan * 2
  );

  const visibleItems = items
    .slice(startIndex, endIndex + 1)
    .map((item, index) => ({
      ...item,
      index: startIndex + index,
      style: {
        position: "absolute",
        top: (startIndex + index) * itemHeight,
        height: itemHeight,
        width: "100%",
      },
    }));

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((event) => {
    setScrollTop(event.target.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    containerProps: {
      style: {
        height: containerHeight,
        overflowY: "auto",
        position: "relative",
      },
      onScroll: handleScroll,
    },
  };
};

/**
 * Performance monitoring hook
 */
export const usePerformanceMonitoring = (componentName) => {
  const renderStartTime = useRef(Date.now());
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    renderCount: 0,
    averageRenderTime: 0,
  });

  useEffect(() => {
    const renderTime = Date.now() - renderStartTime.current;

    setMetrics((prev) => {
      const newRenderCount = prev.renderCount + 1;
      const newAverageRenderTime =
        (prev.averageRenderTime * prev.renderCount + renderTime) /
        newRenderCount;

      return {
        renderTime,
        renderCount: newRenderCount,
        averageRenderTime: Math.round(newAverageRenderTime),
      };
    });

    // Log performance metrics for development
    if (process.env.NODE_ENV === "development") {
      console.log(`${componentName} render time: ${renderTime}ms`);
    }

    renderStartTime.current = Date.now();
  }, [componentName]);

  return metrics;
};

/**
 * Memory-efficient data processing hook
 */
export const useDataProcessor = (data, processor, dependencies = []) => {
  const memoizedProcessor = useCallback(processor, [
    processor,
    ...dependencies,
  ]);

  return useMemo(() => {
    if (!data || !Array.isArray(data)) return null;

    // Process data in chunks to avoid blocking UI
    const chunkSize = 1000;
    const chunks = [];

    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }

    return chunks.reduce((acc, chunk) => {
      return acc.concat(memoizedProcessor(chunk));
    }, []);
  }, [data, memoizedProcessor]);
};

/**
 * Analytics caching hook
 */
export const useAnalyticsCache = (key, fetcher, options = {}) => {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate = true,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const isStale = lastFetch && Date.now() - lastFetch > ttl;

  const fetchData = useCallback(
    async (force = false) => {
      if (loading && !force) return;

      try {
        setLoading(true);
        setError(null);

        const result = await fetcher();
        setData(result);
        setLastFetch(Date.now());

        // Cache to localStorage
        try {
          localStorage.setItem(
            `analytics_cache_${key}`,
            JSON.stringify({
              data: result,
              timestamp: Date.now(),
            })
          );
        } catch (cacheError) {
          console.warn("Failed to cache analytics data:", cacheError);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [key, fetcher, loading]
  );

  // Load from cache on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`analytics_cache_${key}`);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (age < ttl) {
          setData(cachedData);
          setLastFetch(timestamp);
          return;
        }
      }
    } catch (cacheError) {
      console.warn("Failed to load cached analytics data:", cacheError);
    }

    // No valid cache, fetch fresh data
    fetchData();
  }, [key, ttl, fetchData]);

  // Auto-refresh stale data
  useEffect(() => {
    if (staleWhileRevalidate && isStale && !loading) {
      fetchData();
    }
  }, [staleWhileRevalidate, isStale, loading, fetchData]);

  return {
    data,
    loading,
    error,
    isStale,
    refetch: () => fetchData(true),
    invalidate: () => {
      localStorage.removeItem(`analytics_cache_${key}`);
      setData(null);
      setLastFetch(null);
    },
  };
};

const AnalyticsPerformanceHooks = {
  useDebouncedState,
  useDebouncedAnalyticsRequest,
  useAnalyticsFilters,
  useVirtualScrolling,
  usePerformanceMonitoring,
  useDataProcessor,
  useAnalyticsCache,
};

export default AnalyticsPerformanceHooks;
