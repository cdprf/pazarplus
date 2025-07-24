import logger from "../../utils/logger";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import { cn } from "../../utils/cn";
import "../../styles/sidebar.css"; // Import sidebar CSS for enhanced styling
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  SidebarSection,
  SidebarSkeleton,
  QuickActionsPanel,
  SidebarErrorBoundary,
  ConnectionStatus,
  UserProfile,
} from "./sidebar-components";
import { useOrderCounts, createNavigationSections } from "./sidebar-navigation";
import { SidebarPerformanceOptimization } from "./sidebar-performance";

const AdvancedSidebar = ({ isOpen, onToggle, className, ...props }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Enhanced state management
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isToggleAnimating, setIsToggleAnimating] = useState(false);

  // Enhanced hooks for data and navigation
  const {
    orderCounts,
    isLoading: orderCountsLoading,
    error: orderCountsError,
    refetch,
  } = useOrderCounts();

  // Create navigation sections with order counts
  const navigationSections = useMemo(
    () => createNavigationSections(orderCounts),
    [orderCounts]
  );

  // Enhanced mobile detection with proper SSR handling and debouncing
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Safe mobile detection for SSR
    const checkMobile = () => {
      if (typeof window !== "undefined") {
        return window.innerWidth < 768; // Match Tailwind's md breakpoint
      }
      return false;
    };

    setIsMobile(checkMobile());

    // Debounced resize handler to prevent performance issues
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const mobile = checkMobile();
        setIsMobile(mobile);

        // Auto-collapse on mobile
        if (mobile && isOpen) {
          setIsCollapsed(false);
        }
      }, 150); // 150ms debounce
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, [isOpen]);

  // Enhanced navigation handler with analytics
  const handleNavigation = useCallback(
    (item) => {
      // Analytics tracking
      if (window.gtag) {
        window.gtag("event", "sidebar_navigation", {
          page_path: item.href,
          item_name: item.name,
        });
      }

      // Close mobile sidebar when navigating
      if (isMobile && onToggle) {
        onToggle();
      }
    },
    [isMobile, onToggle]
  );

  // Enhanced logout handler
  const handleLogout = useCallback(async () => {
    try {
      setIsLoading(true);
      await logout();
      navigate("/login");
    } catch (error) {
      logger.error("Logout failed:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [logout, navigate]);

  // Enhanced collapse toggle with animation feedback
  const handleCollapseToggle = useCallback(() => {
    if (!isMobile && !isToggleAnimating) {
      setIsToggleAnimating(true);
      setIsCollapsed(!isCollapsed);

      // Save preference to localStorage
      localStorage.setItem("sidebar-collapsed", (!isCollapsed).toString());

      // Reset animation state after transition
      setTimeout(() => {
        setIsToggleAnimating(false);
      }, 300);
    }
  }, [isCollapsed, isMobile, isToggleAnimating]);

  // Enhanced mobile toggle with haptic feedback
  const handleMobileToggle = useCallback(() => {
    if (isMobile && onToggle) {
      // Add haptic feedback on supported devices
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      onToggle();
    }
  }, [isMobile, onToggle]);

  // Load collapse preference on mount
  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    if (savedCollapsed && !isMobile) {
      setIsCollapsed(savedCollapsed === "true");
    }
  }, [isMobile]);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e) => {
      // Ctrl/Cmd + B to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        if (isMobile) {
          handleMobileToggle();
        } else {
          handleCollapseToggle();
        }
      }

      // Escape to close mobile sidebar
      if (e.key === "Escape" && isMobile && isOpen) {
        e.preventDefault();
        handleMobileToggle();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [isMobile, isOpen, handleMobileToggle, handleCollapseToggle]);

  // Enhanced error retry logic
  const handleRetry = useCallback(() => {
    setHasError(false);
    setRetryCount((prev) => prev + 1);
    refetch();
  }, [refetch]);

  // Loading state
  if (isLoading && !isAuthenticated) {
    return (
      <div
        className={cn(
          "fixed left-0 top-16 h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out",
          "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700",
          "shadow-xl dark:shadow-2xl z-30", // Fixed z-index to be below navbar (z-50)
          isOpen ? "w-80 translate-x-0" : "w-80 -translate-x-full"
        )}
      >
        <SidebarSkeleton />
      </div>
    );
  }

  return (
    <>
      {/* Enhanced Mobile backdrop with proper z-index hierarchy */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300 lg:hidden"
          style={{ zIndex: 30 }} /* Use explicit z-index value */
          onClick={onToggle}
        />
      )}

      {/* Sidebar Container with proper z-index and enhanced styling */}
      <aside
        className={cn(
          "sidebar-container sidebar",
          "fixed left-0 top-16 h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out",
          "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700",
          "dark:shadow-2xl",

          // Mobile behavior
          "lg:relative lg:top-0 lg:h-full lg:min-h-0",
          {
            "translate-x-0": isOpen,
            "-translate-x-full lg:translate-x-0": !isOpen,
            "w-20": isCollapsed && !isOpen,
            "w-80": !isCollapsed || isOpen,
            collapsed: isCollapsed,
          }
        )}
        style={{
          zIndex: 40,
        }} /* Use explicit z-index value lower than navbar */
        onMouseEnter={() => {}}
        onMouseLeave={() => {}}
        role="navigation"
        aria-label="Main navigation"
        {...props}
      >
        <div className="h-full flex flex-col">
          {/* Enhanced Header with improved toggle button */}
          <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center space-x-2">
              {/* Enhanced Desktop collapse toggle */}
              {!isMobile && (
                <button
                  onClick={handleCollapseToggle}
                  disabled={isToggleAnimating}
                  className={cn(
                    "group relative p-2 rounded-lg transition-all duration-200",
                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                    "focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                    "active:scale-95",
                    isToggleAnimating && "animate-pulse"
                  )}
                  aria-label={
                    isCollapsed ? "Expand sidebar" : "Collapse sidebar"
                  }
                  title={`${
                    isCollapsed ? "Expand" : "Collapse"
                  } sidebar (Ctrl+B)`}
                >
                  <div className="relative">
                    {isCollapsed ? (
                      <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 transition-transform duration-200 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
                    ) : (
                      <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 transition-transform duration-200 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
                    )}

                    {/* Enhanced visual feedback ring */}
                    <div className="absolute inset-0 rounded-lg bg-primary-500/10 scale-0 group-hover:scale-100 transition-transform duration-200" />
                  </div>

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap sidebar-tooltip z-50">
                      Expand sidebar
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
                    </div>
                  )}
                </button>
              )}

              {/* Enhanced Mobile close button */}
              {isMobile && (
                <button
                  onClick={handleMobileToggle}
                  className={cn(
                    "group relative p-2 rounded-lg transition-all duration-200",
                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                    "focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                    "active:scale-95"
                  )}
                  aria-label="Close sidebar"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 transition-transform duration-200 group-hover:text-red-600 dark:group-hover:text-red-400 group-hover:rotate-90" />

                  {/* Enhanced visual feedback ring */}
                  <div className="absolute inset-0 rounded-lg bg-red-500/10 scale-0 group-hover:scale-100 transition-transform duration-200" />
                </button>
              )}

              {/* Brand/Logo area when not collapsed */}
              {!isCollapsed && (
                <div className="flex items-center space-x-2 ml-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-sm">P+</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                    Navigation
                  </span>
                </div>
              )}
            </div>

            {/* Additional header actions when expanded */}
            {!isCollapsed && !isMobile && (
              <div className="flex items-center space-x-1">
                {/* Quick settings or other actions can go here */}
                <div
                  className="w-2 h-2 rounded-full bg-green-500 animate-pulse"
                  title="Connected"
                />
              </div>
            )}
          </header>

          {/* Enhanced Connection Status */}
          {!isCollapsed && (
            <div className="px-4 pt-3">
              <ConnectionStatus />
            </div>
          )}

          {/* Enhanced Navigation with Error Boundary */}
          <nav
            className={cn(
              "flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 min-h-0 sidebar-navigation",
              isCollapsed ? "px-0 py-0" : "px-1 py-1"
            )}
            role="navigation"
            aria-label="Main menu"
          >
            <SidebarErrorBoundary fallback="Navigation failed to load">
              <SidebarPerformanceOptimization>
                <div className={cn("space-y-6", isCollapsed && "space-y-0")}>
                  {navigationSections.map((section) => (
                    <SidebarSection
                      key={section.id}
                      section={section}
                      location={location}
                      onNavigate={handleNavigation}
                      isCollapsed={isCollapsed}
                    />
                  ))}
                </div>
              </SidebarPerformanceOptimization>
            </SidebarErrorBoundary>

            {/* Order counts error state */}
            {orderCountsError && !isCollapsed && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Failed to load order counts
                </p>
                <button
                  onClick={handleRetry}
                  className="mt-1 text-xs text-red-600 dark:text-red-400 hover:underline focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                >
                  Retry ({retryCount})
                </button>
              </div>
            )}
          </nav>

          {/* Enhanced Footer */}
          <footer className="border-t border-gray-200 dark:border-gray-700 mt-auto bg-white dark:bg-gray-900 flex-shrink-0">
            {/* Quick Actions Panel */}
            <div className="p-4">
              <QuickActionsPanel isCollapsed={isCollapsed} />
            </div>

            {/* Enhanced User Profile */}
            <UserProfile
              user={user}
              onLogout={handleLogout}
              onThemeToggle={toggleTheme}
              theme={theme}
              isCollapsed={isCollapsed}
            />
          </footer>
        </div>

        {/* Enhanced Tooltip for collapsed items with proper z-index */}
        {isCollapsed && (
          <div
            id="sidebar-tooltip"
            className="absolute left-full ml-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg opacity-0 pointer-events-none transition-opacity duration-200 z-50"
            role="tooltip"
            aria-hidden="true"
          />
        )}
      </aside>

      {/* Accessibility announcements */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {isLoading && "Loading sidebar..."}
        {hasError && "Sidebar error occurred"}
        {orderCountsLoading && "Loading order counts..."}
        {isToggleAnimating &&
          (isCollapsed ? "Expanding sidebar..." : "Collapsing sidebar...")}
      </div>
    </>
  );
};

export default AdvancedSidebar;
