import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  Calendar,
  AlertTriangle,
  Target,
  BarChart3,
  PieChart,
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
} from "recharts";
import api from "../../../services/api";

/**
 * Enhanced ProductAnalytics Component with Real Data Integration
 * Displays comprehensive analytics and insights for product performance using real database data
 */
const ProductAnalytics = ({
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
      console.log("Fetching main analytics data...");
      const analyticsResponse = await api.get("/analytics/products", {
        params,
      });
      console.log("Analytics response:", analyticsResponse);

      // Fetch performance comparison
      console.log("Fetching performance comparison...");
      const performanceResponse = await api.get(
        "/analytics/products/performance",
        { params }
      );
      console.log("Performance response:", performanceResponse);

      // Fetch insights and recommendations
      console.log("Fetching insights...");
      const insightsResponse = await api.get("/analytics/products/insights", {
        params,
      });
      console.log("Insights response:", insightsResponse);

      if (analyticsResponse.data.success) {
        console.log("Setting analytics data:", analyticsResponse.data.data);
        setAnalyticsData(analyticsResponse.data.data);
      } else {
        console.error(
          "Analytics response not successful:",
          analyticsResponse.data
        );
      }

      if (performanceResponse.data.success) {
        console.log("Setting performance data:", performanceResponse.data.data);
        setPerformanceData(performanceResponse.data.data);
      } else {
        console.error(
          "Performance response not successful:",
          performanceResponse.data
        );
      }

      if (insightsResponse.data.success) {
        console.log("Setting insights data:", insightsResponse.data.data);
        setInsightsData(insightsResponse.data.data);
      } else {
        console.error(
          "Insights response not successful:",
          insightsResponse.data
        );
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Product analytics error:", err);
      console.error("Error response:", err.response);
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
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
      console.log("Fetching realtime data...");
      const params = productId ? { productId } : {};
      const response = await api.get("/analytics/products/realtime", {
        params,
      });
      console.log("Realtime response:", response);

      if (response.data.success) {
        setRealtimeData(response.data.data);
      }
    } catch (err) {
      console.error("Real-time data error:", err);
      console.error("Realtime error response:", err.response);
      // Don't show error for realtime data failures, just log them
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

  // Mock data fallback
  const getMockAnalyticsData = () => ({
    summary: {
      totalSales: 0,
      salesChange: 0,
      totalViews: 0,
      viewsChange: 0,
      totalOrders: 0,
      ordersChange: 0,
      conversionRate: 0,
      conversionChange: 0,
    },
    topProducts: [],
    insights: [
      "Henüz yeterli veri bulunmamaktadır",
      "Daha fazla satış verisi toplandıktan sonra detaylı analizler sunulacaktır",
    ],
    chartData: [],
    platformBreakdown: [],
    dailyTrends: [],
  });

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
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md">
              <Button
                variant={timeRange === "day" ? "primary" : "ghost"}
                size="sm"
                className="px-2 py-1 text-xs"
                onClick={() => onTimeRangeChange?.("day")}
              >
                Gün
              </Button>
              <Button
                variant={timeRange === "week" ? "primary" : "ghost"}
                size="sm"
                className="px-2 py-1 text-xs"
                onClick={() => onTimeRangeChange?.("week")}
              >
                Hafta
              </Button>
              <Button
                variant={timeRange === "month" ? "primary" : "ghost"}
                size="sm"
                className="px-2 py-1 text-xs"
                onClick={() => onTimeRangeChange?.("month")}
              >
                Ay
              </Button>
              <Button
                variant={timeRange === "year" ? "primary" : "ghost"}
                size="sm"
                className="px-2 py-1 text-xs"
                onClick={() => onTimeRangeChange?.("year")}
              >
                Yıl
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Kapat
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400 mb-2">
                Analytics verileri yüklenirken hata oluştu
              </p>
              <p className="text-sm text-gray-500 mb-4">{error}</p>
              <Button
                variant="primary"
                size="sm"
                onClick={fetchProductAnalytics}
              >
                Tekrar Dene
              </Button>
            </div>
          </div>
        ) : !analyticsData ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Analytics verisi bulunamadı
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={fetchProductAnalytics}
                className="mt-4"
              >
                Verileri Yükle
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SummaryCard
                title="Toplam Satış"
                value={`${analyticsData.summary?.totalRevenue || 0} ₺`}
                change={analyticsData.summary?.salesChange || 0}
                icon={<DollarSign className="h-5 w-5 text-green-500" />}
                onClick={() => setSelectedMetric("sales")}
                isSelected={selectedMetric === "sales"}
              />
              <SummaryCard
                title="Toplam Ürün"
                value={analyticsData.summary?.totalProducts || 0}
                change={analyticsData.summary?.viewsChange || 0}
                icon={<Users className="h-5 w-5 text-blue-500" />}
                onClick={() => setSelectedMetric("views")}
                isSelected={selectedMetric === "views"}
              />
              <SummaryCard
                title="Toplam Satılan"
                value={`${analyticsData.summary?.totalSold || 0}`}
                change={analyticsData.summary?.conversionChange || 0}
                icon={<ShoppingCart className="h-5 w-5 text-purple-500" />}
                onClick={() => setSelectedMetric("conversion")}
                isSelected={selectedMetric === "conversion"}
              />
              <SummaryCard
                title="Ortalama Fiyat"
                value={`${(analyticsData.summary?.averagePrice || 0).toFixed(
                  2
                )} ₺`}
                change={analyticsData.summary?.priceChange || 0}
                icon={<Package className="h-5 w-5 text-orange-500" />}
                onClick={() => setSelectedMetric("price")}
                isSelected={selectedMetric === "price"}
              />
            </div>

            {/* Chart Area */}
            <div className="mb-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                {selectedMetric === "sales" && "Satış Trendi"}
                {selectedMetric === "views" && "Görüntülenme Trendi"}
                {selectedMetric === "conversion" && "Dönüşüm Oranı Trendi"}
                {selectedMetric === "price" && "Fiyat Trendi"}
              </h3>
              <div className="h-64 flex items-end justify-between">
                {analyticsData.charts &&
                analyticsData.charts[selectedMetric] &&
                analyticsData.charts[selectedMetric].length > 0 ? (
                  analyticsData.charts[selectedMetric].map((value, index) => {
                    const maxValue = Math.max(
                      ...analyticsData.charts[selectedMetric]
                    );
                    const height = (value / maxValue) * 100;

                    return (
                      <div key={index} className="flex flex-col items-center">
                        <div
                          className="w-8 bg-blue-500 rounded-t"
                          style={{ height: `${height}%` }}
                        ></div>
                        <span className="text-xs mt-1 text-gray-500">
                          {
                            ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"][
                              index
                            ]
                          }
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    Veri bulunamadı
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  En Çok Satan Ürünler
                </h3>
                <div className="space-y-2">
                  {analyticsData.topProducts &&
                  analyticsData.topProducts.length > 0 ? (
                    analyticsData.topProducts.map((product) => (
                      <div
                        key={product.id || product.productId}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div className="flex items-center">
                          <span className="text-sm font-medium">
                            {product.name}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm font-medium mr-2">
                            {product.totalSold || product.sales || 0} adet
                          </span>
                          <Badge
                            variant={product.change > 0 ? "success" : "danger"}
                            className="text-xs"
                          >
                            {product.change > 0 ? "+" : ""}
                            {product.change || 0}%
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm p-3">
                      Veri bulunamadı
                    </div>
                  )}
                </div>
              </div>

              {/* Insights */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Öngörüler ve Tavsiyeler
                </h3>
                <Card>
                  <CardContent className="p-4">
                    <ul className="space-y-2">
                      {(analyticsData.insights?.insights || []).map(
                        (insight, index) => (
                          <li key={index} className="flex items-start">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2"></span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {insight}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </div>
  );
};

// Summary Card Component
const SummaryCard = ({ title, value, change, icon, onClick, isSelected }) => {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-blue-500" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
          </div>
          <div>{icon}</div>
        </div>
        <div className="mt-2 flex items-center">
          {change > 0 ? (
            <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
          ) : (
            <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span
            className={`text-sm ${
              change > 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {change > 0 ? "+" : ""}
            {change}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductAnalytics;
