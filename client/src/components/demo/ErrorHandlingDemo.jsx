import React, { useState } from "react";
import { Container, Row, Col, Button, Alert } from "react-bootstrap";
import { useError, useComponentError } from "../../contexts/ErrorContext";
import { useAlert } from "../../contexts/AlertContext";
import { useErrorHandler } from "../../hooks/useErrorHandler";
import ErrorState from "../common/ErrorState";
import { LoadingWithError } from "../common/withErrorHandling";

/**
 * Demo component showing various error handling features
 */
const ErrorHandlingDemo = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [demoData, setDemoData] = useState(null);

  // Global error handling
  const { addToastError, handleApiError } = useError();

  // Alert system for proper success/info messages
  const { success: showSuccess } = useAlert();

  // Component-specific error handling
  const {
    error: componentError,
    setError: setComponentError,
    clearError: clearComponentError,
  } = useComponentError("error-demo");

  // Advanced error handling hook
  const {
    error: hookError,
    clearError: clearHookError,
    withErrorHandling,
    retry,
  } = useErrorHandler();

  // Simulate different types of errors
  const simulateNetworkError = async () => {
    setIsLoading(true);
    try {
      // Simulate a network timeout
      await withErrorHandling(
        async () => {
          await new Promise((_, reject) => {
            setTimeout(() => {
              const error = new Error("Network timeout");
              error.code = "NETWORK_TIMEOUT";
              reject(error);
            }, 1000);
          });
        },
        { type: "network" }
      );
    } catch (error) {
      // Error is already handled by withErrorHandling
    } finally {
      setIsLoading(false);
    }
  };

  const simulateApiError = async () => {
    setIsLoading(true);
    try {
      // Simulate API error
      const mockApiError = {
        response: {
          status: 500,
          statusText: "Internal Server Error",
          data: { message: "Database connection failed" },
        },
        config: { url: "/api/orders", method: "GET" },
      };

      handleApiError(mockApiError, { component: "ErrorHandlingDemo" });
    } finally {
      setIsLoading(false);
    }
  };

  const simulateValidationError = () => {
    setComponentError({
      type: "validation",
      message: "Please fill in all required fields",
      details: {
        email: "Email is required",
        password: "Password must be at least 8 characters",
      },
    });
  };

  const simulateToastError = () => {
    addToastError("This is a toast error message", {
      type: "error",
      duration: 5000,
    });
  };

  const simulateToastSuccess = () => {
    addToastError("Operation completed successfully!", {
      type: "success",
      duration: 3000,
    });
  };

  const simulateToastWarning = () => {
    addToastError("This is a warning message", {
      type: "warning",
      duration: 4000,
    });
  };

  const simulateSuccessfulOperation = async () => {
    setIsLoading(true);
    try {
      await withErrorHandling(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setDemoData("Successfully loaded data!");
        // Fix: Use proper success method instead of error method
        showSuccess("Data loaded successfully!");
      });
    } catch (error) {
      // Error handled by withErrorHandling
    } finally {
      setIsLoading(false);
    }
  };

  const retryLastOperation = () => {
    retry(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setDemoData("Retry successful!");
      // Fix: Use proper success method instead of error method
      showSuccess("Retry completed successfully!");
    });
  };

  return (
    <Container className="py-4">
      <Row>
        <Col>
          <h2 className="mb-4">Error Handling System Demo</h2>
          <p className="text-muted mb-4">
            This demo shows various error handling features implemented in the
            application.
          </p>
        </Col>
      </Row>

      {/* Error State Examples */}
      <Row className="mb-4">
        <Col md={6}>
          <h4>Error State Examples</h4>
          <div className="d-grid gap-2">
            <Button
              variant="danger"
              onClick={simulateNetworkError}
              disabled={isLoading}
            >
              {isLoading ? "Simulating..." : "Simulate Network Error"}
            </Button>
            <Button variant="danger" onClick={simulateApiError}>
              Simulate API Error
            </Button>
            <Button variant="warning" onClick={simulateValidationError}>
              Simulate Validation Error
            </Button>
            <Button
              variant="success"
              onClick={simulateSuccessfulOperation}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Simulate Success"}
            </Button>
          </div>
        </Col>

        <Col md={6}>
          <h4>Toast Notifications</h4>
          <div className="d-grid gap-2">
            <Button variant="outline-danger" onClick={simulateToastError}>
              Show Error Toast
            </Button>
            <Button variant="outline-success" onClick={simulateToastSuccess}>
              Show Success Toast
            </Button>
            <Button variant="outline-warning" onClick={simulateToastWarning}>
              Show Warning Toast
            </Button>
          </div>
        </Col>
      </Row>

      {/* Loading with Error Component Demo */}
      <Row className="mb-4">
        <Col>
          <h4>Loading with Error Component</h4>
          <LoadingWithError
            isLoading={isLoading}
            error={hookError}
            onRetry={retryLastOperation}
          >
            <Alert variant="success">
              {demoData ||
                "No data loaded yet. Try the success operation above."}
            </Alert>
          </LoadingWithError>
        </Col>
      </Row>

      {/* Component Error Display */}
      {componentError && (
        <Row className="mb-4">
          <Col>
            <h4>Component-Specific Error</h4>
            <ErrorState
              type={componentError.type}
              message={componentError.message}
              details={componentError.details}
              onRetry={clearComponentError}
              size="small"
            />
          </Col>
        </Row>
      )}

      {/* Error Actions */}
      <Row>
        <Col>
          <h4>Error Management</h4>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={clearComponentError}>
              Clear Component Error
            </Button>
            <Button variant="outline-secondary" onClick={clearHookError}>
              Clear Hook Error
            </Button>
          </div>
        </Col>
      </Row>

      {/* Instructions */}
      <Row className="mt-5">
        <Col>
          <h4>How to Use</h4>
          <Alert variant="info">
            <h6>In your components:</h6>
            <ul className="mb-0">
              <li>
                <code>useError()</code> - Global error handling and toast
                notifications
              </li>
              <li>
                <code>useComponentError('key')</code> - Component-specific error
                state
              </li>
              <li>
                <code>useErrorHandler()</code> - Advanced error handling with
                retry logic
              </li>
              <li>
                <code>ErrorState</code> - Reusable error display component
              </li>
              <li>
                <code>LoadingWithError</code> - Combined loading and error
                states
              </li>
              <li>
                <code>withErrorHandling()</code> - HOC for automatic error
                handling
              </li>
            </ul>
          </Alert>
        </Col>
      </Row>
    </Container>
  );
};

export default ErrorHandlingDemo;
