import React, { createContext, useContext, useState } from "react";

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now() + Math.random(); // Ensure unique ID
    const newNotification = {
      id,
      createdAt: new Date(),
      read: false,
      type: "info",
      priority: "medium",
      title: notification.title || "Notification",
      message: notification.message || "",
      ...notification,
    };
    setNotifications((prev) => [newNotification, ...prev]);
    return id;
  };

  const markAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  };

  const removeNotification = (notificationId) => {
    setNotifications((prev) =>
      prev.filter((notif) => notif.id !== notificationId)
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Test function to add sample notifications
  const addTestNotifications = () => {
    addNotification({
      title: "Test Order Notification",
      message: "This is a test order notification from the system",
      type: "order",
      priority: "high",
    });

    addNotification({
      title: "Test Inventory Alert",
      message: "Test low stock notification",
      type: "inventory",
      priority: "medium",
    });
  };

  const value = {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    addTestNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
