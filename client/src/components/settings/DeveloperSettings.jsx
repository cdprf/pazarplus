import React from "react";
import {
  CodeBracketIcon,
  BugAntIcon,
  ChartBarIcon,
  CpuChipIcon,
  WifiIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useDeveloperSettings } from "../../contexts/DeveloperSettingsContext";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";

const DeveloperSettings = () => {
  const { settings, updateSetting, resetSettings } = useDeveloperSettings();

  const handleToggle = (category, key) => {
    updateSetting(category, key, !settings[category][key]);
  };

  const handleSelectChange = (category, key, value) => {
    updateSetting(category, key, value);
  };

  // Only show in development mode or if explicitly enabled
  if (process.env.NODE_ENV !== "development" && !settings.debugMode) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Network Debugger Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <WifiIcon className="w-5 h-5 mr-2 text-green-600" />
            Network Debugger
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Enable Network Debugger
              </label>
              <p className="text-xs text-gray-500">
                Show floating network status window
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.networkDebugger.enabled}
                onChange={() => handleToggle("networkDebugger", "enabled")}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.networkDebugger.enabled && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Position
                  </label>
                  <p className="text-xs text-gray-500">
                    Where to display the debugger
                  </p>
                </div>
                <select
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                  value={settings.networkDebugger.position}
                  onChange={(e) =>
                    handleSelectChange(
                      "networkDebugger",
                      "position",
                      e.target.value
                    )
                  }
                >
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Always Visible
                  </label>
                  <p className="text-xs text-gray-500">
                    Show even when circuit breaker is closed
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.networkDebugger.alwaysVisible}
                    onChange={() =>
                      handleToggle("networkDebugger", "alwaysVisible")
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Show Details
                  </label>
                  <p className="text-xs text-gray-500">
                    Display detailed circuit breaker information
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.networkDebugger.showDetails}
                    onChange={() =>
                      handleToggle("networkDebugger", "showDetails")
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* API Logging Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CodeBracketIcon className="w-5 h-5 mr-2 text-blue-600" />
            API Logging
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Enable API Logging
              </label>
              <p className="text-xs text-gray-500">
                Log API requests and responses to console
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.apiLogging.enabled}
                onChange={() => handleToggle("apiLogging", "enabled")}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.apiLogging.enabled && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="logRequests"
                    checked={settings.apiLogging.logRequests}
                    onChange={() => handleToggle("apiLogging", "logRequests")}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="logRequests"
                    className="text-sm text-gray-700"
                  >
                    Requests
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="logResponses"
                    checked={settings.apiLogging.logResponses}
                    onChange={() => handleToggle("apiLogging", "logResponses")}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="logResponses"
                    className="text-sm text-gray-700"
                  >
                    Responses
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="logErrors"
                    checked={settings.apiLogging.logErrors}
                    onChange={() => handleToggle("apiLogging", "logErrors")}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="logErrors" className="text-sm text-gray-700">
                    Errors
                  </label>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Performance Monitoring Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2 text-purple-600" />
            Performance Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Enable Performance Monitoring
              </label>
              <p className="text-xs text-gray-500">
                Monitor component render times and memory usage
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.performanceMonitoring.enabled}
                onChange={() =>
                  handleToggle("performanceMonitoring", "enabled")
                }
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.performanceMonitoring.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showRenderTime"
                  checked={settings.performanceMonitoring.showRenderTime}
                  onChange={() =>
                    handleToggle("performanceMonitoring", "showRenderTime")
                  }
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="showRenderTime"
                  className="text-sm text-gray-700"
                >
                  <ClockIcon className="w-4 h-4 inline mr-1" />
                  Render Time
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showMemoryUsage"
                  checked={settings.performanceMonitoring.showMemoryUsage}
                  onChange={() =>
                    handleToggle("performanceMonitoring", "showMemoryUsage")
                  }
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="showMemoryUsage"
                  className="text-sm text-gray-700"
                >
                  <CpuChipIcon className="w-4 h-4 inline mr-1" />
                  Memory Usage
                </label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debug Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BugAntIcon className="w-5 h-5 mr-2 text-red-600" />
            Debug Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Enable Debug Mode
              </label>
              <p className="text-xs text-gray-500">
                Show developer tools in production
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.debugMode}
                onChange={() =>
                  updateSetting("debugMode", null, !settings.debugMode)
                }
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <div className="flex justify-end">
        <button
          onClick={resetSettings}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default DeveloperSettings;
