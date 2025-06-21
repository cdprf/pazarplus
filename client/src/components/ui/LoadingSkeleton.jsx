import React from "react";

const LoadingSkeleton = ({ type = "dashboard" }) => {
  if (type === "dashboard") {
    return (
      <div className="skeleton-dashboard">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-stat-card">
            <div className="skeleton skeleton-stat-icon"></div>
            <div className="skeleton skeleton-stat-value"></div>
            <div className="skeleton skeleton-stat-label"></div>
            <div className="skeleton skeleton-stat-change"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "chart") {
    return (
      <div className="chart-container">
        <div className="chart-header mb-4">
          <div className="skeleton skeleton-title h-6 w-48"></div>
          <div className="skeleton skeleton-text h-4 w-32 mt-2"></div>
        </div>
        <div className="skeleton skeleton-card h-96"></div>
      </div>
    );
  }

  if (type === "card") {
    return (
      <div className="pazar-card">
        <div className="pazar-card-content">
          <div className="skeleton skeleton-title h-5 w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="skeleton skeleton-avatar"></div>
                  <div className="skeleton skeleton-text h-4 w-24"></div>
                </div>
                <div className="skeleton skeleton-text h-4 w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-pulse">
      <div className="skeleton skeleton-card h-32"></div>
    </div>
  );
};

export default LoadingSkeleton;
