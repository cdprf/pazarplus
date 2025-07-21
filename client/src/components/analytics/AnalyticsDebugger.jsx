import React, { useState, useEffect } from "react";
import analyticsService from "../../services/analyticsService";

const AnalyticsDebugger = () => {
  const [debugInfo, setDebugInfo] = useState({
    loading: true,
    error: null,
    apiResponse: null,
    responseTime: 0,
    fetchTime: null,
  });

  useEffect(() => {
    const testAnalyticsAPI = async () => {
      console.log("🔍 Starting analytics API debug test...");
      const startTime = Date.now();

      try {
        setDebugInfo((prev) => ({ ...prev, loading: true, error: null }));

        // Test the dashboard analytics endpoint
        const result = await analyticsService.getDashboardAnalytics("30d");
        const endTime = Date.now();

        console.log("✅ Analytics API Response:", result);

        setDebugInfo({
          loading: false,
          error: null,
          apiResponse: result,
          responseTime: endTime - startTime,
          fetchTime: new Date().toLocaleTimeString(),
        });
      } catch (error) {
        const endTime = Date.now();
        console.error("❌ Analytics API Error:", error);

        setDebugInfo({
          loading: false,
          error: error.message,
          apiResponse: null,
          responseTime: endTime - startTime,
          fetchTime: new Date().toLocaleTimeString(),
        });
      }
    };

    testAnalyticsAPI();
  }, []);

  const retryTest = () => {
    setDebugInfo((prev) => ({ ...prev, loading: true }));
    // Trigger useEffect again by changing a dependency
    window.location.reload();
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg border-2 border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          📊 Analytics API Debugger
        </h3>
        <button
          onClick={retryTest}
          disabled={debugInfo.loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {debugInfo.loading ? "Testing..." : "Retry Test"}
        </button>
      </div>

      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center space-x-2">
          <span className="font-medium">Status:</span>
          {debugInfo.loading ? (
            <span className="text-blue-600">🔄 Loading...</span>
          ) : debugInfo.error ? (
            <span className="text-red-600">❌ Error</span>
          ) : (
            <span className="text-green-600">✅ Success</span>
          )}
        </div>

        {/* Response Time */}
        <div className="flex items-center space-x-2">
          <span className="font-medium">Response Time:</span>
          <span>{debugInfo.responseTime}ms</span>
        </div>

        {/* Fetch Time */}
        <div className="flex items-center space-x-2">
          <span className="font-medium">Last Fetch:</span>
          <span>{debugInfo.fetchTime || "Not fetched yet"}</span>
        </div>

        {/* Error Details */}
        {debugInfo.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <h4 className="font-medium text-red-800 mb-2">Error Details:</h4>
            <p className="text-red-700 text-sm">{debugInfo.error}</p>
          </div>
        )}

        {/* API Response */}
        {debugInfo.apiResponse && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">API Response Summary:</h4>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Success:</span>
                <span
                  className={
                    debugInfo.apiResponse.success
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {debugInfo.apiResponse.success ? " ✅ Yes" : " ❌ No"}
                </span>
              </div>

              <div>
                <span className="font-medium">Has Data:</span>
                <span
                  className={
                    debugInfo.apiResponse.data
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {debugInfo.apiResponse.data ? " ✅ Yes" : " ❌ No"}
                </span>
              </div>

              {debugInfo.apiResponse.data && (
                <>
                  <div>
                    <span className="font-medium">Total Revenue:</span>
                    <span className="text-blue-600">
                      {debugInfo.apiResponse.data.orderSummary?.totalRevenue ||
                        debugInfo.apiResponse.data.summary?.totalRevenue ||
                        debugInfo.apiResponse.data.revenue?.total ||
                        "0"}
                    </span>
                  </div>

                  <div>
                    <span className="font-medium">Total Orders:</span>
                    <span className="text-blue-600">
                      {debugInfo.apiResponse.data.orderSummary?.totalOrders ||
                        debugInfo.apiResponse.data.summary?.totalOrders ||
                        "0"}
                    </span>
                  </div>

                  <div>
                    <span className="font-medium">Trends Count:</span>
                    <span className="text-blue-600">
                      {debugInfo.apiResponse.data.revenue?.trends?.length ||
                        debugInfo.apiResponse.data.orderTrends?.daily?.length ||
                        "0"}
                    </span>
                  </div>

                  <div>
                    <span className="font-medium">Top Products:</span>
                    <span className="text-blue-600">
                      {debugInfo.apiResponse.data.topProducts?.length || "0"}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Raw Response (collapsed) */}
            <details className="mt-4">
              <summary className="font-medium cursor-pointer text-gray-700 hover:text-gray-900">
                📋 Show Raw API Response
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded-md text-xs overflow-auto max-h-96">
                {JSON.stringify(debugInfo.apiResponse, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDebugger;
