import React from "react";
import { cn } from "../../utils/cn";

export const Card = ({
  children,
  className = "",
  variant = "default",
  hover = false,
  ...props
}) => {
  const baseClass = "card";
  const variantClass = hover ? "card-interactive" : "";

  return (
    <div className={cn(baseClass, variantClass, className)} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = "", ...props }) => (
  <div className={cn("card-header", className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = "", ...props }) => (
  <h3 className={cn("card-title", className)} {...props}>
    {children}
  </h3>
);

export const CardContent = ({ children, className = "", ...props }) => (
  <div className={cn("card-body", className)} {...props}>
    {children}
  </div>
);

// Add CardBody as alias for CardContent for backward compatibility
export const CardBody = CardContent;

// Add CardSubtitle component
export const CardSubtitle = ({ children, className = "", ...props }) => (
  <p className={cn("card-subtitle", className)} {...props}>
    {children}
  </p>
);

export const CardFooter = ({ children, className = "", ...props }) => (
  <div className={cn("card-footer", className)} {...props}>
    {children}
  </div>
);
