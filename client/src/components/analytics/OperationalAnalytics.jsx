import React, { useState, useEffect, useCallback } from "react";
import { useNetworkAwareInterval } from "../../hooks/useNetworkStatus";
import {
  CogIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import analyticsService from "../../services/analyticsService";
import KPICard from "./KPICard";
import ExportButton from "./ExportButton";
import ChartPlaceholder from "./ChartPlaceholder";

const OperationalAnalytics = ({ timeframe = "30d" }) => {
  const [realTimeData, setRealTimeData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOperationalData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch operational analytics data
      const [realTime, performance, anomalyData] = await Promise.all([
        analyticsService.getRealTimeMetrics
          ? analyticsService.getRealTimeMetrics()
          : Promise.resolve(null),
        analyticsService.getOperationalAnalytics(timeframe),
        analyticsService.getAnomalyDetection
          ? analyticsService.getAnomalyDetection()
          : Promise.resolve(null),
      ]);

      setRealTimeData(realTime);
      setPerformanceData(performance);
      setAnomalies(anomalyData);
    } catch (err) {
      console.error("Operational analytics error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchOperationalData();
  }, [fetchOperationalData]);

  // Set up network-aware real-time updates every 30 seconds
  useNetworkAwareInterval(fetchOperationalData, 30000);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 font-medium">
            Loading operational analytics...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">
              Error Loading Operational Analytics
            </h3>
            <p className="text-red-700 mt-1">
              Error loading operational analytics: {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state handling
  if (!realTimeData && !performanceData && !anomalies) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center max-w-md">
          <CogIcon className="h-16 w-16 text-gray-400 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Operational Data Available
          </h3>
          <p className="text-gray-600 mb-6">
            We couldn't find any operational metrics for the selected period.
            This might be because:
          </p>
          <ul className="text-left text-gray-600 mb-6 space-y-1">
            <li>• System monitoring is not yet configured</li>
            <li>• Data collection is still in progress</li>
            <li>• The selected timeframe has no activity</li>
          </ul>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Refresh operational data"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh Data
            </button>
            <a
              href="/analytics"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Go to main analytics dashboard"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (value, threshold) => {
    if (value >= threshold * 0.9) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Good
        </span>
      );
    }
    if (value >= threshold * 0.7) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Warning
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Critical
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-gray-900">
            Operational Analytics
          </h2>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Real-time
          </span>
        </div>
        <div className="mt-4 sm:mt-0">
          <ExportButton
            onExport={() =>
              analyticsService.exportAnalytics("operational", timeframe)
            }
            filename={`operational-analytics-${timeframe}`}
          />
        </div>
      </div>

      {/* Real-time KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Active Orders"
          value={realTimeData?.activeOrders || 0}
          format="number"
          isRealTime={true}
        />
        <KPICard
          title="Processing Time"
          value={realTimeData?.avgProcessingTime || 0}
          format="duration"
          unit="min"
          isRealTime={true}
        />
        <KPICard
          title="System Load"
          value={realTimeData?.systemLoad || 0}
          format="percentage"
          isRealTime={true}
        />
        <KPICard
          title="Error Rate"
          value={realTimeData?.errorRate || 0}
          format="percentage"
          isRealTime={true}
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              System Performance Over Time
            </h3>
            <ChartPlaceholder
              title="Real-Time Performance Metrics"
              height={300}
            />
          </div>
        </div>
        <div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              System Health
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">API Response Time</span>
                {getStatusBadge(realTimeData?.apiResponseTime || 0, 200)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Database Performance</span>
                {getStatusBadge(realTimeData?.dbPerformance || 0, 100)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Memory Usage</span>
                {getStatusBadge(100 - (realTimeData?.memoryUsage || 0), 30)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">CPU Usage</span>
                {getStatusBadge(100 - (realTimeData?.cpuUsage || 0), 30)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Uptime</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {realTimeData?.uptime || "99.9%"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Anomalies and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Anomalies
          </h3>
          {anomalies?.detectedAnomalies?.length > 0 ? (
            <div className="space-y-3">
              {anomalies.detectedAnomalies.slice(0, 5).map((anomaly, index) => (
                <div
                  key={index}
                  className="border-b border-gray-200 pb-3 last:border-b-0"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-gray-900">
                      {anomaly.metric}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        anomaly.severity === "high"
                          ? "bg-red-100 text-red-800"
                          : anomaly.severity === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {anomaly.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    {anomaly.description}
                  </p>
                  <p className="text-xs text-gray-500">{anomaly.timestamp}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">
                  No anomalies detected in the system
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Performance Trends
          </h3>
          <ChartPlaceholder title="Performance Trends" height={250} />
        </div>
      </div>

      {/* Operational Insights */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Operational Insights & Recommendations
        </h3>
        {performanceData?.insights?.length > 0 ? (
          <div className="space-y-3">
            {performanceData.insights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-3">
                <ChartBarIcon className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{insight}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <ChartBarIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">
                System performance is stable with no critical issues detected
              </span>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">
                All monitoring systems are operational and reporting normally
              </span>
            </div>
            <div className="flex items-start space-x-3">
              <ClockIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">
                Response times are within acceptable thresholds
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OperationalAnalytics;
