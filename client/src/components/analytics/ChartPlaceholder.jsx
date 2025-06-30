/**
 * Temporary fix for BusinessIntelligenceDashboard.jsx
 * This file contains placeholder chart components to eliminate compilation errors
 * while the full migration to OptimizedCharts is being completed.
 */

import React from "react";
import { ChartBarIcon } from "@heroicons/react/24/outline";

const ChartPlaceholder = ({ title, height = 300 }) => (
  <div
    className="d-flex align-items-center justify-content-center"
    style={{ height }}
  >
    <div className="text-center">
      <ChartBarIcon
        className="h-12 w-12 text-muted mb-3"
        style={{ width: "3rem", height: "3rem" }}
      />
      <p className="text-muted">{title}</p>
      <small className="text-muted">
        Chart temporarily disabled during optimization
      </small>
    </div>
  </div>
);

export default ChartPlaceholder;
