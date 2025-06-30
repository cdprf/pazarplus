import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

/**
 * Optimized Chart Components with React.memo for Analytics
 * These components are memoized to prevent unnecessary re-renders
 */

// Custom tooltip component
const CustomTooltip = React.memo(({ active, payload, label, formatter }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {`${entry.name}: ${
              formatter ? formatter(entry.value) : entry.value
            }`}
          </p>
        ))}
      </div>
    );
  }
  return null;
});

// Optimized Line Chart
export const OptimizedLineChart = React.memo(
  ({
    data = [],
    width = "100%",
    height = 300,
    lines = [],
    showGrid = true,
    showLegend = true,
    showTooltip = true,
    colors = ["#0066cc", "#28a745", "#ffc107", "#dc3545"],
    formatter = null,
    ...props
  }) => {
    // Memoize chart data processing
    const processedData = React.useMemo(() => {
      if (!Array.isArray(data)) return [];
      return data.map((item) => ({
        ...item,
        // Ensure all numeric values are properly formatted
        ...Object.fromEntries(
          Object.entries(item).map(([key, value]) => [
            key,
            typeof value === "number" ? Number(value.toFixed(2)) : value,
          ])
        ),
      }));
    }, [data]);

    const chartLines = React.useMemo(() => {
      return lines.map((line, index) => (
        <Line
          key={line.dataKey}
          type="monotone"
          dataKey={line.dataKey}
          stroke={line.color || colors[index % colors.length]}
          strokeWidth={line.strokeWidth || 2}
          dot={line.showDots !== false}
          connectNulls={line.connectNulls}
          animationDuration={300}
        />
      ));
    }, [lines, colors]);

    if (processedData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded">
          <span className="text-gray-500">No data available</span>
        </div>
      );
    }

    return (
      <ResponsiveContainer width={width} height={height}>
        <LineChart data={processedData} {...props}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />}
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          {showTooltip && (
            <Tooltip content={<CustomTooltip formatter={formatter} />} />
          )}
          {showLegend && <Legend />}
          {chartLines}
        </LineChart>
      </ResponsiveContainer>
    );
  }
);

// Optimized Bar Chart
export const OptimizedBarChart = React.memo(
  ({
    data = [],
    width = "100%",
    height = 300,
    bars = [],
    showGrid = true,
    showLegend = true,
    showTooltip = true,
    colors = ["#0066cc", "#28a745", "#ffc107", "#dc3545"],
    formatter = null,
    ...props
  }) => {
    const processedData = React.useMemo(() => {
      if (!Array.isArray(data)) return [];
      return data.map((item) => ({
        ...item,
        ...Object.fromEntries(
          Object.entries(item).map(([key, value]) => [
            key,
            typeof value === "number" ? Number(value.toFixed(2)) : value,
          ])
        ),
      }));
    }, [data]);

    const chartBars = React.useMemo(() => {
      return bars.map((bar, index) => (
        <Bar
          key={bar.dataKey}
          dataKey={bar.dataKey}
          fill={bar.color || colors[index % colors.length]}
          animationDuration={300}
        />
      ));
    }, [bars, colors]);

    if (processedData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded">
          <span className="text-gray-500">No data available</span>
        </div>
      );
    }

    return (
      <ResponsiveContainer width={width} height={height}>
        <BarChart data={processedData} {...props}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />}
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          {showTooltip && (
            <Tooltip content={<CustomTooltip formatter={formatter} />} />
          )}
          {showLegend && <Legend />}
          {chartBars}
        </BarChart>
      </ResponsiveContainer>
    );
  }
);

// Optimized Area Chart
export const OptimizedAreaChart = React.memo(
  ({
    data = [],
    width = "100%",
    height = 300,
    areas = [],
    showGrid = true,
    showLegend = true,
    showTooltip = true,
    colors = ["#0066cc", "#28a745", "#ffc107", "#dc3545"],
    formatter = null,
    ...props
  }) => {
    const processedData = React.useMemo(() => {
      if (!Array.isArray(data)) return [];
      return data.map((item) => ({
        ...item,
        ...Object.fromEntries(
          Object.entries(item).map(([key, value]) => [
            key,
            typeof value === "number" ? Number(value.toFixed(2)) : value,
          ])
        ),
      }));
    }, [data]);

    const chartAreas = React.useMemo(() => {
      return areas.map((area, index) => (
        <Area
          key={area.dataKey}
          type="monotone"
          dataKey={area.dataKey}
          stroke={area.strokeColor || colors[index % colors.length]}
          fill={area.fillColor || colors[index % colors.length]}
          fillOpacity={area.fillOpacity || 0.6}
          animationDuration={300}
        />
      ));
    }, [areas, colors]);

    if (processedData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded">
          <span className="text-gray-500">No data available</span>
        </div>
      );
    }

    return (
      <ResponsiveContainer width={width} height={height}>
        <AreaChart data={processedData} {...props}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />}
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          {showTooltip && (
            <Tooltip content={<CustomTooltip formatter={formatter} />} />
          )}
          {showLegend && <Legend />}
          {chartAreas}
        </AreaChart>
      </ResponsiveContainer>
    );
  }
);

// Optimized Pie Chart
export const OptimizedPieChart = React.memo(
  ({
    data = [],
    width = "100%",
    height = 300,
    showTooltip = true,
    showLegend = true,
    colors = ["#0066cc", "#28a745", "#ffc107", "#dc3545", "#17a2b8"],
    formatter = null,
    ...props
  }) => {
    const processedData = React.useMemo(() => {
      if (!Array.isArray(data)) return [];
      return data.map((item, index) => ({
        ...item,
        value:
          typeof item.value === "number"
            ? Number(item.value.toFixed(2))
            : item.value,
        color: item.color || colors[index % colors.length],
      }));
    }, [data, colors]);

    if (processedData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded">
          <span className="text-gray-500">No data available</span>
        </div>
      );
    }

    return (
      <ResponsiveContainer width={width} height={height}>
        <PieChart {...props}>
          <Pie
            data={processedData}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            animationDuration={300}
          >
            {processedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          {showTooltip && (
            <Tooltip content={<CustomTooltip formatter={formatter} />} />
          )}
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    );
  }
);

// Chart container with loading state
export const ChartContainer = React.memo(
  ({
    title,
    children,
    isLoading = false,
    error = null,
    actions = null,
    className = "",
  }) => {
    if (error) {
      return (
        <div className={`bg-white p-6 rounded-lg shadow border ${className}`}>
          <div className="text-center text-red-600">
            <p className="font-medium">Chart Error</p>
            <p className="text-sm">
              {error.message || "Failed to load chart data"}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className={`bg-white p-6 rounded-lg shadow border ${className}`}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            {actions && <div className="flex space-x-2">{actions}</div>}
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <span className="text-sm text-gray-600">Loading chart...</span>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    );
  }
);

// Export optimized components
OptimizedLineChart.displayName = "OptimizedLineChart";
OptimizedBarChart.displayName = "OptimizedBarChart";
OptimizedAreaChart.displayName = "OptimizedAreaChart";
OptimizedPieChart.displayName = "OptimizedPieChart";
ChartContainer.displayName = "ChartContainer";
CustomTooltip.displayName = "CustomTooltip";
