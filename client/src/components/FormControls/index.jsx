/**
 * Reusable Form Controls with consistent styling and validation
 * Implements compound component pattern
 */

import React, { forwardRef, useId, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

// Base FormField component
export const FormField = ({ children, error, className = "" }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {children}
      {error && <FormError message={error} />}
    </div>
  );
};

// Label component
export const Label = forwardRef(
  ({ children, required = false, htmlFor, className = "", ...props }, ref) => {
    const id = useId();
    const labelId = htmlFor || id;

    return (
      <label
        ref={ref}
        htmlFor={labelId}
        className={`block text-sm font-medium text-gray-700 dark:text-gray-300 ${className}`}
        {...props}
      >
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    );
  }
);

Label.displayName = "Label";

// Input component
export const Input = forwardRef(
  ({ type = "text", error, className = "", ...props }, ref) => {
    const baseClasses = `
    w-full px-3 py-2 border rounded-lg 
    focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-50 disabled:text-gray-500
    dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100
    transition-colors duration-200
  `;

    const errorClasses = error
      ? "border-red-300 focus:ring-red-500"
      : "border-gray-300 dark:border-gray-600";

    return (
      <input
        ref={ref}
        type={type}
        className={`${baseClasses} ${errorClasses} ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

// Password Input with show/hide toggle
export const PasswordInput = forwardRef(
  ({ error, className = "", ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={showPassword ? "text" : "password"}
          error={error}
          className={`pr-10 ${className}`}
          {...props}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center pr-3"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-gray-400" />
          ) : (
            <Eye className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

// Select component
export const Select = forwardRef(
  (
    {
      options = [],
      placeholder = "Seçiniz...",
      error,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseClasses = `
    w-full px-3 py-2 border rounded-lg 
    focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-50 disabled:text-gray-500
    dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100
    transition-colors duration-200
    cursor-pointer
  `;

    const errorClasses = error
      ? "border-red-300 focus:ring-red-500"
      : "border-gray-300 dark:border-gray-600";

    return (
      <select
        ref={ref}
        className={`${baseClasses} ${errorClasses} ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    );
  }
);

Select.displayName = "Select";

// Textarea component
export const Textarea = forwardRef(
  ({ rows = 3, error, className = "", ...props }, ref) => {
    const baseClasses = `
    w-full px-3 py-2 border rounded-lg 
    focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-50 disabled:text-gray-500
    dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100
    transition-colors duration-200
    resize-vertical
  `;

    const errorClasses = error
      ? "border-red-300 focus:ring-red-500"
      : "border-gray-300 dark:border-gray-600";

    return (
      <textarea
        ref={ref}
        rows={rows}
        className={`${baseClasses} ${errorClasses} ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

// Checkbox component
export const Checkbox = forwardRef(
  ({ label, error, className = "", ...props }, ref) => {
    const id = useId();

    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
          {...props}
        />
        {label && (
          <Label htmlFor={id} className="mb-0">
            {label}
          </Label>
        )}
        {error && <FormError message={error} />}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

// Radio component
export const Radio = forwardRef(
  (
    { options = [], name, value, onChange, error, className = "", ...props },
    ref
  ) => {
    return (
      <div className={`space-y-2 ${className}`}>
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          return (
            <div key={option.value} className="flex items-center space-x-2">
              <input
                ref={ref}
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={onChange}
                className="border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                {...props}
              />
              <Label htmlFor={id} className="mb-0">
                {option.label}
              </Label>
            </div>
          );
        })}
        {error && <FormError message={error} />}
      </div>
    );
  }
);

Radio.displayName = "Radio";

// Range/Slider component
export const Range = forwardRef(
  (
    {
      min = 0,
      max = 100,
      step = 1,
      value,
      onChange,
      showValue = true,
      error,
      className = "",
      ...props
    },
    ref
  ) => {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center space-x-3">
          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            {...props}
          />
          {showValue && (
            <span className="min-w-[3rem] text-sm text-gray-600 dark:text-gray-400 font-mono">
              {value}
            </span>
          )}
        </div>
        {error && <FormError message={error} />}
      </div>
    );
  }
);

Range.displayName = "Range";

// Number Input with increment/decrement buttons
export const NumberInput = forwardRef(
  (
    {
      min,
      max,
      step = 1,
      value,
      onChange,
      error,
      showControls = true,
      className = "",
      ...props
    },
    ref
  ) => {
    const handleIncrement = () => {
      const newValue = parseFloat(value || 0) + step;
      if (max === undefined || newValue <= max) {
        onChange?.({ target: { value: newValue.toString() } });
      }
    };

    const handleDecrement = () => {
      const newValue = parseFloat(value || 0) - step;
      if (min === undefined || newValue >= min) {
        onChange?.({ target: { value: newValue.toString() } });
      }
    };

    if (!showControls) {
      return (
        <Input
          ref={ref}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          error={error}
          className={className}
          {...props}
        />
      );
    }

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          error={error}
          className={`pr-16 ${className}`}
          {...props}
        />
        <div className="absolute inset-y-0 right-0 flex flex-col">
          <button
            type="button"
            onClick={handleIncrement}
            disabled={max !== undefined && parseFloat(value || 0) >= max}
            className="flex-1 px-2 border-l border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-xs">▲</span>
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            disabled={min !== undefined && parseFloat(value || 0) <= min}
            className="flex-1 px-2 border-l border-t border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-xs">▼</span>
          </button>
        </div>
      </div>
    );
  }
);

NumberInput.displayName = "NumberInput";

// Error message component
export const FormError = ({ message, className = "" }) => {
  if (!message) return null;

  return (
    <div
      className={`flex items-center space-x-1 text-sm text-red-600 ${className}`}
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};

// Success message component
export const FormSuccess = ({ message, className = "" }) => {
  if (!message) return null;

  return (
    <div
      className={`flex items-center space-x-1 text-sm text-green-600 ${className}`}
    >
      <div className="h-4 w-4 flex-shrink-0 rounded-full bg-green-100 flex items-center justify-center">
        <span className="text-xs">✓</span>
      </div>
      <span>{message}</span>
    </div>
  );
};

// Helper text component
export const FormHelperText = ({ children, className = "" }) => {
  return (
    <p className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
      {children}
    </p>
  );
};

// Compound FormField with all components
FormField.Label = Label;
FormField.Input = Input;
FormField.PasswordInput = PasswordInput;
FormField.Select = Select;
FormField.Textarea = Textarea;
FormField.Checkbox = Checkbox;
FormField.Radio = Radio;
FormField.Range = Range;
FormField.NumberInput = NumberInput;
FormField.Error = FormError;
FormField.Success = FormSuccess;
FormField.HelperText = FormHelperText;
