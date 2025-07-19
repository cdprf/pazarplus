import React, { useState } from "react";
import { useNotification } from "../contexts/NotificationContext";
import { useWebSocketNotifications } from "../hooks/useWebSocketNotifications";
import { Button, Badge } from "../components/ui";
import { cn } from "../utils/cn";
import {
  BellIcon,
  ShoppingCartIcon,
  TruckIcon,
  SparklesIcon,
  CommandLineIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  CheckIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

const Notifications = () => {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
  } = useNotification();
  const {
    isConnected: wsConnected,
    connectionError,
    retryConnection,
  } = useWebSocketNotifications();

  const [filter, setFilter] = useState("all"); // all, unread, order, shipping, sync, inventory, error
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, priority

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
        borderColor: "border-green-200 dark:border-green-800",
      },
      shipping: {
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        borderColor: "border-blue-200 dark:border-blue-800",
      },
      sync: {
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-100 dark:bg-purple-900/30",
        borderColor: "border-purple-200 dark:border-purple-800",
      },
      inventory: {
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-100 dark:bg-amber-900/30",
        borderColor: "border-amber-200 dark:border-amber-800",
      },
      error: {
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-100 dark:bg-red-900/30",
        borderColor: "border-red-200 dark:border-red-800",
      },
    };

    return (
      baseStyles[type] || {
        color: "text-gray-600 dark:text-gray-400",
        bgColor: "bg-gray-100 dark:bg-gray-900/30",
        borderColor: "border-gray-200 dark:border-gray-800",
      }
    );
  };

  // Filter notifications
  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "unread") return !notification.read;
    if (filter !== "all") return notification.type === filter;
    return true;
  });

  // Sort notifications
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
    if (sortBy === "oldest") {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    }
    if (sortBy === "priority") {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (
        (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
      );
    }
    return 0;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const highPriorityCount = notifications.filter(
    (n) => !n.read && n.priority === "high"
  ).length;

  const filterOptions = [
    { value: "all", label: "All", count: notifications.length },
    { value: "unread", label: "Unread", count: unreadCount },
    {
      value: "order",
      label: "Orders",
      count: notifications.filter((n) => n.type === "order").length,
    },
    {
      value: "shipping",
      label: "Shipping",
      count: notifications.filter((n) => n.type === "shipping").length,
    },
    {
      value: "sync",
      label: "Sync",
      count: notifications.filter((n) => n.type === "sync").length,
    },
    {
      value: "inventory",
      label: "Inventory",
      count: notifications.filter((n) => n.type === "inventory").length,
    },
    {
      value: "error",
      label: "Errors",
      count: notifications.filter((n) => n.type === "error").length,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Notifications
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Stay updated with your order management activities
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <div
                  className={cn(
                    "w-3 h-3 rounded-full",
                    wsConnected ? "bg-green-500" : "bg-red-500"
                  )}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {wsConnected ? "Connected" : "Disconnected"}
                </span>
                {!wsConnected && connectionError && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={retryConnection}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs"
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {notifications.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Notifications
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {unreadCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Unread
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {highPriorityCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                High Priority
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {notifications.filter((n) => n.type === "order").length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Order Updates
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Filters */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FunnelIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Filter:
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                      filter === option.value
                        ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    )}
                  >
                    {option.label}
                    {option.count > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">
                        {option.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort and Actions */}
            <div className="flex items-center space-x-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">Priority</option>
              </select>

              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Mark All Read
                </Button>
              )}

              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllNotifications}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {sortedNotifications.length > 0 ? (
            sortedNotifications.map((notification) => {
              const IconComponent = getNotificationIcon(notification.type);
              const styles = getNotificationStyle(
                notification.type,
                notification.priority
              );
              const timeAgo = notification.createdAt
                ? new Date(notification.createdAt).toLocaleString()
                : "Recently";

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "bg-white dark:bg-gray-800 rounded-lg border p-6 transition-all duration-200 hover:shadow-md",
                    !notification.read
                      ? "border-l-4 border-l-primary-500 bg-primary-50/30 dark:bg-primary-900/10"
                      : "border-gray-200 dark:border-gray-700",
                    styles.borderColor
                  )}
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className={cn(
                        "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center",
                        styles.bgColor
                      )}
                    >
                      <IconComponent className={cn("h-6 w-6", styles.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary-500 rounded-full" />
                            )}
                            <Badge
                              variant={
                                notification.priority === "high"
                                  ? "danger"
                                  : notification.priority === "medium"
                                  ? "warning"
                                  : "info"
                              }
                              size="xs"
                            >
                              {notification.priority}
                            </Badge>
                            <Badge variant="outline" size="xs">
                              {notification.type}
                            </Badge>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 mb-3">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {timeAgo}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => markAsRead(notification.id)}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => removeNotification(notification.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <BellIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {filter === "all"
                  ? "No notifications"
                  : `No ${filter} notifications`}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {filter === "all"
                  ? "You're all caught up! New notifications will appear here."
                  : `No notifications match the ${filter} filter.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
