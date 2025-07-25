import logger from "../../utils/logger.js";
import React, { useState } from "react";
import api from "../../services/api";

const PrintDiagnostics = ({ order }) => {
  const [diagnostics, setDiagnostics] = useState(null);
  const [testing, setTesting] = useState(false);

  const runDiagnostics = async () => {
    setTesting(true);
    const results = {
      timestamp: new Date().toISOString(),
      clientInfo: {
        userAgent: navigator.userAgent,
        hostname: window.location.hostname,
        port: window.location.port,
        protocol: window.location.protocol,
        isLocalhost:
          window.location.hostname.includes("localhost") ||
          window.location.hostname.includes("127.0.0.1"),
      },
      networkInfo: {},
      serverConnectivity: {},
      pdfGeneration: {},
    };

    try {
      // Test API connectivity
      logger.info("🔍 Testing API connectivity...");
      const healthResponse = await api.get("/health");
      results.serverConnectivity.health = {
        success: true,
        status: healthResponse.status,
        data: healthResponse.data,
      };
    } catch (error) {
      results.serverConnectivity.health = {
        success: false,
        error: error.message,
        status: error.response?.status,
      };
    }

    // Test PDF generation if order is provided
    if (order?.id) {
      try {
        logger.info("🖨️ Testing PDF generation...");
        const pdfResponse = await api.shipping.generatePDF(order.id);
        results.pdfGeneration = {
          success: pdfResponse.success,
          labelUrl: pdfResponse.data?.labelUrl,
          hasData: !!pdfResponse.data,
        };

        // Test if PDF URL is accessible
        if (pdfResponse.data?.labelUrl) {
          try {
            const pdfTestResponse = await fetch(pdfResponse.data.labelUrl, {
              method: "HEAD",
            });
            results.pdfGeneration.urlAccessible = pdfTestResponse.ok;
            results.pdfGeneration.urlStatus = pdfTestResponse.status;
          } catch (urlError) {
            results.pdfGeneration.urlAccessible = false;
            results.pdfGeneration.urlError = urlError.message;
          }
        }
      } catch (error) {
        results.pdfGeneration = {
          success: false,
          error: error.message,
          status: error.response?.status,
        };
      }
    }

    // Detect network configuration
    try {
      // Try to detect if we're on the same network as the server
      const currentHost = window.location.hostname;
      const serverPort = 5001;

      if (!currentHost.includes("localhost")) {
        const serverUrl = `http://${currentHost}:${serverPort}`;

        try {
          const serverResponse = await fetch(`${serverUrl}/api/health`, {
            method: "GET",
          });
          results.networkInfo.directServerAccess = {
            success: serverResponse.ok,
            url: serverUrl,
            status: serverResponse.status,
          };
        } catch (networkError) {
          results.networkInfo.directServerAccess = {
            success: false,
            url: serverUrl,
            error: networkError.message,
          };
        }
      }
    } catch (error) {
      results.networkInfo.error = error.message;
    }

    setDiagnostics(results);
    setTesting(false);
  };

  const renderDiagnostics = () => {
    if (!diagnostics) return null;

    const { clientInfo, serverConnectivity, pdfGeneration, networkInfo } =
      diagnostics;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Diagnostic Results</h4>

        {/* Client Information */}
        <div className="mb-3">
          <h5 className="font-medium text-sm text-gray-700">
            Client Information
          </h5>
          <div className="text-xs text-gray-600">
            <div>
              Host: {clientInfo.hostname}:{clientInfo.port || "80"}
            </div>
            <div>Is Localhost: {clientInfo.isLocalhost ? "Yes" : "No"}</div>
            <div>Browser: {clientInfo.userAgent.split(" ")[0]}</div>
          </div>
        </div>

        {/* Server Connectivity */}
        <div className="mb-3">
          <h5 className="font-medium text-sm text-gray-700">
            Server Connectivity
          </h5>
          <div
            className={`text-xs ${
              serverConnectivity.health?.success
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            API Health:{" "}
            {serverConnectivity.health?.success ? "✅ Connected" : "❌ Failed"}
            {serverConnectivity.health?.error && (
              <div>Error: {serverConnectivity.health.error}</div>
            )}
          </div>
        </div>

        {/* Network Information */}
        {networkInfo.directServerAccess && (
          <div className="mb-3">
            <h5 className="font-medium text-sm text-gray-700">
              Network Access
            </h5>
            <div
              className={`text-xs ${
                networkInfo.directServerAccess.success
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              Direct Server:{" "}
              {networkInfo.directServerAccess.success
                ? "✅ Accessible"
                : "❌ Not accessible"}
              <div>URL: {networkInfo.directServerAccess.url}</div>
            </div>
          </div>
        )}

        {/* PDF Generation */}
        {order && (
          <div className="mb-3">
            <h5 className="font-medium text-sm text-gray-700">
              PDF Generation
            </h5>
            <div
              className={`text-xs ${
                pdfGeneration.success ? "text-green-600" : "text-red-600"
              }`}
            >
              Generation: {pdfGeneration.success ? "✅ Success" : "❌ Failed"}
              {pdfGeneration.labelUrl && (
                <div>URL: {pdfGeneration.labelUrl}</div>
              )}
              {pdfGeneration.urlAccessible !== undefined && (
                <div>
                  URL Accessible:{" "}
                  {pdfGeneration.urlAccessible ? "✅ Yes" : "❌ No"}
                </div>
              )}
              {pdfGeneration.error && <div>Error: {pdfGeneration.error}</div>}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <h5 className="font-medium text-sm text-blue-800 mb-2">
            Recommendations
          </h5>
          <div className="text-xs text-blue-700">
            {!serverConnectivity.health?.success && (
              <div>• Check if the server is running and accessible</div>
            )}
            {pdfGeneration.success && !pdfGeneration.urlAccessible && (
              <div>
                • PDF generated but URL not accessible - check firewall settings
              </div>
            )}
            {!clientInfo.isLocalhost &&
              networkInfo.directServerAccess &&
              !networkInfo.directServerAccess.success && (
                <div>
                  • Network device cannot access server directly - check network
                  configuration
                </div>
              )}
            {clientInfo.isLocalhost && (
              <div>
                • You're on localhost - network devices need the server's IP
                address
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="print-diagnostics">
      <button
        onClick={runDiagnostics}
        disabled={testing}
        className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
      >
        {testing ? "Running Diagnostics..." : "Run Print Diagnostics"}
      </button>

      {renderDiagnostics()}
    </div>
  );
};

export default PrintDiagnostics;
