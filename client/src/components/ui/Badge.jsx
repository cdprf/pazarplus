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
    default: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    primary: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    secondary: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    success:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    warning:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    info: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
    purple:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    orange:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    pink: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
    indigo:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    yellow:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const sizes = {
    xs: "px-1.5 py-0.5 text-xs",
    sm: "px-2 py-1 text-xs",
    default: "px-2.5 py-1.5 text-sm",
    lg: "px-3 py-2 text-base",
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
      console.warn(
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
