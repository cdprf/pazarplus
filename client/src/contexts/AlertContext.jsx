import React, { createContext, useState, useCallback, useContext } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

export const AlertContext = createContext();

// Custom hook to use the AlertContext
export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  
  // Create a unified showAlert function that matches the expected API
  const showAlert = useCallback((message, type = 'info') => {
    switch (type.toLowerCase()) {
      case 'success':
        return context.success(message);
      case 'error':
      case 'danger':
        return context.error(message);
      case 'warning':
        return context.warning(message);
      case 'info':
      default:
        return context.info(message);
    }
  }, [context]);

  return {
    ...context,
    showAlert
  };
};

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  // Create a unique ID for each alert
  const generateId = () => {
    return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  };

  // Add success alert
  const success = useCallback((message, options = {}) => {
    const newAlert = {
      id: generateId(),
      type: 'success',
      message,
      autoHide: options.autoHide !== false,
      delay: options.delay || 3000
    };
    setAlerts(prev => [...prev, newAlert]);
    return newAlert.id;
  }, []);

  // Add error alert
  const error = useCallback((message, options = {}) => {
    const newAlert = {
      id: generateId(),
      type: 'danger',
      message,
      autoHide: options.autoHide !== false,
      delay: options.delay || 5000
    };
    setAlerts(prev => [...prev, newAlert]);
    return newAlert.id;
  }, []);

  // Add warning alert
  const warning = useCallback((message, options = {}) => {
    const newAlert = {
      id: generateId(),
      type: 'warning',
      message,
      autoHide: options.autoHide !== false,
      delay: options.delay || 4000
    };
    setAlerts(prev => [...prev, newAlert]);
    return newAlert.id;
  }, []);

  // Add info alert
  const info = useCallback((message, options = {}) => {
    const newAlert = {
      id: generateId(),
      type: 'info',
      message,
      autoHide: options.autoHide !== false,
      delay: options.delay || 3000
    };
    setAlerts(prev => [...prev, newAlert]);
    return newAlert.id;
  }, []);

  // Remove alert by ID
  const removeAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  // Clear all alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Create context value
  const value = {
    alerts,
    success,
    error,
    warning,
    info,
    removeAlert,
    clearAlerts
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
      <ToastContainer 
        className="p-3" 
        position="top-end"
        style={{ zIndex: 9999 }}
      >
        {alerts.map((alert) => (
          <Toast
            key={alert.id}
            bg={alert.type}
            onClose={() => removeAlert(alert.id)}
            show={true}
            delay={alert.delay}
            autohide={alert.autoHide}
          >
            <Toast.Header closeButton={true}>
              <strong className="me-auto">
                {alert.type === 'success' && 'Success'}
                {alert.type === 'danger' && 'Error'}
                {alert.type === 'warning' && 'Warning'}
                {alert.type === 'info' && 'Information'}
              </strong>
            </Toast.Header>
            <Toast.Body className={alert.type === 'danger' || alert.type === 'warning' ? 'text-white' : ''}>
              {alert.message}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </AlertContext.Provider>
  );
};