import React from "react";
import { cn } from "../../utils/cn";

export const EmptyState = ({
  title,
  description,
  icon: Icon,
  action,
  className = "",
  ...props
}) => {
  return (
    <div className={cn("empty-state", className)} {...props}>
      {Icon && (
        <div className="empty-state-icon">
          <Icon className="h-16 w-16 text-gray-400 dark:text-gray-500" />
        </div>
      )}

      {title && <h3 className="empty-state-title">{title}</h3>}

      {description && <p className="empty-state-description">{description}</p>}

      {action && <div className="empty-state-actions">{action}</div>}
    </div>
  );
};
