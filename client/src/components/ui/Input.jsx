import React, { forwardRef } from "react";
import { cn } from "../../utils/cn";

export const Input = forwardRef(
  (
    {
      className = "",
      type = "text",
      label,
      error,
      helper,
      icon: Icon,
      iconPosition = "left",
      required = false,
      ...props
    },
    ref
  ) => {
    const inputClasses = cn(
      "form-input",
      error && "form-input-error",
      className
    );

    return (
      <div className="form-group">
        {label && (
          <label className="form-label" htmlFor={props.id}>
            {label}
            {required && <span className="form-required">*</span>}
          </label>
        )}

        <div className="relative">
          {Icon && iconPosition === "left" && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
          )}

          <input type={type} className={inputClasses} ref={ref} {...props} />

          {Icon && iconPosition === "right" && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
          )}
        </div>

        {error && <div className="form-error">{error}</div>}

        {helper && !error && <div className="form-help">{helper}</div>}
      </div>
    );
  }
);

Input.displayName = "Input";

// Additional form components for the design system
export const Label = ({
  children,
  className = "",
  required = false,
  ...props
}) => (
  <label className={cn("form-label", className)} {...props}>
    {children}
    {required && <span className="form-required">*</span>}
  </label>
);

export const FormGroup = ({ children, className = "", ...props }) => (
  <div className={cn("form-group", className)} {...props}>
    {children}
  </div>
);

export const HelpText = ({ children, className = "", ...props }) => (
  <div className={cn("form-help", className)} {...props}>
    {children}
  </div>
);

export const ErrorText = ({ children, className = "", ...props }) => (
  <div className={cn("form-error", className)} {...props}>
    {children}
  </div>
);

export const SuccessText = ({ children, className = "", ...props }) => (
  <div className={cn("form-success", className)} {...props}>
    {children}
  </div>
);
