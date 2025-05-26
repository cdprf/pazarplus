import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Download,
  RefreshCw,
  Users,
  Package,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/Tabs";
import { useAlert } from "../../contexts/AlertContext";
import api from "../../services/api";

const Reports = () => {
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("7days");

  // Analytics data state
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    totalCustomers: 0,
    conversionRate: 0,
    topProducts: [],
    platformBreakdown: [],
    recentTrends: [],
  });

  const [trends, setTrends] = useState([]);
  const [platformStats, setPlatformStats] = useState([]);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch order statistics
      const statsResponse = await api.getOrderStats();
      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      // Fetch order trends
      const trendsResponse = await api.getOrderTrends(selectedPeriod);
      if (trendsResponse.success) {
        setTrends(trendsResponse.data);
      }

      // Fetch platform breakdown
      const platformResponse = await api.getPlatformStats(selectedPeriod);
      if (platformResponse.success) {
        setPlatformStats(platformResponse.data);
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      showAlert("Analiz verileri yüklenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, showAlert]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
    showAlert("Veriler güncellendi", "success");
  };

  const handleExportReport = async (type) => {
    try {
      const response = await api.exportReport(type, {
        period: selectedPeriod,
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${type}-report-${new Date().toISOString().split("T")[0]}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      showAlert("Rapor başarıyla indirildi", "success");
    } catch (error) {
      console.error("Error exporting report:", error);
      showAlert("Rapor indirilemedi", "error");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return ArrowUp;
    if (trend < 0) return ArrowDown;
    return Minus;
  };

  const getTrendColor = (trend) => {
    if (trend > 0) return "text-green-500";
    if (trend < 0) return "text-red-500";
    return "text-gray-500";
  };

  const getPlatformColor = (platform) => {
    switch (platform?.toLowerCase()) {
      case "trendyol":
        return "bg-orange-500";
      case "hepsiburada":
        return "bg-orange-600";
      case "n11":
        return "bg-purple-500";
      case "amazon":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPlatformVariant = (platform) => {
    switch (platform?.toLowerCase()) {
      case "trendyol":
        return "warning";
      case "hepsiburada":
        return "info";
      case "n11":
        return "purple";
      case "amazon":
        return "secondary";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <div className="spinner spinner-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center">
            <div className="stat-icon stat-icon-primary mr-4">
              <BarChart3 className="h-8 w-8" />
            </div>
            Raporlar ve Analitik
          </h1>
          <p className="page-subtitle">
            Satış performansınızı ve iş analitiğinizi görüntüleyin
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="form-input"
          >
            <option value="7days">Son 7 Gün</option>
            <option value="30days">Son 30 Gün</option>
            <option value="90days">Son 3 Ay</option>
            <option value="1year">Son 1 Yıl</option>
          </select>
          <Button
            onClick={handleRefresh}
            variant="outline"
            icon={RefreshCw}
            loading={refreshing}
          >
            Yenile
          </Button>
          <Button
            onClick={() => handleExportReport("sales")}
            variant="success"
            icon={Download}
          >
            Rapor İndir
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalOrders?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Toplam Sipariş
                </div>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            {stats.ordersTrend !== undefined && (
              <div className="flex items-center mt-2">
                {React.createElement(getTrendIcon(stats.ordersTrend), {
                  className: `h-4 w-4 mr-1 ${getTrendColor(stats.ordersTrend)}`,
                })}
                <span className={`text-sm ${getTrendColor(stats.ordersTrend)}`}>
                  {formatPercentage(Math.abs(stats.ordersTrend))}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                  önceki döneme göre
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(stats.totalRevenue || 0)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Toplam Gelir
                </div>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            {stats.revenueTrend !== undefined && (
              <div className="flex items-center mt-2">
                {React.createElement(getTrendIcon(stats.revenueTrend), {
                  className: `h-4 w-4 mr-1 ${getTrendColor(
                    stats.revenueTrend
                  )}`,
                })}
                <span
                  className={`text-sm ${getTrendColor(stats.revenueTrend)}`}
                >
                  {formatPercentage(Math.abs(stats.revenueTrend))}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                  önceki döneme göre
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(stats.averageOrderValue || 0)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Ortalama Sipariş Değeri
                </div>
              </div>
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/20">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            {stats.aovTrend !== undefined && (
              <div className="flex items-center mt-2">
                {React.createElement(getTrendIcon(stats.aovTrend), {
                  className: `h-4 w-4 mr-1 ${getTrendColor(stats.aovTrend)}`,
                })}
                <span className={`text-sm ${getTrendColor(stats.aovTrend)}`}>
                  {formatPercentage(Math.abs(stats.aovTrend))}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                  önceki döneme göre
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalCustomers?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Toplam Müşteri
                </div>
              </div>
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/20">
                <Users className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            {stats.customersTrend !== undefined && (
              <div className="flex items-center mt-2">
                {React.createElement(getTrendIcon(stats.customersTrend), {
                  className: `h-4 w-4 mr-1 ${getTrendColor(
                    stats.customersTrend
                  )}`,
                })}
                <span
                  className={`text-sm ${getTrendColor(stats.customersTrend)}`}
                >
                  {formatPercentage(Math.abs(stats.customersTrend))}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                  önceki döneme göre
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="platforms">Platform Analizi</TabsTrigger>
          <TabsTrigger value="products">Ürün Performansı</TabsTrigger>
          <TabsTrigger value="customers">Müşteri Analizi</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                  Satış Trendi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trends.length > 0 ? (
                  <div className="space-y-4">
                    {trends.slice(0, 7).map((trend, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {new Date(trend.date).toLocaleDateString("tr-TR")}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {trend.orders} sipariş
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrency(trend.revenue)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Gelir
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Henüz trend verisi bulunmuyor
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Platform Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="w-5 h-5 mr-2 text-green-600" />
                  Platform Dağılımı
                </CardTitle>
              </CardHeader>
              <CardContent>
                {platformStats.length > 0 ? (
                  <div className="space-y-4">
                    {platformStats.map((platform, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-3 h-3 rounded-full mr-3 ${getPlatformColor(
                              platform.name
                            )}`}
                          ></div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                              {platform.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {platform.orders} sipariş
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrency(platform.revenue)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatPercentage(platform.percentage)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Platform verisi bulunmuyor
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Platform Analysis Tab */}
        <TabsContent value="platforms">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformStats.map((platform, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="capitalize">{platform.name}</span>
                    <Badge
                      variant={
                        platform.name === "trendyol"
                          ? "warning"
                          : platform.name === "hepsiburada"
                          ? "info"
                          : "purple"
                      }
                    >
                      {formatPercentage(platform.percentage)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Toplam Sipariş
                      </span>
                      <span className="text-sm font-medium">
                        {platform.orders}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Toplam Gelir
                      </span>
                      <span className="text-sm font-medium">
                        {formatCurrency(platform.revenue)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Ortalama Sipariş
                      </span>
                      <span className="text-sm font-medium">
                        {formatCurrency(platform.avgOrderValue)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Dönüşüm Oranı
                      </span>
                      <span className="text-sm font-medium">
                        {formatPercentage(platform.conversionRate)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Product Performance Tab */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>En Çok Satan Ürünler</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topProducts?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                          Ürün
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                          Platform
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                          Satış
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                          Gelir
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {stats.topProducts.map((product, index) => (
                        <tr key={index}>
                          <td className="py-3 px-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {product.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              SKU: {product.sku}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={getPlatformVariant(product.platform)}
                            >
                              {product.platform}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {product.sales}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(product.revenue)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Ürün performans verisi bulunmuyor
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Analysis Tab */}
        <TabsContent value="customers">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Müşteri Segmentasyonu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Yeni Müşteriler
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        İlk kez alışveriş yapan
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {stats.newCustomers || 0}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatPercentage(
                          (stats.newCustomers / stats.totalCustomers) * 100 || 0
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Sadık Müşteriler
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        3+ sipariş vermiş
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {stats.loyalCustomers || 0}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatPercentage(
                          (stats.loyalCustomers / stats.totalCustomers) * 100 ||
                            0
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Müşteri Yaşam Döngüsü Değeri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {formatCurrency(stats.customerLifetimeValue || 0)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Ortalama Müşteri Yaşam Döngüsü Değeri
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {stats.avgOrdersPerCustomer?.toFixed(1) || "0.0"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Müşteri başına ortalama sipariş
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {stats.repeatPurchaseRate
                          ? formatPercentage(stats.repeatPurchaseRate)
                          : "0%"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Tekrar alışveriş oranı
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
