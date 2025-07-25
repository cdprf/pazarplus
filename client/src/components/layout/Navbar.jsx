import logger from "../../utils/logger.js";
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "../../i18n/hooks/useTranslation";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import { useNotification } from "../../contexts/NotificationContext";
import { useWebSocketNotifications } from "../../hooks/useWebSocketNotifications";
import { cn } from "../../utils/cn";
import { Button, Badge, Tooltip } from "../ui";
import LanguageSwitcher from "../common/LanguageSwitcher";
import api from "../../services/api";
import {
  Bars3Icon,
  UserIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
  BellIcon,
  ComputerDesktopIcon,
  ChevronDownIcon,
  HomeIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  TruckIcon,
  MagnifyingGlassIcon,
  CommandLineIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const Navbar = ({ toggleSidebar }) => {
  const { t } = useTranslation();
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, setLightTheme, setDarkTheme, followSystemTheme, systemTheme } =
    useTheme();
  const { notifications, unreadCount, markAllAsRead } = useNotification();
  const { isConnected: wsConnected } = useWebSocketNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [orderCounts, setOrderCounts] = useState({
    total: 0,
    newOrders: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
  });

  const userMenuRef = useRef(null);
  const themeMenuRef = useRef(null);
  const notificationRef = useRef(null);
  const searchRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Fetch order counts for navigation badges with proper cancellation handling
  useEffect(() => {
    let isMounted = true;

    const fetchOrderCounts = async () => {
      if (!isAuthenticated || !isMounted || isFetchingRef.current) return;

      try {
        isFetchingRef.current = true;

        // Cancel any pending request before making a new one
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // Use shorter timeout for navbar background requests with abort signal
        const response = await api.orders.getOrders(
          { page: 1, limit: 1 }, // Minimal data request
          {
            timeout: 8000, // Shorter timeout
            signal: abortControllerRef.current.signal,
          }
        );

        if (!isMounted || abortControllerRef.current?.signal.aborted) {
          logger.info("📊 Order count request was cancelled");
          return;
        }

        if (response.success || response.data) {
          // Get total count from response
          let totalOrders = 0;

          if (Array.isArray(response.data)) {
            totalOrders = response.data.length;
          } else if (response.data && response.data.total) {
            totalOrders = response.data.total;
          } else if (response.data && Array.isArray(response.data.data)) {
            totalOrders = response.data.data.length;
          }

          // Also fetch stats for different statuses
          try {
            const statsResponse = await api.orders.getOrderStats?.(
              {},
              {
                signal: abortControllerRef.current.signal,
                timeout: 6000,
              }
            );

            if (!isMounted || abortControllerRef.current?.signal.aborted) {
              logger.info("📊 Order stats request was cancelled");
              return;
            }

            let counts = {
              total: totalOrders,
              newOrders: 0,
              pending: 0,
              processing: 0,
              shipped: 0,
              delivered: 0,
            };

            if (statsResponse?.success && statsResponse.data) {
              counts = {
                total: statsResponse.data.total || totalOrders,
                newOrders: statsResponse.data.newOrders || 0,
                pending: statsResponse.data.pending || 0,
                processing: statsResponse.data.processing || 0,
                shipped: statsResponse.data.shipped || 0,
                delivered: statsResponse.data.delivered || 0,
              };
            }

            setOrderCounts(counts);
            logger.info("Order counts updated:", counts);
          } catch (statsError) {
            // If stats fetch fails, just use basic counts
            if (
              isMounted &&
              statsError.name !== "AbortError" &&
              statsError.code !== "ERR_CANCELED"
            ) {
              setOrderCounts((prev) => ({
                ...prev,
                total: totalOrders,
              }));
            }
          }
        }
      } catch (error) {
        // Don't log cancelled requests as errors
        if (
          error.name === "AbortError" ||
          error.message === "canceled" ||
          error.code === "ERR_CANCELED"
        ) {
          logger.info(
            "📊 Navbar order count request was cancelled (normal behavior)"
          );
          return;
        }

        if (!isMounted) return; // Component was unmounted

        // Handle cancellation errors silently - they're expected behavior
        if (
          error.name === "AbortError" ||
          error.code === "ERR_CANCELED" ||
          error.message === "canceled"
        ) {
          logger.info(
            "🔄 Navbar order count request was cancelled (expected behavior)"
          );
          return;
        }

        // Handle timeout errors gracefully without making more requests
        if (
          error.code === "ECONNABORTED" ||
          error.message?.includes("timeout")
        ) {
          logger.info(
            "⏱️ Navbar order count request timed out, keeping previous values"
          );
          // Don't show timeout errors prominently in navbar
        } else {
          logger.error("Navbar order count fetch failed:", error.message);
        }

        // Don't make additional requests on error - this can cause cascade failures
        // Keep existing counts or set to safe defaults if none exist
        setOrderCounts((prev) => {
          if (!prev || Object.keys(prev).length === 0) {
            return {
              total: 0,
              pending: 0,
              processing: 0,
              shipped: 0,
              delivered: 0,
            };
          }
          return prev;
        });
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchOrderCounts();

    // Refresh counts every 2 minutes to reduce server load
    const interval = setInterval(fetchOrderCounts, 120000);

    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (
        themeMenuRef.current &&
        !themeMenuRef.current.contains(event.target)
      ) {
        setShowThemeMenu(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowQuickSearch(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setShowUserMenu(false);
  };

  const handleThemeChange = (newTheme) => {
    if (newTheme === "system") {
      followSystemTheme();
    } else if (newTheme === "light") {
      setLightTheme();
    } else if (newTheme === "dark") {
      setDarkTheme();
    }
    setShowThemeMenu(false);
  };

  const getThemeIcon = () => {
    if (theme === "dark") return MoonIcon;
    if (theme === "light") return SunIcon;
    return ComputerDesktopIcon;
  };

  // Map notification types to icons and styles
  const getNotificationIcon = (type) => {
    switch (type) {
      case "order":
        return ShoppingCartIcon;
      case "shipping":
        return TruckIcon;
      case "sync":
        return SparklesIcon;
      case "inventory":
        return CommandLineIcon;
      case "error":
        return ExclamationTriangleIcon;
      default:
        return BellIcon;
    }
  };

  const getNotificationStyle = (type, priority) => {
    const baseStyles = {
      order: {
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/30",
      },
      shipping: {
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
      },
      sync: {
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-100 dark:bg-purple-900/30",
      },
      inventory: {
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-100 dark:bg-amber-900/30",
      },
      error: {
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-100 dark:bg-red-900/30",
      },
    };

    return (
      baseStyles[type] || {
        color: "text-gray-600 dark:text-gray-400",
        bgColor: "bg-gray-100 dark:bg-gray-900/30",
      }
    );
  };

  const highPriorityCount = notifications.filter(
    (n) => !n.read && n.priority === "high"
  ).length;

  // Enhanced quick navigation items
  const quickNavItems = [
    {
      name: t("navigation.dashboard", {}, "Ana Sayfa"),
      path: "/",
      icon: HomeIcon,
      description: "Overview & insights",
      badge: null,
    },
    {
      name: t("navigation.orders", {}, "Siparişler"),
      path: "/orders",
      icon: ShoppingCartIcon,
      description: "Manage orders",
      badge: orderCounts.newOrders > 0 ? orderCounts.newOrders : null,
    },
    {
      name: t("navigation.analytics", {}, "Analitik"),
      path: "/analytics",
      icon: ChartBarIcon,
      description: "Sales insights",
      badge: null,
    },
    {
      name: t("navigation.customers", {}, "Müşteriler"),
      path: "/customers",
      icon: UserGroupIcon,
      description: "Customer data",
      badge: null,
    },
  ];

  const getPageTitle = () => {
    const currentPath = location.pathname;
    const navItem = quickNavItems.find((item) => item.path === currentPath);
    if (navItem) return navItem.name;

    // Handle sub-routes
    if (currentPath.startsWith("/orders"))
      return t("navigation.orders", {}, "Siparişler");
    if (currentPath.startsWith("/products"))
      return t("navigation.products", {}, "Ürünler");
    if (currentPath.startsWith("/customers"))
      return t("navigation.customers", {}, "Müşteriler");
    if (currentPath.startsWith("/analytics"))
      return t("navigation.analytics", {}, "Analitik");
    if (currentPath.startsWith("/settings"))
      return t("navigation.settings", {}, "Ayarlar");
    if (currentPath.startsWith("/platforms"))
      return t("navigation.platforms", {}, "Platformlar");
    if (currentPath.startsWith("/shipping"))
      return t("navigation.shipping", {}, "Kargo");

    return t("navigation.dashboard", {}, "Ana Sayfa");
  };

  return (
    <nav
      className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 transition-all duration-200"
      style={{ zIndex: "var(--z-sticky)" }}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side */}
          <div className="flex items-center">
            {isAuthenticated && (
              <button
                onClick={toggleSidebar}
                className={cn(
                  "lg:hidden mr-3 group relative p-2 rounded-lg transition-all duration-200",
                  "hover:bg-gray-100 dark:hover:bg-gray-800",
                  "focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                  "active:scale-95"
                )}
                aria-label="Toggle navigation menu"
                title="Toggle sidebar"
              >
                <Bars3Icon className="h-5 w-5 text-gray-600 dark:text-gray-400 transition-all duration-200 group-hover:text-primary-600 dark:group-hover:text-primary-400" />

                {/* Enhanced visual feedback ring */}
                <div className="absolute inset-0 rounded-lg bg-primary-500/10 scale-0 group-hover:scale-100 transition-transform duration-200" />

                {/* Active state indicator */}
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary-500 rounded-full opacity-0 group-active:opacity-100 transition-opacity duration-150" />
              </button>
            )}

            {/* Brand */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                <span className="text-white font-bold text-lg">P+</span>
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-xl bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-700 bg-clip-text text-transparent">
                  Pazar+
                </span>
                <div className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                  Order Management
                </div>
              </div>
            </Link>

            {/* Page title & breadcrumb for mobile */}
            {isAuthenticated && (
              <div className="hidden md:flex lg:hidden items-center ml-6">
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {getPageTitle()}
                </span>
              </div>
            )}

            {/* Quick navigation for desktop */}
            {isAuthenticated && (
              <div className="hidden xl:flex items-center ml-8 space-x-1">
                {quickNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== "/" &&
                      location.pathname.startsWith(item.path));

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "relative flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                      {item.badge && (
                        <Badge variant="info" size="sm">
                          {item.badge}
                        </Badge>
                      )}
                      {isActive && (
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-primary-500 rounded-full" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-2">
            {/* Quick search */}
            {isAuthenticated && (
              <div className="relative hidden md:block" ref={searchRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickSearch(!showQuickSearch)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  icon={MagnifyingGlassIcon}
                />
              </div>
            )}

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Theme toggle dropdown */}
            <div className="relative" ref={themeMenuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center"
              >
                {React.createElement(getThemeIcon(), { className: "h-4 w-4" })}
                <ChevronDownIcon className="h-3 w-3 ml-1" />
              </Button>

              {showThemeMenu && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 animate-scale-in"
                  style={{ zIndex: "var(--z-dropdown)" }}
                >
                  <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Theme Preference
                    </p>
                  </div>
                  <button
                    onClick={() => handleThemeChange("light")}
                    className={cn(
                      "w-full flex items-center px-4 py-2.5 text-sm transition-colors",
                      theme === "light"
                        ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                  >
                    <SunIcon className="h-4 w-4 mr-3" />
                    <span>Light Theme</span>
                    {theme === "light" && (
                      <div className="ml-auto w-2 h-2 bg-primary-500 rounded-full" />
                    )}
                  </button>
                  <button
                    onClick={() => handleThemeChange("dark")}
                    className={cn(
                      "w-full flex items-center px-4 py-2.5 text-sm transition-colors",
                      theme === "dark"
                        ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                  >
                    <MoonIcon className="h-4 w-4 mr-3" />
                    <span>Dark Theme</span>
                    {theme === "dark" && (
                      <div className="ml-auto w-2 h-2 bg-primary-500 rounded-full" />
                    )}
                  </button>
                  <button
                    onClick={() => handleThemeChange("system")}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ComputerDesktopIcon className="h-4 w-4 mr-3" />
                    <span>System ({systemTheme})</span>
                  </button>
                </div>
              )}
            </div>

            {isAuthenticated ? (
              <>
                {/* Enhanced Notifications */}
                <div className="relative" ref={notificationRef}>
                  <Tooltip
                    content={
                      wsConnected
                        ? unreadCount > 0
                          ? `${unreadCount} unread notification${
                              unreadCount !== 1 ? "s" : ""
                            }`
                          : "Real-time notifications active"
                        : "Notifications offline - will show manually refreshed data"
                    }
                    position="bottom"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNotifications(!showNotifications)}
                      className={cn(
                        "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 relative notification-container",
                        !wsConnected && "opacity-60"
                      )}
                    >
                      <BellIcon className="h-5 w-5" />
                      {!wsConnected && (
                        <div className="absolute -top-1 -left-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                      )}
                      {unreadCount > 0 && (
                        <span
                          className={cn(
                            "absolute -top-1 -right-1 h-5 w-5 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg notification-badge",
                            highPriorityCount > 0
                              ? "bg-red-500 animate-pulse high-priority"
                              : "bg-primary-500"
                          )}
                        >
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </Button>
                  </Tooltip>

                  {showNotifications && (
                    <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 animate-scale-in notification-dropdown">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            Notifications
                          </h3>
                          <div className="flex items-center space-x-2">
                            {unreadCount > 0 && (
                              <Badge
                                variant={
                                  highPriorityCount > 0 ? "danger" : "info"
                                }
                                size="sm"
                              >
                                {unreadCount} new
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="xs"
                              className="text-xs"
                              onClick={() => {
                                markAllAsRead();
                              }}
                            >
                              Mark all read
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto scrollbar-thin">
                        {notifications.length > 0 ? (
                          notifications.map((notification) => {
                            const IconComponent = getNotificationIcon(
                              notification.type
                            );
                            const styles = getNotificationStyle(
                              notification.type,
                              notification.priority
                            );
                            const timeAgo = notification.createdAt
                              ? new Date(
                                  notification.createdAt
                                ).toLocaleString()
                              : "Recently";

                            return (
                              <div
                                key={notification.id}
                                className={cn(
                                  "p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer",
                                  !notification.read &&
                                    "bg-primary-50/30 dark:bg-primary-900/10"
                                )}
                              >
                                <div className="flex items-start space-x-3">
                                  <div
                                    className={cn(
                                      "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                                      styles.bgColor
                                    )}
                                  >
                                    <IconComponent
                                      className={cn("h-4 w-4", styles.color)}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                          {notification.title}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                          {notification.message}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                          {timeAgo}
                                        </p>
                                      </div>
                                      {!notification.read && (
                                        <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-8 text-center">
                            <BellIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">
                              No notifications yet
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {wsConnected
                                ? "Real-time notifications active"
                                : "Offline mode - notifications will update when page refreshes"}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-center"
                          onClick={() => {
                            setShowNotifications(false);
                            navigate("/notifications");
                          }}
                        >
                          {t(
                            "navbar.viewAllNotifications",
                            {},
                            "Tüm Bildirimleri Görüntüle"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-center text-xs"
                          onClick={() => {
                            setShowNotifications(false);
                            navigate("/settings");
                          }}
                        >
                          {t(
                            "navbar.notificationSettings",
                            {},
                            "Bildirim Ayarları"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced User menu */}
                <div className="relative" ref={userMenuRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white font-medium text-sm">
                        {user?.fullName?.charAt(0) ||
                          user?.username?.charAt(0) ||
                          user?.email?.charAt(0) ||
                          "U"}
                      </span>
                    </div>
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {user?.fullName || user?.username || "User"}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {user?.role || "Administrator"}
                      </span>
                    </div>
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  </Button>

                  {showUserMenu && (
                    <div
                      className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 animate-scale-in"
                      style={{ zIndex: "var(--z-dropdown)" }}
                    >
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-lg">
                              {user?.fullName?.charAt(0) ||
                                user?.username?.charAt(0) ||
                                user?.email?.charAt(0) ||
                                "U"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {user?.fullName || user?.username}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {user?.email}
                            </p>
                            <Badge variant="success" size="xs" className="mt-1">
                              {user?.role || "Admin"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="py-2">
                        <Link
                          to="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <UserIcon className="h-4 w-4 mr-3" />
                          {t("navbar.viewProfile", {}, "Profili Görüntüle")}
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <CogIcon className="h-4 w-4 mr-3" />
                          {t("navigation.settings", {}, "Ayarlar")}
                        </Link>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                          {t("navbar.logout", {}, "Çıkış Yap")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="font-medium">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    variant="primary"
                    size="sm"
                    className="font-medium shadow-lg hover:shadow-xl"
                  >
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
