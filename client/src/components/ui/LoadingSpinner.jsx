import React from "react";
import { cn } from "../../utils/cn";

export const LoadingSpinner = ({
  size = "md",
  className = "",
  color = "primary",
  ...props
}) => {
  const baseClass = "spinner";
  const sizeClass = `spinner-${size}`;

  const colors = {
    primary: "text-blue-500",
    secondary: "text-gray-500",
    success: "text-green-500",
    warning: "text-yellow-500",
    danger: "text-red-500",
    white: "text-white",
  };

  return (
    <div
      className={cn(baseClass, sizeClass, colors[color], className)}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};
