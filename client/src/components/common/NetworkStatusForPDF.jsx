import logger from "../../utils/logger.js";
/**
 * Network Status Component for PDF Printing
 * Shows current network configuration and provides recommendations
 */

import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, RefreshCw, Info } from "lucide-react";
import enhancedPDFService from "../../services/enhancedPDFService";

const NetworkStatusForPDF = ({ className = "", showDetails = true }) => {
  const [networkStatus, setNetworkStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const loadNetworkStatus = async () => {
    setLoading(true);
    try {
      const status = await enhancedPDFService.getNetworkStatus();
      setNetworkStatus(status);
    } catch (error) {
      logger.error("Failed to load network status:", error);
      setNetworkStatus({
        serverAccessible: false,
        error: error.message,
        recommendations: ["Failed to check network status"],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNetworkStatus();
  }, []);

  if (loading) {
    return (
      <div className={`network-status-loading ${className}`}>
        <div className="flex items-center text-gray-500">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          <span className="text-sm">Checking network status...</span>
        </div>
      </div>
    );
  }

  if (!networkStatus) {
    return null;
  }

  const getStatusIcon = () => {
    if (networkStatus.serverAccessible) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    if (networkStatus.serverAccessible) {
      return networkStatus.isLocalhost
        ? "Server accessible (localhost only)"
        : "Server accessible (network-wide)";
    } else {
      return "Server not accessible";
    }
  };

  const getStatusColor = () => {
    if (networkStatus.serverAccessible) {
      return networkStatus.isLocalhost ? "text-yellow-700" : "text-green-700";
    } else {
      return "text-red-700";
    }
  };

  const getBackgroundColor = () => {
    if (networkStatus.serverAccessible) {
      return networkStatus.isLocalhost
        ? "bg-yellow-50 border-yellow-200"
        : "bg-green-50 border-green-200";
    } else {
      return "bg-red-50 border-red-200";
    }
  };

  return (
    <div className={`network-status ${className}`}>
      <div className={`border rounded-lg p-3 ${getBackgroundColor()}`}>
        {/* Main Status */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center">
            {getStatusIcon()}
            <span className={`ml-2 text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          <div className="flex items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadNetworkStatus();
              }}
              className="p-1 rounded hover:bg-gray-100 mr-2"
              title="Refresh network status"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            {showDetails && (
              <Info
                className={`w-4 h-4 transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            )}
          </div>
        </div>

        {/* Network Details */}
        {expanded && showDetails && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-medium">Server URL:</span>
                <span className="ml-2 font-mono">{networkStatus.baseURL}</span>
              </div>

              <div>
                <span className="font-medium">Current Device IP:</span>
                <span className="ml-2 font-mono">
                  {networkStatus.currentDeviceIP}
                </span>
              </div>

              {networkStatus.error && (
                <div className="text-red-600">
                  <span className="font-medium">Error:</span>
                  <span className="ml-2">{networkStatus.error}</span>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {networkStatus.recommendations &&
              networkStatus.recommendations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="font-medium text-xs mb-2">
                    Recommendations:
                  </div>
                  <ul className="space-y-1 text-xs">
                    {networkStatus.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Quick Actions */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="font-medium text-xs mb-2">Quick Actions:</div>
              <div className="space-y-1 text-xs">
                {networkStatus.isLocalhost && (
                  <div className="p-2 bg-blue-50 rounded border">
                    <div className="font-medium text-blue-800">
                      For network access:
                    </div>
                    <div className="text-blue-700">
                      Replace 'localhost' with your computer's IP address in the
                      browser URL
                    </div>
                  </div>
                )}

                {!networkStatus.serverAccessible && (
                  <div className="p-2 bg-red-50 rounded border">
                    <div className="font-medium text-red-800">
                      Server issues:
                    </div>
                    <div className="text-red-700">
                      Check if the server is running and restart if necessary
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkStatusForPDF;
