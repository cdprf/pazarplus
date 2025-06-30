import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ErrorState from "../components/common/ErrorState";

/**
 * Full-page error component for routing errors and general application errors
 */
const ErrorPage = ({
  type = "general",
  title,
  message,
  showNavigation = true,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract error details from location state if available
  const errorDetails = location.state?.error;
  const errorType = location.state?.type || type;

  const handleRetry = () => {
    // If there's a previous location, go back
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const handleHome = () => {
    navigate("/");
  };

  // Configure error based on route
  const getErrorConfig = () => {
    const path = location.pathname;

    if (path.includes("/404") || errorType === "notFound") {
      return {
        type: "notFound",
        title: title || "404 - Page Not Found",
        message: message || `The page "${path}" could not be found.`,
      };
    }

    if (path.includes("/500") || errorType === "server") {
      return {
        type: "server",
        title: title || "500 - Server Error",
        message: message || "Internal server error occurred.",
      };
    }

    if (path.includes("/unauthorized") || errorType === "unauthorized") {
      return {
        type: "unauthorized",
        title: title || "403 - Unauthorized",
        message: message || "You are not authorized to access this page.",
      };
    }

    return {
      type: errorType,
      title: title || "Error",
      message: message || "An error occurred while loading this page.",
    };
  };

  const errorConfig = getErrorConfig();

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <ErrorState
        type={errorConfig.type}
        title={errorConfig.title}
        message={errorConfig.message}
        details={errorDetails}
        showDetailsToggle={!!errorDetails}
        showRetryButton={showNavigation}
        showHomeButton={showNavigation}
        onRetry={handleRetry}
        onHome={handleHome}
        size="large"
      />
    </div>
  );
};

export default ErrorPage;
