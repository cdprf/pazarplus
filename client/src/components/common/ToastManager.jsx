import React from "react";
import { Toast, ToastContainer } from "react-bootstrap";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { useError } from "../../contexts/ErrorContext";

/**
 * Toast notification component for displaying temporary messages
 */
const ToastNotification = ({
  id,
  message,
  type = "info",
  dismissible = true,
  onClose,
}) => {
  const getToastConfig = () => {
    switch (type) {
      case "success":
        return {
          bg: "success",
          icon: CheckCircleIcon,
          iconColor: "text-white",
        };
      case "error":
        return {
          bg: "danger",
          icon: XCircleIcon,
          iconColor: "text-white",
        };
      case "warning":
        return {
          bg: "warning",
          icon: ExclamationTriangleIcon,
          iconColor: "text-dark",
        };
      default:
        return {
          bg: "info",
          icon: InformationCircleIcon,
          iconColor: "text-white",
        };
    }
  };

  const config = getToastConfig();
  const IconComponent = config.icon;

  return (
    <Toast
      show={true}
      onClose={() => onClose?.(id)}
      bg={config.bg}
      className="text-white"
    >
      <Toast.Header closeButton={dismissible}>
        <IconComponent className={`h-5 w-5 ${config.iconColor} me-2`} />
        <strong className="me-auto text-capitalize">{type}</strong>
      </Toast.Header>
      <Toast.Body>{message}</Toast.Body>
    </Toast>
  );
};

/**
 * Toast container component that manages all toast notifications
 */
const ToastManager = () => {
  const { toastErrors, removeToastError } = useError();

  if (!toastErrors || toastErrors.length === 0) {
    return null;
  }

  return (
    <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
      {toastErrors.map((toast) => (
        <ToastNotification
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          dismissible={toast.dismissible}
          onClose={removeToastError}
        />
      ))}
    </ToastContainer>
  );
};

export default ToastManager;
