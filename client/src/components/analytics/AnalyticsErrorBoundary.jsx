import logger from "../../utils/logger.js";
import React from "react";
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

/**
 * Analytics Error Boundary
 * Catches and handles errors in analytics components gracefully
 */
class AnalyticsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2),
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    logger.error(
      "Analytics Error Boundary caught an error:",
      error,
      errorInfo
    );

    this.setState({
      error,
      errorInfo,
    });

    // Report to analytics/monitoring service
    this.reportError(error, errorInfo);
  }

  reportError = (error, errorInfo) => {
    // Send error report to monitoring service
    try {
      const errorReport = {
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        errorInfo: {
          componentStack: errorInfo.componentStack,
        },
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.props.userId || "anonymous",
        context: "analytics",
      };

      // You can send this to your error tracking service
      logger.info("Error Report:", errorReport);

      // Optional: Send to backend
      // fetch('/api/errors/report', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // });
    } catch (reportingError) {
      logger.error("Failed to report error:", reportingError);
    }
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback, showDetails = false } = this.props;

      // If custom fallback component is provided
      if (Fallback) {
        return (
          <Fallback
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            onRetry={this.handleRetry}
            onRefresh={this.handleRefresh}
          />
        );
      }

      // Default error UI
      return (
        <div className="py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
              <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-4 text-red-600" />
              <h2 className="text-xl font-semibold text-red-800 mb-3">
                Analytics Error
              </h2>
              <p className="text-red-700 mb-6">
                Something went wrong while loading the analytics dashboard. This
                is usually a temporary issue.
              </p>

              <div className="flex gap-3 justify-center mb-6">
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  Try Again
                </button>
                <button
                  onClick={this.handleRefresh}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  Refresh Page
                </button>
              </div>

              {showDetails && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-red-600 font-medium">
                    Technical Details (Error ID: {this.state.errorId})
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-auto">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack && (
                      <>
                        {"\n\nComponent Stack:"}
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </details>
              )}

              <hr className="my-4 border-red-200" />
              <p className="text-red-600 text-sm">
                If this problem persists, please contact support and reference
                error ID:
                <code className="ml-1 bg-red-100 px-1 rounded">
                  {this.state.errorId}
                </code>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export const withAnalyticsErrorBoundary = (Component, options = {}) => {
  return function WrappedComponent(props) {
    return (
      <AnalyticsErrorBoundary {...options}>
        <Component {...props} />
      </AnalyticsErrorBoundary>
    );
  };
};

/**
 * Hook to handle errors in functional components
 */
export const useAnalyticsErrorHandler = () => {
  const [error, setError] = React.useState(null);

  const handleError = React.useCallback((error, context = "analytics") => {
    logger.error(`${context} error:`, error);
    setError({ error, context, timestamp: new Date() });
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
};

/**
 * Lightweight error fallback component
 */
export const AnalyticsErrorFallback = ({
  error,
  onRetry,
  title = "Unable to load analytics",
}) => (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
    <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-3 text-yellow-600" />
    <h6 className="text-lg font-medium text-yellow-800 mb-2">{title}</h6>
    <p className="text-yellow-700 mb-4">
      {error?.type === "TIMEOUT"
        ? "The request took too long to complete."
        : error?.type === "UNAUTHORIZED"
        ? "Please log in to view analytics."
        : "Please try again or contact support if the issue persists."}
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center px-3 py-2 border border-yellow-300 rounded-md text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
      >
        <ArrowPathIcon className="h-4 w-4 mr-1" />
        Try Again
      </button>
    )}
  </div>
);

export default AnalyticsErrorBoundary;
