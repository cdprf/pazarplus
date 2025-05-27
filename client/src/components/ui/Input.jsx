import React, { forwardRef } from "react";
import { cn } from "../../utils/cn";

export const Input = forwardRef(
  (
    {
      className = "",
      type = "text",
      error,
      success,
      disabled,
      required,
      label,
      helpText,
      errorMessage,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="form-group">
        {label && (
          <label className="form-label" htmlFor={inputId}>
            {label}
            {required && <span className="form-required">*</span>}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            "form-input",
            {
              "form-input-error": error,
              "form-input-success": success,
              "opacity-50 cursor-not-allowed": disabled,
            },
            className
          )}
          disabled={disabled}
          required={required}
          ref={ref}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helpText
              ? `${inputId}-help`
              : undefined
          }
          {...props}
        />
        {errorMessage && error && (
          <div id={`${inputId}-error`} className="form-error">
            {errorMessage}
          </div>
        )}
        {helpText && !error && (
          <div id={`${inputId}-help`} className="form-help">
            {helpText}
          </div>
        )}
        {success && <div className="form-success">Looks good!</div>}
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
