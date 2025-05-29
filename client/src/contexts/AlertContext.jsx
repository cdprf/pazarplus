import React, { createContext, useState, useCallback, useContext } from "react";
import ToastContainer from "../components/ui/ToastContainer";

export const AlertContext = createContext();

// Custom hook to use the AlertContext
export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }

  // Create a unified showAlert function that matches the expected API
  const showAlert = useCallback(
    (message, type = "info", options = {}) => {
      switch (type.toLowerCase()) {
        case "success":
          return context.success(message, options);
        case "error":
        case "danger":
          return context.error(message, options);
        case "warning":
          return context.warning(message, options);
        case "info":
        default:
          return context.info(message, options);
      }
    },
    [context]
  );

  return {
    ...context,
    showAlert,
  };
};

export const AlertProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Create a unique ID for each toast
  const generateId = () => {
    return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  };

  // Add success toast
  const success = useCallback((message, options = {}) => {
    const newToast = {
      id: generateId(),
      variant: "success",
      title: options.title || "Success!",
      message,
      duration: options.duration !== undefined ? options.duration : 5000,
      showProgress: options.showProgress !== false,
      position: options.position || "top-right",
    };
    setToasts((prev) => [...prev, newToast]);
    return newToast.id;
  }, []);

  // Add error toast
  const error = useCallback((message, options = {}) => {
    const newToast = {
      id: generateId(),
      variant: "error",
      title: options.title || "Error!",
      message,
      duration: options.duration !== undefined ? options.duration : 7000,
      showProgress: options.showProgress !== false,
      position: options.position || "top-right",
    };
    setToasts((prev) => [...prev, newToast]);
    return newToast.id;
  }, []);

  // Add warning toast
  const warning = useCallback((message, options = {}) => {
    const newToast = {
      id: generateId(),
      variant: "warning",
      title: options.title || "Warning!",
      message,
      duration: options.duration !== undefined ? options.duration : 6000,
      showProgress: options.showProgress !== false,
      position: options.position || "top-right",
    };
    setToasts((prev) => [...prev, newToast]);
    return newToast.id;
  }, []);

  // Add info toast
  const info = useCallback((message, options = {}) => {
    const newToast = {
      id: generateId(),
      variant: "info",
      title: options.title || "Information",
      message,
      duration: options.duration !== undefined ? options.duration : 5000,
      showProgress: options.showProgress !== false,
      position: options.position || "top-right",
    };
    setToasts((prev) => [...prev, newToast]);
    return newToast.id;
  }, []);

  // Remove toast by ID
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Clear all toasts
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Enhanced notification methods with custom options
  const showNotification = useCallback(
    (message, type = "info", options = {}) => {
      const methods = { success, error, warning, info };
      const method = methods[type.toLowerCase()] || info;
      return method(message, options);
    },
    [success, error, warning, info]
  );

  // Batch notifications for bulk operations
  const showBatchNotifications = useCallback(
    (notifications) => {
      notifications.forEach((notification, index) => {
        setTimeout(() => {
          showNotification(notification.message, notification.type || "info", {
            ...notification.options,
            // Stagger the appearance slightly
            delay: (notification.options?.delay || 0) + index * 100,
          });
        }, index * 100);
      });
    },
    [showNotification]
  );

  // Debug logging to trace alert creation
  const showAlert = useCallback(
    (message, variant = "info", title = "", duration = 5000) => {
      console.log("🚨 AlertContext.showAlert called:", {
        message,
        variant,
        title,
        duration,
      });

      // Map the showAlert call to the appropriate toast method
      const methods = { success, error, warning, info };
      const method = methods[variant.toLowerCase()] || info;

      const options = {
        title: title || undefined,
        duration: duration,
      };

      console.log("🚨 Creating toast with method:", variant, options);
      return method(message, options);
    },
    [success, error, warning, info]
  );

  // Create context value
  const value = {
    toasts,
    success,
    error,
    warning,
    info,
    removeToast,
    clearToasts,
    showNotification,
    showBatchNotifications,
    showAlert, // Add showAlert to the context value
    // Legacy method names for backward compatibility
    removeAlert: removeToast,
    clearAlerts: clearToasts,
    alerts: toasts, // For backward compatibility
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
      <ToastContainer
        toasts={toasts}
        position="top-right"
        maxToasts={5}
        onRemove={removeToast}
      />
    </AlertContext.Provider>
  );
};
