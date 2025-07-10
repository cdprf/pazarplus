import React from "react";

const Checkbox = ({
  id,
  checked,
  onCheckedChange,
  className = "",
  ...props
}) => {
  return (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${className}`}
      {...props}
    />
  );
};

export { Checkbox };
