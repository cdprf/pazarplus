import React from "react";
import { cn } from "../../utils/cn";

export const Skeleton = ({ className = "", variant = "text", ...props }) => {
  const baseClass = "skeleton";
  const variantClass = `skeleton-${variant}`;

  return <div className={cn(baseClass, variantClass, className)} {...props} />;
};
