import React from "react";
import PropTypes from "prop-types";
import ErrorState from "./common/ErrorState";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });

    // Report to monitoring service if available
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    });
  };

  handleResetWithQueryCache = () => {
    // Try to clear React Query cache if available
    try {
      if (window.queryClient) {
        window.queryClient.clear();
      }
    } catch (error) {
      console.warn("Could not clear query cache:", error);
    }
    this.resetError();
  };

  render() {
    if (this.state.hasError) {
      // Use the new ErrorState component for a better user experience
      return (
        <ErrorState
          type="general"
          title={this.props.fallbackTitle || "Something went wrong"}
          message={
            this.props.fallbackMessage ||
            this.state.error?.message ||
            "An unexpected error occurred"
          }
          details={
            this.props.showDetails && process.env.NODE_ENV !== "production"
              ? {
                  error: this.state.error?.toString(),
                  componentStack: this.state.errorInfo?.componentStack,
                }
              : null
          }
          showDetailsToggle={
            this.props.showDetails && process.env.NODE_ENV !== "production"
          }
          primaryAction={{
            label: "Try Again",
            onClick: this.resetError,
            variant: "primary",
          }}
          secondaryAction={
            this.props.showResetButton
              ? {
                  label: "Reset Data & Try Again",
                  onClick: this.handleResetWithQueryCache,
                  variant: "outline-danger",
                }
              : null
          }
          size="large"
          className="error-boundary"
        />
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallbackTitle: PropTypes.string,
  fallbackMessage: PropTypes.string,
  showDetails: PropTypes.bool,
  showResetButton: PropTypes.bool,
  onError: PropTypes.func,
};

ErrorBoundary.defaultProps = {
  showDetails: process.env.NODE_ENV === "development",
  showResetButton: true,
};

export default ErrorBoundary;
