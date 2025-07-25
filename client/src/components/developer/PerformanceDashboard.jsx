import React, { useState, useEffect } from "react";
import performanceMonitor from "../../services/performanceMonitor";

const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getSummary());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="btn btn-sm btn-outline-secondary position-fixed"
        style={{ bottom: "20px", right: "20px", zIndex: 1050 }}
        title="Show Performance Metrics"
      >
        📊
      </button>
    );
  }

  return (
    <div
      className="card position-fixed"
      style={{
        bottom: "20px",
        right: "20px",
        width: "400px",
        maxHeight: "500px",
        zIndex: 1050,
        fontSize: "12px",
      }}
    >
      <div className="card-header d-flex justify-content-between align-items-center">
        <span>Performance Metrics</span>
        <div>
          <button
            onClick={() => performanceMonitor.clear()}
            className="btn btn-sm btn-outline-warning me-2"
          >
            Clear
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="btn btn-sm btn-outline-secondary"
          >
            ×
          </button>
        </div>
      </div>
      <div
        className="card-body"
        style={{ maxHeight: "400px", overflowY: "auto" }}
      >
        {metrics && (
          <>
            {/* Page Loads */}
            <div className="mb-3">
              <h6>Page Loads</h6>
              {Object.entries(metrics.pageLoads).map(([page, data]) => (
                <div key={page} className="d-flex justify-content-between">
                  <span>{page}:</span>
                  <span>{data.duration.toFixed(2)}ms</span>
                </div>
              ))}
            </div>

            {/* Component Loads */}
            <div className="mb-3">
              <h6>Component Loads</h6>
              {Object.entries(metrics.componentLoads).map(
                ([component, data]) => (
                  <div
                    key={component}
                    className="d-flex justify-content-between"
                  >
                    <span>{component}:</span>
                    <span
                      className={data.duration > 1000 ? "text-warning" : ""}
                    >
                      {data.duration.toFixed(2)}ms
                    </span>
                  </div>
                )
              )}
            </div>

            {/* API Calls */}
            <div className="mb-3">
              <h6>API Performance</h6>
              {Object.entries(metrics.apiCalls).map(([endpoint, data]) => (
                <div key={endpoint} className="mb-2">
                  <div className="d-flex justify-content-between">
                    <span
                      className="text-truncate"
                      style={{ maxWidth: "200px" }}
                    >
                      {endpoint}:
                    </span>
                    <span
                      className={data.avgDuration > 2000 ? "text-warning" : ""}
                    >
                      {data.avgDuration.toFixed(2)}ms avg
                    </span>
                  </div>
                  <div className="d-flex justify-content-between text-muted">
                    <span>{data.calls} calls</span>
                    <span>{data.errors} errors</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PerformanceDashboard;
