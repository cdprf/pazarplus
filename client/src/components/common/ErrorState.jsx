import React from "react";
import PropTypes from "prop-types";
import { Container, Row, Col, Button, Alert } from "react-bootstrap";
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  WifiIcon,
  ServerIcon,
  ShieldExclamationIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

/**
 * Enhanced ErrorState component for displaying various error states
 * with appropriate icons, messages, and actions
 */
const ErrorState = ({
  type = "general",
  title,
  message,
  details,
  primaryAction,
  secondaryAction,
  showRetryButton = true,
  showHomeButton = false,
  showDetailsToggle = false,
  onRetry,
  onHome,
  className = "",
  size = "large",
  variant = "danger",
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  // Error type configurations
  const errorConfigs = {
    general: {
      icon: ExclamationTriangleIcon,
      defaultTitle: "Something went wrong",
      defaultMessage: "An unexpected error occurred. Please try again.",
      iconColor: "text-warning",
    },
    network: {
      icon: WifiIcon,
      defaultTitle: "Connection Error",
      defaultMessage:
        "Unable to connect to the server. Please check your internet connection.",
      iconColor: "text-danger",
    },
    server: {
      icon: ServerIcon,
      defaultTitle: "Server Error",
      defaultMessage:
        "The server is currently experiencing issues. Please try again later.",
      iconColor: "text-danger",
    },
    unauthorized: {
      icon: ShieldExclamationIcon,
      defaultTitle: "Access Denied",
      defaultMessage: "You don't have permission to access this resource.",
      iconColor: "text-warning",
    },
    notFound: {
      icon: XCircleIcon,
      defaultTitle: "Not Found",
      defaultMessage: "The requested resource could not be found.",
      iconColor: "text-muted",
    },
    timeout: {
      icon: ClockIcon,
      defaultTitle: "Request Timeout",
      defaultMessage:
        "The request took too long to complete. Please try again.",
      iconColor: "text-warning",
    },
  };

  const config = errorConfigs[type] || errorConfigs.general;
  const IconComponent = config.icon;

  // Size configurations
  const sizeConfigs = {
    small: {
      iconSize: "h-12 w-12",
      titleClass: "h5",
      containerClass: "py-3",
    },
    medium: {
      iconSize: "h-16 w-16",
      titleClass: "h4",
      containerClass: "py-4",
    },
    large: {
      iconSize: "h-20 w-20",
      titleClass: "h3",
      containerClass: "py-5",
    },
  };

  const sizeConfig = sizeConfigs[size] || sizeConfigs.large;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleHome = () => {
    if (onHome) {
      onHome();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <Container className={`error-state ${className}`}>
      <Row className="justify-content-center">
        <Col xs={12} md={8} lg={6}>
          <div className={`text-center ${sizeConfig.containerClass}`}>
            {/* Error Icon */}
            <div className="mb-4">
              <IconComponent
                className={`${sizeConfig.iconSize} ${config.iconColor} mx-auto`}
                strokeWidth={1.5}
              />
            </div>

            {/* Error Title */}
            <h2 className={`${sizeConfig.titleClass} mb-3 text-dark`}>
              {title || config.defaultTitle}
            </h2>

            {/* Error Message */}
            <p className="text-muted mb-4 lead">
              {message || config.defaultMessage}
            </p>

            {/* Error Details (collapsible) */}
            {(details || showDetailsToggle) && (
              <div className="mb-4">
                {showDetailsToggle && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-decoration-none p-0 mb-2"
                  >
                    {showDetails ? "Hide Details" : "Show Details"}
                  </Button>
                )}

                {(showDetails || !showDetailsToggle) && details && (
                  <Alert variant={variant} className="text-start">
                    <small>
                      {typeof details === "string" ? (
                        <pre
                          className="mb-0"
                          style={{ whiteSpace: "pre-wrap" }}
                        >
                          {details}
                        </pre>
                      ) : (
                        <code>{JSON.stringify(details, null, 2)}</code>
                      )}
                    </small>
                  </Alert>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="d-flex justify-content-center gap-2 flex-wrap">
              {/* Primary Action */}
              {primaryAction && (
                <Button
                  variant={primaryAction.variant || "primary"}
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                  className={primaryAction.className}
                >
                  {primaryAction.label}
                </Button>
              )}

              {/* Retry Button */}
              {showRetryButton && !primaryAction && (
                <Button
                  variant="primary"
                  onClick={handleRetry}
                  className="me-2"
                >
                  Try Again
                </Button>
              )}

              {/* Secondary Action */}
              {secondaryAction && (
                <Button
                  variant={secondaryAction.variant || "outline-secondary"}
                  onClick={secondaryAction.onClick}
                  disabled={secondaryAction.disabled}
                  className={secondaryAction.className}
                >
                  {secondaryAction.label}
                </Button>
              )}

              {/* Home Button */}
              {showHomeButton && !secondaryAction && (
                <Button variant="outline-secondary" onClick={handleHome}>
                  Go Home
                </Button>
              )}
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

ErrorState.propTypes = {
  type: PropTypes.oneOf([
    "general",
    "network",
    "server",
    "unauthorized",
    "notFound",
    "timeout",
  ]),
  title: PropTypes.string,
  message: PropTypes.string,
  details: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  primaryAction: PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    variant: PropTypes.string,
    disabled: PropTypes.bool,
    className: PropTypes.string,
  }),
  secondaryAction: PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    variant: PropTypes.string,
    disabled: PropTypes.bool,
    className: PropTypes.string,
  }),
  showRetryButton: PropTypes.bool,
  showHomeButton: PropTypes.bool,
  showDetailsToggle: PropTypes.bool,
  onRetry: PropTypes.func,
  onHome: PropTypes.func,
  className: PropTypes.string,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  variant: PropTypes.string,
};

export default ErrorState;
