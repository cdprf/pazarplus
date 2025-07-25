import logger from "../utils/logger.js";
import React, { useState, useEffect, useCallback } from "react";
import enhancedPlatformService from "../services/enhancedPlatformService";

/**
 * Enhanced Platform Integration Dashboard
 * Provides UI for Week 5-6 enhanced platform features
 */
const PlatformDashboard = () => {
  const [notifications, setNotifications] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [inventoryStatus, setInventoryStatus] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [unreadCount, setUnreadCount] = useState(0);

  // Real-time notification handlers
  const handleNotification = useCallback((notification) => {
    setNotifications((prev) => [notification, ...prev.slice(0, 49)]);
    setUnreadCount((prev) => prev + 1);
  }, []);

  const handleConnectionStatus = useCallback((status) => {
    setIsConnected(status.connected);
  }, []);

  const handleSyncStarted = useCallback(() => {
    setSyncInProgress(true);
  }, []);

  const handleSyncCompleted = useCallback(() => {
    setSyncInProgress(false);
    loadConflicts();
    loadInventoryStatus();
  }, []);

  // Setup event listeners
  useEffect(() => {
    enhancedPlatformService.on("notification", handleNotification);
    enhancedPlatformService.on(
      "connectionStatusChanged",
      handleConnectionStatus
    );
    enhancedPlatformService.on("notification:syncStarted", handleSyncStarted);
    enhancedPlatformService.on(
      "notification:syncCompleted",
      handleSyncCompleted
    );

    // Initial data load
    loadConflicts();
    loadInventoryStatus();
    loadRecentNotifications();

    return () => {
      enhancedPlatformService.off("notification", handleNotification);
      enhancedPlatformService.off(
        "connectionStatusChanged",
        handleConnectionStatus
      );
      enhancedPlatformService.off(
        "notification:syncStarted",
        handleSyncStarted
      );
      enhancedPlatformService.off(
        "notification:syncCompleted",
        handleSyncCompleted
      );
    };
  }, [
    handleNotification,
    handleConnectionStatus,
    handleSyncStarted,
    handleSyncCompleted,
  ]);

  // Data loading functions
  const loadConflicts = async () => {
    try {
      const conflictsData = await enhancedPlatformService.getPendingConflicts();
      setConflicts(conflictsData.conflicts || []);
    } catch (error) {
      logger.error("Failed to load conflicts:", error);
    }
  };

  const loadInventoryStatus = async () => {
    try {
      const status = await enhancedPlatformService.getInventoryStatus();
      setInventoryStatus(status);
    } catch (error) {
      logger.error("Failed to load inventory status:", error);
    }
  };

  const loadRecentNotifications = async () => {
    try {
      const recent = await enhancedPlatformService.getRecentNotifications(20);
      setNotifications(recent.notifications || []);
    } catch (error) {
      logger.error("Failed to load recent notifications:", error);
    }
  };

  // Action handlers
  const handleTriggerSync = async () => {
    try {
      setSyncInProgress(true);
      await enhancedPlatformService.triggerSync([
        "trendyol",
        "hepsiburada",
        "n11",
      ]);
    } catch (error) {
      logger.error("Sync failed:", error);
      setSyncInProgress(false);
    }
  };

  const handleResolveConflict = async (conflictId, resolution) => {
    try {
      await enhancedPlatformService.resolveConflict(conflictId, resolution);
      await loadConflicts();
    } catch (error) {
      logger.error("Failed to resolve conflict:", error);
    }
  };

  const markNotificationAsRead = (notificationId) => {
    enhancedPlatformService.markNotificationAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const clearAllNotifications = () => {
    enhancedPlatformService.clearNotifications();
    setNotifications([]);
    setUnreadCount(0);
  };

  // Component renders
  const renderConnectionStatus = () => (
    <div
      className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
        isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span>{isConnected ? "Connected" : "Disconnected"}</span>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Platform Sync
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {syncInProgress ? "Sync in progress..." : "Ready to sync"}
              </p>
            </div>
            <button
              onClick={handleTriggerSync}
              disabled={syncInProgress}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                syncInProgress
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {syncInProgress ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Pending Conflicts
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-orange-600">
                {conflicts.length}
              </p>
              <p className="text-sm text-gray-600">Require review</p>
            </div>
            {conflicts.length > 0 && (
              <button
                onClick={() => setActiveTab("conflicts")}
                className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200"
              >
                Review
              </button>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Inventory Health
          </h3>
          <div className="flex items-center justify-between">
            <div>
              {inventoryStatus && (
                <>
                  <p className="text-2xl font-bold text-green-600">
                    {inventoryStatus.healthScore?.toFixed(1) || "N/A"}%
                  </p>
                  <p className="text-sm text-gray-600">Overall health</p>
                </>
              )}
            </div>
            <button
              onClick={() => setActiveTab("inventory")}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
            >
              Details
            </button>
          </div>
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h3>
            {unreadCount > 0 && (
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.slice(0, 10).map((notification) => {
            const formatted =
              enhancedPlatformService.formatNotification(notification);
            return (
              <div
                key={notification.id}
                className={`px-6 py-4 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                  !notification.read ? "bg-blue-50" : ""
                }`}
                onClick={() => markNotificationAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-lg">{formatted.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {formatted.title}
                    </p>
                    <p className="text-sm text-gray-600">{formatted.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notification.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>
            );
          })}
          {notifications.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No recent notifications
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderConflicts = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Pending Conflicts
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    Order {conflict.orderNumber}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Conflict Type: {conflict.type}
                  </p>
                  <p className="text-sm text-gray-600">
                    Platforms: {conflict.platforms?.join(", ")}
                  </p>
                  <div className="mt-2">
                    <p className="text-sm text-gray-800 font-medium">
                      Conflicting Data:
                    </p>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(conflict.conflictingData, null, 2)}
                    </pre>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() =>
                      handleResolveConflict(conflict.id, "accept_first")
                    }
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Accept First
                  </button>
                  <button
                    onClick={() =>
                      handleResolveConflict(conflict.id, "manual_review")
                    }
                    className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                  >
                    Manual Review
                  </button>
                  <button
                    onClick={() => handleResolveConflict(conflict.id, "ignore")}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Ignore
                  </button>
                </div>
              </div>
            </div>
          ))}
          {conflicts.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No pending conflicts
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Inventory Overview
          </h3>
        </div>
        <div className="px-6 py-4">
          {inventoryStatus ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {inventoryStatus.totalProducts || 0}
                </p>
                <p className="text-sm text-gray-600">Total Products</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {inventoryStatus.inStock || 0}
                </p>
                <p className="text-sm text-gray-600">In Stock</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {inventoryStatus.lowStock || 0}
                </p>
                <p className="text-sm text-gray-600">Low Stock</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {inventoryStatus.outOfStock || 0}
                </p>
                <p className="text-sm text-gray-600">Out of Stock</p>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Loading inventory status...
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              All Notifications
            </h3>
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.map((notification) => {
            const formatted =
              enhancedPlatformService.formatNotification(notification);
            return (
              <div
                key={notification.id}
                className={`px-6 py-4 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                  !notification.read ? "bg-blue-50" : ""
                }`}
                onClick={() => markNotificationAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-lg">{formatted.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {formatted.title}
                    </p>
                    <p className="text-sm text-gray-600">{formatted.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notification.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>
            );
          })}
          {notifications.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No notifications
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              Enhanced Platform Management
            </h1>
            {renderConnectionStatus()}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: "dashboard", label: "Dashboard", count: null },
              { id: "conflicts", label: "Conflicts", count: conflicts.length },
              { id: "inventory", label: "Inventory", count: null },
              {
                id: "notifications",
                label: "Notifications",
                count: unreadCount,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "conflicts" && renderConflicts()}
        {activeTab === "inventory" && renderInventory()}
        {activeTab === "notifications" && renderNotifications()}
      </div>
    </div>
  );
};

export default PlatformDashboard;
