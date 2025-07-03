import React, { createContext, useContext, useState, useEffect } from "react";

const DeveloperSettingsContext = createContext();

export const useDeveloperSettings = () => {
  const context = useContext(DeveloperSettingsContext);
  if (!context) {
    throw new Error(
      "useDeveloperSettings must be used within a DeveloperSettingsProvider"
    );
  }
  return context;
};

export const DeveloperSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    // Load from localStorage on initialization
    const savedSettings = localStorage.getItem("developerSettings");
    return savedSettings
      ? JSON.parse(savedSettings)
      : {
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
  });

  // Save to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem("developerSettings", JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (category, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const resetSettings = () => {
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
    setSettings(defaultSettings);
  };

  const value = {
    settings,
    updateSetting,
    resetSettings,
  };

  return (
    <DeveloperSettingsContext.Provider value={value}>
      {children}
    </DeveloperSettingsContext.Provider>
  );
};

export default DeveloperSettingsContext;
