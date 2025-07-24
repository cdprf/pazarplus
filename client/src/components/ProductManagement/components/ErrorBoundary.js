import logger from "../../../utils/logger";
import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../../ui';

/**
 * Error Boundary Component for Product Management
 * Catches JavaScript errors and provides a fallback UI
 */
class ProductManagementErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    logger.error('ProductManagement Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Send error to logging service (if available)
    if (window.errorLogger) {
      window.errorLogger.logError('ProductManagement', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
              <div className="mb-4">
                <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Bir Hata Oluştu
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Ürün yönetimi sayfası yüklenirken beklenmeyen bir hata oluştu.
                </p>
              </div>

              {/* Error details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md text-left">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                    Hata Detayları:
                  </h3>
                  <pre className="text-xs text-red-700 dark:text-red-300 overflow-auto max-h-32">
                    {this.state.error.toString()}
                  </pre>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleRetry}
                  variant="primary"
                  className="flex items-center justify-center"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tekrar Dene
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex items-center justify-center"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Ana Sayfaya Dön
                </Button>
              </div>

              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Deneme sayısı: {this.state.retryCount}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version of error boundary for functional components
 */
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error, errorInfo = {}) => {
    logger.error('Error caught by useErrorHandler:', error);
    setError({ error, errorInfo });
  }, []);

  React.useEffect(() => {
    if (error) {
      // Log to error reporting service
      if (window.errorLogger) {
        window.errorLogger.logError('ProductManagement', error.error, error.errorInfo);
      }
    }
  }, [error]);

  return {
    error,
    handleError,
    resetError,
  };
};

/**
 * Simple Error Display Component for inline errors
 */
export const ErrorDisplay = ({ 
  error, 
  onRetry, 
  onDismiss,
  className = '',
  size = 'md' 
}) => {
  if (!error) return null;

  const sizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4',
    lg: 'p-6 text-lg',
  };

  return (
    <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${sizeClasses[size]} ${className}`}>
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-medium text-red-800 dark:text-red-200 mb-1">
            Hata Oluştu
          </h3>
          <p className="text-red-700 dark:text-red-300 mb-3">
            {error?.message || 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz.'}
          </p>
          
          <div className="flex flex-wrap gap-2">
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-800/30"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Tekrar Dene
              </Button>
            )}
            {onDismiss && (
              <Button
                onClick={onDismiss}
                variant="ghost"
                size="sm"
                className="text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-800/30"
              >
                Kapat
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductManagementErrorBoundary;
