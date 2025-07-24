import logger from "../../../utils/logger";
import React, { useState } from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

/**
 * InlineEditableField Component
 * Allows inline editing of table cell values
 */
const InlineEditableField = ({
  value,
  onSave,
  formatter = (val) => val,
  validator = () => true,
  className = "",
  type = "text",
  placeholder = "Enter value...",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || "");
  const [isLoading, setSaveLoading] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(value?.toString() || "");
  };

  const handleSave = async () => {
    if (!validator(editValue)) {
      return;
    }

    setSaveLoading(true);
    try {
      const processedValue =
        type === "number" ? parseFloat(editValue) : editValue;
      await onSave(processedValue);
      setIsEditing(false);
    } catch (error) {
      logger.error("Failed to save:", error);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value?.toString() || "");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center space-x-1">
        <input
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={handleSave}
          placeholder={placeholder}
          className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          autoFocus
          disabled={isLoading}
        />
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="text-green-600 hover:text-green-800 p-1"
        >
          <CheckIcon className="h-3 w-3" />
        </button>
        <button
          onClick={handleCancel}
          disabled={isLoading}
          className="text-red-600 hover:text-red-800 p-1"
        >
          <XMarkIcon className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={handleEdit}
      className={`${className} transition-colors duration-200`}
    >
      {formatter(value)}
    </div>
  );
};

export default InlineEditableField;
