import logger from "../../utils/logger";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  BarChart3,
  TrendingUp,
  Target,
  UserCheck,
  ArrowLeft,
} from "lucide-react";
import api from "../../services/api";
import { useAlert } from "../../contexts/AlertContext";
import { formatCurrency, formatDate } from "../../utils/platformHelpers";

const CustomerManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useAlert();

  // Determine current view based on route
  const getCurrentView = () => {
    const path = location.pathname;
    if (path.includes("/analytics")) return "analytics";
    if (path.includes("/segments")) return "segments";
    if (path.includes("/orders")) return "orders";
    if (path.includes("/profiles")) return "profiles";
    return "list";
  };

  const currentView = getCurrentView();

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
        logger.warn(
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
      logger.error("Error fetching customers:", error);
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
      logger.error("Error exporting customers:", error);
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

  // Get view-specific configuration
  const getViewConfig = () => {
    switch (currentView) {
      case "analytics":
        return {
          title: "Müşteri Analitikleri",
          description: "Müşteri davranış analizi ve istatistikleri",
          icon: BarChart3,
        };
      case "segments":
        return {
          title: "Müşteri Segmentleri",
          description: "Müşteri grup analizi ve segmentasyon",
          icon: Target,
        };
      case "orders":
        return {
          title: "Müşteri Siparişleri",
          description: "Müşteri sipariş geçmişi ve analizi",
          icon: Package,
        };
      case "profiles":
        return {
          title: "Müşteri Profilleri",
          description: "Detaylı müşteri profil görünümü",
          icon: UserCheck,
        };
      default:
        return {
          title: "Müşteri Yönetimi",
          description: "Sipariş geçmişinden türetilen müşteri analizi",
          icon: Users,
        };
    }
  };

  const viewConfig = getViewConfig();

  // Render different views based on current route
  const renderViewContent = () => {
    switch (currentView) {
      case "analytics":
        return renderAnalyticsView();
      case "segments":
        return renderSegmentsView();
      case "orders":
        return renderOrdersView();
      case "profiles":
        return renderProfilesView();
      default:
        return renderCustomerList();
    }
  };

  const renderAnalyticsView = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center mb-4">
          <TrendingUp className="h-6 w-6 text-blue-600 mr-3" />
          <h3 className="text-lg font-semibold">Müşteri Analitikleri</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Bu bölümde müşteri davranış analizi, satın alma desenleri ve müşteri
          yaşam döngüsü analizi yer alacak.
        </p>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {stats.totalCustomers || 0}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Toplam Müşteri
                </p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {formatCurrency(stats.totalRevenue || 0)}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Toplam Gelir
                </p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {stats.vipCustomers || 0}
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  VIP Müşteri
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={() => navigate("/customers")}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Müşteri Listesine Dön
          </button>
        </div>
      </div>
    </div>
  );

  const renderSegmentsView = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center mb-4">
          <Target className="h-6 w-6 text-purple-600 mr-3" />
          <h3 className="text-lg font-semibold">Müşteri Segmentleri</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Bu bölümde müşteri segmentasyonu, VIP müşteriler, risk altındaki
          müşteriler ve yeni müşteri analizi yer alacak.
        </p>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <Star className="h-6 w-6 text-purple-600 mr-2" />
              <div>
                <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                  {stats.vipCustomers || 0}
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  VIP Müşteriler
                </p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <UserCheck className="h-6 w-6 text-blue-600 mr-2" />
              <div>
                <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                  {Math.round(
                    (stats.totalCustomers -
                      stats.vipCustomers -
                      stats.atRiskCustomers) *
                      0.6
                  ) || 0}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Sadık Müşteriler
                </p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="h-6 w-6 text-green-600 mr-2" />
              <div>
                <p className="text-xl font-bold text-green-900 dark:text-green-100">
                  {Math.round(
                    (stats.totalCustomers -
                      stats.vipCustomers -
                      stats.atRiskCustomers) *
                      0.4
                  ) || 0}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Yeni Müşteriler
                </p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
              <div>
                <p className="text-xl font-bold text-red-900 dark:text-red-100">
                  {stats.atRiskCustomers || 0}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Risk Altında
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={() => navigate("/customers")}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Müşteri Listesine Dön
          </button>
        </div>
      </div>
    </div>
  );

  const renderOrdersView = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center mb-4">
          <Package className="h-6 w-6 text-green-600 mr-3" />
          <h3 className="text-lg font-semibold">Müşteri Siparişleri</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Bu bölümde müşteri sipariş geçmişi, sipariş analizi ve müşteri satın
          alma davranışları yer alacak.
        </p>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {customers.reduce(
                    (sum, customer) => sum + (customer.totalOrders || 0),
                    0
                  )}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Toplam Sipariş
                </p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {formatCurrency(
                    customers.reduce(
                      (sum, customer) => sum + (customer.totalSpent || 0),
                      0
                    )
                  )}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Toplam Satış
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={() => navigate("/customers")}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Müşteri Listesine Dön
          </button>
        </div>
      </div>
    </div>
  );

  const renderProfilesView = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center mb-4">
          <UserCheck className="h-6 w-6 text-indigo-600 mr-3" />
          <h3 className="text-lg font-semibold">Müşteri Profilleri</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Bu bölümde detaylı müşteri profilleri, iletişim bilgileri ve müşteri
          tercihleri yer alacak.
        </p>
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.slice(0, 6).map((customer, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
              >
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {customer.name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {customer.name || "Bilinmeyen"}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {customer.email}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Sipariş:
                    </span>
                    <span className="font-medium">
                      {customer.totalOrders || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Harcama:
                    </span>
                    <span className="font-medium">
                      {formatCurrency(customer.totalSpent || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Tip:
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getCustomerTypeBadge(
                        customer.customerType
                      )}`}
                    >
                      {customer.customerType === "vip"
                        ? "VIP"
                        : customer.customerType === "loyal"
                        ? "Sadık"
                        : customer.customerType === "new"
                        ? "Yeni"
                        : "Normal"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={() => navigate("/customers")}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Müşteri Listesine Dön
          </button>
        </div>
      </div>
    </div>
  );

  const renderCustomerList = () => (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalCustomers || 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
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
                {stats.vipCustomers || 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
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
                {stats.atRiskCustomers || 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
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
                {formatCurrency(stats.totalRevenue || 0)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Toplam Gelir
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Müşteri ara (isim veya email)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <select
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={filters.customerType}
              onChange={(e) =>
                setFilters({ ...filters, customerType: e.target.value })
              }
            >
              <option value="all">Tüm Müşteriler</option>
              <option value="vip">VIP</option>
              <option value="loyal">Sadık</option>
              <option value="new">Yeni</option>
            </select>

            <select
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={filters.riskLevel}
              onChange={(e) =>
                setFilters({ ...filters, riskLevel: e.target.value })
              }
            >
              <option value="all">Tüm Risk Seviyeleri</option>
              <option value="low">Düşük Risk</option>
              <option value="medium">Orta Risk</option>
              <option value="high">Yüksek Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              Müşteri bulunamadı
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Henüz hiç müşteri kaydı yok veya arama kriterlerinize uygun
              müşteri bulunamadı.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Müşteri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    İletişim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Sipariş İstatistikleri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Müşteri Tipi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Risk Seviyesi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Son Sipariş
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {customers.map((customer, index) => (
                  <tr
                    key={customer.id || customer.email || index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {customer.name?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {customer.name || "Bilinmeyen"}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {customer.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        {customer.email && (
                          <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                          <Package className="w-4 h-4 mr-2 text-gray-400" />
                          {customer.totalOrders || 0} sipariş
                        </div>
                        <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                          <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                          {formatCurrency(customer.totalSpent || 0)}
                        </div>
                        {customer.averageOrderValue && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Ort: {formatCurrency(customer.averageOrderValue)}
                          </div>
                        )}
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
                          : customer.customerType === "new"
                          ? "Yeni"
                          : "Normal"}
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
                          : customer.riskLevel === "high"
                          ? "Yüksek"
                          : "Bilinmeyen"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {customer.lastOrderDate
                            ? formatDate(customer.lastOrderDate)
                            : "Hiçbir zaman"}
                        </div>
                        {customer.primaryPlatform && (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlatformBadge(
                              customer.primaryPlatform
                            )}`}
                          >
                            {customer.primaryPlatform}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewCustomer(customer)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Görüntüle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Önceki
            </button>
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Sayfa <span className="font-medium">{currentPage}</span> /{" "}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Önceki
                </button>
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sonraki
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <viewConfig.icon className="mr-3" />
            {viewConfig.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {viewConfig.description}
          </p>
        </div>
        <div className="flex space-x-3">
          {currentView === "list" && (
            <button
              onClick={exportCustomers}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Dışa Aktar
            </button>
          )}
        </div>
      </div>

      {/* Render view-specific content */}
      {renderViewContent()}
    </div>
  );
};

export default CustomerManagement;
