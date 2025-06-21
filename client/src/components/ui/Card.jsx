import React from "react";
import { cn } from "../../utils/cn";

const Card = React.forwardRef(
  (
    { children, className, variant = "default", hover = false, ...props },
    ref
  ) => {
    // Use design system card classes
    const baseClass = "card";
    const variantClass = hover ? "card-interactive" : "";

    return (
      <div
        ref={ref}
        className={cn(baseClass, variantClass, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef(
  ({ children, className = "", ...props }, ref) => (
    <div ref={ref} className={cn("card-header", className)} {...props}>
      {children}
    </div>
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef(
  ({ children, className = "", ...props }, ref) => (
    <h3 ref={ref} className={cn("card-title", className)} {...props}>
      {children}
    </h3>
  )
);
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef(
  ({ children, className = "", ...props }, ref) => (
    <div ref={ref} className={cn("card-body", className)} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = "CardContent";

// Add CardBody as alias for CardContent for backward compatibility
export const CardBody = CardContent;

export const CardSubtitle = ({ children, className = "", ...props }) => (
  <p className={cn("card-subtitle", className)} {...props}>
    {children}
  </p>
);

const CardFooter = React.forwardRef(
  ({ children, className = "", ...props }, ref) => (
    <div ref={ref} className={cn("card-footer", className)} {...props}>
      {children}
    </div>
  )
);
CardFooter.displayName = "CardFooter";

const CardDescription = React.forwardRef(
  ({ children, className = "", ...props }, ref) => (
    <p ref={ref} className={cn("card-subtitle", className)} {...props}>
      {children}
    </p>
  )
);
CardDescription.displayName = "CardDescription";

const CardActions = React.forwardRef(
  ({ children, className = "", ...props }, ref) => (
    <div ref={ref} className={cn("card-actions", className)} {...props}>
      {children}
    </div>
  )
);
CardActions.displayName = "CardActions";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardActions,
};
