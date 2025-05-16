import React, { createContext, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

export const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  // Add alert
  const addAlert = (message, type = 'info', timeout = 5000) => {
    const id = Date.now();
    const newAlert = { id, message, type, timeout };
    
    setAlerts(prevAlerts => [...prevAlerts, newAlert]);
    
    // Auto-dismiss alert after timeout
    if (timeout > 0) {
      setTimeout(() => removeAlert(id), timeout);
    }
    
    return id;
  };

  // Remove alert
  const removeAlert = (id) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== id));
  };

  // Success alert shorthand
  const success = (message, timeout = 5000) => {
    return addAlert(message, 'success', timeout);
  };

  // Error alert shorthand
  const error = (message, timeout = 8000) => {
    return addAlert(message, 'danger', timeout);
  };

  // Warning alert shorthand
  const warning = (message, timeout = 6000) => {
    return addAlert(message, 'warning', timeout);
  };

  // Info alert shorthand
  const info = (message, timeout = 5000) => {
    return addAlert(message, 'info', timeout);
  };

  return (
    <AlertContext.Provider
      value={{
        addAlert,
        removeAlert,
        success,
        error,
        warning,
        info
      }}
    >
      {children}
      
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1070 }}>
        {alerts.map(alert => (
          <Toast 
            key={alert.id} 
            bg={alert.type}
            onClose={() => removeAlert(alert.id)}
            delay={alert.timeout}
            autohide={alert.timeout > 0}
          >
            <Toast.Header>
              <strong className="me-auto">
                {alert.type === 'success' && 'Success!'}
                {alert.type === 'danger' && 'Error!'}
                {alert.type === 'warning' && 'Warning!'}
                {alert.type === 'info' && 'Information'}
              </strong>
            </Toast.Header>
            <Toast.Body className={['success', 'info'].includes(alert.type) ? 'text-dark' : 'text-white'}>
              {alert.message}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </AlertContext.Provider>
  );
};