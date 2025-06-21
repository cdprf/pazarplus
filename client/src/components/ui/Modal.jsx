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
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
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

  if (!isOpen) return null;

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
      <div className="modal-backdrop" onClick={handleOverlayClick} />

      {/* Modal */}
      <div
        ref={modalRef}
        className={cn("modal-container", sizeClasses[size], className)}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && (
              <h2 id="modal-title" className="modal-title">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="modal-close"
                icon={X}
                aria-label="Close modal"
              />
            )}
          </div>
        )}

        {/* Content */}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

export const ModalHeader = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700",
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
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
};

export const ModalFooter = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
