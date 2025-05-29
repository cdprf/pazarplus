import React, { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "../../utils/cn";
// Use Lucide React icons instead of Heroicons to avoid import issues
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastVariants = {
  success: {
    container:
      "toast-success border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20",
    icon: "text-green-600 dark:text-green-400",
    iconBg: "bg-green-100 dark:bg-green-900/30",
  },
  error: {
    container:
      "toast-error border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20",
    icon: "text-red-600 dark:text-red-400",
    iconBg: "bg-red-100 dark:bg-red-900/30",
  },
  warning: {
    container:
      "toast-warning border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20",
    icon: "text-yellow-600 dark:text-yellow-400",
    iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  info: {
    container:
      "toast-info border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20",
    icon: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
  },
};

export const Toast = ({
  id,
  title,
  message,
  variant = "info",
  duration = 5000,
  onClose,
  className,
  showProgress = true,
  position = "top-right",
  stackIndex = 0,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef(null);
  const progressRef = useRef(null);
  const toastRef = useRef(null);

  const Icon = toastIcons[variant];
  const variantStyles = toastVariants[variant];
  const CloseIcon = X;

  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose?.(id);
    }, 300); // Match exit animation duration
  }, [id, onClose]);

  // Animation and auto-hide logic
  useEffect(() => {
    // Debug logging
    console.log("🍞 Toast mounted:", { id, title, message, variant });

    // Entrance animation
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto-hide timer
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        handleClose();
      }, duration);

      // Progress bar animation
      if (showProgress) {
        progressRef.current = setInterval(() => {
          setProgress((prev) => {
            const newProgress = prev - 100 / (duration / 100);
            return newProgress <= 0 ? 0 : newProgress;
          });
        }, 100);
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      console.log("🍞 Toast unmounted:", id);
    };
  }, [duration, showProgress, handleClose, id, title, message, variant]);

  // Pause on hover
  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
  };

  const handleMouseLeave = () => {
    if (duration > 0 && progress > 0) {
      const remainingTime = (progress / 100) * duration;
      timerRef.current = setTimeout(() => {
        handleClose();
      }, remainingTime);

      if (showProgress) {
        progressRef.current = setInterval(() => {
          setProgress((prev) => {
            const newProgress = prev - 100 / (remainingTime / 100);
            return newProgress <= 0 ? 0 : newProgress;
          });
        }, 100);
      }
    }
  };

  // Keyboard navigation
  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      handleClose();
    }
  };

  // Enhanced animation classes with position-aware animations
  const getAnimationClass = () => {
    const isRightPosition = position.includes('right');
    const isLeftPosition = position.includes('left');
    const isTopPosition = position.includes('top');
    const isBottomPosition = position.includes('bottom');
    
    if (isLeaving) {
      if (isRightPosition) return "animate-slide-out-to-right";
      if (isLeftPosition) return "animate-slide-out-to-left";
      if (isTopPosition && !isRightPosition && !isLeftPosition) return "animate-slide-out-to-top";
      if (isBottomPosition && !isRightPosition && !isLeftPosition) return "animate-slide-out-to-bottom";
      return "animate-slide-out-to-right"; // Default
    }
    
    if (isVisible) {
      if (isRightPosition) return "animate-slide-in-from-right";
      if (isLeftPosition) return "animate-slide-in-from-left";
      if (isTopPosition && !isRightPosition && !isLeftPosition) return "animate-slide-in-from-top";
      if (isBottomPosition && !isRightPosition && !isLeftPosition) return "animate-slide-in-from-bottom";
      return "animate-slide-in-from-right"; // Default
    }
    
    return "opacity-0 translate-x-full";
  };

  return (
    <div
      ref={toastRef}
      className={cn(
        // Base toast styles with better spacing
        "toast flex items-start p-4 rounded-lg shadow-lg border max-w-sm w-80",
        "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
        "transition-all duration-300 ease-in-out",
        "focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
        variantStyles.container,
        getAnimationClass(),
        className
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        // Simplified positioning - let container handle z-index
        position: "relative",
        opacity: isVisible && !isLeaving ? 1 : 0,
        transform:
          isVisible && !isLeaving ? "translateX(0)" : "translateX(100%)",
        // Add animation delay based on stack position
        animationDelay: `${stackIndex * 50}ms`,
      }}
      {...props}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3",
          variantStyles.iconBg
        )}
      >
        <Icon
          className={cn("h-5 w-5", variantStyles.icon)}
          aria-hidden="true"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {title}
          </div>
        )}
        <div className="text-sm text-gray-600 dark:text-gray-400 leading-5">
          {message}
        </div>
      </div>

      {/* Close Button */}
      <button
        type="button"
        className="ml-3 flex-shrink-0 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
        onClick={handleClose}
        aria-label="Close notification"
      >
        <CloseIcon className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Progress Bar */}
      {showProgress && duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-100 ease-linear",
              variant === "success" && "bg-green-500",
              variant === "error" && "bg-red-500",
              variant === "warning" && "bg-yellow-500",
              variant === "info" && "bg-blue-500"
            )}
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Time remaining"
          />
        </div>
      )}
    </div>
  );
};

export default Toast;
