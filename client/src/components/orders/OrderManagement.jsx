import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Plus,
  Search,
  Download,
  Edit,
  Eye,
  Truck,
  RefreshCw,
  Filter,
  MoreHorizontal,
  X,
  CheckCircle,
  Clock,
  Package,
  AlertCircle,
  BarChart3,
  ArrowUpDown,
  Loader2,
  AlertTriangle,
  Inbox,
  Printer,
  FileText,
  Ban,
  MapPin,
  Phone,
  Mail,
  User,
  DollarSign,
  Trash2,
  WifiOff,
} from "lucide-react";
import api from "../../services/api";
import { useAlert } from "../../contexts/AlertContext";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import CancelOrderDialog from "../dialogs/CancelOrderDialog";
// import NetworkDebugger from "../NetworkDebugger";

const OrderManagement = React.memo(() => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);

  // State management
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("view");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [syncing, setSyncing] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [recordCount, setRecordCount] = useState(20);
  const [sortConfig, setSortConfig] = useState({
    key: "orderDate",
    direction: "desc",
  });

  // Enhanced filters state with validation
  const [filters, setFilters] = useState({
    status: "all",
    platform: "all",
    dateFrom: "",
    dateTo: "",
    store: "all",
    sortBy: "orderDate",
    sortOrder: "desc",
    priceMin: "",
    priceMax: "",
  });
  const [filterErrors, setFilterErrors] = useState({});

  // Network status for handling server unavailability
  const { isServerReachable, circuitBreakerState } = useNetworkStatus();

  // Enhanced stats state with proper structure
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    claimCreated: 0,
    claimApproved: 0,
    claimRejected: 0,
    totalRevenue: 0,
  });

  // Date range presets
  const datePresets = [
    { label: "Bugün", value: "today" },
    { label: "Son 7 Gün", value: "7days" },
    { label: "Son 30 Gün", value: "30days" },
    { label: "Bu Ay", value: "thisMonth" },
    { label: "Geçen Ay", value: "lastMonth" },
  ];
  // Update stats from actual order data
  const updateStatsFromOrders = useCallback((ordersData) => {
    if (!Array.isArray(ordersData)) {
      console.warn("updateStatsFromOrders: Invalid orders data");
      return;
    }

    const newStats = {
      total: ordersData.length,
      new: 0,
      pending: 0,
      processing: 0,
      shipped: 0,
      in_transit: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
      failed: 0,
      unknown: 0,
      claimCreated: 0,
      claimApproved: 0,
      claimRejected: 0,
      refunded: 0,
      consolidated: 0,
      inBatch: 0,
      totalRevenue: 0,
    };

    ordersData.forEach((order) => {
      // Fix: properly get the status field from the order
      const status = order.status || order.orderStatus || "pending";

      // Handle status mapping for stats (convert underscore to camelCase for specific statuses)
      let statKey = status;
      if (status === "claim_created") statKey = "claimCreated";
      else if (status === "claim_approved") statKey = "claimApproved";
      else if (status === "claim_rejected") statKey = "claimRejected";
      else if (status === "in_batch") statKey = "inBatch";

      if (newStats.hasOwnProperty(statKey)) {
        newStats[statKey]++;
      } else if (newStats.hasOwnProperty(status)) {
        newStats[status]++;
      }

      // Calculate total revenue from delivered orders
      if (status === "delivered" && order.totalAmount) {
        newStats.totalRevenue += parseFloat(order.totalAmount) || 0;
      }
    });

    setStats(newStats);
    console.log("Stats updated from orders:", newStats);
  }, []);

  // Utility functions with better error handling
  const formatCurrency = useCallback((amount, currency = "TRY") => {
    if (!amount || isNaN(amount)) return "₺0,00";

    try {
      const numAmount = parseFloat(amount);
      return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: currency === "TRY" ? "TRY" : "USD",
        minimumFractionDigits: 2,
      }).format(numAmount);
    } catch (error) {
      console.warn("Currency formatting error:", error);
      return `${currency} ${amount}`;
    }
  }, []);

  const formatDate = useCallback((order) => {
    if (!order) return "Tarih yok";

    // Try different date fields with fallbacks
    const dateValue =
      order.displayDate || order.orderDate || order.createdAt || order.date;
    if (!dateValue) return "Tarih yok";

    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "Geçersiz tarih";

      return date.toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.warn("Date formatting error:", error);
      return "Tarih hatası";
    }
  }, []);

  // Enhanced validation function
  const validateFilters = useCallback((filters) => {
    const errors = {};

    if (filters.dateFrom && filters.dateTo) {
      const fromDate = new Date(filters.dateFrom);
      const toDate = new Date(filters.dateTo);

      if (fromDate > toDate) {
        errors.dateRange = "Başlangıç tarihi bitiş tarihinden sonra olamaz";
      }

      const daysDiff = (toDate - fromDate) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        errors.dateRange = "Tarih aralığı 1 yıldan fazla olamaz";
      }
    }

    if (filters.priceMin && filters.priceMax) {
      const minPrice = parseFloat(filters.priceMin);
      const maxPrice = parseFloat(filters.priceMax);

      if (minPrice > maxPrice) {
        errors.priceRange = "Minimum fiyat maksimum fiyattan büyük olamaz";
      }
    }

    return errors;
  }, []);

  // Status and platform helper functions
  const getStatusIcon = useCallback((status) => {
    const iconMap = {
      new: "🆕",
      pending: "⏳",
      confirmed: "✅",
      processing: "⚙️",
      shipped: "🚚",
      in_transit: "🚚",
      delivered: "📦",
      cancelled: "❌",
      returned: "↩️",
      claimCreated: "🆕",
      claimApproved: "✅",
      claimRejected: "❌",
      refunded: "💰",
      failed: "⚠️",
      unknown: "❓",
    };
    return iconMap[status] || "❓";
  }, []);

  const getStatusVariant = useCallback((status) => {
    const variantMap = {
      new: "info",
      pending: "warning",
      confirmed: "info",
      processing: "primary",
      shipped: "info",
      in_transit: "info",
      delivered: "success",
      cancelled: "danger",
      returned: "warning",
      claimCreated: "info",
      claimApproved: "success",
      claimRejected: "danger",
      refunded: "secondary",
      failed: "danger",
      unknown: "secondary",
    };
    return variantMap[status] || "secondary";
  }, []);

  const getStatusText = useCallback((status) => {
    const textMap = {
      new: "Yeni",
      pending: "Beklemede",
      confirmed: "Onaylandı",
      processing: "Hazırlanıyor",
      shipped: "Kargoda",
      in_transit: "Yolda",
      delivered: "Teslim Edildi",
      cancelled: "İptal Edildi",
      returned: "İade Edildi",
      claimCreated: "Talep Oluşturuldu",
      claimApproved: "Talep Onaylandı",
      claimRejected: "Talep Reddedildi",
      refunded: "İade Tamamlandı",
      failed: "Başarısız",
      unknown: "Bilinmeyen",
      claim_created: "Talep Oluşturuldu",
      claim_approved: "Talep Onaylandı",
      claim_rejected: "Talep Reddedildi",
    };
    return textMap[status] || status;
  }, []);

  const getPlatformVariant = useCallback((platform) => {
    const variantMap = {
      trendyol: "primary",
      hepsiburada: "warning",
      n11: "info",
      amazon: "dark",
      default: "secondary",
    };
    return variantMap[platform?.toLowerCase()] || variantMap.default;
  }, []);

  const getPlatformIcon = useCallback((platform) => {
    // Platform icons as SVG or imported images
    const icons = {
      trendyol: (
        <img
          src="https://cdn.brandfetch.io/idEdTxkWAp/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B"
          alt="Trendyol"
          className="inline h-7 w-7 align-middle"
          style={{ display: "inline", verticalAlign: "middle" }}
        />
      ),
      hepsiburada: (
        <img
          src="https://cdn.brandfetch.io/id9XTiaix8/theme/dark/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B"
          alt="Hepsiburada"
          className="inline h-9 w-9 align-middle"
          style={{ display: "inline", verticalAlign: "middle" }}
        />
      ),
      n11: (
        <img
          src="https://cdn.brandfetch.io/idIWnXEme7/theme/dark/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B"
          alt="N11"
          className="inline h-7 w-7 align-middle"
          style={{ display: "inline", verticalAlign: "middle" }}
        />
      ),
      pazarama: (
        <img
          src="https://cdn.pazaryerilogo.com/pazarama.svg"
          alt="Pazarama"
          className="inline h-7 w-7 align-middle"
          style={{ display: "inline", verticalAlign: "middle" }}
        />
      ),
      gittigidiyor: (
        <img
          src="https://cdn.pazaryerilogo.com/gittigidiyor.svg"
          alt="Gittigidiyor"
          className="inline h-7 w-7 align-middle"
          style={{ display: "inline", verticalAlign: "middle" }}
        />
      ),
    };
    return icons[platform?.toLowerCase()] || "📦";
  }, []);
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate filters before API call
      const validationErrors = validateFilters(filters);
      if (Object.keys(validationErrors).length > 0) {
        setFilterErrors(validationErrors);
        return;
      }

      setFilterErrors({});

      const params = {
        page: currentPage,
        limit: recordCount,
        search: searchTerm.trim(),
        ...filters,
      };

      console.log("Fetching orders with params:", params);
      const response = await api.orders.getOrders(params);
      console.log("API Response:", response);

      if (response.success) {
        // Handle different response structures from the API
        let ordersData = [];
        let totalCount = 0;
        let totalPagesCalculated = 1;

        if (Array.isArray(response.data)) {
          // Direct array response
          ordersData = response.data;
          totalCount = response.total || ordersData.length;
          totalPagesCalculated =
            response.totalPages || Math.ceil(totalCount / recordCount);
        } else if (response.data && Array.isArray(response.data.orders)) {
          // Main API response structure: data.orders with data.pagination
          ordersData = response.data.orders;
          totalCount =
            response.data.pagination?.total ||
            response.data.total ||
            ordersData.length;
          totalPagesCalculated =
            response.data.pagination?.totalPages ||
            Math.ceil(totalCount / recordCount);
        } else if (response.data && Array.isArray(response.data.data)) {
          // Nested data structure
          ordersData = response.data.data;
          totalCount =
            response.data.total || response.total || ordersData.length;
          totalPagesCalculated =
            response.data.totalPages ||
            response.totalPages ||
            Math.ceil(totalCount / recordCount);
        } else if (response.pagination) {
          // Response with pagination object at root level
          ordersData = response.data || [];
          totalCount = response.pagination.total || 0;
          totalPagesCalculated =
            response.pagination.totalPages ||
            Math.ceil(totalCount / recordCount);
        } else {
          // Fallback: empty array
          ordersData = [];
          totalCount = 0;
          totalPagesCalculated = 1;
        }

        // Map API response fields to component expected fields
        const mappedOrders = ordersData.map((order) => ({
          ...order,
          id: order.id || order._id || order.orderId,
          // Ensure status field is available (map orderStatus to status)
          status: order.orderStatus || order.status || "pending",
          // Ensure platform field is available (map platformType to platform)
          platform: order.platform || order.platformType || "unknown",
          // Ensure we have proper date fields
          displayDate: order.orderDate || order.createdAt,
          // Ensure customer fields
          customerName:
            order.customerName ||
            order.customer?.name ||
            `${order.customer?.firstName || ""} ${
              order.customer?.lastName || ""
            }`.trim() ||
            "Bilinmeyen Müşteri",
          customerEmail: order.customerEmail || order.customer?.email || "",
          // Ensure monetary fields
          totalAmount: order.totalAmount || order.amount || order.total || 0,
          currency: order.currency || order.currencyCode || "TRY",
          // Ensure order number
          orderNumber: order.orderNumber || order.orderNo || order.id || "N/A",
        }));

        console.log("Processed orders data:", {
          ordersCount: mappedOrders.length,
          totalCount,
          totalPages: totalPagesCalculated,
          currentPage,
          sampleOrder: mappedOrders[0], // Log first order for debugging
        });

        setOrders(mappedOrders);
        setTotalRecords(totalCount);
        setPagination({ totalPages: totalPagesCalculated, total: totalCount });

        // Update stats with mapped orders data
        updateStatsFromOrders(mappedOrders);
      } else {
        throw new Error(response.message || "Failed to fetch orders");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);

      // Handle circuit breaker errors gracefully
      if (
        error.isCircuitBreakerError ||
        error.code === "CIRCUIT_BREAKER_OPEN"
      ) {
        setError(
          "Sunucu şu anda erişilebilir değil. Bağlantı yeniden kurulduğunda otomatik olarak güncellenecek."
        );
        // Don't show repeated alerts for circuit breaker errors
        if (!error.hasShownAlert) {
          showAlert(
            "Sunucu bağlantısı kesildi. Bağlantı restoring edene kadar istekler duraklatıldı.",
            "warning"
          );
          error.hasShownAlert = true;
        }
      } else if (
        error.code === "ECONNREFUSED" ||
        error.message === "Network Error"
      ) {
        setError(
          "Sunucuya bağlantı kurulamıyor. Lütfen internet bağlantınızı kontrol edin."
        );
        showAlert("Sunucuya bağlantı kurulamıyor", "error");
      } else {
        setError(error.message);
        showAlert("Siparişler yüklenirken bir hata oluştu", "error");
      }

      // Only clear orders if it's not a temporary connectivity issue
      if (!error.isCircuitBreakerError) {
        setOrders([]);
        setTotalRecords(0);
      }
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    filters,
    searchTerm,
    showAlert,
    recordCount,
    updateStatsFromOrders,
    validateFilters,
  ]);

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(
      () => {
        fetchOrders();
      },
      searchTerm ? 500 : 0
    ); // 500ms debounce for search, immediate for other changes

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, fetchOrders]);

  // Effect for non-search changes
  useEffect(() => {
    if (!searchTerm) {
      fetchOrders();
    }
  }, [currentPage, filters, recordCount, fetchOrders, searchTerm]);

  // Use server-provided data directly (no client-side filtering or pagination)
  // Orders are already filtered and paginated by the server
  const currentOrders = orders;
  const totalPages = pagination.totalPages || 1;

  // Reset page when it exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);
  // Date range presets handler
  const applyDatePreset = useCallback((preset) => {
    const today = new Date();
    let dateFrom, dateTo;

    switch (preset) {
      case "today":
        dateFrom = dateTo = today.toISOString().split("T")[0];
        break;
      case "7days":
        dateFrom = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        dateTo = today.toISOString().split("T")[0];
        break;
      case "30days":
        dateFrom = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        dateTo = today.toISOString().split("T")[0];
        break;
      case "thisMonth":
        dateFrom = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        dateTo = today.toISOString().split("T")[0];
        break;
      case "lastMonth":
        const lastMonth = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1
        );
        dateFrom = lastMonth.toISOString().split("T")[0];
        dateTo = new Date(today.getFullYear(), today.getMonth(), 0)
          .toISOString()
          .split("T")[0];
        break;
      default:
        return;
    }

    setFilters((prev) => ({ ...prev, dateFrom, dateTo }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      status: "all",
      platform: "all",
      dateFrom: "",
      dateTo: "",
      store: "all",
      sortBy: "orderDate",
      sortOrder: "desc",
      priceMin: "",
      priceMax: "",
    });
    setSearchTerm("");
    setFilterErrors({});
    setCurrentPage(1);
  }, []);

  // Bulk operations
  const handleSelectAll = useCallback(
    (checked) => {
      if (checked) {
        setSelectedOrders(currentOrders.map((order) => order.id));
      } else {
        setSelectedOrders([]);
      }
    },
    [currentOrders]
  );

  const handleSelectOrder = useCallback((orderId, checked) => {
    if (checked) {
      setSelectedOrders((prev) => [...prev, orderId]);
    } else {
      setSelectedOrders((prev) => prev.filter((id) => id !== orderId));
    }
  }, []);

  const handleBulkStatusUpdate = useCallback(
    async (newStatus) => {
      if (selectedOrders.length === 0) {
        showAlert("Lütfen güncellenecek siparişleri seçin", "warning");
        return;
      }

      try {
        await api.orders.bulkUpdateStatus(selectedOrders, newStatus);
        showAlert(
          `${selectedOrders.length} sipariş durumu güncellendi`,
          "success"
        );
        setSelectedOrders([]);
        fetchOrders();
      } catch (error) {
        showAlert("Toplu durum güncelleme başarısız", "error");
      }
    },
    [selectedOrders, showAlert, fetchOrders]
  );

  const handleViewOrderDetail = useCallback(
    (orderId) => {
      navigate(`/orders/${orderId}`);
    },
    [navigate]
  );

  // Enhanced sync with better UX and error diagnosis
  const handleSyncOrders = useCallback(async () => {
    try {
      setSyncing(true);
      setError(null);

      console.log("🔄 Starting order sync...");

      // Check platform connections first
      try {
        const connectionsResponse = await api.platforms.getConnections();
        console.log("📡 Platform connections:", connectionsResponse);

        if (
          !connectionsResponse.success ||
          !connectionsResponse.data ||
          connectionsResponse.data.length === 0
        ) {
          showAlert(
            "❌ Sipariş senkronizasyonu için önce platform bağlantıları kurmanız gerekiyor. Platform Ayarları sayfasından Trendyol, Hepsiburada veya N11 bağlantılarınızı ekleyin.",
            "warning"
          );
          return;
        }
      } catch (connectionError) {
        console.warn("Could not check platform connections:", connectionError);
        // Continue with sync anyway
      }

      // Proceed with sync
      const syncResponse = await api.orders.syncOrders();
      console.log("✅ Sync response:", syncResponse);

      if (syncResponse.success) {
        const {
          syncedCount = 0,
          errorCount = 0,
          platforms = [],
        } = syncResponse.data || {};

        if (syncedCount > 0) {
          showAlert(
            `✅ ${syncedCount} sipariş başarıyla senkronize edildi`,
            "success"
          );
        } else if (errorCount > 0) {
          showAlert(
            `⚠️ Senkronizasyon tamamlandı ancak ${errorCount} hata oluştu. Platform bağlantılarınızı kontrol edin.`,
            "warning"
          );
        } else {
          showAlert(
            "ℹ️ Senkronizasyon tamamlandı ancak yeni sipariş bulunamadı. Platform hesaplarınızda sipariş olduğundan emin olun.",
            "info"
          );
        }

        // Log platform-specific results
        platforms.forEach((platform) => {
          console.log(
            `🏪 ${platform.platformType}: ${
              platform.syncedCount || 0
            } senkronize, ${platform.errorCount || 0} hata`
          );
        });

        // Refresh orders regardless of sync count
        await fetchOrders();
      } else {
        throw new Error(
          syncResponse.message || "Senkronizasyon başarısız oldu"
        );
      }
    } catch (error) {
      console.error("❌ Error syncing orders:", error);

      // Provide more specific error messages
      let errorMessage = "Senkronizasyon sırasında bir hata oluştu";

      if (error.response?.status === 401) {
        errorMessage =
          "🔒 Oturum süreniz dolmuş veya giriş yapmanız gerekiyor. Lütfen giriş yapın.";
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else if (error.response?.status === 403) {
        errorMessage = "🚫 Bu işlem için yetkiniz bulunmuyor.";
      } else if (error.response?.status === 404) {
        errorMessage =
          "📡 API endpoint bulunamadı. Sunucu yapılandırmasını kontrol edin.";
      } else if (error.response?.data?.message) {
        errorMessage = `❌ ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage = `❌ ${error.message}`;
      }

      showAlert(errorMessage, "error");
      setError(error.message);
    } finally {
      setSyncing(false);
    }
  }, [showAlert, fetchOrders]);

  // Enhanced search handlers
  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        setCurrentPage(1);
        fetchOrders();
      }
    },
    [fetchOrders]
  );

  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  // Enhanced sorting
  const handleSort = useCallback(
    (key) => {
      let direction = "asc";
      if (sortConfig.key === key && sortConfig.direction === "asc") {
        direction = "desc";
      }

      // Map frontend sort keys to backend expected keys
      let backendSortKey = key;
      if (key === "createdAt") {
        backendSortKey = "orderDate";
      }

      setSortConfig({ key, direction });
      setFilters((prev) => ({
        ...prev,
        sortBy: backendSortKey,
        sortOrder: direction,
      }));

      setCurrentPage(1);
    },
    [sortConfig]
  );

  // Modal handlers with accessibility
  const handleCreateOrder = useCallback(() => {
    setSelectedOrder({
      orderNumber: "",
      customerName: "",
      customerEmail: "",
      platform: "",
      status: "pending",
      totalAmount: 0,
      currency: "TRY",
      items: [],
      shippingAddress: {
        firstName: "",
        lastName: "",
        street: "",
        city: "",
        district: "",
        neighborhood: "",
        postalCode: "",
        country: "Turkey",
        phone: "",
      },
    });
    setModalMode("create");
    setShowModal(true);
  }, []);

  const handleEditOrder = useCallback((order) => {
    setSelectedOrder(order);
    setModalMode("edit");
    setShowModal(true);
  }, []);

  const handleViewOrder = useCallback((order) => {
    setSelectedOrder(order);
    setModalMode("view");
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedOrder(null);
    // Focus management - return focus to trigger element
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  }, []);

  const handleSaveOrder = useCallback(
    async (orderData) => {
      try {
        if (modalMode === "create") {
          await api.orders.createOrder(orderData);
          showAlert("Sipariş başarıyla oluşturuldu", "success");
        } else {
          await api.orders.updateOrder(selectedOrder.id, orderData);
          showAlert("Sipariş başarıyla güncellendi", "success");
        }

        handleCloseModal();
        fetchOrders();
      } catch (error) {
        console.error("Error saving order:", error);
        showAlert(
          `Sipariş ${
            modalMode === "create" ? "oluşturulurken" : "güncellenirken"
          } bir hata oluştu`,
          "error"
        );
      }
    },
    [modalMode, selectedOrder, handleCloseModal, fetchOrders, showAlert]
  );

  const handleUpdateStatus = useCallback(
    async (orderId, newStatus) => {
      try {
        await api.orders.updateOrderStatus(orderId, newStatus);
        showAlert("Sipariş durumu başarıyla güncellendi", "success");
        fetchOrders();
      } catch (error) {
        console.error("Error updating order status:", error);
        showAlert("Sipariş durumu güncellenirken bir hata oluştu", "error");
      }
    },
    [showAlert, fetchOrders]
  );

  const exportOrders = useCallback(async () => {
    try {
      const response = await api.importExport.exportData("orders", "csv");
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `orders-${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      showAlert("Siparişler başarıyla dışa aktarıldı", "success");
    } catch (error) {
      console.error("Error exporting orders:", error);
      showAlert("Eksport işlemi başarısız", "error");
    }
  }, [showAlert]);

  // Print handlers
  const handlePrintShippingSlip = useCallback(
    async (orderId) => {
      console.log("🚀 handlePrintShippingSlip called with orderId:", orderId);

      try {
        console.log(`Starting shipping slip printing for order ID: ${orderId}`);

        if (!orderId) {
          console.log("❌ No orderId provided");
          showAlert("Sipariş kimliği eksik", "error");
          console.error("Attempted to print shipping slip without order ID");
          return;
        }

        console.log("📋 Checking for default template...");
        // Check if default template exists, if not check if any templates exist
        let defaultTemplateId = null;
        try {
          // First, try to get the default template
          console.log("🔍 Calling api.shipping.getDefaultTemplate()");
          const defaultTemplateResponse =
            await api.shipping.getDefaultTemplate();
          console.log("📄 Default template response:", defaultTemplateResponse);

          if (
            defaultTemplateResponse.success &&
            defaultTemplateResponse.data?.defaultTemplateId
          ) {
            defaultTemplateId = defaultTemplateResponse.data.defaultTemplateId;
            console.log(`✅ Using default template: ${defaultTemplateId}`);
          } else {
            console.log(
              "❌ No default template found, checking for any available templates"
            );

            // If no default template, check if any templates exist
            console.log("🔍 Calling api.shipping.getTemplates()");
            const templatesResponse = await api.shipping.getTemplates();
            console.log("📋 Available templates response:", templatesResponse);

            if (
              !templatesResponse.success ||
              !templatesResponse.data ||
              templatesResponse.data.length === 0
            ) {
              console.log("❌ No templates found, need to create one first");
              showAlert(
                "Kargo şablonu bulunamadı. Lütfen önce bir şablon oluşturun.",
                "warning"
              );
              // In a real implementation, you might redirect to template creation page
              return;
            }

            // Use the first available template if no default is set
            defaultTemplateId = templatesResponse.data[0].id;
            console.log(
              `✅ No default template, using first available: ${defaultTemplateId}`
            );
          }
        } catch (templateError) {
          console.error("❌ Error getting templates:", templateError);
          console.error("Template error details:", {
            message: templateError.message,
            response: templateError.response?.data,
            status: templateError.response?.status,
          });
          showAlert("Şablon bilgisi alınırken hata oluştu", "error");
          return;
        }

        console.log(
          `🖨️ Generating PDF with orderId: ${orderId}, templateId: ${defaultTemplateId}`
        );
        console.log("🔍 Calling api.shipping.generatePDF()");
        const response = await api.shipping.generatePDF(
          orderId,
          defaultTemplateId
        );
        console.log("📄 Response from generatePDF:", response);

        if (response.success && response.data?.labelUrl) {
          // Construct full URL for PDF access
          const baseUrl =
            process.env.NODE_ENV === "development"
              ? "http://localhost:5001"
              : window.location.origin;
          const fullPdfUrl = `${baseUrl}${response.data.labelUrl}`;

          console.log(`✅ Opening PDF URL: ${fullPdfUrl}`);
          const pdfWindow = window.open(fullPdfUrl, "_blank");
          if (pdfWindow) {
            pdfWindow.onload = () => {
              pdfWindow.print();
            };
          } else {
            showAlert(
              "Gönderi belgesi açılamadı. Lütfen popup engelleyicisini devre dışı bırakın.",
              "warning"
            );
          }
          showAlert("Gönderi belgesi hazırlandı", "success");

          // Refresh orders to show updated print status
          fetchOrders();
        } else {
          console.error("❌ Invalid PDF response:", response);
          showAlert(response.message || "PDF URL alınamadı", "error");
        }
      } catch (error) {
        console.error("❌ Error printing shipping slip:", error);

        // Provide more specific error messages based on the error type
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Gönderi belgesi yazdırılırken bir hata oluştu";
        showAlert(errorMessage, "error");
        console.error("Error details:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        showAlert("Gönderi belgesi yazdırılırken hata oluştu", "error");
      }
    },
    [showAlert, fetchOrders]
  );

  const handlePrintInvoice = useCallback(
    async (orderId) => {
      try {
        const response = await api.orders.printInvoice(orderId);
        if (response.success) {
          const pdfWindow = window.open(response.data.pdfUrl, "_blank");
          if (pdfWindow) {
            pdfWindow.onload = () => {
              pdfWindow.print();
            };
          }
          showAlert("Fatura hazırlandı", "success");

          // Refresh orders to show updated print status
          fetchOrders();
        }
      } catch (error) {
        console.error("Error printing invoice:", error);
        showAlert("Fatura yazdırma işlemi başarısız", "error");
      }
    },
    [showAlert, fetchOrders]
  );

  // Delete operations
  const handleDeleteSelected = useCallback(async () => {
    if (selectedOrders.length === 0) {
      showAlert("Lütfen silinecek siparişleri seçin", "warning");
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      `${selectedOrders.length} siparişi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const result = await api.orders.bulkDeleteOrders(selectedOrders);
      if (result.success) {
        showAlert(
          `${selectedOrders.length} sipariş başarıyla silindi`,
          "success"
        );
        setSelectedOrders([]);
        fetchOrders();
      } else {
        showAlert(
          result.message || "Siparişler silinirken hata oluştu",
          "error"
        );
      }
    } catch (error) {
      console.error("Error deleting orders:", error);
      showAlert("Siparişler silinirken hata oluştu", "error");
    }
  }, [selectedOrders, showAlert, fetchOrders]);

  const handleCancelOrder = useCallback(
    async (orderId, reason = "") => {
      try {
        // Use the dedicated cancelOrder API endpoint instead of generic status update
        const result = await api.orders.cancelOrder(orderId, reason);
        if (result.success) {
          showAlert("Sipariş başarıyla iptal edildi", "success");
          fetchOrders();
        } else {
          showAlert(
            result.message || "Sipariş iptal edilirken hata oluştu",
            "error"
          );
        }
      } catch (error) {
        console.error("Error cancelling order:", error);
        showAlert("Sipariş iptal edilirken hata oluştu", "error");
      }
    },
    [showAlert, fetchOrders]
  );

  const handleDeleteOrder = useCallback(
    async (orderId) => {
      // Show confirmation dialog
      const confirmed = window.confirm(
        "Bu siparişi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
      );

      if (!confirmed) {
        return;
      }

      try {
        const result = await api.orders.deleteOrder(orderId);
        if (result.success) {
          showAlert("Sipariş başarıyla silindi", "success");
          fetchOrders();
        } else {
          showAlert(
            result.message || "Sipariş silinirken hata oluştu",
            "error"
          );
        }
      } catch (error) {
        console.error("Error deleting order:", error);
        showAlert("Sipariş silinirken hata oluştu", "error");
      }
    },
    [showAlert, fetchOrders]
  );

  // Accept order
  const handleAcceptOrder = useCallback(
    async (orderId) => {
      try {
        const result = await api.orders.acceptOrder(orderId);

        if (result.success) {
          showAlert("Sipariş başarıyla onaylandı", "success");
          fetchOrders(); // Refresh the orders list
        } else {
          showAlert(
            result.message || "Sipariş onaylanırken bir hata oluştu",
            "error"
          );
        }
      } catch (error) {
        console.error("Error accepting order:", error);
        showAlert("Sipariş onaylanırken bir hata oluştu", "error");
      }
    },
    [showAlert, fetchOrders]
  );

  // Bulk accept
  const handleBulkAccept = useCallback(async () => {
    try {
      const acceptableOrders = selectedOrders.filter((orderId) => {
        const order = orders.find((o) => o.id === orderId);
        return (
          order &&
          (order.orderStatus === "new" || order.orderStatus === "pending")
        );
      });

      if (acceptableOrders.length === 0) {
        showAlert(
          "Seçilen siparişler arasında onaylanabilir sipariş bulunmuyor",
          "warning"
        );
        return;
      }

      const results = await Promise.allSettled(
        acceptableOrders.map((orderId) => api.orders.acceptOrder(orderId))
      );

      const successful = results.filter(
        (result) => result.status === "fulfilled" && result.value.success
      ).length;

      const failed = results.length - successful;

      if (successful > 0) {
        showAlert(
          `${successful} sipariş başarıyla onaylandı${
            failed > 0 ? `, ${failed} sipariş onaylanamadı` : ""
          }`,
          failed > 0 ? "warning" : "success"
        );
        fetchOrders(); // Refresh the orders list
        setSelectedOrders([]); // Clear selection
      } else {
        showAlert("Hiçbir sipariş onaylanamadı", "error");
      }
    } catch (error) {
      console.error("Error in bulk accept:", error);
      showAlert("Toplu onaylama işlemi sırasında hata oluştu", "error");
    }
  }, [selectedOrders, orders, showAlert, fetchOrders]);

  // Loading and error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin icon-contrast-primary" />
          <span className="ml-2 text-gray-600">Siparişler yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 icon-contrast-danger mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Bir hata oluştu
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={fetchOrders} variant="primary">
              <RefreshCw className="h-4 w-4 mr-2 icon-contrast-primary" />
              Tekrar Dene
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Temporary Network Debugger */}
      {/* Network Debugger - conditionally rendered based on developer settings */}
      {/* <NetworkDebugger /> */}

      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ShoppingCart className="h-8 w-8 icon-contrast-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Sipariş Yönetimi
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Tüm platform siparişlerinizi tek yerden yönetin
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleSyncOrders}
                  variant="outline"
                  disabled={syncing}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
                  />
                  <span>
                    {syncing ? "Senkronize Ediliyor..." : "Senkronize Et"}
                  </span>
                </Button>

                <Button
                  onClick={exportOrders}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4 icon-contrast-secondary" />
                  <span>Dışa Aktar</span>
                </Button>

                <Button
                  onClick={handleCreateOrder}
                  variant="primary"
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4 icon-contrast-primary" />
                  <span>Yeni Sipariş</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Status Indicator */}
      {!isServerReachable && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
          <div className="flex">
            <WifiOff className="h-5 w-5 text-amber-400" />
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                Sunucu bağlantısı kesildi. Bağlantı yeniden kurulana kadar
                istekler duraklatıldı.
                <span className="ml-2 text-xs">({circuitBreakerState})</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 icon-contrast-primary" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Toplam Sipariş
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 icon-contrast-warning" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Yeni Siparişler
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.new}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Package className="h-8 w-8 icon-contrast-info" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Hazırlanıyor
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.processing}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Truck className="h-8 w-8 icon-contrast-purple" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Kargoda
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.shipped}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 icon-contrast-success" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Teslim Edildi
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.delivered}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 icon-contrast-success" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Toplam Gelir
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 icon-contrast-secondary h-4 w-4" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Sipariş numarası, müşteri adı veya ürün ara..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                </div>
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2">
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, status: e.target.value }))
                  }
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="pending">Bekleyen</option>
                  <option value="processing">Hazırlanıyor</option>
                  <option value="shipped">Kargoda</option>
                  <option value="delivered">Teslim Edildi</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>

                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.platform}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      platform: e.target.value,
                    }))
                  }
                >
                  <option value="all">Tüm Platformlar</option>
                  <option value="trendyol">Trendyol</option>
                  <option value="hepsiburada">Hepsiburada</option>
                  <option value="n11">N11</option>
                </select>

                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={recordCount}
                  onChange={(e) => setRecordCount(parseInt(e.target.value))}
                >
                  <option value={10}>10 kayıt</option>
                  <option value={20}>20 kayıt</option>
                  <option value={50}>50 kayıt</option>
                  <option value={100}>100 kayıt</option>
                </select>

                <Button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Filter className="h-4 w-4 icon-contrast-info" />
                  <span>Gelişmiş Filtreler</span>
                </Button>

                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <X className="h-4 w-4 icon-contrast-danger" />
                  <span>Temizle</span>
                </Button>
              </div>
            </div>
            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date Range Presets */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tarih Aralığı
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {datePresets.map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => applyDatePreset(preset.value)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Date Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Başlangıç Tarihi
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={filters.dateFrom}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateFrom: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bitiş Tarihi
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={filters.dateTo}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateTo: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fiyat Aralığı
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder="Min"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={filters.priceMin}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            priceMin: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={filters.priceMax}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            priceMax: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Filter Errors */}
                {Object.keys(filterErrors).length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 icon-contrast-danger" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Filtre Hataları
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          <ul className="list-disc pl-5 space-y-1">
                            {Object.values(filterErrors).map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedOrders.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedOrders.length} sipariş seçildi
                </span>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleBulkAccept()}
                    size="sm"
                    variant="outline"
                    className="text-green-600 hover:text-green-700 hover:border-green-300"
                  >
                    <CheckCircle className="h-4 w-4 mr-1 action-icon-success" />
                    Seçilenleri Onayla
                  </Button>
                  <Button
                    onClick={() => handleBulkStatusUpdate("processing")}
                    size="sm"
                    variant="outline"
                  >
                    Hazırlanıyor Olarak İşaretle
                  </Button>
                  <Button
                    onClick={() => handleBulkStatusUpdate("shipped")}
                    size="sm"
                    variant="outline"
                  >
                    Kargoda Olarak İşaretle
                  </Button>
                  <Button
                    onClick={handleDeleteSelected}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Seçilenleri Sil
                  </Button>
                  <Button
                    onClick={() => setSelectedOrders([])}
                    size="sm"
                    variant="outline"
                  >
                    Seçimi Temizle
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Sipariş bulunamadı
                </h3>
                <p className="text-gray-500 mb-4">
                  Henüz hiç sipariş yok veya arama kriterlerinize uygun sipariş
                  bulunamadı.
                </p>
                <Button
                  onClick={handleCreateOrder}
                  variant="primary"
                  className="inline-flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  İlk Siparişi Oluştur
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={
                            selectedOrders.length === currentOrders.length &&
                            currentOrders.length > 0
                          }
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("orderNumber")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Sipariş No</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </th>
                      {/* product name */}
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        onClick={() => handleSort("productName")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Ürün Adı</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("customerName")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Müşteri</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Platform
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kargo Şirketi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("totalAmount")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Tutar</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentOrders.map((order) => {
                      const statusIcon = getStatusIcon(order.orderStatus);
                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          {/* checkbox */}
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedOrders.includes(order.id)}
                              onChange={(e) =>
                                handleSelectOrder(order.id, e.target.checked)
                              }
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>

                          {/* order number */}
                          <td className="px-6 py-4 whitespace-normal">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {order.orderNumber}
                            </div>
                            <div className="flex text-xs items-center">
                              {formatDate(order)}
                            </div>
                            {/* Display SKU under the name */}
                            {order.items &&
                              order.items.length > 0 &&
                              order.items[0].sku && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  SKU: {order.items[0].sku}
                                </div>
                              )}
                          </td>
                          {/* product name(s) with qty */}
                          <td className="px-6 py-4 break-words whitespace-normal">
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {order.items && order.items.length > 0 ? (
                                order.items.length === 1 ? (
                                  <>
                                    {(order.items[0].title ||
                                      order.items[0].productName ||
                                      "Bilinmiyor") +
                                      " x " +
                                      (order.items[0].quantity || 1)}
                                  </>
                                ) : (
                                  <>
                                    {order.items
                                      .slice(0, 2)
                                      .map((item, idx) => (
                                        <div key={idx}>
                                          {(item.title ||
                                            item.productName ||
                                            "Bilinmiyor") +
                                            " <b>x</b> " +
                                            (item.quantity || 1)}
                                        </div>
                                      ))}
                                    {order.items.length > 2 && (
                                      <div className="text-xs text-gray-500">
                                        +{order.items.length - 2} ürün daha
                                      </div>
                                    )}
                                  </>
                                )
                              ) : (
                                "Bilinmiyor"
                              )}
                            </div>
                          </td>
                          {/* customer name and email */}
                          <td className="px-6 py-4 break-words whitespace-normal">
                            <div className="mt-1 flex items-center">
                              <User className="h-4 w-4 icon-contrast-secondary mr-2" />
                              <p className="text-sm text-gray-900 dark:text-gray-100">
                                {order.customerName}
                              </p>
                            </div>
                            {order.customerEmail && (
                              <div className="text-sm text-gray-500 flex items-center">
                                <Mail className="h-3 w-3 mr-1 icon-contrast-secondary" />
                                {order.customerEmail}
                              </div>
                            )}
                          </td>
                          {/* platform */}
                          <td className="px-6 py-4 break-words whitespace-normal">
                            <Badge
                              variant={getPlatformVariant(order.platform)}
                              className="capitalize bg-white"
                            >
                              {getPlatformIcon(order.platform)}
                            </Badge>
                          </td>
                          {/* cargo company */}
                          <td className="px-6 py-4 break-words whitespace-normal">
                            <div className="flex items-center">
                              {order.cargoCompany ? (
                                <>
                                  <Truck className="h-4 w-4 mr-1 text-gray-500" />
                                  <span className="text-sm text-gray-900 dark:text-gray-100">
                                    {order.cargoCompany}
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm text-gray-500">
                                  Kargo bilgisi yok
                                </span>
                              )}
                            </div>
                          </td>
                          {/* status */}
                          <td className="px-6 py-4 break-words whitespace-normal">
                            {/* Order Status Badge */}
                            <div className="flex items-center mb-3">
                              <span className="mr-2 text-sm">{statusIcon}</span>
                              <Badge
                                variant={getStatusVariant(order.orderStatus)}
                              >
                                {getStatusText(order.orderStatus)}
                              </Badge>
                            </div>

                            {/* Print Status Labels - Equal width/height, fit-content */}
                            <div className="flex flex-col gap-2">
                              {/* Shipping Label Status */}
                              <div
                                className={`inline-flex items-center w-fit px-3 py-2 rounded-md text-xs font-medium transition-all duration-300 ease-in-out shadow-sm hover:shadow-md transform hover:scale-[1.02] min-h-[36px] min-w-[110px] ${
                                  order.shippingLabelPrinted
                                    ? "bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 text-emerald-700 border border-emerald-200 shadow-emerald-100 dark:from-emerald-900/30 dark:via-green-900/20 dark:to-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40 dark:shadow-emerald-900/20"
                                    : "bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 text-slate-600 border border-slate-200 shadow-slate-100 dark:from-slate-800/60 dark:via-gray-800/40 dark:to-slate-800/60 dark:text-slate-400 dark:border-slate-600/40 dark:shadow-slate-900/20"
                                }`}
                              >
                                <Truck
                                  className={`h-4 w-4 mr-2 transition-colors duration-200 flex-shrink-0 ${
                                    order.shippingLabelPrinted
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-slate-500 dark:text-slate-500"
                                  }`}
                                />
                                <div className="flex flex-col">
                                  <span className="font-semibold leading-tight whitespace-nowrap">
                                    {order.shippingLabelPrinted ? (
                                      <>
                                        Kargo
                                        <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-bold">
                                          ✓
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        Kargo
                                        <span className="ml-2 text-slate-500 dark:text-slate-500">
                                          ⏳
                                        </span>
                                      </>
                                    )}
                                  </span>
                                  {order.shippingLabelPrinted &&
                                    order.shippingLabelPrintedAt && (
                                      <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5 leading-tight whitespace-nowrap">
                                        {new Date(
                                          order.shippingLabelPrintedAt
                                        ).toLocaleDateString("tr-TR", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    )}
                                </div>
                              </div>

                              {/* Invoice Status */}
                              <div
                                className={`inline-flex items-center w-fit px-3 py-2 rounded-md text-xs font-medium transition-all duration-300 ease-in-out shadow-sm hover:shadow-md transform hover:scale-[1.02] min-h-[36px] min-w-[110px] ${
                                  order.invoicePrinted
                                    ? "bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 text-blue-700 border border-blue-200 shadow-blue-100 dark:from-blue-900/30 dark:via-indigo-900/20 dark:to-blue-900/30 dark:text-blue-300 dark:border-blue-700/40 dark:shadow-blue-900/20"
                                    : "bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 text-slate-600 border border-slate-200 shadow-slate-100 dark:from-slate-800/60 dark:via-gray-800/40 dark:to-slate-800/60 dark:text-slate-400 dark:border-slate-600/40 dark:shadow-slate-900/20"
                                }`}
                              >
                                <FileText
                                  className={`h-4 w-4 mr-2 transition-colors duration-200 flex-shrink-0 ${
                                    order.invoicePrinted
                                      ? "text-blue-600 dark:text-blue-400"
                                      : "text-slate-500 dark:text-slate-500"
                                  }`}
                                />
                                <div className="flex flex-col">
                                  <span className="font-semibold leading-tight whitespace-nowrap">
                                    {order.invoicePrinted ? (
                                      <>
                                        Fatura
                                        <span className="ml-2 text-blue-600 dark:text-blue-400 font-bold">
                                          ✓
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        Fatura
                                        <span className="ml-2 text-slate-500 dark:text-slate-500">
                                          ⏳
                                        </span>
                                      </>
                                    )}
                                  </span>
                                  {order.invoicePrinted &&
                                    order.invoicePrintedAt && (
                                      <span className="text-[10px] text-blue-600/70 dark:text-blue-400/70 mt-0.5 leading-tight whitespace-nowrap">
                                        {new Date(
                                          order.invoicePrintedAt
                                        ).toLocaleDateString("tr-TR", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    )}
                                </div>
                              </div>
                            </div>
                          </td>
                          {/* total amount */}
                          <td className="px-6 py-4 break-words whitespace-normal text-sm text-gray-900 dark:text-gray-100">
                            {formatCurrency(order.totalAmount, order.currency)}
                          </td>
                          {/* actions */}
                          <td className="px-6 py-4 break-words whitespace-normal text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center space-x-2">
                              {/* Accept Order Button - only show for new/pending orders */}
                              {(order.orderStatus === "new" ||
                                order.orderStatus === "pending") && (
                                <Button
                                  onClick={() => handleAcceptOrder(order.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="p-1 text-green-600 hover:text-green-700"
                                  title="Siparişi Onayla"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                onClick={() => handleViewOrder(order)}
                                size="sm"
                                variant="ghost"
                                className="p-1"
                                title="Görüntüle"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => handleEditOrder(order)}
                                size="sm"
                                variant="ghost"
                                className="p-1"
                                title="Düzenle"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => handleViewOrderDetail(order.id)}
                                size="sm"
                                variant="ghost"
                                className="p-1"
                                title="Detaylar"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() =>
                                  handlePrintShippingSlip(order.id)
                                }
                                size="sm"
                                variant="ghost"
                                className="p-1"
                                title="Gönderi Belgesi Yazdır"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => handlePrintInvoice(order.id)}
                                size="sm"
                                variant="ghost"
                                className="p-1"
                                title="Fatura Yazdır"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <CancelOrderDialog
                                orderId={order.id}
                                orderNumber={order.orderNumber}
                                onConfirm={handleCancelOrder}
                              >
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="p-1 text-red-600"
                                  title="Siparişi İptal Et"
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </CancelOrderDialog>
                              <Button
                                onClick={() => handleDeleteOrder(order.id)}
                                size="sm"
                                variant="ghost"
                                className="p-1 text-red-600"
                                title="Siparişi Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Enhanced Pagination */}
            {orders.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-700">
                    <span>
                      Sayfa {currentPage} / {totalPages}
                    </span>
                    <span className="ml-4 text-gray-500 dark:text-gray-400">
                      Toplam {totalRecords} kayıt
                    </span>
                    <span className="ml-4 text-gray-400">
                      (Sayfa başına {recordCount} kayıt)
                    </span>
                    <span className="ml-4 text-gray-600 text-xs">
                      [Debug: totalPages={totalPages}, pagination.totalPages=
                      {pagination.totalPages}, totalRecords={totalRecords}]
                    </span>
                  </div>
                  {orders.length > 0 && (
                    <div className="flex items-center space-x-1">
                      {/* Always show Previous/Next controls for testing */}

                      {/* First page button */}
                      <Button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        size="sm"
                        variant="outline"
                        className="hidden sm:inline-flex"
                      >
                        İlk
                      </Button>

                      {/* Previous page button */}
                      <Button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        size="sm"
                        variant="outline"
                      >
                        Önceki
                      </Button>

                      {/* Page numbers - always show at least current page */}
                      <div className="hidden sm:flex items-center space-x-1">
                        {Array.from(
                          { length: Math.max(1, Math.min(5, totalPages)) },
                          (_, i) => {
                            let pageNumber;
                            if (totalPages <= 5) {
                              pageNumber = i + 1;
                            } else if (currentPage <= 3) {
                              pageNumber = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNumber = totalPages - 4 + i;
                            } else {
                              pageNumber = currentPage - 2 + i;
                            }

                            return (
                              <Button
                                key={pageNumber}
                                onClick={() => setCurrentPage(pageNumber)}
                                size="sm"
                                variant={
                                  currentPage === pageNumber
                                    ? "primary"
                                    : "outline"
                                }
                                className="min-w-[40px]"
                              >
                                {pageNumber}
                              </Button>
                            );
                          }
                        )}

                        {/* Show ellipsis and last page if needed */}
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            {currentPage < totalPages - 3 && (
                              <span className="px-2 text-gray-500 dark:text-gray-400">
                                ...
                              </span>
                            )}
                            <Button
                              onClick={() => setCurrentPage(totalPages)}
                              size="sm"
                              variant="outline"
                              className="min-w-[40px]"
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Next page button */}
                      <Button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
                        }
                        disabled={currentPage === totalPages}
                        size="sm"
                        variant="outline"
                      >
                        Sonraki
                      </Button>

                      {/* Last page button */}
                      <Button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        size="sm"
                        variant="outline"
                        className="hidden sm:inline-flex"
                      >
                        Son
                      </Button>
                    </div>
                  )}
                </div>

                {/* Mobile pagination controls */}
                <div className="sm:hidden mt-3 flex justify-between items-center">
                  <select
                    value={currentPage}
                    onChange={(e) => setCurrentPage(parseInt(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    {Array.from({ length: totalPages }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Sayfa {i + 1}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {totalPages} sayfadan {currentPage}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Modal */}
      {showModal && selectedOrder && (
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={
            modalMode === "view"
              ? "Sipariş Detayları"
              : modalMode === "edit"
              ? "Sipariş Düzenle"
              : "Yeni Sipariş"
          }
          size="large"
        >
          <OrderForm
            order={selectedOrder}
            mode={modalMode}
            onSave={handleSaveOrder}
            onCancel={handleCloseModal}
            onUpdateStatus={handleUpdateStatus}
            getStatusVariant={getStatusVariant}
            getStatusText={getStatusText}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        </Modal>
      )}
    </div>
  );
});

// Order Form Component
const OrderForm = ({
  order,
  mode,
  onSave,
  onCancel,
  onUpdateStatus,
  getStatusVariant,
  getStatusText,
  formatCurrency,
  formatDate,
}) => {
  const [formData, setFormData] = useState(order);
  const [validationErrors, setValidationErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.orderNumber?.trim()) {
      errors.orderNumber = "Sipariş numarası gereklidir";
    }

    if (!formData.customerName?.trim()) {
      errors.customerName = "Müşteri adı gereklidir";
    }

    if (!formData.platform) {
      errors.platform = "Platform seçimi gereklidir";
    }

    if (!formData.totalAmount || formData.totalAmount <= 0) {
      errors.totalAmount = "Geçerli bir tutar giriniz";
    }

    if (
      formData.customerEmail &&
      !/\S+@\S+\.\S+/.test(formData.customerEmail)
    ) {
      errors.customerEmail = "Geçerli bir e-posta adresi giriniz";
    }

    return errors;
  }, [formData]);

  const handleSave = useCallback(
    async (e) => {
      e.preventDefault();

      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
      }

      setSaving(true);
      setValidationErrors({});

      try {
        await onSave(formData);
      } finally {
        setSaving(false);
      }
    },
    [formData, validateForm, onSave]
  );

  const handleInputChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear validation error when user starts typing
      if (validationErrors[field]) {
        setValidationErrors((prev) => ({ ...prev, [field]: null }));
      }
    },
    [validationErrors]
  );

  const handleAddressChange = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      shippingAddress: {
        ...prev.shippingAddress,
        [field]: value,
      },
    }));
  }, []);

  if (mode === "view") {
    return (
      <div className="space-y-6">
        {/* Order Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Sipariş Numarası
            </label>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {order.orderNumber}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Platform
            </label>
            <Badge
              variant={
                order.platform === "trendyol"
                  ? "warning"
                  : order.platform === "hepsiburada"
                  ? "info"
                  : "secondary"
              }
              className="mt-1 capitalize"
            >
              {order.platform}
            </Badge>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Müşteri
            </label>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {order.customerName}
            </p>
            {order.customerEmail && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {order.customerEmail}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Durum
            </label>
            <div className="mt-1 flex items-center space-x-2">
              <Badge variant={getStatusVariant(order.orderStatus)}>
                {getStatusText(order.orderStatus)}
              </Badge>
              {onUpdateStatus && (
                <select
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                  value={order.orderStatus}
                  onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                >
                  <option value="new">Yeni</option>
                  <option value="pending">Bekleyen</option>
                  <option value="processing">Hazırlanıyor</option>
                  <option value="shipped">Kargoda</option>
                  <option value="delivered">Teslim Edildi</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Toplam Tutar
            </label>
            <p className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(order.totalAmount, order.currency)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Sipariş Tarihi
            </label>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {formatDate(order)}
            </p>
          </div>
        </div>

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Sipariş Ürünleri
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0"
                  >
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Adet: {item.quantity}
                        {item.sku && ` • SKU: ${item.sku}`}
                        {item.productColor && ` • Renk: ${item.productColor}`}
                        {item.productSize && ` • Beden: ${item.productSize}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(
                          item.amount || item.totalPrice || 0,
                          order.currency
                        )}
                      </p>
                      {item.unitPrice && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Birim:{" "}
                          {formatCurrency(item.unitPrice, order.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Shipping Address */}
        {order.shippingAddress && (
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-gray-600" />
              Teslimat Adresi
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium">
                {order.shippingAddress.firstName}{" "}
                {order.shippingAddress.lastName}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {order.shippingAddress.street}
              </p>
              <p className="text-sm text-gray-600">
                {order.shippingAddress.neighborhood &&
                  `${order.shippingAddress.neighborhood}, `}
                {order.shippingAddress.district}, {order.shippingAddress.city}
              </p>
              {order.shippingAddress.postalCode && (
                <p className="text-sm text-gray-600">
                  Posta Kodu: {order.shippingAddress.postalCode}
                </p>
              )}
              {order.shippingAddress.phone && (
                <p className="text-sm text-gray-600 mt-2">
                  <Phone className="h-4 w-4 inline mr-1" />
                  {order.shippingAddress.phone}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <Button onClick={onCancel} variant="outline">
            Kapat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Basic Order Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sipariş Numarası *
          </label>
          <input
            type="text"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              validationErrors.orderNumber
                ? "border-red-300"
                : "border-gray-300"
            }`}
            value={formData.orderNumber || ""}
            onChange={(e) => handleInputChange("orderNumber", e.target.value)}
            disabled={mode === "edit"}
          />
          {validationErrors.orderNumber && (
            <p className="mt-1 text-sm text-red-600">
              {validationErrors.orderNumber}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Platform *
          </label>
          <select
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              validationErrors.platform ? "border-red-300" : "border-gray-300"
            }`}
            value={formData.platform || ""}
            onChange={(e) => handleInputChange("platform", e.target.value)}
          >
            <option value="">Platform Seçin</option>
            <option value="trendyol">Trendyol</option>
            <option value="hepsiburada">Hepsiburada</option>
            <option value="n11">N11</option>
            <option value="pazarama">Pazarama</option>
          </select>
          {validationErrors.platform && (
            <p className="mt-1 text-sm text-red-600">
              {validationErrors.platform}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Müşteri Adı *
          </label>
          <input
            type="text"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              validationErrors.customerName
                ? "border-red-300"
                : "border-gray-300"
            }`}
            value={formData.customerName || ""}
            onChange={(e) => handleInputChange("customerName", e.target.value)}
          />
          {validationErrors.customerName && (
            <p className="mt-1 text-sm text-red-600">
              {validationErrors.customerName}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            E-posta
          </label>
          <input
            type="email"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              validationErrors.customerEmail
                ? "border-red-300"
                : "border-gray-300"
            }`}
            value={formData.customerEmail || ""}
            onChange={(e) => handleInputChange("customerEmail", e.target.value)}
          />
          {validationErrors.customerEmail && (
            <p className="mt-1 text-sm text-red-600">
              {validationErrors.customerEmail}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Durum
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={formData.status || "pending"}
            onChange={(e) => handleInputChange("status", e.target.value)}
          >
            <option value="new">Yeni</option>
            <option value="pending">Bekleyen</option>
            <option value="processing">Hazırlanıyor</option>
            <option value="shipped">Kargoda</option>
            <option value="in_transit">Yolda</option>
            <option value="delivered">Teslim Edildi</option>
            <option value="cancelled">İptal Edildi</option>
            <option value="returned">İade Edildi</option>
            <option value="failed">Başarısız</option>
            <option value="claim_created">Şikayet Oluşturuldu</option>
            <option value="claim_approved">Şikayet Onaylandı</option>
            <option value="claim_rejected">Şikayet Reddedildi</option>
            <option value="refunded">İade Edildi</option>
            <option value="consolidated">Konsolide Edildi</option>
            <option value="in_batch">Toplu Kargoda</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Toplam Tutar *
          </label>
          <div className="flex">
            <input
              type="number"
              step="0.01"
              className={`flex-1 px-3 py-2 border rounded-l-lg focus:ring-2 focus:ring-blue-500 ${
                validationErrors.totalAmount
                  ? "border-red-300"
                  : "border-gray-300"
              }`}
              value={formData.totalAmount || ""}
              onChange={(e) =>
                handleInputChange(
                  "totalAmount",
                  parseFloat(e.target.value) || 0
                )
              }
            />
            <select
              className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500"
              value={formData.currency || "TRY"}
              onChange={(e) => handleInputChange("currency", e.target.value)}
            >
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          {validationErrors.totalAmount && (
            <p className="mt-1 text-sm text-red-600">
              {validationErrors.totalAmount}
            </p>
          )}
        </div>
      </div>

      {/* Shipping Address */}
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-gray-600" />
          Teslimat Adresi
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.shippingAddress?.firstName || ""}
              onChange={(e) => handleAddressChange("firstName", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Soyad
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.shippingAddress?.lastName || ""}
              onChange={(e) => handleAddressChange("lastName", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adres
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="3"
              value={formData.shippingAddress?.street || ""}
              onChange={(e) => handleAddressChange("street", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şehir
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.shippingAddress?.city || ""}
              onChange={(e) => handleAddressChange("city", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İlçe
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.shippingAddress?.district || ""}
              onChange={(e) => handleAddressChange("district", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Posta Kodu
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.shippingAddress?.postalCode || ""}
              onChange={(e) =>
                handleAddressChange("postalCode", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              type="tel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.shippingAddress?.phone || ""}
              onChange={(e) => handleAddressChange("phone", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          disabled={saving}
        >
          İptal
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {mode === "create" ? "Oluşturuluyor..." : "Güncelleniyor..."}
            </>
          ) : mode === "create" ? (
            "Oluştur"
          ) : (
            "Güncelle"
          )}
        </Button>
      </div>
    </form>
  );
};

export default OrderManagement;
