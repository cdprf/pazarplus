import React, { useState, useCallback, useMemo } from "react";
import { Card, Spinner, Alert } from "react-bootstrap";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { safeNumeric } from "../../utils/analyticsFormatting";

const KPICard = ({
  title,
  value,
  change,
  icon: IconComponent,
  color = "primary",
  loading = false,
  error = null,
  onClick,
  className = "",
  "aria-label": ariaLabel,
  testId,
}) => {
  // Safely parse the change value using useMemo for performance
  const numericChange = useMemo(() => safeNumeric(change), [change]);

  // Memoize trend calculations
  const trendData = useMemo(() => {
    const getTrendIcon = () => {
      if (numericChange > 0)
        return (
          <ArrowTrendingUpIcon
            className="h-4 w-4 text-success"
            aria-hidden="true"
          />
        );
      if (numericChange < 0)
        return (
          <ArrowTrendingDownIcon
            className="h-4 w-4 text-danger"
            aria-hidden="true"
          />
        );
      return null;
    };

    const getTrendColor = () => {
      if (numericChange > 0) return "text-success";
      if (numericChange < 0) return "text-danger";
      return "text-muted";
    };

    const getTrendAriaLabel = () => {
      if (numericChange > 0) return "Increasing trend";
      if (numericChange < 0) return "Decreasing trend";
      return "Stable trend";
    };

    return {
      icon: getTrendIcon(),
      color: getTrendColor(),
      ariaLabel: getTrendAriaLabel(),
    };
  }, [numericChange]);

  const formatChangeValue = useCallback((changeValue) => {
    const numeric = safeNumeric(changeValue);
    if (numeric === 0) return "0%";
    return `${numeric > 0 ? "+" : ""}${numeric.toFixed(1)}%`;
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event) => {
      if (onClick && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  // Handle click with error boundary
  const handleClick = useCallback(() => {
    try {
      if (onClick) {
        onClick();
      }
    } catch (err) {
      console.error("KPICard click error:", err);
    }
  }, [onClick]);

  // Loading state
  if (loading) {
    return (
      <Card className={`mb-3 ${className}`} data-testid={testId}>
        <Card.Body>
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: "120px" }}
          >
            <Spinner
              animation="border"
              size="sm"
              role="status"
              aria-label="Loading KPI data"
            >
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        </Card.Body>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={`mb-3 ${className}`} data-testid={testId}>
        <Card.Body>
          <Alert variant="danger" className="mb-0">
            <ExclamationTriangleIcon
              className="h-4 w-4 me-2"
              aria-hidden="true"
            />
            <span className="small">Failed to load KPI data</span>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  // Empty state
  if (!value && value !== 0) {
    return (
      <Card className={`mb-3 ${className}`} data-testid={testId}>
        <Card.Body>
          <div className="text-center text-muted">
            <div className="mb-2">
              <ExclamationTriangleIcon
                className="h-6 w-6 mx-auto"
                aria-hidden="true"
              />
            </div>
            <h6 className="card-subtitle mb-2">{title}</h6>
            <small>No data available</small>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card
      className={`mb-3 ${className} ${onClick ? "cursor-pointer" : ""}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : -1}
      role={onClick ? "button" : "article"}
      aria-label={
        ariaLabel ||
        `${title}: ${value}${change ? `, ${trendData.ariaLabel}` : ""}`
      }
      data-testid={testId}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div className="flex-grow-1">
            <h6
              className="card-subtitle mb-2 text-muted"
              id={`${testId}-title`}
            >
              {title}
            </h6>
            <h4
              className="card-title mb-1"
              aria-describedby={`${testId}-title`}
              style={{ wordBreak: "break-word" }}
            >
              {value}
            </h4>
            {change !== undefined && change !== null && (
              <div
                className={`d-flex align-items-center ${trendData.color}`}
                aria-label={`Change: ${formatChangeValue(change)}, ${
                  trendData.ariaLabel
                }`}
              >
                {trendData.icon}
                <small className="ms-1">{formatChangeValue(change)}</small>
              </div>
            )}
          </div>
          {IconComponent && (
            <div
              className={`text-${color} flex-shrink-0 ms-3`}
              aria-hidden="true"
            >
              <IconComponent className="h-8 w-8" />
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default KPICard;
