import React, { useState } from "react";
import { Edit, X } from "lucide-react";
import { Button } from "../../ui";

const InlineEditor = ({
  value,
  onSave,
  type = "text",
  placeholder = "",
  className = "",
  disabled = false,
  min,
  max,
  suffix = "",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onSave?.(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => !disabled && setIsEditing(true)}
        className={`cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors ${
          disabled ? "opacity-50" : ""
        } ${className}`}
      >
        <span className="font-medium">
          {value}
          {suffix}
        </span>
        {!disabled && (
          <Edit className="h-3 w-3 ml-1 opacity-0 hover:opacity-100 inline transition-opacity" />
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center space-x-2 p-2 bg-white border rounded shadow-sm ${className}`}
    >
      <input
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        disabled={isLoading}
        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") handleCancel();
        }}
      />
      <Button
        onClick={handleSave}
        variant="primary"
        size="sm"
        disabled={isLoading}
      >
        {isLoading ? "..." : "Kaydet"}
      </Button>
      <Button
        onClick={handleCancel}
        variant="ghost"
        size="sm"
        disabled={isLoading}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default InlineEditor;
