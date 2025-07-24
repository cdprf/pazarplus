import logger from "../../utils/logger";
/**
 * Customer Profile Component
 * Shows customer details and order history based on email/name matching
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  ShoppingBag,
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  Clock,
  MapPin,
  Heart,
  Activity,
  BarChart3,
  Search,
  HelpCircle,
} from "lucide-react";
import api from "../../services/api";
import { useAlert } from "../../contexts/AlertContext";
import { formatCurrency, formatDate } from "../../utils/platformHelpers";

const CustomerProfile = () => {
  const { email } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useAlert();

  const [customer, setCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerQuestions, setCustomerQuestions] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState("all"); // all, recent, high-value
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    averageOrderValue: 0,
    firstOrderDate: null,
    lastOrderDate: null,
    favoriteProducts: [],
    favoritePlatforms: [],
    monthlySpending: [],
    topCategories: [],
    loyaltyScore: 0,
    riskLevel: "low",
  });

  const fetchCustomerData = useCallback(async () => {
    try {
      setLoading(true);

      // First, sync customers to ensure we have the latest data
      try {
        await api.post("/customers/sync");
      } catch (syncError) {
        logger.warn(
          "Customer sync failed, proceeding with existing data:",
          syncError.message
        );
      }

      // Try to get customer from the customers table first
      try {
        const customerResponse = await api.get(
          `/customers/by-email/${encodeURIComponent(email)}`
        );
        if (customerResponse.data.success && customerResponse.data.data) {
          const customerData = customerResponse.data.data;
          setCustomer(customerData);
          setCustomerOrders(customerData.orders || []);
          setFilteredOrders(customerData.orders || []);

          // Use backend-provided stats instead of recalculating
          setStats({
            totalOrders: customerData.totalOrders || 0,
            totalSpent: parseFloat(customerData.totalSpent) || 0,
            averageOrderValue: parseFloat(customerData.averageOrderValue) || 0,
            firstOrderDate: customerData.firstOrderDate
              ? new Date(customerData.firstOrderDate)
              : null,
            lastOrderDate: customerData.lastOrderDate
              ? new Date(customerData.lastOrderDate)
              : null,
            favoriteProducts: customerData.favoriteProducts || [],
            favoritePlatforms: customerData.platformUsage
              ? Object.entries(customerData.platformUsage).map(
                  ([platform, count]) => ({ platform, count })
                )
              : [],
            loyaltyScore: customerData.loyaltyScore || 0,
            riskLevel: customerData.riskLevel || "low",
            primaryPlatform: customerData.primaryPlatform || "unknown",
            platformUsage: customerData.platformUsage || {},
            favoriteCategories: customerData.favoriteCategories || [],
            monthlySpending: [],
            topCategories: [],
          });
          return;
        }
      } catch (customerError) {
        logger.warn(
          "Customer not found in customers table, falling back to orders search"
        );
      }

      // Fallback: search orders by email if customer not found in customers table
      const ordersResponse = await api.get(`/api/order-management/orders`, {
        params: {
          search: email,
          limit: 1000, // Get all orders for this customer
        },
      });

      if (ordersResponse.data.success) {
        const allOrders = ordersResponse.data.data.orders || [];

        // Filter orders that match this customer's email
        const customerOrders = allOrders.filter(
          (order) =>
            order.customerEmail === email ||
            order.customerName
              ?.toLowerCase()
              .includes(decodeURIComponent(email).toLowerCase())
        );

        setCustomerOrders(customerOrders);
        setFilteredOrders(customerOrders);

        // Build customer profile from order data
        if (customerOrders.length > 0) {
          const firstOrder = customerOrders[0];

          // Extract shipping addresses from orders
          const addresses = customerOrders
            .filter((order) => order.shippingAddress)
            .map((order) => order.shippingAddress)
            .reduce((unique, address) => {
              const addressKey = `${address.city}-${address.district}`;
              if (
                !unique.find((a) => `${a.city}-${a.district}` === addressKey)
              ) {
                unique.push(address);
              }
              return unique;
            }, []);

          setCustomer({
            name: firstOrder.customerName,
            email: firstOrder.customerEmail,
            phone: firstOrder.customerPhone,
            addresses: addresses,
            registrationDate:
              customerOrders[customerOrders.length - 1]?.orderDate, // First order date as registration
          });

          // Calculate customer statistics
          calculateCustomerStats(customerOrders);
        }
      }

      // Fetch customer questions
      try {
        const questionsResponse = await api.get(
          `/customer-questions/by-customer/${encodeURIComponent(email)}`
        );
        if (questionsResponse.data.success) {
          setCustomerQuestions(questionsResponse.data.data || []);
        }
      } catch (questionsError) {
        logger.warn(
          "Error fetching customer questions:",
          questionsError.message
        );
        // Don't show error to user as questions are additional info
      }
    } catch (error) {
      logger.error("Error fetching customer data:", error);
      showNotification("Müşteri bilgileri yüklenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  }, [email, showNotification]);

  useEffect(() => {
    if (email) {
      fetchCustomerData();
    }
  }, [email, fetchCustomerData]);

  const calculateCustomerStats = (orders) => {
    if (orders.length === 0) return;

    const totalSpent = orders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0
    );
    const orderDates = orders.map((order) => new Date(order.orderDate)).sort();

    // Product frequency analysis
    const productFrequency = {};
    const platformFrequency = {};
    const categoryFrequency = {};
    const monthlySpending = {};

    orders.forEach((order) => {
      // Count platform usage
      if (order.platform) {
        platformFrequency[order.platform] =
          (platformFrequency[order.platform] || 0) + 1;
      }

      // Monthly spending analysis
      const monthKey = new Date(order.orderDate).toISOString().slice(0, 7); // YYYY-MM
      monthlySpending[monthKey] =
        (monthlySpending[monthKey] || 0) + (order.totalAmount || 0);

      // Count product purchases (if order items are available)
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          const productKey =
            item.title || item.productName || "Bilinmeyen Ürün";
          productFrequency[productKey] =
            (productFrequency[productKey] || 0) + item.quantity;

          // Category analysis
          if (item.category) {
            categoryFrequency[item.category] =
              (categoryFrequency[item.category] || 0) + item.quantity;
          }
        });
      }
    });

    // Calculate loyalty score based on various factors
    const daysSinceFirstOrder =
      (new Date() - orderDates[0]) / (1000 * 60 * 60 * 24);
    const orderFrequency = orders.length / (daysSinceFirstOrder / 30); // orders per month
    const avgOrderValue = totalSpent / orders.length;
    const platformLoyalty =
      Math.max(...Object.values(platformFrequency)) / orders.length;

    const loyaltyScore = Math.min(
      100,
      Math.round(
        orderFrequency * 20 +
          avgOrderValue / 100 +
          platformLoyalty * 30 +
          orders.length * 2
      )
    );

    // Risk assessment
    const daysSinceLastOrder =
      (new Date() - orderDates[orderDates.length - 1]) / (1000 * 60 * 60 * 24);
    let riskLevel = "low";
    if (daysSinceLastOrder > 90) riskLevel = "high";
    else if (daysSinceLastOrder > 30) riskLevel = "medium";

    // Sort and get top items
    const favoriteProducts = Object.entries(productFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([product, count]) => ({ product, count }));

    const favoritePlatforms = Object.entries(platformFrequency)
      .sort(([, a], [, b]) => b - a)
      .map(([platform, count]) => ({ platform, count }));

    const topCategories = Object.entries(categoryFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category, count]) => ({ category, count }));

    const monthlySpendingArray = Object.entries(monthlySpending)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // Last 12 months
      .map(([month, amount]) => ({ month, amount }));

    setStats({
      totalOrders: orders.length,
      totalSpent,
      averageOrderValue: avgOrderValue,
      firstOrderDate: orderDates[0],
      lastOrderDate: orderDates[orderDates.length - 1],
      favoriteProducts,
      favoritePlatforms,
      monthlySpending: monthlySpendingArray,
      topCategories,
      loyaltyScore,
      riskLevel,
    });
  };

  // Filter orders based on selected filter
  const handleFilterChange = (filter) => {
    setOrderFilter(filter);
    let filtered = [...customerOrders];

    switch (filter) {
      case "recent":
        filtered = filtered.filter((order) => {
          const orderDate = new Date(order.orderDate);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return orderDate >= thirtyDaysAgo;
        });
        break;
      case "high-value":
        const avgValue = stats.averageOrderValue;
        filtered = filtered.filter(
          (order) => (order.totalAmount || 0) > avgValue
        );
        break;
      default:
        // "all" - no additional filtering
        break;
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          order.platform?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  };

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    handleFilterChange(orderFilter); // Re-apply current filter with search
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return statusMap[status] || "bg-gray-100 text-gray-800";
  };

  const getPlatformBadgeClass = (platform) => {
    const platformMap = {
      trendyol: "bg-orange-100 text-orange-800",
      hepsiburada: "bg-blue-100 text-blue-800",
      n11: "bg-purple-100 text-purple-800",
    };
    return platformMap[platform?.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  // Helper function to parse shipping address
  const parseShippingAddress = (addressData) => {
    if (!addressData) return null;

    // If it's already a proper object
    if (typeof addressData === "object" && addressData.address) {
      return addressData;
    }

    // If it's stored as individual characters (like in the API response)
    if (
      Array.isArray(addressData) ||
      (typeof addressData === "object" && addressData["0"])
    ) {
      try {
        // Reconstruct the string from character array
        const charArray = Array.isArray(addressData)
          ? addressData
          : Object.values(addressData);
        const jsonString = charArray.join("");
        return JSON.parse(jsonString);
      } catch (error) {
        logger.warn("Failed to parse shipping address:", error);
        return null;
      }
    }

    // If it's a JSON string
    if (typeof addressData === "string") {
      try {
        return JSON.parse(addressData);
      } catch (error) {
        logger.warn("Failed to parse address string:", error);
        return null;
      }
    }

    return null;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-600 dark:text-gray-400">
            Müşteri bilgileri yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center py-12">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Müşteri Bulunamadı
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Bu e-posta adresine ait müşteri bilgisi bulunamadı.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {customer.name || "İsimsiz Müşteri"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Müşteri olma tarihi:{" "}
              {stats.firstOrderDate ? formatDate(stats.firstOrderDate) : "N/A"}{" "}
              •{stats.totalOrders} sipariş
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span
            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              stats.loyaltyScore >= 70
                ? "bg-green-100 text-green-800"
                : stats.loyaltyScore >= 40
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {stats.loyaltyScore >= 70
              ? "VIP Müşteri"
              : stats.loyaltyScore >= 40
              ? "Sadık Müşteri"
              : "Yeni Müşteri"}
          </span>

          <span
            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              stats.riskLevel === "low"
                ? "bg-green-100 text-green-800"
                : stats.riskLevel === "medium"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            Risk:{" "}
            {stats.riskLevel === "low"
              ? "Düşük"
              : stats.riskLevel === "medium"
              ? "Orta"
              : "Yüksek"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Müşteri Bilgileri
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {customer.email && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Mail className="h-4 w-4 mr-3 text-gray-400" />
                    <span>{customer.email}</span>
                  </div>
                )}

                {customer.phone && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Phone className="h-4 w-4 mr-3 text-gray-400" />
                    <span>{customer.phone}</span>
                  </div>
                )}

                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4 mr-3 text-gray-400" />
                  <span>
                    İlk Sipariş:{" "}
                    {stats.firstOrderDate
                      ? formatDate(stats.firstOrderDate)
                      : "N/A"}
                  </span>
                </div>

                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4 mr-3 text-gray-400" />
                  <span>
                    Son Sipariş:{" "}
                    {stats.lastOrderDate
                      ? formatDate(stats.lastOrderDate)
                      : "N/A"}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Sadakat Skoru
                    </span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {stats.loyaltyScore}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full"
                      style={{ width: `${stats.loyaltyScore}%` }}
                    ></div>
                  </div>
                </div>

                {customer.addresses && customer.addresses.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Sık Kullanılan Adresler
                    </h4>
                    {customer.addresses.slice(0, 2).map((address, index) => (
                      <div
                        key={index}
                        className="text-sm text-gray-600 dark:text-gray-400 mb-1"
                      >
                        <MapPin className="h-3 w-3 inline mr-1" />
                        {address.city}, {address.district}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center">
                <ShoppingBag className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.totalOrders}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Toplam Sipariş
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(stats.totalSpent)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Toplam Harcama
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(stats.averageOrderValue)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ortalama Sipariş
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-orange-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.favoritePlatforms.length}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Aktif Platform
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div
            id="orders-section"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Sipariş Geçmişi ({customerOrders.length})
                </h2>

                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Sipariş ara..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>

                  <select
                    value={orderFilter}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="all">Tüm Siparişler</option>
                    <option value="recent">Son 30 Gün</option>
                    <option value="high-value">Yüksek Değerli</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Sipariş
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tutar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {(searchQuery || orderFilter !== "all"
                    ? filteredOrders
                    : customerOrders
                  ).map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {order.orderNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlatformBadgeClass(
                            order.platform
                          )}`}
                        >
                          {order.platform}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(
                            order.orderStatus
                          )}`}
                        >
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(order.totalAmount, order.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(order)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400">
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="hover:text-blue-800 dark:hover:text-blue-200"
                        >
                          Detay Gör
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {customerOrders.length === 0 && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  Bu müşteriye ait sipariş bulunamadı.
                </p>
              </div>
            )}
          </div>

          {/* Customer Questions Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <HelpCircle className="w-5 h-5 mr-2" />
                Müşteri Soruları ({customerQuestions.length})
              </h2>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {customerQuestions.length > 0 ? (
                customerQuestions.slice(0, 5).map((question) => (
                  <div key={question.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              question.platform === "trendyol"
                                ? "bg-orange-100 text-orange-800"
                                : question.platform === "hepsiburada"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {question.platform}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              question.status === "ANSWERED"
                                ? "bg-green-100 text-green-800"
                                : question.status === "WAITING_FOR_ANSWER"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {question.status === "ANSWERED"
                              ? "Cevaplandı"
                              : question.status === "WAITING_FOR_ANSWER"
                              ? "Cevap Bekliyor"
                              : question.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                          {question.question_text}
                        </p>
                        {question.product_name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Ürün: {question.product_name}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatDate(question.creation_date)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Bu müşteriye ait soru bulunamadı.
                  </p>
                </div>
              )}
            </div>

            {customerQuestions.length > 5 && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() =>
                    navigate("/customer-questions", {
                      state: { filterByCustomer: customer.email },
                    })
                  }
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Tüm Soruları Görüntüle ({customerQuestions.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Analytics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Müşteri Analizi
            </h2>

            {/* Loyalty Score */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sadakat Skoru
                </span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {stats.loyaltyScore}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stats.loyaltyScore}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Sipariş sıklığı, platform sadakati ve harcama miktarına göre
              </p>
            </div>

            {/* Risk Assessment */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Risk Durumu
                </span>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    stats.riskLevel === "low"
                      ? "bg-green-100 text-green-800"
                      : stats.riskLevel === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {stats.riskLevel === "low"
                    ? "Düşük"
                    : stats.riskLevel === "medium"
                    ? "Orta"
                    : "Yüksek"}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Son sipariş tarihine göre kaybetme riski
              </p>
            </div>

            {/* Favorite Platforms */}
            {stats.favoritePlatforms && stats.favoritePlatforms.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tercih Edilen Platformlar
                </h4>
                <div className="space-y-2">
                  {stats.favoritePlatforms
                    .slice(0, 3)
                    .map((platform, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getPlatformBadgeClass(
                            platform.platform
                          )}`}
                        >
                          {platform.platform}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {platform.count} sipariş
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Top Categories */}
            {stats.topCategories && stats.topCategories.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  En Çok Satın Alınan Kategoriler
                </h4>
                <div className="space-y-2">
                  {stats.topCategories.map((category, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-700 dark:text-gray-300">
                        {category.category}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {category.count} ürün
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Shipping Information */}
          {customer.addresses && customer.addresses.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Teslimat Adresleri
              </h2>
              <div className="space-y-3">
                {customer.shippingAddresses &&
                customer.shippingAddresses.length > 0 ? (
                  customer.shippingAddresses.map((addressData, index) => {
                    const address = parseShippingAddress(addressData);
                    if (!address) return null;

                    return (
                      <div
                        key={index}
                        className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {address.fullName || customer.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {address.address}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {address.neighborhood && `${address.neighborhood}, `}
                          {address.district && `${address.district}, `}
                          {address.city} {address.postalCode}
                        </div>
                        {address.gsm && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Tel: {address.gsm}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Kayıtlı adres bulunamadı
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Favorite Products */}
          {stats.favoriteProducts && stats.favoriteProducts.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <Heart className="w-5 h-5 mr-2" />
                Favori Ürünler
              </h2>
              <div className="space-y-3">
                {stats.favoriteProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                        {product.product || product.name || "Bilinmeyen Ürün"}
                      </div>
                      {product.sku && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          SKU: {product.sku}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {product.count || product.purchaseCount || 0}x
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Müşteri İşlemleri
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => {
                  // Scroll to orders section
                  const ordersSection =
                    document.getElementById("orders-section");
                  if (ordersSection) {
                    ordersSection.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="w-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Siparişlere Git
              </button>

              <button
                onClick={() => {
                  const subject = `Müşteri Takibi: ${customer.name}`;
                  const body = `Merhaba ${customer.name},\n\nSizinle iletişime geçiyoruz...`;
                  window.location.href = `mailto:${
                    customer.email
                  }?subject=${encodeURIComponent(
                    subject
                  )}&body=${encodeURIComponent(body)}`;
                }}
                className="w-full bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-800 dark:text-green-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                E-posta Gönder
              </button>

              {customer.phone && (
                <button
                  onClick={() =>
                    (window.location.href = `tel:${customer.phone}`)
                  }
                  className="w-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-800 dark:text-purple-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Telefon Et
                </button>
              )}
            </div>
          </div>

          {/* Monthly Spending Trend */}
          {stats.monthlySpending.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Aylık Harcama Trendi
              </h2>
              <div className="space-y-2">
                {stats.monthlySpending.slice(-6).map((month, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600 dark:text-gray-400">
                      {new Date(month.month + "-01").toLocaleDateString(
                        "tr-TR",
                        {
                          year: "numeric",
                          month: "long",
                        }
                      )}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(month.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
