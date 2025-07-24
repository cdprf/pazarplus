import logger from "../utils/logger";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Custom hook for handling errors consistently across the application
 */
export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Handle different types of errors
  const handleError = useCallback(
    (error, options = {}) => {
      const {
        type = "general",
        redirectTo = null,
        showNotification = false,
        logError = true,
      } = options;

      // Log error if enabled
      if (logError) {
        logger.error("Error handled by useErrorHandler:", error);
      }

      // Determine error type and message
      let errorType = type;
      let errorMessage = "An unexpected error occurred";
      let errorDetails = null;

      if (error) {
        // Handle different error types
        if (error.response) {
          // HTTP errors
          const status = error.response.status;
          errorDetails = {
            status,
            statusText: error.response.statusText,
            data: error.response.data,
            url: error.config?.url,
          };

          switch (status) {
            case 400:
              errorType = "general";
              errorMessage = error.response.data?.message || "Bad request";
              break;
            case 401:
              errorType = "unauthorized";
              errorMessage = "Please log in to continue";
              break;
            case 403:
              errorType = "unauthorized";
              errorMessage =
                "You don't have permission to access this resource";
              break;
            case 404:
              errorType = "notFound";
              errorMessage = "Resource not found";
              break;
            case 408:
              errorType = "timeout";
              errorMessage = "Request timeout - please try again";
              break;
            case 500:
            case 502:
            case 503:
            case 504:
              errorType = "server";
              errorMessage = "Server error - please try again later";
              break;
            default:
              errorType = "general";
              errorMessage =
                error.response.data?.message || `HTTP ${status} Error`;
          }
        } else if (error.request) {
          // Network errors
          errorType = "network";
          errorMessage = "Network error - please check your connection";
          errorDetails = {
            message: "No response received from server",
            timeout: error.code === "ECONNABORTED",
          };
        } else if (error.message) {
          // JavaScript errors
          errorType = "general";
          errorMessage = error.message;
          errorDetails = {
            stack: error.stack,
            name: error.name,
          };
        }
      }

      // Set error state
      const errorState = {
        type: errorType,
        message: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
        originalError: error,
      };

      setError(errorState);

      // Handle redirects
      if (redirectTo) {
        navigate(redirectTo, {
          state: {
            error: errorState,
          },
        });
      }

      // Handle notifications (would integrate with notification system)
      if (showNotification && window.showNotification) {
        window.showNotification(errorMessage, "error");
      }

      return errorState;
    },
    [navigate]
  );

  // Async error wrapper
  const withErrorHandling = useCallback(
    async (asyncFn, options = {}) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await asyncFn();
        return result;
      } catch (error) {
        handleError(error, options);
        throw error; // Re-throw to allow component-level handling if needed
      } finally {
        setIsLoading(false);
      }
    },
    [handleError, clearError]
  );

  // Retry function
  const retry = useCallback(
    async (asyncFn, options = {}) => {
      clearError();
      return withErrorHandling(asyncFn, options);
    },
    [withErrorHandling, clearError]
  );

  return {
    error,
    isLoading,
    handleError,
    clearError,
    withErrorHandling,
    retry,
  };
};

/**
 * Hook for handling form errors specifically
 */
export const useFormErrorHandler = () => {
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);

  const handleFormError = useCallback((error) => {
    if (error.response?.data?.errors) {
      // Handle validation errors
      const errors = error.response.data.errors;
      if (Array.isArray(errors)) {
        // Express-validator style errors
        const fieldErrorMap = {};
        errors.forEach((err) => {
          if (err.param) {
            fieldErrorMap[err.param] = err.msg;
          }
        });
        setFieldErrors(fieldErrorMap);
      } else if (typeof errors === "object") {
        // Object-style field errors
        setFieldErrors(errors);
      }
    } else {
      // General form error
      setGeneralError(
        error.response?.data?.message ||
          error.message ||
          "Form submission failed"
      );
    }
  }, []);

  const clearFieldError = useCallback((fieldName) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
    setGeneralError(null);
  }, []);

  return {
    fieldErrors,
    generalError,
    handleFormError,
    clearFieldError,
    clearAllErrors,
  };
};

export default useErrorHandler;
