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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    averageOrderValue: 0,
    firstOrderDate: null,
    lastOrderDate: null,
    favoriteProducts: [],
    favoritePlatforms: [],
  });

  useEffect(() => {
    if (email) {
      fetchCustomerData();
    }
  }, [email]);

  const fetchCustomerData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all orders for this customer (by email)
      const ordersResponse = await api.get(`/api/orders`, {
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

        // Build customer profile from order data
        if (customerOrders.length > 0) {
          const firstOrder = customerOrders[0];
          setCustomer({
            name: firstOrder.customerName,
            email: firstOrder.customerEmail,
            phone: firstOrder.customerPhone,
            // We could add more fields here if available in orders
          });

          // Calculate customer statistics
          calculateCustomerStats(customerOrders);
        }
      }
    } catch (error) {
      console.error("Error fetching customer data:", error);
      showNotification("Müşteri bilgileri yüklenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  }, [email, showNotification]);

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

    orders.forEach((order) => {
      // Count platform usage
      if (order.platform) {
        platformFrequency[order.platform] =
          (platformFrequency[order.platform] || 0) + 1;
      }

      // Count product purchases (if order items are available)
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          const productKey =
            item.title || item.productName || "Bilinmeyen Ürün";
          productFrequency[productKey] =
            (productFrequency[productKey] || 0) + item.quantity;
        });
      }
    });

    // Sort and get top items
    const favoriteProducts = Object.entries(productFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([product, count]) => ({ product, count }));

    const favoritePlatforms = Object.entries(platformFrequency)
      .sort(([, a], [, b]) => b - a)
      .map(([platform, count]) => ({ platform, count }));

    setStats({
      totalOrders: orders.length,
      totalSpent,
      averageOrderValue: totalSpent / orders.length,
      firstOrderDate: orderDates[0],
      lastOrderDate: orderDates[orderDates.length - 1],
      favoriteProducts,
      favoritePlatforms,
    });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Geri Dön
          </button>

          <div className="text-center py-12">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Müşteri Bulunamadı
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Bu e-posta adresine ait müşteri bilgisi bulunamadı.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Geri Dön
          </button>
        </div>

        {/* Customer Info Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {customer.name || "İsimsiz Müşteri"}
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customer.email && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>{customer.email}</span>
                  </div>
                )}

                {customer.phone && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>{customer.phone}</span>
                  </div>
                )}

                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>
                    İlk Sipariş:{" "}
                    {stats.firstOrderDate
                      ? formatDate(stats.firstOrderDate)
                      : "N/A"}
                  </span>
                </div>

                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>
                    Son Sipariş:{" "}
                    {stats.lastOrderDate
                      ? formatDate(stats.lastOrderDate)
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
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

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
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

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
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

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.favoritePlatforms.length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Kullanılan Platform
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Sipariş Geçmişi ({customerOrders.length})
            </h2>
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
                {customerOrders.map((order) => (
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
                      {formatDate(order.orderDate)}
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
      </div>
    </div>
  );
};

export default CustomerProfile;
