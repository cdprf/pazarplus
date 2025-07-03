// Part 1: Enhanced Hooks and Utilities for Sidebar
// Add these hooks to your Sidebar component file

import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../hooks/useAuth";
import { useNetworkAwareInterval } from "../../hooks/useNetworkStatus";
import api from "../../services/api";

// Enhanced Error Boundary Component
class SidebarErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Sidebar Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Navigation failed to load
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded"
          >
            Try again
          </button>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-xs text-gray-500">
                Error Details
              </summary>
              <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap max-h-32 overflow-auto">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// Enhanced Order Counts Hook with Smart Fetching
const useOrderCounts = () => {
  const [orderCounts, setOrderCounts] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    claimCreated: 0,
    claimApproved: 0,
    claimRejected: 0,
    returned: 0,
    refunded: 0,
    cancelled: 0,
    delivered: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const { isAuthenticated } = useAuth();
  const abortControllerRef = useRef(null);
  const intervalRef = useRef(null);
  const retryCountRef = useRef(0);

  const fetchOrderCounts = useCallback(
    async (force = false) => {
      if (!isAuthenticated) return;

      // Skip if recently fetched (unless forced)
      const now = Date.now();
      if (!force && lastFetch && now - lastFetch < 30000) {
        return;
      }

      // Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(true);
      setError(null);

      try {
        // First try stats endpoint (more efficient)
        let statsResponse;
        try {
          statsResponse = await api.orders.getOrderStats?.({
            signal: abortControllerRef.current.signal,
          });
        } catch (e) {
          // Stats endpoint might not exist, continue to fallback
          console.log("Stats endpoint not available, using fallback");
        }

        if (statsResponse?.success && statsResponse.data) {
          const counts = {
            total: statsResponse.data.total || 0,
            pending: statsResponse.data.pending || 0,
            processing: statsResponse.data.processing || 0,
            shipped: statsResponse.data.shipped || 0,
            delivered: statsResponse.data.delivered || 0,
          };
          setOrderCounts(counts);
          setLastFetch(now);
          retryCountRef.current = 0;
          console.log("Order counts updated from stats:", counts);
          return;
        }

        // Fallback to orders endpoint with minimal data
        const response = await api.orders.getOrders({
          page: 0,
          size: 1, // Minimal fetch for count only
          signal: abortControllerRef.current.signal,
        });

        if (response.success) {
          let totalOrders = 0;
          if (Array.isArray(response.data)) {
            totalOrders = response.data.length;
          } else if (response.data && response.data.total) {
            totalOrders = response.data.total;
          } else if (response.data && Array.isArray(response.data.data)) {
            totalOrders = response.data.total || response.data.data.length;
          }

          setOrderCounts((prev) => ({
            ...prev,
            total: totalOrders,
          }));
          setLastFetch(now);
          retryCountRef.current = 0;
          console.log("Order counts updated from orders API:", {
            total: totalOrders,
          });
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error fetching order counts:", error);
          setError(error.message);

          // Exponential backoff retry
          retryCountRef.current += 1;
          const retryDelay = Math.min(
            5000 * Math.pow(2, retryCountRef.current),
            60000
          );

          setTimeout(() => {
            if (isAuthenticated && retryCountRef.current < 5) {
              fetchOrderCounts();
            }
          }, retryDelay);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, lastFetch]
  );

  // Smart interval management with visibility detection
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchOrderCounts(true); // Initial fetch

    // Use Page Visibility API to pause fetching when tab not visible
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;

      if (isVisible) {
        // Resume fetching when tab becomes visible
        fetchOrderCounts();
        if (!intervalRef.current) {
          intervalRef.current = setInterval(() => {
            if (!document.hidden) {
              fetchOrderCounts();
            }
          }, 30000);
        }
      } else {
        // Pause interval when tab hidden
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Start interval
    intervalRef.current = setInterval(() => {
      if (!document.hidden) {
        fetchOrderCounts();
      }
    }, 30000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchOrderCounts, isAuthenticated]);

  return {
    orderCounts,
    isLoading,
    error,
    refetch: () => fetchOrderCounts(true),
  };
};

// Enhanced Connection Status Hook
const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState("good");

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Test connection quality periodically
    const testConnection = async () => {
      if (!navigator.onLine) return;

      const start = Date.now();
      try {
        // Use a lightweight endpoint or create one
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        await fetch("/api/health", {
          method: "HEAD",
          cache: "no-cache",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - start;
        setConnectionQuality(
          duration < 200 ? "good" : duration < 500 ? "fair" : "poor"
        );
      } catch (error) {
        setConnectionQuality("poor");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = setInterval(testConnection, 60000); // Test every minute
    testConnection(); // Initial test

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, connectionQuality };
};

// Mobile Detection Hook
const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return isMobile;
};

// Sidebar Collapse State Hook
const useSidebarCollapse = () => {
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() => {
    // Load saved state from localStorage
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved === "true";
  });

  const toggleDesktopCollapse = useCallback(() => {
    setIsDesktopCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebar-collapsed", newState.toString());
      return newState;
    });
  }, []);

  return { isDesktopCollapsed, toggleDesktopCollapse };
};

// Keyboard Navigation Hook for Enhanced Accessibility
const useKeyboardNavigation = (isOpen, onClose) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Close sidebar with Escape key
      if (e.key === "Escape") {
        onClose?.();
        return;
      }

      // Focus management for better accessibility
      if (e.key === "Tab") {
        const sidebar = document.querySelector(".sidebar-container");
        if (!sidebar) return;

        const focusableElements = sidebar.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
};

// Sidebar State Persistence Hook
const useSidebarState = () => {
  const [sidebarPreferences, setSidebarPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar-preferences");
      return saved
        ? JSON.parse(saved)
        : {
            expandedSections: {},
            recentlyUsed: [],
            favoriteItems: [],
          };
    } catch {
      return { expandedSections: {}, recentlyUsed: [], favoriteItems: [] };
    }
  });

  const updatePreferences = useCallback((updates) => {
    setSidebarPreferences((prev) => {
      const newPrefs = { ...prev, ...updates };
      localStorage.setItem("sidebar-preferences", JSON.stringify(newPrefs));
      return newPrefs;
    });
  }, []);

  const addToRecentlyUsed = useCallback(
    (item) => {
      updatePreferences({
        recentlyUsed: [
          item,
          ...sidebarPreferences.recentlyUsed.filter(
            (i) => i.href !== item.href
          ),
        ].slice(0, 5), // Keep only 5 recent items
      });
    },
    [sidebarPreferences.recentlyUsed, updatePreferences]
  );

  const toggleFavorite = useCallback(
    (item) => {
      const isFavorite = sidebarPreferences.favoriteItems.some(
        (f) => f.href === item.href
      );
      updatePreferences({
        favoriteItems: isFavorite
          ? sidebarPreferences.favoriteItems.filter((f) => f.href !== item.href)
          : [...sidebarPreferences.favoriteItems, item],
      });
    },
    [sidebarPreferences.favoriteItems, updatePreferences]
  );

  return {
    sidebarPreferences,
    updatePreferences,
    addToRecentlyUsed,
    toggleFavorite,
  };
};

export {
  SidebarErrorBoundary,
  useOrderCounts,
  useConnectionStatus,
  useMobileDetection,
  useSidebarCollapse,
  useKeyboardNavigation,
  useSidebarState,
};
