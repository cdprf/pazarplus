import React from "react";
import ErrorState from "./ErrorState";
import { useErrorHandler } from "../../hooks/useErrorHandler";

/**
 * Higher-order component that wraps components with error handling
 */
export const withErrorHandling = (WrappedComponent, options = {}) => {
  const {
    fallbackComponent: CustomFallback,
    errorType = "general",
    showRetryButton = true,
    showHomeButton = false,
    size = "medium",
  } = options;

  return function WithErrorHandlingComponent(props) {
    const { error, clearError, handleError } = useErrorHandler();

    // If there's an error, show the error state
    if (error) {
      if (CustomFallback) {
        return (
          <CustomFallback
            error={error}
            onRetry={clearError}
            onClearError={clearError}
            {...props}
          />
        );
      }

      return (
        <ErrorState
          type={error.type || errorType}
          title={error.title}
          message={error.message}
          details={error.details}
          showRetryButton={showRetryButton}
          showHomeButton={showHomeButton}
          onRetry={clearError}
          size={size}
          showDetailsToggle={!!error.details}
        />
      );
    }

    // Render the wrapped component with error handling props
    return (
      <WrappedComponent
        {...props}
        onError={handleError}
        clearError={clearError}
      />
    );
  };
};

/**
 * Component for wrapping sections of UI with error boundaries
 */
export const ErrorSection = ({
  children,
  fallback,
  errorType = "general",
  size = "small",
  className = "",
}) => {
  const { error, clearError } = useErrorHandler();

  if (error) {
    if (fallback) {
      return typeof fallback === "function"
        ? fallback(error, clearError)
        : fallback;
    }

    return (
      <div className={className}>
        <ErrorState
          type={error.type || errorType}
          message={error.message}
          details={error.details}
          onRetry={clearError}
          size={size}
          showDetailsToggle={false}
        />
      </div>
    );
  }

  return children;
};

/**
 * Loading state component with error handling
 */
export const LoadingWithError = ({
  isLoading,
  error,
  onRetry,
  children,
  loadingComponent,
  errorType = "general",
  size = "medium",
}) => {
  if (isLoading) {
    return (
      loadingComponent || (
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )
    );
  }

  if (error) {
    return (
      <ErrorState
        type={error.type || errorType}
        message={error.message}
        details={error.details}
        onRetry={onRetry}
        size={size}
        showDetailsToggle={!!error.details}
      />
    );
  }

  return children;
};

export default withErrorHandling;
