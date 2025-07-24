import logger from "../../utils/logger";
import React from "react";
import { cn } from "../../utils/cn";

export const Badge = ({
  children,
  variant = "default",
  size = "default",
  icon,
  className = "",
  ...props
}) => {
  const variants = {
    default: "badge-secondary",
    primary: "badge-primary",
    secondary: "badge-secondary",
    success: "badge-success",
    warning: "badge-warning", 
    danger: "badge-danger",
    info: "badge-info",
    // Order status badges
    pending: "badge-pending",
    processing: "badge-processing",
    shipped: "badge-shipped",
    delivered: "badge-delivered",
    cancelled: "badge-cancelled",
    // Platform badges
    trendyol: "badge-trendyol",
    hepsiburada: "badge-hepsiburada",
    n11: "badge-n11",
    amazon: "badge-amazon",
  };

  const sizes = {
    xs: "badge-xs",
    sm: "badge-sm",
    default: "", // Default size is built into base badge class
    lg: "badge-lg",
  };

  const renderIcon = () => {
    if (!icon) {
      return null;
    }

    // Check if icon is a React component function (including Heroicons)
    if (typeof icon === "function") {
      const IconComponent = icon;
      return <IconComponent className="h-3 w-3 mr-1" />;
    }

    // Check if icon is already a JSX element
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon, { className: "h-3 w-3 mr-1" });
    }

    return null;
  };

  return (
    <span
      className={cn(
        "badge",
        variants[variant] || variants.default,
        sizes[size],
        className
      )}
      {...props}
    >
      {renderIcon()}
      {children}
    </span>
  );
};

    // Check if icon is already a JSX element
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon, {
        className: cn("h-3 w-3 mr-1", icon.props?.className),
      });
    }

    // Check if icon is an object with $$typeof (React component pattern)
    if (typeof icon === "object" && icon !== null && icon.$$typeof) {
      // This handles cases where the icon might be a React component object
      return React.createElement(icon, { className: "h-3 w-3 mr-1" });
    }

    // For development mode, warn about invalid icon types
    if (process.env.NODE_ENV === "development") {
      logger.warn(
        "Badge: Invalid icon type provided. Expected React component, JSX element, or function.",
        typeof icon,
        icon
      );
    }

    return null;
  };

  const iconElement = renderIcon();

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full transition-colors",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {iconElement}
      {children}
    </span>
  );
};

export default Badge;
