import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Zap,
  TrendingDown,
  RefreshCw,
  Download,
  Eye,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/Card";
import { Button, Badge } from "../../ui";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Pie,
} from "recharts";
import api from "../../../services/api";

/**
 * Enhanced ProductAnalytics Component with Real Data Integration
 * Displays comprehensive analytics and insights for product performance using real database data
 */
const EnhancedProductAnalytics = ({
  isOpen = false,
  onClose,
  productId = null, // If provided, shows analytics for a specific product
  timeRange = "30d", // "7d", "30d", "90d", "1y"
  onTimeRangeChange,
  className = "",
}) => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [insightsData, setInsightsData] = useState(null);
  const [realtimeData, setRealtimeData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Color schemes for charts
  const colors = {
    primary: "#0066cc",
    success: "#28a745",
    warning: "#ffc107",
    danger: "#dc3545",
    info: "#17a2b8",
    secondary: "#6c757d",
  };

  const chartColors = [
    "#0066cc",
    "#28a745",
    "#ffc107",
    "#dc3545",
    "#17a2b8",
    "#6c757d",
    "#e83e8c",
    "#fd7e14",
  ];

  // Fetch comprehensive product analytics
  const fetchProductAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const timeframe =
        timeRange === "week"
          ? "7d"
          : timeRange === "month"
          ? "30d"
          : timeRange === "year"
          ? "1y"
          : timeRange;

      const params = {
        timeframe,
        ...(productId && { productId }),
      };

      // Fetch main analytics data
      const analyticsResponse = await api.get("/analytics/products", {
        params,
      });

      // Fetch performance comparison
      const performanceResponse = await api.get(
        "/analytics/products/performance",
        { params }
      );

      // Fetch insights and recommendations
      const insightsResponse = await api.get("/analytics/products/insights", {
        params,
      });

      if (analyticsResponse.data.success) {
        setAnalyticsData(analyticsResponse.data.data);
      }

      if (performanceResponse.data.success) {
        setPerformanceData(performanceResponse.data.data);
      }

      if (insightsResponse.data.success) {
        setInsightsData(insightsResponse.data.data);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Product analytics error:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Analytics verileri yüklenirken hata oluştu"
      );
    } finally {
      setLoading(false);
    }
  }, [timeRange, productId]);

  // Fetch real-time data
  const fetchRealtimeData = useCallback(async () => {
    try {
      const params = productId ? { productId } : {};
      const response = await api.get("/analytics/products/realtime", {
        params,
      });

      if (response.data.success) {
        setRealtimeData(response.data.data);
      }
    } catch (err) {
      console.error("Real-time data error:", err);
    }
  }, [productId]);

  // Initial data fetch
  useEffect(() => {
    if (isOpen) {
      fetchProductAnalytics();
      fetchRealtimeData();
    }
  }, [isOpen, fetchProductAnalytics, fetchRealtimeData]);

  // Auto-refresh real-time data
  useEffect(() => {
    if (isOpen && activeTab === "realtime") {
      const interval = setInterval(fetchRealtimeData, 60000); // Every minute
      return () => clearInterval(interval);
    }
  }, [isOpen, activeTab, fetchRealtimeData]);

  // Helper functions
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat("tr-TR").format(value);
  };

  const formatPercentage = (value) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const getTrendIcon = (change) => {
    if (change > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <TrendingUp className="h-4 w-4 text-gray-500" />;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high":
        return "danger";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "secondary";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}
    >
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
            {productId ? "Ürün Performansı" : "Ürün Analitiği"}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {/* Time Range Selector */}
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md">
              <Button
                variant={timeRange === "7d" ? "primary" : "ghost"}
                size="sm"
                className="px-2 py-1 text-xs"
                onClick={() => onTimeRangeChange?.("7d")}
              >
                7 Gün
              </Button>
              <Button
                variant={timeRange === "30d" ? "primary" : "ghost"}
                size="sm"
                className="px-2 py-1 text-xs"
                onClick={() => onTimeRangeChange?.("30d")}
              >
                30 Gün
              </Button>
              <Button
                variant={timeRange === "90d" ? "primary" : "ghost"}
                size="sm"
                className="px-2 py-1 text-xs"
                onClick={() => onTimeRangeChange?.("90d")}
              >
                90 Gün
              </Button>
              <Button
                variant={timeRange === "1y" ? "primary" : "ghost"}
                size="sm"
                className="px-2 py-1 text-xs"
                onClick={() => onTimeRangeChange?.("1y")}
              >
                1 Yıl
              </Button>
            </div>

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchProductAnalytics}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>

            {/* Export Button */}
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>

            {/* Close Button */}
            <Button variant="ghost" size="sm" onClick={onClose}>
              Kapat
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex mt-4 border-b border-gray-200 dark:border-gray-700">
          {[
            { id: "overview", label: "Genel Bakış", icon: BarChart3 },
            { id: "performance", label: "Performans", icon: TrendingUp },
            { id: "insights", label: "İçgörüler", icon: Eye },
            { id: "realtime", label: "Canlı", icon: Activity },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="text-xs text-gray-500 mt-2">
            Son güncelleme: {lastUpdated.toLocaleTimeString("tr-TR")}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <div className="mt-2 text-gray-600">
                Analitik verileri yükleniyor...
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 mb-2">
                <TrendingDown className="h-12 w-12 mx-auto" />
              </div>
              <div className="text-red-600 font-medium">{error}</div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={fetchProductAnalytics}
              >
                Tekrar Dene
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === "overview" && analyticsData && (
              <OverviewTab
                data={analyticsData}
                selectedMetric={selectedMetric}
                setSelectedMetric={setSelectedMetric}
                formatCurrency={formatCurrency}
                formatNumber={formatNumber}
                formatPercentage={formatPercentage}
                getTrendIcon={getTrendIcon}
                colors={colors}
                chartColors={chartColors}
              />
            )}

            {/* Performance Tab */}
            {activeTab === "performance" && performanceData && (
              <PerformanceTab
                data={performanceData}
                formatCurrency={formatCurrency}
                formatNumber={formatNumber}
                formatPercentage={formatPercentage}
                colors={colors}
                chartColors={chartColors}
              />
            )}

            {/* Insights Tab */}
            {activeTab === "insights" && insightsData && (
              <InsightsTab
                data={insightsData}
                getSeverityColor={getSeverityColor}
                formatPercentage={formatPercentage}
              />
            )}

            {/* Real-time Tab */}
            {activeTab === "realtime" && realtimeData && (
              <RealtimeTab
                data={realtimeData}
                formatCurrency={formatCurrency}
                formatNumber={formatNumber}
                getSeverityColor={getSeverityColor}
                colors={colors}
              />
            )}
          </>
        )}
      </CardContent>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({
  data,
  selectedMetric,
  setSelectedMetric,
  formatCurrency,
  formatNumber,
  formatPercentage,
  getTrendIcon,
  colors,
  chartColors,
}) => {
  const summary = data.summary || {};
  const products = data.products || [];
  const dailyTrends = data.dailyTrends || [];

  const summaryMetrics = [
    {
      key: "revenue",
      title: "Toplam Gelir",
      value: formatCurrency(summary.totalRevenue || 0),
      change: 8.5, // This would come from performance metrics
      icon: <DollarSign className="h-5 w-5 text-green-500" />,
    },
    {
      key: "quantity",
      title: "Satılan Miktar",
      value: formatNumber(summary.totalSold || 0),
      change: 12.3,
      icon: <Package className="h-5 w-5 text-blue-500" />,
    },
    {
      key: "orders",
      title: "Sipariş Sayısı",
      value: formatNumber(summary.totalOrders || 0),
      change: 5.2,
      icon: <ShoppingCart className="h-5 w-5 text-purple-500" />,
    },
    {
      key: "price",
      title: "Ortalama Fiyat",
      value: formatCurrency(summary.averagePrice || 0),
      change: -1.8,
      icon: <TrendingUp className="h-5 w-5 text-orange-500" />,
    },
  ];

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryMetrics.map((metric) => (
          <Card
            key={metric.key}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedMetric === metric.key ? "ring-2 ring-blue-500" : ""
            }`}
            onClick={() => setSelectedMetric(metric.key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {metric.title}
                  </p>
                  <p className="text-2xl font-semibold mt-1">{metric.value}</p>
                </div>
                <div>{metric.icon}</div>
              </div>
              <div className="mt-2 flex items-center">
                {getTrendIcon(metric.change)}
                <span
                  className={`text-sm ml-1 ${
                    metric.change > 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {formatPercentage(metric.change)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend Chart */}
      {dailyTrends.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {selectedMetric === "revenue" && "Günlük Gelir Trendi"}
                {selectedMetric === "quantity" && "Günlük Satış Trendi"}
                {selectedMetric === "orders" && "Günlük Sipariş Trendi"}
                {selectedMetric === "price" && "Fiyat Trendi"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("tr-TR", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      selectedMetric === "revenue"
                        ? formatCurrency(value)
                        : formatNumber(value)
                    }
                  />
                  <Tooltip
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("tr-TR")
                    }
                    formatter={(value, name) => [
                      selectedMetric === "revenue"
                        ? formatCurrency(value)
                        : formatNumber(value),
                      name === "revenue"
                        ? "Gelir"
                        : name === "soldQuantity"
                        ? "Satılan"
                        : name === "orders"
                        ? "Sipariş"
                        : name,
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey={
                      selectedMetric === "revenue"
                        ? "revenue"
                        : selectedMetric === "quantity"
                        ? "soldQuantity"
                        : selectedMetric === "orders"
                        ? "orders"
                        : "revenue"
                    }
                    stroke={colors.primary}
                    fill={colors.primary}
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Products Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              En Çok Satan Ürünler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {products.length > 0 ? (
              <div className="space-y-3">
                {products.slice(0, 10).map((product, index) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {product.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          SKU: {product.sku} | {product.category}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">
                        {formatCurrency(product.totalRevenue)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatNumber(product.totalSold)} adet
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Ürün verisi bulunamadı</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Breakdown */}
        {data.platformBreakdown && data.platformBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Platform Dağılımı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    data={data.platformBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="totalRevenue"
                    nameKey="platform"
                    label={({ platform, percent }) =>
                      `${platform} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {data.platformBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), "Gelir"]}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

// Performance Tab Component
const PerformanceTab = ({
  data,
  formatCurrency,
  formatNumber,
  formatPercentage,
  colors,
  chartColors,
}) => {
  const products = data.products || [];
  const summary = data.summary || {};

  return (
    <>
      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(summary.totalProducts || 0)}
            </div>
            <div className="text-sm text-gray-500">Toplam Ürün</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalRevenue || 0)}
            </div>
            <div className="text-sm text-gray-500">Toplam Gelir</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {summary.topCategory || "Belirsiz"}
            </div>
            <div className="text-sm text-gray-500">En İyi Kategori</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.averagePrice || 0)}
            </div>
            <div className="text-sm text-gray-500">Ort. Fiyat</div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ürün Performans Karşılaştırması</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Ürün</th>
                  <th className="text-right p-2">Gelir</th>
                  <th className="text-right p-2">Satılan</th>
                  <th className="text-right p-2">Sipariş</th>
                  <th className="text-right p-2">Ort. Fiyat</th>
                  <th className="text-right p-2">Satış Hızı</th>
                  <th className="text-right p-2">Stok</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.productId}
                    className="border-b hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-gray-500">
                          {product.sku}
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-right font-medium">
                      {formatCurrency(product.totalRevenue)}
                    </td>
                    <td className="p-2 text-right">
                      {formatNumber(product.totalSold)}
                    </td>
                    <td className="p-2 text-right">
                      {formatNumber(product.totalOrders)}
                    </td>
                    <td className="p-2 text-right">
                      {formatCurrency(product.averagePrice)}
                    </td>
                    <td className="p-2 text-right">
                      <Badge
                        variant={
                          product.salesVelocity > 1 ? "success" : "secondary"
                        }
                        className="text-xs"
                      >
                        {product.salesVelocity?.toFixed(1) || 0}/gün
                      </Badge>
                    </td>
                    <td className="p-2 text-right">
                      <Badge
                        variant={
                          product.currentStock < 10 ? "danger" : "secondary"
                        }
                        className="text-xs"
                      >
                        {formatNumber(product.currentStock)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

// Insights Tab Component
const InsightsTab = ({ data, getSeverityColor, formatPercentage }) => {
  const insights = data.insights || [];
  const recommendations = data.recommendations || [];

  return (
    <>
      {/* Insights */}
      {insights.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Önemli İçgörüler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    insight.type === "positive"
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : insight.type === "warning"
                      ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                      : insight.type === "info"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-500 bg-gray-50 dark:bg-gray-900/20"
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {insight.message}
                      </p>
                      <div className="flex items-center mt-2">
                        <Badge variant="secondary" className="text-xs mr-2">
                          {insight.category}
                        </Badge>
                        <Badge
                          variant={getSeverityColor(insight.impact)}
                          className="text-xs"
                        >
                          {insight.impact} etki
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Önerileri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-sm">{rec.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {rec.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge
                        variant={getSeverityColor(rec.priority)}
                        className="text-xs"
                      >
                        {rec.priority} öncelik
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {rec.category}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600 font-medium">
                      {rec.estimatedImpact}
                    </span>
                    <span className="text-gray-500">
                      Süre: {rec.timeframe || "Belirsiz"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

// Real-time Tab Component
const RealtimeTab = ({
  data,
  formatCurrency,
  formatNumber,
  getSeverityColor,
  colors,
}) => {
  const todaySummary = data.todaySummary || {};
  const hourlyTrends = data.hourlyTrends || [];
  const inventoryAlerts = data.inventoryAlerts || [];

  return (
    <>
      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(todaySummary.totalRevenue || 0)}
            </div>
            <div className="text-sm text-gray-500">Bugünkü Gelir</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(todaySummary.totalSold || 0)}
            </div>
            <div className="text-sm text-gray-500">Bugünkü Satış</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {formatNumber(todaySummary.totalOrders || 0)}
            </div>
            <div className="text-sm text-gray-500">Bugünkü Sipariş</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(todaySummary.averagePrice || 0)}
            </div>
            <div className="text-sm text-gray-500">Ort. Fiyat</div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Trends */}
      {hourlyTrends.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Saatlik Satış Trendi</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(value) => `${value}:00`}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => `Saat: ${value}:00`}
                  formatter={(value, name) => [
                    name === "revenue"
                      ? formatCurrency(value)
                      : formatNumber(value),
                    name === "revenue" ? "Gelir" : "Satılan",
                  ]}
                />
                <Bar dataKey="revenue" fill={colors.primary} />
                <Bar dataKey="soldQuantity" fill={colors.success} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Inventory Alerts */}
      {inventoryAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-500" />
              Stok Uyarıları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inventoryAlerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.severity === "high"
                      ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                      : alert.severity === "medium"
                      ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                      : "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        {alert.productName}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Önerilen aksiyon: {alert.recommendedAction}
                      </p>
                    </div>
                    <Badge
                      variant={getSeverityColor(alert.severity)}
                      className="text-xs"
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default EnhancedProductAnalytics;
