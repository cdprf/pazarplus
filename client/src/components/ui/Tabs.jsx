import React, { useState, createContext, useContext } from "react";
import { cn } from "../../utils/cn";

const TabsContext = createContext();

export const Tabs = ({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value !== undefined ? value : internalValue;

  const handleValueChange = (newValue) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider
      value={{ value: currentValue, onValueChange: handleValueChange }}
    >
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ className, children, ...props }) => {
  const handleKeyDown = (e) => {
    const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]'));
    const currentIndex = tabs.findIndex((tab) => tab === e.target);

    let newIndex = currentIndex;

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case "ArrowRight":
        e.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case "Home":
        e.preventDefault();
        newIndex = 0;
        break;
      case "End":
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    tabs[newIndex]?.focus();
  };

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400",
        className
      )}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </div>
  );
};

export const TabsTrigger = ({ value, className, children, ...props }) => {
  const context = useContext(TabsContext);

  if (!context) {
    throw new Error("TabsTrigger must be used within a Tabs component");
  }

  const isActive = context.value === value;

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      context.onValueChange(value);
    }
  };

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`${value}-panel`}
      id={`${value}-tab`}
      data-tab-id={value}
      onClick={() => context.onValueChange(value)}
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
          : "hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value, className, children, ...props }) => {
  const context = useContext(TabsContext);

  if (!context) {
    throw new Error("TabsContent must be used within a Tabs component");
  }

  if (context.value !== value) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`${value}-panel`}
      aria-labelledby={`${value}-tab`}
      tabIndex={0}
      className={cn(
        "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
