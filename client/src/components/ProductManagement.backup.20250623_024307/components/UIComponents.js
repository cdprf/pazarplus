import React from "react";
import { X } from "lucide-react";

// Shared UI Components
export const Button = ({
  children,
  onClick,
  variant = "default",
  size = "md",
  icon: Icon,
  disabled,
  className = "",
  title,
  ...props
}) => {
  const variants = {
    default:
      "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-blue-500",
    primary:
      "bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-700 focus:ring-blue-500",
    outline:
      "border border-gray-300 dark:border-gray-600 bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus:ring-blue-500",
    ghost:
      "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-blue-500",
    danger:
      "bg-red-600 dark:bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-700 focus:ring-red-500",
    success:
      "bg-green-600 dark:bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-700 focus:ring-green-500",
  };
  const sizes = {
    sm: "px-2 py-1 text-sm h-8",
    md: "px-4 py-2 text-sm h-10",
    lg: "px-6 py-3 text-base h-12",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </button>
  );
};

export const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}
  >
    {children}
  </div>
);

export const CardHeader = ({ children, className = "" }) => (
  <div
    className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 ${className}`}
  >
    {children}
  </div>
);

export const CardContent = ({ children, className = "" }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

export const Badge = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200",
    primary: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
    secondary: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
    success:
      "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
    warning:
      "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200",
    danger: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
    info: "bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200",
    outline:
      "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  className = "",
}) => {
  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-7xl",
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        <div
          className={`inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizes[size]} sm:w-full ${className}`}
        >
          <div className="bg-white dark:bg-gray-800 px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Tooltip = ({ children, content }) => (
  <div className="relative group">
    {children}
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 dark:text-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
      {content}
    </div>
  </div>
);
