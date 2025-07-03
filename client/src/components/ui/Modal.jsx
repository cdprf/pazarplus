import React, { useEffect, useRef, useCallback } from "react";
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
  id,
  describedBy,
  initialFocusRef,
  finalFocusRef,
  ...props
}) => {
  const modalRef = useRef(null);
  const modalContainerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Generate unique IDs for accessibility
  const modalId = id || `modal-${Math.random().toString(36).substr(2, 9)}`;
  const titleId = `${modalId}-title`;
  const contentId = `${modalId}-content`;

  const sizeClasses = {
    sm: "max-w-md w-[30vw] min-w-[400px]",
    md: "max-w-lg w-[40vw] min-w-[500px]",
    lg: "max-w-2xl w-[60vw] min-w-[600px]",
    xl: "max-w-4xl w-[80vw] min-w-[800px]",
    full: "max-w-full mx-4",
  };

  // Focus management
  const handleFocusManagement = useCallback(() => {
    if (isOpen) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement;

      // Set initial focus
      setTimeout(() => {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
        } else if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        } else if (modalRef.current) {
          modalRef.current.focus();
        }
      }, 100);
    } else {
      // Return focus to the element that was focused before the modal opened
      const elementToFocus = finalFocusRef?.current || previousFocusRef.current;
      if (elementToFocus && typeof elementToFocus.focus === "function") {
        elementToFocus.focus();
      }
    }
  }, [isOpen, initialFocusRef, finalFocusRef]);

  // Focus trap
  const handleKeyDown = useCallback(
    (event) => {
      if (!isOpen) return;

      // Handle Escape key
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      // Handle Tab key for focus trapping
      if (event.key === "Tab") {
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
          'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), [contenteditable]:not([disabled])'
        );
        const focusableArray = Array.from(focusableElements).filter(
          (element) => {
            // Additional check to ensure element is actually focusable and visible
            const style = window.getComputedStyle(element);
            return (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              element.offsetWidth > 0
            );
          }
        );

        if (focusableArray.length === 0) return;

        const firstElement = focusableArray[0];
        const lastElement = focusableArray[focusableArray.length - 1];
        const currentIndex = focusableArray.indexOf(document.activeElement);

        if (event.shiftKey) {
          // Shift + Tab (backwards)
          if (currentIndex <= 0) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab (forwards)
          if (currentIndex >= focusableArray.length - 1) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement;

      // Prevent body scroll
      document.body.style.overflow = "hidden";

      // Use setTimeout to ensure DOM is fully updated before setting aria-hidden
      setTimeout(() => {
        // For modals rendered inside the React root, we need to hide content differently
        // Instead of hiding the root, hide its direct children except the modal
        const rootElement = document.getElementById("root");
        if (rootElement && modalContainerRef.current) {
          // Hide direct children of root that are not the modal
          const rootChildren = Array.from(rootElement.children);
          rootChildren.forEach((child) => {
            if (!child.contains(modalContainerRef.current)) {
              child.setAttribute("aria-hidden", "true");
              child.setAttribute("data-modal-hidden", "true");
            }
          });
        } else {
          // Fallback: hide body children except the root
          const bodyChildren = Array.from(document.body.children);
          bodyChildren.forEach((element) => {
            if (
              element.id !== "root" &&
              element.tagName !== "SCRIPT" &&
              element.tagName !== "STYLE" &&
              !element.hasAttribute("data-modal-backdrop")
            ) {
              element.setAttribute("aria-hidden", "true");
              element.setAttribute("data-modal-hidden", "true");
            }
          });
        }
      }, 0);

      handleFocusManagement();
    } else {
      // Restore body scroll
      document.body.style.overflow = "unset";

      // Restore screen reader access to elements we hid
      const hiddenElements = document.querySelectorAll(
        '[data-modal-hidden="true"]'
      );
      hiddenElements.forEach((element) => {
        element.removeAttribute("aria-hidden");
        element.removeAttribute("data-modal-hidden");
      });

      handleFocusManagement();
    }

    return () => {
      document.body.style.overflow = "unset";
      const rootElements = document.querySelectorAll(
        'body > *[aria-hidden="true"]'
      );
      rootElements.forEach((element) => {
        element.removeAttribute("aria-hidden");
      });
    };
  }, [isOpen, handleFocusManagement]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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
      ref={modalContainerRef}
      className="modal modal-open fixed inset-0 z-[1040] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={describedBy || contentId}
      onClick={handleOverlayClick}
      data-modal-backdrop="true"
    >
      {/* Overlay - clickable background */}
      <div
        className="modal-backdrop fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300"
        aria-hidden="true"
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
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="modal-header flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            {title && (
              <h2
                id={titleId}
                className="modal-title text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <Button
                ref={closeButtonRef}
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
        <div id={contentId} className="modal-body px-6 py-4">
          {children}
        </div>
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
