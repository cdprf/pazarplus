import logger from "../../utils/logger.js";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import { cn } from "../../utils/cn";
import { Button } from "../ui";

// Import all the parts we created
import {
  SidebarErrorBoundary,
  useOrderCounts,
  useMobileDetection,
  useSidebarCollapse,
  useKeyboardNavigation,
  useSidebarState,
} from "./sidebar-hooks";

// Import icons from the correct Heroicons v2 paths
import {
  ChevronRightIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  SunIcon,
  MoonIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

import { useNavigationSections, ConnectionStatus } from "./sidebar-navigation";

import { SidebarSection, QuickActionsPanel } from "./sidebar-components";

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Use our enhanced hooks
  const {
    orderCounts,
    isLoading: orderCountsLoading,
    error: orderCountsError,
  } = useOrderCounts();
  const isMobile = useMobileDetection();
  const { isDesktopCollapsed, toggleDesktopCollapse } = useSidebarCollapse();

  // Use keyboard navigation hook
  useKeyboardNavigation(isOpen, onClose);

  // Use sidebar state persistence
  const { addToRecentlyUsed } = useSidebarState();

  // Get navigation sections with current order counts
  const navigationSections = useNavigationSections(orderCounts, []);

  // Handle navigation with proper mobile/desktop behavior
  const handleNavigation = (item) => {
    // Add to recently used items
    if (item) {
      addToRecentlyUsed(item);
    }

    // Only close mobile sidebar, not desktop collapse
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Handle logout with confirmation
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      logger.error("Logout failed:", error);
    }
  };

  // Auto-close mobile sidebar when switching to desktop
  React.useEffect(() => {
    if (!isMobile && isOpen && onClose) {
      onClose();
    }
  }, [isMobile, isOpen, onClose]);

  return (
    <SidebarErrorBoundary>
      {/* Mobile backdrop - only show on mobile when open */}
      {isMobile && isOpen && (
        <div
          className="sidebar-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm backdrop lg:hidden transition-opacity duration-300 ease-in-out"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <div
        className={cn(
          "sidebar-container fixed top-16 bottom-0 left-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700",
          "transform transition-all duration-300 ease-in-out z-30 shadow-xl lg:shadow-sm",
          "lg:relative lg:top-0",
          // Mobile states
          isMobile &&
            (isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"),
          // Desktop collapse state
          !isMobile && isDesktopCollapsed && "desktop-collapsed w-16"
        )}
        style={{ height: isMobile ? "calc(100vh - 4rem)" : "100%" }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="sidebar flex flex-col h-full">
          {/* Header */}
          <div className="sidebar-header flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <span
                className={cn(
                  "sidebar-title text-lg font-semibold text-gray-900 dark:text-gray-100 transition-all duration-300",
                  isDesktopCollapsed && !isMobile && "lg:opacity-0 lg:scale-0"
                )}
              >
                Navigation
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Desktop collapse toggle - only on desktop */}
              {!isMobile && (
                <button
                  onClick={toggleDesktopCollapse}
                  className="hidden lg:flex p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                  aria-label={
                    isDesktopCollapsed ? "Expand sidebar" : "Collapse sidebar"
                  }
                  title={
                    isDesktopCollapsed ? "Expand sidebar" : "Collapse sidebar"
                  }
                >
                  <ChevronRightIcon
                    className={cn(
                      "h-4 w-4 transition-transform duration-300",
                      isDesktopCollapsed ? "rotate-0" : "rotate-180"
                    )}
                  />
                </button>
              )}

              {/* Mobile close button - only on mobile */}
              {isMobile && (
                <button
                  onClick={onClose}
                  className="sidebar-close-btn p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                  aria-label="Close navigation"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Connection Status */}
          <div className="px-4 pt-4">
            <ConnectionStatus />
          </div>

          {/* Order Counts Loading/Error States */}
          {orderCountsLoading && !isDesktopCollapsed && (
            <div className="px-4 py-2">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <div className="w-3 h-3 border border-gray-300 border-t-primary-500 rounded-full animate-spin"></div>
                <span>Loading order counts...</span>
              </div>
            </div>
          )}

          {orderCountsError && !isDesktopCollapsed && (
            <div className="px-4 py-2">
              <div className="flex items-center space-x-2 text-xs text-red-600 dark:text-red-400">
                <ExclamationCircleIcon className="w-3 h-3" />
                <span>Failed to load order counts</span>
              </div>
            </div>
          )}

          {/* Navigation - Scrollable Middle Section */}
          <nav
            className="sidebar-nav flex-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 min-h-0"
            aria-hidden={isMobile ? !isOpen : isDesktopCollapsed}
          >
            <div className="sidebar-sections space-y-6">
              {navigationSections.map((section) => (
                <SidebarSection
                  key={section.id}
                  section={section}
                  location={location}
                  onNavigate={handleNavigation}
                  isCollapsed={!isMobile && isDesktopCollapsed}
                />
              ))}
            </div>
          </nav>

          {/* Footer - Only show when not collapsed */}
          {(!isDesktopCollapsed || isMobile) && (
            <div className="sidebar-footer px-4 py-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-t from-gray-50 via-gray-50/80 to-transparent dark:from-gray-800 dark:via-gray-800/80 dark:to-transparent backdrop-blur-sm space-y-4 flex-shrink-0">
              {/* Quick Actions */}
              <QuickActionsPanel
                isCollapsed={isDesktopCollapsed && !isMobile}
              />

              {/* User Profile */}
              <div className="user-profile space-y-3">
                <div className="user-info flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-gray-100/80 to-gray-200/60 dark:from-gray-800/80 dark:to-gray-700/60 backdrop-blur-sm">
                  <div className="user-avatar w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg">
                    <span className="user-avatar-text text-white font-medium text-sm">
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="user-details flex-1 min-w-0">
                    <p className="user-name text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {user?.email || "User"}
                    </p>
                    <p className="user-role text-xs text-gray-500 dark:text-gray-400 leading-tight">
                      Administrator
                    </p>
                  </div>
                </div>

                <div className="user-actions flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTheme}
                    className="user-action-btn flex-1 justify-center text-xs px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-all duration-200"
                    aria-label={`Switch to ${
                      theme === "dark" ? "light" : "dark"
                    } theme`}
                  >
                    {theme === "dark" ? (
                      <SunIcon className="w-4 h-4 mr-1" />
                    ) : (
                      <MoonIcon className="w-4 h-4 mr-1" />
                    )}
                    <span>Theme</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="user-action-btn flex-1 justify-center text-xs px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-all duration-200"
                    aria-label="Logout"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4 mr-1" />
                    <span>Logout</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarErrorBoundary>
  );
};

export default Sidebar;
