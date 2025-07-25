import logger from "../../utils/logger.js";
/**
 * Enhanced Print Button Component
 * Network-aware PDF printing that works across devices
 */

import React, { useState } from "react";
import { Printer, AlertCircle, CheckCircle, Wifi, WifiOff } from "lucide-react";
import enhancedPDFService from "../services/enhancedPDFService";

const PrintButton = ({
  orderId,
  type = "shipping-slip",
  templateId = null,
  className = "",
  size = "sm",
  showNetworkStatus = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [networkStatus, setNetworkStatus] = useState(null);

  // Load network status on component mount
  React.useEffect(() => {
    if (showNetworkStatus) {
      enhancedPDFService.getNetworkStatus().then(setNetworkStatus);
    }
  }, [showNetworkStatus]);

  const handlePrint = async () => {
    if (loading) return;

    setLoading(true);
    setLastResult(null);

    try {
      let result;

      switch (type) {
        case "shipping-slip":
          result = await enhancedPDFService.generateAndOpenShippingSlip(
            orderId,
            templateId
          );
          break;
        case "invoice":
          result = await enhancedPDFService.generateAndOpenInvoice(orderId);
          break;
        default:
          throw new Error(`Unsupported print type: ${type}`);
      }

      setLastResult(result);

      if (!result.success) {
        throw new Error(result.message);
      }
    } catch (error) {
      logger.error("Print error:", error);
      setLastResult({
        success: false,
        error: error.message,
        message: `Failed to print ${type}: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (loading) return "Generating...";

    switch (type) {
      case "shipping-slip":
        return "Print Shipping Slip";
      case "invoice":
        return "Print Invoice";
      default:
        return "Print PDF";
    }
  };

  const getStatusIcon = () => {
    if (loading) return null;

    if (lastResult) {
      if (lastResult.success) {
        return lastResult.accessible ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <AlertCircle className="w-4 h-4 text-yellow-500" />
        );
      } else {
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      }
    }

    if (networkStatus) {
      return networkStatus.serverAccessible ? (
        <Wifi className="w-4 h-4 text-green-500" />
      ) : (
        <WifiOff className="w-4 h-4 text-red-500" />
      );
    }

    return null;
  };

  const buttonSizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <div className="enhanced-print-button">
      <button
        onClick={handlePrint}
        disabled={loading}
        className={`
          inline-flex items-center justify-center font-medium rounded-lg
          ${buttonSizeClasses[size]}
          ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }
          text-white transition-colors duration-200
          ${className}
        `}
        title={lastResult?.message || `Print ${type.replace("-", " ")}`}
      >
        <Printer className="w-4 h-4 mr-2" />
        {getButtonText()}
        {getStatusIcon() && <span className="ml-2">{getStatusIcon()}</span>}
      </button>

      {/* Status Messages */}
      {lastResult && (
        <div
          className={`
          mt-2 p-2 rounded text-xs
          ${
            lastResult.success
              ? lastResult.accessible
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
          }
        `}
        >
          <div className="flex items-start">
            {lastResult.success ? (
              lastResult.accessible ? (
                <CheckCircle className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
              )
            ) : (
              <AlertCircle className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <div className="font-medium">{lastResult.message}</div>
              {!lastResult.accessible && lastResult.success && (
                <div className="mt-1 text-xs opacity-75">
                  PDF generated but may not be accessible from other devices. If
                  popup was blocked, the file should download automatically.
                </div>
              )}
              {lastResult.url && (
                <div className="mt-1">
                  <a
                    href={lastResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    Direct PDF Link
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Network Status (Development Helper) */}
      {showNetworkStatus &&
        networkStatus &&
        process.env.NODE_ENV === "development" && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
            <div className="font-medium mb-1">Network Status:</div>
            <div>Server: {networkStatus.baseURL}</div>
            <div>
              Accessible: {networkStatus.serverAccessible ? "✅ Yes" : "❌ No"}
            </div>
            {networkStatus.isLocalhost && (
              <div className="mt-1 text-yellow-700">
                ⚠️ Using localhost - other devices cannot access PDFs
              </div>
            )}
          </div>
        )}
    </div>
  );
};

export default PrintButton;
