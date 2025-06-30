import React from "react";
import { Alert, Button } from "react-bootstrap";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

/**
 * Component for displaying form validation errors
 */
export const FormErrorDisplay = ({
  errors,
  className = "",
  showIcon = true,
  onClear,
}) => {
  if (!errors || Object.keys(errors).length === 0) {
    return null;
  }

  const errorArray =
    typeof errors === "string"
      ? [errors]
      : Array.isArray(errors)
      ? errors
      : Object.entries(errors).map(
          ([field, message]) => `${field}: ${message}`
        );

  return (
    <Alert
      variant="danger"
      className={`${className} mb-3`}
      dismissible
      onClose={onClear}
    >
      <div className="d-flex align-items-start">
        {showIcon && (
          <ExclamationTriangleIcon className="h-5 w-5 text-danger me-2 mt-1 flex-shrink-0" />
        )}
        <div className="flex-grow-1">
          {errorArray.length === 1 ? (
            <span>{errorArray[0]}</span>
          ) : (
            <ul className="mb-0 ps-3">
              {errorArray.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Alert>
  );
};

/**
 * Component for inline field errors
 */
export const FieldError = ({ error, className = "" }) => {
  if (!error) return null;

  return <div className={`text-danger small mt-1 ${className}`}>{error}</div>;
};

/**
 * Component for API operation errors with retry
 */
export const ApiErrorDisplay = ({
  error,
  onRetry,
  retryLabel = "Try Again",
  className = "",
}) => {
  if (!error) return null;

  return (
    <Alert variant="danger" className={className}>
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <h6 className="alert-heading mb-1">Operation Failed</h6>
          <p className="mb-0">{error.message || "An error occurred"}</p>
          {error.status && (
            <small className="text-muted">
              Error {error.status}: {error.statusText}
            </small>
          )}
        </div>
        {onRetry && (
          <Button variant="outline-danger" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
      </div>
    </Alert>
  );
};

/**
 * Component for network connectivity errors
 */
export const NetworkErrorDisplay = ({
  onRetry,
  className = "",
  message = "Network connection error. Please check your internet connection and try again.",
}) => {
  return (
    <Alert variant="warning" className={className}>
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h6 className="alert-heading mb-1">Connection Problem</h6>
          <p className="mb-0">{message}</p>
        </div>
        {onRetry && (
          <Button variant="outline-warning" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </Alert>
  );
};

/**
 * Inline loading state with error handling
 */
export const InlineLoadingError = ({
  isLoading,
  error,
  onRetry,
  children,
  loadingText = "Loading...",
  className = "",
}) => {
  if (isLoading) {
    return (
      <div className={`text-center py-3 ${className}`}>
        <div className="spinner-border spinner-border-sm me-2" role="status" />
        <span className="text-muted">{loadingText}</span>
      </div>
    );
  }

  if (error) {
    return (
      <ApiErrorDisplay error={error} onRetry={onRetry} className={className} />
    );
  }

  return children;
};

/**
 * Empty state with optional error handling
 */
export const EmptyStateWithError = ({
  error,
  onRetry,
  emptyTitle = "No data available",
  emptyMessage = "There are no items to display.",
  emptyAction,
  className = "",
}) => {
  if (error) {
    return (
      <ApiErrorDisplay error={error} onRetry={onRetry} className={className} />
    );
  }

  return (
    <div className={`text-center py-5 ${className}`}>
      <h5 className="text-muted mb-2">{emptyTitle}</h5>
      <p className="text-muted mb-3">{emptyMessage}</p>
      {emptyAction}
    </div>
  );
};

const ErrorComponents = {
  FormErrorDisplay,
  FieldError,
  ApiErrorDisplay,
  NetworkErrorDisplay,
  InlineLoadingError,
  EmptyStateWithError,
};

export default ErrorComponents;
