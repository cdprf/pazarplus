import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  Download,
  Eye,
  Mail,
  Phone,
  Package,
  DollarSign,
  Calendar,
  Star,
  AlertTriangle,
} from "lucide-react";
import api from "../../services/api";
import { useAlert } from "../../contexts/AlertContext";
import { formatCurrency, formatDate } from "../../utils/platformHelpers";

const CustomerManagement = () => {
  const navigate = useNavigate();
  const { showNotification } = useAlert();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    riskLevel: "all", // all, low, medium, high
    customerType: "all", // all, vip, loyal, new
    sortBy: "totalSpent", // name, totalSpent, totalOrders, lastOrder
    sortOrder: "desc",
  });
  const [stats, setStats] = useState({
    totalCustomers: 0,
    vipCustomers: 0,
    atRiskCustomers: 0,
    totalRevenue: 0,
  });

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);

      // First, sync customers from orders to ensure we have the latest data
      try {
        await api.post("/customers/sync");
      } catch (syncError) {
        console.warn(
          "Customer sync failed, proceeding with existing data:",
          syncError.message
        );
      }

      // Fetch customers using the new API
      const response = await api.get(`/customers`, {
        params: {
          page: currentPage,
          limit: 20,
          search: searchTerm,
          customerType: filters.customerType,
          riskLevel: filters.riskLevel,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        },
      });

      if (response.data.success) {
        const customersData = response.data.data;
        setCustomers(customersData.customers || []);
        setTotalPages(customersData.pagination?.totalPages || 1);

        // Fetch statistics
        const statsResponse = await api.get("/customers/stats");
        if (statsResponse.data.success) {
          setStats(statsResponse.data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      showNotification("Müşteriler yüklenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, searchTerm, showNotification]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleViewCustomer = (customer) => {
    navigate(`/customers/${encodeURIComponent(customer.email)}`);
  };

  const exportCustomers = async () => {
    try {
      // Create CSV data from customers
      const csvHeader =
        "Name,Email,Phone,Total Orders,Total Spent,Customer Type,Risk Level,Last Order Date";
      const csvRows = customers.map(
        (customer) =>
          `"${customer.name}","${customer.email}","${customer.phone || ""}",${
            customer.totalOrders
          },${customer.totalSpent},"${customer.customerType}","${
            customer.riskLevel
          }","${formatDate(customer.lastOrderDate)}"`
      );
      const csvContent = [csvHeader, ...csvRows].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `customers-${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showNotification("Müşteriler başarıyla dışa aktarıldı", "success");
    } catch (error) {
      console.error("Error exporting customers:", error);
      showNotification("Müşteriler dışa aktarılırken hata oluştu", "error");
    }
  };

  const getCustomerTypeBadge = (type) => {
    switch (type) {
      case "vip":
        return "bg-purple-100 text-purple-800";
      case "loyal":
        return "bg-blue-100 text-blue-800";
      case "new":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRiskBadge = (risk) => {
    switch (risk) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPlatformBadge = (platform) => {
    switch (platform?.toLowerCase()) {
      case "trendyol":
        return "bg-orange-100 text-orange-800";
      case "hepsiburada":
        return "bg-blue-100 text-blue-800";
      case "n11":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <Users className="mr-3" />
            Müşteri Yönetimi
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Sipariş geçmişinden türetilen müşteri analizi
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportCustomers}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Dışa Aktar
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalCustomers}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Toplam Müşteri
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.vipCustomers}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                VIP Müşteri
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.atRiskCustomers}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Risk Altında
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(stats.totalRevenue)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Toplam Gelir
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Müşteri ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>

          <select
            value={filters.customerType}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, customerType: e.target.value }))
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">Tüm Müşteri Tipleri</option>
            <option value="vip">VIP Müşteriler</option>
            <option value="loyal">Sadık Müşteriler</option>
            <option value="new">Yeni Müşteriler</option>
          </select>

          <select
            value={filters.riskLevel}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, riskLevel: e.target.value }))
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">Tüm Risk Seviyeleri</option>
            <option value="low">Düşük Risk</option>
            <option value="medium">Orta Risk</option>
            <option value="high">Yüksek Risk</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, sortBy: e.target.value }))
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="totalSpent">Harcamaya Göre Sırala</option>
            <option value="name">İsme Göre Sırala</option>
            <option value="totalOrders">Sipariş Sayısına Göre</option>
            <option value="lastOrder">Son Siparişe Göre</option>
          </select>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-4 text-gray-600 dark:text-gray-400">
              Müşteriler yükleniyor...
            </p>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center p-8">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Müşteri bulunamadı
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Arama kriterlerinizi değiştirerek tekrar deneyin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Müşteri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    İletişim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Siparişler
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Harcama
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Müşteri Tipi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Risk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Son Sipariş
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {customers.map((customer) => (
                  <tr
                    key={customer.email}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {customer.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Sadakat: {customer.loyaltyScore}/100
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                          <Mail className="w-3 h-3 mr-1" />
                          {customer.email}
                        </div>
                        {customer.phone && (
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Phone className="w-3 h-3 mr-1" />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                          <Package className="w-3 h-3 mr-1" />
                          {customer.totalOrders} sipariş
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Ort: {formatCurrency(customer.averageOrderValue)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(customer.totalSpent)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <span
                            className={`px-2 py-1 rounded-full ${getPlatformBadge(
                              customer.primaryPlatform
                            )}`}
                          >
                            {customer.primaryPlatform}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCustomerTypeBadge(
                          customer.customerType
                        )}`}
                      >
                        {customer.customerType === "vip"
                          ? "VIP"
                          : customer.customerType === "loyal"
                          ? "Sadık"
                          : "Yeni"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskBadge(
                          customer.riskLevel
                        )}`}
                      >
                        {customer.riskLevel === "low"
                          ? "Düşük"
                          : customer.riskLevel === "medium"
                          ? "Orta"
                          : "Yüksek"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {customer.daysSinceLastOrder} gün önce
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewCustomer(customer)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200 flex items-center"
                        title="Müşteri Detaylarını Görüntüle"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Detay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Sayfa {currentPage} / {totalPages}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                >
                  Önceki
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                >
                  Sonraki
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerManagement;
