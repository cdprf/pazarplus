import React, { useState, useEffect, useRef } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaInfoCircle,
  FaTimesCircle
} from 'react-icons/fa';

/**
 * Notification - An accessible notification component that follows
 * WCAG guidelines for alerts and notifications
 */
const Notification = ({
  id,
  title,
  message,
  type = 'info',
  duration = 5000,
  position = 'top-right',
  onClose,
  showCloseButton = true,
  autoHide = true
}) => {
  const [show, setShow] = useState(true);
  const toastRef = useRef(null);
  
  // Timer for auto-hiding the notification
  useEffect(() => {
    let timer;
    if (autoHide && duration > 0) {
      timer = setTimeout(() => {
        setShow(false);
        if (onClose) {
          onClose(id);
        }
      }, duration);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [autoHide, duration, id, onClose]);
  
  // Handle close action
  const handleClose = () => {
    setShow(false);
    if (onClose) {
      onClose(id);
    }
  };
  
  // Determine icon based on notification type
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="me-2" aria-hidden="true" />;
      case 'warning':
        return <FaExclamationTriangle className="me-2" aria-hidden="true" />;
      case 'error':
        return <FaTimesCircle className="me-2" aria-hidden="true" />;
      case 'info':
      default:
        return <FaInfoCircle className="me-2" aria-hidden="true" />;
    }
  };
  
  // Determine bg color based on notification type
  const getBgClass = () => {
    switch (type) {
      case 'success':
        return 'bg-success text-white';
      case 'warning':
        return 'bg-warning';
      case 'error':
        return 'bg-danger text-white';
      case 'info':
      default:
        return 'bg-info text-white';
    }
  };
  
  return (
    <Toast
      show={show}
      onClose={handleClose}
      className={`notification-toast ${getBgClass()}`}
      ref={toastRef}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <Toast.Header closeButton={showCloseButton}>
        {getIcon()}
        <strong className="me-auto">{title}</strong>
      </Toast.Header>
      <Toast.Body>
        {message}
      </Toast.Body>
    </Toast>
  );
};

Notification.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  type: PropTypes.oneOf(['info', 'success', 'warning', 'error']),
  duration: PropTypes.number,
  position: PropTypes.oneOf([
    'top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'
  ]),
  onClose: PropTypes.func,
  showCloseButton: PropTypes.bool,
  autoHide: PropTypes.bool
};

/**
 * NotificationContainer - Container for multiple notification components
 */
const NotificationContainer = ({
  notifications = [],
  position = 'top-right',
  onClose
}) => {
  // Determine position class
  const getPositionClass = () => {
    switch (position) {
      case 'top-left':
        return 'position-fixed top-0 start-0 p-3';
      case 'bottom-right':
        return 'position-fixed bottom-0 end-0 p-3';
      case 'bottom-left':
        return 'position-fixed bottom-0 start-0 p-3';
      case 'top-center':
        return 'position-fixed top-0 start-50 translate-middle-x p-3';
      case 'bottom-center':
        return 'position-fixed bottom-0 start-50 translate-middle-x p-3';
      case 'top-right':
      default:
        return 'position-fixed top-0 end-0 p-3';
    }
  };
  
  // No notifications to show
  if (!notifications.length) {
    return null;
  }
  
  return (
    <ToastContainer className={getPositionClass()}>
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          {...notification}
          onClose={onClose}
        />
      ))}
    </ToastContainer>
  );
};

NotificationContainer.propTypes = {
  notifications: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string.isRequired,
      message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
      type: PropTypes.oneOf(['info', 'success', 'warning', 'error']),
      duration: PropTypes.number,
      autoHide: PropTypes.bool,
      showCloseButton: PropTypes.bool
    })
  ),
  position: PropTypes.oneOf([
    'top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'
  ]),
  onClose: PropTypes.func
};

export { Notification, NotificationContainer };