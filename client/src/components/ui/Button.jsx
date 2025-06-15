import React from "react";
import { cn } from "../../utils/cn";

const Button = React.forwardRef(
  (
    {
      className,
      variant = "primary",
      size = "md",
      disabled,
      loading,
      children,
      icon,
      iconPosition = "left",
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
      secondary:
        "bg-gray-100 text-gray-900 dark:text-gray-100 hover:bg-gray-200 active:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
      ghost:
        "hover:bg-gray-100 hover:text-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-100",
      outline:
        "border border-gray-300 bg-transparent hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800",
      danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
      success: "bg-green-600 text-white hover:bg-green-700 active:bg-green-800",
      warning:
        "bg-yellow-600 text-white hover:bg-yellow-700 active:bg-yellow-800",
    };

    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 py-2",
      lg: "h-12 px-8 text-lg",
    };

    const renderIcon = () => {
      if (loading) {
        return (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
      }

      if (icon) {
        // Check if icon is a React component function (including Heroicons)
        if (typeof icon === "function") {
          const IconComponent = icon;
          return <IconComponent className="h-4 w-4" />;
        }
        // Check if icon is already a JSX element
        if (React.isValidElement(icon)) {
          return React.cloneElement(icon, { className: "h-4 w-4" });
        }
        // Check if icon is an object with $$typeof (React component pattern)
        if (typeof icon === "object" && icon !== null && icon.$$typeof) {
          // This handles cases where the icon might be a React component object
          return React.createElement(icon, { className: "h-4 w-4" });
        }
        // If icon is a string or number, don't render it
        if (typeof icon === "string" || typeof icon === "number") {
          return null;
        }
        // For any other invalid type, don't render and warn in development
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "Button: Invalid icon type provided. Expected React component, JSX element, or function.",
            typeof icon,
            icon
          );
        }
        return null;
      }

      return null;
    };

    const iconElement = renderIcon();

    return (
      <button
        className={cn(
          baseClasses,
          variants[variant] || variants.primary,
          sizes[size] || sizes.md,
          {
            "opacity-50 cursor-not-allowed": disabled || loading,
            "w-full": fullWidth,
          },
          className
        )}
        disabled={disabled || loading}
        ref={ref}
        aria-disabled={disabled || loading}
        {...props}
      >
        {iconElement && iconPosition === "left" && (
          <span className="mr-2 flex">{iconElement}</span>
        )}
        {children}
        {iconElement && iconPosition === "right" && (
          <span className="ml-2 flex">{iconElement}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export default Button;
