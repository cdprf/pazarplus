import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../utils/cn";
import { Badge, Button } from "../ui";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationCircleIcon,
  SunIcon,
  MoonIcon,
  ArrowRightOnRectangleIcon,
  WifiIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useQuickActions } from "./sidebar-navigation";

// Enhanced Sidebar Link with Error Handling and Animations
const EnhancedSidebarLink = ({
  item,
  isActive,
  onNavigate,
  isCollapsed,
  level = 0,
}) => {
  const [showSubItems, setShowSubItems] = useState(isActive);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasSubItems = item.subItems && item.subItems.length > 0;
  const location = useLocation();

  const handleClick = async (e) => {
    try {
      setError(null);

      if (hasSubItems && !isCollapsed) {
        e.preventDefault();
        setShowSubItems(!showSubItems);
      } else if (item.href !== location.pathname) {
        setIsLoading(true);
        // Simulate navigation loading (removed random error for production)
        await new Promise((resolve) => {
          setTimeout(resolve, 200);
        });
      }

      if (onNavigate) {
        onNavigate(item);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced tooltip handling for collapsed state
  const handleMouseEnter = (e) => {
    if (isCollapsed) {
      const tooltip = document.getElementById("sidebar-tooltip");
      if (tooltip) {
        tooltip.textContent = item.name;
        tooltip.classList.remove("opacity-0");
        tooltip.classList.add("opacity-100");

        const rect = e.currentTarget.getBoundingClientRect();
        tooltip.style.top = `${rect.top}px`;
      }
    }
  };

  const handleMouseLeave = () => {
    if (isCollapsed) {
      const tooltip = document.getElementById("sidebar-tooltip");
      if (tooltip) {
        tooltip.classList.remove("opacity-100");
        tooltip.classList.add("opacity-0");
      }
    }
  };

  return (
    <div className="space-y-1">
      <Link
        to={item.href}
        onClick={
          hasSubItems && !isCollapsed ? handleClick : () => handleClick()
        }
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          // Base classes following design system with consistent spacing
          "group relative flex items-center text-sm font-medium",
          "transition-all duration-200 ease-in-out",

          // Enhanced hover effects from design system - disabled for collapsed
          !isCollapsed && "rounded-lg hover:shadow-md hover:-translate-y-0.5",
          !isCollapsed &&
            "hover:bg-gradient-to-r hover:from-gray-50 hover:to-white",
          !isCollapsed &&
            "dark:hover:from-gray-800/50 dark:hover:to-gray-700/30",

          // Enhanced focus states with proper ring offset
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
          "focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",

          // Active states with improved contrast - special handling for collapsed
          isActive && !hasSubItems && isCollapsed
            ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-l-4 border-primary-500"
            : isActive && !hasSubItems && !isCollapsed
            ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-md border-l-4 border-primary-500"
            : hasSubItems && showSubItems
            ? "bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100"
            : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100",

          // Collapsed state with center alignment and proper spacing
          isCollapsed
            ? "justify-center p-0 w-full h-auto relative"
            : "px-3 py-2.5",

          // Error state with subtle indicator
          error && "ring-1 ring-red-500/50",

          // Loading state
          isLoading && "opacity-70 cursor-wait"
        )}
        aria-label={item.ariaLabel || item.name}
        aria-expanded={hasSubItems ? showSubItems : undefined}
        aria-current={isActive && !hasSubItems ? "page" : undefined}
        aria-describedby={error ? `${item.name}-error` : undefined}
        data-tooltip={isCollapsed ? item.name : undefined}
      >
        <div className="flex items-center w-full relative">
          {isLoading ? (
            <div className="animate-pulse w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded mr-3"></div>
          ) : (
            <item.icon
              className={cn(
                "h-5 w-5 transition-all duration-200 flex-shrink-0",
                "group-hover:scale-110 group-hover:text-primary-600 dark:group-hover:text-primary-400",
                isActive && "text-primary-600 dark:text-primary-400",
                !isCollapsed && "mr-3"
              )}
            />
          )}

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "truncate font-medium",
                    isActive && "font-semibold"
                  )}
                >
                  {item.name}
                </span>

                {/* Enhanced badges with proper semantic colors */}
                {item.badge && (
                  <Badge
                    variant={
                      item.badge === "new"
                        ? "success"
                        : item.badge === "beta"
                        ? "warning"
                        : "info"
                    }
                    size="sm"
                    className={cn(
                      "ml-2 animate-fade-in shadow-sm",
                      "transition-all duration-200 group-hover:scale-105",
                      item.badge === "new" &&
                        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                      item.badge === "beta" &&
                        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
                      item.badge !== "new" &&
                        item.badge !== "beta" &&
                        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>

              {/* Enhanced description with better typography */}
              {item.description && level === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity duration-200 truncate">
                  {item.description}
                </p>
              )}
            </div>
          )}

          {/* Enhanced chevron with better animation */}
          {hasSubItems && !isCollapsed && (
            <ChevronDownIcon
              className={cn(
                "ml-2 h-4 w-4 transition-all duration-300 ease-in-out flex-shrink-0",
                "group-hover:text-primary-600 dark:group-hover:text-primary-400",
                showSubItems &&
                  "rotate-180 text-primary-600 dark:text-primary-400"
              )}
            />
          )}
        </div>

        {/* Enhanced ripple effect with proper opacity - disabled for collapsed */}
        {!isCollapsed && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg" />
        )}

        {/* Error indicator with proper positioning */}
        {error && (
          <div className="absolute -top-1 -right-1">
            <ExclamationCircleIcon className="h-3 w-3 text-red-500" />
          </div>
        )}
      </Link>

      {/* Error message with proper ARIA */}
      {error && (
        <div
          id={`${item.name}-error`}
          className="px-3 py-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Enhanced sub-items with performance optimizations */}
      {hasSubItems && !isCollapsed && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            showSubItems
              ? "max-h-96 opacity-100 transform translate-y-0"
              : "max-h-0 opacity-0 transform -translate-y-2"
          )}
          aria-hidden={!showSubItems}
        >
          <div className="ml-8 mt-2 space-y-1">
            {item.subItems.map((subItem, index) => (
              <Link
                key={subItem.name}
                to={subItem.href}
                onClick={() => onNavigate(subItem)}
                className={cn(
                  "block px-3 py-2 text-sm rounded-md transition-all duration-200",
                  "hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:translate-x-1",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                  "focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",
                  location.pathname === subItem.href
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-l-2 border-primary-500 font-medium"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                )}
                aria-label={subItem.ariaLabel || subItem.name}
                aria-current={
                  location.pathname === subItem.href ? "page" : undefined
                }
                style={{
                  // Optimized animation with will-change for performance
                  willChange: showSubItems ? "opacity, transform" : "auto",
                  animationDelay: `${index * 50}ms`,
                  animation: showSubItems
                    ? "fadeInUp 0.3s ease-out forwards"
                    : "none",
                }}
              >
                <div className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-current rounded-full mr-3 opacity-60 flex-shrink-0"></div>
                  <span className="truncate">{subItem.name}</span>
                  {subItem.badge && (
                    <Badge
                      variant="info"
                      size="sm"
                      className="ml-auto flex-shrink-0"
                    >
                      {subItem.badge}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Sidebar Section Component with Collapsible Logic
const SidebarSection = ({ section, location, onNavigate, isCollapsed }) => {
  // If the section has defaultOpen property and it's true, don't collapse it initially
  const [isSectionCollapsed, setIsSectionCollapsed] = useState(
    section.defaultOpen === false
  );

  const toggleSection = (e) => {
    if (section.collapsible) {
      e.preventDefault();
      e.stopPropagation();
      setIsSectionCollapsed(!isSectionCollapsed);
    }
  };

  return (
    <div className="sidebar-section">
      {section.title && !isCollapsed && (
        <button
          onClick={toggleSection}
          className={cn(
            "sidebar-section-header w-full text-left transition-all duration-200 px-2 py-1 rounded-lg",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1",
            "focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",
            section.collapsible
              ? "sidebar-section-header-collapsible hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              : "sidebar-section-header-static cursor-default"
          )}
          aria-expanded={section.collapsible ? !isSectionCollapsed : undefined}
          aria-label={
            section.collapsible
              ? `${section.title} bölümünü ${
                  isSectionCollapsed ? "aç" : "kapat"
                }`
              : section.title
          }
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {section.title}
            </span>
            {section.collapsible && (
              <ChevronRightIcon
                className={cn(
                  "sidebar-section-chevron w-3 h-3 transition-transform duration-300 ease-in-out",
                  !isSectionCollapsed && "rotate-90"
                )}
              />
            )}
          </div>
        </button>
      )}

      {(!section.collapsible || !isSectionCollapsed) && (
        <div
          className={cn(
            "sidebar-section-items transition-all duration-300 ease-in-out",
            section.title && !isCollapsed ? "mt-3" : "",
            isSectionCollapsed
              ? "opacity-0 max-h-0 overflow-hidden"
              : "opacity-100 max-h-[1000px] animate-fade-in" /* fixed height limit issue */
          )}
          aria-hidden={section.collapsible && isSectionCollapsed}
        >
          <div className={cn("space-y-1", isCollapsed && "space-y-0")}>
            {section.items.map((item, index) => (
              <div
                key={item.name}
                className={cn(
                  "animate-slide-in-left",
                  isCollapsed && "nav-item"
                )}
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <EnhancedSidebarLink
                  item={item}
                  isActive={
                    location.pathname === item.href ||
                    location.pathname.startsWith(item.href + "/") ||
                    (item.subItems &&
                      item.subItems.some(
                        (sub) => location.pathname === sub.href
                      ))
                  }
                  onNavigate={onNavigate}
                  isCollapsed={isCollapsed}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Quick Actions Panel Component
const QuickActionsPanel = ({ isCollapsed = false }) => {
  const { actions, handleAction, isLoading } = useQuickActions();

  if (isCollapsed) return null;

  return (
    <div className="quick-actions">
      <h4 className="quick-actions-header font-medium text-gray-700 dark:text-gray-300 px-1 text-xs uppercase tracking-wider mb-2">
        Quick Actions
      </h4>
      <div className="quick-actions-grid space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          const loading = isLoading[action.action];

          return (
            <Button
              key={action.name}
              variant="ghost"
              size="sm"
              onClick={() => handleAction(action.action)}
              className="quick-action-btn w-full justify-between text-gray-700 dark:text-gray-300 px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              disabled={loading}
              aria-label={`${action.ariaLabel}${
                action.shortcut ? ` (${action.shortcut})` : ""
              }`}
              title={
                action.shortcut ? `Shortcut: ${action.shortcut}` : undefined
              }
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin mr-2" />
              ) : (
                <Icon className="w-4 h-4 mr-2" />
              )}
              <span className="text-sm">{action.name}</span>
              {action.shortcut && (
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                  {action.shortcut}
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

// Enhanced Skeleton Loader Component
const SidebarSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[...Array(3)].map((_, sectionIndex) => (
      <div key={sectionIndex} className="space-y-2">
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
        {[...Array(4)].map((_, itemIndex) => (
          <div key={itemIndex} className="flex items-center space-x-3 p-3">
            <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

// Enhanced Error Boundary for Sidebar Sections
const SidebarErrorBoundary = ({ children, fallback }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (error) => {
      console.error("Sidebar navigation error:", error);
      setHasError(true);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError) {
    return (
      <div className="p-4 text-center">
        <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {fallback || "Navigation section failed to load"}
        </p>
        <button
          onClick={() => setHasError(false)}
          className="mt-2 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          Try again
        </button>
      </div>
    );
  }

  return children;
};

// Enhanced Connection Status Indicator
const ConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState("good");

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Enhanced connection quality detection
    const detectConnectionQuality = () => {
      if (navigator.connection) {
        const { effectiveType, downlink } = navigator.connection;
        if (effectiveType === "4g" && downlink > 10) {
          setConnectionQuality("good");
        } else if (effectiveType === "3g" || downlink > 1) {
          setConnectionQuality("fair");
        } else {
          setConnectionQuality("poor");
        }
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (navigator.connection) {
      navigator.connection.addEventListener("change", detectConnectionQuality);
      detectConnectionQuality();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (navigator.connection) {
        navigator.connection.removeEventListener(
          "change",
          detectConnectionQuality
        );
      }
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-xs rounded-md mb-3">
        <WifiIcon className="h-4 w-4" />
        <span>Offline mode</span>
      </div>
    );
  }

  if (connectionQuality === "poor") {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 text-xs rounded-md mb-3">
        <WifiIcon className="h-4 w-4" />
        <span>Slow connection</span>
      </div>
    );
  }

  return null;
};

// Enhanced User Profile Component
const UserProfile = ({
  user,
  onLogout,
  onThemeToggle,
  theme,
  isCollapsed = false,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleThemeToggle = () => {
    onThemeToggle();
    setShowUserMenu(false);
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    onLogout();
  };

  if (isCollapsed) {
    return (
      <div className="user-profile-collapsed">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          aria-label="User menu"
          aria-expanded={showUserMenu}
        >
          {user?.email?.charAt(0).toUpperCase() || "U"}
        </button>

        {showUserMenu && (
          <div className="user-menu-dropdown">
            <button
              onClick={handleThemeToggle}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              {theme === "dark" ? (
                <SunIcon className="h-4 w-4 mr-2" />
              ) : (
                <MoonIcon className="h-4 w-4 mr-2" />
              )}
              Theme
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="user-profile p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="user-info flex items-center space-x-3 mb-3">
        <div className="user-avatar w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
          <span className="user-avatar-text text-white font-medium text-sm">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </span>
        </div>
        <div className="user-details flex-1 min-w-0">
          <p className="user-name text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {user?.email || "User"}
          </p>
          <p className="user-role text-xs text-gray-500 dark:text-gray-400">
            Administrator
          </p>
        </div>
      </div>

      <div className="user-actions flex space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleThemeToggle}
          className="user-action-btn flex-1 text-xs px-2 py-1.5"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <SunIcon className="h-3 w-3 mr-1" />
          ) : (
            <MoonIcon className="h-3 w-3 mr-1" />
          )}
          Theme
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="user-action-btn flex-1 text-xs px-2 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          aria-label="Logout"
        >
          <ArrowRightOnRectangleIcon className="h-3 w-3 mr-1" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export {
  SidebarSection,
  EnhancedSidebarLink,
  SidebarSkeleton,
  QuickActionsPanel,
  SidebarErrorBoundary,
  ConnectionStatus,
  UserProfile,
};
