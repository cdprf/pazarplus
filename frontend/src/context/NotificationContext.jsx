import React, { createContext, useState, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { NotificationContainer } from '../components/shared/Notification';

// Create context
export const NotificationContext = createContext();

// Generate unique IDs for notifications
let notificationId = 0;
const generateId = () => `notification-${notificationId++}`;

// NotificationProvider component
export const NotificationProvider = ({ children, position = 'top-right' }) => {
  const [notifications, setNotifications] = useState([]);

  // Add a new notification
  const addNotification = useCallback((notification) => {
    const id = notification.id || generateId();
    
    setNotifications(currentNotifications => [
      ...currentNotifications,
      { ...notification, id }
    ]);
    
    return id;
  }, []);

  // Show success notification
  const showSuccess = useCallback((message, title = 'Success', options = {}) => {
    return addNotification({
      title,
      message,
      type: 'success',
      ...options
    });
  }, [addNotification]);

  // Show error notification
  const showError = useCallback((message, title = 'Error', options = {}) => {
    return addNotification({
      title,
      message,
      type: 'error',
      duration: 8000, // Error messages stay longer by default
      ...options
    });
  }, [addNotification]);

  // Show info notification
  const showInfo = useCallback((message, title = 'Information', options = {}) => {
    return addNotification({
      title,
      message,
      type: 'info',
      ...options
    });
  }, [addNotification]);

  // Show warning notification
  const showWarning = useCallback((message, title = 'Warning', options = {}) => {
    return addNotification({
      title,
      message,
      type: 'warning',
      ...options
    });
  }, [addNotification]);

  // Remove a notification by ID
  const removeNotification = useCallback((id) => {
    setNotifications(currentNotifications => 
      currentNotifications.filter(notification => notification.id !== id)
    );
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Context value
  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showInfo,
    showWarning
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer 
        notifications={notifications} 
        position={position}
        onClose={removeNotification}
      />
    </NotificationContext.Provider>
  );
};

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
  position: PropTypes.oneOf([
    'top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'
  ])
};

// Custom hook for using notifications
export const useNotification = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  
  return context;
};