import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import { Button } from "./Button";

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  closeOnOverlayClick = true,
  showCloseButton = true,
  className,
  ...props
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  const sizeClasses = {
    sm: "max-w-md w-[30vw] min-w-[400px]",
    md: "max-w-lg w-[40vw] min-w-[500px]",
    lg: "max-w-2xl w-[60vw] min-w-[600px]",
    xl: "max-w-4xl w-[80vw] min-w-[800px]",
    full: "max-w-full mx-4",
  };

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = "hidden";

      // Focus the modal when it opens
      if (modalRef.current) {
        modalRef.current.focus();
      }
    } else {
      document.body.style.overflow = "unset";

      // Return focus to previously focused element
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (event) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* Overlay - clickable background */}
      <div 
        className="modal-backdrop fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300" 
        style={{ zIndex: 1040 }}
        onClick={handleOverlayClick} 
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          "modal-container relative bg-white dark:bg-gray-800 rounded-lg shadow-xl",
          "transform transition-all duration-300",
          "max-h-[90vh] overflow-y-auto",
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0",
          sizeClasses[size], 
          className
        )}
        style={{ zIndex: 1050 }}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="modal-header flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            {title && (
              <h2 id="modal-title" className="modal-title text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="modal-close p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                icon={X}
                aria-label="Close modal"
              />
            )}
          </div>
        )}

        {/* Content */}
        <div className="modal-body px-6 py-4">{children}</div>
      </div>
    </div>
  );
};

export const ModalHeader = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        "modal-header flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const ModalContent = ({ children, className, ...props }) => {
  return (
    <div className={cn("modal-body p-6", className)} {...props}>
      {children}
    </div>
  );
};

export const ModalFooter = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        "modal-footer flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
