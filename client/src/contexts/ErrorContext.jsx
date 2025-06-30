import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";
import errorService from "../services/errorService";

// Error context for global error state management
const ErrorContext = createContext();

// Error action types
const ERROR_ACTIONS = {
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  CLEAR_ALL_ERRORS: "CLEAR_ALL_ERRORS",
  ADD_TOAST_ERROR: "ADD_TOAST_ERROR",
  REMOVE_TOAST_ERROR: "REMOVE_TOAST_ERROR",
};

// Error reducer
const errorReducer = (state, action) => {
  switch (action.type) {
    case ERROR_ACTIONS.SET_ERROR:
      return {
        ...state,
        [action.payload.key]: action.payload.error,
      };

    case ERROR_ACTIONS.CLEAR_ERROR:
      const newState = { ...state };
      delete newState[action.payload.key];
      return newState;

    case ERROR_ACTIONS.CLEAR_ALL_ERRORS:
      return {
        toastErrors: state.toastErrors || [],
      };

    case ERROR_ACTIONS.ADD_TOAST_ERROR:
      return {
        ...state,
        toastErrors: [
          ...(state.toastErrors || []),
          {
            id: Date.now() + Math.random(),
            ...action.payload,
          },
        ],
      };

    case ERROR_ACTIONS.REMOVE_TOAST_ERROR:
      return {
        ...state,
        toastErrors: (state.toastErrors || []).filter(
          (error) => error.id !== action.payload.id
        ),
      };

    default:
      return state;
  }
};

// Error provider component
export const ErrorProvider = ({ children }) => {
  const [errors, dispatch] = useReducer(errorReducer, {
    toastErrors: [],
  });

  // Set an error for a specific component/page
  const setError = useCallback((key, error) => {
    // Log to error service
    errorService.logError({
      type: "component",
      key,
      message: error.message || "Component error",
      error,
      timestamp: new Date().toISOString(),
    });

    dispatch({
      type: ERROR_ACTIONS.SET_ERROR,
      payload: { key, error },
    });
  }, []);

  // Clear a specific error
  const clearError = useCallback((key) => {
    dispatch({
      type: ERROR_ACTIONS.CLEAR_ERROR,
      payload: { key },
    });
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    dispatch({
      type: ERROR_ACTIONS.CLEAR_ALL_ERRORS,
    });
  }, []);

  // Add a toast error (temporary notification)
  const addToastError = useCallback((error, options = {}) => {
    const { duration = 5000, type = "error", dismissible = true } = options;

    const toastError = {
      message: error.message || error,
      type,
      dismissible,
      timestamp: new Date().toISOString(),
    };

    // Log to error service
    errorService.logError({
      type: "toast",
      ...toastError,
    });

    dispatch({
      type: ERROR_ACTIONS.ADD_TOAST_ERROR,
      payload: toastError,
    });

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        dispatch({
          type: ERROR_ACTIONS.REMOVE_TOAST_ERROR,
          payload: { id: toastError.id },
        });
      }, duration);
    }

    return toastError.id;
  }, []);

  // Remove a toast error
  const removeToastError = useCallback((id) => {
    dispatch({
      type: ERROR_ACTIONS.REMOVE_TOAST_ERROR,
      payload: { id },
    });
  }, []);

  // Handle API errors
  const handleApiError = useCallback(
    (error, context = {}) => {
      const errorData = errorService.handleApiError(error, context);

      // Show toast for API errors
      addToastError(errorData.message, {
        type: "error",
        duration: 8000,
      });

      return errorData;
    },
    [addToastError]
  );

  // Handle form errors
  const handleFormError = useCallback(
    (error, formKey) => {
      const errorData = errorService.handleValidationError(error, { formKey });
      setError(formKey, errorData);
      return errorData;
    },
    [setError]
  );

  // Handle network errors
  const handleNetworkError = useCallback(
    (error, context = {}) => {
      const errorData = errorService.handleNetworkError(error, context);

      // Show toast for network errors
      addToastError("Network connection error. Please check your connection.", {
        type: "error",
        duration: 10000,
      });

      return errorData;
    },
    [addToastError]
  );

  // Get error by key
  const getError = useCallback(
    (key) => {
      return errors[key];
    },
    [errors]
  );

  // Check if there are any errors
  const hasErrors = useCallback(() => {
    return Object.keys(errors).some(
      (key) => key !== "toastErrors" && errors[key]
    );
  }, [errors]);

  // Get all current errors
  const getAllErrors = useCallback(() => {
    const allErrors = { ...errors };
    delete allErrors.toastErrors;
    return allErrors;
  }, [errors]);

  const value = {
    // State
    errors,
    toastErrors: errors.toastErrors || [],

    // Actions
    setError,
    clearError,
    clearAllErrors,
    addToastError,
    removeToastError,

    // Specialized handlers
    handleApiError,
    handleFormError,
    handleNetworkError,

    // Getters
    getError,
    hasErrors,
    getAllErrors,
  };

  return (
    <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>
  );
};

// Hook to use error context
export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error("useError must be used within an ErrorProvider");
  }
  return context;
};

// Hook for component-specific error handling
export const useComponentError = (componentKey) => {
  const { setError, clearError, getError } = useError();

  const error = getError(componentKey);

  const setComponentError = useCallback(
    (error) => {
      setError(componentKey, error);
    },
    [setError, componentKey]
  );

  const clearComponentError = useCallback(() => {
    clearError(componentKey);
  }, [clearError, componentKey]);

  return {
    error,
    setError: setComponentError,
    clearError: clearComponentError,
  };
};

export default ErrorContext;
