import React, { useState, useRef, useEffect } from "react";
import { cn } from "../../utils/cn";

export const DropdownMenu = ({
  children,
  trigger,
  align = "left",
  className = "",
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const alignmentClasses = {
    left: "left-0",
    right: "right-0",
    center: "left-1/2 transform -translate-x-1/2",
  };

  return (
    <div className={cn("dropdown", className)} {...props}>
      <div ref={triggerRef}>
        {typeof trigger === "function"
          ? trigger({ isOpen, toggle: () => setIsOpen(!isOpen) })
          : React.cloneElement(trigger, {
              onClick: () => setIsOpen(!isOpen),
              "aria-expanded": isOpen,
              "aria-haspopup": true,
              className: cn("dropdown-trigger", trigger.props.className),
            })}
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            "dropdown-content",
            "animate-scale-in",
            alignmentClasses[align]
          )}
          role="menu"
        >
          {React.Children.map(children, (child) =>
            React.cloneElement(child, { onSelect: () => setIsOpen(false) })
          )}
        </div>
      )}
    </div>
  );
};

export const DropdownItem = ({
  children,
  icon: Icon,
  variant = "default",
  disabled = false,
  onSelect,
  onClick,
  className = "",
  ...props
}) => {
  const baseClass = "dropdown-item";
  const variantClass = variant === "danger" ? "dropdown-item-danger" : "";

  const handleClick = (e) => {
    if (disabled) return;
    if (onClick) onClick(e);
    if (onSelect) onSelect();
  };

  return (
    <button
      className={cn(
        baseClass,
        variantClass,
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={handleClick}
      disabled={disabled}
      role="menuitem"
      {...props}
    >
      {Icon && <Icon className="dropdown-icon" />}
      <span>{children}</span>
    </button>
  );
};

export const DropdownDivider = ({ className = "", ...props }) => (
  <div
    className={cn("dropdown-divider", className)}
    role="separator"
    {...props}
  />
);
