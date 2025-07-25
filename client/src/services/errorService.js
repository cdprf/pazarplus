import logger from "../utils/logger.js";
/**
 * Global error management service
 * Handles error reporting, logging, and user notifications
 */
class ErrorService {
  constructor() {
    this.errorHandlers = [];
    this.errorLog = [];
    this.maxLogSize = 100;

    // Initialize global error handlers
    this.initializeGlobalHandlers();
  }

  /**
   * Initialize global error handlers for unhandled errors
   */
  initializeGlobalHandlers() {
    // Handle unhandled JavaScript errors
    window.addEventListener("error", (event) => {
      this.logError({
        type: "javascript",
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.logError({
        type: "promise",
        message: event.reason?.message || "Unhandled promise rejection",
        reason: event.reason,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle React errors (will be caught by ErrorBoundary)
    this.addErrorHandler("react", (error, errorInfo) => {
      this.logError({
        type: "react",
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Add a custom error handler
   */
  addErrorHandler(type, handler) {
    this.errorHandlers.push({ type, handler });
  }

  /**
   * Remove an error handler
   */
  removeErrorHandler(type) {
    this.errorHandlers = this.errorHandlers.filter((h) => h.type !== type);
  }

  /**
   * Log an error
   */
  logError(errorData) {
    // Add to local error log
    this.errorLog.unshift({
      id: Date.now() + Math.random(),
      ...errorData,
    });

    // Maintain log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Console log in development
    if (process.env.NODE_ENV === "development") {
      logger.error("🚨 Error logged:", errorData);
    }

    // Call custom handlers
    this.errorHandlers.forEach(({ handler }) => {
      try {
        handler(errorData);
      } catch (e) {
        logger.error("Error in error handler:", e);
      }
    });

    // Send to external service if configured
    this.reportToExternalService(errorData);
  }

  /**
   * Report error to external monitoring service
   */
  async reportToExternalService(errorData) {
    try {
      // Skip in development
      if (process.env.NODE_ENV === "development") {
        return;
      }

      // Check if external service is configured
      const errorReportingUrl = process.env.REACT_APP_ERROR_REPORTING_URL;
      if (!errorReportingUrl) {
        return;
      }

      // Send error to external service
      await fetch(errorReportingUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...errorData,
          userAgent: navigator.userAgent,
          url: window.location.href,
          userId: this.getCurrentUserId(),
          sessionId: this.getSessionId(),
        }),
      });
    } catch (error) {
      logger.warn("Failed to report error to external service:", error);
    }
  }

  /**
   * Get current user ID (implement based on your auth system)
   */
  getCurrentUserId() {
    try {
      // Get from auth context or localStorage
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user.id || "anonymous";
    } catch {
      return "anonymous";
    }
  }

  /**
   * Get session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem("sessionId");
    if (!sessionId) {
      sessionId = Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem("sessionId", sessionId);
    }
    return sessionId;
  }

  /**
   * Get error log
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byType: {},
      recent: this.errorLog.slice(0, 10),
    };

    this.errorLog.forEach((error) => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Handle API errors specifically
   */
  handleApiError(error, context = {}) {
    const errorData = {
      type: "api",
      message: error.message || "API Error",
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data,
      context,
      timestamp: new Date().toISOString(),
    };

    this.logError(errorData);
    return errorData;
  }

  /**
   * Handle form validation errors
   */
  handleValidationError(errors, context = {}) {
    const errorData = {
      type: "validation",
      message: "Form validation failed",
      errors,
      context,
      timestamp: new Date().toISOString(),
    };

    this.logError(errorData);
    return errorData;
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error, context = {}) {
    const errorData = {
      type: "network",
      message: error.message || "Network Error",
      code: error.code,
      context,
      timestamp: new Date().toISOString(),
    };

    this.logError(errorData);
    return errorData;
  }
}

// Create and export singleton instance
const errorService = new ErrorService();

// Make it available globally for debugging
if (process.env.NODE_ENV === "development") {
  window.errorService = errorService;
}

export default errorService;
