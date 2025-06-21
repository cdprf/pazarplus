import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart,
} from "recharts";
import { Button } from "../ui/Button";
import { useOrderTrends } from "../../hooks/useOrders";
import useWebSocketQuery from "../../hooks/useWebSocketQuery";

const OrdersChart = () => {
  const [period, setPeriod] = useState("week");
  const [chartType, setChartType] = useState("line");
  const { data, isLoading, error } = useOrderTrends(period);

  // Set up real-time updates for chart data
  useWebSocketQuery(
    ["orderStats", period],
    ["ORDER_CREATED", "ORDER_UPDATED", "ORDER_CANCELLED"],
    {
      ORDER_CREATED: {
        timestamp: {
          gte: new Date(
            Date.now() - (period === "week" ? 7 : 30) * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      },
    }
  );

  // Process error to ensure it's a string
  const errorMessage = error ? error.message || error.toString() : null;

  // Process and format chart data
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    return data.map((item) => ({
      date: new Date(item.date).toLocaleDateString("tr-TR", {
        month: "short",
        day: "numeric",
      }),
      new: item.newOrders || 0,
      processing: item.processingOrders || 0,
      shipped: item.shippedOrders || 0,
      delivered: item.deliveredOrders || 0,
      total:
        (item.newOrders || 0) +
        (item.processingOrders || 0) +
        (item.shippedOrders || 0) +
        (item.deliveredOrders || 0),
    }));
  }, [data]);

  const colors = {
    new: "#3b82f6",
    processing: "#f59e0b",
    shipped: "#8b5cf6",
    delivered: "#10b981",
    total: "#6b7280",
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (chartType === "bar") {
      return (
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" fontSize={12} tick={{ fill: "#64748b" }} />
          <YAxis fontSize={12} tick={{ fill: "#64748b" }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="new"
            name="New Orders"
            fill={colors.new}
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="processing"
            name="Processing"
            fill={colors.processing}
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="shipped"
            name="Shipped"
            fill={colors.shipped}
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="delivered"
            name="Delivered"
            fill={colors.delivered}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      );
    }

    if (chartType === "area") {
      return (
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" fontSize={12} tick={{ fill: "#64748b" }} />
          <YAxis fontSize={12} tick={{ fill: "#64748b" }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="delivered"
            stackId="1"
            name="Delivered"
            stroke={colors.delivered}
            fill={colors.delivered}
            fillOpacity={0.7}
          />
          <Area
            type="monotone"
            dataKey="shipped"
            stackId="1"
            name="Shipped"
            stroke={colors.shipped}
            fill={colors.shipped}
            fillOpacity={0.7}
          />
          <Area
            type="monotone"
            dataKey="processing"
            stackId="1"
            name="Processing"
            stroke={colors.processing}
            fill={colors.processing}
            fillOpacity={0.7}
          />
          <Area
            type="monotone"
            dataKey="new"
            stackId="1"
            name="New Orders"
            stroke={colors.new}
            fill={colors.new}
            fillOpacity={0.7}
          />
        </AreaChart>
      );
    }

    return (
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" fontSize={12} tick={{ fill: "#64748b" }} />
        <YAxis fontSize={12} tick={{ fill: "#64748b" }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="new"
          name="New Orders"
          stroke={colors.new}
          strokeWidth={2}
          dot={{ fill: colors.new, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
        <Line
          type="monotone"
          dataKey="processing"
          name="Processing"
          stroke={colors.processing}
          strokeWidth={2}
          dot={{ fill: colors.processing, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
        <Line
          type="monotone"
          dataKey="shipped"
          name="Shipped"
          stroke={colors.shipped}
          strokeWidth={2}
          dot={{ fill: colors.shipped, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
        <Line
          type="monotone"
          dataKey="delivered"
          name="Delivered"
          stroke={colors.delivered}
          strokeWidth={2}
          dot={{ fill: colors.delivered, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      </LineChart>
    );
  };

  if (isLoading) {
    return (
      <div className="chart-container">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="spinner spinner-lg mx-auto mb-4"></div>
            <p className="text-gray-600">Loading chart data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="chart-container">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg
                className="w-12 h-12 mx-auto icon-contrast-danger"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Chart Error
            </h4>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Orders Trend</h3>
          <p className="text-sm text-gray-600 mt-1">
            Order status distribution over time
          </p>
        </div>
        <div className="chart-controls">
          <div className="flex items-center space-x-2 mr-4">
            <Button
              variant={period === "week" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setPeriod("week")}
            >
              Week
            </Button>
            <Button
              variant={period === "month" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setPeriod("month")}
            >
              Month
            </Button>
            <Button
              variant={period === "year" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setPeriod("year")}
            >
              Year
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={chartType === "line" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setChartType("line")}
            >
              Line
            </Button>
            <Button
              variant={chartType === "bar" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setChartType("bar")}
            >
              Bar
            </Button>
            <Button
              variant={chartType === "area" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setChartType("area")}
            >
              Area
            </Button>
          </div>
        </div>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          {renderChart()}
        </ResponsiveContainer>
      ) : (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto icon-contrast-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              No Chart Data
            </h4>
            <p className="text-gray-600">
              No order data available for the selected period
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersChart;
