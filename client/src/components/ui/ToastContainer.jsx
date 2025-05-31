import React from "react";
import { cn } from "../../utils/cn";
import Toast from "./Toast";

const positionStyles = {
  "top-right": "top-4 right-4 items-end",
  "top-left": "top-4 left-4 items-start",
  "top-center": "top-4 left-1/2 transform -translate-x-1/2 items-center",
  "bottom-right": "bottom-4 right-4 items-end",
  "bottom-left": "bottom-4 left-4 items-start",
  "bottom-center": "bottom-4 left-1/2 transform -translate-x-1/2 items-center",
};

export const ToastContainer = ({
  toasts = [],
  position = "top-right",
  maxToasts = 5,
  className,
  onRemove,
  ...props
}) => {
  // Limit the number of visible toasts
  const visibleToasts = toasts.slice(0, maxToasts);

  if (visibleToasts.length === 0) {
    return null;
  }

  // Determine if position is at bottom for proper stacking order
  const isBottomPosition = position.includes("bottom");

  return (
    <div
      className={cn(
        "fixed flex flex-col gap-3 toast-container",
        positionStyles[position],
        className
      )}
      aria-live="polite"
      aria-label="Notifications"
      {...props}
    >
      {/* Render toasts in proper order based on position */}
      {(isBottomPosition ? [...visibleToasts].reverse() : visibleToasts).map(
        (toast, index) => {
          // Calculate the visual index for proper stacking
          const visualIndex = isBottomPosition
            ? visibleToasts.length - 1 - index
            : index;

          return (
            <div
              key={toast.id}
              className="toast-wrapper transform transition-all duration-300 ease-in-out"
              style={{
                // Add slight offset for better visual separation
                transform: `translateY(${visualIndex * 2}px)`,
              }}
            >
              <Toast
                {...toast}
                position={position}
                onClose={onRemove}
                // Pass the visual index for animations
                stackIndex={visualIndex}
              />
            </div>
          );
        }
      )}

      {/* Show indicator if there are more toasts */}
      {toasts.length > maxToasts && (
        <div
          className="toast-overflow-indicator"
          style={{
            pointerEvents: "auto",
            zIndex: 9999 - visibleToasts.length,
          }}
        >
          <div className="flex items-center justify-center p-3 rounded-lg shadow-lg border max-w-sm min-w-80 bg-white/90 dark:bg-gray-800/90 border-gray-200 dark:border-gray-700 backdrop-blur-sm">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              +{toasts.length - maxToasts} more notification
              {toasts.length - maxToasts !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToastContainer;
