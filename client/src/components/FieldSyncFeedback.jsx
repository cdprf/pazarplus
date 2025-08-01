import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";

/**
 * FieldSyncFeedback Component
 * Provides real-time feedback for individual field updates with loading states
 */
const FieldSyncFeedback = ({
  productId,
  field,
  value,
  onSyncStart,
  onSyncComplete,
  onSyncError,
  className = "",
  showIcon = true,
  showMessage = true,
  autoHide = 3000, // Auto-hide success message after 3 seconds
}) => {
  const [syncState, setSyncState] = useState({
    status: "idle", // idle, syncing, polling, success, error
    message: "",
    error: null,
    taskId: null,
    platform: null,
    startTime: null,
    completedAt: null,
  });

  const lastSyncValue = useRef("");
  const isSyncing = useRef(false);

  // Trigger sync when field or value changes
  useEffect(() => {
    const syncKey = `${field}-${value}`;

    if (
      field &&
      value !== undefined &&
      value !== "" && // Don't sync empty values
      syncState.status === "idle" &&
      !isSyncing.current &&
      lastSyncValue.current !== syncKey
    ) {
      lastSyncValue.current = syncKey;

      // Add a small delay to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        if (lastSyncValue.current === syncKey && !isSyncing.current) {
          // Only sync if still the latest value and not already syncing
          if (isSyncing.current) return; // Double check before proceeding

          isSyncing.current = true;
          setSyncState({ status: "syncing", message: "Syncing..." });

          const payload = {
            field,
            value,
            syncToPlatforms: false, // Local only for now
          };

          api
            .post(`/products/${productId}/sync-field`, payload)
            .then((response) => {
              if (response.data.success) {
                setSyncState({
                  status: "success",
                  message: "Synced successfully",
                });
              } else {
                setSyncState({
                  status: "error",
                  message: response.data.message || "Sync failed",
                });
              }
            })
            .catch((error) => {
              console.error("Field sync error:", error);
              setSyncState({
                status: "error",
                message: error.response?.data?.message || "Sync failed",
              });
            })
            .finally(() => {
              isSyncing.current = false;
              setTimeout(() => {
                setSyncState({ status: "idle", message: "" });
              }, 2000);
            });
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [field, value, productId, syncState.status]); // Use inline sync logic to avoid dependency issues

  // Don't render anything if idle and not showing message
  if (syncState.status === "idle" && !syncState.message) {
    return null;
  }

  const getIcon = () => {
    switch (syncState.status) {
      case "syncing":
      case "polling":
        return (
          <ArrowPathIcon
            className="h-4 w-4 text-blue-500 animate-spin"
            aria-hidden="true"
          />
        );
      case "success":
        return (
          <CheckCircleIcon
            className="h-4 w-4 text-green-500"
            aria-hidden="true"
          />
        );
      case "error":
        return (
          <ExclamationTriangleIcon
            className="h-4 w-4 text-red-500"
            aria-hidden="true"
          />
        );
      default:
        return null;
    }
  };

  const getTextColor = () => {
    switch (syncState.status) {
      case "syncing":
      case "polling":
        return "text-blue-600";
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getMessage = () => {
    if (syncState.error && syncState.status === "error") {
      return syncState.error;
    }
    return syncState.message;
  };

  return (
    <div className={`inline-flex items-center space-x-1 text-xs ${className}`}>
      {showIcon && getIcon()}
      {showMessage && (
        <span className={`${getTextColor()} font-medium`}>{getMessage()}</span>
      )}
    </div>
  );
};

/**
 * Enhanced Input Field with Sync Feedback
 * Wraps a regular input with automatic sync feedback
 */
export const InputFieldWithSync = ({
  productId,
  field,
  value,
  onChange,
  onSyncComplete,
  placeholder = "",
  type = "text",
  className = "",
  disabled = false,
  debounceMs = 1000, // Wait 1 second after typing stops before syncing
  ...inputProps
}) => {
  const [localValue, setLocalValue] = useState(value || "");
  const [debouncedValue, setDebouncedValue] = useState(value || "");
  const [isTyping, setIsTyping] = useState(false);
  const [syncTriggered, setSyncTriggered] = useState(false);

  // Debounce the input value
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(localValue);
      setIsTyping(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs]);

  // Handle input change
  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    setIsTyping(true);
    setSyncTriggered(false);
    onChange?.(newValue);
  };

  // Trigger sync when debounced value changes
  useEffect(() => {
    if (
      debouncedValue !== value &&
      !isTyping &&
      !syncTriggered &&
      debouncedValue !== "" &&
      debouncedValue.toString() !== value?.toString() // Ensure actual value change
    ) {
      setSyncTriggered(true);
    }
  }, [debouncedValue, value, isTyping, syncTriggered]);

  const handleSyncComplete = (result) => {
    setSyncTriggered(false);
    onSyncComplete?.(result);
  };

  const handleSyncError = (error) => {
    setSyncTriggered(false);
    // Could show error UI here
  };

  return (
    <div className="relative">
      <input
        type={type}
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`${className} ${isTyping ? "border-blue-300" : ""}`}
        {...inputProps}
      />

      {syncTriggered && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <FieldSyncFeedback
            productId={productId}
            field={field}
            value={debouncedValue}
            onSyncComplete={handleSyncComplete}
            onSyncError={handleSyncError}
            showMessage={false}
            showIcon={true}
          />
        </div>
      )}
    </div>
  );
};

export default FieldSyncFeedback;
