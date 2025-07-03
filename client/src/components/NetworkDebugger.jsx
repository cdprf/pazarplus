import React, { useState, useEffect } from "react";
import networkStatusService from "../services/networkStatusService";
import { useSafeDeveloperSettings } from "../hooks/useSafeDeveloperSettings";

const NetworkDebugger = () => {
  const [status, setStatus] = useState(null);
  const settings = useSafeDeveloperSettings();

  useEffect(() => {
    const updateStatus = () => {
      const currentStatus = networkStatusService.getStatus();
      setStatus(currentStatus);
    };

    // Update immediately
    updateStatus();

    // Listen for changes
    const unsubscribe = networkStatusService.subscribe(updateStatus);

    // Update every 2 seconds
    const interval = setInterval(updateStatus, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleReset = () => {
    networkStatusService.resetCircuitBreaker();
  };

  // Don't show if disabled in settings
  if (!settings.networkDebugger.enabled) {
    return null;
  }

  // Only show if circuit breaker is open or if always visible is enabled
  if (
    !settings.networkDebugger.alwaysVisible &&
    status?.circuitBreakerState === "CLOSED" &&
    status?.isServerReachable
  ) {
    return null;
  }

  if (!status) return null;

  // Position styles based on settings
  const getPositionStyles = () => {
    const base = {
      position: "fixed",
      zIndex: 9999,
      maxWidth: "300px",
    };

    switch (settings.networkDebugger.position) {
      case "top-left":
        return { ...base, top: "10px", left: "10px" };
      case "top-right":
        return { ...base, top: "10px", right: "10px" };
      case "bottom-left":
        return { ...base, bottom: "10px", left: "10px" };
      case "bottom-right":
        return { ...base, bottom: "10px", right: "10px" };
      default:
        return { ...base, top: "10px", right: "10px" };
    }
  };

  return (
    <div
      style={{
        ...getPositionStyles(),
        background: "white",
        border: "1px solid #ccc",
        padding: "10px",
        borderRadius: "5px",
        fontSize: "12px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      }}
    >
      <h4 style={{ margin: "0 0 8px 0", color: "#333" }}>Network Status</h4>
      <div style={{ marginBottom: "4px" }}>
        Online: <strong>{status.isOnline ? "Yes" : "No"}</strong>
      </div>
      <div style={{ marginBottom: "4px" }}>
        State: <strong>{status.circuitBreakerState}</strong>
      </div>
      <div style={{ marginBottom: "4px" }}>
        Server Reachable:{" "}
        <strong>{status.isServerReachable ? "Yes" : "No"}</strong>
      </div>
      <div style={{ marginBottom: "4px" }}>
        Failures: <strong>{status.failureCount}</strong>
      </div>
      <div style={{ marginBottom: "4px" }}>
        Can Make Requests:{" "}
        <strong>{status.canMakeRequest ? "Yes" : "No"}</strong>
      </div>

      {settings.networkDebugger.showDetails && (
        <>
          {status.lastFailureTime && (
            <div style={{ marginBottom: "4px", fontSize: "11px" }}>
              Last Failure:{" "}
              {new Date(status.lastFailureTime).toLocaleTimeString()}
            </div>
          )}
          <div style={{ marginBottom: "4px", fontSize: "11px" }}>
            Retry Delay: {status.retryDelay}ms
          </div>
        </>
      )}

      {status.circuitBreakerState !== "CLOSED" && (
        <button
          onClick={handleReset}
          style={{
            marginTop: "8px",
            padding: "4px 8px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "3px",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          Reset Circuit Breaker
        </button>
      )}
    </div>
  );
};

export default NetworkDebugger;
