import React from "react";

// Default fallback settings
const defaultSettings = {
  networkDebugger: {
    enabled: process.env.NODE_ENV === "development",
    position: "top-right",
    alwaysVisible: false,
    showDetails: true,
  },
  apiLogging: {
    enabled: process.env.NODE_ENV === "development",
    logRequests: true,
    logResponses: true,
    logErrors: true,
  },
  performanceMonitoring: {
    enabled: false,
    showRenderTime: false,
    showMemoryUsage: false,
  },
  debugMode: process.env.NODE_ENV === "development",
};

// Non-hook function to get settings from localStorage
export const getDeveloperSettings = () => {
  try {
    const savedSettings = localStorage.getItem("developerSettings");
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (error) {
    console.warn("Failed to load developer settings from localStorage:", error);
  }

  return defaultSettings;
};

// Hook that uses localStorage directly to avoid context dependency issues
export const useSafeDeveloperSettings = () => {
  const [settings, setSettings] = React.useState(getDeveloperSettings);

  React.useEffect(() => {
    const handleStorageChange = () => {
      setSettings(getDeveloperSettings());
    };

    // Listen for storage changes
    window.addEventListener("storage", handleStorageChange);

    // Poll for changes since storage events don't fire in the same tab
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return settings;
};
