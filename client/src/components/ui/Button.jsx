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
    // Use design system button classes
    const baseClasses = "btn";

    const variants = {
      primary: "btn-primary",
      secondary: "btn-secondary",
      ghost: "btn-ghost",
      outline: "btn-outline",
      danger: "btn-danger",
      success: "btn-success",
      warning: "btn-warning",
    };

    const sizes = {
      xs: "btn-xs",
      sm: "btn-sm",
      md: "btn-md",
      lg: "btn-lg",
      xl: "btn-xl",
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
