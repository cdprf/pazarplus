import React from "react";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";

/**
 * Enhanced KPI Card Component
 * Displays key performance indicators with trend indicators and color-coded status
 */
const KPICard = ({
  title,
  value,
  change,
  icon: Icon,
  color = "primary",
  loading = false,
  error = null,
  format = "default",
  trend = null,
  subtitle = null,
  testId = null,
}) => {
  // Color mapping for different KPI types
  const colorClasses = {
    primary: {
      container: "border-primary-200 bg-primary-50 hover:bg-primary-100",
      icon: "bg-primary-100 text-primary-600",
      text: "text-primary-900",
    },
    success: {
      container: "border-success-200 bg-success-50 hover:bg-success-100",
      icon: "bg-success-100 text-success-600",
      text: "text-success-900",
    },
    warning: {
      container: "border-warning-200 bg-warning-50 hover:bg-warning-100",
      icon: "bg-warning-100 text-warning-600",
      text: "text-warning-900",
    },
    danger: {
      container: "border-danger-200 bg-danger-50 hover:bg-danger-100",
      icon: "bg-danger-100 text-danger-600",
      text: "text-danger-900",
    },
    info: {
      container: "border-gray-200 bg-gray-50 hover:bg-gray-100",
      icon: "bg-gray-100 text-gray-600",
      text: "text-gray-900",
    },
  };

  const colors = colorClasses[color] || colorClasses.primary;

  // Format value based on type
  const formatValue = (val) => {
    // Ensure val is a number, default to 0 if not
    const numericValue = typeof val === "number" && !isNaN(val) ? val : 0;

    if (format === "currency") {
      return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numericValue);
    }
    if (format === "percentage") {
      return `${numericValue.toFixed(1)}%`;
    }
    if (format === "number") {
      return new Intl.NumberFormat("tr-TR").format(numericValue);
    }
    return val || "0";
  };

  // Determine trend direction and color
  const getTrendInfo = () => {
    const changeValue = change || trend;
    if (changeValue === null || changeValue === undefined) return null;

    // Ensure changeValue is a number
    const numericChange =
      typeof changeValue === "number" && !isNaN(changeValue) ? changeValue : 0;

    const isPositive = numericChange > 0;
    const isNegative = numericChange < 0;

    return {
      isPositive,
      isNegative,
      isNeutral: numericChange === 0,
      value: Math.abs(numericChange),
      icon: isPositive ? ArrowTrendingUpIcon : ArrowTrendingDownIcon,
      className: isPositive
        ? "analytics-trend trend-up"
        : isNegative
        ? "analytics-trend trend-down"
        : "analytics-trend trend-neutral",
    };
  };

  const trendInfo = getTrendInfo();

  // Loading state
  if (loading) {
    return (
      <div className="analytics-kpi-card" data-testid={testId}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            <div className="w-16 h-6 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="w-24 h-4 bg-gray-200 rounded"></div>
            <div className="w-32 h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="analytics-kpi-card border-danger-200 bg-danger-50"
        data-testid={testId}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="icon-container bg-danger-100 text-danger-600">
            {Icon && <Icon className="h-5 w-5" />}
          </div>
          <div className="analytics-trend trend-down">
            <ArrowTrendingDownIcon className="h-4 w-4" />
            Error
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-danger-600 mb-2">{title}</p>
          <p className="analytics-value text-danger-700">--</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`analytics-kpi-card ${colors.container}`}
      data-testid={testId}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`icon-container ${colors.icon}`}>
          {Icon && <Icon className="h-5 w-5" />}
        </div>
        {trendInfo && (
          <div className={trendInfo.className}>
            <trendInfo.icon className="h-4 w-4" />
            {trendInfo.isPositive ? "+" : ""}
            {format === "percentage"
              ? `${trendInfo.value.toFixed(1)}%`
              : trendInfo.value.toFixed(1)}
          </div>
        )}
      </div>

      <div>
        <p className={`text-sm font-medium mb-2 ${colors.text}`}>{title}</p>
        <p className={`analytics-value ${colors.text}`}>{formatValue(value)}</p>
        {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

export default KPICard;
