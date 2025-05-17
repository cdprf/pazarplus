import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Button } from 'react-bootstrap';
import { useQueryClient } from '@tanstack/react-query';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      eventId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error', error, errorInfo);
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
      eventId: null
    });
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="error-boundary p-4 text-center">
          <Alert variant="danger">
            <Alert.Heading>{this.props.fallbackTitle || 'Something went wrong'}</Alert.Heading>
            <p>
              {this.props.fallbackMessage || 
               (this.state.error?.message || 'An unexpected error occurred')}
            </p>
            {this.props.showDetails && process.env.NODE_ENV !== 'production' && (
              <details className="text-start">
                <summary>Error Details</summary>
                <pre className="mt-2 p-2 bg-light">
                  {this.state.error?.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre className="mt-2 p-2 bg-light">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
            <div className="mt-3">
              <Button 
                variant="outline-primary" 
                onClick={this.resetError}
                className="me-2"
              >
                Try Again
              </Button>
              {this.props.showResetButton && (
                <ResetQueryCacheButton 
                  onReset={this.resetError} 
                />
              )}
            </div>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

// Component to reset React Query cache
const ResetQueryCacheButton = ({ onReset }) => {
  const queryClient = useQueryClient();
  
  const handleReset = () => {
    // Clear the React Query cache
    queryClient.clear();
    // Then reset the error boundary
    onReset();
  };
  
  return (
    <Button 
      variant="outline-danger" 
      onClick={handleReset}
    >
      Reset Data & Try Again
    </Button>
  );
};

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallbackTitle: PropTypes.string,
  fallbackMessage: PropTypes.string,
  showDetails: PropTypes.bool,
  showResetButton: PropTypes.bool,
  onError: PropTypes.func
};

ErrorBoundary.defaultProps = {
  showDetails: process.env.NODE_ENV === 'development',
  showResetButton: true
};

export default ErrorBoundary;