import React, { Fragment, forwardRef } from "react";
import { Dialog as HeadlessDialog, Transition } from "@headlessui/react";
import cn from "../../utils/cn";

/**
 * Dialog component wrapper built on top of HeadlessUI's Dialog
 * Creates accessible modal dialogs with proper keyboard navigation and ARIA attributes
 */
const Dialog = ({ open, onOpenChange, children, ...props }) => {
  return (
    <Transition appear show={open} as={Fragment}>
      <HeadlessDialog
        as="div"
        className="relative"
        style={{ zIndex: "var(--z-modal)" }}
        onClose={() => onOpenChange?.(false)}
        {...props}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              {children}
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  );
};

/**
 * Dialog content container
 */
const DialogContent = forwardRef(({ className, children, ...props }, ref) => (
  <HeadlessDialog.Panel
    ref={ref}
    className={cn(
      "w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all",
      className
    )}
    {...props}
  >
    {children}
  </HeadlessDialog.Panel>
));

DialogContent.displayName = "DialogContent";

/**
 * Dialog header component
 */
const DialogHeader = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left mb-4",
      className
    )}
    {...props}
  />
));

DialogHeader.displayName = "DialogHeader";

/**
 * Dialog footer component
 */
const DialogFooter = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6",
      className
    )}
    {...props}
  />
));

DialogFooter.displayName = "DialogFooter";

/**
 * Dialog title component
 */
const DialogTitle = forwardRef(({ className, ...props }, ref) => (
  <HeadlessDialog.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));

DialogTitle.displayName = "DialogTitle";

/**
 * Dialog description component
 */
const DialogDescription = forwardRef(({ className, ...props }, ref) => (
  <HeadlessDialog.Description
    ref={ref}
    className={cn("text-sm text-gray-500", className)}
    {...props}
  />
));

DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
